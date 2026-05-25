# Onboarding a New Bot Instance

How to add a new bot runner instance to the shared OpenShift cluster. Each instance gets its own Jira label, repo set, and personas, but shares the proxy, memory server, database, and Vault secrets deployed by the primary instance (platform-frontend-ai-dev).

For the system architecture, see [ARCHITECTURE.md](../ARCHITECTURE.md).

---

## Prerequisites

Before starting, you need:

- [ ] A GitHub repo for your instance (e.g. `RedHatInsights/my-bot-instance`)
- [ ] A Jira label for your team's tickets (e.g. `hcc-ai-myteam`)
- [ ] Access to the app-interface repo (`gitlab.cee.redhat.com/service/app-interface`)
- [ ] The primary instance (platform-frontend-ai-dev) already deployed in the target namespace — it provides the shared proxy, memory server, and secrets

---

## Step 1: Create the Runner Repo

The runner repo uses dev-bot as a git submodule. It contains only instance-specific config — no bot code.

```bash
mkdir my-bot-instance && cd my-bot-instance
git init
git submodule add https://github.com/RedHatInsights/platform-frontend-ai-dev.git dev-bot
```

Create the required files:

### `setup.sh`

Runs as root during the Docker build. Install instance-specific packages here.

```bash
#!/bin/bash
set -e

echo "my-bot-instance" > /home/botuser/app/.instance-id

# Instance-specific packages go here:
# dnf install -y --nodocs <package>
# pip3.12 install <package>
# npm install -g <package>

echo "Instance setup complete: my-bot-instance"
```

### `instance/` directory

Create your instance config. This entire directory gets COPYed into the image at `/home/botuser/app/instance/`. The bot loads it at startup via `BOT_CONFIG_PATH`.

```
instance/my-config/
└── agent/
    ├── project-repos.json    # repos this instance works on
    ├── mcp.json              # MCP server overrides (usually just Jira)
    └── personas/             # domain-specific guidelines
        ├── frontend/
        │   └── prompt.md
        └── ...
```

#### `project-repos.json`

List only the repos your instance should work on:

```json
{
  "my-frontend": {
    "url": "https://github.com/your-bot-fork/my-frontend.git",
    "upstream": "https://github.com/YourOrg/my-frontend.git"
  },
  "my-backend": {
    "url": "https://github.com/your-bot-fork/my-backend.git",
    "upstream": "https://github.com/YourOrg/my-backend.git"
  },
  "app-interface": {
    "url": "https://gitlab.cee.redhat.com/your-bot-fork/app-interface.git",
    "upstream": "https://gitlab.cee.redhat.com/service/app-interface.git",
    "host": "gitlab"
  }
}
```

- `url` — bot's fork (where it pushes branches)
- `upstream` — original repo (PR/MR target)
- `host` — set to `"gitlab"` for GitLab repos (default: GitHub)
- `readonly` — set to `true` if bot should only read, never push

#### `mcp.json`

Typically just points to the shared Jira MCP server:

```json
{
  "mcpServers": {
    "mcp-atlassian": {
      "url": "${JIRA_MCP_URL}"
    }
  }
}
```

#### Personas

Copy and adapt from `dev-bot/rehor-config/agent/personas/`. Each persona is a `prompt.md` with coding standards, test commands, and conventions for that repo type.

### `README.md`

```markdown
# my-bot-instance

Custom bot runner built on [dev-bot](https://github.com/RedHatInsights/platform-frontend-ai-dev).

## Build

\`\`\`bash
git submodule update --init --recursive
docker build -f dev-bot/Dockerfile.runner -t my-bot-instance:local .
\`\`\`

## Updating dev-bot

\`\`\`bash
cd dev-bot && git pull origin master && cd ..
git add dev-bot
git commit -m "chore: update dev-bot submodule"
\`\`\`
```

### Reference PRs

