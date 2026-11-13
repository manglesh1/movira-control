import { baseApi } from "../../api/baseApi";
import { paymentConfigPaths } from "./paymentConfigPaths";

const locationHeaders = (locationId) =>
  Number(locationId) > 0 ? { "X-Location-Id": String(locationId) } : {};

export const moviraControlApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getCustomerAuth: builder.query({
      query: (locationId) => locationId ? `/saas/parks/${locationId}/customer-auth` : "/saas/customer-auth",
      providesTags: [{ type: "SaasControl", id: "customer-auth" }],
      transformResponse: response => response.data,
    }),
    saveCustomerAuth: builder.mutation({
      query: ({ locationId, provider, ...body }) => ({
        url: locationId ? `/saas/parks/${locationId}/customer-auth/${provider}` : `/saas/customer-auth/${provider}`,
        method: "PUT", body,
      }),
      invalidatesTags: [{ type: "SaasControl", id: "customer-auth" }],
    }),
    getSaasPlatformSettings: builder.query({
      query: () => "/saas/settings",
      providesTags: [{ type: "SaasControl", id: "platform-settings" }],
      transformResponse: (response) => response?.data || response || {},
    }),
    updateSaasPlatformSettings: builder.mutation({
      query: (body) => ({ url: "/saas/settings", method: "PUT", body }),
      invalidatesTags: [{ type: "SaasControl", id: "platform-settings" }],
      transformResponse: (response) => response?.data || response,
    }),
    getSaasParks: builder.query({
      query: ({ page = 1, limit = 12, search = "", includeArchived = false, status = "active", organizationId = "" } = {}) => ({
        url: "/saas/parks",
        params: { page, limit, search, includeArchived, status, organizationId },
      }),
      providesTags: ["SaasControl"],
      transformResponse: (response) => response?.data || response || {},
    }),
    getSaasParkByLocationId: builder.query({
      query: (locationId) => `/saas/parks/${locationId}`,
      providesTags: (result, error, locationId) => [{ type: "SaasControl", id: locationId }],
      transformResponse: (response) => response?.data || response,
    }),
    getSaasPlans: builder.query({
      query: ({ includeArchived = false, includeInternal = true } = {}) => ({
        url: "/saas/plans",
        params: { includeArchived, includeInternal },
      }),
      providesTags: [{ type: "SaasControl", id: "plans" }],
      transformResponse: (response) => response?.data || response || {},
    }),
    createSaasPlan: builder.mutation({
      query: (body) => ({
        url: "/saas/plans",
        method: "POST",
        body,
      }),
      invalidatesTags: ["SaasControl", { type: "SaasControl", id: "plans" }],
      transformResponse: (response) => response?.data || response,
    }),
    updateSaasPlan: builder.mutation({
      query: ({ planKey, ...body }) => ({
        url: `/saas/plans/${planKey}`,
        method: "PATCH",
        body,
      }),
      invalidatesTags: ["SaasControl", { type: "SaasControl", id: "plans" }],
      transformResponse: (response) => response?.data || response,
    }),
    deleteSaasPlan: builder.mutation({
      query: (planKey) => ({
        url: `/saas/plans/${planKey}`,
        method: "DELETE",
      }),
      invalidatesTags: ["SaasControl", { type: "SaasControl", id: "plans" }],
      transformResponse: (response) => response?.data || response,
    }),
    getSaasModules: builder.query({
      query: ({ includeInactive = false } = {}) => ({
        url: "/saas/modules",
        params: { includeInactive },
      }),
      providesTags: [{ type: "SaasControl", id: "modules" }],
      transformResponse: (response) => response?.data || response || {},
    }),
    updateSaasModule: builder.mutation({
      query: ({ moduleKey, ...body }) => ({
        url: `/saas/modules/${moduleKey}`,
        method: "PATCH",
        body,
      }),
      invalidatesTags: ["SaasControl", { type: "SaasControl", id: "modules" }],
      transformResponse: (response) => response?.data || response,
    }),
    getSaasParkAuditLogs: builder.query({
      query: ({ locationId, page = 1, limit = 25, search = "", action = "all", from = "", to = "" } = {}) => ({
        url: `/saas/parks/${locationId}/audit`,
        params: { page, limit, search, action, from, to },
      }),
      providesTags: (result, error, { locationId } = {}) => [{ type: "SaasControl", id: `audit-${locationId}` }],
      transformResponse: (response) => response?.data || response || {},
    }),
    getSaasParkPaymentEvents: builder.query({
      query: ({ locationId, page = 1, limit = 25, search = "", status = "all", eventType = "all", from = "", to = "" } = {}) => ({
        url: `/saas/parks/${locationId}/payment-events`,
        params: { page, limit, search, status, eventType, from, to },
      }),
      providesTags: (result, error, { locationId } = {}) => [{ type: "SaasControl", id: `payment-events-${locationId}` }],
      transformResponse: (response) => response?.data || response || {},
    }),
    createSaasPark: builder.mutation({
      query: (body) => ({
        url: "/saas/parks",
        method: "POST",
        body,
      }),
      invalidatesTags: ["SaasControl", "Parks"],
    }),
    createSaasCustomerOwner: builder.mutation({
      query: (body) => ({
        url: "/saas/customer-owners",
        method: "POST",
        body,
      }),
      invalidatesTags: ["Users"],
      transformResponse: (response) => response?.data || response,
    }),
    resendSaasOwnerAccess: builder.mutation({
      query: ({ locationId, ...body }) => ({
        url: `/saas/parks/${locationId}/owner-access/resend`,
        method: "POST",
        body,
      }),
      invalidatesTags: (result, error, { locationId }) => [
        "Users",
        "SaasControl",
        { type: "SaasControl", id: locationId },
        { type: "SaasControl", id: `audit-${locationId}` },
      ],
      transformResponse: (response) => response?.data || response,
    }),
    updateSaasPark: builder.mutation({
      query: ({ locationId, ...body }) => ({
        url: `/saas/parks/${locationId}`,
        method: "PATCH",
        body,
      }),
      invalidatesTags: (result, error, { locationId }) => ["SaasControl", "Parks", { type: "SaasControl", id: locationId }, { type: "SaasControl", id: `audit-${locationId}` }],
    }),
    updateSaasParkModules: builder.mutation({
      query: ({ locationId, modules }) => ({
        url: `/saas/parks/${locationId}/modules`,
        method: "PATCH",
        body: { modules },
      }),
      invalidatesTags: (result, error, { locationId }) => ["SaasControl", { type: "SaasControl", id: locationId }, { type: "SaasControl", id: `audit-${locationId}` }],
    }),
    updateSaasParkTicketControls: builder.mutation({
      query: ({ locationId, ticketControls }) => ({
        url: `/saas/parks/${locationId}/ticket-controls`,
        method: "PATCH",
        body: { ticketControls },
      }),
      invalidatesTags: (result, error, { locationId }) => ["SaasControl", { type: "SaasControl", id: locationId }, { type: "SaasControl", id: `audit-${locationId}` }],
    }),
    updateSaasParkPayments: builder.mutation({
      query: ({ locationId, ...body }) => ({
        url: `/saas/parks/${locationId}/payments`,
        method: "PATCH",
        body,
      }),
      invalidatesTags: (result, error, { locationId }) => [
        "SaasControl",
        { type: "SaasControl", id: locationId },
        { type: "SaasControl", id: `audit-${locationId}` },
        { type: "SaasControl", id: `payment-events-${locationId}` },
      ],
    }),
    getPaymentProviderSchemas: builder.query({
      query: (locationId) => ({
        url: "/payments/config/providers/schemas",
        headers: locationHeaders(locationId),
      }),
      providesTags: ["Payment"],
      transformResponse: (response) => response?.data || response || {},
    }),
    getPaymentCompatibility: builder.query({
      query: (locationId) => ({
        url: "/payments/config/compatibility",
        headers: locationHeaders(locationId),
      }),
      providesTags: ["Payment"],
      transformResponse: (response) => response?.data || response || {},
    }),
    getPaymentCredentials: builder.query({
      query: (locationId) => ({
        url: "/payments/config/credentials",
        headers: locationHeaders(locationId),
      }),
      providesTags: ["Payment"],
      transformResponse: (response) => response?.data || response || [],
    }),
    getSaasPlatformBillingGateway: builder.query({
      query: ({ channel = "payment_link", currency = "", mode = "" } = {}) => ({
        url: "/saas/platform-billing-gateway",
        params: { channel, currency, mode },
      }),
      providesTags: [{ type: "SaasControl", id: "platform-billing-gateway" }],
      transformResponse: (response) => response?.data || response || {},
    }),
    upsertSaasPlatformBillingGateway: builder.mutation({
      query: (body) => ({
        url: "/saas/platform-billing-gateway",
        method: "PUT",
        body,
      }),
      invalidatesTags: [{ type: "SaasControl", id: "platform-billing-gateway" }],
      transformResponse: (response) => response?.data || response,
    }),
    createPaymentCredential: builder.mutation({
      query: (body) => ({
        url: "/payments/config/credentials",
        method: "POST",
        body,
        headers: locationHeaders(body.locationId),
      }),
      invalidatesTags: ["Payment", "SaasControl"],
      transformResponse: (response) => response?.data || response,
    }),
    updatePaymentCredential: builder.mutation({
      query: ({ credentialId, locationId, ...body }) => ({
        url: `/payments/config/credentials/${credentialId}`,
        method: "PATCH",
        body,
        headers: locationHeaders(locationId),
      }),
      invalidatesTags: ["Payment", "SaasControl"],
      transformResponse: (response) => response?.data || response,
    }),
    deletePaymentCredential: builder.mutation({
      query: ({ credentialId, locationId }) => ({
        url: `/payments/config/credentials/${credentialId}`,
        method: "DELETE",
        headers: locationHeaders(locationId),
      }),
      invalidatesTags: ["Payment", "SaasControl"],
    }),
    testPaymentCredential: builder.mutation({
      query: (body) => ({
        url: "/payments/config/test-connection",
        method: "POST",
        body,
        headers: locationHeaders(body.locationId),
      }),
    }),
    getVenuePaymentRoutes: builder.query({
      query: (locationId) => paymentConfigPaths.routeList(locationId),
      providesTags: (result, error, locationId) => [{ type: "Payment", id: `routes-${locationId}` }],
      transformResponse: (response) => response?.data || response || {},
    }),
    upsertVenuePaymentRoute: builder.mutation({
      query: ({ locationId, channel, ...body }) => ({
        url: paymentConfigPaths.route(locationId, channel),
        method: "PUT",
        body,
      }),
      invalidatesTags: (result, error, { locationId }) => ["Payment", { type: "Payment", id: `routes-${locationId}` }, { type: "SaasControl", id: locationId }],
      transformResponse: (response) => response?.data || response,
    }),
    deleteVenuePaymentRoute: builder.mutation({
      query: ({ locationId, channel }) => ({
        url: paymentConfigPaths.route(locationId, channel),
        method: "DELETE",
      }),
      invalidatesTags: (result, error, { locationId }) => ["Payment", { type: "Payment", id: `routes-${locationId}` }, { type: "SaasControl", id: locationId }],
    }),
    getVenuePosTree: builder.query({
      query: (locationId) => paymentConfigPaths.posTree(locationId),
      providesTags: (result, error, locationId) => [{ type: "Payment", id: `pos-${locationId}` }],
      transformResponse: (response) => response?.data || response || { routed: false, terminals: [] },
    }),
    createVenueTerminal: builder.mutation({
      query: ({ locationId, name }) => ({
        url: "/pos/devices",
        method: "POST",
        body: { locationId, name },
      }),
      invalidatesTags: (result, error, { locationId }) => [{ type: "Payment", id: `pos-${locationId}` }],
      transformResponse: (response) => response?.data || response,
    }),
    regenerateVenueTerminalPairing: builder.mutation({
      query: ({ posDeviceId, locationId }) => ({
        url: `/pos/devices/${posDeviceId}/regenerate-pairing-code`,
        method: "POST",
        body: {},
        headers: locationHeaders(locationId),
      }),
      invalidatesTags: ["Payment"],
      transformResponse: (response) => response?.data || response,
    }),
    addVenueReader: builder.mutation({
      query: ({ locationId, posDeviceId, ...body }) => ({
        url: paymentConfigPaths.terminalReaders(locationId, posDeviceId),
        method: "POST",
        body,
      }),
      invalidatesTags: (result, error, { locationId }) => [{ type: "Payment", id: `pos-${locationId}` }],
      transformResponse: (response) => response?.data || response,
    }),
    updateVenueReader: builder.mutation({
      query: (args) => {
        const { terminalId, locationId, ...body } = args;
        delete body.locationId;
        return {
          url: `/payments/config/readers/${terminalId}`,
          method: "PATCH",
          body,
          headers: locationHeaders(locationId),
        };
      },
      invalidatesTags: (result, error, { locationId }) => (locationId ? [{ type: "Payment", id: `pos-${locationId}` }] : ["Payment"]),
      transformResponse: (response) => response?.data || response,
    }),
    deleteVenueReader: builder.mutation({
      query: ({ terminalId, locationId }) => ({
        url: `/payments/config/readers/${terminalId}`,
        method: "DELETE",
        headers: locationHeaders(locationId),
      }),
      invalidatesTags: (result, error, { locationId }) => (locationId ? [{ type: "Payment", id: `pos-${locationId}` }] : ["Payment"]),
    }),
    updateSaasParkBilling: builder.mutation({
      query: ({ locationId, ...body }) => ({
        url: `/saas/parks/${locationId}/billing`,
        method: "PATCH",
        body,
      }),
      invalidatesTags: (result, error, { locationId }) => ["SaasControl", { type: "SaasControl", id: locationId }, { type: "SaasControl", id: `audit-${locationId}` }],
    }),
    createSaasInvoicePaymentLink: builder.mutation({
      query: ({ locationId, invoiceId, ...body }) => ({
        url: `/saas/parks/${locationId}/invoices/${invoiceId}/payment-link`,
        method: "POST",
        body,
      }),
      invalidatesTags: (result, error, { locationId }) => [
        "SaasControl",
        { type: "SaasControl", id: locationId },
        { type: "SaasControl", id: `audit-${locationId}` },
        { type: "SaasControl", id: `payment-events-${locationId}` },
      ],
      transformResponse: (response) => response?.data || response,
    }),
    refreshSaasInvoiceLifecycle: builder.mutation({
      query: ({ locationId, asOf } = {}) => ({
        url: `/saas/parks/${locationId}/invoices/lifecycle/refresh`,
        method: "POST",
        body: asOf ? { asOf } : {},
      }),
      invalidatesTags: (result, error, { locationId }) => [
        "SaasControl",
        { type: "SaasControl", id: locationId },
        { type: "SaasControl", id: `audit-${locationId}` },
        { type: "SaasControl", id: `payment-events-${locationId}` },
      ],
      transformResponse: (response) => response?.data || response,
    }),
    voidSaasInvoice: builder.mutation({
      query: ({ locationId, invoiceId, reason }) => ({
        url: `/saas/parks/${locationId}/invoices/${invoiceId}/void`,
        method: "POST",
        body: { reason },
      }),
      invalidatesTags: (result, error, { locationId }) => [
        "SaasControl",
        { type: "SaasControl", id: locationId },
        { type: "SaasControl", id: `audit-${locationId}` },
        { type: "SaasControl", id: `payment-events-${locationId}` },
      ],
      transformResponse: (response) => response?.data || response,
    }),
    refundSaasInvoicePayment: builder.mutation({
      query: ({ locationId, invoiceId, amount, reason, idempotencyKey }) => ({
        url: `/saas/parks/${locationId}/invoices/${invoiceId}/refunds`,
        method: "POST",
        body: { amount, reason, idempotencyKey },
      }),
      invalidatesTags: (result, error, { locationId }) => [
        "SaasControl",
        { type: "SaasControl", id: locationId },
        { type: "SaasControl", id: `audit-${locationId}` },
        { type: "SaasControl", id: `payment-events-${locationId}` },
      ],
      transformResponse: (response) => response?.data || response,
    }),
    getSaasInvoiceDocument: builder.query({
      query: ({ locationId, invoiceId }) => ({
        url: `/saas/parks/${locationId}/invoices/${invoiceId}/document`,
        responseHandler: (response) => response.text(),
      }),
    }),
    // Languages the park may offer (max 2) and its default / guest languages.
    updateSaasParkLanguages: builder.mutation({
      query: ({ locationId, defaultLocale, additionalLocale }) => ({
        url: `/saas/parks/${locationId}/languages`,
        method: "PATCH",
        body: { defaultLocale, additionalLocale: additionalLocale || null },
      }),
      invalidatesTags: (result, error, { locationId }) => ["SaasControl", { type: "SaasControl", id: locationId }, { type: "SaasControl", id: `audit-${locationId}` }],
    }),
    updateSaasParkOnboarding: builder.mutation({
      query: ({ locationId, onboarding, ticketControls }) => ({
        url: `/saas/parks/${locationId}/onboarding`,
        method: "PATCH",
        body: { onboarding, ticketControls },
      }),
      invalidatesTags: (result, error, { locationId }) => ["SaasControl", { type: "SaasControl", id: locationId }, { type: "SaasControl", id: `audit-${locationId}` }],
    }),
    deleteSaasPark: builder.mutation({
      query: (locationId) => ({
        url: `/saas/parks/${locationId}`,
        method: "DELETE",
      }),
      invalidatesTags: ["SaasControl", "Parks"],
    }),
    getSaasParkPermanentDeletePreview: builder.query({
      query: (locationId) => `/saas/parks/${locationId}/permanent-preview`,
      transformResponse: (response) => response?.data || response,
    }),
    permanentDeleteSaasPark: builder.mutation({
      query: ({ locationId, ...body }) => ({
        url: `/saas/parks/${locationId}/permanent`,
        method: "DELETE",
        body,
      }),
      invalidatesTags: ["SaasControl", "Parks"],
    }),
    updateSaasParkLifecycle: builder.mutation({
      query: ({ locationId, ...body }) => ({
        url: `/saas/parks/${locationId}/lifecycle`,
        method: "PATCH",
        body,
      }),
      invalidatesTags: (result, error, { locationId }) => ["SaasControl", "Parks", { type: "SaasControl", id: locationId }, { type: "SaasControl", id: `audit-${locationId}` }],
      transformResponse: (response) => response?.data || response,
    }),
    approveSaasParkGoLive: builder.mutation({
      query: ({ locationId, approvedBy }) => ({
        url: `/saas/parks/${locationId}/go-live`,
        method: "POST",
        body: { approvedBy },
      }),
      invalidatesTags: (result, error, { locationId }) => ["SaasControl", { type: "SaasControl", id: locationId }, { type: "SaasControl", id: `audit-${locationId}` }],
    }),
  }),
});

