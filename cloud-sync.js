import { firebaseConfig } from './firebase-config.js';

const configured = !Object.values(firebaseConfig).some(value => !value || String(value).startsWith('PASTE_') || String(value).startsWith('REPLACE_'));
const $ = id => document.getElementById(id);
const modal = $('cloudModal');
const cloudButton = $('cloudBtn');
const info = $('cloudInfo');
const syncText = $('syncText');
const syncDot = $('syncDot');
let auth = null;
let db = null;
let currentUser = null;
let busy = false;
let saveTimer = null;
let suppressAutoSync = false;

function setStatus(message, kind = 'idle') {
  if (syncText) syncText.textContent = message;
  if (info) info.textContent = message;
  if (syncDot) syncDot.style.background = kind === 'ok' ? '#22c55e' : kind === 'error' ? '#ef4444' : kind === 'busy' ? '#3b82f6' : '#f59e0b';
}

function userLabel(user) {
  return user?.displayName || user?.email || '已登入';
}

function updateAuthUI(user) {
  currentUser = user || null;
  if (!cloudButton) return;
  if (!currentUser) {
    cloudButton.textContent = '雲端登入';
    cloudButton.title = '開啟雲端登入';
    setStatus('雲端同步：未登入', 'idle');
    return;
  }
  const label = userLabel(currentUser);
  cloudButton.textContent = label.length > 10 ? '已登入' : label;
  cloudButton.title = label;
  setStatus(`已登入：${label}`, 'ok');
}

function friendlyError(error, action) {
  const code = error?.code || '';
  if (code.includes('popup-blocked')) return '登入視窗被瀏覽器封鎖，請允許彈出式視窗後重試。';
  if (code.includes('popup-closed')) return '登入視窗已關閉，請重新按「使用Google登入」。';
  if (code.includes('unauthorized-domain')) return '目前網站網域未加入 Firebase Authorized domains。';
  if (code.includes('permission-denied')) return 'Firestore 權限被拒絕，請檢查 Security Rules。';
  if (code.includes('network-request-failed') || code.includes('unavailable')) return `${action}失敗：網絡或 Firebase 暫時無法連線。`;
  return `${action}失敗：${error?.message || code || '未知錯誤'}`;
}

function withTimeout(promise, milliseconds = 15000) {
  let timer;
  return Promise.race([
    promise,
    new Promise((_, reject) => {
      timer = setTimeout(() => reject(new Error('同步逾時，請檢查網絡或 Firebase 權限。')), milliseconds);
    })
  ]).finally(() => clearTimeout(timer));
}

function cloudDocument(fsmod, user) {
  return fsmod.doc(db, 'users', user.uid, 'portfolio', 'main');
}

if (cloudButton && modal) {
  cloudButton.addEventListener('click', () => { modal.style.display = 'grid'; });
}
$('closeCloud')?.addEventListener('click', () => { modal.style.display = 'none'; });

async function start() {
  if (!configured) {
    setStatus('Firebase 尚未設定。', 'error');
    return;
  }
  try {
    const appmod = await import('https://www.gstatic.com/firebasejs/12.1.0/firebase-app.js');
    const authmod = await import('https://www.gstatic.com/firebasejs/12.1.0/firebase-auth.js');
    const fsmod = await import('https://www.gstatic.com/firebasejs/12.1.0/firebase-firestore.js');
    const app = appmod.initializeApp(firebaseConfig);
    auth = authmod.getAuth(app);
    db = fsmod.getFirestore(app);

    await authmod.setPersistence(auth, authmod.browserLocalPersistence);

    authmod.onAuthStateChanged(auth, user => {
      updateAuthUI(user);
    });

    // Popup must be created directly inside this click call stack. No await before signInWithPopup.
    $('googleLogin').onclick = () => {
      if (!auth) return setStatus('Firebase 尚未完成載入，請稍後重試。', 'error');
      const popup = authmod.signInWithPopup(auth, new authmod.GoogleAuthProvider());
      setStatus('正在開啟 Google 登入...', 'busy');
      popup.then(result => {
        updateAuthUI(result.user);
        setStatus(`已登入：${userLabel(result.user)}`, 'ok');
      }).catch(error => {
        console.error('Google popup login error:', error);
        setStatus(friendlyError(error, '登入'), 'error');
      });
    };

    $('googleLogout').onclick = async () => {
      try {
        await authmod.signOut(auth);
        updateAuthUI(null);
      } catch (error) {
        setStatus(friendlyError(error, '登出'), 'error');
      }
    };

    async function upload(state = window.ETFProApp?.getState?.()) {
      if (!currentUser) return setStatus('請先登入 Google。', 'idle');
      if (busy || !state) return;
      busy = true;
      setStatus('正在上載雲端...', 'busy');
      try {
        await withTimeout(fsmod.setDoc(cloudDocument(fsmod, currentUser), {
          state,
          updatedAt: fsmod.serverTimestamp()
        }, { merge: true }));
        setStatus('雲端同步完成', 'ok');
      } catch (error) {
        console.error('Cloud upload error:', error);
        setStatus(friendlyError(error, '上載'), 'error');
      } finally {
        busy = false;
      }
    }

    $('uploadCloud').onclick = () => upload();

    $('downloadCloud').onclick = async () => {
      if (!currentUser) return setStatus('請先登入 Google。', 'idle');
      if (busy) return;
      if (!confirm('下載雲端資料會覆蓋目前本機資料，確定繼續？')) return;
      busy = true;
      setStatus('正在下載雲端資料...', 'busy');
      try {
        const snapshot = await withTimeout(fsmod.getDoc(cloudDocument(fsmod, currentUser)));
        if (!snapshot.exists()) throw new Error('雲端未有資料，請先上載本機資料。');
        localStorage.setItem('ETF_CORE_PRO_V1_PRE_CLOUD_DOWNLOAD', JSON.stringify(window.ETFProApp.getState()));
        suppressAutoSync = true;
        try {
          window.ETFProApp.setState(snapshot.data().state || {});
        } finally {
          suppressAutoSync = false;
        }
        setStatus('雲端資料已下載', 'ok');
      } catch (error) {
        console.error('Cloud download error:', error);
        setStatus(friendlyError(error, '下載'), 'error');
      } finally {
        busy = false;
      }
    };

    window.addEventListener('etf-local-save', event => {
      if (!currentUser || suppressAutoSync || busy) return;
      clearTimeout(saveTimer);
      setStatus('等候同步...', 'idle');
      saveTimer = setTimeout(() => upload(event.detail), 1800);
    });
  } catch (error) {
    console.error('Firebase initialization error:', error);
    setStatus(friendlyError(error, 'Firebase 載入'), 'error');
  }
}

start();
window.addEventListener('offline', () => setStatus('離線模式', 'idle'));
window.addEventListener('online', () => currentUser && setStatus(`已登入：${userLabel(currentUser)}`, 'ok'));
