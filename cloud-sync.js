import { firebaseConfig } from './firebase-config.js';

const STORAGE_KEY = 'ETF_CORE_PRO_V1';
const COLLECTION = 'portfolioData';
const DOCUMENT_ID = 'main';
const el = id => document.getElementById(id);

let auth = null;
let db = null;
let api = null;
let user = null;
let loginBusy = false;
let autoSyncTimer = null;
let applyingCloud = false;

function setStatus(message, type = 'idle') {
  if (el('cloudInfo')) el('cloudInfo').textContent = message;
  if (el('syncText')) el('syncText').textContent = message;
  if (el('syncDot')) el('syncDot').style.background = type === 'ok' ? '#22c55e' : type === 'error' ? '#ef4444' : '#f59e0b';
}

function setControls(signedIn) {
  if (el('googleLogin')) el('googleLogin').style.display = signedIn ? 'none' : '';
  if (el('googleLogout')) el('googleLogout').style.display = signedIn ? '' : 'none';
  if (el('uploadCloud')) el('uploadCloud').style.display = signedIn ? '' : 'none';
  if (el('downloadCloud')) el('downloadCloud').style.display = signedIn ? '' : 'none';
}

function validConfig() {
  return ['apiKey', 'authDomain', 'projectId', 'appId'].every(key => {
    const value = firebaseConfig?.[key];
    return typeof value === 'string' && value.length > 4 && !value.includes('YOUR_');
  });
}

function readLocal() {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}'); }
  catch { return {}; }
}

function localTime(data = readLocal()) {
  return Date.parse(data.lastSaved || data.updatedAt || '') || 0;
}

function friendly(error) {
  const code = error?.code || '';
  if (code === 'auth/unauthorized-domain') return '登入失敗：請將 GitHub Pages 網域加入 Firebase Authorized domains。';
  if (code === 'auth/operation-not-allowed') return '登入失敗：Firebase 尚未啟用 Google 登入。';
  if (code === 'auth/popup-blocked') return '登入視窗被封鎖，請允許 Safari 彈出式視窗後再試。';
  if (code === 'auth/popup-closed-by-user') return 'Google 登入視窗已關閉。';
  if (code === 'auth/network-request-failed') return '登入失敗：請檢查網絡。';
  return `Google 登入失敗：${error?.message || code || '未知錯誤'}`;
}

function reference() {
  return api.doc(db, COLLECTION, user.uid, 'documents', DOCUMENT_ID);
}

async function upload(showMessage = true) {
  if (!user) throw new Error('請先登入 Google 帳戶');
  const payload = readLocal();
  const updatedAt = new Date().toISOString();
  payload.lastSaved = payload.lastSaved || updatedAt;
  await api.setDoc(reference(), { ownerUid: user.uid, updatedAt, payload }, { merge: true });
  if (showMessage) setStatus('雲端上載完成', 'ok');
}

function applyCloud(payload) {
  applyingCloud = true;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(payload || {}));
  sessionStorage.setItem('ETF_CLOUD_MESSAGE', '已下載雲端資料');
  location.reload();
}

async function download(force = false) {
  if (!user) throw new Error('請先登入 Google 帳戶');
  const snapshot = await api.getDoc(reference());
  if (!snapshot.exists()) {
    setStatus('雲端未有資料，正在上載本機版本', 'idle');
    await upload(true);
    return;
  }
  const cloud = snapshot.data();
  const cloudTime = Date.parse(cloud.updatedAt || cloud.payload?.lastSaved || '') || 0;
  if (force || cloudTime > localTime()) applyCloud(cloud.payload || {});
  else await upload(true);
}

async function startLogin(event) {
  event?.preventDefault();
  event?.stopPropagation();
  if (loginBusy) return;
  loginBusy = true;
  setStatus('正在開啟 Google 登入…', 'idle');
  try {
    if (!auth || !api) throw new Error('Firebase 尚未完成載入，請稍後再試。');
    const provider = new api.GoogleAuthProvider();
    provider.setCustomParameters({ prompt: 'select_account' });
    try {
      await api.signInWithPopup(auth, provider);
    } catch (error) {
      if (error?.code === 'auth/popup-blocked') {
        setStatus('彈出視窗被封鎖，正在改用頁面跳轉登入…', 'idle');
        await api.signInWithRedirect(auth, provider);
        return;
      }
      throw error;
    }
  } catch (error) {
    console.error(error);
    const message = friendly(error);
    setStatus(message, 'error');
    alert(message);
  } finally {
    loginBusy = false;
  }
}

function bindButton(button, handler) {
  if (!button || button.dataset.boundCloud === '1') return;
  button.dataset.boundCloud = '1';
  button.type = 'button';
  button.style.pointerEvents = 'auto';
  button.style.touchAction = 'manipulation';
  button.addEventListener('click', handler, { passive: false });
  button.addEventListener('pointerup', event => {
    if (event.pointerType === 'touch') handler(event);
  }, { passive: false });
}

function bindUI() {
  bindButton(el('googleLogin'), startLogin);
  bindButton(el('googleLogout'), async event => {
    event.preventDefault();
    try { await api.signOut(auth); } catch (error) { setStatus(friendly(error), 'error'); }
  });
  bindButton(el('uploadCloud'), event => {
    event.preventDefault();
    upload(true).catch(error => setStatus(`上載失敗：${error.message}`, 'error'));
  });
  bindButton(el('downloadCloud'), event => {
    event.preventDefault();
    download(true).catch(error => setStatus(`下載失敗：${error.message}`, 'error'));
  });
}

function queueUpload() {
  if (!user || applyingCloud) return;
  clearTimeout(autoSyncTimer);
  autoSyncTimer = setTimeout(() => upload(false).catch(error => {
    console.error(error);
    setStatus('背景同步失敗', 'error');
  }), 1200);
}

async function initialize() {
  setControls(false);
  bindUI();
  if (!validConfig()) {
    setStatus('Firebase 設定未完成', 'error');
    return;
  }
  try {
    const [appModule, authModule, firestoreModule] = await Promise.all([
      import('https://www.gstatic.com/firebasejs/10.14.1/firebase-app.js'),
      import('https://www.gstatic.com/firebasejs/10.14.1/firebase-auth.js'),
      import('https://www.gstatic.com/firebasejs/10.14.1/firebase-firestore.js')
    ]);
    const app = appModule.initializeApp(firebaseConfig);
    auth = authModule.getAuth(app);
    auth.useDeviceLanguage();
    db = firestoreModule.getFirestore(app);
    api = { ...authModule, ...firestoreModule };

    const redirectResult = await authModule.getRedirectResult(auth);
    if (redirectResult?.user) setStatus(`已登入：${redirectResult.user.email || redirectResult.user.uid}`, 'ok');

    authModule.onAuthStateChanged(auth, async current => {
      user = current;
      setControls(Boolean(current));
      if (!current) {
        setStatus('同步狀態：尚未登入', 'idle');
        return;
      }
      setStatus(`已登入：${current.email || current.uid}`, 'ok');
      try { await download(false); }
      catch (error) { console.error(error); setStatus(`首次同步失敗：${error.message}`, 'error'); }
    });

    window.addEventListener('etf-local-save', queueUpload);
    setStatus('Firebase 已就緒，請登入 Google', 'idle');
  } catch (error) {
    console.error(error);
    setStatus(`Firebase 載入失敗：${error.message}`, 'error');
  }
}

if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', initialize, { once: true });
else initialize();
