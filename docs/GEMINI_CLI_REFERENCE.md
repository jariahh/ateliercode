# Gemini CLI Reference for AtelierCode

This document provides a comprehensive reference for integrating Gemini CLI into AtelierCode's plugin system.

## Headless Mode Overview

Headless mode enables non-interactive programmatic use of Gemini CLI, ideal for:
- Scripting and automation
- CI/CD pipelines
- AI-powered tool development (like AtelierCode)
- Background processing without interactive UI

## Command Syntax

### Basic Headless Invocation
```bash
# IMPORTANT: Use --prompt or -p flag for headless mode
gemini --prompt "Your query here"
gemini -p "Your query here"

# NOT: gemini "Your query here" (this won't work in headless mode!)
```

### Stdin Input
```bash
echo "Explain this code" | gemini
cat README.md | gemini --prompt "Summarize this documentation"
```

## Command-Line Flags

| Flag | Short | Purpose | Example |
|------|-------|---------|---------|
| `--prompt` | `-p` | **Required for headless mode** | `gemini -p "query"` |
| `--output-format` | N/A | Output format (text, json, stream-json) | `--output-format json` |
| `--model` | `-m` | Select Gemini model | `-m gemini-2.5-flash` |
| `--debug` | `-d` | Enable debug output | `--debug` |
| `--include-directories` | N/A | Include additional directories | `--include-directories src,docs` |
| `--yolo` | `-y` | Auto-approve all actions (skip confirmations) | `--yolo` |
| `--approval-mode` | N/A | Set approval behavior | `--approval-mode auto_edit` |

## Output Formats

### 1. Text Output (Default)
Standard human-readable output returned directly to stdout.

```bash
gemini -p "What is the capital of France?"
# Returns: The capital of France is Paris.
```

**Best for:** Simple queries, human-readable responses, basic integration.

### 2. JSON Output
Structured data including response, statistics, and metadata for programmatic processing.

```bash
gemini -p "What is the capital of France?" --output-format json
```

**Response Schema:**
```json
{
  "response": "The capital of France is Paris.",
  "stats": {
    "models": {
      "gemini-2.5-pro": {
        "api": {"totalRequests": 2, "totalErrors": 0},
        "tokens": {"prompt": 24939, "candidates": 20, "total": 25113}
      }
    },
    "tools": {
      "totalCalls": 1,
      "totalSuccess": 1,
      "totalDurationMs": 1881
    },
    "files": {
      "modified": 0
    }
  },
  "error": null
}
```

**Best for:** Programmatic parsing, usage tracking, error handling.

### 3. Streaming JSON Output (JSONL)
Newline-delimited JSON with real-time events as they occur.

```bash
gemini --output-format stream-json --prompt "Analyze this code"
```

**Event Types:**

| Event Type | Description | Fields |
|------------|-------------|--------|
| `init` | Session start | `session_id`, `model`, `timestamp` |
| `message` | User prompts and assistant responses | `role`, `content`, `timestamp` |
| `tool_use` | Tool call requests | `tool_name`, `tool_id`, `parameters` |
| `tool_result` | Tool execution results | `tool_id`, `status`, `output` |
| `error` | Non-fatal errors/warnings | `message`, `code` |
| `result` | Final session outcome | `status`, `stats` |

**Sample Event Stream:**
```jsonl
{"type":"init","timestamp":"2025-10-10T12:00:00.000Z","session_id":"abc123","model":"gemini-2.0-flash-exp"}
{"type":"message","role":"user","content":"List files","timestamp":"2025-10-10T12:00:01.000Z"}
{"type":"tool_use","tool_name":"Bash","tool_id":"bash-123","parameters":{"command":"ls -la"}}
{"type":"tool_result","tool_id":"bash-123","status":"success","output":"file1.txt\nfile2.txt"}
{"type":"result","status":"success","stats":{"total_tokens":250}}
```

**Best for:** Real-time UI updates, long-running operations, live streaming.

## AtelierCode Integration

### Recommended Command for AgentManager

```rust
// For simple text output (easiest to parse)
vec![
    "-p".to_string(),              // Headless mode flag
    message.to_string(),           // The user's message
    "--output-format".to_string(), // Output format flag
    "text".to_string(),            // Plain text output
    "--yolo".to_string(),          // Auto-approve actions
]

// For streaming with real-time events (best for live UI)
vec![
    "-p".to_string(),
    message.to_string(),
    "--output-format".to_string(),
    "stream-json".to_string(),
    "--yolo".to_string(),
]
```

### Session Resume Support

Unlike Claude Code which has `-r <session-id>` for resuming sessions, Gemini CLI:
- Does NOT have a built-in session resume flag
- Sessions are managed through the `~/.gemini/` directory
- For session continuity, use the same working directory

### Error Handling

When using JSON output, check the `error` field:
```json
{
  "response": null,
  "error": {
    "type": "AuthenticationError",
    "message": "Invalid API key",
    "code": 401
  }
}
```

## Examples

### Code Review
```bash
cat src/auth.py | gemini -p "Review this code for security issues"
```

### Generate Commit Messages
```bash
git diff --cached | gemini -p "Write a concise commit message" --output-format json | jq -r '.response'
```

### Batch File Analysis
```bash
for file in src/*.py; do
  cat "$file" | gemini -p "Find bugs" --output-format json > "reports/$(basename $file).json"
done
```

### Usage Tracking (with JSON output)
```bash
result=$(gemini -p "Explain the code" --output-format json)
total_tokens=$(echo "$result" | jq -r '.stats.models | to_entries | map(.value.tokens.total) | add // 0')
echo "Total tokens used: $total_tokens"
```

## Comparison: Claude Code vs Gemini CLI

| Feature | Claude Code | Gemini CLI |
|---------|-------------|------------|
| Headless flag | `-p` | `-p` or `--prompt` |
| Output format | `--output-format text` | `--output-format text/json/stream-json` |
| Auto-approve | `--dangerously-skip-permissions` | `--yolo` or `-y` |
| Session continue | `-c` | N/A (automatic) |
| Session resume | `-r <session-id>` | N/A |
| Streaming | Built into text output | `--output-format stream-json` |

## Configuration

Gemini CLI can be configured via:
- Environment variables (API keys, defaults)
- `~/.gemini/config.json` for persistent settings
- Command-line flags for per-invocation overrides

## References

- [Gemini CLI Documentation](https://geminicli.com/docs)
- [Headless Mode Guide](https://geminicli.com/docs/cli/headless/)
- [Configuration Reference](https://geminicli.com/docs/get-started/configuration)
- [Commands Reference](https://geminicli.com/docs/cli/commands)
