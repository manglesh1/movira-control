export const ACCESS_POLICIES = Object.freeze({
  control: ["saas.control.access"],
  plans: ["saas.control.access"],
  billing: ["saas.control.access"],
  payments: ["saas.control.access"],
  venues: ["saas.control.access"],
  gateways: ["saas.control.access"],
  support: ["saas.control.access"],
  settings: ["saas.control.access"],
});

export function isSuperAdmin(user) {
  const role = String(user?.role || user?.roleName || "")
    .trim()
    .toLowerCase()
    .replace(/[_-]+/g, " ");
  return (
    Number(user?.user_id ?? user?.userId ?? user?.id) === 1 ||
    Number(user?.role_id ?? user?.roleId) === 1 ||
    role === "super admin"
  );
}

export function canAccessPolicy(auth, policyName) {
  if (!auth?.token) return false;
  if (isSuperAdmin(auth.user)) return true;
  const required = ACCESS_POLICIES[policyName];
  if (!required?.length) return false;
  const granted = new Set(auth.actionPermissions || []);
  return required.some((permission) => granted.has(permission));
}

export function firstAccessiblePath(auth) {
  const candidates = [
    ["control", "/movira-control/parks"],
    ["plans", "/movira-control/plans"],
    ["billing", "/movira-control/billing"],
    ["payments", "/movira-control/payments"],
  ];
  return candidates.find(([policy]) => canAccessPolicy(auth, policy))?.[1] || null;
}
