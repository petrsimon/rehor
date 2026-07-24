#!/usr/bin/env node
/**
 * Lightweight mock API server for the Rehor dashboard.
 * Runs on port 8080 — the Vite dev server proxies /api/* and /ws to it.
 * No external dependencies required (uses Node built-in http module).
 *
 * Usage:  node mock-server.mjs
 */

import http from 'node:http';
import { WebSocketServer } from 'ws';

const PORT = 8080;

// ── Mock Data ──────────────────────────────────────────────

const INSTANCES = [
  {
    instance_id: 'bot-alpha',
    state: 'working',
    message: 'Implementing RHCLOUD-46300 — adding dark mode toggle to settings page',
    external_key: 'RHCLOUD-46300',
    source_type: 'jira',
    source_url: 'https://issues.redhat.com/browse/RHCLOUD-46300',
    repo: 'settings-frontend',
    cycle_start: new Date(Date.now() - 12 * 60000).toISOString(),
    updated_at: new Date(Date.now() - 30000).toISOString(),
    active_tasks: 3,
    max_tasks: 5,
  },
  {
    instance_id: 'bot-beta',
    state: 'idle',
    message: 'Waiting for new work',
    external_key: null,
    source_type: null,
    source_url: null,
    repo: null,
    cycle_start: null,
    updated_at: new Date(Date.now() - 5 * 60000).toISOString(),
    active_tasks: 1,
    max_tasks: 5,
  },
  {
    instance_id: 'bot-gamma',
    state: 'error',
    message: 'CI pipeline timeout on notifications-frontend PR #912',
    external_key: 'RHCLOUD-46280',
    source_type: 'jira',
    source_url: 'https://issues.redhat.com/browse/RHCLOUD-46280',
    repo: 'notifications-frontend',
    cycle_start: new Date(Date.now() - 45 * 60000).toISOString(),
    updated_at: new Date(Date.now() - 2 * 60000).toISOString(),
    active_tasks: 2,
    max_tasks: 5,
  },
  {
    instance_id: 'production-us-east-1-consoledot-platform-team-rehor-bot-worker-node-07a',
    state: 'working',
    message: 'Reviewing PR #1042 on RedHatInsights/insights-dashboard — reviewer requested refactor of the entire widget rendering pipeline to support async data fetching with Suspense boundaries and error fallbacks for each individual card component',
    external_key: 'RHCLOUD-48102',
    source_type: 'jira',
    source_url: 'https://issues.redhat.com/browse/RHCLOUD-48102',
    repo: 'insights-dashboard',
    cycle_start: new Date(Date.now() - 38 * 60000).toISOString(),
    updated_at: new Date(Date.now() - 2 * 60000).toISOString(),
    active_tasks: 5,
    max_tasks: 5,
  },
  {
    instance_id: 'staging-eu-west-2-consoledot-platform-security-scanning-rehor-bot-worker-long-running-instance-42b',
    state: 'idle',
    message: 'Completed all queued security scanning tasks — no new CVEs detected in the last triage cycle across 14 monitored repositories in the ConsoleDot frontend ecosystem',
    external_key: null,
    source_type: null,
    source_url: null,
    repo: null,
    cycle_start: null,
    updated_at: new Date(Date.now() - 22 * 60000).toISOString(),
    active_tasks: 0,
    max_tasks: 10,
  },
  {
    instance_id: 'dev-local-jakub-macbook-pro-2024-rehor-experimental-feature-branch-test-runner',
    state: 'error',
    message: 'FATAL: Jira API returned 503 Service Unavailable after 5 retries with exponential backoff (last attempt waited 32s). The Jira instance at issues.redhat.com appears to be undergoing scheduled maintenance. Will retry automatically in 15 minutes.',
    external_key: 'RHCLOUD-47999',
    source_type: 'jira',
    source_url: 'https://issues.redhat.com/browse/RHCLOUD-47999',
    repo: 'vulnerability-engine-frontend',
    cycle_start: new Date(Date.now() - 120 * 60000).toISOString(),
    updated_at: new Date(Date.now() - 8 * 60000).toISOString(),
    active_tasks: 4,
    max_tasks: 5,
  },
  {
    instance_id: 'k8s-openshift-cluster-prod-na-consoledot-rehor-autonomous-agent-pool-high-priority-queue-processor-replica-3-of-8',
    state: 'working',
    message: 'Implementing CVE-2026-31847 fix across 3 repositories simultaneously',
    external_key: 'RHCLOUD-48200',
    source_type: 'jira',
    source_url: 'https://issues.redhat.com/browse/RHCLOUD-48200',
    repo: 'compliance-frontend',
    cycle_start: new Date(Date.now() - 6 * 60000).toISOString(),
    updated_at: new Date(Date.now() - 1 * 60000).toISOString(),
    active_tasks: 3,
    max_tasks: 8,
  },
  {
    instance_id: 'b',
    state: 'unknown',
    message: '',
    external_key: null,
    source_type: null,
    source_url: null,
    repo: null,
    cycle_start: null,
    updated_at: new Date(Date.now() - 3 * 24 * 3600000).toISOString(),
    active_tasks: 0,
    max_tasks: 5,
  },
  {
    instance_id: 'Jeho Jasnost, Kníže Spytihněv I., Ochránce Produkčního Míru',
    state: 'working',
    message: 'Provádím refaktoring autentizačního middleware — výměna express-session za iron-session s šifrovanými cookies',
    external_key: 'RHCLOUD-48500',
    source_type: 'jira',
    source_url: 'https://issues.redhat.com/browse/RHCLOUD-48500',
    repo: 'chrome-service-backend',
    cycle_start: new Date(Date.now() - 20 * 60000).toISOString(),
    updated_at: new Date(Date.now() - 3 * 60000).toISOString(),
    active_tasks: 3,
    max_tasks: 7,
  },
];

