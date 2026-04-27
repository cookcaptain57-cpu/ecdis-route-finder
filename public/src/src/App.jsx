import { useState, useEffect, useRef, useMemo } from "react";

const style = `
  @import url('https://fonts.googleapis.com/css2?family=Orbitron:wght@400;600;700;900&family=Exo+2:ital,wght@0,300;0,400;0,500;0,600;1,300&display=swap');

  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

  :root {
    --bg: #040C1A;
    --bg2: #071428;
    --card: #0B1D35;
    --card2: #0F2444;
    --border: #1A3A5C;
    --border2: #1E4570;
    --navy: #0E3460;
    --blue: #1565C0;
    --cyan: #00B4D8;
    --cyan2: #0096c7;
    --gold: #F0A500;
    --gold2: #D4900A;
    --green: #00C896;
    --red: #FF4757;
    --text: #E2EBF8;
    --text2: #8A9BBF;
    --text3: #4A5F80;
    --glow: 0 0 20px rgba(0,180,216,0.25);
    --glow2: 0 0 40px rgba(0,180,216,0.15);
  }

  html { scroll-behavior: smooth; }

  body {
    font-family: 'Exo 2', sans-serif;
    background: var(--bg);
    color: var(--text);
    min-height: 100vh;
    overflow-x: hidden;
  }

  .grid-bg {
    position: fixed; inset: 0; z-index: 0; pointer-events: none;
    background-image:
      linear-gradient(rgba(0,180,216,0.04) 1px, transparent 1px),
      linear-gradient(90deg, rgba(0,180,216,0.04) 1px, transparent 1px);
    background-size: 60px 60px;
    animation: gridMove 20s linear infinite;
  }
  @keyframes gridMove { to { background-position: 60px 60px; } }

  .scanline {
    position: fixed; inset: 0; z-index: 1; pointer-events: none;
    background: repeating-linear-gradient(
      0deg, transparent, transparent 2px,
      rgba(0,0,0,0.03) 2px, rgba(0,0,0,0.03) 4px
    );
  }

  .app { position: relative; z-index: 2; min-height: 100vh; }

  .navbar {
    position: sticky; top: 0; z-index: 100;
    background: rgba(4,12,26,0.92);
    backdrop-filter: blur(20px);
    border-bottom: 1px solid var(--border);
    padding: 0 2rem;
    display: flex; align-items: center; justify-content: space-between;
    height: 64px;
    box-shadow: 0 4px 30px rgba(0,0,0,0.5);
  }
  .nav-brand { display: flex; align-items: center; gap: 12px; }
  .nav-logo {
    width: 38px; height: 38px;
    background: linear-gradient(135deg, var(--cyan), var(--blue));
    border-radius: 10px;
    display: flex; align-items: center; justify-content: center;
    font-size: 20px;
    box-shadow: 0 0 15px rgba(0,180,216,0.4);
  }
  .nav-title {
    font-family: 'Orbitron', monospace;
    font-size: 0.95rem; font-weight: 700; letter-spacing: 0.08em;
    color: var(--text);
  }
  .nav-subtitle { font-size: 0.65rem; color: var(--cyan); letter-spacing: 0.15em; text-transform: uppercase; }

  .nav-tabs { display: flex; gap: 2px; }
  .nav-tab {
    padding: 8px 16px; border: none; background: transparent;
    color: var(--text2); font-family: 'Exo 2', sans-serif;
    font-size: 0.82rem; font-weight: 500; letter-spacing: 0.05em;
    cursor: pointer; border-radius: 8px; transition: all 0.2s;
    display: flex; align-items: center; gap: 7px;
    text-transform: uppercase;
  }
  .nav-tab:hover { color: var(--text); background: rgba(255,255,255,0.05); }
  .nav-tab.active {
    color: var(--cyan); background: rgba(0,180,216,0.1);
    border: 1px solid rgba(0,180,216,0.2);
  }
  .nav-tab .dot { width: 6px; height: 6px; border-radius: 50%; background: var(--text3); }
  .nav-tab.active .dot { background: var(--cyan); box-shadow: 0 0 6px var(--cyan); }

  .nav-status { display: flex; align-items: center; gap: 8px; font-size: 0.72rem; color: var(--text2); }
  .status-dot {
    width: 8px; height: 8px; border-radius: 50%;
    background: var(--green); box-shadow: 0 0 8px var(--green);
    animation: pulse 2s infinite;
  }
  @keyframes pulse { 0%,100% { opacity: 1; } 50% { opacity: 0.4; } }

  .hero { padding: 5rem 2rem 3rem; text-align: center; position: relative; }
  .hero-tag {
    display: inline-flex; align-items: center; gap: 8px;
    padding: 6px 14px; border-radius: 100px;
    border: 1px solid rgba(0,180,216,0.3);
    background: rgba(0,180,216,0.08);
    font-size: 0.72rem; color: var(--cyan);
    letter-spacing: 0.12em; text-transform: uppercase;
    margin-bottom: 1.5rem;
  }
  .hero-title {
    font-family: 'Orbitron', monospace;
    font-size: clamp(2rem, 5vw, 3.5rem);
    font-weight: 900; line-height: 1.1;
    letter-spacing: 0.04em; margin-bottom: 1rem;
  }
  .hero-title .accent { color: var(--cyan); }
  .hero-desc {
    max-width: 560px; margin: 0 auto 3rem;
    color: var(--text2); font-size: 1rem; line-height: 1.7; font-weight: 300;
  }
  .compass-ring {
    position: absolute; right: 5%; top: 10%;
    width: 180px; height: 180px; opacity: 0.06;
    border: 2px solid var(--cyan); border-radius: 50%;
    display: flex; align-items: center; justify-content: center;
    animation: spin 30s linear infinite;
  }
  .compass-ring::before {
    content: ''; position: absolute; width: 140px; height: 140px;
    border: 1px dashed var(--cyan); border-radius: 50%;
  }
  @keyframes spin { to { transform: rotate(360deg); } }

  .search-container { max-width: 900px; margin: 0 auto; }
  .search-card {
    background: var(--card); border: 1px solid var(--border);
    border-radius: 20px; padding: 2rem;
    box-shadow: 0 20px 60px rgba(0,0,0,0.5), var(--glow2);
  }
  .search-grid { display: grid; grid-template-columns: 1fr 1fr auto; gap: 1rem; align-items: end; }
  @media(max-width:700px) { .search-grid { grid-template-columns: 1fr; } .nav-tabs { display: none; } }

  .field-label {
    font-size: 0.72rem; letter-spacing: 0.1em;
    text-transform: uppercase; color: var(--cyan);
    margin-bottom: 8px; display: flex; align-items: center; gap: 6px;
  }
  .field-label::before { content: ''; width: 12px; height: 2px; background: var(--cyan); }

  .input-wrap { position: relative; }
  .search-input {
    width: 100%; padding: 14px 16px 14px 44px;
    background: var(--bg2); border: 1px solid var(--border2);
    border-radius: 12px; color: var(--text);
    font-family: 'Exo 2', sans-serif; font-size: 0.95rem;
    outline: none; transition: all 0.25s;
  }
  .search-input::placeholder { color: var(--text3); }
  .search-input:focus { border-color: var(--cyan); box-shadow: 0 0 0 3px rgba(0,180,216,0.12), var(--glow); }
  .input-icon { position: absolute; left: 14px; top: 50%; transform: translateY(-50%); color: var(--text3); font-size: 1.1rem; pointer-events: none; }
  .input-wrap:focus-within .input-icon { color: var(--cyan); }

  .autocomplete {
    position: absolute; top: calc(100% + 8px); left: 0; right: 0; z-index: 50;
    background: var(--card2); border: 1px solid var(--border2);
    border-radius: 12px; overflow: hidden;
    box-shadow: 0 20px 50px rgba(0,0,0,0.6), var(--glow);
    max-height: 240px; overflow-y: auto;
  }
  .ac-item {
    padding: 12px 16px; cursor: pointer;
    display: flex; align-items: center; gap: 10px;
    transition: background 0.15s; font-size: 0.9rem;
    border-bottom: 1px solid rgba(255,255,255,0.04);
  }
  .ac-item:last-child { border-bottom: none; }
  .ac-item:hover { background: rgba(0,180,216,0.1); }
  .ac-item .port-flag { font-size: 1.2rem; }
  .ac-item .port-name { font-weight: 500; }
  .ac-item .port-country { color: var(--text2); font-size: 0.8rem; }

  .swap-btn {
    background: rgba(0,180,216,0.1); border: 1px solid rgba(0,180,216,0.25);
    color: var(--cyan); border-radius: 12px;
    width: 48px; height: 48px; cursor: pointer;
    display: flex; align-items: center; justify-content: center;
    font-size: 1.2rem; transition: all 0.2s; align-self: flex-end; flex-shrink: 0;
  }
  .swap-btn:hover { background: rgba(0,180,216,0.2); transform: scale(1.05); }

  .search-btn {
    width: 100%; padding: 15px;
    background: linear-gradient(135deg, var(--cyan), var(--blue));
    border: none; border-radius: 12px; color: white;
    font-family: 'Orbitron', monospace; font-size: 0.85rem; font-weight: 700; letter-spacing: 0.12em;
    cursor: pointer; margin-top: 1rem; text-transform: uppercase; transition: all 0.25s;
    box-shadow: 0 4px 20px rgba(0,180,216,0.3);
    display: flex; align-items: center; justify-content: center; gap: 10px;
  }
  .search-btn:hover { transform: translateY(-2px); box-shadow: 0 8px 30px rgba(0,180,216,0.45); }

  .stats-bar { display: flex; justify-content: center; gap: 3rem; margin-top: 3rem; padding: 0 2rem; flex-wrap: wrap; }
  .stat-item { text-align: center; }
  .stat-num { font-family: 'Orbitron', monospace; font-size: 1.8rem; font-weight: 700; color: var(--cyan); }
  .stat-label { font-size: 0.75rem; color: var(--text2); letter-spacing: 0.1em; text-transform: uppercase; }

  .section { padding: 2rem; max-width: 1200px; margin: 0 auto; }
  .section-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 1.5rem; padding-bottom: 1rem; border-bottom: 1px solid var(--border); }
  .section-title { font-family: 'Orbitron', monospace; font-size: 1.1rem; font-weight: 700; letter-spacing: 0.08em; display: flex; align-items: center; gap: 10px; }
  .section-title .icon { color: var(--cyan); }
  .badge { padding: 4px 10px; border-radius: 100px; background: rgba(0,180,216,0.12); border: 1px solid rgba(0,180,216,0.25); color: var(--cyan); font-size: 0.72rem; letter-spacing: 0.08em; }

  .routes-grid { display: grid; gap: 1rem; grid-template-columns: repeat(auto-fill, minmax(340px, 1fr)); }
  .route-card {
    background: var(--card); border: 1px solid var(--border);
    border-radius: 16px; padding: 1.5rem; position: relative;
    transition: all 0.25s; overflow: hidden;
  }
  .route-card::before {
    content: ''; position: absolute; inset: 0;
    background: linear-gradient(135deg, rgba(0,180,216,0.04), transparent);
    opacity: 0; transition: opacity 0.25s;
  }
  .route-card:hover { border-color: rgba(0,180,216,0.3); transform: translateY(-3px); box-shadow: 0 12px 40px rgba(0,0,0,0.4), var(--glow); }
  .route-card:hover::before { opacity: 1; }

  .route-id { font-family: 'Orbitron', monospace; font-size: 0.65rem; color: var(--text3); letter-spacing: 0.15em; margin-bottom: 1rem; text-transform: uppercase; }
  .route-ports { display: flex; align-items: center; gap: 12px; margin-bottom: 1rem; }
  .port-bubble { flex: 1; text-align: center; padding: 10px 8px; background: var(--bg2); border-radius: 10px; border: 1px solid var(--border); }
  .port-bubble .p-name { font-weight: 600; font-size: 0.85rem; }
  .port-bubble .p-country { font-size: 0.7rem; color: var(--text2); margin-top: 2px; }
  .route-arrow { display: flex; flex-direction: column; align-items: center; gap: 2px; color: var(--cyan); flex-shrink: 0; }
  .route-line { width: 40px; height: 1px; background: linear-gradient(90deg, var(--border2), var(--cyan), var(--border2)); }

  .route-meta { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 8px; margin-bottom: 1.2rem; }
  .meta-item { background: var(--bg2); border-radius: 8px; padding: 8px; text-align: center; border: 1px solid var(--border); }
  .meta-val { font-family: 'Orbitron', monospace; font-size: 0.9rem; font-weight: 700; color: var(--text); }
  .meta-key { font-size: 0.65rem; color: var(--text2); text-transform: uppercase; letter-spacing: 0.08em; margin-top: 2px; }

  .route-actions { display: flex; gap: 8px; }
  .btn {
    flex: 1; padding: 9px 12px; border-radius: 9px;
    font-family: 'Exo 2', sans-serif; font-size: 0.8rem; font-weight: 600;
    cursor: pointer; text-align: center; transition: all 0.2s; border: none;
    display: flex; align-items: center; justify-content: center; gap: 6px;
  }
  .btn-primary { background: linear-gradient(135deg, var(--cyan), var(--blue)); color: white; box-shadow: 0 2px 10px rgba(0,180,216,0.25); }
  .btn-primary:hover { box-shadow: 0 4px 20px rgba(0,180,216,0.45); transform: translateY(-1px); }
  .btn-secondary { background: transparent; border: 1px solid var(--border2); color: var(--text2); }
  .btn-secondary:hover { border-color: var(--cyan); color: var(--cyan); background: rgba(0,180,216,0.06); }
  .btn-gold { background: linear-gradient(135deg, var(--gold), var(--gold2)); color: #000; font-weight: 700; box-shadow: 0 2px 10px rgba(240,165,0,0.25); }
  .btn-gold:hover { box-shadow: 0 4px 20px rgba(240,165,0,0.45); transform: translateY(-1px); }
  .btn-danger { background: var(--red); color: white; }
  .btn-sm { flex: none; padding: 7px 14px; font-size: 0.75rem; }

  .route-tag { display: inline-flex; align-items: center; gap: 4px; padding: 3px 8px; border-radius: 100px; font-size: 0.68rem; font-weight: 500; margin-bottom: 0.8rem; }
  .tag-ocean { background: rgba(0,180,216,0.1); color: var(--cyan); border: 1px solid rgba(0,180,216,0.2); }
  .tag-coastal { background: rgba(0,200,150,0.1); color: var(--green); border: 1px solid rgba(0,200,150,0.2); }
  .tag-deep { background: rgba(21,101,192,0.15); color: #5BC8F5; border: 1px solid rgba(91,200,245,0.2); }

  .ports-grid { display: grid; gap: 1rem; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); }
  .port-card { background: var(--card); border: 1px solid var(--border); border-radius: 16px; padding: 1.5rem; transition: all 0.25s; }
  .port-card:hover { border-color: rgba(0,180,216,0.3); transform: translateY(-2px); box-shadow: 0 8px 30px rgba(0,0,0,0.4); }
  .port-card-header { display: flex; align-items: flex-start; justify-content: space-between; margin-bottom: 1rem; }
  .port-flag-big { font-size: 2.5rem; }
  .port-status { padding: 4px 10px; border-radius: 100px; font-size: 0.68rem; font-weight: 600; background: rgba(0,200,150,0.1); color: var(--green); border: 1px solid rgba(0,200,150,0.25); }
  .port-card-name { font-family: 'Orbitron', monospace; font-size: 1rem; font-weight: 700; margin-bottom: 4px; }
  .port-card-country { color: var(--text2); font-size: 0.82rem; margin-bottom: 1rem; }
  .port-coords { font-family: 'Orbitron', monospace; font-size: 0.72rem; color: var(--cyan); background: var(--bg2); padding: 8px 12px; border-radius: 8px; border: 1px solid var(--border); margin-bottom: 1rem; letter-spacing: 0.06em; }
  .port-charts-label { font-size: 0.72rem; color: var(--text2); text-transform: uppercase; letter-spacing: 0.1em; margin-bottom: 6px; }
  .chart-tags { display: flex; flex-wrap: wrap; gap: 4px; margin-bottom: 1rem; }
  .chart-tag { padding: 3px 8px; font-size: 0.68rem; border-radius: 6px; background: rgba(240,165,0,0.1); color: var(--gold); border: 1px solid rgba(240,165,0,0.2); }

  .filter-bar { display: flex; gap: 8px; flex-wrap: wrap; margin-bottom: 1.5rem; }
  .filter-btn { padding: 7px 16px; border-radius: 100px; border: 1px solid var(--border); background: transparent; color: var(--text2); font-family: 'Exo 2', sans-serif; font-size: 0.78rem; cursor: pointer; transition: all 0.2s; text-transform: uppercase; letter-spacing: 0.08em; }
  .filter-btn:hover { border-color: var(--cyan); color: var(--cyan); }
  .filter-btn.active { background: rgba(0,180,216,0.12); border-color: rgba(0,180,216,0.4); color: var(--cyan); }

  .admin-login { min-height: 80vh; display: flex; align-items: center; justify-content: center; padding: 2rem; }
  .login-card { background: var(--card); border: 1px solid var(--border); border-radius: 20px; padding: 3rem; width: 100%; max-width: 420px; box-shadow: 0 30px 80px rgba(0,0,0,0.6); }
  .login-logo { text-align: center; margin-bottom: 2rem; }
  .login-icon { width: 64px; height: 64px; background: linear-gradient(135deg, var(--cyan), var(--blue)); border-radius: 18px; margin: 0 auto 1rem; display: flex; align-items: center; justify-content: center; font-size: 2rem; box-shadow: 0 0 30px rgba(0,180,216,0.4); }
  .login-title { font-family: 'Orbitron', monospace; font-size: 1.1rem; font-weight: 700; letter-spacing: 0.08em; margin-bottom: 4px; }
  .login-sub { color: var(--text2); font-size: 0.82rem; }
  .form-field { margin-bottom: 1.2rem; }
  .form-label { display: block; font-size: 0.75rem; color: var(--text2); text-transform: uppercase; letter-spacing: 0.1em; margin-bottom: 8px; }
  .form-input { width: 100%; padding: 12px 16px; background: var(--bg2); border: 1px solid var(--border2); border-radius: 10px; color: var(--text); font-family: 'Exo 2', sans-serif; font-size: 0.9rem; outline: none; transition: all 0.2s; }
  .form-input:focus { border-color: var(--cyan); box-shadow: 0 0 0 3px rgba(0,180,216,0.1); }
  .error-msg { color: var(--red); font-size: 0.8rem; margin-top: 6px; text-align: center; }
  .hint-box { background: rgba(0,180,216,0.06); border: 1px solid rgba(0,180,216,0.15); border-radius: 10px; padding: 10px 14px; font-size: 0.78rem; color: var(--text2); margin-bottom: 1.2rem; text-align: center; }
  .hint-box span { color: var(--cyan); font-weight: 600; }

  .admin-layout { display: grid; grid-template-columns: 220px 1fr; min-height: calc(100vh - 64px); }
  @media(max-width:768px) { .admin-layout { grid-template-columns: 1fr; } }
  .admin-sidebar { background: var(--card); border-right: 1px solid var(--border); padding: 1.5rem 1rem; }
  .sidebar-section { margin-bottom: 2rem; }
  .sidebar-label { font-size: 0.65rem; color: var(--text3); text-transform: uppercase; letter-spacing: 0.15em; margin-bottom: 8px; padding: 0 8px; }
  .sidebar-item { display: flex; align-items: center; gap: 10px; padding: 10px 12px; border-radius: 10px; cursor: pointer; transition: all 0.15s; color: var(--text2); font-size: 0.85rem; margin-bottom: 2px; }
  .sidebar-item:hover { background: rgba(255,255,255,0.04); color: var(--text); }
  .sidebar-item.active { background: rgba(0,180,216,0.1); color: var(--cyan); }
  .sidebar-item .s-icon { font-size: 1rem; width: 20px; text-align: center; }

  .admin-content { padding: 2rem; overflow-y: auto; }
  .admin-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 2rem; }
  .admin-page-title { font-family: 'Orbitron', monospace; font-size: 1.1rem; font-weight: 700; }

  .data-table { width: 100%; border-collapse: collapse; }
  .data-table thead tr { border-bottom: 2px solid var(--border); }
  .data-table th { padding: 10px 14px; text-align: left; font-size: 0.7rem; color: var(--text2); text-transform: uppercase; letter-spacing: 0.1em; font-weight: 600; }
  .data-table td { padding: 12px 14px; font-size: 0.85rem; border-bottom: 1px solid rgba(255,255,255,0.04); }
  .data-table tbody tr { transition: background 0.15s; }
  .data-table tbody tr:hover { background: rgba(255,255,255,0.02); }
  .table-wrap { overflow-x: auto; }

  .modal-overlay { position: fixed; inset: 0; z-index: 200; background: rgba(0,0,0,0.7); backdrop-filter: blur(8px); display: flex; align-items: center; justify-content: center; padding: 1rem; }
  .modal-card { background: var(--card); border: 1px solid var(--border2); border-radius: 20px; padding: 2rem; width: 100%; max-width: 560px; box-shadow: 0 30px 80px rgba(0,0,0,0.7); max-height: 90vh; overflow-y: auto; }
  .modal-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 1.5rem; }
  .modal-title { font-family: 'Orbitron', monospace; font-size: 1rem; font-weight: 700; }
  .modal-close { background: rgba(255,255,255,0.06); border: none; color: var(--text2); width: 32px; height: 32px; border-radius: 8px; cursor: pointer; font-size: 1.1rem; display: flex; align-items: center; justify-content: center; transition: all 0.2s; }
  .modal-close:hover { background: rgba(255,0,0,0.15); color: var(--red); }
  .detail-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-bottom: 1.5rem; }
  .detail-item { background: var(--bg2); border-radius: 10px; padding: 12px; border: 1px solid var(--border); }
  .detail-key { font-size: 0.68rem; color: var(--text2); text-transform: uppercase; letter-spacing: 0.1em; margin-bottom: 4px; }
  .detail-val { font-weight: 600; font-size: 0.9rem; }

  .notif { position: fixed; bottom: 2rem; right: 2rem; z-index: 300; padding: 12px 20px; border-radius: 12px; display: flex; align-items: center; gap: 10px; font-size: 0.88rem; font-weight: 500; box-shadow: 0 8px 30px rgba(0,0,0,0.5); animation: slideIn 0.3s ease; }
  .notif-success { background: rgba(0,200,150,0.15); border: 1px solid rgba(0,200,150,0.3); color: var(--green); }
  .notif-info { background: rgba(0,180,216,0.15); border: 1px solid rgba(0,180,216,0.3); color: var(--cyan); }
  @keyframes slideIn { from { transform: translateY(20px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }

  .empty-state { text-align: center; padding: 4rem 2rem; color: var(--text2); }
  .empty-icon { font-size: 4rem; margin-bottom: 1rem; opacity: 0.4; }
  .empty-title { font-family: 'Orbitron', monospace; font-size: 1rem; margin-bottom: 0.5rem; color: var(--text); }
  .empty-desc { font-size: 0.85rem; }

  .upload-area { border: 2px dashed var(--border2); border-radius: 12px; padding: 2rem; text-align: center; color: var(--text2); cursor: pointer; transition: all 0.2s; margin-bottom: 1rem; }
  .upload-area:hover { border-color: var(--cyan); color: var(--cyan); }
  .upload-icon { font-size: 2.5rem; margin-bottom: 0.5rem; }

  ::-webkit-scrollbar { width: 6px; }
  ::-webkit-scrollbar-track { background: var(--bg); }
  ::-webkit-scrollbar-thumb { background: var(--border2); border-radius: 3px; }
  ::-webkit-scrollbar-thumb:hover { background: var(--cyan); }

  select.form-input { cursor: pointer; }
  textarea.form-input { resize: vertical; min-height: 80px; }
`;

