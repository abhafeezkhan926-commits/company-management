
import type React from 'react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Bell,
  CalendarDays,
  CheckSquare,
  Clock3,
  FileClock,
  FolderKanban,
  LayoutDashboard,
  ListTodo,
  LogOut,
  MessageSquare,
  Menu,
  Search,
  Settings,
  UserCircle,
  Users,
  X,
} from 'lucide-react';
import { useAuthStore } from '@/stores/auth';
import { disconnectSocket, getSocket } from '@/services/socket';
import { api } from '@/services/api';
import { Logo } from './Logo';

const workerLinks = [
  ['/worker', 'Dashboard', LayoutDashboard, 'dashboard'],
  ['/worker/projects', 'Projects', FolderKanban, 'projects'],
  ['/worker/tasks', 'Tasks', ListTodo, 'tasks'],
  ['/worker/attendance', 'Attendance', Clock3, 'attendance'],
  ['/worker/leave', 'Leave', CalendarDays, 'leave'],
  ['/worker/messages', 'Messages', MessageSquare, 'messages'],
  ['/worker/announcements', 'Announcements', Bell, 'announcements'],
  ['/worker/profile', 'Profile', UserCircle, 'profile'],
] as const;

const adminLinks = [
  ['/admin', 'Overview', LayoutDashboard, 'dashboard'],
  ['/admin/projects', 'Projects', FolderKanban, 'projects'],
  ['/admin/tasks', 'Tasks', ListTodo, 'tasks'],
  ['/admin/people', 'People', Users, 'people'],
  ['/admin/teams', 'Teams', Users, 'teams'],
  ['/admin/attendance', 'Attendance', Clock3, 'attendance'],
  ['/admin/approvals', 'Approvals', CheckSquare, 'approvals'],
  ['/admin/leave', 'Leave', CalendarDays, 'leave'],
  ['/admin/messages', 'Messages', MessageSquare, 'messages'],
  ['/admin/announcements', 'Announcements', Bell, 'announcements'],
  ['/admin/reports', 'Reports', FileClock, 'reports'],
  ['/admin/documents', 'Documents', FileClock, 'documents'],
  ['/admin/audit', 'Audit Logs', FileClock, 'audit'],
  ['/admin/settings', 'Settings', Settings, 'settings'],
] as const;

function useDebouncedValue(value: string, delay = 220) {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const timer = window.setTimeout(() => setDebounced(value), delay);
    return () => window.clearTimeout(timer);
  }, [value, delay]);
  return debounced;
}

function routeForSection(section: string, admin: boolean) {
  const base = admin ? '/admin' : '/worker';
  const map: Record<string, string> = {
    tasks: `${base}/tasks`,
    approvals: `${base}/approvals`,
    attendance: `${base}/attendance`,
    leave: `${base}/leave`,
    messages: `${base}/messages`,
    announcements: `${base}/announcements`,
    notifications: `${base}/notifications`,
  };
  return map[section] || `${base}/notifications`;
}

