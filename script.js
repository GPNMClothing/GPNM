// SET YOUR FACEBOOK PAGE LINKS HERE before publishing.
const GPNM_FACEBOOK_PAGE = 'https://www.facebook.com/yourpage';
const GPNM_MESSENGER_URL = 'https://m.me/yourpage';

const $=(s,r=document)=>r.querySelector(s);
const $$=(s,r=document)=>[...r.querySelectorAll(s)];
const originalProductOrder = $$('.product').slice();
$('#year').textContent=new Date().getFullYear();
const marqueeBar=$('.marquee-bar');
const marqueeToggle=$('#marqueeToggle');
if(marqueeBar&&marqueeToggle){
  marqueeToggle.addEventListener('click',()=>{
    const paused=marqueeBar.classList.toggle('is-paused');
    marqueeToggle.setAttribute('aria-pressed',String(paused));
    marqueeToggle.setAttribute('aria-label',paused?'Resume scrolling brand messages':'Pause scrolling brand messages');
    marqueeToggle.textContent=paused?'▶':'Ⅱ';
  });
  if(window.matchMedia('(prefers-reduced-motion: reduce)').matches){
    marqueeBar.classList.add('is-paused');
    marqueeToggle.setAttribute('aria-pressed','true');
    marqueeToggle.setAttribute('aria-label','Resume scrolling brand messages');
    marqueeToggle.textContent='▶';
  }
}
$$('.facebook-link').forEach(link=>link.href=GPNM_FACEBOOK_PAGE);
$$('.messenger-link').forEach(link=>link.href=GPNM_MESSENGER_URL);

const nav=$('#nav');
$('#menuToggle').addEventListener('click',()=>{
  const open=nav.classList.toggle('open');
  $('#menuToggle').setAttribute('aria-expanded',String(open));
  $('#menuToggle').setAttribute('aria-label',open?'Close navigation':'Open navigation');
});
$$('#nav a').forEach(a=>a.addEventListener('click',()=>{
  nav.classList.remove('open');
  $('#menuToggle').setAttribute('aria-expanded','false');
  const filter=a.dataset.jumpFilter;
  if(filter) setFilter(filter);
}));

let activeFilter='all';
let searchTerm='';
function updateCatalogStatus(){
  const visible=$$('.product').filter(p=>!p.hidden).length;
  const status=$('#catalogStatus');
  if(status)status.textContent=`SHOWING ${visible} PRODUCT${visible===1?'':'S'}`;
  const empty=$('#emptyState'); if(empty) empty.hidden=visible!==0;
}
function applyCatalog(){
  $$('.product').forEach(p=>{
    const categoryMatches=activeFilter==='all'||p.dataset.category===activeFilter;
    const term=searchTerm.toLowerCase();
    const searchMatches=!term||p.dataset.name.toLowerCase().includes(term)||p.dataset.description.toLowerCase().includes(term)||p.dataset.category.includes(term);
    p.hidden=!(categoryMatches&&searchMatches);
  });
  $$('.filter').forEach(b=>b.classList.toggle('active',b.dataset.filter===activeFilter));
  updateCatalogStatus();
}
function setFilter(filter){activeFilter=filter;applyCatalog();}
$$('.filter').forEach(b=>b.addEventListener('click',()=>setFilter(b.dataset.filter)));
$$('[data-cat-link]').forEach(a=>a.addEventListener('click',()=>setFilter(a.dataset.catLink)));

$('#sortProducts').addEventListener('change',e=>{
  const grid=$('#productGrid');
  const items=$$('.product',grid);
  const mode=e.target.value;
  items.sort((a,b)=>{
    if(mode==='low')return Number(a.dataset.price)-Number(b.dataset.price);
    if(mode==='high')return Number(b.dataset.price)-Number(a.dataset.price);
    if(mode==='az')return a.dataset.name.localeCompare(b.dataset.name);
    return originalProductOrder.indexOf(a)-originalProductOrder.indexOf(b);
  });
  items.forEach(item=>grid.appendChild(item));
});

$('#searchOpen').addEventListener('click',()=>{
  $('#searchBar').classList.add('open');
  $('#searchInput').focus();
  $('#searchBar').scrollIntoView({behavior:'smooth',block:'nearest'});
});
$('#searchClose').addEventListener('click',()=>{
  $('#searchBar').classList.remove('open');
  $('#searchInput').value='';
  searchTerm='';
  applyCatalog();
});
$('#searchInput').addEventListener('input',e=>{searchTerm=e.target.value.trim();applyCatalog();});
$('#clearCatalog').addEventListener('click',()=>{activeFilter='all';searchTerm='';$('#searchInput').value='';$('#sortProducts').value='featured';$('#searchBar').classList.remove('open');const grid=$('#productGrid');originalProductOrder.forEach(item=>grid.appendChild(item));applyCatalog();});

