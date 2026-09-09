const SMS_SUPABASE_URL='https://kdspdaffkbxxxgxlfnjo.supabase.co';
const SMS_SUPABASE_KEY='sb_publishable_KCHzj9dxjrN_Jzzo0b1weQ_7LktkdMB';

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
    host.innerHTML='';
    rows.forEach(row=>{
      const card=document.createElement('article');
      card.className='discover-card';
      const image=row.image_url ? `<img src="${row.image_url}" alt="${row.brand} ${row.canonical_name}" loading="lazy">` : `<div class="discover-fallback">SMS</div>`;
      const price=Number(row.price);
      card.innerHTML=`${image}<div class="discover-card-copy"><div class="discover-meta">${row.is_new?'NEW • ':''}${row.brand}</div><h3>${row.canonical_name}</h3><p>${row.concentration||'Fragrance'}${Number.isFinite(price)?` • from $${price.toFixed(2)}`:''}</p><span>Ready to style • verified shopping match</span></div>`;
      host.appendChild(card);
    });
    if(status) status.textContent=rows.length?'Live launch picks refresh automatically.':'Discovery is refreshing.';
  }catch(error){
    if(status) status.textContent='Discovery is refreshing. The app will always show the newest ready-to-shop picks.';
  }
}

document.addEventListener('DOMContentLoaded',loadStyleMyScentDiscovery);
