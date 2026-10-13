import client from './client';

export const listItems = () => client.get('/items');
export const createItem = (data) => client.post('/items', data);
export const updateItem = (id, data) => client.patch(`/items/${id}`, data);
export const listAliases = (id) => client.get(`/items/${id}/aliases`);
export const addAlias = (id, alias) => client.post(`/items/${id}/aliases`, { alias });
export const getClusterItems = (clusterId) => client.get(`/clusters/${clusterId}/all-items`);
export const setClusterItems = (clusterId, items) => client.put(`/clusters/${clusterId}/items`, { items });
export const patchClusterItem = (clusterId, itemId, data) =>
  client.patch(`/clusters/${clusterId}/items/${itemId}`, data);
