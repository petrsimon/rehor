# Auto-Fork Skill

Automatically fork repos and update configuration. Detects repos in `project-repos.json` without forks, creates forks under bot's GitHub or GitLab account, and updates the config file with the new fork URLs.

## Features

- Scans `project-repos.json` for repos needing forks
- Creates forks using `gh repo fork` (GitHub) or `glab repo fork` (GitLab)
- Updates config file with fork URLs
- Commits changes to new branch

## Usage

### Basic Workflow

```bash
# Step 1: Fork repos and commit changes
python3 auto_fork.py

# Step 2: Push and create PR (use push-and-pr skill)
# The script creates branch bot/auto-fork (or bot/auto-fork-{instance_id})
```

### Dry Run

```bash
python3 auto_fork.py --dry-run
```

## Configuration

### Required Environment Variables

- `GH_USER_NAME` — bot GitHub username (validated against GitHub username rules)
- `GL_USER_NAME` — bot GitLab username

### Auto-Discovered Values

The skill automatically discovers the following without requiring environment variables:

- **Config directory**: Scans `data/remote-config/*/agent/project-repos.json` (bot runtime) or `<config-name>/agent/project-repos.json` (local dev)
- **Instance ID**: Extracted from config directory name
  - Pattern: `rehor-config-instance1` → instance ID = `instance1`
  - Used for branch naming: `bot/auto-fork-{instance_id}`
  - Empty if no instance suffix in config name

## Development

### Install Dependencies

```bash
uv sync
```

### Run Tests

```bash
# All tests
uv run pytest -v

# With coverage
uv run pytest --cov=. --cov-report=html -v

# Specific test file
uv run pytest tests/test_operations.py -v
```

### Lint

```bash
uv run ruff check .
```

## How It Works

1. **detect_unforkable_repos** - Scans `project-repos.json`:
   - Identifies repos with `upstream` field
   - Checks if `url` matches bot account (`GH_USER_NAME` for GitHub, `GL_USER_NAME` for GitLab)
   - Skips repos already forked

2. **fork_repos** - Creates forks:
   - GitHub: Uses `gh repo fork --clone=false`
   - GitLab: Uses `glab repo fork --clone=false --hostname gitlab.cee.redhat.com`
   - Handles already-forked repos gracefully
   - Generates fork URLs with bot username

3. **update_and_commit** - Updates config:
   - Updates `url` field in `project-repos.json`
   - Preserves all other repo entries
   - Creates branch `bot/auto-fork` or `bot/auto-fork-{instance_id}`
   - Commits changes with detailed message

After completion, use the `push-and-pr` skill to push and create a PR.

## Testing

The skill includes comprehensive unit and integration tests:

- **Unit tests** (`test_operations.py`): Test individual operations in isolation
- **Integration tests** (`test_integration.py`): Test complete workflows end-to-end
- **Test coverage**: All major code paths and error conditions

CI runs tests automatically on push/PR via GitHub Actions.
