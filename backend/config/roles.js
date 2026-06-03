const ROLES = {
  SUPER_ADMIN: "super_admin",
  FIRM_ADMIN: "firm_admin",
  TEAM_MEMBER: "team_member",
};

const DEPARTMENTS = {
  PRODUCTION: "production",
  QAQC: "qaqc",
  ADMIN: "admin",
};

const DASHBOARD_TABS = {
  production: { id: "production", label: "Production", pathPrefix: "/production" },
  qaqc: { id: "qaqc", label: "QA / QC", pathPrefix: "/qa" },
  admin: { id: "admin", label: "Admin", pathPrefix: "/admin" },
  teams: { id: "teams", label: "Teams", pathPrefix: "/teams" },
  superAdmin: {
    id: "super_admin",
    label: "Firm Admins",
    pathPrefix: "/super-admin",
  },
};

function getDashboardForUser(user) {
  if (user.role === ROLES.SUPER_ADMIN) {
    return {
      role: ROLES.SUPER_ADMIN,
      department: null,
      tabs: [DASHBOARD_TABS.superAdmin],
      defaultTab: "super_admin",
      homePath: "/super-admin",
    };
  }

  if (user.role === ROLES.FIRM_ADMIN) {
    return {
      role: ROLES.FIRM_ADMIN,
      department: null,
      firmId: user.firmId,
      tabs: [
        DASHBOARD_TABS.production,
        DASHBOARD_TABS.qaqc,
        DASHBOARD_TABS.admin,
        DASHBOARD_TABS.teams,
      ],
      defaultTab: "production",
      homePath: "/production/newrequest",
    };
  }

  if (user.role === ROLES.TEAM_MEMBER) {
    const dept = user.department;
    if (dept === DEPARTMENTS.PRODUCTION) {
      return {
        role: ROLES.TEAM_MEMBER,
        department: dept,
        firmId: user.firmId,
        tabs: [DASHBOARD_TABS.production],
        defaultTab: "production",
        homePath: "/production/newrequest",
      };
    }
    if (dept === DEPARTMENTS.QAQC) {
      return {
        role: ROLES.TEAM_MEMBER,
        department: dept,
        firmId: user.firmId,
        tabs: [DASHBOARD_TABS.qaqc],
        defaultTab: "qaqc",
        homePath: "/qa/pending",
      };
    }
    if (dept === DEPARTMENTS.ADMIN) {
      return {
        role: ROLES.TEAM_MEMBER,
        department: dept,
        firmId: user.firmId,
        tabs: [DASHBOARD_TABS.admin],
        defaultTab: "admin",
        homePath: "/admin/templates",
      };
    }
  }

  return {
    role: user.role,
    department: user.department,
    firmId: user.firmId,
    tabs: [],
    defaultTab: null,
    homePath: "/",
  };
}

function canAccessFirm(user, firmId) {
  if (user.role === ROLES.SUPER_ADMIN) return true;
  return user.firmId === firmId;
}

function resolveFirmId(user, requestedFirmId) {
  if (user.role === ROLES.SUPER_ADMIN) return requestedFirmId || null;
  return user.firmId;
}

module.exports = {
  ROLES,
  DEPARTMENTS,
  DASHBOARD_TABS,
  getDashboardForUser,
  canAccessFirm,
  resolveFirmId,
};
