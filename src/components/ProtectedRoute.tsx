import { Navigate, Outlet } from 'react-router-dom';
import { useAuthStore } from '@/stores/auth';
export function ProtectedRoute({ role }: { role?: 'admin' | 'worker' }) { const user = useAuthStore(s => s.user); if (!user) return <Navigate to="/" replace />; if (role === 'admin' && user.role !== 'admin') return <Navigate to="/worker" replace />; if (role === 'worker' && user.role === 'admin') return <Navigate to="/admin" replace />; return <Outlet />; }
