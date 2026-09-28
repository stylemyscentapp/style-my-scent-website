const SMS_URL='https://kdspdaffkbxxxgxlfnjo.supabase.co';
const SMS_KEY='sb_publishable_KCHzj9dxjrN_Jzzo0b1weQ_7LktkdMB';
const SMS_CJ_URL=SMS_URL+'/functions/v1/cj-deals';
const SMS_AMAZON_TAG='stylemyscent-20';
const params=new URLSearchParams(location.search);
const id=params.get('id');
const el=(id)=>document.getElementById(id);
const clean=(v)=>Array.isArray(v)?v.filter(Boolean):[];
const text=(v)=>String(v??'');
function addMeta(selector,attr,value){const n=document.querySelector(selector);if(n)n.setAttribute(attr,value);}
function setCanonical(url){let n=document.querySelector('link[rel="canonical"]');if(!n){n=document.createElement('link');n.rel='canonical';document.head.appendChild(n)}n.href=url;}
function safeImage(value=''){try{const u=new URL(String(value||''));return u.protocol==='https:'?u.href:''}catch{return ''}}
function safeHttps(value=''){try{const u=new URL(String(value||''));return u.protocol==='https:'?u.href:''}catch{return ''}}
function normalized(value=''){return String(value||'').toLowerCase().normalize('NFKD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-z0-9]+/g,' ').trim()}
function noteBox(label,arr){const vals=clean(arr);if(!vals.length)return '';return '<div class="note-box"><b>'+label+'</b><span>'+vals.map(v=>esc(v)).join(', ')+'</span></div>'}
function esc(v=''){return text(v).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;')}
async function api(path){const r=await fetch(SMS_URL+path,{headers:{apikey:SMS_KEY}});if(!r.ok)throw new Error('Unavailable');return r.json()}
async function fetchAffiliateOffers(product){
  const q=[product.brand,product.canonical_name,product.concentration||product.product_type].filter(Boolean).join(' ').trim();
  if(!q)return [];
  try{
    const r=await fetch(SMS_CJ_URL+'?q='+encodeURIComponent(q)+'&channel=website',{headers:{apikey:SMS_KEY,Accept:'application/json'}});
    if(!r.ok)return [];
    const data=await r.json();
    const nameTokens=normalized(product.canonical_name).split(' ').filter(x=>x.length>2);
    const brandTokens=normalized(product.brand).split(' ').filter(x=>x.length>2);
    return (data.deals||[]).filter(deal=>{
      const hay=normalized((deal.title||'')+' '+(deal.description||''));
      return nameTokens.every(t=>hay.includes(t)) && brandTokens.every(t=>hay.includes(t)) && safeHttps(deal.affiliateUrl);
    }).sort((a,b)=>Number(a.price||0)-Number(b.price||0));
  }catch{return []}
}
function amazonUrl(product){
  const q=[product.brand,product.canonical_name,product.concentration||product.product_type].filter(Boolean).join(' ');
  return 'https://www.amazon.com/s?k='+encodeURIComponent(q)+'&tag='+encodeURIComponent(SMS_AMAZON_TAG);
}
async function renderShop(product){
  const host=el('shop-wrap'); if(!host)return;
  host.innerHTML='<div class="eyebrow">SHOP THIS SCENT</div><h3>'+esc(product.canonical_name)+'</h3><div class="shop-status">Checking current partner prices for this exact bottle…</div>';
  const offers=await fetchAffiliateOffers(product);
  const byRetailer=new Map();
  for(const offer of offers){
    const key=normalized(offer.retailer||offer.advertiserId||'partner');
    if(!byRetailer.has(key))byRetailer.set(key,offer);
  }
  const rows=[...byRetailer.values()].slice(0,4);
  const status=host.querySelector('.shop-status');
  if(status)status.textContent=rows.length?'Current partner offers. The retailer has the final price and availability.':'No exact partner price is available right now; Amazon is still available through our tagged search.';
  rows.forEach(offer=>{
    const row=document.createElement('div');row.className='shop-offer';
    const a=document.createElement('a');a.href=safeHttps(offer.affiliateUrl);a.target='_blank';a.rel='sponsored noopener noreferrer';
    a.textContent='SHOP AT '+String(offer.retailer||'PARTNER').toUpperCase();
    const price=document.createElement('div');price.className='shop-price';
    const n=Number(offer.price);price.textContent=Number.isFinite(n)&&n>0?'
function noIndex(msg){document.querySelector('meta[name="robots"]').content='noindex,follow';el('fragrance-title').textContent='Fragrance not found';el('fragrance-subtitle').textContent=msg;el('fragrance-content').innerHTML='<a class="button" href="fragrances.html">BROWSE THE FRAGRANCE CATALOG →</a>'}
(async()=>{
 if(!id){noIndex('Choose a fragrance from the Style My Scent catalog.');return}
 try{
  const q=new URLSearchParams({select:'id,canonical_name,brand,concentration,product_type,top_notes,middle_notes,base_notes,fragrance_notes,accords,description,release_year,launch_year,bottle_image_url,perfumers',id:'eq.'+id,is_active:'eq.true',verification_status:'eq.verified',limit:'1'});
  const products=await api('/rest/v1/fragrances?'+q.toString());
  const p=products[0]; if(!p){noIndex('This fragrance is not currently available in the public catalog.');return}
  const name=[p.brand,p.canonical_name].filter(Boolean).join(' ');
  const year=p.release_year||p.launch_year||'';
  const allNotes=[...clean(p.top_notes),...clean(p.middle_notes),...clean(p.base_notes),...clean(p.fragrance_notes),...clean(p.accords)];
  const desc=(p.description&&p.description.trim())?p.description.trim():([p.canonical_name,'by',p.brand,p.concentration?'('+p.concentration+')':'','with',allNotes.slice(0,8).join(', ')].filter(Boolean).join(' '));
  const canonical='https://stylemyscent.com/fragrance.html?id='+encodeURIComponent(id);
  document.title=name+' | Notes & Similar Scents | Style My Scent';
  el('fragrance-title').textContent=p.canonical_name;
  el('fragrance-subtitle').textContent=[p.brand,p.concentration,year].filter(Boolean).join(' · ');
  el('meta-description').content=('Explore '+name+' scent notes, profile and similar-fragrance comparisons with Style My Scent.').slice(0,160);
  addMeta('#og-title','content',name+' | Style My Scent');addMeta('#og-description','content',desc.slice(0,180));addMeta('#og-url','content',canonical);setCanonical(canonical);
  const image=safeImage(p.bottle_image_url);if(image){let m=document.createElement('meta');m.setAttribute('property','og:image');m.content=image;document.head.appendChild(m)}
  const generic=clean(p.fragrance_notes), accords=clean(p.accords);
  el('fragrance-content').innerHTML='<div class="detail">'+
   '<div class="bottle">'+(image?'<img src="'+esc(image)+'" alt="'+esc(name+' fragrance bottle')+'">':'<div class="muted">Bottle image coming soon.</div>')+'</div>'+
   '<div><div class="eyebrow">SCENT PROFILE</div><h2>'+esc(name)+'</h2><p class="muted">'+esc(desc)+'</p>'+
   '<div class="note-grid">'+noteBox('TOP NOTES',p.top_notes)+noteBox('HEART NOTES',p.middle_notes)+noteBox('BASE NOTES',p.base_notes)+(!clean(p.top_notes).length&&!clean(p.middle_notes).length&&!clean(p.base_notes).length?noteBox('FRAGRANCE NOTES',generic):'')+noteBox('ACCORDS',accords)+'</div>'+
   '<div id="shop-wrap" class="shop"><div class="eyebrow">SHOP THIS SCENT</div><p class="shop-status">Checking current partner prices for this exact bottle…</p></div>'+
   '<div id="similar-wrap" class="compare"><div class="eyebrow">SIMILAR SCENTS</div><p class="muted">Checking Style My Scent verified comparisons…</p></div>'+
   '<a class="button" href="fragrances.html">BROWSE MORE FRAGRANCES →</a></div></div>';
  renderShop(p);
  const bottleImg=document.querySelector('.bottle img');
  if(bottleImg){
    bottleImg.classList.add('bottle-shop');bottleImg.tabIndex=0;bottleImg.title='Shop '+name;
    const jumpToShop=()=>el('shop-wrap')?.scrollIntoView({behavior:'smooth',block:'center'});
    bottleImg.addEventListener('click',jumpToShop);
    bottleImg.addEventListener('keydown',event=>{if(event.key==='Enter'||event.key===' '){event.preventDefault();jumpToShop()}});
  }
  const ld={"@context":"https://schema.org","@type":"Product","@id":canonical+"#product","name":name,"url":canonical,"brand":{"@type":"Brand","name":p.brand||''},"category":"Fragrance","description":desc};
  if(image)ld.image=image;if(p.concentration)ld.additionalProperty=[{"@type":"PropertyValue","name":"Concentration","value":p.concentration}];
  const s=document.createElement('script');s.type='application/ld+json';s.textContent=JSON.stringify(ld);document.head.appendChild(s);
  const cp=new URLSearchParams({select:'comparison_id,fragrance_id,compared_fragrance_id,estimated_similarity,alternative_brand,alternative_name,original_brand,original_name,similarities,differences,verdict',or:'(fragrance_id.eq.'+id+',compared_fragrance_id.eq.'+id+')',order:'estimated_similarity.desc',limit:'4'});
  try{
   const comps=await api('/rest/v1/catalog_discover_comparison_cards_fast_v1?'+cp.toString());
   const wrap=el('similar-wrap');
   if(comps.length){
    wrap.innerHTML='<div class="eyebrow">SIMILAR SCENTS</div>'+comps.map(c=>{
      const alt=c.fragrance_id===id?([c.original_brand,c.original_name].filter(Boolean).join(' ')):([c.alternative_brand,c.alternative_name].filter(Boolean).join(' '));
      return '<div class="compare"><h3>'+esc(alt)+'</h3><div class="muted">'+(Number.isFinite(Number(c.estimated_similarity))?'≈ '+Math.round(Number(c.estimated_similarity))+'% similarity · ':'')+esc(c.similarities||c.verdict||'Related scent direction in the Style My Scent comparison catalog.')+'</div></div>'
    }).join('')
   }else wrap.innerHTML='<div class="eyebrow">SIMILAR SCENTS</div><p class="muted">No public comparison is attached to this fragrance yet.</p>'
  }catch{}
 }catch(e){noIndex('Style My Scent could not load this fragrance profile right now.')}
})();+n.toFixed(2):'View price';
    row.append(a,price);host.appendChild(row);
  });
  const actions=document.createElement('div');actions.className='shop-actions';
  const amazon=document.createElement('a');amazon.className='button';amazon.href=amazonUrl(product);amazon.target='_blank';amazon.rel='sponsored noopener noreferrer';
  amazon.textContent='SHOP '+String(product.canonical_name||'THIS SCENT').toUpperCase()+' ON AMAZON';
  actions.appendChild(amazon);host.appendChild(actions);
}

function noIndex(msg){document.querySelector('meta[name="robots"]').content='noindex,follow';el('fragrance-title').textContent='Fragrance not found';el('fragrance-subtitle').textContent=msg;el('fragrance-content').innerHTML='<a class="button" href="fragrances.html">BROWSE THE FRAGRANCE CATALOG →</a>'}
(async()=>{
 if(!id){noIndex('Choose a fragrance from the Style My Scent catalog.');return}
 try{
  const q=new URLSearchParams({select:'id,canonical_name,brand,concentration,product_type,top_notes,middle_notes,base_notes,fragrance_notes,accords,description,release_year,launch_year,bottle_image_url,perfumers',id:'eq.'+id,is_active:'eq.true',verification_status:'eq.verified',limit:'1'});
  const products=await api('/rest/v1/fragrances?'+q.toString());
  const p=products[0]; if(!p){noIndex('This fragrance is not currently available in the public catalog.');return}
  const name=[p.brand,p.canonical_name].filter(Boolean).join(' ');
  const year=p.release_year||p.launch_year||'';
  const allNotes=[...clean(p.top_notes),...clean(p.middle_notes),...clean(p.base_notes),...clean(p.fragrance_notes),...clean(p.accords)];
  const desc=(p.description&&p.description.trim())?p.description.trim():([p.canonical_name,'by',p.brand,p.concentration?'('+p.concentration+')':'','with',allNotes.slice(0,8).join(', ')].filter(Boolean).join(' '));
  const canonical='https://stylemyscent.com/fragrance.html?id='+encodeURIComponent(id);
  document.title=name+' | Notes & Similar Scents | Style My Scent';
  el('fragrance-title').textContent=p.canonical_name;
  el('fragrance-subtitle').textContent=[p.brand,p.concentration,year].filter(Boolean).join(' · ');
  el('meta-description').content=('Explore '+name+' scent notes, profile and similar-fragrance comparisons with Style My Scent.').slice(0,160);
  addMeta('#og-title','content',name+' | Style My Scent');addMeta('#og-description','content',desc.slice(0,180));addMeta('#og-url','content',canonical);setCanonical(canonical);
  const image=safeImage(p.bottle_image_url);if(image){let m=document.createElement('meta');m.setAttribute('property','og:image');m.content=image;document.head.appendChild(m)}
  const generic=clean(p.fragrance_notes), accords=clean(p.accords);
  el('fragrance-content').innerHTML='<div class="detail">'+
   '<div class="bottle">'+(image?'<img src="'+esc(image)+'" alt="'+esc(name+' fragrance bottle')+'">':'<div class="muted">Bottle image coming soon.</div>')+'</div>'+
   '<div><div class="eyebrow">SCENT PROFILE</div><h2>'+esc(name)+'</h2><p class="muted">'+esc(desc)+'</p>'+
   '<div class="note-grid">'+noteBox('TOP NOTES',p.top_notes)+noteBox('HEART NOTES',p.middle_notes)+noteBox('BASE NOTES',p.base_notes)+(!clean(p.top_notes).length&&!clean(p.middle_notes).length&&!clean(p.base_notes).length?noteBox('FRAGRANCE NOTES',generic):'')+noteBox('ACCORDS',accords)+'</div>'+
   '<div id="similar-wrap" class="compare"><div class="eyebrow">SIMILAR SCENTS</div><p class="muted">Checking Style My Scent verified comparisons…</p></div>'+
   '<a class="button" href="fragrances.html">BROWSE MORE FRAGRANCES →</a></div></div>';
  const ld={"@context":"https://schema.org","@type":"Product","@id":canonical+"#product","name":name,"url":canonical,"brand":{"@type":"Brand","name":p.brand||''},"category":"Fragrance","description":desc};
  if(image)ld.image=image;if(p.concentration)ld.additionalProperty=[{"@type":"PropertyValue","name":"Concentration","value":p.concentration}];
  const s=document.createElement('script');s.type='application/ld+json';s.textContent=JSON.stringify(ld);document.head.appendChild(s);
  const cp=new URLSearchParams({select:'comparison_id,fragrance_id,compared_fragrance_id,estimated_similarity,alternative_brand,alternative_name,original_brand,original_name,similarities,differences,verdict',or:'(fragrance_id.eq.'+id+',compared_fragrance_id.eq.'+id+')',order:'estimated_similarity.desc',limit:'4'});
  try{
   const comps=await api('/rest/v1/catalog_discover_comparison_cards_fast_v1?'+cp.toString());
   const wrap=el('similar-wrap');
   if(comps.length){
    wrap.innerHTML='<div class="eyebrow">SIMILAR SCENTS</div>'+comps.map(c=>{
      const alt=c.fragrance_id===id?([c.original_brand,c.original_name].filter(Boolean).join(' ')):([c.alternative_brand,c.alternative_name].filter(Boolean).join(' '));
      return '<div class="compare"><h3>'+esc(alt)+'</h3><div class="muted">'+(Number.isFinite(Number(c.estimated_similarity))?'≈ '+Math.round(Number(c.estimated_similarity))+'% similarity · ':'')+esc(c.similarities||c.verdict||'Related scent direction in the Style My Scent comparison catalog.')+'</div></div>'
    }).join('')
   }else wrap.innerHTML='<div class="eyebrow">SIMILAR SCENTS</div><p class="muted">No public comparison is attached to this fragrance yet.</p>'
  }catch{}
 }catch(e){noIndex('Style My Scent could not load this fragrance profile right now.')}
})();