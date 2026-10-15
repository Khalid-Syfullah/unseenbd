---
name: build-unseenbd
description: Build the Unseen BD site phase by phase from prompts/NN-*.md. Runs each phase with its assigned model, checks it, commits and pushes, then moves to the next. Can redo any phase by number. Use for /build-unseenbd, "build the next phase", "redo phase 7", "rebuild from phase 9", "build status".
---

# Build Unseen BD

The build is split into numbered phases in `prompts/` (`01-foundation.md` … `18-release.md`). `prompts/models.conf` says which model builds each phase. Progress lives in `.build/` (`NN-name.done` markers and `log.md`), so it survives restarts and shows up in git.

All bookkeeping goes through one script. Always call it from the repo root:

```bash
bash .claude/skills/build-unseenbd/scripts/phase.sh <command>
```

## Modes

Read the text the user typed after `/build-unseenbd` and pick the mode:

| User types | What you do |
|---|---|
| *(nothing)* or `all` | Run every unfinished phase in order, one at a time, until all are done or one fails |
| `next` | Run the first unfinished phase, then stop |
| `status` | Run `phase.sh status`, show its output, run nothing |
| `7` or `only 7` | Run phase 7 now, even if earlier phases are unfinished. If 7 is already done, say so and suggest `redo 7` |
| `redo 7` | Rebuild phase 7 only: `phase.sh redo 7`, run it as a **redo**, commit, push, stop |
| `redo 7 9 12` | `phase.sh redo 7 9 12`, then run 7, 9 and 12 in that order as redos, then stop |
| `from 7` | `phase.sh from 7`, then run 7 and every phase after it in order (each as a redo if it was built before) |
| `reset 7` | `phase.sh reset 7` only; run nothing |

Phase numbers may be written `7` or `07`. If the arguments don't match a mode, show the table and run nothing.

## Running one phase N

1. **Prepare.** `phase.sh info N` prints `NN <tab> prompts/NN-name.md <tab> model`. Then `phase.sh start N`. Tell the user in one line: `▶ Phase NN of 18 — <title> (<model>)`.
2. **Build with a subagent.** Launch the Agent tool with `subagent_type: "general-purpose"`, `model: <model from info>`, in the foreground (not background), and this prompt (fill in the brackets):

   > You are the builder for phase [NN] of the Unseen BD build in the repository at [repo root]. Read `[prompts/NN-name.md]` and do everything it asks, completely and carefully. [If this is a redo: This phase was built before and is being redone. Read the existing code first, then change it so it fully meets the prompt. Keep everything that later phases built working.]
   >
   > Rules: work only inside this repository. Do not edit `prompts/`, `assets/`, `tools/`, `.build/` or `.claude/`, and do not edit `data/` except where the prompt says so. Do not commit or push; the coordinator does that. Before you finish, run `bash .claude/skills/build-unseenbd/scripts/phase.sh check` and fix every failure until it passes. Then reply with: what you built (5–10 bullets), the main files you changed, and anything you could not finish and why.

   A phase counts as a **redo** when the user asked for `redo` or `from`, or when it had a start marker from an interrupted run (status shows `▶`), because partial code may already exist.
3. **Check.** When the builder returns, run `phase.sh check N` yourself. If it fails, send the last 80 lines of the failure to the **same** builder with SendMessage ("The check failed — fix it and run the check again") and check again. At most 2 fix rounds. If it still fails, **stop the whole run**: report the failure, leave the phase unfinished, and do not commit.
4. **Commit and push.** `phase.sh done N`. It commits everything with the phase's message from the prompt's `## Commit` section and pushes the current branch.
   - Exit 4 means the commit worked but the push failed: tell the user the exact `git push` command it printed, and stop.
   - Any other failure: report it and stop.
5. **Report** one line: `✓ Phase NN — <title> (<model>) · <short sha> · pushed`, plus the builder's "could not finish" items if any.

Then continue with the next phase if the mode runs several.

## Rules for the coordinator (you)

- You only coordinate. Don't write app code yourself; the builders do. This keeps your context small for long runs.
- One phase at a time, never in parallel: later phases build on earlier ones.
- Never skip the check, never edit a prompt unless the user asks, never force-push or rewrite history.
- If the user interrupts or a usage limit stops you, the next `/build-unseenbd` resumes at the first unfinished phase.
- At the end of a multi-phase run, show `phase.sh status`.

## Autonomous run

For a hands-off run in Claude Code:

```
/goal Use the build-unseenbd skill to finish every phase. Done when `bash .claude/skills/build-unseenbd/scripts/phase.sh status` prints ALL PHASES COMPLETE. Or stop after 80 turns.
```
