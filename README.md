# yt-cli

A YouTrack CLI tool designed for AI agent use and developer workflows. Outputs JSON by default, accepts all input via flags (no interactive prompts), and has no native binary dependencies.

## Installation

Requires [Node.js](https://nodejs.org/) 18 or newer.

### Install the CLI

```bash
npm install -g @billpeet/yt-cli
```

Confirm that the executable is available:

```bash
yt --help
```

To install from a clone of this repository instead:

```bash
npm install
npm run build
npm link
yt --help
```

## Setup

1. In YouTrack, open your avatar menu, select **Profile**, then **Account Security**.
2. Under **Tokens**, create a permanent token and copy it. Treat the token like a password.
3. Authenticate the CLI against your YouTrack instance:

```bash
yt setup --url https://yourcompany.youtrack.cloud --token perm:yourtoken
```

This validates the connection by calling `/api/users/me`, then saves credentials to `~/.config/yt-cli/config.json`.

Verify the setup:

```bash
yt user me --pretty
```

## Environment Variables

Override or replace the config file at any time:

| Variable | Description |
|---|---|
| `YOUTRACK_BASE_URL` | YouTrack base URL |
| `YOUTRACK_TOKEN` | YouTrack permanent API token |

Environment variables take priority over the config file.

For macOS or Linux:

```bash
export YOUTRACK_BASE_URL="https://yourcompany.youtrack.cloud"
export YOUTRACK_TOKEN="perm:yourtoken"
```

For PowerShell:

```powershell
$env:YOUTRACK_BASE_URL = "https://yourcompany.youtrack.cloud"
$env:YOUTRACK_TOKEN = "perm:yourtoken"
```

Set these in your shell profile or secret manager if they need to persist. Do not commit tokens or the generated config file.

## Install the Agent Skill

This repository includes the `youtrack` agent skill at [`skills/youtrack`](skills/youtrack/). The skill teaches supported coding agents when and how to use the `yt` CLI. Install and configure the CLI first; the skill does not include the CLI or your YouTrack credentials.

The recommended installer is the [skills.sh CLI](https://skills.sh/docs/cli), which can be run with `npx` without a separate global installation.

### Install from GitHub

Interactively choose the target agent and installation scope:

```bash
npx skills add billpeet/yt-cli --skill youtrack
```

Install globally for a specific agent:

```bash
# Codex
npx skills add billpeet/yt-cli --skill youtrack --agent codex --global --yes

# Claude Code
npx skills add billpeet/yt-cli --skill youtrack --agent claude-code --global --yes
```

Omit `--global` to install only for the current project. Omit `--yes` to review the installer prompts. To inspect what the repository exposes before installing:

```bash
npx skills add billpeet/yt-cli --list
```

### Install from a local clone

From the repository root:

```bash
npx skills add . --skill youtrack
```

For a non-interactive global Codex installation:

```bash
npx skills add . --skill youtrack --agent codex --global --yes
```

Restart or open a new agent session after installation so the agent discovers the skill. You can then ask it to perform tasks such as “find my unresolved YouTrack issues” or “create a YouTrack ticket.”

To refresh an installed skill after this repository changes:

```bash
npx skills update youtrack
```

## Commands

### `yt setup`

```bash
yt setup --url <url> --token <token>
```

### `yt issue search <query>`

Search issues using [YouTrack query syntax](https://www.jetbrains.com/help/youtrack/server/search-and-filter-issues.html).

```bash
yt issue search "project: FOO #Unresolved"
yt issue search "assignee: me #Unresolved" --top 10
yt issue search "project: FOO" --fields "id,idReadable,summary"
```

Options:
- `--top <n>` — Max results (default: 50)
- `--skip <n>` — Offset for pagination (default: 0)
- `--fields <fields>` — Comma-separated field list
- `--format text` — Human-readable output
- `--pretty` — Pretty-print JSON

### `yt issue get <id>`

```bash
yt issue get FOO-123
yt issue get FOO-123 --fields "id,idReadable,summary,description"
```

### `yt issue create`

```bash
yt issue create --project FOO --summary "Bug: login fails on Safari"
yt issue create --project FOO --summary "Feature request" --description "Details here"
yt issue create --project FOO --summary "Feature request" --description "Line 1\n\nLine 2"
yt issue create --project FOO --summary "Feature request" --agile "Continuous Improvement" --parent FOO-123
```

Note: `--project` accepts the project short name (e.g. `FOO`) or the internal project ID.

Multiline `--description` and `issue comment --text` values may be passed either with literal newlines supported by your shell, or with escaped newline sequences (`\n`). The CLI converts `\n` to real newlines before sending text to YouTrack.

### `yt issue update <id>`

```bash
yt issue update FOO-123 --summary "Updated title"
yt issue update FOO-123 --description "New description"
yt issue update FOO-123 --description "Line 1\n\nLine 2"
yt issue update FOO-123 --field "State=In Progress" --field "Priority=High"
yt issue update FOO-123 --agile "Continuous Improvement" --parent FOO-123
```

`--field` can be repeated for multiple custom fields. Format: `FieldName=Value`.

### `yt agile list`

```bash
yt agile list
yt agile list --format json --pretty
```

### `yt issue comments <id>`

```bash
yt issue comments FOO-123
```

### `yt issue comment <id>`

```bash
yt issue comment FOO-123 --text "This is fixed in v2.1"
```

### `yt project list`

```bash
yt project list
yt project list --fields "id,shortName,name,description"
```

### `yt user me`

```bash
yt user me
```

## Output Formats

### JSON (default)

All commands output raw JSON to stdout. Errors go to stderr as `{"error": "..."}`.

```bash
# Pipe into jq for filtering
yt issue search "project: FOO" | jq '.[].idReadable'

# Get just the summary of one issue
yt issue get FOO-123 | jq '.summary'
```

### Pretty JSON

```bash
yt issue get FOO-123 --pretty
```

### Human-readable text

```bash
yt issue search "project: FOO" --format text
yt project list --format text
yt user me --format text
```

## Exit Codes

| Code | Meaning |
|---|---|
| `0` | Success |
| `1` | Error (API failure, missing config, invalid input) |

## Usage with AI Agents (Claude Code)

`yt-cli` is designed to be called directly by AI agents like Claude Code. JSON output with no interactive prompts makes it easy to parse and chain:

```bash
# Find unresolved issues assigned to me
yt issue search "assignee: me #Unresolved" --top 5

# Get full details of a specific issue
yt issue get PROJ-42

# Create an issue and capture the new ID
NEW=$(yt issue create --project PROJ --summary "Auto-created issue" | jq -r '.idReadable')
echo "Created $NEW"

# Add a comment
yt issue comment "$NEW" --text "Investigated and confirmed."
```

## Development

```bash
# Run from source (no build step)
npm run dev -- issue search "project: FOO"

# Build TypeScript
npm run build

# Run built binary
node bin/yt.js --help
```

Config is stored at `~/.config/yt-cli/config.json`.