export const {
  useGetCustomerAuthQuery,
  useSaveCustomerAuthMutation,
  useGetSaasPlatformSettingsQuery,
  useUpdateSaasPlatformSettingsMutation,
  useGetSaasParksQuery,
  useGetSaasParkByLocationIdQuery,
  useGetSaasPlansQuery,
  useCreateSaasPlanMutation,
  useUpdateSaasPlanMutation,
  useDeleteSaasPlanMutation,
  useGetSaasModulesQuery,
  useUpdateSaasModuleMutation,
  useGetSaasParkAuditLogsQuery,
  useGetSaasParkPaymentEventsQuery,
  useCreateSaasParkMutation,
  useCreateSaasCustomerOwnerMutation,
  useResendSaasOwnerAccessMutation,
  useUpdateSaasParkMutation,
  useUpdateSaasParkModulesMutation,
  useUpdateSaasParkTicketControlsMutation,
  useUpdateSaasParkPaymentsMutation,
  useGetPaymentProviderSchemasQuery,
  useGetPaymentCompatibilityQuery,
  useGetPaymentCredentialsQuery,
  useGetSaasPlatformBillingGatewayQuery,
  useUpsertSaasPlatformBillingGatewayMutation,
  useCreatePaymentCredentialMutation,
  useUpdatePaymentCredentialMutation,
  useDeletePaymentCredentialMutation,
  useTestPaymentCredentialMutation,
  useGetVenuePaymentRoutesQuery,
  useUpsertVenuePaymentRouteMutation,
  useDeleteVenuePaymentRouteMutation,
  useGetVenuePosTreeQuery,
  useCreateVenueTerminalMutation,
  useRegenerateVenueTerminalPairingMutation,
  useAddVenueReaderMutation,
  useUpdateVenueReaderMutation,
  useDeleteVenueReaderMutation,
  useUpdateSaasParkBillingMutation,
  useCreateSaasInvoicePaymentLinkMutation,
  useRefreshSaasInvoiceLifecycleMutation,
  useVoidSaasInvoiceMutation,
  useRefundSaasInvoicePaymentMutation,
  useLazyGetSaasInvoiceDocumentQuery,
  useUpdateSaasParkOnboardingMutation,
  useUpdateSaasParkLanguagesMutation,
  useDeleteSaasParkMutation,
  useLazyGetSaasParkPermanentDeletePreviewQuery,
  usePermanentDeleteSaasParkMutation,
  useUpdateSaasParkLifecycleMutation,
  useApproveSaasParkGoLiveMutation,
} = moviraControlApi;

