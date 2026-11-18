# Connect Claude Code and Codex CLI to Scumble (Windows MSI laptop)

Scumble exposes its existing editor tools through a local **stdio MCP server**. Both Claude Code and Codex CLI can control the running editor. This integration uses the authenticated **official CLI sessions**; Scumble never reads, exports or copies OAuth refresh/access tokens.

> This is **external-agent control of Scumble**, not a replacement for the built-in Assistant's API-key provider. ChatGPT/Claude consumer subscriptions and API billing are separate products; supported CLI sign-in is managed by each vendor's own tooling.

## Prerequisites

1. Install Scumble on the MSI and open it. Install Claude Code and Codex CLI according to their official instructions.
2. In PowerShell run `claude auth status` and `codex login status`. If either is not signed in, use that CLI's own `claude auth login` or `codex login` flow. Never paste tokens into Scumble.
3. In Scumble choose **Help > Copy MCP registration (Claude Code)** or **Help > Copy MCP registration (Codex CLI)** to copy the installation-specific command. The Windows Electron launcher matters: running the executable directly can add CR/LF to stdout and break MCP stdio.

## Claude Code

Paste Scumble's existing generated `claude mcp add scumble -e ELECTRON_RUN_AS_NODE=1 -- "<Scumble.exe>" "<launch.js>" --mcp` command into PowerShell. Replace only the example paths with the exact paths from Scumble's Help menu. Restart Claude Code if needed and verify with `claude mcp list`.

## Codex CLI

Use **Help > Copy MCP registration (Codex CLI)** and paste that command into PowerShell. The example below is for troubleshooting only:

```powershell
codex mcp add scumble --env ELECTRON_RUN_AS_NODE=1 -- "C:\\path\\to\\Scumble.exe" "C:\\path\\to\\resources\\app.asar\\electron\\main\\mcp\\launch.js" --mcp
codex mcp get scumble --json
codex mcp list
```

The `registration("codex", where)` helper now produces this command from the **actual** installation paths, including the Store alias / Linux AppImage cases. Do not copy the `C:\\path\\to` placeholder verbatim. The Codex CLI or IDE can then call Scumble's `list_documents`, `screenshot`, masks, layers and other tools.

## Security and troubleshooting

- Keep the MCP server **local stdio only**, not a remotely exposed HTTP endpoint.
- Both CLIs may receive screenshots, documents and layer metadata when you give them editor-tool access. Approve destructive edits, exports and expensive generation explicitly in the agent session.
- Claude Code and Codex may have their own model/usage limits and permissions. This integration does not bypass them or make the in-app Assistant use a subscription.
- If MCP starts but tools cannot see the editor, launch the same Scumble installation and check the local bridge/attach mode. Check the correct executable and launcher paths; an out-of-date Store package path will fail.
- To disconnect run `claude mcp remove scumble` or `codex mcp remove scumble`. This deletes MCP registration, not CLI login credentials.

Test the generated commands with `node tools/platform_test.js`, which also covers Windows Store and Linux package layouts.
