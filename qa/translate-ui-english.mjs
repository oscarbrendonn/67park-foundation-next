// Bounded copy-only updates. Do not rebuild the integrated runtime bundle.
import fs from 'node:fs';
import assert from 'node:assert/strict';
const root=new URL('../',import.meta.url);
function replace(file,pairs){
 const url=new URL(file,root);let text=fs.readFileSync(url,'utf8');
 for(const [from,to,count=1]of pairs){
  const found=text.split(from).length-1;
  if(!found&&text.includes(to))continue;
  assert.equal(found,count,`${file}: exact copy count for ${from}`);text=text.replaceAll(from,to);
 }
 fs.writeFileSync(url,text);
}
replace('explore/index.html',[
 ['<html lang="tr">','<html lang="en">'],
 ['Haritayı gez','Explore the island',2],['Serbest gezinme haritası','Free-roam island map'],
 ['Kimi Island · Serbest kamera','Kimi Island · Free camera'],['Oyuna dön','Back to the game'],
 ['Kamera konumu','Camera view'],['Adanın tamamı','Island overview'],['>Sokak seviyesi<','>Street level<'],['Kontrolleri göster','Show controls'],
 ['Kuş bakışında: tek parmakla haritayı kaydır, iki parmağını açıp kapatarak yakınlaştır veya uzaklaştır. Bilgisayarda sürükle ve fare tekerleğini kullan.','Overview: drag with one finger to pan and pinch with two fingers to zoom. On desktop, drag to pan and use the mouse wheel to zoom.'],
 ['Sokak seviyesinde: joystick / WASD ile ilerle, sürükleyerek etrafına bak. Oklarla veya E / Q ile yüksel–alçal; Shift ile hızlan.','Street level: use the joystick or WASD to move and drag to look around. Use the arrows or E / Q to move up or down; hold Shift to move faster.'],
 ['Adan hazırlanıyor','Preparing your island'],['Harita açılıyor…','Opening the map…'],
 ['Oyundaki gerçek modeller yükleniyor.','Loading the actual game models.'],['Yeniden dene','Retry loading'],
 ["Kamera hareket joystick'i",'Camera movement joystick'],['Yüksel','Up',2],['Alçal','Down',2],
 ['Harita yakınlığı','Map zoom'],['Haritayı yakınlaştır','Zoom in'],['Haritayı uzaklaştır','Zoom out'],
 ['Hızlı gezin','Move faster'],['>Hızlı<','>Fast<'],['Sürükle ve etrafına bak','Drag to look around'],
 ['explore.js?v=coaster-rail-finish-1','explore.js?v=english-ui-1']
]);
const stages=['Opening the map…','Downloading the island…','Preparing the ground and roads…','Preparing the park trees…','Preparing the neighbourhood…','Preparing the central plaza…','Preparing the docks…','Preparing the amusement park…','Preparing the garden…','Preparing the sports areas…','Preparing the stadium and coast…','Preparing the homes…','Preparing the pool…','Finishing the neighbourhood…','Preparing the scene…'];
const exploreURL=new URL('explore/explore.js',root);let explore=fs.readFileSync(exploreURL,'utf8');
const decode=s=>s.replace(/\\u([0-9a-f]{4})|\\x([0-9a-f]{2})/gi,(_,u,x)=>String.fromCharCode(parseInt(u||x,16)));
const copy=new Map([
 ['Kaydır · İki parmakla yakınlaştır','Pan · Pinch to zoom'],['Sürükle ve etrafına bak','Drag to look around'],
 ['Harita açılamadı. Bağlantını kontrol edip yeniden deneyebilirsin.','The map could not load. Check your connection and try again.'],
 ['Son hazırlıklar…','Finishing up…'],['Harita yüklenemedi','The map could not load']
]);
for(const [from,to]of copy){
 let count=0;explore=explore.replace(/"(?:\\.|[^"\\])*"/g,token=>decode(token.slice(1,-1))===from?(count++,JSON.stringify(to)):token);
 assert(count===1||(count===0&&explore.includes(JSON.stringify(to))),`explore copy missing: ${from}`);
}
assert.equal((explore.match(/var stageLabels = \[[^\n]*\];/g)||[]).length,1,'one explore stage catalogue');
explore=explore.replace(/var stageLabels = \[[^\n]*\];/,'var stageLabels = '+JSON.stringify(stages)+';');
fs.writeFileSync(exploreURL,explore);
replace('app/lobby-courts.js',[
 ["'./lobby-court-rules.js'","'./lobby-court-rules.js?v=english-ui-1'"],
 ['Sahada serbest oyun','Court free play'],['Lobi · Serbest oyun','Lobby · Free play'],
 ['Topa yaklaş ve yürü. Top saha içinde kalır.','Walk into the ball to move it. It stays inside the court.',2],
 ['Oyuna git ↗','Play a match ↗'],['Top için lobi bağlantısı bekleniyor…','Waiting for the lobby connection…']
]);
replace('app/lobby-court-rules.js',[["label:'Basketbol'","label:'Basketball'"],["label:'Futbol'","label:'Football'"]]);
const errors=new Map([
 ['V62 ev dokusu beklenmiyordu: ','Unexpected V62 house texture: '],
 ['Küçük ada yerleşimi yüklenemedi','Could not load the small-island layout'],
 ['Küçük ada yerleşim doğrulaması başarısız','Small-island layout validation failed'],
 ['V62 ev parçaları bulunamadı: ','Missing V62 house parts: '],
 ['V62 ev modeli eksik: ','Missing V62 house model: '],['V45 foliage modeli eksik','Missing V45 foliage model'],
 ['Model kuru zemine oturmuyor: ','Model is not on dry ground: '],['Arazi yüksekliği değişti: ','Terrain height has changed: '],
 ['NW93 model çim dışında: ','NW93 model is outside the grass: '],
 ['Yol birlesimi veri surumu uyusmuyor','Road-join data version mismatch'],
 ['Yol birlesimi kaynak geometri uyusmuyor: ','Road-join source geometry mismatch: '],
 ['Eksik yol ucgeni: ','Missing road triangle: '],['Yol yuzeyi verisi gecersiz: ','Invalid road-surface data: '],
 ['Yol yuzeyi secimi gecersiz','Invalid road-surface selection'],
 ['Yüzey verisi yüklenemedi','Could not load surface data'],['Yüzey normalleri yüklenemedi','Could not load surface normals'],
 ['Kaldırım verisi yüklenemedi','Could not load sidewalk data'],['Kaldırım geometrisi yüklenemedi','Could not load sidewalk geometry'],
 ['Küçük ada duvarları yüklenemedi','Could not load small-island walls'],['Küçük ada modelleri: ','Small-island models: ']
]);
const sourceFiles=['island/runtime.js','island/small-island-props-v62.js','island/northwest-v93/placement.js','island/road-join-v34.js'];
const seen=new Set();
for(const file of sourceFiles){
 const url=new URL(file,root);let text=fs.readFileSync(url,'utf8');
 for(const [from,to]of errors){
  const oldToken="'"+from+"'",newToken="'"+to+"'";
  if(text.includes(oldToken)){assert.equal(text.split(oldToken).length,2,file+' copy count');text=text.replace(oldToken,newToken);seen.add(from);}
  else if(text.includes(newToken))seen.add(from);
 }
 fs.writeFileSync(url,text);
}
assert.equal(seen.size,errors.size,'every error translation has a maintained source');
const runtimeURL=new URL('island/runtime.bundle.js',root);let runtime=fs.readFileSync(runtimeURL,'utf8');
for(const [from,to]of errors){
 let count=0;runtime=runtime.replace(/"(?:\\.|[^"\\])*"/g,token=>decode(token.slice(1,-1))===from?(count++,JSON.stringify(to)):token);
 // These two requests already have English copy in the shipped bundle.
 if(['Yüzey normalleri yüklenemedi','Kaldırım geometrisi yüklenemedi'].includes(from))continue;
 assert(count===1||(count===0&&runtime.includes(JSON.stringify(to))),'runtime copy missing: '+from);
}
fs.writeFileSync(runtimeURL,runtime);
for(const file of ['app/main.js','explore/explore.js'])replace(file,[['runtime.bundle.js?v=coaster-rail-finish-1','runtime.bundle.js?v=english-ui-1']]);
replace('index.html',[['app/main.js?v=coaster-rail-finish-1','app/main.js?v=english-ui-1']]);
// Retarget the changed UI dependency through every entry's import map.
// Geometry, movement, camera and network singleton revisions are retained.
const entries=['index.html','play/index.html','explore/index.html','balloon/index.html','race/index.html','rockets/index.html','sports/index.html','lane-rush/index.html','skybound-soft/index.html','style-studio/index.html'];
for(const file of entries){
 const url=new URL(file,root);let text=fs.readFileSync(url,'utf8');
 const matches=text.match(/<script type="importmap">([\s\S]*?)<\/script>/g);assert.equal(matches?.length,1,file+' single import map');
 text=text.replace(/(<script type="importmap">)([\s\S]*?)(<\/script>)/,(_,start,json,end)=>{
  const map=JSON.parse(json),key='/67park-foundation-next/app/lobby-courts.js';
  assert(!map.imports[key]||map.imports[key]===key+'?v=english-ui-1','unexpected existing lobby override');
  map.imports[key]=key+'?v=english-ui-1';return start+JSON.stringify(map)+end;
 });
 fs.writeFileSync(url,text);
}
console.log('ENGLISH_UI_COPY_UPDATED');
