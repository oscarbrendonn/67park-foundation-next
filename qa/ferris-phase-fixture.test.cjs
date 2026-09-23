const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');

test('jump fixture cannot rely on sampling a sub-frame Ferris phase',()=>{
 const source=fs.readFileSync(require.resolve('./ride-contacts.browser.cjs'),'utf8');
 assert.match(source,/installFerrisJumpPhase/,'align only the isolated jump setup before real input');
 assert.match(source,/__qaFerrisPhase\.release\(\)/,'release the real clock before trusted input');
 assert.match(source,/__qaFerrisPhase\.restore\(\)/,'restore the exact source clock after the jump');
 assert.match(source,/timeout:45000/,'the existing readiness timeout is retained');
 assert.match(source,/floorVelocity>-.38&&armed.cabin.floorVelocity<-.32/,'the exact readiness bounds are retained');
});
