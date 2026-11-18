# Built-in assistant: local Claude Code / Codex CLI sessions

Status: design proposal, **not yet implemented**. Applies to the Windows MSI installation. External MCP connections are handled separately by PR #1.

## Goal

Let the user choose **Claude Code (signed in)** or **Codex CLI (signed in)** in Scumble's Assistant model selector, without entering Anthropic/OpenAI API keys or extracting OAuth tokens. Both must work under each CLI's official subscription/session rules. This is not a generic OAuth client or a promise that consumer tokens can be used against API endpoints.

## Existing architecture

- `electron/main/assistant/index.js` drives Scumble's in-process MCP tools via a model adapter.
- `electron/main/assistant/providers.js` lists remote API providers and their key requirements.
- `electron/main/assistant/store.js` persists chat/event history.
- `electron/main/mcp/server.js` already exposes the same editing commands to external agents using stdio MCP.
- `electron/main/mcp/registration.js` builds installation-specific launcher registrations.

Do **not** route CLI subscription sessions through the `anthropic` or `openai` HTTP adapters. Those speak provider APIs and require API authentication.

## Implementation outline

1. **Local CLI discovery (main process only)**: locate `claude` and `codex` through executable discovery on Windows, including .cmd wrappers; allow manual path selection. Probe `--version` and the official, non-secret login-status command in a bounded child process. Show `Installed / Sign in required / Unavailable`, never a token.
2. **Provider selection**: add two separate local-agent picker rows (`Claude Code local session`, `Codex local session`). Selecting one starts a new assistant chat, as current provider changes do. Do not pretend to know model choices or billing; report CLI-provided information when available.
3. **Execution boundary**: spawn the official CLI using structured process arguments, no shell interpolation, no credential-file reading, no arbitrary environment overrides. Use a fresh isolated working directory and least privilege. Only explicitly authorised image/project paths may be accessed. Redact credentials and private filesystem paths from logs.
4. **Tool boundary**: let the CLI use Scumble's **existing** MCP server. Preserve the tool's read/destructive flags, permission prompts and document pinning. A CLI approval prompt should not silently bypass Scumble's existing confirmation semantics. Do not grant unrestricted filesystem or shell tools merely to enable photo editing.
5. **Output bridge**: parse the CLI's documented machine-readable event protocol using strict schema guards. Bridge assistant text, tool requests, images and usage/status into Scumble's existing events. Version-detect CLI capabilities and refuse unsupported modes with actionable messages. A CLI may drive MCP directly instead of going through the in-process loop; choose one model and avoid duplicate execution.
6. **Cancellation / lifetime**: use a per-turn AbortController, terminate the owned subprocess tree on Windows, and ensure late tool replies cannot act on a cancelled turn. Reconnect via a new CLI session rather than reusing a broken process.
7. **Privacy**: no OAuth token handling in Scumble, renderer, JSON chat history, crash logs, GitHub actions or test fixtures. Explain when screenshots/images leave the device under a selected provider's own terms.
8. **User experience**: one-click detect, sign-in instructions that open the vendor's official flow, one CLI selection, one chat, clear connection/limit/errors. Do not claim the built-in chat is authenticated until an actual CLI round-trip succeeds.

## Required tests

- Windows: missing CLI, .cmd shim discovery, signed-out, signed-in, CLI upgrade, permission denial.
- Windows paths: whitespace, Unicode, installed vs portable, process-exit propagation, timeout, process-tree cancellation.
- MCP: view open document, screenshot, make reversible layer edit, confirm destructive operation, Undo this turn, Stop during generation.
- Security: malicious prompt asking for ~/.claude or ~/.codex credentials; attempts to invoke arbitrary shell; unauthorized path access; log snapshot scan for tokens.
- Regression: existing API-key models, chat restore, history pruning, screenshots, model selector and no infinite tool loops.

## Acceptance criteria

- A user signed into official Claude Code and Codex CLIs on the MSI can select either local session in the Scumble Assistant and complete a photograph edit **without supplying an API key to Scumble**.
- Session state comes from official CLIs, never a copied ChatGPT/Anthropic token. Failure is explicit when the account/session or CLI policy does not support a requested operation.
- Every image-changing tool call is visible, cancellable where supported and subject to existing approval/undo rules.
- Windows test suite and end-to-end smoke test pass on the real MSI installation before merge.

## Non-goals

- Reading or replaying the CLI's private OAuth refresh tokens.
- Claiming the ChatGPT or Claude web login is a general third-party OAuth API credential.
- Running privileged agent shells with auto-approval.
- Exposing the local MCP server to the internet.
