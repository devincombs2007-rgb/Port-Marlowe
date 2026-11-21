// Screenshot the final viewer. CDN requests for three@0.170.0 are served from local node_modules.
const {chromium}=require('playwright');
const fs=require('fs'), path=require('path');
(async()=>{
  const [,,root,html,outPrefix,size,actions]=process.argv; const [w,h]=(size||'1200x800').split('x').map(Number);
  const b=await chromium.launch();
  const p=await b.newPage({viewport:{width:w,height:h},colorScheme:'dark'});
  await p.route('https://cdn.jsdelivr.net/npm/three@0.170.0/**',route=>{
    const rel=new URL(route.request().url()).pathname.replace('/npm/three@0.170.0/','');
    route.fulfill({status:200,body:fs.readFileSync(path.join(root,'node_modules/three',rel)),headers:{'content-type':'text/javascript'}});
  });
  p.on('console',m=>{if(m.type()==='error')console.log('console:',m.text())}); p.on('pageerror',e=>console.log('pageerror',e.message));
  await p.goto('file://'+html);
  await p.waitForFunction(()=>window.__ready===true,null,{timeout:240000});
  const shots=(actions||'').split(';').filter(Boolean);
  let i=0;
  await p.waitForTimeout(1500); await p.screenshot({path:`${outPrefix}_${i++}.png`});
  for(const a of shots){
    if(a.startsWith('click:')) await p.click(a.slice(6));
    await p.waitForTimeout(1200); await p.screenshot({path:`${outPrefix}_${i++}.png`});
  }
  await b.close(); console.log('ok',i);
})();
