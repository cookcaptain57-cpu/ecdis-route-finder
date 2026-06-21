/* eslint-disable */
// src/Pages/SeafarerWelfareHub.jsx
import { useState } from "react";
import { db, auth } from "../firebase";
import { doc, setDoc, serverTimestamp } from "firebase/firestore";

// ─── tiny helpers ────────────────────────────────────────────────────────────
const fmt = (n) => isNaN(n) ? "0.00" : Number(n).toFixed(2);
const fmtInt = (n) => isNaN(n) ? "0" : Math.round(Number(n)).toLocaleString();

const S = `
  .cw-wrap { padding: 1.2rem; max-width: 1000px; margin: 0 auto; width: 100%; }
  .cw-header { margin-bottom: 1.4rem; }
  .cw-title { font-family: 'Orbitron', monospace; font-size: 1rem; font-weight: 700;
    letter-spacing: 0.08em; color: var(--cyan); display: flex; align-items: center; gap: 8px; }
  .cw-sub { font-size: 0.74rem; color: var(--text2); margin-top: 4px; }

  .cw-tabs { display: flex; gap: 0; border-bottom: 1px solid var(--border); margin-bottom: 1.4rem; overflow-x: auto; }
  .cw-tab { flex: 1; min-width: 110px; padding: 10px 8px; border: none; background: transparent;
    color: var(--text2); font-family: 'Exo 2', sans-serif; font-size: 0.74rem; font-weight: 600;
    cursor: pointer; transition: all 0.2s; text-align: center; text-transform: uppercase;
    letter-spacing: 0.06em; border-bottom: 2px solid transparent; white-space: nowrap; }
  .cw-tab:hover { color: var(--text); }
  .cw-tab.active-fin { color: var(--gold); border-bottom-color: var(--gold); }
  .cw-tab.active-plan { color: var(--cyan); border-bottom-color: var(--cyan); }
  .cw-tab.active-well { color: var(--green); border-bottom-color: var(--green); }

  .cw-grid { display: grid; gap: 1rem; grid-template-columns: repeat(auto-fill, minmax(290px, 1fr)); }
  .cw-card { background: var(--card); border: 1px solid var(--border); border-radius: 14px;
    padding: 1.1rem; transition: all 0.25s; }
  .cw-card:hover { border-color: rgba(0,180,216,0.3); box-shadow: 0 8px 28px rgba(0,0,0,0.35); }
  .cw-card-title { font-family: 'Orbitron', monospace; font-size: 0.68rem; font-weight: 700;
    letter-spacing: 0.08em; margin-bottom: 1rem; display: flex; align-items: center; gap: 7px; }
  .cw-result { background: var(--bg2); border: 1px solid var(--border); border-radius: 9px;
    padding: 10px 13px; margin-top: 0.8rem; font-size: 0.78rem; color: var(--text2); line-height: 1.7; }
  .cw-result strong { color: var(--cyan); font-size: 0.92rem; }
  .cw-result .gold { color: var(--gold); }
  .cw-result .green { color: var(--green); }
  .cw-result .red { color: var(--red); }

  .cw-save-btn { margin-top: 0.7rem; width: 100%; padding: 8px; border: none; border-radius: 8px;
    font-family: 'Exo 2', sans-serif; font-size: 0.72rem; font-weight: 700; cursor: pointer;
    background: rgba(0,180,216,0.12); color: var(--cyan); border: 1px solid rgba(0,180,216,0.25);
    transition: all 0.2s; }
  .cw-save-btn:hover { background: rgba(0,180,216,0.22); }
  .cw-save-btn:disabled { opacity: 0.4; cursor: not-allowed; }

  .score-row { display: flex; align-items: center; justify-content: space-between;
    padding: 7px 0; border-bottom: 1px solid rgba(255,255,255,0.05); font-size: 0.78rem; }
  .score-row:last-child { border-bottom: none; }
  .score-opts { display: flex; gap: 5px; }
  .score-opt { width: 30px; height: 28px; border: 1px solid var(--border); border-radius: 6px;
    background: transparent; color: var(--text2); font-size: 0.7rem; cursor: pointer;
    transition: all 0.15s; }
  .score-opt.sel { background: rgba(0,200,150,0.15); border-color: var(--green); color: var(--green); font-weight: 700; }

  .prog-bar { height: 8px; border-radius: 4px; background: var(--border); overflow: hidden; margin-top: 6px; }
  .prog-fill { height: 100%; border-radius: 4px; transition: width 0.4s ease; }

  .rest-row { display: grid; grid-template-columns: 1fr 80px 80px; gap: 6px;
    align-items: center; font-size: 0.74rem; padding: 5px 0;
    border-bottom: 1px solid rgba(255,255,255,0.04); }
  .rest-row:last-child { border-bottom: none; }

  .strategy-step { background: var(--bg2); border-left: 3px solid var(--cyan);
    border-radius: 0 8px 8px 0; padding: 10px 13px; margin-bottom: 8px; font-size: 0.76rem; line-height: 1.6; }
  .strategy-step .step-num { font-family: 'Orbitron', monospace; font-size: 0.6rem;
    color: var(--cyan); text-transform: uppercase; letter-spacing: 0.1em; margin-bottom: 3px; }

  @media (max-width: 600px) { .cw-grid { grid-template-columns: 1fr; } }
`;

