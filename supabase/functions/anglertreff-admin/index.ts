// Supabase Edge Function. Geheimnisse ausschließlich als Supabase Secrets setzen:
// SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY und optional APP_ORIGINS.
const defaultOrigins = ['https://christianpaulsternberg-sketch.github.io', 'http://127.0.0.1:4349', 'http://localhost:4349'];
const origins = (Deno.env.get('APP_ORIGINS') || defaultOrigins.join(',')).split(',').map(value => value.trim()).filter(Boolean);
const base = Deno.env.get('SUPABASE_URL') || '';
const secret = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';

Deno.serve(async req => {
  const origin = req.headers.get('origin') || '';
  const headers: Record<string, string> = {'Content-Type':'application/json','Cache-Control':'no-store','Vary':'Origin','Access-Control-Allow-Methods':'POST, OPTIONS','Access-Control-Allow-Headers':'authorization, apikey, content-type, x-client-info'};
  if (origins.includes(origin)) headers['Access-Control-Allow-Origin'] = origin;
  const reply = (status: number, body: unknown) => new Response(JSON.stringify(body), {status, headers});
  if (origin && !origins.includes(origin)) return reply(403, {error:'Diese App-Adresse ist nicht freigegeben.'});
  if (req.method === 'OPTIONS') return new Response(null, {status:204, headers});
  if (req.method !== 'POST' || !base || !secret) return reply(503, {error:'Mitgliederverwaltung ist nicht eingerichtet.'});
  const bearer = req.headers.get('authorization') || '';
  if (!bearer.startsWith('Bearer ')) return reply(401, {error:'Bitte anmelden.'});
  const api = async (path: string, init: {method?: string; body?: unknown; token?: string; extra?: Record<string,string>} = {}) => {
    const res = await fetch(base + path, {method:init.method || 'GET', headers:{apikey:secret,Authorization:`Bearer ${init.token || secret}`,'Content-Type':'application/json',...(init.extra || {})}, body:init.body === undefined ? undefined : JSON.stringify(init.body)});
    const text = await res.text();
    if (!res.ok) throw {status:res.status, body:text};
    return text ? JSON.parse(text) : null;
  };
  try {
    const actor = await api('/auth/v1/user', {token:bearer.slice(7)});
    const input = await req.json().catch(() => null) as {action?:string; id?:string} | null;
    const action = input?.action || '';
    const selfDelete = action === 'self_delete';
    if (!['list','invite','recovery','suspend','restore','delete','self_delete'].includes(action)) return reply(400, {error:'Unbekannte Aktion.'});
    const admin = await api(`/rest/v1/treff_admins?id=eq.${encodeURIComponent(actor.id)}&select=id`);
    const active = await api(`/rest/v1/treff_members?id=eq.${encodeURIComponent(actor.id)}&active=eq.true&select=id`);
    if (!active?.length) return reply(403, {error:'Zugang verweigert.'});
    if (!selfDelete && !admin?.length) return reply(403, {error:'Nur der Administrator darf Mitglieder verwalten.'});
    if (action === 'list') {
      const members = await api('/rest/v1/treff_members?select=id,display_name,active,joined_at&order=joined_at.asc&limit=500');
      const result = await Promise.all(members.map(async (member: Record<string,unknown>) => {
        const account = await api('/auth/v1/admin/users/' + encodeURIComponent(String(member.id)));
        return {...member, email: account?.email || null};
      }));
      return reply(200, {members:result});
    }
    if (action === 'invite' || action === 'recovery') {
      let email = '';
      let displayName = '';
      if (action === 'invite') {
        email = String((input as Record<string,unknown>).email || '').trim().toLowerCase();
        displayName = String((input as Record<string,unknown>).name || '').trim();
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || !displayName || displayName.length > 60) return reply(400, {error:'Bitte gültige Daten eingeben.'});
      } else {
        const target = await api('/auth/v1/admin/users/' + encodeURIComponent(String(input?.id || '')));
        email = String(target?.email || '');
        if (!email) return reply(404, {error:'Mitglied nicht gefunden.'});
      }
      const redirectTo = 'https://christianpaulsternberg-sketch.github.io/Sterni-APP/anglertreff.html';
      const generated = await api('/auth/v1/admin/generate_link', {method:'POST', body:{type:action === 'invite' ? 'invite' : 'recovery', email, redirect_to:redirectTo}});
      if (action === 'invite') await api('/rest/v1/treff_members?id=eq.' + encodeURIComponent(String(generated.id)), {method:'PATCH', body:{display_name:displayName,active:true}});
      const type = action === 'invite' ? 'invite' : 'recovery';
      return reply(200, {type, link:`${redirectTo}#token_hash=${encodeURIComponent(generated.hashed_token)}&type=${type}`});
    }
    const id = selfDelete ? actor.id : String(input?.id || '');
    if (!/^[a-f0-9-]{36}$/i.test(id)) return reply(400, {error:'Ungültiges Mitglied.'});
    if (!selfDelete && id === actor.id) return reply(400, {error:'Bitte das eigene Konto über „Konto dauerhaft löschen“ verwalten.'});
    if (!selfDelete) {
      const protectedAdmin = await api(`/rest/v1/treff_admins?id=eq.${encodeURIComponent(id)}&select=id`);
      if (protectedAdmin?.length) return reply(400, {error:'Administrator-Konten können hier nicht verändert werden.'});
    }
    if (action === 'suspend' || action === 'restore') {
      await api(`/rest/v1/treff_members?id=eq.${encodeURIComponent(id)}`, {method:'PATCH', body:{active:action === 'restore'}});
      return reply(200, {ok:true});
    }
    // Fotos zuerst löschen, danach löscht Auth mit FK-Kaskaden die restlichen Inhalte.
    const posts = await api(`/rest/v1/treff_posts?owner_id=eq.${encodeURIComponent(id)}&select=photo_path`);
    const paths = posts.map((post: {photo_path?:string}) => post.photo_path).filter(Boolean);
    if (paths.length) await api('/storage/v1/object/treff-photos', {method:'DELETE', body:{prefixes:paths}});
    await api('/auth/v1/admin/users/' + encodeURIComponent(id), {method:'DELETE'});
    return reply(200, {ok:true});
  } catch (error) {
    console.error(error);
    return reply(503, {error:'Mitgliederverwaltung gerade nicht erreichbar. Bitte erneut versuchen.'});
  }
});
