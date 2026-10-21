const GPNM_FACEBOOK_PAGE = 'https://www.facebook.com/GPNM.OFFICIAL';
const GPNM_MESSENGER_URL = 'https://m.me/Walakiiin';
const HERO_VIDEO = 'assets/gpnm-hero.mp4'; // leave empty to show the banner image only
// After each play of the hero video (or the poster on phones), these fade through, then the video plays again.
const HERO_SLIDES = [
  'assets/gpnm-hero-model.jpg',
  'assets/lookbook/logo-tee-model.jpg',
  'assets/lookbook/for-god-back-model.jpg',
  'assets/gpnm-shirt-reference.jpg',
  'assets/lookbook/trust-his-plan-model.jpg',
  'assets/lookbook/longsleeve-white-model.jpg',
  'assets/lookbook/shorts-model.jpg',
  'assets/lookbook/cap-model.jpg',
];
const SLIDE_MS = 5000;

const $=(s,r=document)=>r.querySelector(s);
const $$=(s,r=document)=>[...r.querySelectorAll(s)];
const reducedMotion=window.matchMedia('(prefers-reduced-motion: reduce)').matches;
document.documentElement.classList.add('js');
const originalProductOrder = $$('.product').slice();
$('#year').textContent=new Date().getFullYear();
$$('.facebook-link').forEach(link=>link.href=GPNM_FACEBOOK_PAGE);
$$('.messenger-link').forEach(link=>link.href=GPNM_MESSENGER_URL);

// Hero: video once, then the slideshow, repeat. Video skipped on phones and data saver (poster shows instead);
// nothing moves with reduced motion.
// ponytail: video is ~15 MB uncompressed; re-encode with ffmpeg (~3 MB) to also enable it on phones.
const heroVideo=$('#heroVideo');
const heroSlides=$('#heroSlides');
const wait=ms=>new Promise(r=>setTimeout(r,ms));
const useVideo=Boolean(HERO_VIDEO&&!navigator.connection?.saveData&&matchMedia('(min-width: 701px)').matches);
function buildSlides(){
  heroSlides.innerHTML=HERO_SLIDES.map(src=>`<div class="hero-slide"><div class="hero-slide-bg" style="background-image:url('${src}')"></div><img src="${src}" alt=""></div>`).join('');
  return [...heroSlides.children];
}
async function heroCycle(){
  const slides=buildSlides();
  if(useVideo)heroVideo.src=HERO_VIDEO;
  for(;;){
    if(useVideo){
      heroVideo.currentTime=0;
      await heroVideo.play().catch(()=>{});
      await new Promise(r=>heroVideo.addEventListener('ended',r,{once:true}));
    } else await wait(6000);
    heroSlides.classList.add('on');
    for(const [i,slide] of slides.entries()){
      // Outgoing slide holds its zoom while it fades, so nothing snaps back.
      if(i)slides[i-1].classList.replace('active','leaving');
      slide.classList.add('active');
      await wait(SLIDE_MS);
    }
    heroSlides.classList.remove('on');
    await wait(1200);
    slides.forEach(s=>s.classList.remove('active','leaving'));
  }
}
if(heroVideo&&!reducedMotion){
  window.addEventListener('load',heroCycle,{once:true});
  // Zoom keyed to the video clock so it stays in sync every loop: [seconds, scale]. Ends at 1 for a seamless loop.
  const ZOOM=[[0,1],[1.8,1],[2.6,1.12],[4.6,1.16],[5.6,1.04],[6.4,1.08],[7.4,1],[8.1,1]];
  const ease=x=>x<.5?4*x*x*x:1-(-2*x+2)**3/2;
  const zoomAt=t=>{
    const i=ZOOM.findIndex(([s])=>s>t);
    if(i<1)return 1;
    const [t0,s0]=ZOOM[i-1],[t1,s1]=ZOOM[i];
    return s0+(s1-s0)*ease((t-t0)/(t1-t0));
  };
  const frame=(_,meta)=>{heroVideo.style.transform=`scale(${zoomAt(meta.mediaTime).toFixed(4)})`;heroVideo.requestVideoFrameCallback(frame);};
  heroVideo.requestVideoFrameCallback?.(frame);
}