const TASKS = [
  // ── Active tasks ──
  {
    id: 1, external_key: 'RHCLOUD-46300', source_type: 'jira',
    source_url: 'https://issues.redhat.com/browse/RHCLOUD-46300',
    artifacts: [{ name: 'PR #245', url: 'https://github.com/RedHatInsights/settings-frontend/pull/245', type: 'pull_request' }],
    status: 'in_progress', repo: 'settings-frontend', branch: 'bot/RHCLOUD-46300',
    title: 'Add dark mode toggle to settings page',
    summary: 'Implementing a dark mode toggle using PF6 Switch component in the user preferences section.',
    created_at: new Date(Date.now() - 2 * 3600000).toISOString(),
    last_addressed: new Date(Date.now() - 15 * 60000).toISOString(),
    paused_reason: null, instance_id: 'bot-alpha', metadata: {},
  },
  {
    id: 2, external_key: 'RHCLOUD-46280', source_type: 'jira',
    source_url: 'https://issues.redhat.com/browse/RHCLOUD-46280',
    artifacts: [{ name: 'PR #912', url: 'https://github.com/RedHatInsights/notifications-frontend/pull/912', type: 'pull_request' }],
    status: 'pr_changes', repo: 'notifications-frontend', branch: 'bot/RHCLOUD-46280',
    title: 'Fix notification drawer pagination in PF6',
    summary: 'PF6 notification drawer pagination broken after upgrade. Reviewer requested changes to handle empty state.',
    created_at: new Date(Date.now() - 48 * 3600000).toISOString(),
    last_addressed: new Date(Date.now() - 3 * 3600000).toISOString(),
    paused_reason: null, instance_id: 'bot-gamma', metadata: {},
  },
  {
    id: 3, external_key: 'RHCLOUD-46310', source_type: 'jira',
    source_url: 'https://issues.redhat.com/browse/RHCLOUD-46310',
    artifacts: [{ name: 'PR #156', url: 'https://github.com/RedHatInsights/chrome-service-backend/pull/156', type: 'pull_request' }],
    status: 'pr_open', repo: 'chrome-service-backend', branch: 'bot/RHCLOUD-46310',
    title: 'Add gzip compression middleware',
    summary: 'Added gzip compression for API responses larger than 1KB. All existing tests pass.',
    created_at: new Date(Date.now() - 24 * 3600000).toISOString(),
    last_addressed: new Date(Date.now() - 6 * 3600000).toISOString(),
    paused_reason: null, instance_id: 'bot-alpha', metadata: {},
  },
  {
    id: 4, external_key: 'RHCLOUD-46150', source_type: 'jira',
    source_url: 'https://issues.redhat.com/browse/RHCLOUD-46150',
    artifacts: [],
    status: 'paused', repo: 'astro-virtual-assistant-frontend', branch: 'bot/RHCLOUD-46150',
    title: 'Redesign VA floating button with new brand icon',
    summary: 'Paused pending UX team design review for the new robot icon.',
    created_at: new Date(Date.now() - 72 * 3600000).toISOString(),
    last_addressed: new Date(Date.now() - 48 * 3600000).toISOString(),
    paused_reason: 'UX team requested design review — awaiting updated mockup from design lead',
    instance_id: 'bot-beta', metadata: {},
  },
  {
    id: 9, external_key: 'RHCLOUD-48102', source_type: 'jira',
    source_url: 'https://issues.redhat.com/browse/RHCLOUD-48102',
    artifacts: [
      { name: 'PR #1042', url: 'https://github.com/RedHatInsights/insights-dashboard/pull/1042', type: 'pull_request' },
      { name: 'Screenshot before', url: 'https://github.com/RedHatInsights/insights-dashboard/pull/1042#issuecomment-before', type: 'screenshot' },
      { name: 'Screenshot after', url: 'https://github.com/RedHatInsights/insights-dashboard/pull/1042#issuecomment-after', type: 'screenshot' },
      { name: 'Lighthouse report', url: 'https://github.com/RedHatInsights/insights-dashboard/pull/1042/checks', type: 'report' },
    ],
    status: 'in_progress', repo: 'insights-dashboard', branch: 'bot/RHCLOUD-48102',
    title: 'Refactor entire widget rendering pipeline to support async data fetching with React Suspense boundaries and per-card error fallback components for improved resilience and user experience',
    summary: 'This is a large-scale refactoring effort that touches 47 files across the widget rendering system. The goal is to wrap each dashboard card in its own Suspense boundary with a skeleton loader fallback, add ErrorBoundary wrappers per card so a single failing data source does not crash the entire dashboard, migrate from useEffect-based data fetching to React 19 use() with server-side streaming support, update all 23 widget components to accept async data props, add comprehensive error states with retry buttons, and ensure backwards compatibility with the existing widget-layout grid system. Currently in the third implementation cycle — first two cycles established the Suspense wrapper pattern and migrated 15 of 23 widgets.',
    created_at: new Date(Date.now() - 5 * 24 * 3600000).toISOString(),
    last_addressed: new Date(Date.now() - 38 * 60000).toISOString(),
    paused_reason: null,
    instance_id: 'production-us-east-1-consoledot-platform-team-rehor-bot-worker-node-07a',
    metadata: { estimated_effort: 'large', widgets_migrated: 15, widgets_total: 23 },
  },
  {
    id: 10, external_key: 'RHCLOUD-48200', source_type: 'jira',
    source_url: 'https://issues.redhat.com/browse/RHCLOUD-48200',
    artifacts: [
      { name: 'PR #301 (compliance-frontend)', url: 'https://github.com/RedHatInsights/compliance-frontend/pull/301', type: 'pull_request' },
      { name: 'PR #88 (ros-frontend)', url: 'https://github.com/RedHatInsights/ros-frontend/pull/88', type: 'pull_request' },
    ],
    status: 'in_progress', repo: 'compliance-frontend', branch: 'bot/RHCLOUD-48200',
    title: 'CVE-2026-31847: Critical prototype pollution in lodash.merge across multiple repos',
    summary: 'Critical severity CVE affecting lodash.merge < 4.6.3. Updating across compliance-frontend, ros-frontend, and drift-frontend. Two PRs opened, third repo pending.',
    created_at: new Date(Date.now() - 8 * 3600000).toISOString(),
    last_addressed: new Date(Date.now() - 6 * 60000).toISOString(),
    paused_reason: null,
    instance_id: 'k8s-openshift-cluster-prod-na-consoledot-rehor-autonomous-agent-pool-high-priority-queue-processor-replica-3-of-8',
    metadata: { cve_severity: 'critical', repos_affected: 3, repos_fixed: 2 },
  },
  {
    id: 11, external_key: 'RHCLOUD-48050', source_type: 'jira',
    source_url: 'https://issues.redhat.com/browse/RHCLOUD-48050',
    artifacts: [{ name: 'PR #444', url: 'https://github.com/RedHatInsights/vulnerability-engine-frontend/pull/444', type: 'pull_request' }],
    status: 'pr_open', repo: 'vulnerability-engine-frontend', branch: 'bot/RHCLOUD-48050',
    title: 'Add RBAC permission checks to CVE export button',
    summary: 'Added role-based access control check before allowing CSV export of CVE data. Uses chrome.auth.getUser() permissions.',
    created_at: new Date(Date.now() - 3 * 24 * 3600000).toISOString(),
    last_addressed: new Date(Date.now() - 18 * 3600000).toISOString(),
    paused_reason: null,
    instance_id: 'dev-local-jakub-macbook-pro-2024-rehor-experimental-feature-branch-test-runner',
    metadata: {},
  },
  {
    id: 12, external_key: 'RHCLOUD-48055', source_type: 'jira',
    source_url: 'https://issues.redhat.com/browse/RHCLOUD-48055',
    artifacts: [],
    status: 'pr_changes', repo: 'landing-page-frontend', branch: 'bot/RHCLOUD-48055',
    title: 'Replace deprecated <Tabs> with PF6 <Tabs> in landing page hero section — needs complete prop API migration from isBox/mountOnEnter to box/mountOnEnter pattern',
    summary: null,
    created_at: new Date(Date.now() - 60 * 3600000).toISOString(),
    last_addressed: new Date(Date.now() - 24 * 3600000).toISOString(),
    paused_reason: null,
    instance_id: 'production-us-east-1-consoledot-platform-team-rehor-bot-worker-node-07a',
    metadata: {},
  },
  {
    id: 13, external_key: 'RHCLOUD-47999', source_type: 'jira',
    source_url: 'https://issues.redhat.com/browse/RHCLOUD-47999',
    artifacts: [],
    status: 'paused', repo: 'vulnerability-engine-frontend', branch: 'bot/RHCLOUD-47999',
    title: 'Migrate vulnerability table from PF5 Table to PF6 composable Table',
    summary: 'Paused due to Jira API being unavailable (503). The migration is 60% complete — main table component converted but filter toolbar and bulk actions still use PF5 patterns.',
    created_at: new Date(Date.now() - 6 * 24 * 3600000).toISOString(),
    last_addressed: new Date(Date.now() - 120 * 60000).toISOString(),
    paused_reason: 'Jira API returned 503 Service Unavailable — instance appears to be in scheduled maintenance window. Auto-retry scheduled for 15 minutes. Last successful Jira sync was 2 hours ago.',
    instance_id: 'dev-local-jakub-macbook-pro-2024-rehor-experimental-feature-branch-test-runner',
    metadata: { migration_progress: '60%' },
  },
  {
    id: 14, external_key: 'RHCLOUD-48210', source_type: 'jira',
    source_url: 'https://issues.redhat.com/browse/RHCLOUD-48210',
    artifacts: [{ name: 'PR #92', url: 'https://github.com/RedHatInsights/edge-frontend/pull/92', type: 'pull_request' }],
    status: 'pr_open', repo: 'edge-frontend', branch: 'bot/RHCLOUD-48210',
    title: null,
    summary: null,
    created_at: new Date(Date.now() - 12 * 3600000).toISOString(),
    last_addressed: new Date(Date.now() - 10 * 3600000).toISOString(),
    paused_reason: null,
    instance_id: 'staging-eu-west-2-consoledot-platform-security-scanning-rehor-bot-worker-long-running-instance-42b',
    metadata: {},
  },
  {
    id: 15, external_key: 'RHCLOUD-48001', source_type: 'jira',
    source_url: 'https://issues.redhat.com/browse/RHCLOUD-48001',
    artifacts: [],
    status: 'in_progress', repo: 'sources-ui', branch: 'bot/RHCLOUD-48001',
    title: 'Fix',
    summary: 'f',
    created_at: new Date(Date.now() - 1 * 3600000).toISOString(),
    last_addressed: new Date(Date.now() - 5 * 60000).toISOString(),
    paused_reason: null,
    instance_id: 'b',
    metadata: {},
  },
  // ── Jeho Jasnost tasks ──
  {
    id: 23, external_key: 'RHCLOUD-48500', source_type: 'jira',
    source_url: 'https://issues.redhat.com/browse/RHCLOUD-48500',
    artifacts: [{ name: 'PR #190', url: 'https://github.com/RedHatInsights/chrome-service-backend/pull/190', type: 'pull_request' }],
    status: 'in_progress', repo: 'chrome-service-backend', branch: 'bot/RHCLOUD-48500',
    title: 'Replace express-session with iron-session for encrypted cookie-based auth',
    summary: 'Migrating session management from express-session (server-side Redis store) to iron-session (encrypted cookies). Eliminates Redis dependency for session storage, simplifies horizontal scaling. Currently updating middleware chain and session serialization format.',
    created_at: new Date(Date.now() - 2 * 24 * 3600000).toISOString(),
    last_addressed: new Date(Date.now() - 20 * 60000).toISOString(),
    paused_reason: null,
    instance_id: 'Jeho Jasnost, Kníže Spytihněv I., Ochránce Produkčního Míru',
    metadata: { files_changed: 12 },
  },
  {
    id: 24, external_key: 'RHCLOUD-48510', source_type: 'jira',
    source_url: 'https://issues.redhat.com/browse/RHCLOUD-48510',
    artifacts: [{ name: 'PR #331', url: 'https://github.com/RedHatInsights/rbac-frontend/pull/331', type: 'pull_request' }],
    status: 'pr_open', repo: 'rbac-frontend', branch: 'bot/RHCLOUD-48510',
    title: 'Add accessibility labels to RBAC role permission matrix table cells',
    summary: 'Screen readers could not distinguish individual permission checkboxes in the role editor matrix. Added aria-label to each cell combining role name + permission name. Axe accessibility audit now passes with 0 violations.',
    created_at: new Date(Date.now() - 3 * 24 * 3600000).toISOString(),
    last_addressed: new Date(Date.now() - 8 * 3600000).toISOString(),
    paused_reason: null,
    instance_id: 'Jeho Jasnost, Kníže Spytihněv I., Ochránce Produkčního Míru',
    metadata: { a11y_violations_before: 47, a11y_violations_after: 0 },
  },
  {
    id: 25, external_key: 'RHCLOUD-48520', source_type: 'jira',
    source_url: 'https://issues.redhat.com/browse/RHCLOUD-48520',
    artifacts: [
      { name: 'PR #602', url: 'https://github.com/RedHatInsights/insights-inventory-frontend/pull/602', type: 'pull_request' },
      { name: 'Test report', url: 'https://github.com/RedHatInsights/insights-inventory-frontend/pull/602/checks', type: 'report' },
    ],
    status: 'pr_changes', repo: 'insights-inventory-frontend', branch: 'bot/RHCLOUD-48520',
    title: 'Fix system detail drawer not closing on Escape key when focus is inside nested dropdown',
    summary: 'The system detail side drawer in inventory intercepted Escape keypresses globally, but when a nested PatternFly Select dropdown was open inside the drawer, the Escape key closed the drawer instead of just the dropdown. Fixed by checking event.target against active dropdown popper refs before propagating the close action. Reviewer asked to also handle the case where a modal dialog is open inside the drawer.',
    created_at: new Date(Date.now() - 36 * 3600000).toISOString(),
    last_addressed: new Date(Date.now() - 5 * 3600000).toISOString(),
    paused_reason: null,
    instance_id: 'Jeho Jasnost, Kníže Spytihněv I., Ochránce Produkčního Míru',
    metadata: { review_comments: 3 },
    slack_notification: { event_type: 'pr_review', message: 'PR #602 received 3 review comments from @fhlavac', sent_at: new Date(Date.now() - 6 * 3600000).toISOString() },
  },
  // ── Completed/archived tasks ──
  {
    id: 5, external_key: 'RHCLOUD-46165', source_type: 'jira',
    source_url: 'https://issues.redhat.com/browse/RHCLOUD-46165',
    artifacts: [{ name: 'PR #88', url: 'https://github.com/RedHatInsights/widget-layout/pull/88', type: 'pull_request' }],
    status: 'done', repo: 'widget-layout', branch: 'bot/RHCLOUD-46165',
    title: 'Upgrade frontend-components-notifications for alert fix',
    summary: 'Bumped @redhat-cloud-services/frontend-components-notifications to fix danger alert variant.',
    created_at: new Date(Date.now() - 7 * 24 * 3600000).toISOString(),
    last_addressed: new Date(Date.now() - 6 * 24 * 3600000).toISOString(),
    paused_reason: null, instance_id: 'bot-alpha', metadata: {},
  },
  {
    id: 6, external_key: 'RHCLOUD-46011', source_type: 'jira',
    source_url: 'https://issues.redhat.com/browse/RHCLOUD-46011',
    artifacts: [{ name: 'PR #368', url: 'https://github.com/RedHatInsights/astro-virtual-assistant-frontend/pull/368', type: 'pull_request' }],
    status: 'done', repo: 'astro-virtual-assistant-frontend', branch: 'bot/RHCLOUD-46011',
    title: 'Move VA to top of assistant dropdown',
    summary: 'Reordered addHook calls so VA appears first in the Chameleon dropdown. PR merged.',
    created_at: new Date(Date.now() - 10 * 24 * 3600000).toISOString(),
    last_addressed: new Date(Date.now() - 9 * 24 * 3600000).toISOString(),
    paused_reason: null, instance_id: 'bot-beta', metadata: {},
  },
  {
    id: 7, external_key: 'RHCLOUD-37880', source_type: 'jira',
    source_url: 'https://issues.redhat.com/browse/RHCLOUD-37880',
    artifacts: [{ name: 'PR #878', url: 'https://github.com/RedHatInsights/notifications-frontend/pull/878', type: 'pull_request' }],
    status: 'done', repo: 'notifications-frontend', branch: 'bot/RHCLOUD-37880',
    title: 'Fix bulk select text truncation in notification drawer',
    summary: 'Added flex-shrink: 0 CSS fix for PF6 notification drawer bulk select. PR merged.',
    created_at: new Date(Date.now() - 14 * 24 * 3600000).toISOString(),
    last_addressed: new Date(Date.now() - 12 * 24 * 3600000).toISOString(),
    paused_reason: null, instance_id: 'bot-gamma', metadata: {},
  },
  {
    id: 8, external_key: 'RHCLOUD-44644', source_type: 'jira',
    source_url: 'https://issues.redhat.com/browse/RHCLOUD-44644',
    artifacts: [],
    status: 'done', repo: 'payload-tracker-frontend', branch: 'bot/RHCLOUD-44644',
    title: 'CVE-2026-24842: node-tar lockfile update',
    summary: 'Fixed via npm lockfile update. Ran npm update node-tar, verified with npm audit.',
    created_at: new Date(Date.now() - 20 * 24 * 3600000).toISOString(),
    last_addressed: new Date(Date.now() - 19 * 24 * 3600000).toISOString(),
    paused_reason: null, instance_id: 'bot-alpha', metadata: {},
  },
  {
    id: 16, external_key: 'RHCLOUD-47500', source_type: 'jira',
    source_url: 'https://issues.redhat.com/browse/RHCLOUD-47500',
    artifacts: [
      { name: 'PR #200', url: 'https://github.com/RedHatInsights/insights-advisor-frontend/pull/200', type: 'pull_request' },
      { name: 'PR #201', url: 'https://github.com/RedHatInsights/insights-advisor-frontend/pull/201', type: 'pull_request' },
      { name: 'Perf report', url: 'https://github.com/RedHatInsights/insights-advisor-frontend/pull/201/checks', type: 'report' },
    ],
    status: 'done', repo: 'insights-advisor-frontend', branch: 'bot/RHCLOUD-47500',
    title: 'Optimize advisor recommendation list rendering — virtualize table rows for 10k+ item datasets and add debounced search with AbortController cleanup',
    summary: 'Replaced the full-DOM table with react-window virtualization. Initial render went from 4.2s to 180ms for 10,000 recommendations. Search input is now debounced (300ms) with AbortController to cancel stale API requests. Lighthouse performance score improved from 62 to 94. First PR had the virtualization, second PR added the search optimization after reviewer feedback.',
    created_at: new Date(Date.now() - 15 * 24 * 3600000).toISOString(),
    last_addressed: new Date(Date.now() - 11 * 24 * 3600000).toISOString(),
    paused_reason: null,
    instance_id: 'production-us-east-1-consoledot-platform-team-rehor-bot-worker-node-07a',
    metadata: { lighthouse_before: 62, lighthouse_after: 94 },
  },
  {
    id: 17, external_key: 'RHCLOUD-47600', source_type: 'jira',
    source_url: 'https://issues.redhat.com/browse/RHCLOUD-47600',
    artifacts: [{ name: 'PR #555', url: 'https://github.com/RedHatInsights/subscription-inventory-frontend/pull/555', type: 'pull_request' }],
    status: 'done', repo: 'subscription-inventory-frontend', branch: 'bot/RHCLOUD-47600',
    title: 'Add unit tests for subscription expiration date formatting edge cases including leap years, timezone boundaries, and locale-specific date patterns',
    summary: 'Added 42 new test cases covering: leap year Feb 29 expiration, DST transition dates, UTC midnight boundary, ISO 8601 with timezone offsets, null/undefined dates, epoch timestamps, dates far in the future (year 9999), and RTL locale formatting. Coverage for DateFormatter utility went from 34% to 98%.',
    created_at: new Date(Date.now() - 18 * 24 * 3600000).toISOString(),
    last_addressed: new Date(Date.now() - 16 * 24 * 3600000).toISOString(),
    paused_reason: null,
    instance_id: 'staging-eu-west-2-consoledot-platform-security-scanning-rehor-bot-worker-long-running-instance-42b',
    metadata: { tests_added: 42, coverage_before: '34%', coverage_after: '98%' },
  },
  {
    id: 18, external_key: 'RHCLOUD-43838', source_type: 'jira',
    source_url: 'https://issues.redhat.com/browse/RHCLOUD-43838',
    artifacts: [],
    status: 'done', repo: 'payload-tracker-frontend', branch: null,
    title: 'CVE: node-forge vulnerability in payload-tracker',
    summary: 'Closed as already fixed. Ran npm ls and npm audit — node-forge vulnerability was already patched via transitive dependency update.',
    created_at: new Date(Date.now() - 25 * 24 * 3600000).toISOString(),
    last_addressed: new Date(Date.now() - 25 * 24 * 3600000).toISOString(),
    paused_reason: null, instance_id: 'bot-alpha', metadata: {},
  },
  {
    id: 19, external_key: 'RHCLOUD-45699', source_type: 'jira',
    source_url: 'https://issues.redhat.com/browse/RHCLOUD-45699',
    artifacts: [{ name: 'PR #150', url: 'https://github.com/RedHatInsights/astro-virtual-assistant-v2/pull/150', type: 'pull_request' }],
    status: 'done', repo: 'astro-virtual-assistant-v2', branch: 'bot/RHCLOUD-45699',
    title: 'Add grype scanning to astro-virtual-assistant-v2',
    summary: 'Added grype security scanning GitHub Actions workflow for both Dockerfiles. Reviewer corrected: do not pin to SHA, run on PRs too.',
    created_at: new Date(Date.now() - 22 * 24 * 3600000).toISOString(),
    last_addressed: new Date(Date.now() - 20 * 24 * 3600000).toISOString(),
    paused_reason: null, instance_id: 'bot-gamma', metadata: {},
  },
  {
    id: 20, external_key: 'RHCLOUD-46251', source_type: 'jira',
    source_url: 'https://issues.redhat.com/browse/RHCLOUD-46251',
    artifacts: [{ name: 'PR #279 (closed)', url: 'https://github.com/RedHatInsights/learning-resources/pull/279', type: 'pull_request' }],
    status: 'done', repo: 'learning-resources', branch: 'bot/RHCLOUD-46251',
    title: 'Fix flaky Playwright e2e test counts',
    summary: 'PR closed by reviewer. Hardcoded baseline counts broke when backend seeding changed. Reviewer said to address tolerances separately.',
    created_at: new Date(Date.now() - 28 * 24 * 3600000).toISOString(),
    last_addressed: new Date(Date.now() - 26 * 24 * 3600000).toISOString(),
    paused_reason: null, instance_id: 'bot-beta', metadata: {},
  },
  {
    id: 21, external_key: 'RHCLOUD-48300', source_type: 'jira',
    source_url: 'https://issues.redhat.com/browse/RHCLOUD-48300',
    artifacts: [],
    status: 'paused', repo: 'cost-management-frontend', branch: 'bot/RHCLOUD-48300',
    title: 'Migrate cost management date picker from momentjs to date-fns — blocked on upstream PR in @redhat-cloud-services/frontend-components that still imports moment internally',
    summary: 'Cannot fully remove moment.js dependency because @redhat-cloud-services/frontend-components v4.2.1 still bundles it internally for the DatePicker component. Opened upstream issue RHCLOUD-48301. Migration of local code is complete but bundle still includes moment due to transitive dependency.',
    created_at: new Date(Date.now() - 4 * 24 * 3600000).toISOString(),
    last_addressed: new Date(Date.now() - 36 * 3600000).toISOString(),
    paused_reason: 'Blocked on upstream: @redhat-cloud-services/frontend-components v4.2.1 still bundles moment.js internally (RHCLOUD-48301). Cannot remove from bundle until upstream ships v4.3.0 with date-fns migration.',
    instance_id: 'k8s-openshift-cluster-prod-na-consoledot-rehor-autonomous-agent-pool-high-priority-queue-processor-replica-3-of-8',
    metadata: { blocked_by: 'RHCLOUD-48301' },
  },
  {
    id: 22, external_key: 'RHCLOUD-48310', source_type: 'jira',
    source_url: 'https://issues.redhat.com/browse/RHCLOUD-48310',
    artifacts: [{ name: 'PR #7777', url: 'https://github.com/RedHatInsights/insights-chrome/pull/7777', type: 'pull_request' }],
    status: 'pr_changes', repo: 'insights-chrome', branch: 'bot/RHCLOUD-48310',
    title: 'Fix',
    summary: 'Reviewer requested 14 changes across auth middleware, session storage, and JWT token refresh flow.',
    created_at: new Date(Date.now() - 30 * 3600000).toISOString(),
    last_addressed: new Date(Date.now() - 12 * 3600000).toISOString(),
    paused_reason: null,
    instance_id: 'bot-alpha',
    metadata: { review_comments: 14 },
    slack_notification: { event_type: 'pr_review', message: 'PR #7777 received 14 review comments from @mkholjuraev', sent_at: new Date(Date.now() - 13 * 3600000).toISOString() },
  },
  // ── Archived tasks ──
  {
    id: 101, external_key: 'RHCLOUD-45100', source_type: 'jira',
    title: 'Migrate notification preferences from localStorage to user API',
    status: 'archived', repo: 'notifications-frontend', branch: 'bot/RHCLOUD-45100',
    summary: 'Successfully migrated all notification preferences to the user settings API endpoint. Added backwards-compatible localStorage fallback for first load.',
    created_at: new Date(Date.now() - 30 * 24 * 3600000).toISOString(),
    last_addressed: new Date(Date.now() - 25 * 24 * 3600000).toISOString(),
    paused_reason: null, instance_id: 'bot-alpha',
    metadata: { files_changed: ['src/store/preferences.ts', 'src/api/userSettings.ts'] },
    artifacts: [{ name: 'PR #412', url: 'https://github.com/RedHatInsights/notifications-frontend/pull/412', type: 'pull_request' }],
  },
  {
    id: 102, external_key: 'RHCLOUD-44800', source_type: 'jira',
    title: 'Add retry logic to webhook delivery service',
    status: 'archived', repo: 'chrome-service-backend', branch: 'bot/RHCLOUD-44800',
    summary: 'Implemented exponential backoff retry with configurable max attempts. Dead letter queue for permanently failed webhooks.',
    created_at: new Date(Date.now() - 45 * 24 * 3600000).toISOString(),
    last_addressed: new Date(Date.now() - 40 * 24 * 3600000).toISOString(),
    paused_reason: null, instance_id: 'bot-alpha',
    metadata: {},
    artifacts: [{ name: 'PR #89', url: 'https://github.com/RedHatInsights/chrome-service-backend/pull/89', type: 'pull_request' }],
  },
  {
    id: 103, external_key: 'RHCLOUD-43500', source_type: 'jira',
    title: 'Fix race condition in advisor recommendation cache invalidation',
    status: 'archived', repo: 'insights-advisor-frontend', branch: 'bot/RHCLOUD-43500',
    summary: 'Root cause was a stale closure in the useEffect cleanup. Switched to useRef for the AbortController to ensure proper cleanup on unmount.',
    created_at: new Date(Date.now() - 60 * 24 * 3600000).toISOString(),
    last_addressed: new Date(Date.now() - 55 * 24 * 3600000).toISOString(),
    paused_reason: null, instance_id: 'bot-beta',
    metadata: { review_comments: 2 },
    artifacts: [{ name: 'PR #201', url: 'https://github.com/RedHatInsights/insights-advisor-frontend/pull/201', type: 'pull_request' }],
  },
  {
    id: 104, external_key: 'RHCLOUD-42900', source_type: 'jira',
    title: 'Upgrade PatternFly from v5 to v6 in vulnerability engine',
    status: 'archived', repo: 'vulnerability-engine-frontend', branch: 'bot/RHCLOUD-42900',
    summary: 'Full PF5→PF6 migration across 34 component files. Updated deprecated Table usage to composable Table pattern. All tests passing.',
    created_at: new Date(Date.now() - 90 * 24 * 3600000).toISOString(),
    last_addressed: new Date(Date.now() - 80 * 24 * 3600000).toISOString(),
    paused_reason: null, instance_id: 'bot-alpha',
    metadata: { files_changed: ['src/components/VulnTable.tsx', 'src/components/CveList.tsx', 'src/pages/Dashboard.tsx'] },
    artifacts: [{ name: 'PR #156', url: 'https://github.com/RedHatInsights/vulnerability-engine-frontend/pull/156', type: 'pull_request' }],
  },
];

