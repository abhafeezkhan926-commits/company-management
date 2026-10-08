import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import { api, apiError } from '@/services/api';
import { PageHeader } from '@/components/PageHeader';
import { EmptyState } from '@/components/EmptyState';
import { useAuthStore } from '@/stores/auth';

export function Messages() {
  const user = useAuthStore((state) => state.user);
  const qc = useQueryClient();
  const [body, setBody] = useState('');
  const [recipient, setRecipient] = useState('');

  const messagesQuery = useQuery({
    queryKey: ['messages'],
    queryFn: async () => (await api.get('/messages')).data,
    refetchInterval: 15000,
  });

  const workersQuery = useQuery({
    queryKey: ['people', 'message-recipients'],
    queryFn: async () => (await api.get('/users', { params: { status: 'active' } })).data.users,
    enabled: user?.role === 'admin',
  });

  useEffect(() => {
    const incoming = messagesQuery.data?.messages?.filter((message: any) =>
      String(message.recipient?._id) === String(user?.id) && !message.readAt
    ) || [];

    if (!incoming.length) return;
    Promise.all(incoming.map((message: any) => api.patch(`/messages/${message._id}/read`)))
      .then(() => qc.invalidateQueries({ queryKey: ['messages'] }))
      .catch(() => undefined);
  }, [messagesQuery.data, user?.id, qc]);

  const send = useMutation({
    mutationFn: async () => (await api.post('/messages', { body, recipient: recipient || undefined })).data,
    onSuccess: () => {
      setBody('');
      setRecipient('');
      qc.invalidateQueries({ queryKey: ['messages'] });
      qc.invalidateQueries({ queryKey: ['notifications'] });
    },
  });

  return (
    <>
      <PageHeader
        title="Messages"
        description="Direct operational communication between workers and management."
      />

      <div className="panel">
        <h2>Send a message</h2>
        <div className="form-grid">
          {user?.role === 'admin' ? (
            <select className="input" value={recipient} onChange={(event) => setRecipient(event.target.value)}>
              <option value="">Select worker</option>
              {workersQuery.data?.filter((worker: any) => worker.role !== 'admin').map((worker: any) => (
                <option key={worker._id} value={worker._id}>
                  {worker.name} · {worker.department || worker.role}
                </option>
              ))}
            </select>
          ) : null}

          <textarea
            className="textarea"
            placeholder="Write an operational message..."
            value={body}
            onChange={(event) => setBody(event.target.value)}
          />

          <button
            className="btn primary"
            type="button"
            disabled={!body.trim() || (user?.role === 'admin' && !recipient) || send.isPending}
            onClick={() => send.mutate()}
          >
            {send.isPending ? 'Sending…' : 'Send message'}
          </button>
        </div>
        {send.isError ? <div className="alert danger">{apiError(send.error)}</div> : null}
      </div>

      <div className="list-card">
        {messagesQuery.isLoading ? <div className="loading">Loading messages…</div> : null}
        {messagesQuery.isError ? <div className="alert danger">{apiError(messagesQuery.error)}</div> : null}
        {messagesQuery.data?.messages?.length === 0 ? (
          <EmptyState title="No messages yet" text="Operational messages will appear here." />
        ) : null}

        {messagesQuery.data?.messages?.map((message: any) => {
          const incoming = String(message.recipient?._id) === String(user?.id);
          return (
            <div className="list-row" key={message._id}>
              <div>
                <strong>{incoming ? message.sender?.name : `To ${message.recipient?.name}`}</strong>
                <span>{message.body}</span>
              </div>
              <div className="row-meta">
                <span>{message.createdAt ? new Date(message.createdAt).toLocaleString() : ''}</span>
              </div>
            </div>
          );
        })}
      </div>
    </>
  );
}
