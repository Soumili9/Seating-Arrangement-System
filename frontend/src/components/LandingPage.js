import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Armchair, FileSpreadsheet, GraduationCap, Lock, CheckCircle2, Building2 } from "lucide-react";

function AllocationGrid() {
  const ROWS = 5;
  const COLS = 9;
  const total = ROWS * COLS;
  const [lit, setLit] = useState(0);

  useEffect(() => {
    let i = 0;
    const id = setInterval(() => {
      i = (i + 1) % (total + 14); // pause a beat at full, then reset
      setLit(i);
    }, 55);
    return () => clearInterval(id);
  }, [total]);

  const cells = Array.from({ length: total });

  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: `repeat(${COLS}, 1fr)`,
        gap: 7,
        width: "100%",
        maxWidth: 420,
      }}
      aria-hidden="true"
    >
      {cells.map((_, i) => {
        const active = i < lit;
        return (
          <div
            key={i}
            style={{
              aspectRatio: "1 / 1",
              borderRadius: 12,
              border: `1px solid ${active ? "#ff6b47" : "#2e2a38"}`,
              background: active
                ? "linear-gradient(145deg, rgba(255,107,71,0.35), rgba(255,107,71,0.12))"
                : "rgba(16,14,20,0.6)",
              boxShadow: active ? "0 0 10px rgba(255,107,71,0.35)" : "none",
              transition: "background 0.25s ease, box-shadow 0.25s ease, border-color 0.25s ease",
            }}
          />
        );
      })}
    </div>
  );
}

const FEATURES = [
  {
    icon: Armchair,
    title: "Conflict-Free Seating",
    body: "Students are distributed across rooms so no two candidates from the same department sit adjacent. It happens automatically, every time.",
  },
  {
    icon: FileSpreadsheet,
    title: "Excel In, Excel Out",
    body: "Upload your existing department and room-capacity workbooks directly. Export a finished allotment sheet with one click.",
  },
  {
    icon: GraduationCap,
    title: "Semester & Class Test Modes",
    body: "Run a full single-year semester allocation, or pair two year groups for a class test, with a suggested optimal combination.",
  },
  {
    icon: Lock,
    title: "Restricted Access",
    body: "Gated behind authorised-personnel login, with a security-question recovery flow for the Controller's office.",
  },
];

const STEPS = [
  { n: "01", title: "Authenticate", body: "Sign in with your COE office credentials." },
  { n: "02", title: "Upload Files", body: "Provide the department-data and room-data workbooks." },
  { n: "03", title: "Configure", body: "Choose Semester or Class Test mode and a minimum split." },
  { n: "04", title: "Export Results", body: "Review the generated allotment and download it to Excel." },
];

const FONT_UI = "'Inter', 'Segoe UI', sans-serif";
const FONT_HEAD = "'Poppins', 'Inter', 'Segoe UI', sans-serif";

