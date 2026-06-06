import { useState, useEffect, useRef } from "react";

// ─── COLOR PALETTE & THEME ───────────────────────────────────────────────────
const T = {
  bg: "#0a0e1a",
  bgCard: "#0f1520",
  bgPanel: "#111827",
  border: "#1e2d45",
  borderBright: "#2a4a6b",
  accent: "#00b4d8",
  accentGold: "#f4a820",
  accentRed: "#e63946",
  accentGreen: "#2ec4b6",
  textPrimary: "#e8f4f8",
  textSecondary: "#8fafc4",
  textMuted: "#4a6580",
  navy: "#0d2137",
  navyLight: "#152b45",
};

// ─── GLOBAL STYLES ────────────────────────────────────────────────────────────
const globalStyle = `
  @import url('https://fonts.googleapis.com/css2?family=Teko:wght@400;500;600;700&family=Source+Sans+3:wght@300;400;500;600&family=JetBrains+Mono:wght@400;500&display=swap');
  
  * { box-sizing: border-box; margin: 0; padding: 0; }
  
  .krm-root {
    font-family: 'Source Sans 3', sans-serif;
    background: ${T.bg};
    color: ${T.textPrimary};
    min-height: 100vh;
    font-size: 15px;
    line-height: 1.6;
  }
  
  .krm-root h1, .krm-root h2, .krm-root h3, .krm-root h4 {
    font-family: 'Teko', sans-serif;
    letter-spacing: 0.04em;
  }

  .krm-header {
    background: linear-gradient(180deg, #060c18 0%, ${T.bg} 100%);
    border-bottom: 1px solid ${T.border};
    padding: 28px 24px 0;
    position: sticky;
    top: 0;
    z-index: 100;
    backdrop-filter: blur(12px);
  }

  .krm-header-top {
    display: flex;
    align-items: center;
    gap: 16px;
    margin-bottom: 20px;
    max-width: 1400px;
    margin-left: auto;
    margin-right: auto;
  }

  .krm-title-block { flex: 1; }

  .krm-title {
    font-size: 42px;
    font-weight: 700;
    line-height: 1;
    color: ${T.textPrimary};
    letter-spacing: 0.06em;
    text-transform: uppercase;
  }

  .krm-title span { color: ${T.accent}; }

  .krm-subtitle {
    font-size: 13px;
    color: ${T.textSecondary};
    letter-spacing: 0.12em;
    text-transform: uppercase;
    margin-top: 4px;
  }

  .krm-search {
    display: flex;
    align-items: center;
    background: ${T.bgPanel};
    border: 1px solid ${T.border};
    border-radius: 8px;
    padding: 8px 14px;
    gap: 10px;
    min-width: 260px;
    transition: border-color 0.2s;
  }
  .krm-search:focus-within { border-color: ${T.accent}; }
  .krm-search input {
    background: none;
    border: none;
    outline: none;
    color: ${T.textPrimary};
    font-family: 'Source Sans 3', sans-serif;
    font-size: 14px;
    width: 100%;
  }
  .krm-search input::placeholder { color: ${T.textMuted}; }

  .krm-tabs {
    display: flex;
    gap: 2px;
    overflow-x: auto;
    scrollbar-width: none;
    max-width: 1400px;
    margin: 0 auto;
    padding-bottom: 0;
  }
  .krm-tabs::-webkit-scrollbar { display: none; }

  .krm-tab {
    background: none;
    border: none;
    border-bottom: 3px solid transparent;
    color: ${T.textMuted};
    font-family: 'Teko', sans-serif;
    font-size: 17px;
    font-weight: 500;
    letter-spacing: 0.06em;
    padding: 10px 20px 8px;
    cursor: pointer;
    white-space: nowrap;
    transition: all 0.2s;
    text-transform: uppercase;
  }
  .krm-tab:hover { color: ${T.textSecondary}; }
  .krm-tab.active {
    color: ${T.accent};
    border-bottom-color: ${T.accent};
  }

  .krm-content {
    max-width: 1400px;
    margin: 0 auto;
    padding: 32px 24px;
  }

  .krm-section-title {
    font-size: 32px;
    font-weight: 700;
    color: ${T.textPrimary};
    text-transform: uppercase;
    letter-spacing: 0.08em;
    margin-bottom: 6px;
  }
  .krm-section-title span { color: ${T.accent}; }

  .krm-section-desc {
    color: ${T.textSecondary};
    margin-bottom: 28px;
    font-size: 14px;
    letter-spacing: 0.03em;
  }

  .krm-card {
    background: ${T.bgCard};
    border: 1px solid ${T.border};
    border-radius: 10px;
    overflow: hidden;
    transition: border-color 0.2s, transform 0.2s;
  }
  .krm-card:hover { border-color: ${T.borderBright}; }

  .krm-card-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 16px 20px;
    cursor: pointer;
    background: ${T.bgPanel};
    border-bottom: 1px solid ${T.border};
    gap: 12px;
  }

  .krm-card-title {
    font-family: 'Teko', sans-serif;
    font-size: 22px;
    font-weight: 600;
    color: ${T.textPrimary};
    letter-spacing: 0.05em;
    text-transform: uppercase;
  }

  .krm-badge {
    font-family: 'JetBrains Mono', monospace;
    font-size: 11px;
    padding: 3px 10px;
    border-radius: 4px;
    background: rgba(0,180,216,0.12);
    color: ${T.accent};
    border: 1px solid rgba(0,180,216,0.25);
    white-space: nowrap;
  }
  .krm-badge.gold {
    background: rgba(244,168,32,0.12);
    color: ${T.accentGold};
    border-color: rgba(244,168,32,0.25);
  }
  .krm-badge.red {
    background: rgba(230,57,70,0.12);
    color: ${T.accentRed};
    border-color: rgba(230,57,70,0.25);
  }
  .krm-badge.green {
    background: rgba(46,196,182,0.12);
    color: ${T.accentGreen};
    border-color: rgba(46,196,182,0.25);
  }

  .krm-card-body { padding: 20px; }

  .krm-grid-2 { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }
  .krm-grid-3 { display: grid; grid-template-columns: repeat(3, 1fr); gap: 16px; }
  .krm-grid-4 { display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; }
  @media(max-width:900px) {
    .krm-grid-2, .krm-grid-3, .krm-grid-4 { grid-template-columns: 1fr 1fr; }
  }
  @media(max-width:600px) {
    .krm-grid-2, .krm-grid-3, .krm-grid-4 { grid-template-columns: 1fr; }
    .krm-title { font-size: 30px; }
    .krm-tabs { gap: 0; }
    .krm-tab { font-size: 14px; padding: 10px 12px 8px; }
  }

  .krm-label {
    font-size: 11px;
    text-transform: uppercase;
    letter-spacing: 0.12em;
    color: ${T.textMuted};
    margin-bottom: 4px;
  }

  .krm-value {
    font-size: 15px;
    color: ${T.textPrimary};
  }

  .krm-steps { list-style: none; counter-reset: step-counter; }
  .krm-steps li {
    counter-increment: step-counter;
    position: relative;
    padding: 12px 12px 12px 52px;
    margin-bottom: 8px;
    background: rgba(255,255,255,0.02);
    border: 1px solid ${T.border};
    border-radius: 8px;
    font-size: 14px;
    color: ${T.textSecondary};
    line-height: 1.6;
  }
  .krm-steps li::before {
    content: counter(step-counter);
    position: absolute;
    left: 14px;
    top: 50%;
    transform: translateY(-50%);
    background: ${T.accent};
    color: ${T.bg};
    font-family: 'Teko', sans-serif;
    font-size: 18px;
    font-weight: 700;
    width: 28px;
    height: 28px;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    line-height: 1;
    padding-top: 2px;
  }
  .krm-steps li strong { color: ${T.textPrimary}; }

  .krm-info-row {
    display: flex;
    gap: 8px;
    align-items: flex-start;
    padding: 8px 0;
    border-bottom: 1px solid rgba(255,255,255,0.04);
  }
  .krm-info-row:last-child { border-bottom: none; }
  .krm-info-label {
    font-size: 12px;
    text-transform: uppercase;
    letter-spacing: 0.1em;
    color: ${T.textMuted};
    width: 140px;
    flex-shrink: 0;
    padding-top: 2px;
  }
  .krm-info-val {
    font-size: 14px;
    color: ${T.textSecondary};
    flex: 1;
  }
  .krm-info-val strong { color: ${T.textPrimary}; }

  .krm-warning {
    background: rgba(230,57,70,0.08);
    border: 1px solid rgba(230,57,70,0.25);
    border-left: 4px solid ${T.accentRed};
    border-radius: 8px;
    padding: 14px 16px;
    margin: 12px 0;
    font-size: 14px;
    color: #f08090;
    line-height: 1.6;
  }
  .krm-warning strong { color: ${T.accentRed}; }

  .krm-tip {
    background: rgba(0,180,216,0.07);
    border: 1px solid rgba(0,180,216,0.2);
    border-left: 4px solid ${T.accent};
    border-radius: 8px;
    padding: 14px 16px;
    margin: 12px 0;
    font-size: 14px;
    color: #80cce8;
    line-height: 1.6;
  }
  .krm-tip strong { color: ${T.accent}; }

  .krm-success {
    background: rgba(46,196,182,0.07);
    border: 1px solid rgba(46,196,182,0.2);
    border-left: 4px solid ${T.accentGreen};
    border-radius: 8px;
    padding: 14px 16px;
    margin: 12px 0;
    font-size: 14px;
    color: #80e0d8;
    line-height: 1.6;
  }

  .krm-divider {
    border: none;
    border-top: 1px solid ${T.border};
    margin: 24px 0;
  }

  .krm-strength-bar {
    height: 8px;
    background: ${T.border};
    border-radius: 4px;
    overflow: hidden;
    margin-top: 6px;
  }
  .krm-strength-fill {
    height: 100%;
    border-radius: 4px;
    transition: width 0.6s ease;
  }

  .krm-knot-anim-wrap {
    background: ${T.navy};
    border: 1px solid ${T.border};
    border-radius: 10px;
    padding: 20px;
    display: flex;
    flex-direction: column;
    align-items: center;
    min-height: 140px;
    justify-content: center;
  }

  .krm-anim-label {
    font-size: 11px;
    color: ${T.textMuted};
    margin-top: 10px;
    text-align: center;
    letter-spacing: 0.08em;
    text-transform: uppercase;
  }

  /* Animated rope path */
  @keyframes ropeFlow {
    0% { stroke-dashoffset: 200; }
    100% { stroke-dashoffset: 0; }
  }
  @keyframes knotPulse {
    0%, 100% { opacity: 1; }
    50% { opacity: 0.6; }
  }
  .rope-anim { animation: ropeFlow 2s linear infinite; stroke-dasharray: 200; }
  .knot-pulse { animation: knotPulse 2s ease-in-out infinite; }

  .krm-mooring-diagram {
    background: ${T.navy};
    border: 1px solid ${T.border};
    border-radius: 10px;
    padding: 16px;
  }

  .krm-calc-wrap {
    background: ${T.bgPanel};
    border: 1px solid ${T.border};
    border-radius: 10px;
    padding: 20px;
  }
  .krm-input-group { margin-bottom: 16px; }
  .krm-input-group label {
    display: block;
    font-size: 12px;
    text-transform: uppercase;
    letter-spacing: 0.1em;
    color: ${T.textMuted};
    margin-bottom: 6px;
  }
  .krm-input {
    width: 100%;
    background: ${T.bgCard};
    border: 1px solid ${T.border};
    border-radius: 6px;
    padding: 9px 12px;
    color: ${T.textPrimary};
    font-family: 'Source Sans 3', sans-serif;
    font-size: 14px;
    outline: none;
    transition: border-color 0.2s;
  }
  .krm-input:focus { border-color: ${T.accent}; }

  .krm-btn {
    background: ${T.accent};
    color: ${T.bg};
    border: none;
    border-radius: 6px;
    padding: 10px 24px;
    font-family: 'Teko', sans-serif;
    font-size: 18px;
    font-weight: 600;
    letter-spacing: 0.06em;
    cursor: pointer;
    transition: opacity 0.2s, transform 0.1s;
    text-transform: uppercase;
  }
  .krm-btn:hover { opacity: 0.88; transform: translateY(-1px); }

  .krm-result-box {
    background: rgba(0,180,216,0.07);
    border: 1px solid rgba(0,180,216,0.25);
    border-radius: 8px;
    padding: 16px;
    margin-top: 16px;
  }
  .krm-result-num {
    font-family: 'JetBrains Mono', monospace;
    font-size: 28px;
    color: ${T.accent};
    font-weight: 500;
  }
  .krm-result-unit { font-size: 14px; color: ${T.textMuted}; margin-top: 2px; }

  .krm-snapback-zone {
    position: relative;
    overflow: hidden;
  }

  .krm-select {
    width: 100%;
    background: ${T.bgCard};
    border: 1px solid ${T.border};
    border-radius: 6px;
    padding: 9px 12px;
    color: ${T.textPrimary};
    font-family: 'Source Sans 3', sans-serif;
    font-size: 14px;
    outline: none;
    cursor: pointer;
    appearance: none;
    -webkit-appearance: none;
    background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='8' viewBox='0 0 12 8'%3E%3Cpath d='M1 1l5 5 5-5' stroke='%234a6580' stroke-width='2' fill='none'/%3E%3C/svg%3E");
    background-repeat: no-repeat;
    background-position: right 12px center;
  }
  .krm-select:focus { border-color: ${T.accent}; }
  .krm-select option { background: ${T.bgCard}; }

  .krm-pill-row { display: flex; flex-wrap: wrap; gap: 8px; margin-top: 8px; }
  .krm-pill {
    font-size: 12px;
    padding: 4px 12px;
    border-radius: 20px;
    border: 1px solid ${T.border};
    color: ${T.textMuted};
    cursor: pointer;
    transition: all 0.2s;
    font-family: 'JetBrains Mono', monospace;
  }
  .krm-pill.active, .krm-pill:hover {
    border-color: ${T.accent};
    color: ${T.accent};
    background: rgba(0,180,216,0.08);
  }

  .krm-table {
    width: 100%;
    border-collapse: collapse;
    font-size: 13px;
  }
  .krm-table th {
    text-align: left;
    font-family: 'Teko', sans-serif;
    font-size: 15px;
    color: ${T.textSecondary};
    letter-spacing: 0.06em;
    text-transform: uppercase;
    padding: 10px 12px;
    border-bottom: 1px solid ${T.border};
    background: ${T.bgPanel};
  }
  .krm-table td {
    padding: 10px 12px;
    border-bottom: 1px solid rgba(255,255,255,0.04);
    color: ${T.textSecondary};
    vertical-align: top;
  }
  .krm-table tr:hover td { background: rgba(255,255,255,0.02); }
  .krm-table td:first-child { color: ${T.textPrimary}; font-weight: 500; }

  .krm-collapse-chevron {
    transition: transform 0.25s;
    color: ${T.textMuted};
    font-size: 18px;
  }
  .krm-collapse-chevron.open { transform: rotate(180deg); }

  .krm-collapse-body {
    overflow: hidden;
    transition: max-height 0.35s ease;
  }

  .krm-rope-swatch {
    width: 100%;
    height: 12px;
    border-radius: 6px;
    margin-bottom: 10px;
  }

  .krm-stat-chip {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    background: rgba(255,255,255,0.04);
    border: 1px solid ${T.border};
    border-radius: 6px;
    padding: 6px 10px;
    font-size: 12px;
    color: ${T.textSecondary};
    margin: 3px;
  }
  .krm-stat-chip span { color: ${T.textPrimary}; font-weight: 600; font-size: 13px; }

  .krm-id-result {
    background: linear-gradient(135deg, rgba(0,180,216,0.08), rgba(0,180,216,0.02));
    border: 1px solid rgba(0,180,216,0.3);
    border-radius: 10px;
    padding: 20px;
  }

  .krm-case-study {
    background: rgba(230,57,70,0.05);
    border: 1px solid rgba(230,57,70,0.2);
    border-radius: 8px;
    padding: 16px;
    margin-bottom: 12px;
  }
  .krm-case-title {
    font-family: 'Teko', sans-serif;
    font-size: 18px;
    color: ${T.accentRed};
    letter-spacing: 0.05em;
    text-transform: uppercase;
    margin-bottom: 8px;
  }

  .krm-splice-step {
    display: flex;
    gap: 14px;
    align-items: flex-start;
    padding: 14px;
    background: rgba(255,255,255,0.02);
    border: 1px solid ${T.border};
    border-radius: 8px;
    margin-bottom: 10px;
  }
  .krm-splice-num {
    background: ${T.accentGold};
    color: ${T.bg};
    font-family: 'Teko', sans-serif;
    font-size: 20px;
    font-weight: 700;
    width: 36px;
    height: 36px;
    border-radius: 6px;
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
    padding-top: 2px;
  }

  .status-dot {
    width: 8px; height: 8px; border-radius: 50%;
    display: inline-block; margin-right: 6px;
  }
  .status-green { background: ${T.accentGreen}; }
  .status-red { background: ${T.accentRed}; }
  .status-gold { background: ${T.accentGold}; }
`;

