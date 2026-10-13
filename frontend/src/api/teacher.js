import client from './client';

export const lookupSAP = (sap_id) => client.post('/teacher/lookup', { sap_id });
export const listClusters = () => client.get('/clusters');
export const getClusterItems = (clusterId, sap_id) =>
  client.get(`/clusters/${clusterId}/items`, { params: { sap_id } });
// Toggle department-wide cap removal
export const setClusterCaps = (clusterId, caps_disabled) =>
  client.patch(`/clusters/${clusterId}`, { caps_disabled });
