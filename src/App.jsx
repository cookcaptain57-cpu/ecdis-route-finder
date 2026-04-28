/* eslint-disable */
import { useState, useEffect, useRef, useMemo } from "react";
import { auth, db, storage } from "./firebase";
import { signInWithEmailAndPassword, signOut, onAuthStateChanged } from "firebase/auth";
import { collection, getDocs, addDoc, deleteDoc, doc, setDoc } from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";

const style = `
  @import url('https://fonts.googleapis.com/css2?family=Orbitron:wght@400;600;700;900&family=Exo+2:wght@300;400;500;600&display=swap');
  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
  :root {
    --bg: #040C1A; --bg2: #071428; --card: #0B1D35; --card2: #0F2444;
    --border: #1A3A5C; --border2: #1E4570; --blue: #1565C0; --cyan: #00B4D8;
    --gold: #F0A500; --gold2: #D4900A; --green: #00C896; --red: #FF4757;
    --purple: #7C3AED; --text: #E2EBF8; --text2: #8A9BBF; --text3: #4A5F80;
    --glow: 0 0 20px rgba(0,180,216,0.25); --glow2: 0 0 40px rgba(0,180,216,0.15);
  }
  html { scroll-behavior: smooth; }
  body { font-family: 'Exo 2', sans-serif; background: var(--bg); color: var(--text); min-height: 100vh; overflow-x: hidden; }
  .grid-bg { position: fixed; inset: 0; z-index: 0; pointer-events: none; background-image: linear-gradient(rgba(0,180,216,0.04) 1px, transparent 1px), linear-gradient(90deg, rgba(0,180,216,0.04) 1px, transparent 1px); background-size: 60px 60px; animation: gridMove 20s linear infinite; }
  @keyframes gridMove { to { background-position: 60px 60px; } }
  .app { position: relative; z-index: 2; min-height: 100vh; }

  /* ── NAVBAR ── */
  .navbar { position: sticky; top: 0; z-index: 100; background: rgba(4,12,26,0.95); backdrop-filter: blur(20px); border-bottom: 1px solid var(--border); padding: 0 1.5rem; display: flex; align-items: center; justify-content: space-between; height: 64px; box-shadow: 0 4px 30px rgba(0,0,0,0.5); }
  .nav-brand { display: flex; align-items: center; gap: 10px; }
  .nav-logo { width: 38px; height: 38px; background: linear-gradient(135deg, var(--cyan), var(--blue)); border-radius: 10px; display: flex; align-items: center; justify-content: center; font-size: 20px; box-shadow: 0 0 15px rgba(0,180,216,0.4); flex-shrink:0; }
  .nav-title { font-family: 'Orbitron', monospace; font-size: 0.85rem; font-weight: 700; letter-spacing: 0.08em; }
  .nav-subtitle { font-size: 0.6rem; color: var(--cyan); letter-spacing: 0.15em; text-transform: uppercase; }
  .nav-tabs { display: flex; gap: 2px; }
  .nav-tab { padding: 7px 13px; border: none; background: transparent; color: var(--text2); font-family: 'Exo 2', sans-serif; font-size: 0.78rem; font-weight: 500; cursor: pointer; border-radius: 8px; transition: all 0.2s; display: flex; align-items: center; gap: 6px; text-transform: uppercase; letter-spacing: 0.04em; white-space: nowrap; }
  .nav-tab:hover { color: var(--text); background: rgba(255,255,255,0.05); }
  .nav-tab.active { color: var(--cyan); background: rgba(0,180,216,0.1); border: 1px solid rgba(0,180,216,0.2); }
  .nav-tab.chart-tab.active { color: var(--gold); background: rgba(240,165,0,0.1); border: 1px solid rgba(240,165,0,0.2); }
  .nav-status { display: flex; align-items: center; gap: 8px; font-size: 0.7rem; color: var(--text2); white-space:nowrap; }
  .status-dot { width: 8px; height: 8px; border-radius: 50%; background: var(--green); box-shadow: 0 0 8px var(--green); animation: pulse 2s infinite; }
  @keyframes pulse { 0%,100%{opacity:1;}50%{opacity:0.4;} }
  .hamburger { display: none; flex-direction: column; gap: 5px; cursor: pointer; padding: 8px; background: none; border: none; }
  .hamburger span { width: 22px; height: 2px; background: var(--text); border-radius: 2px; }
  .mobile-menu { display: none; position: fixed; top: 64px; left: 0; right: 0; background: rgba(4,12,26,0.98); backdrop-filter: blur(20px); border-bottom: 1px solid var(--border); z-index: 99; padding: 1rem; }
  .mobile-menu.open { display: flex; flex-direction: column; gap: 6px; }
  .mobile-tab { padding: 12px 16px; border: none; background: transparent; color: var(--text2); font-family: 'Exo 2', sans-serif; font-size: 0.9rem; cursor: pointer; border-radius: 10px; text-align: left; transition: all 0.2s; display: flex; align-items: center; gap: 10px; }
  .mobile-tab:hover { background: rgba(255,255,255,0.05); color: var(--text); }
  .mobile-tab.active { background: rgba(0,180,216,0.1); color: var(--cyan); }
  @media(max-width:768px) { .nav-tabs { display: none; } .hamburger { display: flex; } }

  /* ── HERO ── */
  .hero { padding: 4rem 1.5rem 2.5rem; text-align: center; }
  .hero-tag { display: inline-flex; align-items: center; gap: 8px; padding: 6px 14px; border-radius: 100px; border: 1px solid rgba(0,180,216,0.3); background: rgba(0,180,216,0.08); font-size: 0.72rem; color: var(--cyan); letter-spacing: 0.12em; text-transform: uppercase; margin-bottom: 1.5rem; }
  .hero-title { font-family: 'Orbitron', monospace; font-size: clamp(1.8rem, 5vw, 3rem); font-weight: 900; line-height: 1.1; letter-spacing: 0.04em; margin-bottom: 1rem; }
  .hero-title .accent { color: var(--cyan); }
  .hero-desc { max-width: 560px; margin: 0 auto 2.5rem; color: var(--text2); font-size: 0.95rem; line-height: 1.7; font-weight: 300; }

  /* ── SMART SEARCH ── */
  .smart-search-wrap { max-width: 700px; margin: 0 auto 1.5rem; }
  .smart-search-box { background: var(--card); border: 1px solid var(--border2); border-radius: 18px; padding: 1.5rem; box-shadow: 0 20px 60px rgba(0,0,0,0.4), var(--glow2); }
  .smart-search-inner { display: flex; gap: 10px; align-items: center; }
  .smart-input { flex: 1; padding: 14px 18px 14px 48px; background: var(--bg2); border: 1.5px solid var(--border2); border-radius: 12px; color: var(--text); font-family: 'Exo 2', sans-serif; font-size: 1rem; outline: none; transition: all 0.25s; }
  .smart-input::placeholder { color: var(--text3); }
  .smart-input:focus { border-color: var(--cyan); box-shadow: 0 0 0 3px rgba(0,180,216,0.12); }
  .smart-icon { position: absolute; left: 14px; top: 50%; transform: translateY(-50%); font-size: 1.1rem; color: var(--text3); pointer-events: none; }
  .smart-btn { padding: 14px 22px; background: linear-gradient(135deg, var(--cyan), var(--blue)); border: none; border-radius: 12px; color: white; font-family: 'Orbitron', monospace; font-size: 0.78rem; font-weight: 700; letter-spacing: 0.1em; cursor: pointer; transition: all 0.2s; white-space: nowrap; box-shadow: 0 4px 20px rgba(0,180,216,0.3); }
  .smart-btn:hover { transform: translateY(-2px); box-shadow: 0 8px 30px rgba(0,180,216,0.45); }
  .search-hint { font-size: 0.75rem; color: var(--text3); margin-top: 10px; text-align: center; }
  .search-hint span { color: var(--cyan); }

  .autocomplete { position: absolute; top: calc(100% + 8px); left: 0; right: 0; z-index: 50; background: var(--card2); border: 1px solid var(--border2); border-radius: 12px; overflow: hidden; box-shadow: 0 20px 50px rgba(0,0,0,0.6); max-height: 240px; overflow-y: auto; }
  .ac-item { padding: 11px 15px; cursor: pointer; display: flex; align-items: center; gap: 10px; transition: background 0.15s; font-size: 0.88rem; border-bottom: 1px solid rgba(255,255,255,0.04); }
  .ac-item:hover { background: rgba(0,180,216,0.1); }
  .ac-item .port-name { font-weight: 500; }
  .ac-item .port-sub { color: var(--text2); font-size: 0.76rem; }

  .stats-bar { display: flex; justify-content: center; gap: 2.5rem; margin-top: 2.5rem; flex-wrap: wrap; }
  .stat-item { text-align: center; }
  .stat-num { font-family: 'Orbitron', monospace; font-size: 1.6rem; font-weight: 700; color: var(--cyan); }
  .stat-label { font-size: 0.68rem; color: var(--text2); letter-spacing: 0.1em; text-transform: uppercase; }

  /* ── SHARED ── */
  .section { padding: 1.5rem; max-width: 1200px; margin: 0 auto; }
  .section-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 1.5rem; padding-bottom: 1rem; border-bottom: 1px solid var(--border); flex-wrap: wrap; gap: 8px; }
  .section-title { font-family: 'Orbitron', monospace; font-size: 1rem; font-weight: 700; letter-spacing: 0.08em; display: flex; align-items: center; gap: 8px; }
  .badge { padding: 4px 10px; border-radius: 100px; background: rgba(0,180,216,0.12); border: 1px solid rgba(0,180,216,0.25); color: var(--cyan); font-size: 0.7rem; }
  .badge-gold { background: rgba(240,165,0,0.12); border-color: rgba(240,165,0,0.25); color: var(--gold); }

  .input-wrap { position: relative; }
  .search-input { width: 100%; padding: 12px 16px 12px 42px; background: var(--bg2); border: 1px solid var(--border2); border-radius: 12px; color: var(--text); font-family: 'Exo 2', sans-serif; font-size: 0.88rem; outline: none; transition: all 0.25s; }
  .search-input::placeholder { color: var(--text3); }
  .search-input:focus { border-color: var(--cyan); box-shadow: 0 0 0 3px rgba(0,180,216,0.1); }
  .input-icon { position: absolute; left: 13px; top: 50%; transform: translateY(-50%); color: var(--text3); font-size: 1rem; pointer-events: none; }

  .filter-bar { display: flex; gap: 7px; flex-wrap: wrap; margin-bottom: 1.2rem; }
  .filter-btn { padding: 6px 14px; border-radius: 100px; border: 1px solid var(--border); background: transparent; color: var(--text2); font-family: 'Exo 2', sans-serif; font-size: 0.74rem; cursor: pointer; transition: all 0.2s; text-transform: uppercase; letter-spacing: 0.07em; }
  .filter-btn:hover { border-color: var(--cyan); color: var(--cyan); }
  .filter-btn.active { background: rgba(0,180,216,0.12); border-color: rgba(0,180,216,0.4); color: var(--cyan); }
  .filter-btn.gold.active { background: rgba(240,165,0,0.12); border-color: rgba(240,165,0,0.4); color: var(--gold); }

  /* ── ROUTE CARDS ── */
  .routes-grid { display: grid; gap: 1rem; grid-template-columns: repeat(auto-fill, minmax(310px, 1fr)); }
  .route-card { background: var(--card); border: 1px solid var(--border); border-radius: 16px; padding: 1.3rem; position: relative; transition: all 0.25s; overflow: hidden; }
  .route-card:hover { border-color: rgba(0,180,216,0.35); transform: translateY(-3px); box-shadow: 0 12px 40px rgba(0,0,0,0.4), var(--glow); }
  .route-id { font-family: 'Orbitron', monospace; font-size: 0.6rem; color: var(--text3); letter-spacing: 0.15em; margin-bottom: 6px; }
  .route-name { font-weight: 600; font-size: 0.88rem; margin-bottom: 0.7rem; color: var(--text); }
  .route-filename { font-size: 0.7rem; color: var(--cyan); font-family: 'Orbitron', monospace; margin-bottom: 0.8rem; background: rgba(0,180,216,0.07); padding: 4px 8px; border-radius: 6px; display: inline-block; }
  .route-ports { display: flex; align-items: center; gap: 8px; margin-bottom: 0.8rem; }
  .port-bubble { flex: 1; text-align: center; padding: 8px 5px; background: var(--bg2); border-radius: 10px; border: 1px solid var(--border); }
  .port-bubble .p-name { font-weight: 600; font-size: 0.8rem; }
  .port-bubble .p-country { font-size: 0.66rem; color: var(--text2); margin-top: 2px; }
  .route-arrow { display: flex; flex-direction: column; align-items: center; gap: 2px; color: var(--cyan); flex-shrink: 0; }
  .route-line { width: 30px; height: 1px; background: linear-gradient(90deg, var(--border2), var(--cyan), var(--border2)); }
  .route-meta { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 6px; margin-bottom: 0.9rem; }
  .meta-item { background: var(--bg2); border-radius: 8px; padding: 7px; text-align: center; border: 1px solid var(--border); }
  .meta-val { font-family: 'Orbitron', monospace; font-size: 0.82rem; font-weight: 700; }
  .meta-key { font-size: 0.6rem; color: var(--text2); text-transform: uppercase; letter-spacing: 0.07em; margin-top: 2px; }
  .route-actions { display: flex; gap: 7px; }
  .route-tag { display: inline-flex; align-items: center; gap: 4px; padding: 3px 8px; border-radius: 100px; font-size: 0.64rem; font-weight: 500; margin-bottom: 0.6rem; }
  .tag-ocean { background: rgba(0,180,216,0.1); color: var(--cyan); border: 1px solid rgba(0,180,216,0.2); }
  .tag-coastal { background: rgba(0,200,150,0.1); color: var(--green); border: 1px solid rgba(0,200,150,0.2); }
  .tag-deep { background: rgba(21,101,192,0.15); color: #5BC8F5; border: 1px solid rgba(91,200,245,0.2); }

  /* ── BUTTONS ── */
  .btn { flex: 1; padding: 9px 10px; border-radius: 9px; font-family: 'Exo 2', sans-serif; font-size: 0.78rem; font-weight: 600; cursor: pointer; text-align: center; transition: all 0.2s; border: none; display: flex; align-items: center; justify-content: center; gap: 5px; }
  .btn-primary { background: linear-gradient(135deg, var(--cyan), var(--blue)); color: white; box-shadow: 0 2px 10px rgba(0,180,216,0.25); }
  .btn-primary:hover { box-shadow: 0 4px 20px rgba(0,180,216,0.45); transform: translateY(-1px); }
  .btn-secondary { background: transparent; border: 1px solid var(--border2); color: var(--text2); }
  .btn-secondary:hover { border-color: var(--cyan); color: var(--cyan); }
  .btn-gold { background: linear-gradient(135deg, var(--gold), var(--gold2)); color: #000; font-weight: 700; }
  .btn-gold:hover { box-shadow: 0 4px 20px rgba(240,165,0,0.4); transform: translateY(-1px); }
  .btn-danger { background: var(--red); color: white; }
  .btn-sm { flex: none; padding: 7px 13px; font-size: 0.74rem; }
  .btn:disabled { opacity: 0.5; cursor: not-allowed; transform: none !important; }

  /* ── CHARTS PAGE ── */
  .ecdis-brands { display: grid; gap: 1.5rem; }
  .brand-section { background: var(--card); border: 1px solid var(--border); border-radius: 16px; overflow: hidden; }
  .brand-header { padding: 1rem 1.3rem; display: flex; align-items: center; gap: 12px; border-bottom: 1px solid var(--border); cursor: pointer; transition: background 0.2s; }
  .brand-header:hover { background: rgba(255,255,255,0.02); }
  .brand-logo { width: 42px; height: 42px; border-radius: 10px; display: flex; align-items: center; justify-content: center; font-size: 1.3rem; flex-shrink: 0; }
  .brand-name { font-family: 'Orbitron', monospace; font-size: 0.9rem; font-weight: 700; }
  .brand-sub { font-size: 0.75rem; color: var(--text2); margin-top: 2px; }
  .brand-count { margin-left: auto; }
  .brand-chevron { color: var(--text3); font-size: 1rem; transition: transform 0.2s; }
  .brand-chevron.open { transform: rotate(180deg); }
  .charts-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(250px, 1fr)); gap: 1rem; padding: 1.2rem; }
  .chart-card { background: var(--bg2); border: 1px solid var(--border); border-radius: 12px; padding: 1rem; transition: all 0.2s; }
  .chart-card:hover { border-color: rgba(240,165,0,0.3); transform: translateY(-2px); }
  .chart-card-name { font-weight: 600; font-size: 0.85rem; margin-bottom: 4px; }
  .chart-card-region { font-size: 0.72rem; color: var(--text2); margin-bottom: 8px; }
  .chart-card-meta { display: flex; gap: 6px; flex-wrap: wrap; margin-bottom: 10px; }
  .chart-meta-tag { padding: 2px 7px; border-radius: 5px; font-size: 0.64rem; background: rgba(240,165,0,0.08); color: var(--gold); border: 1px solid rgba(240,165,0,0.15); }

  /* ── ADMIN ── */
  .admin-login { min-height: 80vh; display: flex; align-items: center; justify-content: center; padding: 2rem; }
  .login-card { background: var(--card); border: 1px solid var(--border); border-radius: 20px; padding: 2.5rem; width: 100%; max-width: 400px; box-shadow: 0 30px 80px rgba(0,0,0,0.6); }
  .login-logo { text-align: center; margin-bottom: 2rem; }
  .login-icon { width: 64px; height: 64px; background: linear-gradient(135deg, var(--cyan), var(--blue)); border-radius: 18px; margin: 0 auto 1rem; display: flex; align-items: center; justify-content: center; font-size: 2rem; box-shadow: 0 0 30px rgba(0,180,216,0.4); }
  .login-title { font-family: 'Orbitron', monospace; font-size: 1.1rem; font-weight: 700; margin-bottom: 4px; }
  .login-sub { color: var(--text2); font-size: 0.8rem; }
  .form-field { margin-bottom: 1.1rem; }
  .form-label { display: block; font-size: 0.72rem; color: var(--text2); text-transform: uppercase; letter-spacing: 0.1em; margin-bottom: 7px; }
  .form-input { width: 100%; padding: 12px 14px; background: var(--bg2); border: 1px solid var(--border2); border-radius: 10px; color: var(--text); font-family: 'Exo 2', sans-serif; font-size: 0.88rem; outline: none; transition: all 0.2s; }
  .form-input:focus { border-color: var(--cyan); box-shadow: 0 0 0 3px rgba(0,180,216,0.1); }
  .error-msg { color: var(--red); font-size: 0.8rem; margin-top: 8px; text-align: center; background: rgba(255,71,87,0.08); padding: 8px; border-radius: 8px; border: 1px solid rgba(255,71,87,0.2); }
  .search-btn-full { width: 100%; padding: 14px; background: linear-gradient(135deg, var(--cyan), var(--blue)); border: none; border-radius: 12px; color: white; font-family: 'Orbitron', monospace; font-size: 0.82rem; font-weight: 700; letter-spacing: 0.1em; cursor: pointer; margin-top: 1rem; transition: all 0.25s; box-shadow: 0 4px 20px rgba(0,180,216,0.3); }
  .search-btn-full:hover { transform: translateY(-2px); box-shadow: 0 8px 30px rgba(0,180,216,0.45); }

  .admin-layout { display: grid; grid-template-columns: 210px 1fr; min-height: calc(100vh - 64px); }
  @media(max-width:768px) { .admin-layout { grid-template-columns: 1fr; } .admin-sidebar { display: none; } }
  .admin-sidebar { background: var(--card); border-right: 1px solid var(--border); padding: 1.5rem 1rem; }
  .sidebar-label { font-size: 0.62rem; color: var(--text3); text-transform: uppercase; letter-spacing: 0.15em; margin-bottom: 8px; padding: 0 8px; }
  .sidebar-item { display: flex; align-items: center; gap: 10px; padding: 10px 12px; border-radius: 10px; cursor: pointer; transition: all 0.15s; color: var(--text2); font-size: 0.83rem; margin-bottom: 2px; }
  .sidebar-item:hover { background: rgba(255,255,255,0.04); color: var(--text); }
  .sidebar-item.active { background: rgba(0,180,216,0.1); color: var(--cyan); }
  .s-icon { font-size: 1rem; width: 20px; text-align: center; }

  .admin-mobile-tabs { display: none; }
  @media(max-width:768px) { .admin-mobile-tabs { display: flex; gap: 6px; flex-wrap: wrap; padding: 1rem 1.5rem 0; } }
  .admin-mob-tab { padding: 7px 12px; border-radius: 100px; border: 1px solid var(--border); background: transparent; color: var(--text2); font-size: 0.73rem; cursor: pointer; transition: all 0.2s; }
  .admin-mob-tab.active { background: rgba(0,180,216,0.1); border-color: rgba(0,180,216,0.3); color: var(--cyan); }

  .admin-content { padding: 1.5rem; overflow-y: auto; }
  .admin-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 1.5rem; flex-wrap: wrap; gap: 8px; }
  .admin-page-title { font-family: 'Orbitron', monospace; font-size: 1rem; font-weight: 700; }

  .data-table { width: 100%; border-collapse: collapse; }
  .data-table thead tr { border-bottom: 2px solid var(--border); }
  .data-table th { padding: 9px 12px; text-align: left; font-size: 0.66rem; color: var(--text2); text-transform: uppercase; letter-spacing: 0.1em; font-weight: 600; }
  .data-table td { padding: 10px 12px; font-size: 0.81rem; border-bottom: 1px solid rgba(255,255,255,0.04); vertical-align: middle; }
  .data-table tbody tr:hover { background: rgba(255,255,255,0.02); }
  .table-wrap { overflow-x: auto; }

  .modal-overlay { position: fixed; inset: 0; z-index: 200; background: rgba(0,0,0,0.75); backdrop-filter: blur(8px); display: flex; align-items: center; justify-content: center; padding: 1rem; }
  .modal-card { background: var(--card); border: 1px solid var(--border2); border-radius: 20px; padding: 1.8rem; width: 100%; max-width: 560px; box-shadow: 0 30px 80px rgba(0,0,0,0.7); max-height: 90vh; overflow-y: auto; }
  .modal-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 1.3rem; }
  .modal-title { font-family: 'Orbitron', monospace; font-size: 0.95rem; font-weight: 700; }
  .modal-close { background: rgba(255,255,255,0.06); border: none; color: var(--text2); width: 30px; height: 30px; border-radius: 8px; cursor: pointer; font-size: 1rem; display: flex; align-items: center; justify-content: center; transition: all 0.2s; }
  .modal-close:hover { background: rgba(255,0,0,0.15); color: var(--red); }
  .detail-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-bottom: 1.2rem; }
  .detail-item { background: var(--bg2); border-radius: 10px; padding: 10px 12px; border: 1px solid var(--border); }
  .detail-key { font-size: 0.64rem; color: var(--text2); text-transform: uppercase; letter-spacing: 0.1em; margin-bottom: 4px; }
  .detail-val { font-weight: 600; font-size: 0.86rem; }

  .notif { position: fixed; bottom: 1.5rem; right: 1.5rem; z-index: 300; padding: 11px 18px; border-radius: 12px; display: flex; align-items: center; gap: 9px; font-size: 0.84rem; font-weight: 500; box-shadow: 0 8px 30px rgba(0,0,0,0.5); animation: slideIn 0.3s ease; max-width: 90vw; }
  .notif-success { background: rgba(0,200,150,0.15); border: 1px solid rgba(0,200,150,0.3); color: var(--green); }
  .notif-info { background: rgba(0,180,216,0.15); border: 1px solid rgba(0,180,216,0.3); color: var(--cyan); }
  .notif-error { background: rgba(255,71,87,0.15); border: 1px solid rgba(255,71,87,0.3); color: var(--red); }
  @keyframes slideIn { from{transform:translateY(20px);opacity:0;}to{transform:translateY(0);opacity:1;} }

  .empty-state { text-align: center; padding: 3.5rem 2rem; color: var(--text2); }
  .empty-icon { font-size: 3.5rem; margin-bottom: 1rem; opacity: 0.4; }
  .empty-title { font-family: 'Orbitron', monospace; font-size: 0.95rem; margin-bottom: 0.5rem; color: var(--text); }
  .empty-desc { font-size: 0.83rem; }

  .upload-row { display: flex; align-items: center; justify-content: space-between; padding: 10px 14px; background: var(--bg2); border-radius: 10px; border: 1px solid var(--border); margin-bottom: 8px; gap: 10px; flex-wrap: wrap; }
  .upload-label { font-size: 0.82rem; }
  .upload-label span { font-family: 'Orbitron',monospace; font-size: 0.7rem; color: var(--cyan); display: block; }

  .loading { display: flex; align-items: center; justify-content: center; padding: 3rem; gap: 12px; color: var(--text2); font-size: 0.9rem; }
  .spinner { width: 24px; height: 24px; border: 2px solid var(--border2); border-top-color: var(--cyan); border-radius: 50%; animation: spin 0.8s linear infinite; }
  @keyframes spin { to{transform:rotate(360deg);} }

  select.form-input { cursor: pointer; }
  ::-webkit-scrollbar { width: 5px; }
  ::-webkit-scrollbar-track { background: var(--bg); }
  ::-webkit-scrollbar-thumb { background: var(--border2); border-radius: 3px; }
`;

