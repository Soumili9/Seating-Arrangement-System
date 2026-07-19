import { useMemo } from "react";
import { motion } from "framer-motion";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend,
} from "recharts";
import { PieChart as PieIcon, BarChart3, Building2, GraduationCap, Layers, Percent } from "lucide-react";

const GOLD = "#ff6b47";
const GOLD_DIM = "rgba(255,107,71,0.35)";
const BLUE = "#a78bfa";
const GREEN = "#4ade80";
const SLATE = "#332f3c";

const tooltipStyle = {
  background: "#18151d",
  border: "1px solid #2e2a38",
  borderRadius: 12,
  color: "#f5f3f7",
  fontFamily: "'Inter', 'Segoe UI', sans-serif",
  fontSize: "0.78rem",
};

function useAllocationStats(rows) {
  return useMemo(() => {
    const UNUSED_LABEL = "Available for backlog/sickroom";
    const roomMap = new Map(); // room -> { capacity, used }
    const deptMap = new Map(); // department -> strength

    rows.forEach((r) => {
      const room = r["Room Allocated"];
      const cap = Number(r["Room Capacity"]) || 0;
      const strength = Number(r["Allocated Strength"]) || 0;

      if (!roomMap.has(room)) roomMap.set(room, { capacity: 0, used: 0 });
      const entry = roomMap.get(room);
      entry.capacity = Math.max(entry.capacity, cap);
      entry.used += strength;

      if (r["Department"] !== UNUSED_LABEL) {
        deptMap.set(r["Department"], (deptMap.get(r["Department"]) || 0) + strength);
      }
    });

    const roomStats = Array.from(roomMap.entries())
      .map(([room, v]) => ({ room, capacity: v.capacity, used: Math.min(v.used, v.capacity), free: Math.max(v.capacity - v.used, 0) }))
      .sort((a, b) => b.capacity - a.capacity);

    const deptStats = Array.from(deptMap.entries())
      .map(([department, strength]) => ({ department, strength }))
      .sort((a, b) => b.strength - a.strength);

    const totalCapacity = roomStats.reduce((s, r) => s + r.capacity, 0);
    const totalUsed = roomStats.reduce((s, r) => s + r.used, 0);
    const availableRooms = roomStats.filter((r) => r.used === 0).length;
    const utilizationPct = totalCapacity > 0 ? Math.round((totalUsed / totalCapacity) * 1000) / 10 : 0;

    return { roomStats, deptStats, totalCapacity, totalUsed, availableRooms, utilizationPct };
  }, [rows]);
}

