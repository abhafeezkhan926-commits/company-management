export type Role = 'admin' | 'team_lead' | 'worker';
export type User = { id: string; _id?: string; name: string; email: string; role: Role; department?: string; jobTitle?: string; phone?: string; status: 'active' | 'inactive'; joinedAt?: string; avatarUrl?: string };
export type Project = { _id: string; name: string; description: string; status: string; priority: string; startDate?: string; dueDate?: string; progress: number; owner?: Pick<User, 'name' | 'email'>; members?: User[] };
export type Task = { _id: string; title: string; description: string; status: string; priority: string; dueDate?: string; project: { _id?: string; name: string; status?: string; priority?: string }; assignee: User; labels: string[] };
export type AttendanceRecord = { dateKey: string; status: 'present' | 'absent'; loginAt?: string; source?: string };
export type AttendanceRequest = { _id: string; dateKey: string; reason: string; status: 'pending' | 'approved' | 'rejected'; worker: User; reviewNote?: string; createdAt?: string };
export type LeaveRequest = { _id: string; leaveType: string; startDate: string; endDate: string; note: string; status: 'pending' | 'approved' | 'rejected'; worker: User; reviewNote?: string };
export type Notification = { _id: string; title: string; body: string; type: string; readAt?: string; createdAt: string };
