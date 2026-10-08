import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { api, apiError } from '@/services/api';
import { useDebouncedValue } from '@/hooks/useDebouncedValue';
import { PageHeader } from '@/components/PageHeader';
import { StatusBadge } from '@/components/StatusBadge';
import { EmptyState } from '@/components/EmptyState';

export function People() {
  const qc = useQueryClient();
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebouncedValue(search);
  const [role, setRole] = useState('');
  const [status, setStatus] = useState('active');
  const [form, setForm] = useState({ name: '', email: '', password: '', role: 'worker', jobTitle: '', department: '' });

  const q = useQuery({
    queryKey: ['people', debouncedSearch, role, status],
    queryFn: async () => (await api.get('/users', { params: {
      ...(debouncedSearch ? { search: debouncedSearch } : {}),
      ...(role ? { role } : {}),
      ...(status ? { status } : {}),
    } })).data.users,
  });

  const create = useMutation({
    mutationFn: async () => (await api.post('/users', form)).data,
    onSuccess: () => {
      setForm({ name: '', email: '', password: '', role: 'worker', jobTitle: '', department: '' });
      qc.invalidateQueries({ queryKey: ['people'] });
    },
  });

  return (
    <>
      <PageHeader title="People" description="Employee identity, role, team context and account status." />

      <div className="panel">
        <h2>Create employee</h2>
        <div className="form-grid">
          <input className="input" placeholder="Name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          <input className="input" type="email" placeholder="Work email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
          <input className="input" type="password" placeholder="Initial password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} />
          <select className="input" value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })}><option value="worker">Worker</option><option value="team_lead">Team lead</option></select>
          <input className="input" placeholder="Job title" value={form.jobTitle} onChange={(e) => setForm({ ...form, jobTitle: e.target.value })} />
          <input className="input" placeholder="Department" value={form.department} onChange={(e) => setForm({ ...form, department: e.target.value })} />
          <button className="btn primary" disabled={!form.name.trim() || !form.email.trim() || !form.password || create.isPending} onClick={() => create.mutate()}>{create.isPending ? 'Creating…' : 'Create employee'}</button>
        </div>
        {create.isError ? <div className="alert danger">{apiError(create.error)}</div> : null}
      </div>

      <div className="toolbar filters-row">
        <input className="input search-input" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search name, email or department" />
        <select className="input filter-input" value={role} onChange={(e) => setRole(e.target.value)}><option value="">All roles</option><option value="worker">Worker</option><option value="team_lead">Team lead</option></select>
        <select className="input filter-input" value={status} onChange={(e) => setStatus(e.target.value)}><option value="active">Active</option><option value="inactive">Inactive</option><option value="">All status</option></select>
      </div>

      <div className="list-card">
        {q.isLoading ? <div className="loading">Loading people…</div> : null}
        {q.isError ? <div className="alert danger">{apiError(q.error)}</div> : null}
        {!q.isLoading && q.data?.length === 0 ? <EmptyState title="No matching employees" text="Adjust the filters or create an employee account." /> : null}
        {q.data?.map((user: any) => (
          <div className="list-row" key={user._id}>
            <div><strong>{user.name}</strong><span>{user.email} · {user.jobTitle || user.role} · {user.department || 'Company'}</span></div>
            <div className="row-meta"><StatusBadge value={user.status} /><span>{user.role.replace('_', ' ')}</span></div>
          </div>
        ))}
      </div>
    </>
  );
}