// ─── Firestore save helper — FIX: use shared `auth` instance, not getAuth() ──
async function saveToFirestore(toolName, data, setMsg) {
  const user = auth.currentUser;
  if (!user) { setMsg("⚠️ Login required to save"); setTimeout(() => setMsg(""), 3000); return; }
  try {
    await setDoc(
      doc(db, "crewWelfare", user.uid, "tools", toolName),
      { ...data, savedAt: serverTimestamp() },
      { merge: true }
    );
    setMsg("✅ Saved to your account");
  } catch (e) {
    setMsg("❌ Save failed: " + e.message);
  }
  setTimeout(() => setMsg(""), 3500);
}

// ═══════════════════════════════════════════════════════════════════════════════
// TAB 1 — FINANCIAL TOOLS
// ═══════════════════════════════════════════════════════════════════════════════

function WageCalculator() {
  const [basic, setBasic]     = useState("");
  const [days, setDays]       = useState("30");
  const [currency, setCurrency] = useState("USD");
  const [msg, setMsg]         = useState("");
  const monthly = parseFloat(basic) || 0;
  const daily   = monthly / 30;
  const earned  = daily * (parseFloat(days) || 0);
  return (
    <div className="cw-card">
      <div className="cw-card-title">💵 Wage Calculator</div>
      <div className="ff">
        <label className="fl">Currency</label>
        <select className="fi" value={currency} onChange={e => setCurrency(e.target.value)}>
          {["USD","EUR","GBP","PHP","INR","SGD"].map(c => <option key={c}>{c}</option>)}
        </select>
      </div>
      <div className="ff">
        <label className="fl">Basic Monthly Wage ({currency})</label>
        <input className="fi" type="number" placeholder="e.g. 2500" value={basic} onChange={e => setBasic(e.target.value)} />
      </div>
      <div className="ff">
        <label className="fl">Days Worked This Month</label>
        <input className="fi" type="number" placeholder="30" value={days} onChange={e => setDays(e.target.value)} />
      </div>
      {basic && (
        <div className="cw-result">
          Daily Rate: <strong>{currency} {fmt(daily)}</strong><br />
          Earned ({days} days): <strong className="gold">{currency} {fmt(earned)}</strong>
        </div>
      )}
      {msg && <div className="ok-box" style={{marginTop:"0.5rem",marginBottom:0}}>{msg}</div>}
      <button className="cw-save-btn" onClick={() => saveToFirestore("wage", { basic, days, currency, monthly: fmt(monthly), earned: fmt(earned) }, setMsg)}>
        💾 Save Result
      </button>
    </div>
  );
}

function OvertimeCalculator() {
  const [basic, setBasic]   = useState("");
  const [otHours, setOtHours] = useState("");
  const [currency, setCurrency] = useState("USD");
  const [msg, setMsg]       = useState("");
  const hourlyOT  = (parseFloat(basic) || 0) / 208;
  const otRate    = hourlyOT * 1.25;
  const otEarned  = otRate * (parseFloat(otHours) || 0);
  const total     = (parseFloat(basic) || 0) + otEarned;
  return (
    <div className="cw-card">
      <div className="cw-card-title">⏰ Overtime Calculator</div>
      <div className="ff">
        <label className="fl">Currency</label>
        <select className="fi" value={currency} onChange={e => setCurrency(e.target.value)}>
          {["USD","EUR","GBP","PHP","INR","SGD"].map(c => <option key={c}>{c}</option>)}
        </select>
      </div>
      <div className="ff">
        <label className="fl">Basic Monthly Wage ({currency})</label>
        <input className="fi" type="number" placeholder="e.g. 2500" value={basic} onChange={e => setBasic(e.target.value)} />
      </div>
      <div className="ff">
        <label className="fl">OT Hours This Month</label>
        <input className="fi" type="number" placeholder="e.g. 20" value={otHours} onChange={e => setOtHours(e.target.value)} />
      </div>
      {basic && (
        <div className="cw-result">
          MLC OT Rate (×1.25): <strong>{currency} {fmt(otRate)}/hr</strong><br />
          OT Earned: <strong className="gold">{currency} {fmt(otEarned)}</strong><br />
          Total Wage: <strong className="green">{currency} {fmt(total)}</strong>
          <div style={{fontSize:"0.65rem",color:"var(--text3)",marginTop:4}}>Based on MLC 208 hrs/month standard</div>
        </div>
      )}
      {msg && <div className="ok-box" style={{marginTop:"0.5rem",marginBottom:0}}>{msg}</div>}
      <button className="cw-save-btn" onClick={() => saveToFirestore("overtime", { basic, otHours, currency, otEarned: fmt(otEarned), total: fmt(total) }, setMsg)}>
        💾 Save Result
      </button>
    </div>
  );
}

