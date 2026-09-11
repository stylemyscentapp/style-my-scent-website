import fs from 'node:fs';

const path='index.html';
let src=fs.readFileSync(path,'utf8');
const oldText='<a href="index.html">Home</a><a href="privacy.html">Privacy Policy</a><a href="terms.html">Terms of Use</a><a href="affiliate-disclosure.html">Affiliate Disclosure</a><a href="contact.html">Contact</a>';
const newText='<a href="index.html">Home</a><a href="privacy.html">Privacy Policy</a><a href="terms.html">Terms of Use</a><a href="affiliate-disclosure.html">Affiliate Disclosure</a><a href="support.html">Support</a><a href="delete-account.html">Delete Account</a><a href="contact.html">Contact</a>';
if(!src.includes(newText)){
  if(!src.includes(oldText)) throw new Error('Launch legal footer source not found');
  src=src.replace(oldText,newText);
  fs.writeFileSync(path,src);
  console.log('Added support and account-deletion links to launch footer.');
}else{
  console.log('Launch legal footer already complete.');
}