const MEMORIES = [
  {
    id: 1, category: 'learning', repo: 'notifications-frontend', external_key: 'RHCLOUD-44667', source_type: 'jira',
    title: 'PF6 SelectOption requires children for labels',
    content: 'PatternFly v6 SelectOption no longer auto-renders labels from the value prop. Must pass label text as children explicitly: <SelectOption value={v}>{labels[v]}</SelectOption>. This was the root cause of RHCLOUD-44667 where timespan dropdown labels appeared empty.',
    tags: ['bug-fix', 'patternfly', 'pf6-migration'], created_at: new Date(Date.now() - 14 * 24 * 3600000).toISOString(), metadata: { pr_url: 'https://github.com/RedHatInsights/notifications-frontend/pull/883' },
  },
  {
    id: 2, category: 'learning', repo: 'notifications-frontend', external_key: 'RHCLOUD-37880', source_type: 'jira',
    title: 'PF6 flex-shrink needed for notification drawer bulk select',
    content: 'In PF6 notification drawer, the bulk select menu toggle needs flex-shrink: 0 on .pf-v6-c-notification-drawer__header-action > .pf-v6-c-menu-toggle to prevent the "50 selected" count text from being truncated. The old .ins-c-bulk-select class no longer exists in PF6.',
    tags: ['bug-fix', 'css', 'patternfly', 'pf6-migration'], created_at: new Date(Date.now() - 12 * 24 * 3600000).toISOString(), metadata: { pr_url: 'https://github.com/RedHatInsights/notifications-frontend/pull/878' },
  },
  {
    id: 3, category: 'review_feedback', repo: 'notifications-frontend', external_key: 'RHCLOUD-37880', source_type: 'jira',
    title: 'CSS selectors must match actual PF6 class names',
    content: 'Reviewer (karelhala) caught that .ins-c-bulk-select class does not exist in PF6. The bot initially used an incorrect selector. Always inspect the actual rendered DOM to find the correct PF6 class names. Use browser DevTools or snapshot tools to verify selectors before submitting.',
    tags: ['review-feedback', 'css', 'patternfly'], created_at: new Date(Date.now() - 11 * 24 * 3600000).toISOString(), metadata: {},
  },
  {
    id: 4, category: 'learning', repo: 'astro-virtual-assistant-frontend', external_key: 'RHCLOUD-46011', source_type: 'jira',
    title: 'Hook registration order determines dropdown item order',
    content: 'In astro-virtual-assistant-frontend, the order of addHook() calls in useAsyncManagers determines the order of items in the Chameleon assistant dropdown. To move VA to the first position, the VA hook must be registered before ARH and RHEL hooks.',
    tags: ['feature', 'ui-change'], created_at: new Date(Date.now() - 10 * 24 * 3600000).toISOString(), metadata: {},
  },
  {
    id: 5, category: 'codebase_pattern', repo: 'notifications-frontend', external_key: null, source_type: null,
    title: 'notifications-frontend: App.scss for global PF overrides',
    content: 'Global PatternFly CSS overrides in notifications-frontend go in src/app/App.scss. This is where the notification drawer bulk select fix was applied. Use PF6 class selectors like .pf-v6-c-notification-drawer__header-action.',
    tags: ['css', 'patternfly', 'component-structure'], created_at: new Date(Date.now() - 9 * 24 * 3600000).toISOString(), metadata: {},
  },
  {
    id: 6, category: 'review_feedback', repo: 'astro-virtual-assistant-frontend', external_key: 'RHCLOUD-44597', source_type: 'jira',
    title: 'Floating button must be explicitly round with width/height',
    content: 'Reviewer (Hyperkid123) caught that the floating VA button was not round after icon swap. Fix: set explicit width: 52px and height: 52px on the badge button with border-radius: 50%. Don\'t rely on padding alone for circular buttons — use fixed dimensions.',
    tags: ['review-feedback', 'css', 'ui-change'], created_at: new Date(Date.now() - 8 * 24 * 3600000).toISOString(), metadata: { pr_url: 'https://github.com/RedHatInsights/astro-virtual-assistant-frontend/pull/371' },
  },
  {
    id: 7, category: 'learning', repo: 'payload-tracker-frontend', external_key: 'RHCLOUD-43838', source_type: 'jira',
    title: 'CVE triage: check npm ls before attempting fix',
    content: 'Before fixing a CVE, always run "npm ls <package>" to trace the dependency through the tree. For RHCLOUD-43838, node-forge was a transitive dep of selfsigned. Running npm update and npm audit confirmed the vulnerability was already patched. This saved unnecessary work.',
    tags: ['cve', 'dependency-upgrade', 'triage'], created_at: new Date(Date.now() - 18 * 24 * 3600000).toISOString(), metadata: {},
  },
  {
    id: 8, category: 'learning', repo: null, external_key: null, source_type: null,
    title: 'Always verify existing state before implementing',
    content: 'For both RHCLOUD-43838 (CVE node-forge), RHCLOUD-44642 (CVE node-tar in pdf-generator), and RHCLOUD-45698 (grype scanning in chrome-service), the fix was already in place. Always check current state before starting work — run npm audit, check if workflows already exist, verify package versions. Closing as already-fixed saves significant time.',
    tags: ['triage', 'cve', 'ci'], created_at: new Date(Date.now() - 16 * 24 * 3600000).toISOString(), metadata: {},
  },
  {
    id: 9, category: 'review_feedback', repo: 'astro-virtual-assistant-v2', external_key: 'RHCLOUD-45699', source_type: 'jira',
    title: "Don't pin reusable GitHub Action workflows to SHA",
    content: 'On RHCLOUD-45699 (grype scanning), sourcery-ai bot suggested pinning the reusable workflow to a specific SHA. Reviewer Hyperkid123 corrected this: "we do not want to pin the workflow, we want to receive the latest version as it may include updates to the workflow and security DB." For security scanning workflows, always use @master/@main to get latest signatures.',
    tags: ['review-feedback', 'ci', 'security', 'github-actions'], created_at: new Date(Date.now() - 7 * 24 * 3600000).toISOString(), metadata: { pr_url: 'https://github.com/RedHatInsights/astro-virtual-assistant-v2/pull/150' },
  },
  {
    id: 10, category: 'learning', repo: null, external_key: null, source_type: null,
    title: 'Bot workflow: always use npm scripts, not direct CLI tools',
    content: "The bot initially called 'npx jest', 'npx eslint', 'tsc' directly. This is wrong — always use npm scripts: 'npm test', 'npm run lint', 'npm run build'. Check package.json for available scripts. The only exception is the dev server command which has no npm script equivalent.",
    tags: ['process', 'bot-workflow', 'testing'], created_at: new Date(Date.now() - 20 * 24 * 3600000).toISOString(), metadata: {},
  },
  {
    id: 11, category: 'review_feedback', repo: 'astro-virtual-assistant-frontend', external_key: 'RHCLOUD-44597', source_type: 'jira',
    title: 'Icon centering needs flexbox, not just padding',
    content: 'Reviewer (karelhala) caught that the icon in the floating button was not centered after making it round. Fix: use display: flex, align-items: center, justify-content: center on the button, and set the icon to fixed 32x32px size inside the 52px circle.',
    tags: ['review-feedback', 'css', 'ui-change'], created_at: new Date(Date.now() - 7.5 * 24 * 3600000).toISOString(), metadata: { pr_url: 'https://github.com/RedHatInsights/astro-virtual-assistant-frontend/pull/371' },
  },
  {
    id: 12, category: 'review_feedback', repo: 'astro-virtual-assistant-frontend', external_key: 'RHCLOUD-44597', source_type: 'jira',
    title: 'UX team may pause work pending design review',
    content: 'After implementing the VA robot icon swap (RHCLOUD-44597), UX team decided to reconsider the design. PR #371 was moved to draft. When implementing visual/design changes, be aware that UX stakeholders may want to re-evaluate.',
    tags: ['review-feedback', 'process', 'ux'], created_at: new Date(Date.now() - 7 * 24 * 3600000).toISOString(), metadata: {},
  },
  {
    id: 13, category: 'codebase_pattern', repo: 'notifications-frontend', external_key: null, source_type: null,
    title: 'notifications-frontend: EventLog date filter structure',
    content: 'EventLogDateFilter.tsx uses a labels map (DateFilterLabel enum values to display strings) and renders SelectOption components for each. The component is at src/components/Notifications/EventLog/EventLogDateFilter.tsx. Tests are in the same directory.',
    tags: ['component-structure', 'patternfly'], created_at: new Date(Date.now() - 15 * 24 * 3600000).toISOString(), metadata: {},
  },
  {
    id: 14, category: 'codebase_pattern', repo: 'astro-virtual-assistant-frontend', external_key: null, source_type: null,
    title: 'astro-virtual-assistant-frontend: icon asset conventions',
    content: 'SVG icons stored in src/assets/ and imported directly in component files. Convention is rh-icon-ai-chatbot-happy-{color}.svg naming. Components reference these via ESM imports. UniversalBadge, UniversalHeader, UniversalMessages, VAMessageEntry, and ARHMessageEntry all use bot avatar icons.',
    tags: ['component-structure', 'assets', 'ui-change'], created_at: new Date(Date.now() - 13 * 24 * 3600000).toISOString(), metadata: {},
  },
  {
    id: 15, category: 'codebase_pattern', repo: null, external_key: null, source_type: null,
    title: 'CI: pre-existing failures check pattern',
    content: 'When PR CI checks fail, always check if the same checks also fail on the default branch (main/master). If they do, the failure is pre-existing and not caused by the PR. Use "gh pr checks <number>" on the PR and compare with the default branch.',
    tags: ['ci', 'process'], created_at: new Date(Date.now() - 19 * 24 * 3600000).toISOString(), metadata: {},
  },
  {
    id: 16, category: 'learning', repo: 'widget-layout', external_key: 'RHCLOUD-46165', source_type: 'jira',
    title: 'widget-layout: upgrade frontend-components-notifications for alert fix',
    content: 'RHCLOUD-46165 required upgrading @redhat-cloud-services/frontend-components-notifications to fix the danger alert variant in the notification banner. The fix was a package version bump, not a code change. Always check if the issue is in a dependency before modifying application code.',
    tags: ['bug-fix', 'dependency-upgrade', 'patternfly'], created_at: new Date(Date.now() - 8 * 24 * 3600000).toISOString(), metadata: {},
  },
  {
    id: 17, category: 'learning', repo: 'learning-resources', external_key: 'RHCLOUD-46251', source_type: 'jira',
    title: 'Playwright e2e tests: avoid hardcoded counts from backend seeding',
    content: 'RHCLOUD-46251: Playwright tests had hardcoded baseline counts (98 resources, 13 for Observability filter) that broke when backend seeding changed. Lesson: hardcoded counts in e2e tests are fragile; use count > 0 or tolerance ranges instead. But also respect reviewer decisions — if they say close, close.',
    tags: ['testing', 'e2e', 'playwright'], created_at: new Date(Date.now() - 17 * 24 * 3600000).toISOString(), metadata: {},
  },
  {
    id: 18, category: 'review_feedback', repo: 'learning-resources', external_key: 'RHCLOUD-46251', source_type: 'jira',
    title: 'Reviewer may close PR if approach is wrong',
    content: 'On RHCLOUD-46251, reviewer Hyperkid123 said "Since there are no code changes, I think this PR can be closed." The bot correctly closed the PR per reviewer feedback. When a reviewer says to close/abandon, respect it — don\'t push back or try alternative approaches.',
    tags: ['review-feedback', 'process'], created_at: new Date(Date.now() - 16 * 24 * 3600000).toISOString(), metadata: {},
  },
  {
    id: 19, category: 'review_feedback', repo: 'astro-virtual-assistant-v2', external_key: 'RHCLOUD-45699', source_type: 'jira',
    title: 'Run security scan workflow on PRs too, not just push',
    content: 'On RHCLOUD-45699, reviewer Hyperkid123 noted "we do want to run the workflow even for PRs". The grype scanning workflow should trigger on both push to main/master AND pull_request events. This catches vulnerabilities before merge.',
    tags: ['review-feedback', 'ci', 'security', 'github-actions'], created_at: new Date(Date.now() - 6 * 24 * 3600000).toISOString(), metadata: {},
  },
  {
    id: 20, category: 'learning', repo: null, external_key: null, source_type: null,
    title: 'Bot workflow: never commit screenshots to repos',
    content: 'The bot initially committed PNG screenshots to PR branches and used relative image paths in PR descriptions. Both are wrong. Screenshots must be base64-encoded and embedded in PR comments. Never commit binary files to the repo for verification purposes.',
    tags: ['process', 'bot-workflow'], created_at: new Date(Date.now() - 21 * 24 * 3600000).toISOString(), metadata: {},
  },
  {
    id: 21, category: 'learning', repo: null, external_key: null, source_type: null,
    title: 'Dev server: fec dev takes 2-3 minutes for initial load',
    content: 'The HCC dev server (fec dev --clouddotEnv stage) proxies all requests to console.stage.redhat.com. The initial page load takes 2-3 minutes because hundreds of federated module assets are fetched through the proxy without cache. Use wait_for with 180000ms timeout.',
    tags: ['process', 'bot-workflow', 'dev-server'], created_at: new Date(Date.now() - 22 * 24 * 3600000).toISOString(), metadata: {},
  },
  {
    id: 22, category: 'learning', repo: null, external_key: null, source_type: null,
    title: 'SSO login is a two-step flow',
    content: 'The Red Hat SSO/Keycloak login is two-step: (1) enter username and click Next, (2) wait for password field, enter password and click Log in. The bot must handle each step separately with waits between them.',
    tags: ['process', 'bot-workflow', 'dev-server', 'authentication'], created_at: new Date(Date.now() - 23 * 24 * 3600000).toISOString(), metadata: {},
  },
  {
    id: 23, category: 'codebase_pattern', repo: 'astro-virtual-assistant-v2', external_key: null, source_type: null,
    title: 'astro-virtual-assistant-v2: multiple Dockerfiles need separate scan jobs',
    content: 'astro-virtual-assistant-v2 has multiple Dockerfiles: Dockerfile.virtual-assistant and Dockerfile.watson-extension. When adding grype scanning, each Dockerfile needs its own scan job in the GitHub Actions workflow. The reusable workflow from platform-security-gh-workflow accepts a dockerfile input parameter.',
    tags: ['ci', 'security', 'github-actions', 'component-structure'], created_at: new Date(Date.now() - 11 * 24 * 3600000).toISOString(), metadata: {},
  },
  {
    id: 24, category: 'codebase_pattern', repo: 'widget-layout', external_key: null, source_type: null,
    title: 'widget-layout: frontend notification component dependency',
    content: 'widget-layout uses @redhat-cloud-services/frontend-components-notifications for toast/alert notifications. Issues with alert variants (danger, warning, etc.) may come from this package rather than the app code. Check the package version and changelog first.',
    tags: ['dependency-upgrade', 'component-structure'], created_at: new Date(Date.now() - 10 * 24 * 3600000).toISOString(), metadata: {},
  },
  {
    id: 25, category: 'learning', repo: 'insights-advisor-frontend', external_key: 'RHCLOUD-47500', source_type: 'jira',
    title: 'React-window virtualization for large tables: implementation notes and performance benchmarks from advisor recommendation list optimization',
    content: 'When virtualizing large PatternFly tables with react-window:\n\n1. Use FixedSizeList for uniform row heights, VariableSizeList only if rows genuinely differ\n2. Set overscanCount to 5-10 (default 1 causes visible blank rows during fast scroll)\n3. The PF Table component must be split: <TableComposable> wrapper stays outside, row rendering goes inside the virtualizer\n4. Column widths need explicit percentages since the virtualizer removes rows from DOM flow\n5. Sticky header requires position: sticky on <Thead> with z-index above virtualized rows\n6. Keyboard navigation (arrow keys) needs custom handler since only visible rows exist in DOM\n\nBenchmark results for 10,000 rows:\n- Without virtualization: 4.2s initial render, 890ms re-render on filter, 12MB DOM nodes\n- With virtualization: 180ms initial render, 45ms re-render on filter, 0.3MB DOM nodes\n- Lighthouse performance: 62 → 94',
    tags: ['performance', 'react', 'patternfly', 'virtualization'], created_at: new Date(Date.now() - 12 * 24 * 3600000).toISOString(),
    metadata: { render_before_ms: 4200, render_after_ms: 180, lighthouse_before: 62, lighthouse_after: 94 },
  },
  {
    id: 26, category: 'learning', repo: 'payload-tracker-frontend', external_key: 'RHCLOUD-44644', source_type: 'jira',
    title: 'CVE lockfile-only fix via npm update',
    content: 'For CVE-2026-24842 (node-tar), the fix was a simple npm lockfile update. Run "npm update node-tar" to bump the transitive dependency, verify with "npm audit", and commit the updated package-lock.json. No code changes needed.',
    tags: ['cve', 'dependency-upgrade'], created_at: new Date(Date.now() - 19 * 24 * 3600000).toISOString(), metadata: {},
  },
  {
    id: 27, category: 'learning', repo: 'astro-virtual-assistant-v2', external_key: 'RHCLOUD-45699', source_type: 'jira',
    title: 'Grype scanning workflow: adapt from reference implementation',
    content: 'When adding grype scanning GitHub Actions, fetch the reusable workflow from platform-security-gh-workflow repo and study how chrome-service-backend implements it. Then adapt the pattern for the target repo.',
    tags: ['ci', 'security', 'github-actions'], created_at: new Date(Date.now() - 14 * 24 * 3600000).toISOString(), metadata: {},
  },
  {
    id: 28, category: 'learning', repo: null, external_key: null, source_type: null,
    title: '',
    content: 'Empty title test entry — this memory was stored with an empty title to test edge case handling in the dashboard UI.',
    tags: [], created_at: new Date(Date.now() - 1 * 24 * 3600000).toISOString(), metadata: {},
  },
  {
    id: 29, category: 'review_feedback', repo: 'insights-chrome', external_key: 'RHCLOUD-48310', source_type: 'jira',
    title: 'JWT refresh token race condition — reviewer identified that concurrent API calls during token refresh can cause 401 cascade when the refresh endpoint is called multiple times simultaneously',
    content: 'Reviewer @mkholjuraev identified a critical race condition in the JWT token refresh flow in insights-chrome. When multiple API calls are in-flight and the access token expires, each call independently triggers a token refresh. This causes: (1) multiple simultaneous calls to the refresh endpoint, (2) only the first refresh succeeds — subsequent ones get 400 because the refresh token was already consumed, (3) the failed refreshes clear the auth state, causing a logout cascade. Fix: implement a token refresh mutex/queue pattern where the first caller initiates the refresh and subsequent callers await the same promise. The reviewer referenced a similar pattern in auth0-spa-js as the recommended approach. This was caught during review of PR #7777 — 6 of the 14 review comments were about this single issue.',
    tags: ['review-feedback', 'security', 'authentication', 'race-condition', 'critical'],
    created_at: new Date(Date.now() - 30 * 3600000).toISOString(),
    metadata: { pr_url: 'https://github.com/RedHatInsights/insights-chrome/pull/7777', reviewer: '@mkholjuraev', comments_count: 14 },
  },
  {
    id: 30, category: 'codebase_pattern', repo: 'cost-management-frontend', external_key: null, source_type: null,
    title: 'cost-management-frontend: moment.js usage map for migration planning',
    content: 'Audited all moment.js usage in cost-management-frontend for the date-fns migration (RHCLOUD-48300). Found 34 direct imports across 12 files:\n- src/utils/dateFormatter.ts (8 usages) — core formatting, can migrate directly\n- src/components/DatePicker/* (6 usages) — BLOCKED: uses PF DatePicker which internally imports moment\n- src/api/costQueries.ts (4 usages) — date range serialization to ISO\n- src/store/selectors/dateSelectors.ts (3 usages) — Redux selectors with .startOf("month")\n- src/components/Charts/* (13 usages) — axis formatting and tooltip dates\n\ndate-fns equivalents mapped for all 34 usages. The @redhat-cloud-services/frontend-components dependency is the blocker — it bundles moment internally.',
    tags: ['migration', 'dependency-upgrade', 'component-structure'],
    created_at: new Date(Date.now() - 4 * 24 * 3600000).toISOString(), metadata: { total_usages: 34, files_affected: 12 },
  },
];

