// Keep the checked-in runtime bundle aligned with the source without rebuilding
// unrelated, separately patched game modules. Every edit has an exact guard.
import fs from 'node:fs';
import assert from 'node:assert/strict';
const base=new URL('../',import.meta.url);
const edit=(file,from,to)=>{
 const url=new URL(file,base),text=fs.readFileSync(url,'utf8');
 if(text.includes(to))return;
 assert.equal(text.split(from).length,2,'Unique bundle anchor: '+file);
 fs.writeFileSync(url,text.replace(from,to));
};
edit('island/runtime.bundle.js',"import {applyParkEntryFinish}","import {finishCoasterRails as finishCoasterRails1} from '../app/coaster-rail-finish.js?v=coaster-rail-finish-1';\nimport {applyParkEntryFinish}");
edit('island/runtime.bundle.js','let z=b6(c.get(y.asset),y.asset),N=y.water?null:o(y.x,y.z);','let z=b6(c.get(y.asset),y.asset);if(y.asset==="coaster")e.domElement.dataset.coasterRailFinish1=JSON.stringify(finishCoasterRails1(z));let N=y.water?null:o(y.x,y.z);');
edit('app/main.js','runtime.bundle.js?v=park-entry-finish-1','runtime.bundle.js?v=coaster-rail-finish-1');
edit('index.html','app/main.js?v=park-entry-finish-1','app/main.js?v=coaster-rail-finish-1');
edit('explore/index.html','explore.js?v=park-entry-finish-1','explore.js?v=coaster-rail-finish-1');
edit('explore/explore.js','runtime.bundle.js?v=park-entry-finish-1','runtime.bundle.js?v=coaster-rail-finish-1');
const packageURL=new URL('package.json',base),pkg=JSON.parse(fs.readFileSync(packageURL,'utf8'));
if(!pkg.scripts.test.includes('qa/coaster-rail-finish.test.mjs')){pkg.scripts.test+=' qa/coaster-rail-finish.test.mjs';fs.writeFileSync(packageURL,JSON.stringify(pkg,null,' ')+'\n');}
