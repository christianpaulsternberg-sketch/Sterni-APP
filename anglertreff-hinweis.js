(()=>{
'use strict';
const key='petri-treff-seen-v1';
const tile=document.getElementById('treff-tile');
const online=window.STERNI_QUIZ_ONLINE;
const stamp=value=>{const n=Date.parse(value);return Number.isFinite(n)?n:0;};
let seen=0,latest=0,pending=false;
try{seen=stamp(localStorage.getItem(key));}catch{}
function paint(){
 const badge=document.querySelector('#treff-new');
 if(!badge)return;
 const unread=latest>seen;
 badge.hidden=!unread;
 tile.classList.toggle('has-new-photo',unread);
}
function markSeen(posts){
 const newest=Math.max(0,...posts.map(p=>stamp(p.created_at)));
 if(!newest)return;
 seen=Math.max(seen,newest);
 try{seen=Math.max(seen,stamp(localStorage.getItem(key)));}catch{}
 try{localStorage.setItem(key,new Date(seen).toISOString());}catch{}
 paint();
}
window.treffNotice={markSeen};
async function check(){
 if(!tile||document.visibilityState==='hidden')return;
 if(!online?.hasSession()){latest=0;paint();return;}
 if(pending)return;
 pending=true;
 try{
  const response=await online.authenticatedFetch('treff_posts?select=created_at&photo_path=not.is.null&order=created_at.desc&limit=1');
  if(response.status===401||response.status===403){latest=0;paint();return;}
  if(!response.ok)return;
  const posts=await response.json();
  latest=online.hasSession()?stamp(posts[0]?.created_at):0;
  paint();
 }catch{
  if(!online.hasSession()){latest=0;paint();}
 }finally{pending=false;}
}
window.addEventListener('storage',event=>{
 if(event.key===key||event.key===null){try{seen=Math.max(seen,stamp(localStorage.getItem(key)));}catch{}paint();}
 if(event.key==='petri-treff-session-v1'||event.key===null)check();
});
window.addEventListener('pageshow',()=>{try{seen=Math.max(seen,stamp(localStorage.getItem(key)));}catch{}paint();check();});
document.addEventListener('visibilitychange',()=>{if(document.visibilityState!=='hidden')check();});
window.addEventListener('online',check);
if(tile){check();setInterval(check,60000);}
})();
