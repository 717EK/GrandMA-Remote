const express = require("express");
const http = require("http");
const path = require("path");
const OSC = require("osc");

const WEB_PORT = 3000;
const OSC_PORT = 9000;

const app = express();
const server = http.createServer(app);
app.use(express.static(path.join(__dirname, "public")));

let show = {version:"1.0", fixtureCount:0, fixtures:[], groups:[], sequences:[]};
const clients = new Set();

const oscServer = new OSC.UDPPort({
  localAddress: "0.0.0.0",
  localPort: OSC_PORT,
  metadata: true
});

oscServer.on("ready", () => console.log(`OSC listening on UDP ${OSC_PORT}`));

oscServer.on("message", (msg) => {
  if (msg.address !== "/tds/show") return;
  try {
    const arg = msg.args && msg.args[0];
    const raw = typeof arg === "object" && arg.value !== undefined ? arg.value : arg;
    show = JSON.parse(String(raw));
    console.log(`Show received: ${show.fixtureCount} fixtures`);
    broadcast({type:"show", data:show});
  } catch (e) {
    console.error("Bad show JSON:", e.message);
  }
});

oscServer.open();

function broadcast(obj){
  const s = JSON.stringify(obj);
  for(const ws of clients) ws.send(s);
}

// WebSocket support without another dependency.
const WebSocket = require("ws");
const wss = new WebSocket.Server({server});
wss.on("connection", ws => {
  clients.add(ws);
  ws.send(JSON.stringify({type:"show",data:show}));
  ws.on("close",()=>clients.delete(ws));
  ws.on("message", raw => {
    try {
      const m=JSON.parse(raw);
      if(m.type==="fixture" && Number.isInteger(m.id) && (m.state==="on" || m.state==="off")){
        const cmd = `Fixture ${m.id} At ${m.state==="on" ? 100 : 0}`;
        sendCommand(cmd);
      }
    } catch(e){ console.error("WS message:",e.message); }
  });
});

function sendCommand(command){
  const port = new OSC.UDPPort({
    remoteAddress: process.env.MA3_IP || "127.0.0.1",
    remotePort: Number(process.env.MA3_OSC_PORT || 8000),
    metadata: true
  });
  port.open();
  port.on("ready",()=>{
    port.send({
      address:"/cmd",
      args:[{type:"s", value:command}]
    });
    setTimeout(()=>port.close(),100);
  });
}

app.get("/api/show",(req,res)=>res.json(show));

server.listen(WEB_PORT,()=>console.log(`Phone UI: http://0.0.0.0:${WEB_PORT}`));