const PORTS = [
  { id:"MUM", name:"Mumbai", country:"India", flag:"🇮🇳", coords:"18°54′N 72°49′E", charts:["IN-C17","IN-C18","IN-C62"], locode:"INMUM" },
  { id:"SIN", name:"Singapore", country:"Singapore", flag:"🇸🇬", coords:"1°17′N 103°50′E", charts:["SG-04","SG-05","SG-SWK"], locode:"SGSIN" },
  { id:"DXB", name:"Dubai (Jebel Ali)", country:"UAE", flag:"🇦🇪", coords:"25°00′N 55°04′E", charts:["AE-JEA1","AE-JEA2"], locode:"AEJEA" },
  { id:"SHA", name:"Shanghai", country:"China", flag:"🇨🇳", coords:"31°22′N 121°28′E", charts:["CH-11","CH-12","CH-YA"], locode:"CNSHA" },
  { id:"ROT", name:"Rotterdam", country:"Netherlands", flag:"🇳🇱", coords:"51°54′N 4°28′E", charts:["NL-1801","NL-1803","EW-01"], locode:"NLRTM" },
  { id:"HKG", name:"Hong Kong", country:"China", flag:"🇨🇳", coords:"22°17′N 114°10′E", charts:["HK-01","HK-02"], locode:"HKHKG" },
  { id:"COL", name:"Colombo", country:"Sri Lanka", flag:"🇱🇰", coords:"6°57′N 79°51′E", charts:["LK-C1","LK-C2"], locode:"LKCMB" },
  { id:"ADE", name:"Aden", country:"Yemen", flag:"🇾🇪", coords:"12°46′N 44°59′E", charts:["YE-A01","YE-A02"], locode:"YEADE" },
  { id:"KAR", name:"Karachi", country:"Pakistan", flag:"🇵🇰", coords:"24°51′N 67°01′E", charts:["PK-K1","PK-K2"], locode:"PKKHI" },
  { id:"BAS", name:"Basra", country:"Iraq", flag:"🇮🇶", coords:"30°31′N 47°50′E", charts:["IQ-B1","IQ-B2"], locode:"IQBSR" },
  { id:"FUJ", name:"Fujairah", country:"UAE", flag:"🇦🇪", coords:"25°08′N 56°21′E", charts:["AE-FUJ1"], locode:"AEFUJ" },
  { id:"CHE", name:"Chennai", country:"India", flag:"🇮🇳", coords:"13°05′N 80°18′E", charts:["IN-MA","IN-MB"], locode:"INMAA" },
  { id:"KOC", name:"Kochi", country:"India", flag:"🇮🇳", coords:"9°58′N 76°14′E", charts:["IN-KOC"], locode:"INCOK" },
  { id:"BUS", name:"Busan", country:"South Korea", flag:"🇰🇷", coords:"35°06′N 129°02′E", charts:["KR-B1","KR-B2","KR-BUS"], locode:"KRPUS" },
  { id:"YOK", name:"Yokohama", country:"Japan", flag:"🇯🇵", coords:"35°26′N 139°39′E", charts:["JP-Y1","JP-Y2"], locode:"JPYOK" },
];

