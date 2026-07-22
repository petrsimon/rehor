#!/usr/bin/env python3
"""Post Phase 3 deployment value confirmation.

Usage:
    python3 post_deployment_confirmation.py '<json_config>'
"""

import json
import os
import sys

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))
from jira_mcp import jira_cleanup
from onboarding_helpers import post_comment


def _build_comment(config):
    quay_org = config.get("quay_org", "<quay_org>")
    instance_name = config.get("instance_name", "<instance_name>")
    repo_url = config.get("instance_repo_url", "<instance_repo_url>")
    config_name = config.get("config_name", "<config_name>")
    pattern = config.get("pattern", "shared")

    return f"""\
## [Phase 3/3] Deployment — Confirming Details

Phase 2 is complete! Final phase — deploying your bot.

Confirming these values for the app-interface MR:
- **Quay image**: `quay.io/redhat-services-prod/{quay_org}/{instance_name}`
- **Config repo**: `{repo_url}`
- **Config path**: `instance/{config_name}`
- **SaaS pattern**: {pattern}

Any corrections? If not, reply "looks good" and I'll open the deployment MR.
"""


def main():
    if len(sys.argv) < 2:
        print("Usage: post_deployment_confirmation.py '<json_config>'", file=sys.stderr)
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

        print(json.dumps({"epic_key": epic_key, "posted": True}))
    finally:
        jira_cleanup()


if __name__ == "__main__":
    main()
