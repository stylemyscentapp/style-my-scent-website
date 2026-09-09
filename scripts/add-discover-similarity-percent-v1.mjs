import fs from 'node:fs';
let html=fs.readFileSync('index.html','utf8');
let js=fs.readFileSync('discover.js','utf8');
function replaceOnce(src,oldText,newText,label){if(src.includes(newText))return src;if(!src.includes(oldText))throw new Error(`${label}: source text not found`);return src.replace(oldText,newText);}
html=replaceOnce(html,'<div class="similarity-mark"><span>↔</span><b>SIMILAR<br>SCENT DIRECTION</b></div>','<div class="similarity-mark"><span>↔</span><b id="women-similarity-label">SIMILAR<br>SCENT DIRECTION</b></div>','women label');
const first=html.indexOf('id="women-similarity-label"');
const secondNeedle='<div class="similarity-mark"><span>↔</span><b>SIMILAR<br>SCENT DIRECTION</b></div>';
const second=html.indexOf(secondNeedle,first+1);
if(second>=0) html=html.slice(0,second)+html.slice(second).replace(secondNeedle,'<div class="similarity-mark"><span>↔</span><b id="men-similarity-label">SIMILAR<br>SCENT DIRECTION</b></div>');
if(!js.includes('async function loadVerifiedComparisonScores')){
  js += `\nasync function loadVerifiedComparisonScores(){\n  async function scoreFor({brand,name,comparedBrand,comparedName}){\n    const h={apikey:SMS_SUPABASE_KEY,Authorization:\`Bearer \${SMS_SUPABASE_KEY}\`};\n    const fq=new URLSearchParams({select:'id',brand:\`ilike.\${brand}\`,canonical_name:\`ilike.\${name}\`,is_active:'eq.true',verification_status:'eq.verified',limit:'8'});\n    const fr=await fetch(\`\${SMS_SUPABASE_URL}/rest/v1/fragrances?\${fq}\`,{headers:h});\n    if(!fr.ok)return null;\n    const ids=(await fr.json()).map(x=>x.id).filter(Boolean);\n    if(!ids.length)return null;\n    const cq=new URLSearchParams({select:'estimated_similarity,verification_state,evidence_count',fragrance_id:\`in.(\${ids.join(',')})\`,verification_state:'eq.verified',compared_brand:\`ilike.\${comparedBrand}\`,compared_name:\`ilike.\${comparedName}\`,order:'evidence_count.desc.nullslast',limit:'1'});\n    const cr=await fetch(\`\${SMS_SUPABASE_URL}/rest/v1/fragrance_comparisons?\${cq}\`,{headers:h});\n    if(!cr.ok)return null;\n    const row=(await cr.json())[0];\n    const n=Number(row?.estimated_similarity);\n    return Number.isFinite(n)?Math.round(n):null;\n  }\n  const [women,men]=await Promise.all([\n    scoreFor({brand:'Armaf',name:'Club de Nuit Woman',comparedBrand:'Chanel',comparedName:'Coco Mademoiselle'}),\n    scoreFor({brand:'Lattafa',name:'Asad',comparedBrand:'Dior',comparedName:'Sauvage Elixir'}),\n  ]);\n  const w=document.getElementById('women-similarity-label');\n  const m=document.getElementById('men-similarity-label');\n  if(w && Number.isFinite(women)) w.textContent=\`≈ \${women}% SIMILAR\`;\n  if(m && Number.isFinite(men)) m.textContent=\`≈ \${men}% SIMILAR\`;\n}\n\ndocument.addEventListener('DOMContentLoaded',()=>{loadVerifiedComparisonScores().catch(()=>{});});\n`;
}
fs.writeFileSync('index.html',html);
fs.writeFileSync('discover.js',js);
console.log('Added verified similarity percentage support to website Discover.');
