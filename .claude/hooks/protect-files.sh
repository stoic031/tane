#!/bin/bash
# PreToolUse hook (Edit|Write): block edits to generated files, lock files and private data.
# Reads the tool call as JSON on stdin. Exit 2 = block, message goes back to Claude.
# Uses only bash and sed, so it works before the Nix shell is loaded.

INPUT=$(cat)
FILE_PATH=$(printf '%s' "$INPUT" | sed -n 's/.*"file_path"[[:space:]]*:[[:space:]]*"\([^"]*\)".*/\1/p' | head -n 1)

[ -z "$FILE_PATH" ] && exit 0

case "$FILE_PATH" in
  */main.js|main.js)
    echo "Blocked: main.js is build output. Edit src/ and run npm run build." >&2; exit 2 ;;
  */package-lock.json|package-lock.json|*/flake.lock|flake.lock)
    echo "Blocked: lock files change only through npm install / nix flake update." >&2; exit 2 ;;
  */.envrc.local|.envrc.local)
    echo "Blocked: .envrc.local holds personal machine settings. Ask the owner to edit it." >&2; exit 2 ;;
  */private/*)
    echo "Blocked: private/ may hold real data and is off limits." >&2; exit 2 ;;
esac

exit 0
