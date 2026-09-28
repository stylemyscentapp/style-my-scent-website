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
const MAX_DUPES_PER_DESIGNER=2;
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
  const raw=String(value || '').trim();
  if(!raw || /[^\x00-\x7F]/.test(raw)) return '';
  const url=safeHttpsUrl(raw);
  if(!url) return '';
  if(/\/ics\.png(?:[?#]|$)/i.test(url) || /placeholder|no[-_ ]?image|image[-_ ]?not[-_ ]?found/i.test(url)) return '';
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

function homepageDesignerTier(row){
  const originalDesigner=SMS_FAMILIAR_DESIGNER_BRANDS.has(normalized(row.original_brand));
  const alternativeDesigner=SMS_FAMILIAR_DESIGNER_BRANDS.has(normalized(row.alternative_brand));
  const originalAlt=SMS_FAMILIAR_ALT_BRANDS.has(normalized(row.original_brand));
  const alternativeAlt=SMS_FAMILIAR_ALT_BRANDS.has(normalized(row.alternative_brand));
  if(originalDesigner && alternativeAlt) return 4;
  if(originalDesigner) return 3;
  if(alternativeDesigner && originalAlt) return 2;
  if(alternativeDesigner) return 1;
  return 0;
}

function designerBottleKey(row){
  const originalDesigner=SMS_FAMILIAR_DESIGNER_BRANDS.has(normalized(row.original_brand));
  const alternativeDesigner=SMS_FAMILIAR_DESIGNER_BRANDS.has(normalized(row.alternative_brand));
  if(originalDesigner){
    return ['designer',normalized(row.original_brand),normalized(row.original_name),normalized(row.original_concentration)].join('|');
  }
  if(alternativeDesigner){
    return ['designer',normalized(row.alternative_brand),normalized(row.alternative_name),normalized(row.alternative_concentration)].join('|');
  }
  return ['original',normalized(row.original_brand),normalized(row.original_name),normalized(row.original_concentration)].join('|');
}

function limitTwoPerDesignerBottle(rows=[]){
  const grouped=new Map();
  for(const row of rows){
    const key=designerBottleKey(row);
    if(!grouped.has(key)) grouped.set(key,[]);
    grouped.get(key).push(row);
  }
  const allowed=new Set();
  for(const list of grouped.values()){
    list.sort((a,b)=>
      Number(b.estimated_similarity||0)-Number(a.estimated_similarity||0) ||
      String(b.verified_at||'').localeCompare(String(a.verified_at||''))
    );
    list.slice(0,MAX_DUPES_PER_DESIGNER).forEach(row=>allowed.add(row.comparison_id));
  }
  return rows.filter(row=>allowed.has(row.comparison_id));
}

function rankHomepageComparisons(rows=[]){
  const sorted=[...rows].sort((a,b)=>
    homepageDesignerTier(b)-homepageDesignerTier(a) ||
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

function bottleSide(product,kicker,onShop){
  const side=document.createElement('div');
  side.className='web-compare-side'+(onShop?' is-shop-link':'');
  if(product?.id) side.dataset.fragranceId=product.id;

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

  const noteHost=document.createElement('div');
  noteHost.className='web-compare-notes';
  if(product?.id) noteHost.dataset.fragranceId=product.id;
  side.appendChild(noteHost);

  if(onShop){
    side.tabIndex=0;
    side.setAttribute('role','button');
    side.setAttribute('aria-label','Shop '+[product.brand,product.name].filter(Boolean).join(' '));
    side.title='Shop '+[product.brand,product.name].filter(Boolean).join(' ');
    side.addEventListener('click',onShop);
    side.addEventListener('keydown',event=>{
      if(event.key==='Enter' || event.key===' '){
        event.preventDefault();
        onShop();
      }
    });
  }
  return side;
}


function comparisonCopyIsCustomerReady(row){
  return Boolean(
    row &&
    row.compared_fragrance_id &&
    row.fragrance_id !== row.compared_fragrance_id &&
    safeBottleImageUrl(row.original_image_url) &&
    safeBottleImageUrl(row.alternative_image_url) &&
    !(
      normalized(row.alternative_brand)===normalized(row.original_brand) &&
      normalized(row.alternative_name)===normalized(row.original_name)
    ) &&
    String(row.similarities||'').trim() &&
    String(row.differences||'').trim()
  );
}

function humanList(items=[]){
  const clean=[...new Set((items||[]).map(x=>String(x||'').trim()).filter(Boolean))];
  if(clean.length<=1) return clean[0]||'';
  if(clean.length===2) return clean[0]+' and '+clean[1];
  return clean.slice(0,-1).join(', ')+', and '+clean[clean.length-1];
}

function addisonComparisonCopy(kind,value,row={}){
  let copy=String(value||'').replace(/\s+/g,' ').trim();
  const alt=String(row.alternative_name||'the alternative').trim();
  const original=String(row.original_name||'the designer').trim();
  const shared=Array.isArray(row.shared_notes)?row.shared_notes.filter(Boolean):[];
  const similarity=Number(row.estimated_similarity);
  const technical=/(owner[- ]?(approved|verified|research)|human research|workbook|csv|database|machine|evidence|source[- ]reported|source provides|catalog currently|still gathering|resolution file|supplied snapshot|pipeline|publication)/i;

  if(kind==='same'){
    if(shared.length){
      return `What makes this match work is the overlap in ${humanList(shared.slice(0,5))}. That shared structure keeps ${alt} close to ${original}'s signature instead of merely landing in the same fragrance family.`;
    }
    if(technical.test(copy)){
      if(Number.isFinite(similarity)&&similarity>=90){
        return `${alt} keeps the recognizable shape and mood of ${original} remarkably well. At about ${Math.round(similarity)}% similarity, this reads as a true alternative, not just a fragrance with a few notes in common.`;
      }
      return `${alt} stays in the same recognizable scent direction as ${original}, with enough structural overlap to feel familiar from the opening through the drydown.`;
    }
    copy=copy
      .replace(/^Both profiles share (.+?), keeping the overall scent direction closely related\.?$/i,
        (_,notes)=>`The strongest connection is ${notes}. That is what makes ${alt} feel immediately familiar next to ${original}.`)
      .replace(/^Both profiles share (.+?)\.?$/i,
        (_,notes)=>`The strongest connection is ${notes}; that is where the resemblance comes through first.`);
    return copy;
  }

  if(kind==='different'){
    if(technical.test(copy)){
      return `The difference is mostly in polish and texture. ${alt} keeps its own personality in the supporting notes and drydown, while ${original} holds onto the smoother designer finish.`;
    }
    copy=copy
      .replace(/^The Middle Eastern fragrance emphasizes (.+?), while the designer reference emphasizes (.+?)\.?$/i,
        (_,a,o)=>`The personality shifts in the supporting notes: ${alt} leans more into ${a}, while ${original} puts more emphasis on ${o}.`)
      .replace(/^The source fragrance emphasizes (.+?), while the designer reference emphasizes (.+?)\.?$/i,
        (_,a,o)=>`The personality shifts in the supporting notes: ${alt} leans more into ${a}, while ${original} puts more emphasis on ${o}.`)
      .replace(/^The alternative emphasizes (.+?), while the original emphasizes (.+?)\.?$/i,
        (_,a,o)=>`The personality shifts in the supporting notes: ${alt} leans more into ${a}, while ${original} puts more emphasis on ${o}.`);
    return copy;
  }

  if(kind==='verdict'){
    if(technical.test(copy) || !copy){
      if(Number.isFinite(similarity)&&similarity>=90){
        return `If you love ${original}, ${alt} is one I would confidently put in front of you. The signature stays very close, while the finish still gives you a reason to choose one bottle over the other.`;
      }
      return `If you love ${original}, ${alt} is a strong alternative to try side by side. The core scent idea stays familiar, while the drydown gives it its own character.`;
    }
    if(/^A strong alternative with a clearly related profile/i.test(copy)){
      return `If you like ${original}, I would put ${alt} in the strong-alternative lane: clearly familiar, but with enough personality to stand on its own.`;
    }
    if(/^A recognizable alternative that shares the same direction/i.test(copy)){
      return `This is one I would show you if you love ${original} but do not need a one-for-one copy.`;
    }
    if(/^Extremely close on paper/i.test(copy)){
      return `This is one of the closer matches I would put in front of you. The differences are more about nuance and wear than a different scent identity.`;
    }
    if(/^A very close alternative/i.test(copy)){
      return `I would call this a very close alternative: the overall signature stays familiar, while the finish keeps its own character.`;
    }
    return copy;
  }

  return technical.test(copy)?'':copy;
}

async function fetchPublicWearDetails(comparisonId){
  if(!comparisonId) return null;
  try{
    const params=new URLSearchParams({
      select:'comparison_id,opening_comparison,drydown_comparison,performance_comparison',
      comparison_id:'eq.'+comparisonId,
      limit:'1'
    });
    const response=await fetch(SMS_SUPABASE_URL+'/rest/v1/catalog_public_comparison_wear_v1?'+params.toString(),{
      headers:{apikey:SMS_SUPABASE_KEY,Authorization:'Bearer '+SMS_SUPABASE_KEY}
    });
    if(!response.ok) return null;
    return (await response.json())[0]||null;
  }catch{return null}
}

function addisonWearCopy(kind,value,row={}){
  let t=String(value||'').replace(/\s+/g,' ').trim();
  if(!t || /^No separate .* was reported\.?$/i.test(t)) return '';
  const technical=/(owner[- ]?(approved|verified|research)|human research|workbook|csv|database|machine|evidence|source[- ]reported|pipeline|publication|percentage was reported)/i;
  if(technical.test(t)) return '';
  const alt=String(row.alternative_name||'the alternative').trim();
  const original=String(row.original_name||'the designer').trim();

  if(kind==='opening'){
    return t
      .replace(/^Both openings meet around (.+?)\.?$/i,(_,notes)=>`They meet quickly around ${notes}, so the first impression stays familiar.`)
      .replace(/^The openings separate more clearly.*$/i,`The opening is where ${alt} shows more of its own personality, while ${original} keeps the designer signature more clearly.`);
  }
  if(kind==='drydown'){
    return t
      .replace(/^Both drydowns meet around (.+?)\.?$/i,(_,notes)=>`They settle into the same ${notes} direction, which keeps the finish familiar as the fragrance settles.`)
      .replace(/^The drydowns separate more clearly than the opening, with different base-note emphasis\.?$/i,`This is where they part ways most: ${alt} shifts into a different base-note balance while ${original} keeps the original designer finish.`);
  }
  if(kind==='performance'){
    return t.replace(/^Performance is broadly similar\.?$/i,'Performance stays in a similar lane, so the bigger decision is scent character rather than wear time.');
  }
  return t;
}

async function noteReadyIds(rows=[],signal){
  const ids=[...new Set(rows.flatMap(row=>[row.fragrance_id,row.compared_fragrance_id]).filter(Boolean))];
  const ready=new Set();
  for(let offset=0;offset<ids.length;offset+=55){
    const scope=ids.slice(offset,offset+55);
    const idFilter='in.('+scope.join(',')+')';
    const [coreRes,addisonRes,discoverRes]=await Promise.all([
      fetch(SMS_SUPABASE_URL+'/rest/v1/fragrances?'+new URLSearchParams({
        select:'id,top_notes,middle_notes,base_notes,fragrance_notes,accords',
        id:idFilter,is_active:'eq.true',verification_status:'eq.verified'
      }).toString(),{headers:{apikey:SMS_SUPABASE_KEY,Authorization:'Bearer '+SMS_SUPABASE_KEY},signal}),
      fetch(SMS_SUPABASE_URL+'/rest/v1/catalog_addison_scent_profile?'+new URLSearchParams({
        select:'fragrance_id,top_notes,middle_notes,base_notes,general_notes,accords',
        fragrance_id:idFilter
      }).toString(),{headers:{apikey:SMS_SUPABASE_KEY,Authorization:'Bearer '+SMS_SUPABASE_KEY},signal}),
      fetch(SMS_SUPABASE_URL+'/rest/v1/catalog_discover_scent_profiles?'+new URLSearchParams({
        select:'fragrance_id,notes,accords',
        fragrance_id:idFilter
      }).toString(),{headers:{apikey:SMS_SUPABASE_KEY,Authorization:'Bearer '+SMS_SUPABASE_KEY},signal})
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

async function fetchComparisons(query='',signal){
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
    const response=await fetch(SMS_SUPABASE_URL+'/rest/v1/catalog_discover_comparison_cards_fast_v1?'+params.toString(),{
      headers:{apikey:SMS_SUPABASE_KEY,Authorization:'Bearer '+SMS_SUPABASE_KEY},signal
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
  const readyIds=await noteReadyIds(copyReady,signal);
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
    return limitTwoPerDesignerBottle([...bestByBottle.values()].sort((a,b)=>Number(b.estimated_similarity)-Number(a.estimated_similarity)));
  }

  if(queryWords.length){
    return limitTwoPerDesignerBottle([...searchReady].sort((a,b)=>
      Number(b.estimated_similarity||0)-Number(a.estimated_similarity||0) ||
      String(b.verified_at||'').localeCompare(String(a.verified_at||''))
    ));
  }

  return limitTwoPerDesignerBottle(rankHomepageComparisons(websiteReady)).slice(0,300);
}

const SMS_COMPACT_PROFILE_CACHE=new Map();

function compactProfileNotes(row={}){
  const staged=[
    ...(Array.isArray(row.top_notes)?row.top_notes:[]),
    ...(Array.isArray(row.middle_notes)?row.middle_notes:[]),
    ...(Array.isArray(row.base_notes)?row.base_notes:[])
  ].filter(Boolean);
  const general=(Array.isArray(row.fragrance_notes)?row.fragrance_notes:[]).filter(Boolean);
  const accords=(Array.isArray(row.accords)?row.accords:[]).filter(Boolean);
  return [...new Set(staged.length?staged:(general.length?general:accords))].slice(0,4);
}

async function hydrateCompactNotes(rows=[]){
  const ids=[...new Set(rows.flatMap(row=>[row.fragrance_id,row.compared_fragrance_id]).filter(Boolean))];
  const missing=ids.filter(id=>!SMS_COMPACT_PROFILE_CACHE.has(id));
  const headers={apikey:SMS_SUPABASE_KEY,Authorization:'Bearer '+SMS_SUPABASE_KEY};

  for(let offset=0;offset<missing.length;offset+=50){
    const scope=missing.slice(offset,offset+50);
    if(!scope.length) continue;
    try{
      const params=new URLSearchParams({
        select:'id,top_notes,middle_notes,base_notes,fragrance_notes,accords',
        id:'in.('+scope.join(',')+')'
      });
      const response=await fetch(SMS_SUPABASE_URL+'/rest/v1/fragrances?'+params.toString(),{headers});
      if(!response.ok) continue;
      for(const row of await response.json()) SMS_COMPACT_PROFILE_CACHE.set(row.id,compactProfileNotes(row));
    }catch{}
  }

  document.querySelectorAll('.web-compare-notes[data-fragrance-id]').forEach(host=>{
    const notes=SMS_COMPACT_PROFILE_CACHE.get(host.dataset.fragranceId)||[];
    host.replaceChildren();
    notes.forEach(note=>host.appendChild(textEl('span','web-note-chip',note)));
  });
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
  card.className='web-detail-card web-detail-notes-card';

  const imageUrl=safeBottleImageUrl(product?.imageUrl);
  if(imageUrl){
    const img=document.createElement('img');
    img.className='web-detail-bottle';
    img.src=imageUrl;
    img.alt=[product.brand,product.name,'bottle'].filter(Boolean).join(' ');
    img.loading='lazy';
    img.referrerPolicy='no-referrer';
    card.appendChild(img);
  }

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

function derivedDrydownFromProfiles(original,alternative){
  const originalBase=Array.isArray(original?.notes?.base)?original.notes.base.filter(Boolean):[];
  const alternativeBase=Array.isArray(alternative?.notes?.base)?alternative.notes.base.filter(Boolean):[];
  if(!originalBase.length || !alternativeBase.length) return '';

  const originalMap=new Map(originalBase.map(note=>[normalized(note),note]));
  const alternativeMap=new Map(alternativeBase.map(note=>[normalized(note),note]));
  const sharedKeys=[...originalMap.keys()].filter(key=>alternativeMap.has(key));
  const originalOnly=[...originalMap.entries()].filter(([key])=>!alternativeMap.has(key)).map(([,note])=>note);
  const alternativeOnly=[...alternativeMap.entries()].filter(([key])=>!originalMap.has(key)).map(([,note])=>note);

  if(sharedKeys.length){
    const shared=sharedKeys.slice(0,3).map(key=>originalMap.get(key)).join(', ');
    let copy=`Both settle around ${shared}, which keeps the base familiar.`;
    if(originalOnly.length) copy+=` The original keeps more ${originalOnly.slice(0,3).join(', ')}.`;
    if(alternativeOnly.length) copy+=` The alternative leans more into ${alternativeOnly.slice(0,3).join(', ')}.`;
    return copy;
  }

  return `The original settles into ${originalBase.slice(0,3).join(', ')}, while the alternative settles into ${alternativeBase.slice(0,3).join(', ')}.`;
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
      return nameTokens.every(t=>hay.includes(t)) && brandTokens.every(t=>hay.includes(t)) && deal.saleVariant==='Retail bottle' && safeHttpsUrl(deal.affiliateUrl);
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
    const byRetailer=new Map();
    for(const offer of offers){
      const key=normalized(offer.retailer||offer.advertiserId||'retailer');
      const existing=byRetailer.get(key);
      if(!existing || Number(offer.price)<Number(existing.price)) byRetailer.set(key,offer);
    }
    const liveRetailers=[...byRetailer.values()].map(x=>String(x.retailer||'partner'));
    host.appendChild(textEl('div','web-shop-status','I found a live retail-bottle match'+(liveRetailers.length?' at '+liveRetailers.join(' + '):'')+'. If one partner sells out, I keep the next available partner here and leave Amazon as the fallback.'));
    [...byRetailer.values()].slice(0,4).forEach(offer=>{
      const row=document.createElement('div');
      row.className='web-shop-offer';
      const a=document.createElement('a');
      a.href=safeHttpsUrl(offer.affiliateUrl);
      a.target='_blank';
      a.rel='sponsored nofollow noopener noreferrer';
      a.textContent='SHOP AT '+String(offer.retailer||'PARTNER').toUpperCase();
      row.appendChild(a);
      const price=Number(offer.price);
      row.appendChild(textEl('div','web-shop-price',Number.isFinite(price)&&price>0?'$'+price.toFixed(2):'View price'));
      host.appendChild(row);
    });
  }else{
    host.appendChild(textEl('div','web-shop-status','My priority partners do not have a clean live match for this exact retail bottle right now, so I’m falling back to Amazon instead of sending you to a dead listing.'));
  }

  const amazon=document.createElement('a');
  amazon.className='web-discover-btn web-amazon-link';
  amazon.href=amazonUrl(product);
  amazon.target='_blank';
  amazon.rel='sponsored nofollow noopener noreferrer';
  const amazonItemName=String(product.name||'THIS SCENT').trim();
  amazon.textContent='SHOP '+amazonItemName.toUpperCase()+' ON AMAZON';
  amazon.setAttribute('aria-label','Shop '+[product.brand,product.name].filter(Boolean).join(' ')+' on Amazon');
  host.appendChild(amazon);
}

function renderCompareCard(row,openDetail){
  const card=document.createElement('article');
  card.className='web-compare-card';

  const pair=document.createElement('div');
  pair.className='web-compare-pair';
  const originalProduct=productFromComparison(row,'original');
  const alternativeProduct=productFromComparison(row,'alternative');
  const originalKicker=SMS_FAMILIAR_DESIGNER_BRANDS.has(normalized(originalProduct.brand))?'DESIGNER SCENT':'THE SCENT YOU KNOW';
  pair.appendChild(bottleSide(originalProduct,originalKicker,()=>openDetail(row)));
  pair.appendChild(textEl('div','web-compare-vs','↔'));
  pair.appendChild(bottleSide(alternativeProduct,'ONE TO TRY',()=>openDetail(row)));
  card.appendChild(pair);

  const similarity=Number(row.estimated_similarity);
  if(Number.isFinite(similarity)) card.appendChild(textEl('div','web-compare-score','≈ '+Math.round(similarity)+'% SIMILAR'));

  const similarities=addisonComparisonCopy('same',row.similarities,row);
  const differences=addisonComparisonCopy('different',row.differences,row);
  if(similarities){
    const p=document.createElement('p');
    p.className='web-compare-copy';
    const b=document.createElement('strong'); b.textContent='Why I paired them: ';
    p.appendChild(b); p.appendChild(document.createTextNode(similarities));
    card.appendChild(p);
  }
  if(differences){
    const p=document.createElement('p');
    p.className='web-compare-copy';
    const b=document.createElement('strong'); b.textContent='Where they differ: ';
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
  detail.appendChild(textEl('p','web-detail-sub',(Number.isFinite(similarity)?'≈ '+Math.round(similarity)+'% similar. ':'')+'Here is why I paired them, where they differ, and how the opening and dry-down develop.'));

  const pair=document.createElement('div');
  pair.className='web-compare-pair web-detail-pair';
  pair.appendChild(bottleSide(original,'DESIGNER SCENT'));
  pair.appendChild(textEl('div','web-compare-vs','↔'));
  pair.appendChild(bottleSide(alternative,'ALTERNATIVE'));
  detail.appendChild(pair);

  const summary=document.createElement('div');
  summary.className='web-detail-grid';

  const same=document.createElement('div');
  same.className='web-detail-card';
  same.appendChild(textEl('h3','','Why I paired them'));
  same.appendChild(textEl('p','',addisonComparisonCopy('same',row.similarities,row)||'I paired these because the scent signature stays recognizably close, not because of a loose note overlap.'));
  summary.appendChild(same);

  const diff=document.createElement('div');
  diff.className='web-detail-card';
  diff.appendChild(textEl('h3','',"Where they differ"));
  diff.appendChild(textEl('p','',addisonComparisonCopy('different',row.differences,row)||'The biggest differences usually show up in the supporting notes, texture, and dry-down. That is where each bottle keeps its own personality.'));
  summary.appendChild(diff);

  detail.appendChild(summary);

  const [originalProfile,alternativeProfile]=await Promise.all([
    fetchProfile(original),fetchProfile(alternative)
  ]);

  const wear=await fetchPublicWearDetails(row.comparison_id);
  const opening=addisonWearCopy('opening',wear?.opening_comparison,row);
  const drydown=addisonWearCopy('drydown',wear?.drydown_comparison,row) || derivedDrydownFromProfiles(originalProfile||original,alternativeProfile||alternative);
  const performance=addisonWearCopy('performance',wear?.performance_comparison,row);
  if(opening||drydown||performance){
      const wearCard=document.createElement('div');
      wearCard.className='web-detail-card web-wear-card';
      wearCard.style.marginTop='16px';
      wearCard.appendChild(textEl('div','web-compare-kicker','HOW THE SCENTS DEVELOP'));
      wearCard.appendChild(textEl('h3','','From opening to dry-down'));
      if(opening){
        const p=document.createElement('p');
        const b=document.createElement('strong'); b.textContent='Opening: ';
        p.appendChild(b); p.appendChild(document.createTextNode(opening)); wearCard.appendChild(p);
      }
      if(drydown){
        const p=document.createElement('p');
        const b=document.createElement('strong'); b.textContent='Dry-down: ';
        p.appendChild(b); p.appendChild(document.createTextNode(drydown)); wearCard.appendChild(p);
      }
      if(performance){
        const p=document.createElement('p');
        const b=document.createElement('strong'); b.textContent='Performance: ';
        p.appendChild(b); p.appendChild(document.createTextNode(performance)); wearCard.appendChild(p);
      }
      wearCard.appendChild(textEl('p','web-wear-note','Dry-down is the direction I expect from the fragrance as it settles; exact wear can shift with skin chemistry, climate and application.'));
      detail.appendChild(wearCard);
  }

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
  addison.appendChild(textEl('p','',addisonComparisonCopy('verdict',row.verdict,row)||'Use the similarity as your shortcut, then let the note profile and drydown tell you which one fits your style.'));
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
    else pair.scrollIntoView({behavior:'smooth',block:'start'});
  });
}

function renderCompareCardFallback(row,openDetail){
  const card=document.createElement('article');
  card.className='web-compare-card';
  const original=productFromComparison(row,'original');
  const alternative=productFromComparison(row,'alternative');
  const similarity=Number(row.estimated_similarity);

  card.appendChild(textEl('div','web-compare-kicker','SCENT MATCH'));
  card.appendChild(textEl('h3','web-detail-title',
    [original.brand,original.name,'↔',alternative.brand,alternative.name].filter(Boolean).join(' ')
  ));
  if(Number.isFinite(similarity)){
    card.appendChild(textEl('div','web-compare-score','≈ '+Math.round(similarity)+'% SIMILAR'));
  }
  const actions=document.createElement('div');
  actions.className='web-compare-actions';
  const view=buttonEl('SEE MATCH DETAILS');
  view.addEventListener('click',()=>openDetail(row));
  actions.appendChild(view);
  card.appendChild(actions);
  return card;
}

async function loadFullWebsiteDiscover(){
  const input=document.getElementById('website-discover-search');
  const grid=document.getElementById('website-discover-grid');
  const status=document.getElementById('website-discover-status');
  const more=document.getElementById('website-discover-more');
  const example=document.getElementById('website-discover-example');
  if(!input||!grid||!status||!more) return;

  const state={rows:[],visible:8,request:0,controller:null};
  window.__smsDiscoverState=state;

  const paint=()=>{
    grid.replaceChildren();
    let rendered=0;
    for(const row of state.rows.slice(0,state.visible)){
      try{
        grid.appendChild(renderCompareCard(row,renderDetail));
        rendered+=1;
      }catch(error){
        console.warn('Style My Scent card render fallback',error);
        try{
          grid.appendChild(renderCompareCardFallback(row,renderDetail));
          rendered+=1;
        }catch{}
      }
    }
    hydrateCompactNotes(state.rows.slice(0,state.visible));
    status.textContent=rendered
      ? 'I found '+state.rows.length+' match'+(state.rows.length===1?'':'es')+' for you'
      : (input.value.trim()?'I’m not seeing a match I’d feel good showing you yet. Try another spelling, bottle, or brand.':'I don’t have a match I want to put in front of you right now.');
    more.hidden=state.visible>=state.rows.length;
  };

  const refresh=async()=>{
    const request=++state.request;
    const q=input.value.trim();
    if(state.controller) state.controller.abort();
    const controller=new AbortController();
    state.controller=controller;
    more.hidden=true;
    status.textContent='Addison is pulling your closest matches…';

    const applyRows=(rows)=>{
      if(request!==state.request) return false;
      state.rows=rows;
      state.visible=8;
      paint();
      return true;
    };

    try{
      const rows=await fetchComparisons(q,controller.signal);
      applyRows(rows);
    }catch(error){
      if(error?.name==='AbortError' || request!==state.request) return;
      console.warn('Style My Scent discover retry',error);
      try{
        await new Promise(resolve=>setTimeout(resolve,180));
        if(controller.signal.aborted || request!==state.request) return;
        const rows=await fetchComparisons(q,controller.signal);
        applyRows(rows);
      }catch(retryError){
        if(retryError?.name==='AbortError' || request!==state.request) return;
        console.error('Style My Scent discover failed',retryError);
        state.rows=[];
        paint();
        status.textContent='I couldn’t load matches just now. Please try the search again.';
      }
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

  if(example){
    example.addEventListener('click',async()=>{
      input.value='9PM';
      await refresh();
      grid.scrollIntoView({behavior:'smooth',block:'start'});
    });
  }

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
        amazon.rel='sponsored nofollow noopener noreferrer';
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
