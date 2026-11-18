(()=>{
'use strict';
const $=s=>document.querySelector(s),config=window.ANGLERTREFF_CONFIG||{};
const hasConfig=!!(config.url||config.publishableKey);
const publicKey=()=>{const key=config.publishableKey||'';if(/^sb_publishable_[A-Za-z0-9_-]+$/.test(key))return true;try{return JSON.parse(atob(key.split('.')[1].replace(/-/g,'+').replace(/_/g,'/'))).role==='anon';}catch{return false;}};
const configured=/^https:\/\/[a-z0-9-]+\.supabase\.co$/.test(config.url||'')&&publicKey();
let invitationRecipient=null,adminLinkType='invite',composeKind='catch',feedFilter='all';
let selectedPhoto=null,previewUrl=null,photoSequence=0,photoPending=false;
let busy=false,pendingLink=null,isAdmin=false,remember=false,refreshing=null;
const sessionKey='petri-treff-session-v1';
function storeSession(){
 try{
  const active=remember?localStorage:sessionStorage;
  const other=remember?sessionStorage:localStorage;
  if(session)active.setItem(sessionKey,JSON.stringify({access_token:session.access_token,refresh_token:session.refresh_token,expires_at:session.expires_at}));
  else active.removeItem(sessionKey);
  other.removeItem(sessionKey);
  window.dispatchEvent(new Event('sterni-session-changed'));
 }catch{status('Die Anmeldung kann auf diesem Gerät nicht gespeichert werden.');}
}
let demo=false,session=null,user=null,editing=null,posts=[],comments=[],likes=[],members=[],objects=[],generation=0;
const test={posts:[],comments:[],likes:[]},form=$('#treff-catch');
const status=message=>{$('#treff-status').textContent=message;};
function node(tag,text,cls){const n=document.createElement(tag);if(text!==undefined)n.textContent=text;if(cls)n.className=cls;return n;}
function clearPictures(){objects.forEach(URL.revokeObjectURL);objects=[];}
function setComposeKind(kind){composeKind=kind;const news=kind==='news';$('#treff-news-title').hidden=!news;$('#treff-catch-fields').hidden=news;$('#treff-catch-fields').querySelectorAll('input').forEach(input=>input.disabled=news);form.elements.news_title.disabled=!news;form.elements.news_title.required=news;form.elements.fish.required=!news;form.elements.water.required=!news;form.elements.caught_on.required=!news;form.elements.description.required=news;form.elements.description.previousSibling.textContent=news?'Deine Meldung *':'Beschreibung';document.querySelectorAll('[data-compose]').forEach(b=>{b.setAttribute('aria-pressed',String(b.dataset.compose===kind));b.disabled=!!editing;});form.elements.photo.parentElement.firstChild.textContent=news?'Foto zur Meldung (optional, JPEG, PNG oder WebP, höchstens 15 MB)':'Fangfoto (optional, JPEG, PNG oder WebP, höchstens 15 MB)';$('#treff-photo-preview figcaption').textContent='Dieses verkleinerte Foto wird mit deinem Beitrag geteilt.';$('#treff-form-title').textContent=editing?(news?'Deine Meldung bearbeiten':'Deinen Fang bearbeiten'):(news?'Meldung schreiben':'Deinen Fang teilen');$('#treff-save').textContent=editing?'Änderungen speichern':news?'Meldung teilen':'Fangbericht teilen';}
function openComposer(){ $('#treff-composer').hidden=false;$('#treff-create').setAttribute('aria-expanded','true');}
function resetForm(){clearPhotoSelection();editing=null;form.reset();form.elements.caught_on.value=new Date().toLocaleDateString('sv-SE');setComposeKind('catch');$('#treff-composer').hidden=true;$('#treff-create').setAttribute('aria-expanded','false');}
$('#treff-create').onclick=()=>{if(!$('#treff-composer').hidden){resetForm();return;}openComposer();};
$('#treff-admin-shortcut a').onclick=event=>{event.preventDefault();if(!isAdmin)return;$('#treff-admin-details').open=true;$('#treff-admin-details summary').focus();$('#treff-admin').scrollIntoView({block:'start'});};
document.querySelectorAll('[data-compose]').forEach(button=>button.onclick=()=>{if(editing)return;setComposeKind(button.dataset.compose);});
document.querySelectorAll('[data-filter]').forEach(button=>button.onclick=()=>{feedFilter=button.dataset.filter;render(generation);});
function close(retainSession=false){
 $('#treff-admin-shortcut').hidden=true;
 if(!retainSession){try{localStorage.removeItem(sessionKey);sessionStorage.removeItem(sessionKey);window.dispatchEvent(new Event('sterni-session-changed'));}catch{}}
generation++;invitationRecipient=null;clearPictures();isAdmin=false;pendingLink=null;$('#treff-admin').hidden=true;$('#treff-accept').hidden=true;$('#treff-link-value').value='';$('#treff-admin-link').hidden=true;$('#treff-admin-members').replaceChildren();session=null;user=null;posts=[];comments=[];likes=[];members=[];test.posts=[];test.comments=[];test.likes=[];$('#treff-feed').replaceChildren();$('#treff-content').hidden=true;$('#treff-session').hidden=true;$('#treff-password').hidden=true;$('#treff-entry').hidden=false;$('#treff-login').reset();resetForm();}
async function request(path,{method='GET',body,token=session?.access_token,raw=false,headers={},retried=false}={}){
 let response;try{response=await fetch(config.url+path,{method,signal:AbortSignal.timeout(20000),cache:'no-store',credentials:'omit',referrerPolicy:'no-referrer',headers:{apikey:config.publishableKey,...(token?{Authorization:'Bearer '+token}:{}),...(!raw&&body?{'Content-Type':'application/json'}:{}),...headers},body:body===undefined?undefined:raw?body:JSON.stringify(body)});}catch{throw Error('Keine Verbindung zum Anglertreff. Bitte Internet prüfen und erneut versuchen.');}
 if(response.status===401&&session?.refresh_token&&!retried&&token){
 if(!refreshing)refreshing=request('/auth/v1/token?grant_type=refresh_token',{method:'POST',body:{refresh_token:session.refresh_token},token:null,retried:true}).then(value=>{session=value;user=value.user;storeSession();return value;}).finally(()=>{refreshing=null;});
 await refreshing;return request(path,{method,body,raw,headers,token:session.access_token,retried:true});}
 if(!response.ok){let failure={};try{failure=await response.json();}catch{}const code=failure.error_code||failure.code;
 if(path.includes('grant_type=refresh_token')&&[400,401,403].includes(response.status)){close();throw Error('Deine Anmeldung ist abgelaufen. Bitte erneut anmelden.');}
 if(code==='invalid_credentials')throw Error('E-Mail oder Passwort stimmen nicht. Bitte beide Eingaben prüfen.');
 if(code==='email_not_confirmed')throw Error('Bitte zuerst deine Einladung bestätigen.');
 if(['otp_expired','access_denied'].includes(code))throw Error('Dieser Link ist ungültig oder abgelaufen. Bitte Christian um einen neuen Link bitten.');
 if(code==='weak_password')throw Error('Dieses Passwort erfüllt die Sicherheitsvorgaben des Anmeldedienstes nicht. Bitte ein stärkeres Passwort wählen.');
 if(code==='same_password')throw Error('Bitte ein anderes Passwort als das bisherige wählen.');
 if(response.status===429)throw Error('Zu viele Versuche. Bitte etwas warten.');
 if([401,403].includes(response.status)&&session&&token){close();throw Error('Deine Sitzung ist abgelaufen. Bitte erneut anmelden.');}throw Error(response.status===403?'Zugriff verweigert. Deine Mitgliedschaft muss freigeschaltet sein.':response.status===400?'Anfrage nicht möglich. Bitte Eingaben oder Zugangsdaten prüfen.':'Der Treff ist gerade nicht erreichbar. Bitte später erneut versuchen.');}
 if(response.status===204||response.headers.get('content-length')==='0')return null;
 if(raw&&method==='GET')return response.blob();
 const text=await response.text();return text?JSON.parse(text):null;
}
async function membership(){
 const result=await request('/rest/v1/treff_members?select=id,display_name&active=eq.true&id=eq.'+user.id);
 if(!result?.length){close();throw Error('Du bist noch nicht für den Anglertreff freigeschaltet. Bitte Christian ansprechen.');}
}
async function enter(){
 if(!demo){await membership();storeSession();const admins=await request('/rest/v1/treff_admins?select=id&id=eq.'+user.id);isAdmin=!!admins?.length;}
 $('#treff-admin').hidden=!isAdmin;$('#treff-admin-shortcut').hidden=!isAdmin;$('#treff-change-password').hidden=demo;
 $('#treff-entry').hidden=true;$('#treff-password').hidden=true;$('#treff-session').hidden=false;$('#treff-content').hidden=false;$('#treff-demo-switch').hidden=!demo;
 $('#treff-user').textContent='Angemeldet als '+(demo?(user.id==='christian'?'Christian (Test)':'Angelfreund (Test)'):user.email);
 await refresh();
 if(isAdmin)await loadAdmin(members);
}
async function refresh(){
 const run=++generation;
 let data;
 if(demo)data=[test.posts.slice(),test.comments.slice(),test.likes.slice(),[{id:'christian',display_name:'Christian (Test)'},{id:'freund',display_name:'Angelfreund (Test)'}]];
 else {await membership();data=await Promise.all(['/rest/v1/treff_posts?select=*&order=created_at.desc&limit=100','/rest/v1/treff_comments?select=*&order=created_at.asc&limit=2000','/rest/v1/treff_likes?select=*&limit=5000','/rest/v1/treff_members?select=id,display_name,active&order=display_name.asc'].map(p=>request(p)));}
 if(run!==generation||!user)return;
 [posts,comments,likes,members]=data;posts.sort((a,b)=>b.created_at.localeCompare(a.created_at));clearPictures();render(run);
 if(isAdmin)renderAdminMembers(members);
 status(demo?'Testvorschau: nur in diesem Fenster, keine Übertragung an Freunde.':'Übersicht geladen · bis zu 100 aktuelle Beiträge.'); 
}
function action(text,fn){const b=node('button',text);b.type='button';b.onclick=()=>guard(b,fn);return b;}
async function guard(button,fn){if(busy)return;busy=true;document.querySelectorAll('button,select').forEach(b=>b.disabled=true);try{await fn();}catch(e){status(e.message||'Die Aktion ist fehlgeschlagen.');}finally{busy=false;document.querySelectorAll('button,select').forEach(b=>b.disabled=false);syncPhotoSave();if(editing)document.querySelectorAll('[data-compose]').forEach(b=>b.disabled=true);}}
function name(id){return members.find(m=>m.id===id)?.display_name||'Angelfreund';}
function render(run){
 const feed=$('#treff-feed');clearPictures();feed.replaceChildren();
 document.querySelectorAll('[data-filter]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.filter===feedFilter)));
 if(!demo&&feedFilter==='all'&&document.visibilityState!=='hidden')window.treffNotice?.markSeen(posts);
 const visible=posts.filter(p=>feedFilter==='all'||(p.kind||'catch')===feedFilter);
 $('#treff-feed-info').textContent='Neueste Beiträge zuerst · '+visible.length+' '+(visible.length===1?'Beitrag':'Beiträge');
 if(!visible.length){feed.append(node('p',feedFilter==='news'?'Noch keine Meldungen. Schreib die erste Nachricht!':feedFilter==='catch'?'Noch keine Fänge geteilt. Mach den Anfang!':'Noch keine Beiträge. Mach den Anfang!','empty'));return;}
 for(const p of visible){
  const news=p.kind==='news',card=node('article',undefined,'treff-post');card.dataset.post=p.id;card.dataset.kind=news?'news':'catch';
  const header=node('div',undefined,'treff-post-header'),avatar=node('span',name(p.owner_id).slice(0,1).toUpperCase(),'treff-avatar'),person=node('div');person.append(node('strong',name(p.owner_id)),node('p',new Date(p.created_at).toLocaleString('de-DE',{day:'2-digit',month:'2-digit',year:'numeric',hour:'2-digit',minute:'2-digit'}),'treff-meta'));header.append(avatar,person);card.append(header);
  if(p.photo_path){
   const image=node('img');image.alt='Fangfoto: '+p.fish;card.append(image);
   if(demo)image.src=p.photo_path;
   else request('/storage/v1/object/authenticated/treff-photos/'+p.photo_path,{raw:true}).then(blob=>{if(run!==generation||!image.isConnected)return;const url=URL.createObjectURL(blob);objects.push(url);image.src=url;}).catch(()=>{if(run!==generation)return;image.remove();card.append(node('p','Foto aktuell nicht verfügbar.'));});
  }
  card.append(node('p',news?'MELDUNG':'FANGBERICHT','treff-post-kind'),node('h3',news?p.fish:[p.fish,p.length_cm?p.length_cm+' cm':'',p.weight_kg?p.weight_kg+' kg':''].filter(Boolean).join(' · ')));
  if(news)card.append(node('p',p.description,'treff-description'));else{card.append(node('p','📍 '+p.water+' · '+p.caught_on.split('-').reverse().join('.'),'treff-water'));const detail=node('details');detail.append(node('summary','Köder & Fangbericht anzeigen'),node('p',p.bait?'Köder: '+p.bait:'Kein Köder angegeben.'),node('p',p.description||'Keine weitere Beschreibung.','treff-description'));card.append(detail);}
  const tools=node('div',undefined,'treff-actions'),ownLike=likes.some(l=>l.post_id===p.id&&l.user_id===user.id);
  const like=action((ownLike?'♥ Gefällt dir':'♡ Gefällt mir')+' ('+likes.filter(l=>l.post_id===p.id).length+')',async()=>{
   if(demo){if(ownLike)test.likes=test.likes.filter(l=>!(l.post_id===p.id&&l.user_id===user.id));else test.likes.push({post_id:p.id,user_id:user.id});}
   else await request('/rest/v1/treff_likes'+(ownLike?'?post_id=eq.'+p.id+'&user_id=eq.'+user.id:''),{method:ownLike?'DELETE':'POST',body:ownLike?undefined:{post_id:p.id,user_id:user.id}});
   await refresh();
  });like.setAttribute('aria-pressed',String(ownLike));tools.append(like);
  if(p.owner_id===user.id){
   tools.append(action('Bearbeiten',async()=>{editing=p;openComposer();setComposeKind(news?'news':'catch');form.elements.news_title.value=news?p.fish:'';for(const key of ['fish','water','length_cm','weight_kg','bait','caught_on','description'])form.elements[key].value=p[key]??'';clearPhotoSelection();$('#treff-form-title').textContent=news?'Deine Meldung bearbeiten':'Deinen Fang bearbeiten';$('#treff-save').textContent='Änderungen speichern';$('#treff-cancel').hidden=false;form.scrollIntoView({block:'start'});}));
   tools.append(action(news?'Meldung löschen':'Fang löschen',async()=>{if(!confirm('Diesen Beitrag samt Kommentaren und Likes löschen?'))return;
    if(demo){test.posts=test.posts.filter(x=>x.id!==p.id);test.comments=test.comments.filter(x=>x.post_id!==p.id);test.likes=test.likes.filter(x=>x.post_id!==p.id);}
    else { // Foto zuerst entfernen: bei einem Fehler bleibt der Bericht als Referenz bestehen.
     if(p.photo_path)await request('/storage/v1/object/treff-photos',{method:'DELETE',body:{prefixes:[p.photo_path]}});
     await request('/rest/v1/treff_posts?id=eq.'+p.id,{method:'DELETE'});
    }
    if(editing?.id===p.id)resetForm();await refresh();
   }));
  }
  card.append(tools);
  const list=node('details',undefined,'treff-comments');const postComments=comments.filter(c=>c.post_id===p.id);list.append(node('summary','💬 '+postComments.length+' '+(postComments.length===1?'Kommentar':'Kommentare')+' · mitreden'));
  for(const c of comments.filter(c=>c.post_id===p.id)){
   const line=node('p',name(c.owner_id)+': '+c.body,'treff-comment');
   if(c.owner_id===user.id)line.append(action('Kommentar löschen',async()=>{if(demo)test.comments=test.comments.filter(x=>x.id!==c.id);else await request('/rest/v1/treff_comments?id=eq.'+c.id,{method:'DELETE'});await refresh();}));
   list.append(line);
  }
  const comment=node('form',undefined,'treff-comment-form'),label=node('label','Dein Kommentar'),input=node('input');input.name='comment';input.required=true;input.maxLength=1000;label.append(input);const send=node('button','Kommentieren');send.type='submit';comment.append(label,send);
  comment.onsubmit=e=>{e.preventDefault();const body=input.value.trim();if(!body)return;guard(send,async()=>{const entry={id:crypto.randomUUID(),post_id:p.id,owner_id:user.id,body};if(demo)test.comments.push(entry);else await request('/rest/v1/treff_comments',{method:'POST',body:entry});await refresh();});};list.append(comment);card.append(list);feed.append(card);
 }
}
async function photo(file){
 if(file.size>15*1024*1024||!['image/jpeg','image/png','image/webp'].includes(file.type))throw Error('Bitte JPEG, PNG oder WebP bis 15 MB auswählen. HEIC vorher als JPEG exportieren.');
 let bitmap;try{bitmap=await createImageBitmap(file);}catch{throw Error('Dieses Foto konnte nicht gelesen werden. Bitte JPEG verwenden.');}
 try{
 if(bitmap.width*bitmap.height>50000000)throw Error('Das Foto ist zu groß. Bitte vorher verkleinern.');
 const scale=Math.min(1,1600/Math.max(bitmap.width,bitmap.height)),canvas=document.createElement('canvas');canvas.width=Math.max(1,Math.round(bitmap.width*scale));canvas.height=Math.max(1,Math.round(bitmap.height*scale));const ctx=canvas.getContext('2d');ctx.fillStyle='#fff';ctx.fillRect(0,0,canvas.width,canvas.height);ctx.drawImage(bitmap,0,0,canvas.width,canvas.height);
 const blob=await new Promise(resolve=>canvas.toBlob(resolve,'image/jpeg',.82));if(!blob||blob.size>2*1024*1024)throw Error('Foto bleibt zu groß. Bitte ein kleineres Bild wählen.');return blob;
 }finally{bitmap.close();}
}
function syncPhotoSave(){ $('#treff-save').disabled=busy||photoPending; }
function clearPhotoSelection(){
 photoSequence++;photoPending=false;selectedPhoto=null;
 if(previewUrl)URL.revokeObjectURL(previewUrl);
 previewUrl=null;form.elements.photo.value='';form.elements.camera.value='';
 $('#treff-photo-image').removeAttribute('src');$('#treff-photo-preview').hidden=true;
 $('#treff-photo-status').textContent='Wähle ein Foto aus oder nimm mit dem Handy ein neues auf.';
 syncPhotoSave();
}
async function choosePhoto(file){
 if(!file)return;
 clearPhotoSelection();
 const sequence=photoSequence;
 photoPending=true;
 $('#treff-photo-status').textContent='Foto wird verkleinert …';
 syncPhotoSave();
 try{
  const blob=await photo(file);
  if(sequence!==photoSequence)return;
  previewUrl=URL.createObjectURL(blob);
  selectedPhoto=blob;
  $('#treff-photo-image').src=previewUrl;$('#treff-photo-preview').hidden=false;
  $('#treff-photo-status').textContent='Foto bereit · '+Math.ceil(blob.size/1024)+' KB · auf höchstens 1600 Pixel verkleinert. Es wird erst beim Teilen hochgeladen.';
 }catch(error){
  if(sequence!==photoSequence)return;
  clearPhotoSelection();
  $('#treff-photo-status').textContent=error.message||'Foto konnte nicht verarbeitet werden.';
 }finally{
  if(sequence===photoSequence){photoPending=false;syncPhotoSave();}
 }
}
form.elements.photo.addEventListener('change',()=>choosePhoto(form.elements.photo.files[0]));
form.elements.camera.addEventListener('change',()=>choosePhoto(form.elements.camera.files[0]));
$('#treff-camera-open').onclick=()=>{form.elements.camera.value='';form.elements.camera.click();};
$('#treff-photo-clear').onclick=clearPhotoSelection;
form.onsubmit=e=>{e.preventDefault();guard($('#treff-save'),async()=>{
 const values=new FormData(form),number=k=>values.get(k)===''?null:Number(values.get(k)),entry={fish:String(values.get('fish')).trim(),water:String(values.get('water')).trim(),length_cm:number('length_cm'),weight_kg:number('weight_kg'),bait:String(values.get('bait')).trim(),caught_on:String(values.get('caught_on')),description:String(values.get('description')).trim()};
 if(composeKind==='news'){entry.fish=String(values.get('news_title')).trim();entry.water='Freundeskreis';entry.length_cm=null;entry.weight_kg=null;entry.bait='';entry.caught_on=new Date().toLocaleDateString('sv-SE');if(!entry.fish||!entry.description)throw Error('Bitte Titel und Meldung ausfüllen.');}else if(!entry.fish||!entry.water)throw Error('Bitte Fischart und Gewässer ausfüllen.');
 const target=editing,uid=user.id,id=target?.id||crypto.randomUUID();let uploaded=null;
 entry.photo_path=target?.photo_path||null;
 if(selectedPhoto){const blob=selectedPhoto;if(demo){entry.photo_path=await new Promise((resolve,reject)=>{const r=new FileReader();r.onload=()=>resolve(r.result);r.onerror=()=>reject(Error('Foto konnte nicht gelesen werden.'));r.readAsDataURL(blob);});}else{uploaded=uid+'/'+crypto.randomUUID()+'.jpg';await request('/storage/v1/object/treff-photos/'+uploaded,{method:'POST',body:blob,raw:true,headers:{'Content-Type':'image/jpeg','Cache-Control':'no-store'}});entry.photo_path=uploaded;}}
 if(demo){if(target)Object.assign(test.posts.find(p=>p.id===id),entry);else test.posts.push({...entry,kind:composeKind,id,owner_id:uid,created_at:new Date().toISOString()});}
 else {
  try{await request('/rest/v1/treff_posts'+(target?'?id=eq.'+id:''),{method:target?'PATCH':'POST',body:target?entry:{...entry,kind:composeKind,id,owner_id:uid}});}
  catch(error){if(uploaded)await request('/storage/v1/object/treff-photos',{method:'DELETE',body:{prefixes:[uploaded]}}).catch(()=>{});throw error;}
  if(uploaded&&target?.photo_path)await request('/storage/v1/object/treff-photos',{method:'DELETE',body:{prefixes:[target.photo_path]}}).catch(()=>status('Bericht gespeichert; altes Foto muss noch bereinigt werden.'));
 }
 resetForm();feedFilter='all';await refresh();$('#treff-feed').scrollIntoView({block:'start'});
 });};
$('#treff-cancel').onclick=resetForm;
$('#treff-demo').onclick=()=>guard($('#treff-demo'),async()=>{demo=true;user={id:'christian'};await enter();});
$('#treff-person').onchange=()=>guard($('#treff-person'),async()=>{user={id:$('#treff-person').value};resetForm();await enter();});
$('#treff-refresh').onclick=()=>guard($('#treff-refresh'),refresh);
$('#treff-logout').onclick=()=>guard($('#treff-logout'),async()=>{const token=session?.access_token;close();if(token)await request('/auth/v1/logout',{method:'POST',token}).catch(()=>{});status(demo?'Abgemeldet. Lokale Testeinträge wurden verworfen.':'Abgemeldet.');});
$('#treff-login').onsubmit=e=>{e.preventDefault();const button=e.target.querySelector('button');guard(button,async()=>{
 const data=new FormData(e.target);remember=!!data.get('remember');demo=false;session=await request('/auth/v1/token?grant_type=password',{method:'POST',body:{email:data.get('email'),password:data.get('password')},token:null});user=session.user;e.target.reset();await enter();
});};

$('#treff-password').onsubmit=e=>{e.preventDefault();guard(e.target.querySelector('button'),async()=>{
 const data=new FormData(e.target);if(data.get('password')!==data.get('password_confirm'))throw Error('Die beiden Passwörter stimmen nicht überein.');
 if(String(data.get('password')).length<8)throw Error('Bitte mindestens 8 Zeichen verwenden.');
 await request('/auth/v1/user',{method:'PUT',body:{password:data.get('password')}});e.target.reset();await enter();status('Dein Passwort wurde gespeichert. Willkommen im Anglertreff!');
});};
function showPassword(flow){$('#treff-entry').hidden=true;$('#treff-accept').hidden=true;$('#treff-content').hidden=true;$('#treff-admin').hidden=true;$('#treff-password').reset();$('#treff-password-title').textContent=flow==='invite'?'Registrierung abschließen':flow==='recovery'?'Neues Passwort festlegen':'Passwort ändern';$('#treff-password').hidden=false;}
$('#treff-change-password').onclick=()=>showPassword('change');
$('#treff-register').onclick=()=>{$('#treff-invitation-input').hidden=!$('#treff-invitation-input').hidden;$('#treff-recovery-help').hidden=true;};
$('#treff-forgot').onclick=()=>{$('#treff-recovery-help').hidden=!$('#treff-recovery-help').hidden;$('#treff-invitation-input').hidden=false;};
function linkParts(hash,query){
 const type=hash.get('type')||query.get('type')||'invite',token_hash=hash.get('token_hash')||query.get('token_hash'),access_token=hash.get('access_token');
 if(!['invite','recovery'].includes(type)||!token_hash&&!access_token)throw Error('Bitte einen gültigen persönlichen Einladungs- oder Wiederherstellungslink verwenden.');
 return {type,token_hash,access_token};
}
function offerLink(link){pendingLink=link;$('#treff-entry').hidden=true;$('#treff-accept').hidden=false;$('#treff-accept-title').textContent=link.type==='recovery'?'Passwort wiederherstellen':'Willkommen im Freundeskreis';$('#treff-accept-button').textContent=link.type==='recovery'?'Wiederherstellungslink prüfen':'Einladung prüfen';status('Bitte bestätige deinen persönlichen Link.');}
$('#treff-invitation-input').onsubmit=e=>{e.preventDefault();guard(e.target.querySelector('button'),async()=>{
 const value=new URL(new FormData(e.target).get('link'));if(value.origin!==location.origin||value.pathname!==location.pathname)throw Error('Der Link gehört zu einer anderen App-Adresse. Öffne ihn direkt im Browser.');
 const link=linkParts(new URLSearchParams(value.hash.slice(1)),value.searchParams);e.target.reset();offerLink(link);
});};
$('#treff-accept-button').onclick=()=>guard($('#treff-accept-button'),async()=>{
 try{if(!pendingLink)throw Error('Bitte einen neuen Link öffnen.');const link=pendingLink;pendingLink=null;demo=false;remember=true;
 if(link.access_token)session={access_token:link.access_token};else session=await request('/auth/v1/verify',{method:'POST',token:null,body:{token_hash:link.token_hash,type:link.type}});
 user=await request('/auth/v1/user');await membership();showPassword(link.type);status('Link bestätigt. Lege jetzt selbst dein persönliches Passwort fest.');
 }catch(error){close();throw error;}
});
async function adminCall(data){
 await request('/auth/v1/user');
 let res;try{res=await fetch(config.url+'/functions/v1/anglertreff-admin',{method:'POST',signal:AbortSignal.timeout(25000),cache:'no-store',credentials:'omit',headers:{apikey:config.publishableKey,Authorization:'Bearer '+session.access_token,'Content-Type':'application/json'},body:JSON.stringify(data)});}catch{throw Error('Mitgliederverwaltung gerade nicht erreichbar. Bitte Internet prüfen.');}
 let result;try{result=await res.json();}catch{throw Error('Mitgliederverwaltung gerade nicht erreichbar.');}
 if(!res.ok)throw Error(result.error||'Aktion nicht möglich. Bitte erneut anmelden.');return result;
}
function renderAdminMembers(people, canManage=false){
 const root=$('#treff-admin-members');
 root.replaceChildren();
 if(!people.length)root.append(node('p','Keine Mitglieder gefunden.'));
 for(const person of people){
  const row=node('article');
  row.append(node('strong',person.display_name),node('p',person.active?'Zugang aktiv':'Zugang gesperrt'));
  if(canManage){
   if(person.email)row.append(node('p','E-Mail: '+person.email,'treff-member-email'));
   if(person.id!==user.id)row.append(action(person.active?'Zugang sperren':'Zugang wieder freigeben',async()=>{
    if(!confirm(person.display_name+': Zugang '+(person.active?'sperren?':'freigeben?')))return;
    await adminCall({action:person.active?'suspend':'restore',id:person.id});
    await loadAdmin();status('Mitgliedschaft aktualisiert.');
   }));
   if(person.active&&person.email){
    const feedback=node('p');
    feedback.setAttribute('role','status');
    row.append(action('Wiederherstellungslink per E-Mail senden',async()=>{
     feedback.textContent='Versand wird angefragt …';
     try{
      const redirectTo=new URL(location.pathname,location.origin).href;
      const query=new URLSearchParams({redirect_to:redirectTo});
      await request('/auth/v1/recover?'+query,{method:'POST',token:null,body:{email:person.email}});
      feedback.textContent='Versand an die hinterlegte E-Mail-Adresse wurde angefragt.';
     }catch(error){
      feedback.textContent='Versand fehlgeschlagen: '+error.message;
     }
    }),feedback);
   }
  }
  root.append(row);
 }
}
async function loadAdmin(existing){
 const adminId=user.id;
 const list=existing || await request('/rest/v1/treff_members?select=id,display_name,active&order=display_name.asc');
 if(!isAdmin||user?.id!==adminId)return;
 renderAdminMembers(list || []);
 try{
  const result=await adminCall({action:'list'});
  if(isAdmin&&user?.id===adminId)renderAdminMembers(result.members,true);
 }catch{
  if(isAdmin&&user?.id===adminId){
   $('#treff-admin-members').prepend(node('p','Die Mitgliederliste ist geladen. Verwaltungsaktionen sind hier derzeit nicht verfügbar.'));
  }
 }
}
function showAdminLink(link,recipient=null,type='invite'){
 let destination;
 try{destination=new URL(link);}catch{throw Error('Die Mitgliederverwaltung hat keinen gültigen Zugangslink geliefert.');}
 if(destination.origin!==location.origin||destination.pathname!==location.pathname)throw Error('Die Mitgliederverwaltung hat einen Link für eine andere App-Adresse geliefert.');
 const parts=linkParts(new URLSearchParams(destination.hash.slice(1)),destination.searchParams);
 if(parts.type!==type)throw Error('Die Mitgliederverwaltung hat einen unpassenden Zugangslink geliefert.');
 invitationRecipient=recipient;adminLinkType=type;
 const recovery=type==='recovery';
 $('#treff-link-value').value=destination.href;
 $('#treff-share-help').textContent=recovery?'Wiederherstellungslink an das Mitglied weitergeben:':'Jetzt Einladung weitergeben:';
 $('#treff-share-link').textContent=recovery?'Wiederherstellungslink teilen':'Einladung teilen';
 $('#treff-admin-link').hidden=false;
 $('#treff-link-value').focus({preventScroll:true});
 $('#treff-admin-link').scrollIntoView({block:'nearest'});
 status('Link bereit. Wähle jetzt Teilen, WhatsApp oder E-Mail und bestätige dort den Versand.');
}
$('#treff-invite-form').onsubmit=e=>{e.preventDefault();guard(e.target.querySelector('button'),async()=>{const data=new FormData(e.target);const result=await adminCall({action:'invite',name:data.get('name'),email:data.get('email')});e.target.reset();showAdminLink(result.link,{name:String(data.get('name')),email:String(data.get('email'))});await loadAdmin();});};
$('#treff-admin-refresh').onclick=()=>guard($('#treff-admin-refresh'),()=>loadAdmin());
$('#treff-copy-link').onclick=()=>guard($('#treff-copy-link'),async()=>{try{await navigator.clipboard.writeText($('#treff-link-value').value);status('Link kopiert. Bitte persönlich weitergeben.');}catch{$('#treff-link-value').focus();$('#treff-link-value').select();status('Bitte den markierten Link kopieren.');}});
function invitationText(){
 const link=$('#treff-link-value').value;
 if(!link)throw Error('Bitte zuerst einen persönlichen Link erstellen.');
 const greeting=invitationRecipient?'Hallo '+invitationRecipient.name+',':'Hallo,';
 const instructions=adminLinkType==='recovery'
  ?'öffne diesen persönlichen Wiederherstellungslink und lege dein neues Anglertreff-Passwort fest:'
  :'komm in unseren privaten Anglertreff! Öffne deinen persönlichen Zugangslink und lege dein eigenes Passwort fest:';
 return greeting+'\n\n'+instructions+'\n'+link+'\n\nDer Link ist einmalig und zeitlich begrenzt. Bitte nicht weiterleiten.';
}
$('#treff-share-link').onclick=()=>guard($('#treff-share-link'),async()=>{const text=invitationText();if(!navigator.share){status('Teilen wird hier nicht unterstützt. Nutze WhatsApp, E-Mail oder Link kopieren.');return;}try{await navigator.share({title:'Dein Zugang zum Anglertreff',text});status('Teilen-Fenster geschlossen. Ob die Nachricht versandt wurde, siehst du in deiner Nachrichten-App.');}catch(e){if(e.name!=='AbortError')throw Error('Teilen nicht möglich. Nutze E-Mail oder Link kopieren.');}});
$('#treff-whatsapp-link').onclick=()=>{const text=invitationText();window.open('https://wa.me/?text='+encodeURIComponent(text),'_blank','noopener,noreferrer');status('Wähle in WhatsApp den vorgesehenen Freund und bestätige selbst den Versand.');};
$('#treff-email-link').onclick=()=>{const text=invitationText();location.href='mailto:'+encodeURIComponent(invitationRecipient?.email||'')+'?subject='+encodeURIComponent('Deine Einladung zum Anglertreff')+'&body='+encodeURIComponent(text);status('E-Mail vorbereitet. Bitte in deiner E-Mail-App auf Senden drücken. Falls sie sich nicht öffnet, nutze Link kopieren.');};
function clearAdminLink(){invitationRecipient=null;adminLinkType='invite';$('#treff-link-value').value='';$('#treff-admin-link').hidden=true;}
$('#treff-clear-link').onclick=clearAdminLink;
async function init(){
 resetForm();$('#treff-login').hidden=!configured;$('#treff-demo').hidden=hasConfig;
 $('#treff-mode').className='treff-badge';$('#treff-mode').textContent=configured?'Privater Anglertreff · Zugang nur für freigeschaltete Mitglieder':'Testversion · Gemeinsamer Dienst noch nicht eingerichtet';
 if(hasConfig&&!configured){$('#treff-mode').textContent='Dienstkonfiguration unvollständig oder ungültig';status('Bitte die öffentlichen Projektangaben prüfen lassen. Kein Zugriff auf private Daten.');return;}
 if(configured)$('#treff-privacy').textContent='Beiträge und Fotos liegen im eingerichteten Supabase-Projekt. Nur freigeschaltete Mitglieder dürfen sie abrufen. Mit „Auf diesem Gerät angemeldet bleiben“ werden Sitzungstoken im lokalen Browserspeicher gespeichert und automatisch erneuert. Abmelden entfernt sie. Gelöschte Browserdaten oder eine ungültige Sitzung erfordern eine neue Anmeldung. Die App speichert keine Passwörter. Eigene Beiträge und Kommentare kannst du löschen; für Konto- und vollständige Datenlöschung Christian ansprechen.';

 $('#treff-access-help').hidden=!configured;
 const hash=new URLSearchParams(location.hash.slice(1)),query=new URLSearchParams(location.search);
 if(location.hash||location.search)history.replaceState(null,'',location.pathname);
 if(hash.get('error')||query.get('error'))throw Error('Dieser Link ist ungültig oder abgelaufen. Bitte einen neuen Link anfordern.');
 if(configured&&(hash.get('token_hash')||query.get('token_hash')||hash.get('access_token'))){offerLink(linkParts(hash,query));return;}
 if(configured){try{const saved=localStorage.getItem(sessionKey)||sessionStorage.getItem(sessionKey);if(saved){session=JSON.parse(saved);remember=!!localStorage.getItem(sessionKey);user=await request('/auth/v1/user');await enter();}}catch(error){close(true);status(error.message||'Bitte erneut versuchen.');}}
}
window.addEventListener('hashchange',()=>{if(location.hash.includes('token_hash=')||location.hash.includes('access_token=')||location.hash.includes('error=')){close();init().catch(e=>{close();status(e.message);});}});
async function keepSession(){if(!configured||demo||!session?.refresh_token||document.visibilityState==='hidden')return;try{await request('/auth/v1/user');}catch(error){status(error.message);}}
setInterval(keepSession,60000);
document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='visible')keepSession();});
window.addEventListener('pagehide',()=>close(true));
window.addEventListener('pageshow',event=>{if(event.persisted)init().catch(e=>{close();status(e.message);});});
init().catch(e=>{close();status(e.message);});
})();