const ROUTES = [
  { id:"RT-001", name:"Western India – Gulf Express", from:"MUM", to:"DXB", distance:1155, hours:62, type:"ocean", waypoints:8, file:"MUM-DXB-v2.rtz" },
  { id:"RT-002", name:"Singapore Strait Transit", from:"SIN", to:"HKG", distance:1450, hours:78, type:"coastal", waypoints:12, file:"SIN-HKG-v3.rtz" },
  { id:"RT-003", name:"Indian Ocean Deep-Sea Route", from:"COL", to:"SIN", distance:1650, hours:88, type:"deep", waypoints:6, file:"COL-SIN-v1.rtz" },
  { id:"RT-004", name:"Arabian Sea Corridor", from:"MUM", to:"ADE", distance:2180, hours:115, type:"ocean", waypoints:9, file:"MUM-ADE-v2.rtz" },
  { id:"RT-005", name:"Persian Gulf Main Route", from:"FUJ", to:"BAS", distance:870, hours:46, type:"coastal", waypoints:14, file:"FUJ-BAS-v1.rtz" },
  { id:"RT-006", name:"Far East Trunk Route", from:"SHA", to:"SIN", distance:2580, hours:138, type:"deep", waypoints:10, file:"SHA-SIN-v2.rtz" },
  { id:"RT-007", name:"Europe–Asia Main Line", from:"ROT", to:"SIN", distance:8420, hours:442, type:"ocean", waypoints:22, file:"ROT-SIN-v4.rtz" },
  { id:"RT-008", name:"Korea–Japan Ferry Lane", from:"BUS", to:"YOK", distance:635, hours:34, type:"coastal", waypoints:5, file:"BUS-YOK-v1.rtz" },
  { id:"RT-009", name:"Pakistan–India Coastal", from:"KAR", to:"MUM", distance:520, hours:28, type:"coastal", waypoints:7, file:"KAR-MUM-v1.rtz" },
  { id:"RT-010", name:"South Asia Loop", from:"CHE", to:"KOC", distance:385, hours:21, type:"coastal", waypoints:4, file:"CHE-KOC-v1.rtz" },
  { id:"RT-011", name:"Gulf of Oman Express", from:"DXB", to:"KAR", distance:430, hours:23, type:"coastal", waypoints:6, file:"DXB-KAR-v1.rtz" },
  { id:"RT-012", name:"China–Korea Northern Route", from:"SHA", to:"BUS", distance:870, hours:47, type:"ocean", waypoints:8, file:"SHA-BUS-v2.rtz" },
];