const modal=$('#productModal');
let selectedSize='M',selectedColor='';
function productArtFor(name){
  const p=$$('.product').find(item=>item.dataset.name===name);
  if(!p)return '';
  const photo=p.querySelector('.product-photo');
  if(photo)return photo.outerHTML;
  const art=p.querySelector('.shirt,.shorts,.cap');
  return art?art.outerHTML:'';
}
function inquiryText(name){
  const p=$$('.product').find(item=>item.dataset.name===name);
  return `Hi GPNM! I'm interested in the ${name}.\nPrice shown: ₱${Number(p?.dataset.price||0).toLocaleString('en-PH')}\nColor: ${selectedColor}\nSize: ${selectedSize}\nIs this available?`;
}
function refreshInquiry(name){
  const link=$('#inquiryLink');
  link.href=GPNM_MESSENGER_URL;
  link.setAttribute('aria-label',`Ask about ${name}, color ${selectedColor}, size ${selectedSize} on Messenger`);
  const feedback=$('#copyFeedback'); if(feedback)feedback.textContent='';
}
$('#copyInquiry').addEventListener('click',async()=>{
  const text=inquiryText($('#modalTitle').textContent);
  try {
    if(navigator.clipboard && window.isSecureContext) await navigator.clipboard.writeText(text);
    else { const area=document.createElement('textarea'); area.value=text; area.style.position='fixed'; area.style.opacity='0'; document.body.appendChild(area); area.select(); const ok=document.execCommand('copy'); area.remove(); if(!ok) throw new Error('Copy unavailable'); }
    $('#copyFeedback').textContent='ITEM DETAILS COPIED — PASTE THEM INTO MESSENGER.';
  } catch { $('#copyFeedback').textContent=text; }
});
function openProduct(name){
  const p=$$('.product').find(item=>item.dataset.name===name);
  if(!p)return;
  $('#modalTitle').textContent=p.dataset.name;
  $('#modalPrice').textContent='₱'+Number(p.dataset.price).toLocaleString('en-PH');
  $('#modalDescription').textContent=p.dataset.description;
  const productPhoto=p.querySelector('.product-photo');
  const galleryPhotos = name==='MATTHEW 19:26'
    ? [
        {src:'assets/products/gpnm-logo-tee-front.jpg',alt:'GPNM logo tee front view'},
        {src:'assets/products/for-god-tee-back.jpg',alt:'GPNM For God graphic tee back view'}
      ]
    : productPhoto ? [{src:productPhoto.src,alt:productPhoto.alt}] : [];
  const artClass=[...p.querySelector('.product-image').classList].filter(c=>c.startsWith('image-')).join(' ');
  $('#modalArt').className='modal-art '+artClass;
  if(galleryPhotos.length){
    $('#modalArt').classList.add('has-photo');
    $('#modalArt').innerHTML=`<img class="product-photo" src="${galleryPhotos[0].src}" alt="${galleryPhotos[0].alt}">`;
    $('#modalThumbs').innerHTML=galleryPhotos.map((photo,i)=>`<button class="modal-thumb ${i===0?'active':''}" data-photo-index="${i}" aria-label="View ${photo.alt}"><img src="${photo.src}" alt=""></button>`).join('');
    $$('.modal-thumb').forEach((thumb,i)=>thumb.addEventListener('click',()=>{
      const photo=galleryPhotos[i];
      $('#modalArt').innerHTML=`<img class="product-photo" src="${photo.src}" alt="${photo.alt}">`;
      $$('.modal-thumb').forEach(t=>t.classList.toggle('active',t===thumb));
    }));
  } else {
    $('#modalArt').innerHTML=productArtFor(name);
    $('#modalThumbs').innerHTML='';
  }
  const colors=p.dataset.colors.split('/').map(s=>s.trim());
  selectedColor=colors[0];selectedSize='M';
  $('#modalColors').innerHTML=colors.map((color,i)=>`<button class="color-chip ${i===0?'active':''}" data-color="${color}">${color}</button>`).join('');
  $$('.color-chip').forEach(btn=>btn.addEventListener('click',()=>{
    selectedColor=btn.dataset.color;
    $$('.color-chip').forEach(b=>b.classList.toggle('active',b===btn));
    refreshInquiry(name);
  }));
  $$('#modalSizes button').forEach(btn=>{
    btn.classList.toggle('active',btn.textContent===selectedSize);
    btn.onclick=()=>{
      selectedSize=btn.textContent;
      $$('#modalSizes button').forEach(b=>b.classList.toggle('active',b===btn));
      refreshInquiry(name);
    };
  });
  refreshInquiry(name);
  modal.classList.add('open');modal.setAttribute('aria-hidden','false');document.body.classList.add('modal-open');
  $('#modalClose').focus();
}
let lastProductTrigger=null;
function closeProduct(){
  modal.classList.remove('open');modal.setAttribute('aria-hidden','true');document.body.classList.remove('modal-open');
  if(lastProductTrigger)lastProductTrigger.focus();
}
$$('[data-view]').forEach(btn=>btn.addEventListener('click',()=>{lastProductTrigger=btn;openProduct(btn.dataset.view);}));
$('#modalClose').addEventListener('click',closeProduct);
$('#modalScrim').addEventListener('click',closeProduct);
document.addEventListener('keydown',e=>{if(e.key==='Escape'&&modal.classList.contains('open'))closeProduct(); if(e.key==='Tab'&&modal.classList.contains('open')){const focusable=$$('a[href],button:not([disabled]),select,input,[tabindex]:not([tabindex="-1"])',modal).filter(el=>el.offsetParent!==null);if(!focusable.length)return;const first=focusable[0],last=focusable[focusable.length-1];if(e.shiftKey&&document.activeElement===first){e.preventDefault();last.focus();}else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first.focus();}}});
applyCatalog();
