const SMS_SUPABASE_URL='https://kdspdaffkbxxxgxlfnjo.supabase.co';
const SMS_SUPABASE_KEY='sb_publishable_KCHzj9dxjrN_Jzzo0b1weQ_7LktkdMB';

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

async function loadStyleMyScentDiscovery(){
  const host=document.getElementById('discover-grid');
  const status=document.getElementById('discover-status');
  if(!host) return;
  try{
    const select='fragrance_id,brand,canonical_name,concentration,image_url,retailer_name,price,affiliate_url,is_new,reason';
    const response=await fetch(`${SMS_SUPABASE_URL}/rest/v1/catalog_discovery_feed?select=${select}&order=discovery_score.desc,brand.asc,canonical_name.asc&limit=8`,{
      headers:{apikey:SMS_SUPABASE_KEY,Authorization:`Bearer ${SMS_SUPABASE_KEY}`},
    });
    if(!response.ok) throw new Error('Discovery unavailable');
    const rows=await response.json();
    host.replaceChildren();

    rows.forEach(row=>{
      const card=document.createElement('article');
      card.className='discover-card';

      const imageUrl=safeHttpsUrl(row.image_url);
      if(imageUrl){
        const img=document.createElement('img');
        img.src=imageUrl;
        img.alt=`${String(row.brand || '')} ${String(row.canonical_name || '')}`.trim() || 'Fragrance bottle';
        img.loading='lazy';
        img.referrerPolicy='no-referrer';
        card.appendChild(img);
      }else{
        card.appendChild(textEl('div','discover-fallback','SMS'));
      }

      const copy=document.createElement('div');
      copy.className='discover-card-copy';
      copy.appendChild(textEl('div','discover-meta',`${row.is_new?'NEW • ':''}${row.brand || ''}`));
      copy.appendChild(textEl('h3','',row.canonical_name || 'Fragrance'));

      const price=Number(row.price);
      const detail=`${row.concentration || 'Fragrance'}${Number.isFinite(price)?` • from $${price.toFixed(2)}`:''}`;
      copy.appendChild(textEl('p','',detail));
      copy.appendChild(textEl('span','','Ready to style • verified shopping match'));

      const affiliateUrl=safeHttpsUrl(row.affiliate_url);
      if(affiliateUrl){
        const actions=document.createElement('div');
        actions.className='discover-actions';
        const shop=document.createElement('a');
        shop.className='mini-btn';
        shop.href=affiliateUrl;
        shop.target='_blank';
        shop.rel='sponsored noopener noreferrer';
        shop.textContent=`VIEW AT ${String(row.retailer_name || 'RETAILER').toUpperCase()}`;
        shop.setAttribute('aria-label',`View ${String(row.brand || '')} ${String(row.canonical_name || '')} at ${String(row.retailer_name || 'retailer')}`.trim());
        actions.appendChild(shop);
        copy.appendChild(actions);
      }

      card.appendChild(copy);
      host.appendChild(card);
    });
    if(status) status.textContent=rows.length?'Live launch picks refresh automatically.':'Discovery is refreshing.';
  }catch(error){
    if(status) status.textContent='Discovery is refreshing. The app will always show the newest ready-to-shop picks.';
  }
}

document.addEventListener('DOMContentLoaded',loadStyleMyScentDiscovery);

async function loadVerifiedComparisonScores(){
  async function scoreFor({brand,name,comparedBrand,comparedName}){
    const h={apikey:SMS_SUPABASE_KEY,Authorization:`Bearer ${SMS_SUPABASE_KEY}`};
    const fq=new URLSearchParams({select:'id',brand:`ilike.${brand}`,canonical_name:`ilike.${name}`,is_active:'eq.true',verification_status:'eq.verified',limit:'8'});
    const fr=await fetch(`${SMS_SUPABASE_URL}/rest/v1/fragrances?${fq}`,{headers:h});
    if(!fr.ok)return null;
    const ids=(await fr.json()).map(x=>x.id).filter(Boolean);
    if(!ids.length)return null;
    const cq=new URLSearchParams({select:'estimated_similarity,verification_state,evidence_count',fragrance_id:`in.(${ids.join(',')})`,verification_state:'eq.verified',compared_brand:`ilike.${comparedBrand}`,compared_name:`ilike.${comparedName}`,order:'evidence_count.desc.nullslast',limit:'1'});
    const cr=await fetch(`${SMS_SUPABASE_URL}/rest/v1/fragrance_comparisons?${cq}`,{headers:h});
    if(!cr.ok)return null;
    const row=(await cr.json())[0];
    const n=Number(row?.estimated_similarity);
    return Number.isFinite(n)?Math.round(n):null;
  }
  const [women,men]=await Promise.all([
    scoreFor({brand:'Armaf',name:'Club de Nuit Woman',comparedBrand:'Chanel',comparedName:'Coco Mademoiselle'}),
    scoreFor({brand:'Lattafa',name:'Asad',comparedBrand:'Dior',comparedName:'Sauvage Elixir'}),
  ]);
  const w=document.getElementById('women-similarity-label');
  const m=document.getElementById('men-similarity-label');
  if(w && Number.isFinite(women)) w.textContent=`≈ ${women}% SIMILAR`;
  if(m && Number.isFinite(men)) m.textContent=`≈ ${men}% SIMILAR`;
}

document.addEventListener('DOMContentLoaded',()=>{loadVerifiedComparisonScores().catch(()=>{});});
