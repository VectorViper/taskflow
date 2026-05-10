import { useState, useEffect } from 'react';
import api from '../api';
import { useToast } from '../context/ToastContext';
import { useAuth } from '../context/AuthContext';
import TaskModal from '../components/TaskModal';
import { CheckSquare, Edit2, Trash2, Clock, Filter, X } from 'lucide-react';
import { format, isPast, parseISO } from 'date-fns';
import './TasksPage.css';

const STATUS_LABELS = { todo: 'To Do', in_progress: 'In Progress', review: 'Review', done: 'Done' };
const PRIORITY_LABELS = { low: 'Low', medium: 'Medium', high: 'High', critical: 'Critical' };

function getInitials(name = '') {
  return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
}

export default function TasksPage() {
  const { user } = useAuth();
  const toast = useToast();
  const [tasks, setTasks] = useState([]);
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editTask, setEditTask] = useState(null);
  const [filters, setFilters] = useState({ status: '', priority: '', projectId: '' });

  const loadTasks = async () => {
    try {
      const projs = await api.get('/projects');
      setProjects(projs.data);
      // Load all tasks across all projects I'm in
      const allTasks = await Promise.all(projs.data.map(p => api.get(`/projects/${p.id}/tasks`)));
      const merged = allTasks.flatMap(r => r.data)
        .filter(t => t.assignee_id === user?.id || t.created_by === user?.id)
        .sort((a, b) => new Date(b.updated_at) - new Date(a.updated_at));
      // Deduplicate
      const seen = new Set();
      const deduped = merged.filter(t => { if (seen.has(t.id)) return false; seen.add(t.id); return true; });
      setTasks(deduped);
    } catch (err) {
      toast.error('Failed to load tasks');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadTasks(); }, []);

  const filtered = tasks.filter(t => {
    if (filters.status && t.status !== filters.status) return false;
    if (filters.priority && t.priority !== filters.priority) return false;
    if (filters.projectId && t.project_id !== parseInt(filters.projectId)) return false;
    return true;
  });

  const handleDelete = async (taskId) => {
    if (!confirm('Delete this task?')) return;
    try {
      await api.delete(`/tasks/${taskId}`);
      setTasks(prev => prev.filter(t => t.id !== taskId));
      toast.success('Task deleted');
    } catch { toast.error('Failed to delete task'); }
  };

  const handleStatusChange = async (task, newStatus) => {
    try {
      const res = await api.put(`/tasks/${task.id}`, { status: newStatus });
      setTasks(prev => prev.map(t => t.id === task.id ? res.data : t));
    } catch { toast.error('Failed to update status'); }
  };

  const overdueCount = tasks.filter(t => t.due_date && t.status !== 'done' && isPast(parseISO(t.due_date))).length;

  return (
    <div className="tasks-page">
      <div className="page-header">
        <div>
          <h1 className="page-title">My Tasks</h1>
          <p className="page-subtitle">
            {filtered.length} task{filtered.length !== 1 ? 's' : ''}
            {overdueCount > 0 && <span className="overdue-badge"> · {overdueCount} overdue</span>}
          </p>
        </div>
      </div>

      {/* Filters */}
      <div className="tasks-filters">
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <Filter size={14} style={{ color: 'var(--text-3)' }} />
          <span style={{ fontSize: 12.5, color: 'var(--text-3)', fontWeight: 600 }}>FILTER</span>
        </div>
        <select className="select" style={{ width: 'auto', fontSize: 13 }} value={filters.status}
          onChange={e => setFilters(f => ({ ...f, status: e.target.value }))}>
          <option value="">All Statuses</option>
          {Object.entries(STATUS_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </select>
        <select className="select" style={{ width: 'auto', fontSize: 13 }} value={filters.priority}
          onChange={e => setFilters(f => ({ ...f, priority: e.target.value }))}>
          <option value="">All Priorities</option>
          {Object.entries(PRIORITY_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </select>
        <select className="select" style={{ width: 'auto', fontSize: 13 }} value={filters.projectId}
          onChange={e => setFilters(f => ({ ...f, projectId: e.target.value }))}>
          <option value="">All Projects</option>
          {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
        </select>
        {(filters.status || filters.priority || filters.projectId) && (
          <button className="btn btn-ghost btn-sm" onClick={() => setFilters({ status: '', priority: '', projectId: '' })}>
            <X size={13} /> Clear
          </button>
        )}
      </div>

      {loading ? (
        <div className="page-loading" style={{ height: '40vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div className="spin" style={{ width: 28, height: 28, border: '3px solid var(--border)', borderTopColor: 'var(--accent)', borderRadius: '50%' }} />
        </div>
      ) : filtered.length === 0 ? (
        <div className="empty-state">
          <CheckSquare size={48} />
          <h3 style={{ fontSize: 16, fontWeight: 600, color: 'var(--text-2)', marginTop: 8 }}>No tasks found</h3>
          <p>Tasks assigned to you will appear here</p>
        </div>
      ) : (
        <div className="tasks-table-wrap">
          <table className="tasks-table">
            <thead>
              <tr>
                <th>Task</th>
                <th>Project</th>
                <th>Priority</th>
                <th>Status</th>
                <th>Due Date</th>
                <th>Assignee</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(task => {
                const isOverdue = task.due_date && task.status !== 'done' && isPast(parseISO(task.due_date));
                return (
                  <tr key={task.id} className={`task-row ${task.status === 'done' ? 'done' : ''}`}>
                    <td>
                      <div className="task-title-cell">
                        <div style={{ fontWeight: 500, fontSize: 13.5 }}>{task.title}</div>
                        {task.description && <div className="text-muted" style={{ fontSize: 12 }}>{task.description.slice(0, 60)}{task.description.length > 60 ? '...' : ''}</div>}
                      </div>
                    </td>
                    <td>
                      <span className="text-muted" style={{ fontSize: 13 }}>{task.project_name || '—'}</span>
                    </td>
                    <td><span className={`badge badge-${task.priority}`}>{PRIORITY_LABELS[task.priority]}</span></td>
                    <td>
                      <select className="select" style={{ padding: '4px 8px', fontSize: 12, width: 'auto' }}
                        value={task.status} onChange={e => handleStatusChange(task, e.target.value)}>
                        {Object.entries(STATUS_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                      </select>
                    </td>
                    <td>
                      {task.due_date ? (
                        <span style={{ color: isOverdue ? 'var(--red)' : 'var(--text-3)', fontSize: 12.5, display: 'flex', alignItems: 'center', gap: 4 }}>
                          {isOverdue && <Clock size={12} />}
                          {format(parseISO(task.due_date), 'MMM d, yyyy')}
                        </span>
                      ) : <span className="text-muted">—</span>}
                    </td>
                    <td>
                      {task.assignee_name ? (
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                          <div className="avatar avatar-sm">{getInitials(task.assignee_name)}</div>
                          <span style={{ fontSize: 12.5 }}>{task.assignee_name}</span>
                        </div>
                      ) : <span className="text-muted">—</span>}
                    </td>
                    <td>
                      <div style={{ display: 'flex', gap: 4 }}>
                        <button className="icon-btn" onClick={() => setEditTask(task)}><Edit2 size={13} /></button>
                        <button className="icon-btn danger" onClick={() => handleDelete(task.id)}><Trash2 size={13} /></button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {editTask && (
        <TaskModal
          task={editTask}
          projectId={editTask.project_id}
          onClose={() => setEditTask(null)}
          onSaved={saved => {
            setTasks(prev => prev.map(t => t.id === saved.id ? saved : t));
            setEditTask(null);
          }}
        />
      )}
    </div>
  );
}
