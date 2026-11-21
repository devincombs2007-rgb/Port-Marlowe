// Render preview screenshots of a local page. Files are served from ROOT via request routing (no server).
const {chromium}=require('playwright');
const fs=require('fs'), path=require('path');
const types={'.html':'text/html','.js':'text/javascript','.mjs':'text/javascript','.glb':'model/gltf-binary','.json':'application/json','.png':'image/png','.jpg':'image/jpeg','.wasm':'application/wasm'};
(async()=>{
  const [,,root,page,outPrefix,views,size]=process.argv; const [w,h]=(size||'500x600').split('x').map(Number);
  const b=await chromium.launch();
  const p=await b.newPage({viewport:{width:w,height:h}});
  await p.route('http://local.test/**',route=>{
    const rel=decodeURIComponent(new URL(route.request().url()).pathname);
    const f=path.join(root,rel);
    if(!fs.existsSync(f)) return route.fulfill({status:404,body:'nf'});
    route.fulfill({status:200,body:fs.readFileSync(f),headers:{'content-type':types[path.extname(f)]||'application/octet-stream'}});
  });
  p.on('console',m=>{if(m.type()==='error')console.log('console:',m.text())}); p.on('pageerror',e=>console.log('pageerror',e.message));
  const files=[];
  for(const v of views.split(';')){
    await p.goto(`http://local.test/${page}&${v}`);
    await p.waitForFunction(()=>document.title==='ready'||document.title.startsWith('error'),null,{timeout:180000});
    const t=await p.title(); if(t!=='ready') console.log(t);
    const f=`${outPrefix}_${files.length}.png`; await p.screenshot({path:f}); files.push(f);
  }
  await b.close(); console.log(files.join(' '));
})();