// ─── KNOTS DATA ───────────────────────────────────────────────────────────────
const KNOTS = [
  {
    id: "bowline",
    name: "Bowline",
    category: "Hitches & Loops",
    strengthReduction: 30,
    tags: ["loop", "rescue", "rigging"],
    purpose: "Forms a fixed, non-slipping loop at the end of a rope. One of the most important knots in seamanship — reliable under load and easily untied even after heavy strain.",
    shipboardUse: "Securing a line to a bollard, creating a rescue loop, attaching a line to a ring or shackle, lifeline attachment, man-overboard recovery.",
    tips: [
      "Always dress the knot tightly before loading.",
      "Leave a tail at least 10× the rope diameter.",
      "Do NOT use for dynamic shock loads — knot can loosen.",
      "A double bowline provides extra security in critical applications.",
    ],
    steps: [
      "Make a small loop (the 'rabbit hole') near the working end of the rope, keeping the working end on top.",
      "Pass the working end up through the small loop from underneath — 'the rabbit comes out of the hole'.",
      "Bring the working end around behind the standing part of the rope — 'goes around the tree'.",
      "Pass the working end back down through the same small loop — 'goes back down the hole'.",
      "Hold the working end against the loop you just formed and pull the standing part firmly to tighten.",
      "Dress the knot: ensure the loop is the correct size, all parts lie neatly, and the tail is at least 15 cm long.",
      "Test: tug the knot firmly. The loop should not change size under load.",
    ],
    color: "#00b4d8",
    svgPath: "M 20 60 Q 40 20 60 40 Q 80 60 70 80 Q 60 95 50 80 Q 40 65 55 60 Q 70 55 75 70 Q 80 85 65 90 Q 50 95 35 85 Q 20 75 30 60",
  },
  {
    id: "clovehitch",
    name: "Clove Hitch",
    category: "Hitches",
    strengthReduction: 40,
    tags: ["temporary", "quick", "adjustable"],
    purpose: "A quick, adjustable hitch used to fasten a rope to a post, bollard, or rail. Easy to tie and untie but can slip if loaded from multiple directions or if the load is inconsistent.",
    shipboardUse: "Temporary securing of fenders to rails, mooring a line to a bollard when time is critical, securing rope to stanchions, attaching stops and lashings.",
    tips: [
      "Use a half hitch as a security measure after the clove hitch on mooring lines.",
      "Not reliable for permanent or unattended applications.",
      "On round or smooth surfaces, add a locking half hitch to prevent slippage.",
      "Works best when the pull is at right angles to the object.",
    ],
    steps: [
      "Pass the working end of the rope over and around the bollard or rail.",
      "Cross the working end over the standing part, creating an X on the front of the object.",
      "Pass the working end around the object again, parallel to the first turn.",
      "Thread the working end under the diagonal formed in step 2 — under the X crossing.",
      "Pull both ends to tighten. The knot should grip firmly.",
      "For security, add a half hitch around the standing part with the working end.",
      "Test with a side-to-side pull. If the knot twists, add the locking half hitch.",
    ],
    color: "#f4a820",
    svgPath: "M 15 45 Q 30 30 50 45 Q 70 60 80 45 M 20 65 Q 35 50 55 65 Q 70 78 80 65",
  },
  {
    id: "sheetbend",
    name: "Sheet Bend",
    category: "Bends",
    strengthReduction: 35,
    tags: ["joining", "different-sizes", "temporary"],
    purpose: "Joins two ropes of equal or different diameter. More secure than a reef knot for joining dissimilar ropes. A double sheet bend is used when the size difference is significant.",
    shipboardUse: "Extending mooring lines, joining heaving lines to messenger lines, extending sheets and halyards temporarily, attaching small cordage to heavy hawsers.",
    tips: [
      "The larger or stiffer rope should form the 'bight'.",
      "Both working ends must be on the same side for security.",
      "Use double sheet bend for ropes of very different diameter.",
      "Not safe for critical lifting — use a proper splice instead.",
    ],
    steps: [
      "Form a bight (U-shape) in the thicker or stiffer rope.",
      "Pass the working end of the smaller rope up through the bight from underneath.",
      "Bring the working end behind both legs of the bight.",
      "Pass the working end back under itself — under the part that went through the bight.",
      "Ensure both working ends are on the same side of the knot.",
      "Pull the standing parts of both ropes to tighten the knot.",
      "For a double sheet bend: repeat steps 2–4 with a second wrap around the bight.",
    ],
    color: "#2ec4b6",
    svgPath: "M 15 70 Q 15 40 40 40 Q 65 40 65 70 Q 65 85 50 85 Q 35 85 35 70 M 35 70 L 80 55",
  },
  {
    id: "reefknot",
    name: "Reef Knot",
    category: "Bends",
    strengthReduction: 45,
    tags: ["joining", "flat", "bundling"],
    purpose: "A flat, symmetrical knot used to bind two ends of the same rope together — particularly for bundling or reefing sails. WARNING: Should NOT be used to join two separate ropes under load as it can capsize into a slip knot.",
    shipboardUse: "Tying reef points in a sail, securing parcels and bundles, first aid bandaging, bundling lines for stowage. NOT for joining lines under critical load.",
    tips: [
      "Remember: 'Right over left, left over right.'",
      "A granny knot (wrong sequence) looks similar but fails dangerously.",
      "Never use to join two separate ropes under load.",
      "Works only when both ropes are the same material and diameter.",
    ],
    steps: [
      "Hold one rope end in each hand.",
      "Pass the right working end over and under the left — 'right over left'.",
      "Pass the left working end over and under the right — 'left over right'.",
      "Pull both standing parts tight. The knot should lie flat.",
      "Check: both loops should interlock symmetrically. Each working end should exit alongside the standing part on the same side.",
      "If the knot looks like a lump (granny knot), cut it and start again.",
      "Dress neatly — all four parts should be parallel.",
    ],
    color: "#e63946",
    svgPath: "M 15 50 Q 30 30 45 50 Q 55 65 45 80 Q 35 95 20 80 M 65 50 Q 75 35 80 50 Q 85 65 70 80",
  },
  {
    id: "rollinghitch",
    name: "Rolling Hitch",
    category: "Hitches",
    strengthReduction: 25,
    tags: ["tension", "along-spar", "adjustable"],
    purpose: "Attaches a rope to a spar or another rope and resists lengthwise slipping when tension is applied along the object. Unlike a clove hitch, it grips when pulled lengthwise.",
    shipboardUse: "Taking tension off a jammed line, attaching a preventer to a boom, relieving load on a dock line, attaching a stopper to a line under load.",
    steps: [
      "Lay the rope against the spar or rope at the point of attachment.",
      "Make a full turn around the spar, passing the working end over the standing part.",
      "Make a second full turn around the spar on the same side as the direction of pull.",
      "The second turn should lie between the standing part and the first turn.",
      "Make a third half-hitch on the opposite side of the standing part.",
      "Pass the working end under the third hitch to lock.",
      "Test by pulling along the spar — the hitch should grip and not slide.",
    ],
    color: "#a855f7",
    svgPath: "M 15 50 Q 25 35 40 50 Q 40 50 40 50 L 65 50 Q 75 50 80 65",
  },
  {
    id: "roundturn",
    name: "Round Turn & Two Half Hitches",
    category: "Hitches",
    strengthReduction: 20,
    tags: ["secure", "anchor", "ring"],
    purpose: "A very secure hitch for attaching a line to a ring, bollard, or spar where the load may be sudden or heavy. The round turn absorbs the initial shock, the half hitches lock the load.",
    shipboardUse: "Securing anchor rings, attaching lines to lifting rings, securing fenders to rails, mooring to rings and bollards, general heavy-duty attachment.",
    steps: [
      "Pass the working end around the object TWICE to make the 'round turn' — this creates friction and absorbs shock.",
      "Hold the round turn with tension while completing the hitches.",
      "Bring the working end back over the standing part to form the first half hitch.",
      "Pass it under the standing part and pull tight against the round turn.",
      "Repeat for the second half hitch: over then under the standing part.",
      "Pull both half hitches firmly down toward the object.",
      "For extra security, seize the working end to the standing part.",
    ],
    color: "#0ea5e9",
    svgPath: "M 20 50 Q 20 30 40 30 Q 60 30 60 50 Q 60 70 40 70 Q 20 70 20 50 M 60 50 Q 70 45 80 50 Q 85 60 80 70",
  },
  {
    id: "figureeight",
    name: "Figure Eight Knot",
    category: "Stoppers",
    strengthReduction: 20,
    tags: ["stopper", "climbing", "base"],
    purpose: "A fundamental stopper knot that prevents a rope end from running through a block, cleat, or eye. Forms the basis of many climbing knots. Keeps its shape well and is easy to inspect.",
    shipboardUse: "Stopper knot in sheet leads, preventing rope ends from running through blocks, base knot for splicing references, safety line termination, temporary whipping.",
    steps: [
      "Hold the working end of the rope.",
      "Form a bight (loop) by folding the working end back toward the standing part.",
      "Twist the bight once so the working end crosses over the standing part.",
      "Pass the working end through the bight from the front, under the X you just formed.",
      "Pull on both the working end and standing part simultaneously to tighten.",
      "The finished knot should clearly show the figure-8 shape.",
      "Dress symmetrically — both loops of the 8 should be equal size.",
    ],
    color: "#22c55e",
    svgPath: "M 40 20 Q 65 20 65 45 Q 65 60 50 60 Q 35 60 35 75 Q 35 95 60 95",
  },
  {
    id: "timberhitch",
    name: "Timber Hitch",
    category: "Hitches",
    strengthReduction: 35,
    tags: ["towing", "temporary", "log"],
    purpose: "A quick hitch used to attach a rope to a log or spar for towing or hoisting. The load keeps it tight. Self-releases immediately when tension is removed — ideal for temporary use.",
    shipboardUse: "Towing wooden spars, hauling logs or round objects, temporary attachment to cylindrical items, securing cargo for dragging, attaching to pipes during repair.",
    steps: [
      "Pass the working end around the timber or spar.",
      "Pass the working end around the standing part of the rope.",
      "Tuck the working end back around its own part — the tail wraps around itself 3 times.",
      "The multiple tucks grip the timber as tension increases.",
      "Pull the standing part to seat the knot against the timber.",
      "Add a half hitch forward of the timber hitch to keep the spar aligned during towing.",
      "Release: simply remove tension and the knot falls apart.",
    ],
    color: "#d97706",
    svgPath: "M 10 50 L 40 50 Q 50 50 50 60 Q 50 75 40 75 Q 30 75 35 60 Q 38 52 45 58",
  },
  {
    id: "carrickbend",
    name: "Carrick Bend",
    category: "Bends",
    strengthReduction: 25,
    tags: ["heavy", "hawser", "joining"],
    purpose: "One of the strongest bends for joining two large ropes or hawsers. Distributes load evenly and does not jam under extreme tension, making it ideal for heavy mooring operations.",
    shipboardUse: "Joining anchor hawsers, connecting tow lines, joining wire rope messenger lines, heavy lifting applications, connecting two large mooring ropes.",
    steps: [
      "Form a loose overhand loop in the first rope (working end over standing part).",
      "Lay the second rope across this loop so it passes under one side and over the other.",
      "Weave the second rope: over, under, over, under — alternating through the first loop.",
      "The pattern creates a symmetric flat knot that resembles a woven mat.",
      "Leave the tails long and make sure all four parts alternate correctly.",
      "Pull on both standing parts to begin tightening — the knot will capsize into a flat form.",
      "Dress carefully and seize the tails to the standing parts for permanent use.",
    ],
    color: "#ec4899",
    svgPath: "M 20 50 Q 35 30 50 50 Q 65 70 80 50 M 20 60 Q 35 80 50 60 Q 65 40 80 60",
  },
  {
    id: "anchorbend",
    name: "Anchor Bend",
    category: "Hitches",
    strengthReduction: 15,
    tags: ["anchor", "permanent", "ring"],
    purpose: "Also called the 'fisherman's bend'. The strongest and most reliable method of attaching a rope to an anchor ring or shackle. Will not slip or jam even after prolonged immersion and heavy load.",
    shipboardUse: "Permanently or semi-permanently attaching an anchor warp to an anchor ring, securing chain lashings, attaching buoy pickup lines, general ring attachment under load.",
    steps: [
      "Pass the working end through the ring twice to create two full turns.",
      "Keep both turns loose and parallel — do not allow them to overlap.",
      "Pass the working end under both turns (through the ring side).",
      "Bring the working end over the standing part and under itself (first half hitch).",
      "Add a second half hitch around the standing part.",
      "Pull the standing part to seat the knot. The half hitches should lie tight against the turns.",
      "Seize the working end to the standing part with sail twine for permanent rigging.",
    ],
    color: "#38bdf8",
    svgPath: "M 40 20 Q 40 20 40 20 L 40 40 Q 40 55 30 60 Q 20 65 20 75 Q 20 85 30 85 Q 50 85 50 65 Q 50 50 40 40",
  },
  {
    id: "monkeyfist",
    name: "Monkey Fist",
    category: "Decorative / Functional",
    strengthReduction: 0,
    tags: ["heaving", "weight", "decorative"],
    purpose: "A ball-shaped knot tied at the end of a heaving line to add weight for throwing. Traditionally contains a weight (stone or steel ball) at the center. Also used decoratively on lanyards.",
    shipboardUse: "Weighted end of a heaving line for line-throwing between ships or ship-to-shore, securing dock lines, decorative handle weights, emergency weight for throwing rescue lines.",
    steps: [
      "Hold the working end and make three vertical loops around four fingers.",
      "Without removing from fingers, make three horizontal loops around the middle of the vertical loops.",
      "Make three more vertical loops inside the horizontal loops (between them and your fingers).",
      "Carefully remove your fingers and tighten gradually — tuck a lead ball or smooth stone inside before final tightening.",
      "Work out the slack systematically, going around the knot multiple times.",
      "Each strand should be snug but not cutting — work from the outside in.",
      "Attach to a heaving line using a bowline or eye splice on the heaving line end.",
    ],
    color: "#fb923c",
    svgPath: "M 50 20 Q 70 20 75 40 Q 80 60 65 70 Q 50 80 35 70 Q 20 60 25 40 Q 30 20 50 20",
  },
  {
    id: "heavinglineknot",
    name: "Heaving Line Knot",
    category: "Decorative / Functional",
    strengthReduction: 0,
    tags: ["heaving", "weight", "terminal"],
    purpose: "A simple weighted terminal knot for heaving lines. Easier to tie than a monkey fist. Creates a compact, smooth ball that flies well and does not injure when landing on deck.",
    shipboardUse: "Weighted end of heaving lines, line-throwing between ship and jetty, pilot boarding arrangements, emergency line throwing, rescue operations.",
    steps: [
      "At the rope end, make an overhand knot but do not tighten.",
      "Thread the working end through the overhand loop three times.",
      "Pass it through a fourth time from the opposite direction.",
      "Pull on the standing part while guiding the wraps to tighten evenly.",
      "Work the knot into a compact ball shape by adjusting the wraps.",
      "The finished knot should be round and slightly smaller than a tennis ball.",
      "If used frequently, consider impregnating with a hardening compound.",
    ],
    color: "#a78bfa",
    svgPath: "M 35 30 Q 65 25 70 50 Q 75 75 50 80 Q 25 85 20 60 Q 15 35 35 30",
  },
];

