import type { Task } from '../types';

export function makeTask(overrides: Partial<Task> = {}): Task {
  return {
    id: 1,
    external_key: 'RHCLOUD-001',
    source_type: 'jira',
    source_url: null,
    artifacts: [],
    status: 'in_progress',
    repo: 'org/repo',
    branch: 'feat-branch',
    title: 'Fix login bug',
    summary: null,
    created_at: new Date(Date.now() - 3600_000).toISOString(),
    last_addressed: new Date(Date.now() - 1800_000).toISOString(),
    paused_reason: null,
    instance_id: 'dev-bot',
    metadata: {},
    ...overrides,
  };
}
