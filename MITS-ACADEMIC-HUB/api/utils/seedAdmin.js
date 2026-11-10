/**
 * Seed the first admin account when the database has no admins.
 */
const Admin = require('../models/Admin');

const ADMIN_PERMISSIONS = [
  'manage_semesters',
  'manage_results',
  'manage_users',
  'view_analytics',
  'manage_admins',
  'manage_settings',
];

async function seedDefaultAdmin() {
  const adminCount = await Admin.countDocuments();

  if (adminCount > 0) {
    console.log('Admin seed skipped: existing admin account found');
    return null;
  }

  // No hardcoded credentials: the first admin is created only when both
  // ADMIN_EMAIL and ADMIN_PASSWORD are supplied through the environment.
  const email = process.env.ADMIN_EMAIL;
  const password = process.env.ADMIN_PASSWORD;
  if (!email || !password || password.length < 10) {
    console.warn('Admin seed skipped: set ADMIN_EMAIL and ADMIN_PASSWORD (min 10 chars) to create the first admin.');
    return null;
  }

  const admin = await Admin.create({
    name: process.env.ADMIN_NAME || 'MITS Admin',
    email,
    password,
    role: 'super_admin',
    permissions: ADMIN_PERMISSIONS,
  });
  console.log(`Default admin created: ${admin.email}`);
  return admin;
}

module.exports = { seedDefaultAdmin };
