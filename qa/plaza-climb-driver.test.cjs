const test=require('node:test');
const assert=require('node:assert/strict');
const {stableWallContact}=require('./plaza-climb.browser.cjs');

function fixture(run){
 const names=['window','__islandWorld','__eggyInput'];
 const saved=names.map(name=>({name,had:Object.hasOwn(globalThis,name),value:globalThis[name]}));
 const position={x:17.03,y:10.215,z:57.5},input={x:-1,z:0,run:true};
 const renderer={info:{render:{frame:0}}};
 globalThis.window={__qaPlazaWallSamples:[]};
 globalThis.__islandWorld={renderer};
 globalThis.__eggyInput={input,playerRef:{body:{translation:()=>({...position})}}};
 const sample=()=>{renderer.info.render.frame++;return !!stableWallContact();};
 try{run({position,input,renderer,sample});}
 finally{for(const {name,had,value}of saved){if(had)globalThis[name]=value;else delete globalThis[name];}}
}

test('plaza wall plateau requires eight distinct rendered frames, not repeated polling',()=>fixture(({sample})=>{
 assert.equal(sample(),false);
 for(let i=0;i<40;i++)assert.equal(!!stableWallContact(),false);
 for(let i=0;i<6;i++)assert.equal(sample(),false);
 assert.equal(sample(),true);
}));

test('plaza wall plateau cannot pass after the driver releases movement',()=>fixture(({input,sample})=>{
 input.x=0;
 for(let i=0;i<12;i++)assert.equal(sample(),false);
 input.x=-1;
 for(let i=0;i<7;i++)assert.equal(sample(),false);
 assert.equal(sample(),true);
}));

test('plaza wall plateau rejects continued travel even inside the closed-wall bounds',()=>fixture(({position,sample})=>{
 for(let i=0;i<8;i++){position.x=17.3-i*.04;assert.equal(sample(),false);}
 for(let i=0;i<7;i++)sample();
 assert.equal(sample(),true);
}));

test('plaza wall plateau retains the existing exterior and ground-height bounds',()=>{
 for(const position of [{x:16.8,y:10.215},{x:17.6,y:10.215},{x:17.03,y:11.2}])fixture(state=>{
  Object.assign(state.position,position);
  for(let i=0;i<10;i++)assert.equal(state.sample(),false);
 });
});
