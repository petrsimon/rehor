#!/usr/bin/env python3
"""Post Phase 1 intake questions on the onboarding epic.

Usage:
    python3 post_intake.py '<json_config>'
"""

import json
import os
import sys

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))
from jira_mcp import jira_cleanup
from onboarding_helpers import apply_label, post_comment

LABEL = "onboarding:requirements-gathering"

COMMENT = """\
## [Phase 1/3] Instance Setup — Getting Started

Welcome! I'll be helping you set up your Rehor bot instance. This is a 3-phase process:

1. **Instance Setup** (we're here) — configure and scaffold your bot repo
2. **Konflux CI/CD** — register with Konflux and build your container image
3. **Deployment** — deploy via app-interface and verify

To get started, I need some details about your instance:

### Required
- [ ] **Instance name** — pick something memorable! This becomes your repo name \
(`<name>-agent-dev`), bot label, and identity. Examples: *phoenix*, *herald*, \
*ziggy*, *arclight*. Doesn't have to be your team name.
- [ ] **Team name** — your team's display name (for docs and Jira comments)
- [ ] **Target repo URL(s)** — the repo(s) your bot will work on (GitHub and/or GitLab)
- [ ] **Jira project key** — the project your bot will pick up tickets from

### Optional (defaults applied if not specified)
- [ ] Workflow type — default: `jira-sprint` (also available: `jira-kanban`)
- [ ] KEDA schedule — default: weekdays 9am–6pm ET
- [ ] Board name / sprint prefix — only if using sprint workflow
- [ ] Board ID / Jira project key — only if using kanban workflow
- [ ] Custom fork accounts — if your team uses different fork accounts than \
the defaults (`platex-rehor-bot` for GitHub, `platform-experience-services-bot` for GitLab)
- [ ] Dedicated proxy — if your team can't use the shared bot accounts and needs \
separate Jira/GitHub/GitLab credentials (triggers extra setup: dedicated proxy \
deployment + GCP Vertex project request)

Please provide these details and I'll put together an onboarding plan for your approval.
"""


def main():
    if len(sys.argv) < 2:
        print("Usage: post_intake.py '<json_config>'", file=sys.stderr)
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
        ok = post_comment(epic_key, COMMENT)
        if not ok:
            sys.exit(1)

        apply_label(epic_key, LABEL)

        print(json.dumps({"epic_key": epic_key, "label": LABEL, "posted": True}))
    finally:
        jira_cleanup()


if __name__ == "__main__":
    main()
