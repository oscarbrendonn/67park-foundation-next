import test from 'node:test';
import assert from 'node:assert/strict';
import {Mesh,BoxGeometry,MeshBasicMaterial,Group,InstancedMesh,Matrix4,BufferGeometry,Float32BufferAttribute,Ray,Vector3} from 'three';
import {cameraMeshCast,cameraMeshCastStats,prepareCameraMeshes} from '../app/feel-camera-meshes.js';
test('actual triangles block from both sides without changing authored materials',()=>{
 const wall=new Mesh(new BoxGeometry(10,10,.2),new MeshBasicMaterial());wall.position.z=3;wall.updateMatrixWorld(true);
 const world={blockers:[wall]},origin={x:0,y:0,z:0},direction={x:0,y:0,z:1};
 assert(Math.abs(cameraMeshCast(world,origin,direction,8)-2.9)<.001);
 assert(Math.abs(cameraMeshCast(world,origin,direction,2.9)-2.9)<.001,'a hit at the Raycaster far boundary remains a hit');
 const exactGeometry=new BufferGeometry().setAttribute('position',new Float32BufferAttribute([-1,-1,3,1,-1,3,0,1,3],3));
 assert.equal(cameraMeshCast({blockers:[new Mesh(exactGeometry,new MeshBasicMaterial())]},origin,direction,3),3,'exact integer far boundary, without Float32 thickness rounding');
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
test('matches legacy DoubleSide triangle hits through transforms and refreshes changed geometry',()=>{
 const geometry=new BufferGeometry();geometry.setAttribute('position',new Float32BufferAttribute([-2,-2,3,2,-2,3,0,2,3],3));
 const wall=new Mesh(geometry,new MeshBasicMaterial()),group=new Group();group.position.set(1,.5,0);group.rotation.y=.31;group.scale.set(1.3,.8,.7);group.add(wall);group.updateMatrixWorld(true);
 const world={blockers:[wall]},origin=new Vector3(1,.5,-4),direction=new Vector3(0,0,1);
 const legacy=new Mesh(geometry,new MeshBasicMaterial({side:2}));legacy.matrixAutoUpdate=false;legacy.matrixWorld.copy(wall.matrixWorld);const ray=new Ray(origin,direction),hits=[];legacy.raycast({ray,near:.02,far:20},hits);
 const expected=hits.length?Math.min(...hits.map(hit=>hit.distance)):null,actual=cameraMeshCast(world,origin,direction,20);
 assert.equal(actual===null,expected===null);if(expected!==null)assert(Math.abs(actual-expected)<1e-6);
 const position=geometry.getAttribute('position');for(let i=0;i<position.count;i++)position.setZ(i,5);position.needsUpdate=true;
 legacy.matrixWorld.copy(wall.matrixWorld);hits.length=0;legacy.raycast({ray,near:.02,far:20},hits);const changedExpected=Math.min(...hits.map(hit=>hit.distance)),changedActual=cameraMeshCast(world,origin,direction,20);
 assert(Math.abs(changedActual-changedExpected)<1e-6,'position needsUpdate rebuilds the triangle tree');
 assert.equal(cameraMeshCast({blockers:[new Mesh(new BufferGeometry(),new MeshBasicMaterial())]},origin,direction,20),null,'empty geometry is ignored');
});
test('dense blocker traversal is sublinear in triangles while preserving an actual face hit',()=>{
 const width=120,height=120,values=[];for(let z=0;z<height;z++)for(let x=0;x<width;x++){const x0=x-width/2,z0=z+4;values.push(x0,0,z0,x0+1,0,z0,x0+1,0,z0+1,x0,0,z0,x0+1,0,z0+1,x0,0,z0+1);}
 const geometry=new BufferGeometry();geometry.setAttribute('position',new Float32BufferAttribute(values,3));const mesh=new Mesh(geometry,new MeshBasicMaterial()),world={blockers:[mesh]};
 assert(Math.abs(cameraMeshCast(world,{x:0,y:4,z:0},{x:0,y:-1,z:1},160)-Math.sqrt(32))<.01);
 assert(cameraMeshCastStats(world).triangleTests<100,'BVH should inspect a small leaf set, not every dense triangle');
});
test('staged prewarm builds dense authored geometry in bounded yielding chunks',async()=>{
 const values=[];for(let z=0;z<100;z++)for(let x=0;x<100;x++)values.push(x,0,z,x+1,0,z,x+1,0,z+1,x,0,z,x+1,0,z+1,x,0,z+1);
 const geometry=new BufferGeometry();geometry.setAttribute('position',new Float32BufferAttribute(values,3));const world={blockers:[new Mesh(geometry,new MeshBasicMaterial())]};let yields=0;
 const stats=await prepareCameraMeshes(world,{budgetMs:1,yieldTask:async()=>{yields++;}});
 assert.equal(stats.triangles,100*100*2);assert(yields>0,'dense prewarm must yield before publishing controls');assert(stats.maxChunkMs<50,`staging chunk was ${stats.maxChunkMs}ms`);assert(Math.abs(cameraMeshCast(world,{x:4,y:3,z:0},{x:0,y:-1,z:1},220)-Math.sqrt(18))<.01);
});