export default function AllocationCharts({ rows }) {
  const { roomStats, deptStats, totalCapacity, totalUsed, utilizationPct } = useAllocationStats(rows);

  const s = {
    statRow: { display: "flex", gap: 18, flexWrap: "wrap", marginBottom: 36 },
    statCard: { flex: "1 1 190px", minHeight: 110, background: "linear-gradient(145deg, #18151d 0%, #1d1824 100%)", border: "1px solid #2e2a38", borderRadius: 14, padding: "22px 24px", display: "flex", alignItems: "center", gap: 16 },
    statIconWrap: (color) => ({ width: 48, height: 48, borderRadius: 12, background: `${color}1f`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, color }),
    statNum: { fontSize: "1.75rem", color: "#f5f3f7", fontWeight: 800, fontFamily: "'Poppins', 'Inter', sans-serif", lineHeight: 1.1 },
    statLabel: { fontSize: "0.7rem", letterSpacing: "0.08em", textTransform: "uppercase", color: "#9691a0", marginTop: 4 },
    panel: { background: "linear-gradient(145deg, #18151d 0%, #1d1824 100%)", border: "1px solid #2e2a38", borderRadius: 12, padding: "30px 32px", marginBottom: 32 },
    panelTitle: { fontSize: "0.75rem", letterSpacing: "0.14em", textTransform: "uppercase", color: "#ff6b47", marginBottom: 24 },
    row: { display: "flex", gap: 28, flexWrap: "wrap", marginBottom: 4 },
    half: { flex: "1 1 320px", minWidth: 280 },
    axisTick: { fill: "#9691a0", fontSize: 11, fontFamily: "'Inter', 'Segoe UI', sans-serif" },
  };

  const roomChartHeight = Math.max(220, roomStats.length * 30);

  const SUMMARY_CARDS = [
    { icon: GraduationCap, color: "#ff6b47", n: totalUsed, label: "Students" },
    { icon: Building2, color: "#a78bfa", n: roomStats.length, label: "Rooms" },
    { icon: Layers, color: "#60a5fa", n: deptStats.length, label: "Departments" },
    { icon: Percent, color: "#4ade80", n: `${utilizationPct}%`, label: "Utilization" },
  ];

  return (
    <div>
      <div style={s.statRow}>
        {SUMMARY_CARDS.map((stat, i) => (
          <motion.div
            key={stat.label}
            style={s.statCard}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35, delay: i * 0.05 }}
          >
            <div style={s.statIconWrap(stat.color)}>
              <stat.icon size={22} />
            </div>
            <div>
              <div style={s.statNum}>{stat.n}</div>
              <div style={s.statLabel}>{stat.label}</div>
            </div>
          </motion.div>
        ))}
      </div>

      <div style={s.row}>
        <motion.div
          style={{ ...s.panel, ...s.half }}
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.1 }}
        >
          <div style={s.panelTitle}><PieIcon size={14} style={{ verticalAlign: "-2px", marginRight: 6 }} />Capacity Usage</div>
          <ResponsiveContainer width="100%" height={220}>
            <PieChart>
              <Pie
                data={[{ name: "Used", value: totalUsed }, { name: "Free", value: Math.max(totalCapacity - totalUsed, 0) }]}
                dataKey="value"
                nameKey="name"
                innerRadius={55}
                outerRadius={85}
                paddingAngle={2}
              >
                <Cell fill={GOLD} />
                <Cell fill={SLATE} />
              </Pie>
              <Tooltip contentStyle={tooltipStyle} />
              <Legend wrapperStyle={{ fontSize: "0.72rem", color: "#a8a3b0", fontFamily: "'Inter', 'Segoe UI', sans-serif" }} />
            </PieChart>
          </ResponsiveContainer>
        </motion.div>

        <motion.div
          style={{ ...s.panel, ...s.half }}
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.18 }}
        >
          <div style={s.panelTitle}><BarChart3 size={14} style={{ verticalAlign: "-2px", marginRight: 6 }} />Department-wise Strength</div>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={deptStats} margin={{ left: -10, right: 10 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#2e2a38" vertical={false} />
              <XAxis dataKey="department" tick={false} axisLine={{ stroke: "#2e2a38" }} tickLine={false} height={12} />
              <YAxis tick={s.axisTick} allowDecimals={false} />
              <Tooltip contentStyle={tooltipStyle} cursor={{ fill: "rgba(255,107,71,0.06)" }} />
              <Bar dataKey="strength" fill={BLUE} radius={[3, 3, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </motion.div>
      </div>

      <motion.div
        style={s.panel}
        initial={{ opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.26 }}
      >
        <div style={s.panelTitle}><Building2 size={14} style={{ verticalAlign: "-2px", marginRight: 6 }} />Room Utilization: Used vs Free Capacity</div>
        <ResponsiveContainer width="100%" height={roomChartHeight}>
          <BarChart data={roomStats} layout="vertical" margin={{ left: 10, right: 20 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#2e2a38" horizontal={false} />
            <XAxis type="number" tick={s.axisTick} allowDecimals={false} />
            <YAxis type="category" dataKey="room" tick={s.axisTick} width={80} />
            <Tooltip contentStyle={tooltipStyle} cursor={{ fill: "rgba(255,107,71,0.06)" }} />
            <Legend wrapperStyle={{ fontSize: "0.72rem", color: "#a8a3b0", fontFamily: "'Inter', 'Segoe UI', sans-serif" }} />
            <Bar dataKey="used" stackId="a" name="Used" fill={GOLD} radius={[0, 0, 0, 0]} />
            <Bar dataKey="free" stackId="a" name="Free" fill={GREEN} fillOpacity={0.25} radius={[0, 3, 3, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </motion.div>
    </div>
  );
}
