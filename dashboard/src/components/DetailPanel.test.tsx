import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi } from 'vitest';
import DetailPanel from './DetailPanel';
import { makeTask } from '../test/helpers';

function renderTaskDetail(
  taskOverrides: Parameters<typeof makeTask>[0] = {},
  callbacks: {
    onPause?: (key: string) => void;
    onUnpause?: (key: string) => void;
    onDelete?: (key: string) => void;
  } = {},
) {
  const task = makeTask(taskOverrides);
  return render(
    <DetailPanel
      type="task"
      task={task}
      onClose={() => {}}
      onPause={callbacks.onPause}
      onUnpause={callbacks.onUnpause}
      onDelete={callbacks.onDelete}
    />,
  );
}

describe('DetailPanel — TaskDetail', () => {
  it('shows "Pause Task" button when onPause provided and status is in_progress', () => {
    renderTaskDetail({ status: 'in_progress' }, { onPause: vi.fn() });
    expect(screen.getByText('Pause Task')).toBeInTheDocument();
  });

  it('shows "Pause Task" button when status is pr_open', () => {
    renderTaskDetail({ status: 'pr_open' }, { onPause: vi.fn() });
    expect(screen.getByText('Pause Task')).toBeInTheDocument();
  });

  it('shows "Pause Task" button when status is pr_changes', () => {
    renderTaskDetail({ status: 'pr_changes' }, { onPause: vi.fn() });
    expect(screen.getByText('Pause Task')).toBeInTheDocument();
  });

  it('does NOT show "Pause Task" when status is paused', () => {
    renderTaskDetail({ status: 'paused' }, { onPause: vi.fn() });
    expect(screen.queryByText('Pause Task')).toBeNull();
  });

  it('does NOT show "Pause Task" when status is done', () => {
    renderTaskDetail({ status: 'done' }, { onPause: vi.fn() });
    expect(screen.queryByText('Pause Task')).toBeNull();
  });

  it('does NOT show "Pause Task" when onPause not provided', () => {
    renderTaskDetail({ status: 'in_progress' });
    expect(screen.queryByText('Pause Task')).toBeNull();
  });

  it('shows "Unpause Task" button when onUnpause provided and status is paused', () => {
    renderTaskDetail({ status: 'paused' }, { onUnpause: vi.fn() });
    expect(screen.getByText('Unpause Task')).toBeInTheDocument();
  });

  it('does NOT show "Unpause Task" when status is in_progress', () => {
    renderTaskDetail({ status: 'in_progress' }, { onUnpause: vi.fn() });
    expect(screen.queryByText('Unpause Task')).toBeNull();
  });

  it('shows "Archive Task" when onDelete provided and status is not archived', () => {
    renderTaskDetail({ status: 'in_progress' }, { onDelete: vi.fn() });
    expect(screen.getByText('Archive Task')).toBeInTheDocument();
  });

  it('does NOT show "Archive Task" when status is archived', () => {
    renderTaskDetail({ status: 'archived' }, { onDelete: vi.fn() });
    expect(screen.queryByText('Archive Task')).toBeNull();
  });

  it('shows paused_reason section when paused_reason is set', () => {
    renderTaskDetail({ paused_reason: 'Blocked by dependency' });
    expect(screen.getByText('Blocked by dependency')).toBeInTheDocument();
    expect(screen.getByText('Paused Reason')).toBeInTheDocument();
  });

  it('calls onPause with correct key when Pause button clicked', async () => {
    const user = userEvent.setup();
    const onPause = vi.fn();
    renderTaskDetail({ status: 'in_progress', external_key: 'RHCLOUD-555' }, { onPause });
    await user.click(screen.getByText('Pause Task'));
    expect(onPause).toHaveBeenCalledWith('RHCLOUD-555');
  });

  it('calls onUnpause with correct key when Unpause button clicked', async () => {
    const user = userEvent.setup();
    const onUnpause = vi.fn();
    renderTaskDetail({ status: 'paused', external_key: 'RHCLOUD-777' }, { onUnpause });
    await user.click(screen.getByText('Unpause Task'));
    expect(onUnpause).toHaveBeenCalledWith('RHCLOUD-777');
  });
});
