TDS gMA3 Remote — Vercel + Local Bridge
========================================

This version is designed for your GitHub -> Vercel workflow.

ARCHITECTURE
Phone browser
   |
   | HTTPS
   v
Vercel app + API
   |
   | HTTPS polling
   v
Local TDS bridge (same LAN as grandMA3)
   |
   | OSC UDP
   v
grandMA3

Why polling?
A normal Vercel deployment is not a persistent LAN WebSocket server. The local
bridge makes outbound HTTPS requests, so there is no need to expose grandMA3
directly to the Internet and no mixed-content problem on an HTTPS Vercel site.

VERCEL SETUP
1. Put this repository on GitHub.
2. Import the repo into Vercel.
3. Create an Upstash Redis database (Vercel Marketplace integration is fine).
4. Add these Vercel environment variables:
     KV_REST_API_URL
     KV_REST_API_TOKEN
     TDS_BRIDGE_KEY
   Use the same TDS_BRIDGE_KEY on the local bridge.
5. Deploy.

LOCAL BRIDGE SETUP
1. Install Node.js 18+.
2. On a computer on the same LAN as grandMA3:
     npm install
3. Set:
   Windows PowerShell:
     $env:TDS_VERCEL_URL="https://YOUR-APP.vercel.app"
     $env:TDS_BRIDGE_KEY="same-secret-as-vercel"
     $env:MA3_IP="192.168.1.50"
     $env:MA3_OSC_PORT="8000"
     $env:TDS_SHOW_JSON="C:\TDS\gma3-show.json"
   macOS/Linux:
     export TDS_VERCEL_URL="https://YOUR-APP.vercel.app"
     export TDS_BRIDGE_KEY="same-secret-as-vercel"
     export MA3_IP="192.168.1.50"
     export MA3_OSC_PORT="8000"
     export TDS_SHOW_JSON="/path/to/gma3-show.json"
4. Run:
     node bridge.js

GRANDMA3
- Configure an OSC input/command endpoint on the MA3 station.
- Make it listen on the MA3_OSC_PORT above.
- The bridge sends command strings through OSC /cmd.
- Install/run TDS-ShowExport.lua as a grandMA3 plugin.
- The sample plugin exports to C:\TDS\gma3-show.json. Create that directory
  first on Windows, or change the path in the plugin.

PHONE
Open:
   https://YOUR-APP.vercel.app

The phone shows the show snapshot stored in Redis.
ON/OFF queues a command in Redis; the local bridge polls it and sends:
   Fixture <id> At 100
or
   Fixture <id> At 0

IMPORTANT LIMITATION OF THIS FIRST PROTOTYPE
The show exporter intentionally uses a local JSON file as the hand-off from
grandMA3 Lua to the bridge. This proves the Vercel architecture without
depending on an undocumented direct HTTP server API inside grandMA3.

Next step:
Replace the file hand-off with a direct supported grandMA3 transport and add
selection, dimmer, color, position, and gyro control.
