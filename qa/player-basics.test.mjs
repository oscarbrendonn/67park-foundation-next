import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {connectionView,readPlayerDiagnostics,makeBugReport} from '../app/player-diagnostics.js';

const key='67park.feel-lab.player-settings.v1';
let revision=0;
async function settingsWith(storage){
 globalThis.localStorage=storage;
 delete globalThis[Symbol.for('67park.player-settings.v1')];
 delete globalThis[Symbol.for('67park.settings-save.v1')];
 return import('../app/player-settings.js?test='+ ++revision);
}
const memory=()=>{
 const values=new Map();
 return {values,getItem:k=>values.get(k)??null,setItem:(k,v)=>values.set(k,v)};
};
test('settings save is confirmed and resets never erase character, outfit or session',async()=>{
 const storage=memory();storage.setItem('character','keep');storage.setItem('session','keep');
 const m=await settingsWith(storage);assert.equal(m.settingsSaveStatus(),'ready');
 m.setPlayerSetting('touchSensitivity',1.4);m.setPlayerSetting('showNames',false);
 assert.equal(m.settingsSaveStatus(),'saved');assert.equal(JSON.parse(storage.getItem(key)).touchSensitivity,1.4);
 assert.equal(m.savePlayerSettings(),true);
 m.resetPlayerSettings();assert.deepEqual(m.playerSettings,m.DEFAULTS);
 assert.equal(storage.getItem('character'),'keep');assert.equal(storage.getItem('session'),'keep');
});
test('denied storage, quota errors and silent writes do not throw or claim success',async()=>{
 for(const storage of [
  {getItem(){throw Error('Denied')},setItem(){throw Error('Denied')}},
  {getItem(){return null},setItem(){throw Error('Quota')}},
  {getItem(){return null},setItem(){}}
 ]){
  const m=await settingsWith(storage);
  assert.doesNotThrow(()=>m.setPlayerSetting('sfx',.35));
  assert.equal(m.playerSettings.sfx,.35);assert.equal(m.settingsSaveStatus(),'error');
  assert.equal(m.savePlayerSettings(),false);
 }
});
test('corrupt settings fall back safely and can be saved after recovery',async()=>{
 const storage=memory();storage.setItem(key,'{broken');
 const m=await settingsWith(storage);
 assert.deepEqual(m.playerSettings,m.DEFAULTS);assert.equal(m.settingsSaveStatus(),'recovered');
 assert.equal(m.savePlayerSettings(),true);assert.equal(m.settingsSaveStatus(),'saved');
});
test('transient save failures recover without losing live preferences',async()=>{
 const storage=memory(),write=storage.setItem;
 const m=await settingsWith(storage);storage.setItem=()=>{throw Error('Quota')};
 m.setPlayerSetting('mouseSensitivity',1.7);assert.equal(m.settingsSaveStatus(),'error');
 storage.setItem=write;assert.equal(m.savePlayerSettings(),true);
 assert.equal(JSON.parse(storage.getItem(key)).mouseSensitivity,1.7);
});
test('connection status separates two transports, offline and another tab',()=>{
 assert.equal(connectionView().state,'reconnecting');
 assert.equal(connectionView({worldConnected:true}).state,'partial');
 assert.equal(connectionView({socialConnected:true}).state,'partial');
 assert.equal(connectionView({worldConnected:true,socialConnected:true}).state,'connected');
 assert.equal(connectionView({online:false,worldConnected:true,socialConnected:true}).state,'offline');
 assert.equal(connectionView({displaced:true,socialConnected:true}).state,'other-tab');
 assert.equal(readPlayerDiagnostics({__candyOnline:{getSnapshot:()=>({error:'This account is open in another tab.'})}}).state,'other-tab');
});
test('bug report has version and both connections but no auth, names, invites or error text',()=>{
 const host={location:new URL('https://example.test/park/?token=SECRET&room=PRIVATE#secret'),navigator:{onLine:true,userAgent:'Browser QA'},innerWidth:390,innerHeight:844,
  __eggyNet:{connected:true,id:'PLAYER-PRIVATE',token:'SECRET'},__candyOnline:{getSnapshot:()=>({connected:false,me:{name:'PRIVATE-NAME'},room:{code:'PRIVATE-ROOM'}})},
  __candyErrors:['PRIVATE-ERROR'],document:{documentElement:{dataset:{gameplayAvatarState:'ready'}}}};
 const report=makeBugReport({host,saveState:'saved',description:'I tapped Jump.'});
 assert.match(report,/foundation-basics-1/);assert.match(report,/park: connected; social: disconnected/);
 assert.match(report,/error count: 1/);assert.match(report,/I tapped Jump\./);
 for(const secret of ['SECRET','PRIVATE','?token','#secret'])assert(!report.includes(secret));
 assert.equal(makeBugReport({description:'x'.repeat(5000)}).split('Your description:\n')[1].length,2000);
});
test('entry release keys invalidate changed modules and guest copy is honest',()=>{
 const read=p=>fs.readFileSync(new URL('../'+p,import.meta.url),'utf8');
 for(const p of ['app/chunk-A5QZM2VZ.js','app/chunk-OTLFO3YT.js']){
  assert(!read(p).includes('friends survive a server restart'));
  assert(read(p).includes('not in a cloud account'));
 }
 assert(read('index.html').includes('player-settings.js?v=recovery-graphics-1'));
 assert(read('index.html').includes('party-pack.js?v=foundation-next-movement-1'));
 assert(read('play/index.html').includes('chunk-A5QZM2VZ.js?v=recovery-graphics-1'));
 assert(read('app/party/party-pack.js').includes('settings-panel.js?v=recovery-graphics-1'));
 const config=read('index.html').match(/window\.__partyConfig=\{runtime:"([^"]+)",carry:"([^"]+)"\}/);
 assert(config,'Party runtime config missing');
 assert(read('app/main.js').includes('claude-gorilla-runtime.js?v='+config[1]+'"'),'Dynamic party runtime must equal main runtime URL');
 assert(read('app/main.js').includes('park-carry.js?v='+config[2]+'"'),'Dynamic carry must equal main carry URL');
 assert(read('app/preview-network.js').includes("const key='67park.feel-lab.guest.v1.'"),'Feel Lab must not overwrite the protected Kimi guest key on the shared Pages origin');
});
