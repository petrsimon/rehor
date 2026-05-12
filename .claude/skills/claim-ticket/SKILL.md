---
name: claim-ticket
description: >
  Consolidates ticket claiming operations (assign, transition, add to sprint, track)
  into a single efficient operation, reducing ~10 tool calls per new-work cycle
when_to_use: >
  Invoke when claiming a new JIRA ticket. Triggers on: "claim ticket", "assign ticket",
  "pick up work", "start new ticket". Replaces manual jira_update_issue + jira_transition +
  jira_add_issues_to_sprint + task_add calls.
user-invocable: true
allowed-tools:
  - "Bash(python3 .claude/skills/claim-ticket/scripts/claim_ticket_operations.py *)"
  - Read
---

Execute the claim-ticket workflow after selecting a ticket:

```bash
python3 .claude/skills/claim-ticket/scripts/claim_ticket_operations.py RHCLOUD-12345 2>&1
```

Use `--dry-run` to preview without executing:

```bash
python3 .claude/skills/claim-ticket/scripts/claim_ticket_operations.py RHCLOUD-12345 --dry-run 2>&1
```

The script executes 8 operations in sequence:

1. **get_bot_account_id** - Retrieve bot's JIRA account ID via jira_get_user_profile
2. **get_transitions** - Get available transitions via jira_get_transitions
3. **assign_ticket** - Assign ticket via jira_update_issue
4. **transition_to_in_progress** - Move to "In Progress" via jira_transition_issue
5. **resolve_board** - Determine board from labels via jira_get_issue
6. **get_active_sprint** - Get active sprint via jira_get_sprints_from_board
7. **add_to_sprint** - Add to sprint via jira_add_issues_to_sprint
8. **task_add** - Track in memory server

All operations use **fail-fast error handling**: if any operation fails, execution stops immediately.

## Configuration

Set these environment variables:

```bash
# JIRA MCP Server (required)
export JIRA_MCP_URL=http://proxy:8090

# Memory Server (required)
export BOT_MEMORY_URL=https://memory-server.example.com

# Board Configuration (optional, has defaults)
export PLATFORM_UI_BOARD_ID=9297
export DEFAULT_BOARD_ID=8070
```

## Authentication

JIRA operations use MCP via jira_call(). No API tokens needed - the mcp-atlassian server handles authentication.

Memory server operations use direct HTTP (POST /tasks).

## Board Resolution

Determines board based on ticket labels:
- `platform-experience-ui` label → Board 9297 (Platform Experience UI)
- Otherwise → Board 8070 (default)

## Error Handling

Fail-fast approach: if any operation fails, execution stops immediately and reports the error.