// ── ECDIS BRANDS ──────────────────────────────────────────────────────────
const ECDIS_BRANDS = [
  { id:"furuno", name:"Furuno", emoji:"🟦", color:"#0066CC", sub:"FMD Series — Worldwide Leader", models:["FMD-3200","FMD-3300","FMD-3100"] },
  { id:"jrc", name:"JRC", emoji:"🟥", color:"#CC0000", sub:"JAN Series — Japan Radio Co.", models:["JAN-7201S","JAN-9201S","JAN-901B"] },
  { id:"transas", name:"Transas / Wärtsilä", emoji:"🟩", color:"#007A4D", sub:"Navi-Sailor Series", models:["Navi-Sailor 4000","Navi-Sailor 3000","NS-4100"] },
  { id:"sperry", name:"Sperry Marine", emoji:"🟨", color:"#D4900A", sub:"VisionMaster Series", models:["VisionMaster FT","VisionMaster Pro"] },
  { id:"tokimec", name:"Tokimec / JMR", emoji:"🟪", color:"#6B21A8", sub:"JMR-7700/9900 Series", models:["JMR-7700","JMR-9900","JMR-5400"] },
  { id:"raytheon", name:"Raytheon Anschütz", emoji:"⬛", color:"#374151", sub:"ECDIS 1000/2000 Series", models:["ECDIS 1000","ECDIS 2000"] },
  { id:"kongsberg", name:"Kongsberg Maritime", emoji:"🔵", color:"#1D4ED8", sub:"K-Bridge ECDIS Series", models:["K-Bridge ECDIS","K-ECDIS S"] },
  { id:"danelec", name:"Danelec Marine", emoji:"🔶", color:"#EA580C", sub:"DM800 ECDIS Series", models:["DM800 ECDIS"] },
];

