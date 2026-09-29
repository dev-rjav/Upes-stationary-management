import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";

export default function MonthlyTrend({ data }) {
  const rows = (data || []).map((d) => ({ ...d, label: d.date.slice(5) }));
  return (
    <ResponsiveContainer width="100%" height="100%">
      <LineChart data={rows} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#eceef6" />
        <XAxis dataKey="label" tick={{ fontSize: 11, fill: "#9aa0b4" }} tickLine={false} axisLine={false} />
        <YAxis tick={{ fontSize: 11, fill: "#9aa0b4" }} tickLine={false} axisLine={false} tickFormatter={(v) => (v >= 1000 ? `${(v / 1000).toFixed(0)}k` : v)} />
        <Tooltip formatter={(v) => [`₹${Number(v).toLocaleString("en-IN")}`, "Spend"]} labelStyle={{ fontSize: 12 }} contentStyle={{ borderRadius: 8, border: "1px solid #e6e8f0", fontSize: 12 }} />
        <Line type="monotone" dataKey="spend" stroke="#3d5afe" strokeWidth={2.5} dot={false} activeDot={{ r: 4 }} />
      </LineChart>
    </ResponsiveContainer>
  );
}