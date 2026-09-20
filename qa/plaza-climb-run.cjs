// Focused local loop. The same assertions also run in the full release gate.
const {chromium}=require('playwright'),{spawn}=require('node:child_process'),fs=require('node:fs');
const port=Number(process.env.PARK_QA_PORT||8508),base=`http://127.0.0.1:${port}/67park-foundation-next/`;
(async()=>{let server,browser;try{
 fs.mkdirSync('.qa-results',{recursive:true});
 server=spawn(process.execPath,['qa/regression-server.mjs'],{env:{...process.env,PARK_QA_PORT:String(port)},stdio:['ignore','pipe','inherit']});
 await new Promise((r,j)=>{server.stdout.on('data',b=>{process.stdout.write(b);if(String(b).includes('REGRESSION_READY'))r();});server.once('exit',c=>j(Error('Server exited '+c)));});
 browser=await chromium.launch({headless:true,...(process.platform==='darwin'?{executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'}:{})});
 for(const mobile of [false,true]){
  const context=await browser.newContext({viewport:mobile?{width:390,height:844}:{width:1280,height:900},isMobile:mobile,hasTouch:mobile});
  const page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(String(e)));
  await page.addInitScript(()=>{localStorage.setItem('67park-feel-lab.character.v3',JSON.stringify({base:'goril'}));localStorage.setItem('67park-feel-lab.player-profile.v1',JSON.stringify({version:1,base:'goril'}));localStorage.setItem('67park-feel-lab-muted','1');});
  await page.goto(base+'?claudeQA=passive');await page.waitForFunction(()=>window.__eggyInput?.playerRef?.body&&!document.querySelector('.wardrobe'),null,{timeout:180000});
  try{await require('./plaza-climb.browser.cjs')(page,{mobile,check:async(name,fn)=>{await fn();if(errors.length)throw Error(JSON.stringify(errors));console.log('PASS',mobile,name);}});}
  catch(e){console.log('PLAZA_STATE',await page.evaluate(()=>({p:__eggyInput.playerRef.body.translation(),v:__eggyInput.playerRef.body.linvel(),stats:__islandWorld.roofSupports.plaza?.stats,errors:__candyErrors})));await page.screenshot({path:'.qa-results/plaza-failure.png'});throw e;}
  await context.close();
 }
}finally{await browser?.close();server?.kill();}})().catch(e=>{console.error(e);process.exitCode=1;});
