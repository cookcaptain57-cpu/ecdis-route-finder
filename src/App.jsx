/* eslint-disable */
// src/App.jsx
import { useState, useEffect } from "react";
import { auth, db } from "./firebase";
import { signOut, onAuthStateChanged, setPersistence, browserLocalPersistence } from "firebase/auth";
import { doc, getDoc, setDoc, serverTimestamp } from "firebase/firestore";

import { PORTS_DB, ADMIN_EMAIL, normalizePortRow } from "./constants";
import {
  fetchRouteSheet, fetchChartSheet, fetchPortsFromSheet,
  syncRoutesToFirestore, syncChartsToFirestore, syncPortsToFirestore,
  getFirestoreMeta,
  loadRoutesFromFirestore, loadChartsFromFirestore, loadPortsFromFirestore,
  idbGet, idbSet,
} from "./sheets";

import Footer              from "./components/Footer";
import Notif               from "./components/Notif";
import HomePage            from "./Pages/HomePage";
import RoutesPage          from "./Pages/RoutesPage";
import ChartsPage          from "./Pages/ChartsPage";
import RoutePlannerPage    from "./Pages/RoutePlannerPage";
import PortSearchPage      from "./Pages/PortSearchPage";
import LoginPage           from "./Pages/LoginPage";
import NavModePage         from "./Pages/NavModePage";
import MaritimeLibraryPage from "./Pages/MaritimeLibraryPage";
import AdminPage           from "./Pages/AdminPage";

