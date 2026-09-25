const SMS_SUPABASE_URL='https://kdspdaffkbxxxgxlfnjo.supabase.co';
const SMS_SUPABASE_KEY='sb_publishable_KCHzj9dxjrN_Jzzo0b1weQ_7LktkdMB';
const SMS_AMAZON_TAG='stylemyscent-20';
const SMS_CJ_URL=SMS_SUPABASE_URL+'/functions/v1/cj-deals';

function safeHttpsUrl(value=''){
  try{
    const url=new URL(String(value || ''));
    return url.protocol==='https:' ? url.href : '';
  }catch{
    return '';
  }
}

function textEl(tag,className,text){
  const el=document.createElement(tag);
  if(className) el.className=className;
  el.textContent=String(text ?? '');
  return el;
}

function buttonEl(label,className='web-discover-btn'){
  const btn=document.createElement('button');
  btn.type='button';
  btn.className=className;
  btn.textContent=label;
  return btn;
}

function normalized(value=''){
  return String(value||'').toLowerCase().normalize('NFKD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-z0-9]+/g,' ').trim().replace(/\s+/g,' ');
}

function productFromComparison(row,side){
  const alt=side==='alternative';
  return {
    id:alt?row.fragrance_id:row.compared_fragrance_id,
    brand:alt?row.alternative_brand:row.original_brand,
    name:alt?row.alternative_name:row.original_name,
    concentration:alt?row.alternative_concentration:row.original_concentration,
    imageUrl:alt?row.alternative_image_url:row.original_image_url,
  };
}

function bottleSide(product,kicker){
  const side=document.createElement('div');
  side.className='web-compare-side';

  const imageUrl=safeHttpsUrl(product.imageUrl);
  if(imageUrl){
    const img=document.createElement('img');
    img.src=imageUrl;
    img.alt=[product.brand,product.name,'bottle'].filter(Boolean).join(' ');
    img.loading='lazy';
    img.referrerPolicy='no-referrer';
    img.addEventListener('error',()=>{
      const fallback=textEl('div','fallback',(product.brand||'SMS').slice(0,3).toUpperCase());
      img.replaceWith(fallback);
    },{once:true});
    side.appendChild(img);
  }else{
    side.appendChild(textEl('div','fallback',(product.brand||'SMS').slice(0,3).toUpperCase()));
  }
  side.appendChild(textEl('div','web-compare-kicker',kicker));
  side.appendChild(textEl('div','web-compare-name',product.name||'Fragrance'));
  side.appendChild(textEl('div','web-compare-brand',product.brand||''));
  return side;
}

async function fetchComparisons(query=''){
  const fields=[
    'comparison_id','fragrance_id','compared_fragrance_id','relationship',
    'estimated_similarity','shared_notes','similarities','differences','verdict',
    'source_label','source_url','source_tier','verified_at','updated_at',
    'owner_verified','text_target_only',
    'alternative_brand','alternative_name','alternative_concentration','alternative_image_url',
    'original_brand','original_name','original_concentration','original_image_url'
  ].join(',');

  const params=new URLSearchParams();
  params.set('select',fields);
  params.set('order','verified_at.desc.nullslast,comparison_id');
  params.set('limit',query?200:80);

  const q=String(query||'').trim().replace(/[*,()%]/g,' ');
  if(q){
    const filter=[
      'alternative_brand.ilike.*'+q+'*',
      'alternative_name.ilike.*'+q+'*',
      'original_brand.ilike.*'+q+'*',
      'original_name.ilike.*'+q+'*',
      'similarities.ilike.*'+q+'*',
      'differences.ilike.*'+q+'*'
    ].join(',');
    params.set('or','('+filter+')');
  }

  const response=await fetch(SMS_SUPABASE_URL+'/rest/v1/catalog_discover_comparison_cards_v1?'+params.toString(),{
    headers:{apikey:SMS_SUPABASE_KEY,Authorization:'Bearer '+SMS_SUPABASE_KEY}
  });
  if(!response.ok) throw new Error('Discover unavailable');
  const rows=await response.json();
  const seen=new Set();
  return rows.filter(row=>{
    const similarity=Number(row.estimated_similarity);
    if(!Number.isFinite(similarity) || similarity<60) return false;
    const key=[
      normalized(row.alternative_brand),normalized(row.alternative_name),
      normalized(row.original_brand),normalized(row.original_name)
    ].join('|');
    if(seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

async function fetchProfile(product){
  if(!product?.id) return null;
  const params=new URLSearchParams({
    select:'id,canonical_name,brand,concentration,product_type,top_notes,middle_notes,base_notes,fragrance_notes,accords,bottle_image_url',
    id:'eq.'+product.id,
    is_active:'eq.true',
    verification_status:'eq.verified',
    limit:'1'
  });
  const response=await fetch(SMS_SUPABASE_URL+'/rest/v1/fragrances?'+params.toString(),{
    headers:{apikey:SMS_SUPABASE_KEY,Authorization:'Bearer '+SMS_SUPABASE_KEY}
  });
  if(!response.ok) return null;
  const row=(await response.json())[0];
  if(!row) return null;
  return {
    ...product,
    brand:row.brand||product.brand,
    name:row.canonical_name||product.name,
    concentration:row.concentration||row.product_type||product.concentration,
    imageUrl:row.bottle_image_url||product.imageUrl,
    notes:{
      top:Array.isArray(row.top_notes)?row.top_notes.filter(Boolean):[],
      heart:Array.isArray(row.middle_notes)?row.middle_notes.filter(Boolean):[],
      base:Array.isArray(row.base_notes)?row.base_notes.filter(Boolean):[],
      general:Array.isArray(row.fragrance_notes)?row.fragrance_notes.filter(Boolean):[],
      accords:Array.isArray(row.accords)?row.accords.filter(Boolean):[],
    }
  };
}

function notesCard(product,label){
  const card=document.createElement('div');
  card.className='web-detail-card';
  card.appendChild(textEl('div','web-compare-kicker',label));
  card.appendChild(textEl('h3','',[product.brand,product.name].filter(Boolean).join(' ')));
  if(product.concentration) card.appendChild(textEl('p','',product.concentration));

  const notes=product.notes||{};
  const stages=[
    ['top','Top'],['heart','Heart'],['base','Base'],['general','Listed notes'],['accords','Accords']
  ];
  let any=false;
  for(const [key,name] of stages){
    if(!Array.isArray(notes[key]) || !notes[key].length) continue;
    any=true;
    const stage=document.createElement('div');
    stage.className='web-note-stage';
    stage.appendChild(textEl('b','',name));
    stage.appendChild(textEl('span','',notes[key].join(' · ')));
    card.appendChild(stage);
  }
  if(!any) card.appendChild(textEl('p','','Scent details are still being completed for this bottle.'));
  return card;
}

async function fetchAffiliateOffers(product){
  const q=[product.brand,product.name,product.concentration].filter(Boolean).join(' ').trim();
  if(!q) return [];
  try{
    const response=await fetch(SMS_CJ_URL+'?q='+encodeURIComponent(q),{
      headers:{apikey:SMS_SUPABASE_KEY,Accept:'application/json'}
    });
    if(!response.ok) return [];
    const data=await response.json();
    const nameTokens=normalized(product.name).split(' ').filter(x=>x.length>2);
    const brandTokens=normalized(product.brand).split(' ').filter(x=>x.length>2);
    return (data.deals||[]).filter(deal=>{
      const hay=normalized((deal.title||'')+' '+(deal.description||''));
      return nameTokens.every(t=>hay.includes(t)) && brandTokens.every(t=>hay.includes(t)) && safeHttpsUrl(deal.affiliateUrl);
    }).sort((a,b)=>Number(a.price||0)-Number(b.price||0));
  }catch{
    return [];
  }
}

function amazonUrl(product){
  const q=[product.brand,product.name,product.concentration].filter(Boolean).join(' ');
  return 'https://www.amazon.com/s?k='+encodeURIComponent(q)+'&tag='+encodeURIComponent(SMS_AMAZON_TAG);
}

async function renderShop(product,host){
  host.replaceChildren();
  host.appendChild(textEl('div','web-shop-status','Checking current partner offers…'));
  const offers=await fetchAffiliateOffers(product);
  host.replaceChildren();

  if(offers.length){
    host.appendChild(textEl('div','web-shop-status','Current partner offers for this exact bottle. The retailer has the final price and availability.'));
    const byRetailer=new Map();
    for(const offer of offers){
      const key=normalized(offer.retailer||offer.advertiserId||'retailer');
      if(!byRetailer.has(key)) byRetailer.set(key,offer);
    }
    [...byRetailer.values()].slice(0,4).forEach(offer=>{
      const row=document.createElement('div');
      row.className='web-shop-offer';
      const a=document.createElement('a');
      a.href=safeHttpsUrl(offer.affiliateUrl);
      a.target='_blank';
      a.rel='sponsored noopener noreferrer';
      a.textContent='SHOP AT '+String(offer.retailer||'PARTNER').toUpperCase();
      row.appendChild(a);
      const price=Number(offer.price);
      row.appendChild(textEl('div','web-shop-price',Number.isFinite(price)&&price>0?'$'+price.toFixed(2):'View price'));
      host.appendChild(row);
    });
  }else{
    host.appendChild(textEl('div','web-shop-status','No exact CJ partner offer is verified right now. You can still search Amazon through our tagged link.'));
  }

  const amazon=document.createElement('a');
  amazon.className='web-discover-btn web-amazon-link';
  amazon.href=amazonUrl(product);
  amazon.target='_blank';
  amazon.rel='sponsored noopener noreferrer';
  amazon.textContent='SEARCH AMAZON';
  host.appendChild(amazon);
}

function renderCompareCard(row,openDetail){
  const card=document.createElement('article');
  card.className='web-compare-card';

  const pair=document.createElement('div');
  pair.className='web-compare-pair';
  pair.appendChild(bottleSide(productFromComparison(row,'original'),'ORIGINAL / DESIGNER'));
  pair.appendChild(textEl('div','web-compare-vs','↔'));
  pair.appendChild(bottleSide(productFromComparison(row,'alternative'),'ALTERNATIVE'));
  card.appendChild(pair);

  const similarity=Number(row.estimated_similarity);
  if(Number.isFinite(similarity)) card.appendChild(textEl('div','web-compare-score','≈ '+Math.round(similarity)+'% SIMILAR'));

  const similarities=String(row.similarities||'').trim();
  const differences=String(row.differences||'').trim();
  if(similarities){
    const p=document.createElement('p');
    p.className='web-compare-copy';
    const b=document.createElement('strong'); b.textContent='What feels familiar: ';
    p.appendChild(b); p.appendChild(document.createTextNode(similarities));
    card.appendChild(p);
  }
  if(differences){
    const p=document.createElement('p');
    p.className='web-compare-copy';
    const b=document.createElement('strong'); b.textContent='Where they split: ';
    p.appendChild(b); p.appendChild(document.createTextNode(differences));
    card.appendChild(p);
  }

  const actions=document.createElement('div');
  actions.className='web-compare-actions';
  const why=buttonEl('SEE WHY I MATCHED THEM');
  why.addEventListener('click',()=>openDetail(row));
  actions.appendChild(why);

  const shopAlt=buttonEl('SHOP ALTERNATIVE','web-discover-btn secondary');
  shopAlt.addEventListener('click',()=>openDetail(row,'alternative'));
  actions.appendChild(shopAlt);

  const shopOriginal=buttonEl('SHOP ORIGINAL','web-discover-btn secondary');
  shopOriginal.addEventListener('click',()=>openDetail(row,'original'));
  actions.appendChild(shopOriginal);

  card.appendChild(actions);
  return card;
}

async function renderDetail(row,focusShop=''){
  const detail=document.getElementById('website-discover-detail');
  const grid=document.getElementById('website-discover-grid');
  const more=document.getElementById('website-discover-more');
  if(!detail) return;

  detail.hidden=false;
  if(grid) grid.hidden=true;
  if(more) more.hidden=true;
  detail.replaceChildren();

  const back=buttonEl('‹ BACK TO DISCOVER','web-detail-back');
  back.addEventListener('click',()=>{
    detail.hidden=true;
    detail.replaceChildren();
    if(grid) grid.hidden=false;
    const state=window.__smsDiscoverState;
    if(more && state) more.hidden=state.visible>=state.rows.length;
    document.getElementById('discover')?.scrollIntoView({behavior:'smooth',block:'start'});
  });
  detail.appendChild(back);

  const original=productFromComparison(row,'original');
  const alternative=productFromComparison(row,'alternative');
  const similarity=Number(row.estimated_similarity);

  detail.appendChild(textEl('div','web-compare-kicker','DISCOVER YOUR NEXT SCENT'));
  detail.appendChild(textEl('h3','web-detail-title',[original.name,'↔',alternative.name].filter(Boolean).join(' ')));
  detail.appendChild(textEl('p','web-detail-sub',(Number.isFinite(similarity)?'≈ '+Math.round(similarity)+'% similar. ':'')+'See what feels familiar, where the scents split, and shop either side.'));

  const summary=document.createElement('div');
  summary.className='web-detail-grid';

  const same=document.createElement('div');
  same.className='web-detail-card';
  same.appendChild(textEl('h3','','What feels the same'));
  same.appendChild(textEl('p','',String(row.similarities||'These two scents move in a similar direction.')));
  summary.appendChild(same);

  const diff=document.createElement('div');
  diff.className='web-detail-card';
  diff.appendChild(textEl('h3','','Where they split'));
  diff.appendChild(textEl('p','',String(row.differences||'Each fragrance keeps its own character and wear.')));
  summary.appendChild(diff);

  detail.appendChild(summary);

  const [originalProfile,alternativeProfile]=await Promise.all([
    fetchProfile(original),fetchProfile(alternative)
  ]);

  const notes=document.createElement('div');
  notes.className='web-detail-grid';
  notes.style.marginTop='16px';
  notes.appendChild(notesCard(originalProfile||original,'Original'));
  notes.appendChild(notesCard(alternativeProfile||alternative,'Alternative'));
  detail.appendChild(notes);

  const addison=document.createElement('div');
  addison.className='web-detail-card';
  addison.style.marginTop='16px';
  addison.appendChild(textEl('div','web-compare-kicker','ADDISON SAYS'));
  addison.appendChild(textEl('h3','','The quick take'));
  addison.appendChild(textEl('p','',String(row.verdict||'Use the similarity as a shopping guide, then choose the bottle whose details fit your taste and budget.')));
  detail.appendChild(addison);

  const shops=document.createElement('div');
  shops.className='web-detail-grid';
  shops.style.marginTop='16px';

  const altShop=document.createElement('div');
  altShop.className='web-detail-card';
  altShop.appendChild(textEl('h3','','Shop '+(alternative.name||'alternative')));
  const altHost=document.createElement('div'); altHost.className='web-shop-box';
  altShop.appendChild(altHost);
  shops.appendChild(altShop);

  const originalShop=document.createElement('div');
  originalShop.className='web-detail-card';
  originalShop.appendChild(textEl('h3','','Shop '+(original.name||'original')));
  const originalHost=document.createElement('div'); originalHost.className='web-shop-box';
  originalShop.appendChild(originalHost);
  shops.appendChild(originalShop);

  detail.appendChild(shops);
  renderShop(alternativeProfile||alternative,altHost);
  renderShop(originalProfile||original,originalHost);

  requestAnimationFrame(()=>{
    if(focusShop==='alternative') altShop.scrollIntoView({behavior:'smooth',block:'center'});
    else if(focusShop==='original') originalShop.scrollIntoView({behavior:'smooth',block:'center'});
    else detail.scrollIntoView({behavior:'smooth',block:'start'});
  });
}

async function loadFullWebsiteDiscover(){
  const input=document.getElementById('website-discover-search');
  const grid=document.getElementById('website-discover-grid');
  const status=document.getElementById('website-discover-status');
  const more=document.getElementById('website-discover-more');
  if(!input||!grid||!status||!more) return;

  const state={rows:[],visible:8,request:0};
  window.__smsDiscoverState=state;

  const paint=()=>{
    grid.replaceChildren();
    state.rows.slice(0,state.visible).forEach(row=>grid.appendChild(renderCompareCard(row,renderDetail)));
    status.textContent=state.rows.length
      ? state.rows.length+' verified comparison'+(state.rows.length===1?'':'s')+' found'
      : (input.value.trim()?'No verified match yet. Try another spelling, bottle, or brand.':'No comparisons are ready right now.');
    more.hidden=state.visible>=state.rows.length;
  };

  const refresh=async()=>{
    const request=++state.request;
    const q=input.value.trim();
    status.textContent='Finding verified comparisons…';
    try{
      const rows=await fetchComparisons(q);
      if(request!==state.request) return;
      state.rows=rows;
      state.visible=8;
      paint();
    }catch{
      if(request!==state.request) return;
      state.rows=[];
      paint();
      status.textContent='Discover is refreshing. Please try again in a moment.';
    }
  };

  let timer=null;
  input.addEventListener('input',()=>{
    clearTimeout(timer);
    timer=setTimeout(refresh,260);
  });
  more.addEventListener('click',()=>{
    state.visible+=8;
    paint();
  });

  await refresh();
}

async function loadStyleMyScentDiscovery(){
  const host=document.getElementById('live-deal-grid');
  const status=document.getElementById('live-deal-status');
  if(!host) return;
  try{
    const select='fragrance_id,brand,canonical_name,concentration,image_url,retailer_name,price,affiliate_url,is_new,reason';
    const response=await fetch(SMS_SUPABASE_URL+'/rest/v1/catalog_discovery_feed?select='+select+'&order=discovery_score.desc,brand.asc,canonical_name.asc&limit=30',{
      headers:{apikey:SMS_SUPABASE_KEY,Authorization:'Bearer '+SMS_SUPABASE_KEY},
    });
    if(!response.ok) throw new Error('Discovery unavailable');
    const allRows=await response.json();
    const rows=[];
    const seenRetailers=new Set();
    for(const row of allRows){
      const retailer=String(row.retailer_name || '').toLowerCase();
      if(retailer && !seenRetailers.has(retailer)){
        rows.push(row);
        seenRetailers.add(retailer);
      }
    }
    for(const row of allRows){
      if(rows.length>=8) break;
      if(!rows.includes(row)) rows.push(row);
    }
    host.replaceChildren();

    rows.slice(0,8).forEach(row=>{
      const card=document.createElement('article');
      card.className='discover-card';

      const imageUrl=safeHttpsUrl(row.image_url);
      if(imageUrl){
        const img=document.createElement('img');
        img.src=imageUrl;
        img.alt=((row.brand || '')+' '+(row.canonical_name || '')).trim() || 'Fragrance bottle';
        img.loading='lazy';
        img.referrerPolicy='no-referrer';
        card.appendChild(img);
      }else{
        card.appendChild(textEl('div','discover-fallback','SMS'));
      }

      const copy=document.createElement('div');
      copy.className='discover-card-copy';
      copy.appendChild(textEl('div','discover-meta',(row.is_new?'NEW • ':'')+(row.brand || '')));
      copy.appendChild(textEl('h3','',row.canonical_name || 'Fragrance'));

      const price=Number(row.price);
      const detail=(row.concentration || 'Fragrance')+(Number.isFinite(price)?' • from $'+price.toFixed(2):'');
      copy.appendChild(textEl('p','',detail));
      copy.appendChild(textEl('span','','Ready to style • verified shopping match'));
      copy.appendChild(textEl('span','','Paid links • commissions may be earned'));

      const affiliateUrl=safeHttpsUrl(row.affiliate_url);
      if(affiliateUrl){
        const actions=document.createElement('div');
        actions.className='discover-actions';
        const shop=document.createElement('a');
        shop.className='mini-btn';
        shop.href=affiliateUrl;
        shop.target='_blank';
        shop.rel='sponsored noopener noreferrer';
        shop.textContent='VIEW AT '+String(row.retailer_name || 'RETAILER').toUpperCase();
        actions.appendChild(shop);

        const amazon=document.createElement('a');
        const amazonQuery=[row.brand,row.canonical_name,row.concentration].filter(Boolean).join(' ');
        amazon.className='mini-btn';
        amazon.href='https://www.amazon.com/s?k='+encodeURIComponent(amazonQuery)+'&tag='+encodeURIComponent(SMS_AMAZON_TAG);
        amazon.target='_blank';
        amazon.rel='sponsored noopener noreferrer';
        amazon.textContent='SEARCH AMAZON';
        actions.appendChild(amazon);

        copy.appendChild(actions);
      }

      card.appendChild(copy);
      host.appendChild(card);
    });
    if(status) status.textContent=rows.length?'Live partner picks refresh automatically — eCosmetics, FragranceShop.com and Amazon shopping options are enabled.':'Discovery is refreshing.';
  }catch{
    if(status) status.textContent='Discovery is refreshing. The app will always show the newest ready-to-shop picks.';
  }
}

document.addEventListener('DOMContentLoaded',()=>{
  loadFullWebsiteDiscover().catch(()=>{});
  loadStyleMyScentDiscovery().catch(()=>{});
});
