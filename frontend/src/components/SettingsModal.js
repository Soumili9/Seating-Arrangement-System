import { useState } from "react";
import { X, KeyRound, Palette, Info } from "lucide-react";

const FONT_UI = "'Inter', 'Segoe UI', sans-serif";
const FONT_HEAD = "'Poppins', 'Inter', 'Segoe UI', sans-serif";

const TECH_STACK = [
  "React 19", "Flask (Python)", "TanStack Table", "Recharts",
  "Framer Motion", "Sonner", "Lucide Icons", "openpyxl / pandas",
];

export default function SettingsModal({ onClose, onChangePassword, reducedMotion, onToggleReducedMotion }) {
  const [tab, setTab] = useState("account");

  const s = {
    modal: { position: "fixed", inset: 0, background: "rgba(8,7,10,0.92)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 9999, padding: 16, fontFamily: FONT_UI },
    card: { background: "linear-gradient(145deg, #18151d 0%, #1d1824 100%)", border: "1px solid #ff6b47", borderRadius: 12, padding: "0", maxWidth: 560, width: "100%", boxShadow: "0 8px 44px rgba(0,0,0,0.7)", maxHeight: "85vh", display: "flex", flexDirection: "column" },
    header: { display: "flex", alignItems: "center", justifyContent: "space-between", padding: "22px 26px 0" },
    title: { fontSize: "1rem", letterSpacing: "0.16em", textTransform: "uppercase", color: "#ff6b47", fontFamily: FONT_HEAD },
    closeBtn: { background: "none", border: "1px solid #2e2a38", borderRadius: "50%", width: 30, height: 30, display: "flex", alignItems: "center", justifyContent: "center", color: "#a8a3b0", cursor: "pointer" },
    tabBar: { display: "flex", gap: 4, padding: "18px 26px 0", borderBottom: "1px solid #2e2a38" },
    tab: (active) => ({ display: "flex", alignItems: "center", gap: 6, padding: "10px 16px", fontSize: "0.72rem", letterSpacing: "0.1em", textTransform: "uppercase", color: active ? "#ff6b47" : "#9691a0", borderBottom: active ? "2px solid #ff6b47" : "2px solid transparent", background: "none", border: "none", cursor: "pointer", fontFamily: FONT_UI }),
    body: { padding: "24px 26px 28px", overflowY: "auto" },
    row: { display: "flex", alignItems: "center", justifyContent: "space-between", padding: "14px 0", borderBottom: "1px solid rgba(38,34,46,0.5)" },
    rowLabel: { fontSize: "0.85rem", color: "#ffb088" },
    rowDesc: { fontSize: "0.7rem", color: "#9691a0", marginTop: 3 },
    actionBtn: { background: "transparent", border: "1px solid #ff6b47", color: "#ff6b47", borderRadius: 999, padding: "8px 18px", fontSize: "0.68rem", letterSpacing: "0.1em", textTransform: "uppercase", cursor: "pointer", fontFamily: FONT_UI },
    switch: (on) => ({ width: 40, height: 22, borderRadius: 12, background: on ? "#ff6b47" : "#2e2a38", position: "relative", cursor: "pointer", transition: "background 0.2s ease", flexShrink: 0 }),
    knob: (on) => ({ width: 16, height: 16, borderRadius: "50%", background: "#0a0a0d", position: "absolute", top: 3, left: on ? 21 : 3, transition: "left 0.2s ease" }),
    themeNote: { fontSize: "0.75rem", color: "#9691a0", lineHeight: 1.7, background: "rgba(255,107,71,0.06)", border: "1px solid #2e2a38", borderRadius: 12, padding: "14px 16px" },
    aboutTitle: { fontSize: "1.1rem", color: "#ffb088", marginBottom: 4, fontFamily: FONT_HEAD },
    aboutDesc: { fontSize: "0.8rem", color: "#a8a3b0", lineHeight: 1.7, marginBottom: 20 },
    aboutGrid: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, marginBottom: 20 },
    aboutStat: { background: "rgba(255,107,71,0.06)", border: "1px solid #2e2a38", borderRadius: 12, padding: "12px 14px" },
    aboutStatLabel: { fontSize: "0.6rem", letterSpacing: "0.14em", textTransform: "uppercase", color: "#9691a0", marginBottom: 4 },
    aboutStatVal: { fontSize: "0.85rem", color: "#ffb088" },
    techWrap: { display: "flex", flexWrap: "wrap", gap: 8 },
    techPill: { fontSize: "0.68rem", color: "#a8a3b0", border: "1px solid #2e2a38", borderRadius: 20, padding: "5px 12px" },
  };

  return (
    <div style={s.modal} onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div style={s.card}>
        <div style={s.header}>
          <div style={s.title}>Settings</div>
          <button style={s.closeBtn} onClick={onClose}><X size={15} /></button>
        </div>
        <div style={s.tabBar}>
          <button style={s.tab(tab === "account")} onClick={() => setTab("account")}><KeyRound size={13} /> Account</button>
          <button style={s.tab(tab === "display")} onClick={() => setTab("display")}><Palette size={13} /> Display</button>
          <button style={s.tab(tab === "about")} onClick={() => setTab("about")}><Info size={13} /> About</button>
        </div>

        <div style={s.body}>
          {tab === "account" && (
            <div>
              <div style={s.row}>
                <div>
                  <div style={s.rowLabel}>Change Password</div>
                  <div style={s.rowDesc}>Verify your security question to set a new password.</div>
                </div>
                <button style={s.actionBtn} onClick={onChangePassword}>Change</button>
              </div>
            </div>
          )}

          {tab === "display" && (
            <div>
              <div style={s.row}>
                <div>
                  <div style={s.rowLabel}>Reduce Motion</div>
                  <div style={s.rowDesc}>Turns off animated transitions, spinners, and progress effects.</div>
                </div>
                <div style={s.switch(reducedMotion)} onClick={onToggleReducedMotion}>
                  <div style={s.knob(reducedMotion)} />
                </div>
              </div>
              <div style={{ ...s.row, borderBottom: "none" }}>
                <div style={s.themeNote}>
                  This portal uses a fixed theme (near-black with orange &amp; violet accents) to
                  match the Controller of Examinations' office branding. A separate
                  light theme is not offered so the interface stays consistent across
                  every workstation in the office.
                </div>
              </div>
            </div>
          )}

          {tab === "about" && (
            <div>
              <div style={s.aboutTitle}>Seating Arrangement System</div>
              <div style={s.aboutDesc}>
                An internal tool for the Controller of Examinations' office that
                generates conflict-free examination seating plans from department
                and room-capacity workbooks for a single semester or a combined
                class test, and exports the finished allotment to Excel.
              </div>
              <div style={s.aboutGrid}>
                <div style={s.aboutStat}>
                  <div style={s.aboutStatLabel}>Version</div>
                  <div style={s.aboutStatVal}>1.5.0</div>
                </div>
                <div style={s.aboutStat}>
                  <div style={s.aboutStatLabel}>Developer</div>
                  <div style={s.aboutStatVal}>COE Office Dev Team</div>
                </div>
              </div>
              <div style={s.rowLabel}>Built With</div>
              <div style={{ height: 10 }} />
              <div style={s.techWrap}>
                {TECH_STACK.map((t) => <span key={t} style={s.techPill}>{t}</span>)}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
