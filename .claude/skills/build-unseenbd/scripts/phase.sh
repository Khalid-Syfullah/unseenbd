#!/usr/bin/env bash
# Phase runner for the Unseen BD build. Works with macOS bash 3.2.
#
#   phase.sh status              list every phase with its state and model
#   phase.sh next                print "NN<TAB>file<TAB>model" for the first unfinished phase (exit 3 when all done)
#   phase.sh info N              same line for phase N
#   phase.sh start N             mark phase N as started
#   phase.sh check [N]           run the quality gate (web/: npm run check); with N, record that N passed
#   phase.sh done N              commit phase N (needs a passing check) and push
#   phase.sh reset N [M ...]     mark phases as not done (they will run again)
#   phase.sh redo N [M ...]      reset the phases, then print the first one to run
#   phase.sh from N              reset N and every phase after it
#   phase.sh commit-message N    print the commit message for phase N
#
# Env: NO_PUSH=1 to skip pushing, REMOTE (default origin).
set -euo pipefail

ROOT="$(git rev-parse --show-toplevel 2>/dev/null || pwd)"
PROMPTS="$ROOT/prompts"
STATE="$ROOT/.build"
REMOTE="${REMOTE:-origin}"
mkdir -p "$STATE"

die() { echo "phase.sh: $*" >&2; exit 1; }

phases() { ls "$PROMPTS" | grep -E '^[0-9]{2}-.*\.md$' | sort; }
total() { phases | wc -l | tr -d ' '; }

pad() { # 7 -> 07
  case "$1" in
    ''|*[!0-9]*) die "not a phase number: $1" ;;
  esac
  printf '%02d' "$((10#$1))"
}

file_of() { # N -> prompts/NN-name.md
  local n; n="$(pad "$1")"
  local f; f="$(phases | grep -E "^$n-" | head -1 || true)"
  [ -n "$f" ] || die "no prompt for phase $n in prompts/"
  echo "$f"
}
name_of() { basename "$(file_of "$1")" .md; }

model_of() {
  local n; n="$(pad "$1")"
  local conf="$PROMPTS/models.conf" m="" def="sonnet"
  if [ -f "$conf" ]; then
    def="$(awk '$1=="default"{print $2}' "$conf" | tail -1)"; def="${def:-sonnet}"
    m="$(awk -v n="$n" '$1==n{print $2}' "$conf" | tail -1)"
  fi
  echo "${m:-$def}"
}

title_of() { head -1 "$PROMPTS/$(file_of "$1")" | sed -E 's/^# *Phase [0-9]+ of [0-9]+: *//; s/^# *//'; }

is_done() { [ -f "$STATE/$(name_of "$1").done" ]; }
is_started() { [ -f "$STATE/$(name_of "$1").start" ]; }

valid() { file_of "$1" >/dev/null; }  # dies in the main shell for unknown numbers

line_of() { valid "$1"; local n; n="$(pad "$1")"; printf '%s\t%s\t%s\n' "$n" "prompts/$(file_of "$n")" "$(model_of "$n")"; }

cmd_status() {
  local f n mark done_count=0 next=""
  echo "Unseen BD build — $(total) phases"
  for f in $(phases); do
    n="${f%%-*}"
    if is_done "$n"; then mark="✓"; done_count=$((done_count + 1))
    elif is_started "$n"; then mark="▶"; [ -z "$next" ] && next="$n"
    else mark=" "; [ -z "$next" ] && next="$n"; fi
    printf ' [%s] %s  %-7s %s\n' "$mark" "$n" "$(model_of "$n")" "$(title_of "$n")"
  done
  echo "Done: $done_count / $(total)"
  if [ -z "$next" ]; then echo "ALL PHASES COMPLETE"; else echo "Next: $next — $(title_of "$next") ($(model_of "$next"))"; fi
}

cmd_next() {
  local f n
  for f in $(phases); do n="${f%%-*}"; if ! is_done "$n"; then line_of "$n"; return 0; fi; done
  echo "ALL PHASES COMPLETE"; exit 3
}

cmd_start() { valid "$1"; local n; n="$(pad "$1")"; date -u +%Y-%m-%dT%H:%M:%SZ > "$STATE/$(name_of "$n").start"; echo "started $n $(title_of "$n") on $(model_of "$n")"; }