// ─── ROPES DATA ───────────────────────────────────────────────────────────────
const ROPES = [
  {
    id: "polypropylene",
    name: "Polypropylene",
    color: "#f4c430",
    gradient: "linear-gradient(90deg, #e8b800, #ffd700, #e8b800)",
    floats: true,
    mbs: "Medium",
    mbsValue: 65,
    stretch: "Low",
    stretchValue: 30,
    uv: "Poor",
    uvValue: 20,
    abrasion: "Fair",
    appearance: "Usually yellow/gold, light, slightly waxy feel. May also be orange, white or green. Fibres have a plastic-like sheen when examined closely.",
    characteristics: [
      "Lightest synthetic rope — floats even when wet",
      "Cheapest of the synthetics",
      "Low melting point (~165°C) — melts easily from friction",
      "Does not absorb water",
      "Becomes brittle and weakens significantly with UV exposure within 1–2 years",
      "MBS typically 15–30% lower than polyester of same diameter",
      "Elongation at break: 15–25%",
    ],
    shipboardUse: "Heaving lines, light deck work, temporary lashings, swimmer lines. Avoid for mooring tails or heavy load applications due to low MBS and poor UV resistance.",
    maintenance: "Replace every 1–2 years if used outdoors. Store away from UV. Do not use near hot machinery.",
  },
  {
    id: "polyester",
    name: "Polyester (Dacron)",
    color: "#4a90d9",
    gradient: "linear-gradient(90deg, #1e5fa8, #4a90d9, #1e5fa8)",
    floats: false,
    mbs: "High",
    mbsValue: 85,
    stretch: "Low-Medium",
    stretchValue: 40,
    uv: "Excellent",
    uvValue: 90,
    abrasion: "Excellent",
    appearance: "Usually white, sometimes blue or black. Smooth, slightly lustrous surface. Dense and heavy for its size. Sinks in water.",
    characteristics: [
      "Excellent UV resistance — minimal degradation over years of sun exposure",
      "Good strength, consistent under load",
      "Absorbs very little water (< 0.4%)",
      "Elongation at break: 10–20% — low stretch makes it predictable",
      "Good abrasion resistance",
      "Good chemical resistance",
      "Maintains ~90% strength when wet",
      "Melting point ~260°C — more heat resistant than polypropylene",
    ],
    shipboardUse: "Mooring tails, sheets, halyards, lifelines, general deck lines. Preferred over nylon for applications where stretch must be minimized.",
    maintenance: "Inspect for core damage, glazing, and abrasion. Wash with fresh water after exposure to salt. Replace when cross-section shows significant fuzzing or glazing.",
  },
  {
    id: "nylon",
    name: "Nylon (Polyamide)",
    color: "#e8e8e8",
    gradient: "linear-gradient(90deg, #c0c0c0, #ffffff, #c0c0c0)",
    floats: false,
    mbs: "High",
    mbsValue: 88,
    stretch: "Very High",
    stretchValue: 85,
    uv: "Good",
    uvValue: 70,
    abrasion: "Good",
    appearance: "Usually white or light grey. Slightly softer and more elastic than polyester. Dense. Can feel slightly warm due to thermal properties.",
    characteristics: [
      "Highest stretch of common synthetics — 30–40% elongation at break",
      "Excellent shock absorption — energy stored is released gradually",
      "High strength per unit weight",
      "Absorbs water, slightly reducing strength when wet (~10–15% loss)",
      "Good abrasion resistance",
      "Moderate UV resistance",
      "Melting point ~220°C",
      "Retains flexibility in cold temperatures",
    ],
    shipboardUse: "Anchor rodes, tow lines, mooring springs, shock-absorbing tails. The high stretch makes it ideal where dynamic shock loads occur (anchoring, towing, heavy weather mooring).",
    maintenance: "Dry thoroughly before storage to prevent mildew. Inspect for nicks and abrasion. Wet strength slightly lower — factor in safety calculations.",
  },
  {
    id: "hmpe",
    name: "HMPE / Dyneema®",
    color: "#b0e0ff",
    gradient: "linear-gradient(90deg, #6bb8e0, #b0e0ff, #6bb8e0)",
    floats: true,
    mbs: "Ultra High",
    mbsValue: 100,
    stretch: "Ultra Low",
    stretchValue: 5,
    uv: "Good",
    uvValue: 75,
    abrasion: "Excellent",
    appearance: "White to very light blue, often slightly shiny. Extremely light and slippery to the touch. Difficult to hold when loaded. Fibres are ultra-fine.",
    characteristics: [
      "12–15× stronger than steel wire of equal weight",
      "Floats in water — density less than water",
      "Virtually zero stretch (<1% at working load) — no energy absorption",
      "CRITICAL: High snap-back risk if parted — very little warning",
      "Poor heat resistance — melts at ~120°C, weakens at much lower temps",
      "Slippery surface — knots slip easily; splices preferred over knots",
      "Good UV resistance",
      "Creep under sustained high load — check regularly",
      "MBS significantly higher than polyester of same diameter",
    ],
    shipboardUse: "Mooring tails (replacing wire), racing halyards, sheets, crane runners, offshore mooring pendants. Used increasingly to replace wire rope.",
    maintenance: "Inspect for glazing (heat damage), flat spots (shock loading damage), and core damage. Keep away from heat sources. Replace if any glazing present.",
  },
  {
    id: "manila",
    name: "Manila (Natural Fibre)",
    color: "#c8a850",
    gradient: "linear-gradient(90deg, #a07830, #c8a850, #a07830)",
    floats: false,
    mbs: "Low",
    mbsValue: 40,
    stretch: "Low",
    stretchValue: 25,
    uv: "Poor",
    uvValue: 30,
    abrasion: "Good",
    appearance: "Light brown to tan, rough texture with visible fibres. Three-strand twisted construction typical. Smells earthy/natural.",
    characteristics: [
      "Natural fibre from abacá plant",
      "Traditional seamanship rope — used for centuries",
      "Absorbs water significantly — becomes heavy when wet",
      "Loses approximately 20–30% strength when wet",
      "Biodegradable and environmentally friendly",
      "Rots if stored wet — requires thorough drying",
      "Stiff in cold weather",
      "Good grip surface — easy to handle without gloves",
      "Poor UV resistance — degrades quickly in tropical conditions",
    ],
    shipboardUse: "Heaving lines, decorative ropework, training purposes. Rarely used operationally on modern vessels due to low MBS, rot risk, and weight when wet.",
    maintenance: "Dry thoroughly after every use. Inspect for internal rot (grey/black fibres inside). Never store wet. Replace frequently — strength degrades rapidly.",
  },
  {
    id: "sisal",
    name: "Sisal",
    color: "#d4b870",
    gradient: "linear-gradient(90deg, #b09040, #d4b870, #b09040)",
    floats: false,
    mbs: "Low",
    mbsValue: 30,
    stretch: "Low",
    stretchValue: 20,
    uv: "Poor",
    uvValue: 25,
    abrasion: "Fair",
    appearance: "Similar to manila but lighter/paler. Rougher texture. Three-strand twist. Less lustrous than manila. Coarser to the touch.",
    characteristics: [
      "Natural fibre from agave plant",
      "Weaker than manila — should not substitute in safety applications",
      "More susceptible to rot than manila",
      "Absorbs water readily",
      "Good knot-holding ability due to rough texture",
      "Biodegradable",
      "Low cost",
      "Elongation at break: 5–12%",
    ],
    shipboardUse: "Decorative ropework, whipping material, training demonstrations. Not recommended for operational mooring or rigging due to low strength and rot susceptibility.",
    maintenance: "Same as manila but with more frequent inspections. Do not use in safety-critical applications.",
  },
  {
    id: "wirerope",
    name: "Wire Rope",
    color: "#a0a8b8",
    gradient: "linear-gradient(90deg, #6870838, #a0a8b8, #687083)",
    floats: false,
    mbs: "Very High",
    mbsValue: 95,
    stretch: "Very Low",
    stretchValue: 10,
    uv: "Excellent",
    uvValue: 95,
    abrasion: "Excellent",
    appearance: "Metallic grey, often with wire strands visible. Usually lubricated — greasy to touch. May have a fibre or steel core. Inflexible compared to fibre rope.",
    characteristics: [
      "Highest strength and lowest stretch of all rope types",
      "Durable and abrasion resistant",
      "Extremely high snap-back energy if parted",
      "Heavy — increases deadweight",
      "Corrosion risk in salt water — must be lubricated",
      "Fatigue failure occurs at bends — check sheave radii",
      "Kinks permanently weaken wire — never allow kinks",
      "Broken wires protrude — serious laceration hazard",
      "Requires specialized maintenance and inspection",
    ],
    shipboardUse: "Stays, shrouds, crane wires, anchor chain stoppers, cargo runners, Boat davit falls (older vessels). Being replaced by HMPE on modern vessels.",
    maintenance: "Lubricate regularly with compatible grease. Inspect for broken wires, kinks, bird-caging, corrosion. Replace when broken wire count exceeds limits.",
  },
  {
    id: "mixedfibre",
    name: "Mixed Fibre / Hybrid Rope",
    color: "#98d8a8",
    gradient: "linear-gradient(90deg, #50a870, #98d8a8, #50a870)",
    floats: false,
    mbs: "High",
    mbsValue: 80,
    stretch: "Medium",
    stretchValue: 55,
    uv: "Good",
    uvValue: 75,
    abrasion: "Good",
    appearance: "Varies — often mixed white/coloured strands. May show braided construction. Different fibre types may be visible in the core vs cover.",
    characteristics: [
      "Combines properties of two or more fibre types",
      "Common combinations: polyester cover + nylon core (strength + shock absorption)",
      "HMPE core + polyester cover (high strength + abrasion protection)",
      "Properties vary significantly by manufacturer and construction",
      "Always refer to manufacturer documentation for specific MBS",
      "Generally good balance of strength, stretch and cost",
      "Cover protects core — inspect cover carefully for damage",
    ],
    shipboardUse: "Mooring tails, general deck use, applications requiring properties not achievable with a single fibre. Common in modern mooring rope design.",
    maintenance: "Follow manufacturer guidelines. Check for cover damage exposing core. Core damage may not be visible externally.",
  },
];

// ─── WIRE ROPE DATA ───────────────────────────────────────────────────────────
const WIRE_CONSTRUCTIONS = [
  { code: "6×7", wires: 42, flexibility: "Stiff", use: "Stays, standing rigging", bendRadius: "Very Large" },
  { code: "6×19", wires: 114, flexibility: "Medium", use: "General crane wire, cargo runners", bendRadius: "Medium" },
  { code: "6×36", wires: 216, flexibility: "Flexible", use: "Running rigging, hoist wire", bendRadius: "Small" },
  { code: "8×19", wires: 152, flexibility: "Very Flexible", use: "Crane, hoist, rotation-resistant", bendRadius: "Small" },
  { code: "19×7", wires: 133, flexibility: "Rotation Resistant", use: "Crane blocks, single layer lift", bendRadius: "Medium" },
  { code: "35×7", wires: 245, flexibility: "Highly Flexible", use: "Elevator ropes, hoist drums", bendRadius: "Very Small" },
];

const WIRE_REJECTION = [
  { criterion: "Broken wires (running rope)", limit: "≥ 6 in any 1 lay length, or ≥ 3 in one strand" },
  { criterion: "Broken wires (standing rigging)", limit: "≥ 2 in any 30× rope diameter length" },
  { criterion: "Corrosion", limit: "Any pitting, excessive rust, or brittle wires" },
  { criterion: "Kinking", limit: "Any permanent kink — zero tolerance" },
  { criterion: "Bird-caging / loop distortion", limit: "Any visible separation of strands" },
  { criterion: "Diameter reduction", limit: "≥ 5% reduction from nominal diameter" },
  { criterion: "Heat damage", limit: "Any evidence of heat or arc damage" },
  { criterion: "Core damage", limit: "Visible core protrusion or softness" },
  { criterion: "Crush / flat spots", limit: "Any crushing deformation" },
  { criterion: "End termination", limit: "Any cracks, elongation, or corrosion at thimble/swage" },
];

// ─── INSPECTION DATA ──────────────────────────────────────────────────────────
const DAMAGE_TYPES = [
  {
    type: "Chafing / Abrasion",
    severity: "high",
    description: "External surface wear from repeated contact with hard edges, fairleads, or deck fittings. Reduces cross-section and may not reflect internal condition.",
    indicators: ["Flattened or glazed surface", "Fibre fuzz or loose strands", "Flat spots at fairlead contact points", "Visible reduction in diameter"],
    action: "Measure diameter at affected point. If reduced >10%, remove from service. Reeve through fairlead to move wear point. Fit chafing gear.",
    color: T.accentGold,
  },
  {
    type: "Broken Strands",
    severity: "critical",
    description: "Individual fibre bundles (strands) that have parted internally or externally. Dramatically reduces strength. Load transfers to remaining strands, accelerating failure.",
    indicators: ["Visible strand separation", "Lumpy or irregular texture", "Hardness changes along rope", "Hazy or discoloured patch"],
    action: "Remove from service immediately. Do not attempt repair. A broken strand in a mooring line means the rope is no longer fit for purpose.",
    color: T.accentRed,
  },
  {
    type: "Heat Damage",
    severity: "critical",
    description: "Synthetic ropes melt, fuse, or degrade when exposed to heat. Caused by friction (turning on drum or bitts too fast), proximity to exhaust, welding sparks, or direct flame.",
    indicators: ["Glazed, shiny or fused surface", "Hard, brittle texture", "Colour change (yellowing, browning)", "Stiff sections in normally flexible rope", "Melted or fused fibre bundles"],
    action: "Remove from service immediately. Heat damage is invisible internally. Any heat damage, however small, is grounds for rejection.",
    color: T.accentRed,
  },
  {
    type: "Chemical Damage",
    severity: "high",
    description: "Contact with acids, alkalis, fuel, or other chemicals can degrade rope fibres without visible external signs. Strength loss can be total without warning.",
    indicators: ["Unexpected stiffness", "Discolouration", "Brittle or crumbly texture", "Reduced elasticity", "Unusual odour"],
    action: "If chemical contamination is suspected, remove from service and test or replace. Document chemical exposure in rope log.",
    color: T.accentGold,
  },
  {
    type: "UV Degradation",
    severity: "medium",
    description: "Prolonged sunlight exposure breaks down polymer chains. Most critical in polypropylene and manila ropes. Can cause 50%+ strength loss over 2–3 years with no visible warning.",
    indicators: ["Bleached/faded colour", "Powdery surface", "Reduced flexibility", "Stiff, crackling texture when bent", "Surface fibre breakage under bending"],
    action: "Implement rope age tracking. Replace polypropylene lines after 2 years. Use UV-resistant covers. Keep lines in lockers when not in use.",
    color: "#f59e0b",
  },
  {
    type: "Snap-back Risk",
    severity: "critical",
    description: "Any rope under tension stores elastic energy. If it parts, this energy is released explosively. Larger diameter rope and higher tension = greater snap-back distance and force. HMPE and polyester have particularly dangerous snap-back characteristics.",
    indicators: ["High tension on rope", "Creaking sounds", "Elongation visible", "Vibration in line"],
    action: "NEVER stand in the snap-back zone. Use energy-absorbing stoppers. Monitor rope tension. Deploy snap-back preventers. Clear personnel before tending heavily loaded lines.",
    color: T.accentRed,
  },
];

