import fs from 'node:fs';
const file='index.html';
let src=fs.readFileSync(file,'utf8');
const old='Find your match. Compare the vibe. Shop the deal.';
const next='Smell expensive, spend smarter.';
if(!src.includes(old) && !src.includes(next)) throw new Error('Discover CTA headline not found');
src=src.replace(old,next);
fs.writeFileSync(file,src);
console.log('Updated Discover headline.');
