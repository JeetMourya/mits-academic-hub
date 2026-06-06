/**
 * Seed the first admin account when the database has no admins.
 */
const Admin = require('../models/Admin');

const DEFAULT_ADMIN = {
  name: 'MITS Hub Admin',
  email: 'admin@mitshub.com',
  password: 'Admin@123',
  role: 'super_admin',
  permissions: [
    'manage_semesters',
    'manage_results',
    'manage_users',
    'view_analytics',
    'manage_admins',
    'manage_settings',
  ],
};

async function seedDefaultAdmin() {
  const adminCount = await Admin.countDocuments();

  if (adminCount > 0) {
    console.log('Admin seed skipped: existing admin account found');
    return null;
  }

  const admin = await Admin.create(DEFAULT_ADMIN);
  console.log(`Default admin created: ${admin.email}`);
  return admin;
}

module.exports = { seedDefaultAdmin, DEFAULT_ADMIN };
