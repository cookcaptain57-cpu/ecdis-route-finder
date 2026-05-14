/* eslint-disable */
// ─── ALL CSS STYLES ───────────────────────────────────────────────────────────
export const S = `
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

  /* NAV */
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
  .sw{max-width:640px;margin:0 auto;}
  .sb{background:var(--card);border:1px solid var(--border2);border-radius:15px;
    padding:1.2rem;box-shadow:0 20px 60px rgba(0,0,0,0.4),var(--glow);}
  .sr{display:flex;gap:8px;align-items:center;}
  .siw{flex:1;position:relative;}
  .si{width:100%;padding:12px 15px 12px 42px;background:var(--bg2);border:1.5px solid var(--border2);
    border-radius:10px;color:var(--text);font-family:'Exo 2',sans-serif;font-size:0.9rem;outline:none;transition:all 0.25s;}
  .si::placeholder{color:var(--text3);}
  .si:focus{border-color:var(--cyan);box-shadow:0 0 0 3px rgba(0,180,216,0.12);}
  .si-ic{position:absolute;left:12px;top:50%;transform:translateY(-50%);font-size:1rem;color:var(--text3);pointer-events:none;}
  .sbtn{padding:12px 18px;background:linear-gradient(135deg,var(--cyan),var(--blue));border:none;
    border-radius:10px;color:white;font-family:'Orbitron',monospace;font-size:0.7rem;font-weight:700;
    letter-spacing:0.1em;cursor:pointer;transition:all 0.2s;white-space:nowrap;box-shadow:0 4px 18px rgba(0,180,216,0.3);}
  .sbtn:hover{transform:translateY(-2px);box-shadow:0 8px 28px rgba(0,180,216,0.45);}
  .sh{font-size:0.7rem;color:var(--text3);margin-top:8px;text-align:center;}
  .sh span{color:var(--cyan);}
  .ac{position:absolute;top:calc(100% + 6px);left:0;right:0;z-index:60;
    background:var(--card2);border:1px solid var(--border2);border-radius:10px;
    overflow:hidden;box-shadow:0 20px 50px rgba(0,0,0,0.65);max-height:200px;overflow-y:auto;}
  .ac-item{padding:9px 13px;cursor:pointer;display:flex;align-items:center;gap:8px;
    transition:background 0.15s;font-size:0.84rem;border-bottom:1px solid rgba(255,255,255,0.04);}
  .ac-item:hover{background:rgba(0,180,216,0.1);}

  /* STATS */
  .stats{display:flex;justify-content:center;gap:2rem;margin-top:1.8rem;flex-wrap:wrap;}
  .sn{font-family:'Orbitron',monospace;font-size:1.4rem;font-weight:700;color:var(--cyan);}
  .sl{font-size:0.63rem;color:var(--text2);letter-spacing:0.1em;text-transform:uppercase;}

  /* SECTION */
  .section{padding:1.2rem;max-width:1100px;margin:0 auto;width:100%;}
  .sec-hdr{display:flex;align-items:center;justify-content:space-between;
    margin-bottom:1.1rem;padding-bottom:0.8rem;border-bottom:1px solid var(--border);flex-wrap:wrap;gap:8px;}
  .sec-title{font-family:'Orbitron',monospace;font-size:0.9rem;font-weight:700;letter-spacing:0.08em;display:flex;align-items:center;gap:7px;}
  .badge{padding:3px 9px;border-radius:100px;background:rgba(0,180,216,0.12);border:1px solid rgba(0,180,216,0.25);color:var(--cyan);font-size:0.67rem;}
  .badge-gold{background:rgba(240,165,0,0.12);border-color:rgba(240,165,0,0.25);color:var(--gold);}
  .badge-green{background:rgba(0,200,150,0.12);border-color:rgba(0,200,150,0.25);color:var(--green);}

  /* BRAND GRID */
  .brand-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(140px,1fr));gap:0.7rem;margin-bottom:1.4rem;}
  .brand-card{background:var(--card);border:2px solid var(--border);border-radius:12px;padding:0.9rem;
    cursor:pointer;transition:all 0.2s;text-align:center;}
  .brand-card:hover,.brand-card.sel{transform:translateY(-3px);box-shadow:0 8px 25px rgba(0,0,0,0.4);}
  .brand-emoji{font-size:1.8rem;margin-bottom:5px;}
  .brand-name{font-family:'Orbitron',monospace;font-size:0.66rem;font-weight:700;margin-bottom:2px;}
  .brand-models{font-size:0.6rem;color:var(--text2);}
  .brand-count{font-size:0.65rem;margin-top:4px;font-weight:600;}

  /* FILE CARDS */
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
  .tag-brand{background:rgba(124,58,237,0.12);color:#A78BFA;border:1px solid rgba(124,58,237,0.2);}
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
  .fbtn{padding:5px 11px;border-radius:100px;border:1px solid var(--border);background:transparent;
    color:var(--text2);font-family:'Exo 2',sans-serif;font-size:0.7rem;cursor:pointer;transition:all 0.2s;text-transform:uppercase;}
  .fbtn:hover{border-color:var(--cyan);color:var(--cyan);}
  .fbtn.active{background:rgba(0,180,216,0.12);border-color:rgba(0,180,216,0.4);color:var(--cyan);}
  .fbtn.gold:hover{border-color:var(--gold);color:var(--gold);}
  .fbtn.gold.active{background:rgba(240,165,0,0.12);border-color:rgba(240,165,0,0.4);color:var(--gold);}

  /* BUTTONS */
  .btn{padding:8px 13px;border-radius:9px;font-family:'Exo 2',sans-serif;font-size:0.76rem;
    font-weight:600;cursor:pointer;transition:all 0.2s;border:none;display:inline-flex;align-items:center;gap:5px;}
  .btn-primary{background:linear-gradient(135deg,var(--cyan),var(--blue));color:white;}
  .btn-primary:hover{transform:translateY(-1px);box-shadow:0 4px 18px rgba(0,180,216,0.4);}
  .btn-danger{background:var(--red);color:white;}
  .btn-danger:hover{opacity:0.85;}
  .btn-secondary{background:transparent;border:1px solid var(--border2);color:var(--text2);}
  .btn-secondary:hover{border-color:var(--cyan);color:var(--cyan);}
  .btn-gold{background:linear-gradient(135deg,var(--gold),var(--gold2));color:#000;font-weight:700;}
  .btn-green{background:linear-gradient(135deg,var(--green),#00a87a);color:#000;font-weight:700;}
  .btn:disabled{opacity:0.45;cursor:not-allowed;}

  /* FORMS */
  .ff{margin-bottom:1rem;}
  .fl{display:block;font-size:0.7rem;color:var(--text2);text-transform:uppercase;letter-spacing:0.1em;margin-bottom:6px;}
  .fi{width:100%;padding:10px 13px;background:var(--bg2);border:1px solid var(--border2);
    border-radius:9px;color:var(--text);font-family:'Exo 2',sans-serif;font-size:0.86rem;outline:none;transition:all 0.2s;}
  .fi:focus{border-color:var(--cyan);box-shadow:0 0 0 3px rgba(0,180,216,0.1);}
  .fi::placeholder{color:var(--text3);}
  select.fi{cursor:pointer;}
  textarea.fi{resize:vertical;min-height:70px;}

  /* ROUTE PLANNER */
  .planner-layout{display:flex;gap:0;flex:1;min-height:0;}
  .planner-sidebar{width:320px;flex-shrink:0;background:var(--card);border-right:1px solid var(--border);
    display:flex;flex-direction:column;overflow-y:auto;}
  @media(max-width:800px){.planner-layout{flex-direction:column;}.planner-sidebar{width:100%;max-height:50vh;}}
  .planner-map{flex:1;min-height:400px;position:relative;}
  .p-tabs{display:flex;border-bottom:1px solid var(--border);}
  .p-tab{flex:1;padding:10px 6px;border:none;background:transparent;color:var(--text2);
    font-family:'Exo 2',sans-serif;font-size:0.72rem;cursor:pointer;transition:all 0.2s;text-align:center;
    text-transform:uppercase;letter-spacing:0.06em;}
  .p-tab:hover{color:var(--text);}
  .p-tab.active{color:var(--cyan);border-bottom:2px solid var(--cyan);}
  .p-panel{padding:1rem;flex:1;}
  .p-section{margin-bottom:1.2rem;}
  .p-label{font-size:0.65rem;color:var(--text2);text-transform:uppercase;letter-spacing:0.1em;margin-bottom:6px;display:block;}
  .overlay-grid{display:grid;grid-template-columns:1fr 1fr;gap:5px;margin-bottom:0.8rem;}
  .ov-btn{padding:6px 8px;border-radius:8px;border:1px solid var(--border);background:transparent;
    color:var(--text2);font-size:0.68rem;cursor:pointer;transition:all 0.2s;text-align:center;}
  .ov-btn.active{border-color:currentColor;}
  .map-legend{position:absolute;bottom:10px;right:10px;background:rgba(4,12,26,0.9);
    border:1px solid var(--border);border-radius:10px;padding:8px 10px;z-index:400;font-size:0.68rem;}
  .leg-item{display:flex;align-items:center;gap:6px;margin-bottom:3px;}
  .leg-dot{width:10px;height:10px;border-radius:2px;flex-shrink:0;}
  .map-controls{position:absolute;top:10px;right:10px;z-index:400;display:flex;flex-direction:column;gap:5px;}
  .map-ctrl-btn{padding:6px 10px;background:rgba(4,12,26,0.9);border:1px solid var(--border);
    border-radius:8px;color:var(--text);font-size:0.72rem;cursor:pointer;transition:all 0.2s;white-space:nowrap;}
  .map-ctrl-btn:hover{border-color:var(--cyan);color:var(--cyan);}
  .map-ctrl-btn.playing{border-color:var(--green);color:var(--green);}
  .wp-table{width:100%;border-collapse:collapse;font-size:0.72rem;}
  .wp-table th{padding:5px 7px;text-align:left;color:var(--text3);font-size:0.62rem;text-transform:uppercase;border-bottom:1px solid var(--border);}
  .wp-table td{padding:5px 7px;border-bottom:1px solid rgba(255,255,255,0.04);}
  .wp-table tbody tr:hover{background:rgba(255,255,255,0.03);}

  /* ETA CALC */
  .eta-result{background:var(--bg2);border:1px solid var(--border);border-radius:10px;padding:12px;margin-top:10px;}
  .eta-row{display:flex;justify-content:space-between;align-items:center;padding:5px 0;border-bottom:1px solid rgba(255,255,255,0.05);font-size:0.8rem;}
  .eta-row:last-child{border-bottom:none;}
  .eta-key{color:var(--text2);font-size:0.74rem;}
  .eta-val{font-family:'Orbitron',monospace;font-size:0.78rem;color:var(--cyan);}
  .eta-val.gold{color:var(--gold);}
  .eta-val.green{color:var(--green);}
  .eta-mode-tabs{display:flex;gap:4px;margin-bottom:1rem;}
  .emt{flex:1;padding:7px 4px;border-radius:8px;border:1px solid var(--border);background:transparent;
    color:var(--text2);font-size:0.65rem;cursor:pointer;transition:all 0.2s;text-align:center;text-transform:uppercase;}
  .emt.active{background:rgba(0,180,216,0.1);border-color:rgba(0,180,216,0.3);color:var(--cyan);}

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
  .submit-btn{width:100%;padding:13px;background:linear-gradient(135deg,var(--cyan),var(--blue));
    border:none;border-radius:10px;color:white;font-family:'Orbitron',monospace;
    font-size:0.78rem;font-weight:700;letter-spacing:0.1em;cursor:pointer;margin-top:0.8rem;
    transition:all 0.25s;box-shadow:0 4px 18px rgba(0,180,216,0.3);}
  .submit-btn:hover{transform:translateY(-2px);}
  .submit-btn:disabled{opacity:0.5;cursor:not-allowed;transform:none;}
  .link-txt{font-size:0.72rem;color:var(--text3);text-align:center;margin-top:9px;cursor:pointer;}
  .link-txt:hover{color:var(--cyan);}

  /* ADMIN */
  .adm-layout{display:grid;grid-template-columns:195px 1fr;min-height:calc(100vh - 60px);}
  @media(max-width:720px){.adm-layout{grid-template-columns:1fr;}.adm-sidebar{display:none;}}
  .adm-sidebar{background:var(--card);border-right:1px solid var(--border);padding:1.1rem 0.8rem;}
  .s-label{font-size:0.6rem;color:var(--text3);text-transform:uppercase;letter-spacing:0.15em;margin-bottom:6px;padding:0 7px;}
  .s-item{display:flex;align-items:center;gap:8px;padding:9px 11px;border-radius:9px;cursor:pointer;
    transition:all 0.15s;color:var(--text2);font-size:0.8rem;margin-bottom:2px;}
  .s-item:hover{background:rgba(255,255,255,0.04);color:var(--text);}
  .s-item.active{background:rgba(0,180,216,0.1);color:var(--cyan);}
  .adm-mob-tabs{display:none;}
  @media(max-width:720px){.adm-mob-tabs{display:flex;gap:5px;flex-wrap:wrap;padding:0.8rem 1.2rem 0;}}
  .amtab{padding:6px 10px;border-radius:100px;border:1px solid var(--border);background:transparent;
    color:var(--text2);font-size:0.7rem;cursor:pointer;transition:all 0.2s;}
  .amtab.active{background:rgba(0,180,216,0.1);border-color:rgba(0,180,216,0.3);color:var(--cyan);}
  .adm-content{padding:1.2rem;overflow-y:auto;}
  .a-hdr{display:flex;align-items:center;justify-content:space-between;margin-bottom:1.2rem;flex-wrap:wrap;gap:8px;}
  .a-title{font-family:'Orbitron',monospace;font-size:0.9rem;font-weight:700;}
  .tw{overflow-x:auto;}
  .tbl{width:100%;border-collapse:collapse;}
  .tbl thead tr{border-bottom:2px solid var(--border);}
  .tbl th{padding:7px 10px;text-align:left;font-size:0.63rem;color:var(--text2);text-transform:uppercase;letter-spacing:0.1em;font-weight:600;}
  .tbl td{padding:9px 10px;font-size:0.79rem;border-bottom:1px solid rgba(255,255,255,0.04);vertical-align:middle;}
  .tbl tbody tr:hover{background:rgba(255,255,255,0.02);}
  .info-box{background:rgba(0,180,216,0.05);border:1px solid rgba(0,180,216,0.15);border-radius:10px;padding:10px 13px;font-size:0.77rem;color:var(--text2);margin-bottom:1rem;}
  .warn-box{background:rgba(240,165,0,0.06);border:1px solid rgba(240,165,0,0.18);border-radius:10px;padding:10px 13px;font-size:0.77rem;color:var(--gold);margin-bottom:1rem;}

  /* MISC */
  .notif{position:fixed;bottom:1.5rem;right:1.5rem;z-index:1000;padding:10px 16px;border-radius:11px;
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
  .loading{display:flex;align-items:center;justify-content:center;padding:3rem;gap:10px;color:var(--text2);font-size:0.88rem;}
  .spin{width:22px;height:22px;border:2px solid var(--border2);border-top-color:var(--cyan);border-radius:50%;animation:sp 0.8s linear infinite;}
  @keyframes sp{to{transform:rotate(360deg);}}
  .uc{display:flex;align-items:center;gap:6px;font-size:0.71rem;color:var(--text2);
    background:var(--card);border:1px solid var(--border);border-radius:100px;padding:4px 10px;cursor:pointer;}
  .uc:hover{border-color:var(--red);color:var(--red);}

  /* FOOTER */
  .footer{background:var(--card);border-top:1px solid var(--border);padding:1.2rem 1.5rem;
    display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:10px;flex-shrink:0;}
  .footer-brand{font-family:'Orbitron',monospace;font-size:0.72rem;color:var(--text2);}
  .footer-brand span{color:var(--cyan);}
  .ig-btn{display:flex;align-items:center;gap:8px;padding:7px 14px;
    background:linear-gradient(135deg,#833ab4,#fd1d1d,#fcb045);
    border:none;border-radius:100px;color:white;font-family:'Exo 2',sans-serif;
    font-size:0.78rem;font-weight:600;cursor:pointer;transition:all 0.2s;text-decoration:none;}
  .ig-btn:hover{transform:scale(1.04);box-shadow:0 4px 15px rgba(253,29,29,0.4);}
  .footer-copy{font-size:0.66rem;color:var(--text3);}

  ::-webkit-scrollbar{width:5px;}
  ::-webkit-scrollbar-track{background:var(--bg);}
  ::-webkit-scrollbar-thumb{background:var(--border2);border-radius:3px;}
  .leaflet-container{background:#040C1A !important;}
  .leaflet-popup-content-wrapper{background:#0B1D35;border:1px solid #1A3A5C;color:#E2EBF8;border-radius:10px;}
  .leaflet-popup-tip{background:#0B1D35;}
`;