export default function LandingPage({ onEnter }) {
  const s = {
    page: {
      minHeight: "100vh",
      background: "linear-gradient(135deg, #0a0a0d 0%, #120a18 40%, #0d0a14 100%)",
      color: "#f5f3f7",
      fontFamily: FONT_UI,
      overflowX: "hidden",
      position: "relative",
    },
    blobOrange: {
      position: "absolute",
      top: -80,
      right: "8%",
      width: 380,
      height: 380,
      borderRadius: "50%",
      background: "radial-gradient(circle, rgba(255,107,71,0.28) 0%, rgba(255,107,71,0) 70%)",
      filter: "blur(20px)",
      pointerEvents: "none",
      zIndex: 0,
    },
    blobPurple: {
      position: "absolute",
      top: 160,
      left: "2%",
      width: 320,
      height: 320,
      borderRadius: "50%",
      background: "radial-gradient(circle, rgba(167,139,250,0.22) 0%, rgba(167,139,250,0) 70%)",
      filter: "blur(20px)",
      pointerEvents: "none",
      zIndex: 0,
    },
    nav: {
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
      maxWidth: 1100,
      margin: "0 auto",
      padding: "26px 32px",
    },
    navTitle: {
      fontSize: "1rem",
      letterSpacing: "-0.01em",
      color: "#f5f3f7",
      fontWeight: 800,
      fontFamily: FONT_HEAD,
    },
    navBtn: {
      background: "linear-gradient(90deg, #ff6b47 0%, #ff8a5c 100%)",
      color: "#0a0a0d",
      border: "none",
      borderRadius: 999,
      padding: "10px 26px",
      fontSize: "0.72rem",
      fontWeight: "bold",
      letterSpacing: "0.16em",
      textTransform: "uppercase",
      cursor: "pointer",
      fontFamily: FONT_UI,
    },
    hero: {
      maxWidth: 1100,
      margin: "0 auto",
      padding: "56px 32px 90px",
      display: "flex",
      alignItems: "center",
      gap: 60,
      flexWrap: "wrap",
    },
    heroLeft: { flex: "1 1 420px", minWidth: 300 },
    heroRight: {
      flex: "1 1 360px",
      minWidth: 280,
      display: "flex",
      justifyContent: "center",
    },
    floatCardBase: {
      position: "absolute",
      display: "flex",
      alignItems: "center",
      gap: 8,
      background: "#18151d",
      border: "1px solid #2e2a38",
      borderRadius: 12,
      padding: "10px 16px",
      fontSize: "0.72rem",
      fontWeight: 600,
      color: "#f5f3f7",
      boxShadow: "0 12px 30px rgba(0,0,0,0.4)",
      whiteSpace: "nowrap",
    },
    get floatCard1() { return { ...this.floatCardBase, top: -18, left: -10, transform: "rotate(-6deg)" }; },
    get floatCard2() { return { ...this.floatCardBase, bottom: -18, right: -14, transform: "rotate(5deg)" }; },
    eyebrow: {
      fontSize: "0.68rem",
      letterSpacing: "0.32em",
      textTransform: "uppercase",
      color: "#9691a0",
      marginBottom: 18,
    },
    h1: {
      fontSize: "clamp(2.1rem, 4.4vw, 3.4rem)",
      lineHeight: 1.12,
      fontWeight: 700,
      letterSpacing: "-0.02em",
      color: "#f5f3f7",
      margin: "0 0 20px",
      fontFamily: FONT_HEAD,
    },
    hlOrange: { color: "#ff6b47" },
    heroBody: {
      fontSize: "0.98rem",
      lineHeight: 1.8,
      color: "#a8a3b0",
      maxWidth: 480,
      marginBottom: 32,
      letterSpacing: "0.01em",
    },
    secondaryLink: {
      display: "block",
      fontSize: "0.75rem",
      letterSpacing: "0.1em",
      color: "#9691a0",
    },
    section: { maxWidth: 1100, margin: "0 auto", padding: "10px 32px 90px" },
    sectionHead: { textAlign: "center", marginBottom: 48 },
    sectionEyebrow: {
      fontSize: "0.65rem",
      letterSpacing: "0.3em",
      textTransform: "uppercase",
      color: "#9691a0",
      marginBottom: 10,
    },
    sectionTitle: {
      fontSize: "1.7rem",
      fontWeight: 800,
      color: "#f5f3f7",
      letterSpacing: "-0.01em",
      margin: 0,
      fontFamily: FONT_HEAD,
    },
    goldLine: {
      width: 70,
      height: 2,
      background: "linear-gradient(90deg, transparent, #ff6b47, transparent)",
      margin: "16px auto 0",
    },
    featureGrid: {
      display: "grid",
      gridTemplateColumns: "repeat(auto-fit, minmax(230px, 1fr))",
      gap: 22,
    },
    featureCard: {
      background: "linear-gradient(145deg, #18151d 0%, #1d1824 100%)",
      border: "1px solid #2e2a38",
      borderRadius: 12,
      padding: "26px 24px",
      transition: "transform 0.2s ease, border-color 0.2s ease",
    },
    featureIcon: { fontSize: "1.5rem", marginBottom: 14 },
    featureTitle: {
      fontSize: "0.85rem",
      letterSpacing: "0.08em",
      color: "#ff6b47",
      marginBottom: 10,
    },
    featureBody: { fontSize: "0.8rem", lineHeight: 1.7, color: "#a8a3b0" },
    stepsWrap: { display: "flex", flexWrap: "wrap", gap: 0, justifyContent: "center" },
    stepCard: {
      flex: "1 1 220px",
      minWidth: 200,
      padding: "0 22px",
      borderLeft: "1px solid #2e2a38",
    },
    stepNum: {
      fontSize: "1.6rem",
      color: "#3a3544",
      fontWeight: "bold",
      marginBottom: 10,
      letterSpacing: "0.05em",
    },
    stepTitle: {
      fontSize: "0.82rem",
      letterSpacing: "0.1em",
      textTransform: "uppercase",
      color: "#ffb088",
      marginBottom: 8,
    },
    stepBody: { fontSize: "0.78rem", lineHeight: 1.7, color: "#9691a0" },
    footer: {
      borderTop: "1px solid #2a2732",
      padding: "26px 32px",
      textAlign: "center",
      fontSize: "0.62rem",
      letterSpacing: "0.18em",
      color: "#9691a0",
      textTransform: "uppercase",
    },
  };

  return (
    <div style={s.page}>
      <style>{`
        .lp-feature:hover { transform: translateY(-3px); border-color: #ff6b47 !important; }
        .lp-cta:hover { filter: brightness(1.08); }
        @media (max-width: 768px) {
          .lp-nav { padding: 18px 20px !important; }
          .lp-hero { padding: 30px 20px 60px !important; gap: 32px !important; }
          .lp-section { padding: 6px 20px 60px !important; }
        }
        @media (max-width: 480px) {
          .lp-nav-title { font-size: 0.78rem !important; letter-spacing: 0.1em !important; }
          .lp-step { border-left: none !important; border-top: 1px solid #2e2a38; padding: 16px 0 0 !important; }
          .lp-float-card { display: none !important; }
        }
      `}</style>

      <div style={s.blobOrange} />
      <div style={s.blobPurple} />

      {/* Nav */}
      <div style={{ ...s.nav, position: "relative", zIndex: 1 }} className="lp-nav">
        <div style={{ ...s.navTitle, position: "absolute", left: "50%", transform: "translateX(-50%)" }} className="lp-nav-title">Seating Arrangement System</div>
        <button style={{ ...s.navBtn, marginLeft: "auto" }} className="lp-cta" onClick={onEnter}>Staff Login</button>
      </div>

      {/* Hero */}
      <div style={{ ...s.hero, position: "relative", zIndex: 1 }} className="lp-hero">
        <motion.div
          style={s.heroLeft}
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: "easeOut" }}
        >
          <div style={s.eyebrow}>Controller of Examinations · Office Management System</div>
          <h1 style={s.h1}><span style={s.hlOrange}>Smart</span> Examination Seating Management</h1>
          <p style={s.heroBody}>
            Automate room allocation, optimize seating capacity, and generate
            examination reports in minutes.
          </p>
          <span style={s.secondaryLink}>Authorised COE personnel only. Sign in above to get started.</span>
        </motion.div>
        <motion.div
          style={{ ...s.heroRight, position: "relative" }}
          initial={{ opacity: 0, scale: 0.94 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.7, delay: 0.15, ease: "easeOut" }}
        >
          <AllocationGrid />
          <motion.div
            style={s.floatCard1}
            className="lp-float-card"
            animate={{ y: [0, -10, 0] }}
            transition={{ repeat: Infinity, duration: 4, ease: "easeInOut" }}
          >
            <CheckCircle2 size={15} color="#4ade80" />
            <span>No Conflicts</span>
          </motion.div>
          <motion.div
            style={s.floatCard2}
            className="lp-float-card"
            animate={{ y: [0, 10, 0] }}
            transition={{ repeat: Infinity, duration: 4.5, ease: "easeInOut", delay: 0.5 }}
          >
            <Building2 size={15} color="#ff6b47" />
            <span>Rooms Optimized</span>
          </motion.div>
        </motion.div>
      </div>

      {/* Features */}
      <div style={s.section} className="lp-section">
        <motion.div
          style={s.sectionHead}
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-60px" }}
          transition={{ duration: 0.5 }}
        >
          <div style={s.sectionEyebrow}>Capabilities</div>
          <h2 style={s.sectionTitle}>Built for the Controller's Office</h2>
          <div style={s.goldLine} />
        </motion.div>
        <div style={s.featureGrid}>
          {FEATURES.map((f, i) => (
            <motion.div
              key={f.title}
              style={s.featureCard}
              className="lp-feature"
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-40px" }}
              transition={{ duration: 0.45, delay: i * 0.08 }}
            >
              <div style={s.featureIcon}><f.icon size={24} color="#ff6b47" strokeWidth={1.6} /></div>
              <div style={s.featureTitle}>{f.title}</div>
              <div style={s.featureBody}>{f.body}</div>
            </motion.div>
          ))}
        </div>
      </div>

      {/* How it works */}
      <div style={s.section} className="lp-section">
        <motion.div
          style={s.sectionHead}
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-60px" }}
          transition={{ duration: 0.5 }}
        >
          <div style={s.sectionEyebrow}>Process</div>
          <h2 style={s.sectionTitle}>How It Works</h2>
          <div style={s.goldLine} />
        </motion.div>
        <div style={s.stepsWrap}>
          {STEPS.map((step, i) => (
            <motion.div
              key={step.n}
              style={s.stepCard}
              className="lp-step"
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-40px" }}
              transition={{ duration: 0.4, delay: i * 0.08 }}
            >
              <div style={s.stepNum}>{step.n}</div>
              <div style={s.stepTitle}>{step.title}</div>
              <div style={s.stepBody}>{step.body}</div>
            </motion.div>
          ))}
        </div>
      </div>

      <div style={s.footer}>© 2026 Examination Control System · Authorised Personnel Only</div>
    </div>
  );
}
