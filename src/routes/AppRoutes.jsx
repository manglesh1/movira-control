import { Suspense, lazy } from "react";
import {
  BrowserRouter as Router,
  Navigate,
  Route,
  Routes,
  useParams,
} from "react-router-dom";
import ProtectedRoute from "./ProtectedRoute";
import Loader from "../components/Loader";
import ControlAdminLayout from "../layouts/ControlAdminLayout";
import AccessDenied from "../pages/AccessDenied";
import NotFound from "../pages/NotFound";
import { firstAccessiblePath } from "../auth/access";
import { isValidParkSection } from "./routeConfig";
import { useSelector } from "react-redux";

const Login = lazy(() => import("../pages/auth/Login"));
const PlansPage = lazy(() =>
  import("../pages/saas/MoviraControl").then((module) => ({ default: module.PlansManager }))
);
const ParksPage = lazy(() =>
  import("../pages/saas/MoviraControl").then((module) => ({ default: module.ParksList }))
);
const ParkFormPage = lazy(() =>
  import("../pages/saas/MoviraControl").then((module) => ({ default: module.ParkForm }))
);
const ParkDetailPage = lazy(() =>
  import("../pages/saas/MoviraControl").then((module) => ({ default: module.ParkDetail }))
);
const PaymentOverviewPage = lazy(() => import("../paymentConsole/pages/OverviewPage"));
const PaymentVenuesPage = lazy(() => import("../paymentConsole/pages/VenuesPage"));
const PaymentVenueDetailPage = lazy(() => import("../paymentConsole/pages/VenueDetailPage"));
const PaymentPaymentsPage = lazy(() => import("../paymentConsole/pages/PaymentsPage"));
const PaymentPlatformBillingPage = lazy(() => import("../paymentConsole/pages/PlatformBillingPage"));
const SupportWorkspace = lazy(() => import("../pages/support/SupportWorkspace"));
const LocationTransfersPage = lazy(() => import("../pages/transfers/LocationTransfers"));
const ControlSettingsPage = lazy(() => import("../pages/saas/ControlSettings"));

function ControlGuard() {
  return (
    <ProtectedRoute>
      <ControlAdminLayout />
    </ProtectedRoute>
  );
}

function PolicyRoute({ policy, children }) {
  return <ProtectedRoute policy={policy}>{children}</ProtectedRoute>;
}

function HomeRoute() {
  const auth = useSelector((state) => state.auth);
  const path = firstAccessiblePath(auth);
  return path ? <Navigate to={path} replace /> : <AccessDenied />;
}

function ParkDetailRoute() {
  const { section } = useParams();
  return isValidParkSection(section) ? <ParkDetailPage /> : <NotFound />;
}

function LegacyPaymentVenueRedirect() {
  const { locationId } = useParams();
  return <Navigate to={`/movira-control/payments/venues/${locationId}`} replace />;
}

export default function AppRoutes() {
  return (
    <Router basename={import.meta.env.BASE_URL.replace(/\/$/, "") || "/"}>
      <Suspense fallback={<Loader />}>
        <Routes>
          <Route path="/login" element={<Login />} />

          <Route element={<ControlGuard />}>
            <Route path="/" element={<HomeRoute />} />
            <Route path="/movira-control" element={<Navigate to="/movira-control/parks" replace />} />
            <Route path="/movira-control/plans" element={<PolicyRoute policy="plans"><PlansPage /></PolicyRoute>} />
            <Route path="/movira-control/parks" element={<PolicyRoute policy="control"><ParksPage /></PolicyRoute>} />
            <Route path="/movira-control/parks/new" element={<PolicyRoute policy="control"><ParkFormPage /></PolicyRoute>} />
            <Route path="/movira-control/parks/:locationId/edit" element={<PolicyRoute policy="control"><ParkFormPage /></PolicyRoute>} />
            <Route path="/movira-control/parks/:locationId" element={<PolicyRoute policy="control"><ParkDetailRoute /></PolicyRoute>} />
            <Route path="/movira-control/parks/:locationId/:section" element={<PolicyRoute policy="control"><ParkDetailRoute /></PolicyRoute>} />

            <Route path="/movira-control/payments" element={<PolicyRoute policy="payments"><PaymentOverviewPage /></PolicyRoute>} />
            <Route path="/movira-control/billing" element={<PolicyRoute policy="billing"><PaymentPlatformBillingPage /></PolicyRoute>} />
            <Route path="/movira-control/payments/venues" element={<PolicyRoute policy="venues"><PaymentVenuesPage /></PolicyRoute>} />
            <Route path="/movira-control/payments/venues/:locationId" element={<PolicyRoute policy="venues"><PaymentVenueDetailPage /></PolicyRoute>} />
            <Route path="/movira-control/payments/gateways" element={<PolicyRoute policy="gateways"><PaymentPaymentsPage /></PolicyRoute>} />
            <Route path="/movira-control/support" element={<PolicyRoute policy="support"><SupportWorkspace /></PolicyRoute>} />
            <Route path="/movira-control/transfers" element={<PolicyRoute policy="transfers"><LocationTransfersPage /></PolicyRoute>} />
            <Route path="/movira-control/settings" element={<PolicyRoute policy="settings"><ControlSettingsPage /></PolicyRoute>} />

            <Route path="/payment-console" element={<Navigate to="/movira-control/payments" replace />} />
            <Route path="/payment-console/platform-billing" element={<Navigate to="/movira-control/billing" replace />} />
            <Route path="/payment-console/venues" element={<Navigate to="/movira-control/payments/venues" replace />} />
            <Route path="/payment-console/venues/:locationId" element={<LegacyPaymentVenueRedirect />} />
            <Route path="/payment-console/payments" element={<Navigate to="/movira-control/payments/gateways" replace />} />
          </Route>

          <Route path="*" element={<NotFound />} />
        </Routes>
      </Suspense>
    </Router>
  );
}
