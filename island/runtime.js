import {installSkateRailFinish} from '../app/party/skate-rail-finish.js?v=1';
import {prepareCameraMeshes} from '../app/feel-camera-meshes.js?v=skate-corner-recovery-1';
import {applySidewalkMaterials} from '../app/sidewalk-materials.js?v=sidewalk-materials-1';
import {applyMapEdgeFinish} from '../app/map-edge-finish.js?v=map-edge-finish-1';
import {applyGrassBoundary} from '../app/grass-boundary.js?v=grass-boundary-1';
import {applyTerrainBoundaries} from '../app/terrain-boundaries.js?v=ground-2';
import {applyMapContinuity} from '../app/map-continuity.js?v=seams-1';
import {applyKimiCoast20} from '/67park-foundation-next/app/kimi-coast20.js?v=coast-24';
import {cleanLowerPark} from '/67park-foundation-next/app/park-lower-cleanup.js?v=20260914p';
import {repairEastRoadEnd} from '/67park-foundation-next/app/east-road-end.js?v=corner-49b';
import {installLobbyCourts} from '../app/lobby-courts.js';
import {shortenKimiRightTip} from '/67park-foundation-next/app/kimi-right-curb-tip.js?v=coast-20a';
import {installIslandSwimBoundary} from '/67park-foundation-next/app/island-swim-runtime.js?v=corner-contact-1';
import {installParcelGapQA} from '/67park-foundation-next/app/parcel-gap-qa.js';
import {applyParcelPaving} from '/67park-foundation-next/app/island-parcel-paving.js';
import {installParcelCornerQA} from '/67park-foundation-next/app/parcel-corner-qa.js';
import {assetFetch} from '/67park-foundation-next/app/entry-loading.js';
const islandFetch=(u,...a)=>assetFetch(typeof u==='string'&&u.startsWith('./')?'/67park-foundation-next/island/'+u.slice(2):u,...a);
import {loadIslandPrerequisites} from '../app/island-startup-queue.js';
import {createIslandAssetCache} from '../app/island-asset-cache.js';
import {repairIslandStairs,stairAt,stairsRailBlocked} from '/67park-foundation-next/app/island-stair-geometry.js';
import {applyCurbJoins} from '/67park-foundation-next/app/island-curb-joins.js';
import {applyParkEdges} from '/67park-foundation-next/app/island-park-edges.js';
import * as THREE from 'three';
import {createStableSunShadow52} from './stable-sun-shadow-v52.js';
import {loadSmallIslandProps} from './small-island-props-v62.js?v=roof1';
import {loadParkProps63} from './park-props-v63.js?v=anchor2';
import {loadCityProps60} from './city-props-v60.js?v=photo67';
import {applyPhotoFixes67} from './fixes-v67.js?v=8';
import {applyParkTerrain57,wrapParkTerrainSampler57} from './park-terrain-v57.js?v=1';
import {applyParkPlinthGround57} from './park-plinth-ground57.js?v=1';
import {applyParkPathPolish57,wrapParkPathSampler57} from './park-path-polish57.js?v=1';
import {applyParkRing63,wrapParkRingSampler63} from './park-ring-v63.js?v=L1g2';
import {applyParkShore66} from './park-shore-v66.js?v=4';
import {applyParkEntryCaps57,wrapParkEntryCapsSampler57} from './park-entry-caps57.js?v=1';
import {applyRoadSeal64} from './road-seal-v64.js?v=road-seal-r1';
import {applyParkPond65} from './park-pond-v65.js?v=pond-v65-P8-pastel-closure-r6';
import {applySmallIslandWalls48} from './small-island-walls-v48.js?v=walls3';
import {applySmallIslandMatch55} from './small-island-match-v55.js?v=1';
import {shortenSoutheastDivider49} from '/67park-foundation-next/app/southeast-divider-49.js?v=corner-49b';
import {applyCurbPolish49} from './curb-polish-v49.js?v=curb6';
import {applySideContinuity50} from './side-continuity-v50.js?v=1';
import {applyCoastalRoad56} from './coastal-road-v56.js?v=1';
import {installTerrainReceiverPlane50} from './grass-receiver-plane-v50.js?v=3';
import {installSkateReceiverPlane50} from './skate-receiver-plane-v50.js?v=1';
import {isMiniBowl64,isLargeSkatepark64,applyMiniBowlRender64,applyLargeSkateparkRender64,verifySkateparkRender64} from './skatepark-render-v64.js?v=1';
import {installCurbShadows49} from './curb-shadow-v49.js?v=curb6';
import {createPastelWater} from './pastel-water-v23.js?v=softwave24-2';
import {applyRoadJoin} from './road-join-v34.js';
import {installCarControls108,createPastelTraffic108} from './pastel-car-v108.js?v=car-45';
import {createTerrainSampler} from './terrain-sampler-v27.js?v=1';
import {sealOpenTerrain,unifyCurbFinish,sealBridgeApron} from './surface-seal-v32.js?v=2';
import { GLTFLoader } from './GLTFLoader.js';
import { RoomEnvironment } from './RoomEnvironment.js';
import {prepareCoast,addDryInterior,configureInteriorWater,dryInteriorAt} from './coast-grade-v21.js?v=3';
import {installSurfaceFinish} from '../app/surface-finish.js';
import {cacheStaticTransforms} from '../app/island-static-transforms.js';
import {installIslandShadowCache,createShadowAnchor} from '../app/island-shadow-cache.js';
import {waterWithSolidFloor,createPondWater} from '../app/island-water-floor.js';
import {treeIndex} from '../app/island-motion.js';
import {entryStage} from '/67park-foundation-next/app/entry-loading.js';
import {preserveAuthoredIslandEnvironment} from '../app/island-environment.js';
export async function createIslandRuntime({renderer,sahne,kam}) {
const islandStartupAssets=createIslandAssetCache();
try {
const initialChildren=new Set(sahne.children);

















const islandPrerequisitesStarted=performance.now();
const [roadSealMeta64,roadSealBuffer64,parkPondMeta65,parkPondBuffer65,roadMeta56,roadBuffer56,sideMeta50,sideBuffer50,coastGradeData,curbMeta49,curbBuffer49,wallPatch48,dividerMeta55,dividerBuffer55,roadJoinPatch]=await loadIslandPrerequisites([
async()=>islandFetch('./road-seal-v64.json?v=road-seal-r1').then(r=>{if(!r.ok)throw Error('road seal64 metadata');return r.json();}),
async()=>islandFetch('./road-seal-v64.bin?v=road-seal-r1').then(r=>{if(!r.ok)throw Error('road seal64 geometry');return r.arrayBuffer();}),
async()=>islandFetch('./park-pond-v65.json?v=pond-v65-P8-pastel-closure-r6').then(r=>{if(!r.ok)throw Error('park pond65 metadata');return r.json();}),
async()=>islandFetch('./park-pond-v65.bin?v=pond-v65-P8-pastel-closure-r6').then(r=>{if(!r.ok)throw Error('park pond65 geometry');return r.arrayBuffer();}),
async()=>islandFetch('./coastal-road-v56.json?v=1').then(r=>{if(!r.ok)throw Error('road56 metadata');return r.json();}),
async()=>islandFetch('./coastal-road-v56.bin?v=1').then(r=>{if(!r.ok)throw Error('road56 geometry');return r.arrayBuffer();}),
async()=>islandFetch('./side-continuity-v50.json?v=1').then(r=>{if(!r.ok)throw Error('Yüzey verisi yüklenemedi');return r.json();}),
async()=>islandFetch('./side-continuity-v50.bin?v=1').then(r=>{if(!r.ok)throw Error('Yüzey normalleri yüklenemedi');return r.arrayBuffer();}),
async()=>islandFetch('./coast-grade-v21.json?v=3').then(r=>{if(!r.ok)throw Error('Coast grade data unavailable');return r.json();}),
async()=>islandFetch('./curb-polish-v49.json?v=curb6').then(r=>{if(!r.ok)throw Error('Kaldırım verisi yüklenemedi');return r.json();}),
async()=>islandFetch('./curb-polish-v49.bin?v=curb6').then(r=>{if(!r.ok)throw Error('Kaldırım geometrisi yüklenemedi');return r.arrayBuffer();}),
async()=>islandFetch('./small-island-walls-v48.json?v=walls3').then(r=>{if(!r.ok)throw Error('Küçük ada duvarları yüklenemedi');return r.json();}),
async()=>islandFetch('./small-island-match-v55.json?v=1').then(r=>{if(!r.ok)throw Error('divider55 metadata');return r.json();}),
async()=>islandFetch('./small-island-match-v55.bin?v=1').then(r=>{if(!r.ok)throw Error('divider55 geometry');return r.arrayBuffer();}),
async()=>(await islandFetch('./road-join-v34.json')).json()
],4);
renderer.domElement.dataset.islandPrerequisites=JSON.stringify({files:15,concurrency:4,elapsedMs:Math.round(performance.now()-islandPrerequisitesStarted)});

// Required data already consumed by the bounded startup queue.





// Required data already consumed by the bounded startup queue.



// Required data already consumed by the bounded startup queue.















// Required data already consumed by the bounded startup queue.
const bilgi=document.createElement('div'), hataEl=document.createElement('div'), bas=document.createElement('div');
const gorunumKontrolleri=document.createElement('div');
const tamHaritaBtn=document.createElement('div'), yakinBakisBtn=document.createElement('div');
const oyunaDonBtn=document.createElement('div'), incelemeDurumu=document.createElement('div');
const tamEggyOyun=document.createElement('div');
tamEggyOyun.href='http://'+(location.hostname==='127.0.0.1'?'Oscar-Mac-mini.local':location.hostname)+':8013/';
function hata(m){hataEl.textContent=m; console.error(m);}


const mobil=/iPhone|iPad|Android/i.test(navigator.userAgent) || innerWidth<=600;
const urlParams=new URLSearchParams();
const CURB49_NAMES=['6_BORDUR','7_KALDIRIM_TABANI','7_MERKEZ_KALDIRIM_TABANI','7_DOGU_SAHIL_KAVSAK_TABANI'];
// Required data already consumed by the bounded startup queue.
// Required data already consumed by the bounded startup queue.
// Required data already consumed by the bounded startup queue.
const qaModu=urlParams.get('qa');
// Required data already consumed by the bounded startup queue.
// Salt yerel kalite kontrolunde, kalite kapisi henuz terfi ettirmedigi
// export adayini canli dosyanin ustune yazmadan inceleyebil.
const GLB_DOSYASI=urlParams.get('model')==='pending'
  ? 'ada_calisma.pending.glb'
  : '/67park-foundation-next/island/ada_calisma.glb';
// Export sonrasi SHA on eki bu marker'a yazilir. finish_gate/v parametresi
// verildiginde ayni anahtar gercek GLB istegine de aktarilir; telefon ve QA
// artik yeni HTML icinde eski modeli cache'ten acamaz.
const STATIC_GLB_REV='f5450f195d65';
const GLB_REV=urlParams.get('finish_gate')||urlParams.get('v')||STATIC_GLB_REV;
// Referanstaki sicak sari-krem dis sahil. Blender kaynagindaki tek kum
// sabitiyle aynidir; telefon tarafinda hicbir kiyi varsayilan/gri dala dusmez.
const KIYI_KUM_RENGI=0xe8c8ad;
const ADA_GOVDE_RENGI=0xeccbaf;
// Kiyi ciminin altindaki fiziksel tasiyici ayri bir gri/toprak seridi gibi
// okunmaz. Referanstaki kesit, cimin altinda devam eden ayni sicak kumdur;
// kot farki ve cimin kendi dik yani yeterli, yumusak temasi verir.
const KIYI_TOPRAK_RENGI=KIYI_KUM_RENGI;

// İnce diyagonal cim/kum sinirlari 1x ve 2x tamponda piksel basamaklariyla
// fiziksel kirikmis gibi okunuyordu. Rengi/dokuyu degistirmeden sahneyi hafif
// supersample et; iPhone DPR=3 korunur, masaustu QA da 1.5x olur.
// Kimi PerfGovernor owns DPR; no duplicate high-DPI multiplier.
// R3F owns the viewport and drawing buffer together.
renderer.shadowMap.enabled=true; renderer.shadowMap.type=THREE.PCFSoftShadowMap;
// Yalniz yakin QA karsilastirmasi: geometri kirigi ile shadow-map kirigini
// birbirinden ayirir. Normal oyun ve yayin gorunumu daima golgeli kalir.
if(urlParams.get('qa_shadow')==='off') renderer.shadowMap.enabled=false;
if('outputColorSpace' in renderer) renderer.outputColorSpace=THREE.SRGBColorSpace;
renderer.toneMapping=THREE.ACESFilmicToneMapping;
// Referans maketteki pastel tonlar parlakligini korurken beyaza yikanmasin.
// Bu yalniz goruntu yonetimidir; modeldeki hicbir malzeme rengi degismez.
renderer.toneMappingExposure=mobil?0.93:0.965;


sahne.background=new THREE.Color(0xc4ccdd);
// Ucus/kus bakisinda 450 m'lik adayi sis beyazina gommeden, yalniz uzak deniz
// ufkunu yumusatir. Onceki 334 m far degeri mobil haritayi bastan sona yikardi.
const NORMAL_SIS_YAKIN=mobil?380:420, NORMAL_SIS_UZAK=mobil?1200:1350;
sahne.fog=new THREE.Fog(0xc4ccdd,NORMAL_SIS_YAKIN,NORMAL_SIS_UZAK);
// Harita kotlari santimetrelerle ayriliyor. Uzak kusbakisinda 0.1/2000
// derinlik araligi bu katlari ayni depth dilimine sikistirip beyaz benekler
// uretiyordu; 0.5 m yakin duzlem oyuncu kamerasinin cok gerisinde kalir.


const pmrem=new THREE.PMREMGenerator(renderer);
sahne.environment=pmrem.fromScene(new RoomEnvironment(),0.04).texture;
sahne.environmentIntensity=mobil?0.12:0.15;
// Genis acik renkli zeminleri pastel tutarken onceki yuksek fill, gercek
// kotlarin dik yanlarini da ust kapak kadar aydinlatip haritayi 2B cizim gibi
// gosteriyordu. Daha koyu sicak alt hemisfer yalniz dik/alt yuzleri ayirir;
// ust renkleri ve plan geometrisini degistirmez.
sahne.add(new THREE.HemisphereLight(0xddeeff,0x9b8a80,mobil?0.14:0.17));
const gunes=new THREE.DirectionalLight(0xffe4ce,mobil?1.68:1.76);
gunes.position.set(94,132,-72); gunes.castShadow=true;
gunes.shadow.mapSize.set(2048,2048);
// Ince beyaz ayiricilarin golgesi mobilde iri texel/radius yuzunden yamuk
// gorunmesin: telefonda takip eden golge alanini daraltip PCF yumusamasini
// kontrollu tutuyoruz. Masaustu gorunumu ayni kalir.
const GOLGE_YARI=mobil?52:72;
gunes.shadow.radius=mobil?4.0:4.5;
gunes.shadow.bias=-0.00002; gunes.shadow.normalBias=mobil?0.012:0.014;
gunes.shadow.camera.left=-GOLGE_YARI; gunes.shadow.camera.right=GOLGE_YARI;
gunes.shadow.camera.top=GOLGE_YARI; gunes.shadow.camera.bottom=-GOLGE_YARI;
gunes.shadow.camera.near=0.5; gunes.shadow.camera.far=340;
if('intensity' in gunes.shadow) gunes.shadow.intensity=0.62;
sahne.add(gunes); sahne.add(gunes.target);
const GUNES_OFSET=new THREE.Vector3(94,132,-72);
const stableSunShadow52=createStableSunShadow52(gunes,GUNES_OFSET);
renderer.domElement.dataset.shadowStability='light-space-texel-v52';
function golgeKadrajiUygula(yari){
  const c=gunes.shadow.camera;c.left=-yari;c.right=yari;c.top=yari;c.bottom=-yari;
  c.updateProjectionMatrix();renderer.domElement.dataset.shadowHalfSpan=yari.toFixed(2);
}
const GOLGE_BAKIS_YONU=new THREE.Vector3();
const GOLGE_HEDEFI=new THREE.Vector3();

// Tek ve opak deniz duzlemi; kiyinin geometri/sinirini degistirmez. Iki
// analitik mikro dalga yalniz fragman normalini oynatir: displacement,
// transparan katman ve mobilde moire uretecek tekrarli texture yoktur.
// Kiyi bandi: kum omzunun dis sinirindan suya dogru yumusak bir temas
// golgesi. Referans makette adayi suya oturtan asil isaret budur; hicbir
// mesh eklenmez/degistirilmez, yalniz su fragmani karartilir.
const KIYI_BOS_DOKU=new THREE.DataTexture(new Uint8Array([0,0,0,255]),1,1);
KIYI_BOS_DOKU.needsUpdate=true;
const DENIZ_U={zaman:{value:0},kiyiDoku:{value:KIYI_BOS_DOKU},
  kiyiMin:{value:new THREE.Vector2(0,0)},kiyiBoy:{value:new THREE.Vector2(1,1)}};
const denizMat=new THREE.MeshStandardMaterial({
  color:0x9ab0f4,roughness:0.72,metalness:0.0,transparent:false,
  opacity:1.0,depthWrite:true,depthTest:true
});
denizMat.envMapIntensity=mobil?0.34:0.38;
denizMat.dithering=true;
denizMat.onBeforeCompile=(sh)=>{
  sh.uniforms.uDenizZaman=DENIZ_U.zaman;
  sh.uniforms.uKiyiDoku=DENIZ_U.kiyiDoku;
  sh.uniforms.uKiyiMin=DENIZ_U.kiyiMin;
  sh.uniforms.uKiyiBoy=DENIZ_U.kiyiBoy;
  sh.vertexShader=sh.vertexShader
    .replace('#include <common>','#include <common>\nvarying vec3 vDenizDunya;')
    .replace('#include <fog_vertex>','vDenizDunya=(modelMatrix*vec4(transformed,1.0)).xyz;\n#include <fog_vertex>');
  sh.fragmentShader=sh.fragmentShader
    .replace('#include <common>','#include <common>\nuniform float uDenizZaman;\nuniform sampler2D uKiyiDoku;\nuniform vec2 uKiyiMin;\nuniform vec2 uKiyiBoy;\nvarying vec3 vDenizDunya;')
    .replace('#include <map_fragment>','#include <map_fragment>\nvec2 dP67=vDenizDunya.xz;\nfloat dA67=dot(dP67,vec2(0.27,0.19))+uDenizZaman*0.16;\nfloat dB67=dot(dP67,vec2(-0.51,0.63))-uDenizZaman*0.11;\nvec2 dG67=0.012*cos(dA67)*normalize(vec2(0.27,0.19))+0.006*cos(dB67)*normalize(vec2(-0.51,0.63));\nvec2 kUv67=(dP67-uKiyiMin)/uKiyiBoy;\nfloat kBand67=texture2D(uKiyiDoku,clamp(kUv67,0.0,1.0)).r;\nif(kUv67.x<0.0||kUv67.x>1.0||kUv67.y<0.0||kUv67.y>1.0) kBand67=0.0;\ndiffuseColor.rgb=mix(diffuseColor.rgb,diffuseColor.rgb*vec3(0.76,0.81,0.93),kBand67);')
    .replace('#include <normal_fragment_begin>','#include <normal_fragment_begin>\nnormal=normalize(mat3(viewMatrix)*normalize(vec3(-dG67.x,1.0,-dG67.y)));')
    .replace('#include <roughnessmap_fragment>','#include <roughnessmap_fragment>\nroughnessFactor=clamp(roughnessFactor+0.012*sin(dA67-dB67),0.72,0.78);');
};
denizMat.customProgramCacheKey=()=>'67-water-world-dual-normal-v2-shore';
const deniz=new THREE.Mesh(new THREE.PlaneGeometry(4000,4000),denizMat);
deniz.name='0_DENIZ_WEB_PBR';
deniz.rotation.x=-Math.PI/2; deniz.position.y=-0.6;
deniz.castShadow=false; deniz.receiveShadow=true;
deniz.userData.safeShadowCaster=false;
sahne.add(deniz);
renderer.domElement.dataset.waterMaterial=denizMat.type;
renderer.domElement.dataset.waterShader='world-space-dual-normal-v2-shore';
renderer.domElement.dataset.waterRoughness=denizMat.roughness.toFixed(2);

// Eggy Party'deki WaterBody'nin hafif, bağımsız web uyarlaması. Eski deniz
// yüzeyi yalnız taban gölgesi olarak kalır; bu katman görünür dalga, parlak
// sığ su ve oyuncunun etrafında köpük halkası üretir. Kara meshlerine dokunmaz.
const KIMI_SU_U={
  zaman:DENIZ_U.zaman, oyuncu:{value:new THREE.Vector2(99999,99999)},
  oyuncuSuda:{value:0}, yarim:{value:new THREE.Vector2(700,700)},
  karaDoku:{value:KIYI_BOS_DOKU}, karaMin:{value:new THREE.Vector2(0,0)}, karaBoy:{value:new THREE.Vector2(1,1)}
};
const kimiSuMat=createPastelWater(KIMI_SU_U,renderer.domElement.dataset);
const kimiSu=new THREE.Mesh(new THREE.PlaneGeometry(1400,1400,96,96),kimiSuMat);
kimiSu.name='KIMI_WATERBODY_GORUNUR'; kimiSu.rotation.x=-Math.PI/2; kimiSu.position.y=deniz.position.y+0.018;
kimiSu.frustumCulled=false; kimiSu.renderOrder=1; sahne.add(kimiSu);
// WaterBody opak olduğundan eski saydam PBR tabanı kapatılır; teknik ada
// gövdesi suyun içinden gri/kum parçası gibi görünemez.
deniz.visible=false;
// Swimming ripples are now integrated into the water; no opaque white ring mesh.

// Eggy Party gorilinin kaynak sürümü diğer HDD yedeğinde korunur. Bu kopya
// 1024 doku ve kontrollü sadeleştirme ile mobil tarayıcı için hazırlanmıştır.
// Six Seven Park's characters and equipment, separated from its buildings.
let eggyGoril=null,eggyGorilYuzuyor=false,eggyGorilTabanOfset=0;
let eggyController=null,mobileRun=false,lunaRideControls84=null,lunaQA87=null,carControls108=null,pastelTraffic108=null;
let smallIslandProps=null,smallIslandStatTriangles=-1,smallIslandBaseTriangles=0,smallIslandMapLabel='';
let parkProps57=null,cityProps60=null,centralBuildings68=null,lunapark77=null,seasideTimber79=null,lowerPlaza83=null,northwestSports97=null,stadiumCoast99=null,westCourtyard102=null,bottomHomes103=null,northPool104=null,northHomes=null,northwest93=null,northApartments=null,livingEffects107=null;
const smallIslandGround=(x,z,ignoreCar=false)=>{
  if(northPool104?.inBasin(x,z))return northPool104.obstacle(x,z);
  const land=zeminY(x,z),prop=smallIslandProps?.obstacle(x,z),park=parkProps57?.obstacle(x,z),city=cityProps60?.obstacle(x,z);
  const values=[land,prop,park,city,northwest93?.obstacle(x,z),northApartments?.obstacle(x,z),northHomes?.obstacle(x,z),centralBuildings68?.obstacle(x,z),lunapark77?.obstacle(x,z),seasideTimber79?.height(x,z),lowerPlaza83?.obstacle(x,z),northwestSports97?.obstacle(x,z),stadiumCoast99?.obstacle(x,z),westCourtyard102?.obstacle(x,z),bottomHomes103?.obstacle(x,z),northPool104?.obstacle(x,z),ignoreCar?null:pastelTraffic108?.obstacle(x,z)].filter(v=>v!=null);return values.length?Math.max(...values):null;
};
const parkEnvironment=()=>({ground:smallIslandGround,water:(x,z)=>northPool104?.contains(x,z)?northPool104.isWater(x,z):(northwest93?.ground(x,z)!=null||northHomes?.ground(x,z)!=null||bottomHomes103?.ground(x,z)!=null||westCourtyard102?.ground(x,z)!=null||stadiumCoast99?.ground(x,z)!=null||lowerPlaza83?.ground(x,z)!=null||seasideTimber79?.height(x,z)!=null||cityProps60?.obstacle(x,z)!=null||parkProps57?.obstacle(x,z)!=null)?false:sudaMi(x,z),sea:()=>northPool104?.waterLevelAt(eggyController?.sim.position.x,eggyController?.sim.position.z)??kimiSu.position.y,
  footOffset:()=>eggyGorilTabanOfset,cameraBlockers:()=>[...zeminler,...(northwest93?.cameraBlockers??[]),...(northApartments?.cameraBlockers??[]),...(northHomes?.cameraBlockers??[]),...(cityProps60?.cameraBlockers??[]),...(centralBuildings68?.cameraBlockers??[]),...(lunapark77?.cameraBlockers??[]),...(seasideTimber79?.cameraBlockers??[]),...(lowerPlaza83?.cameraBlockers??[]),...(northwestSports97?.cameraBlockers??[]),...(stadiumCoast99?.cameraBlockers??[]),...(westCourtyard102?.cameraBlockers??[]),...(bottomHomes103?.cameraBlockers??[]),...(northPool104?.cameraBlockers??[])],
  data:renderer.domElement.dataset,scene:sahne,
  cameraGround:smallIslandGround});
// Zemin renkleri temiz pastel kil olarak kalir. Yol, kum ve cime fotografik
// grain/benek bindirilmez; gercek derinligi yalniz geometri, PBR roughness ve
// yumusak isik okutur.
const GRAIN_U=[];
function taneciklendir(){ /* Bilerek devre disi: pastel yuzeyde benek yok. */ }

// Saha cizgileri: doku veya yeni geometri yok; zemin malzemesinin
// fragment shader'inda dunya koordinatindan analitik cizilir. Cizgi
// kalinligi ve saha sinirlari referans fotografla olculen oranlardadir.
function sahaCizgileri(mat,anahtar,govde){
  if(!mat) return;
  mat.userData=mat.userData||{};
  // GLB'de zemin mesh'leri ayni malzemeyi paylasabilir; govde listesi
  // tutulur ki ikinci bolge (orn. ust-pad) birincinin (basketbol) uzerine
  // zincirlenebilsin. Her govde kendi degisken onekiyle cakisir durumdadir.
  mat.userData.sahaCizgi67List=mat.userData.sahaCizgi67List||[];
  if(mat.userData.sahaCizgi67List.some(e=>e.anahtar===anahtar)) return;
  mat.userData.sahaCizgi67List.push({anahtar,govde});
  if(mat.userData.sahaCizgileri67) return;
  mat.userData.sahaCizgileri67=anahtar;
  const onceki=mat.onBeforeCompile;
  mat.onBeforeCompile=(sh)=>{
    if(onceki) onceki(sh);
    const tumGovde=mat.userData.sahaCizgi67List.map(e=>e.govde).join('\n');
    sh.vertexShader=sh.vertexShader
      .replace('#include <common>','#include <common>\nvarying vec3 vSahaDunya;')
      .replace('#include <fog_vertex>','vSahaDunya=(modelMatrix*vec4(transformed,1.0)).xyz;\n#include <fog_vertex>');
    sh.fragmentShader=sh.fragmentShader
      .replace('#include <common>','#include <common>\nvarying vec3 vSahaDunya;')
      .replace('#include <map_fragment>','#include <map_fragment>\n'+tumGovde);
  };
  mat.customProgramCacheKey=()=>'67-saha-cizgi-'+
    mat.userData.sahaCizgi67List.map(e=>e.anahtar).join('+')+
    '-kil'+(mat.userData.kilKenarDerinligi67===undefined?'x':mat.userData.kilKenarDerinligi67.toFixed(3));
}

// Kiyidaki cim plakalarinin kabartma okumasi: referans makette yesil kapak,
// altinda yumusak koyu bir temas bandi, onun da altinda acik kum halkasi
// olarak katman katman yukselir. Gercek kot farki santimetrelerle oldugu icin
// bu kabartma izlenimi tek basina PBR'dan cikmaz. Cozum: cim katmanlarinin
// izdusum maskesi gunes yonune otelemeli orneklendirilir; plakanin golge
// tarafinda (guneybati) kum/toprak uzerine mavisimsi yumusak bant, isik
// tarafinda cok hafif acilma duser. Kum halkasi ayrica su cizgisine
// yaklastikca hafif koyulasir (plaj egimi). Geometri, kot ve mesh listesi
// degismez; maliyet fragment'ta iki doku okumadir. Maske 512 px izdusum +
// kutu bulanikligiyla bir kez yuklemede uretilir.
const KABARTMA_BOS=new THREE.DataTexture(new Uint8Array([0,0,0,255]),1,1);
KABARTMA_BOS.needsUpdate=true;
const KABARTMA_U={doku:{value:KABARTMA_BOS},
  min:{value:new THREE.Vector2(0,0)},boy:{value:new THREE.Vector2(1,1)}};
// R: dolu cim maskesi, G: cim maskesi bulanik (bant), B: dolu ada silueti,
// A: ada silueti bulanik (kum egimi). g: yuzey sinifina gore bant gucu
// (kiyi kumu/kaldirim 1.0; yol sinifi 0.6 — referansta yola dusen iz yumusak).
const kabartmaCimGLSL=(g)=>`
vec2 kbUv67=(vKabDunya.xz-uKabMin)/uKabBoy;
if(kbUv67.x>0.0&&kbUv67.x<1.0&&kbUv67.y>0.0&&kbUv67.y<1.0){
  vec4 kbT67=texture2D(uKabDoku,kbUv67);
  vec4 kbS67=texture2D(uKabDoku,clamp(kbUv67+vec2(0.794,-0.608)*2.6/uKabBoy,0.0,1.0));
  float kbB67=clamp((kbS67.g-kbT67.r)/0.35,0.0,1.0);
  kbB67=kbB67*kbB67*(3.0-2.0*kbB67);
  // Temas bandi kabartmayi okutur ama kumda siyah/mavi bir boya kirigi
  // olusturmaz. Onceki cok koyu 0.32/0.40/0.52 carpanina ek olarak cimin
  // gercek dik kenar golgesi de bindigi icin kavisli koselerde iki kez
  // karariyordu. Sicak, pastel ve sinirli bir temas tonu kullan.
  diffuseColor.rgb=mix(diffuseColor.rgb,diffuseColor.rgb*vec3(0.72,0.70,0.74),kbB67*${(0.68*g).toFixed(3)});
  vec4 kbH67=texture2D(uKabDoku,clamp(kbUv67-vec2(0.794,-0.608)*1.8/uKabBoy,0.0,1.0));
  float kbA67=clamp((kbH67.g-kbT67.r)/0.35,0.0,1.0);
  kbA67=kbA67*kbA67*(3.0-2.0*kbA67);
  diffuseColor.rgb*=1.0+kbA67*${(0.07*g).toFixed(4)};
`;
const KABARTMA_KUM_EK_GLSL=`
  float kbE67=clamp((kbT67.b-kbT67.a)*2.0,0.0,1.0);
  kbE67=kbE67*kbE67*(3.0-2.0*kbE67);
  diffuseColor.rgb*=1.0-kbE67*0.22;`;
function kabartmaBagla(mat,kumEgimi,guc){
  if(!mat) return;
  mat.userData=mat.userData||{};
  if(mat.userData.kabartma67) return;
  const mod=kumEgimi?'kum':'cim';
  const g=guc===undefined?1:guc;
  mat.userData.kabartma67=mod;
  const onceki=mat.onBeforeCompile;
  mat.onBeforeCompile=(sh)=>{
    if(onceki) onceki(sh);
    sh.uniforms.uKabDoku=KABARTMA_U.doku;
    sh.uniforms.uKabMin=KABARTMA_U.min;
    sh.uniforms.uKabBoy=KABARTMA_U.boy;
    sh.vertexShader=sh.vertexShader
      .replace('#include <common>','#include <common>\nvarying vec3 vKabDunya;')
      .replace('#include <fog_vertex>','vKabDunya=(modelMatrix*vec4(transformed,1.0)).xyz;\n#include <fog_vertex>');
    sh.fragmentShader=sh.fragmentShader
      .replace('#include <common>','#include <common>\nuniform sampler2D uKabDoku;\nuniform vec2 uKabMin;\nuniform vec2 uKabBoy;\nvarying vec3 vKabDunya;')
      .replace('#include <map_fragment>','#include <map_fragment>\n'+
        kabartmaCimGLSL(g)+(kumEgimi?KABARTMA_KUM_EK_GLSL:'')+'\n}');
  };
  const oncekiKey=typeof mat.customProgramCacheKey==='function'
    ? mat.customProgramCacheKey.bind(mat):null;
  mat.customProgramCacheKey=()=>'67-kabartma-'+mod+'-g'+g.toFixed(3)+'-'+(oncekiKey?oncekiKey():'std');
}

// Ikinci kabartma dokusu: R=dolu kaldirim maskesi, G=kaldirim bulanik,
// B=dolu cubuk (REF_AYIRICI) maskesi, A=cubuk bulanik. Referansta yalniz
// kiyi cimi degil, kaldirim plakalari da yola/parselle yumusak bir basamak
// golgesiyle ayrilir; cim ustundeki ince citalar da minik bir golge/acilma
// cifti tasir. Geometri yine degismez.
const KABARTMA2_BOS=new THREE.DataTexture(new Uint8Array([0,0,0,255]),1,1);
KABARTMA2_BOS.needsUpdate=true;
const KABARTMA2_U={doku:{value:KABARTMA2_BOS},
  min:{value:new THREE.Vector2(0,0)},boy:{value:new THREE.Vector2(1,1)}};
const KABARTMA2_YOL_GLSL=`
vec2 k2Uv67=(vKab2Dunya.xz-uKab2Min)/uKab2Boy;
if(k2Uv67.x>0.0&&k2Uv67.x<1.0&&k2Uv67.y>0.0&&k2Uv67.y<1.0){
  vec4 k2T67=texture2D(uKab2Doku,k2Uv67);
  vec4 k2S67=texture2D(uKab2Doku,clamp(k2Uv67+vec2(0.794,-0.608)*1.4/uKab2Boy,0.0,1.0));
  float k2B67=clamp((k2S67.g-k2T67.r)/0.30,0.0,1.0);
  k2B67=k2B67*k2B67*(3.0-2.0*k2B67);
  diffuseColor.rgb=mix(diffuseColor.rgb,diffuseColor.rgb*vec3(0.55,0.58,0.64),k2B67*0.55);
`;
const KABARTMA2_CIM_GLSL=`
vec2 k2Uv67=(vKab2Dunya.xz-uKab2Min)/uKab2Boy;
if(k2Uv67.x>0.0&&k2Uv67.x<1.0&&k2Uv67.y>0.0&&k2Uv67.y<1.0){
  // Cimin kendi kapagi kenarda yeniden boyanmaz. Kabartma, komsu kum ve
  // kaldirimdaki yumusak temas bandindan okunur; boylece yesil renk tum
  // yuvarlatilmis koselerde kesintisiz kalir.
  vec4 k2T67=texture2D(uKab2Doku,k2Uv67);
  vec4 k2S67=texture2D(uKab2Doku,clamp(k2Uv67+vec2(0.794,-0.608)*0.9/uKab2Boy,0.0,1.0));
  float k2C67=clamp((k2S67.a-k2T67.b)/0.30,0.0,1.0);
  k2C67=k2C67*k2C67*(3.0-2.0*k2C67);
  diffuseColor.rgb=mix(diffuseColor.rgb,diffuseColor.rgb*vec3(0.55,0.58,0.60),k2C67*0.28);
  vec4 k2H67=texture2D(uKab2Doku,clamp(k2Uv67-vec2(0.794,-0.608)*0.9/uKab2Boy,0.0,1.0));
  float k2A67=clamp((k2H67.a-k2T67.b)/0.30,0.0,1.0);
  // No painted divider highlight: use the physical edge.
`;
const KABARTMA2_CUBUK_GLSL=`
vec2 k2Uv67=(vKab2Dunya.xz-uKab2Min)/uKab2Boy;
if(k2Uv67.x>0.0&&k2Uv67.x<1.0&&k2Uv67.y>0.0&&k2Uv67.y<1.0){
  vec4 k2T67=texture2D(uKab2Doku,k2Uv67);
  float ince67=1.0-smoothstep(0.55,0.85,k2T67.a);
  diffuseColor.rgb=mix(diffuseColor.rgb,diffuseColor.rgb*vec3(0.48,0.56,0.50),ince67);
`;
function kabartmaBagla2(mat,mod2){
  if(!mat) return;
  // Yol kenarindaki fiziksel gri bordur ve onun gercek yan yuzeyi zaten
  // derinligi tasiyor. Kaldirim maskesini yol/parsel boyasina ikinci kez
  // basmak, ozellikle kavislerde bordurun disina tasan uckensel gri-pembe
  // lekeler uretiyordu. Yol boyasi artik kesintisizdir; cim ve ince ayirici
  // kabartmalari aynen korunur.
  if(mod2==='yol') return;
  // Salt QA karsilastirmasi: fiziksel bordur/yan yuz ve normal PBR golgesi
  // yerinde kalirken, kaldirim maskesinden yol yuzeyine eklenen renk bandini
  // tek basina kapat. Normal oyun URL'sinde bu dal hic calismaz.
  if(qaModu && urlParams.get('qa_relief2')==='off') return;
  mat.userData=mat.userData||{};
  if(mat.userData.kabartma2_67) return;
  mat.userData.kabartma2_67=mod2;
  const onceki=mat.onBeforeCompile;
  mat.onBeforeCompile=(sh)=>{
    if(onceki) onceki(sh);
    sh.uniforms.uKab2Doku=KABARTMA2_U.doku;
    sh.uniforms.uKab2Min=KABARTMA2_U.min;
    sh.uniforms.uKab2Boy=KABARTMA2_U.boy;
    sh.vertexShader=sh.vertexShader
      .replace('#include <common>','#include <common>\nvarying vec3 vKab2Dunya;')
      .replace('#include <fog_vertex>','vKab2Dunya=(modelMatrix*vec4(transformed,1.0)).xyz;\n#include <fog_vertex>');
    sh.fragmentShader=sh.fragmentShader
      .replace('#include <common>','#include <common>\nuniform sampler2D uKab2Doku;\nuniform vec2 uKab2Min;\nuniform vec2 uKab2Boy;\nvarying vec3 vKab2Dunya;')
      .replace('#include <map_fragment>','#include <map_fragment>\n'+
        (mod2==='cim'?KABARTMA2_CIM_GLSL:(mod2==='cubuk'?KABARTMA2_CUBUK_GLSL:KABARTMA2_YOL_GLSL))+'\n}');
  };
  const oncekiKey=typeof mat.customProgramCacheKey==='function'
    ? mat.customProgramCacheKey.bind(mat):null;
  mat.customProgramCacheKey=()=>'67-kabartma2-'+mod2+'-'+(oncekiKey?oncekiKey():'std');
}
const FUTBOL_CIZGI_GLSL=`
vec2 sp67=vSahaDunya.xz;
float inX67=step(166.2,sp67.x)*step(sp67.x,199.5);
float inZ67=step(-74.3,sp67.y)*step(sp67.y,-8.5);
float d67=1e6;
if(inX67>0.5&&inZ67>0.5){
  // dis dikdortgen + orta cizgi + merkez cember
  d67=min(d67,min(abs(sp67.x-166.2),abs(sp67.x-199.5)));
  d67=min(d67,min(abs(sp67.y+74.3),abs(sp67.y+8.5)));
  d67=min(d67,abs(sp67.y+41.4));
  d67=min(d67,abs(length(sp67-vec2(182.85,-41.4))-4.6));
  // iki ceza sahasi: 8 m derinlik, 22 m genislik
  for(int k=0;k<2;k++){
    float zc=k==0?-74.3:-8.5;
    float zd=k==0?-66.3:-16.5;
    float bx0=171.85, bx1=193.85;
    if(sp67.x>bx0&&sp67.x<bx1) d67=min(d67,abs(sp67.y-zd));
    if(abs(sp67.y-(zc+zd)*0.5)<4.0) d67=min(d67,min(abs(sp67.x-bx0),abs(sp67.x-bx1)));
  }
}
float fciz67=1.0-smoothstep(0.28,0.50,d67);
diffuseColor.rgb=mix(diffuseColor.rgb,vec3(0.965,0.950,0.948),fciz67*0.92);`;

// Park tepesi (67D_REF_HILL_DOME) gercekte cok sig bir kabartma oldugu icin
// PBR isigi tek basina kubbe gibi okunmuyor. Referanstaki gorunum iki
// shader katmaniyla kurulur: (1) tepenin kendi ustune gunes yonunde
// radyal gradyan (sag-ust aydinlik, sol-alt koyu), (2) cim ve patika
// uzerine dusen yumusak elips temas golgesi. Geometri, kot ve parca
// listesi degismez; maliyet fragment'ta birkac ALU islemidir.
const TEPE_GRADYAN_GLSL=`
vec2 tpP67=vSahaDunya.xz-vec2(140.7,47.0);
float tpR67=clamp(length(tpP67)/14.1,0.0,1.0);
vec2 tpN67=normalize(tpP67+vec2(1e-4,0.0));
float tpY67=dot(tpN67,vec2(0.794,-0.608));
float tpG67=tpY67*sin(3.14159*tpR67*0.90);
diffuseColor.rgb*=1.0+tpG67*0.28;
diffuseColor.rgb=mix(diffuseColor.rgb,diffuseColor.rgb*vec3(0.93,0.89,0.88),clamp(-tpG67,0.0,1.0)*0.55);`;
const TEPE_ZEMIN_GOLGE_GLSL=`
vec2 tgP67=vSahaDunya.xz-vec2(128.4,56.4);
float tgU67=tgP67.x*(-0.794)+tgP67.y*0.608;
float tgV67=tgP67.x*0.608+tgP67.y*0.794;
float tgE67=length(vec2(tgU67/16.5,tgV67/12.0));
float tgM67=1.0-smoothstep(0.22,1.0,tgE67);
diffuseColor.rgb*=1.0-tgM67*0.22;`;

// Bati plazanin ortasindaki basketbol kortu: referanstaki gibi krem
// cerceveli yesil kort ve beyaz cizgiler, futbol sahasiyla ayni analitik
// teknikle 5_PARSEL_ZEMIN uzerine cizilir. Plazanin kotu ve geometrisi
// degismez; kort merkezi (-56,-36), pad 40x23 m, oyun alani 33x17 m.
const BASKETBOL_GLSL=`
vec2 bp67=vSahaDunya.xz-vec2(-56.0,-36.0);
vec2 ba67=abs(bp67);
float padD67=length(max(ba67-vec2(17.0,8.5),0.0));
float pad67=1.0-smoothstep(2.7,3.3,padD67);
float kortD67=length(max(ba67-vec2(15.4,6.8),0.0));
float kort67=1.0-smoothstep(2.0,2.6,kortD67);
float bd67=1e6;
bd67=min(bd67,abs(ba67.x-16.5));
bd67=min(bd67,abs(ba67.y-8.5));
bd67=min(bd67,abs(bp67.x));
bd67=min(bd67,abs(length(bp67)-2.3));
for(int k=0;k<2;k++){
  float s67=k==0?-1.0:1.0;
  float ex67=s67*16.5;
  if(ba67.y<3.05) bd67=min(bd67,abs(bp67.x-(ex67-s67*7.0)));
  float kk67=(bp67.x-ex67)*s67;
  if(kk67>-7.0&&kk67<0.0) bd67=min(bd67,abs(ba67.y-3.0));
  bd67=min(bd67,abs(length(bp67-vec2(ex67-s67*7.0,0.0))-2.3));
  float d3n67=abs(length(bp67-vec2(ex67-s67*1.7,0.0))-7.7);
  if(s67*(bp67.x-(ex67-s67*1.7))<0.0) bd67=min(bd67,d3n67);
}
float cizgi67=(1.0-smoothstep(0.22,0.42,bd67))*step(ba67.x,16.7)*step(ba67.y,8.7);
diffuseColor.rgb=mix(diffuseColor.rgb,vec3(0.891,0.820,0.766),pad67*0.92);
diffuseColor.rgb=mix(diffuseColor.rgb,vec3(0.375,0.430,0.205),kort67);
diffuseColor.rgb=mix(diffuseColor.rgb,vec3(0.965,0.955,0.945),cizgi67*0.95);`;

// KB spor parselinin kuzeyindeki iki ust pad: referansta acik mavi-gri
// dolgulu kortlardir, modelde yalniz beyaz kontur mesh'i vardir. Dolgu,
// konturun icinde kalan iki yuvarlatilmis dikdortgenle 5_KB_SPOR_ZEMIN
// uzerine cizilir; parsel geometrisi degismez.
const UST_PAD_GLSL=`
vec2 up67=vSahaDunya.xz;
float ud1_67=length(max(abs(up67-vec2(-48.5,-160.5))-vec2(25.0,9.0),0.0));
float ud2_67=length(max(abs(up67-vec2(-97.3,-160.5))-vec2(13.8,9.0),0.0));
float um67=(1.0-smoothstep(1.6,2.2,ud1_67))+(1.0-smoothstep(1.6,2.2,ud2_67));
um67=clamp(um67,0.0,1.0);
diffuseColor.rgb=mix(diffuseColor.rgb,vec3(0.547,0.596,0.737),um67);`;

// Benek, noise veya normal map kullanmadan maket katmanlarinin gercek dik
// yanlarini ayni rengin biraz koyu tonu olarak okut. Tam yatay kapaklar
// degismez; yalnız mevcut fiziksel kalinlik gorunur olur. Bu nedenle kum,
// yol, kaldirim ve cim ayrimi her gunes yonunde kuzeybati kum omzu kadar net
// kalir, fakat yuzeylerde fotografik doku/lekelenme olusmaz.
function kilKenarDerinligi(mat,guc){
  if(!mat || guc<=0) return;
  mat.userData=mat.userData||{};
  if(mat.userData.kilKenarDerinligi67!==undefined) return;
  mat.userData.kilKenarDerinligi67=guc;
  const onceki=mat.onBeforeCompile;
  mat.onBeforeCompile=(sh)=>{
    if(onceki) onceki(sh);
    const sabit=Math.max(0,Math.min(0.30,guc)).toFixed(4);
    sh.fragmentShader=sh.fragmentShader.replace(
      '#include <normal_fragment_maps>',
      '#include <normal_fragment_maps>\nvec3 kUp67=normalize(mat3(viewMatrix)*vec3(0.0,1.0,0.0));\nfloat kYan67=pow(clamp(1.0-abs(dot(normal,kUp67)),0.0,1.0),0.82);\ndiffuseColor.rgb*=mix(1.0,1.0-'+sabit+',kYan67);'
    );
  };
  mat.customProgramCacheKey=()=>`67-clean-clay-side-depth-v2-${guc.toFixed(3)}`;
}

// Genis duz kapaklari shadow-map'e sokmadan yalniz halihazirda modelde var
// olan GERCEK dik yan yuzlerden temas golgesi uret. Boylece ust yuzlerdeki
// triangulation/kare bant riski sifir kalir; kum, yol ve kaldirim kotlariysa
// kusbakisinda da fiziksel maket katmani olarak okunur. Yardimci mesh renk ve
// depth tamponuna yazmaz, raycast/collision listesine de hic eklenmez.
// Cim ve kum kiyisi icin yukaridaki analitik yumusak bant ile omuzun gercek
// normalleri yeterlidir. Bu katmanlarin dik yuzlerini shadow-map'e de sokmak,
// ozellikle kavislerde ucgen ucgen koyu kirik ve kumda siyah boya izi
// uretiyordu. Yol/kaldirim gibi diger fiziksel basamaklarin gercek yan
// golgeleri korunur.
const DIK_YAN_GOLGE_KAYNAGI=/^(?:5_YOL|6_BORDUR|7_(?:KALDIRIM_TABANI|MERKEZ_KALDIRIM_TABANI|DOGU_SAHIL_KAVSAK_TABANI)|67D_CENTER_FOUNTAIN_RIM|67D_SKATEPARK_BASE)(?:$|[._-])/i;
const dikYanGolgeMat=new THREE.MeshBasicMaterial({
  color:0x000000,side:THREE.DoubleSide,colorWrite:false,depthWrite:false
});
const dikYanDerinlikMat=new THREE.MeshDepthMaterial({
  depthPacking:THREE.RGBADepthPacking,side:THREE.DoubleSide,
  polygonOffset:true,polygonOffsetFactor:1.2,polygonOffsetUnits:4
});
function dikYanGolgeGeometrisi(kaynak){
  const pos=kaynak?.attributes?.position;
  if(!pos) return null;
  const idx=kaynak.index, cikti=[];
  const a=new THREE.Vector3(),b=new THREE.Vector3(),c=new THREE.Vector3();
  const ab=new THREE.Vector3(),ac=new THREE.Vector3(),n=new THREE.Vector3();
  const ucgen=idx?idx.count:pos.count;
  for(let i=0;i+2<ucgen;i+=3){
    const ia=idx?idx.getX(i):i, ib=idx?idx.getX(i+1):i+1, ic=idx?idx.getX(i+2):i+2;
    a.fromBufferAttribute(pos,ia); b.fromBufferAttribute(pos,ib); c.fromBufferAttribute(pos,ic);
    ab.subVectors(b,a); ac.subVectors(c,a); n.crossVectors(ab,ac);
    if(n.lengthSq()<1e-14) continue;
    n.normalize();
    const dikeyAralik=Math.max(a.y,b.y,c.y)-Math.min(a.y,b.y,c.y);
    if(Math.abs(n.y)>0.35 || dikeyAralik<0.00004) continue;
    cikti.push(a.x,a.y,a.z,b.x,b.y,b.z,c.x,c.y,c.z);
  }
  if(!cikti.length) return null;
  const geo=new THREE.BufferGeometry();
  geo.setAttribute('position',new THREE.Float32BufferAttribute(cikti,3));
  geo.computeBoundingBox(); geo.computeBoundingSphere();
  return geo;
}

const isin=new THREE.Raycaster(), asagi=new THREE.Vector3(0,-1,0);
let zeminler=[], hazir=false, DOG=null, DOG_YAW=-Math.PI/2, adaKok=null,terrainSampler=null;
function zeminVurusu(x,z){ if(terrainSampler)return terrainSampler.sample(x,z);isin.set(new THREE.Vector3(x,80,z),asagi);
  const v=isin.intersectObjects(zeminler,false); return v.length?v[0]:null; }
function zeminY(x,z){ const v=zeminVurusu(x,z); return v?v.point.y:null; }
// Teknik 1_TABAN yüzeyi ada toprağı değildir. Player yalnız bu destek
// yüzeyine çıktığında artık gerçek WaterBody alanındadır; böylece köşede
// yüzme pozu görünüp görünür suya geçememe hatası oluşmaz.
function sudaMi(x,z){ const v=zeminVurusu(x,z); if(!v||!v.object.visible)return true;
  if(dryInteriorAt(x/DUNYA_OLCEGI+SABIT_MERKEZ_X,z/DUNYA_OLCEGI+SABIT_MERKEZ_Z,coastGradeData))return false;
  return v.point.y<kimiSu.position.y+0.006; }

const OLCEK_HEDEF=320;
// Harita buyudukce mevcut yollar/karakter orani kuculmamali. Ilk onayli
// modelin 320 m'lik kuzey-guney boyu ve merkezi sabit kalir; yeni kara gercek
// dunya alani olarak yalniz doguya eklenir.
const OLCEK_NATIVE_UZUNLUK=1.7831611037254333;
const DUNYA_OLCEGI=OLCEK_HEDEF/OLCEK_NATIVE_UZUNLUK;
const SABIT_MERKEZ_X=-0.04531264305114746;
const SABIT_MERKEZ_Z=0.012233048677444458;
// Normal oyun dogrudan guneydogudaki goletli parkta baslar. Kaynak ankraj,
// V6 pembe patikanin bati girisinde ve her kenardan guvenli pay birakan
// yurunebilir noktadir. Blender Y ekseni web'de -Z oldugu icin donusum burada
// acik yazilir; harita olcegi degisse bile ayni fiziksel park noktasinda kalir.
const PARK_DOGUS_NATIVE=new THREE.Vector2(0.500,-0.349940);
DOG=[
  (PARK_DOGUS_NATIVE.x-SABIT_MERKEZ_X)*DUNYA_OLCEGI,
  (-PARK_DOGUS_NATIVE.y-SABIT_MERKEZ_Z)*DUNYA_OLCEGI
];
// KALICI KALITE KURALI: genis, duz zemin kapaklari kendi shadow-map'ine
// yazilmaz. Aksi halde PCF derinlik karsilastirmasi, tamamen duz bir yuzeyde
// bile ucleme sinirlarini kare/diyagonal bantlar olarak gosterebilir.
// Zemin yine bina/obje golgelerini alir; yalniz hacimli objeler golge atar.
// Adi zemin islevi anlatan gelecek katmanlar da otomatik olarak bu kurala
// girer; yeni obje eklerken listeyi elle genisletmeye guvenmiyoruz.
const DUZ_ZEMIN=/(?:TABAN|ZEMIN|YOL|CIM|BORDUR|KALDIRIM|OMUZ|AYIRICI|YAYA_GECIDI|CIZGI|GOLET|PARK_TEPE|SU)/i;
const KIYI_KUM_OMUZ=/^67D_KIYI_KUM_OMUZ(?:$|[._-])/i;
// Kuru kumun fiziksel parcalari GLB'de farkli malzeme kimlikleriyle gelir.
// Renk ayni hex'e cekilse bile roughness/envMap gibi kalan PBR farklari,
// parca sinirini sert bir boya kirigi gibi gosterebilir. Bu liste yalniz kuru
// kum yuzeylerini kapsar; ada govdesi, yol, kaldirim, cim ve su dahil degildir.
const KURU_KUM_BOYA=/^(?:1_KUM_TABAN|4_(?:ANA_KUMTABAN|KUMTABAN|KIYI_TOPRAK_TABANI|DOGU_SAHIL_UST_TOPRAK)|67D_KIYI_KUM_OMUZ|67F_ANA_ADA_ALT_KOPRU_KUM_OMUZ)(?:$|[._-])/i;
// Uzun patika ve ince kopru deck'i mobil shadow-map'te kare/diyagonal bant
// uretebilir. Park geometrisi ve PBR derinligi korunur; yalniz kompakt kubbe
// temiz bir temas golgesi atar.
const PARK_KABARTMA=/(?:PARK_PATIKA_UST|PARK_KOPRU_UST|PARK_TEPE)/i;
// Ust kaykay parki zemin degildir. Dusuk profilli olsalar bile bowl, rampa,
// merdiven ve coping parcalari kendi hacimlerini ve kendi GLB malzemelerini
// korur; genel "duz zemin" temizligi bu modellere uygulanamaz.
const UST_SKATEPARK=/^67D_SKATEPARK_/i;
const UST_SKATEPARK_GOLGE_HARIC=/(?:_BASE|_MARK_67|_PERIMETER_SEAM_\d+)$/i;
function genisDuzKapak(mesh){
  const geo=mesh.geometry;
  if(!geo?.attributes?.position) return false;
  if(!geo.boundingBox) geo.computeBoundingBox();
  const boy=new THREE.Vector3(); geo.boundingBox.getSize(boy);
  const yatay=Math.max(boy.x,boy.z), dar=Math.min(boy.x,boy.z);
  // Adi beklenmeyen gelecek bir kaldirim/zemin/ince yatay slab da shadow-map
  // self-acne uretemez. Dikey pano ve hacimli modeller bu profile girmez.
  return yatay>0 && dar>=yatay*0.01 && boy.y<=yatay*0.08;
}
await entryStage(1,'Downloading the Island');
await new Promise((resolve,reject)=>new GLTFLoader().load(`${GLB_DOSYASI}?v=${encodeURIComponent(GLB_REV)}`, async g=>{
 try {
await entryStage(2,'Preparing land and paths');
  const kok=g.scene;
  prepareCoast(kok);
  renderer.domElement.dataset.surfaceSeal=JSON.stringify(sealOpenTerrain(kok));
  renderer.domElement.dataset.bridgeApronSeal=sealBridgeApron(kok)?'closed':'missing';
  renderer.domElement.dataset.roadJoin=JSON.stringify(applyRoadJoin(kok,roadJoinPatch));
  renderer.domElement.dataset.curbPolish=JSON.stringify(applyCurbPolish49(kok,curbMeta49,curbBuffer49));
  renderer.domElement.dataset.sideContinuity50=JSON.stringify(applySideContinuity50(kok,sideMeta50,sideBuffer50));
  renderer.domElement.dataset.coastalRoad56=JSON.stringify(applyCoastalRoad56(kok,roadMeta56,roadBuffer56));
  adaKok=kok;
  let modelMeshSayisi=0, duzZeminSayisi=0, duzZeminGolgeAtan=0, kabartmaGolgeAtan=0;
  let konutMeshSayisi=0, konutGolgeAtan=0;
  let skateparkParcaSayisi=0, skateparkGolgeAtan=0;
  let kumOmuzSayisi=0, kumOmuzGolgeAtan=0;
  let cimDerinlikOnceligi=0;
  const miniBowlMeshleri64=[], buyukSkateparkMeshleri64=[];
  const dikYanGolgeKaynaklari=[];
  kok.traverse(o=>{ if(o.isMesh){
    modelMeshSayisi++;
    // 9_GOLET_MINI eski plan/collision kimligi olarak GLB'de tutulur fakat
    // yeni gercek S-bowl'un ustunu kapatan duz kapak olarak ne render edilir
    // ne de zemin raycast'ine girer. Yeni DECK+BOWL meshleri collision'i alir.
    const eskiMiniKapak=/^9_GOLET_MINI(?:$|[._-])/i.test(o.name);
    // Meydanin merkez diski, altindaki meydanla ayni renk ve ayni eksiksiz
    // footprinttir. Ayrica yukseltilince yalniz tek tarafli siyah bir yarim
    // yay uretir; referansta bu ikinci basamak yoktur. Kaynak kimligi GLB'de
    // QA icin kalir, gorunen/yurunur zemin alttaki kesintisiz meydandir.
    const gereksizMerkezDisk=/^8_DOGU_SAHIL_MERKEZ_DISK(?:$|[._-])/i.test(o.name);
    // Gercek planklar yalniz dekoratif ust kabuktur. Player/raycast tek ve
    // kesintisiz 8_DOGU_SAHIL_ISKELE_UST tasiyicisinda yurur.
    const dekorIskele=/^67D_ISKELE_AHSAP_/i.test(o.name);
    // Park koprusunun korkuluk ve direkleri gorunur dekor olarak kalir;
    // oyuncunun ayak raycast'i yalniz tek parca 8_PARK_KOPRU_UST guvertesine
    // basar. Boylece korkulugun ustune cikma/ani yukseklik olmaz.
    const dekorKopruKorkulugu=/^67D_REF_(?:RAIL|END_POSTS)_/i.test(o.name);
    const skateparkDetayi=UST_SKATEPARK.test(o.name);
    const miniBowlParca64=isMiniBowl64(o);
    const buyukSkateparkParca64=isLargeSkatepark64(o);
    const iskeleParcasi=/ISKELE/i.test(o.name);
    // Referanstaki yumusak catili pastel evler dekoratif hacimdir. Playernun
    // ayak raycast'i pencere/catiya sicrama yapmaz; buna karsilik gercek bina
    // hacmi olarak yumusak golge atar ve zeminden golge alir.
    const konutModeli=/^67H_EV_/i.test(o.name);
    o.visible=!eskiMiniKapak && !gereksizMerkezDisk;
    // Temporary local-only layer isolation for final P5 visual QA.
    const qaGizliKatman=qaModu && urlParams.get('qa_hide');
    if(qaGizliKatman && o.name.includes(qaGizliKatman)) o.visible=false;
    if(!eskiMiniKapak && !gereksizMerkezDisk && !dekorIskele &&
       !dekorKopruKorkulugu && !konutModeli) zeminler.push(o);
    const parkKabartma=PARK_KABARTMA.test(o.name);
    const duzZemin=!iskeleParcasi && !skateparkDetayi && !parkKabartma && !dekorIskele && !konutModeli &&
      (DUZ_ZEMIN.test(o.name) || genisDuzKapak(o));
    if(DIK_YAN_GOLGE_KAYNAGI.test(o.name)) dikYanGolgeKaynaklari.push(o);
    // Park detayini gercek egimli geometri, smooth normal ve PBR okutur.
    // Shadow-map'e yalniz 9_PARK_TEPE yazilir; diger dusuk kabartmalar caster
    // olursa telefonda kare/uckensel yuzey bantlari geri gelir. Mini bowl'un
    // dort parcasi da Codex gibi alici kalir ve shadow-map'e yazmaz.
    o.castShadow=konutModeli || iskeleParcasi || (skateparkDetayi
      ? !UST_SKATEPARK_GOLGE_HARIC.test(o.name)
      : parkKabartma && /^9_PARK_TEPE(?:$|[._-])/i.test(o.name));
    o.receiveShadow=skateparkDetayi || !parkKabartma;
    o.userData.safeShadowCaster=o.castShadow;
    if(miniBowlParca64){
      o.userData.miniBowlFlat64=duzZemin;
      miniBowlMeshleri64.push(o);
    }
    if(buyukSkateparkParca64) buyukSkateparkMeshleri64.push(o);
    if(skateparkDetayi){
      skateparkParcaSayisi++;
      if(o.castShadow) skateparkGolgeAtan++;
    }
    if(konutModeli){
      konutMeshSayisi++;
      if(o.castShadow) konutGolgeAtan++;
    }
    if(KIYI_KUM_OMUZ.test(o.name)){
      kumOmuzSayisi++;
      if(o.castShadow) kumOmuzGolgeAtan++;
    }
    if(parkKabartma && o.castShadow) kabartmaGolgeAtan++;
    if(duzZemin){ duzZeminSayisi++; if(o.castShadow) duzZeminGolgeAtan++; }
    o.geometry.deleteAttribute('color');
    if(o.material){
      const im=o.material.map && o.material.map.image;
      if(im && im.width){
        const cc=document.createElement('canvas'); cc.width=cc.height=8;
        const cx=cc.getContext('2d'); cx.drawImage(im,0,0,8,8);
        const d=cx.getImageData(0,0,8,8).data; let r=0,g2=0,b=0;
        for(let k=0;k<d.length;k+=4){r+=d[k];g2+=d[k+1];b+=d[k+2];}
        const n=d.length/4;
        o.material.color.setRGB(r/n/255,g2/n/255,b/n/255,THREE.SRGBColorSpace);
      }
      o.material.map=null; o.material.vertexColors=false; o.material.flatShading=false;
      o.material.metalness=0.0;
      if(duzZemin && 'clearcoat' in o.material){
        o.material.clearcoat=0;
        o.material.clearcoatRoughness=1;
      }
      o.material.dithering=true;
      if(konutModeli){
        // Blender'da ayri ayri ayarlanan sicak siva, mavi-gri cati, cam ve
        // ahsap tonlarini aynen koru. Temiz maket dili icin doku ekleme.
        o.material.roughness=Math.max(0.46,Math.min(0.94,o.material.roughness));
        o.material.envMapIntensity=/CAM/i.test(o.name)?0.62:0.34;
      }
      else if(skateparkDetayi){
        // Codex'in girilebilir merkez skatepark'i: GLB'nin beton, derin beton,
        // ray, mercan, altin ve mavi malzemelerini oldugu gibi korur.
        applyLargeSkateparkRender64(o);
      }
      else if(/PARK_PATIKA_UST|PARK_KOPRU_UST/i.test(o.name)){
        o.material.color.setHex(0xc3a8ae);
        o.material.roughness=/KOPRU/i.test(o.name)?0.82:0.84;
        o.material.envMapIntensity=/KOPRU/i.test(o.name)?0.46:0.42;
        if('emissive' in o.material){
          o.material.emissive.setHex(0xc3a8ae);
          o.material.emissiveIntensity=/KOPRU/i.test(o.name)?0.10:0.18;
        }
        taneciklendir(o.material,'asfalt',1/2.2,mobil?0.62:0.68,0.24);
        sahaCizgileri(o.material,'tepe-golge',TEPE_ZEMIN_GOLGE_GLSL);
      }
      else if(/ISKELE_AHSAP|DOGU_SAHIL_(?:ISKELE|BANK)/i.test(o.name)){
        // Uc uzak iskele texture'a bagli degildir: gercek plank geometrisi
        // ve uc sicak ahsap tonu mobilde de ayni maket dilini korur.
        const ahsapHex=/AHSAP_ACIK/i.test(o.name)?0xe0b58e:
          (/AHSAP_YAN/i.test(o.name)?0xb9825d:0xd7a77e);
        o.material.color.setHex(ahsapHex);
        o.material.roughness=/AHSAP_YAN/i.test(o.name)?0.88:
          (/AHSAP_ACIK/i.test(o.name)?0.82:0.84);
        o.material.envMapIntensity=/AHSAP_YAN/i.test(o.name)?0.28:0.34;
      }
      else if(/DOGU_SAHIL_(?:MEYDAN|MERKEZ_DISK)/i.test(o.name)){
        // Referanstaki sag kiyinin sicak acik meydani; gri sahil spor zemini
        // ayri 5_SAHIL_GRI_ZEMIN malzemesiyle bilerek degismeden kalir.
        o.material.color.setHex(0xeccec0);
        o.material.roughness=0.90; o.material.envMapIntensity=0.32;
        taneciklendir(o.material,'asfalt',1/2.6,mobil?0.44:0.50,0.20);
        // Referansta meydan uzerine de cim plakalarinin gunes-yonlu bandi
        // duser (donel kavsak C-halkasinin altinda acikca okunuyor).
        kabartmaBagla(o.material,false);
        kabartmaBagla2(o.material,'yol');
      }
      else if(/REF_AYIRICI/i.test(o.name)){
        // Haritadaki tum cimen ayiricilari, genisliginden bagimsiz olarak,
        // kaldirimla ayni sicak acik krem-kil renginde kalir. Onceki genislik
        // maskesi ince guney seritlerini gri-yesil cubuklara ceviriyordu.
        o.material.color.setHex(0xd5c0b3);
        o.material.roughness=0.89; o.material.envMapIntensity=0.39;
        // Mesh zaten cimin icine oturur ve ust kapagi cimden yaklasik 27 mm
        // yukaridadir. Yerel koordinata 0.06 eklemek dunya olceginde 10.8 m
        // havaya kaldiriyordu. Geometriyi oynatmadan yalniz depth onceligi
        // ver; cubuk cimin ustunde otursun ve uzak kamerada kaybolmasin.
        o.material.polygonOffset=true;
        o.material.polygonOffsetFactor=0;
        o.material.polygonOffsetUnits=-2;
        kilKenarDerinligi(o.material,0.04);
      }
      else if(/CIZGI|YAYA_GECIDI/i.test(o.name)){
        // Yaya gecidi boyasi: kirik beyaz, mat ve yuzeye cok yakin.
        o.material.color.setHex(0xfef0f1);
        // Referansta boya, ayni kil malzemenin aydinlik pigmenti gibi okunuyor.
        // Cok dusuk emissive katkisi golgede grilesmesini onler; neon/bloom uretmez.
        if('emissive' in o.material){
          o.material.emissive.setHex(0xfef0f1);
          o.material.emissiveIntensity=0.15;
        }
        o.material.roughness=0.92; o.material.envMapIntensity=0.26;
        // Pist/saha cizgileri tasiyici zeminle birebir ayni kota oturur;
        // sabit depth bias olmadan yarim yamalak pembe okunuyordu.
        o.material.polygonOffset=true;
        o.material.polygonOffsetFactor=0;
        o.material.polygonOffsetUnits=-3;
        // Boya/cizgi katmani da ustundeki cim bandini alir; aksi halde
        // koyu bant icinde bembeyaz serit parcasi kirilmis gibi okunur.
        // Yuzey yol sinifi oldugu icin bant gucu yolla ayni: 0.6.
        kabartmaBagla(o.material,false,0.6);
      }
      else if(/REF_MAIN_WATER_(?:CAP|NECK_CAP)/i.test(o.name)){
        // Dekoratif yumusak su kapagi alttaki gated 9_GOLET_SU ile telefonda
        // birebir ayni tona gelir; iki katman arasinda koyu renk adasi kalmaz.
        o.material.color.setHex(0x9ab0f4);
        o.material.roughness=0.70; o.material.envMapIntensity=0.55;
      }
      else if(/REF_MINI_SKATE_(?:DECK|BOWL|OUTER_RIM|COPING)/i.test(o.name)){
        // Ayni Codex sozlesmesi park icindeki kucuk bowl'a da uygulanir.
        applyMiniBowlRender64(o);
      }
      else if(/GOLET|SU/i.test(o.name)){
        // Büyük gölet şeffaf değildir; alttaki kum triangulation'ı mobilde
        // görünmez ve pastel maket suyu tek, sakin bir renk olarak kalır.
        // Renk artik dis denizle ayni periwinkle ailesinden: park havzasi
        // kiyi bandiyla ayni isikta okunur.
        o.material.color.setHex(0x9ab0f4);
        o.material.roughness=0.70; o.material.envMapIntensity=0.55;
      }
      else if(/PARK_TEPE|REF_HILL_DOME/i.test(o.name)){
        // Referanstaki park tepesi beyaz duz disk degil, sicak kil bir
        // yokustur. Egimli yanlar kil-kenar derinligiyle okunur. Kabartma
        // cok sig oldugundan kubbe hissi gunes yonlu radyal gradyanla
        // guclendirilir; dusen golgesi cim/patika uzerinde ayri katmandir.
        o.material.color.setHex(0xd4c2ad);
        o.material.roughness=0.80; o.material.envMapIntensity=0.42;
        kilKenarDerinligi(o.material,0.12);
        if(/REF_HILL_DOME/i.test(o.name)) sahaCizgileri(o.material,'tepe-gradyan',TEPE_GRADYAN_GLSL);
      }
      else if(/CIMEN_KOYU/i.test(o.name)){
        o.material.color.setHex(0xb6be9b);
        o.material.roughness=0.92; o.material.envMapIntensity=0.18;
        // 1.8 cm aralikli tasiyici ile uzak kameradaki z-fighting'i, dik
        // yuzeylerde slope kaynakli kirik uretmeden yalniz sabit depth bias ile kes.
        o.material.polygonOffset=true;
        o.material.polygonOffsetFactor=0;
        o.material.polygonOffsetUnits=-2;
        cimDerinlikOnceligi++;
        kilKenarDerinligi(o.material,0.10);
        taneciklendir(o.material,'cim',1/2.8,mobil?0.92:0.98,0.36);
        kabartmaBagla2(o.material,'cim');
      }
      else if(/CIM_TASIYICI/i.test(o.name)){
        // Spor parsellerindeki görünür krem apron, adına rağmen çim değildir.
        // Bu dal genel /CIM/ eşleşmesinden önce kalmalı; aksi halde mobilde
        // referanstaki sıcak kaldırım çerçevesi yeşile boyanır.
        o.material.color.setHex(0xd5c0b3);
        o.material.roughness=0.74; o.material.envMapIntensity=0.44;
        kilKenarDerinligi(o.material,0.14);
        taneciklendir(o.material,'asfalt',1/1.8,mobil?0.44:0.48,0.18);
        // Spor parseli apronu da cime bitisik kaldırım ailesindendir; ayni
        // beyaz kirigin burada tekrarlamamasi icin cim bandi baglanir.
        kabartmaBagla(o.material,false);
      }
      else if(/CIM/i.test(o.name)){
        // Referans ekran medyanı #C5C08F; ACES sonrası aynı tona çıkan sıcak ada tabanı.
        o.material.color.setHex(0xdbe0af);
        o.material.roughness=0.92; o.material.envMapIntensity=0.18;
        // Kucuk adadaki stub yolun ustune fiziksel olarak biner; onu one
        // cekmek yol kenarini kirar. Diger gercek cimen kapaklarinda yalniz
        // sabit units bias kullanilir, renk/doku/geometri degismez.
        if(!/^8_CIM_STUB_DOLGU(?:$|[._-])/i.test(o.name)){
          o.material.polygonOffset=true;
          o.material.polygonOffsetFactor=0;
          o.material.polygonOffsetUnits=-2;
          cimDerinlikOnceligi++;
        }
        kilKenarDerinligi(o.material,0.10);
        taneciklendir(o.material,'cim',1/2.8,mobil?0.92:0.98,0.36);
        sahaCizgileri(o.material,'tepe-golge',TEPE_ZEMIN_GOLGE_GLSL);
        kabartmaBagla2(o.material,'cim');
      }
      else if(/DOGU_SAHIL_HALKASI/i.test(o.name)){
        // Donel kavsagin ic halkasi referansta yesil cimdir; GLB'deki beyaz
        // varsayilan maket dilini bozuyordu.
        o.material.color.setHex(0xdbe0af);
        o.material.roughness=0.92; o.material.envMapIntensity=0.18;
        kilKenarDerinligi(o.material,0.10);
        kabartmaBagla2(o.material,'cim');
      }
      else if(/KB_ATLETIZM_ZEMIN/i.test(o.name)){
        // Referanstaki somon atletizm pisti.
        o.material.color.setHex(0xe2a493);
        o.material.roughness=0.90; o.material.envMapIntensity=0.22;
        // Pist cimden alcak kotlu oldugu icin referansta ic oval yesilin
        // bandi pist yuzeyine de duser.
        kabartmaBagla(o.material,false);
      }
      else if(/KB_BEYZBOL_KIL_ZEMIN/i.test(o.name)){
        // Beyzbol ic sahasi sicak kil/tandir.
        o.material.color.setHex(0xe8c89c);
        o.material.roughness=0.92; o.material.envMapIntensity=0.20;
        kabartmaBagla(o.material,false);
      }
      else if(/SAHIL_GRI_ZEMIN/i.test(o.name)){
        // Referanstaki dogu sahil spor parseli gri beton degil, beyaz
        // cizgili yesil futbol sahasidir. Cizgiler shader'da analitik
        // cizilir; parsel geometrisi ve kotu degismez.
        o.material.color.setHex(0xc7cb98);
        o.material.roughness=0.90; o.material.envMapIntensity=0.20;
        kilKenarDerinligi(o.material,0.08);
        sahaCizgileri(o.material,'futbol',FUTBOL_CIZGI_GLSL);
      }
      else if(/^1_KUM_TABAN(?:$|[._-])/i.test(o.name)){
        // Eski alt kum ailesi genel 1_TABAN kuralina da, 4_KUMTABAN kuralina
        // da girmiyordu ve gri varsayilana dusuyordu. Gorunur kuru kisim varsa
        // diger sahil omuzlariyla ayni sicak pastel ailede kalir.
        o.material.color.setHex(KIYI_KUM_RENGI);
        o.material.roughness=0.88; o.material.envMapIntensity=0.30;
        kilKenarDerinligi(o.material,0.09);
        kabartmaBagla(o.material,true);
      }
      else if(/^1_TABAN/i.test(o.name)){
        // Bu govde su cizgisinin altina iner; kuru sahil kumunun sicak tonu
        // su altina yayilmasin diye ayri, notr ada-govde rengi kullanir.
        o.material.color.setHex(ADA_GOVDE_RENGI);
        o.material.roughness=0.86; o.material.envMapIntensity=0.26;
        kilKenarDerinligi(o.material,0.14);
        taneciklendir(o.material,'asfalt',1/3.2,mobil?0.28:0.32,0.14);
      }
      else if(/DOGU_SAHIL_UST_TOPRAK/i.test(o.name)){
        // Dogu sahilindeki acikta kalan ust dudak kuru kumla ayni tondadir.
        o.material.color.setHex(KIYI_KUM_RENGI);
        o.material.roughness=0.88; o.material.envMapIntensity=0.30;
        kilKenarDerinligi(o.material,0.09);
        taneciklendir(o.material,'asfalt',1/3.2,mobil?0.76:0.82,0.28);
        kabartmaBagla(o.material,true);
      }
      else if(/KIYI_TOPRAK/i.test(o.name)){
        // Kullanici onayli kiyida cimin alti bastan sona ayni sicak kumdur.
        // Bu tasiyici ayri bir gri kontur veya ikinci koyu cizgi uretmez;
        // gercek kotu cimin yumusak yan yuzeyi ve PBR isigi okumaya devam eder.
        o.material.color.setHex(KIYI_TOPRAK_RENGI);
        o.material.roughness=0.88; o.material.envMapIntensity=0.26;
        kabartmaBagla(o.material,true);
      }
      else if(/YOL|PARSEL_ZEMIN|KB_SPOR_ZEMIN/i.test(o.name)){
        o.material.color.setHex(0xddc0be);
        o.material.roughness=0.88; o.material.envMapIntensity=0.20;
        kilKenarDerinligi(o.material,0.08);
        taneciklendir(o.material,'asfalt',1/2.2,mobil?0.84:0.90,0.32);
        // Bati plazanin bos parseli referanstaki basketbol kortunu tasir;
        // kort ve cizgiler futbol sahasiyla ayni analitik teknikle cizilir.
        if(/^5_PARSEL_ZEMIN(?:$|[._-])/i.test(o.name))
          sahaCizgileri(o.material,'basketbol',BASKETBOL_GLSL);
        // KB spor parselinin kuzey uclarindaki iki ust pad referanstaki
        // mavi-gri kort dolgusunu alir.
        if(/^5_KB_SPOR_ZEMIN(?:$|[._-])/i.test(o.name))
          sahaCizgileri(o.material,'ust-pad',UST_PAD_GLSL);
        // Yol/parsel yuzeyi cimden alcak kottadir; referansta kiyi ciminin
        // ve parsel cimlerinin golge bandi yola da duser ama cok yumusak
        // (orn. kucuk ada yol cepleri referansta temiz somon okunur).
        // 0.6 guc: cim-kose ceplerinde ust uste binen bant koyu leke yapmaz.
        kabartmaBagla(o.material,false,0.6);
        kabartmaBagla2(o.material,'yol');
      }
      else if(/MERKEZ_KALDIRIM_TABANI/i.test(o.name)){
        // Merkez plaza dis kaldırımlardan ayrı tonda: soluk pembe-lila.
        o.material.color.setHex(0xe6cbca);
        o.material.roughness=0.80; o.material.envMapIntensity=0.36;
        kilKenarDerinligi(o.material,0.10);
        // Cimle bitisik kaldırım seridi gunes-yonlu kabartma bandinin icinde
        // kalir; kum egimi yoktur, yalniz cim gölge bandi okunur.
        kabartmaBagla(o.material,false);
      }
      else if(/BORDUR|KALDIRIM/i.test(o.name)){
        // Referansta yol kenari cercevesi beyaz degil, yoldan bir tik acik
        // SICAK gri-bezj (216,191,186). Onceki ton gunesten beyaz okunuyordu;
        // doygunlugu dusuruldu, kirmizi kanat korundu, specular kirpildi.
        o.material.color.setHex(0xd8b7ae);
        o.material.roughness=0.84; o.material.envMapIntensity=0.34;
        if('emissive' in o.material){
          o.material.emissive.setHex(0x000000);
          o.material.emissiveIntensity=0;
        }
        kilKenarDerinligi(o.material,0.14);
        taneciklendir(o.material,'asfalt',1/1.8,mobil?0.44:0.48,0.18);
        // Guney kiyida cim ile plaj arasinda kalan krem kaldırım seridi
        // banda katilmadan bembeyaz kaliyordu; kullanici bu beyaz kirigin
        // golgelenmesini istedi. Kum egimi yok, yalniz cim bandi baglanir.
        kabartmaBagla(o.material,false);
      }
      else if(/^4_(?:ANA_)?KUMTABAN(?:$|[._-])/i.test(o.name)){
        // Yalniz su ustundeki iki fiziksel kum tasiyicisi sicak sahil tonunu
        // alir. Genel /KUM/ eslesmesi ileride su-alti bir dugumu da boyardi.
        o.material.color.setHex(KIYI_KUM_RENGI);
        o.material.roughness=0.88; o.material.envMapIntensity=0.30;
        kilKenarDerinligi(o.material,0.09);
        taneciklendir(o.material,'asfalt',1/3.2,mobil?0.76:0.82,0.28);
        kabartmaBagla(o.material,true);
      }
      else if(KIYI_KUM_OMUZ.test(o.name)){
        // Dış kum profili bir boya/tek kontur değildir: beş gerçek geometri
        // halkasının normalleri ışığı yumuşakça döndürür. Bu yüzden omuz kendi
        // shadow-map'ine yazılmaz ve kil-kenar karartması almaz. Buna karsilik
        // plaj egimi ve cim bandi konum bazli oldugundan halka normalleriyle
        // cakismaz; referanstaki disa dogru koyulasan sahil icin baglanir.
        o.material.color.setHex(KIYI_KUM_RENGI);
        o.material.roughness=0.91; o.material.envMapIntensity=0.32;
        kabartmaBagla(o.material,true);
      }
      else if(/CENTER_FOUNTAIN/i.test(o.name)){
        // Referanstaki fiskiye: dis halka krem-beyaz, ic havza soluk pembe.
        const havza=/BASIN/i.test(o.name);
        o.material.color.setHex(havza?0xe6ccc4:0xf2ebdf);
        o.material.roughness=0.85; o.material.envMapIntensity=0.30;
        kilKenarDerinligi(o.material,0.12);
      }
      else if(/KAVSAK_TABANI|DOGU_SAHIL_GIRIS/i.test(o.name)){
        // Donel kavsak apronu ve sahil giris plakasi GLB rengiyle kalir;
        // onceki davranistaki gibi tam mat. Cim halkasinin golge bandi bu
        // plakalara da duser; bagli degilken bant halkasi beyaz kirilirdi.
        o.material.roughness=1.0;
        kabartmaBagla(o.material,false);
      }
      else { o.material.roughness=1.0; }
      o.material.needsUpdate=true;
    }
  }});
  // Tum kuru kum parcalari ana kumun AYNI material nesnesini kullanir.
  // Boylece bir yanda surekli acik, diger yanda surekli koyu kalan boya
  // adalari olusmaz. Geometri/normaller, fiziksel kabarti, shadow-map ve
  // analitik temas golgesi degistirilmez; egimli omuz yine isikla okunur.
  const anaKumBoyaNesnesi=zeminler.find(mm=>
    /^4_ANA_KUMTABAN(?:$|[._-])/i.test(mm.name));
  let kumBoyaMeshSayisi=0;
  const eskiKumMalzemeleri=new Set();
  if(anaKumBoyaNesnesi && anaKumBoyaNesnesi.material &&
     !Array.isArray(anaKumBoyaNesnesi.material)){
    const ortakKumBoyasi=anaKumBoyaNesnesi.material;
    for(const mm of zeminler){
      if(!KURU_KUM_BOYA.test(mm.name) || !mm.material || Array.isArray(mm.material)) continue;
      eskiKumMalzemeleri.add(mm.material.uuid);
      mm.material=ortakKumBoyasi;
      kumBoyaMeshSayisi++;
    }
    renderer.domElement.dataset.sandPaintMode='shared-main-sand-material-v1';
    renderer.domElement.dataset.sandPaintMeshCount=String(kumBoyaMeshSayisi);
    renderer.domElement.dataset.sandPaintSourceMaterialCount=String(eskiKumMalzemeleri.size);
    renderer.domElement.dataset.sandPaintColor='#'+ortakKumBoyasi.color.getHexString();
  } else hata('ana kum boyasi bulunamadi; kum boya birligi uygulanamadi');
  renderer.domElement.dataset.curbFinish=unifyCurbFinish(kok)?'shared':'missing';
  let kenarGolgeAtan=0, kenarGolgeUcgeni=0;
  const kenarGolgeAdlari=[];
  const roundedCurbShadows49=[];
  for(const kaynak of dikYanGolgeKaynaklari){
    if(CURB49_NAMES.includes(kaynak.name)){
      // Closed, rounded slabs use backface depth; no coincident open side helper.
      const shadow49=installCurbShadows49(kok,[kaynak.name]);
      roundedCurbShadows49.push(shadow49);
      kenarGolgeAtan+=shadow49.count;kenarGolgeUcgeni+=shadow49.triangles;
      kenarGolgeAdlari.push(kaynak.name);
      continue;
    }
    const geo=dikYanGolgeGeometrisi(kaynak.geometry);
    if(!geo) continue;
    const yardimci=new THREE.Mesh(geo,dikYanGolgeMat);
    yardimci.name=`67D_DIK_YAN_GOLGE_${kaynak.name}`;
    yardimci.castShadow=true; yardimci.receiveShadow=false;
    yardimci.customDepthMaterial=dikYanDerinlikMat;
    yardimci.userData.safeShadowCaster=true;
    yardimci.raycast=()=>{};
    kaynak.add(yardimci);
    kenarGolgeAtan++;
    kenarGolgeAdlari.push(kaynak.name);
    kenarGolgeUcgeni+=geo.attributes.position.count/3;
  }
  const coastGrade=addDryInterior(kok,zeminler,coastGradeData);
  renderer.domElement.dataset.coastGrade='v21-raised-interior';
  renderer.domElement.dataset.coastAddedTriangles=coastGrade.addedTriangles;
  renderer.domElement.dataset.waterWaveAmplitude='0.012';
  const b=new THREE.Box3().setFromObject(kok).getSize(new THREE.Vector3());
  kok.scale.setScalar(DUNYA_OLCEGI);
  const k2=new THREE.Box3().setFromObject(kok);
  kok.position.sub(new THREE.Vector3(
    SABIT_MERKEZ_X*DUNYA_OLCEGI,
    k2.min.y,
    SABIT_MERKEZ_Z*DUNYA_OLCEGI
  ));
  sahne.add(kok); kok.updateMatrixWorld(true);
  configureInteriorWater(KIMI_SU_U,kok,coastGradeData);
  renderer.domElement.dataset.waterInteriorProtection='v21-inset-footprint';
  // Salt okunur QA koordinatlari: yakin plan kadrajlari tahminle degil,
  // dogrudan canli mesh merkezleriyle acilir. Normal oyun davranisini etkilemez.
  if(qaModu){
    const qaMerkez=(regex,anahtar)=>{
      const nesne=zeminler.find(mm=>regex.test(mm.name));
      if(!nesne) return;
      const merkez=new THREE.Box3().setFromObject(nesne).getCenter(new THREE.Vector3());
      renderer.domElement.dataset[anahtar]=[merkez.x,merkez.y,merkez.z]
        .map(v=>v.toFixed(3)).join(',');
    };
    qaMerkez(/^8_DOGU_SAHIL_MERKEZ_DISK(?:$|[._-])/i,'qaEastDiskCenter');
    qaMerkez(/^4_KIYI_TOPRAK_TABANI(?:$|[._-])/i,'qaCoastalSoilCenter');
    qaMerkez(/^8_REF_AYIRICI(?:$|[._-])/i,'qaDividerCenter');
  }
  // Eski sabit -0.6 m deniz, 1_TABAN'in teknik tasiyici kalinligini tamamen
  // acikta birakiyor ve adayi koyu karton blok gibi gosteriyordu. Deniz,
  // 1_TABAN ust kapaginin hemen ALTINDA kalir: ada icindeki bos parselleri
  // basmaz, buna karsilik su altindaki kalin teknik govdeyi gizler. Plan,
  // collision ve kum footprint'i degismez; su ustunde yalniz sicak kum omzu
  // ile cok ince bir notr govde cizgisi okunur.
  const anaKum=zeminler.find(mm=>/^4_ANA_KUMTABAN(?:$|[._-])/i.test(mm.name));
  const adaKapagi=zeminler.find(mm=>/^1_TABAN(?:$|[._-])/i.test(mm.name));
  if(anaKum && adaKapagi){
    const kumUst=new THREE.Box3().setFromObject(anaKum).max.y;
    adaKapagi.visible=false;
    const adaBatirma=2.15;
    kok.position.y-=adaBatirma; kok.updateMatrixWorld(true);
    // Görünür WaterBody, batırılmış kum kapağının TAM 2 cm altındadır.
    // kimiSu, gizli deniz referansından +1.8 cm yukarıda olduğu için referans
    // düzlemi 3.8 cm aşağı bağlanır. Dalga tepeleri kıyıya hafifçe girer.
    const batikKumUst=kumUst-adaBatirma;
    renderer.domElement.dataset.interiorWaveClearance=(0.0011*DUNYA_OLCEGI+.020-.012).toFixed(3);
    deniz.position.y=batikKumUst-0.038;
    kimiSu.position.y=deniz.position.y+0.018;
    renderer.domElement.dataset.oceanLevel=kimiSu.position.y.toFixed(3);
    renderer.domElement.dataset.islandWaterSink=adaBatirma.toFixed(2);
    renderer.domElement.dataset.drySandLipHeight=(batikKumUst-kimiSu.position.y).toFixed(3);
  } else hata('kum/taban katmani bulunamadi; deniz seviyesi baglanamadi');
  // Apply after final island lowering and before Kimi's divider/AO mask bake.
  renderer.domElement.dataset.smallIslandWalls=JSON.stringify(applySmallIslandWalls48({root:kok,meshes:zeminler,patch:wallPatch48}));
  renderer.domElement.dataset.smallIslandMatch55=JSON.stringify(applySmallIslandMatch55(kok,dividerMeta55,dividerBuffer55));
  renderer.domElement.dataset.southeastDivider49=JSON.stringify(shortenSoutheastDivider49(kok));
  const [parkMeta57,parkBuffer57]=await Promise.all([islandFetch('./park-terrain-v57.json?v=1').then(r=>{if(!r.ok)throw Error('Park terrain metadata');return r.json();}),islandFetch('./park-terrain-v57.bin?v=1').then(r=>{if(!r.ok)throw Error('Park terrain geometry');return r.arrayBuffer();})]);
  renderer.domElement.dataset.parkTerrain57=JSON.stringify(applyParkTerrain57(kok,parkMeta57,parkBuffer57));
  renderer.domElement.dataset.parkPlinthGround57=JSON.stringify(applyParkPlinthGround57(kok));
  const [pathMeta57,pathBuffer57]=await Promise.all([islandFetch('./park-path-polish57.json?v=1').then(r=>{if(!r.ok)throw Error('Park path metadata');return r.json();}),islandFetch('./park-path-polish57.bin?v=1').then(r=>{if(!r.ok)throw Error('Park path geometry');return r.arrayBuffer();})]);
  renderer.domElement.dataset.parkPathPolish57=JSON.stringify(applyParkPathPolish57(kok,pathMeta57,pathBuffer57));
  const entryMeta57=await islandFetch('./park-entry-caps57.json?v=1').then(r=>{if(!r.ok)throw Error('Park entrance metadata');return r.json();});
  const {addedWalkMeshes:entryWalkMeshes57,...entryReport57}=applyParkEntryCaps57(kok,entryMeta57,'kimi');
  zeminler.push(...entryWalkMeshes57);
  renderer.domElement.dataset.parkEntryCaps57=JSON.stringify(entryReport57);
  const [ringMeta63,ringBuffer63]=await Promise.all([islandFetch('./park-ring-v63.json?v=L1g2').then(r=>{if(!r.ok)throw Error('Park ring metadata');return r.json();}),islandFetch('./park-ring-v63.bin?v=L1g2').then(r=>{if(!r.ok)throw Error('Park ring geometry');return r.arrayBuffer();})]);
  renderer.domElement.dataset.parkRing63=JSON.stringify(applyParkRing63(kok,ringMeta63,ringBuffer63));
  const {addedWalkMeshes:roadSealWalkMeshes64,...roadSealReport64}=applyRoadSeal64(kok,roadSealMeta64,roadSealBuffer64);
  zeminler.push(...roadSealWalkMeshes64);
  renderer.domElement.dataset.roadSeal64=JSON.stringify(roadSealReport64);
  renderer.domElement.dataset.parkPond65=JSON.stringify(applyParkPond65(kok,parkPondMeta65,parkPondBuffer65));
  const shoreMeta66=await islandFetch('./park-shore-v66.json?v=2').then(r=>{if(!r.ok)throw Error('Park shore metadata');return r.json();});
  renderer.domElement.dataset.parkShore66=JSON.stringify(applyParkShore66(kok,shoreMeta66));
  const photoMeta67=await islandFetch('./fixes-v67.json?v=7').then(r=>{if(!r.ok)throw Error('Photo67 metadata');return r.json();});
  const {addedWalkMeshes:photoWalk67,...photoReport67}=applyPhotoFixes67(kok,photoMeta67);
  zeminler.push(...photoWalk67);
  renderer.domElement.dataset.photoFixes67=JSON.stringify(photoReport67);
  const {applyRoundaboutCurb90}=await import('./roundabout-curb-v90.js?v=90');
  renderer.domElement.dataset.roundaboutCurb90=JSON.stringify(applyRoundaboutCurb90(kok));
  const {applySurfaceJoins110}=await import('./surface-joins-v110.js?v=110.2');
  renderer.domElement.dataset.surfaceJoins110=JSON.stringify(applySurfaceJoins110(kok));
  // Refresh only copied side casters already enabled by this map's policy:
  // The segmented park-path depth helper is excluded: its copied vertical
  // triangles made a jagged dark PCF stripe on the upper pond's water/rim.
  for(const name57 of ['3_CIMEN','8_PARK_PATIKA_UST']){
    if(!DIK_YAN_GOLGE_KAYNAGI.test(name57))continue;
    const source57=kok.getObjectByName(name57),helper57=source57?.getObjectByName('67D_DIK_YAN_GOLGE_'+name57);
    const sides57=dikYanGolgeGeometrisi(source57?.geometry);
    if(!helper57||!sides57)throw Error('Park path side shadow source '+name57);
    kenarGolgeUcgeni+=(sides57.attributes.position.count-helper57.geometry.attributes.position.count)/3;
    helper57.geometry.dispose();helper57.geometry=sides57;
  }
  const curbRecord57=roundedCurbShadows49.findIndex(r=>r.names.includes('6_BORDUR'));
  if(curbRecord57<0)throw Error('Park path curb shadow source');
  const curbShadow57=installCurbShadows49(kok,['6_BORDUR']);
  kenarGolgeUcgeni+=curbShadow57.triangles-roundedCurbShadows49[curbRecord57].triangles;
  roundedCurbShadows49[curbRecord57]=curbShadow57;
  renderer.domElement.dataset.parkPathShadowRefresh57='curb-only-no-path-side-caster-v65';
  // Futbol sahasının batısındaki su görünen dikdörtgen, komşu parselin
  // alt yapısı uzatılarak kapatılır. Ekstra çim/stadyum parçası üretilmez.
  renderer.domElement.dataset.boslukDolgu='v21-kaynak-kontur-yol-haric';
  // Kiyi temas golgesi dokusu: su cizgisindeki katmanlarin dis sinirini
  // 512 px'lik bir izdusum kanvasina cizer, JS kutu bulanikligiyla suya
  // dogru yumusatir. Dis bant = (bulanik - dolu) alanidir: ada govdesi hic
  // kararmaz, yalniz kiyiya sarilan su. Geometri dokunulmaz; mesh'ler yalniz
  // okunur. Yalniz YUKARI bakan ucgenler cizilir: omzun ust uste cakisan
  // ters sarmalli cift yuzeyi nonzero dolgu kuralinda birbirini sifirliyor,
  // tek fill() bos cikiyordu.
  const kiyiKaynaklari=zeminler.filter(mm=>
    KIYI_KUM_OMUZ.test(mm.name) ||
    /^4_(?:ANA_)?KUMTABAN(?:$|[._-])/i.test(mm.name) ||
    /^1_TABAN(?:$|[._-])/i.test(mm.name));
  if(kiyiKaynaklari.length){
    const K=512, pay=26;
    const kutu=new THREE.Box3().setFromObject(kok);
    const minX=kutu.min.x-pay, minZ=kutu.min.z-pay;
    const boyX=(kutu.max.x-kutu.min.x)+2*pay, boyZ=(kutu.max.z-kutu.min.z)+2*pay;
    const cnv=document.createElement('canvas'); cnv.width=cnv.height=K;
    const cx2=cnv.getContext('2d',{willReadFrequently:true});
    cx2.fillStyle='#000'; cx2.fillRect(0,0,K,K);
    cx2.fillStyle='#fff'; cx2.beginPath();let rasterBatch=0;
    const ta=new THREE.Vector3(), tb=new THREE.Vector3(), tc=new THREE.Vector3(),
          tn=new THREE.Vector3(), te=new THREE.Vector3();
    let cizilenTri=0;
    for(const kaynak of kiyiKaynaklari){
      const pos=kaynak.geometry.attributes.position, idx=kaynak.geometry.index;
      const nTri=idx?idx.count:pos.count;
      for(let i=0;i+2<nTri;i+=3){
        const ia=idx?idx.getX(i):i, ib=idx?idx.getX(i+1):i+1, ic=idx?idx.getX(i+2):i+2;
        ta.fromBufferAttribute(pos,ia).applyMatrix4(kaynak.matrixWorld);
        tb.fromBufferAttribute(pos,ib).applyMatrix4(kaynak.matrixWorld);
        tc.fromBufferAttribute(pos,ic).applyMatrix4(kaynak.matrixWorld);
        tn.subVectors(tb,ta); te.subVectors(tc,ta); tn.cross(te);
        if(tn.y<=0) continue;
        cx2.moveTo((ta.x-minX)/boyX*K,(ta.z-minZ)/boyZ*K);
        cx2.lineTo((tb.x-minX)/boyX*K,(tb.z-minZ)/boyZ*K);
        cx2.lineTo((tc.x-minX)/boyX*K,(tc.z-minZ)/boyZ*K);
        cx2.closePath();if(++rasterBatch%512===0){cx2.fill();cx2.beginPath();}
        cizilenTri++;
      }
    }
    cx2.fill();
    const dolu=cx2.getImageData(0,0,K,K).data;
    let kaynak=new Float32Array(K*K), hedefA=new Float32Array(K*K);
    for(let i=0;i<K*K;i++) kaynak[i]=dolu[i*4]/255;
    // 10 tur 3x3 kutu bulanikligi: Safari ctx.filter desteklemedigi icin
    // elle; 256 px'de mobilde de birkac milisaniye tutar.
    for(let tur=0;tur<10;tur++){
      for(let y=0;y<K;y++)for(let x=0;x<K;x++){
        let t=0;
        for(let dy=-1;dy<=1;dy++)for(let dx=-1;dx<=1;dx++){
          const xx=Math.min(K-1,Math.max(0,x+dx)), yy=Math.min(K-1,Math.max(0,y+dy));
          t+=kaynak[yy*K+xx];
        }
        hedefA[y*K+x]=t/9;
      }
      const tmp=kaynak; kaynak=hedefA; hedefA=tmp;
    }
    const piksel=new Uint8Array(K*K*4);
    for(let i=0;i<K*K;i++){
      const dis=Math.max(0,kaynak[i]-(dolu[i*4]>127?1:0));
      let b=Math.min(1,dis/0.40);
      b=b*b*(3-2*b);
      const g=Math.round(b*255);
      piksel[i*4]=g; piksel[i*4+1]=g; piksel[i*4+2]=g; piksel[i*4+3]=255;
    }
    const doku=new THREE.DataTexture(piksel,K,K);
    doku.minFilter=THREE.LinearFilter; doku.magFilter=THREE.LinearFilter;
    doku.wrapS=doku.wrapT=THREE.ClampToEdgeWrapping;
    doku.needsUpdate=true;
    DENIZ_U.kiyiDoku.value=doku;
    DENIZ_U.kiyiMin.value.set(minX,minZ);
    DENIZ_U.kiyiBoy.value.set(boyX,boyZ);
    renderer.domElement.dataset.shoreBand='512px-box10';
    let doluSayi=0; for(let i=0;i<K*K;i++) if(dolu[i*4]>127) doluSayi++;
    renderer.domElement.dataset.shoreFill=doluSayi;
    renderer.domElement.dataset.shoreTris=String(cizilenTri);
  }
  // Görünür su katmanını yalnız kuru üst kapaklardan kes. Teknik 1_TABAN
  // bu maskeye dahil edilmez: ada dışına doğru su görünmeye devam eder;
  // fakat alçak kotlu parsel/kaldırımın üstüne mavi bir dikdörtgen binemez.
  const kuruUstKapaklar=[]; // Su seviyesi kapakların altında; ekstra maske gerekmez.
  if(kuruUstKapaklar.length){
    const K=512, pay=2, kutu=new THREE.Box3().setFromObject(kok);
    const minX=kutu.min.x-pay, minZ=kutu.min.z-pay;
    const boyX=(kutu.max.x-kutu.min.x)+2*pay, boyZ=(kutu.max.z-kutu.min.z)+2*pay;
    const cnv=document.createElement('canvas'); cnv.width=cnv.height=K;
    const cx=cnv.getContext('2d',{willReadFrequently:true}); cx.fillStyle='#000'; cx.fillRect(0,0,K,K); cx.fillStyle='#fff'; cx.beginPath();
    const a=new THREE.Vector3(),b2=new THREE.Vector3(),c2=new THREE.Vector3(),n2=new THREE.Vector3(),e2=new THREE.Vector3();
    for(const kaynak of kuruUstKapaklar){ const pos=kaynak.geometry.attributes.position,idx=kaynak.geometry.index,n=idx?idx.count:pos.count;
      for(let i=0;i+2<n;i+=3){ const ia=idx?idx.getX(i):i,ib=idx?idx.getX(i+1):i,ic=idx?idx.getX(i+2):i;
        a.fromBufferAttribute(pos,ia).applyMatrix4(kaynak.matrixWorld); b2.fromBufferAttribute(pos,ib).applyMatrix4(kaynak.matrixWorld); c2.fromBufferAttribute(pos,ic).applyMatrix4(kaynak.matrixWorld);
        n2.subVectors(b2,a); e2.subVectors(c2,a); n2.cross(e2); if(n2.y<=0) continue;
        cx.moveTo((a.x-minX)/boyX*K,(a.z-minZ)/boyZ*K); cx.lineTo((b2.x-minX)/boyX*K,(b2.z-minZ)/boyZ*K); cx.lineTo((c2.x-minX)/boyX*K,(c2.z-minZ)/boyZ*K); cx.closePath();
      }
    }
    cx.fill(); const kara=new THREE.DataTexture(cx.getImageData(0,0,K,K).data,K,K);
    kara.minFilter=kara.magFilter=THREE.LinearFilter; kara.wrapS=kara.wrapT=THREE.ClampToEdgeWrapping; kara.needsUpdate=true;
    KIMI_SU_U.karaDoku.value=kara; KIMI_SU_U.karaMin.value.set(minX,minZ); KIMI_SU_U.karaBoy.value.set(boyX,boyZ);
    renderer.domElement.dataset.waterLandMask='dry-caps-512';
  }
  // Kabartma dokulari: cim/ada ve kaldirim/cubuk katmanlarinin izdusum
  // maskeleri. Doku 1: R=dolu cim, G=cim bulanik (golge/acilma bandi),
  // B=dolu ada, A=ada bulanik (plaj egimi). Doku 2: R=dolu kaldirim,
  // G=kaldirim bulanik (yol basamak bandi), B=dolu cubuk, A=cubuk bulanik.
  // Dolgu 1024 px'de uretilir ki bant kenarlari yakin planda da basamaksiz
  // kalsin; dusuk frekansli bulaniklik 512 px'de hesaplanip bilineer
  // yukseltilir (yuk ~4 kat hafifler, goruntu farksizdir). Kiyi bandiyla
  // ayni teknik: yalniz YUKARI bakan ucgenler cizilir, cakisan cift yuzeyler
  // nonzero dolguda birbirini sifirlamasin diye.
  const kabCimKaynaklari=zeminler.filter(mm=>
    /^3_.*CIMEN/i.test(mm.name) ||
    /^8_CIM_STUB_DOLGU(?:$|[._-])/i.test(mm.name) ||
    /^3_DOGU_SAHIL_HALKASI(?:$|[._-])/i.test(mm.name));
  const kabKaldirimKaynaklari=zeminler.filter(mm=>
    /^6_BORDUR(?:$|[._-])/i.test(mm.name) ||
    /^7_(?:KALDIRIM_TABANI|MERKEZ_KALDIRIM_TABANI|DOGU_SAHIL_KAVSAK_TABANI|KB_SPOR_CIM_TASIYICI|DOGU_SAHIL_MEYDAN_APRON)(?:$|[._-])/i.test(mm.name));
  const kabCubukKaynaklari=zeminler.filter(mm=>
    /^8_REF_AYIRICI(?:$|[._-])/i.test(mm.name));
  if(kabCimKaynaklari.length && kiyiKaynaklari.length){
    const K=1024, KB2=512, pay=26;
    const kutu=new THREE.Box3().setFromObject(kok);
    const minX=kutu.min.x-pay, minZ=kutu.min.z-pay;
    const boyX=(kutu.max.x-kutu.min.x)+2*pay, boyZ=(kutu.max.z-kutu.min.z)+2*pay;
    const izDusum=(kaynaklar,K2)=>{
      const cnv=document.createElement('canvas'); cnv.width=cnv.height=K2;
      const cx2=cnv.getContext('2d',{willReadFrequently:true});
      cx2.fillStyle='#000'; cx2.fillRect(0,0,K2,K2);
      cx2.fillStyle='#fff'; cx2.beginPath();let rasterBatch=0;
      const ta=new THREE.Vector3(), tb=new THREE.Vector3(), tc=new THREE.Vector3(),
            tn=new THREE.Vector3(), te=new THREE.Vector3();
      for(const kaynak of kaynaklar){
        const pos=kaynak.geometry.attributes.position, idx=kaynak.geometry.index;
        const nTri=idx?idx.count:pos.count;
        for(let i=0;i+2<nTri;i+=3){
          const ia=idx?idx.getX(i):i, ib=idx?idx.getX(i+1):i+1, ic=idx?idx.getX(i+2):i+2;
          ta.fromBufferAttribute(pos,ia).applyMatrix4(kaynak.matrixWorld);
          tb.fromBufferAttribute(pos,ib).applyMatrix4(kaynak.matrixWorld);
          tc.fromBufferAttribute(pos,ic).applyMatrix4(kaynak.matrixWorld);
          tn.subVectors(tb,ta); te.subVectors(tc,ta); tn.cross(te);
          if(tn.y<=0) continue;
          cx2.moveTo((ta.x-minX)/boyX*K2,(ta.z-minZ)/boyZ*K2);
          cx2.lineTo((tb.x-minX)/boyX*K2,(tb.z-minZ)/boyZ*K2);
          cx2.lineTo((tc.x-minX)/boyX*K2,(tc.z-minZ)/boyZ*K2);
          cx2.closePath();if(++rasterBatch%512===0){cx2.fill();cx2.beginPath();}
        }
      }
      cx2.fill();
      return cx2.getImageData(0,0,K2,K2).data;
    };
    const kutuBulanik=(dolu,K2,tur)=>{
      let kaynak=new Float32Array(K2*K2), hedef=new Float32Array(K2*K2);
      for(let i=0;i<K2*K2;i++) kaynak[i]=dolu[i*4]/255;
      for(let t=0;t<tur;t++){
        for(let y=0;y<K2;y++)for(let x=0;x<K2;x++){
          let t2=0;
          for(let dy=-1;dy<=1;dy++)for(let dx=-1;dx<=1;dx++){
            const xx=Math.min(K2-1,Math.max(0,x+dx)), yy=Math.min(K2-1,Math.max(0,y+dy));
            t2+=kaynak[yy*K2+xx];
          }
          hedef[y*K2+x]=t2/9;
        }
        const tmp=kaynak; kaynak=hedef; hedef=tmp;
      }
      return kaynak;
    };
    // 512 px bulanikligi 1024 izgaraya bilineer yukseltme; bant dis hatlari
    // boylece texel basamagi olmadan yumusak iner.
    const yukselt=(kucuk)=>{
      const cikti=new Float32Array(K*K), o=KB2-1;
      for(let y=0;y<K;y++){
        const gy=(y+0.5)*KB2/K-0.5, y0=Math.max(0,Math.min(o-1,Math.floor(gy))), fy=Math.max(0,Math.min(1,gy-y0));
        for(let x=0;x<K;x++){
          const gx=(x+0.5)*KB2/K-0.5, x0=Math.max(0,Math.min(o-1,Math.floor(gx))), fx=Math.max(0,Math.min(1,gx-x0));
          const a=kucuk[y0*KB2+x0], b=kucuk[y0*KB2+x0+1],
                c=kucuk[(y0+1)*KB2+x0], d=kucuk[(y0+1)*KB2+x0+1];
          cikti[y*K+x]=(a*(1-fx)+b*fx)*(1-fy)+(c*(1-fx)+d*fx)*fy;
        }
      }
      return cikti;
    };
    // Dolgu ~0.5 m/px; bulaniklar 512 px'de (~1 m/px) hesaplanir.
    // Genislikler referans olculu: cim bandi ~6 m, plaj egimi ~7 m,
    // kaldirim bandi ~3 m, cubuk golgesi ~1 m.
    const cimDolu=izDusum(kabCimKaynaklari,K);
    const adaDolu=izDusum(kiyiKaynaklari,K);
    const kaldirimDolu=izDusum(kabKaldirimKaynaklari,K);
    const cubukDolu=izDusum(kabCubukKaynaklari,K);
    const cimBulanik=yukselt(kutuBulanik(izDusum(kabCimKaynaklari,KB2),KB2,6));
    const adaBulanik=yukselt(kutuBulanik(izDusum(kiyiKaynaklari,KB2),KB2,7));
    const kaldirimBulanik=yukselt(kutuBulanik(izDusum(kabKaldirimKaynaklari,KB2),KB2,3));
    const cubukBulanik=yukselt(kutuBulanik(izDusum(kabCubukKaynaklari,KB2),KB2,1));
    const piksel=new Uint8Array(K*K*4), piksel2=new Uint8Array(K*K*4);
    for(let i=0;i<K*K;i++){
      piksel[i*4]=cimDolu[i*4];
      piksel[i*4+1]=Math.round(cimBulanik[i]*255);
      piksel[i*4+2]=adaDolu[i*4];
      piksel[i*4+3]=Math.round(adaBulanik[i]*255);
      piksel2[i*4]=kaldirimDolu[i*4];
      piksel2[i*4+1]=Math.round(kaldirimBulanik[i]*255);
      piksel2[i*4+2]=cubukDolu[i*4];
      piksel2[i*4+3]=Math.round(cubukBulanik[i]*255);
    }
    const doku=new THREE.DataTexture(piksel,K,K);
    doku.minFilter=THREE.LinearFilter; doku.magFilter=THREE.LinearFilter;
    doku.wrapS=doku.wrapT=THREE.ClampToEdgeWrapping;
    doku.needsUpdate=true;
    KABARTMA_U.doku.value=doku;
    KABARTMA_U.min.value.set(minX,minZ);
    KABARTMA_U.boy.value.set(boyX,boyZ);
    const doku2=new THREE.DataTexture(piksel2,K,K);
    doku2.minFilter=THREE.LinearFilter; doku2.magFilter=THREE.LinearFilter;
    doku2.wrapS=doku2.wrapT=THREE.ClampToEdgeWrapping;
    doku2.needsUpdate=true;
    KABARTMA2_U.doku.value=doku2;
    KABARTMA2_U.min.value.set(minX,minZ);
    KABARTMA2_U.boy.value.set(boyX,boyZ);
    let cimSayi=0, kaldirimSayi=0, cubukSayi=0;
    for(let i=0;i<K*K;i++){
      if(cimDolu[i*4]>127) cimSayi++;
      if(kaldirimDolu[i*4]>127) kaldirimSayi++;
      if(cubukDolu[i*4]>127) cubukSayi++;
    }
    renderer.domElement.dataset.reliefBand='1024px-cim6-ada7-kal3-cub1';
    renderer.domElement.dataset.reliefGrassFill=cimSayi;
    renderer.domElement.dataset.reliefGrassSources=String(kabCimKaynaklari.length);
    renderer.domElement.dataset.reliefSidewalkFill=kaldirimSayi;
  renderer.domElement.dataset.reliefSidewalkSources=String(kabKaldirimKaynaklari.length);
  renderer.domElement.dataset.reliefStripFill=cubukSayi;
  renderer.domElement.dataset.roadEdgePaintBand='disabled-geometry-curb-only-v1';
  }
  kok.updateMatrixWorld(true);
  const {applyCenterSculpture69}=await import('./center-sculpture-v69.js');
  renderer.domElement.dataset.centerSculpture69=JSON.stringify(applyCenterSculpture69(kok));
  const {applyCentralWhite71}=await import('./central-white-v71.js');
  const white71=applyCentralWhite71(kok);
  zeminler=zeminler.filter(m=>!white71.hidden.includes(m.name)).concat(white71.meshes);
  const {applyCentralDetails73}=await import('./central-details-v73.js?v=76');
  const details73=applyCentralDetails73(kok);
  zeminler=zeminler.filter(m=>!details73.hidden.includes(m.name)).concat(details73.meshes);
  renderer.domElement.dataset.centralDetails73='four paths, typographic 67, twelve lawns, four topiaries; four triples layout75';
  renderer.domElement.dataset.centralWhite71='4 gray pastel panels; wider lawns v73';
  const {applySeasideBenchFix89}=await import('./seaside-scale-v89.js?v=91');
  renderer.domElement.dataset.seasideBench89=JSON.stringify(applySeasideBenchFix89(kok));
  terrainSampler=wrapParkEntryCapsSampler57(wrapParkRingSampler63(wrapParkPathSampler57(wrapParkTerrainSampler57(createTerrainSampler(zeminler.filter(m=>!m.userData.parkPond65CollisionOnly)),kok),kok),kok),kok);
  renderer.domElement.dataset.smallIslandProps='loading';
  const smallIslandPropsReady=loadSmallIslandProps({assetSession:islandStartupAssets,scene:sahne,renderer,sample:zeminVurusu,variant:'kimi'}).then(props=>{
    smallIslandProps=props;props.update(1,kam);
    smallIslandBaseTriangles=zeminler.reduce((n,m)=>n+(m.geometry.index?.count??m.geometry.attributes.position.count)/3,0);
    smallIslandMapLabel='ada '+Math.round(b.x*DUNYA_OLCEGI)+'×'+Math.round(b.z*DUNYA_OLCEGI)+' m';
    // Shared link opens the requested little island immediately; existing
    // Oyuna Dön restores the saved small-island character camera.
    if(urlParams.get('view')==='small'){
      oyunKamerasiniSakla();incelemeMerkezi=new THREE.Vector3(-136,9.6,60);
      const h=1.08*Math.max(230,114/kam.aspect)/(2*Math.tan(THREE.MathUtils.degToRad(25)));
      kam.position.set(-136,9.6+h,60);kam.fov=50;kam.near=.5;kam.far=h+1200;
      kam.updateProjectionMatrix();yaw=0;pitch=-Math.PI/2;ucus=true;kameraModu='close';
      yurX=0;yurY=0;hiz.set(0,0,0);bas.style.display='none';golgeKadrajiUygula(132);
      incelemeSisiniUygula();gorunumArayuzunuGuncelle();
      renderer.domElement.dataset.smallIslandEntry='north-up-showcase';
    }
    return props;
  }).catch(e=>hata('Küçük ada modelleri: '+e.message));
  renderer.domElement.dataset.parkProps63='loading';
await entryStage(3,'Preparing the park trees');
  parkProps57=await loadParkProps63({assetSession:islandStartupAssets,scene:sahne,renderer,sample:zeminVurusu,variant:'kimi'});
  for(const name of parkProps57.hiddenTerrain){const old=kok.getObjectByName(name);if(old)old.visible=false;}
  zeminler=zeminler.filter(m=>!parkProps57.hiddenTerrain.includes(m.name));
  terrainSampler=wrapParkEntryCapsSampler57(wrapParkRingSampler63(wrapParkPathSampler57(wrapParkTerrainSampler57(createTerrainSampler(zeminler.filter(m=>!m.userData.parkPond65CollisionOnly)),kok),kok),kok),kok);
  parkProps57.update(1,kam);
await entryStage(4,'Preparing the neighbourhood');
  cityProps60=await loadCityProps60({scene:sahne,renderer,sample:zeminVurusu,variant:'kimi'});
  // Optional additive layer: failure must not prevent the island from opening.
  try {
    const {loadCentralBuildings68}=await import('./central-buildings-v68.js?v=corner-contact-1');
await entryStage(5,'Preparing the central square');
    centralBuildings68=await loadCentralBuildings68({scene:sahne,renderer,sample:zeminVurusu,variant:'kimi'});
  } catch(e) { renderer.domElement.dataset.centralBuildings68='error: '+e.message; console.error('Central buildings',e); }
  try {
    const {createSeasideTimber81}=await import('./seaside-timber-v81.js?v=82');
await entryStage(6,'Preparing the wooden piers');
    seasideTimber79=createSeasideTimber81({scene:sahne,terrainRoot:kok,renderer,variant:'kimi'});
  } catch(e){renderer.domElement.dataset.seasideTimber79='error: '+e.message;console.error('Seaside timber',e);}
  try {
    const {loadLunapark77}=await import('./lunapark-placement-v77.js?v=carousel-time-1');
await entryStage(7,'Preparing rides and boats');
    lunapark77=await loadLunapark77({scene:sahne,renderer,sample:zeminVurusu,sea:kimiSu.position.y,variant:'kimi',terrainRoot:kok,timberSample:seasideTimber79?.sample});
  } catch(e){renderer.domElement.dataset.lunapark77='error: '+e.message;console.error('Amusement park',e);}
  try {
    const {loadLowerPlaza83}=await import('./lower-plaza-v83.js?v=83.1');
await entryStage(8,'Preparing the garden plaza');
    lowerPlaza83=await loadLowerPlaza83({scene:sahne,renderer,sample:zeminVurusu,variant:'kimi'});
  } catch(e){renderer.domElement.dataset.lowerPlaza83='error: '+e.message;console.error('Lower plaza',e);}
  try {
    const {loadNorthwestSports97}=await import('./northwest-sports-v97.js?v=release-40');
await entryStage(9,'Preparing sports grounds');
    northwestSports97=await loadNorthwestSports97({scene:sahne,renderer,sample:zeminVurusu,variant:'kimi',terrainRoot:kok});
    renderer.domElement.__northwestSports97=northwestSports97;
  } catch(e){renderer.domElement.dataset.northwestSports97='error: '+e.message;console.error('Northwest sports',e);}
  try {
    const {createStadiumCoast99}=await import('./stadium-coast-v99.js?v=99.7');
await entryStage(10,'Preparing the stadium and beach');
    stadiumCoast99=createStadiumCoast99({scene:sahne,terrainRoot:kok,renderer,sample:zeminVurusu,variant:'kimi'});
    renderer.domElement.__stadiumCoast99=stadiumCoast99;
  } catch(e){renderer.domElement.dataset.stadiumCoast99='error: '+e.message;console.error('Stadium and coast',e);}
  try {
    const {createWestCourtyard102}=await import('./west-courtyard-v102.js?v=house-roofs-1.3');
await entryStage(11,'Preparing homes and courts');
    westCourtyard102=createWestCourtyard102({scene:sahne,terrainRoot:kok,renderer,sample:zeminVurusu,variant:'kimi'});
    renderer.domElement.__westCourtyard102=westCourtyard102;
  } catch(e){renderer.domElement.dataset.westCourtyard102='error: '+e.message;console.error('West courtyard',e);}
  try {
    await smallIslandPropsReady;
    const {createBottomHomes103}=await import('./bottom-homes-v103.js?v=103.3');
    bottomHomes103=createBottomHomes103({scene:sahne,terrainRoot:kok,renderer,sample:zeminVurusu,variant:'kimi'});
    renderer.domElement.__bottomHomes103=bottomHomes103;
  } catch(e){renderer.domElement.dataset.bottomHomes103='error: '+e.message;console.error('Bottom houses',e);}
  try {
    const {createNorthPool104}=await import('./north-pool-v104.js?v=104.6');
await entryStage(12,'Preparing the pool');
    northPool104=createNorthPool104({scene:sahne,terrainRoot:kok,renderer,sample:zeminVurusu,variant:'kimi'});
    renderer.domElement.__northPool104=northPool104;
  } catch(e){renderer.domElement.dataset.northPool104='error: '+e.message;console.error('North pool',e);}
await entryStage(13,'Finishing the northern neighbourhood');
  const {loadNorthwest93}=await import('./northwest-v93/placement.js');
  northwest93=await loadNorthwest93({scene:sahne,renderer,sample:zeminVurusu,variant:'kimi'});
  const {createNorthHomes}=await import('../app/island-north-homes.js');
  const {createNorthApartments}=await import('../app/island-north-apartments.js');
  northApartments=createNorthApartments({scene:sahne,renderer,sample:zeminVurusu});
  northHomes=createNorthHomes({scene:sahne,terrainRoot:kok,renderer,sample:zeminVurusu});
  try {
    const {createLivingEffects107}=await import('./living-effects-v107.js?v=108.2');
    livingEffects107=createLivingEffects107({scene:sahne,renderer,sample:zeminVurusu,ground:smallIslandGround,water:parkEnvironment().water,
      sea:(x,z)=>northPool104?.waterLevelAt(x,z)??kimiSu.position.y,mobile:mobil,
      plants:[...(northHomes?.plants.rows??[]),...(parkProps57?.layout??[]),...(smallIslandProps?.layout.plants??[]),...(northwestSports97?.plants.rows??[]),...(stadiumCoast99?.plants.rows??[]),...(bottomHomes103?.plants.rows??[])]});
    renderer.domElement.__livingEffects107=livingEffects107;
  } catch(e){renderer.domElement.dataset.livingEffects107='error: '+e.message;console.error('Living effects',e);}
  try {
    pastelTraffic108=createPastelTraffic108({scene:sahne,terrainRoot:kok,renderer,ground:(x,z)=>smallIslandGround(x,z,true),water:parkEnvironment().water});
    renderer.domElement.__pastelTraffic108=pastelTraffic108;
  } catch(e){renderer.domElement.dataset.pastelTraffic108='error: '+e.message;console.error('Pastel cars',e);}
  renderer.domElement.dataset.terrainQuery='exact-triangle-grid-v27';
  renderer.domElement.dataset.terrainQueryTriangles=String(terrainSampler.stats.triangles);
  const parkEdgePatch=await islandFetch('/67park-foundation-next/repairs/park-edges-v4.json').then(r=>{if(!r.ok)throw Error('Park edge repair missing');return r.json();});
  renderer.domElement.dataset.parkEdges=JSON.stringify(applyParkEdges(kok,parkEdgePatch));
  const curbJoinPatch=await islandFetch('/67park-foundation-next/repairs/curb-joins-v3.json').then(r=>{if(!r.ok)throw Error('Curb join repair missing');return r.json();});
  renderer.domElement.dataset.curbJoins=JSON.stringify(applyCurbJoins(kok,curbJoinPatch));
  renderer.domElement.dataset.parcelPaving=JSON.stringify(applyParcelPaving(kok));shortenKimiRightTip(kok);repairEastRoadEnd(kok);cleanLowerPark(kok);applyKimiCoast20(kok);applyMapContinuity(kok,await fetch('/67park-foundation-next/repairs/map-continuity-59.json').then(r=>{if(!r.ok)throw Error('Map continuity missing');return r.json()}));applyTerrainBoundaries(kok,await islandFetch('/67park-foundation-next/repairs/terrain-boundaries-2.json?v=ground-2').then(r=>{if(!r.ok)throw Error('Terrain boundaries missing');return r.json()}));renderer.domElement.dataset.grassBoundary1=JSON.stringify(applyGrassBoundary(kok,await islandFetch('/67park-foundation-next/repairs/grass-boundary-1.json').then(r=>{if(!r.ok)throw Error('Grass boundary repair missing');return r.json()})));renderer.domElement.dataset.mapEdgeFinish1=JSON.stringify(applyMapEdgeFinish(kok,await islandFetch('/67park-foundation-next/repairs/map-edge-finish-1.json?v=skate-corner-recovery-1').then(r=>{if(!r.ok)throw Error('Map edge repair missing');return r.json()})));renderer.domElement.dataset.sidewalkMaterials1=JSON.stringify(applySidewalkMaterials(sahne,kok));
  const stairGeometry=repairIslandStairs(kok);
  renderer.domElement.dataset.stairGeometry=JSON.stringify(stairGeometry.stats);
  zeminler=zeminler.filter(m=>!stairGeometry.nonWalkableNames.includes(m.name));
  for(const name of ['3_CIMEN','8_PARK_PATIKA_UST','6_BORDUR','5_YOL','7_KALDIRIM_TABANI']){
    if(!DIK_YAN_GOLGE_KAYNAGI.test(name))continue;
    const source=kok.getObjectByName(name),helper=source?.getObjectByName('67D_DIK_YAN_GOLGE_'+name),geometry=dikYanGolgeGeometrisi(source.geometry);
    if(helper&&geometry){helper.geometry.dispose();helper.geometry=geometry;}
  }
  terrainSampler=wrapParkEntryCapsSampler57(wrapParkRingSampler63(wrapParkPathSampler57(wrapParkTerrainSampler57(createTerrainSampler(zeminler.filter(m=>!m.userData.parkPond65CollisionOnly)),kok),kok),kok),kok);
  hazir=true;
  renderer.shadowMap.type=THREE.PCFShadowMap;
  renderer.domElement.dataset.receiverPlaneAdapter='r185-native-hardware-pcf';
  resolve();
 }catch(e){reject(e)}
},undefined,reject));
const objects=sahne.children.filter(o=>!initialChildren.has(o));
const trunkRows=[...(smallIslandProps?.layout?.plants??[]),...(parkProps57?.layout??[])];
sahne.traverse(o=>{if(o.userData.treeTrunks)trunkRows.push(...o.userData.treeTrunks);});
const treeTrunksBlocked=treeIndex(trunkRows);
const stairGeometry=adaKok.userData.stairGeometry;
const treeBlocked=(x,y,z)=>treeTrunksBlocked(x,y,z)||stairsRailBlocked(stairGeometry.railSegments,x,y,z);
const stadiumStairs=stadiumCoast99?.stats?.stairs;
const stairRegions=[...stairGeometry.regions,...(stadiumStairs?.regions??[])];
const stairs={contains:(x,z)=>stairAt(stairRegions,x,z),regions:stairRegions,
 routes:[...stairGeometry.routes,...(stadiumStairs?.routes??[])],
 stats:{terrain:stairGeometry.stats,stadium:stadiumStairs?.stats}};
const surfaceFinish=installSurfaceFinish(objects,{enabled:new URLSearchParams(location.search).get('surface')!=='original'});
const staticTransforms=cacheStaticTransforms(objects,adaKok);
const shadowCache=installIslandShadowCache(renderer,gunes,sahne);
const shadowAnchor=createShadowAnchor(stableSunShadow52);
const pondWater=createPondWater(adaKok.getObjectByName('67D_PARK_WATER_UNIFIED_V65'));
const correctedWater=waterWithSolidFloor({water:parkEnvironment().water,ground:(x,z)=>smallIslandGround(x,z,true),sea:()=>kimiSu.position.y,pool:northPool104,pond:pondWater});
renderer.domElement.dataset.authoredIslandEnvironment=String(preserveAuthoredIslandEnvironment(objects,sahne.environment));
const overviewBounds=new THREE.Box3().setFromObject(adaKok);
const overviewCenter=overviewBounds.getCenter(new THREE.Vector3());
let overviewActive=false;
const world={
 scene:sahne,terrain:adaKok,renderer,camera:kam,objects,surfaceFinish,staticTransforms,shadowCache,shadowAnchor,
 ground:smallIslandGround,terrainGround:zeminY,sample:zeminVurusu,
 treeBlocked,stairs,
 treeRows:trunkRows.filter(p=>p.asset==='tree'),
 water:correctedWater,
 waterDiagnostics:(x,z)=>({before:parkEnvironment().water(x,z),after:correctedWater(x,z),ground:smallIslandGround(x,z,true),pond:pondWater.height(x,z)}),
 sea:(x,z)=>northPool104?.waterLevelAt(x,z)??pondWater.height(x,z)??kimiSu.position.y,
 pond:pondWater,
 traffic:pastelTraffic108,rides:lunapark77?.rides??[],
 effects:livingEffects107,
 pool:northPool104,blockers:parkEnvironment().cameraBlockers(),
 ready:true,spawn:[163,smallIslandGround(163,121)+.56,121],
 setOverview(value){
  // The original review camera places fog beyond the farthest Island corner.
  // Keep that behavior at portrait overview height without repainting the map.
  if(sahne.fog){
   const dx=Math.max(Math.abs(kam.position.x-overviewBounds.min.x),Math.abs(kam.position.x-overviewBounds.max.x));
   const dz=Math.max(Math.abs(kam.position.z-overviewBounds.min.z),Math.abs(kam.position.z-overviewBounds.max.z));
   const dy=Math.max(0,kam.position.y-overviewBounds.min.y);
   const near=value?Math.hypot(dx,dy,dz)+40:NORMAL_SIS_YAKIN;
   sahne.fog.near=near;sahne.fog.far=value?near+1000:NORMAL_SIS_UZAK;
  }
  if(value!==overviewActive){
   overviewActive=value;
   golgeKadrajiUygula(value?Math.max(overviewBounds.max.x-overviewBounds.min.x,overviewBounds.max.z-overviewBounds.min.z)*.62:GOLGE_YARI);
  }
  if(typeof pastelProfiliniUygula!=='function')return;
  const next=value?'map':'game';
  // R3F reapplies its default ACES renderer props when the HUD changes.
  // Codex was authored for AgX; pair its exposure with that tone mapper.
  const exposure=value?POZLAMA_HARITA:POZLAMA_OYUN;
  if(next!==kameraModu||renderer.toneMapping!==THREE.AgXToneMapping||renderer.toneMappingExposure!==exposure){
   kameraModu=next;renderer.toneMapping=THREE.AgXToneMapping;pastelProfiliniUygula(next);
   renderer.domElement.dataset.islandViewProfile=JSON.stringify({mode:next,toneMapping:renderer.toneMapping,exposure:renderer.toneMappingExposure,environment:sahne.environmentIntensity,fog:sahne.fog&&[sahne.fog.near,sahne.fog.far]});
  }
 },
 update(dt,actor){
  DENIZ_U.zaman.value+=dt;kimiSuMat.userData.update(dt);
  lunapark77?.update(dt,{paused:document.hidden,camera:kam});
  for(const p of [smallIslandProps,parkProps57,cityProps60,centralBuildings68,seasideTimber79,lowerPlaza83,northwest93,northwestSports97,northPool104,bottomHomes103,stadiumCoast99,northHomes])p?.update(dt,kam);
  const p=actor?.body?.translation?.();if(p){KIMI_SU_U.oyuncu.value.set(p.x,p.z);KIMI_SU_U.oyuncuSuda.value=world.water(p.x,p.z)?1:0;GOLGE_HEDEFI.set(overviewActive?overviewCenter.x:p.x,0,overviewActive?overviewCenter.z:p.z);if(shadowCache.enabled)shadowAnchor.update(GOLGE_HEDEFI,gunes.shadow.camera);else{shadowAnchor.invalidate();stableSunShadow52.update(GOLGE_HEDEFI);}}
 },
 dispose(){shadowCache.dispose();staticTransforms.dispose();surfaceFinish.dispose();for(const o of objects){o.removeFromParent();o.traverse(n=>{if(n.isMesh){n.geometry?.dispose();for(const m of Array.isArray(n.material)?n.material:[n.material]){m?.dispose();}}});}pmrem.dispose();}
};
const failures=Object.entries(renderer.domElement.dataset).filter(([k,v])=>/^error:/.test(v));
if(failures.length)throw Error('Island layers missing: '+JSON.stringify(failures));
installParcelCornerQA(world);
installParcelGapQA(world);
const completedWorld=installLobbyCourts(installHouseRoofSupports(installIslandSwimBoundary(world)));
if(!completedWorld.blockers?.length)throw Error("Camera preparation needs the loaded island");
installSkateRailFinish(completedWorld);
const cameraPreparation=await prepareCameraMeshes(completedWorld);
renderer.domElement.dataset.cameraMeshPreparation=JSON.stringify(cameraPreparation);
renderer.domElement.dataset.cameraMeshesReady="skate-corner-recovery-1";
return completedWorld;

} finally {islandStartupAssets.close();renderer.domElement.dataset.islandStartupAssets=JSON.stringify(islandStartupAssets.stats);}
}
import {installHouseRoofSupports} from '../app/house-roof-support.js?v=plaza-climb-1';
