import { firebaseConfig } from "./firebase-config.js";

const STORAGE_KEY = "ETF_CORE_PRO_V1";
const COLLECTION = "portfolioData";
const DOCUMENT = "main";
const el = id => document.getElementById(id);

let currentUser = null;
let db = null;
let fs = null;
let authApi = null;
let auth = null;
let uploadTimer = null;
let suppressAutoUpload = false;

function configIsValid() {
  const required = ["apiKey", "authDomain", "projectId", "appId"];
  return required.every(key => {
    const value = firebaseConfig?.[key];
    return typeof value === "string" && value.length > 4 && !value.includes("YOUR_");
  });
}

function status(text, mode = "idle") {
  if (el("cloudInfo")) el("cloudInfo").textContent = text;
  if (el("syncText")) el("syncText").textContent = text;
  if (el("syncDot")) {
    el("syncDot").style.background = mode === "ok" ? "#22c55e" : mode === "error" ? "#ef4444" : "#f59e0b";
  }
}

function controls(signedIn) {
  if (el("googleLogin")) el("googleLogin").style.display = signedIn ? "none" : "inline-block";
  if (el("googleLogout")) el("googleLogout").style.display = signedIn ? "inline-block" : "none";
  if (el("uploadCloud")) el("uploadCloud").style.display = signedIn ? "inline-block" : "none";
  if (el("downloadCloud")) el("downloadCloud").style.display = signedIn ? "inline-block" : "none";
}

function localData() {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}"); }
  catch { return {}; }
}

function localUpdatedAt(data = localData()) {
  const time = Date.parse(data.lastSaved || data.updatedAt || "");
  return Number.isFinite(time) ? time : 0;
}

function applyCloudData(data) {
  suppressAutoUpload = true;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  if (window.ETFProApp?.setState) window.ETFProApp.setState(data);
  else if (window.ETFPortfolioApp?.setState) window.ETFPortfolioApp.setState(data);
  else location.reload();
  setTimeout(() => { suppressAutoUpload = false; }, 1000);
}

async function upload(showSuccess = true) {
  if (!currentUser || !db || !fs) throw new Error("請先登入Google帳戶");
  const payload = localData();
  const updatedAt = new Date().toISOString();
  payload.lastSaved = payload.lastSaved || updatedAt;
  const ref = fs.doc(db, COLLECTION, currentUser.uid, "documents", DOCUMENT);
  await fs.setDoc(ref, { ownerUid: currentUser.uid, updatedAt, payload }, { merge: true });
  if (showSuccess) status("雲端上載完成", "ok");
}

async function download(force = false) {
  if (!currentUser || !db || !fs) throw new Error("請先登入Google帳戶");
  const ref = fs.doc(db, COLLECTION, currentUser.uid, "documents", DOCUMENT);
  const snap = await fs.getDoc(ref);
  if (!snap.exists()) {
    status("雲端未有資料，正在上載本機版本", "idle");
    await upload(true);
    return;
  }
  const cloud = snap.data();
  const cloudTime = Date.parse(cloud.updatedAt || cloud.payload?.lastSaved || "") || 0;
  if (force || cloudTime > localUpdatedAt()) {
    applyCloudData(cloud.payload || {});
    status("已下載雲端資料", "ok");
  } else {
    status("本機資料較新，正在上載", "idle");
    await upload(true);
  }
}

function friendlyAuthError(error) {
  const code = error?.code || "";
  if (code === "auth/unauthorized-domain") return "登入失敗：請在Firebase Authentication加入GitHub Pages網域。";
  if (code === "auth/operation-not-allowed") return "登入失敗：Firebase尚未啟用Google登入。";
  if (code === "auth/popup-blocked") return "登入視窗被瀏覽器封鎖，請允許彈出視窗後再試。";
  if (code === "auth/popup-closed-by-user") return "Google登入視窗已關閉。";
  if (code === "auth/network-request-failed") return "登入失敗：請檢查網絡連線。";
  return `Google登入失敗：${error?.message || code || "未知錯誤"}`;
}

function queueUpload() {
  if (!currentUser || suppressAutoUpload) return;
  clearTimeout(uploadTimer);
  uploadTimer = setTimeout(() => upload(false).catch(error => {
    console.error("Auto sync failed", error);
    status("自動同步失敗", "error");
  }), 1000);
}

async function init() {
  controls(false);
  if (!configIsValid()) {
    status("Firebase設定未完成，雲端登入已停用", "error");
    return;
  }

  try {
    const [appModule, authModule, firestoreModule] = await Promise.all([
      import("https://www.gstatic.com/firebasejs/10.14.1/firebase-app.js"),
      import("https://www.gstatic.com/firebasejs/10.14.1/firebase-auth.js"),
      import("https://www.gstatic.com/firebasejs/10.14.1/firebase-firestore.js")
    ]);

    const app = appModule.initializeApp(firebaseConfig);
    authApi = authModule;
    fs = firestoreModule;
    auth = authModule.getAuth(app);
    auth.useDeviceLanguage();
    db = firestoreModule.getFirestore(app);
    const provider = new authModule.GoogleAuthProvider();
    provider.setCustomParameters({ prompt: "select_account" });

    el("googleLogin")?.addEventListener("click", async () => {
      status("正在開啟Google登入…", "idle");
      try {
        await authModule.signInWithPopup(auth, provider);
      } catch (error) {
        console.error("Google sign-in failed", error);
        status(friendlyAuthError(error), "error");
      }
    });

    el("googleLogout")?.addEventListener("click", async () => {
      try { await authModule.signOut(auth); }
      catch (error) { console.error(error); status("登出失敗", "error"); }
    });

    el("uploadCloud")?.addEventListener("click", () => upload(true).catch(error => {
      console.error(error); status(`上載失敗：${error.message}`, "error");
    }));

    el("downloadCloud")?.addEventListener("click", () => download(true).catch(error => {
      console.error(error); status(`下載失敗：${error.message}`, "error");
    }));

    authModule.onAuthStateChanged(auth, async user => {
      currentUser = user;
      controls(Boolean(user));
      if (!user) {
        status("同步狀態：尚未登入", "idle");
        return;
      }
      status(`已登入：${user.email || user.uid}`, "ok");
      try { await download(false); }
      catch (error) { console.error(error); status(`首次同步失敗：${error.message}`, "error"); }
    });

    window.addEventListener("etf-local-save", queueUpload);
    window.addEventListener("storage", event => {
      if (event.key === STORAGE_KEY) queueUpload();
    });
  } catch (error) {
    console.error("Firebase initialization failed", error);
    status(`Firebase載入失敗：${error.message}`, "error");
  }
}

init();
