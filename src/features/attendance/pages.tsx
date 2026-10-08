import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api, apiError } from '@/services/api';
import { useState } from 'react';
import { PageHeader } from '@/components/PageHeader';
import { StatusBadge } from '@/components/StatusBadge';
import { EmptyState } from '@/components/EmptyState';

export function WorkerAttendance() {
  const qc=useQueryClient(); const [reason,setReason]=useState(''); const [dateKey,setDateKey]=useState(new Date().toISOString().slice(0,10));
  const q=useQuery({queryKey:['attendance','me'],queryFn:async()=> (await api.get('/attendance/me')).data});
  const rq=useQuery({queryKey:['attendance','requests'],queryFn:async()=> (await api.get('/attendance/requests/me')).data.requests});
  const m=useMutation({mutationFn:async()=> (await api.post('/attendance/requests',{dateKey,reason})).data,onSuccess:()=>{setReason('');qc.invalidateQueries({queryKey:['attendance','requests']});}});
  return <><PageHeader title="Attendance" description="Today’s status, recent history and attendance corrections."/><div className="panel highlight"><div><span className="eyebrow">Today</span><h2><StatusBadge value={q.data?.today?.status||'absent'}/></h2><p className="muted">Successful login records you as present for the current local date.</p></div></div><div className="grid-2"><div className="panel"><h2>Request attendance correction</h2><div className="form-grid"><input className="input" type="date" value={dateKey} onChange={e=>setDateKey(e.target.value)}/><textarea className="textarea" value={reason} onChange={e=>setReason(e.target.value)} placeholder="Explain why the attendance record needs correction."/><button className="btn primary" disabled={!reason || m.isPending} onClick={()=>m.mutate()}>{m.isPending?'Sending…':'Send request'}</button></div>{m.isError?<div className="alert danger">{apiError(m.error)}</div>:null}</div><div className="panel"><h2>Recent attendance</h2><div className="list-card compact">{q.data?.records?.length===0?<EmptyState title="No attendance records" text="Your records will appear after login or an approved correction."/>:null}{q.data?.records?.map((r:any)=><div className="list-row" key={`${r.dateKey}-${r._id||r.status}`}><div><strong>{r.dateKey}</strong><span>{r.loginAt?new Date(r.loginAt).toLocaleTimeString():''}</span></div><StatusBadge value={r.status}/></div>)}</div></div></div><div className="panel"><h2>My requests</h2><div className="list-card compact">{rq.data?.length===0?<EmptyState title="No requests" text="Attendance correction requests will appear here."/>:null}{rq.data?.map((r:any)=><div className="list-row" key={r._id}><div><strong>{r.dateKey}</strong><span>{r.reason}</span></div><StatusBadge value={r.status}/></div>)}</div></div></>;
}

export function AdminAttendance(){
  const q=useQuery({queryKey:['attendance','today'],queryFn:async()=> (await api.get('/attendance/today')).data});
  return <><PageHeader title="Attendance overview" description={q.data?.dateKey ? `Daily attendance for ${q.data.dateKey}.` : 'Current employee attendance.'}/><div className="list-card">{q.isLoading?<div className="loading">Preparing today’s attendance…</div>:null}{q.data?.rows?.map((row:any)=><div className="list-row" key={row.worker._id}><div><strong>{row.worker.name}</strong><span>{row.worker.jobTitle||row.worker.role} · {row.worker.department||'Company'}</span></div><div className="row-meta"><StatusBadge value={row.attendance?.status||'absent'}/><span>{row.attendance?.loginAt?new Date(row.attendance.loginAt).toLocaleTimeString():'No login'}</span></div></div>)}{q.data?.rows?.length===0?<EmptyState title="No workers yet" text="Create or sign up worker accounts to populate this view."/>:null}</div></>;
}
