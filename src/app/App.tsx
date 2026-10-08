import { BrowserRouter, Navigate, Outlet, Route, Routes } from 'react-router-dom';
import { useEffect } from 'react';
import { QueryProvider } from './QueryProvider';
import { EntryPage, LoginPage, SignupPage } from '@/features/auth/Auth';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import { AppShell } from '@/components/AppShell';
import { WorkerDashboard, AdminDashboard } from '@/features/dashboard/pages';
import { ProjectList, ProjectDetail } from '@/features/projects/pages';
import { TaskList } from '@/features/tasks/pages';
import { WorkerAttendance, AdminAttendance } from '@/features/attendance/pages';
import { WorkerLeave, AdminLeave } from '@/features/leave/pages';
import { AdminApprovals } from '@/features/approvals/pages';
import { People } from '@/features/people/pages';
import { Notifications } from '@/features/notifications/pages';
import { Profile, AdminSettings } from '@/features/settings/pages';
import { AuditPage } from '@/features/settings/AuditPage';
import { Reports } from '@/features/reports/pages';
import { Teams } from '@/features/teams/pages';
import { Documents } from '@/features/documents/pages';
import { Announcements } from '@/features/announcements/pages';
import { Messages } from '@/features/messages/pages';
import { useAuthStore } from '@/stores/auth';
import { connectSocket } from '@/services/socket';

function SessionSocket() {
  const token = useAuthStore((state) => state.token);
  useEffect(() => {
    if (!token) return;
    connectSocket(token);
  }, [token]);
  return null;
}

function WorkerLayout() { return <AppShell><Outlet /></AppShell>; }
function AdminLayout() { return <AppShell admin><Outlet /></AppShell>; }

export function App() {
  return (
    <QueryProvider>
      <BrowserRouter>
        <SessionSocket />
        <Routes>
          <Route path="/" element={<EntryPage />} />
          <Route path="/login/worker" element={<LoginPage role="worker" />} />
          <Route path="/login/admin" element={<LoginPage role="admin" />} />
          <Route path="/signup" element={<SignupPage />} />

          <Route element={<ProtectedRoute role="worker" />}>
            <Route path="/worker" element={<WorkerLayout />}>
              <Route index element={<WorkerDashboard />} />
              <Route path="projects" element={<ProjectList />} />
              <Route path="projects/:id" element={<ProjectDetail />} />
              <Route path="tasks" element={<TaskList />} />
              <Route path="attendance" element={<WorkerAttendance />} />
              <Route path="leave" element={<WorkerLeave />} />
              <Route path="messages" element={<Messages />} />
              <Route path="announcements" element={<Announcements />} />
              <Route path="notifications" element={<Notifications />} />
              <Route path="profile" element={<Profile />} />
              <Route path="*" element={<Navigate to="/worker" replace />} />
            </Route>
          </Route>

          <Route element={<ProtectedRoute role="admin" />}>
            <Route path="/admin" element={<AdminLayout />}>
              <Route index element={<AdminDashboard />} />
              <Route path="projects" element={<ProjectList admin />} />
              <Route path="projects/:id" element={<ProjectDetail admin />} />
              <Route path="tasks" element={<TaskList admin />} />
              <Route path="people" element={<People />} />
              <Route path="teams" element={<Teams />} />
              <Route path="attendance" element={<AdminAttendance />} />
              <Route path="approvals" element={<AdminApprovals />} />
              <Route path="leave" element={<AdminLeave />} />
              <Route path="messages" element={<Messages />} />
              <Route path="announcements" element={<Announcements />} />
              <Route path="notifications" element={<Notifications />} />
              <Route path="reports" element={<Reports />} />
              <Route path="profile" element={<Profile />} />
              <Route path="documents" element={<Documents />} />
              <Route path="audit" element={<AuditPage />} />
              <Route path="settings" element={<AdminSettings />} />
              <Route path="*" element={<Navigate to="/admin" replace />} />
            </Route>
          </Route>

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </QueryProvider>
  );
}
