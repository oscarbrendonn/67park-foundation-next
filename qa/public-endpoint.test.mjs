import test from 'node:test';
import assert from 'node:assert/strict';
import {endpointBranch,endpointManifest,parseQuickTunnelURL,publishEndpoint} from '../server/public-endpoint.mjs';

const repo='repos/oscarbrendonn/67park-foundation-next';
const backend='https://quiet-island.trycloudflare.com';
const at=new Date('2026-09-21T00:00:00.000Z');
const manifest=origin=>Buffer.from(JSON.stringify({version:1,backend:origin,updatedAt:'2026-01-01T00:00:00.000Z'})).toString('base64');
const failure=status=>Object.assign(Error('API failure'),{status});

test('endpoint manifest only accepts a bare HTTPS quick-tunnel origin',()=>{
 assert.deepEqual(endpointManifest(backend,at),{version:1,backend,updatedAt:at.toISOString()});
 for(const url of [
  'http://quiet-island.trycloudflare.com',
  'https://quiet-island.example.com',
  'https://quiet-island.trycloudflare.com/path',
  'https://quiet-island.trycloudflare.com?x=1',
  'https://user@quiet-island.trycloudflare.com',
  'https://quiet-island.trycloudflare.com:8443',
 ])assert.throws(()=>endpointManifest(url),/Invalid public preview origin/);
});

test('quick-tunnel parser finds a URL after split output only once the complete URL is buffered',()=>{
 const first='INF tunnel assigned https://quiet-';
 const second='island.trycloudflare.com | metrics';
 assert.equal(parseQuickTunnelURL(first),null);
 assert.equal(parseQuickTunnelURL(first+second),backend);
 assert.equal(parseQuickTunnelURL('https://quiet-island.trycloudflare.com.evil.example'),null);
});

test('missing operational branch is created as an orphan endpoint branch',async()=>{
 const calls=[];
 const api=async(...args)=>{
  calls.push(args);
  const [route]=args;
  if(route===repo+'/contents/backend.json?ref='+endpointBranch)throw failure(404);
  if(route===repo+'/git/ref/heads/'+endpointBranch)throw failure(404);
  if(route===repo+'/git/trees')return {sha:'tree-sha'};
  if(route===repo+'/git/commits')return {sha:'commit-sha'};
  if(route===repo+'/git/refs')return {};
  throw Error('Unexpected API route');
 };
 const result=await publishEndpoint(backend,{api,now:at});
 assert.equal(result.changed,true);
 assert.deepEqual(calls.map(([route])=>route),[
  repo+'/contents/backend.json?ref='+endpointBranch,
  repo+'/git/ref/heads/'+endpointBranch,
  repo+'/git/trees',repo+'/git/commits',repo+'/git/refs',
 ]);
 assert.deepEqual(calls[3][1].parents,[]);
 assert.deepEqual(calls[4][1],{ref:'refs/heads/'+endpointBranch,sha:'commit-sha'});
});

test('existing endpoint file is updated with its required revision sha',async()=>{
 const calls=[];
 const api=async(...args)=>{
  calls.push(args);
  if(args[0]===repo+'/contents/backend.json?ref='+endpointBranch)return {sha:'current-sha',content:manifest('https://old-island.trycloudflare.com')};
  if(args[0]===repo+'/contents/backend.json')return {};
  throw Error('Unexpected API route');
 };
 await publishEndpoint(backend,{api,now:at});
 assert.equal(calls.length,2);
 assert.equal(calls[1][2],'PUT');
 assert.equal(calls[1][1].branch,endpointBranch);
 assert.equal(calls[1][1].sha,'current-sha');
});

test('an unchanged endpoint makes no write request',async()=>{
 const calls=[];
 const api=async(...args)=>{
  calls.push(args);
  return {sha:'current-sha',content:manifest(backend)};
 };
 const result=await publishEndpoint(backend,{api,now:at});
 assert.equal(result.changed,false);
 assert.equal(calls.length,1);
});

test('a forbidden content read makes no fallback write requests',async()=>{
 const calls=[];
 const api=async(...args)=>{calls.push(args);throw failure(403);};
 await assert.rejects(()=>publishEndpoint(backend,{api,now:at}),error=>error.status===403);
 assert.equal(calls.length,1);
});
