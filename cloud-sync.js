import { firebaseConfig } from './firebase-config.js';

const configured = !Object.values(firebaseConfig).some(value => String(value).startsWith('PASTE_'));
const $ = id => document.getElementById(id);
const modal = $('cloudModal');
const btn = $('cloudBtn');
const info = $('cloudInfo');
const text = $('syncText');
const dot = $('syncDot');

let auth = null;
let db = null;
let user = null;
let unsub = null;
let saveTimer = null;
let initialReadTimer = null;
let suppress = false;
let syncBusy = false;

function setStatus(label, color = '#22c55e') {
  if (text) text.textContent = label;
  if (dot) dot.style.background = color;
}

function accountLabel(currentUser) {
  return currentUser?.displayName || currentUser?.email || '已登入';
}

function setControlsDisabled(disabled) {
  ['googleLogin', 'googleLogout', 'uploadCloud', 'downloadCloud'].forEach(id => {
    const element = $(id);
    if (element) element.disabled = disabled;
  });
}

function updateAuthUI(currentUser) {
  user = currentUser || null;
  if (!btn) return;
  if (!user) {
    btn.textContent = '雲端登入';
    btn.title = '登入 Google 帳戶';
    setStatus('雲端同步：未登入', '#f59e0b');
    if (info) info.textContent = '登入後可上載或下載投資組合資料。';
    return;
  }
  const display = accountLabel(user);
  btn.textContent = display.length > 12 ? '已登入' : display;
  btn.title = display;
  if (info) info.textContent = `Google帳戶：${display}`;
}

function readableError(error) {
  const code = error?.code || '';
  if (code.includes('permission-denied')) return 'Firestore 權限被拒絕，請檢查 Security Rules。';
  if (code.includes('unavailable')) return '雲端服務暫時無法連線，請稍後再試。';
  if (code.includes('unauthenticated')) return '登入狀態已失效，請登出後重新登入。';
  if (code.includes('popup-blocked')) return '瀏覽器封鎖登入視窗，請允許彈出式視窗。';
  if (code.includes('popup-closed-by-user')) return '登入視窗已關閉，請重新嘗試。';
  return error?.message || code || '未知錯誤';
}

function stopInitialReadTimer() {
  if (initialReadTimer) clearTimeout(initialReadTimer);
  initialReadTimer = null;
}

if (!btn || !modal) throw new Error('Cloud login interface is missing');
btn.onclick = () => { modal.style.display = 'grid'; };
$('closeCloud').onclick = () => { modal.style.display = 'none'; };

if (!configured) {
  setStatus('雲端同步：未設定', '#f59e0b');
  if (info) info.textContent = '尚未填入 Firebase 設定。';
  setControlsDisabled(true);
}

