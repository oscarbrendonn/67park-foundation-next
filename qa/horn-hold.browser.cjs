// Narrow DOM/input + real OfflineAudioContext check. No server, car ownership
// mutation, external network session or physical audio-device output.
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const {chromium}=require('playwright'),{browserLaunchOptions}=require('./browser-launch.cjs');
const out=path.resolve('.qa-results/horn-hold-20260926',new Date().toISOString().replaceAll(':','-'));
fs.mkdirSync(out,{recursive:true});const report={scope:'isolated driver-control fixture; desktop and emulated mobile; offline sound only',runs:[]};
const html=`<!doctype html><meta name="viewport" content="width=device-width,initial-scale=1"><input aria-label="Chat" id="chat"><button id="drive">Steer</button><script type="module">
import {createVehicleHorn} from '/vehicle-horn.js';import {createPartyAudio} from '/party-audio.js';
const state=window.qa={driver:true,muted:true,clock:0,created:0,starts:0,stops:0};
const host={document,addEventListener:window.addEventListener.bind(window),AudioContext:class{constructor(){state.created++;const offline=state.offline=new OfflineAudioContext(1,144000,48000);return new Proxy(offline,{get(target,key){if(key==='state')return 'running';if(key==='currentTime')return state.clock;const value=Reflect.get(target,key,target);return typeof value==='function'?value.bind(target):value;}});}}};
state.audio=createPartyAudio({host,settings:{sfx:.8},saveSettings(){},gameMuted:()=>state.muted});
state.horn=createVehicleHorn({driver:()=>state.driver,play:()=>state.audio.play('horn'),start:()=>{state.starts++;state.audio.startHorn();},stop:()=>{state.stops++;state.audio.stopHorn();}});
window.ready=true;
</script>`;
function wav(samples){const b=Buffer.alloc(44+samples.length*2);b.write('RIFF',0);b.writeUInt32LE(b.length-8,4);b.write('WAVEfmt ',8);b.writeUInt32LE(16,16);b.writeUInt16LE(1,20);b.writeUInt16LE(1,22);b.writeUInt32LE(48000,24);b.writeUInt32LE(96000,28);b.writeUInt16LE(2,32);b.writeUInt16LE(16,34);b.write('data',36);b.writeUInt32LE(samples.length*2,40);samples.forEach((x,i)=>b.writeInt16LE(Math.round(Math.max(-1,Math.min(1,x))*32767),44+i*2));return b;}
(async()=>{
 const browser=await chromium.launch(browserLaunchOptions());
 try{for(const mobile of [false,true]){
  const ctx=await browser.newContext({viewport:mobile?{width:390,height:844}:{width:1000,height:700},isMobile:mobile,hasTouch:mobile});
  const page=await ctx.newPage(),run={mobile,errors:[]};report.runs.push(run);page.on('pageerror',e=>run.errors.push(e.message));
  await page.route('https://horn-preview.test/**',r=>{const name=new URL(r.request().url()).pathname;return r.fulfill({contentType:name.endsWith('.js')?'text/javascript':'text/html',body:name==='/vehicle-horn.js'?fs.readFileSync('app/party/vehicle-horn.js'):name==='/party-audio.js'?fs.readFileSync('app/party/party-audio.js'):html});});
  try{
   await page.goto('https://horn-preview.test/');await page.waitForFunction(()=>window.ready);
   const horn=page.getByRole('button',{name:'Sound vehicle horn',exact:true});const box=await horn.boundingBox();assert(box);
   const cdp=await ctx.newCDPSession(page),point={x:box.x+box.width/2,y:box.y+box.height/2,id:7};
   const press=async()=>mobile?cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[point]}):page.keyboard.down('KeyH');
   const release=async()=>mobile?cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]}):page.keyboard.up('KeyH');
   await press();await page.waitForTimeout(1100);assert.equal(await page.evaluate(()=>qa.horn.stats().held),true);
   if(!mobile){await page.keyboard.down('KeyH');assert.equal(await page.evaluate(()=>qa.starts),1);}
   if(mobile)await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{...point,x:point.x+120,y:point.y-80}]});
   await release();assert.equal(await page.evaluate(()=>qa.horn.stats().held),false);
   assert.equal(await page.evaluate(()=>qa.created),0,'muted hold must not allocate WebAudio');run.mutedHold=true;
   await page.waitForTimeout(140);await page.keyboard.down('KeyH');await page.getByRole('textbox',{name:'Chat'}).focus();
   assert.equal(await page.evaluate(()=>qa.horn.stats().held),false);await page.keyboard.up('KeyH');
   const before=await page.evaluate(()=>qa.horn.stats().emitted);await page.keyboard.type('hhh');assert.equal(await page.evaluate(()=>qa.horn.stats().emitted),before);run.chatSafe=true;
   await horn.focus();await page.waitForTimeout(140);await page.keyboard.down('Space');assert.equal(await page.evaluate(()=>qa.horn.stats().held),true);
   await page.keyboard.up('Space');assert.equal(await page.evaluate(()=>qa.horn.stats().held),false);run.nativeButtonHold=true;
   await page.waitForTimeout(140);await press();await page.evaluate(()=>{qa.driver=false;qa.horn.step();});
   assert.equal(await page.evaluate(()=>qa.horn.stats().held),false);await release();run.driverExit=true;
   await page.evaluate(()=>{qa.driver=true;qa.horn.step();qa.muted=false;});await page.waitForTimeout(140);
   // Render a 1.75 s hold with a 40 ms release, entirely into an offline buffer.
   await press();await page.waitForTimeout(1100);assert.equal(await page.evaluate(()=>qa.audio.stats().hornActive),true);
   assert.equal(await page.evaluate(()=>qa.audio.stats().voices),1);await page.evaluate(()=>qa.clock=1.75);await release();
   assert.equal(await page.evaluate(()=>qa.audio.stats().hornActive),false);
   const audio=await page.evaluate(async()=>{const buffer=await qa.offline.startRendering(),s=buffer.getChannelData(0);
    const rms=(a,b)=>{let e=0;for(let i=a*48000;i<b*48000;i++)e+=s[i]*s[i];return Math.sqrt(e/((b-a)*48000));};
    let peak=0,crossings=0;for(let i=0;i<s.length;i++)peak=Math.max(peak,Math.abs(s[i]));
    for(let i=4801;i<72000;i++)if(s[i-1]<=0&&s[i]>0)crossings++;
    return {samples:Array.from(s),peak,early:rms(.1,.3),sustain:rms(1.2,1.6),tail:rms(2,2.8),frequency:crossings/1.4,stats:qa.audio.stats()};});
   fs.writeFileSync(path.join(out,mobile?'horn-touch.wav':'horn-preview.wav'),wav(audio.samples));delete audio.samples;
   run.audio=audio;
   assert(audio.peak>.01&&audio.peak<.8);assert(audio.sustain>.015);assert(Math.abs(audio.early/audio.sustain-1)<.1);
   assert(audio.tail<.00001);assert(Math.abs(audio.frequency-440)<2);assert.equal(audio.stats.voices,0);assert.equal(audio.stats.counts.horn,1);
   assert.deepEqual(run.errors,[]);run.pass=true;console.log('HORN_HOLD_PASS',JSON.stringify(run));await cdp.detach();
  }finally{await ctx.close();}
 }}catch(e){report.failure=String(e);throw e;}finally{fs.writeFileSync(path.join(out,'report.json'),JSON.stringify(report,null,2));await browser.close();console.log('EVIDENCE',out);}
})().catch(e=>{console.error(e);process.exitCode=1;});
