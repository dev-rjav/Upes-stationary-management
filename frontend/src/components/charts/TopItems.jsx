import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";

export default function TopItems({ data }) {
  const rows = (data || []).map((d) => ({ ...d, name: d.name.length > 16 ? d.name.slice(0, 15) + "…" : d.name }));
  return (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart data={rows} layout="vertical" margin={{ top: 4, right: 12, left: 8, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#eceef6" horizontal={false} />
        <XAxis type="number" tick={{ fontSize: 11, fill: "#9aa0b4" }} tickLine={false} axisLine={false} />
        <YAxis type="category" dataKey="name" width={118} tick={{ fontSize: 11, fill: "#5a6072" }} tickLine={false} axisLine={false} />
        <Tooltip formatter={(v, n) => (n === "qty" ? [v, "Units"] : [`₹${Number(v).toLocaleString("en-IN")}`, "Spend"])} contentStyle={{ borderRadius: 8, border: "1px solid #e6e8f0", fontSize: 12 }} />
        <Bar dataKey="qty" fill="#188038" radius={[0, 5, 5, 0]} maxBarSize={16} />
      </BarChart>
    </ResponsiveContainer>
  );
}