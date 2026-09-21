import fs from 'node:fs';

const files=['balloon/index.html','explore/index.html','index.html','lane-rush/index.html','play/index.html','race/index.html','rockets/index.html','skybound-soft/index.html','sports/index.html','style-studio/index.html'];
const old='"/67park-foundation-next/app/chunk-OZ77422N.js?v=ride-contacts-1"';
const next='"/67park-foundation-next/app/chunk-OZ77422N.js?v=ride-jump-contact-1"';
for(const file of files){
 const source=fs.readFileSync(file,'utf8');
 const oldCount=source.split(old).length-1,nextCount=source.split(next).length-1;
 if(oldCount===0&&nextCount===2)continue;
 if(oldCount!==2||nextCount!==0)throw Error(`${file}: expected exactly two old movement targets and no new targets`);
 fs.writeFileSync(file,source.replaceAll(old,next));
}
for(const file of ['island/runtime.js','island/runtime.bundle.js']){
 const source=fs.readFileSync(file,'utf8');
 const oldImport="./ride-contacts.js?v=ride-contacts-1",nextImport="./ride-contacts.js?v=ride-jump-contact-1";
 const oldCount=source.split(oldImport).length-1,nextCount=source.split(nextImport).length-1;
 if(oldCount===0&&nextCount===1)continue;
 if(oldCount!==1||nextCount!==0)throw Error(`${file}: expected one old ride-contact import and no new import`);
 fs.writeFileSync(file,source.replace(oldImport,nextImport));
}
