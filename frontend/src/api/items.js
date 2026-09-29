import client from "./client";

// listItems({ q: "pen" }) or listItems({ top: 10 }) or listItems()
export const listItems = (params = {}) => client.get("/items", { params });
export const createItem = (data) => client.post("/items", data);
export const updateItem = (id, data) => client.patch(`/items/${id}`, data);
export const deactivateItem = (id) => client.delete(`/items/${id}`);
export const listAliases = () => client.get("/items/aliases");
export const addAlias = (alias, item_id, source = "manual") => client.post("/items/aliases", { alias, item_id, source });