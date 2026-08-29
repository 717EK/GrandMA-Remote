-- TDS gMA3 Bridge
-- Author: TDS
--
-- Prototype bridge:
--   grandMA3 Lua -> OSC -> Node server -> phone browser
--
-- Before running:
--   1. Create an OSCData line in grandMA3.
--   2. Enable OSC Input/Output as appropriate.
--   3. Set Destination IP to the computer running server.js.
--   4. Set Destination Port to 9000.
--
-- The plugin sends show information to OSC address /tds/show as JSON.
-- The Node server sends commands back using /cmd.

local function jsonEscape(s)
    s = tostring(s or "")
    s = s:gsub("\\", "\\\\"):gsub('"', '\\"'):gsub("\n", "\\n"):gsub("\r", "\\r")
    return s
end

local function sendJson(json)
    -- OSC configuration 1 is assumed. Change "1" if needed.
    Cmd('SendOSC 1 "/tds/show,s,' .. jsonEscape(json) .. '"')
end

local function getName(h)
    if not h then return "" end
    local ok, name = pcall(function() return h:Get("Name") end)
    if ok and name then return tostring(name) end
    return ""
end

local function collectFixtures()
    local out = {}
    local count = GetSubfixtureCount()
    for i = 0, count - 1 do
        local h = GetSubfixture(i)
        if h then
            local addr = ""
            pcall(function() addr = tostring(ToAddr(h)) end)
            local name = getName(h)
            out[#out + 1] = {
                index = i,
                name = name,
                address = addr
            }
        end
    end
    return out
end

local function collectPool(pool)
    local out = {}
    if not pool then return out end
    local ok, n = pcall(function() return pool:Count() end)
    if not ok or not n then return out end
    for i = 1, n do
        local h = pool[i]
        if h then
            out[#out + 1] = {index=i, name=getName(h)}
        end
    end
    return out
end

return function()
    local fixtures = collectFixtures()

    local groups = {}
    local sequences = {}
    pcall(function()
        groups = collectPool(DataPool().Groups)
    end)
    pcall(function()
        sequences = collectPool(DataPool().Sequences)
    end)

    local function listJson(items)
        local s = "["
        for i,v in ipairs(items) do
            if i > 1 then s = s .. "," end
            s = s .. string.format(
                '{"index":%d,"name":"%s"%s}',
                tonumber(v.index) or 0,
                jsonEscape(v.name),
                v.address and (',"address":"'..jsonEscape(v.address)..'"') or ""
            )
        end
        return s .. "]"
    end

    local json = '{"version":"1.0","fixtureCount":' ..
        tostring(#fixtures) ..
        ',"fixtures":' .. listJson(fixtures) ..
        ',"groups":' .. listJson(groups) ..
        ',"sequences":' .. listJson(sequences) .. '}'

    sendJson(json)
    Printf("TDS Bridge: sent %d fixtures, %d groups, %d sequences", #fixtures, #groups, #sequences)
end
