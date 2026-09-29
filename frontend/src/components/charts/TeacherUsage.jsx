import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";

export default function TeacherUsage({ data }) {
  const rows = (data || []).map((d) => ({ ...d, name: d.teacher.length > 14 ? d.teacher.slice(0, 13) + "…" : d.teacher }));
  return (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart data={rows} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#eceef6" vertical={false} />
        <XAxis dataKey="name" tick={{ fontSize: 10, fill: "#9aa0b4" }} tickLine={false} axisLine={false} interval={0} angle={-22} height={52} textAnchor="end" />
        <YAxis tick={{ fontSize: 11, fill: "#9aa0b4" }} tickLine={false} axisLine={false} tickFormatter={(v) => (v >= 1000 ? `${(v / 1000).toFixed(0)}k` : v)} />
        <Tooltip formatter={(v) => [`₹${Number(v).toLocaleString("en-IN")}`, "Spend"]} labelFormatter={(l, p) => (p?.[0]?.payload?.teacher || l)} contentStyle={{ borderRadius: 8, border: "1px solid #e6e8f0", fontSize: 12 }} />
        <Bar dataKey="amount" fill="#7b1fa2" radius={[5, 5, 0, 0]} maxBarSize={34} />
      </BarChart>
    </ResponsiveContainer>
  );
}