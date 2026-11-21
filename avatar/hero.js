const {chromium}=require('playwright'); const fs=require('fs'), path=require('path');
(async()=>{
  const [,,root,html,out]=process.argv;
  const b=await chromium.launch(); const p=await b.newPage({viewport:{width:520,height:700},deviceScaleFactor:2,colorScheme:'dark'});
  await p.route('https://cdn.jsdelivr.net/npm/three@0.170.0/**',r=>r.fulfill({status:200,body:fs.readFileSync(path.join(root,'node_modules/three',new URL(r.request().url()).pathname.replace('/npm/three@0.170.0/',''))),headers:{'content-type':'text/javascript'}}));
  await p.goto('file://'+html); await p.waitForFunction(()=>window.__ready===true,null,{timeout:240000});
  await p.addStyleTag({content:'.panel,.hint{display:none!important}'});
  const views=[[28,6,1.05,0.40],[-90,3,1.05,0.40],[165,12,1.1,0.40]]; const files=[];
  for(const [i,v] of views.entries()){ await p.evaluate(v=>window.__setView(...v),v); await p.waitForTimeout(900); const f=`${out}_${i}.png`; await p.screenshot({path:f}); files.push(f); }
  await b.close(); console.log(files.join(' '));
})();
