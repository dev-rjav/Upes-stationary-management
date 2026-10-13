import client from './client';
export const getDashboard = (params) => client.get('/dashboard', { params });
export const getDepartmentBreakdown = (params) => client.get('/dashboard/department', { params });
export const downloadDepartmentBreakdown = (params) => {
  const clean = Object.fromEntries(
    Object.entries(params).filter(([, v]) => v != null && v !== '' && v !== 'undefined')
  );
  const qs = new URLSearchParams(clean).toString();
  window.open(`/api/dashboard/department/download?${qs}`, '_blank');
};
