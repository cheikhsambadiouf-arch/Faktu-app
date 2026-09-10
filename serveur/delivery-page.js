// delivery-page.js — Page HTML publique que le livreur ouvre depuis le lien
// WhatsApp, pour confirmer une livraison effectuée. Se suffit à elle-même,
// sur le même principe que public-page.js mais bien plus simple : pas de
// paiement, juste une confirmation.

const { safeJsonForScript } = require('./html-utils');

function renderDeliveryPage(token) {
  return `<!DOCTYPE html>
<html lang="fr">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Confirmer la livraison</title>
<style>
  :root{--primary:#14328C;--accent:#E4032E;--bg:#FAF8F3;--ink:#2A2620;--ink-soft:#635C4E;--border:#E7E1D3;--success:#1F9254;}
  *{box-sizing:border-box;}
  body{margin:0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Inter,sans-serif;background:var(--bg);color:var(--ink);}
  .wrap{max-width:460px;margin:0 auto;padding:20px 16px 40px;}
  .center{text-align:center;padding:50px 20px;}
  h1{font-size:19px;margin:0 0 4px;}
  .muted{color:var(--ink-soft);font-size:13px;}
  .card{background:#fff;border:1px solid var(--border);border-radius:14px;padding:16px;margin-bottom:14px;}
  .row{display:flex;justify-content:space-between;padding:6px 0;font-size:14px;}
  button{width:100%;padding:14px;border:none;border-radius:12px;font-size:15px;font-weight:700;cursor:pointer;margin-top:10px;}
  .btn-primary{background:var(--primary);color:#fff;}
  .badge{display:inline-block;padding:4px 12px;border-radius:999px;font-size:12px;font-weight:700;margin-bottom:10px;}
  .badge.ok{background:#E1F0E5;color:var(--success);}
  .badge.wait{background:#FDEBD6;color:#B8600A;}
  #app{display:none;}
</style>
</head>
<body>
<div class="wrap">
  <div id="loading" class="center"><div class="muted">Chargement…</div></div>
  <div id="error" class="center" style="display:none;">
    <h1>Livraison introuvable</h1>
    <div class="muted">Ce lien n'est plus valide, ou a peut-être expiré.</div>
  </div>
  <div id="app">
    <div class="center" style="padding:10px 0 6px;">
      <div id="co-name" style="font-weight:700;font-size:15px;"></div>
      <div class="muted" id="order-number"></div>
    </div>
    <div class="card">
      <div class="row"><span>Client</span><span id="client-name" style="font-weight:600;"></span></div>
      <div class="row" id="client-phone-row"><span>Téléphone</span><span id="client-phone"></span></div>
      <div class="row" id="client-address-row"><span>Adresse</span><span id="client-address"></span></div>
    </div>

    <div id="confirm-section" class="card" style="display:none;text-align:center;">
      <div style="font-weight:700;margin-bottom:6px;">Avez-vous livré cette commande ?</div>
      <div class="muted">Le client devra aussi confirmer de son côté avant que la commande soit marquée livrée.</div>
      <button class="btn-primary" onclick="confirmDelivery()" id="confirm-btn">✓ J'ai livré cette commande</button>
    </div>

    <div id="waiting-client" class="card" style="display:none;text-align:center;">
      <span class="badge wait">⏳ En attente de confirmation du client</span>
      <div class="muted" style="margin-top:6px;">Votre confirmation a bien été enregistrée.</div>
    </div>

    <div id="delivered" class="card" style="display:none;text-align:center;">
      <span class="badge ok">✓ Livraison confirmée</span>
    </div>
  </div>
</div>

<script>
const TOKEN = ${safeJsonForScript(token)};

async function load(){
  try{
    const res = await fetch(\`/api/public/delivery/\${TOKEN}\`);
    if(!res.ok) throw new Error('not found');
    const d = await res.json();
    document.getElementById('loading').style.display='none';
    document.getElementById('app').style.display='block';
    document.getElementById('co-name').textContent = d.company_name || '';
    document.getElementById('order-number').textContent = d.number || '';
    document.getElementById('client-name').textContent = d.client_name || '';
    if(d.client_phone){ document.getElementById('client-phone').textContent = d.client_phone; }
    else{ document.getElementById('client-phone-row').style.display='none'; }
    if(d.client_address){ document.getElementById('client-address').textContent = d.client_address; }
    else{ document.getElementById('client-address-row').style.display='none'; }

    if(d.delivered){
      document.getElementById('delivered').style.display='block';
    }else if(d.driver_confirmed){
      document.getElementById('waiting-client').style.display='block';
    }else{
      document.getElementById('confirm-section').style.display='block';
    }
  }catch(e){
    document.getElementById('loading').style.display='none';
    document.getElementById('error').style.display='block';
  }
}

async function confirmDelivery(){
  const btn = document.getElementById('confirm-btn');
  btn.disabled = true;
  btn.textContent = 'Confirmation...';
  try{
    const res = await fetch(\`/api/public/delivery/\${TOKEN}/confirm\`, {method:'POST'});
    const data = await res.json();
    document.getElementById('confirm-section').style.display='none';
    if(data.delivered) document.getElementById('delivered').style.display='block';
    else document.getElementById('waiting-client').style.display='block';
  }catch(e){
    alert('Une erreur est survenue, réessayez.');
    btn.disabled = false;
    btn.textContent = "✓ J'ai livré cette commande";
  }
}

load();
</script>
</body>
</html>`;
}

module.exports = { renderDeliveryPage };