// ── DEMO DATA ─────────────────────────────────────────────────────────────
const DEMO_PORTS = [
  { id:"MUM", name:"Mumbai", country:"India", flag:"🇮🇳", coords:"18°54′N 72°49′E", charts:["IN-C17","IN-C18"], locode:"INMUM", keywords:"mum mumbai bombay" },
  { id:"SIN", name:"Singapore", country:"Singapore", flag:"🇸🇬", coords:"1°17′N 103°50′E", charts:["SG-04","SG-05"], locode:"SGSIN", keywords:"sin singapore" },
  { id:"DXB", name:"Dubai", country:"UAE", flag:"🇦🇪", coords:"25°00′N 55°04′E", charts:["AE-JEA1"], locode:"AEJEA", keywords:"dxb dubai jebel ali uae" },
  { id:"SHA", name:"Shanghai", country:"China", flag:"🇨🇳", coords:"31°22′N 121°28′E", charts:["CH-11"], locode:"CNSHA", keywords:"sha shanghai china" },
  { id:"ROT", name:"Rotterdam", country:"Netherlands", flag:"🇳🇱", coords:"51°54′N 4°28′E", charts:["NL-1801"], locode:"NLRTM", keywords:"rot rotterdam netherlands" },
  { id:"COL", name:"Colombo", country:"Sri Lanka", flag:"🇱🇰", coords:"6°57′N 79°51′E", charts:["LK-C1"], locode:"LKCMB", keywords:"col colombo srilanka" },
  { id:"KAR", name:"Karachi", country:"Pakistan", flag:"🇵🇰", coords:"24°51′N 67°01′E", charts:["PK-K1"], locode:"PKKHI", keywords:"kar karachi pakistan" },
  { id:"CHE", name:"Chennai", country:"India", flag:"🇮🇳", coords:"13°05′N 80°18′E", charts:["IN-MA"], locode:"INMAA", keywords:"che chennai madras india" },
  { id:"KOC", name:"Kochi", country:"India", flag:"🇮🇳", coords:"9°58′N 76°14′E", charts:["IN-KOC"], locode:"INCOK", keywords:"koc kochi cochin india" },
  { id:"BUS", name:"Busan", country:"South Korea", flag:"🇰🇷", coords:"35°06′N 129°02′E", charts:["KR-B1"], locode:"KRPUS", keywords:"bus busan korea" },
];