function generateDailyAggregates(days) {
  const result = [];
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(Date.now() - i * 24 * 3600000);
    const day = d.toISOString().slice(0, 10);
    const cycles = Math.floor(Math.random() * 20) + 3;
    const idleCycles = Math.floor(cycles * 0.3);
    const errorCycles = Math.random() > 0.7 ? Math.floor(Math.random() * 3) : 0;
    result.push({
      day,
      cycles,
      total_cost: +(Math.random() * 4 + 0.5).toFixed(2),
      input_tokens: Math.floor(Math.random() * 800000) + 200000,
      output_tokens: Math.floor(Math.random() * 200000) + 50000,
      cache_read: Math.floor(Math.random() * 500000) + 100000,
      cache_write: Math.floor(Math.random() * 100000) + 20000,
      total_duration: Math.floor(Math.random() * 3600000) + 600000,
      total_turns: Math.floor(Math.random() * 150) + 30,
      idle_cycles: idleCycles,
      error_cycles: errorCycles,
    });
  }
  return result;
}

function generateCostEntries(limit) {
  const models = ['claude-sonnet-4-20250514', 'claude-opus-4-20250918', 'claude-haiku-4-5-20251001'];
  const workTypes = ['implement', 'review', 'triage', 'ci-fix', null];
  const repos = ['notifications-frontend', 'settings-frontend', 'chrome-service-backend', 'astro-virtual-assistant-frontend', 'widget-layout', 'insights-dashboard', 'vulnerability-engine-frontend', 'insights-advisor-frontend', 'compliance-frontend', 'cost-management-frontend', 'insights-chrome', 'edge-frontend', 'landing-page-frontend', 'sources-ui', null];
  const keys = ['RHCLOUD-46300', 'RHCLOUD-46280', 'RHCLOUD-46310', 'RHCLOUD-46150', 'RHCLOUD-46165', 'RHCLOUD-48102', 'RHCLOUD-48200', 'RHCLOUD-48050', 'RHCLOUD-47500', 'RHCLOUD-47999', 'RHCLOUD-48300', 'RHCLOUD-48310', 'RHCLOUD-48055', 'RHCLOUD-48210', null];
  const result = [];
  for (let i = 0; i < limit; i++) {
    const ts = new Date(Date.now() - i * 1800000);
    const isIdle = Math.random() > 0.7;
    result.push({
      id: limit - i,
      timestamp: ts.toISOString(),
      label: isIdle ? 'idle-check' : `work-cycle-${limit - i}`,
      session_id: `ses_${Math.random().toString(36).slice(2, 10)}`,
      num_turns: isIdle ? 2 : Math.floor(Math.random() * 30) + 5,
      duration_ms: isIdle ? 5000 : Math.floor(Math.random() * 300000) + 30000,
      cost_usd: isIdle ? 0.01 : +(Math.random() * 0.8 + 0.05).toFixed(4),
      input_tokens: Math.floor(Math.random() * 100000) + 10000,
      output_tokens: Math.floor(Math.random() * 30000) + 2000,
      cache_read_tokens: Math.floor(Math.random() * 80000),
      cache_write_tokens: Math.floor(Math.random() * 20000),
      model: models[Math.floor(Math.random() * models.length)],
      is_error: Math.random() > 0.9,
      no_work: isIdle,
      external_key: isIdle ? null : keys[Math.floor(Math.random() * keys.length)],
      source_type: 'jira',
      repo: isIdle ? null : repos[Math.floor(Math.random() * repos.length)],
      work_type: isIdle ? null : workTypes[Math.floor(Math.random() * workTypes.length)],
      summary: isIdle ? 'No actionable tickets found' : 'Implemented changes and ran tests',
    });
  }
  return result;
}

