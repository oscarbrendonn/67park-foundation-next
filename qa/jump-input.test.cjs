const assert=require('node:assert/strict');
const test=require('node:test');
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
