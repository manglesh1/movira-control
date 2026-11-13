import { createElement } from "react";
import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import { FiCreditCard, FiDollarSign, FiGrid, FiLayers, FiLogOut, FiSettings, FiSliders, FiLifeBuoy, FiDatabase, FiMail } from "react-icons/fi";
import { logout } from "../features/auth/authSlice";
import { useLogoutMutation } from "../features/auth/authApi";
import { canAccessPolicy, isSuperAdmin } from "../auth/access";
import ThemeToggle from "../components/ThemeToggle";

const navItems = [
  { to: "/movira-control/parks", label: "Control", icon: FiGrid, policy: "control" },
  { to: "/movira-control/plans", label: "Plans", icon: FiLayers, policy: "plans" },
  { to: "/movira-control/billing", label: "SaaS Billing", icon: FiDollarSign, policy: "billing" },
  { to: "/movira-control/payments", label: "Payments", icon: FiCreditCard, policy: "payments" },
  { to: "/movira-control/payments/gateways", label: "Gateways", icon: FiSettings, policy: "gateways" },
  { to: "/movira-control/support", label: "Support", icon: FiLifeBuoy, policy: "support" },
  { to: "/movira-control/transfers", label: "Transfers", icon: FiDatabase, policy: "transfers" },
  { to: "/movira-control/email", label: "Email", icon: FiMail, policy: "settings", superAdminOnly: true },
  { to: "/movira-control/settings", label: "Settings", icon: FiSliders, policy: "settings" },
];

const MOVIRA360_MARK_SRC = "/branding/movira360-logo.png";

