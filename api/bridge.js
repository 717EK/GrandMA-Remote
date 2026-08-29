const { Redis } = require("@upstash/redis");

function redis() {
  if (!process.env.KV_REST_API_URL || !process.env.KV_REST_API_TOKEN)
    throw new Error("Missing KV_REST_API_URL / KV_REST_API_TOKEN");
  return new Redis({url:process.env.KV_REST_API_URL, token:process.env.KV_REST_API_TOKEN});
}
function auth(req,res){
  const key=process.env.TDS_BRIDGE_KEY;
  if(key && req.headers["x-tds-key"]!==key){res.status(401).json({error:"unauthorized"});return false}
  return true;
}

module.exports = async (req,res)=>{
  if(!auth(req,res)) return;
  const r=redis(), action=req.query.action || "state";

  if(req.method==="GET" && action==="state"){
    const state=await r.get("tds:show") || {fixtureCount:0,fixtures:[],groups:[],sequences:[]};
    return res.status(200).json(state);
  }

  if(req.method==="POST" && action==="show"){
    await r.set("tds:show", req.body || {});
    return res.status(200).json({ok:true});
  }

  if(req.method==="POST" && action==="command"){
    const body=req.body || {};
    if(!["on","off"].includes(body.state) || !Number.isInteger(body.id))
      return res.status(400).json({error:"bad command"});
    const id=await r.incr("tds:command:id");
    await r.rpush("tds:commands", JSON.stringify({
      id, fixture:body.id, state:body.state, ts:Date.now()
    }));
    await r.ltrim("tds:commands",-50,-1);
    return res.status(200).json({ok:true,id});
  }

  if(req.method==="GET" && action==="commands"){
    const items=await r.lrange("tds:commands",0,49);
    const last=Number(req.query.after||0);
    const out=items.map(x=>{try{return JSON.parse(x)}catch{return null}})
      .filter(x=>x && x.id>last).sort((a,b)=>a.id-b.id);
    return res.status(200).json({commands:out});
  }

  res.status(404).json({error:"not found"});
};
