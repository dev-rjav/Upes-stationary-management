import client from "./client";

export const lookupTeacher = (data) => client.post("/teacher/lookup", data);
export const teacherCaps = (sapId) => client.get("/teacher/lookup/caps", { params: { sap_id: sapId } });
export const teacherSuggestions = (q) => client.get("/teacher/suggestions", { params: { q } });
export const listTeachers = (params = {}) => client.get("/teacher/list", { params });
export const listTeacherClusters = () => client.get("/teacher/clusters");
export const setTeacherCluster = (id, cluster) => client.post(`/teacher/${id}/cluster`, { cluster });