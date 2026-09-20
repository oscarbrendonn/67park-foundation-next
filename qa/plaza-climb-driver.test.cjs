const test=require('node:test');
const assert=require('node:assert/strict');
const {stableWallContact,plazaJumpAccepted}=require('./plaza-climb.browser.cjs');

function fixture(run){
 const names=['window','__islandWorld','__eggyInput'];
 const saved=names.map(name=>({name,had:Object.hasOwn(globalThis,name),value:globalThis[name]}));
 const position={x:17.03,y:10.215,z:57.5},input={x:-1,z:0,run:true};
 const velocity={x:0,y:6,z:0},gorilla={grounded:false,jumped:0,jumpsLeft:1,frames:11};
 const renderer={info:{render:{frame:0}}};
 globalThis.window={__qaPlazaWallSamples:[],__qaPlazaGorillaState:()=>({...gorilla})};
 globalThis.__islandWorld={renderer};
 globalThis.__eggyInput={input,playerRef:{body:{translation:()=>({...position}),linvel:()=>({...velocity})}}};
 const sample=()=>{renderer.info.render.frame++;return !!stableWallContact();};
 try{run({position,input,renderer,sample,velocity,gorilla});}
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

test('plaza ground-jump proof survives the one-frame jumped flag resetting',()=>fixture(({position,gorilla})=>{
 position.y=12.5;
 assert.equal(gorilla.jumped,0);
 assert.equal(plazaJumpAccepted({before:{y:12,frames:10},minVelocity:3,expectedJumpsLeft:1}),true);
 gorilla.jumped=1;
 assert.equal(plazaJumpAccepted({before:{y:12,frames:10},minVelocity:3,expectedJumpsLeft:1}),true);
}));

test('plaza jump proof rejects the wrong persistent jump budget',()=>fixture(({position,gorilla})=>{
 position.y=12.5;
 const args={before:{y:12,frames:10},minVelocity:4,expectedJumpsLeft:0};
 assert.equal(plazaJumpAccepted(args),false);
 gorilla.jumpsLeft=0;
 assert.equal(plazaJumpAccepted(args),true);
 assert.equal(plazaJumpAccepted({...args,expectedJumpsLeft:1}),false);
}));

test('plaza jump proof still requires real upward movement above its original bounds',()=>fixture(({position,velocity})=>{
 const args={before:{y:12,frames:10},minVelocity:4,expectedJumpsLeft:1};
 position.y=12.1;
 assert.equal(plazaJumpAccepted(args),false);
 position.y=12.5;velocity.y=4;
 assert.equal(plazaJumpAccepted(args),false);
 velocity.y=-1;
 assert.equal(plazaJumpAccepted(args),false);
 velocity.y=4.1;
 assert.equal(plazaJumpAccepted(args),true);
}));

test('plaza jump proof rejects grounded or stale controller samples',()=>fixture(({position,gorilla})=>{
 position.y=12.5;
 const args={before:{y:12,frames:10},minVelocity:3,expectedJumpsLeft:1};
 gorilla.grounded=true;
 assert.equal(plazaJumpAccepted(args),false);
 gorilla.grounded=false;gorilla.frames=10;
 assert.equal(plazaJumpAccepted(args),false);
 gorilla.frames=9;
 assert.equal(plazaJumpAccepted(args),false);
 gorilla.frames=11;
 assert.equal(plazaJumpAccepted(args),true);
}));
