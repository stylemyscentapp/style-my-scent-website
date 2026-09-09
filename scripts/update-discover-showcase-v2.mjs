import fs from 'node:fs';

const file='index.html';
let src=fs.readFileSync(file,'utf8');

const oldSection=`<section id="discover"><div class="wrap"><div class="center"><div class="eyebrow">Discover what you’ll love</div><h2 class="section-title">READY TO STYLE. READY TO SHOP.</h2><p class="section-copy">The same launch-ready Discovery feed used by the app. Products rise when their identity and scent profile are ready and there is a verified shopping path. Middle Eastern favorites get extra priority when they meet those standards.</p></div><div class="discover-shell"><div id="discover-grid" class="discover-grid"></div><div id="discover-status" class="discover-status">Loading live launch picks…</div></div></div></section>`;

const newSection=`<section id="discover"><div class="wrap"><div class="discover-feature">
  <div class="discover-feature-head center">
    <div class="eyebrow">Discover similar scents</div>
    <h2 class="section-title">DESIGNER VIBES. MORE WAYS TO DISCOVER.</h2>
    <p class="discover-intro">Find Middle Eastern fragrances with a similar scent direction to designer favorites, see why they’re alike, then shop and explore directly through the Style My Scent app.</p>
  </div>
  <div class="similarity-grid">
    <article class="similarity-card similarity-women">
      <div class="similarity-tag">WOMEN’S MATCH</div>
      <div class="similarity-pair">
        <div class="scent-side"><div class="scent-kicker">DESIGNER</div><h3>Chanel<br>Coco Mademoiselle</h3></div>
        <div class="similarity-mark"><span>↔</span><b>SIMILAR<br>SCENT DIRECTION</b></div>
        <div class="scent-side"><div class="scent-kicker">MIDDLE EASTERN</div><h3>Armaf<br>Club de Nuit Woman</h3></div>
      </div>
      <div class="same-vibe">Same vibes. Less value.</div>
      <p class="why-copy"><strong>Why they’re similar:</strong> Bright citrus, a polished floral heart and a warm patchouli-vanilla-musky drydown give both a confident, elegant feminine feel.</p>
    </article>
    <article class="similarity-card similarity-men">
      <div class="similarity-tag">MEN’S MATCH</div>
      <div class="similarity-pair">
        <div class="scent-side"><div class="scent-kicker">DESIGNER</div><h3>Dior<br>Sauvage Elixir</h3></div>
        <div class="similarity-mark"><span>↔</span><b>SIMILAR<br>SCENT DIRECTION</b></div>
        <div class="scent-side"><div class="scent-kicker">MIDDLE EASTERN</div><h3>Lattafa<br>Asad</h3></div>
      </div>
      <div class="same-vibe">Same vibe. More options.</div>
      <p class="why-copy"><strong>Why they’re similar:</strong> Bold spice, aromatic warmth, woods and a rich amber-vanilla base create a deep, commanding profile in both.</p>
    </article>
  </div>
  <div class="discover-app-cta">
    <div><div class="eyebrow">AVAILABLE IN STYLE MY SCENT</div><h3>Find your match. Compare the vibe. Shop the deal.</h3><p>Shop and explore directly through the Style My Scent app — with verified retailer offers when available.</p></div>
    <a class="discover-app-btn" href="#get-app">SHOP &amp; EXPLORE IN THE APP</a>
  </div>
  <p class="comparison-note">Similarity is based on scent-profile direction and verified comparison evidence; it is not a scientific measurement and each fragrance keeps its own character.</p>
</div></div></section>`;

if(!src.includes(oldSection)) throw new Error('Current Discover section not found');
src=src.replace(oldSection,newSection);

const css=`
.discover-feature{border:1px solid var(--line);border-radius:30px;padding:44px;background:radial-gradient(circle at 18% 8%,rgba(208,171,109,.13),transparent 28%),linear-gradient(145deg,#17130f,#0d0b0a);box-shadow:0 24px 60px #0007}.discover-feature-head{max-width:900px;margin:0 auto 30px}.discover-intro{max-width:780px;margin:0 auto;color:var(--muted);font-size:16px;line-height:1.72}.similarity-grid{display:grid;grid-template-columns:1fr 1fr;gap:18px}.similarity-card{position:relative;overflow:hidden;border:1px solid var(--line);border-radius:24px;padding:26px;background:#11100e;min-height:350px}.similarity-card:before{content:"";position:absolute;width:260px;height:260px;border-radius:50%;filter:blur(40px);opacity:.15;right:-70px;top:-90px}.similarity-women:before{background:#d7a0a0}.similarity-men:before{background:#7891aa}.similarity-tag{position:relative;z-index:1;font-size:10px;letter-spacing:.18em;color:var(--gold2);font-weight:800}.similarity-pair{position:relative;z-index:1;display:grid;grid-template-columns:1fr 92px 1fr;gap:12px;align-items:center;margin:30px 0 22px}.scent-side{padding:16px 8px;border:1px solid rgba(241,212,154,.18);border-radius:18px;background:rgba(255,255,255,.025);min-height:142px;display:flex;flex-direction:column;justify-content:center;text-align:center}.scent-kicker{font-size:9px;letter-spacing:.14em;color:var(--gold2);font-weight:800;margin-bottom:8px}.scent-side h3{font:600 clamp(24px,2.3vw,34px)/1.02 "Cormorant Garamond",serif;margin:0;color:var(--cream)}.similarity-mark{text-align:center;color:var(--gold2)}.similarity-mark span{display:block;font-size:28px;line-height:1;margin-bottom:8px}.similarity-mark b{font-size:8px;letter-spacing:.11em;line-height:1.35}.same-vibe{font:600 27px/1 "Cormorant Garamond",serif;color:var(--gold2);margin-bottom:12px}.why-copy{position:relative;z-index:1;color:var(--muted);font-size:13px;line-height:1.65;margin:0}.why-copy strong{color:var(--cream)}.discover-app-cta{display:flex;align-items:center;justify-content:space-between;gap:28px;margin-top:20px;padding:26px 28px;border:1px solid rgba(241,212,154,.34);border-radius:22px;background:linear-gradient(120deg,#0e0d0b,#1b160f)}.discover-app-cta h3{font:600 32px/1.05 "Cormorant Garamond",serif;margin:4px 0 8px}.discover-app-cta p{margin:0;color:var(--muted);font-size:14px}.discover-app-btn{flex:0 0 auto;border:1px solid var(--gold);border-radius:999px;padding:14px 18px;color:var(--gold2);font-size:11px;font-weight:900;letter-spacing:.08em;white-space:nowrap;background:#1b160f}.comparison-note{text-align:center;color:#9f9589;font-size:10px;line-height:1.55;margin:16px auto 0;max-width:820px}@media(max-width:900px){.similarity-grid{grid-template-columns:1fr}.discover-app-cta{align-items:flex-start;flex-direction:column}.discover-app-btn{white-space:normal;text-align:center}}@media(max-width:560px){.discover-feature{padding:28px 16px}.similarity-card{padding:20px 14px}.similarity-pair{grid-template-columns:1fr 58px 1fr;gap:7px}.scent-side{padding:12px 6px;min-height:130px}.scent-side h3{font-size:23px}.similarity-mark b{font-size:7px}.discover-app-cta{padding:22px 18px}.discover-app-cta h3{font-size:28px}}
`;

if(!src.includes('.discover-feature{')) src=src.replace('</style>',css+'\n</style>');
src=src.replace('<script src="discover.js?v=20260909-1" defer></script>\n','');

fs.writeFileSync(file,src);
console.log('Updated website Discover showcase.');
