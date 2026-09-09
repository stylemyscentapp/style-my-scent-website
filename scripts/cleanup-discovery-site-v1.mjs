import fs from 'node:fs';
const file='index.html';
let src=fs.readFileSync(file,'utf8');
let changes=0;

const dupNav='<a href="#how">How It Works</a><a href="#discover">Discover</a><a href="#layering">Layering</a><a href="#discover">Discover</a><a href="#deals">Deals</a>';
const cleanNav='<a href="#how">How It Works</a><a href="#discover">Discover</a><a href="#layering">Layering</a><a href="#deals">Deals</a>';
if(src.includes(dupNav)){src=src.replace(dupNav,cleanNav);changes++;}

const sections=[...src.matchAll(/<section id="discover">[\s\S]*?<\/section>/g)];
if(sections.length>1){
  const liveIndex=sections.findIndex(m=>m[0].includes('id="discover-grid"'));
  if(liveIndex<0) throw new Error('Live Discover section not found');
  sections.forEach((m,index)=>{if(index!==liveIndex){src=src.replace(m[0],'');changes++;}});
}

const finalSections=[...src.matchAll(/<section id="discover">/g)].length;
const finalLinks=[...src.matchAll(/href="#discover"/g)].length;
if(finalSections!==1) throw new Error(`Expected one Discover section, found ${finalSections}`);
if(finalLinks!==1) throw new Error(`Expected one Discover nav link, found ${finalLinks}`);
if(!src.includes('id="discover-grid"') || !src.includes('discover.js')) throw new Error('Live Discovery hook missing');

fs.writeFileSync(file,src);
console.log(`Cleaned ${changes} duplicate Discovery elements.`);
