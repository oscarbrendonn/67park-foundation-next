const assert=require('node:assert/strict');
const test=require('node:test');
const fs=require('node:fs');
const {prepareJumpInput}=require('./jump-input.cjs');

function fixture({enabled=true,box={x:20,y:60,width:40,height:50},target=true}={}){
 const calls=[];
 const page={
  getByRole(role,options){calls.push(['role',role,options]);return {
   async waitFor(options){calls.push(['visible',options]);},
   async isEnabled(){return enabled;},
   async boundingBox(){return box;},
  };},
  async evaluate(callback,point){calls.push(['target',point]);return target;},
  touchscreen:{async tap(x,y){calls.push(['touch',x,y]);}},
  keyboard:{async press(code){calls.push(['key',code]);}},
 };
 return {page,calls};
}

test('prepared mobile jump validates the visible enabled hit target before real taps',async()=>{
 const {page,calls}=fixture();const jump=await prepareJumpInput(page,{mobile:true,timeout:1234});
 assert.equal(calls.some(c=>c[0]==='touch'),false);
 assert.deepEqual(calls.find(c=>c[0]==='visible'),['visible',{state:'visible',timeout:1234}]);
 await jump();await jump();
 assert.equal(calls.filter(c=>c[0]==='role').length,1);
 assert.deepEqual(calls.filter(c=>c[0]==='touch'),[['touch',40,85],['touch',40,85]]);
});

for(const [name,options]of [['disabled',{enabled:false}],['missing bounds',{box:null}],['empty bounds',{box:{x:0,y:0,width:0,height:10}}],['occluded',{target:false}]]){
 test('prepared jump rejects '+name+' before dispatch',async()=>{
  const {page,calls}=fixture(options);
  await assert.rejects(()=>prepareJumpInput(page,{mobile:true}));
  assert.equal(calls.some(c=>c[0]==='touch'),false);
 });
}

test('desktop jump keeps the actual keyboard path without resolving a mobile button',async()=>{
 const {page,calls}=fixture();const jump=await prepareJumpInput(page);
 await jump();assert.deepEqual(calls,[['key','Space']]);
});

test('Ferris prepares trusted HUD input and observation before arming a moving cabin',()=>{
 const code=fs.readFileSync(require.resolve('./ride-contacts.browser.cjs'),'utf8');
 const jumpCase=code.slice(code.indexOf("await check('ride contacts: jumping and walking off"));
 assert(code.includes("require('./jump-input.cjs')"));
 assert(jumpCase.indexOf('await prepareJumpInput(page,{mobile})')<jumpCase.indexOf('await freshFerrisPlacement({descending:true})'));
 assert(jumpCase.indexOf('requestAnimationFrame(observeAir)')<jumpCase.indexOf('window.__qaRideJumpArmed=value'));
 assert(!code.includes("name:'Jump',exact:true}).tap()"),'no per-jump locator stability frames');
});

test('Ferris arms away from the turning point but retains every event-time release bound',()=>{
 const code=fs.readFileSync(require.resolve('./ride-contacts.browser.cjs'),'utf8');
 assert(code.includes('cabin?.floorVelocity>-.38&&cabin.floorVelocity<-.32&&cabin.horizontalVelocity>.9'));
 assert(code.includes('airborne.accepted&&airborne.rows.length>=3&&airborne.maxGap>.07&&airborne.cabinTravel>.025&&airborne.bodyTravel<.1&&airborne.inputKinematics?.floorVelocity<-.05&&Math.abs(airborne.inputKinematics.horizontalVelocity)>.3'));
 assert(code.includes('s?.jumpsLeft===1&&Math.abs(v.y)<.2&&Math.abs(p.y-.555-floor)<.08'));
 assert(code.includes('for(let f=0;f<12;f++)await frame()'),'retain grounded settling frames');
});

test('Ferris requires exactly one trusted keyboard or Jump-targeted touch event',()=>{
 const code=fs.readFileSync(require.resolve('./ride-contacts.browser.cjs'),'utf8');
 assert(code.includes('isTrusted:e.isTrusted'));
 assert(code.includes('assert.equal(airborne.events.length,1'));
 assert(code.includes('assert.equal(airborne.events[0].isTrusted,true'));
 assert(code.includes("assert.equal(airborne.events[0].target,'Jump'"));
 assert(code.includes('window.__qaRideJumpArmed&&dispatched&&gap>.07'),'no airborne samples before the trusted input');
 assert(code.includes('delete window.__qaRideJumpArmed'));
});
