const page = (await (await fetch("http://127.0.0.1:9222/json/list")).json()).find(t=>t.type==="page");
const ws = new WebSocket(page.webSocketDebuggerUrl);
let id=0; const pending=new Map();
ws.addEventListener("message", e=>{const m=JSON.parse(e.data); if(m.id&&pending.has(m.id)){pending.get(m.id)(m);pending.delete(m.id);}});
await new Promise(r=>ws.addEventListener("open",r));
const send=(method,params={})=>new Promise(res=>{const mid=++id;pending.set(mid,res);ws.send(JSON.stringify({id:mid,method,params}));});
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
const ev=async expr=>(await send("Runtime.evaluate",{expression:expr,awaitPromise:true,returnByValue:true})).result?.result?.value;
await send("Page.enable"); await send("Runtime.enable");
await send("Emulation.setDeviceMetricsOverride",{width:1280,height:1100,deviceScaleFactor:1,mobile:false});
await send("Page.navigate",{url:"http://127.0.0.1:8765/xingchen/login.html"}); await sleep(900);
await ev("sessionStorage.setItem('xc_auth','1');1");
for (const [to, out] of [["chemistry.html","/tmp/f_chem.png"],["class.html","/tmp/f_class.png"]]) {
  await send("Page.navigate",{url:"http://127.0.0.1:8765/xingchen/"+to}); await sleep(1200);
  await ev("document.querySelectorAll('.reveal').forEach(e=>e.classList.add('in'));1");
  await sleep(600);
  await ev("window.scrollTo(0, document.body.scrollHeight);1"); await sleep(700);
  const shot=await send("Page.captureScreenshot",{format:"png"});
  const fs=await import("node:fs"); fs.writeFileSync(out, Buffer.from(shot.result.data,"base64"));
  console.log(out, await ev("JSON.stringify({h:document.body.scrollHeight, y:window.scrollY})"));
}
ws.close();
