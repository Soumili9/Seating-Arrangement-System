import { WifiOff, RotateCcw } from "lucide-react";
import { motion } from "framer-motion";

const FONT_UI = "'Inter', 'Segoe UI', sans-serif";

export default function ServerUnreachable({ onRetry }) {
  const s = {
    overlay: {
      position: "fixed",
      inset: 0,
      background: "rgba(8,7,10,0.94)",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      zIndex: 10000,
      fontFamily: FONT_UI,
      padding: 20,
    },
    card: {
      background: "linear-gradient(145deg, #18151d 0%, #1d1824 100%)",
      border: "1px solid rgba(251,113,133,0.4)",
      borderRadius: 12,
      padding: "44px 40px",
      maxWidth: 420,
      width: "100%",
      textAlign: "center",
      boxShadow: "0 8px 44px rgba(0,0,0,0.6)",
    },
    iconWrap: {
      width: 56,
      height: 56,
      borderRadius: "50%",
      border: "1.5px solid rgba(251,113,133,0.5)",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      margin: "0 auto 20px",
      color: "#fb7185",
    },
    title: { fontSize: "1rem", letterSpacing: "0.08em", color: "#ffb088", marginBottom: 10, fontFamily: "'Georgia', serif" },
    body: { fontSize: "0.82rem", color: "#a8a3b0", lineHeight: 1.7, marginBottom: 26 },
    code: { fontSize: "0.68rem", color: "#9691a0", background: "rgba(14,12,17,0.7)", border: "1px solid #2e2a38", borderRadius: 12, padding: "8px 12px", marginBottom: 26, display: "inline-block" },
    btn: {
      background: "linear-gradient(90deg, #ff6b47 0%, #ff8a5c 100%)",
      color: "#0a0a0d",
      border: "none",
      borderRadius: 12,
      padding: "12px 30px",
      fontSize: "0.75rem",
      fontWeight: "bold",
      letterSpacing: "0.14em",
      textTransform: "uppercase",
      cursor: "pointer",
      fontFamily: FONT_UI,
      display: "inline-flex",
      alignItems: "center",
      gap: 8,
    },
  };

  return (
    <motion.div
      style={s.overlay}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.2 }}
    >
      <motion.div
        style={s.card}
        initial={{ scale: 0.94, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 0.25 }}
      >
        <div style={s.iconWrap}><WifiOff size={24} /></div>
        <div style={s.title}>Can't Reach the Server</div>
        <div style={s.body}>
          The application couldn't connect to the backend. This usually means
          the Flask API isn't running, or the connection was interrupted.
        </div>
        <div style={s.code}>Expected at: http://localhost:5000/api</div>
        <br />
        <button style={s.btn} onClick={onRetry}>
          <RotateCcw size={14} /> Try Again
        </button>
      </motion.div>
    </motion.div>
  );
}
