import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { api, apiError } from '@/services/api';
import { PageHeader } from '@/components/PageHeader';
import { EmptyState } from '@/components/EmptyState';
import { useAuthStore } from '@/stores/auth';

export function Announcements() {
  const user = useAuthStore((state) => state.user);
  const qc = useQueryClient();
  const [form, setForm] = useState({ title: '', body: '' });

  const q = useQuery({
    queryKey: ['announcements'],
    queryFn: async () => (await api.get('/announcements')).data.announcements,
    refetchInterval: 20000,
  });

  const create = useMutation({
    mutationFn: async () => (await api.post('/announcements', form)).data,
    onSuccess: () => {
      setForm({ title: '', body: '' });
      qc.invalidateQueries({ queryKey: ['announcements'] });
      qc.invalidateQueries({ queryKey: ['notifications'] });
    },
  });

  return (
    <>
      <PageHeader
        title="Announcements"
        description="Company-wide updates and operational notices."
      />

      {user?.role === 'admin' ? (
        <div className="panel">
          <h2>Post an announcement</h2>
          <div className="form-grid">
            <input
              className="input"
              placeholder="Announcement title"
              value={form.title}
              onChange={(event) => setForm({ ...form, title: event.target.value })}
            />
            <textarea
              className="textarea"
              placeholder="Write the company update..."
              value={form.body}
              onChange={(event) => setForm({ ...form, body: event.target.value })}
            />
            <button
              className="btn primary"
              type="button"
              disabled={!form.title.trim() || !form.body.trim() || create.isPending}
              onClick={() => create.mutate()}
            >
              {create.isPending ? 'Publishing…' : 'Publish announcement'}
            </button>
          </div>
          {create.isError ? <div className="alert danger">{apiError(create.error)}</div> : null}
        </div>
      ) : null}

      <div className="list-card">
        {q.isLoading ? <div className="loading">Loading announcements…</div> : null}
        {q.isError ? <div className="alert danger">{apiError(q.error)}</div> : null}
        {q.data?.length === 0 ? (
          <EmptyState title="No announcements" text="Company updates will appear here when management publishes them." />
        ) : null}
        {q.data?.map((announcement: any) => (
          <article className="announcement-row" key={announcement._id}>
            <div>
              <strong>{announcement.title}</strong>
              <p>{announcement.body}</p>
            </div>
            <span>{announcement.publishedAt ? new Date(announcement.publishedAt).toLocaleString() : ''}</span>
          </article>
        ))}
      </div>
    </>
  );
}
