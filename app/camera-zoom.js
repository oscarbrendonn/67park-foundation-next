import {playerSettings,savePlayerSettings,DEFAULTS} from './player-settings.js';
import {MIN_CAMERA_ZOOM,FIRST_PERSON_ZOOM} from './camera-presentation.js?v=first-person-1';

export const MAX_CAMERA_ZOOM=12;
export function cameraZoomValue(value){
 return Number.isFinite(value)?Math.max(MIN_CAMERA_ZOOM,Math.min(MAX_CAMERA_ZOOM,value)):DEFAULTS.cameraDistance;
}
export function cameraZoomLabel(value){
 const distance=cameraZoomValue(value);
 return distance<=FIRST_PERSON_ZOOM?'First person':distance.toFixed(1)+' m';
}
export const readCameraZoom=()=>cameraZoomValue(playerSettings.cameraDistance);
let saveTimer=null;
export function flushCameraZoom(){
 if(saveTimer===null)return;
 clearTimeout(saveTimer);saveTimer=null;savePlayerSettings();
}
export function changeCameraZoom(value){
 const distance=cameraZoomValue(value);
 if(distance===playerSettings.cameraDistance)return distance;
 // Respond immediately, but do not write synchronous storage on every touch.
 playerSettings.cameraDistance=distance;
 clearTimeout(saveTimer);saveTimer=setTimeout(flushCameraZoom,200);
 return distance;
}