// Marquee pause
const marqueeBar=$('.marquee-bar');
const marqueeToggle=$('#marqueeToggle');
function setMarqueePaused(paused){
  marqueeBar.classList.toggle('is-paused',paused);
  marqueeToggle.setAttribute('aria-pressed',String(paused));
  marqueeToggle.setAttribute('aria-label',paused?'Resume scrolling brand messages':'Pause scrolling brand messages');
  marqueeToggle.textContent=paused?'▶':'Ⅱ';
}
marqueeToggle.addEventListener('click',()=>setMarqueePaused(!marqueeBar.classList.contains('is-paused')));
if(reducedMotion)setMarqueePaused(true);

// Header turns solid once past the hero, or while the mobile menu is open
const header=$('#header');
const hero=$('#home');
const nav=$('#nav');
const menuToggle=$('#menuToggle');
function updateHeader(){header.classList.toggle('is-solid',nav.classList.contains('open')||window.scrollY>hero.offsetHeight-header.offsetHeight-40);}
window.addEventListener('scroll',updateHeader,{passive:true});
updateHeader();
function setMenu(open){
  nav.classList.toggle('open',open);
  menuToggle.setAttribute('aria-expanded',String(open));
  menuToggle.setAttribute('aria-label',open?'Close navigation':'Open navigation');
  updateHeader();
}
menuToggle.addEventListener('click',()=>setMenu(!nav.classList.contains('open')));
$$('#nav a').forEach(a=>a.addEventListener('click',()=>{
  setMenu(false);
  if(a.dataset.jumpFilter)setFilter(a.dataset.jumpFilter);
}));

// Scroll reveal
const revealObserver=new IntersectionObserver(entries=>entries.forEach(e=>{
  if(e.isIntersecting){e.target.classList.add('in');revealObserver.unobserve(e.target);}
}),{rootMargin:'0px 0px -8% 0px'});
$$('.reveal').forEach(el=>revealObserver.observe(el));

