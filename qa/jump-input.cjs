const assert=require('node:assert/strict');

// Resolve the fixed HUD target before launching. Locator.tap() waits for
// element stability on every tap; on CPU renderers those extra animation
// frames can turn an intended near-apex second jump into a late falling jump.
// Touchscreen.tap still dispatches real trusted input. Physical route/landing
// assertions, not a queued-input flag, remain the proof that jumping worked.
async function prepareJumpInput(page,{mobile=false,timeout=45000}={}){
 if(!mobile)return ()=>page.keyboard.press('Space');
 const button=page.getByRole('button',{name:'Jump',exact:true});
 await button.waitFor({state:'visible',timeout});
 assert(await button.isEnabled(),'Jump button must be enabled');
 const box=await button.boundingBox();
 assert(box&&box.width>0&&box.height>0,'Jump button needs a visible hit target');
 const point={x:box.x+box.width/2,y:box.y+box.height/2};
 assert(await page.evaluate(({x,y})=>document.elementFromPoint(x,y)?.closest?.('[aria-label="Jump"]')?.getAttribute('aria-label')==='Jump',point),'Jump center must target the live button');
 return ()=>page.touchscreen.tap(point.x,point.y);
}

module.exports={prepareJumpInput};
