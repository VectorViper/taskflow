const jwt = require('jsonwebtoken');
const db = require('../db/database');

const JWT_SECRET = process.env.JWT_SECRET || 'taskflow_super_secret_key_change_in_prod';

const authenticate = (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'No token provided' });
  }
  const token = authHeader.split(' ')[1];
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    const user = db.prepare('SELECT id, name, email, role FROM users WHERE id = ?').get(decoded.id);
    if (!user) return res.status(401).json({ error: 'User not found' });
    req.user = user;
    next();
  } catch {
    return res.status(401).json({ error: 'Invalid token' });
  }
};

const requireAdmin = (req, res, next) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Admin access required' });
  }
  next();
};

const requireProjectAccess = (role = 'member') => (req, res, next) => {
  const projectId = req.params.projectId || req.params.id;
  const membership = db.prepare(
    'SELECT role FROM project_members WHERE project_id = ? AND user_id = ?'
  ).get(projectId, req.user.id);

  const project = db.prepare('SELECT owner_id FROM projects WHERE id = ?').get(projectId);
  if (!project) return res.status(404).json({ error: 'Project not found' });

  const isOwner = project.owner_id === req.user.id;
  const isGlobalAdmin = req.user.role === 'admin';

  if (!membership && !isOwner && !isGlobalAdmin) {
    return res.status(403).json({ error: 'Access denied to this project' });
  }

  if (role === 'admin' && !isOwner && !isGlobalAdmin && membership?.role !== 'admin') {
    return res.status(403).json({ error: 'Project admin access required' });
  }

  req.project = project;
  req.membership = membership;
  next();
};

module.exports = { authenticate, requireAdmin, requireProjectAccess, JWT_SECRET };
