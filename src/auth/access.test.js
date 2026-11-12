import test from "node:test";
import assert from "node:assert/strict";
import { canAccessPolicy, firstAccessiblePath, isSuperAdmin } from "./access.js";

test("super admin is recognized across backend user shapes", () => {
  assert.equal(isSuperAdmin({ role_id: 1 }), true);
  assert.equal(isSuperAdmin({ role: "Super Admin" }), true);
  assert.equal(isSuperAdmin({ role_id: 4, role: "Manager" }), false);
});

test("policy access requires an authenticated granted action", () => {
  const base = { token: "jwt", user: { role_id: 4 } };
  assert.equal(canAccessPolicy(base, "control"), false);
  assert.equal(
    canAccessPolicy({ ...base, actionPermissions: ["saas.control.access"] }, "control"),
    true
  );
  assert.equal(canAccessPolicy({ ...base, actionPermissions: ["saas.control.access"] }, "gateways"), true);
  assert.equal(canAccessPolicy({ ...base, actionPermissions: ["saas.control.access"] }, "unknown"), false);
  assert.equal(canAccessPolicy({ ...base, token: null }, "control"), false);
});

test("home route resolves to the first authorized workspace", () => {
  assert.equal(
    firstAccessiblePath({
      token: "jwt",
      user: { role_id: 4 },
      actionPermissions: ["saas.control.access"],
    }),
    "/movira-control/parks"
  );
  assert.equal(firstAccessiblePath({ token: "jwt", user: { role_id: 4 } }), null);
});

test("location transfers require platform super-administrator access", () => {
 assert.equal(canAccessPolicy({token:"jwt",user:{role_id:4},actionPermissions:["saas.control.access"]},"transfers"),false);
 assert.equal(canAccessPolicy({token:"jwt",user:{role_id:1}},"transfers"),true);
});