const DEMO_ROUTES = [
  { id:"RT-001", name:"Mumbai to Singapore", from:"MUM", to:"SIN", distance:2780, hours:148, type:"ocean", waypoints:10, file:"mumbaitosingapore.rtz", fileUrl:"" },
  { id:"RT-002", name:"Mumbai to Dubai", from:"MUM", to:"DXB", distance:1155, hours:62, type:"ocean", waypoints:8, file:"mumbaitodubai.rtz", fileUrl:"" },
  { id:"RT-003", name:"Mumbai to Colombo", from:"MUM", to:"COL", distance:890, hours:48, type:"coastal", waypoints:7, file:"mumbaitocolombo.rtz", fileUrl:"" },
  { id:"RT-004", name:"Singapore to Shanghai", from:"SIN", to:"SHA", distance:2580, hours:138, type:"deep", waypoints:10, file:"singaporetoshanghai.rtz", fileUrl:"" },
  { id:"RT-005", name:"Karachi to Mumbai", from:"KAR", to:"MUM", distance:520, hours:28, type:"coastal", waypoints:6, file:"karachitomumbai.rtz", fileUrl:"" },
  { id:"RT-006", name:"Chennai to Kochi", from:"CHE", to:"KOC", distance:385, hours:21, type:"coastal", waypoints:4, file:"chennaitokochi.rtz", fileUrl:"" },
  { id:"RT-007", name:"Dubai to Karachi", from:"DXB", to:"KAR", distance:430, hours:23, type:"coastal", waypoints:6, file:"dubaitokarachi.rtz", fileUrl:"" },
];

const DEMO_CHARTS = {
  furuno: [
    { id:"FC-001", name:"Arabian Sea Full Coverage", region:"Arabian Sea", scale:"1:1,500,000", edition:"2024", fileUrl:"" },
    { id:"FC-002", name:"Indian West Coast", region:"India West", scale:"1:350,000", edition:"2024", fileUrl:"" },
  ],
  jrc: [
    { id:"JC-001", name:"Singapore Strait Charts", region:"Singapore", scale:"1:50,000", edition:"2024", fileUrl:"" },
    { id:"JC-002", name:"South China Sea", region:"Far East", scale:"1:2,000,000", edition:"2023", fileUrl:"" },
  ],
  transas: [
    { id:"TC-001", name:"Persian Gulf Route Pack", region:"Gulf", scale:"1:250,000", edition:"2024", fileUrl:"" },
  ],
  sperry: [],
  tokimec: [],
  raytheon: [],
  kongsberg: [],
  danelec: [],
};

// ── HELPERS ───────────────────────────────────────────────────────────────
function smartMatch(route, ports, query) {
  if (!query.trim()) return true;
  const q = query.toLowerCase().trim();
  const from = ports.find(p => p.id === route.from) || {};
  const to = ports.find(p => p.id === route.to) || {};

  const targets = [
    route.name, route.file, route.id,
    from.name, from.locode, from.keywords,
    to.name, to.locode, to.keywords,
    from.country, to.country,
  ].filter(Boolean).map(s => s.toLowerCase());

  return targets.some(t => t.includes(q));
}

function getPort(ports, id) { return ports.find(p => p.id === id) || { name: id, country:"", flag:"🚢" }; }
function typeTag(type) {
  return { ocean:["tag-ocean","🌊 Ocean"], coastal:["tag-coastal","⚓ Coastal"], deep:["tag-deep","🔵 Deep Sea"] }[type] || ["tag-ocean", type];
}

// ── NOTIFICATION ──────────────────────────────────────────────────────────
function Notif({ msg, type, onClose }) {
  useEffect(() => { const t = setTimeout(onClose, 3500); return () => clearTimeout(t); }, []);
  return <div className={`notif notif-${type}`}>{type==="success"?"✅":type==="error"?"❌":"ℹ️"} {msg}</div>;
}

// ── ROUTE CARD ────────────────────────────────────────────────────────────
function RouteCard({ route, ports, onView, onDownload }) {
  const from = getPort(ports, route.from);
  const to = getPort(ports, route.to);
  const [cls, label] = typeTag(route.type);
  return (
    <div className="route-card">
      <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:5 }}>
        <div className="route-id">{route.id}</div>
        <span className={`route-tag ${cls}`}>{label}</span>
      </div>
      <div className="route-name">{route.name}</div>
      <div className="route-filename">📁 {route.file}</div>
      <div className="route-ports">
        <div className="port-bubble">
          <div style={{ fontSize:"1.2rem" }}>{from.flag}</div>
          <div className="p-name">{from.name}</div>
          <div className="p-country">{from.country}</div>
        </div>
        <div className="route-arrow">
          <div className="route-line"/>
          <span style={{ fontSize:"0.85rem" }}>▶</span>
          <div className="route-line"/>
        </div>
        <div className="port-bubble">
          <div style={{ fontSize:"1.2rem" }}>{to.flag}</div>
          <div className="p-name">{to.name}</div>
          <div className="p-country">{to.country}</div>
        </div>
      </div>
      <div className="route-meta">
        <div className="meta-item"><div className="meta-val">{Number(route.distance).toLocaleString()}</div><div className="meta-key">NM</div></div>
        <div className="meta-item"><div className="meta-val">{Math.floor(route.hours/24)}d {route.hours%24}h</div><div className="meta-key">ETA</div></div>
        <div className="meta-item"><div className="meta-val">{route.waypoints}</div><div className="meta-key">WPTs</div></div>
      </div>
      <div className="route-actions">
        <button className="btn btn-gold" onClick={() => onDownload(route)}>⬇ Download RTZ</button>
        <button className="btn btn-secondary" onClick={() => onView(route)}>Details</button>
      </div>
    </div>
  );
}

// ── ROUTE MODAL ───────────────────────────────────────────────────────────
function RouteModal({ route, ports, onClose, onDownload }) {
  const from = getPort(ports, route.from);
  const to = getPort(ports, route.to);
  const [cls, label] = typeTag(route.type);
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-card" onClick={e=>e.stopPropagation()}>
        <div className="modal-header">
          <div className="modal-title">📋 Route Details</div>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>
        <div style={{ marginBottom:"1rem" }}>
          <span className="badge">{route.id}</span>&nbsp;
          <span className={`route-tag ${cls}`} style={{ display:"inline-flex" }}>{label}</span>
        </div>
        <div className="detail-grid">
          <div className="detail-item"><div className="detail-key">Route Name</div><div className="detail-val">{route.name}</div></div>
          <div className="detail-item"><div className="detail-key">File Name</div><div className="detail-val" style={{ fontSize:"0.75rem", color:"var(--cyan)", fontFamily:"Orbitron,monospace" }}>{route.file}</div></div>
          <div className="detail-item"><div className="detail-key">Departure</div><div className="detail-val">{from.flag} {from.name}</div></div>
          <div className="detail-item"><div className="detail-key">Destination</div><div className="detail-val">{to.flag} {to.name}</div></div>
          <div className="detail-item"><div className="detail-key">Distance</div><div className="detail-val" style={{ color:"var(--cyan)" }}>{Number(route.distance).toLocaleString()} NM</div></div>
          <div className="detail-item"><div className="detail-key">Est. Time</div><div className="detail-val">{Math.floor(route.hours/24)}d {route.hours%24}h</div></div>
          <div className="detail-item"><div className="detail-key">Waypoints</div><div className="detail-val">{route.waypoints}</div></div>
          <div className="detail-item"><div className="detail-key">File Status</div><div className="detail-val" style={{ color: route.fileUrl?"var(--green)":"var(--red)" }}>{route.fileUrl ? "✅ Available" : "❌ Not uploaded"}</div></div>
        </div>
        <div style={{ padding:"10px 12px", background:"var(--bg2)", borderRadius:10, border:"1px solid var(--border)", fontSize:"0.76rem", color:"var(--text2)", marginBottom:"1rem" }}>
          <strong style={{ color:"var(--gold)" }}>⚠ Navigator Note:</strong> Verify with current NtM before departure. Check TSS/VTS requirements at destination.
        </div>
        <div style={{ display:"flex", gap:8 }}>
          {route.fileUrl
            ? <a href={route.fileUrl} target="_blank" rel="noreferrer" className="btn btn-gold" style={{ textDecoration:"none", flex:1 }}>⬇ Download {route.file}</a>
            : <button className="btn btn-secondary" style={{ flex:1 }} disabled>❌ RTZ file not uploaded yet</button>
          }
          <button className="btn btn-secondary btn-sm" onClick={onClose}>Close</button>
        </div>
      </div>
    </div>
  );
}

