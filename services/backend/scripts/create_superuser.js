const { Pool } = require('pg');
const bcrypt = require('bcryptjs');
require('dotenv').config();

const DATABASE_URL = process.env.DATABASE_URL;
const USERNAME = process.env.SUPERUSER_USERNAME || 'admin';
const PASSWORD = process.env.SUPERUSER_PASSWORD || 'admin123';
const FULL_NAME = process.env.SUPERUSER_FULL_NAME || 'Super Admin';
const PHONE = process.env.SUPERUSER_PHONE || null;
const BRANCH_ID = process.env.SUPERUSER_BRANCH_ID || null;
const ROLE_NAME = process.env.SUPERUSER_ROLE_NAME || 'Super Admin';

if (!DATABASE_URL) {
  console.error('DATABASE_URL is required.');
  process.exit(1);
}

async function main() {
  const pool = new Pool({ connectionString: DATABASE_URL });
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const passwordHash = await bcrypt.hash(PASSWORD, 10);
    const userRes = await client.query(
      `INSERT INTO users (id, username, password_hash, is_active)
       VALUES (gen_random_uuid(), $1, $2, true)
       ON CONFLICT (username) DO UPDATE SET password_hash = EXCLUDED.password_hash, is_active = true
       RETURNING id, username`,
      [USERNAME, passwordHash]
    );
    const user = userRes.rows[0];

    const existingRoleRes = await client.query(
      'SELECT id, name FROM roles WHERE name = $1',
      [ROLE_NAME]
    );
    let role = existingRoleRes.rows[0];
    if (!role) {
      const roleRes = await client.query(
        'INSERT INTO roles (id, name) VALUES (gen_random_uuid(), $1) RETURNING id, name',
        [ROLE_NAME]
      );
      role = roleRes.rows[0];
    }

    await client.query(
      `INSERT INTO user_roles (user_id, role_id)
       VALUES ($1, $2)
       ON CONFLICT DO NOTHING`,
      [user.id, role.id]
    );

    const permsRes = await client.query('SELECT id FROM permissions');
    if (permsRes.rows.length > 0) {
      const values = permsRes.rows
        .map((_, i) => `($1, $${i + 2})`)
        .join(',');
      const params = [role.id, ...permsRes.rows.map(r => r.id)];
      await client.query(
        `INSERT INTO role_permissions (role_id, permission_id)
         VALUES ${values}
         ON CONFLICT DO NOTHING`,
        params
      );
    }

    const empRes = await client.query(
      'SELECT id FROM employees WHERE user_id = $1',
      [user.id]
    );
    if (empRes.rows.length === 0) {
      await client.query(
        `INSERT INTO employees (id, user_id, branch_id, full_name, phone, position)
         VALUES (gen_random_uuid(), $1, $2, $3, $4, $5)`,
        [user.id, BRANCH_ID, FULL_NAME, PHONE, 'Super Admin']
      );
    } else {
      await client.query(
        `UPDATE employees
         SET branch_id = COALESCE($2, branch_id),
             full_name = COALESCE($3, full_name),
             phone = COALESCE($4, phone),
             position = COALESCE($5, position)
         WHERE user_id = $1`,
        [user.id, BRANCH_ID, FULL_NAME, PHONE, 'Super Admin']
      );
    }

    await client.query('COMMIT');
    console.log(`Superuser ready: ${user.username}`);
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('create_superuser_failed', err.message);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

main();
