// Run: node seed.js
// Creates demo admin + member accounts and sample data
const db = require('./db/database');
const bcrypt = require('bcryptjs');

console.log('Seeding demo data...');

// Clear existing
db.exec('DELETE FROM tasks; DELETE FROM project_members; DELETE FROM projects; DELETE FROM users;');

// Users
const adminHash = bcrypt.hashSync('admin123', 10);
const memberHash = bcrypt.hashSync('member123', 10);

const adminId = db.prepare('INSERT INTO users (name, email, password, role) VALUES (?, ?, ?, ?)').run('Admin User', 'admin@demo.com', adminHash, 'admin').lastInsertRowid;
const member1Id = db.prepare('INSERT INTO users (name, email, password, role) VALUES (?, ?, ?, ?)').run('Alice Chen', 'alice@demo.com', memberHash, 'member').lastInsertRowid;
const member2Id = db.prepare('INSERT INTO users (name, email, password, role) VALUES (?, ?, ?, ?)').run('Bob Smith', 'bob@demo.com', memberHash, 'member').lastInsertRowid;

// Project 1
const p1 = db.prepare('INSERT INTO projects (name, description, owner_id) VALUES (?, ?, ?)').run('Website Redesign', 'Full overhaul of the company website with new branding', adminId).lastInsertRowid;
db.prepare('INSERT INTO project_members (project_id, user_id, role) VALUES (?, ?, ?)').run(p1, adminId, 'admin');
db.prepare('INSERT INTO project_members (project_id, user_id, role) VALUES (?, ?, ?)').run(p1, member1Id, 'member');
db.prepare('INSERT INTO project_members (project_id, user_id, role) VALUES (?, ?, ?)').run(p1, member2Id, 'member');

// Project 2
const p2 = db.prepare('INSERT INTO projects (name, description, owner_id) VALUES (?, ?, ?)').run('Mobile App v2', 'New features for the mobile application', member1Id).lastInsertRowid;
db.prepare('INSERT INTO project_members (project_id, user_id, role) VALUES (?, ?, ?)').run(p2, member1Id, 'admin');
db.prepare('INSERT INTO project_members (project_id, user_id, role) VALUES (?, ?, ?)').run(p2, adminId, 'member');

// Tasks for P1
const yesterday = new Date(); yesterday.setDate(yesterday.getDate() - 1);
const nextWeek = new Date(); nextWeek.setDate(nextWeek.getDate() + 7);
const nextMonth = new Date(); nextMonth.setDate(nextMonth.getDate() + 30);

const fmt = d => d.toISOString().split('T')[0];

db.prepare('INSERT INTO tasks (title, description, status, priority, project_id, assignee_id, created_by, due_date) VALUES (?, ?, ?, ?, ?, ?, ?, ?)').run('Design new homepage mockup', 'Create wireframes and high-fidelity mockups', 'in_progress', 'high', p1, member1Id, adminId, fmt(nextWeek));
db.prepare('INSERT INTO tasks (title, description, status, priority, project_id, assignee_id, created_by, due_date) VALUES (?, ?, ?, ?, ?, ?, ?, ?)').run('Set up project repository', '', 'done', 'medium', p1, adminId, adminId, fmt(yesterday));
db.prepare('INSERT INTO tasks (title, description, status, priority, project_id, assignee_id, created_by, due_date) VALUES (?, ?, ?, ?, ?, ?, ?, ?)').run('Write content strategy', 'Define tone, messaging, and page structure', 'todo', 'medium', p1, member2Id, adminId, fmt(nextMonth));
db.prepare('INSERT INTO tasks (title, description, status, priority, project_id, assignee_id, created_by, due_date) VALUES (?, ?, ?, ?, ?, ?, ?, ?)').run('Fix broken navigation links', '', 'review', 'critical', p1, member1Id, adminId, fmt(yesterday));

// Tasks for P2
db.prepare('INSERT INTO tasks (title, description, status, priority, project_id, assignee_id, created_by, due_date) VALUES (?, ?, ?, ?, ?, ?, ?, ?)').run('Implement push notifications', 'iOS and Android push notification support', 'todo', 'high', p2, adminId, member1Id, fmt(nextWeek));
db.prepare('INSERT INTO tasks (title, description, status, priority, project_id, assignee_id, created_by, due_date) VALUES (?, ?, ?, ?, ?, ?, ?, ?)').run('Update onboarding flow', '', 'in_progress', 'medium', p2, member1Id, member1Id, fmt(nextMonth));

console.log('✅ Seed complete!');
console.log('  admin@demo.com / admin123');
console.log('  alice@demo.com / member123');
console.log('  bob@demo.com / member123');
