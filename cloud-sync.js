import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import {
    getAuth,
    GoogleAuthProvider,
    signInWithPopup,
    signOut,
    onAuthStateChanged,
    setPersistence,
    browserLocalPersistence
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";
import {
    getFirestore,
    doc,
    setDoc,
    getDoc,
    serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";
import { firebaseConfig } from "./firebase-config.js";

// 初始化 Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const provider = new GoogleAuthProvider();

// 獲取 DOM 元素
const loginBtn = document.getElementById('googleLogin');
const logoutBtn = document.getElementById('googleLogout');
const uploadBtn = document.getElementById('uploadCloud');
const downloadBtn = document.getElementById('downloadCloud');
const cloudInfo = document.getElementById('cloudInfo');

// 1. 強制設定持久化（記住登入狀態）
setPersistence(auth, browserLocalPersistence).catch(console.error);

// 2. 監聽登入狀態改變（自動同步）
onAuthStateChanged(auth, async (user) => {
    if (user) {
        if (cloudInfo) cloudInfo.textContent = `已登入：${user.email}`;
        if (loginBtn) loginBtn.style.display = 'none';
        if (logoutBtn) logoutBtn.style.display = 'inline-block';
        if (uploadBtn) uploadBtn.style.display = 'inline-block';
        if (downloadBtn) downloadBtn.style.display = 'inline-block';

        // 登入成功後自動從雲端同步一次，解決 Refresh 歸零問題
        await fetchCloudData(user, false);
    } else {
        if (cloudInfo) cloudInfo.textContent = '同步狀態：尚未登入';
        if (loginBtn) loginBtn.style.display = 'inline-block';
        if (logoutBtn) logoutBtn.style.display = 'none';
        if (uploadBtn) uploadBtn.style.display = 'none';
        if (downloadBtn) downloadBtn.style.display = 'none';
    }
});

// 核心：拉取雲端資料函數
async function fetchCloudData(user, isManual = false) {
    if (!user) return;
    try {
        if (cloudInfo && isManual) cloudInfo.textContent = '正在從雲端下載資料...';
        
        // 修正：完全對齊 firestore.rules 的四層路徑結構
        const docRef = doc(db, "portfolioData", user.uid, "documents", "main");
        const docSnap = await getDoc(docRef);

        if (docSnap.exists()) {
            const cloudData = docSnap.data();
            if (cloudData && cloudData.data) {
                const parsedData = JSON.parse(cloudData.data);
                if (window.ETFProApp && typeof window.ETFProApp.setState === 'function') {
                    window.ETFProApp.setState(parsedData);
                }
                if (cloudInfo) cloudInfo.textContent = `已同步雲端資料 (${new Date().toLocaleTimeString()})`;
            }
        } else {
            // 雲端若為空，檢查本機是否有數據，有的話自動上傳初始備份
            if (window.ETFProApp && typeof window.ETFProApp.getState === 'function') {
                const localState = window.ETFProApp.getState();
                if (localState && (localState.etfs?.length || localState.transactions?.length)) {
                    await uploadData(user, true);
                }
            }
            if (cloudInfo) cloudInfo.textContent = '雲端無備份，已保留本機資料。';
        }
    } catch (error) {
        console.error("Download Error:", error);
        if (cloudInfo) cloudInfo.textContent = `同步失敗：${error.message}`;
    }
}

// 核心：上傳資料至雲端函數
async function uploadData(user, isAuto = false) {
    if (!user) return;
    try {
        if (cloudInfo && !isAuto) cloudInfo.textContent = '正在上載資料至雲端...';
        if (uploadBtn) uploadBtn.disabled = true;

        const currentState = window.ETFProApp.getState();
        // 修正：完全對齊 firestore.rules 的四層路徑結構
        const docRef = doc(db, "portfolioData", user.uid, "documents", "main");

        await setDoc(docRef, {
            data: JSON.stringify(currentState),
            updatedAt: serverTimestamp()
        }, { merge: true });

        if (cloudInfo) cloudInfo.textContent = `上載成功！(${new Date().toLocaleTimeString()})`;
        if (!isAuto && window.ETFProApp?.notify) window.ETFProApp.notify('資料已成功備份至雲端');
    } catch (error) {
        console.error("Upload Error:", error);
        if (cloudInfo) cloudInfo.textContent = `上載失敗：${error.message}`;
    } finally {
        if (uploadBtn) uploadBtn.disabled = false;
    }
}

// 登入按鈕
loginBtn?.addEventListener('click', async () => {
    try {
        if (cloudInfo) cloudInfo.textContent = '正在開啟 Google 登入...';
        await signInWithPopup(auth, provider);
    } catch (error) {
        console.error("Login Error:", error);
        if (cloudInfo) cloudInfo.textContent = `登入失敗：${error.message}`;
        alert(`登入發生錯誤：[${error.code}]\n${error.message}`);
    }
});

// 登出按鈕
logoutBtn?.addEventListener('click', async () => {
    try {
        await signOut(auth);
    } catch (error) {
        console.error("Logout Error:", error);
    }
});

// 手動上載按鈕
uploadBtn?.addEventListener('click', () => uploadData(auth.currentUser, false));

// 手動下載按鈕
downloadBtn?.addEventListener('click', () => fetchCloudData(auth.currentUser, true));