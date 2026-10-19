---
name: review-loop
description: Do the task, then run an iterative review loop with fresh reviewer subagents until clean.
disable-model-invocation: true
---

Task: $ARGUMENTS

1. Implement the task above as usual. If the task is only to review existing code, skip to step 2.
2. Spawn the `reviewer` subagent (Agent tool, subagent_type: reviewer). Tell it what the task was, so it checks both bugs and whether the result matches the task.
3. Verify each blocker/major finding against the code: fix real ones, note false positives.
4. Spawn a NEW reviewer (fresh context), passing the rejected false positives so it doesn't repeat them. Repeat.
5. Stop on `CLEAN` or after 4 rounds. Report: what was done, rounds count, what was fixed/rejected, remaining minor notes.