- [Bootstrap runner with dev-bot submodule](https://github.com/RedHatInsights/hcc-ui-agent-dev/pull/1) — initial repo setup
- [Add UI instance config](https://github.com/RedHatInsights/hcc-ui-agent-dev/pull/12) — project-repos.json, personas, mcp.json

---

## Step 2: Deploy Template

Create `deploy/template.yaml`. This is a **bot-only** template — it does NOT create the proxy or memory server (those come from the primary instance). To create a custom proxy instance (needed if custom secrets are required, like Vertex AI credentials or a custom bot identity), contact the maintainers.

Copy from [`hcc-ui-agent-dev/deploy/template.yaml`](https://github.com/RedHatInsights/hcc-ui-agent-dev/blob/master/deploy/template.yaml) and adjust:

- `metadata.name` — your instance name
- Default `BOT_NAME` — e.g. `devbot-myteam`
- Default `BOT_LABEL` — your Jira label
- `BOT_IMAGE` — your Quay image path

The template creates two resources:
1. **Deployment** — bot container with env vars pointing to shared infra (`devbot-proxy`, `devbot-memory-server`)
2. **NetworkPolicy** — egress restricted to proxy + memory-server + DNS only

Key environment variables (already wired in the template):
- `BOT_MEMORY_URL=http://devbot-memory-server:8080/mcp` — shared memory server
- `EXECUTOR_ADDR=devbot-proxy:9090` — shared executor (git/gh/glab/gpg)
- `HTTP_PROXY=http://devbot-proxy:3128` — shared Squid proxy
- `JIRA_MCP_URL=http://devbot-proxy:8444/mcp` — shared Jira MCP

### DNS Egress — Important

OpenShift uses custom DNS on port **5353** in the `openshift-dns` namespace, not the standard port 53. Your NetworkPolicy must allow:

```yaml
- to:
  - namespaceSelector:
      matchLabels:
        kubernetes.io/metadata.name: openshift-dns
  ports:
  - port: 5353
    protocol: UDP
  - port: 5353
    protocol: TCP
```

Using port 53 or `k8s-app: kube-dns` will cause pods to hang — they can't resolve service names.

### Reference PRs

- [Add OpenShift deploy template](https://github.com/RedHatInsights/hcc-ui-agent-dev/pull/3) — initial template
- [Fix DNS egress and parameterize bot name](https://github.com/RedHatInsights/hcc-ui-agent-dev/pull/7) — critical DNS fix
- [Add BOT_JIRA_EMAIL env var](https://github.com/RedHatInsights/hcc-ui-agent-dev/pull/13) — required for ticket assignment
- [Add sprint prefix, Slack webhook](https://github.com/RedHatInsights/hcc-ui-agent-dev/pull/14) — Slack notifications

---

## Step 3: Konflux CI/CD

Follow the Konflux onboarding guide to register your repo. Key config:

```yaml
# .tekton/my-bot-push.yaml (and pull-request.yaml)
dockerfile: dev-bot/Dockerfile.runner
path-context: .
```

Konflux auto-generates the `.tekton/` pipeline files when you onboard. The important bits:
- Dockerfile path points to `dev-bot/Dockerfile.runner` (the submodule)
- Build context is `.` (the runner repo root)
- Push builds go to your Quay prod repo
- PR builds go to `quay.io/redhat-user-workloads/...` with 5-day expiry

### Reference PRs

- [Konflux auto-registration](https://github.com/RedHatInsights/hcc-ui-agent-dev/pull/2) — auto-generated pipeline files

---

## Step 4: App-Interface Configuration

Follow the [app-interface onboarding guide](https://gitlab.cee.redhat.com/service/app-interface/-/blob/master/docs/app-sre/onboarding.md) for full details. Below is what's specific to adding a bot instance.

### Add to `deploy.yml`

Add your instance as a new `resourceTemplate` in the existing SaaS file:

```yaml
resourceTemplates:
# ... existing primary instance ...

- name: my-bot-instance
  path: /deploy/template.yaml
  url: https://github.com/YourOrg/my-bot-instance
  targets:
  - namespace:
      $ref: /services/insights/platform-frontend-ai-dev/namespaces/stage.hcmais01ue1.yml
    ref: <git-commit-sha>
    parameters:
      BOT_IMAGE_TAG: <git-commit-sha>
      BOT_IMAGE: quay.io/your-org/my-bot-instance
      BOT_NAME: devbot-myteam
      BOT_LABEL: hcc-ai-myteam
      BOT_REPLICAS: '0'                    # start disabled, enable after verification
      BOT_BOARD_NAME: 'Your Board Name'    # only used by claim-ticket for sprint assignment
      BOT_SPRINT_PREFIX: 'Your Sprint'     # only used by claim-ticket for sprint assignment
      BOT_INCLUDE_BACKLOG: 'true'
      BOT_INSTANCE_ID: 'Your Bot Name'     # human-readable, used in memory server
      GCP_PROJECT_ID: your-gcp-project
      GCP_REGION: global
      VERTEX_ALLOWED_MODELS: claude-sonnet-4-6,claude-opus-4-6,claude-haiku-4-5
      BOT_CONFIG_REPO: https://github.com/YourOrg/my-bot-instance.git
      BOT_CONFIG_PATH: instance/my-config
      SLACK_WEBHOOK_URL: 'https://hooks.slack.com/...'
```

### Add image pattern

Add your Quay image to the `imagePatterns` list in `deploy.yml`:

```yaml
imagePatterns:
- quay.io/your-org/my-bot-instance
```

### Add to `app.yml`

Register your repo as a code component:

```yaml
codeComponents:
- name: my-bot-instance
  url: https://github.com/YourOrg/my-bot-instance
  resource: upstream
```

### Namespace

Your instance deploys to the **same namespace** as the primary instance — that's how it accesses the shared proxy, memory server, and secrets. No new namespace needed.

### Vault Secrets

The bot uses the **shared** `devbot-secrets` Vault secret (deployed by the primary instance). All bot instances share the same GitHub/GitLab/Jira credentials. No new Vault config needed unless you need instance-specific credentials.

### Reference: Existing app-interface config

The platform-frontend-ai-dev app-interface directory (`data/services/insights/platform-frontend-ai-dev/`) contains:

| File | Purpose |
|------|---------|
| `app.yml` | App metadata, code components, service owners |
| `deploy.yml` | SaaS file — image patterns, resource templates, parameters |
| `namespaces/stage.hcmais01ue1.yml` | Namespace config, Vault secret ref, RDS definition |
| `pipelines/tekton-*.yml` | Tekton pipeline provider |
| `roles/` | RBAC roles for namespace access |

---

## Step 5: Jira Setup

1. **Create your label** (e.g. `hcc-ai-myteam`) in the Jira project
2. **Label tickets** the bot should pick up with your label + `repo:<name>` labels
3. **Board name** (optional) — only used by `claim-ticket` to add tickets to the active sprint. The ticket query itself is label-only.

`repo:` labels support both bare names (`repo:my-frontend`) and org-prefixed (`repo:YourOrg/my-frontend`). Both resolve against `project-repos.json`.

---

## Step 6: Bot Fork Repos

For each repo in `project-repos.json`, the bot needs a fork to push branches to:

**GitHub repos:**
- Create forks under a bot GitHub user/org
- The bot pushes to the fork and opens PRs against the upstream

**GitLab repos:**
- Create forks under a bot GitLab user/group
- The bot pushes to the fork and opens MRs against the upstream

The shared `devbot-secrets` Vault secret provides GitHub (`gh-bot-cli-token`) and GitLab (`gl-bot-cli-token`) PATs. These tokens must have push access to your fork repos.

---

## Verification

After deploying, verify in order:

1. **Pod starts**: `oc get pods -l app.kubernetes.io/name=devbot-myteam`
2. **DNS works**: `oc exec <pod> -- nslookup devbot-proxy` — should resolve
3. **Memory server reachable**: `oc exec <pod> -- curl -s http://devbot-memory-server:8080/health`
4. **Executor reachable**: check logs for "Connected to executor at devbot-proxy:9090"
5. **Config loaded**: check logs for remote config sync from `BOT_CONFIG_REPO`
6. **Scale up**: set `BOT_REPLICAS: '1'` in deploy.yml, bump ref

---

## Parameter Reference

| Parameter | Required | Description |
|-----------|----------|-------------|
| `BOT_IMAGE` | yes | Quay image path |
| `BOT_IMAGE_TAG` | yes | Git SHA for image tag |
| `BOT_NAME` | yes | Deployment name (e.g. `devbot-myteam`) |
| `BOT_LABEL` | yes | Jira label to filter tickets |
| `BOT_REPLICAS` | yes | Number of replicas (`'0'` to disable) |
| `BOT_INSTANCE_ID` | yes | Human-readable name for memory server |
| `BOT_CONFIG_REPO` | yes | Git URL for remote config repo |
| `BOT_CONFIG_PATH` | yes | Path within config repo to `agent/` dir |
| `GCP_PROJECT_ID` | yes | GCP project for Vertex AI |
| `GCP_REGION` | yes | GCP region (usually `global`) |
| `VERTEX_ALLOWED_MODELS` | yes | Comma-separated model allowlist |
| `BOT_BOARD_NAME` | no | Jira board name (for sprint assignment only) |
| `BOT_SPRINT_PREFIX` | no | Sprint name prefix filter (for sprint assignment only) |
| `BOT_INCLUDE_BACKLOG` | no | `'true'` to include backlog tickets |
| `SLACK_WEBHOOK_URL` | no | Slack webhook for notifications |

---

## Gotchas

### DNS port is 5353, not 53
OpenShift uses a custom DNS server in the `openshift-dns` namespace on port 5353. Standard port 53 or `kube-dns` selectors won't work. Symptom: pods hang forever waiting for network connections.

### GPG signing doesn't work for GitLab
Commits pushed to GitLab via the proxy are unsigned. GitHub commits are signed. This is a known limitation — GitLab requires a different GPG verification flow. A fix is in progress.

### Submodule updates
When dev-bot merges new features, Konflux opens automated PRs to update the submodule in your runner repo. You can also update manually if you don't want to wait for the automation:
```bash
cd dev-bot && git pull origin master && cd ..
git add dev-bot && git commit -m "chore: update dev-bot submodule"
```
Then bump the ref in app-interface after the image builds.

### Merge order matters
When changes span multiple repos, merge in this order:
1. **app-interface** (config/params) — first, so the cluster config is ready
2. **dev-bot** (core changes) — second
3. **runner instance** (submodule bump) — last, after dev-bot merges

### Shared Jira identity
All bot instances share the same Jira credentials (`devbot-secrets/jira-email`). The bot cannot filter comments by author — it identifies its own comments by content patterns (structured reports, PR links, tables), not by username.

### `BOT_BOARD_NAME` is fragile
If someone renames the Jira board, `claim-ticket` breaks. Consider using `BOT_BOARD_ID` (stable numeric ID) instead. The ticket query (`new-work`) doesn't use the board at all — it's label-only with `sprint in openSprints()`.

### Memory server is shared
All bot instances share one memory server. Task isolation is via `instance_id` — always pass it in task tool calls. Memories (learnings) are shared across instances, which is intentional.
