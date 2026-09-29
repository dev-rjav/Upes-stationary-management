import client from "./client";

export const listRequests = (params = {}) => client.get("/requests", { params });
export const createRequest = (data) => client.post("/requests", data);
export const createManualRequest = (data) => client.post("/requests/manual", data);
export const fulfillRequest = (id) => client.post(`/requests/${id}/fulfill`);
export const rejectRequest = (id, reason) => client.post(`/requests/${id}/reject`, reason ? { reason } : undefined);
export const reopenRequest = (id) => client.post(`/requests/${id}/reopen`);
export const recordReturn = (id, data) => client.post(`/requests/${id}/return`, data);
// public: teacher checks their own requests by number + SAP ID
export const statusLookup = (no, sap) => client.get("/requests/status", { params: { no, sap } });