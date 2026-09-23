// The wardrobe, park and mini-games use the same equipment IDs. No model URLs
// or user-supplied geometry are accepted in a saved outfit.
export const FITTED_ITEMS = Object.freeze({
  'friendsie_3333:5': {slot:'kicks',vertices:910,name:'Mix & Match'},
  'friendsie_1:3': {slot:'kicks',vertices:659,name:'Cloud Boots'},
  'friendsie_2:5': {slot:'kicks',vertices:4176,name:'Candy Steps'},
  'friendsie_2:4': {slot:'back',vertices:4152,name:'Rainbow Wings'},
  'friendsie_3333:4': {slot:'back',vertices:1258,name:'Little Backpack'},
  'friendsie_2:2': {slot:'body',vertices:2800,name:'Rainbow Sweater',clothes:true},
  'friendsie_8:90': {slot:'sprout',vertices:20897,name:'Playtime Cap',range:[[11422,17538]],rigid:'hat',cap:true},
  'friendsie_2:1': {slot:'sprout',vertices:3043,name:'Little Crown',rigid:'hat'},
  'friendsie_26:90': {slot:'head',vertices:4994,name:'Green Round Frames',range:[[0,2264],[2796,4180]],rigid:'glasses'},
});

// These two are accessory-only slices of a donor mesh, NOT replacement heads.
// Register them in every equipment validator before loading saved equipment.
export function registerStudioParts(catalog) {
  for (const [file,slot] of [['friendsie_8','sprout'],['friendsie_26','head']]) {
    if(catalog[file] && !catalog[file].some(p=>p.ord===90))
      catalog[file].push({ord:90,slot,prims:[]});
  }
}

export function withoutFittedItems(equipment) {
  const plain={...equipment};
  for(const [id,item] of Object.entries(FITTED_ITEMS))
    if(equipment[item.slot]===id)plain[item.slot]=null;
  return plain;
}

export function studioSlots(equipment,baseEquipment,label) {
  const gorilla=equipment.base==='goril', cat=equipment.base==='cat67', native=gorilla||cat, original=baseEquipment(equipment.base);
  const rows=[
    ['kicks','Shoes','shoe','#c9e4fb',[original.kicks,'friendsie_3333:5','friendsie_1:3','friendsie_2:5']],
    ['back','Back','back','#e1d5fa',[null,original.back,'friendsie_2:4','friendsie_3333:4']],
    ['body','Outfit','top','#ffe4a6',[original.body,'friendsie_2:2']],
    ['sprout','Headwear','hat','#ffd7e3',native?[null,'friendsie_8:90','friendsie_2:1',...(gorilla?['goril:TAC']:[])]:[null,original.sprout,'spr-flower','spr-leaf','spr-cherry']],
    ...(native?[['head','Eyewear','glasses','#d5ecc4',[null,'friendsie_26:90']]]:[]),
    ['held','Held item','hand','#ffe1cd',[null,original.held,...(cat?[]:['goril:CICEK'])]],
    ['power','Effect','star','#fff0a9',[null,'pwr-stars','pwr-hearts','pwr-bolts']],
    ['vibe','Glow','ring','#d5eafa',[null,'vibe-pink','vibe-mint','vibe-gold','vibe-sky']],
  ];
  return rows.map(([slot,title,icon,color,ids])=>{
    const values=[...new Set([...ids,equipment[slot]].map(id=>id??null))];
    return {slot,title,icon,color,items:values.map(id=>({id,name:id==null?(slot==='body'?'Original outfit':slot==='kicks'?'Original feet':'None'):(FITTED_ITEMS[id]?.name||label(id))}))};
  });
}
