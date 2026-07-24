import { useEffect, useState, useCallback } from 'react';
import type { Task } from '../types';
import { fetchTasks, unarchiveTask } from '../api';
import { useWS } from '../hooks/useWebSocket';
import TaskCard from '../components/TaskCard';
import DetailPanel from '../components/DetailPanel';
import Pagination from '../components/Pagination';
import { Label, Content } from '@patternfly/react-core';

const LIMIT = 20;

export default function ArchivedTasks({ instanceId }: { instanceId?: string }) {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [total, setTotal] = useState(0);
  const [offset, setOffset] = useState(0);
  const [selected, setSelected] = useState<Task | null>(null);

  const { onEvent } = useWS();

  const load = useCallback(async () => {
    const res = await fetchTasks({ status: 'archived', limit: LIMIT, offset, instance_id: instanceId });
    setTasks(res.items || []);
    setTotal(res.total || 0);
  }, [offset, instanceId]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    return onEvent((event) => {
      if (event.type === 'task_added' || event.type === 'task_updated' || event.type === 'task_archived') {
        load();
      }
    });
  }, [onEvent, load]);

  const handleUnarchive = async (key: string) => {
    await unarchiveTask(key);
    setSelected(null);
    load();
  };

  return (
    <div className="split-layout">
      <div className="split-main">
        <div style={{ marginBottom: '16px' }}>
          <Label variant="outline">{total} archived task{total !== 1 ? 's' : ''}</Label>
        </div>
        <div className="card-grid">
          {tasks.length === 0 && (
            <Content component="p" style={{ color: 'var(--pf-t--global--text--color--subtle, var(--text-dim))' }}>
              No archived tasks
            </Content>
          )}
          {tasks.map((t) => (
            <TaskCard
              key={t.id}
              task={t}
              selected={selected?.id === t.id}
              onClick={() => setSelected(t)}
            />
          ))}
        </div>
        <Pagination total={total} limit={LIMIT} offset={offset} onChange={setOffset} />
      </div>
      {selected && (
        <div className="split-detail">
          <DetailPanel
            type="task"
            task={selected}
            onClose={() => setSelected(null)}
            onUnarchive={handleUnarchive}
          />
        </div>
      )}
    </div>
  );
}
