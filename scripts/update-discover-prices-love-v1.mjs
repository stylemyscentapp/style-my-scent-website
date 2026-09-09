import fs from 'node:fs';

const file='index.html';
let src=fs.readFileSync(file,'utf8');
const oldText='Smell expensive, spend smarter.';
const newText='Scents you like at prices you love.';
if(!src.includes(oldText) && !src.includes(newText)) throw new Error('Discover CTA headline not found');
if(src.includes(oldText)) src=src.replace(oldText,newText);
fs.writeFileSync(file,src);
console.log('Updated Discover CTA headline.');
