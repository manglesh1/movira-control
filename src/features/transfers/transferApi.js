import { baseApi } from '../../api/baseApi';
const root = '/saas/location-transfers';
export const transferApi = baseApi.injectEndpoints({ endpoints: builder => ({
  transferSettings: builder.query({ query: () => `${root}/settings`, providesTags: ['SaasControl'] }),
  transfers: builder.query({ query: () => root, providesTags: ['SaasControl'] }),
  transfer: builder.query({ query: id => `${root}/${encodeURIComponent(id)}`, providesTags: ['SaasControl'] }),
  previewTransfer: builder.mutation({ query: body => ({ url: `${root}/preview`, method: 'POST', body }), invalidatesTags: ['SaasControl'] }),
  applyTransfer: builder.mutation({ query: ({ id, planHash }) => ({ url: `${root}/${encodeURIComponent(id)}/apply`, method: 'POST', body: { planHash } }), invalidatesTags: ['SaasControl'] }),
  cancelTransfer: builder.mutation({ query: id => ({ url: `${root}/${encodeURIComponent(id)}/cancel`, method: 'POST' }), invalidatesTags: ['SaasControl'] }),
}) });
export const { useTransferSettingsQuery, useTransfersQuery, useTransferQuery, usePreviewTransferMutation, useApplyTransferMutation, useCancelTransferMutation } = transferApi;
