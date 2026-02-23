import pool from '../config/database.js';

export async function checkBusinessPermission(userId, businessId, requiredRole = null) {
  const result = await pool.query(
    `SELECT role FROM user_business_roles 
     WHERE user_id = $1 AND business_id = $2 AND is_deleted = false`,
    [userId, businessId]
  );

  if (result.rows.length === 0) {
    return { hasPermission: false, role: null };
  }

  const userRole = result.rows[0].role;

  if (!requiredRole) {
    return { hasPermission: true, role: userRole };
  }

  const roleHierarchy = {
    owner: 3,
    admin: 2,
    employee: 1,
  };

  const hasPermission = roleHierarchy[userRole] >= roleHierarchy[requiredRole];

  return { hasPermission, role: userRole };
}

export async function isBusinessOwner(userId, businessId) {
  const result = await pool.query(
    `SELECT role FROM user_business_roles 
     WHERE user_id = $1 AND business_id = $2 AND role = 'owner' AND is_deleted = false`,
    [userId, businessId]
  );

  return result.rows.length > 0;
}

export async function getUserBusinesses(userId) {
  const result = await pool.query(
    `SELECT b.*, ubr.role
     FROM businesses b
     JOIN user_business_roles ubr ON b.business_id = ubr.business_id
     WHERE ubr.user_id = $1 AND ubr.is_deleted = false
     ORDER BY b.created_at DESC`,
    [userId]
  );

  return result.rows;
}
