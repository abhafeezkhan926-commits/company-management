import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { api, apiError } from '@/services/api';
import { useDebouncedValue } from '@/hooks/useDebouncedValue';
import { PageHeader } from '@/components/PageHeader';
import { StatusBadge } from '@/components/StatusBadge';
import { EmptyState } from '@/components/EmptyState';

export function TaskList({ admin = false }: { admin?: boolean }) {
  const qc = useQueryClient();
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebouncedValue(search);
  const [status, setStatus] = useState('');
  const [priority, setPriority] = useState('');
  const [selected, setSelected] = useState<any>(null);
  const [workTask, setWorkTask] = useState<any>(null);
  const [log, setLog] = useState({ workDate: new Date().toISOString().slice(0, 10), hours: '', summary: '' });
  const [form, setForm] = useState({ title: '', description: '', project: '', assignee: '', priority: 'medium', dueDate: '' });

  const q = useQuery({
    queryKey: ['tasks', debouncedSearch, status, priority, admin],
    queryFn: async () => (await api.get('/tasks', {
      params: {
        ...(debouncedSearch ? { search: debouncedSearch } : {}),
        ...(status ? { status } : {}),
        ...(priority ? { priority } : {}),
      },
    })).data.tasks,
  });

  const projects = useQuery({
    queryKey: ['projects'],
    queryFn: async () => (await api.get('/projects')).data.projects,
    enabled: admin,
  });

  const people = useQuery({
    queryKey: ['people'],
    queryFn: async () => (await api.get('/users', { params: { status: 'active' } })).data.users,
    enabled: admin,
  });

  const update = useMutation({
    mutationFn: async ({ id, status: nextStatus }: { id: string; status: string }) => (await api.patch(`/tasks/${id}`, { status: nextStatus })).data,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['tasks'] });
      qc.invalidateQueries({ queryKey: ['dashboard'] });
      qc.invalidateQueries({ queryKey: ['projects'] });
    },
  });

  const create = useMutation({
    mutationFn: async () => (await api.post('/tasks', form)).data,
    onSuccess: () => {
      setForm({ title: '', description: '', project: '', assignee: '', priority: 'medium', dueDate: '' });
      qc.invalidateQueries({ queryKey: ['tasks'] });
      qc.invalidateQueries({ queryKey: ['projects'] });
      qc.invalidateQueries({ queryKey: ['dashboard'] });
    },
  });

  const work = useMutation({
    mutationFn: async () => (await api.post(`/tasks/${selected._id}/work-logs`, {
      workDate: log.workDate,
      hours: Number(log.hours),
      summary: log.summary,
    })).data,
    onSuccess: () => {
      setLog({ workDate: new Date().toISOString().slice(0, 10), hours: '', summary: '' });
      setSelected(null);
      qc.invalidateQueries({ queryKey: ['tasks'] });
      qc.invalidateQueries({ queryKey: ['notifications'] });
    },
  });

  const workLogs = useQuery({
    queryKey: ['worklogs', workTask?._id],
    queryFn: async () => (await api.get(`/tasks/${workTask._id}/work-logs`)).data.logs,
    enabled: !!workTask,
  });

  return (
    <>
      <PageHeader title="Tasks" description="Search, filter and update the work assigned by management." />

      {admin ? (
        <div className="panel">
          <h2>Create task</h2>
          <div className="form-grid">
            <input className="input" placeholder="Task title" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
            <input className="input" placeholder="Description" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
            <select className="input" value={form.project} onChange={(e) => setForm({ ...form, project: e.target.value })}>
              <option value="">Select project</option>
              {projects.data?.map((project: any) => <option key={project._id} value={project._id}>{project.name}</option>)}
            </select>
            <select className="input" value={form.assignee} onChange={(e) => setForm({ ...form, assignee: e.target.value })}>
              <option value="">Assign worker</option>
              {people.data?.filter((person: any) => person.role !== 'admin').map((person: any) => <option key={person._id} value={person._id}>{person.name}</option>)}
            </select>
            <select className="input" value={form.priority} onChange={(e) => setForm({ ...form, priority: e.target.value })}>
              <option value="low">Low</option><option value="medium">Medium</option><option value="high">High</option><option value="critical">Critical</option>
            </select>
            <input className="input" type="date" value={form.dueDate} onChange={(e) => setForm({ ...form, dueDate: e.target.value })} />
            <button className="btn primary" disabled={!form.title.trim() || !form.project || !form.assignee || create.isPending} onClick={() => create.mutate()}>
              {create.isPending ? 'Saving…' : 'Create task'}
            </button>
          </div>
          {!projects.isLoading && !projects.data?.length ? <div className="alert warning">Create a project first, then assign a task to it.</div> : null}
          {!people.isLoading && !people.data?.filter((person: any) => person.role !== 'admin').length ? <div className="alert warning">Create a worker account first so the task can be assigned.</div> : null}
          {create.isError ? <div className="alert danger">{apiError(create.error)}</div> : null}
        </div>
      ) : null}

      <div className="toolbar filters-row">
        <input className="input search-input" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search task title or description" />
        <select className="input filter-input" value={status} onChange={(e) => setStatus(e.target.value)}>
          <option value="">All status</option><option value="todo">Todo</option><option value="in_progress">In progress</option><option value="review">Review</option><option value="done">Done</option>
        </select>
        <select className="input filter-input" value={priority} onChange={(e) => setPriority(e.target.value)}>
          <option value="">All priority</option><option value="low">Low</option><option value="medium">Medium</option><option value="high">High</option><option value="critical">Critical</option>
        </select>
        {(search || status || priority) ? <button className="btn" type="button" onClick={() => { setSearch(''); setStatus(''); setPriority(''); }}>Clear</button> : null}
      </div>

      <div className="list-card">
        {q.isLoading ? <div className="loading">Loading tasks…</div> : null}
        {q.isError ? <div className="alert danger">{apiError(q.error)}</div> : null}
        {!q.isLoading && q.data?.length === 0 ? <EmptyState title="No matching tasks" text="Tasks created by management will appear here when they match your current filters." /> : null}
        {q.data?.map((task: any) => (
          <div className="list-row" key={task._id}>
            <div>
              <strong>{task.title}</strong>
              <span>{task.project?.name || 'Project'} · {task.assignee?.name || 'Unassigned'} · {task.dueDate?.slice?.(0, 10) || 'No due date'}</span>
            </div>
            <div className="row-actions">
              <StatusBadge value={task.status} />
              <select className="mini-select" value={task.status} onChange={(e) => update.mutate({ id: task._id, status: e.target.value })}>
                <option value="todo">Todo</option><option value="in_progress">In progress</option><option value="review">Review</option><option value="done">Done</option>
              </select>
              {admin ? <button className="btn small" onClick={() => setWorkTask(task)}>View work</button> : <button className="btn small" onClick={() => setSelected(task)}>Add work</button>}
            </div>
          </div>
        ))}
      </div>

      {selected ? (
        <div className="modal-backdrop">
          <div className="modal">
            <div className="page-header"><div><h2>Add work update</h2><p>{selected.title}</p></div><button className="icon-btn" onClick={() => setSelected(null)}>×</button></div>
            <div className="form-grid">
              <input className="input" type="date" value={log.workDate} onChange={(e) => setLog({ ...log, workDate: e.target.value })} />
              <input className="input" type="number" min="0.5" max="24" step="0.5" placeholder="Hours" value={log.hours} onChange={(e) => setLog({ ...log, hours: e.target.value })} />
              <textarea className="textarea" placeholder="What did you complete?" value={log.summary} onChange={(e) => setLog({ ...log, summary: e.target.value })} />
            </div>
            {work.isError ? <div className="alert danger">{apiError(work.error)}</div> : null}
            <button className="btn primary" disabled={!log.hours || !log.summary.trim() || work.isPending} onClick={() => work.mutate()}>{work.isPending ? 'Saving…' : 'Save work update'}</button>
          </div>
        </div>
      ) : null}

      {workTask ? (
        <div className="modal-backdrop">
          <div className="modal">
            <div className="page-header"><div><h2>Work history</h2><p>{workTask.title}</p></div><button className="icon-btn" onClick={() => setWorkTask(null)}>×</button></div>
            <div className="list-card compact">
              {workLogs.data?.length === 0 ? <EmptyState title="No work updates" text="The assigned worker has not submitted a work log yet." /> : null}
              {workLogs.data?.map((logEntry: any) => <div className="list-row" key={logEntry._id}><div><strong>{logEntry.worker?.name} · {logEntry.workDate?.slice?.(0, 10)}</strong><span>{logEntry.hours} hours · {logEntry.summary}</span></div></div>)}
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
