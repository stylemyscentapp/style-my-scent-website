import assert from 'node:assert/strict';
import fs from 'node:fs';

const discover=fs.readFileSync(new URL('../discover.js',import.meta.url),'utf8');
const fragrance=fs.readFileSync(new URL('../fragrance.js',import.meta.url),'utf8');
const url=(discover.match(/SMS_SUPABASE_URL='([^']+)'/)||[])[1] || (fragrance.match(/SMS_URL='([^']+)'/)||[])[1];
const key=(discover.match(/SMS_SUPABASE_KEY='([^']+)'/)||[])[1] || (fragrance.match(/SMS_KEY='([^']+)'/)||[])[1];
assert.ok(url&&key,'Website public Supabase config is required.');
const headers={apikey:key,Authorization:'Bearer '+key};

assert.match(fragrance,/MAX_DUPES_PER_DESIGNER=2/,'website must keep max two dupes per designer');
for(const label of ['SNAPSHOT','BREAKDOWN','ACTION']) assert.ok(fragrance.includes(label),'fragrance page missing '+label);
assert.ok(fragrance.includes('comparisonEducation'),'designer page must use structured comparison education');
assert.ok(discover.includes('profileComparisonEducation'),'Discover detail must use structured comparison education');
assert.doesNotMatch(fragrance,/At about .*% similarity/i,'percentage-only dupe reasoning must stay removed');
assert.doesNotMatch(fragrance,/same recognizable scent direction/i,'generic scent-direction fallback must stay removed');
assert.ok(fragrance.includes("deal.saleVariant==='Retail bottle'"),'website pricing must keep tester/non-retail exclusion');
assert.ok(fragrance.includes('checked within 10 min'),'website must preserve 10-minute price freshness messaging');

async function get(path,params){
  const res=await fetch(url+'/rest/v1/'+path+'?'+params.toString(),{headers});
  if(!res.ok) throw new Error(path+' '+res.status+' '+await res.text());
  return res.json();
}

const cards=[];
for(let offset=0;;offset+=500){
  const page=await get('catalog_public_comparison_cards_v1',new URLSearchParams({
    select:'comparison_id,fragrance_id,compared_fragrance_id,estimated_similarity,shared_notes,similarities,differences,verdict',
    order:'comparison_id.asc',limit:'500',offset:String(offset)
  }));
  cards.push(...page);
  if(page.length<500) break;
}
assert.ok(cards.length>=1300,'website public comparison pool unexpectedly small: '+cards.length);

const ids=[...new Set(cards.flatMap(r=>[r.fragrance_id,r.compared_fragrance_id]).filter(Boolean))];
const profiles=new Map();
for(let i=0;i<ids.length;i+=70){
  const rows=await get('catalog_public_fragrances_v1',new URLSearchParams({
    select:'id,top_notes,middle_notes,base_notes,fragrance_notes,accords',
    id:'in.('+ids.slice(i,i+70).join(',')+')'
  }));
  rows.forEach(row=>profiles.set(row.id,row));
}
const count=x=>Array.isArray(x)?x.filter(Boolean).length:0;
const profileReady=row=>row&&['top_notes','middle_notes','base_notes','fragrance_notes','accords'].some(k=>count(row[k])>0);
let bothReady=0,bothOpening=0,bothDrydown=0,badScore=0,self=0;
for(const card of cards){
  const original=profiles.get(card.compared_fragrance_id);
  const alternative=profiles.get(card.fragrance_id);
  if(profileReady(original)&&profileReady(alternative)) bothReady++;
  if(count(original?.top_notes)&&count(alternative?.top_notes)) bothOpening++;
  if(count(original?.base_notes)&&count(alternative?.base_notes)) bothDrydown++;
  const score=Number(card.estimated_similarity);
  if(!Number.isFinite(score)||score<60||score>100) badScore++;
  if(card.fragrance_id===card.compared_fragrance_id) self++;
}
assert.equal(badScore,0,'website comparison pool contains invalid similarity score(s)');
assert.equal(self,0,'website comparison pool contains self-comparison(s)');
assert.equal(bothReady,cards.length,'every published website comparison must have scent data on both bottles');
assert.ok(bothOpening>=650,'opening education coverage regressed: '+bothOpening);
assert.ok(bothDrydown>=650,'dry-down education coverage regressed: '+bothDrydown);

const boilerplate=cards.filter(row=>/keeping the overall scent direction closely related|extremely close on paper/i.test(String(row.similarities||'')+' '+String(row.verdict||''))).length;
console.log(
  'Website dupe education audit passed:',
  cards.length+' public comparisons,',
  bothOpening+' with opening-to-opening detail,',
  bothDrydown+' with dry-down-to-dry-down detail,',
  boilerplate+' legacy boilerplate evidence rows safely overridden by structured website education.'
);
