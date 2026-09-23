// Browser-local preferences only. No changes to physics, accounts or saved outfits.
export const SETTINGS_VERSION = 'settings-4-camera';
export const SETTINGS_KEY = '67park.feel-lab.player-settings.v1';
export const DEFAULTS = Object.freeze({cameraDistance:6.8,mouseSensitivity:1,touchSensitivity:1,desktopButtonSize:1,mobileButtonSize:1,sfx:.8,ambience:1,showChat:true,showNames:true,juice:true,pads:true,haptics:true,graphics:'auto'});
const ranges = {cameraDistance:[.5,12],mouseSensitivity:[.25,2],touchSensitivity:[.25,2],desktopButtonSize:[.8,1.2],mobileButtonSize:[.8,1.2],sfx:[0,1],ambience:[0,1]};
export function sanitizeSettings(value) {
 const out={...DEFAULTS};
 if(!value||typeof value!=='object'||Array.isArray(value))return out;
 for(const key of Object.keys(DEFAULTS)){
  if(key==='graphics'){if(['auto','low','medium','high'].includes(value[key]))out[key]=value[key];}
  else if(ranges[key]){const n=value[key];if(typeof n==='number'&&Number.isFinite(n))out[key]=Math.min(ranges[key][1],Math.max(ranges[key][0],n));}
  else if(typeof value[key]==='boolean')out[key]=value[key];
 }
 return out;
}
const slot=Symbol.for('67park.player-settings.v1');
const persistence=globalThis[Symbol.for('67park.settings-save.v1')] ||= {state:'ready'};
export const settingsSaveStatus=()=>persistence.state;
export const playerSettings=globalThis[slot] ||= (()=>{
 let value,raw;
 try{raw=localStorage.getItem(SETTINGS_KEY)||localStorage.getItem('67park-party')}catch{persistence.state='unavailable'}
 try{value=JSON.parse(raw||'{}')}catch{persistence.state='recovered'}
 return sanitizeSettings(value);
})();
// Adopt this additive preference if an older module created the shared object.
playerSettings.cameraDistance=sanitizeSettings(playerSettings).cameraDistance;
export function savePlayerSettings(){
 Object.assign(playerSettings,sanitizeSettings(playerSettings));
 try{
  const value=JSON.stringify(playerSettings);
  localStorage.setItem(SETTINGS_KEY,value);
  persistence.state=localStorage.getItem(SETTINGS_KEY)===value?'saved':'error';
 }catch{persistence.state='error'}
 globalThis.dispatchEvent?.(new Event('park:settings-change'));
 return persistence.state==='saved';
}
export function setPlayerSetting(key,value){if(Object.hasOwn(DEFAULTS,key)){playerSettings[key]=value;savePlayerSettings()}}
export function resetPlayerSettings(){Object.assign(playerSettings,DEFAULTS);savePlayerSettings()}
export function settingsOpen(){return !!globalThis.document?.documentElement?.hasAttribute('data-park-settings-open')}
