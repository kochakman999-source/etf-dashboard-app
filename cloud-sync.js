import { firebaseConfig } from './firebase-config.js';
import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.14.1/firebase-app.js';
import { getAuth, GoogleAuthProvider, signInWithRedirect, getRedirectResult, onAuthStateChanged, signOut } from 'https://www.gstatic.com/firebasejs/10.14.1/firebase-auth.js';
import { getFirestore, doc, getDoc, setDoc, serverTimestamp } from 'https://www.gstatic.com/firebasejs/10.14.1/firebase-firestore.js';
const q=id=>document.getElementById(id),app=initializeApp(firebaseConfig),auth=getAuth(app),db=getFirestore(app);let user=null,busy=false;
const info=(t,bad=false)=>{if(q('cloudInfo')){q('cloudInfo').textContent=t;q('cloudInfo').style.color=bad?'#be123c':'var(--muted)'}};
const current=()=>auth.currentUser||user;
function needUser(){const u=current();if(u)return u;alert('請先使用 Google 登入。');return null}
async function login(){if(current())return info(`已登入：${current().email||current().uid}`);await signInWithRedirect(auth,new GoogleAuthProvider())}
async function upload(){const u=needUser();if(!u||busy)return;busy=true;try{await setDoc(doc(db,'users',u.uid,'portfolio','state'),{state:window.ETFProApp.getState(),updatedAt:serverTimestamp()},{merge:true});info('本機資料已上載。')}catch(e){info('上載失敗：'+e.message,true)}finally{busy=false}}
async function download(){const u=needUser();if(!u||busy)return;busy=true;try{const s=await getDoc(doc(db,'users',u.uid,'portfolio','state'));if(!s.exists())throw Error('雲端未有資料');window.ETFProApp.setState(s.data().state);info('雲端資料已下載。')}catch(e){info('下載失敗：'+e.message,true)}finally{busy=false}}
q('googleLogin')?.addEventListener('click',login);q('uploadCloud')?.addEventListener('click',upload);q('downloadCloud')?.addEventListener('click',download);q('googleLogout')?.addEventListener('click',()=>signOut(auth));
getRedirectResult(auth).catch(e=>info('登入回傳失敗：'+e.message,true));onAuthStateChanged(auth,u=>{user=u;['uploadCloud','downloadCloud','googleLogout'].forEach(id=>{if(q(id))q(id).disabled=!u});if(q('googleLogin'))q('googleLogin').disabled=!!u;info(u?`已登入：${u.email||u.uid}`:'尚未登入')});
