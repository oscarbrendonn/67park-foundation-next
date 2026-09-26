import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {installTargetClubWeekly,targetWeek} from '../server/target-club-weekly.mjs';
import {startTargetRound,targetPositions} from '../app/party/target-club-rules.js';
function fixture(options={}){
 let at=Date.parse('2026-09-24T12:00:00Z'),seq=0;const sent=[];
 const file=options.file===undefined?path.join(fs.mkdtempSync(path.join(os.tmpdir(),'67park-weekly-')),'scores.json'):options.file;
 const hub={players:new Map(),lobbies:new Map([['A',{members:new Set()}],['B',{members:new Set()}]]),message(){},update(){},send(ws,m){sent.push({to:ws.id,...m});},islandWorld:()=>({mounts:new Map()})};
 const a={id:'alice',name:'Alice',online:{id:'alice'},lobbyId:'A',lastPosition:{p:[172,9.7825,-143]}},b={id:'bob',name:'Bob',online:{id:'bob'},lobbyId:'B',lastPosition:{p:[172,9.7825,-143]}};
 for(const p of[a,b]){hub.players.set(p.id,p);hub.lobbies.get(p.lobbyId).members.add(p.id);}
 const api=installTargetClubWeekly({hubs:new Map([['kimi',hub]])},{file,now:()=>at});
 function act(p,action,extra={}){const request='q'+ ++seq;hub.message(p,{t:'target.'+action,request,...extra});return sent.findLast(m=>m.request===request);}
 function hit(p,start,seconds=.5,id=0){const r=startTargetRound();r.seed=start.seed;r.time=seconds;const target=targetPositions(r)[id];return act(p,'shot',{run:start.run,seq:id+1,time:seconds,x:target.x,y:target.y});}
 return{a,b,api,hub,act,hit,sent,file,advance:n=>at+=n,set:n=>at=n,now:()=>at};
}
test('UTC Monday boundary, including year boundary',()=>{
 assert.equal(targetWeek(Date.parse('2026-09-27T23:59:59Z')).key,'2026-09-21');assert.equal(targetWeek(Date.parse('2026-09-28T00:00:00Z')).key,'2026-09-28');
 assert.equal(targetWeek(Date.parse('2027-01-01T00:00:00Z')).key,'2026-12-28');
});
test('two authenticated players share table across islands, scores replayed and survive reload',()=>{
 const f=fixture(),a=f.act(f.a,'start'),b=f.act(f.b,'start');assert(a.ok&&b.ok);f.advance(500);assert.equal(f.hit(f.a,a).score,100);assert.equal(f.hit(f.b,b).score,100);
 f.advance(30000);assert(f.act(f.a,'finish',{run:a.run,score:999999}).ok);f.advance(1);assert(f.act(f.b,'finish',{run:b.run}).ok);
 const table=f.act(f.b,'board').board;assert.deepEqual(table.rows.map(r=>r.name),['Alice','Bob']);assert.equal(table.you.rank,2);assert.equal(table.you.score,100);
 const loaded=fixture({file:f.file});assert.equal(loaded.act(loaded.a,'board').board.you.score,100);
});
test('one best entry per guest, lower result and duplicate finish cannot overwrite',()=>{
 const f=fixture(),run=f.act(f.a,'start');f.advance(500);f.hit(f.a,run);f.advance(30000);assert(f.act(f.a,'finish',{run:run.run}).ok);assert.equal(f.act(f.a,'finish',{run:run.run}).ok,false);
 const second=f.act(f.a,'start');assert(second.ok);f.advance(30000);assert(f.act(f.a,'finish',{run:second.run,score:20000}).ok);
 const board=f.act(f.a,'board').board;assert.equal(board.rows.length,1);assert.equal(board.you.score,100);
});
test('remote start, forged identity, reordered/duplicate/future shots and early finish rejected',()=>{
 const f=fixture();f.b.lastPosition.p=[0,10,0];assert.equal(f.act(f.b,'start').ok,false);
 const run=f.act(f.a,'start');f.advance(500);assert.equal(f.act(f.b,'shot',{run:run.run,player:'alice',seq:1,time:.5,x:180,y:220}).ok,false);
 assert.equal(f.act(f.a,'shot',{run:run.run,seq:1,time:20,x:180,y:220}).ok,false);
 assert(f.hit(f.a,run).ok);assert.equal(f.hit(f.a,run).ok,false);assert.equal(f.act(f.a,'finish',{run:run.run}).ok,false);
 const fake={...f.a,online:{id:'evil'}};assert.equal(f.act(fake,'board'),undefined);
});
test('disconnect/cancel/week rollover invalidate attempts; new week starts empty',()=>{
 const f=fixture(),run=f.act(f.a,'start');f.a.online=null;f.hub.update();assert.equal(f.api.activeRounds,0);f.a.online={id:'alice'};assert.equal(f.act(f.a,'finish',{run:run.run}).ok,false);
 f.advance(3000);const r=f.act(f.a,'start');f.act(f.a,'cancel',{run:r.run});assert.equal(f.api.activeRounds,0);
 f.advance(3000);const r2=f.act(f.a,'start');f.set(Date.parse('2026-09-28T00:00:00Z'));f.hub.update();assert.equal(f.act(f.a,'finish',{run:r2.run}).ok,false);assert.equal(f.act(f.a,'board').board.rows.length,0);
});
test('no persistent store or corrupt store fails closed without replacing data',()=>{
 const off=fixture({file:null});assert.equal(off.act(off.a,'board').board.available,false);assert.equal(off.act(off.a,'start').ok,false);
 const file=path.join(fs.mkdtempSync(path.join(os.tmpdir(),'67park-weekly-corrupt-')),'scores.json');fs.writeFileSync(file,'broken');
 const f=fixture({file});assert(f.api.storageError);assert.equal(f.act(f.a,'start').ok,false);assert.equal(fs.readFileSync(file,'utf8'),'broken');
});
test('request floods have a bounded reply budget',()=>{
 const f=fixture();for(let i=0;i<1000;i++)f.act(f.a,'board');assert(f.sent.length<=12);
});
