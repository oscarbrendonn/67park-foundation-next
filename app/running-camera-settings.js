import {playerSettings,setPlayerSetting,settingsSaveStatus} from './player-settings.js';
import {cameraZoomLabel,flushCameraZoom} from './camera-zoom.js?v=camera-settings-1';

// A native dialog keeps focus, Escape and modal input isolation browser-owned.
export function installRunningCameraSettings(){
 if(document.querySelector('#running-camera-settings'))return;
 const sheet=document.createElement('link');sheet.rel='stylesheet';sheet.href=new URL('./running-camera-settings.css?v=running-camera-1',import.meta.url);document.head.append(sheet);
 const button=document.createElement('button');button.id='running-camera-settings';button.type='button';button.textContent='Settings';button.setAttribute('aria-haspopup','dialog');button.setAttribute('aria-expanded','false');
 const dialog=document.createElement('dialog');dialog.id='running-camera-dialog';dialog.setAttribute('aria-labelledby','running-camera-title');
 dialog.innerHTML='<header><h2 id="running-camera-title">Camera settings</h2><button type="button" data-action="close" aria-label="Close settings">×</button></header><p>Drag to look. Pinch two fingers or scroll to zoom.</p><label>Camera distance <output></output><input type="range" min="50" max="1200" step="5" aria-label="Camera distance"></label><div class="camera-actions"><button type="button" data-action="first">First person</button><button type="button" data-action="reset">Reset camera</button></div><label>Touch sensitivity <input data-sensitivity="touchSensitivity" type="range" min="25" max="200" step="5" aria-label="Touch sensitivity"></label><label>Mouse sensitivity <input data-sensitivity="mouseSensitivity" type="range" min="25" max="200" step="5" aria-label="Mouse sensitivity"></label><p role="status"></p>';
 document.body.append(button,dialog);
 const slider=dialog.querySelector('input'),output=dialog.querySelector('output');
 const refresh=()=>{
  slider.value=String(Math.round(playerSettings.cameraDistance*100));output.textContent=cameraZoomLabel(playerSettings.cameraDistance);slider.setAttribute('aria-valuetext',output.textContent);
  for(const input of dialog.querySelectorAll('[data-sensitivity]'))input.value=String(Math.round(playerSettings[input.dataset.sensitivity]*100));
  dialog.querySelector('[role=status]').textContent=['error','unavailable'].includes(settingsSaveStatus())?'Works now, but could not save on this browser.':'Shared with the park and saved on this browser.';
 };
 const release=()=>window.dispatchEvent(new Event('park:release-controls'));
 button.addEventListener('click',()=>{flushCameraZoom();release();refresh();document.documentElement.setAttribute('data-park-settings-open','');dialog.showModal();button.setAttribute('aria-expanded','true');});
 dialog.addEventListener('close',()=>{document.documentElement.removeAttribute('data-park-settings-open');release();button.setAttribute('aria-expanded','false');button.focus({preventScroll:true});});
 dialog.addEventListener('input',e=>{if(e.target===slider)setPlayerSetting('cameraDistance',Number(slider.value)/100);else if(e.target.dataset.sensitivity)setPlayerSetting(e.target.dataset.sensitivity,Number(e.target.value)/100);});
 dialog.addEventListener('click',e=>{switch(e.target.closest('button')?.dataset.action){case 'close':dialog.close();break;case 'first':setPlayerSetting('cameraDistance',.5);break;case 'reset':setPlayerSetting('cameraDistance',6.8);break;}});
 // Do not send dialog keys (including arrows on a range) to game listeners.
 for(const type of ['keydown','keyup'])dialog.addEventListener(type,e=>e.stopPropagation());
 addEventListener('park:settings-change',refresh);refresh();
}
