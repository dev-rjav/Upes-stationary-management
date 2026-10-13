import client from './client';

export const getMonthlyReport = (params) => client.get('/reports/monthly', { params });
export const downloadReport = (params) => {
  const clean = Object.fromEntries(
    Object.entries(params).filter(([, v]) => v != null && v !== '' && v !== 'undefined')
  );
  const qs = new URLSearchParams(clean).toString();
  window.open(`/api/reports/download?${qs}`, '_blank');
};