function fuzzyMatch(str, query) {
  if (!query) return true;
  const s = str.toLowerCase(); const q = query.toLowerCase();
  if (s.includes(q)) return true;
  let qi = 0;
  for (let i = 0; i < s.length && qi < q.length; i++) { if (s[i] === q[qi]) qi++; }
  return qi === q.length;
}

function getPort(id) { return PORTS.find(p => p.id === id) || {}; }

function typeTag(type) {
  return { ocean:["tag-ocean","🌊 Ocean"], coastal:["tag-coastal","⚓ Coastal"], deep:["tag-deep","🔵 Deep Sea"] }[type] || ["tag-ocean", type];
}

function Notif({ msg, type, onClose }) {
  useEffect(() => { const t = setTimeout(onClose, 3000); return () => clearTimeout(t); }, []);
  return <div className={`notif notif-${type}`}>{type==="success"?"✅":"ℹ️"} {msg}</div>;
}

function RouteCard({ route, onView, onDownload }) {
  const from = getPort(route.from); const to = getPort(route.to);
  const [cls, label] = typeTag(route.type);
  return (
    <div className="route-card">
      <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:8 }}>
        <div className="route-id">{route.id}</div>
        <span className={`route-tag ${cls}`}>{label}</span>
      </div>
      <div style={{ fontWeight:600, fontSize:"0.92rem", marginBottom:"0.8rem" }}>{route.name}</div>
      <div className="route-ports">
        <div className="port-bubble">
          <div style={{ fontSize:"1.4rem" }}>{from.flag}</div>
          <div className="p-name">{from.name}</div>
          <div className="p-country">{from.country}</div>
        </div>
        <div className="route-arrow">
          <div className="route-line"/>
          <span style={{ fontSize:"1rem" }}>▶</span>
          <div className="route-line"/>
        </div>
        <div className="port-bubble">
          <div style={{ fontSize:"1.4rem" }}>{to.flag}</div>
          <div className="p-name">{to.name}</div>
          <div className="p-country">{to.country}</div>
        </div>
      </div>
      <div className="route-meta">
        <div className="meta-item"><div className="meta-val">{route.distance.toLocaleString()}</div><div className="meta-key">NM</div></div>
        <div className="meta-item"><div className="meta-val">{Math.floor(route.hours/24)}d {route.hours%24}h</div><div className="meta-key">ETA</div></div>
        <div className="meta-item"><div className="meta-val">{route.waypoints}</div><div className="meta-key">WPTs</div></div>
      </div>
      <div className="route-actions">
        <button className="btn btn-gold" onClick={() => onDownload(route)}>⬇ RTZ</button>
        <button className="btn btn-secondary" onClick={() => onView(route)}>Details</button>
      </div>
    </div>
  );
}

