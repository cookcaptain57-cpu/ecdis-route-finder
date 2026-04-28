/* eslint-disable */
import { useState, useEffect, useRef } from "react";
import { auth, db, storage } from "./firebase";
import {
  signInWithEmailAndPassword, createUserWithEmailAndPassword,
  signOut, onAuthStateChanged, sendPasswordResetEmail
} from "firebase/auth";
import {
  collection, getDocs, addDoc, deleteDoc, doc,
  setDoc, serverTimestamp, updateDoc
} from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";

// ─── ECDIS BRANDS ────────────────────────────────────────────────────────────
const ECDIS_BRANDS = [
  { id:"furuno",    name:"Furuno",              emoji:"🟦", color:"#0066CC", models:"FMD-3200 / FMD-3300" },
  { id:"jrc",       name:"JRC",                 emoji:"🟥", color:"#CC0000", models:"JAN-7201S / JAN-9201S" },
  { id:"transas",   name:"Transas / Wärtsilä",  emoji:"🟩", color:"#007A4D", models:"Navi-Sailor 4000/3000" },
  { id:"sperry",    name:"Sperry Marine",        emoji:"🟨", color:"#D4900A", models:"VisionMaster FT / Pro" },
  { id:"tokimec",   name:"Tokimec / JMR",        emoji:"🟪", color:"#6B21A8", models:"JMR-7700 / JMR-9900" },
  { id:"raytheon",  name:"Raytheon Anschütz",    emoji:"⬛", color:"#374151", models:"ECDIS 1000 / 2000" },
  { id:"kongsberg", name:"Kongsberg Maritime",   emoji:"🔵", color:"#1D4ED8", models:"K-Bridge ECDIS" },
  { id:"danelec",   name:"Danelec Marine",       emoji:"🔶", color:"#EA580C", models:"DM800 ECDIS" },
  { id:"kelvin",    name:"Kelvin Hughes",         emoji:"🔷", color:"#0891B2", models:"SharpEye ECDIS" },
  { id:"northrop",  name:"Northrop Grumman",     emoji:"⭕", color:"#DC2626", models:"Integrated Bridge" },
  { id:"sam",       name:"SAM Electronics",      emoji:"🟫", color:"#92400E", models:"NACOS Platinum" },
  { id:"wartsila",  name:"Wärtsilä Voyage",      emoji:"🔺", color:"#059669", models:"Navi-Sailor Series" },
];

const ROUTE_TYPES = ["Ocean","Coastal","Deep Sea","Strait","River","Port Approach","Anchorage"];