const CYCLE_RUNS = [
  { id: 1, task_id: 1, cycle_type: 'implement', instance_id: 'bot-alpha', started_at: new Date(Date.now() - 2 * 3600000).toISOString(), finished_at: new Date(Date.now() - 1.5 * 3600000).toISOString(), tool_calls: 42, tokens_used: 185000, progress: { step: 'complete' }, created_at: new Date(Date.now() - 2 * 3600000).toISOString(), has_transcript: true },
  { id: 2, task_id: 1, cycle_type: 'implement', instance_id: 'bot-alpha', started_at: new Date(Date.now() - 1 * 3600000).toISOString(), finished_at: new Date(Date.now() - 0.5 * 3600000).toISOString(), tool_calls: 28, tokens_used: 120000, progress: { step: 'tests' }, created_at: new Date(Date.now() - 1 * 3600000).toISOString(), has_transcript: true },
  { id: 3, task_id: 2, cycle_type: 'review', instance_id: 'bot-gamma', started_at: new Date(Date.now() - 4 * 3600000).toISOString(), finished_at: new Date(Date.now() - 3.5 * 3600000).toISOString(), tool_calls: 15, tokens_used: 68000, progress: { step: 'complete' }, created_at: new Date(Date.now() - 4 * 3600000).toISOString(), has_transcript: true },
  { id: 4, task_id: 3, cycle_type: 'implement', instance_id: 'bot-alpha', started_at: new Date(Date.now() - 24 * 3600000).toISOString(), finished_at: new Date(Date.now() - 23 * 3600000).toISOString(), tool_calls: 55, tokens_used: 230000, progress: { step: 'complete' }, created_at: new Date(Date.now() - 24 * 3600000).toISOString(), has_transcript: false },
  { id: 5, task_id: null, cycle_type: 'triage', instance_id: 'bot-beta', started_at: new Date(Date.now() - 5 * 60000).toISOString(), finished_at: new Date(Date.now() - 4 * 60000).toISOString(), tool_calls: 8, tokens_used: 25000, progress: { step: 'complete' }, created_at: new Date(Date.now() - 5 * 60000).toISOString(), has_transcript: true },
  // Long-running instance cycles
  { id: 6, task_id: 9, cycle_type: 'implement', instance_id: 'production-us-east-1-consoledot-platform-team-rehor-bot-worker-node-07a', started_at: new Date(Date.now() - 5 * 24 * 3600000).toISOString(), finished_at: new Date(Date.now() - 4.5 * 24 * 3600000).toISOString(), tool_calls: 112, tokens_used: 520000, progress: { step: 'complete', widgets_migrated: 8 }, created_at: new Date(Date.now() - 5 * 24 * 3600000).toISOString(), has_transcript: true },
  { id: 7, task_id: 9, cycle_type: 'implement', instance_id: 'production-us-east-1-consoledot-platform-team-rehor-bot-worker-node-07a', started_at: new Date(Date.now() - 3 * 24 * 3600000).toISOString(), finished_at: new Date(Date.now() - 2.5 * 24 * 3600000).toISOString(), tool_calls: 98, tokens_used: 480000, progress: { step: 'complete', widgets_migrated: 15 }, created_at: new Date(Date.now() - 3 * 24 * 3600000).toISOString(), has_transcript: true },
  { id: 8, task_id: 9, cycle_type: 'implement', instance_id: 'production-us-east-1-consoledot-platform-team-rehor-bot-worker-node-07a', started_at: new Date(Date.now() - 38 * 60000).toISOString(), finished_at: null, tool_calls: 45, tokens_used: 210000, progress: { step: 'implementing', widgets_migrated: 18, current_widget: 'ComplianceCard' }, created_at: new Date(Date.now() - 38 * 60000).toISOString(), has_transcript: true },
  { id: 9, task_id: 10, cycle_type: 'implement', instance_id: 'k8s-openshift-cluster-prod-na-consoledot-rehor-autonomous-agent-pool-high-priority-queue-processor-replica-3-of-8', started_at: new Date(Date.now() - 6 * 60000).toISOString(), finished_at: null, tool_calls: 22, tokens_used: 95000, progress: { step: 'fixing', repos_done: 2, repos_total: 3 }, created_at: new Date(Date.now() - 6 * 60000).toISOString(), has_transcript: true },
  { id: 10, task_id: 11, cycle_type: 'implement', instance_id: 'dev-local-jakub-macbook-pro-2024-rehor-experimental-feature-branch-test-runner', started_at: new Date(Date.now() - 3 * 24 * 3600000).toISOString(), finished_at: new Date(Date.now() - 2.8 * 24 * 3600000).toISOString(), tool_calls: 35, tokens_used: 155000, progress: { step: 'complete' }, created_at: new Date(Date.now() - 3 * 24 * 3600000).toISOString(), has_transcript: true },
  { id: 11, task_id: null, cycle_type: 'triage', instance_id: 'staging-eu-west-2-consoledot-platform-security-scanning-rehor-bot-worker-long-running-instance-42b', started_at: new Date(Date.now() - 25 * 60000).toISOString(), finished_at: new Date(Date.now() - 22 * 60000).toISOString(), tool_calls: 12, tokens_used: 38000, progress: { step: 'complete', repos_scanned: 14, cves_found: 0 }, created_at: new Date(Date.now() - 25 * 60000).toISOString(), has_transcript: true },
  { id: 12, task_id: 16, cycle_type: 'implement', instance_id: 'production-us-east-1-consoledot-platform-team-rehor-bot-worker-node-07a', started_at: new Date(Date.now() - 15 * 24 * 3600000).toISOString(), finished_at: new Date(Date.now() - 14.5 * 24 * 3600000).toISOString(), tool_calls: 88, tokens_used: 410000, progress: { step: 'complete' }, created_at: new Date(Date.now() - 15 * 24 * 3600000).toISOString(), has_transcript: true },
  { id: 13, task_id: 16, cycle_type: 'review', instance_id: 'production-us-east-1-consoledot-platform-team-rehor-bot-worker-node-07a', started_at: new Date(Date.now() - 13 * 24 * 3600000).toISOString(), finished_at: new Date(Date.now() - 12.8 * 24 * 3600000).toISOString(), tool_calls: 22, tokens_used: 95000, progress: { step: 'complete' }, created_at: new Date(Date.now() - 13 * 24 * 3600000).toISOString(), has_transcript: true },
  { id: 14, task_id: 16, cycle_type: 'implement', instance_id: 'production-us-east-1-consoledot-platform-team-rehor-bot-worker-node-07a', started_at: new Date(Date.now() - 12 * 24 * 3600000).toISOString(), finished_at: new Date(Date.now() - 11.5 * 24 * 3600000).toISOString(), tool_calls: 65, tokens_used: 310000, progress: { step: 'complete' }, created_at: new Date(Date.now() - 12 * 24 * 3600000).toISOString(), has_transcript: true },
  // Errored cycle (no finished_at, is_error implied by null finish)
  { id: 15, task_id: 13, cycle_type: 'implement', instance_id: 'dev-local-jakub-macbook-pro-2024-rehor-experimental-feature-branch-test-runner', started_at: new Date(Date.now() - 120 * 60000).toISOString(), finished_at: null, tool_calls: 3, tokens_used: 12000, progress: { step: 'error', error: 'Jira API 503' }, created_at: new Date(Date.now() - 120 * 60000).toISOString(), has_transcript: true },
  // Very short triage cycles
  { id: 16, task_id: null, cycle_type: 'triage', instance_id: 'bot-beta', started_at: new Date(Date.now() - 35 * 60000).toISOString(), finished_at: new Date(Date.now() - 34.5 * 60000).toISOString(), tool_calls: 3, tokens_used: 8000, progress: { step: 'complete' }, created_at: new Date(Date.now() - 35 * 60000).toISOString(), has_transcript: true },
  { id: 17, task_id: null, cycle_type: 'triage', instance_id: 'bot-beta', started_at: new Date(Date.now() - 65 * 60000).toISOString(), finished_at: new Date(Date.now() - 64 * 60000).toISOString(), tool_calls: 5, tokens_used: 14000, progress: { step: 'complete' }, created_at: new Date(Date.now() - 65 * 60000).toISOString(), has_transcript: true },
  { id: 18, task_id: 22, cycle_type: 'review', instance_id: 'bot-alpha', started_at: new Date(Date.now() - 14 * 3600000).toISOString(), finished_at: new Date(Date.now() - 13 * 3600000).toISOString(), tool_calls: 18, tokens_used: 75000, progress: { step: 'complete' }, created_at: new Date(Date.now() - 14 * 3600000).toISOString(), has_transcript: true },
  // Cycle with 0 tool calls, 0 tokens (edge case)
  { id: 19, task_id: 15, cycle_type: 'implement', instance_id: 'b', started_at: new Date(Date.now() - 1 * 3600000).toISOString(), finished_at: new Date(Date.now() - 55 * 60000).toISOString(), tool_calls: 0, tokens_used: 0, progress: {}, created_at: new Date(Date.now() - 1 * 3600000).toISOString(), has_transcript: false },
];

