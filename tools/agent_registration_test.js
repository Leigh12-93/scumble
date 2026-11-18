"use strict";
const assert = require("node:assert/strict");
const { registration, server } = require("../electron/main/mcp/registration.js");

const win = { platform: "win32", exe: "C:\\Program Files\\Scumble\\Scumble.exe", launcher: "C:\\Program Files\\Scumble\\resources\\app.asar\\electron\\main\\mcp\\launch.js" };
assert.equal(registration("codex", win), 'codex mcp add scumble --env ELECTRON_RUN_AS_NODE=1 -- "C:\\Program Files\\Scumble\\Scumble.exe" "C:\\Program Files\\Scumble\\resources\\app.asar\\electron\\main\\mcp\\launch.js" --mcp');
assert.ok(registration("claude", win).startsWith("claude mcp add scumble -e ELECTRON_RUN_AS_NODE=1 -- "));
assert.deepEqual(JSON.parse(registration("desktop", win)).mcpServers.scumble, server(win));
const appImage = { platform: "linux", appImage: "/home/user/Scumble.AppImage" };
assert.equal(registration("codex", appImage), 'codex mcp add scumble -- "/home/user/Scumble.AppImage" --mcp');
const store = { platform: "win32", storeAlias: "Scumble.exe" };
assert.ok(registration("codex", store).startsWith('codex mcp add scumble --env ELECTRON_RUN_AS_NODE=1 -- "Scumble.exe" "-e"'));
console.log("Codex/Claude MCP registration: OK");
