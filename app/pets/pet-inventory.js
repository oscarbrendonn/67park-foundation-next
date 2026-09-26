import {PETS,petSelection} from './pet-state.js?v=pets-soft-2';

export function createPetInventory(React) {
  const h=React.createElement;
  return function PetInventory(){
    const selected=React.useSyncExternalStore(petSelection.subscribe,petSelection.get,petSelection.get);
    return h('section',{className:'park-pet-inventory','aria-label':'Pet companions'},
      h('div',{className:'park-pet-heading'},h('strong',null,'Pet companions'),h('span',null,'One little friend')),
      h('div',{className:'park-pet-choices'},PETS.map(p=>h('button',{key:p.id,type:'button','aria-label':'Choose '+p.label,'aria-pressed':selected===p.id,onClick:()=>petSelection.select(p.id),style:{'--pet-accent':p.accent}},
        h('img',{src:new URL('../../pets/'+p.id+'.png?v=pets-soft-2',import.meta.url).href,alt:'',width:92,height:85}),h('strong',null,p.name),h('small',null,selected===p.id?'Following you':p.label)))),
      h('div',{className:'park-pet-tools'},h('button',{type:'button',disabled:!selected,onClick:()=>petSelection.select('')},'No pet'),h('a',{href:new URL('../../pets/?v=pets-soft-2',import.meta.url).href,target:'_blank',rel:'noopener'},'View in 3D ↗')),
      selected&&h('div',{className:'park-pet-tools'},h('button',{type:'button',onClick:()=>globalThis.__parkPets?.openControls?.()},'Commands & play')),
      h('p',{className:'park-pet-note'},'Come, stay, give paw, play and share a treat. Your pet rests during mini games.'));
  };
}
