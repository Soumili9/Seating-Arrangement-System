import { useState, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Toaster, toast } from "sonner";
import {
  Lock, FolderUp, Settings2, ClipboardList, Check, CheckCircle2, AlertTriangle,
  ArrowLeft, ArrowRight, Download, X, FileSpreadsheet, Building2, Eye, EyeOff, Table2,
  BarChart3, Settings, LogOut, Info, Copy,
} from "lucide-react";
import LandingPage from "./components/LandingPage";
import ResultsTable from "./components/ResultsTable";
import AllocationCharts from "./components/AllocationCharts";
import ServerUnreachable from "./components/ServerUnreachable";
import SettingsModal from "./components/SettingsModal";

const STEPS = ["Authentication", "Upload Files", "Configuration", "Results"];
const stepIconList = [Lock, FolderUp, Settings2, ClipboardList];
// In production (Vercel), set REACT_APP_API_URL to your Render backend URL, e.g.
// REACT_APP_API_URL=https://your-app.onrender.com/api
const API = process.env.REACT_APP_API_URL || "http://localhost:5000/api";
const FONT_UI = "'Inter', 'Segoe UI', sans-serif";
const FONT_HEAD = "'Poppins', 'Inter', 'Segoe UI', sans-serif";

// Portfolio/demo mode: shows a credentials hint on the login screen.
// Set to false to hide it (e.g. once this becomes a real production instance again).
// IMPORTANT: keep these two values in sync with whatever AUTH_USERNAME / AUTH_PASSWORD
// you actually set as environment variables on your Render backend.
const SHOW_DEMO_HINT = true;
const DEMO_USERNAME = "demo";
const DEMO_PASSWORD = "demo123";

function Spinner({ size = 14, color = "#0a0a0d", reducedMotion = false }) {
  if (reducedMotion) {
    return (
      <span
        style={{
          display: "inline-block",
          width: size,
          height: size,
          borderRadius: "50%",
          border: `2px solid ${color}33`,
          borderTopColor: color,
          marginRight: 8,
          verticalAlign: "middle",
        }}
      />
    );
  }
  return (
    <motion.span
      style={{
        display: "inline-block",
        width: size,
        height: size,
        borderRadius: "50%",
        border: `2px solid ${color}33`,
        borderTopColor: color,
        marginRight: 8,
        verticalAlign: "middle",
      }}
      animate={{ rotate: 360 }}
      transition={{ repeat: Infinity, duration: 0.7, ease: "linear" }}
    />
  );
}