// ── HOME PAGE ─────────────────────────────────────────────────────────────
function HomePage({ onSearch, ports, routes }) {
  const [query, setQuery] = useState("");
  const [suggestions, setSuggestions] = useState([]);
  const [showSug, setShowSug] = useState(false);
  const wrapRef = useRef();

  useEffect(() => {
    const handler = e => { if (!wrapRef.current?.contains(e.target)) setShowSug(false); };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  useEffect(() => {
    if (!query.trim()) { setSuggestions([]); return; }
    const q = query.toLowerCase();
    const portSugg = ports.filter(p =>
      p.name?.toLowerCase().includes(q) ||
      p.locode?.toLowerCase().includes(q) ||
      p.keywords?.toLowerCase().includes(q) ||
      p.country?.toLowerCase().includes(q)
    ).slice(0, 6);
    setSuggestions(portSugg);
  }, [query, ports]);

  const handleSearch = () => { if (query.trim()) onSearch(query); setShowSug(false); };
  const pickSugg = (p) => { setQuery(p.name); setShowSug(false); onSearch(p.name); };

  return (
    <div>
      <div className="hero">
        <div className="hero-tag">🧭 ECDIS Navigation System v4.2</div>
        <h1 className="hero-title">ECDIS <span className="accent">Route</span> Finder</h1>
        <p className="hero-desc">Search any port name, code, or keyword — all matching routes appear instantly. Download ECDIS-compatible RTZ files for any passage.</p>

        <div className="smart-search-wrap">
          <div className="smart-search-box">
            <div className="smart-search-inner" ref={wrapRef} style={{ position:"relative" }}>
              <div style={{ flex:1, position:"relative" }}>
                <span className="smart-icon">🔍</span>
                <input
                  className="smart-input"
                  placeholder="Type port name, code or keyword… e.g. Mumbai, MUM, Singapore"
                  value={query}
                  onChange={e=>{setQuery(e.target.value);setShowSug(true);}}
                  onFocus={()=>setShowSug(true)}
                  onKeyDown={e=>e.key==="Enter"&&handleSearch()}
                />
                {showSug && suggestions.length > 0 && (
                  <div className="autocomplete">
                    {suggestions.map(p=>(
                      <div key={p.id} className="ac-item" onClick={()=>pickSugg(p)}>
                        <span style={{ fontSize:"1.1rem" }}>{p.flag}</span>
                        <div>
                          <div className="port-name">{p.name}</div>
                          <div className="port-sub">{p.country} · {p.locode} · {routes.filter(r=>r.from===p.id||r.to===p.id).length} routes</div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
              <button className="smart-btn" onClick={handleSearch}>🔍 SEARCH</button>
            </div>
            <div className="search-hint">
              Try: <span>Mumbai</span> · <span>MUM</span> · <span>mumbaitosingapore</span> · <span>Dubai</span> · <span>Singapore</span>
            </div>
          </div>
        </div>

        <div className="stats-bar">
          <div className="stat-item"><div className="stat-num">{routes.length}</div><div className="stat-label">Routes</div></div>
          <div className="stat-item"><div className="stat-num">{ports.length}</div><div className="stat-label">Ports</div></div>
          <div className="stat-item"><div className="stat-num">{ECDIS_BRANDS.length}</div><div className="stat-label">ECDIS Brands</div></div>
          <div className="stat-item"><div className="stat-num">24/7</div><div className="stat-label">Online</div></div>
        </div>
      </div>
    </div>
  );
}

// ── ROUTES PAGE ───────────────────────────────────────────────────────────
function RoutesPage({ searchQuery, notify, ports, routes }) {
  const [filter, setFilter] = useState("all");
  const [localQuery, setLocalQuery] = useState(searchQuery || "");
  const [modal, setModal] = useState(null);

  useEffect(() => { if (searchQuery) setLocalQuery(searchQuery); }, [searchQuery]);

  const filtered = routes.filter(r => {
    const typeOk = filter==="all" || r.type===filter;
    const matchOk = smartMatch(r, ports, localQuery);
    return typeOk && matchOk;
  });

  const handleDownload = r => {
    if (r.fileUrl) { window.open(r.fileUrl, "_blank"); }
    else { notify("RTZ file not uploaded yet. Contact admin.", "error"); }
  };

  return (
    <div className="section">
      <div className="section-header">
        <div className="section-title">🗺 Route Database</div>
        <span className="badge">{filtered.length} routes found</span>
      </div>

      <div style={{ display:"flex", gap:10, marginBottom:"1rem", flexWrap:"wrap", alignItems:"center" }}>
        <div className="input-wrap" style={{ flex:1, minWidth:200 }}>
          <span className="input-icon">🔍</span>
          <input className="search-input" placeholder="Search by port, code, file name…" value={localQuery} onChange={e=>setLocalQuery(e.target.value)} />
        </div>
      </div>

      <div className="filter-bar">
        {["all","ocean","coastal","deep"].map(f=>(
          <button key={f} className={`filter-btn ${filter===f?"active":""}`} onClick={()=>setFilter(f)}>
            {f==="all"?"🌐 All":f==="ocean"?"🌊 Ocean":f==="coastal"?"⚓ Coastal":"🔵 Deep Sea"}
          </button>
        ))}
      </div>

      {filtered.length===0
        ? <div className="empty-state">
            <div className="empty-icon">🧭</div>
            <div className="empty-title">No Routes Found</div>
            <div className="empty-desc">Try searching "Mumbai", "MUM", or "mumbaitosingapore"</div>
          </div>
        : <div className="routes-grid">{filtered.map(r=><RouteCard key={r.id} route={r} ports={ports} onView={setModal} onDownload={handleDownload}/>)}</div>
      }
      {modal && <RouteModal route={modal} ports={ports} onClose={()=>setModal(null)} onDownload={handleDownload}/>}
    </div>
  );
}

// ── CHARTS PAGE ───────────────────────────────────────────────────────────
function ChartsPage({ notify, chartData }) {
  const [openBrand, setOpenBrand] = useState("furuno");
  const [search, setSearch] = useState("");

  return (
    <div className="section">
      <div className="section-header">
        <div className="section-title">🗺 ECDIS Chart Library</div>
        <span className="badge badge-gold">8 ECDIS Brands</span>
      </div>

      <div className="input-wrap" style={{ marginBottom:"1.5rem", maxWidth:420 }}>
        <span className="input-icon">🔍</span>
        <input className="search-input" placeholder="Search charts by region or name…" value={search} onChange={e=>setSearch(e.target.value)} />
      </div>

      <div className="ecdis-brands">
        {ECDIS_BRANDS.map(brand => {
          const charts = (chartData[brand.id] || []).filter(c =>
            !search || c.name?.toLowerCase().includes(search.toLowerCase()) || c.region?.toLowerCase().includes(search.toLowerCase())
          );
          const isOpen = openBrand === brand.id;
          return (
            <div key={brand.id} className="brand-section">
              <div className="brand-header" onClick={()=>setOpenBrand(isOpen ? null : brand.id)}>
                <div className="brand-logo" style={{ background: brand.color + "22", border: `1px solid ${brand.color}44` }}>
                  {brand.emoji}
                </div>
                <div>
                  <div className="brand-name">{brand.name}</div>
                  <div className="brand-sub">{brand.sub}</div>
                  <div style={{ display:"flex", gap:5, marginTop:4, flexWrap:"wrap" }}>
                    {brand.models.map(m=><span key={m} style={{ fontSize:"0.62rem", padding:"2px 6px", borderRadius:4, background: brand.color+"22", color: brand.color, border:`1px solid ${brand.color}33` }}>{m}</span>)}
                  </div>
                </div>
                <div className="brand-count">
                  <span className="badge badge-gold">{charts.length} charts</span>
                </div>
                <span className={`brand-chevron ${isOpen?"open":""}`}>▼</span>
              </div>
              {isOpen && (
                charts.length === 0
                  ? <div className="empty-state" style={{ padding:"2rem" }}>
                      <div className="empty-icon" style={{ fontSize:"2rem" }}>🗺</div>
                      <div className="empty-title" style={{ fontSize:"0.85rem" }}>No charts uploaded yet</div>
                      <div className="empty-desc">Admin can upload chart files from the Admin panel</div>
                    </div>
                  : <div className="charts-grid">
                      {charts.map(c=>(
                        <div key={c.id} className="chart-card">
                          <div className="chart-card-name">{c.name}</div>
                          <div className="chart-card-region">📍 {c.region}</div>
                          <div className="chart-card-meta">
                            <span className="chart-meta-tag">Scale {c.scale}</span>
                            <span className="chart-meta-tag">Ed. {c.edition}</span>
                          </div>
                          {c.fileUrl
                            ? <a href={c.fileUrl} target="_blank" rel="noreferrer" className="btn btn-gold btn-sm" style={{ textDecoration:"none", display:"inline-flex" }}>⬇ Download</a>
                            : <button className="btn btn-secondary btn-sm" disabled>Not uploaded</button>
                          }
                        </div>
                      ))}
                    </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── ADMIN PAGE ────────────────────────────────────────────────────────────
function AdminPage({ notify, ports, routes, setPorts, setRoutes, chartData, setChartData }) {
  const [user, setUser] = useState(null);
  const [email, setEmail] = useState(""); const [pass, setPass] = useState("");
  const [err, setErr] = useState(""); const [authLoading, setAuthLoading] = useState(false);
  const [section, setSection] = useState("dashboard");
  const [modal, setModal] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [nr, setNr] = useState({ name:"", from:"", to:"", distance:"", hours:"", type:"ocean", file:"", waypoints:"8" });
  const [np, setNp] = useState({ name:"", country:"", flag:"🚢", coords:"", locode:"", charts:"", keywords:"" });
  const [nc, setNc] = useState({ brand:"furuno", name:"", region:"", scale:"", edition:"2024" });

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, u => setUser(u));
    return () => unsub();
  }, []);

  const login = async () => {
    setAuthLoading(true); setErr("");
    try { await signInWithEmailAndPassword(auth, email, pass); }
    catch(e) { setErr("Invalid email or password."); }
    setAuthLoading(false);
  };

  const addRoute = async () => {
    if (!nr.name || !nr.distance || !nr.from || !nr.to) { notify("Fill all required fields","error"); return; }
    try {
      const id = `RT-${String(routes.length+1).padStart(3,"0")}`;
      const data = { ...nr, id, distance:+nr.distance, hours:+nr.hours||0, waypoints:+nr.waypoints||8, fileUrl:"" };
      await setDoc(doc(db,"routes",id), data);
      setRoutes(r=>[...r,data]);
      setModal(null); notify("Route saved to Firebase ✅","success");
      setNr({ name:"", from:"", to:"", distance:"", hours:"", type:"ocean", file:"", waypoints:"8" });
    } catch(e) { notify("Error: "+e.message,"error"); }
  };

  const deleteRoute = async id => {
    try { await deleteDoc(doc(db,"routes",id)); setRoutes(r=>r.filter(x=>x.id!==id)); notify("Route deleted","success"); }
    catch(e) { notify("Error: "+e.message,"error"); }
  };

  const addPort = async () => {
    if (!np.name || !np.country) { notify("Fill required fields","error"); return; }
    try {
      const id = np.locode || np.name.substring(0,3).toUpperCase();
      const data = { ...np, id, charts: np.charts ? np.charts.split(",").map(c=>c.trim()) : [], keywords: (np.keywords || np.name+" "+np.locode).toLowerCase() };
      await setDoc(doc(db,"ports",id), data);
      setPorts(p=>[...p,data]);
      setModal(null); notify("Port saved to Firebase ✅","success");
      setNp({ name:"", country:"", flag:"🚢", coords:"", locode:"", charts:"", keywords:"" });
    } catch(e) { notify("Error: "+e.message,"error"); }
  };

  const deletePort = async id => {
    try { await deleteDoc(doc(db,"ports",id)); setPorts(p=>p.filter(x=>x.id!==id)); notify("Port deleted","success"); }
    catch(e) { notify("Error: "+e.message,"error"); }
  };

  const uploadRTZ = async (e, routeId) => {
    const file = e.target.files[0]; if (!file) return;
    setUploading(true);
    try {
      const storageRef = ref(storage, `routes/${routeId}/${file.name}`);
      await uploadBytes(storageRef, file);
      const url = await getDownloadURL(storageRef);
      await setDoc(doc(db,"routes",routeId), { fileUrl:url, file:file.name }, { merge:true });
      setRoutes(r=>r.map(x=>x.id===routeId?{...x,fileUrl:url,file:file.name}:x));
      notify("RTZ uploaded ✅","success");
    } catch(e) { notify("Upload failed: "+e.message,"error"); }
    setUploading(false);
  };

  const uploadChart = async (e, brand, chartId) => {
    const file = e.target.files[0]; if (!file) return;
    setUploading(true);
    try {
      const storageRef = ref(storage, `charts/${brand}/${file.name}`);
      await uploadBytes(storageRef, file);
      const url = await getDownloadURL(storageRef);
      await setDoc(doc(db,`charts_${brand}`,chartId), { fileUrl:url }, { merge:true });
      setChartData(prev => ({
        ...prev,
        [brand]: (prev[brand]||[]).map(c => c.id===chartId ? {...c,fileUrl:url} : c)
      }));
      notify("Chart uploaded ✅","success");
    } catch(e) { notify("Upload failed: "+e.message,"error"); }
    setUploading(false);
  };

  const addChart = async () => {
    if (!nc.name || !nc.region) { notify("Fill chart name and region","error"); return; }
    try {
      const id = `${nc.brand.toUpperCase()}-${Date.now()}`;
      const data = { ...nc, id, fileUrl:"" };
      await setDoc(doc(db,`charts_${nc.brand}`,id), data);
      setChartData(prev => ({ ...prev, [nc.brand]: [...(prev[nc.brand]||[]), data] }));
      setModal(null); notify("Chart added ✅","success");
      setNc({ brand:"furuno", name:"", region:"", scale:"", edition:"2024" });
    } catch(e) { notify("Error: "+e.message,"error"); }
  };

  if (!user) return (
    <div className="admin-login">
      <div className="login-card">
        <div className="login-logo">
          <div className="login-icon">🛡</div>
          <div className="login-title">Admin Access</div>
          <div className="login-sub">ECDIS Route Finder — Secure Portal</div>
        </div>
        <div style={{ background:"rgba(0,180,216,0.06)", border:"1px solid rgba(0,180,216,0.15)", borderRadius:10, padding:"10px 14px", fontSize:"0.78rem", color:"var(--text2)", marginBottom:"1.2rem", textAlign:"center" }}>
          🔐 Login with your Firebase Admin credentials
        </div>
        <div className="form-field"><label className="form-label">Email</label><input className="form-input" type="email" placeholder="admin@example.com" value={email} onChange={e=>setEmail(e.target.value)} onKeyDown={e=>e.key==="Enter"&&login()} /></div>
        <div className="form-field"><label className="form-label">Password</label><input className="form-input" type="password" placeholder="••••••••" value={pass} onChange={e=>setPass(e.target.value)} onKeyDown={e=>e.key==="Enter"&&login()} /></div>
        {err && <div className="error-msg">{err}</div>}
        <button className="search-btn-full" onClick={login} disabled={authLoading}>{authLoading?"Logging in…":"🔐 LOGIN"}</button>
      </div>
    </div>
  );

  const sideItems = [
    { key:"dashboard", icon:"📊", label:"Dashboard" },
    { key:"routes", icon:"🗺", label:"Manage Routes" },
    { key:"ports", icon:"⚓", label:"Manage Ports" },
    { key:"charts", icon:"🗺", label:"Manage Charts" },
    { key:"upload", icon:"⬆", label:"Upload RTZ Files" },
  ];

  return (
    <div>
      <div className="admin-mobile-tabs">
        {sideItems.map(s=><button key={s.key} className={`admin-mob-tab ${section===s.key?"active":""}`} onClick={()=>setSection(s.key)}>{s.icon} {s.label}</button>)}
        <button className="admin-mob-tab" onClick={()=>signOut(auth)}>🚪 Logout</button>
      </div>

      <div className="admin-layout">
        <div className="admin-sidebar">
          <div style={{ marginBottom:"1.5rem" }}>
            <div className="sidebar-label">Navigation</div>
            {sideItems.map(s=><div key={s.key} className={`sidebar-item ${section===s.key?"active":""}`} onClick={()=>setSection(s.key)}><span className="s-icon">{s.icon}</span>{s.label}</div>)}
          </div>
          <div>
            <div className="sidebar-label">Account</div>
            <div className="sidebar-item" style={{ fontSize:"0.72rem", color:"var(--text3)" }}><span className="s-icon">👤</span>{user.email}</div>
            <div className="sidebar-item" onClick={()=>signOut(auth)}><span className="s-icon">🚪</span>Logout</div>
          </div>
        </div>

        <div className="admin-content">

          {/* DASHBOARD */}
          {section==="dashboard" && (
            <>
              <div className="admin-header"><div className="admin-page-title">📊 Dashboard</div><span style={{ fontSize:"0.75rem", color:"var(--green)" }}>🔥 Firebase Live</span></div>
              <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(155px,1fr))", gap:"1rem", marginBottom:"2rem" }}>
                {[
                  { label:"Total Routes", val:routes.length, icon:"🗺", c:"var(--cyan)" },
                  { label:"Total Ports", val:ports.length, icon:"⚓", c:"var(--green)" },
                  { label:"RTZ Uploaded", val:routes.filter(r=>r.fileUrl).length, icon:"📁", c:"var(--gold)" },
                  { label:"ECDIS Brands", val:ECDIS_BRANDS.length, icon:"🖥", c:"var(--purple)" },
                ].map(s=>(
                  <div key={s.label} className="route-card" style={{ padding:"1.1rem" }}>
                    <div style={{ fontSize:"1.8rem", marginBottom:5 }}>{s.icon}</div>
                    <div style={{ fontFamily:"Orbitron,monospace", fontSize:"1.8rem", fontWeight:700, color:s.c }}>{s.val}</div>
                    <div style={{ fontSize:"0.68rem", color:"var(--text2)", textTransform:"uppercase", letterSpacing:"0.08em" }}>{s.label}</div>
                  </div>
                ))}
              </div>
              <div style={{ background:"var(--card)", border:"1px solid var(--border)", borderRadius:14, padding:"1.2rem" }}>
                <div style={{ fontFamily:"Orbitron,monospace", fontSize:"0.82rem", marginBottom:"1rem", color:"var(--cyan)" }}>🔥 Firebase Status</div>
                {[
                  { l:"Firestore Database", v:"Connected ✅" },
                  { l:"Firebase Auth", v:"Active ✅" },
                  { l:"Firebase Storage", v:"Ready ✅" },
                  { l:"Admin", v:user.email },
                ].map((x,i)=>(
                  <div key={i} style={{ display:"flex", justifyContent:"space-between", padding:"9px 0", borderBottom:"1px solid var(--border)", fontSize:"0.82rem" }}>
                    <span style={{ color:"var(--text2)" }}>{x.l}</span>
                    <span style={{ color:"var(--green)" }}>{x.v}</span>
                  </div>
                ))}
              </div>
            </>
          )}

          {/* MANAGE ROUTES */}
          {section==="routes" && (
            <>
              <div className="admin-header">
                <div className="admin-page-title">🗺 Manage Routes</div>
                <button className="btn btn-primary btn-sm" onClick={()=>setModal("addRoute")}>➕ Add Route</button>
              </div>
              <div className="table-wrap">
                <table className="data-table">
                  <thead><tr><th>ID</th><th>Route Name</th><th>File Name</th><th>From → To</th><th>Dist.</th><th>RTZ Status</th><th>Actions</th></tr></thead>
                  <tbody>{routes.map(r=>{
                    const f=getPort(ports,r.from); const t=getPort(ports,r.to);
                    return <tr key={r.id}>
                      <td><span style={{ fontFamily:"Orbitron,monospace", fontSize:"0.7rem", color:"var(--cyan)" }}>{r.id}</span></td>
                      <td style={{ maxWidth:160 }}>{r.name}</td>
                      <td><span style={{ fontFamily:"Orbitron,monospace", fontSize:"0.7rem", color:"var(--gold)" }}>{r.file}</span></td>
                      <td>{f?.flag}{f?.name} → {t?.flag}{t?.name}</td>
                      <td><span style={{ fontFamily:"Orbitron,monospace", fontSize:"0.8rem" }}>{r.distance} NM</span></td>
                      <td>{r.fileUrl?<span style={{ color:"var(--green)", fontSize:"0.75rem" }}>✅ Ready</span>:<span style={{ color:"var(--red)", fontSize:"0.75rem" }}>❌ Missing</span>}</td>
                      <td><div style={{ display:"flex", gap:5 }}>
                        <label className="btn btn-gold btn-sm" style={{ cursor:"pointer" }} title="Upload RTZ">
                          ⬆
                          <input type="file" accept=".rtz,.rtzp" style={{ display:"none" }} onChange={e=>uploadRTZ(e,r.id)} disabled={uploading} />
                        </label>
                        <button className="btn btn-danger btn-sm" onClick={()=>deleteRoute(r.id)}>🗑</button>
                      </div></td>
                    </tr>;
                  })}</tbody>
                </table>
              </div>
            </>
          )}

          {/* MANAGE PORTS */}
          {section==="ports" && (
            <>
              <div className="admin-header">
                <div className="admin-page-title">⚓ Manage Ports</div>
                <button className="btn btn-primary btn-sm" onClick={()=>setModal("addPort")}>➕ Add Port</button>
              </div>
              <div className="table-wrap">
                <table className="data-table">
                  <thead><tr><th>Flag</th><th>Name</th><th>Country</th><th>LOCODE</th><th>Keywords</th><th>Actions</th></tr></thead>
                  <tbody>{ports.map(p=>(
                    <tr key={p.id}>
                      <td style={{ fontSize:"1.3rem" }}>{p.flag}</td>
                      <td><strong>{p.name}</strong></td>
                      <td>{p.country}</td>
                      <td><span style={{ fontFamily:"Orbitron,monospace", fontSize:"0.7rem", color:"var(--cyan)" }}>{p.locode}</span></td>
                      <td><span style={{ fontSize:"0.72rem", color:"var(--text2)" }}>{p.keywords}</span></td>
                      <td><button className="btn btn-danger btn-sm" onClick={()=>deletePort(p.id)}>🗑</button></td>
                    </tr>
                  ))}</tbody>
                </table>
              </div>
            </>
          )}

          {/* MANAGE CHARTS */}
          {section==="charts" && (
            <>
              <div className="admin-header">
                <div className="admin-page-title">🗺 Manage Charts</div>
                <button className="btn btn-gold btn-sm" onClick={()=>setModal("addChart")}>➕ Add Chart</button>
              </div>
              {ECDIS_BRANDS.map(brand=>(
                <div key={brand.id} style={{ marginBottom:"1.5rem" }}>
                  <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:"0.8rem" }}>
                    <span style={{ fontSize:"1.2rem" }}>{brand.emoji}</span>
                    <span style={{ fontFamily:"Orbitron,monospace", fontSize:"0.85rem", fontWeight:700 }}>{brand.name}</span>
                    <span className="badge badge-gold">{(chartData[brand.id]||[]).length} charts</span>
                  </div>
                  {(chartData[brand.id]||[]).length === 0
                    ? <div style={{ padding:"12px 16px", background:"var(--bg2)", borderRadius:10, border:"1px solid var(--border)", fontSize:"0.8rem", color:"var(--text3)" }}>No charts yet — add one above</div>
                    : (chartData[brand.id]||[]).map(c=>(
                        <div key={c.id} className="upload-row">
                          <div className="upload-label">
                            {c.name}
                            <span>{c.region} · Scale {c.scale} · Ed. {c.edition}</span>
                          </div>
                          <div style={{ display:"flex", gap:6, alignItems:"center" }}>
                            {c.fileUrl
                              ? <a href={c.fileUrl} target="_blank" rel="noreferrer" style={{ fontSize:"0.74rem", color:"var(--green)" }}>✅ Uploaded</a>
                              : <label className="btn btn-gold btn-sm" style={{ cursor:"pointer" }}>
                                  ⬆ Upload
                                  <input type="file" style={{ display:"none" }} onChange={e=>uploadChart(e,brand.id,c.id)} disabled={uploading} />
                                </label>
                            }
                          </div>
                        </div>
                      ))
                  }
                </div>
              ))}
            </>
          )}

          {/* UPLOAD RTZ */}
          {section==="upload" && (
            <>
              <div className="admin-page-title" style={{ marginBottom:"1.2rem" }}>⬆ Upload RTZ Files</div>
              <div style={{ background:"rgba(0,180,216,0.06)", border:"1px solid rgba(0,180,216,0.2)", borderRadius:12, padding:"12px 16px", fontSize:"0.8rem", color:"var(--text2)", marginBottom:"1.2rem" }}>
                💡 <strong style={{ color:"var(--text)" }}>How it works:</strong> Click <strong style={{ color:"var(--gold)" }}>⬆ Upload</strong> next to any route, select your .rtz file — it uploads to Firebase Storage and becomes downloadable for users instantly.
              </div>
              {routes.map(r=>(
                <div key={r.id} className="upload-row">
                  <div className="upload-label">
                    {r.name}
                    <span>{r.file}</span>
                  </div>
                  <div style={{ display:"flex", gap:6, alignItems:"center" }}>
                    {r.fileUrl && <a href={r.fileUrl} target="_blank" rel="noreferrer" style={{ fontSize:"0.74rem", color:"var(--green)" }}>✅ Live</a>}
                    <label className="btn btn-gold btn-sm" style={{ cursor:"pointer" }}>
                      {r.fileUrl ? "🔄 Replace" : "⬆ Upload"}
                      <input type="file" accept=".rtz,.rtzp" style={{ display:"none" }} onChange={e=>uploadRTZ(e,r.id)} disabled={uploading} />
                    </label>
                  </div>
                </div>
              ))}
              {uploading && <div className="loading"><div className="spinner"/><span>Uploading to Firebase Storage…</span></div>}
            </>
          )}
        </div>
      </div>

      {/* ADD ROUTE MODAL */}
      {modal==="addRoute" && (
        <div className="modal-overlay" onClick={()=>setModal(null)}>
          <div className="modal-card" onClick={e=>e.stopPropagation()}>
            <div className="modal-header"><div className="modal-title">➕ Add Route</div><button className="modal-close" onClick={()=>setModal(null)}>✕</button></div>
            <div className="form-field"><label className="form-label">Route Name * (e.g. Mumbai to Singapore)</label><input className="form-input" placeholder="Mumbai to Singapore" value={nr.name} onChange={e=>setNr(r=>({...r,name:e.target.value}))} /></div>
            <div className="form-field"><label className="form-label">RTZ File Name * (exact file name)</label><input className="form-input" placeholder="mumbaitosingapore.rtz" value={nr.file} onChange={e=>setNr(r=>({...r,file:e.target.value}))} /></div>
            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10 }}>
              <div className="form-field"><label className="form-label">Departure Port *</label>
                <select className="form-input" value={nr.from} onChange={e=>setNr(r=>({...r,from:e.target.value}))}>
                  <option value="">Select…</option>{ports.map(p=><option key={p.id} value={p.id}>{p.name} ({p.id})</option>)}
                </select>
              </div>
              <div className="form-field"><label className="form-label">Arrival Port *</label>
                <select className="form-input" value={nr.to} onChange={e=>setNr(r=>({...r,to:e.target.value}))}>
                  <option value="">Select…</option>{ports.map(p=><option key={p.id} value={p.id}>{p.name} ({p.id})</option>)}
                </select>
              </div>
              <div className="form-field"><label className="form-label">Distance (NM) *</label><input className="form-input" type="number" placeholder="2780" value={nr.distance} onChange={e=>setNr(r=>({...r,distance:e.target.value}))} /></div>
              <div className="form-field"><label className="form-label">Est. Hours</label><input className="form-input" type="number" placeholder="148" value={nr.hours} onChange={e=>setNr(r=>({...r,hours:e.target.value}))} /></div>
              <div className="form-field"><label className="form-label">Waypoints</label><input className="form-input" type="number" placeholder="10" value={nr.waypoints} onChange={e=>setNr(r=>({...r,waypoints:e.target.value}))} /></div>
              <div className="form-field"><label className="form-label">Type</label>
                <select className="form-input" value={nr.type} onChange={e=>setNr(r=>({...r,type:e.target.value}))}>
                  <option value="ocean">🌊 Ocean</option><option value="coastal">⚓ Coastal</option><option value="deep">🔵 Deep Sea</option>
                </select>
              </div>
            </div>
            <div style={{ display:"flex", gap:8 }}>
              <button className="btn btn-primary" onClick={addRoute}>✅ Save to Firebase</button>
              <button className="btn btn-secondary btn-sm" onClick={()=>setModal(null)}>Cancel</button>
            </div>
          </div>
        </div>
      )}

      {/* ADD PORT MODAL */}
      {modal==="addPort" && (
        <div className="modal-overlay" onClick={()=>setModal(null)}>
          <div className="modal-card" onClick={e=>e.stopPropagation()}>
            <div className="modal-header"><div className="modal-title">➕ Add Port</div><button className="modal-close" onClick={()=>setModal(null)}>✕</button></div>
            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10 }}>
              <div className="form-field" style={{ gridColumn:"1/-1" }}><label className="form-label">Port Name *</label><input className="form-input" placeholder="Mumbai" value={np.name} onChange={e=>setNp(p=>({...p,name:e.target.value}))} /></div>
              <div className="form-field"><label className="form-label">Country *</label><input className="form-input" placeholder="India" value={np.country} onChange={e=>setNp(p=>({...p,country:e.target.value}))} /></div>
              <div className="form-field"><label className="form-label">Flag Emoji</label><input className="form-input" placeholder="🇮🇳" value={np.flag} onChange={e=>setNp(p=>({...p,flag:e.target.value}))} /></div>
              <div className="form-field"><label className="form-label">UN/LOCODE</label><input className="form-input" placeholder="INMUM" value={np.locode} onChange={e=>setNp(p=>({...p,locode:e.target.value}))} /></div>
              <div className="form-field"><label className="form-label">Coordinates</label><input className="form-input" placeholder="18°54′N 72°49′E" value={np.coords} onChange={e=>setNp(p=>({...p,coords:e.target.value}))} /></div>
              <div className="form-field" style={{ gridColumn:"1/-1" }}><label className="form-label">Search Keywords (space separated)</label><input className="form-input" placeholder="mum mumbai bombay india" value={np.keywords} onChange={e=>setNp(p=>({...p,keywords:e.target.value}))} /></div>
              <div className="form-field" style={{ gridColumn:"1/-1" }}><label className="form-label">Chart Codes (comma separated)</label><input className="form-input" placeholder="IN-C17, IN-C18" value={np.charts} onChange={e=>setNp(p=>({...p,charts:e.target.value}))} /></div>
            </div>
            <div style={{ display:"flex", gap:8 }}>
              <button className="btn btn-primary" onClick={addPort}>✅ Save to Firebase</button>
              <button className="btn btn-secondary btn-sm" onClick={()=>setModal(null)}>Cancel</button>
            </div>
          </div>
        </div>
      )}

      {/* ADD CHART MODAL */}
      {modal==="addChart" && (
        <div className="modal-overlay" onClick={()=>setModal(null)}>
          <div className="modal-card" onClick={e=>e.stopPropagation()}>
            <div className="modal-header"><div className="modal-title">➕ Add Chart</div><button className="modal-close" onClick={()=>setModal(null)}>✕</button></div>
            <div className="form-field"><label className="form-label">ECDIS Brand *</label>
              <select className="form-input" value={nc.brand} onChange={e=>setNc(c=>({...c,brand:e.target.value}))}>
                {ECDIS_BRANDS.map(b=><option key={b.id} value={b.id}>{b.emoji} {b.name}</option>)}
              </select>
            </div>
            <div className="form-field"><label className="form-label">Chart Name *</label><input className="form-input" placeholder="Arabian Sea Full Coverage" value={nc.name} onChange={e=>setNc(c=>({...c,name:e.target.value}))} /></div>
            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10 }}>
              <div className="form-field"><label className="form-label">Region *</label><input className="form-input" placeholder="Arabian Sea" value={nc.region} onChange={e=>setNc(c=>({...c,region:e.target.value}))} /></div>
              <div className="form-field"><label className="form-label">Scale</label><input className="form-input" placeholder="1:1,500,000" value={nc.scale} onChange={e=>setNc(c=>({...c,scale:e.target.value}))} /></div>
              <div className="form-field"><label className="form-label">Edition Year</label><input className="form-input" placeholder="2024" value={nc.edition} onChange={e=>setNc(c=>({...c,edition:e.target.value}))} /></div>
            </div>
            <div style={{ display:"flex", gap:8 }}>
              <button className="btn btn-gold" onClick={addChart}>✅ Add Chart Entry</button>
              <button className="btn btn-secondary btn-sm" onClick={()=>setModal(null)}>Cancel</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ── MAIN APP ──────────────────────────────────────────────────────────────
export default function App() {
  const [tab, setTab] = useState("home");
  const [searchQuery, setSearchQuery] = useState("");
  const [notif, setNotif] = useState(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [ports, setPorts] = useState(DEMO_PORTS);
  const [routes, setRoutes] = useState(DEMO_ROUTES);
  const [chartData, setChartData] = useState(DEMO_CHARTS);
  const [dbLoading, setDbLoading] = useState(true);

  const notify = (msg, type="success") => setNotif({ msg, type, key:Date.now() });

  useEffect(() => {
    const load = async () => {
      try {
        const [ps, rs] = await Promise.all([getDocs(collection(db,"ports")), getDocs(collection(db,"routes"))]);
        const fp = ps.docs.map(d=>({id:d.id,...d.data()}));
        const fr = rs.docs.map(d=>({id:d.id,...d.data()}));
        if (fp.length>0) setPorts(fp);
        if (fr.length>0) setRoutes(fr);

        // Load charts per brand
        const cd = {};
        await Promise.all(ECDIS_BRANDS.map(async b => {
          try {
            const snap = await getDocs(collection(db,`charts_${b.id}`));
            cd[b.id] = snap.docs.map(d=>({id:d.id,...d.data()}));
          } catch { cd[b.id] = DEMO_CHARTS[b.id]||[]; }
        }));
        setChartData(cd);
      } catch(e) { console.log("Using demo data"); }
      setDbLoading(false);
    };
    load();
  }, []);

  const tabs = [
    { key:"home", icon:"🏠", label:"Home" },
    { key:"routes", icon:"🗺", label:"Routes" },
    { key:"charts", icon:"📊", label:"Charts", gold:true },
    { key:"admin", icon:"🛡", label:"Admin" },
  ];

  const handleSearch = (q) => { setSearchQuery(q); setTab("routes"); setMenuOpen(false); };
  const switchTab = k => { setTab(k); setMenuOpen(false); };

  return (
    <>
      <style>{style}</style>
      <div className="grid-bg"/>
      <div className="app">
        <nav className="navbar">
          <div className="nav-brand">
            <div className="nav-logo">🧭</div>
            <div>
              <div className="nav-title">ECDIS Route Finder</div>
              <div className="nav-subtitle">Maritime Navigation System</div>
            </div>
          </div>
          <div className="nav-tabs">
            {tabs.map(t=>(
              <button key={t.key} className={`nav-tab ${t.gold?"chart-tab":""} ${tab===t.key?"active":""}`} onClick={()=>switchTab(t.key)}>
                {t.icon} {t.label}
              </button>
            ))}
          </div>
          <div style={{ display:"flex", alignItems:"center", gap:12 }}>
            <div className="nav-status"><div className="status-dot"/>Online</div>
            <button className="hamburger" onClick={()=>setMenuOpen(o=>!o)}>
              <span/><span/><span/>
            </button>
          </div>
        </nav>

        <div className={`mobile-menu ${menuOpen?"open":""}`}>
          {tabs.map(t=>(
            <button key={t.key} className={`mobile-tab ${tab===t.key?"active":""}`} onClick={()=>switchTab(t.key)}>
              {t.icon} {t.label}
            </button>
          ))}
        </div>

        {dbLoading && <div className="loading"><div className="spinner"/><span>Connecting to Firebase…</span></div>}

        {!dbLoading && tab==="home" && <HomePage onSearch={handleSearch} ports={ports} routes={routes}/>}
        {!dbLoading && tab==="routes" && <RoutesPage searchQuery={searchQuery} notify={notify} ports={ports} routes={routes}/>}
        {!dbLoading && tab==="charts" && <ChartsPage notify={notify} chartData={chartData}/>}
        {!dbLoading && tab==="admin" && <AdminPage notify={notify} ports={ports} routes={routes} setPorts={setPorts} setRoutes={setRoutes} chartData={chartData} setChartData={setChartData}/>}

        {notif && <Notif key={notif.key} msg={notif.msg} type={notif.type} onClose={()=>setNotif(null)}/>}
      </div>
    </>
  );
}
