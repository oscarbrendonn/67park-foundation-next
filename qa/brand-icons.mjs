// Reproducible browser-icon build. Preserve the original in-game wordmark;
// contain the complete image inside opaque, square browser/share artwork.
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {chromium} from 'playwright';

export const ROOT=fileURLToPath(new URL('../',import.meta.url));
export const BRAND_PAGES=['index.html','play/index.html','balloon/index.html','race/index.html','rockets/index.html','sports/index.html','lane-rush/index.html','skybound-soft/index.html','style-studio/index.html','explore/index.html','overview/index.html'];
export const ICON_SIZES=[32,180,192,512];
export const ICON_BACKGROUND='#fff9ec';
export const ICON_INSET=.06;
export const iconPath=size=>`brand/67park-icon-${size}-v1.png`;
const PREFIX='/67park-foundation-next/',ORIGIN='https://oscarbrendonn.github.io';
const START='<!-- 67park square icons v1 -->',END='<!-- /67park square icons -->';

export function withBrandIcons(html){
 const explicitHead=html.indexOf('<head>');
 // Skybound and the overview use valid HTML with an implied head.
 const start=explicitHead<0?html.search(/<meta\s+charset=/i):explicitHead;
 const end=html.search(/<\/head>|<body\b|<main\b/i);
 if(start<0||end<start)throw Error('Expected a static HTML head');
 let head=html.slice(start,end);
 head=head.replace(new RegExp('\\n?'+START+'[\\s\\S]*?'+END+'\\n?','g'),'');
 // Do not replace the wordmark used by the HUD or any body content.
 head=head.replace(/<link\b(?=[^>]*\brel=["'](?:icon|shortcut icon|apple-touch-icon(?:-precomposed)?)["'])[^>]*>/gi,'');
 head=head.replace(/<meta\b(?=[^>]*(?:name|property)=["'](?:og:image(?::(?:width|height|type|alt))?|twitter:card|twitter:image(?::alt)?)["'])[^>]*>/gi,'');
 const tags=[START,
  ...[32,192,512].map(size=>`<link rel="icon" type="image/png" sizes="${size}x${size}" href="${PREFIX+iconPath(size)}">`),
  `<link rel="apple-touch-icon" sizes="180x180" href="${PREFIX+iconPath(180)}">`,
  `<meta property="og:image" content="${ORIGIN+PREFIX+iconPath(512)}">`,
  '<meta property="og:image:type" content="image/png">',
  '<meta property="og:image:width" content="512">',
  '<meta property="og:image:height" content="512">',
  '<meta property="og:image:alt" content="The complete colorful 67park logo">',
  '<meta name="twitter:card" content="summary">',
  `<meta name="twitter:image" content="${ORIGIN+PREFIX+iconPath(512)}">`,
  '<meta name="twitter:image:alt" content="The complete colorful 67park logo">',END].join('\n');
 const charset=/<meta\s+charset=[^>]+>/i;
 if(!charset.test(head))throw Error('Expected explicit charset');
 head=head.replace(charset,tag=>tag+'\n'+tags+'\n');
 return html.slice(0,start)+head+html.slice(end);
}

export async function buildBrandIcons(){
 const data=fs.readFileSync(path.join(ROOT,'brand/67park-logo.png')).toString('base64');
 const mac='/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
 const browser=await chromium.launch({headless:true,...(process.platform==='darwin'&&fs.existsSync(mac)?{executablePath:mac}:{})});
 try{
  const page=await browser.newPage();
  const icons=await page.evaluate(async({data,sizes,background,inset})=>{
   const img=new Image();img.src='data:image/png;base64,'+data;await img.decode();
   if(img.width!==1065||img.height!==330)throw Error('Original 67park logo dimensions changed');
   return sizes.map(size=>{
    const canvas=document.createElement('canvas');canvas.width=canvas.height=size;
    const context=canvas.getContext('2d',{alpha:false});context.fillStyle=background;context.fillRect(0,0,size,size);
    const width=size*(1-inset*2),height=width*img.height/img.width;
    context.imageSmoothingEnabled=true;context.imageSmoothingQuality='high';
    context.drawImage(img,(size-width)/2,(size-height)/2,width,height);
    return {size,png:canvas.toDataURL('image/png').split(',')[1]};
   });
  },{data,sizes:ICON_SIZES,background:ICON_BACKGROUND,inset:ICON_INSET});
  for(const {size,png} of icons)fs.writeFileSync(path.join(ROOT,iconPath(size)),Buffer.from(png,'base64'));
 }finally{await browser.close()}
 // Mechanical, idempotent metadata migration; no application scripts or
 // original artwork are rebuilt. Validate every page before writing any.
 const updates=BRAND_PAGES.map(file=>{const target=path.join(ROOT,file);return {target,html:withBrandIcons(fs.readFileSync(target,'utf8'))}});
 for(const {target,html} of updates)fs.writeFileSync(target,html);
 console.log('BRAND_ICONS_BUILT '+JSON.stringify({pages:BRAND_PAGES.length,icons:ICON_SIZES.map(size=>({path:iconPath(size),bytes:fs.statSync(path.join(ROOT,iconPath(size))).size}))}));
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 if(!process.argv.includes('--write'))throw Error('Use --write to regenerate square icons and metadata');
 await buildBrandIcons();
}
