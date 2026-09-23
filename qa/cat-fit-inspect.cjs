const {chromium}=require('playwright'),{browserLaunchOptions}=require('./browser-launch.cjs');
const fs=require('node:fs'),assert=require('node:assert/strict');
(async()=>{const browser=await chromium.launch(browserLaunchOptions());try{
 const page=await browser.newPage({viewport:{width:1100,height:800}});
 await page.route('**/__qa/cat-fit',r=>r.fulfill({contentType:'text/html',body:'<html><head><script type="importmap">{"imports":{"three":"/67park-foundation-next/vendor/three.module.js","three/addons/":"/67park-foundation-next/vendor/addons/"}}</script></head><body style="margin:0;background:#eee"></body></html>'}));
 await page.goto('http://127.0.0.1:8496/__qa/cat-fit');
 const report=await page.evaluate(async()=>{
  const T=await import('three'),{GLTFLoader}=await import('three/addons/loaders/GLTFLoader.js'),{DRACOLoader}=await import('three/addons/loaders/DRACOLoader.js');
  const {applyGorillaStudioItems}=await import('/67park-foundation-next/app/gorilla-studio-items.js');
  const d=new DRACOLoader().setDecoderPath('/67park-foundation-next/vendor/addons/libs/draco/gltf/'),l=new GLTFLoader().setDRACOLoader(d),rows=[];
  const donor=(await l.loadAsync('/67park-foundation-next/models/friends/friendsie_26.glb')).scene;window.fitViews=[];
  for(const base of ['goril','cat67']){
   const file=base==='goril'?'models/goril-motion-v3.glb':'cat-character/cat-gorilla-body.glb',g=await l.loadAsync('/67park-foundation-next/'+file),root=g.scene;
   root.updateMatrixWorld(true);const all=new T.Box3().setFromObject(root,true),head=root.getObjectByName(base==='goril'?'GORIL_KAFA':'67Park_Cat_Head'),box=new T.Box3().setFromObject(head,true);
   const row={base,all,head:box,nativeHeight:root.userData.parkNativeHeight||all.getSize(new T.Vector3()).y,components:[]};
   if(base==='cat67'){
    const a=head.geometry.attributes,ix=head.geometry.index,parents=Array.from({length:a.position.count},(_,i)=>i),find=i=>parents[i]===i?i:parents[i]=find(parents[i]);
    for(let k=0;k<ix.count;k+=3){const a=ix.getX(k),b=ix.getX(k+1),c=ix.getX(k+2);parents[find(b)]=find(a);parents[find(c)]=find(a)}
    const groups=new Map();for(let i=0;i<parents.length;i++){const key=find(i);if(!groups.has(key))groups.set(key,[]);groups.get(key).push(i)}
    for(const ids of groups.values()){
     const b=new T.Box3(),uv=[];for(const i of ids){const v=new T.Vector3();head.getVertexPosition(i,v).applyMatrix4(head.matrixWorld);b.expandByPoint(v);uv.push([a.uv.getX(i),a.uv.getY(i)])}
     row.components.push({vertices:ids.length,box:b,uvMin:[Math.min(...uv.map(p=>p[0])),Math.min(...uv.map(p=>p[1]))],uvMax:[Math.max(...uv.map(p=>p[0])),Math.max(...uv.map(p=>p[1]))]});
    }
   }
   root.traverse(o=>{if(o.isMesh&&['TAC','CICEK'].includes(o.name))o.visible=false});
   applyGorillaStudioItems(root,{base,head:'friendsie_26:90'},()=>donor);
   row.glasses=new T.Box3().setFromObject(root.getObjectByName('Studio_head'),true);
   const glasses=root.getObjectByName('Studio_head'),usedBox=new T.Box3();for(const id of new Set(glasses.geometry.index.array)){usedBox.expandByPoint(new T.Vector3().fromBufferAttribute(glasses.geometry.attributes.position,id).applyMatrix4(glasses.matrixWorld))}row.glassesUsed=usedBox;
   const scene=new T.Scene();scene.background=new T.Color('#e8d5d7');scene.add(root);scene.add(new T.HemisphereLight('#fff8ef','#a9acb0',2));const light=new T.DirectionalLight('#fff5e8',3);light.position.set(-2,3,4);scene.add(light);
   const renderer=new T.WebGLRenderer({antialias:true});renderer.setSize(550,800);renderer.setPixelRatio(1);renderer.domElement.style.display='inline-block';document.body.append(renderer.domElement);
   const camera=new T.OrthographicCamera(-.135,.135,.196,-.196,.01,10);camera.position.set(0,.18,2);camera.lookAt(0,.18,0);renderer.render(scene,camera);
   window.fitViews.push({renderer,scene,camera,root,g});
   rows.push(row);
  }
  d.dispose();return rows;
 });
 const out=process.env.PARK_FIT_EVIDENCE||'.qa-results/cat-fit-before';fs.mkdirSync(out,{recursive:true});await page.screenshot({path:out+'/front.png'});
 await page.evaluate(()=>fitViews.forEach(v=>{v.camera.position.set(1.3,.35,2);v.camera.lookAt(0,.18,0);v.renderer.render(v.scene,v.camera)}));await page.screenshot({path:out+'/quarter.png'});
 for(const axis of ['x','y','z'])assert(Math.abs((report[0].head.max[axis]-report[0].head.min[axis])-(report[1].head.max[axis]-report[1].head.min[axis]))<1e-6,'Matched head '+axis);
 assert(Math.abs(report[0].nativeHeight-report[1].nativeHeight)<1e-8,'Shared body normalization');
 fs.writeFileSync(out+'/report.json',JSON.stringify(report,null,2));console.log('CAT_HEAD_FIT_PASS');
}finally{await browser.close()}})().catch(e=>{console.error(e);process.exitCode=1});