const CYCLE_RUNS_BY_TASK = [
  { task_id: 1, external_key: 'RHCLOUD-46300', title: 'Add dark mode toggle to settings page', task_status: 'in_progress', repo: 'settings-frontend', cycle_count: 2, transcript_count: 2, total_tool_calls: 70, total_tokens: 305000, first_cycle: CYCLE_RUNS[0].started_at, last_cycle: CYCLE_RUNS[1].started_at },
  { task_id: 2, external_key: 'RHCLOUD-46280', title: 'Fix notification drawer pagination in PF6', task_status: 'pr_changes', repo: 'notifications-frontend', cycle_count: 1, transcript_count: 1, total_tool_calls: 15, total_tokens: 68000, first_cycle: CYCLE_RUNS[2].started_at, last_cycle: CYCLE_RUNS[2].started_at },
  { task_id: 3, external_key: 'RHCLOUD-46310', title: 'Add gzip compression middleware', task_status: 'pr_open', repo: 'chrome-service-backend', cycle_count: 1, transcript_count: 0, total_tool_calls: 55, total_tokens: 230000, first_cycle: CYCLE_RUNS[3].started_at, last_cycle: CYCLE_RUNS[3].started_at },
  { task_id: 9, external_key: 'RHCLOUD-48102', title: 'Refactor entire widget rendering pipeline to support async data fetching with React Suspense boundaries and per-card error fallback components for improved resilience and user experience', task_status: 'in_progress', repo: 'insights-dashboard', cycle_count: 3, transcript_count: 3, total_tool_calls: 255, total_tokens: 1210000, first_cycle: CYCLE_RUNS[5].started_at, last_cycle: CYCLE_RUNS[7].started_at },
  { task_id: 10, external_key: 'RHCLOUD-48200', title: 'CVE-2026-31847: Critical prototype pollution in lodash.merge across multiple repos', task_status: 'in_progress', repo: 'compliance-frontend', cycle_count: 1, transcript_count: 1, total_tool_calls: 22, total_tokens: 95000, first_cycle: CYCLE_RUNS[8].started_at, last_cycle: CYCLE_RUNS[8].started_at },
  { task_id: 11, external_key: 'RHCLOUD-48050', title: 'Add RBAC permission checks to CVE export button', task_status: 'pr_open', repo: 'vulnerability-engine-frontend', cycle_count: 1, transcript_count: 1, total_tool_calls: 35, total_tokens: 155000, first_cycle: CYCLE_RUNS[9].started_at, last_cycle: CYCLE_RUNS[9].started_at },
  { task_id: 16, external_key: 'RHCLOUD-47500', title: 'Optimize advisor recommendation list rendering — virtualize table rows for 10k+ item datasets and add debounced search with AbortController cleanup', task_status: 'done', repo: 'insights-advisor-frontend', cycle_count: 3, transcript_count: 3, total_tool_calls: 175, total_tokens: 815000, first_cycle: CYCLE_RUNS[11].started_at, last_cycle: CYCLE_RUNS[13].started_at },
  { task_id: 13, external_key: 'RHCLOUD-47999', title: 'Migrate vulnerability table from PF5 Table to PF6 composable Table', task_status: 'paused', repo: 'vulnerability-engine-frontend', cycle_count: 1, transcript_count: 1, total_tool_calls: 3, total_tokens: 12000, first_cycle: CYCLE_RUNS[14].started_at, last_cycle: CYCLE_RUNS[14].started_at },
  { task_id: 22, external_key: 'RHCLOUD-48310', title: 'Fix', task_status: 'pr_changes', repo: 'insights-chrome', cycle_count: 1, transcript_count: 1, total_tool_calls: 18, total_tokens: 75000, first_cycle: CYCLE_RUNS[17].started_at, last_cycle: CYCLE_RUNS[17].started_at },
  { task_id: 15, external_key: 'RHCLOUD-48001', title: 'Fix', task_status: 'in_progress', repo: 'sources-ui', cycle_count: 1, transcript_count: 0, total_tool_calls: 0, total_tokens: 0, first_cycle: CYCLE_RUNS[18].started_at, last_cycle: CYCLE_RUNS[18].started_at },
  { task_id: null, external_key: null, title: null, task_status: null, repo: null, cycle_count: 4, transcript_count: 4, total_tool_calls: 28, total_tokens: 85000, first_cycle: CYCLE_RUNS[4].started_at, last_cycle: CYCLE_RUNS[10].started_at },
];

