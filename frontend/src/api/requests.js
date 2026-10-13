import client from './client';

export const submitRequest = (data) => client.post('/requests', data);
export const listRequests = (params) => client.get('/requests', { params });
export const approveRequest = (id) => client.patch(`/requests/${id}/approve`);
export const rejectRequest = (id, reason) => client.patch(`/requests/${id}/reject`, { reason });
export const createManualRequest = (data) => client.post('/requests/manual', data);