function AllotmentCalculator() {
  const [wage, setWage]         = useState("");
  const [allotPct, setAllotPct] = useState("70");
  const [currency, setCurrency] = useState("USD");
  const [msg, setMsg]           = useState("");
  const total    = parseFloat(wage) || 0;
  const allot    = total * ((parseFloat(allotPct) || 0) / 100);
  const retained = total - allot;
  return (
    <div className="cw-card">
      <div className="cw-card-title">🏦 Allotment Calculator</div>
      <div className="ff">
        <label className="fl">Currency</label>
        <select className="fi" value={currency} onChange={e => setCurrency(e.target.value)}>
          {["USD","EUR","GBP","PHP","INR","SGD"].map(c => <option key={c}>{c}</option>)}
        </select>
      </div>
      <div className="ff">
        <label className="fl">Total Monthly Wage ({currency})</label>
        <input className="fi" type="number" placeholder="e.g. 3000" value={wage} onChange={e => setWage(e.target.value)} />
      </div>
      <div className="ff">
        <label className="fl">Allotment % (sent home)</label>
        <input className="fi" type="number" min="0" max="100" placeholder="70" value={allotPct} onChange={e => setAllotPct(e.target.value)} />
      </div>
      {wage && (
        <div className="cw-result">
          Sent Home: <strong className="gold">{currency} {fmt(allot)} ({allotPct}%)</strong><br />
          Retained Onboard: <strong className="green">{currency} {fmt(retained)} ({fmt(100 - (parseFloat(allotPct)||0))}%)</strong>
        </div>
      )}
      {msg && <div className="ok-box" style={{marginTop:"0.5rem",marginBottom:0}}>{msg}</div>}
      <button className="cw-save-btn" onClick={() => saveToFirestore("allotment", { wage, allotPct, currency, allot: fmt(allot), retained: fmt(retained) }, setMsg)}>
        💾 Save Result
      </button>
    </div>
  );
}

function OnboardEarningsTotal() {
  const [basic, setBasic]       = useState("");
  const [otHours, setOtHours]   = useState("");
  const [months, setMonths]     = useState("");
  const [currency, setCurrency] = useState("USD");
  const [msg, setMsg]           = useState("");
  const monthlyBasic = parseFloat(basic) || 0;
  const otRate       = (monthlyBasic / 208) * 1.25;
  const otMonthly    = otRate * (parseFloat(otHours) || 0);
  const totalMonth   = monthlyBasic + otMonthly;
  const contractTotal = totalMonth * (parseFloat(months) || 0);
  return (
    <div className="cw-card">
      <div className="cw-card-title">📊 Onboard Earnings Total</div>
      <div className="ff">
        <label className="fl">Currency</label>
        <select className="fi" value={currency} onChange={e => setCurrency(e.target.value)}>
          {["USD","EUR","GBP","PHP","INR","SGD"].map(c => <option key={c}>{c}</option>)}
        </select>
      </div>
      <div className="ff">
        <label className="fl">Basic Monthly Wage ({currency})</label>
        <input className="fi" type="number" placeholder="e.g. 2500" value={basic} onChange={e => setBasic(e.target.value)} />
      </div>
      <div className="ff">
        <label className="fl">Avg OT Hours / Month</label>
        <input className="fi" type="number" placeholder="e.g. 20" value={otHours} onChange={e => setOtHours(e.target.value)} />
      </div>
      <div className="ff">
        <label className="fl">Contract Duration (Months)</label>
        <input className="fi" type="number" placeholder="e.g. 9" value={months} onChange={e => setMonths(e.target.value)} />
      </div>
      {basic && months && (
        <div className="cw-result">
          Monthly (Basic + OT): <strong>{currency} {fmt(totalMonth)}</strong><br />
          Full Contract ({months} mo): <strong className="gold">{currency} {fmt(contractTotal)}</strong>
        </div>
      )}
      {msg && <div className="ok-box" style={{marginTop:"0.5rem",marginBottom:0}}>{msg}</div>}
      <button className="cw-save-btn" onClick={() => saveToFirestore("earningsTotal", { basic, otHours, months, currency, totalMonth: fmt(totalMonth), contractTotal: fmt(contractTotal) }, setMsg)}>
        💾 Save Result
      </button>
    </div>
  );
}

function LeaveAccountPlanner() {
  const [leaveDays, setLeaveDays]       = useState("");
  const [monthlyExpense, setMonthlyExpense] = useState("");
  const [currency, setCurrency]         = useState("USD");
  const [msg, setMsg]                   = useState("");
  const days     = parseFloat(leaveDays) || 0;
  const expense  = parseFloat(monthlyExpense) || 0;
  const months   = days / 30;
  const needed   = expense * months;
  const buffer   = needed * 0.15;
  const total    = needed + buffer;
  return (
    <div className="cw-card">
      <div className="cw-card-title">🏖 Leave Account Planner</div>
      <div style={{fontSize:"0.7rem",color:"var(--text2)",marginBottom:"0.8rem",lineHeight:1.5}}>
        How much to have in account during leave period
      </div>
      <div className="ff">
        <label className="fl">Currency</label>
        <select className="fi" value={currency} onChange={e => setCurrency(e.target.value)}>
          {["USD","EUR","GBP","PHP","INR","SGD"].map(c => <option key={c}>{c}</option>)}
        </select>
      </div>
      <div className="ff">
        <label className="fl">Leave Duration (Days)</label>
        <input className="fi" type="number" placeholder="e.g. 60" value={leaveDays} onChange={e => setLeaveDays(e.target.value)} />
      </div>
      <div className="ff">
        <label className="fl">Monthly Living Expense ({currency})</label>
        <input className="fi" type="number" placeholder="e.g. 800" value={monthlyExpense} onChange={e => setMonthlyExpense(e.target.value)} />
      </div>
      {leaveDays && monthlyExpense && (
        <div className="cw-result">
          Leave Duration: <strong>{days} days ({fmt(months)} months)</strong><br />
          Basic Needed: <strong>{currency} {fmt(needed)}</strong><br />
          +15% Emergency Buffer: <strong>{currency} {fmt(buffer)}</strong><br />
          <span style={{borderTop:"1px solid var(--border)",display:"block",marginTop:5,paddingTop:5}}>
            Total Recommended: <strong className="gold">{currency} {fmt(total)}</strong>
          </span>
        </div>
      )}
      {msg && <div className="ok-box" style={{marginTop:"0.5rem",marginBottom:0}}>{msg}</div>}
      <button className="cw-save-btn" onClick={() => saveToFirestore("leaveAccount", { leaveDays, monthlyExpense, currency, needed: fmt(needed), total: fmt(total) }, setMsg)}>
        💾 Save Result
      </button>
    </div>
  );
}

