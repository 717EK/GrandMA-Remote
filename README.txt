TDS gMA3 Bridge — first prototype
===================================

What this proves:
Phone browser -> Node bridge -> OSC -> grandMA3
grandMA3 Lua -> OSC -> Node bridge -> phone

IMPORTANT:
A browser cannot receive OSC directly. This prototype therefore needs ONE computer
on the same LAN as grandMA3 to run server.js. The phone only needs Safari/Chrome.

1) Install Node.js 18+ on the bridge computer.
2) Open a terminal in this folder:
      npm install
3) Set the grandMA3 IP:
      Windows PowerShell:
        $env:MA3_IP="192.168.1.50"
      macOS/Linux:
        export MA3_IP=192.168.1.50
   Set the OSC receive port used by grandMA3 (default example is 8000):
      $env:MA3_OSC_PORT="8000"
4) Start:
      npm start
5) On the phone, open:
      http://BRIDGE-COMPUTER-IP:3000

grandMA3 setup:
- In In & Out > OSC create/configure an OSCData line.
- Enable OSC Input for the command port.
- Enable Receive Command.
- Set its port to 8000 (or change MA3_OSC_PORT above).
- For the Lua plugin's outbound show data, create an OSCData line whose
  Destination IP is the bridge computer and Destination Port is 9000.
- Enable Output/Send as required.

Plugin:
Create a grandMA3 plugin named "TDS Bridge", paste TDS-Bridge.lua as its Lua
component, and run it. It sends the current fixture/group/sequence snapshot.

The phone UI has:
- fixture list
- groups
- sequences
- ON/OFF buttons for each fixture

This is intentionally a small proof-of-concept. It does not read the show file
directly from the phone and it does not use the native Web Remote UI.