const S = `
  @import url('https://fonts.googleapis.com/css2?family=Orbitron:wght@400;600;700;900&family=Exo+2:wght@300;400;500;600&display=swap');
  *,*::before,*::after{box-sizing:border-box;margin:0;padding:0;}
  :root{
    --bg:#040C1A;--bg2:#071428;--card:#0B1D35;--card2:#0F2444;
    --border:#1A3A5C;--border2:#1E4570;--blue:#1565C0;--cyan:#00B4D8;
    --gold:#F0A500;--gold2:#D4900A;--green:#00C896;--red:#FF4757;
    --purple:#7C3AED;--text:#E2EBF8;--text2:#8A9BBF;--text3:#4A5F80;
    --glow:0 0 20px rgba(0,180,216,0.25);
  }
  body{font-family:'Exo 2',sans-serif;background:var(--bg);color:var(--text);min-height:100vh;overflow-x:hidden;}
  .grid-bg{position:fixed;inset:0;z-index:0;pointer-events:none;
    background-image:linear-gradient(rgba(0,180,216,0.04) 1px,transparent 1px),linear-gradient(90deg,rgba(0,180,216,0.04) 1px,transparent 1px);
    background-size:60px 60px;animation:gm 20s linear infinite;}
  @keyframes gm{to{background-position:60px 60px;}}
  .app{position:relative;z-index:2;min-height:100vh;display:flex;flex-direction:column;}
  .nav{position:sticky;top:0;z-index:100;background:rgba(4,12,26,0.97);backdrop-filter:blur(20px);
    border-bottom:1px solid var(--border);padding:0 1.2rem;display:flex;align-items:center;
    justify-content:space-between;height:60px;box-shadow:0 4px 30px rgba(0,0,0,0.5);flex-shrink:0;}
  .nav-brand{display:flex;align-items:center;gap:9px;}
  .nav-logo{width:36px;height:36px;background:linear-gradient(135deg,var(--cyan),var(--blue));
    border-radius:9px;display:flex;align-items:center;justify-content:center;font-size:18px;
    box-shadow:0 0 14px rgba(0,180,216,0.4);flex-shrink:0;}
  .nav-title{font-family:'Orbitron',monospace;font-size:0.78rem;font-weight:700;letter-spacing:0.08em;}
  .nav-sub{font-size:0.56rem;color:var(--cyan);letter-spacing:0.14em;text-transform:uppercase;}
  .nav-tabs{display:flex;gap:2px;}
  .ntab{padding:7px 10px;border:none;background:transparent;color:var(--text2);font-family:'Exo 2',sans-serif;
    font-size:0.73rem;font-weight:500;cursor:pointer;border-radius:8px;transition:all 0.2s;
    display:flex;align-items:center;gap:5px;text-transform:uppercase;letter-spacing:0.04em;white-space:nowrap;}
  .ntab:hover{color:var(--text);background:rgba(255,255,255,0.05);}
  .ntab.active{color:var(--cyan);background:rgba(0,180,216,0.1);border:1px solid rgba(0,180,216,0.2);}
  .ntab.gold.active{color:var(--gold);background:rgba(240,165,0,0.1);border:1px solid rgba(240,165,0,0.2);}
  .ntab.green.active{color:var(--green);background:rgba(0,200,150,0.1);border:1px solid rgba(0,200,150,0.2);}
  .uc{padding:7px 11px;border:1px solid var(--border2);border-radius:8px;cursor:pointer;font-size:0.72rem;color:var(--text2);transition:all 0.2s;white-space:nowrap;}
  .uc:hover{border-color:var(--red);color:var(--red);}
  .sd{width:7px;height:7px;border-radius:50%;background:var(--green);box-shadow:0 0 7px var(--green);animation:pulse 2s infinite;}
  @keyframes pulse{0%,100%{opacity:1;}50%{opacity:0.4;}}
  .burger{display:none;flex-direction:column;gap:4px;cursor:pointer;padding:8px;background:none;border:none;}
  .burger span{width:20px;height:2px;background:var(--text);border-radius:2px;}
  @media(max-width:800px){.nav-tabs{display:none;}.burger{display:flex;}}
  .mob-menu{display:none;position:fixed;top:60px;left:0;right:0;background:rgba(4,12,26,0.98);
    backdrop-filter:blur(20px);border-bottom:1px solid var(--border);z-index:99;padding:0.8rem;}
  .mob-menu.open{display:flex;flex-direction:column;gap:4px;}
  .mtab{padding:11px 14px;border:none;background:transparent;color:var(--text2);font-family:'Exo 2',sans-serif;
    font-size:0.86rem;cursor:pointer;border-radius:9px;text-align:left;transition:all 0.2s;display:flex;align-items:center;gap:9px;}
  .mtab:hover{background:rgba(255,255,255,0.05);color:var(--text);}
  .mtab.active{background:rgba(0,180,216,0.1);color:var(--cyan);}
  .siw{flex:1;position:relative;}
  .si{width:100%;padding:12px 15px 12px 42px;background:var(--bg2);border:1.5px solid var(--border2);
    border-radius:10px;color:var(--text);font-family:'Exo 2',sans-serif;font-size:0.9rem;outline:none;transition:all 0.25s;}
  .si::placeholder{color:var(--text3);}
  .si:focus{border-color:var(--cyan);box-shadow:0 0 0 3px rgba(0,180,216,0.12);}
  .si-ic{position:absolute;left:12px;top:50%;transform:translateY(-50%);font-size:1rem;color:var(--text3);pointer-events:none;}
  .ac{position:absolute;top:calc(100% + 6px);left:0;right:0;z-index:60;
    background:var(--card2);border:1px solid var(--border2);border-radius:10px;
    overflow:hidden;box-shadow:0 20px 50px rgba(0,0,0,0.65);max-height:200px;overflow-y:auto;}
  .ac-item{padding:9px 13px;cursor:pointer;display:flex;align-items:center;gap:8px;
    transition:background 0.15s;font-size:0.84rem;border-bottom:1px solid rgba(255,255,255,0.04);}
  .ac-item:hover{background:rgba(0,180,216,0.1);}
  .section{padding:1.2rem;max-width:1100px;margin:0 auto;width:100%;}
  .sec-hdr{display:flex;align-items:center;justify-content:space-between;
    margin-bottom:1.1rem;padding-bottom:0.8rem;border-bottom:1px solid var(--border);flex-wrap:wrap;gap:8px;}
  .sec-title{font-family:'Orbitron',monospace;font-size:0.9rem;font-weight:700;letter-spacing:0.08em;display:flex;align-items:center;gap:7px;}
  .badge{padding:3px 9px;border-radius:100px;background:rgba(0,180,216,0.12);border:1px solid rgba(0,180,216,0.25);color:var(--cyan);font-size:0.67rem;}
  .badge-gold{background:rgba(240,165,0,0.12);border-color:rgba(240,165,0,0.25);color:var(--gold);}
  .badge-green{background:rgba(0,200,150,0.12);border-color:rgba(0,200,150,0.25);color:var(--green);}
  .brand-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(140px,1fr));gap:0.7rem;margin-bottom:1.4rem;}
  .brand-card{background:var(--card);border:2px solid var(--border);border-radius:12px;padding:0.9rem;cursor:pointer;transition:all 0.2s;text-align:center;}
  .brand-card:hover{transform:translateY(-3px);box-shadow:0 8px 25px rgba(0,0,0,0.4);}
  .brand-emoji{font-size:1.8rem;margin-bottom:5px;}
  .brand-name{font-family:'Orbitron',monospace;font-size:0.66rem;font-weight:700;margin-bottom:2px;}
  .brand-models{font-size:0.6rem;color:var(--text2);}
  .files-grid{display:grid;gap:0.9rem;grid-template-columns:repeat(auto-fill,minmax(280px,1fr));}
  .file-card{background:var(--card);border:1px solid var(--border);border-radius:13px;padding:1.1rem;transition:all 0.25s;}
  .file-card:hover{border-color:rgba(0,180,216,0.35);transform:translateY(-2px);box-shadow:0 10px 35px rgba(0,0,0,0.4),var(--glow);}
  .file-icon{font-size:1.8rem;margin-bottom:0.6rem;}
  .file-name{font-family:'Orbitron',monospace;font-size:0.7rem;font-weight:700;color:var(--cyan);margin-bottom:4px;word-break:break-all;}
  .file-port{font-size:0.78rem;color:var(--text2);margin-bottom:0.8rem;}
  .file-tags{display:flex;gap:5px;flex-wrap:wrap;margin-bottom:0.8rem;}
  .ftag{padding:2px 7px;border-radius:5px;font-size:0.62rem;font-weight:500;}
  .tag-rtz{background:rgba(0,180,216,0.1);color:var(--cyan);border:1px solid rgba(0,180,216,0.2);}
  .tag-chart{background:rgba(240,165,0,0.1);color:var(--gold);border:1px solid rgba(240,165,0,0.2);}
  .dl-btn{width:100%;padding:10px;background:linear-gradient(135deg,var(--gold),var(--gold2));border:none;border-radius:9px;color:#000;font-family:'Exo 2',sans-serif;font-size:0.8rem;font-weight:700;cursor:pointer;transition:all 0.2s;display:flex;align-items:center;justify-content:center;gap:6px;}
  .dl-btn:hover{transform:translateY(-1px);box-shadow:0 4px 18px rgba(240,165,0,0.4);}
  .dl-btn:disabled{opacity:0.35;cursor:not-allowed;transform:none;background:var(--border2);color:var(--text3);}
  .login-req{width:100%;padding:10px;background:transparent;border:1px solid rgba(240,165,0,0.3);border-radius:9px;color:var(--gold);font-family:'Exo 2',sans-serif;font-size:0.78rem;font-weight:600;cursor:pointer;transition:all 0.2s;display:flex;align-items:center;justify-content:center;gap:6px;}
  .login-req:hover{background:rgba(240,165,0,0.08);}
  .fbar{display:flex;gap:6px;flex-wrap:wrap;margin-bottom:1rem;}
  .fbtn{padding:5px 11px;border-radius:100px;border:1px solid var(--border);background:transparent;color:var(--text2);font-family:'Exo 2',sans-serif;font-size:0.7rem;cursor:pointer;transition:all 0.2s;text-transform:uppercase;}
  .fbtn:hover{border-color:var(--cyan);color:var(--cyan);}
  .fbtn.active{background:rgba(0,180,216,0.12);border-color:rgba(0,180,216,0.4);color:var(--cyan);}
  .btn{padding:8px 13px;border-radius:9px;font-family:'Exo 2',sans-serif;font-size:0.76rem;font-weight:600;cursor:pointer;transition:all 0.2s;border:none;display:inline-flex;align-items:center;gap:5px;}
  .btn-primary{background:linear-gradient(135deg,var(--cyan),var(--blue));color:white;}
  .btn-primary:hover{transform:translateY(-1px);box-shadow:0 4px 18px rgba(0,180,216,0.4);}
  .btn-danger{background:var(--red);color:white;}
  .btn-secondary{background:transparent;border:1px solid var(--border2);color:var(--text2);}
  .btn-secondary:hover{border-color:var(--cyan);color:var(--cyan);}
  .btn-gold{background:linear-gradient(135deg,var(--gold),var(--gold2));color:#000;font-weight:700;}
  .btn-green{background:linear-gradient(135deg,var(--green),#00a87a);color:#000;font-weight:700;}
  .btn:disabled{opacity:0.45;cursor:not-allowed;}
  .ff{margin-bottom:1rem;}
  .fl{display:block;font-size:0.7rem;color:var(--text2);text-transform:uppercase;letter-spacing:0.1em;margin-bottom:6px;}
  .fi{width:100%;padding:10px 13px;background:var(--bg2);border:1px solid var(--border2);border-radius:9px;color:var(--text);font-family:'Exo 2',sans-serif;font-size:0.86rem;outline:none;transition:all 0.2s;}
  .fi:focus{border-color:var(--cyan);box-shadow:0 0 0 3px rgba(0,180,216,0.1);}
  .fi::placeholder{color:var(--text3);}
  select.fi{cursor:pointer;}
  textarea.fi{resize:vertical;min-height:70px;}
  .planner-layout{display:flex;gap:0;flex:1;min-height:0;}
  .planner-sidebar{width:320px;flex-shrink:0;background:var(--card);border-right:1px solid var(--border);display:flex;flex-direction:column;overflow-y:auto;}
  @media(max-width:800px){.planner-layout{flex-direction:column;}.planner-sidebar{width:100%;max-height:50vh;}}
  .planner-map{flex:1;min-height:400px;position:relative;}
  .p-tabs{display:flex;border-bottom:1px solid var(--border);}
  .p-tab{flex:1;padding:10px 6px;border:none;background:transparent;color:var(--text2);font-family:'Exo 2',sans-serif;font-size:0.72rem;cursor:pointer;transition:all 0.2s;text-align:center;text-transform:uppercase;letter-spacing:0.06em;}
  .p-tab.active{color:var(--cyan);border-bottom:2px solid var(--cyan);}
  .p-panel{padding:1rem;flex:1;}
  .p-section{margin-bottom:1.2rem;}
  .p-label{font-size:0.65rem;color:var(--text2);text-transform:uppercase;letter-spacing:0.1em;margin-bottom:6px;display:block;}
  .overlay-grid{display:grid;grid-template-columns:1fr 1fr;gap:5px;}
  .ov-btn{padding:6px 8px;border-radius:7px;border:1px solid var(--border);background:transparent;font-family:'Exo 2',sans-serif;font-size:0.68rem;cursor:pointer;transition:all 0.2s;text-align:center;}
  .ov-btn.active{background:rgba(255,255,255,0.05);}
  .wp-table{width:100%;border-collapse:collapse;font-size:0.72rem;}
  .wp-table th{padding:6px 4px;text-align:left;font-size:0.6rem;color:var(--text3);text-transform:uppercase;letter-spacing:0.08em;border-bottom:1px solid var(--border);}
  .wp-table td{padding:5px 4px;border-bottom:1px solid rgba(255,255,255,0.04);font-family:monospace;}
  .map-legend{position:absolute;bottom:12px;left:12px;background:rgba(4,12,26,0.88);border:1px solid var(--border);border-radius:8px;padding:8px 10px;z-index:10;display:flex;flex-direction:column;gap:4px;}
  .leg-item{display:flex;align-items:center;gap:6px;font-size:0.68rem;}
  .leg-dot{width:10px;height:10px;border-radius:3px;flex-shrink:0;}
  .eta-mode-tabs{display:flex;border:1px solid var(--border);border-radius:8px;overflow:hidden;margin-bottom:1rem;}
  .emt{flex:1;padding:8px;border:none;background:transparent;color:var(--text2);font-family:'Exo 2',sans-serif;font-size:0.72rem;cursor:pointer;transition:all 0.2s;}
  .emt.active{background:rgba(0,180,216,0.12);color:var(--cyan);font-weight:600;}
  .eta-result{background:var(--bg2);border:1px solid var(--border);border-radius:10px;padding:12px;margin-top:8px;}
  .eta-row{display:flex;justify-content:space-between;align-items:center;padding:5px 0;border-bottom:1px solid rgba(255,255,255,0.04);}
  .eta-row:last-child{border-bottom:none;}
  .eta-key{font-size:0.68rem;color:var(--text3);text-transform:uppercase;letter-spacing:0.08em;}
  .eta-val{font-family:'Orbitron',monospace;font-size:0.76rem;font-weight:700;color:var(--cyan);}
  .eta-val.gold{color:var(--gold);}
  .eta-val.green{color:var(--green);}
  .loading{display:flex;align-items:center;justify-content:center;gap:12px;padding:2rem;color:var(--text2);font-size:0.84rem;}
  .spin{width:20px;height:20px;border:2px solid var(--border2);border-top-color:var(--cyan);border-radius:50%;animation:spin 0.8s linear infinite;flex-shrink:0;}
  @keyframes spin{to{transform:rotate(360deg);}}
  @keyframes shimmer{0%{background-position:200% 0;}100%{background-position:-200% 0;}}
  .empty{text-align:center;padding:3rem 1rem;color:var(--text3);}
  .empty-icon{font-size:2.8rem;margin-bottom:1rem;}
  .empty-t{font-family:'Orbitron',monospace;font-size:0.82rem;margin-bottom:6px;color:var(--text2);}
  .empty-d{font-size:0.76rem;line-height:1.6;}
  .err-box{background:rgba(255,71,87,0.1);border:1px solid rgba(255,71,87,0.3);border-radius:8px;padding:10px 13px;color:#FF4757;font-size:0.8rem;margin-bottom:1rem;}
  .ok-box{background:rgba(0,200,150,0.1);border:1px solid rgba(0,200,150,0.3);border-radius:8px;padding:10px 13px;color:var(--green);font-size:0.8rem;margin-bottom:1rem;}
  .info-box{background:rgba(0,180,216,0.06);border:1px solid rgba(0,180,216,0.18);border-radius:9px;padding:10px 14px;color:var(--text2);font-size:0.78rem;margin-bottom:1rem;line-height:1.6;}
  .auth-wrap{min-height:calc(100vh - 60px);display:flex;align-items:center;justify-content:center;padding:1.5rem;}
  .auth-card{width:100%;max-width:420px;background:var(--card);border:1px solid var(--border2);border-radius:18px;padding:2rem;box-shadow:0 20px 60px rgba(0,0,0,0.5),var(--glow);}
  .auth-logo{text-align:center;margin-bottom:1.5rem;}
  .auth-icon{font-size:2.5rem;margin-bottom:0.7rem;}
  .auth-title{font-family:'Orbitron',monospace;font-size:1rem;font-weight:700;color:var(--cyan);margin-bottom:4px;letter-spacing:0.1em;}
  .auth-sub{font-size:0.74rem;color:var(--text2);}
  .auth-tabs{display:flex;border:1px solid var(--border);border-radius:9px;overflow:hidden;margin-bottom:1.2rem;}
  .atab{flex:1;padding:10px;border:none;background:transparent;color:var(--text2);font-family:'Exo 2',sans-serif;font-size:0.82rem;cursor:pointer;transition:all 0.2s;}
  .atab.active{background:rgba(0,180,216,0.12);color:var(--cyan);font-weight:600;}
  .submit-btn{width:100%;padding:13px;background:linear-gradient(135deg,var(--cyan),var(--blue));border:none;border-radius:10px;color:white;font-family:'Orbitron',monospace;font-size:0.76rem;font-weight:700;letter-spacing:0.1em;cursor:pointer;transition:all 0.2s;margin-bottom:1rem;}
  .submit-btn:disabled{opacity:0.6;cursor:not-allowed;}
  .submit-btn:hover:not(:disabled){transform:translateY(-2px);box-shadow:0 8px 28px rgba(0,180,216,0.4);}
  .link-txt{text-align:center;font-size:0.76rem;color:var(--cyan);cursor:pointer;text-decoration:underline;}
  .notif{position:fixed;bottom:24px;left:50%;transform:translateX(-50%);padding:12px 20px;border-radius:10px;font-size:0.82rem;font-weight:600;z-index:9999;animation:slideUp 0.3s;max-width:90vw;backdrop-filter:blur(10px);}
  .notif-success{background:rgba(0,200,150,0.15);border:1px solid rgba(0,200,150,0.4);color:var(--green);}
  .notif-error{background:rgba(255,71,87,0.15);border:1px solid rgba(255,71,87,0.4);color:#FF4757;}
  .notif-info{background:rgba(0,180,216,0.15);border:1px solid rgba(0,180,216,0.4);color:var(--cyan);}
  @keyframes slideUp{from{opacity:0;transform:translateX(-50%) translateY(20px);}to{opacity:1;transform:translateX(-50%) translateY(0);}}
  .footer{padding:1.2rem 1.4rem;border-top:1px solid var(--border);display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:12px;background:rgba(4,12,26,0.7);}
  .footer-brand{font-family:'Orbitron',monospace;font-size:0.72rem;color:var(--text2);}
  .footer-brand span{color:var(--cyan);}
  .ig-btn{display:flex;align-items:center;gap:8px;padding:7px 14px;background:linear-gradient(135deg,#833ab4,#fd1d1d,#fcb045);border:none;border-radius:100px;color:white;font-family:'Exo 2',sans-serif;font-size:0.78rem;font-weight:600;cursor:pointer;transition:all 0.2s;text-decoration:none;}
  .footer-copy{font-size:0.66rem;color:var(--text3);}
  .tw{overflow-x:auto;}.tbl{width:100%;border-collapse:collapse;font-size:0.76rem;}
  .tbl th{padding:8px 10px;text-align:left;font-size:0.65rem;color:var(--text3);text-transform:uppercase;letter-spacing:0.08em;border-bottom:1px solid var(--border);white-space:nowrap;}
  .tbl td{padding:8px 10px;border-bottom:1px solid rgba(255,255,255,0.04);max-width:200px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;}
  .a-hdr{display:flex;align-items:center;justify-content:space-between;margin-bottom:1rem;flex-wrap:wrap;gap:8px;}
  .a-title{font-family:'Orbitron',monospace;font-size:0.84rem;font-weight:700;}
  ::-webkit-scrollbar{width:5px;}::-webkit-scrollbar-track{background:var(--bg);}::-webkit-scrollbar-thumb{background:var(--border2);border-radius:3px;}
  .leaflet-container{background:#040C1A !important;}
  .leaflet-popup-content-wrapper{background:#0B1D35;border:1px solid #1A3A5C;color:#E2EBF8;border-radius:10px;}
  .leaflet-popup-tip{background:#0B1D35;}
  .adm-layout{display:flex;min-height:calc(100vh - 60px);}
  .adm-sidebar{width:200px;flex-shrink:0;background:var(--card);border-right:1px solid var(--border);padding:1rem;display:flex;flex-direction:column;gap:4px;}
  .adm-content{flex:1;padding:1.2rem;overflow-y:auto;max-width:900px;}
  .adm-mob-tabs{display:none;flex-wrap:wrap;gap:4px;padding:0.6rem;border-bottom:1px solid var(--border);background:var(--card);}
  @media(max-width:800px){.adm-sidebar{display:none;}.adm-mob-tabs{display:flex;}.adm-content{padding:0.8rem;}}
  .amtab{padding:5px 10px;border-radius:7px;border:1px solid var(--border);background:transparent;color:var(--text2);font-family:'Exo 2',sans-serif;font-size:0.7rem;cursor:pointer;transition:all 0.2s;}
  .amtab.active{background:rgba(0,180,216,0.12);border-color:rgba(0,180,216,0.3);color:var(--cyan);}
  .s-label{font-size:0.58rem;text-transform:uppercase;letter-spacing:0.12em;color:var(--text3);margin-bottom:6px;padding:0 4px;}
  .s-item{display:flex;align-items:center;gap:8px;padding:8px 10px;border-radius:8px;cursor:pointer;font-size:0.76rem;color:var(--text2);transition:all 0.2s;margin-bottom:2px;}
  .s-item:hover{background:rgba(255,255,255,0.05);color:var(--text);}
  .s-item.active{background:rgba(0,180,216,0.1);color:var(--cyan);}
  .s-item span{font-size:1rem;}
`;

