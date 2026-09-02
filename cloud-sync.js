import { firebaseConfig } from './firebase-config.js';

const $ = id => document.getElementById(id);
const configured = !Object.values(firebaseConfig).some(value => !value || String(value).startsWith('PASTE_') || String(value).startsWith('REPLACE_'));
const modal = $('cloudModal');
const cloudButton = $('cloudBtn');
const info = $('cloudInfo');
const syncText = $('syncText');
const syncDot = $('syncDot');
const googleLogin = $('googleLogin');
const uploadCloud = $('uploadCloud');
const downloadCloud = $('downloadCloud');
const googleLogout = $('googleLogout');
let auth = null;
let db = null;
let currentUser = null;
let busy = false;
let saveTimer = null;
let suppress = false;

function status(message, kind = 'idle') {
  if (syncText) syncText.textContent = message;
  if (info) info.textContent = message;
  if (syncDot) syncDot.style.background = kind === 'ok' ? '#22c55e' : kind === 'error' ? '#ef4444' : kind === 'busy' ? '#3b82f6' : '#f59e0b';
}

function userLabel(user) {
  return user?.displayName || user?.email || '已登入';
}

function setAuthControls(signedIn) {
  if (googleLogin) googleLogin.style.display = signedIn ? 'none' : '';
  [uploadCloud, downloadCloud, googleLogout].forEach(element => {
    if (element) element.style.display = signedIn ? '' : 'none';
  });
}

function updateAuthUI(user) {
  currentUser = user || null;
  const signedIn = Boolean(currentUser);
  setAuthControls(signedIn);
  if (!cloudButton) return;
  if (!signedIn) {
    cloudButton.textContent = '雲端登入';
    cloudButton.title = '開啟雲端登入';
    status('雲端同步：未登入', 'idle');
    return;
  }
  const name = userLabel(currentUser);
  cloudButton.textContent = name.length > 10 ? '已登入' : name;
  cloudButton.title = name;
  status(`已登入：${name}`, 'ok');
}

function errorText(error, action) {
  const code = error?.code || '';
  if (code.includes('popup-blocked')) return '登入視窗被封鎖，請允許彈出式視窗。';
  if (code.includes('popup-closed')) return '登入視窗已關閉。';
  if (code.includes('unauthorized-domain')) return '網站網域未加入 Firebase Authorized domains。';
  if (code.includes('permission-denied')) return 'Firestore 權限被拒絕。';
  return `${action}失敗：${error?.message || code || '未知錯誤'}`;
}

function timeout(promise, milliseconds = 15000) {
  let timer;
  return Promise.race([
    promise,
    new Promise((_, reject) => {
      timer = setTimeout(() => reject(new Error('同步逾時，請檢查網絡或 Firebase 權限。')), milliseconds);
    })
  ]).finally(() => clearTimeout(timer));
}

function cloudRef(fsmod, user) {
  return fsmod.doc(db, 'users', user.uid, 'portfolio', 'main');
}

setAuthControls(false);
cloudButton?.addEventListener('click', () => { if (modal) modal.style.display = 'grid'; });
$('closeCloud')?.addEventListener('click', () => { if (modal) modal.style.display = 'none'; });

async function start() {
  if (!configured) return status('Firebase 尚未設定。', 'error');
  try {
    const appmod = await import('https://www.gstatic.com/firebasejs/12.1.0/firebase-app.js');
    const authmod = await import('https://www.gstatic.com/firebasejs/12.1.0/firebase-auth.js');
    const fsmod = await import('https://www.gstatic.com/firebasejs/12.1.0/firebase-firestore.js');
    const app = appmod.initializeApp(firebaseConfig);
    auth = authmod.getAuth(app);
    db = fsmod.getFirestore(app);
    await authmod.setPersistence(auth, authmod.browserLocalPersistence);
    authmod.onAuthStateChanged(auth, updateAuthUI);

    googleLogin.onclick = () => {
      if (!auth) return status('Firebase 尚未完成載入。', 'error');
      const popup = authmod.signInWithPopup(auth, new authmod.GoogleAuthProvider());
      status('正在開啟 Google 登入...', 'busy');
      popup.then(result => updateAuthUI(result.user)).catch(error => status(errorText(error, '登入'), 'error'));
    };

    googleLogout.onclick = () => authmod.signOut(auth).catch(error => status(errorText(error, '登出'), 'error'));

    async function upload(data = window.ETFProApp?.getState?.()) {
      if (!currentUser) return status('請先登入 Google。', 'idle');
      if (busy || !data) return;
      busy = true;
      status('正在上載雲端...', 'busy');
      try {
        await timeout(fsmod.setDoc(cloudRef(fsmod, currentUser), {
          state: data,
          updatedAt: fsmod.serverTimestamp()
        }, { merge: true }));
        status('雲端同步完成', 'ok');
      } catch (error) {
        status(errorText(error, '上載'), 'error');
      } finally {
        busy = false;
      }
    }

    uploadCloud.onclick = () => upload();
    downloadCloud.onclick = async () => {
      if (!currentUser) return status('請先登入 Google。', 'idle');
      if (busy || !confirm('下載雲端資料會覆蓋目前本機資料，確定繼續？')) return;
      busy = true;
      status('正在下載雲端資料...', 'busy');
      try {
        const snapshot = await timeout(fsmod.getDoc(cloudRef(fsmod, currentUser)));
        if (!snapshot.exists()) throw new Error('雲端未有資料。');
        localStorage.setItem('ETF_CORE_PRO_V1_PRE_CLOUD_DOWNLOAD', JSON.stringify(window.ETFProApp.getState()));
        suppress = true;
        try {
          window.ETFProApp.setState(snapshot.data().state || {});
        } finally {
          suppress = false;
        }
        status('雲端資料已下載', 'ok');
      } catch (error) {
        status(errorText(error, '下載'), 'error');
      } finally {
        busy = false;
      }
    };

    window.addEventListener('etf-local-save', event => {
      if (!currentUser || suppress || busy) return;
      clearTimeout(saveTimer);
      status('等候同步...', 'idle');
      saveTimer = setTimeout(() => upload(event.detail), 1800);
    });
  } catch (error) {
    status(errorText(error, 'Firebase 載入'), 'error');
  }
}

start();
window.addEventListener('offline', () => status('離線模式', 'idle'));
window.addEventListener('online', () => currentUser && status(`已登入：${userLabel(currentUser)}`, 'ok'));
