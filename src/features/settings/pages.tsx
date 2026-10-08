import { useEffect, useRef, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Camera, LoaderCircle, Save } from 'lucide-react';
import { api, apiError } from '@/services/api';
import { PageHeader } from '@/components/PageHeader';
import { useAuthStore } from '@/stores/auth';

async function uploadAvatar(file: File) {
  const { data: signature } = await api.get('/profile/avatar-signature');

  const form = new FormData();
  form.append('file', file);
  form.append('api_key', signature.apiKey);
  form.append('timestamp', String(signature.timestamp));
  form.append('signature', signature.signature);
  form.append('folder', signature.folder);

  const response = await fetch(`https://api.cloudinary.com/v1_1/${signature.cloudName}/image/upload`, {
    method: 'POST',
    body: form,
  });

  const payload = await response.json();
  if (!response.ok || !payload.secure_url) {
    throw new Error(payload?.error?.message || 'Could not upload profile picture.');
  }

  const { data } = await api.patch('/profile/me', { avatarUrl: payload.secure_url });
  return data.user;
}

export function Profile() {
  const storedUser = useAuthStore((state) => state.user);
  const setUser = useAuthStore((state) => state.setUser);
  const qc = useQueryClient();
  const fileRef = useRef<HTMLInputElement>(null);

  const [name, setName] = useState(storedUser?.name || '');
  const [jobTitle, setJobTitle] = useState(storedUser?.jobTitle || '');
  const [department, setDepartment] = useState(storedUser?.department || '');
  const [phone, setPhone] = useState(storedUser?.phone || '');
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');

  const profileQuery = useQuery({
    queryKey: ['profile'],
    queryFn: async () => (await api.get('/profile/me')).data.user,
  });

  useEffect(() => {
    if (!profileQuery.data) return;
    setUser(profileQuery.data);
    setName(profileQuery.data.name || '');
    setJobTitle(profileQuery.data.jobTitle || '');
    setDepartment(profileQuery.data.department || '');
    setPhone(profileQuery.data.phone || '');
  }, [profileQuery.data, setUser]);

  const saveMutation = useMutation({
    mutationFn: async () => (await api.patch('/profile/me', { name, jobTitle, department, phone })).data.user,
    onSuccess: (user) => {
      setUser(user);
      setSuccess('Profile updated successfully.');
      setError('');
      qc.invalidateQueries({ queryKey: ['profile'] });
    },
    onError: (mutationError) => {
      setSuccess('');
      setError(apiError(mutationError));
    },
  });

  const avatarMutation = useMutation({
    mutationFn: uploadAvatar,
    onSuccess: (user) => {
      setUser(user);
      setSuccess('Profile picture updated.');
      setError('');
      qc.invalidateQueries({ queryKey: ['profile'] });
    },
    onError: (mutationError) => {
      setSuccess('');
      setError(apiError(mutationError));
    },
  });

  const user = profileQuery.data || storedUser;
  const initial = user?.name?.slice(0, 1).toUpperCase() || 'U';

  return (
    <>
      <PageHeader title="Profile" description="Your identity, organization and account settings." />

      <div className="profile-layout">
        <section className="panel profile-hero-card">
          <div className="profile-avatar-wrap">
            {user?.avatarUrl ? (
              <img src={user.avatarUrl} alt={user.name} className="profile-avatar" />
            ) : (
              <div className="profile-avatar profile-avatar-fallback">{initial}</div>
            )}
            <button
              type="button"
              className="avatar-upload-btn"
              onClick={() => fileRef.current?.click()}
              disabled={avatarMutation.isPending}
              aria-label="Change profile picture"
            >
              {avatarMutation.isPending ? <LoaderCircle size={16} className="spin" /> : <Camera size={16} />}
            </button>
            <input
              ref={fileRef}
              type="file"
              accept="image/png,image/jpeg,image/webp"
              hidden
              onChange={(event) => {
                const file = event.target.files?.[0];
                if (file) avatarMutation.mutate(file);
                event.currentTarget.value = '';
              }}
            />
          </div>

          <div className="profile-hero-copy">
            <span className="eyebrow">Account profile</span>
            <h2>{user?.name}</h2>
            <p>{user?.jobTitle || user?.role?.replace('_', ' ')}</p>
            <span className="profile-email">{user?.email}</span>
          </div>
        </section>

        <section className="panel">
          <div className="section-head-row">
            <div>
              <h2>Personal details</h2>
              <p className="muted">Keep your account information current.</p>
            </div>
            <span className="badge info">{user?.role?.replace('_', ' ')}</span>
          </div>

          <div className="form-grid profile-form-grid">
            <label className="field">
              <span>Full name</span>
              <input className="input" value={name} onChange={(event) => setName(event.target.value)} />
            </label>

            <label className="field">
              <span>Email</span>
              <input className="input" value={user?.email || ''} disabled />
            </label>

            <label className="field">
              <span>Job title</span>
              <input className="input" value={jobTitle} onChange={(event) => setJobTitle(event.target.value)} />
            </label>

            <label className="field">
              <span>Department</span>
              <input className="input" value={department} onChange={(event) => setDepartment(event.target.value)} />
            </label>

            <label className="field">
              <span>Phone</span>
              <input className="input" value={phone} onChange={(event) => setPhone(event.target.value)} />
            </label>
          </div>

          {error ? <div className="alert danger profile-alert">{error}</div> : null}
          {success ? <div className="alert success profile-alert">{success}</div> : null}

          <div className="profile-form-actions">
            <button className="btn primary" type="button" disabled={saveMutation.isPending} onClick={() => saveMutation.mutate()}>
              <Save size={16} />
              {saveMutation.isPending ? 'Saving…' : 'Save changes'}
            </button>
          </div>
        </section>
      </div>
    </>
  );
}

export function AdminSettings() {
  return (
    <>
      <PageHeader title="Settings" description="Administrative application settings and environment boundaries." />
      <div className="panel">
        <h2>Security boundary</h2>
        <p className="muted">JWT validation, role checks and business rules stay on the backend. Client permissions mirror the effective role but never replace server authorization.</p>
      </div>
    </>
  );
}

export function Audit() {
  return null;
}