function RouteModal({ route, onClose, onDownload }) {
  const from = getPort(route.from); const to = getPort(route.to);
  const [cls, label] = typeTag(route.type);
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-card" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <div className="modal-title">📋 {route.name}</div>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>
        <div style={{ marginBottom:"1rem" }}>
          <span className="badge">{route.id}</span>&nbsp;
          <span className={`route-tag ${cls}`} style={{ display:"inline-flex" }}>{label}</span>
        </div>
        <div className="detail-grid">
          <div className="detail-item"><div className="detail-key">Departure</div><div className="detail-val">{from.flag} {from.name}, {from.country}</div></div>
          <div className="detail-item"><div className="detail-key">Destination</div><div className="detail-val">{to.flag} {to.name}, {to.country}</div></div>
          <div className="detail-item"><div className="detail-key">Distance</div><div className="detail-val" style={{ color:"var(--cyan)", fontFamily:"Orbitron,monospace" }}>{route.distance.toLocaleString()} NM</div></div>
          <div className="detail-item"><div className="detail-key">Estimated Time</div><div className="detail-val">{Math.floor(route.hours/24)} days {route.hours%24} hrs</div></div>
          <div className="detail-item"><div className="detail-key">Waypoints</div><div className="detail-val">{route.waypoints}</div></div>
          <div className="detail-item"><div className="detail-key">File</div><div className="detail-val" style={{ fontSize:"0.78rem", wordBreak:"break-all" }}>{route.file}</div></div>
        </div>
        <div style={{ marginBottom:"1rem", padding:"12px", background:"var(--bg2)", borderRadius:10, border:"1px solid var(--border)", fontSize:"0.8rem", color:"var(--text2)" }}>
          <strong style={{ color:"var(--gold)" }}>⚠ Navigator Note:</strong> Verify with current Notices to Mariners before departure. Check TSS and VTS requirements.
        </div>
        <div style={{ display:"flex", gap:8 }}>
          <button className="btn btn-gold" style={{ flex:1 }} onClick={() => { onDownload(route); onClose(); }}>⬇ Download RTZ File</button>
          <button className="btn btn-secondary btn-sm" onClick={onClose}>Close</button>
        </div>
      </div>
    </div>
  );
}

