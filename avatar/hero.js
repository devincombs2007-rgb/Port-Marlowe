// Still renders of the final viewer: bust 3/4, bust profile, full body.
const {chromium}=require('playwright'); const fs=require('fs'), path=require('path');
(async()=>{
  const [,,root,html,out]=process.argv;
  const b=await chromium.launch(); const p=await b.newPage({viewport:{width:520,height:700},deviceScaleFactor:1.5,colorScheme:'dark'});
  await p.route('https://cdn.jsdelivr.net/npm/three@0.170.0/**',r=>r.fulfill({status:200,body:fs.readFileSync(path.join(root,'node_modules/three',new URL(r.request().url()).pathname.replace('/npm/three@0.170.0/',''))),headers:{'content-type':'text/javascript'}}));
  await p.goto('file://'+html); await p.waitForFunction(()=>window.__ready===true,null,{timeout:240000});
  await p.addStyleTag({content:'.panel,.hint{display:none!important}'});
  const views=[['bust',[28,6,1.0,0.40]],['bust',[-85,3,1.0,0.40]],['body',[22,6,4.2,0.88]]]; const files=[];
  for(const [i,[mode,v]] of views.entries()){
    await p.evaluate(m=>document.querySelector(`#modes button[data-m=${m}]`).click(),mode);
    await p.evaluate(v=>window.__setView(...v),v); await p.waitForTimeout(900);
    const f=`${out}_${i}.png`; await p.screenshot({path:f,timeout:180000}); files.push(f);
  }
  await b.close(); console.log(files.join(' '));
})();
