import client from "./client";

export const listRequests = (params = {}) => client.get("/requests", { params });
export const createRequest = (data) => client.post("/requests", data);
export const createManualRequest = (data) => client.post("/requests/manual", data);
export const fulfillRequest = (id) => client.post(`/requests/${id}/fulfill`);
export const rejectRequest = (id) => client.post(`/requests/${id}/reject`);