// store-page.js — Page HTML publique de la "boutique live" (/l/:slug). Le
// client decrit lui-meme ce qu'il veut commander (annonce pendant le live,
// pas de catalogue prepare a l'avance), avec une photo optionnelle. La
// demande part en attente de validation du vendeur ; le paiement n'est
// propose qu'une fois acceptee.

function renderStorePage(slug) {
  return `<!DOCTYPE html>
<html lang="fr">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Passer commande</title>
<style>
  :root{--primary:#14328C;--accent:#E4622B;--bg:#FAF8F3;--ink:#2A2620;--ink-soft:#635C4E;--border:#E7E1D3;--success:#1F9254;--warn:#B8600A;--danger:#B3413A;}
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
  label{display:block;font-size:12px;font-weight:700;color:var(--ink-soft);margin:10px 0 5px;text-transform:uppercase;letter-spacing:.02em;}
  input[type=text],input[type=tel],input[type=number],input[type=date]{
    width:100%;padding:11px 12px;border:1.5px solid var(--border);border-radius:10px;
    font-size:14px;font-family:inherit;background:#fff;color:var(--ink);
  }
  input:focus{outline:none;border-color:var(--primary);}
  .photo-zone{
    border:1.5px dashed var(--border);border-radius:12px;padding:16px;text-align:center;cursor:pointer;
    background:#FDFBF7;
  }
  .photo-preview{max-width:100%;max-height:160px;border-radius:10px;display:none;margin-top:8px;}
  .row{display:flex;justify-content:space-between;padding:6px 0;font-size:14px;}
  .row.grand{font-weight:800;font-size:17px;border-top:1px solid var(--border);margin-top:6px;padding-top:10px;color:var(--accent);}
  button.submit{width:100%;padding:14px;border:none;border-radius:12px;font-size:15px;font-weight:700;cursor:pointer;margin-top:14px;background:var(--primary);color:#fff;}
  .badge{display:inline-block;padding:5px 13px;border-radius:999px;font-size:12.5px;font-weight:700;margin-bottom:10px;}
  .badge.wait{background:#FDEBD6;color:var(--warn);}
  .badge.ok{background:#E1F0E5;color:var(--success);}
  .badge.no{background:#F7E2E0;color:var(--danger);}
  .spinner{width:34px;height:34px;border:3px solid var(--border);border-top-color:var(--primary);border-radius:50%;margin:0 auto 12px;animation:spin 0.8s linear infinite;}
  @keyframes spin{to{transform:rotate(360deg);}}
  #app,#pending-view,#accepted-view,#refused-view{display:none;}
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

    <div id="form-view">
      <div class="card">
        <div style="font-weight:700;margin-bottom:2px;">Votre commande</div>
        <div class="muted" style="margin-bottom:8px;">Decrivez ce que vous avez vu pendant le live.</div>
        <label>Produit</label>
        <input type="text" id="f-description" placeholder="Ex : Robe wax bleue">
        <label>Quantite</label>
        <input type="number" id="f-qty" value="1" min="1">
        <label>Prix annonce (FCFA)</label>
        <input type="number" id="f-price" placeholder="Ex : 12000" min="0">
        <label>Photo (optionnel)</label>
        <div class="photo-zone" onclick="document.getElementById('f-photo-input').click()">
          <div id="photo-placeholder" class="muted">Touchez pour ajouter une photo</div>
          <img id="photo-preview" class="photo-preview">
        </div>
        <input type="file" id="f-photo-input" accept="image/*" style="display:none;">
        <div class="row grand" style="margin-top:10px;"><span>Total declare</span><span id="f-total">0 F</span></div>
      </div>
      <div class="card">
        <div style="font-weight:700;margin-bottom:4px;">Vos informations</div>
        <label>Nom</label>
        <input type="text" id="f-name" placeholder="Votre nom">
        <label>Telephone</label>
        <input type="tel" id="f-phone" placeholder="77 000 00 00">
        <label>Adresse / quartier</label>
        <input type="text" id="f-address" placeholder="Ou souhaitez-vous etre livre ?">
        <label>Date preferee pour la livraison (optionnel)</label>
        <input type="date" id="f-date">
      </div>
      <button class="submit" onclick="submitRequest()" id="submit-btn">Envoyer ma demande</button>
    </div>

    <div id="pending-view">
      <div class="card center">
        <div class="spinner"></div>
        <span class="badge wait">EN ATTENTE</span>
        <div style="font-weight:700;margin:4px 0 4px;">Votre demande a ete envoyee</div>
        <div class="muted">Le vendeur doit la confirmer avant l'etape de paiement.</div>
        <div id="pending-summary" style="margin-top:14px;text-align:left;"></div>
        <div id="fallback-contact" style="display:none;margin-top:16px;padding-top:14px;border-top:1px solid var(--border);">
          <div class="muted" style="margin-bottom:8px;">Ca prend un peu de temps ? D'autres personnes sont aussi interessees pendant le live.</div>
          <a id="fallback-call" style="display:block;text-decoration:none;"><button class="submit" style="background:var(--accent);" type="button">Contacter le vendeur directement</button></a>
        </div>
      </div>
    </div>

    <div id="accepted-view">
      <div class="card center">
        <span class="badge ok">CONFIRMEE</span>
        <div style="font-weight:700;margin:4px 0 10px;">Votre commande a ete confirmee !</div>
        <div id="accepted-link-zone"></div>
      </div>
    </div>

    <div id="refused-view">
      <div class="card center">
        <span class="badge no">NON RETENUE</span>
        <div style="font-weight:700;margin:4px 0 6px;">Le vendeur n'a pas pu confirmer cette commande</div>
        <div class="muted" id="refuse-reason-text"></div>
      </div>
    </div>
  </div>
</div>

<script>
const SLUG = ${JSON.stringify(slug)};
let store = null;
let photoDataUrl = null;

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
    document.getElementById('form-view').style.display='block';
    document.getElementById('f-qty').addEventListener('input', updateTotal);
    document.getElementById('f-price').addEventListener('input', updateTotal);
    document.getElementById('f-photo-input').addEventListener('change', onPhotoSelected);
  }catch(e){
    document.getElementById('loading').style.display='none';
    document.getElementById('error').style.display='block';
  }
}

function updateTotal(){
  const qty = Math.max(1, Number(document.getElementById('f-qty').value) || 1);
  const price = Math.max(0, Number(document.getElementById('f-price').value) || 0);
  document.getElementById('f-total').textContent = fmt(qty*price) + ' F';
}

// Meme approche que dans l'app FAKTU : on redimensionne et compresse la
// photo cote client avant envoi, pour rester leger.
function onPhotoSelected(e){
  const file = e.target.files[0];
  if(!file) return;
  const reader = new FileReader();
  reader.onload = ev => {
    const img = new Image();
    img.onload = () => {
      const maxDim = 480;
      let w = img.width, h = img.height;
      if(w > maxDim || h > maxDim){ const r = Math.min(maxDim/w, maxDim/h); w = w*r; h = h*r; }
      const canvas = document.createElement('canvas');
      canvas.width = w; canvas.height = h;
      canvas.getContext('2d').drawImage(img, 0, 0, w, h);
      photoDataUrl = canvas.toDataURL('image/jpeg', 0.82);
      document.getElementById('photo-preview').src = photoDataUrl;
      document.getElementById('photo-preview').style.display = 'block';
      document.getElementById('photo-placeholder').style.display = 'none';
    };
    img.src = ev.target.result;
  };
  reader.readAsDataURL(file);
}

async function submitRequest(){
  const description = document.getElementById('f-description').value.trim();
  const qty = Math.max(1, Number(document.getElementById('f-qty').value) || 1);
  const price = Math.max(0, Number(document.getElementById('f-price').value) || 0);
  const name = document.getElementById('f-name').value.trim();
  const phone = document.getElementById('f-phone').value.trim();
  const address = document.getElementById('f-address').value.trim();
  const date = document.getElementById('f-date').value;
  if(!description){ alert('Decrivez le produit souhaite.'); return; }
  if(!price){ alert('Indiquez le prix annonce pendant le live.'); return; }
  if(!name){ alert("Merci d'indiquer votre nom."); return; }
  if(!phone){ alert("Merci d'indiquer votre telephone."); return; }

  const btn = document.getElementById('submit-btn');
  btn.disabled = true;
  btn.textContent = 'Envoi en cours...';
  try{
    const res = await fetch(\`/api/public/store/\${SLUG}/order\`, {
      method:'POST', headers:{'Content-Type':'application/json'},
      body: JSON.stringify({
        description, qty, unit_price: price,
        client_name: name, client_phone: phone, client_address: address,
        client_photo: photoDataUrl, preferred_delivery_date: date
      })
    });
    const data = await res.json();
    if(!res.ok || !data.token) throw new Error(data.message || 'Echec');
    window.location.href = \`/order/\${data.token}\`;
  }catch(e){
    alert(e.message || 'Une erreur est survenue, reessayez.');
    btn.disabled = false;
    btn.textContent = 'Envoyer ma demande';
  }
}

load();
</script>
</body>
</html>`;
}

module.exports = { renderStorePage };
