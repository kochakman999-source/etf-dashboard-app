import { firebaseConfig } from './firebase-config.js';
const $=id=>document.getElementById(id),configured=!Object.values(firebaseConfig).some(v=>!v||String(v).startsWith('PASTE_')||String(v).startsWith('REPLACE_'));
const modal=$('cloudModal'),cloudButton=$('cloudBtn'),info=$('cloudInfo'),syncText=$('syncText'),syncDot=$('syncDot');
let auth=null,db=null,currentUser=null,busy=false,saveTimer=null,suppress=false;
function status(message,kind='idle'){if(syncText)syncText.textContent=message;if(info)info.textContent=message;if(syncDot)syncDot.style.background=kind==='ok'?'#22c55e':kind==='error'?'#ef4444':kind==='busy'?'#3b82f6':'#f59e0b'}
function label(u){return u?.displayName||u?.email||'已登入'}
function authUI(u){currentUser=u||null;if(!cloudButton)return;if(!u){cloudButton.textContent='雲端登入';cloudButton.title='開啟雲端登入';return status('雲端同步：未登入')}const x=label(u);cloudButton.textContent=x.length>10?'已登入':x;cloudButton.title=x;status(`已登入：${x}`,'ok')}
function errorText(e,a){const c=e?.code||'';if(c.includes('popup-blocked'))return'登入視窗被封鎖，請允許彈出式視窗。';if(c.includes('popup-closed'))return'登入視窗已關閉。';if(c.includes('unauthorized-domain'))return'網站網域未加入 Firebase Authorized domains。';if(c.includes('permission-denied'))return'Firestore 權限被拒絕。';return`${a}失敗：${e?.message||c||'未知錯誤'}`}
function timeout(p,ms=15000){let t;return Promise.race([p,new Promise((_,r)=>{t=setTimeout(()=>r(Error('同步逾時，請檢查網絡或 Firebase 權限。')),ms)})]).finally(()=>clearTimeout(t))}
function ref(fs,u){return fs.doc(db,'users',u.uid,'portfolio','main')}
cloudButton?.addEventListener('click',()=>{if(modal)modal.style.display='grid'});$('closeCloud')?.addEventListener('click',()=>{if(modal)modal.style.display='none'});
async function start(){if(!configured)return status('Firebase 尚未設定。','error');try{const appmod=await import('https://www.gstatic.com/firebasejs/12.1.0/firebase-app.js'),authmod=await import('https://www.gstatic.com/firebasejs/12.1.0/firebase-auth.js'),fsmod=await import('https://www.gstatic.com/firebasejs/12.1.0/firebase-firestore.js');const app=appmod.initializeApp(firebaseConfig);auth=authmod.getAuth(app);db=fsmod.getFirestore(app);await authmod.setPersistence(auth,authmod.browserLocalPersistence);authmod.onAuthStateChanged(auth,authUI);
$('googleLogin').onclick=()=>{if(!auth)return status('Firebase 尚未完成載入。','error');const popup=authmod.signInWithPopup(auth,new authmod.GoogleAuthProvider());status('正在開啟 Google 登入...','busy');popup.then(r=>authUI(r.user)).catch(e=>status(errorText(e,'登入'),'error'))};
$('googleLogout').onclick=()=>authmod.signOut(auth).catch(e=>status(errorText(e,'登出'),'error'));
async function upload(data=window.ETFProApp?.getState?.()){if(!currentUser)return status('請先登入 Google。');if(busy||!data)return;busy=true;status('正在上載雲端...','busy');try{await timeout(fsmod.setDoc(ref(fsmod,currentUser),{state:data,updatedAt:fsmod.serverTimestamp()},{merge:true}));status('雲端同步完成','ok')}catch(e){status(errorText(e,'上載'),'error')}finally{busy=false}}
$('uploadCloud').onclick=()=>upload();
$('downloadCloud').onclick=async()=>{if(!currentUser)return status('請先登入 Google。');if(busy||!confirm('下載雲端資料會覆蓋目前本機資料，確定繼續？'))return;busy=true;status('正在下載雲端資料...','busy');try{const snap=await timeout(fsmod.getDoc(ref(fsmod,currentUser)));if(!snap.exists())throw Error('雲端未有資料。');localStorage.setItem('ETF_CORE_PRO_V1_PRE_CLOUD_DOWNLOAD',JSON.stringify(window.ETFProApp.getState()));suppress=true;try{window.ETFProApp.setState(snap.data().state||{})}finally{suppress=false}status('雲端資料已下載','ok')}catch(e){status(errorText(e,'下載'),'error')}finally{busy=false}};
window.addEventListener('etf-local-save',e=>{if(!currentUser||suppress||busy)return;clearTimeout(saveTimer);status('等候同步...');saveTimer=setTimeout(()=>upload(e.detail),1800)});
}catch(e){status(errorText(e,'Firebase 載入'),'error')}}
start();window.addEventListener('offline',()=>status('離線模式'));window.addEventListener('online',()=>currentUser&&status(`已登入：${label(currentUser)}`,'ok'));
