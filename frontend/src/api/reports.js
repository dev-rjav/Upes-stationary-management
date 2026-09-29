import client from "./client";

export const listReports = () => client.get("/reports");
export const getReport = (kind, month) => client.get(`/reports/${kind}`, { params: month ? { month } : {} });
export const reportCsvUrl = (kind, month) => `/api/reports/${kind}/csv${month ? `?month=${month}` : ""}`;