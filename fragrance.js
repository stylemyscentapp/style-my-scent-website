const SMS_URL='https://kdspdaffkbxxxgxlfnjo.supabase.co';
const SMS_KEY='sb_publishable_KCHzj9dxjrN_Jzzo0b1weQ_7LktkdMB';
const SMS_CJ_URL=SMS_URL+'/functions/v1/cj-deals';
const SMS_AMAZON_TAG='stylemyscent-20';
const MAX_DUPES_PER_DESIGNER=2;

const params=new URLSearchParams(location.search);
const id=params.get('id');
const el=(id)=>document.getElementById(id);
const clean=(v)=>Array.isArray(v)?v.filter(Boolean):[];
const text=(v)=>String(v??'');

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

const DESIGNER_BRANDS=new Set(['ariana grande','azzaro','burberry','bvlgari','calvin klein','carolina herrera','chanel','chloe','coach','davidoff','dior','dolce & gabbana','dunhill','elie saab','escada','giorgio armani','givenchy','gucci','guess','hermes','hugo boss','issey miyake','jean paul gaultier','jimmy choo','juicy couture','lacoste','marc jacobs','michael kors','montblanc','moschino','mugler','narciso rodriguez','prada','rabanne','ralph lauren','tiffany & co.','tom ford','valentino','versace','viktor & rolf','yves saint laurent']);

