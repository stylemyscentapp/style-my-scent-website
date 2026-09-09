import fs from 'node:fs';

const file='index.html';
let src=fs.readFileSync(file,'utf8');
let changes=0;

function replaceOnce(oldText,newText,label){
  if(src.includes(newText)) return;
  if(!src.includes(oldText)) throw new Error(`${label}: source text not found`);
  src=src.replace(oldText,newText);
  changes++;
}

replaceOnce(
  '.scent-side{padding:16px 8px;border:1px solid rgba(241,212,154,.18);border-radius:18px;background:rgba(255,255,255,.025);min-height:142px;display:flex;flex-direction:column;justify-content:center;text-align:center}',
  '.scent-side{padding:14px 8px 16px;border:1px solid rgba(241,212,154,.18);border-radius:18px;background:rgba(255,255,255,.025);min-height:220px;display:flex;flex-direction:column;justify-content:flex-start;text-align:center}.scent-bottle{width:100%;height:132px;object-fit:contain;display:block;margin:2px auto 10px;border-radius:12px;background:#f7f1e8}.scent-name{font:600 clamp(20px,2vw,28px)/1.03 "Cormorant Garamond",serif;color:var(--cream);margin:0}.scent-brand{font-size:9px;letter-spacing:.13em;color:var(--gold2);font-weight:800;margin-top:5px;text-transform:uppercase}',
  'discover photo css'
);

replaceOnce(
  '<div class="scent-side"><div class="scent-kicker">DESIGNER</div><h3>Chanel<br>Coco Mademoiselle</h3></div>',
  '<div class="scent-side"><div class="scent-kicker">DESIGNER</div><img class="scent-bottle" src="https://www.ecosmetics.com/wp-content/uploads/2022/10/3145891165203.jpg" alt="Chanel Coco Mademoiselle bottle" loading="lazy"><div class="scent-name">Coco Mademoiselle</div><div class="scent-brand">Chanel</div></div>',
  'women designer bottle'
);

replaceOnce(
  '<div class="scent-side"><div class="scent-kicker">MIDDLE EASTERN</div><h3>Armaf<br>Club de Nuit Woman</h3></div>',
  '<div class="scent-side"><div class="scent-kicker">MIDDLE EASTERN</div><img class="scent-bottle" src="https://cdn.shopify.com/s/files/1/0875/1513/6299/files/Untitleddesign_18_ca45c587-e18d-461b-977e-711eda73f149.png?v=1746650253" alt="Armaf Club de Nuit Woman bottle" loading="lazy"><div class="scent-name">Club de Nuit Woman</div><div class="scent-brand">Armaf</div></div>',
  'women middle eastern bottle'
);

replaceOnce(
  '<div class="scent-side"><div class="scent-kicker">DESIGNER</div><h3>Dior<br>Sauvage Elixir</h3></div>',
  '<div class="scent-side"><div class="scent-kicker">DESIGNER</div><img class="scent-bottle" src="https://www.fridaycharm.com/cdn/shop/products/2FY09964602FV0102FY0996460_C0996.jpg?v=1669462574" alt="Dior Sauvage Elixir bottle" loading="lazy"><div class="scent-name">Sauvage Elixir</div><div class="scent-brand">Dior</div></div>',
  'men designer bottle'
);

replaceOnce(
  '<div class="scent-side"><div class="scent-kicker">MIDDLE EASTERN</div><h3>Lattafa<br>Asad</h3></div>',
  '<div class="scent-side"><div class="scent-kicker">MIDDLE EASTERN</div><img class="scent-bottle" src="https://www.ecosmetics.com/wp-content/uploads/2023/08/6291108735411.jpg" alt="Lattafa Asad bottle" loading="lazy"><div class="scent-name">Asad</div><div class="scent-brand">Lattafa</div></div>',
  'men middle eastern bottle'
);

replaceOnce(
  '@media(max-width:560px){.discover-feature{padding:28px 16px}.similarity-card{padding:20px 14px}.similarity-pair{grid-template-columns:1fr 58px 1fr;gap:7px}.scent-side{padding:12px 6px;min-height:130px}.scent-side h3{font-size:23px}',
  '@media(max-width:560px){.discover-feature{padding:28px 16px}.similarity-card{padding:20px 14px}.similarity-pair{grid-template-columns:1fr 52px 1fr;gap:7px}.scent-side{padding:10px 5px 12px;min-height:190px}.scent-bottle{height:105px}.scent-name{font-size:19px}',
  'mobile photo layout'
);

fs.writeFileSync(file,src);
console.log(`Applied ${changes} website Discover bottle-photo changes.`);
