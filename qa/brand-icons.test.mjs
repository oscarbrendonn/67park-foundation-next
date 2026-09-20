import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {ROOT,BRAND_PAGES,ICON_SIZES,iconPath,withBrandIcons} from './brand-icons.mjs';

test('browser/share icons are square PNGs, not the wide in-game wordmark',()=>{
 for(const size of ICON_SIZES){
  const png=fs.readFileSync(path.join(ROOT,iconPath(size)));
  assert.equal(png.subarray(1,4).toString(),'PNG');
  assert.equal(png.readUInt32BE(16),size);assert.equal(png.readUInt32BE(20),size);
  assert(png.length<150000,'Keep the icon download small');
 }
 const source=fs.readFileSync(path.join(ROOT,'brand/67park-logo.png'));
 assert.equal(source.readUInt32BE(16),1065);assert.equal(source.readUInt32BE(20),330);
});

test('each playable/shareable page declares the same full-wordmark Apple and link icons',()=>{
 for(const file of BRAND_PAGES){
  const html=fs.readFileSync(path.join(ROOT,file),'utf8');
  assert.equal(html,withBrandIcons(html),'Metadata regeneration must be idempotent: '+file);
  assert.equal((html.match(/rel="apple-touch-icon"/g)||[]).length,1,file);
  assert(html.includes('sizes="180x180" href="/67park-foundation-next/'+iconPath(180)+'"'),file);
  assert(!/<link\b[^>]*href=["'][^"']*67park-logo\.png/.test(html),file);
  assert(html.includes('property="og:image" content="https://oscarbrendonn.github.io/67park-foundation-next/'+iconPath(512)+'"'),file);
  for(const size of [32,192,512])assert(html.includes(`sizes="${size}x${size}"`),file);
 }
});

test('icon migration leaves body, game imports and page title intact',()=>{
 const source='<html><head><meta charset="utf-8"><title>Park</title><link rel="icon" href="wide.png"><script type="importmap">{"imports":{"three":"/three.js"}}</script></head><body><img src="brand/67park-logo.png"><script src="game.js"></script></body></html>';
 const out=withBrandIcons(source);
 assert(out.endsWith(source.slice(source.indexOf('</head>'))));
 assert(out.includes('<title>Park</title>'));
 assert(out.includes('<script type="importmap">{"imports":{"three":"/three.js"}}</script>'));
 assert.equal(withBrandIcons(out),out);
 for(const body of ['<body><div>Game</div>','<main>Overview</main>']){
  const implicit='<html><meta charset="utf-8"><title>Park</title>'+body+'</html>';
  const updated=withBrandIcons(implicit);
  assert(updated.endsWith(body+'</html>'));assert.equal(withBrandIcons(updated),updated);
 }
});
