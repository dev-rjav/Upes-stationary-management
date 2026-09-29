import client from "./client";

export const getDashboard = () => client.get("/dashboard");
export const markNotificationsRead = () => client.post("/dashboard/notifications/read-all");
export const unreadCount = () => client.get("/dashboard/notifications/unread");