function initialsFor(user) {
  const name = user?.name || user?.firstName || user?.email || "MC";
  return name
    .split(/[ @.]/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();
}

export default function ControlAdminLayout() {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const auth = useSelector((state) => state.auth);
  const user = auth.user;
  const [endSession] = useLogoutMutation();
  const visibleNavItems = navItems.filter((item) => canAccessPolicy(auth, item.policy) && (!item.superAdminOnly || isSuperAdmin(user)));

  async function handleLogout() {
    try {
      await endSession().unwrap();
    } catch {
      dispatch(logout());
    } finally {
      localStorage.removeItem("movira.superadmin.auth");
      navigate("/login", { replace: true });
    }
  }

  return (
    <div className="min-h-screen overflow-x-clip bg-[var(--surface-app)] text-[var(--text-strong)]">
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-[68px] flex-col bg-[var(--admin-rail-bg)] shadow-[var(--shadow-sidebar)] lg:flex">
        <div className="flex h-16 items-center justify-center border-b border-white/10">
          <div className="grid h-11 w-11 place-items-center overflow-hidden rounded-xl border border-white/25 bg-white/95 p-1 shadow-[0_4px_0_rgba(0,0,0,0.22)]">
            <img
              src={MOVIRA360_MARK_SRC}
              alt="Movira360"
              className="h-full w-full object-contain"
            />
          </div>
        </div>

        <nav className="flex-1 space-y-1 px-1.5 py-2">
          {visibleNavItems.map(({ to, label, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              end={to === "/movira-control/payments"}
              className={({ isActive }) =>
                `mx-auto flex h-[50px] w-[56px] flex-col items-center justify-center gap-0.5 rounded-lg text-center text-[9px] font-black leading-tight transition ${
                  isActive
                    ? "bg-[var(--brand-primary)] text-white shadow-[0_3px_0_var(--brand-primary-deep)]"
                    : "text-stone-200/80 hover:bg-white/10 hover:text-white"
                }`
              }
            >
              {createElement(Icon, { className: "text-[13px]" })}
              <span>{label}</span>
            </NavLink>
          ))}
        </nav>

        <div className="border-t border-white/10 p-1.5">
          <button
            type="button"
            onClick={handleLogout}
            className="mx-auto flex h-[50px] w-[56px] flex-col items-center justify-center gap-0.5 rounded-lg text-center text-[9px] font-black text-stone-200/80 transition hover:bg-white/10 hover:text-white"
          >
            <FiLogOut className="text-[13px]" />
            Sign out
          </button>
        </div>
      </aside>

      <div className="pt-14 lg:pl-[68px]">
        <header
          data-control-header
          className="fixed inset-x-0 top-0 z-40 flex h-14 items-center justify-between gap-2 border-b border-[var(--stroke-soft)] bg-[var(--surface-header)]/95 px-2.5 py-1.5 shadow-[var(--shadow-header)] backdrop-blur lg:left-[68px] lg:px-4"
        >
          <div className="flex min-w-0 items-center gap-2 lg:hidden">
            <div className="grid h-9 w-9 place-items-center overflow-hidden rounded-lg border border-[var(--mc-border-strong)] bg-white/95 p-1 shadow-sm">
              <img src={MOVIRA360_MARK_SRC} alt="Movira360" className="h-full w-full object-contain" />
            </div>
            <div className="min-w-0">
              <p className="truncate text-base font-black">Movira360 Control</p>
              <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-stone-500">
                SaaS admin
              </p>
            </div>
          </div>
          <div className="hidden min-w-0 items-center lg:flex">
            <div>
              <p className="text-lg font-black tracking-tight">Movira360 Control</p>
              <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-[var(--brand-accent)]">
                Locations, billing, onboarding, and payment routing.
              </p>
            </div>
          </div>
          <div className="flex min-w-0 shrink-0 items-center gap-2 sm:gap-3">
            <ThemeToggle />
            <div className="hidden min-w-0 max-w-[220px] text-right sm:block">
              <p className="truncate text-sm font-black">{user?.name || user?.email || "Admin"}</p>
              <p className="truncate text-xs font-semibold text-stone-500">{user?.email || "Movira"}</p>
            </div>
            <div className="grid h-9 w-9 place-items-center rounded-full border-2 border-stone-950 bg-violet-600 text-xs font-black text-white shadow-[0_3px_0_#111]">
              {initialsFor(user)}
            </div>
            <button
              type="button"
              onClick={handleLogout}
              className="inline-flex min-h-9 items-center justify-center gap-1.5 rounded-lg border border-[var(--stroke-soft)] bg-[var(--surface-panel)] px-2.5 py-1.5 text-xs font-black text-[var(--text-base)] shadow-sm transition hover:-translate-y-0.5 hover:border-[var(--brand-primary-border)] hover:bg-[var(--surface-muted)] hover:text-[var(--text-strong)] focus:outline-none focus:ring-4 focus:ring-[var(--brand-primary)]/15 lg:hidden"
              aria-label="Sign out"
            >
              <FiLogOut className="text-sm" />
              <span className="hidden sm:inline">Sign out</span>
            </button>
          </div>
        </header>

        <main className="min-h-[calc(100vh-56px)] overflow-x-hidden bg-[var(--surface-app)] p-2.5 pb-24 sm:p-3 sm:pb-24 lg:p-4 lg:pb-4">
          <div className="mx-auto w-full max-w-[1680px]">
            <Outlet />
          </div>
        </main>
      </div>

      <nav className="fixed inset-x-0 bottom-0 z-50 border-t border-white/10 bg-[var(--admin-rail-bg)] px-1.5 pb-[max(env(safe-area-inset-bottom),6px)] pt-1.5 shadow-[var(--shadow-header)] backdrop-blur lg:hidden">
        <div
          className="grid gap-1"
          style={{ gridTemplateColumns: `repeat(${Math.max(visibleNavItems.length, 1)}, minmax(0, 1fr))` }}
        >
          {visibleNavItems.map(({ to, label, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              end={to === "/movira-control/payments"}
              className={({ isActive }) =>
                `flex min-w-0 flex-col items-center justify-center gap-0.5 rounded-lg px-1 py-1.5 text-center text-[9px] font-black leading-tight transition ${
                  isActive
                    ? "bg-[var(--brand-primary)] text-white shadow-[0_2px_0_var(--brand-primary-deep)]"
                    : "text-stone-200/80 hover:bg-white/10 hover:text-white"
                }`
              }
            >
              {createElement(Icon, { className: "text-[13px]" })}
              <span className="w-full truncate">{label}</span>
            </NavLink>
          ))}
        </div>
      </nav>
    </div>
  );
}