function HomePage({ onResults }) {
  const [dep, setDep] = useState(""); const [arr, setArr] = useState("");
  const [depOpen, setDepOpen] = useState(false); const [arrOpen, setArrOpen] = useState(false);
  const depRef = useRef(); const arrRef = useRef();
  const depSugg = useMemo(() => dep.length>0 ? PORTS.filter(p => fuzzyMatch(p.name,dep)||fuzzyMatch(p.country,dep)||fuzzyMatch(p.locode,dep)) : [], [dep]);
  const arrSugg = useMemo(() => arr.length>0 ? PORTS.filter(p => fuzzyMatch(p.name,arr)||fuzzyMatch(p.country,arr)||fuzzyMatch(p.locode,arr)) : [], [arr]);

  useEffect(() => {
    const h = e => {
      if (!depRef.current?.contains(e.target)) setDepOpen(false);
      if (!arrRef.current?.contains(e.target)) setArrOpen(false);
    };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, []);

  const handleSearch = () => {
    const res = ROUTES.filter(r => {
      const f = getPort(r.from); const t = getPort(r.to);
      return (!dep||fuzzyMatch(f.name,dep)||fuzzyMatch(f.country,dep)) && (!arr||fuzzyMatch(t.name,arr)||fuzzyMatch(t.country,arr));
    });
    onResults(res, dep||"All", arr||"All");
  };

  const swap = () => { const tmp = dep; setDep(arr); setArr(tmp); };

  return (
    <div>
      <div className="compass-ring"/>
      <div className="hero">
        <div className="hero-tag">🧭 ECDIS Navigation System v4.2</div>
        <h1 className="hero-title">ECDIS <span className="accent">Route</span> Finder</h1>
        <p className="hero-desc">Precision maritime routing for professional navigators. Search, download, and manage ECDIS-compatible route files for global port-to-port passages.</p>
        <div className="search-container">
          <div className="search-card">
            <div className="search-grid">
              <div>
                <div className="field-label">⚓ Departure Port</div>
                <div className="input-wrap" ref={depRef}>
                  <span className="input-icon">🛳</span>
                  <input className="search-input" placeholder="e.g. Mumbai, Singapore…" value={dep} onChange={e=>{setDep(e.target.value);setDepOpen(true);}} onFocus={()=>setDepOpen(true)} />
                  {depOpen && depSugg.length>0 && (
                    <div className="autocomplete">
                      {depSugg.map(p=>(
                        <div key={p.id} className="ac-item" onClick={()=>{setDep(p.name);setDepOpen(false);}}>
                          <span className="port-flag">{p.flag}</span>
                          <div><div className="port-name">{p.name}</div><div className="port-country">{p.country} · {p.locode}</div></div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
              <div>
                <div className="field-label">🏁 Arrival Port</div>
                <div className="input-wrap" ref={arrRef}>
                  <span className="input-icon">📍</span>
                  <input className="search-input" placeholder="e.g. Dubai, Rotterdam…" value={arr} onChange={e=>{setArr(e.target.value);setArrOpen(true);}} onFocus={()=>setArrOpen(true)} />
                  {arrOpen && arrSugg.length>0 && (
                    <div className="autocomplete">
                      {arrSugg.map(p=>(
                        <div key={p.id} className="ac-item" onClick={()=>{setArr(p.name);setArrOpen(false);}}>
                          <span className="port-flag">{p.flag}</span>
                          <div><div className="port-name">{p.name}</div><div className="port-country">{p.country} · {p.locode}</div></div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
              <button className="swap-btn" onClick={swap} title="Swap ports" style={{ height:52, width:52, borderRadius:12 }}>⇄</button>
            </div>
            <button className="search-btn" onClick={handleSearch}>🔍 SEARCH ROUTES</button>
          </div>
        </div>
        <div className="stats-bar">
          <div className="stat-item"><div className="stat-num">{ROUTES.length}</div><div className="stat-label">Routes Available</div></div>
          <div className="stat-item"><div className="stat-num">{PORTS.length}</div><div className="stat-label">Ports Indexed</div></div>
          <div className="stat-item"><div className="stat-num">42</div><div className="stat-label">Chart Regions</div></div>
          <div className="stat-item"><div className="stat-num">24/7</div><div className="stat-label">System Online</div></div>
        </div>
      </div>
    </div>
  );
}

function RoutesPage({ initial, fromLabel, toLabel, notify }) {
  const [filter, setFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [modal, setModal] = useState(null);
  const routes = initial || ROUTES;
  const filtered = routes.filter(r => {
    const typeOk = filter==="all"||r.type===filter;
    const searchOk = !search||fuzzyMatch(r.name,search)||fuzzyMatch(getPort(r.from).name||"",search)||fuzzyMatch(getPort(r.to).name||"",search);
    return typeOk && searchOk;
  });
  const handleDownload = r => notify(`⬇ Downloading ${r.file}…`, "info");
  return (
    <div className="section">
      <div className="section-header">
        <div className="section-title">
          <span className="icon">🗺</span> Route Database
          {fromLabel && <span style={{ color:"var(--text2)", fontFamily:"Exo 2", fontWeight:400, fontSize:"0.8rem" }}>&nbsp;· {fromLabel} → {toLabel}</span>}
        </div>
        <span className="badge">{filtered.length} results</span>
      </div>
      <div style={{ display:"flex", gap:12, marginBottom:"1.5rem", flexWrap:"wrap", alignItems:"center" }}>
        <div className="input-wrap" style={{ flex:1, minWidth:200 }}>
          <span className="input-icon">🔍</span>
          <input className="search-input" placeholder="Filter routes…" value={search} onChange={e=>setSearch(e.target.value)} />
        </div>
        <div className="filter-bar" style={{ marginBottom:0 }}>
          {["all","ocean","coastal","deep"].map(f => (
            <button key={f} className={`filter-btn ${filter===f?"active":""}`} onClick={()=>setFilter(f)}>
              {f==="all"?"All":f==="ocean"?"🌊 Ocean":f==="coastal"?"⚓ Coastal":"🔵 Deep Sea"}
            </button>
          ))}
        </div>
      </div>
      {filtered.length===0
        ? <div className="empty-state"><div className="empty-icon">🧭</div><div className="empty-title">No Routes Found</div><div className="empty-desc">Try adjusting your search filters or port names.</div></div>
        : <div className="routes-grid">{filtered.map(r => <RouteCard key={r.id} route={r} onView={setModal} onDownload={handleDownload} />)}</div>
      }
      {modal && <RouteModal route={modal} onClose={()=>setModal(null)} onDownload={handleDownload} />}
    </div>
  );
}

function PortsPage({ notify }) {
  const [search, setSearch] = useState("");
  const filtered = useMemo(() => PORTS.filter(p => !search||fuzzyMatch(p.name,search)||fuzzyMatch(p.country,search)||fuzzyMatch(p.locode,search)), [search]);
  return (
    <div className="section">
      <div className="section-header">
        <div className="section-title"><span className="icon">⚓</span> Port Directory</div>
        <span className="badge">{filtered.length} ports</span>
      </div>
      <div className="input-wrap" style={{ marginBottom:"1.5rem", maxWidth:420 }}>
        <span className="input-icon">🔍</span>
        <input className="search-input" placeholder="Search port name, country, UN/LOCODE…" value={search} onChange={e=>setSearch(e.target.value)} />
      </div>
      {filtered.length===0
        ? <div className="empty-state"><div className="empty-icon">⚓</div><div className="empty-title">No Ports Found</div></div>
        : (
          <div className="ports-grid">
            {filtered.map(p => (
              <div key={p.id} className="port-card">
                <div className="port-card-header">
                  <div className="port-flag-big">{p.flag}</div>
                  <span className="port-status">✓ Active</span>
                </div>
                <div className="port-card-name">{p.name}</div>
                <div className="port-card-country">{p.country} · {p.locode}</div>
                <div className="port-coords">📍 {p.coords}</div>
                <div className="port-charts-label">Available Charts</div>
                <div className="chart-tags">{p.charts.map(c => <span key={c} className="chart-tag">📄 {c}</span>)}</div>
                <div style={{ display:"flex", gap:8 }}>
                  <button className="btn btn-primary btn-sm" onClick={()=>notify(`Chart package for ${p.name} downloading…`,"info")}>⬇ Charts</button>
                  <button className="btn btn-secondary btn-sm" onClick={()=>notify(`Route options from ${p.name} loaded`,"success")}>🗺 Routes</button>
                </div>
              </div>
            ))}
          </div>
        )
      }
    </div>
  );
}

function AdminPage({ notify }) {
  const [loggedIn, setLoggedIn] = useState(false);
  const [user, setUser] = useState(""); const [pass, setPass] = useState(""); const [err, setErr] = useState("");
  const [section, setSection] = useState("dashboard");
  const [routes, setRoutes] = useState([...ROUTES]); const [ports, setPorts] = useState([...PORTS]);
  const [modal, setModal] = useState(null);
  const [nr, setNr] = useState({ name:"", from:"MUM", to:"SIN", distance:"", hours:"", type:"ocean", file:"" });
  const [np, setNp] = useState({ name:"", country:"", flag:"🚢", coords:"", locode:"" });

  const login = () => {
    if (user==="admin" && pass==="ecdis2024") { setLoggedIn(true); setErr(""); }
    else setErr("Invalid credentials.");
  };

  const addRoute = () => {
    if (!nr.name||!nr.distance) return;
    const id = `RT-${String(routes.length+1).padStart(3,"0")}`;
    setRoutes(r => [...r, { ...nr, id, distance:+nr.distance, hours:+nr.hours, waypoints:8, file:nr.file||`${nr.from}-${nr.to}.rtz` }]);
    setModal(null); notify("Route added","success");
    setNr({ name:"", from:"MUM", to:"SIN", distance:"", hours:"", type:"ocean", file:"" });
  };

  const addPort = () => {
    if (!np.name||!np.country) return;
    const id = np.locode||np.name.substring(0,3).toUpperCase();
    setPorts(p => [...p, { ...np, id, charts:[] }]);
    setModal(null); notify("Port added","success");
    setNp({ name:"", country:"", flag:"🚢", coords:"", locode:"" });
  };

  if (!loggedIn) return (
    <div className="admin-login">
      <div className="login-card">
        <div className="login-logo">
          <div className="login-icon">🛡</div>
          <div className="login-title">Admin Access</div>
          <div className="login-sub">ECDIS Route Finder — Secure Portal</div>
        </div>
        <div className="hint-box">Demo credentials: <span>admin</span> / <span>ecdis2024</span></div>
        <div className="form-field"><label className="form-label">Username</label><input className="form-input" placeholder="admin" value={user} onChange={e=>setUser(e.target.value)} onKeyDown={e=>e.key==="Enter"&&login()} /></div>
        <div className="form-field"><label className="form-label">Password</label><input className="form-input" type="password" placeholder="••••••••" value={pass} onChange={e=>setPass(e.target.value)} onKeyDown={e=>e.key==="Enter"&&login()} /></div>
        {err && <div className="error-msg">⚠ {err}</div>}
        <button className="search-btn" style={{ marginTop:"1.2rem" }} onClick={login}>🔐 LOGIN</button>
      </div>
    </div>
  );

  const sideItems = [
    { key:"dashboard", icon:"📊", label:"Dashboard" },
    { key:"routes", icon:"🗺", label:"Manage Routes" },
    { key:"ports", icon:"⚓", label:"Manage Ports" },
    { key:"upload", icon:"⬆", label:"Upload Files" },
    { key:"settings", icon:"⚙", label:"Settings" },
  ];

  return (
    <div className="admin-layout">
      <div className="admin-sidebar">
        <div className="sidebar-section">
          <div className="sidebar-label">Navigation</div>
          {sideItems.map(s => <div key={s.key} className={`sidebar-item ${section===s.key?"active":""}`} onClick={()=>setSection(s.key)}><span className="s-icon">{s.icon}</span>{s.label}</div>)}
        </div>
        <div className="sidebar-section">
          <div className="sidebar-label">Account</div>
          <div className="sidebar-item" onClick={()=>setLoggedIn(false)}><span className="s-icon">🚪</span>Logout</div>
        </div>
      </div>

      <div className="admin-content">
        {section==="dashboard" && (
          <>
            <div className="admin-header"><div className="admin-page-title">📊 Dashboard</div><div style={{ fontSize:"0.78rem", color:"var(--text2)" }}>Welcome, Administrator</div></div>
            <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(180px,1fr))", gap:"1rem", marginBottom:"2rem" }}>
              {[
                { label:"Total Routes", val:routes.length, icon:"🗺", c:"var(--cyan)" },
                { label:"Total Ports", val:ports.length, icon:"⚓", c:"var(--green)" },
                { label:"RTZ Files", val:routes.length, icon:"📁", c:"var(--gold)" },
                { label:"Active Users", val:12, icon:"👤", c:"var(--cyan)" },
              ].map(s => (
                <div key={s.label} className="route-card" style={{ padding:"1.2rem" }}>
                  <div style={{ fontSize:"2rem", marginBottom:8 }}>{s.icon}</div>
                  <div style={{ fontFamily:"Orbitron,monospace", fontSize:"2rem", fontWeight:700, color:s.c }}>{s.val}</div>
                  <div style={{ fontSize:"0.72rem", color:"var(--text2)", textTransform:"uppercase", letterSpacing:"0.08em" }}>{s.label}</div>
                </div>
              ))}
            </div>
            <div className="section-title" style={{ marginBottom:"1rem" }}><span className="icon">🕐</span> Recent Activity</div>
            {[
              { a:"Route RT-007 downloaded by Officer Chen", t:"2m ago", i:"⬇" },
              { a:"Port 'Colombo' metadata updated", t:"18m ago", i:"✏" },
              { a:"New route MUM→KOC added", t:"1h ago", i:"➕" },
              { a:"Chart IN-C17 package uploaded", t:"3h ago", i:"📄" },
              { a:"Admin session started — 192.168.1.42", t:"3h ago", i:"🔐" },
            ].map((x,i) => (
              <div key={i} style={{ display:"flex", alignItems:"center", gap:12, padding:"10px 0", borderBottom:"1px solid var(--border)", fontSize:"0.85rem" }}>
                <span style={{ fontSize:"1.1rem" }}>{x.i}</span>
                <span style={{ flex:1 }}>{x.a}</span>
                <span style={{ color:"var(--text2)", fontSize:"0.75rem" }}>{x.t}</span>
              </div>
            ))}
          </>
        )}

        {section==="routes" && (
          <>
            <div className="admin-header">
              <div className="admin-page-title">🗺 Manage Routes</div>
              <button className="btn btn-primary btn-sm" onClick={()=>setModal("addRoute")}>➕ Add Route</button>
            </div>
            <div className="table-wrap">
              <table className="data-table">
                <thead><tr><th>ID</th><th>Name</th><th>From</th><th>To</th><th>Distance</th><th>File</th><th>Actions</th></tr></thead>
                <tbody>{routes.map(r => {
                  const f=getPort(r.from); const t=getPort(r.to);
                  return <tr key={r.id}>
                    <td><span style={{ fontFamily:"Orbitron,monospace", fontSize:"0.75rem", color:"var(--cyan)" }}>{r.id}</span></td>
                    <td>{r.name}</td><td>{f?.flag} {f?.name}</td><td>{t?.flag} {t?.name}</td>
                    <td><span style={{ fontFamily:"Orbitron,monospace" }}>{r.distance} NM</span></td>
                    <td><span style={{ fontSize:"0.75rem", color:"var(--text2)" }}>{r.file}</span></td>
                    <td><div style={{ display:"flex", gap:6 }}>
                      <button className="btn btn-secondary btn-sm" onClick={()=>notify(`Editing ${r.id}`,"info")}>✏</button>
                      <button className="btn btn-danger btn-sm" onClick={()=>{setRoutes(x=>x.filter(y=>y.id!==r.id));notify("Route deleted","success");}}>🗑</button>
                    </div></td>
                  </tr>;
                })}</tbody>
              </table>
            </div>
          </>
        )}

        {section==="ports" && (
          <>
            <div className="admin-header">
              <div className="admin-page-title">⚓ Manage Ports</div>
              <button className="btn btn-primary btn-sm" onClick={()=>setModal("addPort")}>➕ Add Port</button>
            </div>
            <div className="table-wrap">
              <table className="data-table">
                <thead><tr><th>Flag</th><th>Name</th><th>Country</th><th>LOCODE</th><th>Coords</th><th>Charts</th><th>Actions</th></tr></thead>
                <tbody>{ports.map(p => (
                  <tr key={p.id}>
                    <td style={{ fontSize:"1.5rem" }}>{p.flag}</td>
                    <td><strong>{p.name}</strong></td><td>{p.country}</td>
                    <td><span style={{ fontFamily:"Orbitron,monospace", fontSize:"0.75rem", color:"var(--cyan)" }}>{p.locode}</span></td>
                    <td style={{ fontSize:"0.75rem", color:"var(--text2)" }}>{p.coords}</td>
                    <td><span className="badge">{p.charts?.length||0}</span></td>
                    <td><div style={{ display:"flex", gap:6 }}>
                      <button className="btn btn-secondary btn-sm" onClick={()=>notify(`Editing ${p.name}`,"info")}>✏</button>
                      <button className="btn btn-danger btn-sm" onClick={()=>{setPorts(x=>x.filter(y=>y.id!==p.id));notify("Port deleted","success");}}>🗑</button>
                    </div></td>
                  </tr>
                ))}</tbody>
              </table>
            </div>
          </>
        )}

        {section==="upload" && (
          <>
            <div className="admin-page-title" style={{ marginBottom:"1.5rem" }}>⬆ Upload Files</div>
            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:"1.5rem" }}>
              <div className="route-card">
                <div style={{ fontFamily:"Orbitron,monospace", fontSize:"0.85rem", marginBottom:"1rem", color:"var(--cyan)" }}>📁 Route Files (RTZ)</div>
                <div className="upload-area" onClick={()=>notify("File picker opened (demo)","info")}>
                  <div className="upload-icon">📂</div>
                  <div style={{ fontWeight:600, marginBottom:4 }}>Drop RTZ files here</div>
                  <div style={{ fontSize:"0.78rem" }}>or click to browse</div>
                  <div style={{ fontSize:"0.72rem", color:"var(--text3)", marginTop:8 }}>Accepts .rtz, .rtzp</div>
                </div>
                <div className="form-field">
                  <label className="form-label">Or paste Cloud Link</label>
                  <input className="form-input" placeholder="https://drive.google.com/file/…" />
                </div>
                <button className="btn btn-primary" onClick={()=>notify("File linked from cloud","success")}>🔗 Link from Cloud</button>
              </div>
              <div className="route-card">
                <div style={{ fontFamily:"Orbitron,monospace", fontSize:"0.85rem", marginBottom:"1rem", color:"var(--gold)" }}>🗺 Chart Files (SENC)</div>
                <div className="upload-area" onClick={()=>notify("Chart picker opened (demo)","info")}>
                  <div className="upload-icon">🗺</div>
                  <div style={{ fontWeight:600, marginBottom:4 }}>Drop chart files here</div>
                  <div style={{ fontSize:"0.78rem" }}>or click to browse</div>
                  <div style={{ fontSize:"0.72rem", color:"var(--text3)", marginTop:8 }}>Accepts .000, .zip</div>
                </div>
                <div className="form-field">
                  <label className="form-label">Chart Region</label>
                  <select className="form-input">
                    <option>Arabian Sea</option><option>Indian Ocean</option>
                    <option>South China Sea</option><option>Mediterranean</option>
                    <option>North Sea</option><option>Pacific Ocean</option>
                  </select>
                </div>
                <button className="btn btn-gold" onClick={()=>notify("Chart uploaded","success")}>⬆ Upload Charts</button>
              </div>
            </div>
          </>
        )}

        {section==="settings" && (
          <>
            <div className="admin-page-title" style={{ marginBottom:"1.5rem" }}>⚙ Settings</div>
            <div className="route-card" style={{ maxWidth:500 }}>
              <div style={{ fontFamily:"Orbitron,monospace", fontSize:"0.85rem", marginBottom:"1rem" }}>General Configuration</div>
              {[{ label:"System Name", val:"ECDIS Route Finder" },{ label:"Version", val:"v4.2.1" },{ label:"API Endpoint", val:"https://api.ecdis-routes.com/v2" }].map(f => (
                <div className="form-field" key={f.label}>
                  <label className="form-label">{f.label}</label>
                  <input className="form-input" defaultValue={f.val} />
                </div>
              ))}
              <button className="btn btn-primary btn-sm" onClick={()=>notify("Settings saved","success")}>💾 Save Changes</button>
            </div>
          </>
        )}
      </div>

      {modal==="addRoute" && (
        <div className="modal-overlay" onClick={()=>setModal(null)}>
          <div className="modal-card" onClick={e=>e.stopPropagation()}>
            <div className="modal-header"><div className="modal-title">➕ Add New Route</div><button className="modal-close" onClick={()=>setModal(null)}>✕</button></div>
            <div className="form-field"><label className="form-label">Route Name *</label><input className="form-input" placeholder="e.g. Mumbai–Dubai Express" value={nr.name} onChange={e=>setNr(r=>({...r,name:e.target.value}))} /></div>
            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12 }}>
              <div className="form-field"><label className="form-label">Departure *</label><select className="form-input" value={nr.from} onChange={e=>setNr(r=>({...r,from:e.target.value}))}>{PORTS.map(p=><option key={p.id} value={p.id}>{p.name}</option>)}</select></div>
              <div className="form-field"><label className="form-label">Arrival *</label><select className="form-input" value={nr.to} onChange={e=>setNr(r=>({...r,to:e.target.value}))}>{PORTS.map(p=><option key={p.id} value={p.id}>{p.name}</option>)}</select></div>
              <div className="form-field"><label className="form-label">Distance (NM) *</label><input className="form-input" type="number" placeholder="1155" value={nr.distance} onChange={e=>setNr(r=>({...r,distance:e.target.value}))} /></div>
              <div className="form-field"><label className="form-label">Est. Hours</label><input className="form-input" type="number" placeholder="62" value={nr.hours} onChange={e=>setNr(r=>({...r,hours:e.target.value}))} /></div>
            </div>
            <div className="form-field"><label className="form-label">Type</label><select className="form-input" value={nr.type} onChange={e=>setNr(r=>({...r,type:e.target.value}))}><option value="ocean">Ocean Route</option><option value="coastal">Coastal Route</option><option value="deep">Deep Sea Route</option></select></div>
            <div className="form-field"><label className="form-label">RTZ File Name</label><input className="form-input" placeholder="MUM-DXB-v1.rtz" value={nr.file} onChange={e=>setNr(r=>({...r,file:e.target.value}))} /></div>
            <div style={{ display:"flex", gap:8 }}>
              <button className="btn btn-primary" onClick={addRoute}>✅ Save Route</button>
              <button className="btn btn-secondary btn-sm" onClick={()=>setModal(null)}>Cancel</button>
            </div>
          </div>
        </div>
      )}

      {modal==="addPort" && (
        <div className="modal-overlay" onClick={()=>setModal(null)}>
          <div className="modal-card" onClick={e=>e.stopPropagation()}>
            <div className="modal-header"><div className="modal-title">➕ Add New Port</div><button className="modal-close" onClick={()=>setModal(null)}>✕</button></div>
            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12 }}>
              <div className="form-field" style={{ gridColumn:"1/-1" }}><label className="form-label">Port Name *</label><input className="form-input" placeholder="Colombo" value={np.name} onChange={e=>setNp(p=>({...p,name:e.target.value}))} /></div>
              <div className="form-field"><label className="form-label">Country *</label><input className="form-input" placeholder="Sri Lanka" value={np.country} onChange={e=>setNp(p=>({...p,country:e.target.value}))} /></div>
              <div className="form-field"><label className="form-label">Flag Emoji</label><input className="form-input" placeholder="🚢" value={np.flag} onChange={e=>setNp(p=>({...p,flag:e.target.value}))} /></div>
              <div className="form-field"><label className="form-label">UN/LOCODE</label><input className="form-input" placeholder="LKCMB" value={np.locode} onChange={e=>setNp(p=>({...p,locode:e.target.value}))} /></div>
              <div className="form-field"><label className="form-label">Coordinates</label><input className="form-input" placeholder="6°57′N 79°51′E" value={np.coords} onChange={e=>setNp(p=>({...p,coords:e.target.value}))} /></div>
            </div>
            <div style={{ display:"flex", gap:8 }}>
              <button className="btn btn-primary" onClick={addPort}>✅ Save Port</button>
              <button className="btn btn-secondary btn-sm" onClick={()=>setModal(null)}>Cancel</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function App() {
  const [tab, setTab] = useState("home");
  const [results, setResults] = useState(null);
  const [fromLabel, setFromLabel] = useState(""); const [toLabel, setToLabel] = useState("");
  const [notif, setNotif] = useState(null);
  const notify = (msg, type="success") => setNotif({ msg, type, key:Date.now() });

  const tabs = [
    { key:"home", icon:"🏠", label:"Home" },
    { key:"routes", icon:"🗺", label:"Routes" },
    { key:"ports", icon:"⚓", label:"Ports" },
    { key:"admin", icon:"🛡", label:"Admin" },
  ];

  const onResults = (res, from, to) => { setResults(res); setFromLabel(from); setToLabel(to); setTab("routes"); };

  return (
    <>
      <style>{style}</style>
      <div className="grid-bg"/>
      <div className="scanline"/>
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
            {tabs.map(t => (
              <button key={t.key} className={`nav-tab ${tab===t.key?"active":""}`} onClick={()=>setTab(t.key)}>
                <span className="dot"/>{t.icon} {t.label}
              </button>
            ))}
          </div>
          <div className="nav-status"><div className="status-dot"/>System Online</div>
        </nav>

        {tab==="home" && <HomePage onResults={onResults} />}
        {tab==="routes" && <RoutesPage initial={results} fromLabel={fromLabel} toLabel={toLabel} notify={notify} />}
        {tab==="ports" && <PortsPage notify={notify} />}
        {tab==="admin" && <AdminPage notify={notify} />}

        {notif && <Notif key={notif.key} msg={notif.msg} type={notif.type} onClose={()=>setNotif(null)} />}
      </div>
    </>
  );
}
