// Real before/after captures, identical crops. No retouching or painted fixes.
const sharp=require('/opt/homebrew/lib/node_modules/@gltf-transform/cli/node_modules/sharp');
const path=require('node:path');
const root=path.resolve('.qa-results/map-joint-finish-1');
const old=path.resolve('.qa-results/crack-audit-682fa42-20260924/focus');
const boards=[
 {file:'67park-duzelen-yol-koseleri.webp',items:[
  {name:'east-road-tip-top',title:'Sahil yolu: çıkıntı ve sivri uç temizlendi',crop:{left:480,top:235,width:1040,height:580}},
  {name:'fairground-south-corner',title:'Lunapark: eşit genişlikte yuvarlak köşeler',crop:{left:100,top:290,width:1340,height:570}}
 ]},
 {file:'67park-duzelen-sehir-birlesimleri.webp',items:[
  {name:'city-south-seam',title:'Şehir: dişli birleşim yerine kesintisiz dönüş',crop:{left:220,top:340,width:1240,height:480}},
  {name:'city-northwest-corner',title:'Kuzeybatı: köşedeki çentik temizlendi',crop:{left:65,top:290,width:1330,height:590}}
 ]}
];
(async()=>{for(const b of boards){let y=0;const layers=[];
 const label=(title,height=64)=>{layers.push({input:Buffer.from(`<svg width="1100" height="${height}"><rect width="1100" height="${height}" fill="#272724"/><text x="22" y="42" fill="#fff8eb" font-family="Arial" font-size="27">${title}</text></svg>`),top:y,left:0});y+=height;};
 for(const item of b.items){label(item.title);for(const [dir,text]of [[old,'ÖNCE · canlı 682fa42'],[path.join(root,'after-refined'),'SONRA · yerel düzeltme']]){
  label(text,57);const {data,info}=await sharp(path.join(dir,item.name+'.png')).extract(item.crop).resize({width:1100}).png().toBuffer({resolveWithObject:true});layers.push({input:data,top:y,left:0});y+=info.height;
 }}
 label('Gerçek oyun görüntüsü · henüz yayına alınmadı');
 await sharp({create:{width:1100,height:y,channels:3,background:'#272724'}}).composite(layers).webp({quality:94}).toFile(path.join(root,b.file));console.log(b.file,y);
}})().catch(e=>{console.error(e);process.exitCode=1});
