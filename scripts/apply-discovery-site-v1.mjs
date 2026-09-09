import fs from 'node:fs';
const file='index.html';
let src=fs.readFileSync(file,'utf8');
let changes=0;
function exact(oldText,newText,label){
  if(src.includes(newText)) return;
  if(!src.includes(oldText)) throw new Error(`${label}: source text not found`);
  src=src.replace(oldText,newText);changes++;
}

exact(
  '.deals{border:1px solid var(--line);',
  `.discover-shell{border:1px solid var(--line);border-radius:28px;padding:34px;background:linear-gradient(135deg,rgba(208,171,109,.1),rgba(255,255,255,.02));margin-top:28px}.discover-grid{display:grid;grid-template-columns:repeat(4,1fr);gap:14px;margin-top:26px}.discover-card{border:1px solid var(--line);border-radius:18px;background:#11100e;overflow:hidden;min-width:0}.discover-card img,.discover-fallback{width:100%;height:190px;object-fit:contain;background:#f6f0e7}.discover-fallback{display:flex;align-items:center;justify-content:center;color:#6d5a3a;font:700 30px "Cormorant Garamond",serif}.discover-card-copy{padding:16px}.discover-card-copy h3{font:600 24px/1.05 "Cormorant Garamond",serif;margin:5px 0 8px}.discover-card-copy p{font-size:13px;color:#e4d6c5;margin:0 0 7px}.discover-card-copy span{font-size:11px;color:var(--muted)}.discover-meta{font-size:10px;letter-spacing:.14em;color:var(--gold2);font-weight:800}.discover-status{text-align:center;color:var(--muted);font-size:12px;margin-top:18px}@media(max-width:900px){.discover-grid{grid-template-columns:repeat(2,1fr)}}@media(max-width:520px){.discover-grid{grid-template-columns:1fr 1fr}.discover-shell{padding:24px 16px}.discover-card img,.discover-fallback{height:150px}}\n.deals{border:1px solid var(--line);`,
  'discovery styles'
);

exact(
  '<a href="#layering">Layering</a><a href="#deals">Deals</a>',
  '<a href="#layering">Layering</a><a href="#discover">Discover</a><a href="#deals">Deals</a>',
  'discovery nav'
);

exact(
  '<section id="deals">',
  `<section id="discover"><div class="wrap"><div class="center"><div class="eyebrow">Discover what you’ll love</div><h2 class="section-title">READY TO STYLE. READY TO SHOP.</h2><p class="section-copy">The same launch-ready Discovery feed used by the app. Products rise when their identity and scent profile are ready and there is a verified shopping path. Middle Eastern favorites get extra priority when they meet those standards.</p></div><div class="discover-shell"><div id="discover-grid" class="discover-grid"></div><div id="discover-status" class="discover-status">Loading live launch picks…</div></div></div></section>\n<section id="deals">`,
  'discovery section'
);

exact(
  '</body>',
  '<script src="discover.js?v=20260909-1" defer></script>\n</body>',
  'discovery script'
);

fs.writeFileSync(file,src);
console.log(`Applied ${changes} website Discovery changes.`);
