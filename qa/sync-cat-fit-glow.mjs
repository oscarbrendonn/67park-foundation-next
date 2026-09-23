// One-time exact edits to the shipped bundles; never rebuild legacy sources.
import fs from 'node:fs';
import assert from 'node:assert/strict';
const revision='cat-fit-glow-1';
function replace(file,from,to){let s=fs.readFileSync(file,'utf8');if(!s.includes(from)&&s.split(to).length===2)return;assert.equal(s.split(from).length-1,1,`${file}: ${from}`);fs.writeFileSync(file,s.replace(from,to));}
replace('app/main.js','Y=1.28/Math.max(N.y,.001)','Y=1.28/Math.max(R.userData.parkNativeHeight||N.y,.001)');
replace('app/main.js','P=1.28/Math.max(R.y,.001)','P=1.28/Math.max(y.userData.parkNativeHeight||R.y,.001)');
replace('app/main.js','n=1.35/s.getSize(new ae.Vector3).y','n=1.35/(t.userData.parkNativeHeight||s.getSize(new ae.Vector3).y)');
replace('app/main.js','camera.position.set(0,.62,6)','camera.position.set(0,2.2,6)');
for(const [file,from,to] of [
 ['balloon/chunk-U4P5F7P3.js','l=1.28/u.getSize(new Te.Vector3).y','l=1.28/(i.userData.parkNativeHeight||u.getSize(new Te.Vector3).y)'],
 ['race/race.js','u=1.28/l.getSize(new pt.Vector3).y','u=1.28/(s.userData.parkNativeHeight||l.getSize(new pt.Vector3).y)'],
 ['rockets/rockets.js','d=1.28/l.getSize(new dt.Vector3).y','d=1.28/(s.userData.parkNativeHeight||l.getSize(new dt.Vector3).y)'],
 ['sports/sports.js','l=1.28/u.getSize(new dt.Vector3).y','l=1.28/(i.userData.parkNativeHeight||u.getSize(new dt.Vector3).y)'],
 ['skybound-soft/course-edf81ca8e2af595ed4d3.js','u=1.28/c.getSize(new L).y','u=1.28/(s.userData.parkNativeHeight||c.getSize(new L).y)']
])replace(file,from,to);
replace('app/native-character.js','cat-gorilla-body.glb?v=grey-tone-4','cat-gorilla-body.glb?v=head-fit-1');
replace('cat-character/index.html','cat-gorilla-body.glb?v=grey-tone-4','cat-gorilla-body.glb?v=head-fit-1');
const files=['app/main.js','app/native-character.js','app/gorilla-studio-items.js','balloon/chunk-U4P5F7P3.js','race/race.js','rockets/rockets.js','sports/sports.js','skybound-soft/course-edf81ca8e2af595ed4d3.js'];
for(const file of ['index.html','play/index.html','explore/index.html','style-studio/index.html','balloon/index.html','race/index.html','rockets/index.html','sports/index.html','lane-rush/index.html','skybound-soft/index.html']){
 let s=fs.readFileSync(file,'utf8');const match=s.match(/<script type="importmap">([\s\S]*?)<\/script>/);assert(match,file);
 const map=JSON.parse(match[1]);for(const asset of files){const bare='/67park-foundation-next/'+asset,url=bare+'?v='+revision;for(const key of Object.keys(map.imports))if(key.split('?')[0]===bare)map.imports[key]=url;map.imports[bare]=url;map.imports[url]=url;}
 s=s.replace(match[1],JSON.stringify(map));
 s=s.replace(/(src="(?:\/67park-foundation-next\/app\/main|\.\/(?:race|rockets|sports)|\.\/course-edf81ca8e2af595ed4d3)\.js\?v=)[^"&]+/g,'$1'+revision);
 fs.writeFileSync(file,s);
}
for(const file of ['qa/english-ui.test.mjs','qa/skate-audio.test.mjs','qa/skate-recovery-release.test.mjs','qa/grass-boundary.test.mjs','qa/north-housing-surface.test.mjs','qa/coaster-rail-finish.test.mjs','qa/character-menu.test.mjs']){
 const s=fs.readFileSync(file,'utf8');assert(s.includes('main.js?v=character-menu-1'),file);fs.writeFileSync(file,s.replaceAll('main.js?v=character-menu-1','main.js?v='+revision));
}
replace('qa/running-camera-punch.test.mjs','(?:online-next-1|gorilla-only-1|cat-character-1)','(?:online-next-1|gorilla-only-1|cat-character-1|cat-fit-glow-1)');
const bytes=fs.statSync('cat-character/cat-gorilla-body.glb').size;
replace('qa/playable-character.test.mjs','assert.equal(b.length,1723216)','assert.equal(b.length,'+bytes+')');
console.log('Synced',files.length,'changed modules and Cat asset',bytes,'bytes');
