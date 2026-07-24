#!/usr/bin/env python3
"""Post final manual steps checklist.

Usage:
    python3 post_manual_steps.py '<json_config>'
"""

import json
import os
import sys

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))
from jira_mcp import jira_cleanup
from onboarding_helpers import apply_label, post_comment

LABEL = "onboarding:manual-steps"


def _build_comment(config):
    bot_label = config.get("bot_label", "<bot_label>")

    return f"""\
## [Phase 3/3] Deployment — Final Steps

The deployment MR is merged. Almost there! A few manual steps remain:

- [ ] **Verify deployment** — confirm the pod is running in the `hcmais` cluster
- [ ] **Create Jira label** — first ticket with label `{bot_label}` creates it implicitly, or create manually
- [ ] **Credentials** — if your team needs different Jira/GitHub/GitLab credentials \
than the shared bot accounts, coordinate with the Rehor team. \
This requires a dedicated proxy deployment.

Please reply "done" for each step as you complete it, or ask questions if stuck.
"""


def main():
    if len(sys.argv) < 2:
        print("Usage: post_manual_steps.py '<json_config>'", file=sys.stderr)
        sys.exit(1)

    try:
        config = json.loads(sys.argv[1])
    except json.JSONDecodeError as e:
        print(f"ERROR: Invalid JSON: {e}", file=sys.stderr)
        sys.exit(1)

    epic_key = config.get("epic_key")
    if not epic_key:
        print("ERROR: epic_key is required", file=sys.stderr)
        sys.exit(1)

    try:
        comment = _build_comment(config)
        ok = post_comment(epic_key, comment)
        if not ok:
            sys.exit(1)

        apply_label(epic_key, LABEL)

        print(json.dumps({"epic_key": epic_key, "label": LABEL, "posted": True}))
    finally:
        jira_cleanup()


if __name__ == "__main__":
    main()
