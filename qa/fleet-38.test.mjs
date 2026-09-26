import assert from 'node:assert/strict';
import fs from 'node:fs';
import {GLTFLoader} from '../vendor/addons/loaders/GLTFLoader.js';
import {MeshoptDecoder} from '../vendor/addons/libs/meshopt_decoder.module.js';
import {installParkedFleet,PARKED_FLEET} from '../app/parked-fleet.js';
import {createCandyVehicle110} from '../island/candy-vehicle-model-v110.js';
import {useReferenceCarBody} from '../app/reference-car-body.js';
import {styleParkBus} from '../app/vehicle-branding.js';
const bytes=fs.readFileSync(new URL('../island/northwest-sports-v97.glb',import.meta.url));
const gltf=await new GLTFLoader().setMeshoptDecoder(MeshoptDecoder).parseAsync(bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.byteLength),'');
const floors=[];
gltf.scene.traverse(o=>{if(o.isMesh&&o.userData.sportsFloor)floors.push([o,o.geometry]);});
const wood=gltf.scene.getObjectByName('SPORTS97_SOLID_SPORTS97_wood');
const woodTriangles=()=>{
 const p=wood.geometry.attributes.position,ix=wood.geometry.index,inside=[],outside=[];
 for(let i=0;i<(ix?.count??p.count);i+=3){
  const ids=[0,1,2].map(j=>ix?ix.getX(i+j):i+j);
  const inCar=PARKED_FLEET.some(([x,z])=>ids.every(j=>Math.abs(p.getX(j)-x)<1.31&&Math.abs(p.getZ(j)-z)<2.51&&p.getY(j)>.15&&p.getY(j)<2.07));
  (inCar?inside:outside).push(ids.flatMap(j=>[p.getX(j),p.getY(j),p.getZ(j)]));
 }
 return {inside,outside};
};
const originalWood=woodTriangles();
assert.equal(originalWood.inside.length,924,'reproduce legacy trim left on sage car');
const fleet=installParkedFleet(gltf.scene);
assert.equal(fleet.stats.cars,8);assert.equal(new Set(fleet.stats.colours).size,8);
assert.equal(fleet.stats.removedTriangles,30880);assert.equal(fleet.stats.draws,13);
assert.equal(woodTriangles().inside.length,0,'no old wood trim overlays new car');
assert.deepEqual(woodTriangles().outside,originalWood.outside,'all wood geometry outside cars unchanged');
for(const [mesh,geometry] of floors)assert.equal(mesh.geometry,geometry);
assert.equal(installParkedFleet(gltf.scene),fleet);
let triangles=0;
fleet.root.traverse(o=>{if(!o.isMesh)return;triangles+=o.geometry.attributes.position.count/3;for(const key of ['position','normal','color'])assert.ok(o.geometry.attributes[key].array.every(Number.isFinite));});
for(const kind of ['car','bus']){
 const car=createCandyVehicle110({kind}),spec=car.spec,seats=car.seats,wheels=car.wheels,claim=car.claimSeat;
 (kind==='car'?useReferenceCarBody:styleParkBus)(car);
 assert.ok(car.spec===spec);assert.ok(car.seats===seats);assert.equal(car.wheels.length,wheels.length);assert.ok(car.claimSeat===claim);
 assert.equal(car.capacity,kind==='car'?4:8);assert.equal(car.plates.coloured,true);
 assert.equal(car.model.getObjectByName('67PARK_COLOUR_PLATES').children.filter(o=>o.name.startsWith('67park-logo')).length,2);
 for(let i=0;i<1000;i++){assert.equal(car.claimSeat(0,'test-driver'),true);assert.equal(car.canDrive('test-driver'),true);car.animate(.016,.5);assert.equal(car.releaseSeat(0,'test-driver'),true);}
 assert.equal(car.canDrive('test-driver'),false);car.dispose();
}
console.log(JSON.stringify({pass:true,cars:8,colours:8,draws:fleet.stats.draws,triangles,floorMeshesUnchanged:floors.length,seatCyclesPerVehicle:1000}));
