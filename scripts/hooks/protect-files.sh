#!/usr/bin/env bash
# PreToolUse guard: blocks edits to secrets and to the research evidence base.
# Exit 2 = block; stderr is shown to Claude.
input="$(cat)"
file="$(printf '%s' "$input" | jq -r '.tool_input.file_path // empty' 2>/dev/null)"
[ -z "$file" ] && exit 0

case "$file" in
  *.env|*.env.*)
    case "$file" in
      *.env.example) exit 0 ;;
    esac
    echo "Blocked: do not edit secret files ($file). Put new variables in .env.example and ask Julius to set real values." >&2
    exit 2 ;;
  */docs/research/*)
    echo "Blocked: docs/research/ is the evidence base and changes only on explicit request. Propose the change in chat or in an ADR instead." >&2
    exit 2 ;;
esac
exit 0