function normalized(value=''){
  return String(value||'').toLowerCase().normalize('NFKD')
    .replace(/[\u0300-\u036f]/g,'')
    .replace(/[^a-z0-9]+/g,' ')
    .trim();
}
function esc(v=''){
  return text(v).replace(/&/g,'&amp;').replace(/</g,'&lt;')
    .replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;');
}
function safeHttps(value=''){
  try{const u=new URL(String(value||''));return u.protocol==='https:'?u.href:''}catch{return ''}
}
function safeImage(value=''){return safeHttps(value)}
function addMeta(selector,attr,value){const n=document.querySelector(selector);if(n)n.setAttribute(attr,value);}
function setCanonical(url){
  let n=document.querySelector('link[rel="canonical"]');
  if(!n){n=document.createElement('link');n.rel='canonical';document.head.appendChild(n)}
  n.href=url;
}
function noteBox(label,arr){
  const vals=cleanCustomerNotes(arr);
  if(!vals.length)return '';
  return '<div class="note-box"><b>'+label+'</b><span>'+vals.map(v=>esc(v)).join(', ')+'</span></div>';
}
async function api(path){
  const r=await fetch(SMS_URL+path,{headers:{apikey:SMS_KEY}});
  if(!r.ok)throw new Error('Unavailable');
  return r.json();
}
async function fetchProduct(productId){
  if(!productId)return null;
  const q=new URLSearchParams({
    select:'id,canonical_name,brand,concentration,product_type,top_notes,middle_notes,base_notes,fragrance_notes,accords,bottle_image_url,hosted_image_url,display_image_url',
    id:'eq.'+productId,is_active:'eq.true',verification_status:'eq.verified',limit:'1'
  });
  const rows=await api('/rest/v1/catalog_public_fragrances_v1?'+q.toString());
  return rows[0]||null;
}
async function fetchAffiliateSnapshot(product){
  const q=[product.brand,product.canonical_name,product.concentration||product.product_type]
    .filter(Boolean).join(' ').trim();
  if(!q)return {deals:[],checkedAt:null,maxPriceAgeMinutes:10};
  try{
    const r=await fetch(SMS_CJ_URL+'?q='+encodeURIComponent(q)+'&channel=website',{
      headers:{apikey:SMS_KEY,Accept:'application/json'}
    });
    if(!r.ok)return {deals:[],checkedAt:null,maxPriceAgeMinutes:10};
    const data=await r.json();
    const nameTokens=normalized(product.canonical_name).split(' ').filter(x=>x.length>2);
    const brandTokens=normalized(product.brand).split(' ').filter(x=>x.length>2);
    const deals=(data.deals||[]).filter(deal=>{
      const hay=normalized((deal.title||'')+' '+(deal.description||''));
      return nameTokens.every(t=>hay.includes(t)) &&
        brandTokens.every(t=>hay.includes(t)) &&
        deal.saleVariant==='Retail bottle' &&
        safeHttps(deal.affiliateUrl);
    }).sort((a,b)=>Number(a.price||0)-Number(b.price||0));
    return {deals,checkedAt:data.checkedAt||null,maxPriceAgeMinutes:Number(data.maxPriceAgeMinutes||10)};
  }catch{
    return {deals:[],checkedAt:null,maxPriceAgeMinutes:10};
  }
}
async function fetchAffiliateOffers(product){
  return (await fetchAffiliateSnapshot(product)).deals;
}
function amazonUrl(product,sizeLabel=''){
  const q=[product.brand,product.canonical_name,product.concentration||product.product_type,sizeLabel]
    .filter(Boolean).join(' ');
  return 'https://www.amazon.com/s?k='+encodeURIComponent(q)+'&tag='+encodeURIComponent(SMS_AMAZON_TAG);
}
function bestCommonSizeBucket(designerDeals,dupeDealSets){
  const designerBuckets=new Set(designerDeals.map(x=>Number(x.sizeBucket)).filter(Number.isFinite));
  const support=new Map();
  for(const deals of dupeDealSets){
    const seen=new Set();
    for(const d of deals){
      const bucket=Number(d.sizeBucket);
      if(!Number.isFinite(bucket)||!designerBuckets.has(bucket)||seen.has(bucket))continue;
      seen.add(bucket);
      support.set(bucket,(support.get(bucket)||0)+1);
    }
  }
  return [...support.entries()].sort((a,b)=>b[1]-a[1]||b[0]-a[0])[0]?.[0]||null;
}
function sizeLabelForBucket(offers,bucket){
  const row=offers.find(x=>Number(x.sizeBucket)===Number(bucket));
  return row?.sizeLabel||'';
}
async function renderShopLinks(product,host,maxRetailers=2,options={}){
  if(!host)return;
  host.replaceChildren();

  const status=document.createElement('div');
  status.className='shop-status';
  status.textContent='Checking current partner prices…';
  host.appendChild(status);

  const snapshot=options.snapshot||await fetchAffiliateSnapshot(product);
  const rawBucket=options.targetSizeBucket;
  const targetSizeBucket=(rawBucket===null||rawBucket===undefined)?null:Number(rawBucket);
  const matched=targetSizeBucket!==null&&Number.isFinite(targetSizeBucket);
  let offers=snapshot.deals||[];

  if(matched){
    offers=offers.filter(offer=>Number(offer.sizeBucket)===targetSizeBucket);
  }else if(options.requireMatchedSize){
    offers=[];
  }

  const byRetailer=new Map();
  for(const offer of offers){
    const key=normalized(offer.retailer||offer.advertiserId||'partner');
    const existing=byRetailer.get(key);
    if(!existing||Number(offer.price)<Number(existing.price))byRetailer.set(key,offer);
  }
  const rows=[...byRetailer.values()].slice(0,maxRetailers);
  const sizeLabel=matched
    ? (options.sizeLabel||sizeLabelForBucket(offers,targetSizeBucket))
    : (rows[0]?.sizeLabel||'');

  if(rows.length){
    const retailers=rows.map(x=>String(x.retailer||'partner')).filter(Boolean);
    status.textContent=(sizeLabel?'MATCHED SIZE · '+sizeLabel+' · ':'')+
      'checked within 10 min'+(retailers.length?' · available at '+retailers.join(' + '):'');
  }else if(options.requireMatchedSize){
    status.textContent='That matched size is not live with my current partners right now, so I am holding the price instead of showing you a mismatched bottle. Amazon is the fallback.';
  }else{
    status.textContent='My priority partners do not have a clean live match right now, so I am falling back to Amazon.';
  }

  for(const offer of rows){
    const a=document.createElement('a');
    a.className='compare-shop-link';
    a.href=safeHttps(offer.affiliateUrl);
    a.target='_blank';
    a.rel='sponsored nofollow noopener noreferrer';
    const n=Number(offer.price);
    a.textContent='SHOP '+String(offer.retailer||'PARTNER').toUpperCase()+
      (offer.sizeLabel?' · '+offer.sizeLabel:'')+
      (Number.isFinite(n)&&n>0?' · $'+n.toFixed(2):'');
    host.appendChild(a);
  }

  const amazon=document.createElement('a');
  amazon.className='compare-shop-link secondary';
  amazon.href=amazonUrl(product,sizeLabel);
  amazon.target='_blank';
  amazon.rel='sponsored nofollow noopener noreferrer';
  amazon.textContent=options.requireMatchedSize?'CHECK SAME SIZE ON AMAZON':'SHOP ON AMAZON';
  host.appendChild(amazon);
}

