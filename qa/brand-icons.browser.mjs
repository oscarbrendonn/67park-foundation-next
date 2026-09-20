// Metadata and artwork checks only. Scripts/network are disabled here; the
// separate foundation suite still runs the complete game and recovery flows.
import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import {chromium} from 'playwright';
import {ROOT,BRAND_PAGES,ICON_SIZES,iconPath} from './brand-icons.mjs';
const mac='/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const browser=await chromium.launch({headless:true,...(process.platform==='darwin'&&fs.existsSync(mac)?{executablePath:mac}:{})});
try{
 const context=await browser.newContext({javaScriptEnabled:false});
 await context.route('**/*',r=>r.abort());
 const page=await context.newPage();
 for(const file of BRAND_PAGES){
  await page.setContent(fs.readFileSync(path.join(ROOT,file),'utf8'),{waitUntil:'domcontentloaded'});
  const tags=await page.evaluate(()=>({apple:[...document.head.querySelectorAll('link[rel="apple-touch-icon"]')].map(e=>({src:e.getAttribute('href'),sizes:e.sizes.value})),icons:[...document.head.querySelectorAll('link[rel="icon"]')].map(e=>e.sizes.value),share:document.head.querySelector('meta[property="og:image"]')?.content}));
  assert.deepEqual(tags.apple,[{src:'/67park-foundation-next/'+iconPath(180),sizes:'180x180'}],file);
  assert.deepEqual(tags.icons,['32x32','192x192','512x512'],file);
  assert.equal(tags.share,'https://oscarbrendonn.github.io/67park-foundation-next/'+iconPath(512),file);
 }
 // Check actual decoded pixels, including all five brand colors. A cropped
 // red/pink middle of the old wordmark cannot satisfy these assertions.
 for(const size of ICON_SIZES){
  const png=fs.readFileSync(path.join(ROOT,iconPath(size))).toString('base64');
  const pixels=await page.evaluate(async({png,size})=>{
   const image=new Image();image.src='data:image/png;base64,'+png;await image.decode();
   const c=document.createElement('canvas');c.width=c.height=size;const ctx=c.getContext('2d');ctx.drawImage(image,0,0);
   const data=ctx.getImageData(0,0,size,size).data,colors={orange:0,red:0,pink:0,green:0,blue:0};let opaque=true,minX=size,maxX=0,minY=size,maxY=0;
   for(let y=0;y<size;y++)for(let x=0;x<size;x++){
    const at=(y*size+x)*4,r=data[at],g=data[at+1],b=data[at+2];opaque&&=data[at+3]===255;
    if(Math.abs(r-255)+Math.abs(g-249)+Math.abs(b-236)<25)continue;
    minX=Math.min(minX,x);maxX=Math.max(maxX,x);minY=Math.min(minY,y);maxY=Math.max(maxY,y);
    if(r>140&&g>65&&b<120)colors.orange++;
    if(r>140&&g<110&&b<135)colors.red++;
    if(r>150&&b>110&&b>g*1.1)colors.pink++;
    if(g>70&&g>r*1.1&&g>b*1.05)colors.green++;
    if(b>100&&b>r*1.2&&b>g*.95)colors.blue++;
   }
   return {size,opaque,minX,maxX,minY,maxY,colors};
  },{png,size});
  assert(pixels.opaque);assert(Object.values(pixels.colors).every(n=>n>1),JSON.stringify(pixels));
  assert(pixels.minX>=size*.03&&pixels.maxX<size*.97&&pixels.minY>=size*.3&&pixels.maxY<size*.7,JSON.stringify(pixels));
  console.log('BRAND_PIXELS_PASS '+JSON.stringify(pixels));
 }
 console.log('BRAND_BROWSER_PASS '+JSON.stringify({pages:BRAND_PAGES.length,icons:ICON_SIZES.length}));
}finally{await browser.close()}
