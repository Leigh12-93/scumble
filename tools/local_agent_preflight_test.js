"use strict";
const assert = require("node:assert/strict");
const { probe, probeAll, methodFor } = require("./local_agent_preflight.js");

function mock(outputs) {
    const calls = [];
    const runner = (binary, args, options) => {
        calls.push({ binary, args, options });
        const result = outputs[binary + " " + args.join(" ")];
        return result || { status: 1, stdout: "", error: { code: "ENOENT" } };
    };
    return { runner, calls };
}

const signed = mock({
    "claude --version": { status: 0, stdout: "2.1.301 (Claude Code)" },
    "claude auth status": { status: 0, stdout: JSON.stringify({ authMethod: "claude.ai", email: "secret@example.com", token: "SENSITIVE" }) },
    "codex --version": { status: 0, stdout: "codex-cli 0.99.4" },
    "codex login status": { status: 0, stdout: "Logged in using ChatGPT" },
});
const result = probeAll({ runner: signed.runner, platform: "win32" });
assert.deepEqual(result.map((r) => [r.agent, r.available, r.authenticated, r.method, r.version]), [
    ["claude", true, true, "claude.ai", "2.1.301"],
    ["codex", true, true, "chatgpt", "0.99.4"],
]);
assert.ok(signed.calls.every((c) => c.options.windowsHide && c.options.shell === true));
assert.ok(signed.calls.every((c) => (c.binary === "claude" || c.binary === "codex")));
assert.ok(!JSON.stringify(result).includes("secret@example.com"));
assert.ok(!JSON.stringify(result).includes("SENSITIVE"));

const absent = mock({});
const missing = probe("codex", { runner: absent.runner, platform: "linux" });
assert.equal(missing.available, false);
assert.equal(missing.authenticated, false);
assert.equal(absent.calls.length, 1);
assert.equal(absent.calls[0].options.shell, false);

const signedOut = mock({
    "claude --version": { status: 0, stdout: "Claude 2.1.1" },
    "claude auth status": { status: 1, stdout: JSON.stringify({ authMethod: "none", email: "ignored@example.com" }) },
});
const out = probe("claude", { runner: signedOut.runner });
assert.equal(out.method, "none");
assert.equal(out.next, "claude auth login");
assert.equal(out.authenticated, false);

const api = mock({
    "claude --version": { status: 0, stdout: "2.1.1" },
    "claude auth status": { status: 0, stdout: '{"authMethod":"api_key"}' },
});
assert.equal(probe("claude", { runner: api.runner }).method, "api_key");
assert.equal(methodFor("claude", '{"authMethod":"<malicious>", "token":"DO_NOT_PRINT"}'), "unknown");
assert.equal(methodFor("codex", "Logged in using an API key"), "api_key");
assert.throws(() => probe("evil", { runner: signed.runner }), /Unknown local agent/);
console.log("Local CLI preflight: OK (no live credentials read)");