// ─── STYLES ──────────────────────────────────────────────────────────────────
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
  .app{position:relative;z-index:2;min-height:100vh;}

  /* NAV */
  .nav{position:sticky;top:0;z-index:100;background:rgba(4,12,26,0.96);backdrop-filter:blur(20px);
    border-bottom:1px solid var(--border);padding:0 1.2rem;display:flex;align-items:center;
    justify-content:space-between;height:60px;box-shadow:0 4px 30px rgba(0,0,0,0.5);}
  .nav-brand{display:flex;align-items:center;gap:9px;}
  .nav-logo{width:36px;height:36px;background:linear-gradient(135deg,var(--cyan),var(--blue));
    border-radius:9px;display:flex;align-items:center;justify-content:center;font-size:18px;
    box-shadow:0 0 14px rgba(0,180,216,0.4);flex-shrink:0;}
  .nav-title{font-family:'Orbitron',monospace;font-size:0.8rem;font-weight:700;letter-spacing:0.08em;}
  .nav-sub{font-size:0.58rem;color:var(--cyan);letter-spacing:0.14em;text-transform:uppercase;}
  .nav-tabs{display:flex;gap:2px;}
  .ntab{padding:7px 11px;border:none;background:transparent;color:var(--text2);font-family:'Exo 2',sans-serif;
    font-size:0.75rem;font-weight:500;cursor:pointer;border-radius:8px;transition:all 0.2s;
    display:flex;align-items:center;gap:5px;text-transform:uppercase;letter-spacing:0.04em;white-space:nowrap;}
  .ntab:hover{color:var(--text);background:rgba(255,255,255,0.05);}
  .ntab.active{color:var(--cyan);background:rgba(0,180,216,0.1);border:1px solid rgba(0,180,216,0.2);}
  .ntab.gold.active{color:var(--gold);background:rgba(240,165,0,0.1);border:1px solid rgba(240,165,0,0.2);}
  .status-dot{width:7px;height:7px;border-radius:50%;background:var(--green);box-shadow:0 0 7px var(--green);animation:pulse 2s infinite;}
  @keyframes pulse{0%,100%{opacity:1;}50%{opacity:0.4;}}
  .burger{display:none;flex-direction:column;gap:4px;cursor:pointer;padding:8px;background:none;border:none;}
  .burger span{width:20px;height:2px;background:var(--text);border-radius:2px;}
  @media(max-width:760px){.nav-tabs{display:none;}.burger{display:flex;}}
  .mob-menu{display:none;position:fixed;top:60px;left:0;right:0;background:rgba(4,12,26,0.98);
    backdrop-filter:blur(20px);border-bottom:1px solid var(--border);z-index:99;padding:0.8rem;}
  .mob-menu.open{display:flex;flex-direction:column;gap:4px;}
  .mtab{padding:11px 14px;border:none;background:transparent;color:var(--text2);font-family:'Exo 2',sans-serif;
    font-size:0.88rem;cursor:pointer;border-radius:9px;text-align:left;transition:all 0.2s;display:flex;align-items:center;gap:9px;}
  .mtab:hover{background:rgba(255,255,255,0.05);color:var(--text);}
  .mtab.active{background:rgba(0,180,216,0.1);color:var(--cyan);}

  /* AD BANNER */
  .ad-slot{background:rgba(240,165,0,0.04);border:1px dashed rgba(240,165,0,0.18);
    border-radius:10px;padding:14px;text-align:center;color:var(--text3);
    font-size:0.72rem;letter-spacing:0.08em;margin:0.8rem 1.2rem;}
  .ad-slot-lg{min-height:90px;display:flex;align-items:center;justify-content:center;flex-direction:column;gap:4px;}
  .ad-slot-sm{padding:8px;}

  /* HERO */
  .hero{padding:2.5rem 1.2rem 1.5rem;text-align:center;}
  .hero-tag{display:inline-flex;align-items:center;gap:7px;padding:5px 13px;border-radius:100px;
    border:1px solid rgba(0,180,216,0.3);background:rgba(0,180,216,0.08);
    font-size:0.68rem;color:var(--cyan);letter-spacing:0.12em;text-transform:uppercase;margin-bottom:1rem;}
  .hero-title{font-family:'Orbitron',monospace;font-size:clamp(1.5rem,5vw,2.6rem);font-weight:900;
    line-height:1.1;letter-spacing:0.04em;margin-bottom:0.7rem;}
  .accent{color:var(--cyan);}
  .hero-desc{max-width:500px;margin:0 auto 1.8rem;color:var(--text2);font-size:0.88rem;line-height:1.7;font-weight:300;}

  /* SEARCH */
  .search-wrap{max-width:640px;margin:0 auto;}
  .search-box{background:var(--card);border:1px solid var(--border2);border-radius:15px;
    padding:1.2rem;box-shadow:0 20px 60px rgba(0,0,0,0.4),var(--glow);}
  .search-row{display:flex;gap:8px;align-items:center;}
  .si-wrap{flex:1;position:relative;}
  .si{width:100%;padding:12px 15px 12px 42px;background:var(--bg2);border:1.5px solid var(--border2);
    border-radius:10px;color:var(--text);font-family:'Exo 2',sans-serif;font-size:0.92rem;outline:none;transition:all 0.25s;}
  .si::placeholder{color:var(--text3);}
  .si:focus{border-color:var(--cyan);box-shadow:0 0 0 3px rgba(0,180,216,0.12);}
  .si-icon{position:absolute;left:12px;top:50%;transform:translateY(-50%);font-size:1rem;color:var(--text3);pointer-events:none;}
  .sbtn2{padding:12px 18px;background:linear-gradient(135deg,var(--cyan),var(--blue));border:none;
    border-radius:10px;color:white;font-family:'Orbitron',monospace;font-size:0.72rem;font-weight:700;
    letter-spacing:0.1em;cursor:pointer;transition:all 0.2s;white-space:nowrap;
    box-shadow:0 4px 18px rgba(0,180,216,0.3);}
  .sbtn2:hover{transform:translateY(-2px);box-shadow:0 8px 28px rgba(0,180,216,0.45);}
  .s-hint{font-size:0.7rem;color:var(--text3);margin-top:8px;text-align:center;}
  .s-hint span{color:var(--cyan);}

  .ac{position:absolute;top:calc(100% + 6px);left:0;right:0;z-index:60;
    background:var(--card2);border:1px solid var(--border2);border-radius:10px;
    overflow:hidden;box-shadow:0 20px 50px rgba(0,0,0,0.65);max-height:210px;overflow-y:auto;}
  .ac-item{padding:9px 13px;cursor:pointer;display:flex;align-items:center;gap:8px;
    transition:background 0.15s;font-size:0.84rem;border-bottom:1px solid rgba(255,255,255,0.04);}
  .ac-item:hover{background:rgba(0,180,216,0.1);}

  /* STATS */
  .stats{display:flex;justify-content:center;gap:2.2rem;margin-top:1.8rem;flex-wrap:wrap;}
  .stat-n{font-family:'Orbitron',monospace;font-size:1.4rem;font-weight:700;color:var(--cyan);}
  .stat-l{font-size:0.64rem;color:var(--text2);letter-spacing:0.1em;text-transform:uppercase;}

  /* SECTION */
  .section{padding:1.2rem;max-width:1100px;margin:0 auto;}
  .sec-hdr{display:flex;align-items:center;justify-content:space-between;
    margin-bottom:1.1rem;padding-bottom:0.8rem;border-bottom:1px solid var(--border);flex-wrap:wrap;gap:8px;}
  .sec-title{font-family:'Orbitron',monospace;font-size:0.92rem;font-weight:700;letter-spacing:0.08em;display:flex;align-items:center;gap:7px;}
  .badge{padding:3px 9px;border-radius:100px;background:rgba(0,180,216,0.12);border:1px solid rgba(0,180,216,0.25);color:var(--cyan);font-size:0.67rem;}
  .badge-gold{background:rgba(240,165,0,0.12);border-color:rgba(240,165,0,0.25);color:var(--gold);}
  .badge-green{background:rgba(0,200,150,0.12);border-color:rgba(0,200,150,0.25);color:var(--green);}

  /* ECDIS BRAND GRID */
  .brand-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(150px,1fr));gap:0.8rem;margin-bottom:1.5rem;}
  .brand-card{background:var(--card);border:2px solid var(--border);border-radius:13px;padding:1rem;
    cursor:pointer;transition:all 0.2s;text-align:center;}
  .brand-card:hover{transform:translateY(-3px);box-shadow:0 8px 25px rgba(0,0,0,0.4);}
  .brand-card.selected{transform:translateY(-3px);}
  .brand-emoji{font-size:2rem;margin-bottom:6px;}
  .brand-name{font-family:'Orbitron',monospace;font-size:0.7rem;font-weight:700;margin-bottom:2px;}
  .brand-models{font-size:0.62rem;color:var(--text2);}
  .brand-count{font-size:0.66rem;margin-top:5px;font-weight:600;}

  /* FILE CARDS */
  .files-grid{display:grid;gap:0.9rem;grid-template-columns:repeat(auto-fill,minmax(290px,1fr));}
  .file-card{background:var(--card);border:1px solid var(--border);border-radius:13px;padding:1.1rem;
    transition:all 0.25s;position:relative;overflow:hidden;}
  .file-card:hover{border-color:rgba(0,180,216,0.35);transform:translateY(-2px);box-shadow:0 10px 35px rgba(0,0,0,0.4),var(--glow);}
  .file-icon{font-size:1.8rem;margin-bottom:0.6rem;}
  .file-name{font-family:'Orbitron',monospace;font-size:0.72rem;font-weight:700;color:var(--cyan);
    margin-bottom:4px;word-break:break-all;}
  .file-port{font-size:0.78rem;color:var(--text2);margin-bottom:0.8rem;}
  .file-tags{display:flex;gap:5px;flex-wrap:wrap;margin-bottom:0.8rem;}
  .ftag{padding:2px 7px;border-radius:5px;font-size:0.62rem;font-weight:500;}
  .tag-rtz{background:rgba(0,180,216,0.1);color:var(--cyan);border:1px solid rgba(0,180,216,0.2);}
  .tag-chart{background:rgba(240,165,0,0.1);color:var(--gold);border:1px solid rgba(240,165,0,0.2);}
  .tag-brand{background:rgba(124,58,237,0.12);color:#A78BFA;border:1px solid rgba(124,58,237,0.2);}
  .tag-type{background:rgba(0,200,150,0.1);color:var(--green);border:1px solid rgba(0,200,150,0.2);}
  .dl-btn{width:100%;padding:10px;background:linear-gradient(135deg,var(--gold),var(--gold2));
    border:none;border-radius:9px;color:#000;font-family:'Exo 2',sans-serif;font-size:0.8rem;
    font-weight:700;cursor:pointer;transition:all 0.2s;display:flex;align-items:center;justify-content:center;gap:6px;}
  .dl-btn:hover{transform:translateY(-1px);box-shadow:0 4px 18px rgba(240,165,0,0.4);}
  .dl-btn:disabled{opacity:0.35;cursor:not-allowed;transform:none;background:var(--border2);color:var(--text3);}
  .login-req{width:100%;padding:10px;background:transparent;border:1px solid rgba(240,165,0,0.3);
    border-radius:9px;color:var(--gold);font-family:'Exo 2',sans-serif;font-size:0.78rem;
    font-weight:600;cursor:pointer;transition:all 0.2s;display:flex;align-items:center;justify-content:center;gap:6px;}
  .login-req:hover{background:rgba(240,165,0,0.08);}

  /* FILTER */
  .fbar{display:flex;gap:6px;flex-wrap:wrap;margin-bottom:1rem;}
  .fbtn{padding:6px 12px;border-radius:100px;border:1px solid var(--border);background:transparent;
    color:var(--text2);font-family:'Exo 2',sans-serif;font-size:0.72rem;cursor:pointer;transition:all 0.2s;text-transform:uppercase;}
  .fbtn:hover{border-color:var(--cyan);color:var(--cyan);}
  .fbtn.active{background:rgba(0,180,216,0.12);border-color:rgba(0,180,216,0.4);color:var(--cyan);}
  .fbtn.gold:hover{border-color:var(--gold);color:var(--gold);}
  .fbtn.gold.active{background:rgba(240,165,0,0.12);border-color:rgba(240,165,0,0.4);color:var(--gold);}

  /* BUTTONS */
  .btn{padding:8px 13px;border-radius:9px;font-family:'Exo 2',sans-serif;font-size:0.77rem;
    font-weight:600;cursor:pointer;transition:all 0.2s;border:none;display:inline-flex;align-items:center;gap:5px;}
  .btn-primary{background:linear-gradient(135deg,var(--cyan),var(--blue));color:white;}
  .btn-primary:hover{transform:translateY(-1px);box-shadow:0 4px 18px rgba(0,180,216,0.4);}
  .btn-danger{background:var(--red);color:white;}
  .btn-danger:hover{opacity:0.85;}
  .btn-secondary{background:transparent;border:1px solid var(--border2);color:var(--text2);}
  .btn-secondary:hover{border-color:var(--cyan);color:var(--cyan);}
  .btn-gold{background:linear-gradient(135deg,var(--gold),var(--gold2));color:#000;font-weight:700;}
  .btn:disabled{opacity:0.45;cursor:not-allowed;}

  /* FORMS */
  .ff{margin-bottom:1rem;}
  .fl{display:block;font-size:0.7rem;color:var(--text2);text-transform:uppercase;letter-spacing:0.1em;margin-bottom:6px;}
  .fi{width:100%;padding:11px 13px;background:var(--bg2);border:1px solid var(--border2);
    border-radius:9px;color:var(--text);font-family:'Exo 2',sans-serif;font-size:0.86rem;outline:none;transition:all 0.2s;}
  .fi:focus{border-color:var(--cyan);box-shadow:0 0 0 3px rgba(0,180,216,0.1);}
  .fi::placeholder{color:var(--text3);}
  select.fi{cursor:pointer;}

  /* AUTH */
  .auth-wrap{min-height:80vh;display:flex;align-items:center;justify-content:center;padding:2rem;}
  .auth-card{background:var(--card);border:1px solid var(--border);border-radius:18px;
    padding:2.2rem;width:100%;max-width:400px;box-shadow:0 30px 80px rgba(0,0,0,0.6);}
  .auth-logo{text-align:center;margin-bottom:1.6rem;}
  .auth-icon{width:58px;height:58px;background:linear-gradient(135deg,var(--cyan),var(--blue));
    border-radius:15px;margin:0 auto 0.7rem;display:flex;align-items:center;justify-content:center;
    font-size:1.7rem;box-shadow:0 0 26px rgba(0,180,216,0.4);}
  .auth-title{font-family:'Orbitron',monospace;font-size:1rem;font-weight:700;margin-bottom:3px;}
  .auth-sub{color:var(--text2);font-size:0.76rem;}
  .auth-tabs{display:flex;gap:5px;margin-bottom:1.4rem;}
  .atab{flex:1;padding:8px;border:1px solid var(--border);background:transparent;
    color:var(--text2);font-family:'Exo 2',sans-serif;font-size:0.78rem;cursor:pointer;
    border-radius:8px;transition:all 0.2s;text-align:center;}
  .atab.active{background:rgba(0,180,216,0.1);border-color:rgba(0,180,216,0.3);color:var(--cyan);}
  .err-box{color:var(--red);font-size:0.77rem;margin-top:7px;text-align:center;
    background:rgba(255,71,87,0.08);padding:7px;border-radius:8px;border:1px solid rgba(255,71,87,0.2);}
  .ok-box{color:var(--green);font-size:0.77rem;margin-top:7px;text-align:center;
    background:rgba(0,200,150,0.08);padding:7px;border-radius:8px;border:1px solid rgba(0,200,150,0.2);}
  .sbtn{width:100%;padding:13px;background:linear-gradient(135deg,var(--cyan),var(--blue));
    border:none;border-radius:10px;color:white;font-family:'Orbitron',monospace;
    font-size:0.78rem;font-weight:700;letter-spacing:0.1em;cursor:pointer;margin-top:0.8rem;
    transition:all 0.25s;box-shadow:0 4px 18px rgba(0,180,216,0.3);}
  .sbtn:hover{transform:translateY(-2px);box-shadow:0 8px 28px rgba(0,180,216,0.45);}
  .sbtn:disabled{opacity:0.5;cursor:not-allowed;transform:none;}
  .link-txt{font-size:0.73rem;color:var(--text3);text-align:center;margin-top:9px;cursor:pointer;}
  .link-txt:hover{color:var(--cyan);}

  /* ADMIN */
  .admin-layout{display:grid;grid-template-columns:200px 1fr;min-height:calc(100vh - 60px);}
  @media(max-width:720px){.admin-layout{grid-template-columns:1fr;}.admin-sidebar{display:none;}}
  .admin-sidebar{background:var(--card);border-right:1px solid var(--border);padding:1.1rem 0.8rem;}
  .s-label{font-size:0.6rem;color:var(--text3);text-transform:uppercase;letter-spacing:0.15em;margin-bottom:6px;padding:0 7px;}
  .s-item{display:flex;align-items:center;gap:8px;padding:9px 11px;border-radius:9px;cursor:pointer;
    transition:all 0.15s;color:var(--text2);font-size:0.8rem;margin-bottom:2px;}
  .s-item:hover{background:rgba(255,255,255,0.04);color:var(--text);}
  .s-item.active{background:rgba(0,180,216,0.1);color:var(--cyan);}
  .admin-mob-tabs{display:none;}
  @media(max-width:720px){.admin-mob-tabs{display:flex;gap:5px;flex-wrap:wrap;padding:0.8rem 1.2rem 0;}}
  .amtab{padding:6px 10px;border-radius:100px;border:1px solid var(--border);background:transparent;
    color:var(--text2);font-size:0.7rem;cursor:pointer;transition:all 0.2s;}
  .amtab.active{background:rgba(0,180,216,0.1);border-color:rgba(0,180,216,0.3);color:var(--cyan);}
  .admin-content{padding:1.2rem;overflow-y:auto;}
  .a-hdr{display:flex;align-items:center;justify-content:space-between;margin-bottom:1.2rem;flex-wrap:wrap;gap:8px;}
  .a-title{font-family:'Orbitron',monospace;font-size:0.92rem;font-weight:700;}

  /* UPLOAD BOX */
  .upload-box{border:2px dashed var(--border2);border-radius:12px;padding:2rem;text-align:center;
    cursor:pointer;transition:all 0.2s;background:var(--bg2);}
  .upload-box:hover,.upload-box.drag{border-color:var(--cyan);background:rgba(0,180,216,0.04);}
  .upload-box input{display:none;}
  .u-icon{font-size:2.2rem;margin-bottom:0.5rem;}
  .u-title{font-weight:600;font-size:0.88rem;margin-bottom:3px;}
  .u-sub{font-size:0.73rem;color:var(--text2);}

  /* UPLOAD ROW */
  .upload-row{display:flex;align-items:center;gap:8px;padding:9px 12px;
    background:var(--bg2);border:1px solid var(--border);border-radius:9px;margin-bottom:6px;flex-wrap:wrap;}
  .upload-name{flex:1;font-size:0.78rem;font-family:'Orbitron',monospace;color:var(--cyan);word-break:break-all;}
  .upload-info{font-size:0.68rem;color:var(--text2);}
  .prog-bar{height:3px;background:var(--border2);border-radius:2px;margin-top:3px;width:100%;}
  .prog-fill{height:100%;background:linear-gradient(90deg,var(--cyan),var(--blue));border-radius:2px;}

  /* TABLE */
  .tw{overflow-x:auto;}
  .tbl{width:100%;border-collapse:collapse;}
  .tbl thead tr{border-bottom:2px solid var(--border);}
  .tbl th{padding:8px 10px;text-align:left;font-size:0.64rem;color:var(--text2);text-transform:uppercase;letter-spacing:0.1em;font-weight:600;}
  .tbl td{padding:9px 10px;font-size:0.79rem;border-bottom:1px solid rgba(255,255,255,0.04);vertical-align:middle;}
  .tbl tbody tr:hover{background:rgba(255,255,255,0.02);}

  /* USER CARD */
  .user-grid{display:grid;gap:0.8rem;grid-template-columns:repeat(auto-fill,minmax(250px,1fr));}
  .user-card{background:var(--card);border:1px solid var(--border);border-radius:12px;padding:1rem;}
  .user-avatar{width:40px;height:40px;background:linear-gradient(135deg,var(--cyan),var(--blue));
    border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:1.1rem;
    margin-bottom:0.7rem;}
  .user-name{font-weight:600;font-size:0.88rem;margin-bottom:2px;}
  .user-email{font-size:0.74rem;color:var(--cyan);margin-bottom:6px;}
  .user-meta{font-size:0.7rem;color:var(--text2);}

  /* MISC */
  .notif{position:fixed;bottom:1.5rem;right:1.5rem;z-index:300;padding:10px 16px;border-radius:11px;
    display:flex;align-items:center;gap:8px;font-size:0.82rem;font-weight:500;
    box-shadow:0 8px 28px rgba(0,0,0,0.5);animation:si 0.3s ease;max-width:90vw;}
  .notif-success{background:rgba(0,200,150,0.15);border:1px solid rgba(0,200,150,0.3);color:var(--green);}
  .notif-info{background:rgba(0,180,216,0.15);border:1px solid rgba(0,180,216,0.3);color:var(--cyan);}
  .notif-error{background:rgba(255,71,87,0.15);border:1px solid rgba(255,71,87,0.3);color:var(--red);}
  @keyframes si{from{transform:translateY(20px);opacity:0;}to{transform:translateY(0);opacity:1;}}
  .empty{text-align:center;padding:2.5rem 1.5rem;color:var(--text2);}
  .empty-icon{font-size:2.5rem;margin-bottom:0.7rem;opacity:0.4;}
  .empty-t{font-family:'Orbitron',monospace;font-size:0.88rem;margin-bottom:0.4rem;color:var(--text);}
  .empty-d{font-size:0.78rem;}
  .loading{display:flex;align-items:center;justify-content:center;padding:3rem;gap:10px;color:var(--text2);}
  .spin{width:22px;height:22px;border:2px solid var(--border2);border-top-color:var(--cyan);border-radius:50%;animation:sp 0.8s linear infinite;}
  @keyframes sp{to{transform:rotate(360deg);}}
  .user-chip{display:flex;align-items:center;gap:6px;font-size:0.72rem;color:var(--text2);
    background:var(--card);border:1px solid var(--border);border-radius:100px;padding:4px 10px;cursor:pointer;}
  .user-chip:hover{border-color:var(--red);color:var(--red);}
  .info-box{background:rgba(0,180,216,0.05);border:1px solid rgba(0,180,216,0.15);border-radius:10px;padding:10px 13px;font-size:0.78rem;color:var(--text2);margin-bottom:1rem;}
  .warn-box{background:rgba(240,165,0,0.06);border:1px solid rgba(240,165,0,0.18);border-radius:10px;padding:10px 13px;font-size:0.78rem;color:var(--gold);margin-bottom:1rem;}
  ::-webkit-scrollbar{width:5px;}
  ::-webkit-scrollbar-track{background:var(--bg);}
  ::-webkit-scrollbar-thumb{background:var(--border2);border-radius:3px;}
`;

// ─── HELPERS ──────────────────────────────────────────────────────────────────
function Notif({msg,type,onClose}){
  useEffect(()=>{const t=setTimeout(onClose,3500);return()=>clearTimeout(t);},[]);
  return<div className={`notif notif-${type}`}>{type==="success"?"✅":type==="error"?"❌":"ℹ️"} {msg}</div>;
}

function smartMatch(file,query){
  if(!query.trim())return true;
  const q=query.toLowerCase().trim();
  return[file.fileName,file.portName,file.keywords,file.brand,file.type,file.region,file.description]
    .filter(Boolean).map(s=>s.toLowerCase()).some(t=>t.includes(q));
}

// ─── HOME ─────────────────────────────────────────────────────────────────────
function HomePage({routes,charts,onSearchRoutes,setTab,user}){
  const [q,setQ]=useState("");
  const [sugg,setSugg]=useState([]);
  const [showSugg,setShowSugg]=useState(false);
  const wRef=useRef();

  useEffect(()=>{
    const h=e=>{if(!wRef.current?.contains(e.target))setShowSugg(false);};
    document.addEventListener("mousedown",h);return()=>document.removeEventListener("mousedown",h);
  },[]);

  useEffect(()=>{
    if(!q.trim()){setSugg([]);return;}
    const qL=q.toLowerCase();
    const hits=new Set();
    [...routes,...charts].forEach(f=>{
      [f.fileName,f.portName,f.keywords,f.brand,f.type].filter(Boolean).forEach(s=>{
        if(s.toLowerCase().includes(qL))hits.add(s);
      });
    });
    setSugg([...hits].slice(0,7));
  },[q,routes,charts]);

  const doSearch=(val)=>{const v=val||q;if(v.trim()){onSearchRoutes(v);setShowSugg(false);}};

  return(
    <div>
      {/* TOP AD */}
      <div className="ad-slot ad-slot-lg">
        <div>📢 Advertisement — 728×90 Leaderboard</div>
        <div style={{fontSize:"0.65rem",marginTop:2}}>Contact admin to display your ad here</div>
      </div>

      <div className="hero">
        <div className="hero-tag">🧭 ECDIS Navigation System v5.0</div>
        <h1 className="hero-title">ECDIS <span className="accent">Route</span> Finder</h1>
        <p className="hero-desc">
          Search and download ECDIS route files (.rtz) and user chart files for all major ECDIS brands.
          {user&&<span style={{color:"var(--cyan)"}}> Welcome, {user.email.split("@")[0]}!</span>}
        </p>

        <div className="search-wrap">
          <div className="search-box">
            <div className="search-row" ref={wRef} style={{position:"relative"}}>
              <div className="si-wrap">
                <span className="si-icon">🔍</span>
                <input className="si" placeholder="Search route or port name… e.g. Mumbai, MUM, Singapore"
                  value={q} onChange={e=>{setQ(e.target.value);setShowSugg(true);}}
                  onFocus={()=>setShowSugg(true)} onKeyDown={e=>e.key==="Enter"&&doSearch()}/>
                {showSugg&&sugg.length>0&&(
                  <div className="ac">
                    {sugg.map((s,i)=>(
                      <div key={i} className="ac-item" onClick={()=>{setQ(s);doSearch(s);}}>
                        <span>🔎</span><span>{s}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
              <button className="sbtn2" onClick={()=>doSearch()}>🔍 SEARCH</button>
            </div>
            <div className="s-hint">Try: <span>Mumbai</span> · <span>MUM</span> · <span>Singapore</span> · <span>mumbaitosingapore</span></div>
          </div>
        </div>

        {/* QUICK NAV */}
        <div style={{display:"flex",gap:"0.8rem",justifyContent:"center",marginTop:"1.5rem",flexWrap:"wrap"}}>
          <button className="btn btn-gold" onClick={()=>setTab("routes")}>🗺 Browse All RTZ Routes</button>
          <button className="btn btn-primary" onClick={()=>setTab("charts")}>📊 Browse by ECDIS Brand</button>
          {!user&&<button className="btn btn-secondary" onClick={()=>setTab("login")}>🔐 Login to Download</button>}
        </div>

        <div className="stats">
          <div><div className="stat-n">{routes.length}</div><div className="stat-l">RTZ Routes</div></div>
          <div><div className="stat-n">{charts.length}</div><div className="stat-l">Chart Files</div></div>
          <div><div className="stat-n">{ECDIS_BRANDS.length}</div><div className="stat-l">ECDIS Brands</div></div>
          <div><div className="stat-n">24/7</div><div className="stat-l">Online</div></div>
        </div>
      </div>

      {/* BOTTOM AD */}
      <div className="ad-slot ad-slot-sm">📢 Advertisement — 320×50 Mobile Banner</div>
    </div>
  );
}

// ─── ROUTES PAGE ──────────────────────────────────────────────────────────────
function RoutesPage({routes,searchQuery,notify,user,setTab}){
  const [q,setQ]=useState(searchQuery||"");
  const [typeF,setTypeF]=useState("all");
  useEffect(()=>{if(searchQuery)setQ(searchQuery);},[searchQuery]);

  const filtered=routes.filter(r=>{
    const tOk=typeF==="all"||r.type?.toLowerCase()===typeF;
    return smartMatch(r,q)&&tOk;
  });

  const handleDL=(r)=>{
    if(!user){notify("🔐 Please login to download files","error");setTab("login");return;}
    if(r.fileUrl){window.open(r.fileUrl,"_blank");notify(`Downloading ${r.fileName}`,"success");}
    else notify("File not uploaded yet. Contact admin.","error");
  };

  return(
    <div className="section">
      {/* AD */}
      <div className="ad-slot ad-slot-sm" style={{margin:"0 0 1rem"}}>📢 Advertisement</div>

      <div className="sec-hdr">
        <div className="sec-title">🗺 RTZ Route Files</div>
        <span className="badge">{filtered.length} files</span>
      </div>

      {!user&&(
        <div className="warn-box">
          🔐 <strong>Login required to download.</strong>{" "}
          <span style={{cursor:"pointer",textDecoration:"underline"}} onClick={()=>setTab("login")}>Create free account →</span>
        </div>
      )}

      <div style={{display:"flex",gap:8,marginBottom:"0.9rem",flexWrap:"wrap"}}>
        <div className="si-wrap" style={{flex:1,minWidth:200}}>
          <span className="si-icon">🔍</span>
          <input className="si" style={{paddingLeft:40}} placeholder="Search route, port, file name…" value={q} onChange={e=>setQ(e.target.value)}/>
        </div>
      </div>

      <div className="fbar">
        {["all",...ROUTE_TYPES].map(t=>(
          <button key={t} className={`fbtn ${typeF===(t==="all"?"all":t.toLowerCase())?"active":""}`}
            onClick={()=>setTypeF(t==="all"?"all":t.toLowerCase())}>
            {t==="all"?"🌐 All":t}
          </button>
        ))}
      </div>

      {filtered.length===0
        ?<div className="empty"><div className="empty-icon">🧭</div><div className="empty-t">No Routes Found</div><div className="empty-d">Try "Mumbai", "MUM", or "mumbaitosingapore.rtz"</div></div>
        :<div className="files-grid">
          {filtered.map(r=>(
            <div key={r.id} className="file-card">
              <div className="file-icon">🗺</div>
              <div className="file-name">{r.fileName}</div>
              {r.portName&&<div className="file-port">📍 {r.portName}</div>}
              <div className="file-tags">
                <span className="ftag tag-rtz">RTZ File</span>
                {r.type&&<span className="ftag tag-type">{r.type}</span>}
              </div>
              {user
                ?<button className="dl-btn" onClick={()=>handleDL(r)} disabled={!r.fileUrl}>
                    {r.fileUrl?"⬇ Download RTZ File":"❌ Not Available Yet"}
                  </button>
                :<button className="login-req" onClick={()=>setTab("login")}>🔐 Login to Download</button>
              }
            </div>
          ))}
        </div>
      }

      <div className="ad-slot ad-slot-sm" style={{margin:"1.2rem 0 0"}}>📢 Advertisement</div>
    </div>
  );
}

// ─── CHARTS PAGE — ECDIS MODEL FIRST ─────────────────────────────────────────
function ChartsPage({charts,notify,user,setTab}){
  const [selectedBrand,setSelectedBrand]=useState(null);
  const [q,setQ]=useState("");

  // Count charts per brand
  const brandCount=(brandId)=>charts.filter(c=>c.brand?.toLowerCase()===brandId).length;

  const filtered=selectedBrand
    ? charts.filter(c=>c.brand?.toLowerCase()===selectedBrand&&smartMatch(c,q))
    : [];

  const handleDL=(c)=>{
    if(!user){notify("🔐 Please login to download files","error");setTab("login");return;}
    if(c.fileUrl){window.open(c.fileUrl,"_blank");notify(`Downloading ${c.fileName}`,"success");}
    else notify("File not uploaded yet. Contact admin.","error");
  };

  const selBrand=ECDIS_BRANDS.find(b=>b.id===selectedBrand);

  return(
    <div className="section">
      {/* AD */}
      <div className="ad-slot ad-slot-sm" style={{margin:"0 0 1rem"}}>📢 Advertisement</div>

      {!selectedBrand?(
        <>
          <div className="sec-hdr">
            <div className="sec-title">📊 User Chart Files</div>
            <span className="badge badge-gold">{ECDIS_BRANDS.length} ECDIS Brands</span>
          </div>

          <div className="info-box">
            <strong style={{color:"var(--cyan)"}}>Step 1:</strong> Select your ECDIS brand below →{" "}
            <strong style={{color:"var(--cyan)"}}>Step 2:</strong> Search by port name or keyword →{" "}
            <strong style={{color:"var(--cyan)"}}>Step 3:</strong> Download your chart file
          </div>

          {!user&&(
            <div className="warn-box">
              🔐 <strong>Login required to download.</strong>{" "}
              <span style={{cursor:"pointer",textDecoration:"underline"}} onClick={()=>setTab("login")}>Create free account →</span>
            </div>
          )}

          <div className="brand-grid">
            {ECDIS_BRANDS.map(b=>{
              const count=brandCount(b.id);
              return(
                <div key={b.id} className="brand-card"
                  style={{borderColor:count>0?b.color+"66":"var(--border)",opacity:1}}
                  onClick={()=>setSelectedBrand(b.id)}>
                  <div className="brand-emoji">{b.emoji}</div>
                  <div className="brand-name" style={{color:count>0?b.color:"var(--text2)"}}>{b.name}</div>
                  <div className="brand-models">{b.models}</div>
                  <div className="brand-count" style={{color:count>0?"var(--green)":"var(--text3)"}}>
                    {count>0?`${count} chart${count>1?"s":""}  ✅`:"No charts yet"}
                  </div>
                </div>
              );
            })}
          </div>
        </>
      ):(
        <>
          {/* BRAND SELECTED — SHOW SEARCH + FILES */}
          <div style={{display:"flex",alignItems:"center",gap:12,marginBottom:"1.2rem",flexWrap:"wrap"}}>
            <button className="btn btn-secondary" onClick={()=>{setSelectedBrand(null);setQ("");}}>← Back to Brands</button>
            <div style={{display:"flex",alignItems:"center",gap:10}}>
              <span style={{fontSize:"1.6rem"}}>{selBrand?.emoji}</span>
              <div>
                <div style={{fontFamily:"Orbitron,monospace",fontSize:"0.9rem",fontWeight:700,color:selBrand?.color}}>{selBrand?.name}</div>
                <div style={{fontSize:"0.7rem",color:"var(--text2)"}}>{selBrand?.models}</div>
              </div>
              <span className="badge badge-gold">{brandCount(selectedBrand)} chart files</span>
            </div>
          </div>

          {!user&&(
            <div className="warn-box">
              🔐 <strong>Login required to download.</strong>{" "}
              <span style={{cursor:"pointer",textDecoration:"underline"}} onClick={()=>setTab("login")}>Login / Register →</span>
            </div>
          )}

          {/* SEARCH BAR FOR THIS BRAND */}
          <div style={{display:"flex",gap:8,marginBottom:"1rem"}}>
            <div className="si-wrap" style={{flex:1}}>
              <span className="si-icon">🔍</span>
              <input className="si" style={{paddingLeft:40}}
                placeholder={`Search port name or keyword for ${selBrand?.name}…`}
                value={q} onChange={e=>setQ(e.target.value)} autoFocus/>
            </div>
            {q&&<button className="btn btn-secondary" onClick={()=>setQ("")}>Clear</button>}
          </div>

          {filtered.length===0
            ?(
              <div className="empty">
                <div className="empty-icon">{selBrand?.emoji}</div>
                <div className="empty-t">{brandCount(selectedBrand)===0?"No Charts Uploaded Yet":"No Results"}</div>
                <div className="empty-d">
                  {brandCount(selectedBrand)===0
                    ?"Admin hasn't uploaded charts for this ECDIS brand yet."
                    :"Try a different port name or keyword."}
                </div>
              </div>
            ):(
              <div className="files-grid">
                {filtered.map(c=>(
                  <div key={c.id} className="file-card">
                    <div className="file-icon">📊</div>
                    <div className="file-name">{c.fileName}</div>
                    {c.portName&&<div className="file-port">⚓ {c.portName}</div>}
                    <div className="file-tags">
                      <span className="ftag tag-chart">Chart File</span>
                      <span className="ftag tag-brand">{c.brand}</span>
                      {c.region&&<span className="ftag tag-type">{c.region}</span>}
                    </div>
                    {user
                      ?<button className="dl-btn" onClick={()=>handleDL(c)} disabled={!c.fileUrl}>
                          {c.fileUrl?"⬇ Download Chart File":"❌ Not Uploaded Yet"}
                        </button>
                      :<button className="login-req" onClick={()=>setTab("login")}>🔐 Login to Download</button>
                    }
                  </div>
                ))}
              </div>
            )
          }
        </>
      )}

      <div className="ad-slot ad-slot-sm" style={{margin:"1.2rem 0 0"}}>📢 Advertisement</div>
    </div>
  );
}

// ─── LOGIN PAGE ───────────────────────────────────────────────────────────────
function LoginPage({notify,onLogin}){
  const [mode,setMode]=useState("login");
  const [email,setEmail]=useState("");const [pass,setPass]=useState("");const [name,setName]=useState("");
  const [loading,setLoading]=useState(false);const [err,setErr]=useState("");const [ok,setOk]=useState("");

  const doLogin=async()=>{
    setLoading(true);setErr("");
    try{const c=await signInWithEmailAndPassword(auth,email,pass);notify("Welcome back! 👋","success");onLogin(c.user);}
    catch{setErr("Invalid email or password.");}
    setLoading(false);
  };

  const doSignup=async()=>{
    if(!email||!pass){setErr("Fill all fields.");return;}
    if(pass.length<6){setErr("Password must be 6+ characters.");return;}
    setLoading(true);setErr("");
    try{
      const c=await createUserWithEmailAndPassword(auth,email,pass);
      await setDoc(doc(db,"users",c.user.uid),{
        email,name:name||email.split("@")[0],
        createdAt:serverTimestamp(),role:"user",downloads:0
      });
      notify("Account created! Welcome aboard 🎉","success");
      onLogin(c.user);
    }catch(e){
      setErr(e.code==="auth/email-already-in-use"?"Email already registered. Please login.":"Error: "+e.message);
    }
    setLoading(false);
  };

  const doReset=async()=>{
    if(!email){setErr("Enter your email.");return;}
    setLoading(true);setErr("");
    try{await sendPasswordResetEmail(auth,email);setOk("Reset email sent! Check your inbox.");}
    catch{setErr("Email not found.");}
    setLoading(false);
  };

  return(
    <div className="auth-wrap">
      <div className="auth-card">
        <div className="auth-logo">
          <div className="auth-icon">🧭</div>
          <div className="auth-title">ECDIS Route Finder</div>
          <div className="auth-sub">{mode==="reset"?"Reset Password":"Login to access all files"}</div>
        </div>

        {mode!=="reset"&&(
          <div className="auth-tabs">
            <button className={`atab ${mode==="login"?"active":""}`} onClick={()=>{setMode("login");setErr("");setOk("");}}>Login</button>
            <button className={`atab ${mode==="signup"?"active":""}`} onClick={()=>{setMode("signup");setErr("");setOk("");}}>Create Account</button>
          </div>
        )}

        <div className="info-box" style={{fontSize:"0.74rem"}}>
          🆓 Free account · Download RTZ routes & ECDIS charts
        </div>

        {mode==="signup"&&(
          <div className="ff"><label className="fl">Your Name</label>
            <input className="fi" placeholder="Captain Ahmed" value={name} onChange={e=>setName(e.target.value)}/>
          </div>
        )}
        <div className="ff"><label className="fl">Email</label>
          <input className="fi" type="email" placeholder="officer@ship.com" value={email}
            onChange={e=>setEmail(e.target.value)} onKeyDown={e=>e.key==="Enter"&&(mode==="login"?doLogin():mode==="signup"?doSignup():doReset())}/>
        </div>
        {mode!=="reset"&&(
          <div className="ff"><label className="fl">Password</label>
            <input className="fi" type="password" placeholder="Minimum 6 characters" value={pass}
              onChange={e=>setPass(e.target.value)} onKeyDown={e=>e.key==="Enter"&&(mode==="login"?doLogin():doSignup())}/>
          </div>
        )}

        {err&&<div className="err-box">{err}</div>}
        {ok&&<div className="ok-box">{ok}</div>}

        <button className="sbtn" onClick={mode==="login"?doLogin:mode==="signup"?doSignup:doReset} disabled={loading}>
          {loading?"Please wait…":mode==="login"?"🔐 LOGIN":mode==="signup"?"✅ CREATE FREE ACCOUNT":"📧 SEND RESET EMAIL"}
        </button>
        {mode==="login"&&<div className="link-txt" onClick={()=>{setMode("reset");setErr("");setOk("");}}>Forgot password?</div>}
        {mode==="reset"&&<div className="link-txt" onClick={()=>{setMode("login");setErr("");setOk("");}}>← Back to login</div>}
      </div>
    </div>
  );
}

// ─── ADMIN PAGE ───────────────────────────────────────────────────────────────
function AdminPage({notify,routes,setRoutes,charts,setCharts}){
  const [user,setUser]=useState(null);
  const [email,setEmail]=useState("");const [pass,setPass]=useState("");
  const [err,setErr]=useState("");const [loading,setLoading]=useState(false);
  const [section,setSection]=useState("dashboard");
  const [uploading,setUploading]=useState(false);
  const [dragR,setDragR]=useState(false);const [dragC,setDragC]=useState(false);
  const [rmeta,setRmeta]=useState({portName:"",keywords:"",type:"Ocean"});
  const [cmeta,setCmeta]=useState({portName:"",brand:"furuno",region:"",keywords:""});
  const [users,setUsers]=useState([]);

  useEffect(()=>{const u=onAuthStateChanged(auth,u=>setUser(u));return()=>u();},[]);
  useEffect(()=>{if(user&&section==="users")loadUsers();},[user,section]);

  const login=async()=>{
    setLoading(true);setErr("");
    try{await signInWithEmailAndPassword(auth,email,pass);}
    catch{setErr("Invalid credentials.");}
    setLoading(false);
  };

  const loadUsers=async()=>{
    try{
      const snap=await getDocs(collection(db,"users"));
      setUsers(snap.docs.map(d=>({id:d.id,...d.data()})));
    }catch{notify("Could not load users","error");}
  };

  const uploadRTZ=async(files)=>{
    setUploading(true);
    for(const file of Array.from(files)){
      try{
        const sRef=ref(storage,`routes/${Date.now()}_${file.name}`);
        await uploadBytes(sRef,file);
        const url=await getDownloadURL(sRef);
        const data={
          fileName:file.name,fileUrl:url,
          portName:rmeta.portName||"",
          keywords:(rmeta.keywords+" "+file.name.replace(/\.(rtz|rtzp)$/i,"")).trim().toLowerCase(),
          type:rmeta.type,uploadedAt:serverTimestamp(),size:file.size,
        };
        const dr=await addDoc(collection(db,"routes"),data);
        setRoutes(r=>[...r,{id:dr.id,...data}]);
        notify(`✅ ${file.name} uploaded!`,"success");
      }catch(e){notify(`❌ ${file.name}: ${e.message}`,"error");}
    }
    setUploading(false);
  };

  const uploadChart=async(files)=>{
    const brandName=ECDIS_BRANDS.find(b=>b.id===cmeta.brand)?.name||cmeta.brand;
    setUploading(true);
    for(const file of Array.from(files)){
      try{
        const sRef=ref(storage,`charts/${cmeta.brand}/${Date.now()}_${file.name}`);
        await uploadBytes(sRef,file);
        const url=await getDownloadURL(sRef);
        const data={
          fileName:file.name,fileUrl:url,
          portName:cmeta.portName||"",
          brand:brandName,brandId:cmeta.brand,
          region:cmeta.region||"",
          keywords:(cmeta.keywords+" "+cmeta.portName+" "+brandName+" "+file.name).trim().toLowerCase(),
          uploadedAt:serverTimestamp(),size:file.size,
        };
        const dr=await addDoc(collection(db,"charts"),data);
        setCharts(c=>[...c,{id:dr.id,...data}]);
        notify(`✅ ${file.name} → ${brandName}`,"success");
      }catch(e){notify(`❌ ${file.name}: ${e.message}`,"error");}
    }
    setUploading(false);
  };

  const deleteRoute=async(id)=>{
    try{await deleteDoc(doc(db,"routes",id));setRoutes(r=>r.filter(x=>x.id!==id));notify("Deleted","success");}
    catch{notify("Delete failed","error");}
  };

  const deleteChart=async(id)=>{
    try{await deleteDoc(doc(db,"charts",id));setCharts(c=>c.filter(x=>x.id!==id));notify("Deleted","success");}
    catch{notify("Delete failed","error");}
  };

  if(!user) return(
    <div className="auth-wrap">
      <div className="auth-card">
        <div className="auth-logo">
          <div className="auth-icon" style={{background:"linear-gradient(135deg,var(--gold),var(--gold2))"}}>🛡</div>
          <div className="auth-title">Admin Portal</div>
          <div className="auth-sub">ECDIS Route Finder — Admin Access Only</div>
        </div>
        <div className="ff"><label className="fl">Admin Email</label>
          <input className="fi" type="email" placeholder="admin@example.com" value={email}
            onChange={e=>setEmail(e.target.value)} onKeyDown={e=>e.key==="Enter"&&login()}/>
        </div>
        <div className="ff"><label className="fl">Password</label>
          <input className="fi" type="password" placeholder="••••••••" value={pass}
            onChange={e=>setPass(e.target.value)} onKeyDown={e=>e.key==="Enter"&&login()}/>
        </div>
        {err&&<div className="err-box">{err}</div>}
        <button className="sbtn" style={{background:"linear-gradient(135deg,var(--gold),var(--gold2))",color:"#000"}}
          onClick={login} disabled={loading}>{loading?"Logging in…":"🛡 ADMIN LOGIN"}</button>
      </div>
    </div>
  );

  const sides=[
    {k:"dashboard",i:"📊",l:"Dashboard"},
    {k:"upload-rtz",i:"🗺",l:"Upload RTZ Routes"},
    {k:"upload-chart",i:"📊",l:"Upload Charts"},
    {k:"manage-routes",i:"📋",l:"Manage Routes"},
    {k:"manage-charts",i:"🗂",l:"Manage Charts"},
    {k:"users",i:"👥",l:"User Database"},
    {k:"ads",i:"💰",l:"Ad Management"},
  ];

  return(
    <div>
      <div className="admin-mob-tabs">
        {sides.map(s=><button key={s.k} className={`amtab ${section===s.k?"active":""}`} onClick={()=>setSection(s.k)}>{s.i} {s.l}</button>)}
        <button className="amtab" onClick={()=>signOut(auth)}>🚪 Logout</button>
      </div>
      <div className="admin-layout">
        <div className="admin-sidebar">
          <div style={{marginBottom:"1.2rem"}}>
            <div className="s-label">Navigation</div>
            {sides.map(s=><div key={s.k} className={`s-item ${section===s.k?"active":""}`} onClick={()=>setSection(s.k)}><span>{s.i}</span>{s.l}</div>)}
          </div>
          <div>
            <div className="s-label">Account</div>
            <div className="s-item" style={{fontSize:"0.7rem",color:"var(--text3)"}}><span>👤</span>{user.email}</div>
            <div className="s-item" onClick={()=>signOut(auth)}><span>🚪</span>Logout</div>
          </div>
        </div>

        <div className="admin-content">

          {/* ── DASHBOARD ── */}
          {section==="dashboard"&&(
            <>
              <div className="a-hdr"><div className="a-title">📊 Dashboard</div><span style={{fontSize:"0.72rem",color:"var(--green)"}}>🔥 Firebase Live</span></div>
              <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(145px,1fr))",gap:"0.8rem",marginBottom:"1.4rem"}}>
                {[
                  {l:"RTZ Routes",v:routes.length,i:"🗺",c:"var(--cyan)"},
                  {l:"Chart Files",v:charts.length,i:"📊",c:"var(--gold)"},
                  {l:"Files Live",v:[...routes,...charts].filter(f=>f.fileUrl).length,i:"✅",c:"var(--green)"},
                  {l:"ECDIS Brands",v:ECDIS_BRANDS.length,i:"🖥",c:"var(--text2)"},
                ].map(s=>(
                  <div key={s.l} className="file-card" style={{padding:"1rem"}}>
                    <div style={{fontSize:"1.5rem",marginBottom:4}}>{s.i}</div>
                    <div style={{fontFamily:"Orbitron,monospace",fontSize:"1.5rem",fontWeight:700,color:s.c}}>{s.v}</div>
                    <div style={{fontSize:"0.64rem",color:"var(--text2)",textTransform:"uppercase",letterSpacing:"0.08em"}}>{s.l}</div>
                  </div>
                ))}
              </div>
              <div style={{background:"var(--card)",border:"1px solid var(--border)",borderRadius:12,padding:"1rem"}}>
                <div style={{fontFamily:"Orbitron,monospace",fontSize:"0.78rem",marginBottom:"0.8rem",color:"var(--cyan)"}}>📋 Admin Quick Guide</div>
                {[
                  {i:"1",t:"Upload RTZ Routes",d:"Go to Upload RTZ Routes → select .rtz files → add port info → Upload"},
                  {i:"2",t:"Upload Charts",d:"Go to Upload Charts → select ECDIS brand → add port name → upload files"},
                  {i:"3",t:"Files go live",d:"Files appear in search instantly after upload"},
                  {i:"4",t:"User tracking",d:"All users who register appear in User Database tab"},
                  {i:"5",t:"Ad revenue",d:"Add Google AdSense or any ad code in Ad Management tab"},
                ].map(g=>(
                  <div key={g.i} style={{display:"flex",gap:10,padding:"8px 0",borderBottom:"1px solid var(--border)"}}>
                    <span style={{color:"var(--cyan)",fontFamily:"Orbitron,monospace",fontSize:"0.8rem",flexShrink:0}}>{g.i}</span>
                    <div><div style={{fontSize:"0.8rem",fontWeight:600,marginBottom:2}}>{g.t}</div><div style={{fontSize:"0.74rem",color:"var(--text2)"}}>{g.d}</div></div>
                  </div>
                ))}
              </div>
            </>
          )}

          {/* ── UPLOAD RTZ ── */}
          {section==="upload-rtz"&&(
            <>
              <div className="a-hdr"><div className="a-title">🗺 Upload RTZ Route Files</div></div>
              <div className="info-box">💡 Select your .rtz files below. Add port name so users can find them by searching. The file name itself (e.g. <strong>mumbaitosingapore.rtz</strong>) is also searchable automatically.</div>

              <div style={{background:"var(--card)",border:"1px solid var(--border)",borderRadius:12,padding:"1rem",marginBottom:"1rem"}}>
                <div style={{fontFamily:"Orbitron,monospace",fontSize:"0.76rem",color:"var(--cyan)",marginBottom:"0.8rem"}}>📝 Route Info (optional — applies to all files below)</div>
                <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
                  <div className="ff" style={{marginBottom:0}}>
                    <label className="fl">Port / Route Description</label>
                    <input className="fi" placeholder="e.g. Mumbai to Singapore" value={rmeta.portName} onChange={e=>setRmeta(m=>({...m,portName:e.target.value}))}/>
                  </div>
                  <div className="ff" style={{marginBottom:0}}>
                    <label className="fl">Extra Keywords</label>
                    <input className="fi" placeholder="mum sin india ocean" value={rmeta.keywords} onChange={e=>setRmeta(m=>({...m,keywords:e.target.value}))}/>
                  </div>
                  <div className="ff" style={{marginBottom:0,gridColumn:"1/-1"}}>
                    <label className="fl">Route Type</label>
                    <select className="fi" value={rmeta.type} onChange={e=>setRmeta(m=>({...m,type:e.target.value}))}>
                      {ROUTE_TYPES.map(t=><option key={t}>{t}</option>)}
                    </select>
                  </div>
                </div>
              </div>

              <label className={`upload-box ${dragR?"drag":""}`}
                onDragOver={e=>{e.preventDefault();setDragR(true);}}
                onDragLeave={()=>setDragR(false)}
                onDrop={e=>{e.preventDefault();setDragR(false);uploadRTZ(e.dataTransfer.files);}}>
                <input type="file" accept=".rtz,.rtzp" multiple onChange={e=>uploadRTZ(e.target.files)} disabled={uploading}/>
                <div className="u-icon">📂</div>
                <div className="u-title">{uploading?"Uploading to Firebase…":"Drop RTZ files here or tap to browse"}</div>
                <div className="u-sub">Accepts .rtz and .rtzp · Select multiple files at once</div>
                {uploading&&<div style={{marginTop:8,width:"100%"}}><div className="prog-bar"><div className="prog-fill" style={{width:"70%"}}/></div></div>}
              </label>
            </>
          )}

          {/* ── UPLOAD CHARTS — ECDIS BRAND FIRST ── */}
          {section==="upload-chart"&&(
            <>
              <div className="a-hdr"><div className="a-title">📊 Upload User Chart Files</div></div>
              <div className="info-box">💡 <strong style={{color:"var(--text)"}}>Step 1:</strong> Select the ECDIS brand. <strong style={{color:"var(--text)"}}>Step 2:</strong> Enter the port name. <strong style={{color:"var(--text)"}}>Step 3:</strong> Upload files.</div>

              <div style={{background:"var(--card)",border:"1px solid var(--border)",borderRadius:12,padding:"1rem",marginBottom:"1rem"}}>
                <div style={{fontFamily:"Orbitron,monospace",fontSize:"0.76rem",color:"var(--gold)",marginBottom:"0.8rem"}}>
                  📝 Step 1: Select ECDIS Brand & Port Info
                </div>

                {/* ECDIS BRAND SELECTOR */}
                <div className="ff">
                  <label className="fl">ECDIS Brand *</label>
                  <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(120px,1fr))",gap:6,marginBottom:10}}>
                    {ECDIS_BRANDS.map(b=>(
                      <div key={b.id}
                        onClick={()=>setCmeta(m=>({...m,brand:b.id}))}
                        style={{
                          padding:"8px 6px",borderRadius:9,cursor:"pointer",textAlign:"center",
                          border:`2px solid ${cmeta.brand===b.id?b.color:"var(--border)"}`,
                          background:cmeta.brand===b.id?b.color+"22":"transparent",
                          transition:"all 0.2s"
                        }}>
                        <div style={{fontSize:"1.3rem"}}>{b.emoji}</div>
                        <div style={{fontSize:"0.64rem",fontWeight:700,color:cmeta.brand===b.id?b.color:"var(--text2)",fontFamily:"Orbitron,monospace"}}>{b.name}</div>
                      </div>
                    ))}
                  </div>
                </div>

                <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
                  <div className="ff" style={{marginBottom:0}}>
                    <label className="fl">Port Name *</label>
                    <input className="fi" placeholder="e.g. Mumbai, Singapore" value={cmeta.portName} onChange={e=>setCmeta(m=>({...m,portName:e.target.value}))}/>
                  </div>
                  <div className="ff" style={{marginBottom:0}}>
                    <label className="fl">Region</label>
                    <input className="fi" placeholder="e.g. Arabian Sea" value={cmeta.region} onChange={e=>setCmeta(m=>({...m,region:e.target.value}))}/>
                  </div>
                  <div className="ff" style={{marginBottom:0,gridColumn:"1/-1"}}>
                    <label className="fl">Extra Keywords</label>
                    <input className="fi" placeholder="e.g. west coast india approach chart" value={cmeta.keywords} onChange={e=>setCmeta(m=>({...m,keywords:e.target.value}))}/>
                  </div>
                </div>

                {cmeta.brand&&(
                  <div style={{marginTop:10,padding:"8px 12px",background:ECDIS_BRANDS.find(b=>b.id===cmeta.brand)?.color+"22",borderRadius:8,fontSize:"0.76rem",color:"var(--text2)"}}>
                    ✅ Selected: <strong style={{color:ECDIS_BRANDS.find(b=>b.id===cmeta.brand)?.color}}>{ECDIS_BRANDS.find(b=>b.id===cmeta.brand)?.name}</strong> — Files will appear under this brand for users
                  </div>
                )}
              </div>

              <label className={`upload-box ${dragC?"drag":""}`}
                onDragOver={e=>{e.preventDefault();setDragC(true);}}
                onDragLeave={()=>setDragC(false)}
                onDrop={e=>{e.preventDefault();setDragC(false);uploadChart(e.dataTransfer.files);}}>
                <input type="file" multiple onChange={e=>uploadChart(e.target.files)} disabled={uploading||!cmeta.portName}/>
                <div className="u-icon">📊</div>
                <div className="u-title">{uploading?"Uploading…":!cmeta.portName?"Enter port name above first":"Drop chart files here or tap to browse"}</div>
                <div className="u-sub">Any chart file format · Multiple files allowed</div>
                {uploading&&<div style={{marginTop:8,width:"100%"}}><div className="prog-bar"><div className="prog-fill" style={{width:"70%"}}/></div></div>}
              </label>
            </>
          )}

          {/* ── MANAGE ROUTES ── */}
          {section==="manage-routes"&&(
            <>
              <div className="a-hdr"><div className="a-title">📋 Manage RTZ Routes</div><span className="badge">{routes.length} files</span></div>
              <div className="tw">
                <table className="tbl">
                  <thead><tr><th>File Name</th><th>Port/Route</th><th>Type</th><th>Keywords</th><th>Status</th><th>Delete</th></tr></thead>
                  <tbody>{routes.length===0
                    ?<tr><td colSpan={6} style={{textAlign:"center",color:"var(--text3)",padding:"2rem"}}>No routes uploaded yet</td></tr>
                    :routes.map(r=>(
                    <tr key={r.id}>
                      <td><span style={{fontFamily:"Orbitron,monospace",fontSize:"0.68rem",color:"var(--cyan)"}}>{r.fileName}</span></td>
                      <td style={{color:"var(--text2)",fontSize:"0.76rem"}}>{r.portName||"—"}</td>
                      <td><span style={{fontSize:"0.7rem",color:"var(--green)"}}>{r.type||"—"}</span></td>
                      <td style={{color:"var(--text3)",fontSize:"0.7rem",maxWidth:130}}>{r.keywords?.substring(0,40)||"—"}</td>
                      <td>{r.fileUrl?<span style={{color:"var(--green)",fontSize:"0.72rem"}}>✅ Live</span>:<span style={{color:"var(--red)",fontSize:"0.72rem"}}>❌ Error</span>}</td>
                      <td><button className="btn btn-danger" style={{padding:"4px 9px",fontSize:"0.7rem"}} onClick={()=>deleteRoute(r.id)}>🗑</button></td>
                    </tr>
                  ))}</tbody>
                </table>
              </div>
            </>
          )}

          {/* ── MANAGE CHARTS ── */}
          {section==="manage-charts"&&(
            <>
              <div className="a-hdr"><div className="a-title">🗂 Manage Charts</div><span className="badge badge-gold">{charts.length} files</span></div>
              {ECDIS_BRANDS.map(b=>{
                const bc=charts.filter(c=>c.brandId===b.id||c.brand===b.name);
                if(bc.length===0)return null;
                return(
                  <div key={b.id} style={{marginBottom:"1.2rem"}}>
                    <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:6}}>
                      <span style={{fontSize:"1.1rem"}}>{b.emoji}</span>
                      <span style={{fontFamily:"Orbitron,monospace",fontSize:"0.8rem",fontWeight:700,color:b.color}}>{b.name}</span>
                      <span className="badge badge-gold">{bc.length}</span>
                    </div>
                    {bc.map(c=>(
                      <div key={c.id} className="upload-row">
                        <div style={{flex:1}}>
                          <div className="upload-name">{c.fileName}</div>
                          <div className="upload-info">Port: {c.portName||"—"} · Region: {c.region||"—"}</div>
                        </div>
                        {c.fileUrl&&<a href={c.fileUrl} target="_blank" rel="noreferrer" style={{fontSize:"0.7rem",color:"var(--green)"}}>✅ Live</a>}
                        <button className="btn btn-danger" style={{padding:"4px 9px",fontSize:"0.7rem"}} onClick={()=>deleteChart(c.id)}>🗑</button>
                      </div>
                    ))}
                  </div>
                );
              })}
              {charts.length===0&&<div className="empty"><div className="empty-icon">📊</div><div className="empty-t">No charts uploaded yet</div></div>}
            </>
          )}

          {/* ── USER DATABASE ── */}
          {section==="users"&&(
            <>
              <div className="a-hdr">
                <div className="a-title">👥 User Database</div>
                <div style={{display:"flex",gap:8}}>
                  <span className="badge badge-green">{users.length} registered</span>
                  <button className="btn btn-secondary" style={{padding:"5px 10px",fontSize:"0.72rem"}} onClick={loadUsers}>🔄 Refresh</button>
                </div>
              </div>

              <div className="info-box">
                Every user who creates an account on your website appears here. You can track who is using the site, their email, and when they joined. Use this for marketing and analytics.
              </div>

              {users.length===0
                ?<div className="empty"><div className="empty-icon">👥</div><div className="empty-t">No Users Yet</div><div className="empty-d">Users will appear here when they register</div></div>
                :(
                  <>
                    <div className="user-grid" style={{marginBottom:"1.2rem"}}>
                      {users.map((u,i)=>(
                        <div key={u.id} className="user-card">
                          <div className="user-avatar">{u.name?.[0]?.toUpperCase()||"👤"}</div>
                          <div className="user-name">{u.name||"—"}</div>
                          <div className="user-email">{u.email}</div>
                          <div className="user-meta">
                            Joined: {u.createdAt?.toDate?.()?.toLocaleDateString()||"—"}<br/>
                            Role: <span style={{color:"var(--cyan)"}}>{u.role||"user"}</span>
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* USER TABLE */}
                    <div className="tw">
                      <table className="tbl">
                        <thead><tr><th>#</th><th>Name</th><th>Email</th><th>Joined</th><th>Role</th></tr></thead>
                        <tbody>{users.map((u,i)=>(
                          <tr key={u.id}>
                            <td style={{color:"var(--text3)"}}>{i+1}</td>
                            <td>{u.name||"—"}</td>
                            <td style={{color:"var(--cyan)",fontSize:"0.78rem"}}>{u.email}</td>
                            <td style={{color:"var(--text2)",fontSize:"0.72rem"}}>{u.createdAt?.toDate?.()?.toLocaleDateString()||"—"}</td>
                            <td><span className="badge">{u.role||"user"}</span></td>
                          </tr>
                        ))}</tbody>
                      </table>
                    </div>
                  </>
                )
              }
            </>
          )}

          {/* ── AD MANAGEMENT ── */}
          {section==="ads"&&(
            <>
              <div className="a-hdr"><div className="a-title">💰 Ad Management</div></div>
              <div className="info-box">
                <strong style={{color:"var(--gold)"}}>How to earn from your website:</strong><br/>
                1. Sign up at <strong>Google AdSense</strong> (adsense.google.com)<br/>
                2. Add your website URL and get approved<br/>
                3. Copy the ad code they give you<br/>
                4. Paste it in the ad slots below
              </div>

              {[
                {slot:"Top Banner (728×90)", loc:"Home page top"},
                {slot:"Middle Banner (320×50)", loc:"Home page bottom"},
                {slot:"Route Page Banner", loc:"After route results"},
                {slot:"Chart Page Banner", loc:"After chart results"},
              ].map((ad,i)=>(
                <div key={i} className="file-card" style={{marginBottom:"0.8rem"}}>
                  <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:8}}>
                    <div style={{fontFamily:"Orbitron,monospace",fontSize:"0.78rem",color:"var(--gold)"}}>{ad.slot}</div>
                    <span style={{fontSize:"0.7rem",color:"var(--text2)"}}>{ad.loc}</span>
                  </div>
                  <textarea className="fi" rows={3} placeholder={`Paste your Google AdSense code here for ${ad.slot}…`} style={{fontFamily:"monospace",fontSize:"0.72rem"}}/>
                  <div style={{marginTop:6,display:"flex",gap:6}}>
                    <button className="btn btn-gold" style={{fontSize:"0.72rem",padding:"6px 12px"}}>💾 Save Ad Code</button>
                    <div style={{fontSize:"0.7rem",color:"var(--text3)",alignSelf:"center"}}>⚠ Save not connected yet — paste code directly in App.jsx ad-slot divs</div>
                  </div>
                </div>
              ))}

              <div style={{background:"rgba(240,165,0,0.06)",border:"1px solid rgba(240,165,0,0.2)",borderRadius:12,padding:"1rem",marginTop:"1rem"}}>
                <div style={{fontFamily:"Orbitron,monospace",fontSize:"0.78rem",color:"var(--gold)",marginBottom:8}}>💡 Other Ad Networks</div>
                {["Google AdSense — Most popular, automatic","Media.net — Good for maritime content","Ezoic — Best for small sites","Direct sponsorship — Contact maritime companies"].map((a,i)=>(
                  <div key={i} style={{padding:"6px 0",borderBottom:"1px solid var(--border)",fontSize:"0.78rem",color:"var(--text2)"}}>{a}</div>
                ))}
              </div>
            </>
          )}

        </div>
      </div>
    </div>
  );
}

// ─── MAIN APP ─────────────────────────────────────────────────────────────────
export default function App(){
  const [tab,setTab]=useState("home");
  const [searchQ,setSearchQ]=useState("");
  const [notif,setNotif]=useState(null);
  const [menuOpen,setMenuOpen]=useState(false);
  const [user,setUser]=useState(null);
  const [routes,setRoutes]=useState([]);
  const [charts,setCharts]=useState([]);
  const [loading,setLoading]=useState(true);

  const notify=(msg,type="success")=>setNotif({msg,type,key:Date.now()});

  useEffect(()=>{const u=onAuthStateChanged(auth,u=>setUser(u));return()=>u();},[]);

  useEffect(()=>{
    const load=async()=>{
      try{
        const[rs,cs]=await Promise.all([getDocs(collection(db,"routes")),getDocs(collection(db,"charts"))]);
        setRoutes(rs.docs.map(d=>({id:d.id,...d.data()})));
        setCharts(cs.docs.map(d=>({id:d.id,...d.data()})));
      }catch(e){console.log("Load error",e);}
      setLoading(false);
    };
    load();
  },[]);

  const tabs=[
    {k:"home",i:"🏠",l:"Home"},
    {k:"routes",i:"🗺",l:"RTZ Routes"},
    {k:"charts",i:"📊",l:"User Charts",gold:true},
    {k:"admin",i:"🛡",l:"Admin"},
  ];

  const handleSearch=(q)=>{setSearchQ(q);setTab("routes");setMenuOpen(false);};
  const switchTab=k=>{setTab(k);setMenuOpen(false);};

  return(
    <>
      <style>{S}</style>
      <div className="grid-bg"/>
      <div className="app">
        <nav className="nav">
          <div className="nav-brand">
            <div className="nav-logo">🧭</div>
            <div>
              <div className="nav-title">ECDIS Route Finder</div>
              <div className="nav-sub">Maritime Navigation System</div>
            </div>
          </div>
          <div className="nav-tabs">
            {tabs.map(t=>(
              <button key={t.k} className={`ntab ${t.gold?"gold":""} ${tab===t.k?"active":""}`} onClick={()=>switchTab(t.k)}>
                {t.i} {t.l}
              </button>
            ))}
            {user
              ?<div className="user-chip" onClick={()=>{signOut(auth);notify("Logged out","info");}}>
                  👤 {user.email.split("@")[0]} · Logout
                </div>
              :<button className="ntab" onClick={()=>switchTab("login")}>🔐 Login</button>
            }
          </div>
          <div style={{display:"flex",alignItems:"center",gap:8}}>
            <div className="status-dot"/>
            <button className="burger" onClick={()=>setMenuOpen(o=>!o)}><span/><span/><span/></button>
          </div>
        </nav>

        <div className={`mob-menu ${menuOpen?"open":""}`}>
          {tabs.map(t=><button key={t.k} className={`mtab ${tab===t.k?"active":""}`} onClick={()=>switchTab(t.k)}>{t.i} {t.l}</button>)}
          {user
            ?<button className="mtab" onClick={()=>{signOut(auth);notify("Logged out","info");setMenuOpen(false);}}>🚪 Logout ({user.email.split("@")[0]})</button>
            :<button className="mtab" onClick={()=>switchTab("login")}>🔐 Login / Register</button>
          }
        </div>

        {loading&&<div className="loading"><div className="spin"/><span>Connecting to Firebase…</span></div>}

        {!loading&&tab==="home"&&<HomePage routes={routes} charts={charts} onSearchRoutes={handleSearch} setTab={switchTab} user={user}/>}
        {!loading&&tab==="routes"&&<RoutesPage routes={routes} searchQuery={searchQ} notify={notify} user={user} setTab={switchTab}/>}
        {!loading&&tab==="charts"&&<ChartsPage charts={charts} notify={notify} user={user} setTab={switchTab}/>}
        {!loading&&tab==="login"&&<LoginPage notify={notify} onLogin={u=>{setUser(u);setTab("home");}}/>}
        {!loading&&tab==="admin"&&<AdminPage notify={notify} routes={routes} setRoutes={setRoutes} charts={charts} setCharts={setCharts}/>}

        {notif&&<Notif key={notif.key} msg={notif.msg} type={notif.type} onClose={()=>setNotif(null)}/>}
      </div>
    </>
  );
}