const ANALYTICS = {
  summary: {
    total_cycles: 312, work_cycles: 198, idle_cycles: 89, error_cycles: 25,
    unique_tickets: 22, total_cost: 127.84, avg_cost_per_work_cycle: 0.65,
    avg_turns: 16.8, avg_duration_ms: 210000, repos_touched: 14, tickets_resolved: 15,
  },
  work_types: [
    { category: 'implement', cycles: 112, total_cost: 68.50, avg_cost: 0.61, avg_turns: 22.3, avg_duration_ms: 280000 },
    { category: 'review', cycles: 48, total_cost: 18.90, avg_cost: 0.39, avg_turns: 12.1, avg_duration_ms: 140000 },
    { category: 'triage', cycles: 24, total_cost: 5.28, avg_cost: 0.22, avg_turns: 6.5, avg_duration_ms: 55000 },
    { category: 'ci-fix', cycles: 14, total_cost: 10.80, avg_cost: 0.77, avg_turns: 28.0, avg_duration_ms: 360000 },
  ],
  repos: [
    { repo: 'notifications-frontend', tickets: 5, cycles: 42, total_cost: 18.60, avg_turns: 16.0 },
    { repo: 'insights-dashboard', tickets: 2, cycles: 38, total_cost: 22.40, avg_turns: 24.0 },
    { repo: 'settings-frontend', tickets: 3, cycles: 28, total_cost: 12.50, avg_turns: 14.0 },
    { repo: 'chrome-service-backend', tickets: 3, cycles: 22, total_cost: 9.80, avg_turns: 12.0 },
    { repo: 'vulnerability-engine-frontend', tickets: 2, cycles: 18, total_cost: 8.40, avg_turns: 15.0 },
    { repo: 'astro-virtual-assistant-frontend', tickets: 2, cycles: 14, total_cost: 6.80, avg_turns: 15.0 },
    { repo: 'insights-advisor-frontend', tickets: 1, cycles: 12, total_cost: 8.20, avg_turns: 22.0 },
    { repo: 'compliance-frontend', tickets: 1, cycles: 10, total_cost: 5.50, avg_turns: 18.0 },
    { repo: 'widget-layout', tickets: 2, cycles: 8, total_cost: 3.20, avg_turns: 10.0 },
    { repo: 'cost-management-frontend', tickets: 1, cycles: 6, total_cost: 3.80, avg_turns: 16.0 },
    { repo: 'insights-chrome', tickets: 1, cycles: 5, total_cost: 2.90, avg_turns: 14.0 },
    { repo: 'payload-tracker-frontend', tickets: 2, cycles: 5, total_cost: 1.50, avg_turns: 8.0 },
    { repo: 'edge-frontend', tickets: 1, cycles: 4, total_cost: 1.80, avg_turns: 10.0 },
    { repo: 'learning-resources', tickets: 1, cycles: 4, total_cost: 1.80, avg_turns: 12.0 },
  ],
  tickets: [
    { external_key: 'RHCLOUD-48102', title: 'Refactor entire widget rendering pipeline to support async data fetching with React Suspense boundaries and per-card error fallback components for improved resilience and user experience', status: 'in_progress', repo: 'insights-dashboard', total_cycles: 12, impl_cycles: 9, review_cycles: 3, total_cost: 18.40, hours_span: 120.0 },
    { external_key: 'RHCLOUD-47500', title: 'Optimize advisor recommendation list rendering — virtualize table rows for 10k+ item datasets', status: 'done', repo: 'insights-advisor-frontend', total_cycles: 8, impl_cycles: 5, review_cycles: 3, total_cost: 8.20, hours_span: 96.0 },
    { external_key: 'RHCLOUD-46300', title: 'Add dark mode toggle', status: 'in_progress', repo: 'settings-frontend', total_cycles: 8, impl_cycles: 6, review_cycles: 2, total_cost: 3.80, hours_span: 12.5 },
    { external_key: 'RHCLOUD-48200', title: 'CVE-2026-31847: Critical prototype pollution in lodash.merge', status: 'in_progress', repo: 'compliance-frontend', total_cycles: 6, impl_cycles: 6, review_cycles: 0, total_cost: 5.50, hours_span: 8.0 },
    { external_key: 'RHCLOUD-46280', title: 'Fix notification drawer pagination', status: 'pr_changes', repo: 'notifications-frontend', total_cycles: 5, impl_cycles: 3, review_cycles: 2, total_cost: 2.40, hours_span: 48.0 },
    { external_key: 'RHCLOUD-48310', title: 'Fix', status: 'pr_changes', repo: 'insights-chrome', total_cycles: 5, impl_cycles: 3, review_cycles: 2, total_cost: 2.90, hours_span: 30.0 },
    { external_key: 'RHCLOUD-47999', title: 'Migrate vulnerability table from PF5 to PF6', status: 'paused', repo: 'vulnerability-engine-frontend', total_cycles: 4, impl_cycles: 3, review_cycles: 1, total_cost: 3.20, hours_span: 144.0 },
    { external_key: 'RHCLOUD-46011', title: 'Move VA to top of dropdown', status: 'done', repo: 'astro-virtual-assistant-frontend', total_cycles: 4, impl_cycles: 2, review_cycles: 2, total_cost: 2.10, hours_span: 8.0 },
    { external_key: 'RHCLOUD-48300', title: 'Migrate cost management date picker from momentjs to date-fns', status: 'paused', repo: 'cost-management-frontend', total_cycles: 3, impl_cycles: 2, review_cycles: 1, total_cost: 3.80, hours_span: 96.0 },
    { external_key: 'RHCLOUD-46310', title: 'Add gzip compression middleware', status: 'pr_open', repo: 'chrome-service-backend', total_cycles: 3, impl_cycles: 2, review_cycles: 1, total_cost: 1.80, hours_span: 6.0 },
    { external_key: 'RHCLOUD-47600', title: 'Add unit tests for subscription expiration date formatting edge cases', status: 'done', repo: 'subscription-inventory-frontend', total_cycles: 2, impl_cycles: 1, review_cycles: 1, total_cost: 1.20, hours_span: 48.0 },
    { external_key: 'RHCLOUD-46165', title: 'Upgrade frontend-components-notifications', status: 'done', repo: 'widget-layout', total_cycles: 2, impl_cycles: 1, review_cycles: 1, total_cost: 0.90, hours_span: 3.0 },
    { external_key: 'RHCLOUD-48050', title: 'Add RBAC permission checks to CVE export button', status: 'pr_open', repo: 'vulnerability-engine-frontend', total_cycles: 2, impl_cycles: 1, review_cycles: 1, total_cost: 1.40, hours_span: 72.0 },
    { external_key: 'RHCLOUD-48055', title: 'Replace deprecated <Tabs> with PF6 <Tabs> in landing page hero section', status: 'pr_changes', repo: 'landing-page-frontend', total_cycles: 2, impl_cycles: 1, review_cycles: 1, total_cost: 1.10, hours_span: 60.0 },
    { external_key: 'RHCLOUD-48210', title: null, status: 'pr_open', repo: 'edge-frontend', total_cycles: 1, impl_cycles: 1, review_cycles: 0, total_cost: 0.80, hours_span: 12.0 },
    { external_key: 'RHCLOUD-48001', title: 'Fix', status: 'in_progress', repo: 'sources-ui', total_cycles: 1, impl_cycles: 1, review_cycles: 0, total_cost: 0.00, hours_span: 1.0 },
  ],
  feedback: { avg_review_rounds: 1.8, zero_review: 6, one_review: 8, multi_review: 8 },
};