async function start() {
  if (!configured) return;
  try {
    const appmod = await import('https://www.gstatic.com/firebasejs/12.1.0/firebase-app.js');
    const authmod = await import('https://www.gstatic.com/firebasejs/12.1.0/firebase-auth.js');
    const fsmod = await import('https://www.gstatic.com/firebasejs/12.1.0/firebase-firestore.js');
    const app = appmod.initializeApp(firebaseConfig);
    auth = authmod.getAuth(app);
    db = fsmod.getFirestore(app);
    window.FB = { ...authmod, ...fsmod };

    await authmod.setPersistence(auth, authmod.browserLocalPersistence);

    try {
      const result = await authmod.getRedirectResult(auth);
      if (result?.user) updateAuthUI(result.user);
    } catch (error) {
      console.error('Redirect login error:', error);
      setStatus('登入回傳失敗', '#ef4444');
      if (info) info.textContent = readableError(error);
    }

    authmod.onAuthStateChanged(auth, currentUser => {
      stopInitialReadTimer();
      if (unsub) { unsub(); unsub = null; }
      updateAuthUI(currentUser);
      if (!currentUser) return;

      setStatus('正在檢查雲端資料...', '#3b82f6');
      initialReadTimer = setTimeout(() => {
        if (!syncBusy) {
          setStatus('已登入，雲端回應較慢', '#f59e0b');
          if (info) info.textContent = `Google帳戶：${accountLabel(currentUser)}｜可嘗試「上載本機資料」或檢查 Firestore Rules。`;
        }
      }, 15000);

      const ref = fsmod.doc(db, 'users', currentUser.uid, 'portfolio', 'main');
      unsub = fsmod.onSnapshot(ref, snapshot => {
        stopInitialReadTimer();
        if (snapshot.exists()) {
          suppress = true;
          try {
            window.ETFProApp.setState(snapshot.data().state || {});
          } finally {
            suppress = false;
          }
          setStatus('雲端同步：已啟用', '#22c55e');
          if (info) info.textContent = `Google帳戶：${accountLabel(currentUser)}｜雲端資料已連接`;
        } else {
          setStatus('已登入，等待首次上載', '#f59e0b');
          if (info) info.textContent = `Google帳戶：${accountLabel(currentUser)}｜雲端尚未有資料，請按「上載本機資料」。`;
        }
      }, error => {
        stopInitialReadTimer();
        console.error('Cloud snapshot error:', error);
        setStatus('雲端讀取失敗', '#ef4444');
        if (info) info.textContent = readableError(error);
      });
    });

    $('googleLogin').onclick = () => {
      const provider = new authmod.GoogleAuthProvider();
      authmod.signInWithPopup(auth, provider).catch(error => {
        console.error('Google login error:', error);
        setStatus('登入失敗', '#ef4444');
        if (info) info.textContent = readableError(error);
      });
    };

    $('googleLogout').onclick = async () => {
      await authmod.signOut(auth);
      updateAuthUI(null);
    };

    async function writeCloud(savedState = window.ETFProApp.getState()) {
      if (!user || syncBusy) return;
      syncBusy = true;
      setStatus('正在上載雲端...', '#3b82f6');
      try {
        await fsmod.setDoc(fsmod.doc(db, 'users', user.uid, 'portfolio', 'main'), {
          state: savedState,
          updatedAt: fsmod.serverTimestamp()
        }, { merge: true });
        setStatus('雲端同步：已啟用', '#22c55e');
        if (info) info.textContent = `Google帳戶：${accountLabel(user)}｜上載完成`;
      } catch (error) {
        console.error('Cloud write error:', error);
        setStatus('雲端上載失敗', '#ef4444');
        if (info) info.textContent = readableError(error);
      } finally {
        syncBusy = false;
      }
    }

    $('uploadCloud').onclick = () => {
      if (!user) return setStatus('請先登入 Google', '#f59e0b');
      writeCloud();
    };

    $('downloadCloud').onclick = async () => {
      if (!user) return setStatus('請先登入 Google', '#f59e0b');
      if (syncBusy) return;
      syncBusy = true;
      setStatus('正在下載雲端資料...', '#3b82f6');
      try {
        const snapshot = await fsmod.getDoc(fsmod.doc(db, 'users', user.uid, 'portfolio', 'main'));
        if (snapshot.exists()) {
          suppress = true;
          try {
            window.ETFProApp.setState(snapshot.data().state || {});
          } finally {
            suppress = false;
          }
          setStatus('雲端同步：已啟用', '#22c55e');
          if (info) info.textContent = `Google帳戶：${accountLabel(user)}｜下載完成`;
        } else {
          setStatus('雲端未有資料', '#f59e0b');
          if (info) info.textContent = '請先在有最新資料的裝置按「上載本機資料」。';
        }
      } catch (error) {
        console.error('Cloud download error:', error);
        setStatus('雲端下載失敗', '#ef4444');
        if (info) info.textContent = readableError(error);
      } finally {
        syncBusy = false;
      }
    };

    window.addEventListener('etf-local-save', event => {
      if (suppress || !user) return;
      clearTimeout(saveTimer);
      setStatus('等候同步...', '#3b82f6');
      saveTimer = setTimeout(() => writeCloud(event.detail), 800);
    });
  } catch (error) {
    console.error('Firebase initialization error:', error);
    setStatus('Firebase載入失敗', '#ef4444');
    if (info) info.textContent = readableError(error);
  }
}

start();
window.addEventListener('online', () => user && setStatus('正在重新連線...', '#3b82f6'));
window.addEventListener('offline', () => setStatus('離線模式', '#f59e0b'));
