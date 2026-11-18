// The registration an MCP client needs to start this installation's server (Help > Copy MCP
// registration). Plain Node, no Electron: main.js passes in the paths it knows, and
// tools/platform_test.js checks every platform's answer without an app.
//
// Clients get the Node-mode launcher (electron/main/mcp/launch.js), not the exe with `--mcp`:
// Electron's Windows entry point writes a CR LF to stdout before any code of ours runs and
// strict clients reject it. The exception is an AppImage: it runs from a mount point that
// changes with every start (/tmp/.mount_XXXX), so no path inside it - the launcher's included -
// survives until the client uses it. Only the AppImage file itself ($APPIMAGE) stays put, and
// Linux has no Windows console code to write the stray line, so it is registered with `--mcp`.
// The Microsoft Store package is the Windows version of the same problem: it runs from a
// WindowsApps folder named after its version, so the client gets the package's execution alias
// (which stays) in Node mode, and the launcher is found at run time in the resources folder of
// whichever version the alias starts (electron/main/msix.js).
"use strict";

/**
 * Node-mode code that loads the launcher from the resources of the exe it runs in. With `-e` there is
 * no script path in process.argv, so the code puts one in: the launcher reads its arguments from
 * argv[2] on, as when it is started as a file (arguments go after a `--`).
 */
const STORE_LAUNCH = "process.argv.splice(1,0,'-e');require(require('path').join(process.resourcesPath,'app.asar','electron','main','mcp','launch.js'))";

/**
 * { command, args, env } for this installation.
 * @param {{ platform: string, exe: string, launcher: string, appImage?: string, storeAlias?: string }} where
 */
function server(where) {
    if (where.platform === "win32" && where.storeAlias) {
        return { command: String(where.storeAlias), args: ["-e", STORE_LAUNCH], env: { ELECTRON_RUN_AS_NODE: "1" } };   // the launcher starts the app with --mcp when it is given nothing
    }
    const appImage = where.platform === "linux" && where.appImage ? String(where.appImage) : "";
    if (appImage) return { command: appImage, args: ["--mcp"], env: {} };
    return { command: where.exe, args: [where.launcher, "--mcp"], env: { ELECTRON_RUN_AS_NODE: "1" } };
}


/** Quote a pasted command for PowerShell (Windows) or POSIX shells. */
function quoteArg(value, platform) {
    const raw = String(value);
    if (/[\r\n\0]/.test(raw)) throw new Error("invalid MCP launcher path: newline or NUL");
    const tick = String.fromCharCode(96);
    const literal = raw.includes("$") || raw.includes(tick) || raw.includes('"') || (platform !== "win32" && raw.includes("\\"));
    if (platform === "win32") {
        return literal ? "'" + raw.replace(/'/g, "''") + "'" : '"' + raw + '"';
    }
    return literal ? "'" + raw.replace(/'/g, "'\\''") + "'" : '"' + raw + '"';
}

/** Generate the clipboard registration for Claude Desktop, Claude Code, or Codex CLI. */
function registration(kind, where) {
    const s = server(where);
    if (kind === "desktop") {
        const entry = { command: s.command, args: s.args };
        if (Object.keys(s.env).length) entry.env = s.env;
        return JSON.stringify({ mcpServers: { scumble: entry } }, null, 2);
    }
    const codex = kind === "codex";
    const env = Object.entries(s.env).map(([k, v]) => `${codex ? "--env" : "-e"} ${k}=${v} `).join("");
    // every argument quoted but a last one that is a plain switch (--mcp), as the line has always read
    const last = s.args[s.args.length - 1];
    const bare = /^--[a-z-]+$/.test(last);
    const quoted = [s.command, ...(bare ? s.args.slice(0, -1) : s.args)].map((a) => quoteArg(a, where.platform)).join(" ");
    return `${codex ? "codex" : "claude"} mcp add scumble ${env}-- ${quoted}${bare ? " " + last : ""}`;
}

module.exports = { server, registration, STORE_LAUNCH };
