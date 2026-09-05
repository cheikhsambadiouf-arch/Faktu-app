// public-page.js — Page HTML publique que le client ouvre depuis le lien
// WhatsApp, sans jamais avoir besoin d'un compte FAKTU. Se suffit à
// elle-même : appelle l'API publique en JS, aucune dépendance externe.

function renderPublicOrderPage(token) {
  return `<!DOCTYPE html>
<html lang="fr">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Votre commande</title>
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
  .row.grand{font-weight:800;font-size:17px;border-top:1px solid var(--border);margin-top:6px;padding-top:10px;color:var(--primary);}
  .item{display:flex;justify-content:space-between;padding:8px 0;border-bottom:1px solid var(--border);font-size:13.5px;}
  .item:last-child{border-bottom:none;}
  .item .name{font-weight:600;}
  .item .sub{color:var(--ink-soft);font-size:11.5px;}
  button{width:100%;padding:14px;border:none;border-radius:12px;font-size:15px;font-weight:700;cursor:pointer;margin-top:10px;}
  .btn-primary{background:var(--primary);color:#fff;}
  .btn-accent{background:var(--accent);color:#fff;}
  .btn-outline{background:#fff;color:var(--primary);border:1.5px solid var(--primary);}
  .badge{display:inline-block;padding:4px 12px;border-radius:999px;font-size:12px;font-weight:700;margin-bottom:10px;}
  .badge.ok{background:#E1F0E5;color:var(--success);}
  .badge.wait{background:#FDEBD6;color:#B8600A;}
  .logo{max-height:44px;margin-bottom:10px;}
  label{display:block;font-size:12px;font-weight:700;color:var(--ink-soft);margin:10px 0 5px;text-transform:uppercase;letter-spacing:.02em;}
  input[type=text],textarea{
    width:100%;padding:11px 12px;border:1.5px solid var(--border);border-radius:10px;
    font-size:14px;font-family:inherit;background:#fff;color:var(--ink);
  }
  textarea{resize:vertical;min-height:60px;}
  input:focus,textarea:focus{outline:none;border-color:var(--primary);}
  #app{display:none;}
</style>
</head>
<body>
<div class="wrap">
  <div id="loading" class="center"><div class="muted">Chargement de votre commande…</div></div>
  <div id="error" class="center" style="display:none;">
    <h1>Commande introuvable</h1>
    <div class="muted">Ce lien n'est plus valide, ou a peut-être expiré.</div>
  </div>
  <div id="app">
    <div class="center" style="padding:16px 0 6px;">
      <img id="co-logo" class="logo" style="display:none;">
      <div id="co-name" style="font-weight:700;font-size:15px;"></div>
    </div>
    <div class="card">
      <div class="muted" id="order-number"></div>
      <div id="items"></div>
      <div class="row grand"><span>Total</span><span id="total"></span></div>
    </div>

    <div id="validate-section" class="card" style="display:none;">
      <div style="font-weight:700;margin-bottom:4px;text-align:center;">Confirmez-vous cette commande ?</div>
      <div class="muted" style="text-align:center;">Une fois validée, vous pourrez procéder au paiement.</div>
      <div id="address-field" style="display:none;">
        <label>Adresse de livraison</label>
        <input type="text" id="client-address-input" placeholder="Où souhaitez-vous être livré ?">
      </div>
      <label>Précisions (optionnel)</label>
      <textarea id="client-notes-input" placeholder="Un repère, une préférence, une information utile pour le vendeur…"></textarea>
      <button class="btn-primary" onclick="validateOrder()">✓ Valider ma commande</button>
    </div>

    <div id="validated-badge" style="display:none;text-align:center;">
      <span class="badge ok">✓ Commande validée</span>
    </div>

    <div id="payment-section" class="card" style="display:none;">
      <div style="font-weight:700;margin-bottom:10px;">Paiement</div>
      <div id="pay-links"></div>
      <button class="btn-outline" onclick="reportPayment()" id="report-btn">J'ai payé</button>
    </div>

    <div id="payment-reported" class="card" style="display:none;text-align:center;">
      <span class="badge wait">⏳ Vendeur informé de votre paiement</span>
      <div class="muted" style="margin-top:6px;">Il confirmera la réception sous peu.</div>
    </div>

    <div id="already-paid" class="card" style="display:none;text-align:center;">
      <span class="badge ok">✓ Payé</span>
    </div>
  </div>
</div>

<script>
const TOKEN = ${JSON.stringify(token)};
const API = '';
let orderData = null;

function fmt(n){ return Math.round(n||0).toLocaleString('fr-FR'); }

async function load(){
  try{
    const res = await fetch(\`\${API}/api/public/orders/\${TOKEN}\`);
    if(!res.ok) throw new Error('not found');
    orderData = await res.json();
    render();
  }catch(e){
    document.getElementById('loading').style.display='none';
    document.getElementById('error').style.display='block';
  }
}

function render(){
  const d = orderData;
  document.getElementById('loading').style.display='none';
  document.getElementById('app').style.display='block';

  if(d.company.logo){
    document.getElementById('co-logo').src = d.company.logo;
    document.getElementById('co-logo').style.display='inline-block';
  }
  document.getElementById('co-name').textContent = d.company.name || '';
  document.getElementById('order-number').textContent = d.number + ' — ' + new Date(d.date).toLocaleDateString('fr-FR');
  document.getElementById('items').innerHTML = d.items.map(it =>
    \`<div class="item"><div><div class="name">\${escapeHtml(it.description)}</div><div class="sub">\${it.qty} × \${fmt(it.unit_price)} F</div></div><div>\${fmt(it.qty*it.unit_price)} F</div></div>\`
  ).join('');
  document.getElementById('total').textContent = fmt(d.total) + ' F';

  if(!d.client_validated){
    document.getElementById('validate-section').style.display='block';
    if(d.has_address_field){
      document.getElementById('address-field').style.display='block';
      document.getElementById('client-address-input').value = d.client_address || '';
    }
    document.getElementById('client-notes-input').value = d.client_notes || '';
    return;
  }
  document.getElementById('validated-badge').style.display='block';

  if(d.payment_status === 'payé'){
    document.getElementById('already-paid').style.display='block';
  }else if(d.payment_reported){
    document.getElementById('payment-reported').style.display='block';
  }else{
    document.getElementById('payment-section').style.display='block';
    const links = [];
    if(d.company.wave_payment_link) links.push(\`<a href="\${d.company.wave_payment_link}" target="_blank" style="text-decoration:none;"><button class="btn-primary" type="button">Payer avec Wave</button></a>\`);
    if(d.company.om_merchant_number) links.push(\`<div class="muted" style="margin:8px 0;text-align:center;">Ou Orange Money au \${escapeHtml(d.company.om_merchant_number)}</div>\`);
    document.getElementById('pay-links').innerHTML = links.join('') || '<div class="muted">Contactez le vendeur pour connaître les moyens de paiement disponibles.</div>';
  }
}

async function validateOrder(){
  try{
    const addressEl = document.getElementById('client-address-input');
    const body = {
      notes: document.getElementById('client-notes-input').value,
      address: addressEl ? addressEl.value : undefined
    };
    await fetch(\`\${API}/api/public/orders/\${TOKEN}/validate\`, {
      method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify(body)
    });
    const res = await fetch(\`\${API}/api/public/orders/\${TOKEN}\`);
    orderData = await res.json();
    document.getElementById('validate-section').style.display='none';
    render();
  }catch(e){ alert('Une erreur est survenue, réessayez.'); }
}
async function reportPayment(){
  try{
    await fetch(\`\${API}/api/public/orders/\${TOKEN}/payment-reported\`, {method:'POST'});
    document.getElementById('payment-section').style.display='none';
    document.getElementById('payment-reported').style.display='block';
  }catch(e){ alert('Une erreur est survenue, réessayez.'); }
}
function escapeHtml(s){ const d=document.createElement('div'); d.textContent=s||''; return d.innerHTML; }

load();
</script>
</body>
</html>`;
}

module.exports = { renderPublicOrderPage };
