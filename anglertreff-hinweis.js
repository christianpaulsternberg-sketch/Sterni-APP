(()=>{
'use strict';
const key='petri-treff-seen-v1',config=window.ANGLERTREFF_CONFIG||{};
const stamp=value=>{const n=Date.parse(value);return Number.isFinite(n)?n:0;};
let seen=0,latest=0,pending=false;
try{seen=stamp(localStorage.getItem(key));}catch{}
function paint(){
 const badge=document.querySelector('#treff-new');
 if(!badge)return;
 badge.hidden=latest<=seen;
 badge.closest('a').setAttribute('aria-label',latest>seen?'Anglertreff öffnen – neue Beiträge geteilt':'Anglertreff öffnen');
}
function markSeen(posts){
 const newest=Math.max(0,...posts.map(p=>stamp(p.created_at)));
 if(!newest)return;
 seen=Math.max(seen,newest);
 try{localStorage.setItem(key,new Date(seen).toISOString());}catch{}
 paint();
}
window.treffNotice={markSeen};
async function check(){
 if(pending||document.visibilityState==='hidden'||!document.querySelector('#treff-new')||!config.url||!config.publishableKey)return;
 pending=true;
 try{
  const response=await fetch(config.url+'/rest/v1/rpc/treff_latest_post_at',{method:'POST',headers:{apikey:config.publishableKey,'Content-Type':'application/json'},body:'{}',cache:'no-store',credentials:'omit',referrerPolicy:'no-referrer',signal:AbortSignal.timeout(10000)});
  if(!response.ok)return;
  const value=await response.json();
  if(value!==null&&(typeof value!=='string'||!stamp(value)))return;
  latest=stamp(value);paint();
 }catch{}finally{pending=false;}
}
window.addEventListener('storage',event=>{if(event.key===key||event.key===null){try{seen=stamp(localStorage.getItem(key));}catch{}paint();}});
window.addEventListener('pageshow',()=>{try{seen=stamp(localStorage.getItem(key));}catch{}paint();check();});
document.addEventListener('visibilitychange',()=>{if(document.visibilityState!=='hidden')check();});
window.addEventListener('online',check);
if(document.querySelector('#treff-new')){check();setInterval(check,60000);}
})();
