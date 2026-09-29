import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";

export default function ClusterSpend({ data }) {
  return (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart data={data || []} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#eceef6" vertical={false} />
        <XAxis dataKey="cluster" tick={{ fontSize: 10.5, fill: "#9aa0b4" }} tickLine={false} axisLine={false} interval={0} angle={-18} height={44} textAnchor="end" />
        <YAxis tick={{ fontSize: 11, fill: "#9aa0b4" }} tickLine={false} axisLine={false} tickFormatter={(v) => (v >= 1000 ? `${(v / 1000).toFixed(0)}k` : v)} />
        <Tooltip formatter={(v) => [`₹${Number(v).toLocaleString("en-IN")}`, "Spend"]} contentStyle={{ borderRadius: 8, border: "1px solid #e6e8f0", fontSize: 12 }} />
        <Bar dataKey="amount" fill="#3d5afe" radius={[5, 5, 0, 0]} maxBarSize={38} />
      </BarChart>
    </ResponsiveContainer>
  );
}