function SavingsPlanner() {
  const [wage, setWage]         = useState("");
  const [expense, setExpense]   = useState("");
  const [savePct, setSavePct]   = useState("30");
  const [months, setMonths]     = useState("");
  const [currency, setCurrency] = useState("USD");
  const [msg, setMsg]           = useState("");
  const w  = parseFloat(wage) || 0;
  const e  = parseFloat(expense) || 0;
  const pct = parseFloat(savePct) || 0;
  const mo  = parseFloat(months) || 0;
  const savingsPerMonth = w * (pct / 100);
  const net = w - e - savingsPerMonth;
  const totalSavings = savingsPerMonth * mo;
  return (
    <div className="cw-card">
      <div className="cw-card-title">💰 Savings Planner</div>
      <div className="ff">
        <label className="fl">Currency</label>
        <select className="fi" value={currency} onChange={e => setCurrency(e.target.value)}>
          {["USD","EUR","GBP","PHP","INR","SGD"].map(c => <option key={c}>{c}</option>)}
        </select>
      </div>
      <div className="ff">
        <label className="fl">Monthly Wage ({currency})</label>
        <input className="fi" type="number" placeholder="e.g. 3000" value={wage} onChange={e => setWage(e.target.value)} />
      </div>
      <div className="ff">
        <label className="fl">Monthly Onboard Expense ({currency})</label>
        <input className="fi" type="number" placeholder="e.g. 200" value={expense} onChange={e => setExpense(e.target.value)} />
      </div>
      <div className="ff">
        <label className="fl">Save % of Wage</label>
        <input className="fi" type="number" min="0" max="100" placeholder="30" value={savePct} onChange={e => setSavePct(e.target.value)} />
      </div>
      <div className="ff">
        <label className="fl">Contract Months</label>
        <input className="fi" type="number" placeholder="e.g. 9" value={months} onChange={e => setMonths(e.target.value)} />
      </div>
      {wage && (
        <div className="cw-result">
          Savings/Month: <strong className="green">{currency} {fmt(savingsPerMonth)}</strong><br />
          Remaining: <strong>{currency} {fmt(net)}</strong><br />
          Contract Savings: <strong className="gold">{currency} {fmt(totalSavings)}</strong>
        </div>
      )}
      {msg && <div className="ok-box" style={{marginTop:"0.5rem",marginBottom:0}}>{msg}</div>}
      <button className="cw-save-btn" onClick={() => saveToFirestore("savings", { wage, expense, savePct, months, currency, savingsPerMonth: fmt(savingsPerMonth), totalSavings: fmt(totalSavings) }, setMsg)}>
        💾 Save Result
      </button>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// TAB 2 — PLANNING TOOLS
// ═══════════════════════════════════════════════════════════════════════════════

function LeavePlanner() {
  const [start, setStart] = useState("");
  const [end, setEnd]     = useState("");
  const [msg, setMsg]     = useState("");
  const days = start && end
    ? Math.max(0, Math.round((new Date(end) - new Date(start)) / 86400000))
    : 0;
  const returnDate = end ? new Date(new Date(end).getTime() + 86400000).toDateString() : "";
  return (
    <div className="cw-card">
      <div className="cw-card-title">🏖 Leave Planner</div>
      <div className="ff">
        <label className="fl">Leave Start Date</label>
        <input className="fi" type="date" value={start} onChange={e => setStart(e.target.value)} />
      </div>
      <div className="ff">
        <label className="fl">Leave End Date</label>
        <input className="fi" type="date" value={end} onChange={e => setEnd(e.target.value)} />
      </div>
      {start && end && (
        <div className="cw-result">
          Total Leave Days: <strong className="gold">{days} days</strong><br />
          Return to Duty: <strong>{returnDate}</strong><br />
          <div className="prog-bar" style={{marginTop:8}}>
            <div className="prog-fill" style={{width:"100%",background:"linear-gradient(90deg,var(--cyan),var(--blue))"}} />
          </div>
        </div>
      )}
      {msg && <div className="ok-box" style={{marginTop:"0.5rem",marginBottom:0}}>{msg}</div>}
      <button className="cw-save-btn" onClick={() => saveToFirestore("leave", { start, end, days }, setMsg)}>
        💾 Save to Account
      </button>
    </div>
  );
}

function ReliefDateCalculator() {
  const [joinDate, setJoinDate]       = useState("");
  const [contractMonths, setContractMonths] = useState("");
  const [bufferDays, setBufferDays]   = useState("14");
  const [msg, setMsg]                 = useState("");

  let reliefDate = "", planDate = "", daysServed = 0, daysLeft = 0, pct = 0;
  if (joinDate && contractMonths) {
    const join    = new Date(joinDate);
    const end     = new Date(join);
    end.setMonth(end.getMonth() + (parseFloat(contractMonths) || 0));
    const plan    = new Date(end);
    plan.setDate(plan.getDate() - (parseFloat(bufferDays) || 0));
    reliefDate    = end.toDateString();
    planDate      = plan.toDateString();
    const today   = new Date();
    daysServed    = Math.max(0, Math.round((today - join) / 86400000));
    const total   = Math.round((end - join) / 86400000);
    daysLeft      = Math.max(0, total - daysServed);
    pct           = Math.min(100, Math.round((daysServed / total) * 100));
  }
  return (
    <div className="cw-card">
      <div className="cw-card-title">📅 Relief Date Calculator</div>
      <div className="ff">
        <label className="fl">Join Date</label>
        <input className="fi" type="date" value={joinDate} onChange={e => setJoinDate(e.target.value)} />
      </div>
      <div className="ff">
        <label className="fl">Contract Duration (Months)</label>
        <input className="fi" type="number" placeholder="e.g. 9" value={contractMonths} onChange={e => setContractMonths(e.target.value)} />
      </div>
      <div className="ff">
        <label className="fl">Relief Buffer (Days before contract end)</label>
        <input className="fi" type="number" placeholder="14" value={bufferDays} onChange={e => setBufferDays(e.target.value)} />
      </div>
      {joinDate && contractMonths && (
        <div className="cw-result">
          Contract End: <strong>{reliefDate}</strong><br />
          Plan Relief By: <strong className="gold">{planDate}</strong><br />
          Days Served: <strong>{daysServed}</strong> &nbsp;|&nbsp; Days Left: <strong className="green">{daysLeft}</strong>
          <div className="prog-bar" style={{marginTop:8}}>
            <div className="prog-fill" style={{width:`${pct}%`, background:"linear-gradient(90deg,var(--green),var(--cyan))"}} />
          </div>
          <div style={{fontSize:"0.65rem",color:"var(--text3)",marginTop:3}}>{pct}% contract completed</div>
        </div>
      )}
      {msg && <div className="ok-box" style={{marginTop:"0.5rem",marginBottom:0}}>{msg}</div>}
      <button className="cw-save-btn" onClick={() => saveToFirestore("reliefDate", { joinDate, contractMonths, bufferDays, reliefDate, planDate }, setMsg)}>
        💾 Save to Account
      </button>
    </div>
  );
}

function ContractTracker() {
  const [joinDate, setJoinDate]     = useState("");
  const [endDate, setEndDate]       = useState("");
  const [rank, setRank]             = useState("");
  const [vessel, setVessel]         = useState("");
  const [msg, setMsg]               = useState("");

  let daysServed = 0, daysLeft = 0, pct = 0, totalDays = 0, weeksLeft = 0;
  if (joinDate && endDate) {
    const join  = new Date(joinDate);
    const end   = new Date(endDate);
    const today = new Date();
    totalDays   = Math.max(1, Math.round((end - join) / 86400000));
    daysServed  = Math.max(0, Math.round((today - join) / 86400000));
    daysLeft    = Math.max(0, totalDays - daysServed);
    weeksLeft   = Math.floor(daysLeft / 7);
    pct         = Math.min(100, Math.round((daysServed / totalDays) * 100));
  }
  const color = pct < 33 ? "var(--green)" : pct < 66 ? "var(--gold)" : "var(--cyan)";
  return (
    <div className="cw-card">
      <div className="cw-card-title">📋 Contract Tracker</div>
      <div className="ff">
        <label className="fl">Rank</label>
        <input className="fi" type="text" placeholder="e.g. Chief Officer" value={rank} onChange={e => setRank(e.target.value)} />
      </div>
      <div className="ff">
        <label className="fl">Vessel Name</label>
        <input className="fi" type="text" placeholder="e.g. MV Explorer" value={vessel} onChange={e => setVessel(e.target.value)} />
      </div>
      <div className="ff">
        <label className="fl">Join Date</label>
        <input className="fi" type="date" value={joinDate} onChange={e => setJoinDate(e.target.value)} />
      </div>
      <div className="ff">
        <label className="fl">Contract End Date</label>
        <input className="fi" type="date" value={endDate} onChange={e => setEndDate(e.target.value)} />
      </div>
      {joinDate && endDate && (
        <div className="cw-result">
          {rank && <div style={{marginBottom:4}}><strong>{rank}</strong>{vessel ? ` — ${vessel}` : ""}</div>}
          Days Served: <strong style={{color}}>{daysServed}</strong> / {totalDays}<br />
          Days Remaining: <strong className="green">{daysLeft}</strong> ({weeksLeft} weeks)<br />
          <div className="prog-bar" style={{marginTop:8}}>
            <div className="prog-fill" style={{width:`${pct}%`, background:`linear-gradient(90deg,${color},var(--cyan))`}} />
          </div>
          <div style={{fontSize:"0.65rem",color:"var(--text3)",marginTop:3}}>{pct}% of contract completed</div>
        </div>
      )}
      {msg && <div className="ok-box" style={{marginTop:"0.5rem",marginBottom:0}}>{msg}</div>}
      <button className="cw-save-btn" onClick={() => saveToFirestore("contractTracker", { rank, vessel, joinDate, endDate, daysServed, daysLeft, pct }, setMsg)}>
        💾 Save to Account
      </button>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// TAB 3 — WELLBEING TOOLS
// ═══════════════════════════════════════════════════════════════════════════════

const MH_QUESTIONS = [
  "I have felt down, depressed or hopeless",
  "I have had little interest or pleasure in doing things",
  "I have felt nervous, anxious or on edge",
  "I have had trouble sleeping or sleeping too much",
  "I have felt tired or had little energy",
  "I have had difficulty concentrating",
  "I have felt isolated or lonely at sea",
  "I have felt stressed about family matters at home",
];

function MentalHealthCheck() {
  const [scores, setScores] = useState({});
  const [msg, setMsg]       = useState("");
  const setScore = (i, v) => setScores(s => ({ ...s, [i]: v }));
  const answered = Object.keys(scores).length;
  const total    = Object.values(scores).reduce((a, b) => a + b, 0);
  const max      = MH_QUESTIONS.length * 3;
  const pct      = Math.round((total / max) * 100);
  let level = "", levelColor = "";
  if (answered === MH_QUESTIONS.length) {
    if (pct <= 25)      { level = "Low distress — You appear to be doing well"; levelColor = "var(--green)"; }
    else if (pct <= 50) { level = "Mild distress — Consider talking to someone"; levelColor = "var(--gold)"; }
    else if (pct <= 75) { level = "Moderate distress — Speak to a wellness officer or counsellor"; levelColor = "var(--gold)"; }
    else                { level = "High distress — Please seek professional support"; levelColor = "var(--red)"; }
  }
  return (
    <div className="cw-card">
      <div className="cw-card-title">🧠 Mental Health Self-Check</div>
      <div style={{fontSize:"0.68rem",color:"var(--text2)",marginBottom:"0.9rem",lineHeight:1.5,background:"rgba(0,180,216,0.05)",padding:"8px 10px",borderRadius:7,border:"1px solid rgba(0,180,216,0.12)"}}>
        ⚠️ For personal awareness only — not a medical diagnosis.<br/>Rate each in the past 2 weeks: 0=Never · 1=Sometimes · 2=Often · 3=Always
      </div>
      {MH_QUESTIONS.map((q, i) => (
        <div className="score-row" key={i}>
          <span style={{fontSize:"0.72rem",flex:1,paddingRight:8}}>{q}</span>
          <div className="score-opts">
            {[0,1,2,3].map(v => (
              <button key={v} className={`score-opt ${scores[i]===v?"sel":""}`}
                onClick={() => setScore(i, v)}>{v}</button>
            ))}
          </div>
        </div>
      ))}
      {answered === MH_QUESTIONS.length && (
        <div className="cw-result">
          Score: <strong>{total}/{max}</strong><br />
          <span style={{color:levelColor,fontWeight:700}}>{level}</span>
          <div className="prog-bar" style={{marginTop:8}}>
            <div className="prog-fill" style={{width:`${pct}%`, background:`linear-gradient(90deg,var(--green),var(--gold),var(--red))`}} />
          </div>
          {pct > 50 && (
            <div style={{marginTop:8,fontSize:"0.69rem",color:"var(--text2)"}}>
              💙 Resources: ISWAN SeafarerHelp +44 20 7323 2737 (24/7)
            </div>
          )}
        </div>
      )}
      {msg && <div className="ok-box" style={{marginTop:"0.5rem",marginBottom:0}}>{msg}</div>}
      <button className="cw-save-btn" disabled={answered < MH_QUESTIONS.length}
        onClick={() => saveToFirestore("mentalHealth", { scores, total, pct, level }, setMsg)}>
        💾 Save Result ({answered}/{MH_QUESTIONS.length} answered)
      </button>
    </div>
  );
}

function FatigueAssessment() {
  const [entries, setEntries] = useState([
    { day: "Day 1", rest24: "", work24: "" },
    { day: "Day 2", rest24: "", work24: "" },
    { day: "Day 3", rest24: "", work24: "" },
    { day: "Day 4", rest24: "", work24: "" },
    { day: "Day 5", rest24: "", work24: "" },
    { day: "Day 6", rest24: "", work24: "" },
    { day: "Day 7", rest24: "", work24: "" },
  ]);
  const [msg, setMsg] = useState("");

  const update = (i, field, val) => {
    setEntries(arr => arr.map((r, idx) => idx === i ? { ...r, [field]: val } : r));
  };
  const totalRest7 = entries.reduce((s, en) => s + (parseFloat(en.rest24) || 0), 0);
  const violations = entries.map(en => {
    const r = parseFloat(en.rest24) || 0;
    return r > 0 && r < 10;
  });
  const week7Viol = totalRest7 < 77 && entries.some(en => en.rest24 !== "");

  return (
    <div className="cw-card">
      <div className="cw-card-title">😴 Fatigue Assessment (MLC/STCW)</div>
      <div style={{fontSize:"0.68rem",color:"var(--text2)",marginBottom:"0.9rem",lineHeight:1.5,background:"rgba(240,165,0,0.05)",padding:"8px 10px",borderRadius:7,border:"1px solid rgba(240,165,0,0.12)"}}>
        MLC Rule: Min 10 hrs rest/24h · Min 77 hrs rest/7 days<br/>Max work: 14 hrs/24h · 72 hrs/7 days
      </div>
      <div className="rest-row" style={{fontWeight:700,color:"var(--text3)",fontSize:"0.65rem",borderBottom:"1px solid var(--border)"}}>
        <span>Day</span><span>Rest (hrs)</span><span>Work (hrs)</span>
      </div>
      {entries.map((en, i) => (
        <div className="rest-row" key={i}>
          <span style={{fontSize:"0.72rem",color:violations[i]?"var(--red)":"var(--text)"}}>{en.day} {violations[i]?"⚠️":""}</span>
          <input className="fi" type="number" min="0" max="24" placeholder="hrs"
            value={en.rest24} onChange={ev => update(i, "rest24", ev.target.value)}
            style={{padding:"4px 7px",fontSize:"0.74rem"}} />
          <input className="fi" type="number" min="0" max="24" placeholder="hrs"
            value={en.work24} onChange={ev => update(i, "work24", ev.target.value)}
            style={{padding:"4px 7px",fontSize:"0.74rem"}} />
        </div>
      ))}
      <div className="cw-result">
        Total Rest (7 days): <strong style={{color: week7Viol ? "var(--red)" : "var(--green)"}}>{fmt(totalRest7)} hrs</strong>
        {week7Viol
          ? <span style={{color:"var(--red)"}}> ⚠️ BELOW 77hr MLC minimum</span>
          : <span style={{color:"var(--green)"}}> ✅ Compliant</span>
        }
        {violations.some(Boolean) && (
          <div style={{color:"var(--red)",marginTop:4,fontSize:"0.7rem"}}>
            ⚠️ {violations.filter(Boolean).length} day(s) below 10hr daily minimum
          </div>
        )}
      </div>
      {msg && <div className="ok-box" style={{marginTop:"0.5rem",marginBottom:0}}>{msg}</div>}
      <button className="cw-save-btn"
        onClick={() => saveToFirestore("fatigue", { entries, totalRest7: fmt(totalRest7), weekCompliant: !week7Viol }, setMsg)}>
        💾 Save Assessment
      </button>
    </div>
  );
}

function FullStrategySavingPlanner() {
  const [currency, setCurrency]         = useState("USD");
  const [monthlyWage, setMonthlyWage]   = useState("");
  const [savePct, setSavePct]           = useState("35");
  const [contractLen, setContractLen]   = useState("9");
  const [leaveLen, setLeaveLen]         = useState("3");
  const [numContracts, setNumContracts] = useState("3");
  const [goal, setGoal]                 = useState("");
  const [msg, setMsg]                   = useState("");

  const wage     = parseFloat(monthlyWage) || 0;
  const sPct     = parseFloat(savePct) || 0;
  const cLen     = parseFloat(contractLen) || 0;
  const lLen     = parseFloat(leaveLen) || 0;
  const nC       = parseFloat(numContracts) || 0;
  const gAmt     = parseFloat(goal) || 0;

  const savingPerMonth    = wage * (sPct / 100);
  const savingPerContract = savingPerMonth * cLen;
  const totalSavings      = savingPerContract * nC;
  const totalOnboard      = cLen * nC;
  const totalLeave        = lLen * nC;
  const totalMonths       = totalOnboard + totalLeave;
  const totalYears        = (totalMonths / 12).toFixed(1);
  const goalMet           = gAmt > 0 ? totalSavings >= gAmt : null;
  const contractsNeeded   = gAmt > 0 && savingPerContract > 0 ? Math.ceil(gAmt / savingPerContract) : 0;

  const steps = [
    { num: "01", title: "Per Contract Savings", detail: `${currency} ${fmt(savingPerContract)} over ${cLen} months` },
    { num: "02", title: "Leave Period", detail: `${lLen} months unpaid — budget from contract earnings` },
    { num: "03", title: `After ${nC} Contracts`, detail: `${currency} ${fmt(totalSavings)} saved over ${totalYears} years` },
    ...(gAmt > 0 ? [{ num: "04", title: goalMet ? "🎯 Goal Achieved" : "📍 Goal Gap", detail: goalMet ? `You reach ${currency} ${fmt(gAmt)} in ${nC} contracts` : `Need ${contractsNeeded} contracts to reach ${currency} ${fmt(gAmt)}` }] : []),
  ];

  return (
    <div className="cw-card" style={{gridColumn:"1/-1"}}>
      <div className="cw-card-title">🎯 Full Strategy Saving Planner</div>
      <div style={{display:"grid",gap:"0.7rem",gridTemplateColumns:"repeat(auto-fill,minmax(180px,1fr))",marginBottom:"1rem"}}>
        <div className="ff" style={{margin:0}}>
          <label className="fl">Currency</label>
          <select className="fi" value={currency} onChange={e => setCurrency(e.target.value)}>
            {["USD","EUR","GBP","PHP","INR","SGD"].map(c => <option key={c}>{c}</option>)}
          </select>
        </div>
        <div className="ff" style={{margin:0}}>
          <label className="fl">Monthly Wage ({currency})</label>
          <input className="fi" type="number" placeholder="e.g. 3000" value={monthlyWage} onChange={e => setMonthlyWage(e.target.value)} />
        </div>
        <div className="ff" style={{margin:0}}>
          <label className="fl">Save % per Month</label>
          <input className="fi" type="number" placeholder="35" value={savePct} onChange={e => setSavePct(e.target.value)} />
        </div>
        <div className="ff" style={{margin:0}}>
          <label className="fl">Contract Length (Months)</label>
          <input className="fi" type="number" placeholder="9" value={contractLen} onChange={e => setContractLen(e.target.value)} />
        </div>
        <div className="ff" style={{margin:0}}>
          <label className="fl">Leave Per Contract (Months)</label>
          <input className="fi" type="number" placeholder="3" value={leaveLen} onChange={e => setLeaveLen(e.target.value)} />
        </div>
        <div className="ff" style={{margin:0}}>
          <label className="fl">Number of Contracts</label>
          <input className="fi" type="number" placeholder="3" value={numContracts} onChange={e => setNumContracts(e.target.value)} />
        </div>
        <div className="ff" style={{margin:0}}>
          <label className="fl">Savings Goal ({currency}) — optional</label>
          <input className="fi" type="number" placeholder="e.g. 50000" value={goal} onChange={e => setGoal(e.target.value)} />
        </div>
      </div>
      {monthlyWage && (
        <>
          <div style={{display:"grid",gap:"8px",gridTemplateColumns:"repeat(auto-fill,minmax(200px,1fr))",marginBottom:"1rem"}}>
            {steps.map(s => (
              <div className="strategy-step" key={s.num}>
                <div className="step-num">Step {s.num}</div>
                <div style={{fontWeight:700,fontSize:"0.76rem",color:"var(--text)",marginBottom:2}}>{s.title}</div>
                <div style={{color:"var(--gold)"}}>{s.detail}</div>
              </div>
            ))}
          </div>
          <div className="cw-result">
            💰 Save per month: <strong className="green">{currency} {fmt(savingPerMonth)}</strong> &nbsp;|&nbsp;
            📦 Per contract: <strong className="gold">{currency} {fmt(savingPerContract)}</strong> &nbsp;|&nbsp;
            🏦 Total ({nC} contracts): <strong style={{color:"var(--cyan)",fontSize:"1rem"}}>{currency} {fmt(totalSavings)}</strong><br/>
            ⏱ Timeline: <strong>{totalYears} years</strong> ({totalOnboard} mo onboard + {totalLeave} mo leave)
            {gAmt > 0 && (
              <div style={{marginTop:6,fontWeight:700,color: goalMet ? "var(--green)" : "var(--red)"}}>
                {goalMet ? `✅ Goal of ${currency} ${fmt(gAmt)} achieved!` : `📍 Need ${contractsNeeded} contracts to reach ${currency} ${fmt(gAmt)}`}
              </div>
            )}
          </div>
        </>
      )}
      {msg && <div className="ok-box" style={{marginTop:"0.5rem",marginBottom:0}}>{msg}</div>}
      <button className="cw-save-btn"
        onClick={() => saveToFirestore("strategyPlanner", { currency, monthlyWage, savePct, contractLen, leaveLen, numContracts, goal, totalSavings: fmt(totalSavings) }, setMsg)}>
        💾 Save Strategy
      </button>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN PAGE — FIX: accepts user/notify props (no longer crashes if undefined)
// ═══════════════════════════════════════════════════════════════════════════════

export default function SeafarerWelfareHub({ user, notify } = {}) {
  const [activeTab, setActiveTab] = useState("financial");

  return (
    <>
      <style>{S}</style>
      <div className="cw-wrap">

        <div className="cw-header">
          <div className="cw-title">⚓ Crew Welfare Centre</div>
          <div className="cw-sub">Financial tools · Leave planning · Wellbeing assessment — all in one place</div>
        </div>

        <div className="cw-tabs">
          <button
            className={`cw-tab ${activeTab === "financial" ? "active-fin" : ""}`}
            onClick={() => setActiveTab("financial")}>
            💰 Financial
          </button>
          <button
            className={`cw-tab ${activeTab === "planning" ? "active-plan" : ""}`}
            onClick={() => setActiveTab("planning")}>
            📅 Planning
          </button>
          <button
            className={`cw-tab ${activeTab === "wellbeing" ? "active-well" : ""}`}
            onClick={() => setActiveTab("wellbeing")}>
            🧠 Wellbeing
          </button>
        </div>

        {activeTab === "financial" && (
          <div className="cw-grid">
            <WageCalculator />
            <OvertimeCalculator />
            <AllotmentCalculator />
            <OnboardEarningsTotal />
            <LeaveAccountPlanner />
            <SavingsPlanner />
          </div>
        )}

        {activeTab === "planning" && (
          <div className="cw-grid">
            <LeavePlanner />
            <ReliefDateCalculator />
            <ContractTracker />
          </div>
        )}

        {activeTab === "wellbeing" && (
          <div className="cw-grid">
            <MentalHealthCheck />
            <FatigueAssessment />
            <FullStrategySavingPlanner />
          </div>
        )}

      </div>
    </>
  );
}
