import test from 'node:test';
import assert from 'node:assert/strict';
import {Mesh,BoxGeometry,MeshBasicMaterial,Group,InstancedMesh,Matrix4} from 'three';
import {cameraMeshCast} from '../app/feel-camera-meshes.js';
test('actual triangles block from both sides without changing authored materials',()=>{
 const wall=new Mesh(new BoxGeometry(10,10,.2),new MeshBasicMaterial());wall.position.z=3;wall.updateMatrixWorld(true);
 const world={blockers:[wall]},origin={x:0,y:0,z:0},direction={x:0,y:0,z:1};
 assert(Math.abs(cameraMeshCast(world,origin,direction,8)-2.9)<.001);
 assert.equal(wall.material.side,0);
 assert(Math.abs(cameraMeshCast(world,{x:0,y:0,z:6},{x:0,y:0,z:-1},8)-2.9)<.001);
 const group=new Group();group.add(wall);group.visible=false;assert.equal(cameraMeshCast(world,origin,direction,8),null);
 group.visible=true;wall.position.z=4;wall.updateMatrixWorld(true);assert(Math.abs(cameraMeshCast(world,origin,direction,8)-3.9)<.001);
});
test('instanced houses block at their real transforms, not the empty space between them',()=>{
 const geometry=new BoxGeometry(2,4,.2),material=new MeshBasicMaterial();
 const houses=new InstancedMesh(geometry,material,2),matrix=new Matrix4(),group=new Group();group.add(houses);group.position.y=1;
 houses.setMatrixAt(0,matrix.makeTranslation(-4,0,3));houses.setMatrixAt(1,matrix.makeTranslation(4,0,6));houses.instanceMatrix.needsUpdate=true;
 const world={blockers:[houses]},direction={x:0,y:0,z:1},cast=x=>cameraMeshCast(world,{x,y:1,z:0},direction,8);
 assert(Math.abs(cast(-4)-2.9)<.001);assert(Math.abs(cast(4)-5.9)<.001);assert.equal(cast(0),null);
 assert.equal(houses.geometry,geometry);assert.equal(houses.material,material);assert.equal(material.side,0);assert.equal(group.children.length,1);
 assert(Math.abs(cameraMeshCast(world,{x:4,y:1,z:8},{x:0,y:0,z:-1},8)-1.9)<.001);
 houses.setMatrixAt(1,matrix.makeTranslation(4,0,4));houses.instanceMatrix.needsUpdate=true;
 assert(Math.abs(cast(4)-3.9)<.001,'moving instance refreshes its cached bounds');
 group.position.z=1;assert(Math.abs(cast(4)-4.9)<.001,'moving parent refreshes the instance transform');
 houses.count=1;assert.equal(cast(4),null,'unused instances are not blockers');
 houses.count=2;assert(Math.abs(cast(4)-4.9)<.001);
 group.visible=false;assert.equal(cast(4),null);group.visible=true;
 houses.userData.cameraIgnore=true;assert.equal(cast(4),null);
});
