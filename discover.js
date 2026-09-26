(function purgeLegacyHeroDecor(){
  const selectors='.scene-left,.scene-frame,.scene-shelf,.scene-items,.scene-bottle,.scene-candle,.scene-candle-body,.scene-wick,.scene-flame,.scene-candle-glow';
  const style=document.createElement('style');
  style.textContent=selectors+'{display:none!important}';
  document.head.appendChild(style);
  const purge=()=>document.querySelectorAll(selectors).forEach(node=>node.remove());
  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',purge,{once:true});
  else purge();
})();

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

function safeBottleImageUrl(value=''){
  const url=safeHttpsUrl(value);
  if(!url) return '';
  if(/\/ics\.png(?:[?#]|$)/i.test(url) || /placeholder/i.test(url)) return '';
  if(/^https:\/\/(?:www\.)?alharamainperfumes\.co\.uk\/?$/i.test(url)) return '';
  return url;
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

const SMS_FAMILIAR_DESIGNER_BRANDS=new Set([
  'creed','dior','chanel','gucci','givenchy','yves saint laurent','ysl','tom ford',
  'parfums de marly','jean paul gaultier','mugler','rabanne','prada','valentino',
  'giorgio armani','armani','maison francis kurkdjian','louis vuitton','burberry',
  'carolina herrera','versace','dolce gabbana','dolce and gabbana','lancome',
  'kayali','jimmy choo','chloe','marc jacobs'
]);

const SMS_FAMILIAR_ALT_BRANDS=new Set([
  'lattafa','afnan','armaf','maison alhambra','french avenue','al haramain',
  'orientica','fragrance world','paris corner','rayhaan','swiss arabian','ajmal'
]);

function familiarBrandScore(row){
  let score=0;
  if(SMS_FAMILIAR_DESIGNER_BRANDS.has(normalized(row.original_brand))) score+=8;
  if(SMS_FAMILIAR_ALT_BRANDS.has(normalized(row.alternative_brand))) score+=5;
  if(SMS_FAMILIAR_DESIGNER_BRANDS.has(normalized(row.alternative_brand))) score+=3;
  if(SMS_FAMILIAR_ALT_BRANDS.has(normalized(row.original_brand))) score+=1;
  score+=Math.min(5,Math.max(0,(Number(row.estimated_similarity)||60)-60)/8);
  return score;
}

function rankHomepageComparisons(rows=[]){
  const sorted=[...rows].sort((a,b)=>
    familiarBrandScore(b)-familiarBrandScore(a) ||
    Number(b.estimated_similarity||0)-Number(a.estimated_similarity||0) ||
    String(b.verified_at||'').localeCompare(String(a.verified_at||''))
  );

  // Keep the first screen varied so one house does not dominate the homepage.
  const first=[];
  const rest=[];
  const seenOriginalBrands=new Map();
  for(const row of sorted){
    const brand=normalized(row.original_brand);
    const count=seenOriginalBrands.get(brand)||0;
    if(first.length<12 && count<2){
      first.push(row);
      seenOriginalBrands.set(brand,count+1);
    }else{
      rest.push(row);
    }
  }
  return [...first,...rest];
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

  const imageUrl=safeBottleImageUrl(product.imageUrl);
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


function comparisonCopyIsCustomerReady(row){
  const badSimilarity=/(limited shared|independent comparison evidence|catalog currently|owner research|resolution file|database|machine|source-note|evidence links|research is still|not supplied|owner-approved resolution|supplied snapshot)/i;
  const badDifference=/(owner research|resolution file|database|machine|source-note|evidence|not supplied|catalog currently)/i;
  const badVerdict=/(OWNER_VERIFIED|owner-verified|human research|database|machine|resolution|still filling|still gathering|not enough|unsure)/i;
  return Boolean(
    row &&
    row.compared_fragrance_id &&
    safeHttpsUrl(row.original_image_url) &&
    safeHttpsUrl(row.alternative_image_url) &&
    String(row.similarities||'').trim() &&
    String(row.differences||'').trim() &&
    String(row.verdict||'').trim() &&
    !badSimilarity.test(String(row.similarities||'')) &&
    !badDifference.test(String(row.differences||'')) &&
    !badVerdict.test(String(row.verdict||''))
  );
}
function addisonComparisonCopy(kind,value,row={}){
  let text=String(value||'').replace(/\s+/g,' ').trim();
  if(!text) return '';

  if(kind==='same'){
    text=text
      .replace(/^Both profiles share (.+?), keeping the overall scent direction closely related\.?$/i,
        (_,notes)=>`I get the strongest overlap from ${notes} — that’s what keeps these two in the same scent neighborhood.`)
      .replace(/^Both profiles share (.+?)\.?$/i,
        (_,notes)=>`The part that jumps out to me is ${notes}; that’s where these two feel most familiar.`);
  }

  if(kind==='different'){
    text=text
      .replace(/^The Middle Eastern fragrance emphasizes (.+?), while the designer reference emphasizes (.+?)\.?$/i,
        (_,alt,orig)=>`I’d expect the alternative to lean more into ${alt}, while the original pulls harder toward ${orig}.`)
      .replace(/^The source fragrance emphasizes (.+?), while the designer reference emphasizes (.+?)\.?$/i,
        (_,alt,orig)=>`I’d expect the alternative to lean more into ${alt}, while the original pulls harder toward ${orig}.`)
      .replace(/^The alternative emphasizes (.+?), while the original emphasizes (.+?)\.?$/i,
        (_,alt,orig)=>`I’d expect the alternative to lean more into ${alt}, while the original pulls harder toward ${orig}.`);
  }

  if(kind==='verdict'){
    if(/^A strong alternative with a clearly related profile/i.test(text)){
      return 'I’d put this in the strong-alternative lane: familiar enough to scratch the same itch, but different enough to keep its own personality.';
    }
    if(/^A recognizable alternative that shares the same direction/i.test(text)){
      return 'This is one I’d show you if you love the original but don’t need a one-for-one copy.';
    }
    if(/^Extremely close on paper/i.test(text)){
      return 'This is one of the closer matches I’d put in front of you — the differences are more about nuance and wear than a totally different scent.';
    }
    if(/^A very close alternative/i.test(text)){
      return 'I’d call this a very close alternative: the overall vibe stays familiar, while the finish still has its own character.';
    }
  }

  return text;
}


async function noteReadyIds(rows=[]){
  const ids=[...new Set(rows.flatMap(row=>[row.fragrance_id,row.compared_fragrance_id]).filter(Boolean))];
  const ready=new Set();
  for(let offset=0;offset<ids.length;offset+=55){
    const scope=ids.slice(offset,offset+55);
    const idFilter='in.('+scope.join(',')+')';
    const [coreRes,addisonRes,discoverRes]=await Promise.all([
      fetch(SMS_SUPABASE_URL+'/rest/v1/fragrances?'+new URLSearchParams({
        select:'id,top_notes,middle_notes,base_notes,fragrance_notes,accords',
        id:idFilter,is_active:'eq.true',verification_status:'eq.verified'
      }).toString(),{headers:{apikey:SMS_SUPABASE_KEY,Authorization:'Bearer '+SMS_SUPABASE_KEY}}),
      fetch(SMS_SUPABASE_URL+'/rest/v1/catalog_addison_scent_profile?'+new URLSearchParams({
        select:'fragrance_id,top_notes,middle_notes,base_notes,general_notes,accords',
        fragrance_id:idFilter
      }).toString(),{headers:{apikey:SMS_SUPABASE_KEY,Authorization:'Bearer '+SMS_SUPABASE_KEY}}),
      fetch(SMS_SUPABASE_URL+'/rest/v1/catalog_discover_scent_profiles?'+new URLSearchParams({
        select:'fragrance_id,notes,accords',
        fragrance_id:idFilter
      }).toString(),{headers:{apikey:SMS_SUPABASE_KEY,Authorization:'Bearer '+SMS_SUPABASE_KEY}})
    ]);

    if(coreRes.ok){
      for(const product of await coreRes.json()){
        const count=['top_notes','middle_notes','base_notes','fragrance_notes','accords']
          .reduce((sum,key)=>sum+(Array.isArray(product[key])?product[key].filter(Boolean).length:0),0);
        if(count>0) ready.add(product.id);
      }
    }
    if(addisonRes.ok){
      for(const profile of await addisonRes.json()){
        const count=['top_notes','middle_notes','base_notes','general_notes','accords']
          .reduce((sum,key)=>sum+(Array.isArray(profile[key])?profile[key].filter(Boolean).length:0),0);
        if(count>0) ready.add(profile.fragrance_id);
      }
    }
    if(discoverRes.ok){
      for(const profile of await discoverRes.json()){
        const notes=profile.notes||{};
        const count=['top','heart','base','general']
          .reduce((sum,key)=>sum+(Array.isArray(notes[key])?notes[key].filter(Boolean).length:0),0)
          +(Array.isArray(profile.accords)?profile.accords.filter(Boolean).length:0);
        if(count>0) ready.add(profile.fragrance_id);
      }
    }
  }
  return ready;
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

  const baseParams=new URLSearchParams();
  baseParams.set('select',fields);
  baseParams.set('order','verified_at.desc.nullslast,comparison_id');

  const q=String(query||'').trim().replace(/[*,()%]/g,' ');
  const queryWords=normalized(q).split(' ').filter(Boolean);
  if(q){
    // Search the server with the first token (usually the brand), then require
    // every typed token client-side. A full phrase like "Gucci Flora" should
    // match brand=Gucci + name=Flora Gorgeous Orchid even though no single
    // database column literally contains the phrase "Gucci Flora".
    const genericTokens=new Set(['fragrance','fragrances','perfume','perfumes','parfum','parfums','inspired','world','eau','de','by','the']);
    const specificWords=queryWords.filter(word=>!genericTokens.has(word));
    const serverTerm=[...(specificWords.length?specificWords:queryWords)].sort((a,b)=>b.length-a.length)[0] || q;
    const filter=[
      'alternative_brand.ilike.*'+serverTerm+'*',
      'alternative_name.ilike.*'+serverTerm+'*',
      'original_brand.ilike.*'+serverTerm+'*',
      'original_name.ilike.*'+serverTerm+'*'
    ].join(',');
    baseParams.set('or','('+filter+')');
  }

  // The public REST endpoint can cap a single response at 100 rows.
  // Scan enough verified public rows to keep the full 300 customer-ready comparison target filled.
  const targetRows=900;
  const pageSize=100;
  const rows=[];
  for(let offset=0;offset<targetRows;offset+=pageSize){
    const params=new URLSearchParams(baseParams);
    params.set('limit',String(pageSize));
    params.set('offset',String(offset));
    const response=await fetch(SMS_SUPABASE_URL+'/rest/v1/catalog_discover_comparison_cards_v1?'+params.toString(),{
      headers:{apikey:SMS_SUPABASE_KEY,Authorization:'Bearer '+SMS_SUPABASE_KEY}
    });
    if(!response.ok) throw new Error('Discover unavailable');
    const page=await response.json();
    rows.push(...page);
    if(page.length<pageSize) break;
  }
  const seenPairs=new Set();
  const cleaned=rows.filter(row=>{
    const similarity=Number(row.estimated_similarity);
    if(!Number.isFinite(similarity) || similarity<60) return false;

    if(queryWords.length){
      const haystack=normalized([
        row.alternative_brand,row.alternative_name,
        row.original_brand,row.original_name
      ].filter(Boolean).join(' '));
      if(!queryWords.every(word=>haystack.includes(word))) return false;
    }

    const key=[
      normalized(row.alternative_brand),normalized(row.alternative_name),
      normalized(row.original_brand),normalized(row.original_name)
    ].join('|');
    if(seenPairs.has(key)) return false;
    seenPairs.add(key);
    return true;
  });

  const copyReady=cleaned.filter(comparisonCopyIsCustomerReady);
  const readyIds=await noteReadyIds(copyReady);
  const websiteReady=copyReady.filter(row=>readyIds.has(row.fragrance_id)&&readyIds.has(row.compared_fragrance_id));

  // Search bottle identity first. If the typed words are actually present in a
  // brand/name pair, do not let incidental wording in similarities/differences
  // outrank or pollute those direct bottle matches.
  const identityReady=queryWords.length
    ? websiteReady.filter(row=>{
        const identity=normalized([
          row.alternative_brand,row.alternative_name,
          row.original_brand,row.original_name
        ].filter(Boolean).join(' '));
        return queryWords.every(word=>identity.includes(word));
      })
    : [];
  const searchReady=identityReady.length?identityReady:websiteReady;

  // A broad brand search such as "Gucci" should browse the brand, not show
  // eight different alternatives for the same bottle. Keep one strongest
  // comparison per matching bottle.
  if(queryWords.length===1){
    const exactBrand=searchReady.filter(row=>
      normalized(row.original_brand)===queryWords[0] ||
      normalized(row.alternative_brand)===queryWords[0]
    );
    const source=exactBrand.length?exactBrand:searchReady;
    const bestByBottle=new Map();
    for(const row of source){
      const originalMatches=normalized(row.original_brand)===queryWords[0];
      const bottleKey=originalMatches
        ? ['original',normalized(row.original_brand),normalized(row.original_name),normalized(row.original_concentration)].join('|')
        : ['alternative',normalized(row.alternative_brand),normalized(row.alternative_name),normalized(row.alternative_concentration)].join('|');
      const existing=bestByBottle.get(bottleKey);
      if(!existing || Number(row.estimated_similarity)>Number(existing.estimated_similarity)){
        bestByBottle.set(bottleKey,row);
      }
    }
    return [...bestByBottle.values()].sort((a,b)=>Number(b.estimated_similarity)-Number(a.estimated_similarity));
  }

  if(queryWords.length){
    return [...searchReady].sort((a,b)=>
      Number(b.estimated_similarity||0)-Number(a.estimated_similarity||0) ||
      String(b.verified_at||'').localeCompare(String(a.verified_at||''))
    );
  }

  return rankHomepageComparisons(websiteReady).slice(0,300);
}

async function fetchProfile(product){
  if(!product?.id) return null;
  const headers={apikey:SMS_SUPABASE_KEY,Authorization:'Bearer '+SMS_SUPABASE_KEY};
  const coreParams=new URLSearchParams({
    select:'id,canonical_name,brand,concentration,product_type,top_notes,middle_notes,base_notes,fragrance_notes,accords,bottle_image_url',
    id:'eq.'+product.id,is_active:'eq.true',verification_status:'eq.verified',limit:'1'
  });
  const addisonParams=new URLSearchParams({
    select:'fragrance_id,top_notes,middle_notes,base_notes,general_notes,accords',
    fragrance_id:'eq.'+product.id,limit:'1'
  });
  const discoverParams=new URLSearchParams({
    select:'fragrance_id,notes,accords',
    fragrance_id:'eq.'+product.id,limit:'1'
  });
  const [coreRes,addisonRes,discoverRes]=await Promise.all([
    fetch(SMS_SUPABASE_URL+'/rest/v1/fragrances?'+coreParams.toString(),{headers}),
    fetch(SMS_SUPABASE_URL+'/rest/v1/catalog_addison_scent_profile?'+addisonParams.toString(),{headers}),
    fetch(SMS_SUPABASE_URL+'/rest/v1/catalog_discover_scent_profiles?'+discoverParams.toString(),{headers})
  ]);
  if(!coreRes.ok) return null;
  const row=(await coreRes.json())[0];
  if(!row) return null;
  const addison=addisonRes.ok?(await addisonRes.json())[0]:null;
  const discover=discoverRes.ok?(await discoverRes.json())[0]:null;
  const dnotes=discover?.notes||{};
  const pick=(...lists)=>{
    for(const list of lists){
      if(Array.isArray(list)&&list.filter(Boolean).length) return list.filter(Boolean);
    }
    return [];
  };
  return {
    ...product,
    brand:row.brand||product.brand,
    name:row.canonical_name||product.name,
    concentration:row.concentration||row.product_type||product.concentration,
    imageUrl:row.bottle_image_url||product.imageUrl,
    notes:{
      top:pick(row.top_notes,addison?.top_notes,dnotes.top),
      heart:pick(row.middle_notes,addison?.middle_notes,dnotes.heart),
      base:pick(row.base_notes,addison?.base_notes,dnotes.base),
      general:pick(row.fragrance_notes,addison?.general_notes,dnotes.general),
      accords:pick(row.accords,addison?.accords,discover?.accords),
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
    const response=await fetch(SMS_CJ_URL+'?q='+encodeURIComponent(q)+'&channel=website',{
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
  // One Associates tracking route for the whole catalog. Search the selected
  // bottle dynamically instead of maintaining hundreds of product-specific links.
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
    host.appendChild(textEl('div','web-shop-status','I don’t have a clean partner match for this exact bottle right now, but you can still check Amazon through our tagged link.'));
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
  pair.appendChild(bottleSide(productFromComparison(row,'original'),'THE SCENT YOU KNOW'));
  pair.appendChild(textEl('div','web-compare-vs','↔'));
  pair.appendChild(bottleSide(productFromComparison(row,'alternative'),'ONE TO TRY'));
  card.appendChild(pair);

  const similarity=Number(row.estimated_similarity);
  if(Number.isFinite(similarity)) card.appendChild(textEl('div','web-compare-score','≈ '+Math.round(similarity)+'% SIMILAR'));

  const similarities=addisonComparisonCopy('same',row.similarities,row);
  const differences=addisonComparisonCopy('different',row.differences,row);
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
  same.appendChild(textEl('p','',addisonComparisonCopy('same',row.similarities,row)||'These two land in a similar scent neighborhood, which is why I paired them.'));
  summary.appendChild(same);

  const diff=document.createElement('div');
  diff.className='web-detail-card';
  diff.appendChild(textEl('h3','','Where they split'));
  diff.appendChild(textEl('p','',addisonComparisonCopy('different',row.differences,row)||'They still keep their own personality once you get into the details and drydown.'));
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
  addison.appendChild(textEl('p','',addisonComparisonCopy('verdict',row.verdict,row)||'I’d use the similarity as your shortcut, then pick the bottle whose details sound most like you.'));
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
      ? 'I found '+state.rows.length+' match'+(state.rows.length===1?'':'es')+' for you'
      : (input.value.trim()?'I’m not seeing a match I’d feel good showing you yet. Try another spelling, bottle, or brand.':'I don’t have a match I want to put in front of you right now.');
    more.hidden=state.visible>=state.rows.length;
  };

  const refresh=async()=>{
    const request=++state.request;
    const q=input.value.trim();
    status.textContent='Addison is pulling your closest matches…';
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
      copy.appendChild(textEl('span','','Ready to style • shop this match'));
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