export const controlEmailApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getControlEmailCatalog: builder.query({
      query: () => "/saas/email/templates",
      providesTags: [{ type: "SaasControl", id: "email-catalog" }],
    }),
    getControlEmailTemplate: builder.query({
      query: (id) => `/saas/email/templates/${id}`,
      providesTags: (_result, _error, id) => [{ type: "SaasControl", id }],
    }),
    publishControlEmailTemplate: builder.mutation({
      query: ({ id, ...body }) => ({ url: `/saas/email/templates/${id}`, method: "PUT", body }),
      invalidatesTags: (_result, error, { id }) => error ? [] : [{ type: "SaasControl", id }, { type: "SaasControl", id: "email-catalog" }],
    }),
    previewControlEmailTemplate: builder.mutation({
      query: ({ id, ...body }) => ({ url: `/saas/email/templates/${id}/preview`, method: "POST", body }),
    }),
    restoreControlEmailTemplate: builder.mutation({
      query: ({ id, ...body }) => ({ url: `/saas/email/templates/${id}/restore`, method: "POST", body }),
      invalidatesTags: (_result, error, { id }) => error ? [] : [{ type: "SaasControl", id }, { type: "SaasControl", id: "email-catalog" }],
    }),
    getControlEmailOperations: builder.query({ query: () => "/saas/email/operations" }),
  }),
});

export const {
  useGetControlEmailCatalogQuery,
  useGetControlEmailTemplateQuery,
  usePublishControlEmailTemplateMutation,
  usePreviewControlEmailTemplateMutation,
  useRestoreControlEmailTemplateMutation,
  useGetControlEmailOperationsQuery,
} = controlEmailApi;
