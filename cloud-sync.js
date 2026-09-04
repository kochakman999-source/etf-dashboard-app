import { firebaseConfig, isFirebaseConfigured } from "./firebase-config.js";

const STORAGE_KEY = "ETF_CORE_PRO_V1";
const COLLECTION = "portfolioData";
const DOCUMENT = "main";
const el = id => document.getElementById(id);
let currentUser = null;
let db = null;
let api = null;
let uploadTimer = null;
let suppressAutoUpload = false;

function setStatus(text, state = "idle") {
  if (el("cloudInfo")) el("cloudInfo").textContent = text;
  if (el("syncText")) el("syncText").textContent = text;
  if (el("syncDot")) {
    el("syncDot").style.background = state === "ok" ? "#22c55e" : state === "error" ? "#ef4444" : "#f59e0b";
  }
}

function showControls(signedIn) {
  if (el("googleLogin")) el("googleLogin").style.display = signedIn ? "none" : "inline-block";
  if (el("googleLogout")) el("googleLogout").style.display = signedIn ? "inline-block" : "none";
  if (el("uploadCloud")) el("uploadCloud").style.display = signedIn ? "inline-block" : "none";
  if (el("downloadCloud")) el("downloadCloud").style.display = signedIn ? "inline-block" : "none";
}

function localPayload() {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}"); }
  catch { return {}; }
}

function localTime(data = localPayload()) {
  const value = data.lastSaved || data.updatedAt || "";
  const time = Date.parse(value);
  return Number.isFinite(time) ? time : 0;
}

function applyPayload(data) {
  suppressAutoUpload = true;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  if (window.ETFProApp?.setState) window.ETFProApp.setState(data);
  else if (window.ETFPortfolioApp?.setState) window.ETFPortfolioApp.setState(data);
  else location.reload();
  setTimeout(() => { suppressAutoUpload = false; }, 800);
}

async function upload(showMessage = true) {
  if (!currentUser || !db || !api) return;
  const data = localPayload();
  const updatedAt = new Date().toISOString();
  data.lastSaved = data.lastSaved || updatedAt;
  await api.setDoc(api.doc(db, COLLECTION, currentUser.uid, "documents", DOCUMENT), {
    ownerUid: currentUser.uid, updatedAt, payload: data
  }, { merge: true });
  if (showMessage) setStatus("雲端同步完成", "ok");
}

async function download(force = false) {
  if (!currentUser || !db || !api) return;
  const ref = api.doc(db, COLLECTION, currentUser.uid, "documents", DOCUMENT);
  const snap = await api.getDoc(ref);
  if (!snap.exists()) {
    setStatus("雲端未有資料，已準備上載本機版本", "idle");
    await upload();
    return;
  }
  const cloud = snap.data();
  const cloudTime = Date.parse(cloud.updatedAt || cloud.payload?.lastSaved || "") || 0;
  if (force || cloudTime > localTime()) {
    applyPayload(cloud.payload || {});
    setStatus("已下載較新的雲端資料", "ok");
  } else {
    setStatus("本機資料較新，已準備上載", "idle");
    await upload();
  }
}

function queueUpload() {
  if (!currentUser || suppressAutoUpload) return;
  clearTimeout(uploadTimer);
  uploadTimer = setTimeout(() => upload(false).catch(error => {
    console.error("Auto cloud sync failed", error);
    setStatus("自動同步失敗", "error");
  }), 900);
}

async function init() {
  showControls(false);
  if (!isFirebaseConfigured()) {
    setStatus("Firebase 尚未設定，雲端同步已安全停用", "idle");
    return;
  }
  try {
    const [appMod, authMod, fsMod] = await Promise.all([
      import("https://www.gstatic.com/firebasejs/10.14.1/firebase-app.js"),
      import("https://www.gstatic.com/firebasejs/10.14.1/firebase-auth.js"),
      import("https://www.gstatic.com/firebasejs/10.14.1/firebase-firestore.js")
    ]);
    const app = appMod.initializeApp(firebaseConfig);
    const auth = authMod.getAuth(app);
    db = fsMod.getFirestore(app);
    api = fsMod;
    const provider = new authMod.GoogleAuthProvider();
    el("googleLogin")?.addEventListener("click", async () => {
      try { await authMod.signInWithPopup(auth, provider); }
      catch (error) { console.error(error); setStatus("Google 登入失敗", "error"); }
    });
    el("googleLogout")?.addEventListener("click", () => authMod.signOut(auth));
    el("uploadCloud")?.addEventListener("click", () => upload().catch(error => { console.error(error); setStatus("上載失敗", "error"); }));
    el("downloadCloud")?.addEventListener("click", () => download(true).catch(error => { console.error(error); setStatus("下載失敗", "error"); }));
    authMod.onAuthStateChanged(auth, async user => {
      currentUser = user;
      showControls(Boolean(user));
      if (!user) { setStatus("同步狀態：尚未登入", "idle"); return; }
      setStatus(`已登入：${user.email || user.uid}`, "ok");
      try { await download(false); } catch (error) { console.error(error); setStatus("首次同步失敗", "error"); }
    });
    window.addEventListener("etf-local-save", queueUpload);
    window.addEventListener("storage", event => { if (event.key === STORAGE_KEY) queueUpload(); });
  } catch (error) {
    console.error("Firebase initialization failed", error);
    setStatus("Firebase 載入失敗，本機功能不受影響", "error");
  }
}

init();
