// Mechanical URL-prefix migration for the independent repository. Does not
// rebuild bundles, rename saved-player keys or change game assets/materials.
import fs from 'node:fs';
import {execFileSync} from 'node:child_process';
const root=new URL('../',import.meta.url),from='/67park-feel-lab/',to='/67park-foundation-next/';
const files=execFileSync('git',['ls-files','-z'],{cwd:root,encoding:'utf8'}).split('\0').filter(Boolean);
const touched=[];
for(const file of files){
 if(!/\.(?:html|js|mjs|cjs|css|json)$/.test(file)||file.startsWith('cat-preview/')||file.startsWith('qa/cat-'))continue;
 const url=new URL(file,root),source=fs.readFileSync(url,'utf8');
 const next=source.replaceAll(from,to).replaceAll('\\/67park-feel-lab\\/','\\/67park-foundation-next\\/');
 if(source===next)continue;
 touched.push(file);if(process.argv.includes('--write'))fs.writeFileSync(url,next);
}
console.log(JSON.stringify({from,to,write:process.argv.includes('--write'),count:touched.length,files:touched}));
