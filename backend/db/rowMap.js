function firmToRow(firm) {
  return {
    id: firm.id,
    company_name: firm.companyName,
    status: firm.status || "active",
    created_at: firm.createdAt || new Date().toISOString(),
  };
}

function firmFromRow(row) {
  if (!row) return null;
  return {
    id: row.id,
    companyName: row.company_name,
    status: row.status || "active",
    createdAt: row.created_at,
  };
}

function userToRow(user) {
  const row = {
    id: user.id,
    email: user.email,
    name: user.name ?? "",
    contact_number: user.contactNumber ?? "",
    role: user.role,
    department: user.department ?? null,
    firm_id: user.firmId ?? null,
    company_name: user.companyName ?? null,
    status: user.status,
    password_hash: user.passwordHash ?? null,
    created_by: user.createdBy ?? null,
    created_at: user.createdAt || new Date().toISOString(),
    registered_at: user.registeredAt ?? null,
    password_reset_token: user.passwordResetToken ?? null,
    password_reset_expires: user.passwordResetExpires ?? null,
  };
  return row;
}

function userFromRow(row) {
  if (!row) return null;
  const user = {
    id: row.id,
    email: row.email,
    name: row.name ?? "",
    contactNumber: row.contact_number ?? "",
    role: row.role,
    department: row.department ?? null,
    firmId: row.firm_id ?? null,
    companyName: row.company_name ?? null,
    status: row.status,
    passwordHash: row.password_hash ?? null,
    createdBy: row.created_by ?? null,
    createdAt: row.created_at,
    registeredAt: row.registered_at ?? undefined,
  };
  if (row.password_reset_token) {
    user.passwordResetToken = row.password_reset_token;
  }
  if (row.password_reset_expires) {
    user.passwordResetExpires = row.password_reset_expires;
  }
  return user;
}

module.exports = { firmToRow, firmFromRow, userToRow, userFromRow };
