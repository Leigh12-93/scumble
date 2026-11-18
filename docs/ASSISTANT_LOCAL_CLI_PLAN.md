# Claude Code and Codex on the MSI: reviewed integration plan

**Status:** PR #1 implements external MCP registration; this PR adds a read-only local CLI preflight and hardens the design. It **does not** replace Scumble's built-in Assistant or implement an OAuth bridge.

## The supported architecture

\`\`\`text
User signs in through each vendor's unmodified, official CLI
        |                               |
   Claude Code                      Codex CLI
        |                               |
        +----------- MCP stdio ----------+
                        |
          Scumble's existing MCP server
                        |
             Visible photo editor
\`\`\`

Scumble already exposes its editing commands and screenshots through \`electron/main/mcp/server.js\` and \`electron/main/mcp/launch.js\`. PR #1 gives both CLIs an installation-specific registration via the Help menu. The CLIs own sign-in, token renewal, model selection and account limits. Scumble does not receive authentication secrets.

The in-app Assistant currently uses independently billed API-key integrations via \`electron/main/assistant/index.js\`, \`providers.js\`, \`anthropic.js\`, and \`responses.js\`. Do not pretend CLI subscription sessions are API keys or send their credentials to provider HTTP endpoints.

## Provider boundary: a release gate, not an implementation detail

Anthropic's current [legal and compliance documentation](https://code.claude.com/docs/en/legal-and-compliance) explicitly restricts third-party applications offering Claude.ai login or routing requests through Claude subscription credentials on behalf of users. It distinguishes that from an end user signing in to an unmodified Claude Code binary. Developers integrating Claude into their product should use a supported API-key/cloud-provider arrangement, or obtain an explicit approved approach.

OpenAI supports signing in to the **official Codex CLI** with ChatGPT, as described in [Codex authentication](https://learn.chatgpt.com/docs/auth), and its stdio MCP registration is documented in the [CLI reference](https://learn.chatgpt.com/docs/cli/reference). This does **not** automatically authorise Scumble to copy tokens or impersonate a Codex API client.

**Decision:** ship official-client-to-Scumble MCP first. Do not add a built-in assistant picker that silently drives consumer OAuth subscriptions until each vendor's current terms and documented integration protocol permit that product behaviour.

## What this PR actually adds

\`node tools/local_agent_preflight.js\` checks whether \`claude\` and \`codex\` are installed and whether the official CLI reports a valid sign-in. \`--json\` prints just the bounded status fields. It never reads credential files or prints CLI's raw stdout/stderr, so emails, paths, access tokens and refresh tokens are excluded. \`node tools/local_agent_preflight_test.js\` exercises signed-in, signed-out, absent and sensitive-output fixtures without accessing an account.

The \`method\` field is a CLI-reported or parsed indicator, **not** evidence of a particular plan, billing entitlement, API compatibility or permission to embed that login in another application.

## MSI setup and verification

1. Open Scumble and make sure its editor is responsive. Install the official [Claude Code](https://code.claude.com/docs/en/overview) and [Codex CLI](https://learn.chatgpt.com/docs/cli/reference) binaries.
2. Run \`claude auth login\` and \`codex login\` in PowerShell if you are not already signed in. Complete login in the vendors' own flows; do not paste tokens into Scumble.
3. Run \`node tools/local_agent_preflight.js\` from a checkout of this repo to see whether each local CLI is available and signed in. This does not prove MCP is working.
4. After PR #1 is merged/built, copy the CLI-specific registration from Scumble's **Help** menu and paste it into PowerShell. Registration is a user action and should not silently alter Claude's or Codex's settings.
5. Run \`claude mcp list\` and \`codex mcp list\`; then open each CLI, inspect its \`scumble\` server and request \`list_documents\` and \`screenshot\` before attempting edits.
6. Make a small reversible layer edit, inspect the actual image and undo manually. Test a destructive operation **with explicit approval** and an expensive generation **with explicit cost confirmation**, then verify exporting only to a user-supplied path. Keep backups of important documents.

## Security constraints

- **External agents are not the in-app assistant.** The built-in assistant's approval cards, "Undo this turn", pinned-document handling and cost checks are **not** automatically inherited by an external MCP client (see \`docs/ASSISTANT.md\`). The MCP server executes commands. Agents should ask first, but text instructions alone do not enforce safety.
- Do not run unrestricted shell agents or skip approvals. An agent can modify an open image and may have other local capabilities outside Scumble's MCP server.
- No reading \`~/.codex/auth.json\`, \`~/.claude\` auth files, browser cookies, private keys or process tokens. No OAuth proxy, credential forwarding, refresh-token extraction, or custom login-screen impersonation.
- No arbitrary remote MCP listener. Use local stdio. Do not put images, raw CLI output, or credentials into GitHub artifacts/logs.
- Use **one editing agent at a time** per Scumble document until cross-agent mutation locking and document ownership are explicitly designed. An MCP command can otherwise race with user edits or another agent.
- Restart and verify the correct MSI/installed instance before testing a second agent. The launcher handles Electron's Windows stdout issue; raw \`Scumble.exe --mcp\` may corrupt stdio.
- A downloaded/untrusted photo, layer label or prompt can contain hostile instructions. Treat it as content, not as permission to read other files or contact a remote URL.

## Optional future native assistant integration

Before attempting an in-app provider picker, resolve vendor policy with a supported SDK/transport; for Claude, the API-key path is the conventional supported product integration. For Codex, investigate the documented app-server interface and its current stability/terms. A native integration would need an explicit trust/approval UI, bounded subprocess protocol, per-document mutation lock, cancellation, capability negotiation, deterministic tool allowlist, secure prompt/image routing and a test-backed recovery story. It must **not** fall back to copying CLI OAuth files when an official interface is unavailable.

## Completion gates

- PR #1's command generator is reachable from the Help menu, platform tests pass, and a live MSI Claude/Codex MCP smoke test passes.
- This PR's CLI preflight passes with mocked credentials and does not print sensitive fields.
- No claim of "built-in Assistant via subscription" until a separately reviewed, policy-compliant implementation and live tests exist.

### Official sources

- [Anthropic: legal and compliance](https://code.claude.com/docs/en/legal-and-compliance)
- [Claude Code CLI reference](https://code.claude.com/docs/en/cli-reference)
- [Claude Code MCP setup](https://code.claude.com/docs/en/mcp)
- [OpenAI: Codex CLI authentication](https://learn.chatgpt.com/docs/auth)
- [OpenAI: Codex CLI command options](https://learn.chatgpt.com/docs/cli/reference)
