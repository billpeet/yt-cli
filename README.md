# yt-cli

A YouTrack CLI tool designed for AI agent use and developer workflows. Outputs JSON by default, accepts all input via flags (no interactive prompts), and has no native binary dependencies.

## Installation

```bash
npm install -g yt-cli
```

Or run locally without installing:

```bash
npm run build
node bin/yt.js --help
```

## Setup

Authenticate against your YouTrack instance:

```bash
yt setup --url https://yourcompany.youtrack.cloud --token perm:yourtoken
```

This validates the connection by calling `/api/users/me`, then saves credentials to `~/.config/yt-cli/config.json`.

## Environment Variables

Override or replace the config file at any time:

| Variable | Description |
|---|---|
| `YOUTRACK_BASE_URL` | YouTrack base URL |
| `YOUTRACK_TOKEN` | YouTrack permanent API token |

Environment variables take priority over the config file.

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
```

Note: `--project` accepts the project short name (e.g. `FOO`) or the internal project ID.

### `yt issue update <id>`

```bash
yt issue update FOO-123 --summary "Updated title"
yt issue update FOO-123 --description "New description"
yt issue update FOO-123 --field "State=In Progress" --field "Priority=High"
```

`--field` can be repeated for multiple custom fields. Format: `FieldName=Value`.

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