cmd_check() {
  [ -f "$ROOT/web/package.json" ] || die "web/package.json not found — the app has not been created yet (phase 01 creates it)"
  echo "== check: npm run check (web/)"
  if (cd "$ROOT/web" && npm run check); then
    if [ $# -ge 1 ]; then valid "$1"; date -u +%Y-%m-%dT%H:%M:%SZ > "$STATE/$(name_of "$1").checked"; fi
    echo "== check passed"
  else
    echo "== check FAILED"; return 1
  fi
}

commit_message() {
  local f; f="$PROMPTS/$(file_of "$1")"
  awk 'found{print} /^## Commit[[:space:]]*$/{found=1}' "$f" | sed '/^```/d' | sed -e '/./,$!d'
}

cmd_done() {
  valid "$1"; local n; n="$(pad "$1")"
  local name; name="$(name_of "$n")"
  [ -f "$STATE/$name.checked" ] || die "phase $n has no passing check — run: phase.sh check $n"
  local msg; msg="$(commit_message "$n")"
  [ -n "$msg" ] || die "prompt for phase $n has no '## Commit' section"
  printf 'model=%s\nfinished=%s\n' "$(model_of "$n")" "$(date -u +%Y-%m-%dT%H:%M:%SZ)" > "$STATE/$name.done"
  rm -f "$STATE/$name.start" "$STATE/$name.checked"
  printf -- '- %s phase %s (%s) — %s\n' "$(date -u +%Y-%m-%d)" "$n" "$(model_of "$n")" "$(title_of "$n")" >> "$STATE/log.md"
  cd "$ROOT"
  git add -A
  printf '%s\n\nPhase %s of %s, built with %s.\n' "$msg" "$n" "$(total)" "$(model_of "$n")" | git commit -q -F - || die "commit failed"
  local sha; sha="$(git rev-parse --short HEAD)"
  echo "committed phase $n as $sha"
  if [ "${NO_PUSH:-0}" = "1" ]; then echo "NO_PUSH=1 — not pushing"; return 0; fi
  if ! git remote get-url "$REMOTE" >/dev/null 2>&1; then echo "no remote '$REMOTE' — not pushing"; return 0; fi
  local branch; branch="$(git rev-parse --abbrev-ref HEAD)"
  if git push -q "$REMOTE" "HEAD:$branch" 2>/dev/null || git push -q -u "$REMOTE" "$branch"; then
    echo "pushed $branch to $REMOTE"
  else
    echo "PUSH FAILED — phase $n is committed locally ($sha); push it yourself with: git push $REMOTE $branch" >&2
    exit 4
  fi
}

cmd_reset() {
  local a n name
  [ $# -ge 1 ] || die "reset needs a phase number (or 'all')"
  if [ "$1" = "all" ]; then rm -f "$STATE"/*.done "$STATE"/*.start "$STATE"/*.checked; echo "reset all phases"; return 0; fi
  for a in "$@"; do valid "$a"; done
  for a in "$@"; do
    n="$(pad "$a")"; name="$(name_of "$n")"
    rm -f "$STATE/$name.done" "$STATE/$name.start" "$STATE/$name.checked"
    echo "reset $n — $(title_of "$n")"
  done
}

cmd_redo() { [ $# -ge 1 ] || die "redo needs a phase number"; cmd_reset "$@" >/dev/null; local first; first="$(printf '%s\n' "$@" | sort -n | head -1)"; line_of "$first"; }

cmd_from() {
  [ $# -eq 1 ] || die "from needs one phase number"
  valid "$1"; local start f n; start="$(pad "$1")"
  for f in $(phases); do n="${f%%-*}"; if [ "$((10#$n))" -ge "$((10#$start))" ]; then cmd_reset "$n" >/dev/null; fi; done
  echo "reset phases $start..$(phases | tail -1 | cut -c1-2)"; line_of "$start"
}

case "${1:-status}" in
  status) cmd_status ;;
  next) cmd_next ;;
  info) [ $# -eq 2 ] || die "info N"; line_of "$2" ;;
  start) [ $# -eq 2 ] || die "start N"; cmd_start "$2" ;;
  check) shift; cmd_check "$@" ;;
  done) [ $# -eq 2 ] || die "done N"; cmd_done "$2" ;;
  reset) shift; cmd_reset "$@" ;;
  redo) shift; cmd_redo "$@" ;;
  from) shift; cmd_from "$@" ;;
  commit-message) [ $# -eq 2 ] || die "commit-message N"; valid "$2"; commit_message "$2" ;;
  model) [ $# -eq 2 ] || die "model N"; valid "$2"; model_of "$2" ;;
  *) sed -n '2,15p' "$0"; exit 2 ;;
esac