// ─── MOORING DATA ─────────────────────────────────────────────────────────────
const MOORING_LINES = [
  {
    name: "Head Line",
    abbrev: "HL",
    color: "#00b4d8",
    description: "Runs from the bow to the dock in a forward direction. Prevents the bow from moving away from the dock.",
    tension: "High",
    critical: "Prevents forward movement of bow. First line secured in many berthing operations.",
  },
  {
    name: "Stern Line",
    abbrev: "SL",
    color: "#f4a820",
    description: "Runs from the stern to the dock in a rearward direction. Prevents the stern from moving away from the dock.",
    tension: "High",
    critical: "Prevents rearward movement of stern. Mirror of head line.",
  },
  {
    name: "Forward Spring",
    abbrev: "FSP",
    color: "#2ec4b6",
    description: "Runs aft from the bow area to a dock fitting ahead of the ship. Prevents the ship from moving astern. Used during manoeuvring to pivot the bow in.",
    tension: "Very High",
    critical: "Prevents astern movement. Used with engine power to manoeuvre.",
  },
  {
    name: "Aft Spring",
    abbrev: "ASP",
    color: "#a855f7",
    description: "Runs forward from the stern area to a dock fitting astern of the ship. Prevents the ship from moving ahead. Used to pivot the stern in.",
    tension: "Very High",
    critical: "Prevents ahead movement. Mirror of forward spring.",
  },
  {
    name: "Breast Line",
    abbrev: "BL",
    color: "#e63946",
    description: "Runs perpendicular or at slight angle from ship to dock. Holds ship against dock. Most effective when at 90° to ship's centreline.",
    tension: "High",
    critical: "Holds ship against dock. Most susceptible to chafe. Check fairlead angles.",
  },
  {
    name: "Tug Line",
    abbrev: "TG",
    color: "#fb923c",
    description: "Line connecting assist tugs to the vessel. May be from bow, stern, or midship panama leads. Arrangement depends on manoeuvre required.",
    tension: "Extreme",
    critical: "Highest loads in any mooring system. HMPE or heavy polyester. Snap-back extreme risk.",
  },
];

// ─── SPLICE DATA ──────────────────────────────────────────────────────────────
const SPLICES = [
  {
    name: "Eye Splice",
    purpose: "Creates a permanent loop (eye) at the end of a rope. Much stronger than a bowline loop — retains 85–95% of rope MBS versus 60–70% for a knot.",
    strengthRetention: "85–95%",
    difficulty: "Medium",
    use: "Permanent loops on mooring lines, attaching to bollards and shackles, creating eyes for block attachment, life raft painter attachment.",
    steps: [
      { title: "Unlay the strands", detail: "Unlay (untwist) the rope for a minimum of 5 full tucks × rope circumference from the working end. Secure the lay with tape." },
      { title: "Form the eye", detail: "Lay the working end alongside the standing part at the correct position to form the desired eye size. Include a thimble for permanent applications to prevent chafe." },
      { title: "First tuck — middle strand", detail: "Identify the 3 strands. The middle strand is tucked against the lay (against the twist direction) under the first strand of the standing part." },
      { title: "Second tuck — left strand", detail: "The left-hand working strand is tucked under the next strand of the standing part — the strand to the left of where the first tuck went." },
      { title: "Third tuck — right strand", detail: "Turn the work over. The third strand is tucked from right to left under the remaining strand of the standing part. All three strands should now exit from different gaps." },
      { title: "Repeat tucks", detail: "Continue tucking all three strands, always against the lay, for a minimum of 3 complete rounds (4–5 recommended for HMPE)." },
      { title: "Taper and finish", detail: "For a neat finish, halve the strands for the final 1–2 tucks. Cut ends flush after tightening. Whip the throat for extra security." },
    ],
  },
  {
    name: "Back Splice",
    purpose: "A method of finishing a rope end to prevent unlaying. Creates a permanent, bulkier end that will not pass through a block but is more secure than whipping.",
    strengthRetention: "95%",
    difficulty: "Easy",
    use: "Finishing rope ends, preventing fraying on working ends, decorative applications, ends of heaving lines.",
    steps: [
      { title: "Crown knot first", detail: "Unlay 6–8 turns. Form a crown knot: take strand 1 over strand 2, strand 2 over strand 3, strand 3 through the bight of strand 1." },
      { title: "Pull the crown tight", detail: "Pull each strand firmly to close the crown knot. This forms the base of the splice and stops the unlaying." },
      { title: "Begin tucking", detail: "Tuck each strand against the lay under the strand of the standing rope below the crown, one tuck each." },
      { title: "Continue for 3–5 rounds", detail: "Continue tucking all three strands over-one under-one against the lay for a minimum of 3 complete rounds." },
      { title: "Taper the end", detail: "On the final round, split strands and tuck halves for a tapered finish." },
      { title: "Cut and seal", detail: "Cut ends close and seal with a flame (synthetic) or tar/varnish (natural fibre)." },
    ],
  },
  {
    name: "Short Splice",
    purpose: "Permanently joins two ropes end-to-end. Very strong (80–90% MBS) but creates a thickened section that will not pass through a block or fairlead.",
    strengthRetention: "80–90%",
    difficulty: "Medium",
    use: "Permanent joining of mooring ropes, extending dock lines, joining anchor warps where passing through leads is not required.",
    steps: [
      { title: "Prepare both ends", detail: "Unlay both rope ends for 5–6 turns. Tape the ends to prevent further unlaying. Mark the join point." },
      { title: "Interlock the ends", detail: "Interleave the strands of both ropes so they alternate — each strand of rope A sits between two strands of rope B." },
      { title: "Seize at the join", detail: "Place a temporary seizing or tie at the point where the two sets of strands meet to hold position while tucking." },
      { title: "Tuck rope A strands into rope B", detail: "Tuck each strand of rope A over-one under-one against the lay of rope B for 3–5 complete rounds." },
      { title: "Tuck rope B strands into rope A", detail: "Remove the seizing and tuck each strand of rope B against the lay of rope A for 3–5 rounds." },
      { title: "Taper and finish both sides", detail: "Halve the strands on final tucks for taper. Cut close and seal. The completed splice will be approximately 10–15% thicker than the original rope." },
    ],
  },
  {
    name: "Long Splice",
    purpose: "Joins two ropes with minimal increase in diameter — the splice can pass through a block or lead. Weaker than short splice but essential when the rope must remain the same size throughout.",
    strengthRetention: "70–80%",
    difficulty: "Hard",
    use: "Joining halyards and sheets that must run through blocks, replacing sections in standing rigging, race-critical running rigging repair.",
    steps: [
      { title: "Unlay long sections", detail: "Unlay each end for 10–15 turns — much longer than a short splice. This distributes the join over a longer section." },
      { title: "Interlock and unlay further", detail: "Interlock the two rope ends. Take one strand from rope A and one strand from rope B (the opposite pair) and unlay them further — 4–5 turns in opposite directions." },
      { title: "Fill the groove", detail: "As each strand is unlaid, fill the groove left with the corresponding strand from the other rope, laying it in tightly and evenly." },
      { title: "Repeat for remaining pairs", detail: "Repeat for the remaining strand pairs. Each pair of strands is unlaid in opposite directions and swapped." },
      { title: "Tuck the ends", detail: "At each meeting point, tuck the strand ends over-one under-one for 2–3 tucks only. Cut flush." },
      { title: "Roll and finish", detail: "Roll the entire splice between hands or under a board to blend the join. Smooth tucks by rolling. The finished splice should be nearly invisible." },
    ],
  },
];

// ─── SEAMANSHIP DATA ──────────────────────────────────────────────────────────
const SEAMANSHIP_SKILLS = [
  {
    name: "Whipping",
    icon: "🧵",
    purpose: "Securing rope ends to prevent unlaying. Essential for all working rope ends.",
    types: [
      { name: "Common Whipping", desc: "Basic wrap of twine — quick but not very secure. Use as temporary measure." },
      { name: "West Country Whipping", desc: "Alternating half hitches on opposite sides — more secure. Good for natural fibre." },
      { name: "Sailmaker's Whipping", desc: "Passes through the rope strands — most secure. Required for halyards and sheets." },
    ],
    steps: [
      "Cut a length of waxed sail twine about 30cm long.",
      "Lay one end along the rope, pointing toward the end.",
      "Wind the twine tightly toward the rope end for a length equal to the rope diameter.",
      "Thread the remaining tail through the final loop of twine and pull tight.",
      "For sailmaker's whipping: pass the tail through the strand gaps and bring out between each strand.",
      "Trim close and melt end (synthetic) or seal with varnish.",
    ],
  },
  {
    name: "Seizing",
    icon: "🔗",
    purpose: "Lashing two parts of a rope or two ropes together permanently. Used to attach a thimble, reinforce a loop, or join parallel lines.",
    types: [
      { name: "Round Seizing", desc: "Simple round turns — used for light loads where the two parts run parallel." },
      { name: "Racking Seizing", desc: "Figure-of-eight turns — much stronger, used for heavier seizings under load." },
      { name: "Flat Seizing", desc: "Two layers of round turns with riding turns — strongest, for permanent applications." },
    ],
    steps: [
      "Use tarred marline or sail twine of appropriate size.",
      "Form an eye in the seizing line and place it over one of the ropes.",
      "Pass the working end around both ropes — these are the 'round turns'.",
      "Work toward yourself, keeping turns tight and parallel.",
      "Pass 'riding turns' back over the round turns.",
      "Pass the working end between the ropes and through the initial eye — these are 'crossing turns'.",
      "Finish with several half hitches and seize the end.",
    ],
  },
  {
    name: "Serving",
    icon: "🎯",
    purpose: "Protecting a rope or wire from chafe and the elements by tightly wrapping it with small line or tape. Used over parcelling to create 'Worm, Parcel and Serve' protection.",
    types: [
      { name: "Worming", desc: "Filling the grooves between strands with small line — creates a smooth surface for parcelling." },
      { name: "Parcelling", desc: "Winding tarred canvas or tape along the lay — seals the surface before serving." },
      { name: "Serving", desc: "Tight wrapping of small line against the lay — creates hard protective outer shell." },
    ],
    steps: [
      "Worm first: lay small line in the grooves between strands, following the lay.",
      "Parcel: wrap canvas strips or tape around the rope following the lay. Overlap each turn.",
      "Serve: using a serving mallet or serving board, apply serving turns against the lay.",
      "Work away from yourself, keeping each turn tight against the last.",
      "Continue until entire section is covered — serving should overhang the parcelling by 2–3cm.",
      "Finish with a locking tuck through the last few turns.",
      "Seal with varnish or Stockholm tar.",
    ],
  },
  {
    name: "Coiling",
    icon: "〇",
    purpose: "Storing and ready-use handling of rope. A properly coiled rope runs out without kinks or tangles.",
    types: [
      { name: "Hand Coil (laid rope)", desc: "Follow the natural twist of the rope — clockwise for right-laid, anticlockwise for left-laid. Each loop adds a half-twist." },
      { name: "Hand Coil (braided rope)", desc: "Alternate coil direction each loop to prevent twist accumulation (figure-eight method)." },
      { name: "Fake-down", desc: "Lay rope in long back-and-forth runs (not circles) — rope runs out freely without twists. Used for mooring ropes and heaving lines." },
    ],
    steps: [
      "Start from the working end of the rope.",
      "Hold the first coil in your non-dominant hand.",
      "For laid rope: let each loop follow the natural lay by rotating your wrist slightly as you coil.",
      "Keep each loop approximately the same size — typically shoulder to hip for heaving lines.",
      "For braided rope: alternate loop direction each turn to prevent hockles.",
      "Secure with a loop taken from the standing part and wrapped around the coil, tucked through the top.",
      "Test by throwing: a good coil flies cleanly and pays out without snarls.",
    ],
  },
  {
    name: "Heaving Line Preparation",
    icon: "🎯",
    purpose: "A heaving line is a light line attached to a heavy mooring rope. It is thrown first to establish contact, then used to haul the mooring rope across.",
    types: [
      { name: "Material", desc: "Light, supple polypropylene 8–10mm diameter — floats if it falls in water. 25–30m length." },
      { name: "Weight", desc: "Monkey fist or heaving line knot at the throwing end. Minimum 200–400g." },
      { name: "Attachment", desc: "Attached to mooring rope eye with a bowline or sheet bend. Never permanently attached." },
    ],
    steps: [
      "Coil the heaving line carefully in the throwing hand, starting from the weighted end.",
      "Split coils: half in the throwing hand, half in the non-throwing hand.",
      "Face the target. Plant feet wide for stability.",
      "Swing the weighted end 2–3 times for momentum — keep clear of overhead obstructions.",
      "Release both portions of coil simultaneously — the throwing hand first, then the free hand.",
      "Aim slightly above and ahead of the target — the line will drop down and across.",
      "Shout 'HEADS!' (or your vessel's warning) before throwing.",
    ],
  },
  {
    name: "Fake-Down",
    icon: "↔",
    purpose: "Laying rope on deck in long back-and-forth runs (rather than coils) for instant, snag-free running. Essential for mooring lines and heaving lines.",
    types: [
      { name: "Simple fake-down", desc: "Straight back-and-forth runs on deck. Fastest method, good for long lines." },
      { name: "Flemish coil", desc: "Spiral flat coil from centre outward. Neat appearance. Traditional for coiled dock lines." },
      { name: "Stacked fake", desc: "Multiple layers stacked vertically. Used in confined spaces." },
    ],
    steps: [
      "Clear the deck area of obstructions and water.",
      "Start from the bitter end (the end NOT being used).",
      "Lay the first run forward along the deck.",
      "Fold back and lay the return run parallel to the first, slightly offset.",
      "Continue building parallel runs, keeping each layer clear of the next.",
      "The working end (with the eye or heaving line) should be on top.",
      "Test by walking the line out: it should pay out without catching.",
    ],
  },
];

// ─── CASE STUDIES ─────────────────────────────────────────────────────────────
const CASE_STUDIES = [
  {
    title: "MV Maersk Detroit — Snap-back Fatality (2007)",
    location: "Port of Antwerp, Belgium",
    summary: "A 20mm HMPE mooring tail parted under load while the vessel was adjusting position. The snap-back struck an AB who was standing in the danger zone, causing fatal injuries.",
    lessons: [
      "Snap-back zone must be completely cleared before applying tension to HMPE lines.",
      "HMPE gives no audible or visual warning before parting — unlike wire, which creaks.",
      "Mooring stations must have clearly marked safe standing areas.",
      "All crew must be briefed on HMPE specific dangers before assuming mooring duties.",
    ],
    outcome: "Fatal. Immediate industry-wide HMPE safety briefing issued.",
    severity: "fatal",
  },
  {
    title: "BW Rig Platform — Mooring Failure in Heavy Weather",
    location: "North Sea",
    summary: "A 52mm polyester mooring tail failed at a thimble splice after 7 years of service. Post-incident inspection revealed extensive UV degradation visible only under UV light testing. The rope had passed visual inspection the previous month.",
    lessons: [
      "Visual inspection alone is insufficient for UV-degraded ropes.",
      "Age-based replacement policies are essential for all synthetic lines.",
      "UV testing equipment should be available for high-value mooring tails.",
      "Rope service logs must record age, exposure history, and inspection results.",
    ],
    outcome: "Property damage only. Rope replacement policy revised fleet-wide.",
    severity: "serious",
  },
  {
    title: "VLCC Loading Arm Damage — Insufficient Breast Lines",
    location: "Ras Tanura, Saudi Arabia",
    summary: "An unexpected swell in an exposed berth caused a 320,000 DWT tanker to surge against the dock. The breast lines were inadequate for the conditions, resulting in loading arm damage and a near-miss oil spill.",
    lessons: [
      "Swell and surge predictions must be checked before and during all cargo operations.",
      "Breast line arrangement must account for unexpected environmental conditions.",
      "Emergency departure procedures must be pre-planned and crew drilled.",
      "Communication between Master, terminal, and tug operators is critical.",
    ],
    outcome: "Major property damage. Near-miss pollution incident.",
    severity: "serious",
  },
  {
    title: "Container Vessel — Heaving Line Injury",
    location: "Port of Hamburg",
    summary: "An officer on the quay was struck by a poorly thrown heaving line monkey fist, causing a broken orbital bone. The thrower did not give the 'HEADS!' warning and the recipient was not paying attention.",
    lessons: [
      "Always shout 'HEADS!' before throwing a heaving line.",
      "Shoreside personnel must be in the correct ready position and watching.",
      "Monkey fists should use the minimum effective weight.",
      "Consider the trajectory and swing arc — wind and vessel height affect the line.",
    ],
    outcome: "Serious injury. Port authority investigation. SMS review.",
    severity: "serious",
  },
];

