"use strict";
// Diagnostic only: run the official CLI's read-only version/login-status commands.
// Never read credential files, print raw CLI output, or implement a third-party OAuth client.
const { spawnSync } = require("node:child_process");

const CLIENTS = Object.freeze({
    claude: { binary: "claude", loginArgs: ["auth", "status"], loginCommand: "claude auth login" },
    codex: { binary: "codex", loginArgs: ["login", "status"], loginCommand: "codex login" },
});
const METHODS = new Set(["none", "claude.ai", "oauth_token", "api_key", "api_key_helper", "third_party"]);

function runFixed(binary, args, runner, platform) {
    try {
        // On Windows, native installers and npm often expose .cmd shims. Shell use is
        // restricted to two fixed executable names and fixed, hard-coded arguments.
        // Never accept caller-supplied command names, args, paths, or shell fragments.
        const r = runner(binary, args, {
            encoding: "utf8",
            timeout: 8000,
            maxBuffer: 65536,
            windowsHide: true,
            shell: platform === "win32",
        });
        return { ok: !r.error && r.status === 0, output: String(r.stdout || ""), error: r.error || null };
    } catch (err) {
        return { ok: false, output: "", error: err };
    }
}

function methodFor(id, output) {
    if (id === "claude") {
        try {
            const method = JSON.parse(output).authMethod;
            return METHODS.has(method) ? method : "unknown";
        } catch (_) { return "unknown"; }
    }
    if (/logged in using chatgpt/i.test(output)) return "chatgpt";
    if (/logged in using an? api key/i.test(output)) return "api_key";
    return "unknown";
}

function probe(id, { runner = spawnSync, platform = process.platform } = {}) {
    const client = CLIENTS[id];
    if (!client) throw new Error("Unknown local agent");
    const v = runFixed(client.binary, ["--version"], runner, platform);
    // Extract only numeric version text, never paths, emails or raw stderr.
    const m = v.ok ? v.output.match(/\b\d+\.\d+(?:\.\d+)?\b/) : null;
    const version = m ? m[0] : null;
    if (!v.ok) {
        return { agent: id, available: false, authenticated: false, method: "none", version, next: "Install " + (id === "claude" ? "Claude Code" : "Codex CLI") };
    }
    const a = runFixed(client.binary, client.loginArgs, runner, platform);
    return {
        agent: id,
        available: true,
        authenticated: a.ok,
        method: a.ok ? methodFor(id, a.output) : "none",
        version,
        next: a.ok ? null : client.loginCommand,
    };
}

function probeAll(opts) {
    return [probe("claude", opts), probe("codex", opts)];
}

if (require.main === module) {
    const rows = probeAll();
    if (process.argv.includes("--json")) {
        process.stdout.write(JSON.stringify({ agents: rows }, null, 2) + "\n");
    } else {
        for (const row of rows) {
            const state = !row.available ? "not installed" : row.authenticated ? "signed in" : "sign in required";
            process.stdout.write(row.agent + ": " + state + (row.version ? " (v" + row.version + ")" : "") + (row.next ? " | next: " + row.next : "") + "\n");
        }
    }
    if (rows.some((row) => !row.authenticated)) process.exitCode = 1;
}

module.exports = { probe, probeAll, methodFor };
