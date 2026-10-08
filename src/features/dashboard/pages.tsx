import { useQuery } from '@tanstack/react-query';
import { api, apiError } from '@/services/api';
import { MetricCard } from '@/components/MetricCard';
import { PageHeader } from '@/components/PageHeader';
import { FolderKanban, ListTodo, Clock3, CheckSquare, Users, CalendarDays } from 'lucide-react';

export function WorkerDashboard() {
  const q = useQuery({ queryKey: ['dashboard','worker'], queryFn: async () => (await api.get('/dashboard/worker')).data });
  return <><PageHeader title="My workspace" description="Your current operational view across projects, tasks and attendance." />{q.isError ? <div className="alert danger">{apiError(q.error)}</div> : null}<div className="metrics-grid"><MetricCard label="Open tasks" value={q.data?.metrics.assignedTasks ?? '—'} icon={<ListTodo size={20}/>}/><MetricCard label="My projects" value={q.data?.metrics.myProjects ?? '—'} icon={<FolderKanban size={20}/>}/><MetricCard label="Today attendance" value={q.data?.metrics.attendanceStatus ?? '—'} icon={<Clock3 size={20}/>}/></div><div className="panel"><h2>Working focus</h2><p className="muted">Open Tasks contains the work assigned to you by the management team. Update task status and submit work logs from each task.</p></div></>;
}

export function AdminDashboard() {
  const q = useQuery({ queryKey: ['dashboard','admin'], queryFn: async () => (await api.get('/dashboard/admin')).data });
  const m = q.data?.metrics;
  return <><PageHeader title="Operations overview" description={q.data?.dateKey ? `Operational status for ${q.data.dateKey}.` : 'Current company operational status.'}/>{q.isError ? <div className="alert danger">{apiError(q.error as Error)}</div> : null}<div className="metrics-grid"><MetricCard label="Active workers" value={m?.workers ?? '—'} icon={<Users size={20}/>}/><MetricCard label="Active projects" value={m?.activeProjects ?? '—'} icon={<FolderKanban size={20}/>}/><MetricCard label="Open tasks" value={m?.openTasks ?? '—'} icon={<ListTodo size={20}/>}/><MetricCard label="Present today" value={m?.presentToday ?? '—'} icon={<Clock3 size={20}/>}/><MetricCard label="Attendance requests" value={m?.pendingAttendance ?? '—'} icon={<CheckSquare size={20}/>}/><MetricCard label="Leave requests" value={m?.pendingLeave ?? '—'} icon={<CalendarDays size={20}/>}/></div><div className="grid-2"><div className="panel"><h2>Primary workflow</h2><p className="muted">Projects → Tasks → Work logs. Use task status and work updates to track execution.</p></div><div className="panel"><h2>Daily attendance</h2><p className="muted">Workers are marked present on successful login. Workers without a record are marked absent when today’s admin attendance view is opened.</p></div></div></>;
}
