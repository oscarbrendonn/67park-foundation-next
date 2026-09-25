import {PET_COMMANDS} from '/67park-foundation-next/app/pets/pet-commands.js?v=pet-play-1';

// The game already uses native dialogs: retain browser focus trapping,
// Escape/backdrop dismissal and real buttons, without another UI dependency.
export function createPetControls({snapshot,command,document:doc=globalThis.document}){
  if(!doc)return {update(){},open(){return false;},dispose(){}};
  const trigger=doc.createElement('button'),dialog=doc.createElement('dialog');
  trigger.id='park-pet-button';trigger.type='button';trigger.className='park-pet-button';trigger.hidden=true;trigger.textContent='Pet friend';
  trigger.setAttribute('aria-haspopup','dialog');trigger.setAttribute('aria-controls','park-pet-dialog');
  dialog.id='park-pet-dialog';dialog.className='park-pet-dialog';dialog.setAttribute('aria-labelledby','park-pet-title');
  dialog.innerHTML='<header><div><small>PET PLAY · TEST PREVIEW</small><h2 id="park-pet-title"></h2></div><button type="button" aria-label="Close pet commands">×</button></header><p class="park-pet-status" role="status" aria-live="polite"></p><div class="park-pet-command-grid"></div><p class="park-pet-help">Choose a command. Move away to stop petting or playing. Come / Follow releases Stay.</p>';
  const title=dialog.querySelector('h2'),status=dialog.querySelector('[role=status]'),grid=dialog.querySelector('.park-pet-command-grid'),buttons=new Map();
  let commandError='';
  for(const item of PET_COMMANDS){
    const button=doc.createElement('button');button.type='button';button.dataset.petCommand=item.id;button.textContent=item.label;grid.append(button);buttons.set(item.id,button);
    button.addEventListener('click',()=>{const result=command(item.id);commandError=result.ok?'':result.message;status.textContent=result.message;if(result.ok)dialog.close();});
  }
  doc.body.append(trigger,dialog);
  function open(){const s=snapshot();if(!s.active||!s.kind||!s.visible)return false;commandError='';update();if(!dialog.open)dialog.showModal();return true;}
  function update(){
    const s=snapshot();trigger.hidden=!s.active||!s.kind||!!doc.querySelector('.wardrobe');
    trigger.textContent=s.kind==='cat'?'Mochi · Play':'Biscuit · Play';
    if(!s.active||!s.kind){if(dialog.open)dialog.close();return;}
    title.textContent=s.kind==='cat'?'Mochi the cat':'Biscuit the dog';
    for(const item of PET_COMMANDS){const b=buttons.get(item.id);b.hidden=!!item.kind&&item.kind!==s.kind;b.disabled=!s.visible;b.setAttribute('aria-pressed',String(s.command===item.id));}
    status.textContent=commandError||(s.visible?s.message:'Finding a safe spot beside you…');
  }
  trigger.addEventListener('click',open);dialog.querySelector('header button').addEventListener('click',()=>dialog.close());
  dialog.addEventListener('click',event=>{if(event.target===dialog){const r=dialog.getBoundingClientRect();if(event.clientX<r.left||event.clientX>r.right||event.clientY<r.top||event.clientY>r.bottom)dialog.close();}});
  // Commands must never double as a game punch/jump or camera drag.
  for(const element of [trigger,dialog])for(const name of ['pointerdown','pointerup','touchstart','touchend','keydown','keyup'])element.addEventListener(name,e=>e.stopPropagation());
  return {update,open,dispose(){dialog.close();dialog.remove();trigger.remove();}};
}
