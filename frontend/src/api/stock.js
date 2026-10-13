import client from './client';

export const getStock = () => client.get('/stock');
export const manualStockIn = (data) => client.post('/stock-in', data);
export const parseExcel = (file) => {
  const form = new FormData();
  form.append('file', file);
  return client.post('/stock-in/parse-excel', form, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
};
export const confirmExcel = (data) => client.post('/stock-in/confirm', data);