export function AppShell({ children, admin = false }: { children: React.ReactNode; admin?: boolean }) {
  const user = useAuthStore((state) => state.user);
  const clear = useAuthStore((state) => state.clear);
  const navigate = useNavigate();
  const location = useLocation();
  const qc = useQueryClient();
  const links = admin ? adminLinks : workerLinks;

  const [search, setSearch] = useState('');
  const [searchOpen, setSearchOpen] = useState(false);
  const [notificationOpen, setNotificationOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);
  const headerActionsRef = useRef<HTMLDivElement>(null);
  const sidebarRef = useRef<HTMLElement>(null);
  const overviewButtonRef = useRef<HTMLButtonElement>(null);
  const debouncedSearch = useDebouncedValue(search);

  const notifications = useQuery({
    queryKey: ['notifications'],
    queryFn: async () => (await api.get('/notifications')).data.notifications,
    refetchInterval: 20000,
  });

  const searchQuery = useQuery({
    queryKey: ['global-search', debouncedSearch, admin],
    queryFn: async () => (await api.get('/search', { params: { q: debouncedSearch } })).data,
    enabled: debouncedSearch.trim().length >= 2,
    staleTime: 1000,
  });

  const unreadBySection = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const notification of notifications.data || []) {
      if (notification.readAt) continue;
      const section = notification.section || 'notifications';
      counts[section] = (counts[section] || 0) + 1;
    }
    return counts;
  }, [notifications.data]);

  const unreadTotal = useMemo(
    () => Object.values(unreadBySection).reduce((total, count) => total + count, 0),
    [unreadBySection],
  );

  useEffect(() => {
    const socket = getSocket();
    if (!socket) return;

    const invalidate = () => {
      qc.invalidateQueries({ queryKey: ['notifications'] });
      qc.invalidateQueries({ queryKey: ['messages'] });
      qc.invalidateQueries({ queryKey: ['tasks'] });
      qc.invalidateQueries({ queryKey: ['projects'] });
      qc.invalidateQueries({ queryKey: ['dashboard'] });
      qc.invalidateQueries({ queryKey: ['attendance'] });
      qc.invalidateQueries({ queryKey: ['leave'] });
      qc.invalidateQueries({ queryKey: ['approvals'] });
      qc.invalidateQueries({ queryKey: ['announcements'] });
      qc.invalidateQueries({ queryKey: ['profile'] });
    };

    const names = [
      'notification',
      'task:updated',
      'worklog:created',
      'attendance:updated',
      'attendance-request:new',
      'leave:updated',
      'leave-request:new',
      'message:new',
      'announcement:new',
    ];
    names.forEach((name) => socket.on(name, invalidate));
    return () => names.forEach((name) => socket.off(name, invalidate));
  }, [qc, user?.id]);

  useEffect(() => {
    const pathname = location.pathname;
    let section = '';
    if (pathname.includes('/tasks')) section = 'tasks';
    else if (pathname.includes('/approvals')) section = 'approvals';
    else if (pathname.includes('/attendance')) section = 'attendance';
    else if (pathname.includes('/leave')) section = 'leave';
    else if (pathname.includes('/messages')) section = 'messages';
    else if (pathname.includes('/announcements')) section = 'announcements';
    if (!section) return;
    api.patch('/notifications/read-section', { section }).then(() => qc.invalidateQueries({ queryKey: ['notifications'] })).catch(() => undefined);
  }, [location.pathname, qc]);

  useEffect(() => {
    const listener = (event: MouseEvent) => {
      const target = event.target as Node;

      if (searchRef.current && !searchRef.current.contains(target)) {
        setSearchOpen(false);
      }

      if (headerActionsRef.current && !headerActionsRef.current.contains(target)) {
        setNotificationOpen(false);
        setProfileOpen(false);
      }

      if (sidebarOpen) {
        const clickedSidebar = sidebarRef.current?.contains(target);
        const clickedOverviewButton = overviewButtonRef.current?.contains(target);

        if (!clickedSidebar && !clickedOverviewButton) {
          setSidebarOpen(false);
        }
      }
    };

    document.addEventListener('mousedown', listener);
    return () => document.removeEventListener('mousedown', listener);
  }, [sidebarOpen]);

  useEffect(() => {
    setSidebarOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    if (!sidebarOpen) return;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setSidebarOpen(false);
        overviewButtonRef.current?.focus();
      }
    };

    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [sidebarOpen]);

  function logout() {
    disconnectSocket();
    clear();
    navigate('/');
  }

  const goResult = (path: string) => {
    setSearch('');
    setSearchOpen(false);
    navigate(path);
  };

  async function openNotification(notification: any) {
    try {
      if (!notification.readAt) {
        await api.patch(`/notifications/${notification._id}/read`);
        qc.invalidateQueries({ queryKey: ['notifications'] });
      }
    } finally {
      setNotificationOpen(false);
      navigate(routeForSection(notification.section, admin));
    }
  }

  const recentNotifications = notifications.data?.slice(0, 6) || [];
  const userInitial = user?.name?.trim()?.slice(0, 1).toUpperCase() || 'U';

  return (
    <div className="app-shell">
      {sidebarOpen ? (
        <button
          type="button"
          className="sidebar-overlay"
          aria-label="Close navigation"
          onClick={() => setSidebarOpen(false)}
        />
      ) : null}

      <aside
        id="primary-navigation"
        ref={sidebarRef}
        className={`sidebar ${sidebarOpen ? 'open' : ''}`}
        aria-label="Primary navigation"
        aria-hidden={!sidebarOpen}
      >
        <div className="sidebar-brand">
          <Logo />
        </div>

        <nav>
          {links.map(([to, label, Icon, section]) => (
            <NavLink
              key={to}
              to={to}
              end={to === '/worker' || to === '/admin'}
              title={label}
              className={({ isActive }) => (isActive ? 'nav-link active' : 'nav-link')}
              onClick={() => setSidebarOpen(false)}
            >
              <span className="nav-icon-wrap">
                <Icon size={19} />
                <span className={`nav-dot ${unreadBySection[section] ? 'show' : ''}`} />
              </span>
              <span className="nav-label">{label}</span>
              {unreadBySection[section] ? (
                <span className="nav-count">{unreadBySection[section] > 9 ? '9+' : unreadBySection[section]}</span>
              ) : null}
            </NavLink>
          ))}
        </nav>
      </aside>

      <main className="main">
        <header className="topbar">
          <div className="topbar-start">
            <button
              ref={overviewButtonRef}
              type="button"
              className={`overview-trigger ${sidebarOpen ? 'active' : ''}`}
              onClick={() => setSidebarOpen((open) => !open)}
              aria-expanded={sidebarOpen}
              aria-controls="primary-navigation"
              title="Open navigation"
            >
              <Menu size={18} />
              <span>Overview</span>
            </button>
          </div>

          <div className="global-search" ref={searchRef}>
            <div className="searchbox">
              <Search size={17} />
              <input
                value={search}
                onChange={(event) => {
                  setSearch(event.target.value);
                  setSearchOpen(true);
                }}
                onFocus={() => setSearchOpen(true)}
                placeholder="Search people, projects, tasks..."
                aria-label="Global search"
              />
              {search ? (
                <button type="button" className="search-clear" onClick={() => setSearch('')} aria-label="Clear search">
                  <X size={14} />
                </button>
              ) : null}
            </div>

            {searchOpen && search.trim().length >= 2 ? (
              <div className="search-results">
                {searchQuery.isLoading ? <div className="search-empty">Searching…</div> : null}
                {!searchQuery.isLoading && !searchQuery.data?.users?.length && !searchQuery.data?.projects?.length && !searchQuery.data?.tasks?.length ? (
                  <div className="search-empty">No matching records.</div>
                ) : null}
                {admin && searchQuery.data?.users?.length ? (
                  <div className="search-group">
                    <small>People</small>
                    {searchQuery.data.users.map((item: any) => (
                      <button key={item._id} type="button" onClick={() => goResult('/admin/people')}>
                        <strong>{item.name}</strong>
                        <span>{item.email} · {item.role.replace('_', ' ')}</span>
                      </button>
                    ))}
                  </div>
                ) : null}
                {searchQuery.data?.projects?.length ? (
                  <div className="search-group">
                    <small>Projects</small>
                    {searchQuery.data.projects.map((item: any) => (
                      <button key={item._id} type="button" onClick={() => goResult(`${admin ? '/admin' : '/worker'}/projects/${item._id}`)}>
                        <strong>{item.name}</strong>
                        <span>{item.status} · {item.priority}</span>
                      </button>
                    ))}
                  </div>
                ) : null}
                {searchQuery.data?.tasks?.length ? (
                  <div className="search-group">
                    <small>Tasks</small>
                    {searchQuery.data.tasks.map((item: any) => (
                      <button key={item._id} type="button" onClick={() => goResult(`${admin ? '/admin' : '/worker'}/tasks`)}>
                        <strong>{item.title}</strong>
                        <span>{item.project?.name || 'Project'} · {item.status}</span>
                      </button>
                    ))}
                  </div>
                ) : null}
              </div>
            ) : null}
          </div>

          <div className="header-actions" ref={headerActionsRef}>
            <div className="popover-anchor">
              <button
                className="header-icon-btn"
                type="button"
                title="Notifications"
                aria-label="Notifications"
                onClick={() => {
                  setNotificationOpen((open) => !open);
                  setProfileOpen(false);
                }}
              >
                <Bell size={18} />
                {unreadTotal ? <span className="header-dot" /> : null}
              </button>

              {notificationOpen ? (
                <div className="header-popover notification-popover">
                  <div className="popover-head">
                    <div>
                      <strong>Notifications</strong>
                      <span>{unreadTotal ? `${unreadTotal} unread` : 'All caught up'}</span>
                    </div>
                    <button type="button" className="popover-link" onClick={() => { setNotificationOpen(false); navigate(routeForSection('notifications', admin)); }}>
                      View all
                    </button>
                  </div>

                  <div className="popover-list">
                    {!recentNotifications.length ? (
                      <div className="popover-empty">No notifications yet.</div>
                    ) : (
                      recentNotifications.map((notification: any) => (
                        <button
                          className={`popover-item ${notification.readAt ? '' : 'unread'}`}
                          key={notification._id}
                          type="button"
                          onClick={() => openNotification(notification)}
                        >
                          <span className="notification-dot" />
                          <span className="popover-copy">
                            <strong>{notification.title}</strong>
                            <span>{notification.body}</span>
                          </span>
                        </button>
                      ))
                    )}
                  </div>

                  <div className="popover-foot">
                    <button type="button" className="popover-link wide" onClick={() => { setNotificationOpen(false); navigate(routeForSection('notifications', admin)); }}>
                      View all notifications
                    </button>
                  </div>
                </div>
              ) : null}
            </div>

            <div className="popover-anchor">
              <button
                type="button"
                className="profile-trigger"
                aria-label="Open profile menu"
                onClick={() => {
                  setProfileOpen((open) => !open);
                  setNotificationOpen(false);
                }}
              >
                {user?.avatarUrl ? (
                  <img src={user.avatarUrl} alt={user.name} className="avatar avatar-image" />
                ) : (
                  <div className="avatar">{userInitial}</div>
                )}
                <span className="user-meta">
                  <strong>{user?.name}</strong>
                  <span>{user?.role?.replace('_', ' ')}</span>
                </span>
              </button>

              {profileOpen ? (
                <div className="header-popover profile-popover">
                  <div className="profile-popover-head">
                    {user?.avatarUrl ? (
                      <img src={user.avatarUrl} alt={user.name} className="profile-popover-avatar" />
                    ) : (
                      <div className="profile-popover-avatar avatar">{userInitial}</div>
                    )}
                    <div>
                      <strong>{user?.name}</strong>
                      <span>{user?.email}</span>
                    </div>
                  </div>
                  <button type="button" className="profile-menu-btn" onClick={() => { setProfileOpen(false); navigate(`${admin ? '/admin' : '/worker'}/profile`); }}>
                    <UserCircle size={16} />
                    View profile
                  </button>
                  <button type="button" className="profile-menu-btn danger" onClick={logout}>
                    <LogOut size={16} />
                    Log out
                  </button>
                </div>
              ) : null}
            </div>
          </div>
        </header>

        <section className="content">{children}</section>
      </main>
    </div>
  );
}