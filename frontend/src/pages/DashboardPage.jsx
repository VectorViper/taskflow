import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../api';
import { useAuth } from '../context/AuthContext';
import { FolderKanban, CheckSquare, AlertTriangle, TrendingUp, ArrowRight, Clock } from 'lucide-react';
import { formatDistanceToNow, isPast, parseISO } from 'date-fns';
import './DashboardPage.css';

const STATUS_LABELS = { todo: 'To Do', in_progress: 'In Progress', review: 'Review', done: 'Done' };
const PRIORITY_LABELS = { low: 'Low', medium: 'Medium', high: 'High', critical: 'Critical' };

function getInitials(name = '') {
  return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
}

export default function DashboardPage() {
  const { user } = useAuth();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/dashboard').then(res => setData(res.data)).finally(() => setLoading(false));
  }, []);

  if (loading) return (
    <div className="page-loading">
      <div className="spin" style={{ width: 30, height: 30, border: '3px solid var(--border)', borderTopColor: 'var(--accent)', borderRadius: '50%' }} />
    </div>
  );

  const { stats, recentTasks, tasksByStatus } = data || {};
  const totalTasks = tasksByStatus?.reduce((a, b) => a + b.count, 0) || 0;
  const doneTasks = tasksByStatus?.find(t => t.status === 'done')?.count || 0;
  const progress = totalTasks ? Math.round((doneTasks / totalTasks) * 100) : 0;

  const statCards = [
    { label: 'Projects', value: stats?.projects ?? 0, icon: FolderKanban, color: 'var(--accent)', link: '/projects' },
    { label: 'My Tasks', value: stats?.myTasks ?? 0, icon: CheckSquare, color: 'var(--blue)', link: '/tasks' },
    { label: 'Overdue', value: stats?.overdueTasks ?? 0, icon: AlertTriangle, color: 'var(--red)', link: '/tasks' },
    { label: 'Completed', value: stats?.completedTasks ?? 0, icon: TrendingUp, color: 'var(--green)', link: '/tasks' },
  ];

  return (
    <div className="dashboard-page">
      <div className="page-header">
        <div>
          <h1 className="page-title">Good {getGreeting()}, {user?.name?.split(' ')[0]} 👋</h1>
          <p className="page-subtitle">Here's what's happening with your projects today.</p>
        </div>
      </div>

      <div className="stats-grid">
        {statCards.map(({ label, value, icon: Icon, color, link }) => (
          <Link to={link} key={label} className="stat-card" style={{ textDecoration: 'none' }}>
            <div className="stat-icon" style={{ background: `${color}18`, color }}>
              <Icon size={18} />
            </div>
            <div className="stat-value" style={{ color }}>{value}</div>
            <div className="stat-label">{label}</div>
          </Link>
        ))}
      </div>

      <div className="dashboard-grid">
        {/* Task Progress */}
        <div className="card">
          <div className="card-header">
            <h3 className="card-title">Task Progress</h3>
            <span className="text-muted">{progress}% complete</span>
          </div>
          <div style={{ marginBottom: 20 }}>
            <div className="progress-bar" style={{ height: 8, marginBottom: 16 }}>
              <div className="progress-fill" style={{ width: `${progress}%` }} />
            </div>
            <div className="status-breakdown">
              {(['todo', 'in_progress', 'review', 'done']).map(s => {
                const count = tasksByStatus?.find(t => t.status === s)?.count || 0;
                const pct = totalTasks ? Math.round((count / totalTasks) * 100) : 0;
                return (
                  <div key={s} className="status-item">
                    <div className="flex items-center gap-2">
                      <span className={`badge badge-${s}`}>{STATUS_LABELS[s]}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="status-bar-mini">
                        <div style={{ width: `${pct}%`, height: '100%', borderRadius: 2, background: getStatusColor(s) }} />
                      </div>
                      <span style={{ fontSize: 13, color: 'var(--text-2)', minWidth: 18 }}>{count}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Recent Activity */}
        <div className="card">
          <div className="card-header">
            <h3 className="card-title">Recent Tasks</h3>
            <Link to="/tasks" className="btn btn-ghost btn-sm">View all <ArrowRight size={13} /></Link>
          </div>
          {recentTasks?.length === 0 ? (
            <div className="empty-state" style={{ padding: '30px 0' }}>
              <CheckSquare size={32} />
              <p>No tasks yet</p>
            </div>
          ) : (
            <div className="recent-tasks">
              {recentTasks?.slice(0, 6).map(task => {
                const isOverdue = task.due_date && task.status !== 'done' && isPast(parseISO(task.due_date));
                return (
                  <div key={task.id} className="recent-task-item">
                    <div className="task-content">
                      <div className="task-title truncate">{task.title}</div>
                      <div className="task-meta">
                        <span className="text-muted">{task.project_name}</span>
                        {task.due_date && (
                          <span style={{ color: isOverdue ? 'var(--red)' : 'var(--text-3)', display: 'flex', alignItems: 'center', gap: 3 }}>
                            <Clock size={11} />
                            {formatDistanceToNow(parseISO(task.due_date), { addSuffix: true })}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="flex gap-2 items-center">
                      <span className={`badge badge-${task.priority}`}>{PRIORITY_LABELS[task.priority]}</span>
                      <span className={`badge badge-${task.status}`}>{STATUS_LABELS[task.status]}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function getGreeting() {
  const h = new Date().getHours();
  if (h < 12) return 'morning';
  if (h < 17) return 'afternoon';
  return 'evening';
}

function getStatusColor(s) {
  return { todo: 'var(--text-3)', in_progress: 'var(--blue)', review: 'var(--yellow)', done: 'var(--green)' }[s];
}
