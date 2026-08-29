-- TDS gMA3 Show Export
-- Author: TDS
--
-- Prototype companion for the Vercel/local bridge.
-- This plugin exports a small JSON snapshot of the loaded show to a file.
--
-- Set the path used by the local bridge in TDS_SHOW_JSON.
-- Example Windows:
--   C:\TDS\gma3-show.json
--
-- Run this plugin whenever you want to refresh the phone's show data.

local function esc(s)
    s=tostring(s or "")
    return s:gsub("\\","\\\\"):gsub('"','\\"'):gsub("\n","\\n"):gsub("\r","\\r")
end

local function nameOf(h)
    if not h then return "" end
    local ok,v=pcall(function() return h:Get("Name") end)
    return ok and tostring(v or "") or ""
end

local function fixtureSnapshot()
    local out={}
    local n=GetSubfixtureCount()
    for i=0,n-1 do
        local h=GetSubfixture(i)
        if h then
            local addr=""
            pcall(function() addr=tostring(ToAddr(h)) end)
            out[#out+1]=string.format(
                '{"index":%d,"name":"%s","address":"%s"}',
                i,esc(nameOf(h)),esc(addr)
            )
        end
    end
    return "["..table.concat(out,",").."]",n
end

local function poolSnapshot(pool)
    local out={}
    local ok,n=pcall(function() return pool:Count() end)
    if not ok then return "[]" end
    for i=1,n do
        local h=pool[i]
        if h then out[#out+1]=string.format('{"index":%d,"name":"%s"}',i,esc(nameOf(h))) end
    end
    return "["..table.concat(out,",").."]"
end

return function()
    local fixtures,n=fixtureSnapshot()
    local groups,sequences="[]","[]"
    pcall(function() groups=poolSnapshot(DataPool().Groups) end)
    pcall(function() sequences=poolSnapshot(DataPool().Sequences) end)

    local json=string.format(
      '{"fixtureCount":%d,"fixtures":%s,"groups":%s,"sequences":%s}',
      n,fixtures,groups,sequences
    )

    -- This intentionally leaves the transport as a local file so the
    -- Vercel bridge never needs access to the grandMA3 filesystem.
    local f=io.open("C:\\TDS\\gma3-show.json","w")
    if f then f:write(json);f:close();Printf("TDS: show snapshot exported") else Printf("TDS: cannot write C:\\TDS\\gma3-show.json") end
end