export default function SeatingArrangementApp() {
  const [screen, setScreen] = useState("landing"); // "landing" | "wizard"
  const [currentStep, setCurrentStep] = useState(0);
  const [files, setFiles] = useState({ department: null, room: null });
  const [dragOver, setDragOver] = useState({ department: false, room: false });
  const [auth, setAuth] = useState({ username: "", password: "", attempts: 0, error: "", loading: false, loadingMessage: "Verifying..." });
  const [authenticated, setAuthenticated] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [mode, setMode] = useState("Semester");
  const [semYear, setSemYear] = useState("Select Year");
  const [classMode, setClassMode] = useState("suggestion");
  const [year1, setYear1] = useState("Select Year");
  const [year2, setYear2] = useState("Select Year");
  const [combos, setCombos] = useState([]);
  const [bestCombo, setBestCombo] = useState(null);
  const [processing, setProcessing] = useState(false);
  const [results, setResults] = useState(null);
  const [configError, setConfigError] = useState("");
  const [minSplit, setMinSplit] = useState("");
  const [activeResultTab, setActiveResultTab] = useState(0);
  const [resultView, setResultView] = useState("table"); // "table" | "charts"
  const [combosLoading, setCombosLoading] = useState(false);
  const [exportLoading, setExportLoading] = useState(false);

  // Preview / selection step state
  const [showPreview, setShowPreview] = useState(false);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewError, setPreviewError] = useState("");
  const [previewRooms, setPreviewRooms] = useState([]);
  const [previewDepts, setPreviewDepts] = useState({});
  const [selectedRooms, setSelectedRooms] = useState({});
  const [selectedDepts, setSelectedDepts] = useState({});
  const [activeDeptYear, setActiveDeptYear] = useState("1st Year");

  // Forgot password state
  const [forgotStep, setForgotStep] = useState(0); // 0=hidden, 1=question, 2=reset
  const [forgotQuestion, setForgotQuestion] = useState("");
  const [forgotQuestionId, setForgotQuestionId] = useState(null);
  const [forgotAnswer, setForgotAnswer] = useState("");
  const [forgotAnswerError, setForgotAnswerError] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [resetError, setResetError] = useState("");
  const [resetSuccess, setResetSuccess] = useState(false);

  // Settings / display state
  const [showSettings, setShowSettings] = useState(false);
  const [reducedMotion, setReducedMotion] = useState(false);
  const [serverDown, setServerDown] = useState(false);

  const depRef = useRef();
  const roomRef = useRef();
  const years = ["1st Year", "2nd Year", "3rd Year", "4th Year"];

  const loadPreview = async () => {
    setPreviewLoading(true);
    setPreviewError("");
    try {
      const fd = new FormData();
      fd.append("department_data", files.department);
      fd.append("room_data", files.room);
      const res = await fetch(`${API}/preview-sheets`, { method: "POST", body: fd });
      const data = await res.json();
      if (data.error) throw new Error(data.error);

      setPreviewRooms(data.rooms);
      // Default: all selected
      const roomSel = {};
      data.rooms.forEach((r) => { roomSel[r.Room_Number] = true; });
      setSelectedRooms(roomSel);

      setPreviewDepts(data.departments);
      const deptSel = {};
      Object.entries(data.departments).forEach(([year, rows]) => {
        deptSel[year] = {};
        rows.forEach((d) => { deptSel[year][d.Department] = true; });
      });
      setSelectedDepts(deptSel);
      setActiveDeptYear(Object.keys(data.departments)[0] || "1st Year");
      setShowPreview(true);
    } catch (err) {
      const msg = err.message || "Failed to load sheet data.";
      setPreviewError(msg);
      toast.error(msg);
      if (err instanceof TypeError) setServerDown(true);
    } finally {
      setPreviewLoading(false);
    }
  };

  const buildFormData = useCallback(() => {
    const fd = new FormData();
    fd.append("department_data", files.department);
    fd.append("room_data", files.room);
    // Pass selected rooms and departments as JSON strings for backend filtering
    fd.append("selected_rooms", JSON.stringify(
      Object.entries(selectedRooms).filter(([, v]) => v).map(([k]) => k)
    ));
    const selDepts = {};
    Object.entries(selectedDepts).forEach(([year, dmap]) => {
      selDepts[year] = Object.entries(dmap).filter(([, v]) => v).map(([k]) => k);
    });
    fd.append("selected_depts", JSON.stringify(selDepts));
    return fd;
  }, [files, selectedRooms, selectedDepts]);

  const handleDrop = (e, key) => {
    e.preventDefault();
    setDragOver((d) => ({ ...d, [key]: false }));
    const file = e.dataTransfer.files[0];
    if (file && (file.name.endsWith(".xlsx") || file.name.endsWith(".xls"))) {
      setFiles((f) => ({ ...f, [key]: file }));
    }
  };

  const handleFileInput = (e, key) => {
    const file = e.target.files[0];
    if (file) setFiles((f) => ({ ...f, [key]: file }));
  };

  const handleAuthenticate = async () => {
    if (auth.attempts >= 3) return;
    setAuth((a) => ({ ...a, loading: true, error: "", loadingMessage: "Verifying..." }));

    // If the backend takes a while (e.g. Render free-tier cold start), let the
    // user know what's happening instead of leaving the button looking frozen.
    const slowTimer = setTimeout(() => {
      setAuth((a) => (a.loading ? { ...a, loadingMessage: "Waking up the server, this can take up to 30s..." } : a));
    }, 4000);

    try {
      const res = await fetch(`${API}/authenticate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: auth.username, password: auth.password }),
      });
      if (res.ok) {
        setAuthenticated(true);
        setAuth((a) => ({ ...a, loading: false, error: "", loadingMessage: "Verifying..." }));
        toast.success("Authentication successful");
        setTimeout(() => {
        setCurrentStep(1);
      }, 600);
      }else {
        const attempts = auth.attempts + 1;
        const msg = attempts >= 3
          ? "Access Denied. Maximum attempts reached."
          : `Invalid credentials. ${3 - attempts} attempt(s) remaining.`;
        setAuth((a) => ({ ...a, loading: false, attempts, error: msg, loadingMessage: "Verifying..." }));
        toast.error(msg);
      }
    } catch (err) {
      const msg = "Cannot connect to server. Ensure Flask is running on port 5000.";
      setAuth((a) => ({ ...a, loading: false, error: msg, loadingMessage: "Verifying..." }));
      toast.error(msg);
      if (err instanceof TypeError) setServerDown(true);
    } finally {
      clearTimeout(slowTimer);
    }
  };

 const loadCombos = async () => {
  setCombosLoading(true);
  try {
    const fd = buildFormData();
    const res = await fetch(`${API}/best-combinations`, { method: "POST", body: fd });
    const data = await res.json();
    if (data.combinations && data.combinations.length > 0) {
      setCombos(data.combinations);
      setBestCombo(data.combinations[0]);
    } else {
      setCombos([]);
    }
  } catch (err) {
    console.error("Combos error:", err);
    setCombos([]);
  } finally {
    setCombosLoading(false);
  }
};

  const handleAllocate = async () => {
    if (mode === "Semester" && semYear === "Select Year") {
      setConfigError("Please select a year for Semester allocation.");
      return;
    }
    if (mode === "Class Test" && classMode === "manual") {
      if (year1 === "Select Year" || year2 === "Select Year") {
        setConfigError("Please select both years.");
        return;
      }
      if (year1 === year2) {
        setConfigError("Please select two different years.");
        return;
      }
    }
    // 🔥 MIN_SPLIT validation
    if (!minSplit || isNaN(minSplit) || Number(minSplit) <= 0) {
      setConfigError("Minimum Split is required. Please enter a valid value.");
      return;
    }
    setConfigError("");
    setProcessing(true);

    try {
      const fd = buildFormData();
      fd.append("min_split", minSplit);
      let res, data;

      if (mode === "Semester") {
        fd.append("sheet_name", semYear);
        res = await fetch(`${API}/allocate/semester`, { method: "POST", body: fd });
        data = await res.json();
        if (!res.ok) throw new Error(data.error || "Allocation failed");

        setResults({
          mode: "Semester",
          year: semYear,
          rawAllocation: data.allocation,
          year1: null,
          year2: null,
          tables: [{
            title: `${semYear} Semester Allocation`,
            rows: data.allocation,
          }]
        });
      } else {
        const y1 = classMode === "suggestion" ? bestCombo.year1 : year1;
        const y2 = classMode === "suggestion" ? bestCombo.year2 : year2;
        fd.append("year1", y1);
        fd.append("year2", y2);
        res = await fetch(`${API}/allocate/classtest`, { method: "POST", body: fd });
        data = await res.json();
        if (!res.ok) throw new Error(data.error || "Allocation failed");

        const rows1 = data.allocation.filter(r => r.Department.includes(`(${y1})`));
        const rows2 = data.allocation.filter(r => r.Department.includes(`(${y2})`));

        setResults({
          mode: "Class Test",
          year: `${y1} + ${y2}`,
          rawAllocation: data.allocation,
          year1: y1,
          year2: y2,
          tables: [
            { title: `${y1} Departments`, rows: rows1 },
            { title: `${y2} Departments`, rows: rows2 },
          ]
        });
      }

      setActiveResultTab(0);
      setResultView("table");
      setCurrentStep(3);
      toast.success("Allocation generated successfully");
    } catch (err) {
      const msg = err.message || "An error occurred during allocation.";
      setConfigError(msg);
      toast.error(msg);
      if (err instanceof TypeError) setServerDown(true);
    } finally {
      setProcessing(false);
    }
  };

  const handleLogout = () => {
    setAuthenticated(false);
    setCurrentStep(0);
    setAuth({ username: "", password: "", attempts: 0, error: "", loading: false, loadingMessage: "Verifying..." });
    setFiles({ department: null, room: null });
    setResults(null);
    setShowPreview(false);
    setPreviewRooms([]);
    setPreviewDepts({});
    setSelectedRooms({});
    setSelectedDepts({});
  };

  const handleForgotPassword = async () => {
    try {
      const res = await fetch(`${API}/forgot-password/question`, { method: "GET" });
      const data = await res.json();
      setForgotQuestion(data.question);
      setForgotQuestionId(data.id);
      setForgotAnswer("");
      setForgotAnswerError("");
      setNewPassword("");
      setConfirmPassword("");
      setResetError("");
      setResetSuccess(false);
      setForgotStep(1);
    } catch {
      setForgotQuestion("Unable to load question. Please ensure the server is running.");
      setForgotQuestionId(null);
      setForgotAnswer("");
      setForgotAnswerError("Cannot connect to server.");
      setForgotStep(1);
    }
  };

  const handleVerifyAnswer = async () => {
    if (!forgotAnswer.trim()) { setForgotAnswerError("Please enter an answer."); return; }
    try {
      const res = await fetch(`${API}/forgot-password/verify`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: forgotQuestionId, answer: forgotAnswer }),
      });
      const data = await res.json();
      if (data.success) { setForgotAnswerError(""); setForgotStep(2); }
      else { setForgotAnswerError("Incorrect answer. Please try again."); }
    } catch { setForgotAnswerError("Cannot connect to server."); }
  };

  const handleResetPassword = async () => {
    if (!newPassword) { setResetError("Please enter a new password."); return; }
    if (newPassword !== confirmPassword) { setResetError("Passwords do not match."); return; }
    if (newPassword.length < 6) { setResetError("Password must be at least 6 characters."); return; }
    try {
      const res = await fetch(`${API}/forgot-password/reset`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: forgotQuestionId, answer: forgotAnswer, new_password: newPassword }),
      });
      const data = await res.json();
      if (data.success) {
        setResetSuccess(true);
        setResetError("");
        toast.success("Password reset successfully");
        setTimeout(() => setForgotStep(0), 2000);
      } else {
        setResetError(data.message || "Reset failed.");
        toast.error(data.message || "Reset failed.");
      }
    } catch { setResetError("Cannot connect to server."); }
  };

  const handleExport = async () => {
    if (!results) return;
    setExportLoading(true);
    try {
      let res;
      if (results.mode === "Semester") {
        res = await fetch(`${API}/export/semester`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ allocation: results.rawAllocation, sheet_name: results.year }),
        });
      } else {
        res = await fetch(`${API}/export/classtest`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ allocation: results.rawAllocation, year1: results.year1, year2: results.year2 }),
        });
      }
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      const dynamicName = results.mode === "Semester"
      ? `${results.year}_Semester_Final_Allotment.xlsx`
      : `${results.year}_Class Test_Final_Allotment.xlsx`;
      a.download = dynamicName;
      a.click();
      window.URL.revokeObjectURL(url);
      toast.success("Report exported", { description: dynamicName });
    } catch (err) {
      toast.error("Export failed. Please try again.");
      if (err instanceof TypeError) setServerDown(true);
    } finally {
      setExportLoading(false);
    }
  };

  // ── Styles ──────────────────────────────────────────────────────────

  const s = {
    app: { minHeight: "100vh", background: "linear-gradient(135deg, #0a0a0d 0%, #120a18 40%, #0d0a14 100%)", fontFamily: FONT_UI, color: "#f5f3f7", display: "flex", flexDirection: "column", alignItems: "center", paddingBottom: 60 },
    header: { width: "100%", background: "linear-gradient(90deg, #100a16 0%, #1d1824 50%, #100a16 100%)", borderBottom: "2px solid #ff6b47", textAlign: "center", position: "relative" },
    headerInner: { maxWidth: 900, margin: "0 auto", padding: "28px 40px 20px" },
    headerSup: { fontSize: "0.63rem", letterSpacing: "0.3em", color: "#9691a0", textTransform: "uppercase", marginBottom: 8 },
    headerTitle: { fontSize: "3.2rem", fontWeight: 800, letterSpacing: "-0.02em", color: "#f5f3f7", textTransform: "none", margin: 0, fontFamily: FONT_HEAD },
    headerHl: { color: "#ff6b47" },
    headerSub: { fontSize: "0.78rem", letterSpacing: "0.25em", color: "#a8a3b0", marginTop: 6, textTransform: "uppercase" },
    goldLine: { width: 80, height: 2, background: "linear-gradient(90deg, transparent, #ff6b47, transparent)", margin: "10px auto 0" },
    stepper: { display: "flex", alignItems: "center", justifyContent: "center", padding: "28px 0 0", maxWidth: 700, width: "100%" },
    stepItem: { display: "flex", flexDirection: "column", alignItems: "center", gap: 6, flex: 1 },
    stepCircle: (i, cur) => ({ width: 42, height: 42, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "1.05rem", border: i < cur ? "2px solid #ff6b47" : i === cur ? "2px solid #ff6b47" : "2px solid #332f3c", background: i < cur ? "rgba(255,107,71,0.18)" : i === cur ? "linear-gradient(145deg, #ff6b47, #ff8a5c)" : "rgba(22,19,27,0.8)", color: i < cur ? "#ff6b47" : i === cur ? "#0a0a0d" : "#4a4454", boxShadow: i === cur ? "0 0 0 4px rgba(255,107,71,0.16), 0 4px 18px rgba(255,107,71,0.45)" : "none" }),
    stepLabel: (i, cur) => ({ fontSize: "0.65rem", letterSpacing: "0.12em", textTransform: "uppercase", color: i < cur ? "#ff6b47" : i === cur ? "#ff6b47" : "#3a3544", textAlign: "center", fontWeight: i === cur ? 700 : 400 }),
    stepConn: (i, cur) => ({ flex: 1, height: 1, background: i < cur ? "#ff6b47" : "#2a2732", marginBottom: 28 }),
    card: { background: "linear-gradient(145deg, #18151d 0%, #1d1824 100%)", border: "1px solid #2e2a38", borderRadius: 12, padding: "40px 48px", maxWidth: 640, width: "90%", marginTop: 36, boxShadow: "0 8px 40px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,107,71,0.1)" },
    loginCard: { background: "linear-gradient(145deg, rgba(22,19,27,0.75) 0%, rgba(26,22,32,0.75) 100%)", backdropFilter: "blur(10px)", WebkitBackdropFilter: "blur(10px)", border: "1px solid #2e2a38", borderRadius: 12, padding: "44px 48px", maxWidth: 460, width: "90%", marginTop: 36, boxShadow: "0 8px 44px rgba(0,0,0,0.55), inset 0 1px 0 rgba(255,107,71,0.12)" },
    seal: { width: 46, height: 46, borderRadius: "50%", border: "1.5px solid #ff6b47", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 18px", color: "#ff6b47", fontSize: "1.2rem" },
    homeLink: { background: "none", border: "none", color: "#9691a0", fontSize: "0.68rem", letterSpacing: "0.14em", textTransform: "uppercase", cursor: "pointer", fontFamily: FONT_UI, padding: 0, marginBottom: 22, display: "flex", alignItems: "center", gap: 6 },
    cardTitle: { fontSize: "1rem", letterSpacing: "0.2em", textTransform: "uppercase", color: "#ff6b47", fontWeight: "normal", marginBottom: 6, fontFamily: FONT_HEAD },
    divider: { width: "100%", height: 1, background: "linear-gradient(90deg, #ff6b47, transparent)", marginBottom: 28 },
    sectionLabel: { fontSize: "0.68rem", letterSpacing: "0.2em", textTransform: "uppercase", color: "#9691a0", marginBottom: 8, display: "block" },
    dropZone: (active, done) => ({ border: `1.5px dashed ${active ? "#ff6b47" : done ? "#4ade80" : "#3a3544"}`, borderRadius: 12, padding: "28px 20px", textAlign: "center", cursor: "pointer", background: active ? "rgba(255,107,71,0.06)" : done ? "rgba(74,222,128,0.06)" : "rgba(16,14,20,0.5)", transition: "all 0.2s ease", marginBottom: 16 }),
    fileName: { fontSize: "0.85rem", color: "#ff6b47", marginTop: 10, display: "inline-flex", alignItems: "center", gap: 8, background: "rgba(74,222,128,0.1)", border: "1px solid rgba(74,222,128,0.35)", borderRadius: 20, padding: "5px 14px", animation: "fadeIn 0.3s ease" },
    fileCheck: { width: 16, height: 16, borderRadius: "50%", background: "#4ade80", color: "#0a0a0d", fontSize: "0.6rem", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 },
    dropHint: { fontSize: "0.75rem", color: "#4a4454", letterSpacing: "0.1em" },
    input: { width: "100%", padding: "11px 14px", background: "rgba(14,12,17,0.8)", border: "1px solid #2e2a38", borderRadius: 12, color: "#f5f3f7", fontSize: "0.9rem", outline: "none", fontFamily: FONT_UI, marginBottom: 14, boxSizing: "border-box" },
    select: { width: "100%", padding: "11px 14px", background: "rgba(14,12,17,0.8)", border: "1px solid #2e2a38", borderRadius: 12, color: "#f5f3f7", fontSize: "0.9rem", outline: "none", fontFamily: FONT_UI, marginBottom: 14, boxSizing: "border-box", cursor: "pointer" },
    primaryBtn: { background: "linear-gradient(90deg, #ff6b47 0%, #ff8a5c 100%)", color: "#0a0a0d", border: "none", borderRadius: 999, padding: "13px 32px", fontSize: "0.78rem", fontWeight: "bold", letterSpacing: "0.18em", textTransform: "uppercase", cursor: "pointer", fontFamily: FONT_UI, marginTop: 8, width: "100%" },
    disabledBtn: { background: "#2a2732", color: "#3a3544", border: "none", borderRadius: 999, padding: "13px 32px", fontSize: "0.78rem", fontWeight: "bold", letterSpacing: "0.18em", textTransform: "uppercase", cursor: "not-allowed", fontFamily: FONT_UI, marginTop: 8, width: "100%" },
    errorBox: { background: "rgba(251,113,133,0.12)", border: "1px solid rgba(251,113,133,0.35)", borderRadius: 12, padding: "10px 14px", color: "#fb7185", fontSize: "0.8rem", letterSpacing: "0.04em", marginBottom: 14, display: "flex", alignItems: "center", gap: 8 },
    successBox: { background: "rgba(74,222,128,0.1)", border: "1px solid rgba(74,222,128,0.3)", borderRadius: 12, padding: "10px 14px", color: "#86efac", fontSize: "0.8rem", letterSpacing: "0.04em", marginBottom: 14, display: "flex", alignItems: "center", gap: 8 },
    infoBox: { background: "rgba(167,139,250,0.08)", border: "1px solid rgba(167,139,250,0.25)", borderRadius: 12, padding: "10px 14px", color: "#60a5fa", fontSize: "0.78rem", letterSpacing: "0.04em", marginBottom: 14, lineHeight: 1.6 },
    modeTabBar: { display: "flex", marginBottom: 22 },
    modeTab: (active) => ({ flex: 1, padding: "10px 0", background: active ? "rgba(255,107,71,0.12)" : "transparent", border: active ? "1px solid #ff6b47" : "1px solid #2e2a38", color: active ? "#ff6b47" : "#4a4454", fontSize: "0.75rem", letterSpacing: "0.15em", textTransform: "uppercase", cursor: "pointer", fontFamily: FONT_UI }),
    radioGroup: { display: "flex", gap: 20, marginBottom: 14 },
    radioLabel: (checked) => ({ display: "flex", alignItems: "center", gap: 8, cursor: "pointer", fontSize: "0.82rem", color: checked ? "#ffb088" : "#9691a0", letterSpacing: "0.06em" }),
    overlay: { position: "fixed", inset: 0, background: "rgba(8,7,10,0.88)", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", zIndex: 9999 },
    spinner: { width: 52, height: 52, border: "3px solid #2a2732", borderTop: "3px solid #ff6b47", borderRadius: "50%", animation: "spin 0.9s linear infinite", marginBottom: 22 },
    resultCard: { maxWidth: 880, width: "92%", marginTop: 32, background: "linear-gradient(145deg, #18151d 0%, #1d1824 100%)", border: "1px solid #2e2a38", borderRadius: 12, padding: "36px 40px", boxShadow: "0 8px 40px rgba(0,0,0,0.5)" },
    tabBar: { display: "flex", borderBottom: "1px solid #2e2a38", marginBottom: 20 },
    tab: (active) => ({ padding: "10px 24px", fontSize: "0.72rem", letterSpacing: "0.15em", textTransform: "uppercase", color: active ? "#ff6b47" : "#4a4454", cursor: "pointer", background: "transparent", border: "none", borderBottom: active ? "2px solid #ff6b47" : "2px solid transparent", fontFamily: FONT_UI }),
    table: { width: "100%", borderCollapse: "collapse", fontSize: "0.82rem" },
    th: { padding: "11px 14px", textAlign: "left", fontSize: "0.65rem", letterSpacing: "0.18em", textTransform: "uppercase", color: "#ff6b47", borderBottom: "1px solid #2e2a38", fontFamily: FONT_UI, fontWeight: "normal" },
    td: (i) => ({ padding: "10px 14px", borderBottom: "1px solid rgba(38,34,46,0.5)", color: "#e5e1ea", background: i % 2 === 0 ? "rgba(16,14,20,0.4)" : "transparent" }),
    backBtn: { background: "transparent", border: "1px solid #2e2a38", color: "#9691a0", borderRadius: 999, padding: "10px 24px", fontSize: "0.72rem", letterSpacing: "0.15em", textTransform: "uppercase", cursor: "pointer", fontFamily: FONT_UI, marginTop: 20 },
    exportBtn: (loading) => ({ background: "transparent", border: "1px solid #ff6b47", color: loading ? "#9691a0" : "#ff6b47", borderRadius: 999, padding: "10px 24px", fontSize: "0.72rem", letterSpacing: "0.15em", textTransform: "uppercase", cursor: loading ? "not-allowed" : "pointer", fontFamily: FONT_UI, marginTop: 20, marginLeft: 12 }),
    footer: { marginTop: "auto", paddingTop: 60, fontSize: "0.62rem", letterSpacing: "0.18em", color: "#9691a0", textTransform: "uppercase", textAlign: "center" },
    modal: { position: "fixed", inset: 0, background: "rgba(8,7,10,0.92)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 9999 },
    modalCard: { background: "linear-gradient(145deg, #18151d 0%, #1d1824 100%)", border: "1px solid #ff6b47", borderRadius: 12, padding: "36px 40px", maxWidth: 480, width: "90%", boxShadow: "0 8px 40px rgba(0,0,0,0.7)" },
    forgotLink: { background: "none", border: "none", color: "#ff6b47", fontSize: "0.72rem", letterSpacing: "0.12em", cursor: "pointer", fontFamily: FONT_UI, textDecoration: "underline", padding: 0, marginTop: 10, display: "block", textAlign: "right" },
    statRow: { display: "flex", gap: 14, flexWrap: "wrap", marginBottom: 26 },
    statCard: { flex: "1 1 150px", background: "rgba(255,107,71,0.06)", border: "1px solid #2e2a38", borderRadius: 12, padding: "16px 18px" },
    statNum: { fontSize: "1.5rem", color: "#ffb088", fontWeight: "bold" },
    statLabel: { fontSize: "0.62rem", letterSpacing: "0.14em", textTransform: "uppercase", color: "#9691a0", marginTop: 4 },
  };

  const canProceedUpload = files.department && files.room;

  if (screen === "landing") {
    return <LandingPage onEnter={() => setScreen("wizard")} />;
  }

  return (
    <div style={s.app}>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } } @keyframes fadeIn { from { opacity: 0; transform: translateY(-3px); } to { opacity: 1; transform: translateY(0); } } input:focus,select:focus { border-color: #ff6b47 !important; } * { box-sizing: border-box; } ::-webkit-scrollbar { width:6px } ::-webkit-scrollbar-thumb { background:#2e2a38; border-radius:3px } input[type=number]::-webkit-inner-spin-button, input[type=number]::-webkit-outer-spin-button { -webkit-appearance: none; margin: 0; } input[type=number] { -moz-appearance: textfield; } .btn-hover:hover:not(:disabled) { filter: brightness(1.1); transform: translateY(-1px); } .btn-hover:active:not(:disabled) { transform: translateY(0); } .card-hover { transition: border-color 0.25s ease, box-shadow 0.25s ease, transform 0.25s ease; } .card-hover:hover { border-color: #ff6b47 !important; box-shadow: 0 12px 50px rgba(0,0,0,0.6), 0 0 0 1px rgba(255,107,71,0.15) !important; transform: translateY(-2px); }
        @media (max-width: 768px) {
          .app-header-inner { padding: 20px 20px 16px !important; }
          .app-stepper { padding: 20px 8px 0 !important; }
          .responsive-card { padding: 26px 22px !important; max-width: 94% !important; width: 94% !important; }
        }
        @media (max-width: 560px) {
          .app-stepper .step-label-text { display: none; }
          .responsive-card { padding: 20px 16px !important; }
        }
        @media (max-width: 480px) {
          .app-header-title { font-size: 2.1rem !important; letter-spacing: -0.01em !important; }
          .app-header-sup { font-size: 0.56rem !important; letter-spacing: 0.2em !important; }
        }
      `}</style>
      <Toaster
        position="top-right"
        icons={{
          success: <CheckCircle2 size={17} color="#4ade80" />,
          error: <AlertTriangle size={17} color="#fb7185" />,
          warning: <AlertTriangle size={17} color="#ff6b47" />,
          info: <Info size={17} color="#60a5fa" />,
        }}
        toastOptions={{
          style: {
            background: "#18151d",
            border: "1px solid #ff6b47",
            color: "#f5f3f7",
            fontFamily: FONT_UI,
            fontSize: "0.82rem",
            letterSpacing: "0.02em",
          },
        }}
      />

      <AnimatePresence>
        {serverDown && <ServerUnreachable onRetry={() => setServerDown(false)} />}
      </AnimatePresence>

      {showSettings && (
        <SettingsModal
          onClose={() => setShowSettings(false)}
          onChangePassword={() => { setShowSettings(false); handleForgotPassword(); }}
          reducedMotion={reducedMotion}
          onToggleReducedMotion={() => setReducedMotion((v) => !v)}
        />
      )}

      {/* Header */}
      <div style={s.header}>
        <div style={s.headerInner} className="app-header-inner">
          <div style={s.headerSup} className="app-header-sup">Controller of Examinations · Office Management System</div>
          <h1 style={s.headerTitle} className="app-header-title">Seating <span style={s.headerHl}>Arrangement</span> System</h1>
          <p style={s.headerSub}>Examination Hall Allocation Portal</p>
          <div style={s.goldLine} />
          {authenticated && (
            <div style={{ position: "absolute", top: 20, right: 30, display: "flex", gap: 10 }}>
              <button
                onClick={() => setShowSettings(true)}
                title="Settings"
                style={{ background: "transparent", border: "1px solid #2e2a38", color: "#a8a3b0", borderRadius: "50%", width: 40, height: 40, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}
              >
                <Settings size={17} />
              </button>
              <button
                onClick={handleLogout}
                style={{ background: "linear-gradient(90deg, #ff6b47 0%, #ff8a5c 100%)", color: "#0a0a0d", border: "none", borderRadius: 999, padding: "10px 28px", fontSize: "0.78rem", fontWeight: "bold", letterSpacing: "0.18em", textTransform: "uppercase", cursor: "pointer", fontFamily: FONT_UI, display: "flex", alignItems: "center", gap: 8 }}
              >
                <LogOut size={14} /> Logout
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Stepper */}
      <div style={s.stepper} className="app-stepper">
        {STEPS.map((step, i) => {
          const StepIcon = stepIconList[i];
          return (
            <div key={step} style={{ display: "flex", alignItems: "center", flex: 1 }}>
              <div style={s.stepItem}>
                <motion.div
                  style={s.stepCircle(i, currentStep)}
                  animate={i === currentStep && !reducedMotion ? { scale: [1, 1.08, 1] } : { scale: 1 }}
                  transition={i === currentStep && !reducedMotion ? { repeat: Infinity, duration: 1.8, ease: "easeInOut" } : { duration: 0.2 }}
                >
                  {i < currentStep ? <Check size={18} /> : <StepIcon size={18} />}
                </motion.div>
                <span style={s.stepLabel(i, currentStep)} className="step-label-text">{step}</span>
              </div>
              {i < STEPS.length - 1 && <div style={s.stepConn(i, currentStep)} />}
            </div>
          );
        })}
      </div>

      {/* Processing overlay */}
      <AnimatePresence>
        {processing && (
          <motion.div
            style={s.overlay}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ duration: 0.25 }}
              style={{ display: "flex", flexDirection: "column", alignItems: "center" }}
            >
              <div style={s.spinner} />
              <div style={{ color: "#ff6b47", fontSize: "0.8rem", letterSpacing: "0.25em", textTransform: "uppercase" }}>Processing Allocation...</div>
              <div style={{ color: "#4a4454", fontSize: "0.7rem", marginTop: 10, letterSpacing: "0.1em" }}>Please wait while rooms are being allocated</div>
              <div style={{ width: 180, height: 3, background: "#2a2732", borderRadius: 12, marginTop: 18, overflow: "hidden" }}>
                <motion.div
                  style={{ width: "40%", height: "100%", background: "linear-gradient(90deg, transparent, #ff6b47, transparent)" }}
                  animate={reducedMotion ? {} : { x: ["-100%", "250%"] }}
                  transition={reducedMotion ? { duration: 0 } : { repeat: Infinity, duration: 1.1, ease: "easeInOut" }}
                />
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Step 0: Upload */}
      {/* Step 0: Authentication */}
      {currentStep === 0 && (
        <motion.div style={s.loginCard} className="responsive-card card-hover" initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: reducedMotion ? 0 : 0.35, ease: "easeOut" }}>
          <button style={s.homeLink} onClick={() => setScreen("landing")}><ArrowLeft size={13} /> Home</button>
          <div style={s.seal}><Lock size={20} /></div>
          <div style={{ ...s.cardTitle, textAlign: "center", fontSize: "1.15rem" }}>Step 1: Authentication</div>
          <div style={s.divider} />
          <div style={{ fontSize: "0.72rem", color: "#9691a0", letterSpacing: "0.12em", marginBottom: 18, lineHeight: 1.7 }}>
            Access is restricted to authorised COE office personnel only.
          </div>
          {SHOW_DEMO_HINT && (
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, background: "rgba(255,107,71,0.06)", border: "1px dashed #ff6b47", borderRadius: 10, padding: "10px 14px", marginBottom: 24 }}>
              <div style={{ display: "flex", alignItems: "flex-start", gap: 8 }}>
                <Info size={14} color="#ff6b47" style={{ marginTop: 2, flexShrink: 0 }} />
                <div style={{ fontSize: "0.68rem", color: "#a8a3b0", lineHeight: 1.6 }}>
                  Portfolio demo: <span style={{ color: "#f5f3f7" }}>{DEMO_USERNAME}</span> / <span style={{ color: "#f5f3f7" }}>{DEMO_PASSWORD}</span>
                </div>
              </div>
              <button
                onClick={() => setAuth((a) => ({ ...a, username: DEMO_USERNAME, password: DEMO_PASSWORD }))}
                title="Fill in demo credentials"
                style={{ background: "none", border: "1px solid #ff6b47", color: "#ff6b47", borderRadius: 8, width: 28, height: 28, flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}
              >
                <Copy size={12} />
              </button>
            </div>
          )}
          <span style={s.sectionLabel}>Username</span>
          <input style={{ ...s.input, marginBottom: 22 }} type="text" placeholder="Enter username" value={auth.username} disabled={auth.attempts >= 3} onChange={(e) => setAuth((a) => ({ ...a, username: e.target.value }))} onKeyDown={(e) => e.key === "Enter" && handleAuthenticate()} />
          <span style={s.sectionLabel}>Password</span>
          <div style={{ position: "relative", marginBottom: 26 }}>
            <input style={{ ...s.input, paddingRight: 42, marginBottom: 0 }} type={showPassword ? "text" : "password"} placeholder="Enter password" value={auth.password} disabled={auth.attempts >= 3} onChange={(e) => setAuth((a) => ({ ...a, password: e.target.value }))} onKeyDown={(e) => e.key === "Enter" && handleAuthenticate()} />
            <span
              onClick={() => setShowPassword((v) => !v)}
              style={{ position: "absolute", right: 14, top: "50%", transform: "translateY(-50%)", cursor: "pointer", color: "#9691a0", userSelect: "none", display: "flex", alignItems: "center", justifyContent: "center", lineHeight: 0, height: 18 }}
              title={showPassword ? "Hide password" : "Show password"}
            >
              {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
            </span>
          </div>
          {auth.error && <div style={s.errorBox}><AlertTriangle size={14} /> {auth.error}</div>}
          {authenticated && <div style={s.successBox}><CheckCircle2 size={14} /> Authentication Successful</div>}
          <button
            className="btn-hover"
            style={auth.attempts >= 3 ? s.disabledBtn : { ...s.primaryBtn, padding: "16px 32px", fontSize: "0.85rem", boxShadow: "0 8px 28px rgba(255,107,71,0.4)" }}
            disabled={auth.attempts >= 3 || auth.loading}
            onClick={handleAuthenticate}
          >
            {auth.loading && <Spinner reducedMotion={reducedMotion} />}
            {auth.loading ? auth.loadingMessage : "Authenticate"}
          </button>
          <button style={s.forgotLink} onClick={handleForgotPassword}>Forgot Password?</button>
        </motion.div>
      )}

      {/* Step 1: Upload Files */}
      {currentStep === 1 && (
        <motion.div style={s.card} className="responsive-card" initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: reducedMotion ? 0 : 0.35, ease: "easeOut" }}>
          <div style={s.cardTitle}>Step 2: Data Files</div>
          <div style={s.divider} />
          <div style={s.infoBox}>
            Upload the two required Excel files before proceeding. Both files must be present to run the allocation algorithm.
          </div>
          {SHOW_DEMO_HINT && (
            <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap", background: "rgba(255,107,71,0.06)", border: "1px dashed #ff6b47", borderRadius: 10, padding: "10px 14px", marginBottom: 20 }}>
              <Info size={14} color="#ff6b47" style={{ flexShrink: 0 }} />
              <span style={{ fontSize: "0.68rem", color: "#a8a3b0" }}>New here? Try it with sample data:</span>
              <a href="/sample_department_data.xlsx" download style={{ display: "inline-flex", alignItems: "center", gap: 5, fontSize: "0.68rem", color: "#ff6b47", textDecoration: "none", border: "1px solid #ff6b47", borderRadius: 999, padding: "4px 12px" }}>
                <Download size={11} /> Department Data
              </a>
              <a href="/sample_room_data.xlsx" download style={{ display: "inline-flex", alignItems: "center", gap: 5, fontSize: "0.68rem", color: "#ff6b47", textDecoration: "none", border: "1px solid #ff6b47", borderRadius: 999, padding: "4px 12px" }}>
                <Download size={11} /> Room Data
              </a>
            </div>
          )}

          {["department", "room"].map((key) => (
            <div key={key}>
              <span style={s.sectionLabel}>{key === "department" ? "Department Data File" : "Room Data File"} (.xlsx)</span>
              <div
                style={s.dropZone(dragOver[key], !!files[key])}
                onDragOver={(e) => { e.preventDefault(); setDragOver((d) => ({ ...d, [key]: true })); }}
                onDragLeave={() => setDragOver((d) => ({ ...d, [key]: false }))}
                onDrop={(e) => handleDrop(e, key)}
                onClick={() => (key === "department" ? depRef : roomRef).current.click()}
              >
                <input ref={key === "department" ? depRef : roomRef} type="file" accept=".xlsx,.xls" style={{ display: "none" }} onChange={(e) => handleFileInput(e, key)} />
                <div style={{ marginBottom: 8, color: "#9691a0" }}>
                  {key === "department" ? <FileSpreadsheet size={30} strokeWidth={1.5} /> : <Building2 size={30} strokeWidth={1.5} />}
                </div>
                <div style={s.dropHint}>
                  {files[key] ? "Click or drop to replace" : "Drag & drop or click to upload"}
                </div>
                {files[key] && (
                  <div style={s.fileName}>
                    <span style={s.fileCheck}><Check size={11} /></span>
                    {files[key].name}
                  </div>
                )}
              </div>
            </div>
          ))}

          {previewError && <div style={s.errorBox}><AlertTriangle size={14} /> {previewError}</div>}
          {canProceedUpload
            ? <div style={s.successBox}><CheckCircle2 size={14} /> Both files ready. You may proceed.</div>
            : <div style={{ fontSize: "0.75rem", color: "#4a4454", letterSpacing: "0.08em", marginBottom: 14 }}>Both files are required to continue.</div>
          }
          <button className="btn-hover" style={canProceedUpload ? s.primaryBtn : s.disabledBtn} disabled={!canProceedUpload || previewLoading} onClick={loadPreview}>
            {previewLoading && <Spinner reducedMotion={reducedMotion} />}
            {previewLoading ? "Loading Sheet Data..." : <>Preview &amp; Select <ArrowRight size={14} style={{ verticalAlign: "-2px", marginLeft: 4 }} /></>}
          </button>
          <button style={{ ...s.backBtn, display: "flex", alignItems: "center", justifyContent: "center", gap: 6, marginTop: 12, width: "100%" }} onClick={() => setCurrentStep(0)}><ArrowLeft size={13} /> Back</button>
        </motion.div>
      )}

      {/* Step 2: Configuration */}
      {currentStep === 2 && (
        <motion.div style={s.card} className="responsive-card" initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: reducedMotion ? 0 : 0.35, ease: "easeOut" }}>
          <div style={s.cardTitle}>Step 3: Allocation Configuration</div>
          <div style={s.divider} />
          <span style={s.sectionLabel}>Minimum Split Size (Required)</span>
          <div style={{ display: "flex", alignItems: "center", marginBottom: "20px", border: "1px solid #2e2a38", borderRadius: 12, background: "rgba(14,12,17,0.8)", overflow: "hidden" }}>
            <button
              onClick={() => setMinSplit(v => String(Math.max(1, (parseInt(v) || 1) - 1)))}
              style={{ width: 40, height: 44, background: "transparent", border: "none", borderRight: "1px solid #2e2a38", color: "#ff6b47", fontSize: "1.2rem", cursor: "pointer", fontFamily: FONT_UI, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}
            >−</button>
            <input
              type="number"
              min="1"
              style={{ flex: 1, padding: "11px 14px", background: "transparent", border: "none", color: "#f5f3f7", fontSize: "0.9rem", outline: "none", fontFamily: FONT_UI, textAlign: "center", MozAppearance: "textfield" }}
              value={minSplit}
              onChange={(e) => setMinSplit(e.target.value)}
              placeholder="Enter minimum split"
            />
            <button
              onClick={() => setMinSplit(v => String((parseInt(v) || 0) + 1))}
              style={{ width: 40, height: 44, background: "transparent", border: "none", borderLeft: "1px solid #2e2a38", color: "#ff6b47", fontSize: "1.2rem", cursor: "pointer", fontFamily: FONT_UI, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}
            >+</button>
          </div>
          <div style={s.modeTabBar}>
            <button style={s.modeTab(mode === "Semester")} onClick={() => setMode("Semester")}>Semester</button>
            <button style={s.modeTab(mode === "Class Test")} onClick={() => setMode("Class Test")}>Class Test</button>
          </div>

          {mode === "Semester" && (
            <>
              <span style={s.sectionLabel}>Select Academic Year</span>
              <select style={s.select} value={semYear} onChange={(e) => setSemYear(e.target.value)}>
                <option>Select Year</option>
                {years.map((y) => <option key={y}>{y}</option>)}
              </select>
            </>
          )}

          {mode === "Class Test" && (
            <>
              <span style={s.sectionLabel}>Selection Method</span>
              <div style={s.radioGroup}>
                <label style={s.radioLabel(classMode === "suggestion")}>
                  <input type="radio" checked={classMode === "suggestion"} onChange={() => setClassMode("suggestion")} style={{ accentColor: "#ff6b47" }} />
                  Best Suggested Combination
                </label>
                <label style={s.radioLabel(classMode === "manual")}>
                  <input type="radio" checked={classMode === "manual"} onChange={() => setClassMode("manual")} style={{ accentColor: "#ff6b47" }} />
                  Manual Selection
                </label>
              </div>

              {classMode === "suggestion" && (
                <>
                  <span style={s.sectionLabel}>Optimal Year Combination {combosLoading && "(Loading...)"}</span>
                  {!combosLoading && combos.length === 0 ? (
                    <div style={{ ...s.infoBox, display: "flex", alignItems: "center", gap: 10 }}>
                      <Info size={16} style={{ flexShrink: 0 }} />
                      No valid year-pair combinations were found for the selected data.
                      Try selecting more rooms or departments in the previous step, or switch to Manual Selection.
                    </div>
                  ) : (
                    <select style={s.select} value={bestCombo?.label || ""} onChange={(e) => setBestCombo(combos.find(c => c.label === e.target.value))}>
                      {combosLoading && <option>Loading...</option>}
                      {combos.map((c) => <option key={c.label} value={c.label}>{c.label}</option>)}
                    </select>
                  )}
                </>
              )}

              {classMode === "manual" && (
                <>
                  <span style={s.sectionLabel}>Year Group A</span>
                  <select style={s.select} value={year1} onChange={(e) => setYear1(e.target.value)}>
                    <option>Select Year</option>
                    {years.map((y) => <option key={y}>{y}</option>)}
                  </select>
                  <span style={s.sectionLabel}>Year Group B</span>
                  <select style={s.select} value={year2} onChange={(e) => setYear2(e.target.value)}>
                    <option>Select Year</option>
                    {years.map((y) => <option key={y}>{y}</option>)}
                  </select>
                </>
              )}
            </>
          )}

          {configError && <div style={s.errorBox}><AlertTriangle size={14} /> {configError}</div>}
          <button className="btn-hover" style={s.primaryBtn} onClick={handleAllocate}>Generate Room Allocation</button>
          <button style={{ ...s.backBtn, display: "flex", alignItems: "center", justifyContent: "center", gap: 6, marginTop: 12, width: "100%" }} onClick={() => setCurrentStep(1)}><ArrowLeft size={13} /> Back</button>

        </motion.div>
      )}

      {/* Step 3: Results */}
      {currentStep === 3 && !results && (
        <motion.div style={s.resultCard} className="responsive-card card-hover" initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: reducedMotion ? 0 : 0.35, ease: "easeOut" }}>
          <div style={{ textAlign: "center", padding: "50px 20px" }}>
            <div style={{ width: 64, height: 64, borderRadius: "50%", border: "1.5px solid #2e2a38", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 22px", color: "#4a4454" }}>
              <ClipboardList size={28} />
            </div>
            <div style={{ fontSize: "1.15rem", fontWeight: 700, fontFamily: FONT_HEAD, color: "#f5f3f7", marginBottom: 10 }}>No Allocation Yet</div>
            <div style={{ fontSize: "0.82rem", color: "#9691a0", lineHeight: 1.7, maxWidth: 360, margin: "0 auto 26px" }}>
              Generate your first seating arrangement to see the results, tables, and analytics here.
            </div>
            <button className="btn-hover" style={{ ...s.primaryBtn, width: "auto", padding: "13px 32px" }} onClick={() => setCurrentStep(2)}>
              Generate Allocation
            </button>
          </div>
        </motion.div>
      )}

      {currentStep === 3 && results && (
        <motion.div style={s.resultCard} className="responsive-card" initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: reducedMotion ? 0 : 0.35, ease: "easeOut" }}>
          <div style={s.cardTitle}>Step 4: Allocation Results</div>
          <div style={s.divider} />
          <div style={{ fontSize: "0.72rem", color: "#9691a0", letterSpacing: "0.1em", marginBottom: 18 }}>
            Mode: <span style={{ color: "#ff6b47" }}>{results.mode}</span>
            &nbsp;&nbsp;|&nbsp;&nbsp;
            Allocation for: <span style={{ color: "#ff6b47" }}>{results.year}</span>
          </div>

          <div style={s.statRow}>
            <div style={s.statCard}>
              <div style={s.statNum}>{new Set(results.rawAllocation.map(r => r["Department"])).size}</div>
              <div style={s.statLabel}>Departments</div>
            </div>
            <div style={s.statCard}>
              <div style={s.statNum}>{new Set(results.rawAllocation.map(r => r["Room Allocated"])).size}</div>
              <div style={s.statLabel}>Rooms Used</div>
            </div>
            <div style={s.statCard}>
              <div style={s.statNum}>
                {results.rawAllocation.reduce((sum, r) => sum + (Number(r["Allocated Strength"]) || 0), 0)}
              </div>
              <div style={s.statLabel}>Students Seated</div>
            </div>
          </div>

          <div style={s.tabBar}>
            <button style={{ ...s.tab(resultView === "table"), display: "flex", alignItems: "center", gap: 6 }} onClick={() => setResultView("table")}><Table2 size={14} /> Table</button>
            <button style={{ ...s.tab(resultView === "charts"), display: "flex", alignItems: "center", gap: 6 }} onClick={() => setResultView("charts")}><BarChart3 size={14} /> Analytics</button>
          </div>

          {resultView === "table" && (
            <>
              {results.tables.length > 1 && (
                <div style={{ display: "flex", gap: 10, marginBottom: 16 }}>
                  {results.tables.map((t, i) => (
                    <button key={i} style={s.tab(activeResultTab === i)} onClick={() => setActiveResultTab(i)}>{t.title}</button>
                  ))}
                </div>
              )}
              <ResultsTable rows={results.tables[activeResultTab].rows} />
            </>
          )}

          {resultView === "charts" && <AllocationCharts rows={results.rawAllocation} />}

          <div style={{ display: "flex", flexWrap: "wrap", marginTop: 20 }}>
            <button className="btn-hover" style={{ ...s.backBtn, display: "flex", alignItems: "center", gap: 6 }} onClick={() => { setCurrentStep(2); setResults(null); }}><ArrowLeft size={13} /> New Allocation</button>
            <button className="btn-hover" style={s.exportBtn(exportLoading)} disabled={exportLoading} onClick={handleExport}>
              {exportLoading && <Spinner size={12} color="#ff6b47" reducedMotion={reducedMotion} />}
              {exportLoading ? "Exporting..." : <><Download size={13} style={{ verticalAlign: "-2px", marginRight: 4 }} /> Export to Excel</>}
            </button>
          </div>
        </motion.div>
      )}

      {/* Preview & Selection Modal */}
      {showPreview && (
        <div style={s.modal}>
          <div className="responsive-card" style={{
            ...s.modalCard,
            maxWidth: 820,
            width: "95%",
            maxHeight: "90vh",
            overflowY: "auto",
            padding: "32px 36px",
          }}>
            <div style={s.cardTitle}>Select Rooms & Departments</div>
            <div style={s.divider} />
            <div style={s.infoBox}>
              All rows are selected by default. Uncheck any rooms or departments you want to <strong>exclude</strong> from the allocation.
            </div>

            {/* ── ROOMS TABLE ── */}
            <div style={{ marginBottom: 28 }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
                <span style={{ ...s.sectionLabel, marginBottom: 0 }}>
                  Room Data &nbsp;
                  <span style={{ color: "#ff6b47" }}>
                    ({Object.values(selectedRooms).filter(Boolean).length}/{previewRooms.length} selected)
                  </span>
                </span>
                <div style={{ display: "flex", gap: 10 }}>
                  <button onClick={() => { const all = {}; previewRooms.forEach(r => { all[r.Room_Number] = true; }); setSelectedRooms(all); }}
                    style={{ ...s.backBtn, padding: "5px 14px", fontSize: "0.65rem", marginTop: 0 }}>All</button>
                  <button onClick={() => { const none = {}; previewRooms.forEach(r => { none[r.Room_Number] = false; }); setSelectedRooms(none); }}
                    style={{ ...s.backBtn, padding: "5px 14px", fontSize: "0.65rem", marginTop: 0 }}>None</button>
                </div>
              </div>
              <div style={{ maxHeight: 220, overflowY: "auto", border: "1px solid #2e2a38", borderRadius: 12 }}>
                <table style={s.table}>
                  <thead>
                    <tr>
                      <th style={{ ...s.th, width: 40 }}></th>
                      <th style={s.th}>Room Number</th>
                      <th style={{ ...s.th, textAlign: "center" }}>Capacity</th>
                    </tr>
                  </thead>
                  <tbody>
                    {previewRooms.map((room, i) => (
                      <tr key={room.Room_Number} onClick={() => setSelectedRooms(prev => ({ ...prev, [room.Room_Number]: !prev[room.Room_Number] }))}
                        style={{ cursor: "pointer", opacity: selectedRooms[room.Room_Number] ? 1 : 0.4 }}>
                        <td style={{ ...s.td(i), textAlign: "center" }}>
                          <input type="checkbox" checked={!!selectedRooms[room.Room_Number]}
                            onChange={() => {}} style={{ accentColor: "#ff6b47", width: 15, height: 15 }} />
                        </td>
                        <td style={s.td(i)}>{room.Room_Number}</td>
                        <td style={{ ...s.td(i), textAlign: "center" }}>{room.Capacity}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* ── DEPARTMENTS TABLE ── */}
            <div style={{ marginBottom: 24 }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
                <span style={{ ...s.sectionLabel, marginBottom: 0 }}>Department Data</span>
                <div style={{ display: "flex", gap: 10 }}>
                  <button onClick={() => {
                    const all = {}; (previewDepts[activeDeptYear] || []).forEach(d => { all[d.Department] = true; });
                    setSelectedDepts(prev => ({ ...prev, [activeDeptYear]: { ...prev[activeDeptYear], ...all } }));
                  }} style={{ ...s.backBtn, padding: "5px 14px", fontSize: "0.65rem", marginTop: 0 }}>All</button>
                  <button onClick={() => {
                    const none = {}; (previewDepts[activeDeptYear] || []).forEach(d => { none[d.Department] = false; });
                    setSelectedDepts(prev => ({ ...prev, [activeDeptYear]: { ...prev[activeDeptYear], ...none } }));
                  }} style={{ ...s.backBtn, padding: "5px 14px", fontSize: "0.65rem", marginTop: 0 }}>None</button>
                </div>
              </div>

              {/* Year tabs */}
              <div style={{ ...s.tabBar, marginBottom: 0 }}>
                {years.map(year => (
                  <button key={year} style={s.tab(activeDeptYear === year)} onClick={() => setActiveDeptYear(year)}>
                    {year}
                    {selectedDepts[year] && (
                      <span style={{ color: "#9691a0", marginLeft: 4, fontSize: "0.6rem" }}>
                        ({Object.values(selectedDepts[year]).filter(Boolean).length}/{Object.keys(selectedDepts[year]).length})
                      </span>
                    )}
                  </button>
                ))}
              </div>
              <div style={{ maxHeight: 200, overflowY: "auto", border: "1px solid #2e2a38", borderTop: "none", borderRadius: "0 0 10px 10px" }}>
                <table style={s.table}>
                  <thead>
                    <tr>
                      <th style={{ ...s.th, width: 40 }}></th>
                      <th style={s.th}>Department</th>
                      <th style={{ ...s.th, textAlign: "center" }}>Total Students</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(previewDepts[activeDeptYear] || []).map((dept, i) => (
                      <tr key={dept.Department}
                        onClick={() => setSelectedDepts(prev => ({
                          ...prev,
                          [activeDeptYear]: { ...prev[activeDeptYear], [dept.Department]: !prev[activeDeptYear]?.[dept.Department] }
                        }))}
                        style={{ cursor: "pointer", opacity: selectedDepts[activeDeptYear]?.[dept.Department] ? 1 : 0.4 }}>
                        <td style={{ ...s.td(i), textAlign: "center" }}>
                          <input type="checkbox" checked={!!selectedDepts[activeDeptYear]?.[dept.Department]}
                            onChange={() => {}} style={{ accentColor: "#ff6b47", width: 15, height: 15 }} />
                        </td>
                        <td style={s.td(i)}>{dept.Department}</td>
                        <td style={{ ...s.td(i), textAlign: "center" }}>{dept.Total_Students}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Summary */}
            <div style={{ ...s.infoBox, marginBottom: 20 }}>
              <strong style={{ color: "#ff6b47" }}>Summary:</strong>&nbsp;
              {Object.values(selectedRooms).filter(Boolean).length} rooms selected &nbsp;|&nbsp;
              {Object.entries(selectedDepts).map(([y, dmap]) =>
                `${Object.values(dmap).filter(Boolean).length} dept(s) in ${y}`
              ).join(", ")}
            </div>

            <div style={{ display: "flex", gap: 12 }}>
              <button style={{ ...s.backBtn, flex: 1, marginTop: 0, display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }} onClick={() => setShowPreview(false)}><ArrowLeft size={13} /> Back to Upload</button>
              <button style={{ ...s.primaryBtn, flex: 2, marginTop: 0 }}
                onClick={() => { setShowPreview(false); setCurrentStep(2); loadCombos(); }}>
                Confirm &amp; Proceed to Configuration <ArrowRight size={14} style={{ verticalAlign: "-2px", marginLeft: 4 }} />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Forgot Password Modal */}
      {forgotStep > 0 && (
        <div style={s.modal}>
          <div style={s.modalCard} className="responsive-card">
            <div style={s.cardTitle}>{forgotStep === 1 ? "Identity Verification" : "Reset Password"}</div>
            <div style={s.divider} />

            {forgotStep === 1 && (
              <>
                <div style={{ fontSize: "0.72rem", color: "#9691a0", letterSpacing: "0.1em", marginBottom: 18, lineHeight: 1.7 }}>
                  Answer the security question to verify your identity.
                </div>
                <span style={s.sectionLabel}>Security Question</span>
                <div style={{ fontSize: "0.85rem", color: "#ffb088", marginBottom: 16, letterSpacing: "0.06em" }}>{forgotQuestion}</div>
                <span style={s.sectionLabel}>Your Answer</span>
                <input style={s.input} type="text" placeholder="Enter your answer" value={forgotAnswer} onChange={(e) => setForgotAnswer(e.target.value)} onKeyDown={(e) => e.key === "Enter" && handleVerifyAnswer()} />
                {forgotAnswerError && <div style={s.errorBox}><AlertTriangle size={14} /> {forgotAnswerError}</div>}
                <button style={s.primaryBtn} onClick={handleVerifyAnswer}>Verify Answer</button>
                <button style={{ ...s.backBtn, display: "flex", alignItems: "center", justifyContent: "center", gap: 6, marginTop: 12, width: "100%" }} onClick={() => setForgotStep(0)}><X size={13} /> Cancel</button>
              </>
            )}

            {forgotStep === 2 && (
              <>
                <div style={{ fontSize: "0.72rem", color: "#9691a0", letterSpacing: "0.1em", marginBottom: 18, lineHeight: 1.7 }}>
                  Identity verified. Set your new password below.
                </div>
                <span style={s.sectionLabel}>New Password</span>
                <input style={s.input} type="password" placeholder="Enter new password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} />
                <span style={s.sectionLabel}>Confirm Password</span>
                <input style={s.input} type="password" placeholder="Confirm new password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} onKeyDown={(e) => e.key === "Enter" && handleResetPassword()} />
                {resetError && <div style={s.errorBox}><AlertTriangle size={14} /> {resetError}</div>}
                {resetSuccess && <div style={s.successBox}><CheckCircle2 size={14} /> Password reset successfully!</div>}
                <button style={s.primaryBtn} onClick={handleResetPassword}>Reset Password</button>
                <button style={{ ...s.backBtn, display: "flex", alignItems: "center", justifyContent: "center", gap: 6, marginTop: 12, width: "100%" }} onClick={() => setForgotStep(0)}><X size={13} /> Cancel</button>
              </>
            )}
          </div>
        </div>
      )}

      <div style={s.footer}>
        © 2026 Examination Control System · Authorised Personnel Only
        <br />
        <button
          onClick={() => setShowSettings(true)}
          style={{ background: "none", border: "none", color: "#3a3544", fontSize: "0.6rem", letterSpacing: "0.14em", textTransform: "uppercase", cursor: "pointer", marginTop: 6, fontFamily: FONT_UI, textDecoration: "underline" }}
        >
          v1.5.0 · About &amp; Settings
        </button>
      </div>
    </div>
  );
}
