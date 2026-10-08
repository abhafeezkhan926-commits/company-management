import type { ReactNode } from 'react';
export function MetricCard({ label, value, icon }: { label: string; value: string | number; icon?: ReactNode }) { return <div className="metric-card"><div><span>{label}</span><strong>{value}</strong></div><div className="metric-icon">{icon}</div></div>; }