// ─── SNAP-BACK ZONES ─────────────────────────────────────────────────────────
const SNAPBACK_FACTS = [
  { fact: "A 64mm polyester mooring line at 20% MBS stores enough energy to kill at 15 metres distance." },
  { fact: "HMPE ropes are MORE dangerous than polyester or nylon because they store MORE energy with less visible warning." },
  { fact: "Wire rope snap-back is particularly violent due to stiffness — wire 'whips' rather than retracts." },
  { fact: "Snap-back triangles form between: (1) the bitts/cleat, (2) the fairlead/lead, and (3) the point of potential failure." },
  { fact: "Most snap-back fatalities occur when crew are repositioning, adjusting, or inspecting a tensioned line." },
  { fact: "A line at 50% MBS can part and the snap-back reach 10+ metres in under 0.05 seconds — too fast to react." },
  { fact: "Never stand in a straight line with a tensioned mooring rope — always stand at an angle." },
  { fact: "The snap-back zone extends both inboard and outboard of any lead or fairlead." },
];

// ─── KNOT SVG ANIMATIONS ──────────────────────────────────────────────────────
function KnotAnimation({ knot }) {
  return (
    <div className="krm-knot-anim-wrap">
      <svg width="110" height="110" viewBox="0 0 100 100" style={{ overflow: "visible" }}>
        {/* Background grid */}
        <defs>
          <pattern id={`grid-${knot.id}`} width="20" height="20" patternUnits="userSpaceOnUse">
            <path d="M 20 0 L 0 0 0 20" fill="none" stroke="rgba(255,255,255,0.04)" strokeWidth="0.5" />
          </pattern>
        </defs>
        <rect width="100" height="100" fill={`url(#grid-${knot.id})`} />

        {/* Rope shadow */}
        <path d={knot.svgPath} fill="none" stroke="rgba(0,0,0,0.5)" strokeWidth="9" strokeLinecap="round" strokeLinejoin="round" transform="translate(1,2)" />

        {/* Main rope body */}
        <path d={knot.svgPath} fill="none" stroke={knot.color} strokeWidth="7" strokeLinecap="round" strokeLinejoin="round" opacity="0.9" />

        {/* Highlight */}
        <path d={knot.svgPath} fill="none" stroke="rgba(255,255,255,0.25)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />

        {/* Animated flow */}
        <path
          d={knot.svgPath}
          fill="none"
          stroke="rgba(255,255,255,0.6)"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="rope-anim"
          style={{ strokeDasharray: 15, strokeDashoffset: 200 }}
        />

        {/* Center indicator */}
        <circle cx="50" cy="55" r="4" fill={knot.color} opacity="0.5" className="knot-pulse" />
      </svg>
      <div className="krm-anim-label">Animated diagram</div>
    </div>
  );
}

// ─── COLLAPSIBLE CARD ─────────────────────────────────────────────────────────
function CollapsibleCard({ title, badge, badgeClass = "", defaultOpen = false, children }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="krm-card" style={{ marginBottom: 12 }}>
      <div className="krm-card-header" onClick={() => setOpen(!open)}>
        <div style={{ display: "flex", alignItems: "center", gap: 12, flex: 1 }}>
          <div className="krm-card-title">{title}</div>
          {badge && <span className={`krm-badge ${badgeClass}`}>{badge}</span>}
        </div>
        <span className={`krm-collapse-chevron ${open ? "open" : ""}`}>▾</span>
      </div>
      <div className="krm-collapse-body" style={{ maxHeight: open ? "3000px" : "0" }}>
        <div className="krm-card-body">{children}</div>
      </div>
    </div>
  );
}

// ─── STRENGTH BAR ─────────────────────────────────────────────────────────────
function StrengthBar({ value, color, label }) {
  return (
    <div style={{ marginBottom: 6 }}>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 3 }}>
        <span style={{ fontSize: 11, color: T.textMuted, textTransform: "uppercase", letterSpacing: "0.1em" }}>{label}</span>
        <span style={{ fontSize: 11, color: T.textMuted, fontFamily: "'JetBrains Mono', monospace" }}>{value}%</span>
      </div>
      <div className="krm-strength-bar">
        <div className="krm-strength-fill" style={{ width: `${value}%`, background: color }} />
      </div>
    </div>
  );
}

// ─── TABS CONFIG ──────────────────────────────────────────────────────────────
const TABS = [
  { id: "knots", label: "⚓ Knots Library" },
  { id: "ropes", label: "🪢 Rope Types" },
  { id: "wire", label: "🔩 Wire Rope" },
  { id: "inspection", label: "🔍 Inspection" },
  { id: "splicing", label: "✂️ Splicing" },
  { id: "mooring", label: "⛵ Mooring" },
  { id: "snapback", label: "⚠️ Snap-back" },
  { id: "seamanship", label: "🎓 Seamanship" },
  { id: "identify", label: "🔎 ID Tool" },
];

// ═══════════════════════════════════════════════════════════════════════════════
// SECTION COMPONENTS
// ═══════════════════════════════════════════════════════════════════════════════

function KnotsSection({ searchQ }) {
  const filtered = KNOTS.filter(
    (k) =>
      !searchQ ||
      k.name.toLowerCase().includes(searchQ) ||
      k.tags.some((t) => t.includes(searchQ)) ||
      k.category.toLowerCase().includes(searchQ)
  );

  return (
    <div>
      <div className="krm-section-title">Knots <span>Library</span></div>
      <div className="krm-section-desc">
        {KNOTS.length} essential maritime knots — purpose, step-by-step instructions, animated diagrams, shipboard applications and strength data.
      </div>

      <div className="krm-tip">
        <strong>Rule of thumb:</strong> Never use a knot where a splice is practical. Knots reduce rope strength by 20–50%. Always test every knot before placing it under load. A knot that looks right but isn't dressed properly can fail at a fraction of its rated load.
      </div>

      {filtered.map((knot) => (
        <CollapsibleCard
          key={knot.id}
          title={knot.name}
          badge={knot.category}
          badgeClass=""
          defaultOpen={false}
        >
          <div className="krm-grid-2" style={{ gap: 20 }}>
            {/* Left: visual */}
            <div>
              <KnotAnimation knot={knot} />
              <div style={{ marginTop: 14 }}>
                <div className="krm-label">Strength Retention</div>
                <StrengthBar
                  value={100 - knot.strengthReduction}
                  color={knot.color}
                  label={`Retains ${100 - knot.strengthReduction}% MBS`}
                />
                <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginTop: 8 }}>
                  {knot.tags.map((t) => (
                    <span key={t} className="krm-badge" style={{ fontSize: 10 }}>{t}</span>
                  ))}
                </div>
              </div>
            </div>

            {/* Right: details */}
            <div>
              <div className="krm-label">Purpose</div>
              <div style={{ color: T.textSecondary, marginBottom: 14, fontSize: 14, lineHeight: 1.6 }}>{knot.purpose}</div>

              <div className="krm-label">Typical Shipboard Use</div>
              <div style={{ color: T.textSecondary, marginBottom: 14, fontSize: 14, lineHeight: 1.6 }}>{knot.shipboardUse}</div>

              <div className="krm-label" style={{ marginBottom: 8 }}>Step-by-Step Instructions</div>
              <ol className="krm-steps">
                {knot.steps.map((s, i) => (
                  <li key={i}>{s}</li>
                ))}
              </ol>

              {knot.tips && (
                <>
                  <div className="krm-label" style={{ margin: "14px 0 8px" }}>Important Tips</div>
                  {knot.tips.map((tip, i) => (
                    <div key={i} className="krm-tip" style={{ margin: "6px 0", padding: "8px 14px" }}>
                      {tip}
                    </div>
                  ))}
                </>
              )}
            </div>
          </div>

          {/* Strength info bar */}
          <hr className="krm-divider" />
          <div style={{ display: "flex", flexWrap: "wrap", gap: 12 }}>
            <div className="krm-stat-chip">Strength loss: <span style={{ color: T.accentRed }}>{knot.strengthReduction}%</span></div>
            <div className="krm-stat-chip">Retains: <span style={{ color: knot.color }}>{100 - knot.strengthReduction}% MBS</span></div>
            <div className="krm-stat-chip">Category: <span>{knot.category}</span></div>
          </div>
        </CollapsibleCard>
      ))}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────

