// Exact anchors only: preserve the shipped course bundle and unrelated edits.
import fs from 'node:fs';
import assert from 'node:assert/strict';
function update(file,edits){let source=fs.readFileSync(file,'utf8');for(const [before,after] of edits){if(source.includes(after))continue;assert.equal(source.split(before).length,2,`${file}: unique anchor ${before.slice(0,90)}`);source=source.replace(before,after);}fs.writeFileSync(file,source);}
update('skybound-soft/course-edf81ca8e2af595ed4d3.js',[
 ['var N2=Object.create;',`import {bindRunningLook as __bindRunningLook,createRunningCamera as __createRunningCamera} from '../app/running-camera.js?v=running-camera-1';
import {installRunningCameraSettings as __installRunningSettings} from '../app/running-camera-settings.js?v=running-camera-1';
import {settingsOpen as __runningSettingsOpen} from '../app/player-settings.js';
const __runningView=__createRunningCamera();
var N2=Object.create;`],
 ['a.target?.tagName!=="CANVAS"||a.button!==0&&a.pointerType==="mouse"||a.pointerType==="touch"&&a.clientX<window.innerWidth*.45||(mi={id:a.pointerId,x:a.clientX,y:a.clientY})','/* Camera input is owned by the opt-in running adapter. */'],
 ['t(window,"pointermove",a=>{!mi||mi.id!==a.pointerId||!ax()||(Vi-=feelLook({x:a.clientX-mi.x,y:0},a.pointerType==="mouse").x,qa=yu(qa+feelLook({x:0,y:a.clientY-mi.y},a.pointerType==="mouse").y,-.2,1.1),mi.x=a.clientX,mi.y=a.clientY)})','void 0'],
 ['t(window,"wheel",a=>{ax()&&a.target?.tagName==="CANVAS"&&(Ar=yu(Ar+a.deltaY*.004,3,12))},{passive:!0})','void 0 /* shared zoom owns wheel */'],
 ['function zw(t,e){if(!pi||!ct||!sx(ct.position))return false;const n=r0(e),o=ct.body.translation(),p=feelPose({x:o.x,y:o.y-.555,z:o.z},Vi,qa,Ar,t.aspect);hu.set(p.target.x,p.target.y,p.target.z);vl.set(p.position.x,p.position.y,p.position.z);t.up.set(0,1,0);t.position.copy(vl);ct.resolveCamera?.(hu,vl,t,n,Ar);t.lookAt(hu);if(t.fov!==55){t.fov=55;t.updateProjectionMatrix()}return true}',
  'function zw(t,e){if(!ct||!sx(ct.position))return false;const o=ct.body.translation();const view=__runningView.update(t,ct.visual,{x:o.x,y:o.y-.555,z:o.z},Vi,qa,{dt:r0(e),resolve:(p,c,dt,distance)=>{hu.set(p.target.x,p.target.y,p.target.z);vl.set(p.position.x,p.position.y,p.position.z);ct.resolveCamera?.(hu,vl,c,dt,distance)}});Ar=view.requestedDistance;if(t.fov!==55){t.fov=55;t.updateProjectionMatrix()}return true}'],
 ['};C();let w=createSkyboundAvatar()', '};C();__installRunningSettings();const runningLook=__bindRunningLook(i,()=>f&&!u,(yaw,pitch)=>{Vi+=yaw;qa=yu(qa+pitch,-.15,1.1)});const releaseRunning=()=>{M();s?.clear();runningLook.reset();kw()};window.addEventListener("park:release-controls",releaseRunning);let w=createSkyboundAvatar()'],
 ['step(B,{supported:k,active:N,jump:O=!1}){if(u)return!1;f=!!N&&p==="ready"&&!!l,','step(B,{supported:k,active:N,jump:O=!1}){if(u)return!1;__runningView.restore();f=!!N&&!__runningSettingsOpen()&&p==="ready"&&!!l,'],
 ['camera:n.position.toArray(),fov:n.fov,cameraCollision:T?.stats', 'camera:n.position.toArray(),cameraSettings:n.userData.runningCamera,fov:n.fov,cameraCollision:T?.stats'],
 ['reset(){u||(f=!1,M(),ux(),T?.reset()', 'reset(){u||(__runningView.reset(),runningLook.reset(),f=!1,M(),ux(),T?.reset()'],
 ['dispose(){u||(f=!1,M(),ux(),T?.dispose(),u=!0,p="disposed"', 'dispose(){u||(__runningView.reset(),runningLook.dispose(),window.removeEventListener("park:release-controls",releaseRunning),f=!1,M(),ux(),T?.dispose(),u=!0,p="disposed"']
]);
update('app/claude-gorilla-runtime.js',[
 ['import{updatePreviewHit}from"./preview-hit-motion.js?v=bot-hit-13";', 'import{updatePreviewHit}from"./preview-hit-motion.js?v=bot-hit-13";import{updatePunchBurst}from"./punch-burst.js?v=punch-burst-1";'],
 ['if(u.punchImpact)strikeParkBots(e.position,u.heading);let f=pt(e.dt);', 'if(u.punchImpact)strikeParkBots(e.position,u.heading);updatePunchBurst(e,u,e.dt);let f=pt(e.dt);']
]);
update('lane-rush/game.js',[["window.__rushReadState=()=>({phase,frames:frameNumber,time:raceTime,yaw:cameraYaw,", "window.__rushReadState=()=>({phase,frames:frameNumber,time:raceTime,yaw:cameraYaw,cameraSettings:camera.userData.runningCamera,otherAvatars:racers.slice(1).map(r=>r.visual.visible),"]]);
update('lane-rush/index.html',[[ './game.js?v=recovery-graphics-1','./game.js?v=running-camera-1' ]]);
update('skybound-soft/index.html',[[ './course-edf81ca8e2af595ed4d3.js?v=recovery-graphics-1','./course-edf81ca8e2af595ed4d3.js?v=running-camera-1' ]]);
// Refresh only the existing park runtime aliases; retain animal entry revisions.
for(const file of ['index.html','explore/index.html']){
 let source=fs.readFileSync(file,'utf8');
 const match=source.match(/<script type="importmap">([\s\S]*?)<\/script>/);assert(match,file);
 const map=JSON.parse(match[1]);for(const key of Object.keys(map.imports)){if(key.includes('/app/claude-gorilla-runtime.js'))map.imports[key]='/67park-foundation-next/app/claude-gorilla-runtime.js?v=punch-burst-1';}
 source=source.replace(match[1],JSON.stringify(map));fs.writeFileSync(file,source);
}
console.log('RUNNING_CAMERA_AND_PUNCH_ANCHORS_SYNCED');
