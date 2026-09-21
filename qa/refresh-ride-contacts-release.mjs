// Asserted mechanical edits to the shipped bundle. It contains integrated
// features not present in runtime-source.js, so never rebuild it wholesale.
import fs from 'node:fs';
const root=new URL('../',import.meta.url),revision='ride-contacts-1',changed=[];
function edit(file,fn){const path=new URL(file,root),old=fs.readFileSync(path,'utf8'),next=fn(old);if(next!==old){changed.push(file);if(process.argv.includes('--write'))fs.writeFileSync(path,next);}}
function once(s,a,b){if(s.includes(b))return s;if(s.split(a).length!==2)throw Error('Ambiguous ride integration: '+a.slice(0,100));return s.replace(a,b);}
edit('island/lunapark-placement-v77.js',s=>{
 s=once(s,'function obstacle(x,z){','function obstacle(x,z,ignoreRideContacts=false){');
 s=once(s,'for(const ride of rides){const h=ride.ground(x,z);','for(const ride of rides){if(ignoreRideContacts&&ride.asset===\'ferris\')continue;const h=ride.ground(x,z);');
 return once(s,'if(x>=walkBounds.min.x&&','if(!ignoreRideContacts&&x>=walkBounds.min.x&&');
});
edit('island/runtime.js',s=>{
 const imp="import {installRideContacts} from './ride-contacts.js?v="+revision+"';\n";
 if(!s.includes(imp))s=imp+s;
 s=once(s,'const smallIslandGround=(x,z,ignoreCar=false)=>','const smallIslandGround=(x,z,ignoreCar=false,ignoreRideContacts=false)=>');
 s=once(s,'lunapark77?.obstacle(x,z),','lunapark77?.obstacle(x,z,ignoreRideContacts),');
 s=once(s,'traffic:pastelTraffic108,rides:lunapark77?.rides??[],','traffic:pastelTraffic108,rides:lunapark77?.rides??[],\n lunapark:lunapark77,rideGround:(x,z)=>smallIslandGround(x,z,false,true),');
 return once(s,'const completedWorld=installLobbyCourts(installHouseRoofSupports(installIslandSwimBoundary(world)));','const completedWorld=installLobbyCourts(installRideContacts(installHouseRoofSupports(installIslandSwimBoundary(world))));');
});
edit('island/runtime.bundle.js',s=>{
 const imp="import {installRideContacts} from './ride-contacts.js?v="+revision+"';\n";
 if(!s.includes(imp))s=imp+s;
 s=once(s,'function A(y,P){let I=null;for(let{b:z,height:N}of d)','function A(y,P,ignoreRideContacts=false){let I=null;for(let{b:z,height:N}of d)');
 s=once(s,'for(let z of b){let N=z.ground(y,P);','for(let z of b){if(ignoreRideContacts&&z.asset==="ferris")continue;let N=z.ground(y,P);');
 s=once(s,'if(y>=w.min.x&&y<=w.max.x&&P>=w.min.z&&P<=w.max.z){S.set(','if(!ignoreRideContacts&&y>=w.min.x&&y<=w.max.x&&P>=w.min.z&&P<=w.max.z){S.set(');
 s=once(s,'K0=(U,m0,k0=!1)=>{if(U0?.inBasin','K0=(U,m0,k0=!1,ignoreRideContacts=false)=>{if(U0?.inBasin');
 s=once(s,'w0?.obstacle(U,m0),','w0?.obstacle(U,m0,ignoreRideContacts),');
 s=once(s,'traffic:V,rides:w0?.rides??[],','traffic:V,rides:w0?.rides??[],lunapark:w0,rideGround:(x,z)=>K0(x,z,false,true),');
 return once(s,'return __parkInstallCourts(installHouseRoofSupports(await ll(options)))','return __parkInstallCourts(installRideContacts(installHouseRoofSupports(await ll(options))))');
});
edit('app/chunk-OZ77422N.js',s=>once(s,'e.setEnabled(!0);t.constrainSwimmer?.(e,a);let n=e.translation(),r=e.linvel();',
 'e.setEnabled(!0);t.constrainSwimmer?.(e,a);t.rideContacts?.prepareBody(e,{skip:!!Te.seat||isLocalCarryActive()||!!de.blocked||!!ie.on,jumpQueued:!!N.jumpQueued});let n=e.translation(),r=e.linvel();'));
// Keep the repair-data cache key and all network/camera/store singleton keys.
for(const file of ['app/main.js','explore/explore.js'])edit(file,s=>s.replace(/runtime\.bundle\.js\?v=[a-zA-Z0-9_-]+/g,'runtime.bundle.js?v='+revision));
const htmls=['index.html','play/index.html','balloon/index.html','race/index.html','rockets/index.html','sports/index.html','lane-rush/index.html','skybound-soft/index.html','explore/index.html','overview/index.html','style-studio/index.html'];
for(const file of htmls)edit(file,s=>{
 s=s.replace(/app\/main\.js\?v=[a-zA-Z0-9_-]+/g,'app/main.js?v='+revision).replace(/explore\.js\?v=[a-zA-Z0-9_-]+/g,'explore.js?v='+revision);
 return s.replace(/(<script type="importmap">)([\s\S]*?)(<\/script>)/,(_m,start,json,end)=>{
  const map=JSON.parse(json),path='/67park-foundation-next/app/chunk-OZ77422N.js';
  for(const key of Object.keys(map.imports))if(map.imports[key].split('?')[0]===path)map.imports[key]=path+'?v='+revision;
  map.imports[path]=path+'?v='+revision;map.imports[path+'?v=online-next-1']=path+'?v='+revision;
  const toys='/67park-foundation-next/app/party/park-social-toys.js';
  map.imports[toys]=toys+'?v='+revision;map.imports[toys+'?v=balloon-lift-2']=toys+'?v='+revision;
  return start+JSON.stringify(map)+end;
 });
});
edit('package.json',s=>once(s,'qa/public-endpoint.test.mjs"','qa/public-endpoint.test.mjs qa/ride-solid-sampler.test.mjs qa/ride-contacts.test.mjs"'));
console.log(JSON.stringify({revision,write:process.argv.includes('--write'),changed}));
