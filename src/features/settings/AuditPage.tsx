import { useQuery } from '@tanstack/react-query';
import { api, apiError } from '@/services/api';
import { PageHeader } from '@/components/PageHeader';
export function AuditPage(){const q=useQuery({queryKey:['audit'],queryFn:async()=> (await api.get('/audit')).data.logs});return <><PageHeader title="Audit logs" description="Traceable record of important management actions."/>{q.isError?<div className="alert danger">{apiError(q.error)}</div>:null}<div className="list-card">{q.data?.map((l:any)=><div className="list-row" key={l._id}><div><strong>{l.action}</strong><span>{l.actor?.name} · {l.entityType} · {l.createdAt?new Date(l.createdAt).toLocaleString():''}</span></div></div>)}</div></>}
