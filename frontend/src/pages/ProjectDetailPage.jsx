import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../api';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import TaskModal from '../components/TaskModal';
import { Plus, Users, Trash2, X, UserPlus, Edit2, Clock, ArrowLeft } from 'lucide-react';
import { format, isPast, parseISO } from 'date-fns';
import './ProjectDetailPage.css';

const STATUS_COLS = [
  { key: 'todo', label: 'To Do' },
  { key: 'in_progress', label: 'In Progress' },
  { key: 'review', label: 'Review' },
  { key: 'done', label: 'Done' },
];

const PRIORITY_LABELS = { low: 'Low', medium: 'Medium', high: 'High', critical: 'Critical' };

function getInitials(name = '') {
  return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
}

function AddMemberModal({ projectId, onClose, onAdded }) {
  const [email, setEmail] = useState('');
  const [role, setRole] = useState('member');
  const [loading, setLoading] = useState(false);
  const toast = useToast();

  const submit = async e => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await api.post(`/projects/${projectId}/members`, { email, role });
      toast.success('Member added!');
      onAdded();
      onClose();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to add member');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal" style={{ maxWidth: 420 }}>
        <div className="modal-header">
          <h2 className="modal-title">Add Member</h2>
          <button className="btn btn-ghost btn-sm" onClick={onClose}><X size={16} /></button>
        </div>
        <form onSubmit={submit}>
          <div className="form-group">
            <label className="label">Email Address</label>
            <input className="input" type="email" placeholder="teammate@company.com" value={email}
              onChange={e => setEmail(e.target.value)} required />
          </div>
          <div className="form-group">
            <label className="label">Role</label>
            <select className="select" value={role} onChange={e => setRole(e.target.value)}>
              <option value="member">Member</option>
              <option value="admin">Admin</option>
            </select>
          </div>
          <div className="modal-footer">
            <button type="button" className="btn btn-secondary" onClick={onClose}>Cancel</button>
            <button className="btn btn-primary" disabled={loading}>
              {loading ? 'Adding...' : 'Add Member'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function ProjectDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const toast = useToast();
  const [project, setProject] = useState(null);
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('board');
  const [showTaskModal, setShowTaskModal] = useState(false);
  const [editTask, setEditTask] = useState(null);
  const [showMemberModal, setShowMemberModal] = useState(false);

  const loadData = async () => {
    try {
      const [projRes, tasksRes] = await Promise.all([
        api.get(`/projects/${id}`),
        api.get(`/projects/${id}/tasks`)
      ]);
      setProject(projRes.data);
      setTasks(tasksRes.data);
    } catch (err) {
      toast.error('Failed to load project');
      navigate('/projects');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadData(); }, [id]);

  const canAdmin = user?.role === 'admin' ||
    project?.owner_id === user?.id ||
    project?.members?.find(m => m.id === user?.id)?.project_role === 'admin';

  const handleDeleteTask = async (taskId) => {
    if (!confirm('Delete this task?')) return;
    try {
      await api.delete(`/tasks/${taskId}`);
      setTasks(prev => prev.filter(t => t.id !== taskId));
      toast.success('Task deleted');
    } catch (err) {
      toast.error('Failed to delete task');
    }
  };

  const handleRemoveMember = async (memberId) => {
    if (!confirm('Remove this member?')) return;
    try {
      await api.delete(`/projects/${id}/members/${memberId}`);
      setProject(prev => ({ ...prev, members: prev.members.filter(m => m.id !== memberId) }));
      toast.success('Member removed');
    } catch (err) {
      toast.error('Failed to remove member');
    }
  };

  const handleStatusChange = async (taskId, newStatus) => {
    try {
      const res = await api.put(`/tasks/${taskId}`, { status: newStatus });
      setTasks(prev => prev.map(t => t.id === taskId ? res.data : t));
    } catch {
      toast.error('Failed to update task');
    }
  };

  if (loading) return (
    <div className="page-loading" style={{ height: '60vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div className="spin" style={{ width: 28, height: 28, border: '3px solid var(--border)', borderTopColor: 'var(--accent)', borderRadius: '50%' }} />
    </div>
  );

  return (
    <div className="project-detail-page">
      <div className="project-detail-header">
        <div>
          <button className="btn btn-ghost btn-sm" onClick={() => navigate('/projects')} style={{ marginBottom: 10 }}>
            <ArrowLeft size={14} /> Projects
          </button>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div className="project-icon-lg">{project?.name?.charAt(0)}</div>
            <div>
              <h1 className="page-title">{project?.name}</h1>
              {project?.description && <p className="page-subtitle">{project.description}</p>}
            </div>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <span className={`badge badge-${project?.status}`}>{project?.status}</span>
          {canAdmin && (
            <button className="btn btn-secondary btn-sm" onClick={() => setShowMemberModal(true)}>
              <UserPlus size={14} /> Add Member
            </button>
          )}
          <button className="btn btn-primary btn-sm" onClick={() => setShowTaskModal(true)}>
            <Plus size={14} /> New Task
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="detail-tabs">
        {['board', 'members'].map(t => (
          <button key={t} className={`tab-btn ${activeTab === t ? 'active' : ''}`} onClick={() => setActiveTab(t)}>
            {t === 'board' ? `Board (${tasks.length})` : `Members (${project?.members?.length || 0})`}
          </button>
        ))}
      </div>

      {activeTab === 'board' && (
        <div className="kanban-board">
          {STATUS_COLS.map(col => {
            const colTasks = tasks.filter(t => t.status === col.key);
            return (
              <div key={col.key} className="kanban-col">
                <div className="kanban-col-header">
                  <span className="kanban-col-title">{col.label}</span>
                  <span className="kanban-count">{colTasks.length}</span>
                </div>
                <div className="kanban-cards">
                  {colTasks.map(task => {
                    const isOverdue = task.due_date && task.status !== 'done' && isPast(parseISO(task.due_date));
                    return (
                      <div key={task.id} className="task-card">
                        <div className="task-card-top">
                          <span className={`badge badge-${task.priority}`}>{PRIORITY_LABELS[task.priority]}</span>
                          <div style={{ display: 'flex', gap: 4 }}>
                            <button className="icon-btn" onClick={() => { setEditTask(task); setShowTaskModal(true); }}><Edit2 size={12} /></button>
                            <button className="icon-btn danger" onClick={() => handleDeleteTask(task.id)}><Trash2 size={12} /></button>
                          </div>
                        </div>
                        <div className="task-card-title">{task.title}</div>
                        {task.description && <div className="task-card-desc">{task.description}</div>}
                        <div className="task-card-footer">
                          {task.due_date && (
                            <span style={{ color: isOverdue ? 'var(--red)' : 'var(--text-3)', fontSize: 11.5, display: 'flex', alignItems: 'center', gap: 3 }}>
                              <Clock size={11} /> {format(parseISO(task.due_date), 'MMM d')}
                            </span>
                          )}
                          {task.assignee_name && (
                            <div className="avatar avatar-sm" title={task.assignee_name}>
                              {getInitials(task.assignee_name)}
                            </div>
                          )}
                        </div>
                        {/* Quick status changer */}
                        <select className="select" style={{ marginTop: 8, fontSize: 11.5, padding: '3px 6px' }}
                          value={task.status} onChange={e => handleStatusChange(task.id, e.target.value)}>
                          {STATUS_COLS.map(s => <option key={s.key} value={s.key}>{s.label}</option>)}
                        </select>
                      </div>
                    );
                  })}
                  {colTasks.length === 0 && (
                    <div style={{ padding: '20px 0', textAlign: 'center', color: 'var(--text-3)', fontSize: 13 }}>
                      No tasks
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {activeTab === 'members' && (
        <div className="members-list">
          {project?.members?.map(m => (
            <div key={m.id} className="member-row">
              <div className="avatar avatar-lg">{getInitials(m.name)}</div>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 600, fontSize: 14 }}>{m.name}</div>
                <div style={{ color: 'var(--text-3)', fontSize: 12.5 }}>{m.email}</div>
              </div>
              <span className={`badge badge-${m.project_role}`}>{m.project_role}</span>
              {canAdmin && m.id !== user?.id && (
                <button className="btn btn-danger btn-sm" onClick={() => handleRemoveMember(m.id)}>
                  <X size={13} />
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      {showTaskModal && (
        <TaskModal
          task={editTask}
          projectId={id}
          members={project?.members}
          onClose={() => { setShowTaskModal(false); setEditTask(null); }}
          onSaved={savedTask => {
            if (editTask) {
              setTasks(prev => prev.map(t => t.id === savedTask.id ? savedTask : t));
            } else {
              setTasks(prev => [savedTask, ...prev]);
            }
          }}
        />
      )}

      {showMemberModal && (
        <AddMemberModal
          projectId={id}
          onClose={() => setShowMemberModal(false)}
          onAdded={loadData}
        />
      )}
    </div>
  );
}