const TAGS = ['bug-fix', 'patternfly', 'pf6-migration', 'css', 'review-feedback', 'feature', 'ui-change', 'cve', 'dependency-upgrade', 'triage', 'ci', 'security', 'github-actions', 'process', 'bot-workflow', 'testing', 'component-structure', 'performance', 'react', 'virtualization', 'migration', 'assets', 'e2e', 'playwright', 'ux', 'race-condition', 'critical', 'authentication', 'dev-server'];

const MOCK_TRANSCRIPT = `# Cycle Transcript — RHCLOUD-46300

## Context
Working on: Add dark mode toggle to settings page
Repository: settings-frontend
Branch: bot/RHCLOUD-46300

## Steps

### 1. Read the ticket
Fetched RHCLOUD-46300 from Jira. The request is to add a dark mode toggle to the user preferences section of the settings page.

### 2. Explore the codebase
Found the settings page component at \`src/pages/Settings/Preferences.tsx\`. It uses PatternFly v6 components.

### 3. Implement the toggle
Added a PF6 Switch component with localStorage persistence:
\`\`\`tsx
<Switch
  id="dark-mode-toggle"
  label="Dark mode"
  isChecked={isDarkMode}
  onChange={handleDarkModeToggle}
/>
\`\`\`

### 4. Run tests
All existing tests pass. Added new test for toggle behavior.

### 5. Create PR
Opened PR #245 with changes to 3 files.
`;

// ── Route Handlers ─────────────────────────────────────────

function parseUrl(url) {
  const [path, qs] = url.split('?');
  const params = Object.fromEntries(new URLSearchParams(qs || ''));
  return { path, params };
}

function json(res, data, status = 200) {
  res.writeHead(status, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
  res.end(JSON.stringify(data));
}

function text(res, data, status = 200) {
  res.writeHead(status, { 'Content-Type': 'text/plain', 'Access-Control-Allow-Origin': '*' });
  res.end(data);
}

function handleRequest(req, res) {
  const { path, params } = parseUrl(req.url);
  const method = req.method;

  // CORS preflight
  if (method === 'OPTIONS') {
    res.writeHead(204, { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Methods': 'GET,POST,DELETE,OPTIONS', 'Access-Control-Allow-Headers': 'Content-Type' });
    return res.end();
  }

  // Health check
  if (path === '/health') return json(res, { status: 'ok' });

  // Stats
  if (path === '/api/stats') {
    const tasksByStatus = {};
    for (const t of TASKS) tasksByStatus[t.status] = (tasksByStatus[t.status] || 0) + 1;
    tasksByStatus.total = TASKS.length;
    const instancesByState = {};
    for (const i of INSTANCES) instancesByState[i.state] = (instancesByState[i.state] || 0) + 1;
    instancesByState.total = INSTANCES.length;
    return json(res, {
      tasks: tasksByStatus,
      memories: { total: MEMORIES.length },
      instances: instancesByState,
    });
  }

  // Bot status (legacy single-instance)
  if (path === '/api/bot-status') {
    return json(res, {
      state: 'working',
      message: 'Implementing RHCLOUD-46300',
      external_key: 'RHCLOUD-46300',
      source_type: 'jira',
      source_url: 'https://issues.redhat.com/browse/RHCLOUD-46300',
      repo: 'settings-frontend',
      instance_id: 'bot-alpha',
      cycle_start: new Date(Date.now() - 12 * 60000).toISOString(),
      updated_at: new Date(Date.now() - 30000).toISOString(),
    });
  }

  // Instances
  if (path === '/api/instances' && method === 'GET') return json(res, INSTANCES);

  // Wake instance
  const wakeMatch = path.match(/^\/api\/instances\/([^/]+)\/wake$/);
  if (wakeMatch && method === 'POST') return json(res, { ok: true });

  // Tasks
  if (path === '/api/tasks' && method === 'GET') {
    let filtered = [...TASKS];
    if (params.status) filtered = filtered.filter(t => t.status === params.status);
    if (params.exclude_status) filtered = filtered.filter(t => t.status !== params.exclude_status);
    if (params.instance_id) filtered = filtered.filter(t => t.instance_id === params.instance_id);
    const offset = parseInt(params.offset || '0');
    const limit = parseInt(params.limit || '20');
    return json(res, { items: filtered.slice(offset, offset + limit), total: filtered.length });
  }

  // Delete task
  const taskDeleteMatch = path.match(/^\/api\/tasks\/([^/]+)$/);
  if (taskDeleteMatch && method === 'DELETE') return json(res, { ok: true });

  // Unarchive task
  const unarchiveMatch = path.match(/^\/api\/tasks\/([^/]+)\/unarchive$/);
  if (unarchiveMatch && method === 'POST') return json(res, { ok: true });

  // Memories
  if (path === '/api/memories' && method === 'GET') {
    let filtered = [...MEMORIES];
    if (params.category) filtered = filtered.filter(m => m.category === params.category);
    if (params.repo) filtered = filtered.filter(m => m.repo === params.repo);
    if (params.tag) filtered = filtered.filter(m => m.tags.includes(params.tag));
    const offset = parseInt(params.offset || '0');
    const limit = parseInt(params.limit || '20');
    return json(res, { items: filtered.slice(offset, offset + limit), total: filtered.length });
  }

  // Single memory
  const memoryMatch = path.match(/^\/api\/memories\/(\d+)$/);
  if (memoryMatch && method === 'GET') {
    const mem = MEMORIES.find(m => m.id === parseInt(memoryMatch[1]));
    return mem ? json(res, mem) : json(res, { error: 'Not found' }, 404);
  }
  if (memoryMatch && method === 'DELETE') return json(res, { ok: true });

  // Memory search
  if (path === '/api/memories/search') {
    const q = (params.q || '').toLowerCase();
    const results = MEMORIES.filter(m => m.title.toLowerCase().includes(q) || m.content.toLowerCase().includes(q))
      .map(m => ({ ...m, similarity: +(0.7 + Math.random() * 0.25).toFixed(4) }))
      .sort((a, b) => b.similarity - a.similarity);
    return json(res, results);
  }

  // Tags
  if (path === '/api/tags') return json(res, TAGS);

  // Embeddings (simplified 3D points)
  if (path === '/api/memories/embeddings') {
    const points = MEMORIES.map(m => ({
      id: m.id, title: m.title, content: m.content, category: m.category,
      repo: m.repo || '', tags: m.tags,
      x: (Math.random() - 0.5) * 10, y: (Math.random() - 0.5) * 10, z: (Math.random() - 0.5) * 10,
    }));
    return json(res, points);
  }

  // Costs
  if (path === '/api/costs') {
    const limit = parseInt(params.limit || '200');
    const entries = generateCostEntries(limit);
    const days = parseInt(params.days || '30');
    const dailyAggregates = generateDailyAggregates(days);
    return json(res, { entries, daily_aggregates: dailyAggregates, total: entries.length });
  }

  // Cycle runs
  if (path === '/api/cycle-runs' && method === 'GET') {
    let filtered = [...CYCLE_RUNS];
    if (params.task_id) {
      const tid = params.task_id === 'none' ? null : parseInt(params.task_id);
      filtered = filtered.filter(c => c.task_id === tid);
    }
    if (params.instance_id) filtered = filtered.filter(c => c.instance_id === params.instance_id);
    if (params.cycle_type) filtered = filtered.filter(c => c.cycle_type === params.cycle_type);
    return json(res, { items: filtered, total: filtered.length });
  }

  if (path === '/api/cycle-runs/by-task') return json(res, CYCLE_RUNS_BY_TASK);

  // Transcript
  const transcriptMatch = path.match(/^\/api\/cycle-runs\/(\d+)\/transcript$/);
  if (transcriptMatch) return text(res, MOCK_TRANSCRIPT);

  // Analytics
  if (path === '/api/analytics') return json(res, ANALYTICS);

  // Fallback
  json(res, { error: 'Not found', path }, 404);
}

// ── Server ─────────────────────────────────────────────────

const server = http.createServer(handleRequest);

// Try to set up WebSocket (requires `ws` package — graceful fallback if missing)
try {
  const wss = new WebSocketServer({ server, path: '/ws' });
  wss.on('connection', (ws) => {
    console.log('[ws] client connected');
    ws.send(JSON.stringify({ type: 'connected', data: { message: 'Mock WebSocket active' }, timestamp: Date.now() }));

    // Send periodic heartbeat
    const interval = setInterval(() => {
      if (ws.readyState === 1) {
        ws.send(JSON.stringify({ type: 'heartbeat', data: {}, timestamp: Date.now() }));
      }
    }, 30000);

    ws.on('close', () => { clearInterval(interval); console.log('[ws] client disconnected'); });
  });
  console.log('[ws] WebSocket server attached at /ws');
} catch {
  console.log('[ws] WebSocket not available (install `ws` for live updates)');
}

server.listen(PORT, () => {
  console.log(`\n  Mock API server running at http://localhost:${PORT}`);
  console.log(`  Health check: http://localhost:${PORT}/health`);
  console.log(`\n  Now run "npm run dev" in the dashboard/ directory to start the UI.\n`);
});
