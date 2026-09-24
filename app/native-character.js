// Three original playable characters, one existing 20-bone movement family.
// Friends remain asset donors; they are not added back to the playable roster.
export const CAT_BASE = 'cat67';
export const NINJA_BASE = 'ninja67';
export const NATIVE_BASES = Object.freeze(['goril', CAT_BASE, NINJA_BASE]);
export const isNativeCharacter = base => NATIVE_BASES.includes(base);
export const nativeCharacterFile = base => base === CAT_BASE ? 'cat67.glb' : base === NINJA_BASE ? 'ninja67.glb' : 'goril-v1.glb';
export const nativeCharacterURL = base => base === CAT_BASE || base === NINJA_BASE
  ? '/67park-foundation-next/models/park-originals/'+(base===CAT_BASE?'cat':'ninja')+'.glb?v=originals-1'
  : '/67park-foundation-next/models/goril-motion-v3.glb';
export function registerNativeCharacters(catalog) {
  if (!catalog.some(c => c.id === CAT_BASE)) catalog.splice(1, 0, {
    id:CAT_BASE, name:'Cat 67', file:null, no:67, rarity:'Original',
    rarityNote:'a soft grey park friend',
    traits:[{cat:'Fur',icon:'',value:'Soft Grey'},{cat:'Style',icon:'',value:'Mix & Match'}],
  });
  if (!catalog.some(c => c.id === NINJA_BASE)) catalog.splice(2, 0, {
    id:NINJA_BASE, name:'Ninja 67', file:null, no:68, rarity:'Original',
    rarityNote:'a little shadow with a friendly face',
    traits:[{cat:'Suit',icon:'',value:'Midnight'},{cat:'Style',icon:'',value:'Mix & Match'}],
  });
  return catalog;
}
const modelPromises=new Map();
export function loadNativeCharacter(base, loadGorilla) {
  if (base !== CAT_BASE && base !== NINJA_BASE) return loadGorilla();
  if(modelPromises.has(base))return modelPromises.get(base);
  const promise=Promise.all([
    import('three/addons/loaders/GLTFLoader.js'),
    import('three/addons/loaders/DRACOLoader.js'),
  ]).then(async ([{GLTFLoader},{DRACOLoader}]) => {
    const decoder=new DRACOLoader();
    decoder.setDecoderPath('/67park-foundation-next/vendor/addons/libs/draco/gltf/');
    try { return await new GLTFLoader().setDRACOLoader(decoder).loadAsync(nativeCharacterURL(base)); }
    finally { decoder.dispose(); }
  }).catch(error => { modelPromises.delete(base); throw error; });
  modelPromises.set(base,promise);return promise;
}