function noIndex(msg){
  document.querySelector('meta[name="robots"]').content='noindex,follow';
  el('fragrance-title').textContent='Fragrance not found';
  el('fragrance-subtitle').textContent=msg;
  el('fragrance-content').innerHTML='<a class="button" href="fragrances.html">BROWSE THE FRAGRANCE CATALOG →</a>';
}

async function fetchWearDetails(comparisonId){
  if(!comparisonId)return null;
  try{
    const q=new URLSearchParams({
      select:'comparison_id,opening_comparison,drydown_comparison,performance_comparison',
      comparison_id:'eq.'+comparisonId,
      limit:'1'
    });
    const rows=await api('/rest/v1/catalog_public_comparison_wear_v1?'+q.toString());
    return rows[0]||null;
  }catch{return null}
}

function stylistWearCopy(kind,value,alternative,designer){
  let t=String(value||'').replace(/\s+/g,' ').trim();
  if(!t || /^No separate .* was reported\.?$/i.test(t)) return '';
  const forbidden=/(owner[- ]?(approved|verified|research)|human research|workbook|csv|database|machine|evidence|source[- ]reported|pipeline|publication|percentage was reported)/i;
  if(forbidden.test(t)) return '';

  const alt=alternative?.canonical_name||'the alternative';
  const orig=designer?.canonical_name||'the designer';

  if(kind==='opening'){
    t=t
      .replace(/^Both openings meet around (.+?)\.?$/i,(_,notes)=>`They meet quickly around ${notes}, so the first impression stays familiar.`)
      .replace(/^The openings separate more clearly.*$/i,`The opening is where ${alt} shows more of its own personality, while ${orig} keeps the designer signature more clearly.`);
  }
  if(kind==='drydown'){
    t=t
      .replace(/^Both drydowns meet around (.+?)\.?$/i,(_,notes)=>`They settle into the same ${notes} direction, which keeps the finish familiar as the fragrance settles.`)
      .replace(/^The drydowns separate more clearly than the opening, with different base-note emphasis\.?$/i,`This is where they part ways most: ${alt} shifts into a different base-note balance while ${orig} keeps the original designer finish.`);
  }
  if(kind==='performance'){
    t=t
      .replace(/^Performance is broadly similar\.?$/i,'Performance stays in a similar lane, so the bigger decision is scent character rather than wear time.');
  }
  return t;
}

function comparisonOtherSide(c,currentId){
  if(c.compared_fragrance_id===currentId){
    return {id:c.fragrance_id,brand:c.alternative_brand,name:c.alternative_name};
  }
  if(c.fragrance_id===currentId){
    return {id:c.compared_fragrance_id,brand:c.original_brand,name:c.original_name};
  }
  return null;
}


