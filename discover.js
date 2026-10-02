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
  const boilerplate=/(keeping the overall scent direction closely related|extremely close on paper|same recognizable scent direction|distinct balance, texture, and wear|overall scent identity stays very familiar)/i;
  const suspect=/(https?|item https|invigorate the senses|pepper invigorate|\bof vanilla\b|\bparfum\b\s*$)/i;
  if(boilerplate.test(copy)||suspect.test(copy)) copy='';
  const alt=String(row.alternative_name||'the alternative').trim();
  const original=String(row.original_name||'the designer').trim();
  const shared=cleanCustomerNotes(Array.isArray(row.shared_notes)?row.shared_notes:[]);
  const similarity=Number(row.estimated_similarity);
  const technical=/(owner[- ]?(approved|verified|research)|human research|workbook|csv|database|machine|evidence|source[- ]reported|source provides|catalog currently|still gathering|resolution file|supplied snapshot|pipeline|publication)/i;

  if(kind==='same'){
    if(copy && !technical.test(copy)) return copy;
    if(shared.length){
      return `They both list ${humanList(shared.slice(0,5))}. Those shared notes give you a useful starting point for comparing the bottles alongside their differences below.`;
    }
    if(technical.test(copy)||!copy){
      if(shared.length){
        return `They both list ${humanList(shared.slice(0,5))}. That shared material is a useful starting point, but I still want you to compare the development below.`;
      }
      return `The match is verified, but the published note-level overlap is limited here. Open the full breakdown before treating ${alt} as a close substitute for ${original}.`;
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
      return `Compare the two note profiles below for their listed differences. A difference in smoothness, intensity or wear cannot be established from the note lists alone.`;
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
      return `Use the similarity score as a reference point, then judge ${original} and ${alt} by the opening, heart, and dry-down below. The percentage is not the reason for the match.`;
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
    const response=await fetch(SMS_SUPABASE_URL+'/rest/v1/catalog_public_comparison_wear_v3?'+params.toString(),{
      headers:{apikey:SMS_SUPABASE_KEY,Authorization:'Bearer '+SMS_SUPABASE_KEY}
    });
    if(!response.ok) return null;
    return (await response.json())[0]||null;
  }catch{return null}
}

