import client from "./client";

export const listStock = (params = {}) => client.get("/stock", { params });
export const stockIn = (data) => client.post("/stock/in", data);
export const stockHistory = (perPage = 30) => client.get("/stock/history", { params: { per_page: perPage } });
export const parseImport = (file) => {
  const fd = new FormData();
  fd.append("file", file);
  return client.post("/stock/import/parse", fd, { headers: { "Content-Type": "multipart/form-data" } });
};
export const runImport = (payload) => client.post("/stock/import", payload);