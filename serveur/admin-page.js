// admin-page.js — Page HTML du tableau de bord administrateur (/admin).
// Simple outil interne pour toi seul : liste des utilisateurs, reinitialiser
// un mot de passe, gerer un abonnement manuellement, exporter les donnees.

function renderAdminPage() {
  return `<!DOCTYPE html>
<html lang="fr">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>FAKTU — Administration</title>
<style>
  :root{--primary:#14328C;--accent:#E4622B;--bg:#F4F2EC;--ink:#2A2620;--ink-soft:#635C4E;--border:#E7E1D3;--success:#1F9254;--danger:#B3413A;}
  *{box-sizing:border-box;}
  body{margin:0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Inter,sans-serif;background:var(--bg);color:var(--ink);}
  .wrap{max-width:900px;margin:0 auto;padding:20px 16px 60px;}
  h1{font-size:20px;margin:0 0 16px;}
  .card{background:#fff;border:1px solid var(--border);border-radius:12px;padding:16px;margin-bottom:14px;}
  label{display:block;font-size:12px;font-weight:700;color:var(--ink-soft);margin:8px 0 5px;text-transform:uppercase;}
  input[type=password],input[type=text]{
    width:100%;padding:10px 12px;border:1.5px solid var(--border);border-radius:8px;font-size:14px;font-family:inherit;
  }
  button{padding:9px 14px;border:none;border-radius:8px;font-size:13.5px;font-weight:700;cursor:pointer;font-family:inherit;}
  .btn-primary{background:var(--primary);color:#fff;}
  .btn-outline{background:#fff;color:var(--primary);border:1.5px solid var(--primary);}
  .btn-danger{background:#fff;color:var(--danger);border:1.5px solid var(--danger);}
  .btn-sm{padding:6px 10px;font-size:12px;}
  table{width:100%;border-collapse:collapse;font-size:13px;}
  th{text-align:left;padding:8px 6px;border-bottom:2px solid var(--border);font-size:11px;text-transform:uppercase;color:var(--ink-soft);}
  td{padding:9px 6px;border-bottom:1px solid var(--border);vertical-align:top;}
  .badge{display:inline-block;padding:3px 9px;border-radius:999px;font-size:11px;font-weight:700;}
  .badge.active{background:#E1F0E5;color:var(--success);}
  .badge.trial{background:#FDEBD6;color:#B8600A;}
  .badge.expired{background:#F7E2E0;color:var(--danger);}
  .muted{color:var(--ink-soft);font-size:12px;}
  .actions{display:flex;gap:6px;flex-wrap:wrap;}
  #login-view{max-width:340px;margin:80px auto 0;}
  #app-view{display:none;}
  .toprow{display:flex;justify-content:space-between;align-items:center;margin-bottom:12px;flex-wrap:wrap;gap:8px;}
</style>
</head>
<body>
<div class="wrap">
  <div id="login-view">
    <h1>FAKTU — Administration</h1>
    <div class="card">
      <label>Mot de passe administrateur</label>
      <input type="password" id="admin-password" placeholder="••••••••">
      <button class="btn-primary" style="width:100%;margin-top:12px;" onclick="login()">Se connecter</button>
      <div class="muted" id="login-error" style="margin-top:8px;color:var(--danger);"></div>
    </div>
  </div>

  <div id="app-view">
    <div class="toprow">
      <h1 style="margin:0;">Utilisateurs FAKTU</h1>
      <div class="actions">
        <input type="text" id="search-input" placeholder="Rechercher (nom, telephone)..." style="width:220px;" oninput="renderTable()">
        <button class="btn-outline btn-sm" onclick="exportData()">Exporter les donnees</button>
        <button class="btn-outline btn-sm" onclick="loadUsers()">Actualiser</button>
      </div>
    </div>
    <div class="card" style="overflow-x:auto;">
      <table>
        <thead>
          <tr><th>Utilisateur</th><th>Entreprise</th><th>Inscrit le</th><th>Statut</th><th>Activite</th><th>Actions</th></tr>
        </thead>
        <tbody id="users-tbody"></tbody>
      </table>
    </div>
  </div>
</div>

<script>
let ADMIN_TOKEN = null;
let ALL_USERS = [];

async function login(){
  const password = document.getElementById('admin-password').value;
  const errEl = document.getElementById('login-error');
  errEl.textContent = '';
  try{
    const res = await fetch('/api/admin/login', {
      method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({password})
    });
    const data = await res.json();
    if(!res.ok) throw new Error(data.message || 'Echec de connexion');
    ADMIN_TOKEN = data.token;
    document.getElementById('login-view').style.display='none';
    document.getElementById('app-view').style.display='block';
    loadUsers();
  }catch(e){
    errEl.textContent = e.message;
  }
}

async function adminFetch(path, opts){
  opts = opts || {};
  opts.headers = Object.assign({}, opts.headers, {'Authorization': 'Bearer ' + ADMIN_TOKEN});
  const res = await fetch(path, opts);
  if(res.status === 401){ ADMIN_TOKEN=null; document.getElementById('app-view').style.display='none'; document.getElementById('login-view').style.display='block'; throw new Error('Session expiree'); }
  return res;
}

async function loadUsers(){
  try{
    const res = await adminFetch('/api/admin/users');
    const data = await res.json();
    ALL_USERS = data.users;
    renderTable();
  }catch(e){ /* deja gere par adminFetch en cas de 401 */ }
}

function fmtDate(ts){ return new Date(ts).toLocaleDateString('fr-FR'); }

function statusBadge(u){
  if(u.subscriptionStatus==='active') return '<span class="badge active">Abonne</span>';
  if(u.subscriptionStatus==='trial') return `<span class="badge trial">Essai (${u.trialDaysLeft} j.)</span>`;
  return `<span class="badge expired">Expire</span>`;
}

function renderTable(){
  const q = document.getElementById('search-input').value.trim().toLowerCase();
  const filtered = q ? ALL_USERS.filter(u =>
    (u.name||'').toLowerCase().includes(q) || (u.phone||'').includes(q) || (u.companyName||'').toLowerCase().includes(q)
  ) : ALL_USERS;
  document.getElementById('users-tbody').innerHTML = filtered.map(u => `
    <tr>
      <td><b>${escapeHtml(u.name)}</b><div class="muted">${escapeHtml(u.phone)}</div></td>
      <td>${escapeHtml(u.companyName||'—')}</td>
      <td>${fmtDate(u.createdAt)}</td>
      <td>${statusBadge(u)}</td>
      <td>${u.activityCount} document(s)</td>
      <td>
        <div class="actions">
          <button class="btn-outline btn-sm" onclick="resetPassword('${u.id}')">Reinitialiser mdp</button>
          <button class="btn-outline btn-sm" onclick="promptSubscription('${u.id}')">Abonnement</button>
        </div>
      </td>
    </tr>`).join('');
}

function escapeHtml(s){ const d=document.createElement('div'); d.textContent=s||''; return d.innerHTML; }

async function resetPassword(userId){
  const pwd = prompt('Nouveau mot de passe pour cet utilisateur (au moins 6 caracteres) :');
  if(!pwd) return;
  try{
    const res = await adminFetch(`/api/admin/users/${userId}/reset-password`, {
      method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({new_password: pwd})
    });
    const data = await res.json();
    if(!res.ok) throw new Error(data.message);
    alert('Mot de passe reinitialise.');
  }catch(e){ alert('Erreur : ' + e.message); }
}

async function promptSubscription(userId){
  const choice = prompt('Statut : "active" (indiquez le nombre de jours ensuite), "trial" (relance un essai), ou "expired"');
  if(!choice) return;
  const status = choice.trim().toLowerCase();
  if(!['active','trial','expired'].includes(status)){ alert('Statut invalide.'); return; }
  let days = 30;
  if(status==='active'){
    const d = prompt('Nombre de jours d\'abonnement :', '30');
    if(!d) return;
    days = Number(d) || 30;
  }
  try{
    const res = await adminFetch(`/api/admin/users/${userId}/subscription`, {
      method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({status, days})
    });
    const data = await res.json();
    if(!res.ok) throw new Error(data.message);
    loadUsers();
  }catch(e){ alert('Erreur : ' + e.message); }
}

async function exportData(){
  try{
    const res = await adminFetch('/api/admin/export');
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = 'faktu-export.json'; a.click();
    URL.revokeObjectURL(url);
  }catch(e){ alert('Erreur export : ' + e.message); }
}
</script>
</body>
</html>`;
}

module.exports = { renderAdminPage };