function addisonWearCopy(kind,value,row={}){
  let t=String(value||'').replace(/\s+/g,' ').trim();
  if(!t || /^No separate .* was reported\.?$/i.test(t)) return '';
  const technical=/(owner[- ]?(approved|verified|research)|human research|workbook|csv|database|machine|evidence|source[- ]reported|pipeline|publication|percentage was reported|detail is limited|broader profile|remain less certain)/i;
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
      fetch(SMS_SUPABASE_URL+'/rest/v1/catalog_public_fragrances_v1?'+new URLSearchParams({
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

async function fetchComparisons(query='',signal,{offset:sourceOffset=0,pageLimit=null}={}){
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
  baseParams.set('estimated_similarity','gte.60');

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

  // Paint the first useful Discover cards quickly instead of scanning hundreds
  // of rows before the page can render. Search can look deeper because the user
  // is actively asking for a specific bottle or brand.
  const targetRows=pageLimit||(q?120:40);
  const pageSize=Math.min(targetRows,q?60:40);
  const rows=[];
  let nextOffset=sourceOffset,hasMore=false;
  const finish=result=>Object.assign(result,{nextOffset,hasMore});
  for(let offset=sourceOffset;offset<sourceOffset+targetRows;offset+=pageSize){
    const params=new URLSearchParams(baseParams);
    params.set('limit',String(pageSize));
    params.set('offset',String(offset));
    const response=await fetch(SMS_SUPABASE_URL+'/rest/v1/catalog_public_comparison_cards_v1?'+params.toString(),{
      headers:{apikey:SMS_SUPABASE_KEY,Authorization:'Bearer '+SMS_SUPABASE_KEY},signal
    });
    if(!response.ok) throw new Error('Discover unavailable');
    const page=await response.json();
    rows.push(...page);
    nextOffset=offset+page.length;
    hasMore=page.length===pageSize;
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
    return finish(limitTwoPerDesignerBottle([...bestByBottle.values()].sort((a,b)=>Number(b.estimated_similarity)-Number(a.estimated_similarity))));
  }

  if(queryWords.length){
    return finish(limitTwoPerDesignerBottle([...searchReady].sort((a,b)=>
      Number(b.estimated_similarity||0)-Number(a.estimated_similarity||0) ||
      String(b.verified_at||'').localeCompare(String(a.verified_at||''))
    )));
  }

  return finish(limitTwoPerDesignerBottle(rankHomepageComparisons(websiteReady)));
}

const SMS_COMPACT_PROFILE_CACHE=new Map();

function cleanCustomerNotes(values=[]){
  const junk=/\b(adding|refinement|refreshing start|invigorating opening|invigorating aroma|ideal|suitable|everyday wear|special events?|special occasions|professional settings|confidence|elegance|sophistication|lasting|memorable|signature|character|balanced|modernity|energy|identity|family|complexity|grounding|quietly powerful|unexpected|finally|intriguing|refreshing|juicy energy|spicy warmth|tactile sensuality|profound grounding|citrus sparkle|invigorate|senses|https?|www|\.com|top notes?|heart notes?|middle notes?|base notes?)\b/i;
  const broken=/^(?:nce|min|fume|lla|pea|affron|range blossom|app|anilla)$/i;
  const seen=new Set();
  return (Array.isArray(values)?values:[]).flatMap(raw=>{
    const cleaned=String(raw||'').replace(/^[•.\-–—:;\s]+/,'').replace(/\s+/g,' ').trim();
    if(!cleaned) return [];
    return cleaned
      .split(/\.\s*(?=(?:top|heart|middle|base)(?:\s+notes?)?\s*:)/i)
      .flatMap(part=>part.split(/(?:^|\s)(?:top|heart|middle|base)(?:\s+notes?)?\s*:\s*/i))
      .map(part=>part.replace(/^(?:and|the)\s+/i,'').replace(/[.;,:\s]+$/,'').trim())
      .filter(Boolean);
  }).filter(value=>{
    if(value.length<2||value.length>48||junk.test(value)||broken.test(value)||/^(?:while|with|of|a|an)\b/i.test(value)) return false;
    if(value.split(/\s+/).length>5) return false;
    const key=normalized(value);
    if(!key||seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function bestCustomerNotes(...lists){
  return lists.map(cleanCustomerNotes).sort((a,b)=>b.length-a.length)[0]||[];
}

function compactProfileNotes(row={}){
  const staged=[
    ...cleanCustomerNotes(row.top_notes),
    ...cleanCustomerNotes(row.middle_notes),
    ...cleanCustomerNotes(row.base_notes)
  ];
  const general=cleanCustomerNotes(row.fragrance_notes);
  const accords=cleanCustomerNotes(row.accords);
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
      const response=await fetch(SMS_SUPABASE_URL+'/rest/v1/catalog_public_fragrances_v1?'+params.toString(),{headers});
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
    select:'id,canonical_name,brand,concentration,product_type,top_notes,middle_notes,base_notes,fragrance_notes,accords,bottle_image_url,hosted_image_url,display_image_url',
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
    fetch(SMS_SUPABASE_URL+'/rest/v1/catalog_public_fragrances_v1?'+coreParams.toString(),{headers}),
    fetch(SMS_SUPABASE_URL+'/rest/v1/catalog_addison_scent_profile?'+addisonParams.toString(),{headers}),
    fetch(SMS_SUPABASE_URL+'/rest/v1/catalog_discover_scent_profiles?'+discoverParams.toString(),{headers})
  ]);
  if(!coreRes.ok) return null;
  const row=(await coreRes.json())[0];
  if(!row) return null;
  const addison=addisonRes.ok?(await addisonRes.json())[0]:null;
  const discover=discoverRes.ok?(await discoverRes.json())[0]:null;
  const dnotes=discover?.notes||{};
  const pick=(...lists)=>bestCustomerNotes(...lists);
  return {
    ...product,
    brand:row.brand||product.brand,
    name:row.canonical_name||product.name,
    concentration:row.concentration||row.product_type||product.concentration,
    imageUrl:row.display_image_url||row.hosted_image_url||row.bottle_image_url||product.imageUrl,
    notes:{
      top:pick(dnotes.top,row.top_notes,addison?.top_notes),
      heart:pick(dnotes.heart,row.middle_notes,addison?.middle_notes),
      base:pick(dnotes.base,row.base_notes,addison?.base_notes),
      general:pick(dnotes.general,row.fragrance_notes,addison?.general_notes),
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
    img.addEventListener('error',()=>{
      img.replaceWith(textEl('div','fallback',(product.brand||'SMS').slice(0,3).toUpperCase()));
    },{once:true});
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

function sideBySideChart(original,alternative){
  const rows=[
    ['Opening','top'],
    ['Heart','heart'],
    ['Dry-down','base'],
    ['Accords','accords'],
  ].map(([label,key])=>{
    const left=Array.isArray(original?.notes?.[key])?original.notes[key].filter(Boolean).slice(0,5):[];
    const right=Array.isArray(alternative?.notes?.[key])?alternative.notes[key].filter(Boolean).slice(0,5):[];
    return {label,left,right};
  }).filter(row=>row.left.length||row.right.length);
  if(!rows.length) return null;

  const card=document.createElement('div');
  card.className='web-detail-card';
  card.style.marginTop='16px';
  card.appendChild(textEl('div','web-compare-kicker','SIDE-BY-SIDE'));
  card.appendChild(textEl('h3','','Original vs alternative'));

  const grid=document.createElement('div');
  grid.style.marginTop='12px';
  grid.style.border='1px solid rgba(241,212,154,.16)';
  grid.style.borderRadius='16px';
  grid.style.overflow='hidden';

  const makeRow=(stage,left,right,header=false)=>{
    const row=document.createElement('div');
    row.style.display='grid';
    row.style.gridTemplateColumns='78px minmax(0,1fr) minmax(0,1fr)';
    row.style.borderTop=header?'0':'1px solid rgba(241,212,154,.13)';
    row.style.alignItems='stretch';

    const stageCell=textEl('div','',stage);
    stageCell.style.padding='10px 8px';
    stageCell.style.fontSize='10px';
    stageCell.style.fontWeight='800';
    stageCell.style.color='var(--gold2)';
    stageCell.style.background='rgba(241,212,154,.035)';
    row.appendChild(stageCell);

    [left,right].forEach(value=>{
      const cell=textEl('div','',value);
      cell.style.padding='10px 9px';
      cell.style.fontSize=header?'11px':'12px';
      cell.style.lineHeight='1.45';
      cell.style.fontWeight=header?'800':'500';
      cell.style.color=header?'var(--cream)':'#e4d6c5';
      cell.style.textAlign='center';
      cell.style.overflowWrap='anywhere';
      row.appendChild(cell);
    });
    return row;
  };

  grid.appendChild(makeRow('',original?.name||'Original',alternative?.name||'Alternative',true));
  rows.forEach(row=>grid.appendChild(makeRow(
    row.label,
    row.left.length?row.left.join(' · '):'—',
    row.right.length?row.right.join(' · '):'—'
  )));
  card.appendChild(grid);
  card.appendChild(textEl('p','web-wear-note','A quick structural view of where the two scents line up and where they separate.'));
  return card;
}


const WEB_COMPARISON_FAMILIES={
  citrus:['bergamot','lemon','lime','mandarin','orange','grapefruit','citron','neroli'],
  floral:['rose','jasmine','violet','gardenia','tuberose','orange blossom','hedione','peony','orchid'],
  woody:['cedar','cedarwood','sandalwood','vetiver','patchouli','guaiac','oak','cashmere wood','cashmeran'],
  musk:['musk','musky','ambrette'],
  amberwood:['ambroxan','ambrox','ambergris','amberwood','amber woods'],
  spice:['ginger','cardamom','pepper','pink pepper','cinnamon','nutmeg','clove','saffron'],
  gourmand:['vanilla','tonka','caramel','praline','sugar','honey','marshmallow','chocolate','cocoa'],
  oud:['oud','agarwood'],
  aromatic:['lavender','lavandin','sage','rosemary','basil'],
};
function webNoteFamily(value=''){
  const key=normalized(value);
  for(const [family,terms] of Object.entries(WEB_COMPARISON_FAMILIES)){
    if(terms.some(term=>key===term||key.includes(term)||term.includes(key)))return family;
  }
  return '';
}
function webSameNote(a='',b=''){
  const x=normalized(a),y=normalized(b);
  return Boolean(x&&y&&(x===y||(Math.min(x.length,y.length)>=4&&(x.includes(y)||y.includes(x)))));
}
function profileStageFact(original,alternative,key,label){
  const left=Array.isArray(original?.notes?.[key])?original.notes[key].filter(Boolean):[];
  const right=Array.isArray(alternative?.notes?.[key])?alternative.notes[key].filter(Boolean):[];
  if(!left.length&&!right.length)return null;
  const shared=[];
  for(const l of left){
    const r=right.find(value=>webSameNote(l,value));
    if(r)shared.push({left:l,right:r});
    if(shared.length>=2)break;
  }
  if(shared.length){
    const pair=shared.map(x=>x.left===x.right?x.left:(x.left+' / '+x.right)).join(' and ');
    return {label,connected:true,text:label+': both keep '+pair+' in play, giving this stage a concrete structural bridge.'};
  }
  for(const l of left){
    const family=webNoteFamily(l);
    if(!family)continue;
    const r=right.find(value=>webNoteFamily(value)===family);
    if(r)return {label,connected:true,text:label+': '+original.name+' uses '+l+', while '+alternative.name+' uses '+r+'. They stay in the same '+family+' family without being identical.'};
  }
  if(left.length&&right.length){
    return {label,connected:false,text:label+': '+original.name+' leans on '+left.slice(0,2).join(' and ')+', while '+alternative.name+' uses '+right.slice(0,2).join(' and ')+'. This is where the profiles separate.'};
  }
  return null;
}
function profileComparisonEducation(original,alternative,row,wear=null){
  const facts=[
    profileStageFact(original,alternative,'top','Opening'),
    profileStageFact(original,alternative,'heart','Heart'),
    profileStageFact(original,alternative,'base','Dry-down'),
  ].filter(Boolean);
  const connections=facts.filter(x=>x.connected);
  const shared=Array.isArray(row.shared_notes)?cleanCustomerNotes(row.shared_notes):[];
  const snapshot=connections.length
    ? connections[0].text.replace(/^[^:]+:\s*/,'')+' That is the structural reason I would keep this match in the conversation.'
    : shared.length
      ? 'The verified comparison lists '+humanList(shared.slice(0,4))+' as shared material. That is useful common ground, but it does not make the entire wear identical.'
      : 'This match is verified, but the published scent profiles do not give me enough note-level overlap to explain it as a close note-for-note substitute.';

  const breakdown=facts.map(x=>x.text);
  const base=facts.find(x=>x.label==='Dry-down');
  const opening=facts.find(x=>x.label==='Opening');
  let action=base
    ? 'Make the dry-down your deciding test. '+base.text.replace(/^Dry-down:\s*/,'')+' That finish is where I would decide whether the alternative really scratches the same itch.'
    : opening
      ? 'Compare the first 20–30 minutes, then wait for the base. '+opening.text.replace(/^Opening:\s*/,'')+' Do not buy on the opening or percentage alone.'
      : 'Use the percentage as a reference only and wear the two bottles side by side before treating them as interchangeable.';
  const performance=addisonWearCopy('performance',wear?.performance_comparison,row);
  if(performance)action+=' '+performance;
  return {snapshot,breakdown,action};
}

function derivedOpeningFromProfiles(original,alternative){
  const left=Array.isArray(original?.notes?.top)?original.notes.top.filter(Boolean):[];
  const right=Array.isArray(alternative?.notes?.top)?alternative.notes.top.filter(Boolean):[];
  if(!left.length || !right.length) return '';
  return `${original.name||'The original'} lists ${left.slice(0,4).join(', ')} in its opening; ${alternative.name||'the alternative'} lists ${right.slice(0,4).join(', ')}. These are the published opening notes; their balance on skin can differ.`;
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
    let copy=`Both list ${shared} in their base notes.`;
    if(originalOnly.length) copy+=` The original also lists ${originalOnly.slice(0,3).join(', ')}.`;
    if(alternativeOnly.length) copy+=` The alternative also lists ${alternativeOnly.slice(0,3).join(', ')}.`;
    copy+=' Shared base notes support the comparison, but do not establish identical dry-down or performance.';
    return copy;
  }

  return `The original lists ${originalBase.slice(0,3).join(', ')} in its base, while the alternative lists ${alternativeBase.slice(0,3).join(', ')}. Their published base notes differ; a wear comparison is needed to establish how close the dry-down feels.`;
}

async function fetchAffiliateOffers(product){
  const q=[product.brand,product.name,product.concentration].filter(Boolean).join(' ').trim();
  if(!q) return [];
  try{
    const directRequest=product.id?fetch(SMS_SUPABASE_URL+'/rest/v1/retailer_offers?select=retailer_name,product_title,concentration,size_ml,price,currency,affiliate_url,product_url,last_checked_at&fragrance_id=eq.'+encodeURIComponent(product.id)+'&verified=eq.true&in_stock=eq.true&order=price.asc&limit=50',{headers:{apikey:SMS_SUPABASE_KEY,Authorization:'Bearer '+SMS_SUPABASE_KEY}}).then(async r=>r.ok?await r.json():[]).catch(()=>[]):Promise.resolve([]);
    const response=await fetch(SMS_CJ_URL+'?q='+encodeURIComponent(q)+'&channel=website',{
      headers:{apikey:SMS_SUPABASE_KEY,Accept:'application/json'}
    }).catch(()=>({ok:false}));
    const data=response.ok?await response.json():{};
    const direct=await directRequest;
    const nameTokens=normalized(product.name).split(' ').filter(x=>x.length>2);
    const brandTokens=normalized(product.brand).split(' ').filter(x=>x.length>2);
    const concentrationKey=value=>{
      const s=String(value||'').toLowerCase();
      if(/eau\s*de\s*toilette|\bedt\b/.test(s)) return 'edt';
      if(/extrait/.test(s)) return 'extrait';
      if(/eau\s*de\s*parfum|\bedp\b/.test(s)) return 'edp';
      if(/\bparfum\b/.test(s)) return 'parfum';
      if(/eau\s*de\s*cologne|\bedc\b/.test(s)) return 'edc';
      return '';
    };
    const wanted=concentrationKey(product.concentration);
    const freshCutoff=Date.now()-(10*60*1000);
    const exact=direct.filter(offer=>{
      const checked=Date.parse(offer.last_checked_at||'');
      const fresh=Number.isFinite(checked)&&checked>=freshCutoff;
      return fresh && (!wanted||concentrationKey(offer.concentration||offer.product_title)===wanted);
    }).map(offer=>({title:offer.product_title,retailer:offer.retailer_name,price:Number(offer.price),currency:offer.currency,sizeMl:Number(offer.size_ml)||null,saleVariant:/tester/i.test(offer.product_title||'')?'Tester':'Retail bottle',affiliateUrl:offer.affiliate_url||offer.product_url}));
    const cj=(data.deals||[]).filter(deal=>{
      const hay=normalized((deal.title||'')+' '+(deal.description||''));
      return nameTokens.every(t=>hay.includes(t)) && brandTokens.every(t=>hay.includes(t)) && (!wanted||concentrationKey((deal.title||'')+' '+(deal.description||''))===wanted) && ['Retail bottle','Tester'].includes(deal.saleVariant) && safeHttpsUrl(deal.affiliateUrl);
    });
    return [...new Map([...exact,...cj].filter(o=>Number(o.price)>0 && safeHttpsUrl(o.affiliateUrl)).map(o=>[o.affiliateUrl,o])).values()].sort((a,b)=>Number(a.price)-Number(b.price));
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
      const key=[normalized(offer.retailer||offer.advertiserId||'retailer'),offer.sizeMl||offer.size||'size unlisted',offer.saleVariant||'Retail bottle'].join('|');
      const existing=byRetailer.get(key);
      if(!existing || Number(offer.price)<Number(existing.price)) byRetailer.set(key,offer);
    }
    const liveRetailers=[...new Set([...byRetailer.values()].map(x=>String(x.retailer||'partner')))];
    host.appendChild(textEl('div','web-shop-status','Available offers for this bottle at '+liveRetailers.join(' + ')+'. Compare the size and tester label before comparing prices.'));
    [...byRetailer.values()].forEach(offer=>{
      const row=document.createElement('div');
      row.className='web-shop-offer';
      const a=document.createElement('a');
      a.href=safeHttpsUrl(offer.affiliateUrl);
      a.target='_blank';
      a.rel='sponsored nofollow noopener noreferrer';
      a.textContent='SHOP AT '+String(offer.retailer||'PARTNER').toUpperCase();
      row.appendChild(a);
      row.appendChild(textEl('div','',[offer.sizeMl?offer.sizeMl+' mL':(offer.size||'Size not listed'),offer.saleVariant||'Retail bottle'].join(' • ')));
      const price=Number(offer.price);
      row.appendChild(textEl('div','web-shop-price',Number.isFinite(price)&&price>0?(offer.currency||'USD')+' '+price.toFixed(2):'View price'));
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
    if(more && state) more.hidden=state.visible>=state.rows.length && !state.hasMore;
    document.getElementById('discover')?.scrollIntoView({behavior:'smooth',block:'start'});
  });
  detail.appendChild(back);

  const original=productFromComparison(row,'original');
  const alternative=productFromComparison(row,'alternative');
  const similarity=Number(row.estimated_similarity);

  const relationship=String(row.relationship||'').toLowerCase();
  detail.appendChild(textEl('div','web-compare-kicker',/inspired|dupe/.test(relationship)?'INSPIRED BY / DUPE':(relationship||'SIMILAR SCENT').replace(/_/g,' ').toUpperCase()));

  const pair=document.createElement('div');
  pair.className='web-compare-pair web-detail-pair';
  pair.appendChild(bottleSide(original,'DESIGNER SCENT'));
  pair.appendChild(textEl('div','web-compare-vs','↔'));
  pair.appendChild(bottleSide(alternative,'ALTERNATIVE'));
  detail.appendChild(pair);

  if(Number.isFinite(similarity)){
    detail.appendChild(textEl('div','web-compare-score','≈ '+Math.round(similarity)+'% SIMILAR'));
  }

  const [originalProfile,alternativeProfile,wear]=await Promise.all([
    fetchProfile(original),fetchProfile(alternative),fetchPublicWearDetails(row.comparison_id)
  ]);
  // Every comparison follows the same sequence, including search and examples.
  const chart=sideBySideChart(originalProfile||original,alternativeProfile||alternative);
  if(chart) detail.appendChild(chart);

  const education=profileComparisonEducation(originalProfile||original,alternativeProfile||alternative,row,wear);
  const summary=document.createElement('div');
  summary.className='web-detail-card web-comparison-details';
  summary.style.marginTop='16px';

  summary.appendChild(textEl('h3','','SNAPSHOT'));
  summary.appendChild(textEl('p','',education.snapshot));

  const breakdownTitle=textEl('h3','','BREAKDOWN');
  breakdownTitle.style.marginTop='22px';
  summary.appendChild(breakdownTitle);
  if(education.breakdown.length){
    education.breakdown.forEach(line=>summary.appendChild(textEl('p','',line)));
  }else{
    summary.appendChild(textEl('p','','Opening, heart, and dry-down detail is limited for this comparison, so I’m not filling the gap with generic copy.'));
  }

  const actionTitle=textEl('h3','','ACTION');
  actionTitle.style.marginTop='22px';
  summary.appendChild(actionTitle);
  summary.appendChild(textEl('p','',education.action));
  detail.appendChild(summary);

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
  const retry=document.getElementById('website-discover-retry');
  if(!input||!grid||!status||!more) return;

  const state={rows:[],visible:8,request:0,controller:null,nextOffset:0,hasMore:false,loadingMore:false};
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
      ? 'Showing '+Math.min(state.visible,state.rows.length)+' of '+state.rows.length+' loaded matches'+(state.hasMore?' • more available':'')
      : (input.value.trim()?'I’m not seeing a match I’d feel good showing you yet. Try another spelling, bottle, or brand.':'I don’t have a match I want to put in front of you right now.');
    more.hidden=state.visible>=state.rows.length && !state.hasMore;
  };

  const refresh=async()=>{
    const request=++state.request;
    const q=input.value.trim();
    if(state.controller) state.controller.abort();
    const controller=new AbortController();
    state.controller=controller;
    more.hidden=true;
    if(retry) retry.hidden=true;
    grid.setAttribute('aria-busy','true');
    status.textContent='Addison is pulling your closest matches…';
    let timedOut=false;
    const deadline=setTimeout(()=>{
      timedOut=true;
      controller.abort();
    },12000);

    const applyRows=(rows)=>{
      if(request!==state.request) return false;
      state.rows=rows;
      state.visible=8;
      state.nextOffset=rows.nextOffset||0;
      state.hasMore=Boolean(rows.hasMore);
      paint();
      return true;
    };
    const showFailure=()=>{
      if(request!==state.request) return;
      state.rows=[];
      state.nextOffset=0;
      state.hasMore=false;
      paint();
      status.textContent=timedOut
        ? 'Matches are taking longer than expected. Please try again.'
        : 'I couldn’t load matches just now. Please try again.';
      if(retry) retry.hidden=false;
    };

    try{
      const rows=await fetchComparisons(q,controller.signal);
      applyRows(rows);
    }catch(error){
      if(request!==state.request) return;
      if(controller.signal.aborted){
        if(timedOut) showFailure();
        return;
      }
      console.warn('Style My Scent discover retry',error);
      try{
        await new Promise(resolve=>setTimeout(resolve,180));
        if(controller.signal.aborted || request!==state.request){
          if(timedOut) showFailure();
          return;
        }
        const rows=await fetchComparisons(q,controller.signal);
        applyRows(rows);
      }catch(retryError){
        if(request!==state.request) return;
        if(!controller.signal.aborted || timedOut){
          console.error('Style My Scent discover failed',retryError);
          showFailure();
        }
      }
    }finally{
      clearTimeout(deadline);
      if(request===state.request) grid.removeAttribute('aria-busy');
    }
  };
  if(retry) retry.addEventListener('click',refresh);

  let timer=null;
  input.addEventListener('input',()=>{
    clearTimeout(timer);
    timer=setTimeout(refresh,260);
  });
  more.addEventListener('click',async()=>{
    if(state.loadingMore) return;
    const request=state.request;
    state.loadingMore=true; more.disabled=true;
    try{
      if(state.visible>=state.rows.length && state.hasMore){
        const next=await fetchComparisons(input.value.trim(),state.controller?.signal,{offset:state.nextOffset,pageLimit:40});
        if(request!==state.request) return;
        state.nextOffset=next.nextOffset; state.hasMore=next.hasMore;
        state.rows=limitTwoPerDesignerBottle([...new Map([...state.rows,...next].map(row=>[row.comparison_id,row])).values()]);
      }
      state.visible+=8;
      paint();
    }catch(error){if(error?.name!=='AbortError') status.textContent='I couldn’t load the next matches. Try Show me more again.';}
    finally{state.loadingMore=false;more.disabled=false;}
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

async function openDealDetail(row){
  const grid=document.getElementById('live-deal-grid');
  let detail=document.getElementById('website-deal-detail');
  if(!detail){detail=document.createElement('div');detail.id='website-deal-detail';detail.className='web-discover-detail';grid.after(detail);}
  const request=String(row.fragrance_id);
  detail.dataset.fragranceId=request;
  detail.hidden=false;detail.replaceChildren();
  const back=buttonEl('‹ BACK TO DEALS','web-detail-back');
  back.addEventListener('click',()=>{detail.hidden=true;grid.hidden=false;grid.scrollIntoView({behavior:'smooth',block:'start'});});
  detail.appendChild(back);
  grid.hidden=true;
  const product={id:row.fragrance_id,brand:row.brand,name:row.canonical_name,concentration:row.concentration,imageUrl:row.image_url};
  detail.appendChild(textEl('h2','',[product.brand,product.name].filter(Boolean).join(' ')));
  const loading=textEl('p','web-shop-status','Loading this bottle’s notes, matches and retailer offers…');detail.appendChild(loading);
  detail.scrollIntoView({behavior:'smooth',block:'start'});
  try{
    const [profile,comparisons]=await Promise.all([fetchProfile(product),fetchComparisons(product.name).catch(()=>[])]);
    if(detail.dataset.fragranceId!==request) return;
    loading.remove();
    detail.appendChild(notesCard(profile||product,'BOTTLE NOTES'));
    const shops=document.createElement('div');shops.className='web-detail-card';
    shops.appendChild(textEl('h3','','Compare retailer offers'));
    const shopHost=document.createElement('div');shops.appendChild(shopHost);detail.appendChild(shops);
    renderShop(profile||product,shopHost);
    const matches=comparisons.filter(c=>c.fragrance_id===product.id||c.compared_fragrance_id===product.id);
    detail.appendChild(textEl('h3','','Available fragrance comparisons'));
    if(!matches.length) detail.appendChild(textEl('p','','No published comparison is available for this exact bottle yet.'));
    for(const match of matches){
      const other=productFromComparison(match,match.fragrance_id===product.id?'original':'alternative');
      const button=buttonEl([other.brand,other.name].filter(Boolean).join(' ')+' — ≈ '+Math.round(Number(match.estimated_similarity))+'% • VIEW COMPARISON');
      button.style.marginBottom='12px';
      button.addEventListener('click',()=>renderDetail(match));
      detail.appendChild(button);
    }
  }catch{loading.textContent='I couldn’t load this bottle’s details. Close this view and try again.';}
}

const SMS_DEALS_STATE={visible:8,request:0};
function websiteOfferListingDetails(affiliateUrl){
  try{
    const affiliate=new URL(affiliateUrl);
    const destination=new URL(affiliate.searchParams.get('url') || affiliate.href);
    const variant=destination.searchParams.get('attribute_pa_size') || '';
    const match=variant.match(/(?:^|[-\s])(\d+(?:[.-]\d+)?)\s*[- ]?(oz|ml)(?:$|[-\s])/i);
    const size=match ? match[1].replace('-', '.')+' '+match[2].toLowerCase() : '';
    const tester=/(?:^|[-\s/])tester(?:$|[-\s/])/i.test(variant+' '+destination.pathname);
    return {size,tester};
  }catch{return {size:'',tester:false}}
}

async function loadStyleMyScentDiscovery({more=false}={}){
  const host=document.getElementById('live-deal-grid');
  const status=document.getElementById('live-deal-status');
  if(!host) return;
  SMS_DEALS_STATE.visible=more?SMS_DEALS_STATE.visible+8:8;
  const request=++SMS_DEALS_STATE.request;
  const limit=SMS_DEALS_STATE.visible+16;
  let search=document.getElementById('website-deals-search');
  if(!search){
    search=document.createElement('input');search.id='website-deals-search';search.type='search';search.className='web-discover-search';search.placeholder='Find a deal by bottle or brand';search.setAttribute('aria-label','Search fragrance deals');host.before(search);
    let timer;search.addEventListener('input',()=>{clearTimeout(timer);timer=setTimeout(()=>loadStyleMyScentDiscovery(),260);});
  }
  const query=String(search.value||'').trim().replace(/[*,()%]/g,' ');
  try{
    const select='fragrance_id,brand,canonical_name,concentration,image_url,retailer_name,price,affiliate_url,is_new,reason';
    const tokens=normalized(query).split(' ').filter(Boolean);
    const term=[...tokens].sort((a,b)=>b.length-a.length)[0];
    const filter=term?'&or='+encodeURIComponent('(brand.ilike.*'+term+'*,canonical_name.ilike.*'+term+'*)'):'';
    const endpoint=SMS_SUPABASE_URL+'/rest/v1/catalog_discovery_feed?select='+select+'&order=discovery_score.desc,brand.asc,canonical_name.asc,fragrance_id&limit='+limit+filter;
    let response=null;
    for(let attempt=0;attempt<2;attempt++){
      const controller=new AbortController();
      const timer=setTimeout(()=>controller.abort(),4200);
      try{
        response=await fetch(endpoint,{
          headers:{apikey:SMS_SUPABASE_KEY,Authorization:'Bearer '+SMS_SUPABASE_KEY},
          signal:controller.signal,
        });
        clearTimeout(timer);
        if(response.ok) break;
      }catch(error){
        clearTimeout(timer);
        if(attempt===1) throw error;
      }
      await new Promise(resolve=>setTimeout(resolve,180));
    }
    if(!response?.ok) throw new Error('Discovery unavailable');
    const allRows=await response.json();
    if(request!==SMS_DEALS_STATE.request) return;
    const rows=[];
    const designerBrands=new Set(['dior','calvin klein','coach','giorgio armani','issey miyake','mugler','rabanne','paco rabanne','versace','azzaro','dolce & gabbana','gucci','givenchy','burberry','chanel','tom ford','prada','yves saint laurent','valentino','jean paul gaultier','marc jacobs','hugo boss','jimmy choo','bvlgari','boucheron','ralph lauren','hermes','hermès']);
    const eligibleRows=allRows.filter(row=>Number.isFinite(Number(row.price)) && Number(row.price)>0 && safeHttpsUrl(row.affiliate_url) && tokens.every(token=>normalized(row.brand+' '+row.canonical_name).includes(token)));
    // Reserve half the showcase for designers before discovery scores fill it.
    for(const row of eligibleRows.filter(row=>designerBrands.has(String(row.brand||'').trim().toLowerCase())).slice(0,4)) rows.push(row);
    const seenRetailers=new Set();
    for(const row of eligibleRows){
      if(rows.length>=8) break;
      const retailer=String(row.retailer_name || '').toLowerCase();
      if(retailer && !seenRetailers.has(retailer) && !rows.includes(row)){
        rows.push(row);
        seenRetailers.add(retailer);
      }
    }
    for(const row of eligibleRows){
      if(!rows.includes(row)) rows.push(row);
    }
    host.replaceChildren();

    rows.slice(0,SMS_DEALS_STATE.visible).forEach(row=>{
      const card=document.createElement('article');
      card.className='discover-card';

      const imageUrl=safeBottleImageUrl(row.image_url);
      if(imageUrl){
        const img=document.createElement('img');
        img.src=imageUrl;
        img.alt=((row.brand || '')+' '+(row.canonical_name || '')).trim() || 'Fragrance bottle';
        img.loading='lazy';
        img.referrerPolicy='no-referrer';
        img.addEventListener('error',()=>img.replaceWith(textEl('div','discover-fallback','SMS')),{once:true});
        card.appendChild(img);
      }else{
        card.appendChild(textEl('div','discover-fallback','SMS'));
      }

      const copy=document.createElement('div');
      copy.className='discover-card-copy';
      copy.appendChild(textEl('div','discover-meta',(row.is_new?'NEW • ':'')+(row.brand || '')));
      copy.appendChild(textEl('h3','',row.canonical_name || 'Fragrance'));

      const price=Number(row.price);
      const listing=websiteOfferListingDetails(row.affiliate_url);
      const detail=(row.concentration || 'Fragrance')+(Number.isFinite(price)?' • from $'+price.toFixed(2):'')+(listing.size?' • '+listing.size:' • Size: check retailer')+(listing.tester?' • Tester':'');
      copy.appendChild(textEl('p','',detail));
      copy.appendChild(textEl('span','',row.retailer_name || 'Retailer offer'));
      const disclosure=textEl('span','','Paid links • commissions may be earned');disclosure.style.display='block';copy.appendChild(disclosure);
      const view=buttonEl('VIEW NOTES, MATCHES & RETAILERS');
      view.setAttribute('aria-label','View notes, matches and retailers for '+row.brand+' '+row.canonical_name);
      view.addEventListener('click',()=>openDealDetail(row));copy.appendChild(view);

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
    let moreButton=document.getElementById('website-deals-more');
    if(!moreButton){moreButton=buttonEl('SHOW MORE DEALS');moreButton.id='website-deals-more';host.after(moreButton);moreButton.addEventListener('click',async()=>{moreButton.disabled=true;await loadStyleMyScentDiscovery({more:true});moreButton.disabled=false;});}
    moreButton.hidden=rows.length<=SMS_DEALS_STATE.visible && allRows.length<limit;
    if(status) status.textContent=rows.length?'Showing '+Math.min(rows.length,SMS_DEALS_STATE.visible)+' loaded offers. Open a bottle to view notes, comparisons and retailer options.':'No matching live offers found. Try another bottle or brand.';
  }catch{
    host.replaceChildren();
    if(status) status.textContent='Live offers are refreshing. You can still shop our verified partner links above.';
  }
}

document.addEventListener('DOMContentLoaded',()=>{
  loadFullWebsiteDiscover().catch(()=>{});
  loadStyleMyScentDiscovery().catch(()=>{});
});
