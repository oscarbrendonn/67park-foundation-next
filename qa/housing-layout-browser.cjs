// Close visual inspection of the exact production room geometry. This fixture
// is fulfilled only in the test context; it is not a new in-game scene or UI.
const {chromium}=require('/tmp/rush-test-tools/node_modules/playwright');
const assert=require('node:assert/strict');
const BASE=process.env.FEEL_URL||'http://127.0.0.1:8497/67park-foundation-next/';
const OUT=process.env.HOUSE_LAYOUT_OUTPUT||'/tmp/67park-feel-lab-2UFlpf';
(async()=>{
 const browser=await chromium.launch({executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',headless:true});
 const errors=[];
 try{
  const page=await browser.newPage({viewport:{width:1200,height:850}});
  page.on('pageerror',e=>errors.push(e.message));
  await page.route('**/qa/interior-layout-view.html',route=>route.fulfill({contentType:'text/html',body:`<!doctype html><meta name="viewport" content="width=device-width,initial-scale=1"><style>body{margin:0;overflow:hidden}canvas{display:block}</style>
   <script type="importmap">{"imports":{"three":"../vendor/three.module.js"}}</script>
   <script type="module">
   import * as T from 'three';
   import {createHousingInterior} from '../app/housing-interior.js';
   import {HOUSES} from '../app/housing-layout.js';
   const scene=new T.Scene();scene.background=new T.Color('#dcd7cd');
   const renderer=new T.WebGLRenderer({antialias:true});renderer.setSize(innerWidth,innerHeight);
   renderer.setPixelRatio(1);renderer.toneMapping=T.ACESFilmicToneMapping;renderer.toneMappingExposure=1;
   document.body.append(renderer.domElement);
   const camera=new T.PerspectiveCamera(52,innerWidth/innerHeight,.025,100);
   scene.add(new T.HemisphereLight('#fffaf0','#b2a492',2.1));
   const light=new T.DirectionalLight('#fff2dc',2.2);light.position.set(-3,8,1);scene.add(light);
   const world={scene,camera,renderer},room=createHousingInterior(world,{markers:false}),h=HOUSES[0];room.show(h);
   window.view=(eye,target)=>{camera.position.fromArray(eye).add(new T.Vector3(h.room.x,h.room.y,h.room.z));camera.lookAt(...target.map((n,i)=>n+[h.room.x,h.room.y,h.room.z][i]));room.step();renderer.render(scene,camera);return room.stats()};
   window.ready=true;
   </script>`}));
  await page.goto(BASE+'qa/interior-layout-view.html');await page.waitForFunction(()=>window.ready);
  for(const [name,eye,target]of [
   ['front',[0,2.1,0],[0,1.2,5.7]],
   ['low-left',[-2.7,.32,3.55],[.2,.15,5.6]],
   ['low-right',[2.6,.33,3.1],[0,.22,5.65]],
   ['rug',[-1.4,.44,-.1],[-5,.025,-.2]],
   ['cutaway',[0,5.6,8],[0,.5,0]],
  ]){
   const stats=await page.evaluate(({eye,target})=>view(eye,target),{eye,target});
   assert.equal(stats.newTextureBytes,0);await page.screenshot({path:OUT+'/entry-layout-'+name+'.png'});
   console.log(name,JSON.stringify(stats));
  }
  await page.setViewportSize({width:390,height:844});
  await page.reload();await page.waitForFunction(()=>window.ready);
  await page.evaluate(()=>view([0,2.6,-1.7],[0,1.2,5.7]));
  await page.screenshot({path:OUT+'/entry-layout-mobile.png'});
  assert.deepEqual(errors,[]);console.log('INTERIOR LAYOUT VISUAL CAPTURES PASS');
 }finally{await browser.close()}
})().catch(e=>{console.error(e);process.exitCode=1});
