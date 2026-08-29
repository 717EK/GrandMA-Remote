/*
  TDS gMA3 Local Bridge
  Author: TDS

  Runs on a computer on the same LAN as grandMA3.
  It polls the Vercel app for commands and uploads show data.

  Environment:
    TDS_VERCEL_URL=https://your-app.vercel.app
    TDS_BRIDGE_KEY=your-shared-secret
    MA3_IP=192.168.1.50
    MA3_OSC_PORT=8000

  grandMA3 OSC input must be configured to receive command strings
  on MA3_OSC_PORT.
*/

const https = require("https");
const OSC = require("osc");

const BASE = (process.env.TDS_VERCEL_URL||"").replace(/\/$/,"");
const KEY = process.env.TDS_BRIDGE_KEY||"";
const MA3_IP = process.env.MA3_IP||"127.0.0.1";
const MA3_OSC_PORT = Number(process.env.MA3_OSC_PORT||8000);

if(!BASE){console.error("Set TDS_VERCEL_URL");process.exit(1)}

function request(method,path,body){
  return new Promise((resolve,reject)=>{
    const data=body===undefined?null:Buffer.from(JSON.stringify(body));
    const u=new URL(BASE+path);
    const req=https.request({
      hostname:u.hostname,port:443,path:u.pathname+u.search,method,
      headers:{
        "Content-Type":"application/json",
        "X-TDS-Key":KEY,
        ...(data?{"Content-Length":data.length}:{})
      }
    },res=>{
      let s="";res.on("data",d=>s+=d);
      res.on("end",()=>{try{resolve({status:res.statusCode,data:JSON.parse(s||"{}")})}catch(e){reject(e)}})
    });
    req.on("error",reject); if(data)req.write(data); req.end();
  })
}

function sendMA3(command){
  const p=new OSC.UDPPort({remoteAddress:MA3_IP,remotePort:MA3_OSC_PORT,metadata:true});
  p.open();
  p.on("ready",()=>{
    p.send({address:"/cmd",args:[{type:"s",value:command}]});
    setTimeout(()=>p.close(),100);
  });
}

let lastCommand=0;

async function poll(){
  try{
    const r=await request("GET","/api/bridge?action=commands&after="+lastCommand);
    if(r.status!==200) throw new Error(JSON.stringify(r.data));
    for(const c of r.data.commands||[]){
      const cmd=`Fixture ${c.fixture} At ${c.state==="on"?100:0}`;
      console.log("MA3:",cmd);
      sendMA3(cmd);
      lastCommand=Math.max(lastCommand,c.id);
    }
  }catch(e){console.error("Poll:",e.message)}
}

async function pushShow(){
  // The companion grandMA3 Lua plugin writes show data to a local JSON file.
  // Set TDS_SHOW_JSON to that file path, or replace this function with the
  // object extraction code appropriate to your show/plugin version.
  const fs=require("fs");
  const file=process.env.TDS_SHOW_JSON;
  if(!file) return;
  try{
    const show=JSON.parse(fs.readFileSync(file,"utf8"));
    const r=await request("POST","/api/bridge?action=show",show);
    if(r.status!==200) console.error("Show upload:",r.data);
  }catch(e){console.error("Show:",e.message)}
}

console.log("TDS bridge running ->",BASE);
setInterval(poll,1000);
setInterval(pushShow,3000);
poll(); pushShow();