export default function App() {
  const [tab, setTab]                     = useState('home');
  const [searchQ, setSearchQ]             = useState('');
  const [notif, setNotif]                 = useState(null);
  const [menuOpen, setMenuOpen]           = useState(false);
  const [user, setUser]                   = useState(null);
  const [userProfile, setUserProfile]     = useState(null);
  const [isBlocked, setIsBlocked]         = useState(false);
  const [authChecked, setAuthChecked]     = useState(false);
  const [routes, setRoutes]               = useState([]);
  const [charts, setCharts]               = useState([]);
  const [sheetRoutes, setSheetRoutes]     = useState([]);
  const [sheetCharts, setSheetCharts]     = useState([]);
  // ← CHANGED: start empty — never show 41 hardcoded ports as initial state
  const [portsDb, setPortsDb]             = useState([]);

  // Sync banner: null | 'syncing' | 'done'
  // Shows a non-blocking status bar while data loads from Firebase/Sheets
  const [syncBanner, setSyncBanner]             = useState(null);
  // Prevents double-retry after auth is confirmed
  const hasRetriedRef                           = { current: false };

  // Per-sync progress for admin panel progress bars (0-100)
  const [routesSyncProgress, setRoutesSyncProgress] = useState(0);
  const [chartsSyncProgress, setChartsSyncProgress] = useState(0);
  const [portsSyncProgress,  setPortsSyncProgress]  = useState(0);

  // ✅ SEPARATE loading states — each sync button has its OWN spinner
  const [routesLoading, setRoutesLoading] = useState(false);
  const [chartsLoading, setChartsLoading] = useState(false);
  const [portsLoading, setPortsLoading]   = useState(false);

  const sheetLoading = routesLoading || chartsLoading || portsLoading;

  const isAdmin = user?.email === ADMIN_EMAIL;
  const notify  = (msg, type = 'success') => setNotif({ msg, type, key: Date.now() });

  // ← CHANGED: two fixes in applyPortData
  // Fix 1 — data from Firebase/IDB/fetchPortsFromSheet is already normalised
  //   (has id, name, lat, lon directly). Running normalizePortRow on it calls
  //   String(null) → "null" → parseFloat("null") → NaN → port filtered out.
  //   Detect pre-normalised data and skip the normalizePortRow step entirely.
  // Fix 2 — old filter `p.lat && p.lon` drops valid ports at lat=0 / lon=0
  //   and also drops ports with null coords from PortSearch unnecessarily.
  //   Route planner already handles missing coords gracefully (no waypoint placed).
  const applyPortData = (d3) => {
    if (!Array.isArray(d3) || d3.length === 0) return;

    let normalized;
    const isPreNormalized = d3[0] && typeof d3[0].id === 'string' && typeof d3[0].name === 'string';
    if (isPreNormalized) {
      // Data from fetchPortsFromSheet / Firebase — already has id, name, lat, lon
      normalized = d3.filter(p => p && p.name && p.id);
    } else {
      // Raw Google Sheet row data — run through normalizePortRow
      normalized = d3.map(normalizePortRow).filter(Boolean);
    }

    const seen = new Set();
    const deduped = [];
    normalized.forEach(p => {
      const key = `${p.name?.toLowerCase()}-${p.country?.toLowerCase()}`;
      // Keep ports without coordinates too (port search still works; route planner
      // filters its own list when coordinates are needed for waypoint placement)
      if (!seen.has(key)) { seen.add(key); deduped.push(p); }
    });

    const seedMap = new Map();
    deduped.forEach(p => seedMap.set(p.id, p));
    setPortsDb([...seedMap.values()]);
  };

  // ─── Load app data ────────────────────────────────────────────────────────
  // Called on mount AND again after auth is confirmed (fixes race condition where
  // Firestore rules block unauthenticated reads on first attempt).
  // Never touches routesLoading/chartsLoading/portsLoading — those are manual sync only.
  const loadAppData = async () => {
    try {
      // Step 1: IDB-first — instant, works offline, no network call
      const [idbPortsEarly, idbRoutesEarly, idbChartsEarly] = await Promise.all([
        idbGet('ports_d'), idbGet('routes_d'), idbGet('charts_d'),
      ]);
      if (Array.isArray(idbRoutesEarly) && idbRoutesEarly.length > 0) setSheetRoutes(idbRoutesEarly);
      if (Array.isArray(idbChartsEarly) && idbChartsEarly.length > 0) setSheetCharts(idbChartsEarly);
      if (Array.isArray(idbPortsEarly)  && idbPortsEarly.length  > 0) applyPortData(idbPortsEarly);

      // Show sync banner only if cache was empty (user needs to wait for network)
      const allCached = idbRoutesEarly?.length > 0 && idbChartsEarly?.length > 0 && idbPortsEarly?.length > 0;
      if (!allCached) setSyncBanner('syncing');

      // Step 2: Check Firestore for data / newer version
      const meta = await getFirestoreMeta();

      if (meta) {
        const [cachedRv, cachedCv, cachedPv] = await Promise.all([
          idbGet('routes_v'), idbGet('charts_v'), idbGet('ports_v'),
        ]);
        await Promise.all([
          (async () => {
            if (meta.rv && cachedRv === meta.rv) {
              const d = await idbGet('routes_d'); if (d?.length > 0) { setSheetRoutes(d); return; }
            }
            if (meta.rv && meta.rc) {
              const d = await loadRoutesFromFirestore(meta.rc);
              setSheetRoutes(d); await idbSet('routes_d', d); await idbSet('routes_v', meta.rv);
            } else {
              const d = await fetchRouteSheet();
              if (Array.isArray(d) && d.length > 0) { setSheetRoutes(d); await idbSet('routes_d', d); }
            }
          })(),
          (async () => {
            if (meta.cv && cachedCv === meta.cv) {
              const d = await idbGet('charts_d'); if (d?.length > 0) { setSheetCharts(d); return; }
            }
            if (meta.cv && meta.cc) {
              const d = await loadChartsFromFirestore(meta.cc);
              setSheetCharts(d); await idbSet('charts_d', d); await idbSet('charts_v', meta.cv);
            } else {
              const d = await fetchChartSheet();
              if (Array.isArray(d) && d.length > 0) { setSheetCharts(d); await idbSet('charts_d', d); }
            }
          })(),
          (async () => {
            if (meta.pv && cachedPv === meta.pv) {
              const d = await idbGet('ports_d'); if (d?.length > 0) { applyPortData(d); return; }
            }
            if (meta.pv && meta.pc) {
              const d = await loadPortsFromFirestore(meta.pc);
              applyPortData(d); await idbSet('ports_d', d); await idbSet('ports_v', meta.pv);
            } else {
              const d = await fetchPortsFromSheet();
              if (Array.isArray(d) && d.length > 0) { applyPortData(d); await idbSet('ports_d', d); }
            }
          })(),
        ]);
      } else {
        // Step 3: No Firestore meta — fallback to Google Sheets directly
        const [d1, d2, d3] = await Promise.all([fetchRouteSheet(), fetchChartSheet(), fetchPortsFromSheet()]);
        if (Array.isArray(d1) && d1.length > 0) setSheetRoutes(d1);
        if (Array.isArray(d2) && d2.length > 0) setSheetCharts(d2);
        applyPortData(d3);
      }
    } catch (e) { console.warn('loadAppData error:', e); }

    // Dismiss banner: if was showing 'syncing' → flip to 'done' for 4s then hide
    setSyncBanner(prev => {
      if (prev === 'syncing') { setTimeout(() => setSyncBanner(null), 4000); return 'done'; }
      return null;
    });
  };

  // ─── Admin: Sync Routes ONLY ──────────────────────────────────────────────
  const refreshRoutes = async () => {
    setRoutesLoading(true); setRoutesSyncProgress(5);
    notify('📡 Fetching routes from Sheet…', 'info');
    try {
      setRoutesSyncProgress(10);
      const d = await fetchRouteSheet();
      setRoutesSyncProgress(50);
      if (!Array.isArray(d) || d.length === 0) {
        notify('No routes found in Sheet', 'error');
        setRoutesLoading(false); setRoutesSyncProgress(0); return;
      }
      notify('🔄 Saving routes to Firebase…', 'info');
      await syncRoutesToFirestore(d); setRoutesSyncProgress(85);
      setSheetRoutes(d);
      await idbSet('routes_d', d); setRoutesSyncProgress(95);
      const meta = await getFirestoreMeta();
      if (meta?.rv) await idbSet('routes_v', meta.rv);
      setRoutesSyncProgress(100);
      notify(`✅ ${d.length} routes synced to Firebase`, 'success');
    } catch (e) { notify('Route sync failed: ' + e.message, 'error'); setRoutesSyncProgress(0); }
    setRoutesLoading(false);
    setTimeout(() => setRoutesSyncProgress(0), 3000);
  };

  // ─── Admin: Sync Charts ONLY ──────────────────────────────────────────────
  const refreshCharts = async () => {
    setChartsLoading(true); setChartsSyncProgress(5);
    notify('📡 Fetching charts from Sheet…', 'info');
    try {
      setChartsSyncProgress(10);
      const d = await fetchChartSheet();
      setChartsSyncProgress(50);
      if (!Array.isArray(d) || d.length === 0) {
        notify('No charts found in Sheet', 'error');
        setChartsLoading(false); setChartsSyncProgress(0); return;
      }
      notify('🔄 Saving charts to Firebase…', 'info');
      await syncChartsToFirestore(d); setChartsSyncProgress(85);
      setSheetCharts(d);
      await idbSet('charts_d', d); setChartsSyncProgress(95);
      const meta = await getFirestoreMeta();
      if (meta?.cv) await idbSet('charts_v', meta.cv);
      setChartsSyncProgress(100);
      notify(`✅ ${d.length} charts synced to Firebase`, 'success');
    } catch (e) { notify('Chart sync failed: ' + e.message, 'error'); setChartsSyncProgress(0); }
    setChartsLoading(false);
    setTimeout(() => setChartsSyncProgress(0), 3000);
  };

  // ─── Admin: Sync Ports ONLY ───────────────────────────────────────────────
  const refreshPorts = async () => {
    setPortsLoading(true); setPortsSyncProgress(2);
    notify('📡 Fetching ports from Sheet…', 'info');
    try {
      const ESTIMATED_TOTAL = 27000;
      // Pass onProgress callback — fetchPortsFromSheet calls it after each page
      const d = await fetchPortsFromSheet((fetched) => {
        const pct = Math.min(65, Math.round((fetched / ESTIMATED_TOTAL) * 65));
        setPortsSyncProgress(pct);
      });
      setPortsSyncProgress(68);
      if (!Array.isArray(d) || d.length === 0) {
        notify('No ports found in Sheet', 'error');
        setPortsLoading(false); setPortsSyncProgress(0); return;
      }
      notify(`🔄 Saving ${d.length.toLocaleString()} ports to Firebase…`, 'info');
      await syncPortsToFirestore(d); setPortsSyncProgress(88);
      applyPortData(d);
      await idbSet('ports_d', d); setPortsSyncProgress(95);
      const meta = await getFirestoreMeta();
      if (meta?.pv) await idbSet('ports_v', meta.pv);
      setPortsSyncProgress(100);
      notify(`✅ ${d.length.toLocaleString()} ports synced to Firebase`, 'success');
    } catch (e) { notify('Port sync failed: ' + e.message, 'error'); setPortsSyncProgress(0); }
    setPortsLoading(false);
    setTimeout(() => setPortsSyncProgress(0), 3000);
  };

  // Run on mount — gets IDB cache instantly, then tries Firebase
  useEffect(() => { loadAppData(); }, []);

  // ─── Retry after auth confirmed ───────────────────────────────────────────
  // Fixes: Firestore rules require login → first loadAppData (before auth) fails
  // silently → user logs in → data still empty. Re-run loadAppData once auth
  // is confirmed so Firebase now has credentials and can serve the data.
  useEffect(() => {
    if (!authChecked) return;
    if (sheetRoutes.length === 0 || portsDb.length === 0) {
      loadAppData();
    }
  }, [authChecked]);

  // ─── Auto-redirect after login ────────────────────────────────────────────
  // Fixes: user logs in but stays on login page — now auto-goes to dashboard
  // (or the page they originally tried to visit before being redirected to login)
  useEffect(() => {
    if (user && tab === 'login') {
      const intended = sessionStorage.getItem('intendedTab');
      sessionStorage.removeItem('intendedTab');
      setTab(intended || 'home');
    }
  }, [user]);

  // ─── Auth listener ────────────────────────────────────────────────────────
  useEffect(() => {
    setPersistence(auth, browserLocalPersistence).catch(() => {});
    const unsub = onAuthStateChanged(auth, async u => {
      setUser(u);
      if (u) {
        try {
          const snap = await getDoc(doc(db, 'users', u.uid));
          if (snap.exists()) {
            const profile = { id: snap.id, ...snap.data() };
            if (profile.blocked) {
              setIsBlocked(true); await signOut(auth);
              setUser(null); setUserProfile(null); setAuthChecked(true); return;
            }
            setIsBlocked(false); setUserProfile(profile);
          } else { setIsBlocked(false); setUserProfile(null); }
        } catch { setUserProfile(null); setIsBlocked(false); }
      } else { setUserProfile(null); }
      setAuthChecked(true);
    });
    return () => unsub();
  }, []);

  const TABS = [
    { k: 'home',    i: '🏠', l: 'Dashboard' },
    { k: 'routes',  i: '🛤', l: 'Routes' },
    { k: 'charts',  i: '📊', l: 'ECDIS Charts', cls: 'gold' },
    { k: 'planner', i: '🗺', l: 'Route Planner', cls: 'green' },
    { k: 'navmode', i: '🧭', l: 'Nav Mode', cls: 'green' },
    { k: 'ports',   i: '⚓', l: 'Ports Database' },
    { k: 'library', i: '📖', l: 'Maritime Library' },
    ...(isAdmin ? [{ k: 'admin', i: '🛡', l: 'Admin' }] : []),
  ];

  const handleSearch = (q) => { setSearchQ(q); setTab('routes'); setMenuOpen(false); };
  const switchTab = k => {
    if (!user && k !== 'home' && k !== 'login') {
      setTab('login'); setMenuOpen(false);
      sessionStorage.setItem('intendedTab', k); return;
    }
    setTab(k); setMenuOpen(false);
  };

  const isPlannerFull = tab === 'planner' || tab === 'navmode';

  return (
    <>
      <style>{S}</style>

      {!authChecked && (
        <div style={{
          position: 'fixed', top: 68, right: 12, zIndex: 9998,
          background: 'rgba(4,12,26,0.95)', border: '1px solid var(--border)',
          borderRadius: 8, padding: '5px 10px', fontSize: '0.68rem',
          color: 'var(--cyan)', display: 'flex', alignItems: 'center', gap: 6,
        }}>
          <div className="spin" style={{ width: 10, height: 10 }} /> Connecting…
        </div>
      )}

      <div className="grid-bg" />
      <div className="app">
        <nav className="nav">
          <div className="nav-brand" onClick={() => switchTab('home')} style={{ cursor: 'pointer' }}>
            <div className="nav-logo">🧭</div>
            <div>
              <div className="nav-title">NAVISPHERE<span style={{ color: 'var(--cyan)' }}>X</span></div>
              <div className="nav-sub">MARINE</div>
            </div>
          </div>
          <div className="nav-tabs">
            {TABS.map(t => (
              <button key={t.k} className={`ntab ${t.cls || ''} ${tab === t.k ? 'active' : ''}`} onClick={() => switchTab(t.k)}>
                {t.i} {t.l}
              </button>
            ))}
            {user
              ? <div className="uc" onClick={() => { signOut(auth); notify('Logged out', 'info'); }}>
                  👥 {userProfile?.name?.split(' ')[0] || user.email.split('@')[0]}{isAdmin ? ' 🛡' : ''} · Logout
                </div>
              : authChecked
                ? <button className="ntab" onClick={() => switchTab('login')}>🔐 Login</button>
                : null
            }
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div className="sd" />
            <button className="burger" onClick={() => setMenuOpen(o => !o)}><span /><span /><span /></button>
          </div>
        </nav>

        <div className={`mob-menu ${menuOpen ? 'open' : ''}`}>
          {TABS.map(t => (
            <button key={t.k} className={`mtab ${tab === t.k ? 'active' : ''}`} onClick={() => switchTab(t.k)}>
              {t.i} {t.l}
            </button>
          ))}
          {user
            ? <button className="mtab" onClick={() => { signOut(auth); notify('Logged out', 'info'); setMenuOpen(false); }}>
                🚪 Logout ({userProfile?.name?.split(' ')[0] || user.email.split('@')[0]})
              </button>
            : authChecked
              ? <button className="mtab" onClick={() => switchTab('login')}>🔐 Login / Register</button>
              : null
          }
        </div>

        {isBlocked && (
          <div style={{ position: 'fixed', inset: 0, background: 'var(--bg)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1.5rem' }}>
            <div style={{ maxWidth: 400, width: '100%', background: 'var(--card)', border: '2px solid rgba(255,60,60,0.5)', borderRadius: 16, padding: '2rem', textAlign: 'center' }}>
              <div style={{ fontSize: '3.5rem', marginBottom: '1rem' }}>⚠️</div>
              <div style={{ fontFamily: 'Orbitron,monospace', fontSize: '1rem', fontWeight: 700, color: '#ff6b6b', marginBottom: '0.5rem' }}>ACCESS SUSPENDED</div>
              <div style={{ fontSize: '0.82rem', color: 'var(--text2)', lineHeight: 1.6, marginBottom: '1.2rem' }}>Your access has been suspended by the administrator.</div>
              <a href="https://www.instagram.com/manish_the_navigator" target="_blank" rel="noreferrer"
                style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, background: 'linear-gradient(135deg,#833ab4,#fd1d1d,#fcb045)', color: 'white', borderRadius: 10, padding: '12px 20px', textDecoration: 'none', fontWeight: 700, fontSize: '0.85rem', marginBottom: '1rem' }}>
                <span style={{ fontSize: '1.2rem' }}>📸</span> Contact on Instagram
              </a>
              <button style={{ marginTop: '1rem', background: 'transparent', border: '1px solid var(--border)', color: 'var(--text3)', borderRadius: 8, padding: '6px 16px', fontSize: '0.7rem', cursor: 'pointer' }}
                onClick={() => setIsBlocked(false)}>Dismiss</button>
            </div>
          </div>
        )}

        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0, overflow: isPlannerFull ? 'hidden' : 'auto' }}>

          {/* ── Top progress bar — thin line at top when loading from network ── */}
          {syncBanner && (
            <div style={{ position: 'fixed', top: 60, left: 0, right: 0, height: 3, zIndex: 200, overflow: 'hidden' }}>
              {syncBanner === 'syncing'
                ? <div style={{ height: '100%', background: 'linear-gradient(90deg,var(--cyan),var(--blue),var(--cyan))', backgroundSize: '200% 100%', animation: 'shimmer 1.4s linear infinite' }} />
                : <div style={{ height: '100%', background: 'var(--green)', width: '100%' }} />
              }
            </div>
          )}

          {/* ── Floating popup notification — non-blocking, appears only on network load ── */}
          {syncBanner === 'syncing' && (
            <div style={{ position: 'fixed', bottom: 72, left: '50%', transform: 'translateX(-50%)', zIndex: 9996,
              background: 'rgba(4,12,26,0.97)', border: '1px solid rgba(0,180,216,0.45)', borderRadius: 14,
              padding: '13px 18px', display: 'flex', alignItems: 'center', gap: 12,
              boxShadow: '0 8px 32px rgba(0,0,0,0.6)', backdropFilter: 'blur(20px)', maxWidth: '92vw', minWidth: 280 }}>
              <div className="spin" style={{ width: 16, height: 16, borderTopColor: 'var(--cyan)', flexShrink: 0 }} />
              <div>
                <div style={{ fontFamily: 'Orbitron,monospace', fontSize: '0.74rem', fontWeight: 700, color: 'var(--cyan)', marginBottom: 2 }}>Loading App Data</div>
                <div style={{ fontSize: '0.68rem', color: 'var(--text2)', lineHeight: 1.4 }}>Syncing routes, charts &amp; ports from Firebase…<br />App is fully usable while loading.</div>
              </div>
            </div>
          )}
          {syncBanner === 'done' && (
            <div style={{ position: 'fixed', bottom: 72, left: '50%', transform: 'translateX(-50%)', zIndex: 9996,
              background: 'rgba(4,12,26,0.97)', border: '1px solid rgba(0,200,150,0.45)', borderRadius: 14,
              padding: '13px 18px', display: 'flex', alignItems: 'center', gap: 12,
              boxShadow: '0 8px 32px rgba(0,0,0,0.6)', backdropFilter: 'blur(20px)', maxWidth: '92vw', minWidth: 280 }}>
              <span style={{ fontSize: '1.2rem' }}>✅</span>
              <div>
                <div style={{ fontFamily: 'Orbitron,monospace', fontSize: '0.74rem', fontWeight: 700, color: 'var(--green)', marginBottom: 2 }}>All Data Ready</div>
                <div style={{ fontSize: '0.68rem', color: 'var(--text2)' }}>Routes, charts &amp; ports loaded — ready to navigate.</div>
              </div>
            </div>
          )}
          {tab === 'home'    && <HomePage routes={routes} charts={charts} onSearch={handleSearch} setTab={switchTab} user={user} portsDb={portsDb} />}
          {tab === 'routes'  && <RoutesPage searchQuery={searchQ} notify={notify} user={user} setTab={switchTab} sheetRoutes={sheetRoutes} sheetLoading={routesLoading} />}
          {tab === 'charts'  && <ChartsPage notify={notify} user={user} setTab={switchTab} isAdmin={isAdmin} sheetCharts={sheetCharts} sheetLoading={chartsLoading} />}
          {tab === 'planner' && <RoutePlannerPage notify={notify} sheetRoutes={[...routes, ...sheetRoutes]} portsDb={portsDb} />}
          {tab === 'ports'   && <PortSearchPage portsDb={portsDb} sheetLoading={portsLoading} refreshSheets={refreshPorts} />}
          {tab === 'library' && <MaritimeLibraryPage setTab={switchTab} />}
          {tab === 'navmode' && <NavModePage notify={notify} sheetRoutes={[...routes, ...sheetRoutes]} portsDb={portsDb} setTab={switchTab} />}
          {tab === 'login'   && <LoginPage notify={notify} onLogin={(u, redirectTo) => { setUser(u); setTab(redirectTo || 'home'); }} />}

          {tab === 'admin' && (isAdmin
            ? <AdminPage
                notify={notify}
                routes={routes}             setRoutes={setRoutes}
                charts={charts}             setCharts={setCharts}
                sheetRoutes={sheetRoutes}   sheetCharts={sheetCharts}
                refreshRoutes={refreshRoutes}
                refreshCharts={refreshCharts}
                refreshPorts={refreshPorts}
                routesLoading={routesLoading}
                chartsLoading={chartsLoading}
                portsLoading={portsLoading}
                portsDb={portsDb}
                routesSyncProgress={routesSyncProgress}
                chartsSyncProgress={chartsSyncProgress}
                portsSyncProgress={portsSyncProgress}
              />
            : <div className="section"><div className="empty"><div className="empty-icon">🔒</div><div className="empty-t">Admin Access Only</div></div></div>
          )}

          {authChecked && !user && tab !== 'home' && tab !== 'login' && (
            <div style={{ display: 'flex', flex: 1, alignItems: 'center', justifyContent: 'center', padding: '2rem' }}>
              <div style={{ maxWidth: 380, width: '100%', background: 'var(--card)', border: '1px solid var(--border2)', borderRadius: 16, padding: '2rem', textAlign: 'center' }}>
                <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>🔐</div>
                <div style={{ fontFamily: 'Orbitron,monospace', fontSize: '0.9rem', fontWeight: 700, marginBottom: '0.5rem' }}>Login Required</div>
                <div style={{ fontSize: '0.82rem', color: 'var(--text2)', marginBottom: '1.4rem', lineHeight: 1.6 }}>Create a free account to access Routes, Charts, Route Planner, Ports Database and Nav Mode.</div>
                <div style={{ display: 'flex', gap: 10, justifyContent: 'center' }}>
                  <button className="btn btn-primary" onClick={() => switchTab('login')}>🔐 Login</button>
                  <button className="btn btn-secondary" onClick={() => switchTab('login')}>✅ Register Free</button>
                </div>
              </div>
            </div>
          )}
        </div>

        {tab !== 'planner' && <Footer />}
        {notif && <Notif key={notif.key} msg={notif.msg} type={notif.type} onClose={() => setNotif(null)} />}
      </div>
    </>
  );
}