// Catalog
let activeFilter='all';
let searchTerm='';
function updateCatalogStatus(){
  const visible=$$('.product').filter(p=>!p.hidden).length;
  $('#catalogStatus').textContent=`Showing ${visible} product${visible===1?'':'s'}`;
  $('#emptyState').hidden=visible!==0;
}
function applyCatalog(){
  const term=searchTerm.toLowerCase();
  $$('.product').forEach(p=>{
    const categoryMatches=activeFilter==='all'||p.dataset.category===activeFilter;
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
  $('#searchBar').scrollIntoView({behavior:reducedMotion?'auto':'smooth',block:'center'});
  $('#searchInput').focus({preventScroll:true});
});
$('#searchClose').addEventListener('click',()=>{
  $('#searchBar').classList.remove('open');
  $('#searchInput').value='';
  searchTerm='';
  applyCatalog();
});
$('#searchInput').addEventListener('input',e=>{searchTerm=e.target.value.trim();applyCatalog();});
$('#clearCatalog').addEventListener('click',()=>{activeFilter='all';searchTerm='';$('#searchInput').value='';$('#sortProducts').value='featured';$('#searchBar').classList.remove('open');const grid=$('#productGrid');originalProductOrder.forEach(item=>grid.appendChild(item));applyCatalog();});

// Product modal
const modal=$('#productModal');
let selectedSize='M',selectedColor='';
let lastProductTrigger=null;
const findProduct=name=>$$('.product').find(item=>item.dataset.name===name);
// data-gallery: "src|alt;..." entries, optionally prefixed "Color:" to show only for that color.
function galleryFor(p,color){
  return (p.dataset.gallery||'').split(';').filter(Boolean).map(entry=>{
    const m=entry.match(/^([^:|]+):(.*)$/);
    const [src,alt]=(m?m[2]:entry).split('|');
    return {color:m?.[1],src,alt};
  }).filter(photo=>!photo.color||photo.color===color);
}
function renderGallery(p){
  const photos=galleryFor(p,selectedColor);
  showPhoto(photos[0]);
  $('#modalThumbs').innerHTML=photos.length>1?photos.map((photo,i)=>`<button type="button" class="modal-thumb ${i===0?'active':''}" aria-label="View ${photo.alt}"><img src="${photo.src}" alt=""></button>`).join(''):'';
  $$('.modal-thumb').forEach((thumb,i)=>thumb.addEventListener('click',()=>{
    showPhoto(photos[i]);
    $$('.modal-thumb').forEach(t=>t.classList.toggle('active',t===thumb));
  }));
}
function showPhoto(photo){
  $('#modalArt').innerHTML=`<img class="product-photo" src="${photo.src}" alt="${photo.alt}">`;
}
function inquiryText(name){
  const p=findProduct(name);
  return `Hi GPNM! I'm interested in the ${name}.\nPrice shown: ₱${Number(p?.dataset.price||0).toLocaleString('en-PH')}\nColor: ${selectedColor}\nSize: ${selectedSize}\nIs this available?`;
}
function refreshInquiry(name){
  $('#inquiryLink').setAttribute('aria-label',`Ask about ${name}, color ${selectedColor}, size ${selectedSize} on our Facebook page`);
  $('#copyFeedback').textContent='';
  $('#copyFeedback').style.color='';
}
$('#copyInquiry').addEventListener('click',async()=>{
  const text=inquiryText($('#modalTitle').textContent);
  try {
    if(navigator.clipboard && window.isSecureContext) await navigator.clipboard.writeText(text);
    else { const area=document.createElement('textarea'); area.value=text; area.style.position='fixed'; area.style.opacity='0'; document.body.appendChild(area); area.select(); const ok=document.execCommand('copy'); area.remove(); if(!ok) throw new Error('Copy unavailable'); }
    $('#copyFeedback').textContent='Item details copied — paste them into a message to GPNM.';
  } catch { $('#copyFeedback').textContent=text; }
});
function fillProduct(p){
  const name=p.dataset.name;
  $('#modalTitle').textContent=name;
  $('#modalPrice').textContent='₱'+Number(p.dataset.price).toLocaleString('en-PH');
  const quote=p.dataset.quote||'';
  $('#modalQuote').textContent=quote?`“${quote}”`:'';
  $('#modalQuoteRef').textContent=p.dataset.quoteRef?`— ${p.dataset.quoteRef}`:'';
  $('#modalQuoteBlock').hidden=!quote;
  const featureBlock=$('#modalFeatureBlock');
  const featureList=$('#modalFeatures');
  featureList.replaceChildren();
  const features=(p.dataset.features||'').split(';').map(feature=>feature.trim()).filter(Boolean);
  features.forEach(feature=>{
    const colon=feature.indexOf(':');
    const item=document.createElement('li');
    if(colon<0)item.textContent=feature;
    else{
      const label=document.createElement('strong');
      label.textContent=feature.slice(0,colon).trim()+':';
      item.append(label,document.createTextNode(' '+feature.slice(colon+1).trim()));
    }
    featureList.append(item);
  });
  featureBlock.hidden=features.length===0;
  const colors=p.dataset.colors.split('/').map(s=>s.trim());
  selectedColor=colors[0];selectedSize='M';
  renderGallery(p);
  $('#modalColors').innerHTML=colors.map((color,i)=>`<button type="button" class="color-chip ${i===0?'active':''}" data-color="${color}">${color}</button>`).join('');
  $$('.color-chip').forEach(btn=>btn.addEventListener('click',()=>{
    selectedColor=btn.dataset.color;
    $$('.color-chip').forEach(b=>b.classList.toggle('active',b===btn));
    renderGallery(p);
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
}
// Morph the card image into the modal image with the View Transitions API; plain fade elsewhere.
function morph(from,to,update){
  if(!document.startViewTransition||reducedMotion){update();return Promise.resolve();}
  from.style.viewTransitionName='product-hero';
  const t=document.startViewTransition(()=>{from.style.viewTransitionName='';update();to.style.viewTransitionName='product-hero';});
  return t.finished.finally(()=>{to.style.viewTransitionName='';});
}
function openProduct(trigger){
  const p=trigger.closest('.product');
  if(!p)return;
  lastProductTrigger=trigger;
  fillProduct(p);
  morph(trigger,$('#modalArt'),()=>{
    modal.classList.add('open');modal.setAttribute('aria-hidden','false');document.body.classList.add('modal-open');
  }).then(()=>$('#modalClose').focus());
}
function closeProduct(morphBack=true){
  const restore=()=>{modal.classList.remove('open');modal.setAttribute('aria-hidden','true');document.body.classList.remove('modal-open');};
  if(!lastProductTrigger||!morphBack){restore();lastProductTrigger?.focus({preventScroll:true});return;}
  morph($('#modalArt'),lastProductTrigger,restore).then(()=>lastProductTrigger.focus());
}
$$('[data-view]').forEach(btn=>btn.addEventListener('click',()=>openProduct(btn)));
$('#modalClose').addEventListener('click',closeProduct);
$('#modalScrim').addEventListener('click',closeProduct);
document.addEventListener('keydown',e=>{
  if(!modal.classList.contains('open'))return;
  if(e.key==='Escape')closeProduct();
  if(e.key==='Tab'){
    const focusable=$$('a[href],button:not([disabled]),select,input,[tabindex]:not([tabindex="-1"])',modal).filter(el=>el.offsetParent!==null);
    if(!focusable.length)return;
    const first=focusable[0],last=focusable[focusable.length-1];
    if(e.shiftKey&&document.activeElement===first){e.preventDefault();last.focus();}
    else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first.focus();}
  }
});

// Cart: lines live in localStorage; /api/checkout re-prices everything from the catalog.
const cartDialog=$('#cartDialog');
const peso=n=>'₱'+n.toLocaleString('en-PH');
const MAX_CART_LINES=20;
const CART_SIZES=['S','M','L','XL','2XL'];
const catalogProducts=new Map($$('.product').map(p=>[p.dataset.name,p]));
function normalizeCart(value){
  if(!Array.isArray(value))return [];
  const normalized=[];
  value.forEach(item=>{
    const product=catalogProducts.get(item?.name);
    const colors=product?.dataset.colors.split('/').map(color=>color.trim())||[];
    const qty=Number(item?.qty);
    if(!product||!colors.includes(item.color)||!CART_SIZES.includes(item.size)||!Number.isInteger(qty)||qty<1)return;
    const line=normalized.find(current=>current.name===item.name&&current.color===item.color&&current.size===item.size);
    if(line){line.qty=Math.min(10,line.qty+qty);return;}
    if(normalized.length>=MAX_CART_LINES)return;
    normalized.push({name:item.name,color:item.color,size:item.size,qty:Math.min(10,qty),price:Number(product.dataset.price)});
  });
  return normalized;
}
let cart=[];
try{cart=normalizeCart(JSON.parse(localStorage.getItem('gpnm-cart')));}catch{}
function renderCart(){
  const count=cart.reduce((s,i)=>s+i.qty,0);
  $('#cartCount').textContent=count;
  $('#cartOpen').classList.toggle('has-items',count>0);
  $('#cartOpen').setAttribute('aria-label',`Open cart, ${count} item${count===1?'':'s'}`);
  const rows=cart.map((item,n)=>{
    const row=document.createElement('li');
    const details=document.createElement('div');
    const name=document.createElement('strong');
    name.textContent=item.name;
    const variant=document.createElement('span');
    variant.textContent=`${item.color} / ${item.size} · ${peso(item.price)}`;
    details.append(name,variant);
    const quantity=document.createElement('input');
    quantity.type='number';quantity.min='1';quantity.max='10';quantity.value=String(item.qty);quantity.dataset.qty=String(n);
    quantity.setAttribute('aria-label',`Quantity of ${item.name}`);
    const remove=document.createElement('button');
    remove.type='button';remove.className='cart-remove';remove.dataset.remove=String(n);remove.textContent='×';
    remove.setAttribute('aria-label',`Remove ${item.name}`);
    row.append(details,quantity,remove);
    return row;
  });
  $('#cartItems').replaceChildren(...rows);
  $('#cartTotal').textContent=peso(cart.reduce((s,i)=>s+i.price*i.qty,0));
  $('#cartEmpty').hidden=cart.length>0;
  $('#checkoutForm').hidden=!cart.length;
  renderTurnstile();
}
function saveCart(){
  cart=normalizeCart(cart);
  try{localStorage.setItem('gpnm-cart',JSON.stringify(cart));}catch{}
  renderCart();
}
$('#addToCart').addEventListener('click',()=>{
  const name=$('#modalTitle').textContent;
  const product=catalogProducts.get(name);
  if(!product)return;
  const line=cart.find(i=>i.name===name&&i.color===selectedColor&&i.size===selectedSize);
  if(line&&line.qty>=10){$('#copyFeedback').style.color='#a3261b';$('#copyFeedback').textContent='The maximum quantity for this item is 10.';return;}
  if(!line&&cart.length>=MAX_CART_LINES){$('#copyFeedback').style.color='#a3261b';$('#copyFeedback').textContent='Your cart can contain up to 20 different items.';return;}
  if(line)line.qty++;
  else cart.push({name,color:selectedColor,size:selectedSize,qty:1,price:Number(product.dataset.price)});
  saveCart();
  $('#checkoutError').textContent='';
  $('#copyFeedback').style.color='';
  $('#copyFeedback').textContent='';
  flyToCart();
  closeProduct(false);
});
// Shrink a copy of the product photo into the cart button, then bump the button.
function flyToCart(){
  const cartBtn=$('#cartOpen'),from=$('#modalArt').getBoundingClientRect(),to=cartBtn.getBoundingClientRect();
  const ghost=$('#modalArt').cloneNode(true);
  ghost.removeAttribute('id');
  ghost.className='modal-art fly-ghost';
  Object.assign(ghost.style,{left:from.left+'px',top:from.top+'px',width:from.width+'px',height:from.height+'px'});
  document.body.appendChild(ghost);
  const dx=to.left+to.width/2-(from.left+from.width/2),dy=to.top+to.height/2-(from.top+from.height/2);
  ghost.animate([
    {transform:'none',opacity:1,borderRadius:'20px'},
    {transform:`translate(${dx}px,${dy}px) scale(.04)`,opacity:.3,borderRadius:'50%'}
  ],{duration:reducedMotion?0:700,easing:'cubic-bezier(.6,0,.3,1)'}).finished.then(()=>{
    ghost.remove();
    if(!reducedMotion)cartBtn.animate([{transform:'scale(1)'},{transform:'scale(1.25)'},{transform:'scale(1)'}],{duration:400,easing:'ease-out'});
  });
}
$('#cartItems').addEventListener('change',e=>{
  const line=cart[e.target.dataset.qty];
  if(line){line.qty=Math.min(10,Math.max(1,Math.round(e.target.value)||1));saveCart();}
});
$('#cartItems').addEventListener('click',e=>{
  const n=e.target.dataset.remove;
  if(n!==undefined){cart.splice(n,1);saveCart();}
});
// Turnstile: rendered the first time the cart opens. Local dev uses Cloudflare's always-pass test key.
const TURNSTILE_SITEKEY=['localhost','127.0.0.1'].includes(location.hostname)?'1x00000000000000000000AA':'0x4AAAAAAFd539LdsvBT4OTn';
let turnstileId;
function renderTurnstile(){
  if(turnstileId===undefined&&window.turnstile&&cartDialog.open&&!$('#checkoutForm').hidden)
    turnstileId=turnstile.render('#turnstileBox',{sitekey:TURNSTILE_SITEKEY,theme:'light',action:'checkout'});
}
window.onTurnstileLoad=renderTurnstile;
$('#cartOpen').addEventListener('click',()=>{
  cartDialog.showModal();
  if(turnstileId!==undefined&&window.turnstile)turnstile.reset(turnstileId);
  renderTurnstile();
});
$('#cartClose').addEventListener('click',()=>cartDialog.close());
cartDialog.addEventListener('click',e=>{if(e.target===cartDialog)cartDialog.close();});
$('#checkoutForm').addEventListener('submit',async e=>{
  e.preventDefault();
  const form=e.target,submit=$('button[type="submit"]',form);
  submit.disabled=true;
  $('#checkoutError').textContent='';
  try{
    const res=await fetch('/api/checkout',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({...Object.fromEntries(new FormData(form)),items:cart})});
    const data=await res.json();
    const orderUrl=typeof data.url==='string'?new URL(data.url,location.href):null;
    if(!res.ok){
      if(orderUrl&&orderUrl.origin===location.origin){
        cart=[];saveCart();form.reset();
        const alert=$('#checkoutError');
        const message=String(data.error||'Your order was saved, but the shop could not be notified.');
        alert.replaceChildren(document.createTextNode(message.replace(data.url,'').trim()+' '));
        const link=document.createElement('a');link.href=orderUrl.href;link.textContent='View saved order';
        alert.append(link);
        if(turnstileId!==undefined&&window.turnstile)turnstile.reset(turnstileId);
        submit.disabled=false;
        return;
      }
      throw new Error(data.error||'');
    }
    if(!orderUrl||orderUrl.origin!==location.origin)throw new Error('The order confirmation link was missing. Please message us on Messenger.');
    cart=[];saveCart();form.reset();
    location.assign(orderUrl.href);
  }catch(err){
    // Plain Error = message from the server; TypeError/SyntaxError = network or non-JSON response.
    $('#checkoutError').textContent=(err.constructor===Error&&err.message)||'Could not place your order. Check your connection and try again.';
    submit.disabled=false;
    if(turnstileId!==undefined)turnstile.reset(turnstileId); // tokens are single-use
  }
});
renderCart();
applyCatalog();
