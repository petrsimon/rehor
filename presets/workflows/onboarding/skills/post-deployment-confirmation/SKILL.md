---
name: post-deployment-confirmation
description: >
  Post Phase 3 deployment value confirmation on the epic.
  Does not apply a label — bot applies onboarding:app-interface-mr separately after team confirms and MR is opened.
when_to_use: >
  Invoke when Phase 2 is complete and Tekton setup is confirmed.
  Posts the derived values for team confirmation before opening the MR.
user-invocable: true
allowed-tools:
  - "Bash(python3 .claude/skills/post-deployment-confirmation/post_deployment_confirmation.py *)"
  - Read
---

```bash
python3 .claude/skills/post-deployment-confirmation/post_deployment_confirmation.py '<json_config>' 2>&1
```

## Config JSON

```json
{
  "epic_key": "RHCLOUD-12345",
  "quay_org": "my-team-tenant",
  "instance_name": "my-team-agent-dev",
  "instance_repo_url": "https://github.com/RedHatInsights/my-team-agent-dev",
  "config_name": "my-team-config",
  "pattern": "shared"
}
```
