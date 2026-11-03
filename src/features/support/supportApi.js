import {baseApi} from '../../api/baseApi';
const root='/saas/support';
export const supportApi=baseApi.injectEndpoints({endpoints:b=>({
 supportLocations:b.query({query:()=>`${root}/locations`,providesTags:['SaasControl']}),
 supportReport:b.mutation({query:locationId=>({url:`${root}/report?locationId=${encodeURIComponent(locationId)}`,responseHandler:async r=>r.ok?{url:URL.createObjectURL(await r.blob())}:r.json()})}),
 controlTickets:b.query({query:args=>`${root}/tickets?${new URLSearchParams(Object.entries(args||{}).filter(([,v])=>v&&v!=='all'))}`,providesTags:['SaasControl']}),
 controlTicket:b.query({query:id=>`${root}/tickets/${id}`,providesTags:['SaasControl']}),
 controlAgents:b.query({query:()=>`${root}/agents`,providesTags:['SaasControl']}),
 deleteControlAgent:b.mutation({query:key=>({url:`${root}/agents/${key}`,method:'DELETE'}),invalidatesTags:['SaasControl']}),
 saveControlAgent:b.mutation({query:({key,...body})=>({url:`${root}/agents${key?`/${key}`:''}`,method:key?'PATCH':'POST',body}),invalidatesTags:['SaasControl']}),
 changeControlTicket:b.mutation({query:({id,...body})=>({url:`${root}/tickets/${id}`,method:'PATCH',body}),invalidatesTags:['SaasControl']}),
 replyControlTicket:b.mutation({query:({id,...body})=>({url:`${root}/tickets/${id}/messages`,method:'POST',body}),invalidatesTags:['SaasControl']}),
 controlNotifications:b.query({query:()=>`${root}/notifications`,providesTags:['SaasControl']}),
 readControlNotification:b.mutation({query:id=>({url:`${root}/notifications/${id}/read`,method:'PATCH'}),invalidatesTags:['SaasControl']}),
 controlAttachment:b.mutation({query:id=>({url:`${root}/attachments/${id}`,responseHandler:async r=>r.ok?{url:URL.createObjectURL(await r.blob())}:r.json()})})
})});
export const {useSupportLocationsQuery,useSupportReportMutation,useControlTicketsQuery,useControlTicketQuery,useControlAgentsQuery,useSaveControlAgentMutation,useDeleteControlAgentMutation,useChangeControlTicketMutation,useReplyControlTicketMutation,useControlNotificationsQuery,useReadControlNotificationMutation,useControlAttachmentMutation}=supportApi;
