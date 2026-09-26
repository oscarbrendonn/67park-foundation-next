import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {targetClubRelease} from './refresh-target-club-release.mjs';
import {createTargetRound,startTargetRound,advanceTargetRound,targetPositions,shootTarget,nearTargetBooth} from '../app/party/target-club-rules.js';
test('ready/result reject fire, 30 seconds ends exactly, no score after expiry',()=>{
 let r=createTargetRound();assert.equal(shootTarget(r,180,220),null);r=startTargetRound();advanceTargetRound(r,30);assert.equal(r.phase,'finished');assert.equal(r.time,30);assert.equal(shootTarget(r,180,220),null);advanceTargetRound(r,99);assert.equal(r.time,30);
});
test('centre, ring, misses, cooldown and target recovery',()=>{
 const r=startTargetRound();assert.equal(shootTarget(r,180,220,true).points,100);assert.equal(shootTarget(r,450,220,true),null);
 advanceTargetRound(r,.2);assert.equal(shootTarget(r,180,220,true).points,0);
 advanceTargetRound(r,.2);assert.equal(shootTarget(r,490,220,true).points,25);
 advanceTargetRound(r,.6);assert.equal(shootTarget(r,180,220,true).points,100);assert.equal(r.score,225);assert.equal(r.hits,3);assert.equal(r.shots,4);
});
test('bounds, invalid time, reset, reduced motion',()=>{
 const r=startTargetRound();for(const dt of [NaN,Infinity,-1])advanceTargetRound(r,dt);assert.equal(r.time,0);assert.equal(shootTarget(r,NaN,0),null);
 const a=targetPositions(r,true);advanceTargetRound(r,7);assert.deepEqual(targetPositions(r,true),a);assert.notDeepEqual(targetPositions(r,false),a);
 for(let t=0;t<30;t++){r.time=t;for(const p of targetPositions(r))assert(p.x>50&&p.x<850&&p.y>140&&p.y<460);}
 assert.equal(startTargetRound().score,0);
});
test('entry is front only, bounded, height aware; no remote or rear activation',()=>{
 const s={x:168,y:9,z:-143,yaw:Math.PI/2};assert(nearTargetBooth({x:172,y:9.555,z:-143},s));
 for(const p of [{x:164,y:9.555,z:-143},{x:180,y:9.555,z:-143},{x:172,y:20,z:-143},{x:172,y:9.555,z:-150}])assert(!nearTargetBooth(p,s));
 assert(!nearTargetBooth(null,s));assert(!nearTargetBooth({x:NaN,y:9,z:-143},s));
});
test('release preserves unrelated cache mappings and versions all party entry aliases',()=>{
 const before=fs.readFileSync(new URL('../index.html',import.meta.url),'utf8'),after=targetClubRelease(before),rx=/<script type="importmap">([\s\S]*?)<\/script>/;
 const a=JSON.parse(before.match(rx)[1]).imports,b=JSON.parse(after.match(rx)[1]).imports;
 for(const [k,v]of Object.entries(a)){if(k.includes('/party/party-pack.js'))assert.equal(b[k],'/67park-foundation-next/app/party/party-pack.js?v=target-club-1');else assert.equal(b[k],v);}
 assert.equal(targetClubRelease(after),after);
});
