import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { api, apiError } from '@/services/api';
import { useDebouncedValue } from '@/hooks/useDebouncedValue';
import { PageHeader } from '@/components/PageHeader';
import { StatusBadge } from '@/components/StatusBadge';
import { EmptyState } from '@/components/EmptyState';

export function ProjectList({ admin = false }: { admin?: boolean }) {
  const qc = useQueryClient();
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebouncedValue(search);
  const [status, setStatus] = useState('');
  const [priority, setPriority] = useState('');
  const [form, setForm] = useState({ name: '', description: '', status: 'planning', priority: 'medium', dueDate: '', members: [] as string[] });

  const projects = useQuery({
    queryKey: ['projects', debouncedSearch, status, priority],
    queryFn: async () => (await api.get('/projects', { params: {
      ...(debouncedSearch ? { search: debouncedSearch } : {}),
      ...(status ? { status } : {}),
      ...(priority ? { priority } : {}),
    } })).data.projects,
  });

  const people = useQuery({
    queryKey: ['people', 'for-project'],
    enabled: admin,
    queryFn: async () => (await api.get('/users', { params: { status: 'active' } })).data.users,
  });

  const create = useMutation({
    mutationFn: async () => (await api.post('/projects', form)).data,
    onSuccess: () => {
      setForm({ name: '', description: '', status: 'planning', priority: 'medium', dueDate: '', members: [] });
      qc.invalidateQueries({ queryKey: ['projects'] });
      qc.invalidateQueries({ queryKey: ['dashboard'] });
    },
  });

  return (
    <>
      <PageHeader title="Projects" description="Project workspaces, status, milestones and delivery context." />

      {admin ? (
        <div className="panel">
          <h2>Create project</h2>
          <div className="form-grid">
            <input className="input" placeholder="Project name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            <input className="input" placeholder="Description" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
            <select className="input" value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}>
              <option value="planning">Planning</option><option value="active">Active</option><option value="on_hold">On hold</option><option value="completed">Completed</option>
            </select>
            <select className="input" value={form.priority} onChange={(e) => setForm({ ...form, priority: e.target.value })}>
              <option value="low">Low</option><option value="medium">Medium</option><option value="high">High</option><option value="critical">Critical</option>
            </select>
            <input className="input" type="date" value={form.dueDate} onChange={(e) => setForm({ ...form, dueDate: e.target.value })} />
            <select className="input" multiple value={form.members} onChange={(e) => setForm({ ...form, members: Array.from(e.target.selectedOptions, (option) => option.value) })}>
              {people.data?.filter((person: any) => person.role !== 'admin').map((person: any) => <option key={person._id} value={person._id}>{person.name} · {person.department || person.role}</option>)}
            </select>
            <button className="btn primary" disabled={!form.name.trim() || create.isPending} onClick={() => create.mutate()}>{create.isPending ? 'Saving…' : 'Create project'}</button>
          </div>
          {create.isError ? <div className="alert danger">{apiError(create.error)}</div> : null}
        </div>
      ) : null}

      <div className="toolbar filters-row">
        <input className="input search-input" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search projects" />
        <select className="input filter-input" value={status} onChange={(e) => setStatus(e.target.value)}>
          <option value="">All status</option><option value="planning">Planning</option><option value="active">Active</option><option value="on_hold">On hold</option><option value="completed">Completed</option>
        </select>
        <select className="input filter-input" value={priority} onChange={(e) => setPriority(e.target.value)}>
          <option value="">All priority</option><option value="low">Low</option><option value="medium">Medium</option><option value="high">High</option><option value="critical">Critical</option>
        </select>
        {(search || status || priority) ? <button className="btn" type="button" onClick={() => { setSearch(''); setStatus(''); setPriority(''); }}>Clear</button> : null}
      </div>

      <div className="list-card">
        {projects.isLoading ? <div className="loading">Loading projects…</div> : null}
        {projects.isError ? <div className="alert danger">{apiError(projects.error)}</div> : null}
        {!projects.isLoading && projects.data?.length === 0 ? <EmptyState title="No matching projects" text="Create a project or adjust your search and filters." /> : null}
        {projects.data?.map((project: any) => (
          <Link className="list-row" to={`${admin ? '/admin' : '/worker'}/projects/${project._id}`} key={project._id}>
            <div><strong>{project.name}</strong><span>{project.description || 'No description provided.'}</span></div>
            <div className="row-meta"><StatusBadge value={project.status} /><span>{project.progress ?? 0}%</span></div>
          </Link>
        ))}
      </div>
    </>
  );
}

export function ProjectDetail({ admin = false }: { admin?: boolean }) {
  const { id } = useParams();
  const q = useQuery({ queryKey: ['project', id], queryFn: async () => (await api.get(`/projects/${id}`)).data, enabled: !!id });

  return (
    <>
      <PageHeader title={q.data?.project?.name || 'Project'} description={q.data?.project?.description || 'Project workspace'} />
      {q.isError ? <div className="alert danger">{apiError(q.error)}</div> : null}
      <div className="metrics-grid compact-metrics">
        <div className="metric-card"><div><span>Status</span><strong><StatusBadge value={q.data?.project?.status} /></strong></div></div>
        <div className="metric-card"><div><span>Priority</span><strong>{q.data?.project?.priority || '—'}</strong></div></div>
        <div className="metric-card"><div><span>Progress</span><strong>{q.data?.project?.progress ?? 0}%</strong></div></div>
      </div>

      <div className="panel">
        <h2>Tasks</h2>
        {q.data?.tasks?.length === 0 ? <EmptyState title="No tasks yet" text="Create tasks from the task workspace and assign them to this project." /> : null}
        {q.data?.tasks?.map((task: any) => (
          <div className="list-row" key={task._id}>
            <div><strong>{task.title}</strong><span>{task.assignee?.name || 'Unassigned'} · {task.dueDate?.slice?.(0, 10) || 'No due date'}</span></div>
            <StatusBadge value={task.status} />
          </div>
        ))}
      </div>

      {admin ? <div className="panel"><h2>Team</h2><div className="member-pills">{q.data?.project?.members?.length ? q.data.project.members.map((member: any) => <span key={member._id}>{member.name}</span>) : <span className="muted">No members assigned.</span>}</div></div> : null}
    </>
  );
}
