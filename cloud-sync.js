import { firebaseConfig } from './firebase-config.js';

const configured = !Object.values(firebaseConfig).some(value => String(value).startsWith('PASTE_'));
const $ = id => document.getElementById(id);
const modal = $('cloudModal');
const btn = $('cloudBtn');
const info = $('cloudInfo');
const text = $('syncText');
const dot = $('syncDot');
const mobileLogin = () => matchMedia('(max-width:760px)').matches || matchMedia('(display-mode:standalone)').matches;

let auth = null;
let db = null;
let user = null;
let unsub = null;
let suppress = false;
let timer = null;

function status(label, color = '#22c55e') {
  if (text) text.textContent = label;
  if (dot) dot.style.background = color;
}

function updateAuthUI(currentUser) {
  user = currentUser || null;
  if (!btn) return;
  if (!user) {
    btn.textContent = '雲端登入';
    btn.title = '登入 Google 帳戶';
    status('雲端同步：未登入', '#f59e0b');
    return;
  }
  const display = user.displayName || user.email || '已登入';
  btn.textContent = display.length > 12 ? '已登入' : display;
  btn.title = display;
  status('雲端同步：已登入', '#22c55e');
  if (info) info.textContent = `Google帳戶：${display}`;
}

if (!btn || !modal) throw new Error('Cloud login interface is missing');
btn.onclick = () => { modal.style.display = 'grid'; };
$('closeCloud').onclick = () => { modal.style.display = 'none'; };

if (!configured) {
  status('雲端同步：未設定', '#f59e0b');
  if (info) info.textContent = '尚未填入 Firebase 設定。';
  ['googleLogin', 'googleLogout', 'uploadCloud', 'downloadCloud'].forEach(id => {
    const element = $(id);
    if (element) element.disabled = true;
  });
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

    // Firebase modular equivalent of firebase.auth().setPersistence(Auth.Persistence.LOCAL).
    await authmod.setPersistence(auth, authmod.browserLocalPersistence);

    // Always process a completed redirect when the PWA returns from Google sign-in.
    try {
      const result = await authmod.getRedirectResult(auth);
      if (result?.user) {
        updateAuthUI(result.user);
        if (info) info.textContent = `Google帳戶：${result.user.displayName || result.user.email || '已登入'}｜登入完成`;
      }
    } catch (error) {
      console.error('Redirect login error:', error);
      if (info) info.textContent = `重新導向登入失敗：${error.message || error.code || '未知錯誤'}`;
      status('登入失敗', '#ef4444');
    }

    authmod.onAuthStateChanged(auth, currentUser => {
      updateAuthUI(currentUser);
      if (unsub) { unsub(); unsub = null; }
      if (!currentUser) return;
      status('正在同步...', '#3b82f6');
      const ref = fsmod.doc(db, 'users', currentUser.uid, 'portfolio', 'main');
      unsub = fsmod.onSnapshot(ref, snapshot => {
        if (snapshot.exists()) {
          suppress = true;
          window.ETFProApp.setState(snapshot.data().state || {});
          suppress = false;
          status('雲端同步：已啟用', '#22c55e');
          if (info) info.textContent = `Google帳戶：${currentUser.displayName || currentUser.email || '已登入'}｜資料已同步`;
        } else {
          status('雲端已啟用，等待首次上載', '#f59e0b');
        }
      }, error => {
        console.error('Cloud snapshot error:', error);
        status('同步失敗，請重試', '#ef4444');
      });
    });

    $('googleLogin').onclick = async () => {
      try {
        await authmod.setPersistence(auth, authmod.browserLocalPersistence);
        const provider = new authmod.GoogleAuthProvider();
        if (mobileLogin()) await authmod.signInWithRedirect(auth, provider);
        else await authmod.signInWithPopup(auth, provider);
      } catch (error) {
        console.error('Google login error:', error);
        if (info) info.textContent = error.message || error.code || '登入失敗';
        status('登入失敗', '#ef4444');
      }
    };

    $('googleLogout').onclick = async () => {
      await authmod.signOut(auth);
      updateAuthUI(null);
    };
    $('uploadCloud').onclick = () => user ? writeCloud() : status('請先登入 Google', '#f59e0b');
    $('downloadCloud').onclick = async () => {
      if (!user) return status('請先登入 Google', '#f59e0b');
      const snapshot = await fsmod.getDoc(fsmod.doc(db, 'users', user.uid, 'portfolio', 'main'));
      if (snapshot.exists()) window.ETFProApp.setState(snapshot.data().state || {});
    };
    window.addEventListener('etf-local-save', event => {
      if (suppress || !user) return;
      clearTimeout(timer);
      status('正在同步...', '#3b82f6');
      timer = setTimeout(() => writeCloud(event.detail), 600);
    });

    async function writeCloud(savedState = window.ETFProApp.getState()) {
      if (!user) return;
      await fsmod.setDoc(fsmod.doc(db, 'users', user.uid, 'portfolio', 'main'), {
        state: savedState,
        updatedAt: fsmod.serverTimestamp()
      }, { merge: true });
      status('雲端同步：已啟用', '#22c55e');
    }
  } catch (error) {
    console.error('Firebase initialization error:', error);
    status('Firebase載入失敗', '#ef4444');
    if (info) info.textContent = error.message || 'Firebase載入失敗';
  }
}

start();
window.addEventListener('online', () => user && status('正在重新連線...', '#3b82f6'));
window.addEventListener('offline', () => status('離線模式', '#f59e0b'));
