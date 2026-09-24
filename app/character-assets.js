import {assetFetch} from './entry-loading.js';

// One parsed template per URL for wardrobe, local player and remote players.
// Consumers clone it; no second fetch/parse just to display the same outfit.
export function createCharacterAssetStore(load) {
 const records=new Map(),arrays=new WeakMap();
 const record=url=>{
  let row=records.get(url);if(row)return row;
  row={status:'loading',value:null,error:null,promise:null};records.set(url,row);
  row.promise=Promise.resolve().then(()=>load(url)).then(value=>{row.status='ready';row.value=value;return value;},error=>{row.status='error';row.error=error;throw error;});
  // Suspense/read callers consume this rejection on their next render.
  row.promise.catch(()=>{});return row;
 };
 const loadOne=url=>{if(records.get(url)?.status==='error')records.delete(url);return record(url).promise;};
 const read=paths=>{
  const rows=(Array.isArray(paths)?paths:[paths]).map(record);
  const failed=rows.find(r=>r.status==='error');if(failed)throw failed.error;
  if(rows.some(r=>r.status==='loading'))throw Promise.all(rows.map(r=>r.promise));
  if(!Array.isArray(paths))return rows[0].value;
  const cached=arrays.get(paths);
  if(cached&&cached.rows.every((r,i)=>r===rows[i])&&cached.rows.length===rows.length)return cached.value;
  const value=rows.map(r=>r.value);arrays.set(paths,{rows,value});return value;
 };
 read.clear=paths=>{for(const url of Array.isArray(paths)?paths:[paths])if(records.get(url)?.status==='error')records.delete(url);};
 return {load:loadOne,read,clear:read.clear};
}
let loaderPromise;
async function loader(){
 return loaderPromise??=Promise.all([
  import('three/addons/loaders/GLTFLoader.js'),
  import('three/addons/loaders/DRACOLoader.js'),
  import('../vendor/addons/libs/meshopt_decoder.module.js'),
 ]).then(([{GLTFLoader},{DRACOLoader},{MeshoptDecoder}])=>{
  const draco=new DRACOLoader();draco.setDecoderPath('/67park-foundation-next/vendor/addons/libs/draco/gltf/');draco.setWorkerLimit(1);
  return new GLTFLoader().setDRACOLoader(draco).setMeshoptDecoder(MeshoptDecoder);
 }).catch(error=>{loaderPromise=null;throw error;});
}
const store=createCharacterAssetStore(async url=>{
 const [parser,bytes]=await Promise.all([loader(),assetFetch(url).then(r=>r.arrayBuffer())]);
 return parser.parseAsync(bytes,url.slice(0,url.lastIndexOf('/')+1));
});
export const loadCharacterAsset=store.load;
export const readCharacterAsset=store.read;
export const clearCharacterAsset=store.clear;
