// store-page.js — Page HTML publique de la "boutique live" (/l/:slug). Le
// client choisit un produit du catalogue du vendeur et passe commande
// directement, sans jamais avoir eu besoin de son numero de telephone.

const { safeJsonForScript } = require('./html-utils');

function renderStorePage(slug) {
  return `<!DOCTYPE html>
<html lang="fr">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Commander</title>
<style>
  :root{--primary:#14328C;--accent:#E4622B;--bg:#FAF8F3;--ink:#2A2620;--ink-soft:#635C4E;--border:#E7E1D3;--success:#1F9254;}
  *{box-sizing:border-box;}
  body{margin:0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Inter,sans-serif;background:var(--bg);color:var(--ink);}
  .wrap{max-width:460px;margin:0 auto;padding:20px 16px 40px;}
  .center{text-align:center;padding:50px 20px;}
  h1{font-size:19px;margin:0 0 4px;}
  .muted{color:var(--ink-soft);font-size:13px;}
  .card{background:#fff;border:1px solid var(--border);border-radius:14px;padding:16px;margin-bottom:14px;}
  .shop-header{text-align:center;padding:10px 0 18px;}
  .shop-logo{max-height:48px;margin-bottom:8px;}
  .shop-name{font-weight:800;font-size:19px;}
  .live-badge{
    display:inline-flex;align-items:center;gap:5px;background:#E1F0E5;color:var(--success);
    padding:4px 12px;border-radius:999px;font-size:12px;font-weight:700;margin-top:6px;
  }
  .live-dot{width:7px;height:7px;border-radius:50%;background:var(--success);animation:pulse 1.4s infinite;}
  @keyframes pulse{0%,100%{opacity:1;}50%{opacity:.35;}}
  .product-btn{
    width:100%;text-align:left;background:#fff;border:1.5px solid var(--border);border-radius:13px;
    padding:13px 14px;margin-bottom:9px;cursor:pointer;display:flex;justify-content:space-between;align-items:center;
    font-family:inherit;font-size:14.5px;color:var(--ink);
  }
  .product-btn .name{font-weight:700;}
  .product-btn .price{font-weight:800;color:var(--accent);white-space:nowrap;margin-left:10px;}
  .qty-row{display:flex;align-items:center;justify-content:center;gap:16px;margin:14px 0;}
  .qty-btn{width:40px;height:40px;border-radius:50%;border:1.5px solid var(--border);background:#fff;font-size:20px;font-weight:700;color:var(--primary);}
  .qty-val{font-size:20px;font-weight:800;min-width:30px;text-align:center;}
  .row{display:flex;justify-content:space-between;padding:6px 0;font-size:14px;}
  .row.grand{font-weight:800;font-size:17px;border-top:1px solid var(--border);margin-top:6px;padding-top:10px;color:var(--accent);}
  label{display:block;font-size:12px;font-weight:700;color:var(--ink-soft);margin:10px 0 5px;text-transform:uppercase;letter-spacing:.02em;}
  input[type=text],input[type=tel]{
    width:100%;padding:11px 12px;border:1.5px solid var(--border);border-radius:10px;
    font-size:14px;font-family:inherit;background:#fff;color:var(--ink);
  }
  input:focus{outline:none;border-color:var(--primary);}
  button.submit{width:100%;padding:14px;border:none;border-radius:12px;font-size:15px;font-weight:700;cursor:pointer;margin-top:14px;background:var(--primary);color:#fff;}
  .back-link{display:inline-block;margin-bottom:10px;color:var(--primary);font-weight:700;font-size:13.5px;text-decoration:none;}
  #app{display:none;}
</style>
</head>
<body>
<div class="wrap">
  <div id="loading" class="center"><div class="muted">Chargement...</div></div>
  <div id="error" class="center" style="display:none;">
    <h1>Boutique introuvable</h1>
    <div class="muted">Ce lien n'est plus valide.</div>
  </div>
  <div id="app">
    <div class="shop-header">
      <img id="shop-logo" class="shop-logo" style="display:none;">
      <div class="shop-name" id="shop-name"></div>
      <div id="live-badge" class="live-badge" style="display:none;"><span class="live-dot"></span> LIVE EN COURS</div>
    </div>

    <div id="product-list-view">
      <div style="font-weight:700;margin-bottom:10px;">Que voulez-vous commander ?</div>
      <div id="product-list"></div>
      <div id="no-products" class="muted" style="text-align:center;padding:20px 0;display:none;">Aucun produit disponible pour le moment.</div>
    </div>

    <div id="order-form-view" style="display:none;">
      <a href="#" class="back-link" onclick="backToProducts();return false;">&lsaquo; Choisir un autre produit</a>
      <div class="card">
        <div style="font-weight:700;margin-bottom:8px;">Votre commande</div>
        <div class="row"><span id="chosen-product-name"></span><span id="chosen-product-price"></span></div>
        <div class="qty-row">
          <button class="qty-btn" type="button" onclick="changeQty(-1)">&minus;</button>
          <div class="qty-val" id="qty-val">1</div>
          <button class="qty-btn" type="button" onclick="changeQty(1)">+</button>
        </div>
        <div class="row grand"><span>Total</span><span id="order-total"></span></div>
      </div>
      <div class="card">
        <div style="font-weight:700;margin-bottom:4px;">Vos informations</div>
        <label>Nom</label>
        <input type="text" id="client-name" placeholder="Votre nom">
        <label>Telephone</label>
        <input type="tel" id="client-phone" placeholder="77 000 00 00">
        <label>Adresse / quartier</label>
        <input type="text" id="client-address" placeholder="Ou souhaitez-vous etre livre ?">
      </div>
      <button class="submit" onclick="submitOrder()" id="submit-btn">COMMANDER</button>
    </div>
  </div>
</div>

<script>
const SLUG = ${safeJsonForScript(slug)};
let store = null;
let chosenProduct = null;
let qty = 1;

function fmt(n){ return Math.round(n||0).toLocaleString('fr-FR'); }
function escapeHtml(s){ const d=document.createElement('div'); d.textContent=s||''; return d.innerHTML; }

async function load(){
  try{
    const res = await fetch(\`/api/public/store/\${SLUG}\`);
    if(!res.ok) throw new Error('not found');
    store = await res.json();
    document.getElementById('loading').style.display='none';
    document.getElementById('app').style.display='block';
    document.getElementById('shop-name').textContent = store.company_name || '';
    if(store.company_logo){
      document.getElementById('shop-logo').src = store.company_logo;
      document.getElementById('shop-logo').style.display='inline-block';
    }
    if(store.live_active) document.getElementById('live-badge').style.display='inline-flex';
    renderProducts();
  }catch(e){
    document.getElementById('loading').style.display='none';
    document.getElementById('error').style.display='block';
  }
}

function renderProducts(){
  const el = document.getElementById('product-list');
  if(!store.products || store.products.length===0){
    document.getElementById('no-products').style.display='block';
    return;
  }
  el.innerHTML = store.products.map((p,i) => \`
    <button class="product-btn" type="button" onclick="chooseProduct(\${i})">
      <span class="name">\${escapeHtml(p.name)}</span>
      <span class="price">\${fmt(p.price)} F</span>
    </button>\`).join('');
}

function chooseProduct(i){
  chosenProduct = store.products[i];
  qty = 1;
  document.getElementById('chosen-product-name').textContent = chosenProduct.name;
  updateOrderSummary();
  document.getElementById('product-list-view').style.display='none';
  document.getElementById('order-form-view').style.display='block';
  window.scrollTo(0,0);
}
function backToProducts(){
  document.getElementById('order-form-view').style.display='none';
  document.getElementById('product-list-view').style.display='block';
}
function changeQty(delta){
  qty = Math.max(1, qty + delta);
  updateOrderSummary();
}
function updateOrderSummary(){
  document.getElementById('qty-val').textContent = qty;
  document.getElementById('chosen-product-price').textContent = fmt(chosenProduct.price) + ' F';
  document.getElementById('order-total').textContent = fmt(chosenProduct.price * qty) + ' F';
}

async function submitOrder(){
  const name = document.getElementById('client-name').value.trim();
  const phone = document.getElementById('client-phone').value.trim();
  const address = document.getElementById('client-address').value.trim();
  if(!name){ alert("Merci d'indiquer votre nom."); return; }
  if(!phone){ alert("Merci d'indiquer votre telephone."); return; }
  const btn = document.getElementById('submit-btn');
  btn.disabled = true;
  btn.textContent = 'Envoi en cours...';
  try{
    const res = await fetch(\`/api/public/store/\${SLUG}/order\`, {
      method:'POST', headers:{'Content-Type':'application/json'},
      body: JSON.stringify({ product_id: chosenProduct.id, qty, client_name: name, client_phone: phone, client_address: address })
    });
    const data = await res.json();
    if(!res.ok || !data.token) throw new Error(data.message || 'Echec');
    window.location.href = \`/order/\${data.token}\`;
  }catch(e){
    alert('Une erreur est survenue, reessayez.');
    btn.disabled = false;
    btn.textContent = 'COMMANDER';
  }
}

load();
</script>
</body>
</html>`;
}

module.exports = { renderStorePage };
