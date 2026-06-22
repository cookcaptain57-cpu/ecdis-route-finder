/* eslint-disable */
// src/App.jsx
import { useState, useEffect } from "react";
import { auth, db } from "./firebase";
import { signOut, onAuthStateChanged, setPersistence, browserLocalPersistence } from "firebase/auth";
import { doc, getDoc, setDoc, serverTimestamp, collection, getDocs, query, orderBy } from "firebase/firestore";

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
import WelcomePopup        from "./components/WelcomePopup";
import ContactFloatingBtn  from "./components/ContactFloatingBtn";
import HomePage            from "./Pages/HomePage";
import RoutesPage          from "./Pages/RoutesPage";
import ChartsPage          from "./Pages/ChartsPage";
import RoutePlannerPage    from "./Pages/RoutePlannerPage";
import PortSearchPage      from "./Pages/PortSearchPage";
import LoginPage           from "./Pages/LoginPage";
import NavModePage         from "./Pages/NavModePage";
import MaritimeLibraryPage    from "./Pages/MaritimeLibraryPage";
import AdminPage               from "./Pages/AdminPage";
import VesselSearchPage        from "./Pages/VesselSearchPage";
import AccountPage             from "./Pages/AccountPage";
import VoyageCalculatorPage    from "./Pages/VoyageCalculatorPage";
import CertificateTrackerPage  from "./Pages/CertificateTrackerPage";
import NoticesPage             from "./Pages/NoticesPage";
import SeaTimeCalculatorPage   from "./Pages/SeaTimeCalculatorPage";
import CompassErrorPage        from "./Pages/CompassErrorPage";
import SightReductionPage      from "./Pages/SightReductionPage";
import EmergencyPage           from "./Pages/EmergencyPage";
import KnotsRopesMooringPage   from "./Pages/KnotsRopesMooringPage";
import NavigationBridgePage    from "./Pages/NavigationBridgePage";
import SeafarerWelfareHub      from "./Pages/SeafarerWelfareHub";
import CrewJourneyPage         from "./Pages/CrewJourneyPage";
import PortShorePage           from "./Pages/PortShorePage";
import InfoPage                from "./Pages/InfoPage";
import SeaDiaryPage            from "./Pages/SeaDiaryPage";
import CargoOpsPage            from "./Pages/CargoOpsPage";

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
  .app{position:relative;z-index:2;height:100vh;display:flex;flex-direction:column;overflow:hidden;}
  .nav{position:relative;z-index:100;background:rgba(4,12,26,0.97);backdrop-filter:blur(20px);
    border-bottom:1px solid var(--border);padding:0 1.2rem;
    box-shadow:0 4px 30px rgba(0,0,0,0.5);flex-shrink:0;}
  .nav-row1{display:flex;align-items:center;justify-content:space-between;height:56px;}
  .nav-brand{display:flex;align-items:center;gap:9px;}
  .nav-logo{width:34px;height:34px;background:linear-gradient(135deg,var(--cyan),var(--blue));
    border-radius:9px;display:flex;align-items:center;justify-content:center;font-size:17px;
    box-shadow:0 0 14px rgba(0,180,216,0.4);flex-shrink:0;}
  .nav-title{font-family:'Orbitron',monospace;font-size:0.76rem;font-weight:700;letter-spacing:0.08em;}
  .nav-sub{font-size:0.54rem;color:var(--cyan);letter-spacing:0.14em;text-transform:uppercase;}
  .nav-controls{display:flex;align-items:center;gap:7px;}
  .ntab{padding:5px 9px;border:none;background:transparent;color:var(--text2);font-family:'Exo 2',sans-serif;
    font-size:0.7rem;font-weight:500;cursor:pointer;border-radius:7px;transition:all 0.2s;
    display:inline-flex;align-items:center;gap:4px;text-transform:uppercase;letter-spacing:0.04em;white-space:nowrap;}
  .ntab:hover{color:var(--text);background:rgba(255,255,255,0.05);}
  .ntab.active{color:var(--cyan);background:rgba(0,180,216,0.1);border:1px solid rgba(0,180,216,0.2);}
  .sd{width:7px;height:7px;border-radius:50%;background:var(--green);box-shadow:0 0 7px var(--green);animation:pulse 2s infinite;}
  @keyframes pulse{0%,100%{opacity:1;}50%{opacity:0.4;}}
  .burger{display:none;flex-direction:column;gap:4px;cursor:pointer;padding:8px;background:none;border:none;}
  .burger span{width:20px;height:2px;background:var(--text);border-radius:2px;}
  @media(max-width:900px){.burger{display:flex;}.app-sidebar{display:none !important;}}
  @media(min-width:901px){.burger{display:none;}}
  .app-body{display:flex;flex:1;min-height:0;overflow:hidden;}
  .app-sidebar{width:220px;flex-shrink:0;background:rgba(4,12,26,0.97);border-right:1px solid var(--border);
    display:flex;flex-direction:column;overflow-y:auto;padding:0.6rem 0.5rem 1rem;}
  .app-content{flex:1;overflow-y:auto;display:flex;flex-direction:column;min-width:0;min-height:0;}
  .si-btn{display:flex;align-items:center;gap:9px;padding:9px 10px;border:none;background:transparent;
    color:var(--text2);font-family:'Exo 2',sans-serif;font-size:0.78rem;cursor:pointer;
    border-radius:9px;transition:all 0.2s;text-align:left;width:100%;white-space:nowrap;}
  .si-btn:hover{background:rgba(255,255,255,0.06);color:var(--text);}
  .si-btn.active{background:rgba(0,180,216,0.1);color:var(--cyan);}
  .si-btn.gold.active{background:rgba(240,165,0,0.1);color:var(--gold);}
  .si-btn.green.active{background:rgba(0,200,150,0.1);color:var(--green);}
  .si-btn.red.active{background:rgba(255,71,87,0.12);color:var(--red);}
  .si-icon{font-size:1.05rem;width:22px;text-align:center;flex-shrink:0;}
  .mob-menu{
    display:none;
    position:fixed;top:56px;left:0;right:0;
    background:rgba(4,12,26,0.98);backdrop-filter:blur(20px);
    border-bottom:1px solid var(--border);z-index:99;padding:0.7rem;
    height:calc(100vh - 56px);
    overflow-y:scroll;
    -webkit-overflow-scrolling:touch;
    overscroll-behavior:contain;
  }
  .mob-menu.open{display:grid;grid-template-columns:1fr 1fr;gap:6px;align-content:start;}
  .mtab{padding:10px 12px;border:1px solid var(--border);background:rgba(255,255,255,0.04);color:var(--text2);
    font-family:'Exo 2',sans-serif;font-size:0.8rem;cursor:pointer;border-radius:9px;
    text-align:left;transition:all 0.2s;display:flex;align-items:center;gap:8px;}
  .mtab:hover{background:rgba(255,255,255,0.08);color:var(--text);}
  .mtab.active{background:rgba(0,180,216,0.12);color:var(--cyan);border-color:rgba(0,180,216,0.3);}
  .mtab-full{grid-column:1/-1;}
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
  .files-grid{display:grid;gap:0.9rem;grid-template-columns:repeat(auto-fill,minmax(280px,1fr));}
  .file-card{background:var(--card);border:1px solid var(--border);border-radius:13px;padding:1.1rem;transition:all 0.25s;}
  .file-card:hover{border-color:rgba(0,180,216,0.35);transform:translateY(-2px);box-shadow:0 10px 35px rgba(0,0,0,0.4),var(--glow);}
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
  .loading{display:flex;align-items:center;justify-content:center;gap:12px;padding:2rem;color:var(--text2);font-size:0.84rem;}
  .spin{width:20px;height:20px;border:2px solid var(--border2);border-top-color:var(--cyan);border-radius:50%;animation:spin 0.8s linear infinite;flex-shrink:0;}
  @keyframes spin{to{transform:rotate(360deg);}}
  @keyframes shimmer{0%{background-position:200% 0;}100%{background-position:-200% 0;}}
  [data-theme="light"]{--bg:#f0f5fa;--bg2:#e4ecf4;--card:#ffffff;--text:#0a1628;--text2:#3a4a6a;
    --text3:#6a7a9a;--border:rgba(0,0,0,0.1);--border2:rgba(0,0,0,0.18);--cyan:#0070cc;
    --blue:#0050aa;--green:#007a50;--gold:#b07000;--red:#cc2233;}
  [data-theme="light"] .nav{background:rgba(240,245,250,0.97);border-color:rgba(0,0,0,0.12);}
  [data-theme="light"] .app-sidebar{background:rgba(240,245,250,0.97);border-color:rgba(0,0,0,0.12);}
  [data-theme="light"] .burger span{background:#0a1628 !important;}
  [data-theme="light"] .nav-title,[data-theme="light"] .ntab,[data-theme="light"] .si-btn{color:#0a1628 !important;}
  [data-theme="light"] .ntab.active,[data-theme="light"] .si-btn.active{color:var(--cyan) !important;}
  [data-theme="light"] .file-card,[data-theme="light"] .auth-card{background:#ffffff;}
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
  .footer{padding:0.6rem 1.2rem;border-top:1px solid var(--border);display:flex;align-items:center;justify-content:center;flex-wrap:wrap;gap:2px 4px;background:rgba(4,12,26,0.7);}
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
  const [tab, setTab]                     = useState(() => {
    // Clear any stale navigation state on fresh app load
    sessionStorage.removeItem('intendedTab');
    sessionStorage.removeItem('info_section');
    return 'home';
  });
  const [searchQ, setSearchQ]             = useState('');
  const [notif, setNotif]                 = useState(null);
  const [menuOpen, setMenuOpen]           = useState(false);
  // FIX: optimistically restore last-known user/profile from localStorage so
  // the UI can render as "logged in" instantly on slow/2G connections, instead
  // of waiting for a fresh Firebase round-trip. Firebase's real auth state
  // still confirms/corrects this in the background via onAuthStateChanged.
  const [user, setUser]                   = useState(() => {
    try { return JSON.parse(localStorage.getItem('nx_cached_user') || 'null'); }
    catch { return null; }
  });
  const [userProfile, setUserProfile]     = useState(() => {
    try { return JSON.parse(localStorage.getItem('nx_cached_profile') || 'null'); }
    catch { return null; }
  });
  const [isBlocked, setIsBlocked]         = useState(false);
  // FIX: if we have a cached user, treat auth as "checked" immediately so the
  // boot splash never blocks the UI on slow connections. Firebase still
  // verifies in the background and corrects state if needed.
  const [authChecked, setAuthChecked]     = useState(() => {
    try { return !!localStorage.getItem('nx_cached_user'); }
    catch { return false; }
  });
  const [routes, setRoutes]               = useState([]);
  const [charts, setCharts]               = useState([]);
  const [sheetRoutes, setSheetRoutes]     = useState([]);
  const [sheetCharts, setSheetCharts]     = useState([]);
  const [portsDb, setPortsDb]             = useState([]);
  const [syncBanner, setSyncBanner]       = useState(null);
  const hasRetriedRef                     = { current: false };
  const [showDisclaimer, setShowDisclaimer] = useState(false);
  const [navDiscBanner, setNavDiscBanner]   = useState(false);
  const [welcomePopup, setWelcomePopup]     = useState(null);
  const [authProgress, setAuthProgress]     = useState(0);
  const [isOnline, setIsOnline]             = useState(navigator.onLine);
  const [theme, setTheme]                   = useState(() => localStorage.getItem('nav_theme') || 'dark');
  const [prevTab, setPrevTab]               = useState(null);
  const [showNotifPanel, setShowNotifPanel] = useState(false);
  const [notifications, setNotifications]   = useState([]);
  const [readNotifIds, setReadNotifIds]     = useState(() => {
    try { return new Set(JSON.parse(localStorage.getItem('notif_read') || '[]')); }
    catch { return new Set(); }
  });
  const [routesSyncProgress, setRoutesSyncProgress] = useState(0);
  const [chartsSyncProgress, setChartsSyncProgress] = useState(0);
  const [portsSyncProgress,  setPortsSyncProgress]  = useState(0);
  const [routesLoading, setRoutesLoading] = useState(false);
  const [chartsLoading, setChartsLoading] = useState(false);
  const [portsLoading,  setPortsLoading]  = useState(false);

  const isAdmin = user?.email === ADMIN_EMAIL;
  const notify  = (msg, type = 'success') => setNotif({ msg, type, key: Date.now() });

  // ── FIX: 'info' and 'welfare' are public tabs ──
  const PUBLIC_TABS = new Set(['home', 'login', 'info']);

  const applyPortData = (d3) => {
    if (!Array.isArray(d3) || d3.length === 0) return;
    let normalized;
    const isPreNormalized = d3[0] && typeof d3[0].id === 'string' && typeof d3[0].name === 'string';
    if (isPreNormalized) { normalized = d3.filter(p => p && p.name && p.id); }
    else { normalized = d3.map(normalizePortRow).filter(Boolean); }
    const seen = new Set(); const deduped = [];
    normalized.forEach(p => {
      const key = `${p.name?.toLowerCase()}-${p.country?.toLowerCase()}`;
      if (!seen.has(key)) { seen.add(key); deduped.push(p); }
    });
    const seedMap = new Map();
    deduped.forEach(p => seedMap.set(p.id, p));
    setPortsDb([...seedMap.values()]);
  };

  const loadAppData = async () => {
    // ── STEP 1: Render from IndexedDB cache IMMEDIATELY, no network wait. ──
    // This is what makes the app usable instantly on 2G/offline — sailors
    // see their last-synced routes/charts/ports right away.
    let allCached = false;
    try {
      const [idbPortsEarly, idbRoutesEarly, idbChartsEarly] = await Promise.all([
        idbGet('ports_d'), idbGet('routes_d'), idbGet('charts_d'),
      ]);
      if (Array.isArray(idbRoutesEarly) && idbRoutesEarly.length > 0) setSheetRoutes(idbRoutesEarly);
      if (Array.isArray(idbChartsEarly) && idbChartsEarly.length > 0) setSheetCharts(idbChartsEarly);
      if (Array.isArray(idbPortsEarly)  && idbPortsEarly.length  > 0) applyPortData(idbPortsEarly);
      allCached = idbRoutesEarly?.length > 0 && idbChartsEarly?.length > 0 && idbPortsEarly?.length > 0;
    } catch (e) { console.warn('loadAppData cache-read error:', e); }

    if (!allCached) setSyncBanner('syncing');

    // ── STEP 2: Background network refresh — fire-and-forget, timeout-protected. ──
    // This NEVER blocks the UI. If the network is slow/offline, the cached
    // data from Step 1 just stays as-is and the sync banner clears quietly.
    const withTimeout = (promise, ms) =>
      Promise.race([
        promise,
        new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), ms)),
      ]);

    (async () => {
      try {
        const meta = await withTimeout(getFirestoreMeta(), 8000);
        if (meta) {
          const [cachedRv, cachedCv, cachedPv] = await Promise.all([
            idbGet('routes_v'), idbGet('charts_v'), idbGet('ports_v'),
          ]);
          await Promise.allSettled([
            (async () => {
              if (meta.rv && cachedRv === meta.rv) { const d = await idbGet('routes_d'); if (d?.length > 0) { setSheetRoutes(d); return; } }
              if (meta.rv && meta.rc) { const d = await loadRoutesFromFirestore(meta.rc); setSheetRoutes(d); await idbSet('routes_d', d); await idbSet('routes_v', meta.rv); }
              else { const d = await fetchRouteSheet(); if (Array.isArray(d) && d.length > 0) { setSheetRoutes(d); await idbSet('routes_d', d); } }
            })(),
            (async () => {
              if (meta.cv && cachedCv === meta.cv) { const d = await idbGet('charts_d'); if (d?.length > 0) { setSheetCharts(d); return; } }
              if (meta.cv && meta.cc) { const d = await loadChartsFromFirestore(meta.cc); setSheetCharts(d); await idbSet('charts_d', d); await idbSet('charts_v', meta.cv); }
              else { const d = await fetchChartSheet(); if (Array.isArray(d) && d.length > 0) { setSheetCharts(d); await idbSet('charts_d', d); } }
            })(),
            (async () => {
              if (meta.pv && cachedPv === meta.pv) { const d = await idbGet('ports_d'); if (d?.length > 0) { applyPortData(d); return; } }
              if (meta.pv && meta.pc) { const d = await loadPortsFromFirestore(meta.pc); applyPortData(d); await idbSet('ports_d', d); await idbSet('ports_v', meta.pv); }
              else { const d = await fetchPortsFromSheet(); if (Array.isArray(d) && d.length > 0) { applyPortData(d); await idbSet('ports_d', d); } }
            })(),
          ]);
        } else if (!allCached) {
          // No metadata system available and nothing cached yet — last resort
          // direct fetch, but still doesn't block initial render since we're
          // already inside this fire-and-forget IIFE.
          const [d1, d2, d3] = await Promise.allSettled([fetchRouteSheet(), fetchChartSheet(), fetchPortsFromSheet()]);
          if (d1.status === 'fulfilled' && Array.isArray(d1.value) && d1.value.length > 0) setSheetRoutes(d1.value);
          if (d2.status === 'fulfilled' && Array.isArray(d2.value) && d2.value.length > 0) setSheetCharts(d2.value);
          if (d3.status === 'fulfilled') applyPortData(d3.value);
        }
      } catch (e) {
        console.warn('loadAppData background sync error/timeout:', e.message);
      }
      setSyncBanner(prev => {
        if (prev === 'syncing') { setTimeout(() => setSyncBanner(null), 4000); return 'done'; }
        return null;
      });
    })();
  };

  const refreshRoutes = async () => {
    setRoutesLoading(true); setRoutesSyncProgress(5);
    notify('📡 Fetching routes from Sheet…', 'info');
    try {
      const d = await fetchRouteSheet(); setRoutesSyncProgress(50);
      if (!Array.isArray(d) || d.length === 0) { notify('No routes found', 'error'); setRoutesLoading(false); setRoutesSyncProgress(0); return; }
      await syncRoutesToFirestore(d); setRoutesSyncProgress(85);
      setSheetRoutes(d); await idbSet('routes_d', d); setRoutesSyncProgress(95);
      const meta = await getFirestoreMeta(); if (meta?.rv) await idbSet('routes_v', meta.rv);
      setRoutesSyncProgress(100); notify(`✅ ${d.length} routes synced`, 'success');
    } catch (e) { notify('Route sync failed: ' + e.message, 'error'); setRoutesSyncProgress(0); }
    setRoutesLoading(false); setTimeout(() => setRoutesSyncProgress(0), 3000);
  };

  const refreshCharts = async () => {
    setChartsLoading(true); setChartsSyncProgress(5);
    notify('📡 Fetching charts…', 'info');
    try {
      const d = await fetchChartSheet(); setChartsSyncProgress(50);
      if (!Array.isArray(d) || d.length === 0) { notify('No charts found', 'error'); setChartsLoading(false); setChartsSyncProgress(0); return; }
      await syncChartsToFirestore(d); setChartsSyncProgress(85);
      setSheetCharts(d); await idbSet('charts_d', d); setChartsSyncProgress(95);
      const meta = await getFirestoreMeta(); if (meta?.cv) await idbSet('charts_v', meta.cv);
      setChartsSyncProgress(100); notify(`✅ ${d.length} charts synced`, 'success');
    } catch (e) { notify('Chart sync failed: ' + e.message, 'error'); setChartsSyncProgress(0); }
    setChartsLoading(false); setTimeout(() => setChartsSyncProgress(0), 3000);
  };

  const refreshPorts = async () => {
    setPortsLoading(true); setPortsSyncProgress(2);
    notify('📡 Fetching ports…', 'info');
    try {
      const d = await fetchPortsFromSheet((fetched) => setPortsSyncProgress(Math.min(65, Math.round((fetched/27000)*65))));
      setPortsSyncProgress(68);
      if (!Array.isArray(d) || d.length === 0) { notify('No ports found', 'error'); setPortsLoading(false); setPortsSyncProgress(0); return; }
      await syncPortsToFirestore(d); setPortsSyncProgress(88);
      applyPortData(d); await idbSet('ports_d', d); setPortsSyncProgress(95);
      const meta = await getFirestoreMeta(); if (meta?.pv) await idbSet('ports_v', meta.pv);
      setPortsSyncProgress(100); notify(`✅ ${d.length.toLocaleString()} ports synced`, 'success');
    } catch (e) { notify('Port sync failed: ' + e.message, 'error'); setPortsSyncProgress(0); }
    setPortsLoading(false); setTimeout(() => setPortsSyncProgress(0), 3000);
  };

  useEffect(() => { loadAppData(); }, []);
  // FIX: removed duplicate loadAppData() trigger on authChecked — was causing
  // double-fetch race (ports/routes/charts loaded twice in parallel on cold start)

  // Redirect after login — handled entirely by onLogin callback in LoginPage render
  // No useEffect needed here — avoids double-redirect conflicts

  useEffect(() => {
    let unsub = () => {};
    // FIX: await setPersistence BEFORE attaching the auth listener.
    // Previously this raced with onAuthStateChanged, which on some browsers
    // caused Firebase to fall back to session-only persistence — logging
    // the user out on every refresh.
    setPersistence(auth, browserLocalPersistence)
      .catch(() => {})
      .finally(() => {
        unsub = onAuthStateChanged(auth, async u => {
          if (u) {
            setUser(u);
            // FIX: cache minimal user info so next load can render as
            // "logged in" instantly, even before Firebase responds.
            try {
              localStorage.setItem('nx_cached_user', JSON.stringify({
                uid: u.uid, email: u.email, displayName: u.displayName,
              }));
            } catch {}
            try {
              const snap = await getDoc(doc(db, 'users', u.uid));
              if (snap.exists()) {
                const profile = { id: snap.id, ...snap.data() };
                if (profile.blocked) {
                  setIsBlocked(true); await signOut(auth);
                  setUser(null); setUserProfile(null); setAuthChecked(true);
                  try { localStorage.removeItem('nx_cached_user'); localStorage.removeItem('nx_cached_profile'); } catch {}
                  return;
                }
                setIsBlocked(false); setUserProfile(profile);
                try { localStorage.setItem('nx_cached_profile', JSON.stringify(profile)); } catch {}
              } else {
                setIsBlocked(false); setUserProfile(null);
              }
            } catch {
              // FIX: profile fetch failed (likely slow/dropped 2G connection) —
              // keep whatever cached profile we already have instead of wiping it.
              setIsBlocked(false);
            }
          } else {
            // FIX: Firebase explicitly confirms no user — this is a real
            // sign-out, safe to clear everything.
            setUser(null); setUserProfile(null);
            try { localStorage.removeItem('nx_cached_user'); localStorage.removeItem('nx_cached_profile'); } catch {}
          }
          setAuthChecked(true);
        });
      });

    // FIX: safety net — if Firebase hasn't responded within 6s (e.g. very
    // slow 2G), stop blocking on it. The optimistic cached user (if any) is
    // already showing; for a brand-new device with no cache, this just lets
    // the public parts of the app render instead of an infinite splash.
    const failSafe = setTimeout(() => setAuthChecked(true), 6000);

    return () => { unsub(); clearTimeout(failSafe); };
  }, []);

  useEffect(() => { if (!sessionStorage.getItem('disclaimer_ok')) setShowDisclaimer(true); }, []);
  useEffect(() => {
    const on = () => setIsOnline(true); const off = () => setIsOnline(false);
    window.addEventListener('online', on); window.addEventListener('offline', off);
    return () => { window.removeEventListener('online', on); window.removeEventListener('offline', off); };
  }, []);
  useEffect(() => { document.documentElement.setAttribute('data-theme', theme); localStorage.setItem('nav_theme', theme); }, [theme]);
  const toggleTheme = () => setTheme(t => t === 'dark' ? 'light' : 'dark');

  useEffect(() => {
    if (authChecked) { setAuthProgress(100); return; }
    let p = 0;
    const t = setInterval(() => { p += Math.random() * 12; if (p >= 85) { p = 85; clearInterval(t); } setAuthProgress(Math.round(p)); }, 120);
    return () => clearInterval(t);
  }, [authChecked]);

  useEffect(() => {
    if (!user) return;
    getDocs(query(collection(db, 'notifications'), orderBy('createdAt', 'desc')))
      .then(snap => setNotifications(snap.docs.map(d => ({ id: d.id, ...d.data() }))))
      .catch(() => {});
  }, [user?.uid]);

  useEffect(() => {
    document.body.style.overflow = menuOpen ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [menuOpen]);

  const unreadCount = notifications.filter(n => !readNotifIds.has(n.id)).length;
  const markAllRead = () => {
    const allIds = new Set(notifications.map(n => n.id));
    setReadNotifIds(allIds);
    localStorage.setItem('notif_read', JSON.stringify([...allIds]));
  };

  const TABS = [
    { k:'home',        i:'🏠', l:'Dashboard' },
    { k:'routes',      i:'🚢', l:'Routes' },
    { k:'charts',      i:'📡', l:'ECDIS Charts',   cls:'gold' },
    { k:'planner',     i:'📐', l:'Route Planner',  cls:'green' },
    { k:'navmode',     i:'🧭', l:'Nav Mode',       cls:'green' },
    { k:'ports',       i:'⚓', l:'Ports Database' },
    { k:'vessel',      i:'🛳', l:'Vessel Search' },
    { k:'voyage',      i:'🧮', l:'Voyage Calc' },
    { k:'certs',       i:'📜', l:'Certificates' },
    { k:'seatime',     i:'⏱', l:'Sea Time' },
    { k:'notices',     i:'📢', l:'Port Notices' },
    { k:'compass',     i:'🧭', l:'Compass Error' },
    { k:'sights',      i:'🔭', l:'Celestial Nav' },
    { k:'library',     i:'📚', l:'Library' },
    { k:'knots',       i:'🪢', l:'Knots & Mooring' },
    { k:'emergency',   i:'🚨', l:'Emergency',      cls:'red' },
    { k:'navbridge',   i:'🗺', l:'Nav & Bridge' },
    { k:'welfare',     i:'⚓', l:'Crew Welfare' },
    { k:'crewjourney', i:'🧳', l:'Crew Journey' },
    { k:'portshore',   i:'🏖', l:'Port & Shore' },
    { k:'seadiary',    i:'📔', l:'Sea Diary' },
    { k:'cargoops',    i:'🚢', l:'Cargo Ops' },
    ...(user ? [{ k:'account', i:'👤', l:'My Account' }] : []),
    ...(isAdmin ? [{ k:'admin', i:'🛡', l:'Admin' }] : []),
    { k:'info', i:'ℹ️', l:'Help & Info' },
  ];

  const handleSearch = (q) => { setSearchQ(q); setTab('routes'); setMenuOpen(false); };

  const switchTab = k => {
    if (!user && !PUBLIC_TABS.has(k) && k !== 'login') {
      setTab('login'); setMenuOpen(false);
      sessionStorage.setItem('intendedTab', k); return;
    }
    setPrevTab(tab); setTab(k); setMenuOpen(false);
    const navTabs = ['routes', 'planner', 'navmode'];
    if (navTabs.includes(k) && !sessionStorage.getItem(`navdisc_${k}`)) {
      sessionStorage.setItem(`navdisc_${k}`, '1');
      setNavDiscBanner(true);
      setTimeout(() => setNavDiscBanner(false), 7000);
    }
  };

  const isPlannerFull = tab === 'planner' || tab === 'navmode';

  return (
    <>
      <style>{S}</style>

      {!isOnline && (
        <div style={{ position:'fixed', bottom:72, left:'50%', transform:'translateX(-50%)', zIndex:9994,
          background:'rgba(4,12,26,0.97)', border:'1px solid rgba(240,165,0,0.4)', borderRadius:12,
          padding:'10px 18px', display:'flex', alignItems:'center', gap:10,
          boxShadow:'0 6px 24px rgba(0,0,0,0.5)', backdropFilter:'blur(20px)', maxWidth:'92vw' }}>
          <span>📵</span>
          <div>
            <div style={{ fontSize:'0.74rem', fontWeight:700, color:'var(--gold)', fontFamily:'Orbitron,monospace' }}>No Internet</div>
            <div style={{ fontSize:'0.68rem', color:'var(--text2)' }}>Showing cached data</div>
          </div>
        </div>
      )}

      {!authChecked && (
        <div style={{ position:'fixed', inset:0, background:'var(--bg)', zIndex:99999,
          display:'flex', alignItems:'center', justifyContent:'center',
          flexDirection:'column', gap:14, padding:'2rem', textAlign:'center' }}>
          <div style={{ fontFamily:'Orbitron,monospace', fontSize:'1.6rem', fontWeight:900 }}>
            NAVISPHERE<span style={{ color:'var(--cyan)' }}>X</span>
          </div>
          <div style={{ fontSize:'0.6rem', color:'var(--cyan)', letterSpacing:'0.22em', textTransform:'uppercase' }}>Marine Systems</div>
          <div style={{ marginTop:8, fontSize:'0.88rem', color:'var(--text2)' }}>🙏 Welcome to NavisphereX Marine Systems</div>
          <div style={{ fontSize:'0.72rem', color:'var(--text3)' }}>Please wait while the app is loading…</div>
          <div style={{ width:220, height:4, background:'rgba(255,255,255,0.08)', borderRadius:4, overflow:'hidden', marginTop:6 }}>
            <div style={{ height:'100%', borderRadius:4, transition:'width 0.35s ease',
              background:'linear-gradient(90deg,var(--cyan),var(--blue))', width:`${authProgress}%` }} />
          </div>
          <div style={{ fontSize:'0.62rem', color:'var(--text3)', fontFamily:'Orbitron,monospace' }}>{authProgress}%</div>
        </div>
      )}

      <div className="grid-bg" />
      <div className="app">

        <nav className="nav">
          <div className="nav-row1">
            <div className="nav-brand" onClick={() => switchTab('home')} style={{ cursor:'pointer' }}>
              <div className="nav-logo">🧭</div>
              <div>
                <div className="nav-title">NAVISPHERE<span style={{ color:'var(--cyan)' }}>X</span></div>
                <div className="nav-sub">MARINE</div>
              </div>
            </div>
            <div className="nav-controls">
              <div className="sd" />
              {user && (
                <button onClick={() => { setShowNotifPanel(p => !p); markAllRead(); }}
                  style={{ position:'relative', background:'rgba(255,255,255,0.06)', border:'1px solid var(--border)',
                    borderRadius:8, padding:'5px 9px', cursor:'pointer', fontSize:'1rem' }}>
                  🔔
                  {unreadCount > 0 && (
                    <span style={{ position:'absolute', top:-4, right:-4, background:'#ff4757',
                      color:'white', borderRadius:'50%', width:16, height:16, fontSize:'0.55rem',
                      fontWeight:900, display:'flex', alignItems:'center', justifyContent:'center',
                      border:'1px solid var(--bg)' }}>
                      {unreadCount > 9 ? '9+' : unreadCount}
                    </span>
                  )}
                </button>
              )}
              <button onClick={toggleTheme}
                style={{ background:'rgba(255,255,255,0.06)', border:'1px solid var(--border)',
                  borderRadius:8, padding:'5px 9px', cursor:'pointer', fontSize:'0.95rem' }}>
                {theme === 'dark' ? '☀️' : '🌙'}
              </button>
              {!user && authChecked && (
                <button className="ntab" onClick={() => switchTab('login')}>🔐 Login</button>
              )}
              {!user && !authChecked && (
                <div className="spin" style={{ width:14, height:14, flexShrink:0 }} />
              )}
              <button className="burger" onClick={() => setMenuOpen(o => !o)}><span /><span /><span /></button>
            </div>
          </div>
        </nav>

        <div className={`mob-menu ${menuOpen ? 'open' : ''}`}>
          {TABS.map(t => (
            <button key={t.k} className={`mtab ${tab===t.k?'active':''}`} onClick={() => switchTab(t.k)}>
              <span style={{ fontSize:'1rem' }}>{t.i}</span> {t.l}
            </button>
          ))}
          {user
            ? <button className="mtab mtab-full" onClick={() => { signOut(auth); notify('Logged out','info'); setMenuOpen(false); }}>
                🚪 Logout ({userProfile?.name?.split(' ')[0] || user.email.split('@')[0]})
              </button>
            : authChecked
              ? <button className="mtab mtab-full" onClick={() => switchTab('login')}>🔐 Login / Register</button>
              : null
          }
        </div>

        {isBlocked && (
          <div style={{ position:'fixed', inset:0, background:'var(--bg)', zIndex:9999, display:'flex', alignItems:'center', justifyContent:'center', padding:'1.5rem' }}>
            <div style={{ maxWidth:400, width:'100%', background:'var(--card)', border:'2px solid rgba(255,60,60,0.5)', borderRadius:16, padding:'2rem', textAlign:'center' }}>
              <div style={{ fontSize:'3.5rem', marginBottom:'1rem' }}>⚠️</div>
              <div style={{ fontFamily:'Orbitron,monospace', fontSize:'1rem', fontWeight:700, color:'#ff6b6b', marginBottom:'0.5rem' }}>ACCESS SUSPENDED</div>
              <div style={{ fontSize:'0.82rem', color:'var(--text2)', lineHeight:1.6, marginBottom:'1.2rem' }}>Your access has been suspended by the administrator.</div>
              <a href="https://www.instagram.com/manish_the_navigator" target="_blank" rel="noreferrer"
                style={{ display:'flex', alignItems:'center', justifyContent:'center', gap:10, background:'linear-gradient(135deg,#833ab4,#fd1d1d,#fcb045)', color:'white', borderRadius:10, padding:'12px 20px', textDecoration:'none', fontWeight:700, fontSize:'0.85rem', marginBottom:'1rem' }}>
                <span>📸</span> Contact on Instagram
              </a>
              <button style={{ marginTop:'1rem', background:'transparent', border:'1px solid var(--border)', color:'var(--text3)', borderRadius:8, padding:'6px 16px', fontSize:'0.7rem', cursor:'pointer' }}
                onClick={() => setIsBlocked(false)}>Dismiss</button>
            </div>
          </div>
        )}

        <div className="app-body">

          <aside className="app-sidebar">
            <div style={{ padding:'4px 6px 8px', marginBottom:2 }}>
              <div style={{ fontSize:'0.52rem', color:'var(--text3)', textTransform:'uppercase', letterSpacing:'0.14em' }}>NAVIGATION</div>
            </div>
            {TABS.map(t => (
              <button key={t.k} className={`si-btn ${t.cls||''} ${tab===t.k?'active':''}`} onClick={() => switchTab(t.k)}>
                <span className="si-icon">{t.i}</span>
                {t.l}
                {t.k==='navmode'  && <span style={{ marginLeft:'auto', padding:'1px 5px', borderRadius:4, fontSize:'0.5rem', background:'rgba(0,200,100,0.15)', color:'var(--green)', border:'1px solid rgba(0,200,100,0.25)', fontWeight:700, flexShrink:0 }}>NEW</span>}
                {t.k==='sights'   && <span style={{ marginLeft:'auto', padding:'1px 5px', borderRadius:4, fontSize:'0.5rem', background:'rgba(240,165,0,0.15)', color:'var(--gold)', border:'1px solid rgba(240,165,0,0.25)', fontWeight:700, flexShrink:0 }}>NEW</span>}
                {t.k==='seadiary' && <span style={{ marginLeft:'auto', padding:'1px 5px', borderRadius:4, fontSize:'0.5rem', background:'rgba(0,180,216,0.15)', color:'var(--cyan)', border:'1px solid rgba(0,180,216,0.25)', fontWeight:700, flexShrink:0 }}>NEW</span>}
                {t.k==='cargoops' && <span style={{ marginLeft:'auto', padding:'1px 5px', borderRadius:4, fontSize:'0.5rem', background:'rgba(245,158,11,0.15)', color:'#F59E0B', border:'1px solid rgba(245,158,11,0.25)', fontWeight:700, flexShrink:0 }}>NEW</span>}
              </button>
            ))}
            {user && (
              <button className="si-btn" style={{ color:'var(--red)', marginTop:4 }}
                onClick={() => { signOut(auth); notify('Logged out','info'); }}>
                <span className="si-icon">🚪</span> Logout
              </button>
            )}
            <div style={{ marginTop:'auto', padding:'0.8rem 0.3rem 0' }}>
              <div style={{ background:'linear-gradient(135deg,#0F2444,#1A3A5C)', border:'1px solid var(--border)', borderRadius:12, padding:'0.9rem', textAlign:'center' }}>
                <div style={{ fontSize:'1.4rem', marginBottom:4 }}>🧭</div>
                <div style={{ fontFamily:'Orbitron,monospace', fontSize:'0.58rem', fontWeight:700, color:'var(--cyan)', marginBottom:4, letterSpacing:'0.06em' }}>Smart Navigation</div>
                <div style={{ fontSize:'0.58rem', color:'var(--text3)', marginBottom:'0.6rem', lineHeight:1.5 }}>Plan safe. Sail smart.<br/>Reach further.</div>
                <button className="btn btn-primary" style={{ width:'100%', justifyContent:'center', fontSize:'0.64rem', padding:'6px' }} onClick={() => switchTab('planner')}>Explore Now</button>
              </div>
            </div>
          </aside>

          <div className="app-content" style={{ overflowY: isPlannerFull ? 'hidden' : 'auto' }}>

            {syncBanner && (
              <div style={{ position:'sticky', top:0, left:0, right:0, height:3, zIndex:200, overflow:'hidden', flexShrink:0 }}>
                {syncBanner==='syncing'
                  ? <div style={{ height:'100%', background:'linear-gradient(90deg,var(--cyan),var(--blue),var(--cyan))', backgroundSize:'200% 100%', animation:'shimmer 1.4s linear infinite' }} />
                  : <div style={{ height:'100%', background:'var(--green)', width:'100%' }} />
                }
              </div>
            )}

            {syncBanner==='syncing' && (
              <div style={{ position:'fixed', bottom:72, left:'50%', transform:'translateX(-50%)', zIndex:9996,
                background:'rgba(4,12,26,0.97)', border:'1px solid rgba(0,180,216,0.45)', borderRadius:14,
                padding:'13px 18px', display:'flex', alignItems:'center', gap:12,
                boxShadow:'0 8px 32px rgba(0,0,0,0.6)', backdropFilter:'blur(20px)', maxWidth:'92vw', minWidth:280 }}>
                <div className="spin" style={{ width:16, height:16, borderTopColor:'var(--cyan)', flexShrink:0 }} />
                <div>
                  <div style={{ fontFamily:'Orbitron,monospace', fontSize:'0.74rem', fontWeight:700, color:'var(--cyan)', marginBottom:2 }}>Loading App Data</div>
                  <div style={{ fontSize:'0.68rem', color:'var(--text2)' }}>Syncing from Firebase…</div>
                </div>
              </div>
            )}
            {syncBanner==='done' && (
              <div style={{ position:'fixed', bottom:72, left:'50%', transform:'translateX(-50%)', zIndex:9996,
                background:'rgba(4,12,26,0.97)', border:'1px solid rgba(0,200,150,0.45)', borderRadius:14,
                padding:'13px 18px', display:'flex', alignItems:'center', gap:12,
                boxShadow:'0 8px 32px rgba(0,0,0,0.6)', backdropFilter:'blur(20px)', maxWidth:'92vw', minWidth:280 }}>
                <span>✅</span>
                <div>
                  <div style={{ fontFamily:'Orbitron,monospace', fontSize:'0.74rem', fontWeight:700, color:'var(--green)', marginBottom:2 }}>All Data Ready</div>
                  <div style={{ fontSize:'0.68rem', color:'var(--text2)' }}>Routes, charts & ports loaded.</div>
                </div>
              </div>
            )}

            {tab!=='home' && prevTab && (
              <div style={{ padding:'8px 16px 0', flexShrink:0 }}>
                <button className="btn btn-secondary" style={{ padding:'5px 12px', fontSize:'0.72rem', display:'flex', alignItems:'center', gap:6 }}
                  onClick={() => switchTab(prevTab)}>← Back</button>
              </div>
            )}

            {showNotifPanel && (
              <div style={{ position:'fixed', top:0, right:0, width:310, maxWidth:'95vw',
                height:'100vh', background:'var(--card)', border:'1px solid var(--border)',
                zIndex:9990, display:'flex', flexDirection:'column',
                boxShadow:'-8px 0 32px rgba(0,0,0,0.4)', overflowY:'auto' }}>
                <div style={{ padding:'1rem', borderBottom:'1px solid var(--border)',
                  display:'flex', justifyContent:'space-between', alignItems:'center', flexShrink:0 }}>
                  <div style={{ fontFamily:'Orbitron,monospace', fontSize:'0.78rem', fontWeight:700 }}>🔔 Notifications</div>
                  <button onClick={() => setShowNotifPanel(false)}
                    style={{ background:'none', border:'none', color:'var(--text3)', cursor:'pointer', fontSize:'1.2rem' }}>✕</button>
                </div>
                {notifications.length===0
                  ? <div style={{ padding:'2rem', textAlign:'center', color:'var(--text3)', fontSize:'0.78rem' }}>
                      <div style={{ fontSize:'2rem', marginBottom:8 }}>🔔</div>No notifications yet
                    </div>
                  : notifications.map(n => {
                    const isRead = readNotifIds.has(n.id);
                    const tc = n.type==='warning'?'#ff6b35':n.type==='alert'?'#ff4757':'var(--cyan)';
                    return (
                      <div key={n.id} style={{ padding:'12px 16px', borderBottom:'1px solid var(--border)', background:isRead?'transparent':'rgba(0,180,216,0.05)' }}>
                        {!isRead && <div style={{ width:6, height:6, borderRadius:'50%', background:'var(--cyan)', float:'right', marginTop:4 }} />}
                        <div style={{ fontWeight:700, fontSize:'0.82rem', color:tc, marginBottom:4 }}>{n.title}</div>
                        {n.message && <div style={{ fontSize:'0.74rem', color:'var(--text2)', lineHeight:1.5 }}>{n.message}</div>}
                        <div style={{ fontSize:'0.62rem', color:'var(--text3)', marginTop:4 }}>{n.createdAt?.toDate?.()?.toLocaleString()||''}</div>
                      </div>
                    );
                  })
                }
              </div>
            )}

            {/* ── All Pages ── */}
            {tab==='home'        && <HomePage routes={routes} charts={charts} onSearch={handleSearch} setTab={switchTab} user={user} portsDb={portsDb} userProfile={userProfile} />}
            {tab==='routes'      && <RoutesPage searchQuery={searchQ} notify={notify} user={user} setTab={switchTab} sheetRoutes={sheetRoutes} sheetLoading={routesLoading} />}
            {tab==='charts'      && <ChartsPage notify={notify} user={user} setTab={switchTab} isAdmin={isAdmin} sheetCharts={sheetCharts} sheetLoading={chartsLoading} />}
            {tab==='planner'     && <RoutePlannerPage notify={notify} sheetRoutes={[...routes,...sheetRoutes]} portsDb={portsDb} />}
            {tab==='ports'       && <PortSearchPage portsDb={portsDb} sheetLoading={portsLoading} refreshSheets={refreshPorts} />}
            {tab==='vessel'      && <VesselSearchPage />}
            {tab==='voyage'      && <VoyageCalculatorPage portsDb={portsDb} />}
            {tab==='certs'       && <CertificateTrackerPage user={user} notify={notify} />}
            {tab==='seatime'     && <SeaTimeCalculatorPage  user={user} notify={notify} />}
            {tab==='notices'     && <NoticesPage notify={notify} />}
            {tab==='compass'     && <CompassErrorPage user={user} />}
            {tab==='sights'      && <SightReductionPage />}
            {tab==='account'     && user && <AccountPage user={user} userProfile={userProfile} setUserProfile={setUserProfile} notify={notify} setTab={switchTab} />}
            {tab==='library'     && <MaritimeLibraryPage setTab={switchTab} />}
            {tab==='navmode'     && <NavModePage notify={notify} sheetRoutes={[...routes,...sheetRoutes]} portsDb={portsDb} setTab={switchTab} />}
            {tab==='emergency'   && <EmergencyPage portsDb={portsDb} />}
            {tab==='knots'       && <KnotsRopesMooringPage />}
            {tab==='navbridge'   && <NavigationBridgePage />}
            {/* ── Seafarer Welfare Hub (renamed from CrewWelfarePage to resolve build issue) ── */}
            {tab==='welfare'     && user && <SeafarerWelfareHub user={user} notify={notify} />}
            {tab==='crewjourney' && <CrewJourneyPage user={user} userProfile={userProfile} notify={notify} />}
            {tab==='portshore'   && <PortShorePage user={user} onNavigate={switchTab} />}
            {tab==='seadiary'    && user && <SeaDiaryPage user={user} notify={notify} portsDb={portsDb} />}
            {tab==='cargoops'    && user && <CargoOpsPage notify={notify} />}
            {tab==='login'       && <LoginPage notify={notify} onLogin={(u, redirectTo, isNew, userName, userRank) => {
              setUser(u); setTab(redirectTo || 'home');
              if (!sessionStorage.getItem('welcome_shown')) {
                sessionStorage.setItem('welcome_shown', '1');
                setWelcomePopup({ type:isNew?'new':'returning', name:userName, rank:userRank });
              }
            }} />}
            {tab==='admin' && (isAdmin
              ? <AdminPage notify={notify} routes={routes} setRoutes={setRoutes} charts={charts} setCharts={setCharts}
                  sheetRoutes={sheetRoutes} sheetCharts={sheetCharts}
                  refreshRoutes={refreshRoutes} refreshCharts={refreshCharts} refreshPorts={refreshPorts}
                  routesLoading={routesLoading} chartsLoading={chartsLoading} portsLoading={portsLoading}
                  portsDb={portsDb} routesSyncProgress={routesSyncProgress}
                  chartsSyncProgress={chartsSyncProgress} portsSyncProgress={portsSyncProgress} />
              : <div className="section"><div className="empty"><div className="empty-icon">🔒</div><div className="empty-t">Admin Access Only</div></div></div>
            )}

            {/* ── FIX: Info is now fully public — no login wall ── */}
            {tab==='info' && <InfoPage notify={notify} user={user} setTab={switchTab} />}

            {/* ── Generic login wall for all other protected tabs ── */}
            {authChecked && !user && tab!=='home' && tab!=='login' && !PUBLIC_TABS.has(tab) && (
              <div style={{ display:'flex', flex:1, alignItems:'center', justifyContent:'center', padding:'2rem' }}>
                <div style={{ maxWidth:380, width:'100%', background:'var(--card)', border:'1px solid var(--border2)', borderRadius:16, padding:'2rem', textAlign:'center' }}>
                  <div style={{ fontSize:'3rem', marginBottom:'1rem' }}>🔐</div>
                  <div style={{ fontFamily:'Orbitron,monospace', fontSize:'0.9rem', fontWeight:700, marginBottom:'0.5rem' }}>Login Required</div>
                  <div style={{ fontSize:'0.82rem', color:'var(--text2)', marginBottom:'1.4rem', lineHeight:1.6 }}>Create a free account to access all features.</div>
                  <div style={{ display:'flex', gap:10, justifyContent:'center' }}>
                    <button className="btn btn-primary" onClick={() => switchTab('login')}>🔐 Login</button>
                    <button className="btn btn-secondary" onClick={() => switchTab('login')}>✅ Register Free</button>
                  </div>
                </div>
              </div>
            )}

            {/* ── Footer only on homepage ── */}
            {tab === 'home' && <Footer setTab={switchTab} />}

          </div>
        </div>

        {notif && <Notif key={notif.key} msg={notif.msg} type={notif.type} onClose={() => setNotif(null)} />}
        {welcomePopup && <WelcomePopup type={welcomePopup.type} name={welcomePopup.name} rank={welcomePopup.rank} onClose={() => setWelcomePopup(null)} />}

        {authChecked && <ContactFloatingBtn setTab={switchTab} />}

        {showDisclaimer && (
          <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.75)', zIndex:9999, display:'flex', alignItems:'center', justifyContent:'center', padding:'1.5rem' }}>
            <div style={{ background:'var(--card)', border:'2px solid rgba(240,165,0,0.4)', borderRadius:18, padding:'2rem', maxWidth:400, width:'100%', textAlign:'center' }}>
              <div style={{ fontSize:'3rem', marginBottom:'0.8rem' }}>⚠️</div>
              <div style={{ fontFamily:'Orbitron,monospace', fontSize:'0.9rem', fontWeight:700, color:'var(--gold)', marginBottom:'0.8rem' }}>NAVIGATION DISCLAIMER</div>
              <div style={{ fontSize:'0.8rem', color:'var(--text2)', lineHeight:1.8, marginBottom:'1.6rem' }}>
                Content on <strong>NavisphereX Marine</strong> is <strong style={{ color:'var(--gold)' }}>not to be used solely for navigation</strong>.<br/>
                Always verify with official sources before use at sea.
              </div>
              <button className="btn btn-gold" style={{ width:'100%', justifyContent:'center', fontSize:'0.82rem', padding:'12px' }}
                onClick={() => { sessionStorage.setItem('disclaimer_ok','1'); setShowDisclaimer(false); }}>
                ✅ I Understand — Continue
              </button>
            </div>
          </div>
        )}

        {navDiscBanner && (
          <div style={{ position:'fixed', bottom:72, left:'50%', transform:'translateX(-50%)', zIndex:9995,
            background:'rgba(4,12,26,0.97)', border:'1px solid rgba(240,165,0,0.4)', borderRadius:12,
            padding:'10px 16px', display:'flex', alignItems:'center', gap:10,
            boxShadow:'0 6px 24px rgba(0,0,0,0.5)', backdropFilter:'blur(20px)', maxWidth:'92vw', minWidth:260 }}>
            <span>⚠️</span>
            <span style={{ fontSize:'0.7rem', color:'var(--gold)', lineHeight:1.4 }}>Not to be used solely for navigation. Always verify with official sources.</span>
            <button onClick={() => setNavDiscBanner(false)} style={{ background:'none', border:'none', color:'var(--text3)', cursor:'pointer', fontSize:'1rem', flexShrink:0, marginLeft:4 }}>✕</button>
          </div>
        )}
      </div>
    </>
  );
}
