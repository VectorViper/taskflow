const express = require('express');
const db = require('../db/database');
const { authenticate, requireProjectAccess } = require('../middleware/auth');

const router = express.Router();
router.use(authenticate);

// GET /api/projects/:projectId/tasks
router.get('/projects/:projectId/tasks', requireProjectAccess(), (req, res) => {
  const { status, priority, assignee } = req.query;
  let query = `
    SELECT t.*, u.name as assignee_name, c.name as created_by_name
    FROM tasks t
    LEFT JOIN users u ON t.assignee_id = u.id
    JOIN users c ON t.created_by = c.id
    WHERE t.project_id = ?
  `;
  const params = [req.params.projectId];
  if (status) { query += ' AND t.status = ?'; params.push(status); }
  if (priority) { query += ' AND t.priority = ?'; params.push(priority); }
  if (assignee) { query += ' AND t.assignee_id = ?'; params.push(assignee); }
  query += ' ORDER BY t.created_at DESC';

  res.json(db.prepare(query).all(...params));
});

// POST /api/projects/:projectId/tasks
router.post('/projects/:projectId/tasks', requireProjectAccess(), (req, res) => {
  const { title, description, priority, assignee_id, due_date } = req.body;
  if (!title) return res.status(400).json({ error: 'Title is required' });

  // Verify assignee is a project member
  if (assignee_id) {
    const isMember = db.prepare('SELECT id FROM project_members WHERE project_id = ? AND user_id = ?').get(req.params.projectId, assignee_id);
    if (!isMember) return res.status(400).json({ error: 'Assignee must be a project member' });
  }

  const result = db.prepare(`
    INSERT INTO tasks (title, description, priority, assignee_id, due_date, project_id, created_by)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).run(title, description || '', priority || 'medium', assignee_id || null, due_date || null, req.params.projectId, req.user.id);

  const task = db.prepare(`
    SELECT t.*, u.name as assignee_name, c.name as created_by_name
    FROM tasks t LEFT JOIN users u ON t.assignee_id = u.id
    JOIN users c ON t.created_by = c.id WHERE t.id = ?
  `).get(result.lastInsertRowid);
  res.status(201).json(task);
});

// PUT /api/tasks/:id
router.put('/tasks/:id', (req, res) => {
  const task = db.prepare('SELECT * FROM tasks WHERE id = ?').get(req.params.id);
  if (!task) return res.status(404).json({ error: 'Task not found' });

  // Check access
  const membership = db.prepare('SELECT role FROM project_members WHERE project_id = ? AND user_id = ?').get(task.project_id, req.user.id);
  const project = db.prepare('SELECT owner_id FROM projects WHERE id = ?').get(task.project_id);
  const canEdit = req.user.role === 'admin' || project.owner_id === req.user.id || membership?.role === 'admin' || task.assignee_id === req.user.id || task.created_by === req.user.id;
  if (!canEdit) return res.status(403).json({ error: 'Access denied' });

  const { title, description, status, priority, assignee_id, due_date } = req.body;
  db.prepare(`
    UPDATE tasks SET
      title = COALESCE(?, title), description = COALESCE(?, description),
      status = COALESCE(?, status), priority = COALESCE(?, priority),
      assignee_id = ?, due_date = COALESCE(?, due_date),
      updated_at = CURRENT_TIMESTAMP
    WHERE id = ?
  `).run(title, description, status, priority, assignee_id !== undefined ? assignee_id : task.assignee_id, due_date, req.params.id);

  const updated = db.prepare(`
    SELECT t.*, u.name as assignee_name, c.name as created_by_name
    FROM tasks t LEFT JOIN users u ON t.assignee_id = u.id
    JOIN users c ON t.created_by = c.id WHERE t.id = ?
  `).get(req.params.id);
  res.json(updated);
});

// DELETE /api/tasks/:id
router.delete('/tasks/:id', (req, res) => {
  const task = db.prepare('SELECT * FROM tasks WHERE id = ?').get(req.params.id);
  if (!task) return res.status(404).json({ error: 'Task not found' });

  const project = db.prepare('SELECT owner_id FROM projects WHERE id = ?').get(task.project_id);
  const membership = db.prepare('SELECT role FROM project_members WHERE project_id = ? AND user_id = ?').get(task.project_id, req.user.id);
  const canDelete = req.user.role === 'admin' || project.owner_id === req.user.id || membership?.role === 'admin' || task.created_by === req.user.id;
  if (!canDelete) return res.status(403).json({ error: 'Access denied' });

  db.prepare('DELETE FROM tasks WHERE id = ?').run(req.params.id);
  res.json({ message: 'Task deleted' });
});

// GET /api/dashboard
router.get('/dashboard', (req, res) => {
  const userId = req.user.id;
  const isAdmin = req.user.role === 'admin';

  const projectFilter = isAdmin ? '' : 'WHERE (p.owner_id = ? OR p.id IN (SELECT project_id FROM project_members WHERE user_id = ?))';
  const projectParams = isAdmin ? [] : [userId, userId];

  const projects = db.prepare(`SELECT COUNT(*) as cnt FROM projects p ${projectFilter}`).get(...projectParams);
const taskQuery = isAdmin
  ? `SELECT COUNT(*) as cnt FROM tasks`
  : `SELECT COUNT(*) as cnt FROM tasks WHERE assignee_id = ? OR created_by = ?`;

const myTasks = isAdmin
  ? db.prepare(taskQuery).get()
  : db.prepare(taskQuery).get(userId, userId);

const overdueQuery = isAdmin
  ? `SELECT COUNT(*) as cnt FROM tasks t WHERE t.due_date < DATE('now') AND t.status != 'done'`
  : `SELECT COUNT(*) as cnt FROM tasks t WHERE (t.assignee_id = ? OR t.created_by = ?) AND t.due_date < DATE('now') AND t.status != 'done'`;

const overdueTasks = isAdmin
  ? db.prepare(overdueQuery).get()
  : db.prepare(overdueQuery).get(userId, userId);

const completedQuery = isAdmin
  ? `SELECT COUNT(*) as cnt FROM tasks WHERE status = 'done'`
  : `SELECT COUNT(*) as cnt FROM tasks WHERE (assignee_id = ? OR created_by = ?) AND status = 'done'`;

const completedTasks = isAdmin
  ? db.prepare(completedQuery).get()
  : db.prepare(completedQuery).get(userId, userId);

const recentTasks = isAdmin
  ? db.prepare(`
      SELECT t.*, p.name as project_name, u.name as assignee_name
      FROM tasks t JOIN projects p ON t.project_id = p.id
      LEFT JOIN users u ON t.assignee_id = u.id
      ORDER BY t.updated_at DESC LIMIT 10
    `).all()
  : db.prepare(`
      SELECT t.*, p.name as project_name, u.name as assignee_name
      FROM tasks t JOIN projects p ON t.project_id = p.id
      LEFT JOIN users u ON t.assignee_id = u.id
      WHERE t.assignee_id = ? OR t.created_by = ?
      ORDER BY t.updated_at DESC LIMIT 10
    `).all(userId, userId);

const tasksByStatus = isAdmin
  ? db.prepare(`SELECT status, COUNT(*) as count FROM tasks GROUP BY status`).all()
  : db.prepare(`SELECT status, COUNT(*) as count FROM tasks WHERE assignee_id = ? OR created_by = ? GROUP BY status`).all(userId, userId);
  res.json({
    stats: {
      projects: projects.cnt,
      myTasks: myTasks.cnt,
      overdueTasks: overdueTasks.cnt,
      completedTasks: completedTasks.cnt
    },
    recentTasks,
    tasksByStatus
  });
});

// GET /api/users (for assigning tasks)
router.get('/users', (req, res) => {
  const users = db.prepare('SELECT id, name, email, role FROM users ORDER BY name').all();
  res.json(users);
});

module.exports = router;