function RopesSection({ searchQ }) {
  const filtered = ROPES.filter(
    (r) => !searchQ || r.name.toLowerCase().includes(searchQ) || r.id.includes(searchQ)
  );

  return (
    <div>
      <div className="krm-section-title">Rope <span>Identification Guide</span></div>
      <div className="krm-section-desc">
        Complete guide to all rope types used in modern maritime operations — properties, identification, strengths, and limitations.
      </div>

      <div className="krm-warning">
        <strong>Critical:</strong> Never substitute one rope type for another in safety-critical applications without engineering approval. Properties vary enormously between materials.
      </div>

      {/* Comparison table */}
      <div style={{ overflowX: "auto", marginBottom: 24 }}>
        <table className="krm-table">
          <thead>
            <tr>
              <th>Material</th>
              <th>Floats</th>
              <th>MBS</th>
              <th>Stretch</th>
              <th>UV Resist.</th>
              <th>Abrasion</th>
            </tr>
          </thead>
          <tbody>
            {ROPES.map((r) => (
              <tr key={r.id}>
                <td style={{ color: r.color }}>{r.name}</td>
                <td>{r.floats ? "✅ Yes" : "❌ No"}</td>
                <td>{r.mbs}</td>
                <td>{r.stretch}</td>
                <td>{r.uv}</td>
                <td>{r.abrasion}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {filtered.map((rope) => (
        <CollapsibleCard key={rope.id} title={rope.name} badge={rope.floats ? "FLOATS" : "SINKS"} badgeClass={rope.floats ? "green" : ""}>
          <div>
            {/* Colour swatch */}
            <div style={{ background: rope.gradient, height: 16, borderRadius: 8, marginBottom: 16, boxShadow: `0 0 20px ${rope.color}30` }} />

            <div className="krm-grid-2" style={{ gap: 20, marginBottom: 16 }}>
              <div>
                <div className="krm-label">Appearance</div>
                <div style={{ color: T.textSecondary, fontSize: 14, lineHeight: 1.6, marginBottom: 12 }}>{rope.appearance}</div>

                <StrengthBar value={rope.mbsValue} color={rope.color} label="Relative MBS" />
                <StrengthBar value={rope.stretchValue} color="#f4a820" label="Stretch Capacity" />
                <StrengthBar value={rope.uvValue} color="#2ec4b6" label="UV Resistance" />
              </div>

              <div>
                <div className="krm-label">Key Characteristics</div>
                <ul style={{ paddingLeft: 0, listStyle: "none" }}>
                  {rope.characteristics.map((c, i) => (
                    <li key={i} style={{ color: T.textSecondary, fontSize: 13, padding: "4px 0", borderBottom: `1px solid ${T.border}`, lineHeight: 1.5 }}>
                      <span style={{ color: rope.color, marginRight: 8 }}>▸</span>{c}
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            <div className="krm-grid-2" style={{ gap: 16 }}>
              <div>
                <div className="krm-label">Typical Shipboard Use</div>
                <div style={{ color: T.textSecondary, fontSize: 14, lineHeight: 1.6 }}>{rope.shipboardUse}</div>
              </div>
              <div>
                <div className="krm-label">Maintenance Notes</div>
                <div style={{ color: T.textSecondary, fontSize: 14, lineHeight: 1.6 }}>{rope.maintenance}</div>
              </div>
            </div>
          </div>
        </CollapsibleCard>
      ))}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────

function WireRopeSection() {
  const [dia, setDia] = useState("");
  const [construction, setConstruction] = useState("6×19");
  const [swl, setSwl] = useState(null);
  const [mbs, setMbs] = useState(null);

  const calcSWL = () => {
    const d = parseFloat(dia);
    if (!d || d <= 0) return;
    // Standard formula: MBS (tonnes) ≈ d² × 0.4 for 6×19 IPS
    const factors = { "6×7": 0.45, "6×19": 0.40, "6×36": 0.37, "8×19": 0.38, "19×7": 0.41, "35×7": 0.35 };
    const factor = factors[construction] || 0.40;
    const mbsCalc = Math.round(d * d * factor * 10) / 10;
    const swlCalc = Math.round((mbsCalc / 5) * 10) / 10; // SF = 5
    setMbs(mbsCalc);
    setSwl(swlCalc);
  };

  return (
    <div>
      <div className="krm-section-title">Wire <span>Rope Guide</span></div>
      <div className="krm-section-desc">
        Construction types, SWL calculations, inspection criteria, lubrication guide, rejection standards, and broken wire limits.
      </div>

      {/* Construction types */}
      <CollapsibleCard title="Wire Rope Construction" badge="Reference" defaultOpen>
        <div style={{ overflowX: "auto" }}>
          <table className="krm-table">
            <thead>
              <tr>
                <th>Construction</th>
                <th>Total Wires</th>
                <th>Flexibility</th>
                <th>Min. Bend Radius</th>
                <th>Primary Use</th>
              </tr>
            </thead>
            <tbody>
              {WIRE_CONSTRUCTIONS.map((w) => (
                <tr key={w.code}>
                  <td style={{ fontFamily: "'JetBrains Mono', monospace", color: T.accent }}>{w.code}</td>
                  <td>{w.wires}</td>
                  <td>{w.flexibility}</td>
                  <td>{w.bendRadius}</td>
                  <td>{w.use}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="krm-tip" style={{ marginTop: 16 }}>
          <strong>Construction Reading:</strong> The first number = number of strands. The second = wires per strand. A 6×19 wire has 6 strands × 19 wires = 114 wires total. More wires = more flexible but less abrasion resistant.
        </div>

        <div style={{ marginTop: 16 }}>
          <div className="krm-label">Core Types</div>
          <div className="krm-grid-3" style={{ marginTop: 10 }}>
            {[
              { name: "FC — Fibre Core", desc: "Natural or synthetic fibre. Maximises flexibility and lubricant retention. Not suitable for crushing loads or high temperatures." },
              { name: "IWRC — Ind. Wire Rope Core", desc: "Wire rope within wire rope. Increases MBS by ~7.5%. Better crush resistance. Stiffer than FC." },
              { name: "WSC — Wire Strand Core", desc: "A single wire strand as core. High resistance to crushing. Used in rotation-resistant and elevator ropes." },
            ].map((c) => (
              <div key={c.name} style={{ background: T.bgPanel, border: `1px solid ${T.border}`, borderRadius: 8, padding: 12 }}>
                <div style={{ fontFamily: "'Teko', sans-serif", fontSize: 16, color: T.accent, marginBottom: 6 }}>{c.name}</div>
                <div style={{ fontSize: 13, color: T.textSecondary, lineHeight: 1.5 }}>{c.desc}</div>
              </div>
            ))}
          </div>
        </div>
      </CollapsibleCard>

      {/* SWL Calculator */}
      <CollapsibleCard title="SWL Calculator" badge="Interactive" badgeClass="gold" defaultOpen>
        <div className="krm-grid-2" style={{ gap: 20 }}>
          <div className="krm-calc-wrap">
            <div className="krm-input-group">
              <label>Wire Diameter (mm)</label>
              <input className="krm-input" type="number" min="1" max="120" value={dia} onChange={(e) => setDia(e.target.value)} placeholder="e.g. 26" />
            </div>
            <div className="krm-input-group">
              <label>Construction Type</label>
              <select className="krm-select" value={construction} onChange={(e) => setConstruction(e.target.value)}>
                {WIRE_CONSTRUCTIONS.map((w) => (
                  <option key={w.code} value={w.code}>{w.code} — {w.flexibility}</option>
                ))}
              </select>
            </div>
            <button className="krm-btn" onClick={calcSWL}>Calculate SWL</button>

            {swl !== null && (
              <div className="krm-result-box">
                <div className="krm-grid-2">
                  <div>
                    <div className="krm-label">Min. Breaking Strength</div>
                    <div className="krm-result-num">{mbs}</div>
                    <div className="krm-result-unit">Tonnes (approx.)</div>
                  </div>
                  <div>
                    <div className="krm-label">Safe Working Load (SF:5)</div>
                    <div className="krm-result-num" style={{ color: T.accentGreen }}>{swl}</div>
                    <div className="krm-result-unit">Tonnes (approx.)</div>
                  </div>
                </div>
                <div className="krm-warning" style={{ marginTop: 12 }}>
                  <strong>Important:</strong> These are approximate values based on standard formulas for IPS-grade wire. Always verify against manufacturer's certificate. Apply appropriate safety factors for dynamic loads (SF minimum 5:1 for running rigging, 6:1 for lifting).
                </div>
              </div>
            )}
          </div>

          <div>
            <div className="krm-label" style={{ marginBottom: 10 }}>SWL Formula Reference</div>
            {[
              { name: "Simplified formula (IPS)", formula: "SWL (t) = d² ÷ (5 × construction factor)" },
              { name: "MBS from diameter", formula: "MBS (t) ≈ d² × 0.40 (for 6×19 IPS)" },
              { name: "SWL from MBS", formula: "SWL = MBS ÷ Safety Factor" },
              { name: "SF for lifting", formula: "Minimum SF = 6:1 (offshore: 10:1)" },
              { name: "SF for mooring", formula: "Minimum SF = 3:1 (check vessel SMS)" },
            ].map((f) => (
              <div key={f.name} className="krm-info-row">
                <div className="krm-info-label">{f.name}</div>
                <div className="krm-info-val" style={{ fontFamily: "'JetBrains Mono', monospace", color: T.accent, fontSize: 13 }}>{f.formula}</div>
              </div>
            ))}

            <div className="krm-tip" style={{ marginTop: 12 }}>
              <strong>Note on Rope Slings:</strong> When wire is used in a sling configuration, apply sling angle factors: 0° = 1.0×, 30° = 0.87×, 45° = 0.71×, 60° = 0.50×. Always use the lesser value.
            </div>
          </div>
        </div>
      </CollapsibleCard>

      {/* Inspection */}
      <CollapsibleCard title="Inspection Criteria & Rejection Standards" badge="Critical" badgeClass="red">
        <div className="krm-warning">
          <strong>Mandatory:</strong> Wire rope must be inspected before every lift and at minimum weekly during intensive operations. Document all inspections in the rope register.
        </div>
        <div style={{ overflowX: "auto" }}>
          <table className="krm-table">
            <thead>
              <tr>
                <th>Rejection Criterion</th>
                <th>Limit / Threshold</th>
              </tr>
            </thead>
            <tbody>
              {WIRE_REJECTION.map((r) => (
                <tr key={r.criterion}>
                  <td>{r.criterion}</td>
                  <td style={{ color: T.accentRed, fontFamily: "'JetBrains Mono', monospace", fontSize: 12 }}>{r.limit}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </CollapsibleCard>

      {/* Lubrication Guide */}
      <CollapsibleCard title="Wire Rope Lubrication Guide" badge="Maintenance">
        <div className="krm-grid-2" style={{ gap: 20 }}>
          <div>
            <div className="krm-label" style={{ marginBottom: 10 }}>Why Lubricate?</div>
            {[
              "Prevents internal wire corrosion — the most common failure mode",
              "Reduces inter-wire friction, decreasing fatigue",
              "Protects fibre core from drying out",
              "Seals out moisture and salt water",
              "Provides visual aid for inspection (shiny = fresh lubricant, dull/dry = inspect closely)",
            ].map((r, i) => (
              <div key={i} style={{ padding: "5px 0 5px 16px", borderLeft: `2px solid ${T.accentGreen}`, marginBottom: 6, fontSize: 13, color: T.textSecondary }}>
                {r}
              </div>
            ))}
          </div>
          <div>
            <div className="krm-label" style={{ marginBottom: 10 }}>Lubrication Methods</div>
            {[
              { m: "Drip / Flood", d: "Applied at a sheave or drum. Good for running ropes." },
              { m: "Pressure injection", d: "Specialized fitting forces lubricant into core. Best for large diameter wire." },
              { m: "Brush application", d: "Manual — good for stationary sections and end terminations." },
              { m: "Penetrating spray", d: "Good for reaching internal strands. Follow with heavier grease for protection." },
            ].map((l) => (
              <div key={l.m} className="krm-info-row">
                <div className="krm-info-label">{l.m}</div>
                <div className="krm-info-val">{l.d}</div>
              </div>
            ))}
            <div className="krm-warning" style={{ marginTop: 12 }}>
              Never apply incompatible lubricants over existing grease. Clean wire thoroughly before re-lubricating if product is unknown.
            </div>
          </div>
        </div>
      </CollapsibleCard>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────

function InspectionSection() {
  return (
    <div>
      <div className="krm-section-title">Mooring Rope <span>Inspection</span></div>
      <div className="krm-section-desc">
        Comprehensive damage recognition guide covering all failure modes in synthetic and wire mooring ropes.
      </div>

      <div className="krm-warning">
        <strong>SOLAS / ISM Requirement:</strong> All mooring equipment must be maintained in a state ready for immediate use. Defective ropes must be replaced before the next mooring operation.
      </div>

      {DAMAGE_TYPES.map((d) => (
        <CollapsibleCard
          key={d.type}
          title={d.type}
          badge={d.severity.toUpperCase()}
          badgeClass={d.severity === "critical" ? "red" : d.severity === "high" ? "gold" : ""}
        >
          <div className="krm-grid-2" style={{ gap: 20 }}>
            <div>
              <div style={{
                borderLeft: `4px solid ${d.color}`,
                paddingLeft: 12,
                marginBottom: 14,
              }}>
                <div style={{ fontSize: 14, color: T.textSecondary, lineHeight: 1.7 }}>{d.description}</div>
              </div>

              <div className="krm-label" style={{ marginBottom: 8 }}>Visual Indicators</div>
              <ul style={{ paddingLeft: 0, listStyle: "none" }}>
                {d.indicators.map((ind, i) => (
                  <li key={i} style={{ padding: "5px 0", fontSize: 13, color: T.textSecondary, borderBottom: `1px solid ${T.border}`, display: "flex", alignItems: "flex-start", gap: 8 }}>
                    <span style={{ color: d.color, flexShrink: 0 }}>●</span>
                    {ind}
                  </li>
                ))}
              </ul>
            </div>

            <div>
              <div className="krm-label" style={{ marginBottom: 8 }}>Required Action</div>
              <div className={d.severity === "critical" ? "krm-warning" : "krm-tip"}>
                {d.action}
              </div>

              <div style={{ marginTop: 16 }}>
                <div className="krm-label" style={{ marginBottom: 8 }}>Severity</div>
                <div className={`krm-badge ${d.severity === "critical" ? "red" : d.severity === "high" ? "gold" : "green"}`} style={{ fontSize: 14, padding: "6px 16px" }}>
                  {d.severity.toUpperCase()} — {d.severity === "critical" ? "Remove from service immediately" : d.severity === "high" ? "Inspect closely, consider replacement" : "Monitor and schedule replacement"}
                </div>
              </div>
            </div>
          </div>
        </CollapsibleCard>
      ))}

      {/* Inspection checklist */}
      <CollapsibleCard title="Pre-Mooring Inspection Checklist" badge="Procedure" badgeClass="green" defaultOpen>
        <div className="krm-grid-2" style={{ gap: 20 }}>
          <div>
            <div className="krm-label" style={{ marginBottom: 10 }}>Visual Checks</div>
            {[
              "Check overall length and diameter — any reduction noted",
              "Run hands along rope length feeling for lumps, flat spots, or hard sections",
              "Inspect eye splices and thimbles for wear and deformation",
              "Check fairlead points for chafing damage",
              "Look for discolouration, glazing, or chemical staining",
              "Check for broken or protruding strands",
              "Inspect for kinks or permanent deformation",
              "Check end terminations and thimbles for security",
            ].map((c, i) => (
              <div key={i} style={{ display: "flex", gap: 10, alignItems: "flex-start", padding: "7px 0", borderBottom: `1px solid ${T.border}`, fontSize: 13, color: T.textSecondary }}>
                <span style={{ color: T.accentGreen, flexShrink: 0, fontSize: 16 }}>□</span>
                {c}
              </div>
            ))}
          </div>
          <div>
            <div className="krm-label" style={{ marginBottom: 10 }}>Documentation Required</div>
            {[
              "Record rope age and installation date",
              "Note previous test loads and certification",
              "Document number of previous mooring operations",
              "Record any incidents (shock loads, chafe, chemical exposure)",
              "Log inspection findings in equipment register",
              "Note weather conditions at time of inspection",
              "Confirm rope is appropriate grade for planned operation",
              "Verify MBS adequate for expected loads",
            ].map((c, i) => (
              <div key={i} style={{ display: "flex", gap: 10, alignItems: "flex-start", padding: "7px 0", borderBottom: `1px solid ${T.border}`, fontSize: 13, color: T.textSecondary }}>
                <span style={{ color: T.accent, flexShrink: 0, fontSize: 16 }}>□</span>
                {c}
              </div>
            ))}
          </div>
        </div>
      </CollapsibleCard>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────

function SplicingSection() {
  return (
    <div>
      <div className="krm-section-title">Rope <span>Splicing Guide</span></div>
      <div className="krm-section-desc">
        Complete illustrated guide to the four essential maritime splices — eye splice, back splice, short splice, and long splice.
      </div>

      <div className="krm-success">
        <strong>Why splice instead of knot?</strong> A splice retains 80–95% of rope MBS. A knot retains only 55–70%. For permanent applications, a splice is always the professional choice.
      </div>

      <div className="krm-tip" style={{ marginBottom: 20 }}>
        <strong>Tools needed:</strong> Fid or marlin spike (sized to rope diameter), seizing twine, sharp knife, electrical tape, and optionally a rope vice or clamp. Use a fid one size smaller than the rope for tight, neat tucks.
      </div>

      {SPLICES.map((splice) => (
        <CollapsibleCard
          key={splice.name}
          title={splice.name}
          badge={`Retains ${splice.strengthRetention} MBS`}
          badgeClass="green"
        >
          <div className="krm-grid-2" style={{ gap: 20, marginBottom: 16 }}>
            <div>
              <div className="krm-label">Purpose</div>
              <div style={{ color: T.textSecondary, fontSize: 14, lineHeight: 1.6, marginBottom: 12 }}>{splice.purpose}</div>

              <div className="krm-label">Primary Shipboard Applications</div>
              <div style={{ color: T.textSecondary, fontSize: 14, lineHeight: 1.6, marginBottom: 12 }}>{splice.use}</div>

              <div className="krm-grid-2" style={{ gap: 8, marginTop: 8 }}>
                <div className="krm-stat-chip">Strength: <span style={{ color: T.accentGreen }}>{splice.strengthRetention}</span></div>
                <div className="krm-stat-chip">Difficulty: <span>{splice.difficulty}</span></div>
              </div>
            </div>

            <div>
              {/* Splice visual indicator */}
              <div style={{ background: T.navy, border: `1px solid ${T.border}`, borderRadius: 10, padding: 16, marginBottom: 12 }}>
                <svg width="100%" height="80" viewBox="0 0 260 80">
                  {splice.name === "Eye Splice" && (
                    <>
                      <path d="M 10 40 L 80 40 Q 80 40 80 40 Q 120 40 130 20 Q 140 0 160 20 Q 180 40 160 55 Q 140 70 120 55 Q 105 45 110 35" fill="none" stroke={T.accent} strokeWidth="5" strokeLinecap="round" />
                      <path d="M 10 40 L 80 40" stroke={T.accent} strokeWidth="5" strokeLinecap="round" opacity="0.5" />
                      <text x="20" y="65" fill={T.textMuted} fontSize="10" fontFamily="'JetBrains Mono', monospace">Eye Splice — Permanent Loop</text>
                    </>
                  )}
                  {splice.name === "Back Splice" && (
                    <>
                      <path d="M 60 40 L 220 40" stroke={T.accentGold} strokeWidth="5" strokeLinecap="round" />
                      <circle cx="60" cy="40" r="18" fill="none" stroke={T.accentGold} strokeWidth="5" />
                      <text x="60" y="70" fill={T.textMuted} fontSize="10" fontFamily="'JetBrains Mono', monospace">Back Splice — Prevents Unlaying</text>
                    </>
                  )}
                  {splice.name === "Short Splice" && (
                    <>
                      <path d="M 10 35 L 110 35" stroke={T.accentGreen} strokeWidth="5" strokeLinecap="round" />
                      <path d="M 150 35 L 250 35" stroke={T.accentGreen} strokeWidth="5" strokeLinecap="round" />
                      <rect x="100" y="25" width="60" height="20" rx="5" fill={T.accentGreen} opacity="0.3" stroke={T.accentGreen} strokeWidth="1.5" />
                      <text x="55" y="62" fill={T.textMuted} fontSize="10" fontFamily="'JetBrains Mono', monospace">Short Splice — Joins Two Ropes</text>
                    </>
                  )}
                  {splice.name === "Long Splice" && (
                    <>
                      <path d="M 10 40 L 250 40" stroke={T.accent} strokeWidth="4" strokeLinecap="round" />
                      <path d="M 60 35 Q 130 25 200 35" stroke={T.accentGold} strokeWidth="3" strokeLinecap="round" fill="none" />
                      <path d="M 60 45 Q 130 55 200 45" stroke={T.accentGold} strokeWidth="3" strokeLinecap="round" fill="none" />
                      <text x="40" y="68" fill={T.textMuted} fontSize="10" fontFamily="'JetBrains Mono', monospace">Long Splice — Same Diameter Throughout</text>
                    </>
                  )}
                </svg>
              </div>
            </div>
          </div>

          <div className="krm-label" style={{ marginBottom: 12 }}>Detailed Step-by-Step Instructions</div>
          {splice.steps.map((step, i) => (
            <div key={i} className="krm-splice-step">
              <div className="krm-splice-num">{i + 1}</div>
              <div>
                <div style={{ fontFamily: "'Teko', sans-serif", fontSize: 17, color: T.textPrimary, marginBottom: 4, textTransform: "uppercase", letterSpacing: "0.04em" }}>
                  {step.title}
                </div>
                <div style={{ fontSize: 14, color: T.textSecondary, lineHeight: 1.6 }}>{step.detail}</div>
              </div>
            </div>
          ))}
        </CollapsibleCard>
      ))}

      {/* HMPE splicing note */}
      <div className="krm-warning" style={{ marginTop: 16 }}>
        <strong>HMPE / Dyneema Splicing:</strong> Standard splicing techniques do NOT work for HMPE ropes. Due to the slippery fibre surface, a minimum of 72 tucks (buried splice) is required, following manufacturer's specific instructions. Always use only manufacturer-approved splice patterns for HMPE mooring tails.
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────

function MooringSection() {
  return (
    <div>
      <div className="krm-section-title">Mooring <span>Operations</span></div>
      <div className="krm-section-desc">
        Line identification, station setup, arrangement principles, and operational guidance for all mooring configurations.
      </div>

      {/* Line identification */}
      <CollapsibleCard title="Mooring Line Identification" badge="Reference" defaultOpen>
        <div className="krm-grid-2" style={{ gap: 16 }}>
          {MOORING_LINES.map((line) => (
            <div key={line.name} style={{ background: T.bgPanel, border: `1px solid ${T.border}`, borderRadius: 10, padding: 16, borderLeft: `4px solid ${line.color}` }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
                <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 13, padding: "3px 8px", borderRadius: 4, background: `${line.color}20`, color: line.color, border: `1px solid ${line.color}40` }}>{line.abbrev}</span>
                <span style={{ fontFamily: "'Teko', sans-serif", fontSize: 20, fontWeight: 600, color: T.textPrimary, textTransform: "uppercase", letterSpacing: "0.05em" }}>{line.name}</span>
                <span className="krm-badge" style={{ marginLeft: "auto" }}>{line.tension}</span>
              </div>
              <div style={{ fontSize: 13, color: T.textSecondary, lineHeight: 1.6, marginBottom: 10 }}>{line.description}</div>
              <div style={{ fontSize: 12, color: line.color, borderTop: `1px solid ${T.border}`, paddingTop: 8 }}>{line.critical}</div>
            </div>
          ))}
        </div>
      </CollapsibleCard>

      {/* Mooring arrangement diagram */}
      <CollapsibleCard title="Standard Mooring Arrangement Diagram" badge="Diagram" defaultOpen>
        <div className="krm-mooring-diagram">
          <svg width="100%" viewBox="0 0 600 300" style={{ display: "block" }}>
            {/* Dock */}
            <rect x="0" y="240" width="600" height="60" fill="#1a2840" stroke={T.border} strokeWidth="1" />
            <text x="300" y="275" textAnchor="middle" fill={T.textMuted} fontSize="14" fontFamily="'Teko', sans-serif" letterSpacing="3">BERTH / QUAYSIDE</text>

            {/* Bollards */}
            {[50, 150, 300, 450, 550].map((x) => (
              <g key={x}>
                <rect x={x - 8} y="228" width="16" height="18" rx="2" fill="#2a4a6b" stroke={T.borderBright} strokeWidth="1" />
                <circle cx={x} cy="228" r="7" fill="#2a4a6b" stroke={T.borderBright} strokeWidth="1" />
              </g>
            ))}

            {/* Ship hull */}
            <rect x="80" y="80" width="440" height="150" rx="8" fill={T.navy} stroke={T.borderBright} strokeWidth="1.5" />
            {/* Bridge */}
            <rect x="240" y="50" width="120" height="40" rx="4" fill={T.navyLight} stroke={T.border} strokeWidth="1" />
            <text x="300" y="76" textAnchor="middle" fill={T.textMuted} fontSize="11" fontFamily="'Teko', sans-serif" letterSpacing="2">BRIDGE</text>

            {/* Bow and stern labels */}
            <text x="100" y="160" textAnchor="middle" fill={T.textMuted} fontSize="11" fontFamily="'Teko', sans-serif" letterSpacing="1">BOW</text>
            <text x="500" y="160" textAnchor="middle" fill={T.textMuted} fontSize="11" fontFamily="'Teko', sans-serif" letterSpacing="1">STERN</text>

            {/* Mooring lines */}
            {/* Head line */}
            <line x1="100" y1="230" x2="50" y2="240" stroke="#00b4d8" strokeWidth="2.5" strokeDasharray="0" />
            <text x="58" y="222" fill="#00b4d8" fontSize="10" fontFamily="'JetBrains Mono', monospace">HL</text>

            {/* Stern line */}
            <line x1="500" y1="230" x2="550" y2="240" stroke="#f4a820" strokeWidth="2.5" />
            <text x="535" y="222" fill="#f4a820" fontSize="10" fontFamily="'JetBrains Mono', monospace">SL</text>

            {/* Forward spring */}
            <line x1="150" y1="230" x2="450" y2="240" stroke="#2ec4b6" strokeWidth="2.5" strokeDasharray="5,3" />
            <text x="270" y="222" fill="#2ec4b6" fontSize="10" fontFamily="'JetBrains Mono', monospace">FSP</text>

            {/* Aft spring */}
            <line x1="450" y1="230" x2="150" y2="240" stroke="#a855f7" strokeWidth="2.5" strokeDasharray="3,3" />
            <text x="310" y="238" fill="#a855f7" fontSize="10" fontFamily="'JetBrains Mono', monospace">ASP</text>

            {/* Breast lines */}
            <line x1="200" y1="230" x2="200" y2="240" stroke="#e63946" strokeWidth="2.5" />
            <line x1="400" y1="230" x2="400" y2="240" stroke="#e63946" strokeWidth="2.5" />
            <text x="205" y="222" fill="#e63946" fontSize="10" fontFamily="'JetBrains Mono', monospace">BL</text>
            <text x="405" y="222" fill="#e63946" fontSize="10" fontFamily="'JetBrains Mono', monospace">BL</text>
          </svg>

          {/* Legend */}
          <div style={{ display: "flex", flexWrap: "wrap", gap: 12, marginTop: 10 }}>
            {MOORING_LINES.slice(0, 5).map((l) => (
              <div key={l.abbrev} style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, color: l.color }}>
                <div style={{ width: 20, height: 2, background: l.color }} />
                <span style={{ fontFamily: "'JetBrains Mono', monospace" }}>{l.abbrev}</span>
                <span style={{ color: T.textMuted }}>— {l.name}</span>
              </div>
            ))}
          </div>
        </div>
      </CollapsibleCard>

      {/* Station setup */}
      <CollapsibleCard title="Forward Station Setup" badge="Procedure">
        <ol className="krm-steps">
          {[
            "Ensure all mooring lines are properly coiled, faked-down, or on the drum ready for running.",
            "Inspect all fairleads, Panama chocks, and bollards for damage or fouling.",
            "Check mooring winch brakes are set and functioning. Ensure winch power is available.",
            "Don correct PPE: hard hat, safety boots, high-visibility vest, gloves — no loose clothing.",
            "Position crew: winch operator at winch, line handler at fairlead, officer overseeing.",
            "Rig heaving line at forward chock — weighted end ready for throwing.",
            "Prepare forward head line and forward spring on respective winch drums.",
            "Establish communication with bridge — confirm ready for arrival.",
            "Keep all personnel clear of lines, particularly spring lines under tension.",
            "Do NOT stand in bights or in snap-back zones of any tensioned line.",
          ].map((s, i) => <li key={i}>{s}</li>)}
        </ol>
      </CollapsibleCard>

      <CollapsibleCard title="Aft Station Setup" badge="Procedure">
        <ol className="krm-steps">
          {[
            "Mirror the forward station setup procedures for the aft mooring deck.",
            "Pay particular attention to tug line arrangements — stern tugs often connect here.",
            "The aft spring (preventing ahead movement) is often the highest-loaded line at a stern station.",
            "Ensure stern lead is clear and the roller fairlead is lubricated and turning freely.",
            "Prepare stern line and aft spring on drums before arrival.",
            "Station an experienced officer at the stern — communication with bridge is critical.",
            "Keep the stern free of non-essential personnel during the final approach.",
            "Confirm tug arrangement with pilot before connecting tug lines.",
            "After vessel is secured: tend lines as the vessel settles. Vessel weight shifts as cargo loads.",
            "Maintain anchor watch principles: continuously assess line tensions and weather changes.",
          ].map((s, i) => <li key={i}>{s}</li>)}
        </ol>
      </CollapsibleCard>

      <CollapsibleCard title="Tug Line Arrangement" badge="Advanced">
        <div className="krm-grid-2" style={{ gap: 20 }}>
          <div>
            <div className="krm-label" style={{ marginBottom: 10 }}>Tug Line Positions</div>
            {[
              { pos: "Bow Tug (Pushing)", desc: "Tug pushes directly against the bow without a line. Maximum control at low speed. Common for large vessels." },
              { pos: "Bow Tug (Pulling)", desc: "Tug connected at the bow via a tow line through a Panama chock. Pulls the bow toward or away from the berth." },
              { pos: "Hip Tug", desc: "Tug made fast alongside the vessel, forward or aft. Provides direct push/pull control. Close-in work." },
              { pos: "Stern Tug", desc: "Connected at the stern. Controls stern swing during arrival and departure. Critical for tight berths." },
              { pos: "Escort Tug", desc: "Follows astern with wire connected. Used in restricted channels for emergency braking or steering assistance." },
            ].map((t) => (
              <div key={t.pos} className="krm-info-row">
                <div className="krm-info-label" style={{ width: 160 }}>{t.pos}</div>
                <div className="krm-info-val">{t.desc}</div>
              </div>
            ))}
          </div>
          <div>
            <div className="krm-label" style={{ marginBottom: 10 }}>Tug Line Safety</div>
            <div className="krm-warning">
              <strong>Extreme hazard:</strong> Tug lines carry the highest loads in any mooring system. Always rig using HMPE or heavy polyester. Never use damaged tug lines. Maintain a safe distance from any tug line under load.
            </div>
            {[
              "Tug lines must be connected through dedicated Panama leads — never around bitts or stanchions.",
              "The tug master controls tug line length — communicate clearly via VHF.",
              "When letting go a tug: ALWAYS agree signal before releasing. Throw off the eye, not the bitter end.",
              "Keep a sharp knife or axe accessible at tug leads for emergency release.",
              "Tug line chafe against hull, fairlead edges, or ramp corners causes rapid wear.",
            ].map((t, i) => (
              <div key={i} style={{ fontSize: 13, color: T.textSecondary, padding: "5px 0 5px 14px", borderLeft: `2px solid ${T.accentRed}`, marginBottom: 5 }}>{t}</div>
            ))}
          </div>
        </div>
      </CollapsibleCard>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────

function SnapbackSection() {
  return (
    <div>
      <div className="krm-section-title">Snap-back <span>Safety</span></div>
      <div className="krm-section-desc">
        The single most dangerous hazard on a mooring deck. Understand snap-back physics, danger zones, and safe positioning.
      </div>

      <div className="krm-warning" style={{ borderLeft: `6px solid ${T.accentRed}`, fontSize: 15 }}>
        <strong>⚠️ CRITICAL SAFETY WARNING:</strong> Mooring line snap-back has killed and seriously injured seafarers worldwide. It is the number one cause of serious injury and fatality in port operations. Every person on a mooring deck MUST understand snap-back danger before handling lines.
      </div>

      {/* Physics explainer */}
      <CollapsibleCard title="What is Snap-back?" badge="Essential Reading" defaultOpen>
        <div className="krm-grid-2" style={{ gap: 20 }}>
          <div>
            <div style={{ fontSize: 14, color: T.textSecondary, lineHeight: 1.8 }}>
              When a rope under tension parts (breaks), the elastic energy stored in the stretched rope is released instantaneously. The rope recoils — or "snaps back" — with enormous force and speed, moving faster than the human eye can follow and far too fast to avoid.
              <br /><br />
              The snap-back path follows the line of the rope. The snap-back zone is the triangular area between: (1) the point of parting, (2) the last lead or fairlead, and (3) the bitts or winch drum where the rope is secured. This entire triangle is potentially fatal.
              <br /><br />
              The energy released is proportional to: rope diameter², tension², rope length, and the elastic modulus of the material. A 64mm polyester mooring tail at 25% of its MBS stores approximately 500 kJ of energy — equivalent to being struck by a car at 60 km/h.
            </div>
          </div>
          <div>
            {/* Snap-back zone diagram */}
            <div style={{ background: T.navy, border: `1px solid ${T.border}`, borderRadius: 10, padding: 16 }}>
              <svg width="100%" viewBox="0 0 260 200">
                {/* Snap-back triangle */}
                <polygon points="30,170 130,170 80,60" fill="rgba(230,57,70,0.15)" stroke={T.accentRed} strokeWidth="1.5" strokeDasharray="5,3" />
                <text x="80" y="130" textAnchor="middle" fill={T.accentRed} fontSize="10" fontFamily="'Teko', sans-serif" letterSpacing="2">DANGER ZONE</text>

                {/* Bollard */}
                <circle cx="30" cy="170" r="10" fill={T.navyLight} stroke={T.borderBright} strokeWidth="2" />
                <text x="30" y="192" textAnchor="middle" fill={T.textMuted} fontSize="8" fontFamily="'JetBrains Mono', monospace">BITT</text>

                {/* Fairlead */}
                <circle cx="130" cy="170" r="8" fill={T.navyLight} stroke={T.borderBright} strokeWidth="2" />
                <text x="130" y="192" textAnchor="middle" fill={T.textMuted} fontSize="8" fontFamily="'JetBrains Mono', monospace">LEAD</text>

                {/* Break point */}
                <circle cx="80" cy="60" r="6" fill={T.accentRed} opacity="0.7" />
                <text x="80" y="50" textAnchor="middle" fill={T.accentRed} fontSize="9" fontFamily="'JetBrains Mono', monospace">FAILURE POINT</text>

                {/* Safe zone */}
                <polygon points="180,60 240,100 240,180 180,180" fill="rgba(46,196,182,0.1)" stroke={T.accentGreen} strokeWidth="1" strokeDasharray="4,3" />
                <text x="210" y="130" textAnchor="middle" fill={T.accentGreen} fontSize="9" fontFamily="'Teko', sans-serif" letterSpacing="1">SAFE</text>
                <text x="210" y="145" textAnchor="middle" fill={T.accentGreen} fontSize="9" fontFamily="'Teko', sans-serif" letterSpacing="1">ZONE</text>

                {/* Person icon (danger zone) */}
                <circle cx="75" cy="135" r="6" fill={T.accentRed} opacity="0.8" />
                <line x1="75" y1="141" x2="75" y2="160" stroke={T.accentRed} strokeWidth="2" opacity="0.8" />
                <text x="75" y="175" textAnchor="middle" fill={T.accentRed} fontSize="8">✗</text>

                {/* Person icon (safe zone) */}
                <circle cx="210" cy="105" r="6" fill={T.accentGreen} opacity="0.8" />
                <line x1="210" y1="111" x2="210" y2="130" stroke={T.accentGreen} strokeWidth="2" opacity="0.8" />
                <text x="210" y="145" textAnchor="middle" fill={T.accentGreen} fontSize="8">✓</text>
              </svg>
            </div>
            <div className="krm-label" style={{ textAlign: "center", marginTop: 8 }}>Red = snap-back zone | Green = safe standing</div>
          </div>
        </div>
      </CollapsibleCard>

      {/* Key facts */}
      <CollapsibleCard title="Critical Snap-back Facts" badge="Must Know" badgeClass="red" defaultOpen>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
          {SNAPBACK_FACTS.map((f, i) => (
            <div key={i} style={{ background: "rgba(230,57,70,0.06)", border: "1px solid rgba(230,57,70,0.2)", borderRadius: 8, padding: 12 }}>
              <div style={{ display: "flex", gap: 10, alignItems: "flex-start" }}>
                <span style={{ color: T.accentRed, fontSize: 18, flexShrink: 0 }}>⚡</span>
                <div style={{ fontSize: 13, color: T.textSecondary, lineHeight: 1.6 }}>{f.fact}</div>
              </div>
            </div>
          ))}
        </div>
      </CollapsibleCard>

      {/* Safe standing */}
      <CollapsibleCard title="Safe Standing Positions" badge="Procedure" badgeClass="green">
        <div className="krm-grid-2" style={{ gap: 20 }}>
          <div>
            <div className="krm-label" style={{ marginBottom: 10 }}>Always DO:</div>
            {[
              "Stand at the side of a line under tension, never directly behind or in front of it.",
              "Identify the snap-back triangle BEFORE any line is put under tension.",
              "Brief all mooring team members on snap-back zones before berthing/unberthing.",
              "Stand behind a substantial structure (winch body, mast, deck fitting) when attending tensioned lines.",
              "Keep full view of the entire line from your position at all times.",
              "Maintain communication with winch operator — agree signals for sudden tension changes.",
              "If unsure of your position — move further away and reassess.",
              "Wear a hard hat — small rope remnants travel at ballistic speed.",
            ].map((s, i) => (
              <div key={i} style={{ display: "flex", gap: 10, padding: "6px 0", borderBottom: `1px solid ${T.border}`, fontSize: 13, color: T.textSecondary }}>
                <span style={{ color: T.accentGreen, flexShrink: 0 }}>✓</span>{s}
              </div>
            ))}
          </div>
          <div>
            <div className="krm-label" style={{ marginBottom: 10 }}>Never DO:</div>
            {[
              "Stand in a bight of rope — ever. A bight collapsing will trap and crush.",
              "Step over a tensioned line.",
              "Stand directly behind a fairlead or chock with a line running through it.",
              "Work on deck while mooring operations are in progress without full PPE.",
              "Handle lines with loose clothing, ungloved hands on HMPE, or without safety footwear.",
              "Allow non-essential personnel on the mooring deck during operations.",
              "Stand directly in line with a tensioned rope — front, back, or along its path.",
              "Place hands or feet in a snap-back zone to adjust a line under load.",
            ].map((s, i) => (
              <div key={i} style={{ display: "flex", gap: 10, padding: "6px 0", borderBottom: `1px solid ${T.border}`, fontSize: 13, color: T.textSecondary }}>
                <span style={{ color: T.accentRed, flexShrink: 0 }}>✗</span>{s}
              </div>
            ))}
          </div>
        </div>
      </CollapsibleCard>

      {/* Case studies */}
      <CollapsibleCard title="Accident Case Studies" badge="Learning" badgeClass="red">
        <div className="krm-tip" style={{ marginBottom: 16 }}>
          These case studies are based on published maritime accident investigation reports. The purpose is to learn from real events to prevent recurrence.
        </div>
        {CASE_STUDIES.map((cs) => (
          <div key={cs.title} className="krm-case-study">
            <div className="krm-case-title">{cs.title}</div>
            <div style={{ display: "flex", gap: 16, marginBottom: 10, flexWrap: "wrap" }}>
              <span className="krm-badge">{cs.location}</span>
              <span className={`krm-badge ${cs.severity === "fatal" ? "red" : "gold"}`}>{cs.severity.toUpperCase()}</span>
            </div>
            <div style={{ fontSize: 13, color: T.textSecondary, lineHeight: 1.6, marginBottom: 12 }}>{cs.summary}</div>
            <div className="krm-label" style={{ marginBottom: 6 }}>Lessons Learned</div>
            <ul style={{ paddingLeft: 0, listStyle: "none" }}>
              {cs.lessons.map((l, i) => (
                <li key={i} style={{ fontSize: 13, color: T.textSecondary, padding: "5px 0 5px 14px", borderLeft: `2px solid ${cs.severity === "fatal" ? T.accentRed : T.accentGold}`, marginBottom: 5 }}>{l}</li>
              ))}
            </ul>
            <div style={{ fontSize: 13, color: T.textMuted, marginTop: 8, paddingTop: 8, borderTop: `1px solid ${T.border}` }}>
              <strong>Outcome:</strong> {cs.outcome}
            </div>
          </div>
        ))}
      </CollapsibleCard>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────

function SeamanshipSection() {
  return (
    <div>
      <div className="krm-section-title">Deck <span>Seamanship Reference</span></div>
      <div className="krm-section-desc">
        Traditional and modern deck seamanship skills — whipping, seizing, serving, coiling, heaving line preparation, and rope storage techniques.
      </div>

      <div className="krm-success">
        Good seamanship is the foundation of safe ship operations. These skills may seem traditional, but they are used on every vessel every day. A properly prepared mooring deck saves lives.
      </div>

      {SEAMANSHIP_SKILLS.map((skill) => (
        <CollapsibleCard key={skill.name} title={`${skill.icon} ${skill.name}`} badge="Skill">
          <div className="krm-grid-2" style={{ gap: 20 }}>
            <div>
              <div className="krm-label">Purpose</div>
              <div style={{ color: T.textSecondary, fontSize: 14, lineHeight: 1.6, marginBottom: 14 }}>{skill.purpose}</div>

              <div className="krm-label" style={{ marginBottom: 8 }}>Types / Methods</div>
              {skill.types.map((t) => (
                <div key={t.name} style={{ background: T.bgPanel, border: `1px solid ${T.border}`, borderRadius: 6, padding: 10, marginBottom: 8 }}>
                  <div style={{ fontFamily: "'Teko', sans-serif", fontSize: 16, color: T.accent, textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 3 }}>{t.name}</div>
                  <div style={{ fontSize: 13, color: T.textSecondary, lineHeight: 1.5 }}>{t.desc}</div>
                </div>
              ))}
            </div>

            <div>
              <div className="krm-label" style={{ marginBottom: 8 }}>Step-by-Step Instructions</div>
              <ol className="krm-steps">
                {skill.steps.map((s, i) => <li key={i}>{s}</li>)}
              </ol>
            </div>
          </div>
        </CollapsibleCard>
      ))}

      {/* Rope storage */}
      <CollapsibleCard title="🗄️ Rope Storage & Care" badge="Maintenance">
        <div className="krm-grid-2" style={{ gap: 20 }}>
          <div>
            <div className="krm-label" style={{ marginBottom: 10 }}>Storage Rules</div>
            {[
              { rule: "Dry before storage", detail: "Synthetic rope must be dry to prevent mildew (natural) and to avoid accelerated degradation at contact points." },
              { rule: "Avoid UV exposure", detail: "Store out of direct sunlight. Use deck lockers or rope bags. UV damages polypropylene the fastest — visible bleaching within 6 months." },
              { rule: "Keep off deck", detail: "Elevate stored ropes on grating or racks. Deck chemicals, oil, and bilge water accelerate degradation." },
              { rule: "Avoid heat sources", detail: "HMPE melts at 120°C. Store well away from steam pipes, machinery exhausts, and hot deck areas." },
              { rule: "Chemical separation", detail: "Keep ropes away from acids, alkalis, fuel, and solvents. Even small amounts can destroy a rope internally." },
              { rule: "Label and date", detail: "Mark each rope with material type, MBS, installation date, and last inspection date. Maintain a rope register." },
            ].map((r) => (
              <div key={r.rule} className="krm-info-row">
                <div className="krm-info-label">{r.rule}</div>
                <div className="krm-info-val">{r.detail}</div>
              </div>
            ))}
          </div>
          <div>
            <div className="krm-label" style={{ marginBottom: 10 }}>Service Life Guidance</div>
            {[
              { material: "Polypropylene", life: "2–3 years (outdoor use)" },
              { material: "Polyester", life: "5–10 years (inspect annually)" },
              { material: "Nylon", life: "5–8 years (inspect annually)" },
              { material: "HMPE / Dyneema", life: "3–5 years (inspect after each heavy use)" },
              { material: "Manila", life: "1–2 years (outdoor/operational use)" },
              { material: "Wire Rope", life: "2–5 years (depends on duty cycle)" },
            ].map((r) => (
              <div key={r.material} className="krm-info-row">
                <div className="krm-info-label">{r.material}</div>
                <div className="krm-info-val" style={{ color: T.accentGold }}>{r.life}</div>
              </div>
            ))}

            <div className="krm-warning" style={{ marginTop: 14 }}>
              <strong>Note:</strong> These are general guidelines only. Actual service life depends on duty cycle, environmental conditions, and load history. Always replace ropes that show any signs of damage regardless of age.
            </div>
          </div>
        </div>
      </CollapsibleCard>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────

function IdentifySection() {
  const [color, setColor] = useState("");
  const [floats, setFloats] = useState("");
  const [texture, setTexture] = useState("");
  const [diameter, setDiameter] = useState("");
  const [results, setResults] = useState(null);

  const COLORS = ["White/Light Grey", "Yellow/Gold", "Blue/Navy", "Light Blue", "Brown/Tan", "Silver/Grey", "Green", "Black", "Mixed"];
  const TEXTURES = ["Smooth/Plastic", "Soft/Fuzzy", "Rough/Coarse", "Stiff/Metallic", "Slippery", "Waxy"];

  const identify = () => {
    const candidates = ROPES.map((r) => {
      let score = 0;
      let reasons = [];

      if (floats === "yes" && r.floats) { score += 3; reasons.push("Floats ✓"); }
      if (floats === "no" && !r.floats) { score += 3; reasons.push("Sinks ✓"); }

      if (color.includes("Yellow") && r.id === "polypropylene") { score += 3; reasons.push("Yellow colour matches"); }
      if (color.includes("Blue") && r.id === "polyester") { score += 2; reasons.push("Blue colour common"); }
      if ((color.includes("White") || color.includes("Light")) && ["nylon", "polyester", "hmpe"].includes(r.id)) { score += 2; reasons.push("White/light colour matches"); }
      if ((color.includes("Brown") || color.includes("Tan")) && ["manila", "sisal"].includes(r.id)) { score += 3; reasons.push("Brown/tan natural fibre colour"); }
      if (color.includes("Silver") && r.id === "wirerope") { score += 4; reasons.push("Metallic colour = wire rope"); }
      if (color.includes("Light Blue") && r.id === "hmpe") { score += 3; reasons.push("Light blue is typical Dyneema colour"); }

      if (texture.includes("Plastic") && r.id === "polypropylene") { score += 3; reasons.push("Plastic/waxy feel typical"); }
      if (texture.includes("Slippery") && r.id === "hmpe") { score += 4; reasons.push("Slippery = HMPE indicator"); }
      if (texture.includes("Metallic") && r.id === "wirerope") { score += 4; reasons.push("Metallic texture = wire"); }
      if (texture.includes("Rough") && ["manila", "sisal"].includes(r.id)) { score += 3; reasons.push("Rough texture = natural fibre"); }

      const d = parseFloat(diameter);
      if (!isNaN(d)) {
        if (d < 10 && ["polypropylene"].includes(r.id)) { score += 1; reasons.push("Small diameter typical"); }
        if (d > 50 && r.id === "wirerope") { score += 2; reasons.push("Large diameter consistent"); }
      }

      return { ...r, score, reasons };
    }).filter((r) => r.score > 0).sort((a, b) => b.score - a.score).slice(0, 3);

    setResults(candidates.length > 0 ? candidates : []);
  };

  const reset = () => {
    setColor(""); setFloats(""); setTexture(""); setDiameter(""); setResults(null);
  };

  return (
    <div>
      <div className="krm-section-title">Quick <span>Identification Tool</span></div>
      <div className="krm-section-desc">
        Select known characteristics to identify an unknown rope type and get full property information.
      </div>

      <div className="krm-calc-wrap" style={{ marginBottom: 24 }}>
        <div className="krm-grid-2" style={{ gap: 20, marginBottom: 16 }}>
          <div className="krm-input-group">
            <label>Does it float?</label>
            <select className="krm-select" value={floats} onChange={(e) => setFloats(e.target.value)}>
              <option value="">— Select —</option>
              <option value="yes">✅ Floats</option>
              <option value="no">❌ Sinks</option>
            </select>
          </div>
          <div className="krm-input-group">
            <label>Approximate Diameter (mm)</label>
            <input className="krm-input" type="number" value={diameter} onChange={(e) => setDiameter(e.target.value)} placeholder="e.g. 32" />
          </div>
        </div>

        <div className="krm-input-group">
          <label>Colour</label>
          <div className="krm-pill-row">
            {COLORS.map((c) => (
              <div key={c} className={`krm-pill ${color === c ? "active" : ""}`} onClick={() => setColor(color === c ? "" : c)}>{c}</div>
            ))}
          </div>
        </div>

        <div className="krm-input-group" style={{ marginTop: 12 }}>
          <label>Texture / Feel</label>
          <div className="krm-pill-row">
            {TEXTURES.map((t) => (
              <div key={t} className={`krm-pill ${texture === t ? "active" : ""}`} onClick={() => setTexture(texture === t ? "" : t)}>{t}</div>
            ))}
          </div>
        </div>

        <div style={{ display: "flex", gap: 12, marginTop: 16 }}>
          <button className="krm-btn" onClick={identify}>Identify Rope</button>
          <button className="krm-btn" style={{ background: "transparent", border: `1px solid ${T.border}`, color: T.textSecondary }} onClick={reset}>Reset</button>
        </div>
      </div>

      {results !== null && (
        <div>
          {results.length === 0 ? (
            <div className="krm-tip">No close matches found. Try adjusting your selections or provide more information.</div>
          ) : (
            <>
              <div className="krm-section-desc" style={{ marginBottom: 12 }}>Top {results.length} match{results.length > 1 ? "es" : ""} based on selected characteristics:</div>
              {results.map((r, i) => (
                <div key={r.id} className="krm-id-result" style={{ marginBottom: 14, borderLeft: i === 0 ? `4px solid ${r.color}` : `4px solid ${T.border}` }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 10 }}>
                    <div style={{ fontFamily: "'Teko', sans-serif", fontSize: 26, fontWeight: 700, color: r.color, textTransform: "uppercase", letterSpacing: "0.05em" }}>
                      #{i + 1} — {r.name}
                    </div>
                    <div style={{ background: `${r.color}20`, border: `1px solid ${r.color}40`, borderRadius: 4, padding: "3px 10px", fontSize: 11, color: r.color, fontFamily: "'JetBrains Mono', monospace" }}>
                      {r.floats ? "FLOATS" : "SINKS"}
                    </div>
                  </div>

                  <div style={{ background: r.gradient, height: 10, borderRadius: 5, marginBottom: 12 }} />

                  <div className="krm-grid-2" style={{ gap: 16, marginBottom: 12 }}>
                    <div>
                      <div className="krm-label" style={{ marginBottom: 6 }}>Match Reasons</div>
                      {r.reasons.map((reason, j) => (
                        <div key={j} style={{ fontSize: 13, color: T.accentGreen, padding: "3px 0" }}>✓ {reason}</div>
                      ))}
                    </div>
                    <div>
                      <StrengthBar value={r.mbsValue} color={r.color} label="Relative MBS" />
                      <StrengthBar value={r.stretchValue} color="#f4a820" label="Stretch" />
                      <StrengthBar value={r.uvValue} color="#2ec4b6" label="UV Resistance" />
                    </div>
                  </div>

                  <div style={{ fontSize: 13, color: T.textSecondary, lineHeight: 1.6, marginBottom: 10 }}>{r.appearance}</div>
                  <div style={{ fontSize: 13, color: T.textSecondary }}><strong style={{ color: T.textPrimary }}>Typical use:</strong> {r.shipboardUse}</div>
                </div>
              ))}
            </>
          )}
        </div>
      )}

      {/* Quick reference table */}
      <CollapsibleCard title="Complete Rope Quick Reference" badge="Reference">
        <div style={{ overflowX: "auto" }}>
          <table className="krm-table">
            <thead>
              <tr>
                <th>Type</th>
                <th>Colour</th>
                <th>Floats</th>
                <th>MBS</th>
                <th>Stretch</th>
                <th>UV</th>
                <th>Key Risk</th>
              </tr>
            </thead>
            <tbody>
              {ROPES.map((r) => (
                <tr key={r.id}>
                  <td style={{ color: r.color }}>{r.name}</td>
                  <td><div style={{ width: 50, height: 8, borderRadius: 4, background: r.gradient }} /></td>
                  <td>{r.floats ? "✅" : "❌"}</td>
                  <td>{r.mbs}</td>
                  <td>{r.stretch}</td>
                  <td>{r.uv}</td>
                  <td style={{ fontSize: 12, color: T.textMuted }}>
                    {r.id === "hmpe" ? "Snap-back, heat" :
                     r.id === "polypropylene" ? "UV, low MBS" :
                     r.id === "manila" ? "Rot, wet strength loss" :
                     r.id === "wirerope" ? "Broken wires, kinks" :
                     r.id === "nylon" ? "Shock release" : "Abrasion, chafe"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </CollapsibleCard>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN PAGE COMPONENT
// ═══════════════════════════════════════════════════════════════════════════════

export default function KnotsRopesMooringPage() {
  const [activeTab, setActiveTab] = useState("knots");
  const [searchQ, setSearchQ] = useState("");
  const contentRef = useRef(null);

  useEffect(() => {
    if (contentRef.current) {
      contentRef.current.scrollTop = 0;
    }
  }, [activeTab]);

  const renderContent = () => {
    const q = searchQ.toLowerCase().trim();
    switch (activeTab) {
      case "knots": return <KnotsSection searchQ={q} />;
      case "ropes": return <RopesSection searchQ={q} />;
      case "wire": return <WireRopeSection />;
      case "inspection": return <InspectionSection />;
      case "splicing": return <SplicingSection />;
      case "mooring": return <MooringSection />;
      case "snapback": return <SnapbackSection />;
      case "seamanship": return <SeamanshipSection />;
      case "identify": return <IdentifySection />;
      default: return null;
    }
  };

  return (
    <>
      <style>{globalStyle}</style>
      <div className="krm-root">
        {/* Header */}
        <div className="krm-header">
          <div className="krm-header-top">
            <div className="krm-title-block">
              <div className="krm-title">Knots, Ropes <span>&</span> Mooring</div>
              <div className="krm-subtitle">Complete Maritime Deck Reference · SOLAS / STCW Aligned</div>
            </div>
            <div className="krm-search">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={T.textMuted} strokeWidth="2">
                <circle cx="11" cy="11" r="8" /><path d="m21 21-4.35-4.35" />
              </svg>
              <input
                value={searchQ}
                onChange={(e) => setSearchQ(e.target.value)}
                placeholder="Search knots, ropes, techniques..."
              />
              {searchQ && (
                <button onClick={() => setSearchQ("")} style={{ background: "none", border: "none", color: T.textMuted, cursor: "pointer", fontSize: 16, padding: "0 2px" }}>×</button>
              )}
            </div>
          </div>

          <div className="krm-tabs">
            {TABS.map((tab) => (
              <button
                key={tab.id}
                className={`krm-tab ${activeTab === tab.id ? "active" : ""}`}
                onClick={() => setActiveTab(tab.id)}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Content */}
        <div className="krm-content" ref={contentRef}>
          {renderContent()}
        </div>
      </div>
    </>
  );
}