const COMPARISON_FAMILIES={
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
function noteFamily(value=''){
  const key=normalized(value);
  for(const [family,terms] of Object.entries(COMPARISON_FAMILIES)){
    if(terms.some(term=>key===term||key.includes(term)||term.includes(key)))return family;
  }
  return '';
}
function sameNote(a='',b=''){
  const x=normalized(a),y=normalized(b);
  return Boolean(x&&y&&(x===y||(Math.min(x.length,y.length)>=4&&(x.includes(y)||y.includes(x)))));
}
function productStages(product={}){
  return {
    top:cleanCustomerNotes(product.top_notes),
    heart:cleanCustomerNotes(product.middle_notes),
    base:cleanCustomerNotes(product.base_notes),
    general:cleanCustomerNotes(product.fragrance_notes),
    accords:cleanCustomerNotes(product.accords),
  };
}
function stageEducation(designer,alternative,stage,label){
  const left=productStages(designer)[stage]||[];
  const right=productStages(alternative)[stage]||[];
  if(!left.length&&!right.length)return null;
  const shared=[];
  for(const l of left){
    const r=right.find(value=>sameNote(l,value));
    if(r)shared.push({left:l,right:r});
    if(shared.length>=2)break;
  }
  if(shared.length){
    const leftText=shared.map(x=>x.left).join(' and ');
    const rightText=shared.map(x=>x.right).join(' and ');
    const note=sameNote(leftText,rightText)?leftText:leftText+' / '+rightText;
    return {connected:true,label,text:label+': both keep '+note+' in play, so this part of the wear has a real structural bridge.'};
  }
  for(const l of left){
    const lf=noteFamily(l);
    if(!lf)continue;
    const r=right.find(value=>noteFamily(value)===lf);
    if(r)return {connected:true,label,text:label+': '+designer.canonical_name+' uses '+l+', while '+alternative.canonical_name+' uses '+r+'. They stay in the same '+lf+' family without being note-for-note identical.'};
  }
  if(left.length&&right.length){
    return {connected:false,label,text:label+': '+designer.canonical_name+' leans on '+left.slice(0,2).join(' and ')+', while '+alternative.canonical_name+' moves through '+right.slice(0,2).join(' and ')+'. This is a real point of separation.'};
  }
  return null;
}
function comparisonEducation(comparison,alternative,designer,wear=null){
  const facts=[
    stageEducation(designer,alternative,'top','Opening'),
    stageEducation(designer,alternative,'heart','Heart'),
    stageEducation(designer,alternative,'base','Dry-down'),
  ].filter(Boolean);
  const connections=facts.filter(x=>x.connected);
  const shared=cleanCustomerNotes(comparison?.shared_notes||[]);
  let snapshot='';
  if(connections.length){
    snapshot=connections[0].text.replace(/^[^:]+:\s*/,'')+' That is the kind of overlap I want to see before I call something a serious alternative.';
  }else if(shared.length){
    snapshot='The verified comparison lists '+shared.slice(0,3).join(', ')+' as shared material. I’m treating that as the starting point, not as proof that the whole wear is identical.';
  }else{
    snapshot='This comparison is verified, but the published scent profiles do not give me enough note-level structure to explain the resemblance confidently. I’m keeping the claim conservative.';
  }

  const breakdown=facts.map(x=>x.text);
  if(!breakdown.length&&wear){
    const opening=stylistWearCopy('opening',wear.opening_comparison,alternative,designer);
    const dry=stylistWearCopy('drydown',wear.drydown_comparison,alternative,designer);
    if(opening)breakdown.push('Opening: '+opening);
    if(dry)breakdown.push('Dry-down: '+dry);
  }

  const baseFact=facts.find(x=>x.label==='Dry-down');
  const topFact=facts.find(x=>x.label==='Opening');
  let action='';
  if(baseFact){
    action='Test the dry-down first. '+baseFact.text.replace(/^Dry-down:\s*/,'')+' If that finish is the part you love in '+designer.canonical_name+', it is the make-or-break point for this alternative.';
  }else if(topFact){
    action='Compare the first 20–30 minutes on skin. '+topFact.text.replace(/^Opening:\s*/,'')+' Then wait for the base before deciding whether the similarity percentage matches your nose.';
  }else{
    action='Use the similarity score as a reference point only. Wear '+designer.canonical_name+' and '+alternative.canonical_name+' side by side before treating them as interchangeable.';
  }
  const performance=wear?stylistWearCopy('performance',wear.performance_comparison,alternative,designer):'';
  if(performance)action+=' '+performance;
  return {snapshot,breakdown,action};
}

function stylistDupeReason(comparison,alternative,designer){
  const shared=cleanCustomerNotes(Array.isArray(comparison?.shared_notes)?comparison.shared_notes:[]);
  if(shared.length){
    return 'The published comparison shares '+shared.slice(0,4).join(', ')+'. That is useful common ground, but I would still use the full opening/heart/dry-down breakdown before calling the bottles interchangeable.';
  }
  return 'The comparison is verified, but note-level detail is limited here. Open the full breakdown rather than treating the similarity percentage as the explanation.';
}

async function renderDesignerDupeSection(product,comparisons){
  const host=el('dupe-wrap');
  if(!host)return;
  if(!DESIGNER_BRANDS.has(normalized(product.brand))){
    host.hidden=true;
    return;
  }

  const candidates=[];
  const seen=new Set();
  for(const c of comparisons){
    const other=comparisonOtherSide(c,product.id);
    if(!other?.id || seen.has(other.id))continue;
    const sim=Number(c.estimated_similarity);
    if(!Number.isFinite(sim)||sim<70)continue;
    if(normalized(other.brand)===normalized(product.brand))continue;

    const rel=normalized(c.relationship);
    const direct=rel.includes('dupe')||rel.includes('inspired');
    const clone=rel.includes('clone');
    if(!direct && !clone)continue;

    seen.add(other.id);
    candidates.push({...c,other,sim,direct});
  }

  candidates.sort((a,b)=>
    b.sim-a.sim ||
    Number(Boolean(b.owner_verified))-Number(Boolean(a.owner_verified)) ||
    Number(Boolean(b.direct))-Number(Boolean(a.direct))
  );

  // Customer rule: show no more than two dupes, always the highest verified scores.
  const candidatePicks=candidates.slice(0,MAX_DUPES_PER_DESIGNER);
  if(!candidatePicks.length){
    host.hidden=true;
    return;
  }

  const candidateProducts=await Promise.all(candidatePicks.map(x=>fetchProduct(x.other.id)));
  const paired=candidatePicks.map((pick,index)=>({pick,product:candidateProducts[index]})).filter(x=>x.product);
  if(!paired.length){
    host.hidden=true;
    return;
  }

  const designerSnapshot=await fetchAffiliateSnapshot(product);
  const dupeSnapshots=await Promise.all(paired.map(x=>fetchAffiliateSnapshot(x.product)));
  const targetSizeBucket=bestCommonSizeBucket(designerSnapshot.deals,dupeSnapshots.map(x=>x.deals));

  // Keep the two strongest scent matches even when a same-size price is unavailable.
  // Price matching is handled separately so shopping data can never demote a better dupe.
  const selected=paired
    .map((x,index)=>({...x,snapshot:dupeSnapshots[index]}))
    .slice(0,MAX_DUPES_PER_DESIGNER);

  const picks=selected.map(x=>x.pick);
  const dupeProducts=selected.map(x=>x.product);
  const selectedDupeSnapshots=selected.map(x=>x.snapshot);
  const selectedWearSnapshots=await Promise.all(picks.map(x=>fetchWearDetails(x.comparison_id)));
  const matchedSizeLabel=targetSizeBucket!==null
    ? (sizeLabelForBucket(designerSnapshot.deals,targetSizeBucket) ||
       selectedDupeSnapshots.map(s=>sizeLabelForBucket(s.deals,targetSizeBucket)).find(Boolean) ||
       '')
    : '';

  host.hidden=false;
  const mainShop=el('shop-wrap');
  if(mainShop) mainShop.hidden=true;
  host.replaceChildren();

  const kicker=document.createElement('div');
  kicker.className='eyebrow';
  kicker.textContent='ADDISON’S BEST MATCHES';
  host.appendChild(kicker);

  const title=document.createElement('h3');
  title.className='compare-section-title';
  title.textContent='Compare the scent structure before you decide.';
  host.appendChild(title);

  const intro=document.createElement('p');
  intro.className='muted';
  intro.textContent=targetSizeBucket!==null ? 'I matched the bottle sizes so you can compare the prices fairly. These prices are refreshed at least every 10 minutes, and I leave testers out.' : 'I only show retail bottles here. If I cannot match the designer and dupe to the same live size, I would rather hold the price than give you a misleading comparison.';
  host.appendChild(intro);

  const grid=document.createElement('div');
  grid.className='designer-dupe-grid';

  const makeCard=(prod,label,similarity,comparison=null,snapshot=null,wear=null)=>{
    const card=document.createElement('article');
    card.className='designer-dupe-card';

    const img=safeImage(prod.display_image_url||prod.hosted_image_url||prod.bottle_image_url);
    if(img){
      const image=document.createElement('img');
      image.src=img;
      image.alt=[prod.brand,prod.canonical_name,'fragrance bottle'].filter(Boolean).join(' ');
      image.loading='lazy';
      image.referrerPolicy='no-referrer';
      card.appendChild(image);
    }

    const tag=document.createElement('div');
    tag.className='designer-dupe-label';
    tag.textContent=label;
    card.appendChild(tag);

    const name=document.createElement('h4');
    name.textContent=prod.canonical_name;
    card.appendChild(name);

    const brand=document.createElement('div');
    brand.className='muted designer-dupe-brand';
    brand.textContent=[prod.brand,prod.concentration||prod.product_type].filter(Boolean).join(' · ');
    card.appendChild(brand);

    if(Number.isFinite(similarity)){
      const score=document.createElement('div');
      score.className='designer-dupe-score';
      score.textContent='≈ '+Math.round(similarity)+'% similar';
      card.appendChild(score);
    }

    if(comparison){
      const education=comparisonEducation(comparison,prod,product,wear);

      const snapshotBox=document.createElement('div');
      snapshotBox.className='designer-dupe-why';
      const snapshotLabel=document.createElement('b');
      snapshotLabel.textContent='SNAPSHOT';
      const snapshotText=document.createElement('p');
      snapshotText.textContent=education.snapshot;
      snapshotBox.append(snapshotLabel,snapshotText);
      card.appendChild(snapshotBox);

      const breakdownBox=document.createElement('div');
      breakdownBox.className='designer-dupe-wear';
      const breakdownLabel=document.createElement('b');
      breakdownLabel.textContent='BREAKDOWN';
      breakdownBox.appendChild(breakdownLabel);
      if(education.breakdown.length){
        education.breakdown.forEach(line=>{
          const p=document.createElement('p');
          const split=line.indexOf(':');
          if(split>0){
            p.innerHTML='<strong>'+esc(line.slice(0,split))+':</strong> '+esc(line.slice(split+1).trim());
          }else{
            p.textContent=line;
          }
          breakdownBox.appendChild(p);
        });
      }else{
        const p=document.createElement('p');
        p.textContent='Detailed opening, heart, and dry-down information is limited for this match, so I’m not filling the space with generic copy.';
        breakdownBox.appendChild(p);
      }
      card.appendChild(breakdownBox);

      const actionBox=document.createElement('div');
      actionBox.className='designer-dupe-why';
      const actionLabel=document.createElement('b');
      actionLabel.textContent='ACTION';
      const actionText=document.createElement('p');
      actionText.textContent=education.action;
      actionBox.append(actionLabel,actionText);
      card.appendChild(actionBox);
    }

    const shop=document.createElement('div');
    shop.className='designer-dupe-shop';
    card.appendChild(shop);
    renderShopLinks(prod,shop,2,{snapshot,targetSizeBucket,sizeLabel:matchedSizeLabel,requireMatchedSize:true});

    return card;
  };

  grid.appendChild(makeCard(product,'DESIGNER',null,null,designerSnapshot,null));
  dupeProducts.forEach((prod,index)=>{
    grid.appendChild(makeCard(
      prod,
      index===0?'DUPE':'DUPE OPTION 2',
      picks[index]?.sim,
      picks[index],
      selectedDupeSnapshots[index],
      selectedWearSnapshots[index]
    ));
  });

  host.appendChild(grid);
  host.dataset.shownDupeIds=picks.map(x=>x.other.id).filter(Boolean).join(',');
}

(async()=>{
  if(!id){noIndex('Choose a fragrance from the Style My Scent catalog.');return}
  try{
    const q=new URLSearchParams({
      select:'id,canonical_name,brand,concentration,product_type,top_notes,middle_notes,base_notes,fragrance_notes,accords,description,release_year,launch_year,bottle_image_url,hosted_image_url,display_image_url,perfumers',
      id:'eq.'+id,is_active:'eq.true',verification_status:'eq.verified',limit:'1'
    });
    const products=await api('/rest/v1/catalog_public_fragrances_v1?'+q.toString());
    const p=products[0];
    if(!p){noIndex('This fragrance is not currently available in the public catalog.');return}

    const name=[p.brand,p.canonical_name].filter(Boolean).join(' ');
    const year=p.release_year||p.launch_year||'';
    const allNotes=[...cleanCustomerNotes(p.top_notes),...cleanCustomerNotes(p.middle_notes),...cleanCustomerNotes(p.base_notes),...cleanCustomerNotes(p.fragrance_notes),...cleanCustomerNotes(p.accords)];
    const desc=(p.description&&p.description.trim())
      ?p.description.trim()
      :([p.canonical_name,'by',p.brand,p.concentration?'('+p.concentration+')':'','with',allNotes.slice(0,8).join(', ')].filter(Boolean).join(' '));

    const canonical='https://stylemyscent.com/fragrance.html?id='+encodeURIComponent(id);
    document.title=name+' Dupes & Alternatives | Style My Scent';
    el('fragrance-title').textContent=p.canonical_name;
    el('fragrance-subtitle').textContent=[p.brand,p.concentration,year].filter(Boolean).join(' · ');
    el('meta-description').content=('Love '+name+'? See Addison’s two strongest alternatives, why they work, how the dry-down changes, and current shopping options.').slice(0,160);
    addMeta('#og-title','content',name+' Dupes & Alternatives | Style My Scent');
    addMeta('#og-description','content',('See Addison’s closest alternatives to '+name+', where they differ, how the dry-down develops, and current shopping options.').slice(0,180));
    addMeta('#og-url','content',canonical);
    setCanonical(canonical);

    const image=safeImage(p.display_image_url||p.hosted_image_url||p.bottle_image_url);
    if(image){
      const m=document.createElement('meta');
      m.setAttribute('property','og:image');
      m.content=image;
      document.head.appendChild(m);
    }

    // Give search engines a unique structured-data identity for each fragrance page.
    // The visible page still loads live catalog data, but the rendered DOM now carries
    // a canonical Product/WebPage graph instead of looking like one generic shell.
    const structured=document.createElement('script');
    structured.type='application/ld+json';
    structured.textContent=JSON.stringify({
      '@context':'https://schema.org',
      '@graph':[
        {
          '@type':'WebPage',
          '@id':canonical+'#webpage',
          url:canonical,
          name:name+' Dupes & Alternatives | Style My Scent',
          description:document.getElementById('meta-description')?.content||desc,
          isPartOf:{'@id':'https://stylemyscent.com/#website'},
          mainEntity:{'@id':canonical+'#fragrance'}
        },
        {
          '@type':'Product',
          '@id':canonical+'#fragrance',
          name:p.canonical_name,
          brand:{'@type':'Brand',name:p.brand},
          image:image||undefined,
          description:desc,
          category:'Fragrance',
          additionalProperty:[
            p.concentration?{'@type':'PropertyValue',name:'Concentration',value:p.concentration}:null,
            year?{'@type':'PropertyValue',name:'Release year',value:String(year)}:null
          ].filter(Boolean)
        }
      ]
    });
    document.head.appendChild(structured);

    const generic=cleanCustomerNotes(p.fragrance_notes),accords=cleanCustomerNotes(p.accords);
    el('fragrance-content').innerHTML='<div class="detail">'+
      '<div class="bottle">'+
        (image?'<img src="'+esc(image)+'" alt="'+esc(name+' fragrance bottle')+'">':'<div class="muted">Bottle image coming soon.</div>')+
      '</div>'+
      '<div>'+
        '<div class="eyebrow">SCENT PROFILE</div>'+
        '<h2>'+esc(name)+'</h2>'+
        '<p class="muted">'+esc(desc)+'</p>'+
        '<div class="note-grid">'+
          noteBox('TOP NOTES',p.top_notes)+
          noteBox('HEART NOTES',p.middle_notes)+
          noteBox('BASE NOTES',p.base_notes)+
          (!cleanCustomerNotes(p.top_notes).length&&!cleanCustomerNotes(p.middle_notes).length&&!cleanCustomerNotes(p.base_notes).length?noteBox('FRAGRANCE NOTES',generic):'')+
          noteBox('ACCORDS',accords)+
        '</div>'+
        '<section id="dupe-wrap" class="designer-dupe-section" hidden></section>'+
        '<section id="shop-wrap" class="shop"><div class="eyebrow">SHOP THIS SCENT</div><h3>'+esc(name)+'</h3><div id="main-shop-links"></div></section>'+
        '<div id="similar-wrap" class="compare"><div class="eyebrow">MORE SIMILAR SCENTS</div><p class="muted">Checking Style My Scent verified comparisons…</p></div>'+
        '<a class="button" href="fragrances.html">BROWSE MORE FRAGRANCES →</a>'+
      '</div>'+
    '</div>';

    const heroBottle=document.querySelector('#fragrance-content .bottle img');
    if(heroBottle){
      heroBottle.addEventListener('error',()=>{
        const fallback=document.createElement('div');
        fallback.className='muted';
        fallback.textContent='Bottle image is refreshing. Try reloading this page.';
        heroBottle.replaceWith(fallback);
      },{once:true});
    }

    renderShopLinks(p,el('main-shop-links'),4);

    const bottleImg=document.querySelector('.bottle img');
    if(bottleImg){
      bottleImg.classList.add('bottle-shop');
      bottleImg.tabIndex=0;
      bottleImg.title='Shop '+name;
      const jump=()=>{
        const dupeHost=el('dupe-wrap');
        const target=(dupeHost && !dupeHost.hidden)?dupeHost:el('shop-wrap');
        target?.scrollIntoView({behavior:'smooth',block:'center'});
      };
      bottleImg.addEventListener('click',jump);
      bottleImg.addEventListener('keydown',event=>{
        if(event.key==='Enter'||event.key===' '){event.preventDefault();jump();}
      });
    }

    const ld={"@context":"https://schema.org","@type":"Product","@id":canonical+"#product","name":name,"url":canonical,"brand":{"@type":"Brand","name":p.brand||''},"category":"Fragrance","description":desc};
    if(image)ld.image=image;
    if(p.concentration)ld.additionalProperty=[{"@type":"PropertyValue","name":"Concentration","value":p.concentration}];
    const s=document.createElement('script');
    s.type='application/ld+json';
    s.textContent=JSON.stringify(ld);
    document.head.appendChild(s);

    const cp=new URLSearchParams({
      select:'comparison_id,fragrance_id,compared_fragrance_id,relationship,estimated_similarity,shared_notes,alternative_brand,alternative_name,original_brand,original_name,similarities,differences,verdict,owner_verified',
      or:'(fragrance_id.eq.'+id+',compared_fragrance_id.eq.'+id+')',
      order:'estimated_similarity.desc',
      limit:'30'
    });

    try{
      const comps=await api('/rest/v1/catalog_public_comparison_cards_v1?'+cp.toString());
      await renderDesignerDupeSection(p,comps);

      const wrap=el('similar-wrap');
      const isDesigner=DESIGNER_BRANDS.has(normalized(p.brand));
      if(isDesigner){
        // The two strongest dupe cards above are the complete customer choice.
        wrap.hidden=true;
        wrap.replaceChildren();
      }else{
        const shownDupeIds=new Set(String(el('dupe-wrap')?.dataset.shownDupeIds||'').split(',').filter(Boolean));
        const moreSeen=new Set();
        const moreReady=[];
        for(const c of comps){
          const sim=Number(c.estimated_similarity);
          if(!Number.isFinite(sim)||sim<70) continue;
          const other=comparisonOtherSide(c,id);
          if(!other?.id || shownDupeIds.has(other.id)) continue;
          const nameKey=normalized(other.brand)+'|'+normalized(other.name);
          if(moreSeen.has(nameKey)) continue;
          moreSeen.add(nameKey);
          moreReady.push({c,other,sim});
          if(moreReady.length>=MAX_DUPES_PER_DESIGNER) break;
        }
        if(moreReady.length){
          wrap.hidden=false;
          wrap.innerHTML='<div class="eyebrow">ADDISON ALSO LIKES</div>'+
            moreReady.map(({c,other,sim})=>
              '<div class="compare"><h3>'+esc([other.brand,other.name].filter(Boolean).join(' '))+'</h3>'+
              '<div class="muted">≈ '+Math.round(sim)+'% similar · '+
              esc(stylistDupeReason(c,{canonical_name:other.name},{canonical_name:p.canonical_name}))+
              '</div></div>'
            ).join('');
        }else{
          wrap.hidden=true;
          wrap.replaceChildren();
        }
      }
    }catch{
      const host=el('dupe-wrap');if(host)host.hidden=true;
    }
  }catch(e){
    noIndex('Style My Scent could not load this fragrance profile right now.');
  }
})();