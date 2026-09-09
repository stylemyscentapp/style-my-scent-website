import fs from 'node:fs';

const file='index.html';
let src=fs.readFileSync(file,'utf8');
const oldUrl='https://cdn.shopify.com/s/files/1/0875/1513/6299/files/Untitleddesign_18_ca45c587-e18d-461b-977e-711eda73f149.png?v=1746650253';
const newUrl='https://www.edgars.co.za/cdn/shop/files/armuf_women_105ml_1_1800x1800.jpg?v=1716385568';
if(!src.includes(oldUrl)) throw new Error('Existing Club de Nuit Woman website image URL not found');
src=src.replace(oldUrl,newUrl);
fs.writeFileSync(file,src);
console.log('Replaced Club de Nuit Woman with the correct fragrance bottle image.');
