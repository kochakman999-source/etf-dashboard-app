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
let fs = null;
let currentUser = null;
let uploadTimer = null;
let uploadInFlight = false;
let pendingState = null;
let applyingCloudState = false;
let startupPullDoneForUid = '';

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
  if (uploadCloud) uploadCloud.style.display = 'none';
  if (downloadCloud) downloadCloud.style.display = 'none';
  if (googleLogout) googleLogout.style.display = signedIn ? '' : 'none';
}

function localState() {
  return window.ETFProApp?.getState?.() || {};
}

function validTime(value) {
  const time = Date.parse(value || '');
  return Number.isFinite(time) ? time : 0;
}

function localUpdatedAt(state = localState()) {
  return Math.max(validTime(state.lastSaved), validTime(state.lastCloudSync));
}

function cloudUpdatedAt(snapshot) {
  const data = snapshot.data() || {};
  const timestamp = data.updatedAt;
  if (timestamp?.toMillis) return timestamp.toMillis();
  return validTime(data.clientUpdatedAt || data.state?.lastSaved);
}

function cloudRef(user) {
  return fs.doc(db, 'users', user.uid, 'portfolio', 'main');
}

function errorText(error, action) {
  const code = error?.code || '';
  if (code.includes('popup-blocked')) return '登入視窗被封鎖，請允許彈出式視窗。';
  if (code.includes('popup-closed')) return '登入視窗已關閉。';
  if (code.includes('unauthorized-domain')) return '網站網域未加入 Firebase Authorized domains。';
  if (code.includes('permission-denied')) return 'Firestore 權限被拒絕，請檢查 Security Rules。';
  if (code.includes('unavailable') || code.includes('network-request-failed')) return `${action}失敗：網絡或 Firebase 暫時無法連線。`;
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

function applyDownloadedState(nextState) {
  if (!nextState || typeof nextState !== 'object') throw new Error('雲端資料格式不正確。');
  localStorage.setItem('ETF_CORE_PRO_V1_PRE_AUTO_CLOUD_DOWNLOAD', JSON.stringify(localState()));
  applyingCloudState = true;
  try {
    const cleanState = JSON.parse(JSON.stringify(nextState));
    cleanState.lastCloudSync = new Date().toISOString();
    window.ETFProApp.setState(cleanState);
  } finally {
    applyingCloudState = false;
  }
}

async function pushState(state, reason = '自動') {
  if (!currentUser || !fs || !state) return;
  pendingState = state;
  if (uploadInFlight) return;
  uploadInFlight = true;
  try {
    while (pendingState && currentUser) {
      const next = pendingState;
      pendingState = null;
      status(`${reason}同步中...`, 'busy');
      const clientUpdatedAt = next.lastSaved || new Date().toISOString();
      await withTimeout(fs.setDoc(cloudRef(currentUser), {
        state: next,
        clientUpdatedAt,
        updatedAt: fs.serverTimestamp()
      }, { merge: true }));
      status('同步狀態：🟢 已與雲端同步', 'ok');
    }
  } catch (error) {
    pendingState = pendingState || state;
    status(errorText(error, '自動同步'), 'error');
  } finally {
    uploadInFlight = false;
  }
}

function scheduleUpload(state) {
  if (!currentUser || applyingCloudState || !state) return;
  pendingState = state;
  clearTimeout(uploadTimer);
  status('同步狀態：🟡 等候上載', 'idle');
  uploadTimer = setTimeout(() => pushState(pendingState, '背景自動'), 900);
}

async function pullLatestOnLogin(user) {
  if (!user || startupPullDoneForUid === user.uid) return;
  startupPullDoneForUid = user.uid;
  status('同步狀態：🔵 正在檢查雲端資料', 'busy');
  try {
    const snapshot = await withTimeout(fs.getDoc(cloudRef(user)));
    if (!snapshot.exists()) {
      await pushState(localState(), '首次');
      return;
    }
    const remote = snapshot.data()?.state;
    const remoteTime = cloudUpdatedAt(snapshot);
    const localTime = localUpdatedAt();
    if (remote && remoteTime > localTime) {
      applyDownloadedState(remote);
      status('同步狀態：🟢 已載入較新雲端資料', 'ok');
    } else if (localTime > remoteTime) {
      await pushState(localState(), '啟動');
    } else {
      status('同步狀態：🟢 已與雲端同步', 'ok');
    }
  } catch (error) {
    startupPullDoneForUid = '';
    status(errorText(error, '啟動同步'), 'error');
  }
}

function updateAuthUI(user) {
  currentUser = user || null;
  const signedIn = Boolean(currentUser);
  setAuthControls(signedIn);
  if (!signedIn) {
    startupPullDoneForUid = '';
    if (cloudButton) {
      cloudButton.textContent = '雲端登入';
      cloudButton.title = '開啟雲端登入';
    }
    status('同步狀態：尚未登入', 'idle');
    return;
  }
  const name = userLabel(currentUser);
  if (cloudButton) {
    cloudButton.textContent = name.length > 10 ? '已登入' : name;
    cloudButton.title = name;
  }
  status(`已登入：${name}`, 'ok');
  void pullLatestOnLogin(currentUser);
}

setAuthControls(false);
cloudButton?.addEventListener('click', () => { if (modal) modal.style.display = 'grid'; });
$('closeCloud')?.addEventListener('click', () => { if (modal) modal.style.display = 'none'; });
window.addEventListener('etf-local-save', event => scheduleUpload(event.detail));

async function start() {
  if (!configured) return status('Firebase 尚未設定。', 'error');
  try {
    const appmod = await import('https://www.gstatic.com/firebasejs/12.1.0/firebase-app.js');
    const authmod = await import('https://www.gstatic.com/firebasejs/12.1.0/firebase-auth.js');
    fs = await import('https://www.gstatic.com/firebasejs/12.1.0/firebase-firestore.js');
    const app = appmod.initializeApp(firebaseConfig);
    auth = authmod.getAuth(app);
    db = fs.getFirestore(app);
    await authmod.setPersistence(auth, authmod.browserLocalPersistence);
    authmod.onAuthStateChanged(auth, updateAuthUI);

    googleLogin.onclick = () => {
      if (!auth) return status('Firebase 尚未完成載入。', 'error');
      const popup = authmod.signInWithPopup(auth, new authmod.GoogleAuthProvider());
      status('正在開啟 Google 登入...', 'busy');
      popup.catch(error => status(errorText(error, '登入'), 'error'));
    };

    googleLogout.onclick = () => authmod.signOut(auth).catch(error => status(errorText(error, '登出'), 'error'));
  } catch (error) {
    status(errorText(error, 'Firebase 載入'), 'error');
  }
}

start();
window.addEventListener('offline', () => status('同步狀態：離線，資料已保存在本機', 'idle'));
window.addEventListener('online', () => {
  if (currentUser) {
    if (pendingState) void pushState(pendingState, '重新連線');
    else void pullLatestOnLogin(currentUser);
  }
});
