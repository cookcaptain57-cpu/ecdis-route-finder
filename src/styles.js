/* eslint-disable */

// ─── ALL CSS STYLES (ECDIS PRO UI) ───────────────────────────────────────────
export const S = `
  @import url('https://fonts.googleapis.com/css2?family=Orbitron:wght@400;600;700;900&family=Exo+2:wght@300;400;500;600&display=swap');

  *,*::before,*::after{
    box-sizing:border-box;
    margin:0;
    padding:0;
  }

  :root{
    --bg:#040C1A;
    --bg2:#071428;
    --card:#0B1D35;
    --card2:#0F2444;
    --border:#1A3A5C;
    --border2:#1E4570;
    --blue:#1565C0;
    --cyan:#00B4D8;
    --gold:#F0A500;
    --gold2:#D4900A;
    --green:#00C896;
    --red:#FF4757;
    --purple:#7C3AED;
    --text:#E2EBF8;
    --text2:#8A9BBF;
    --text3:#4A5F80;
    --glow:0 0 20px rgba(0,180,216,0.25);
  }

  body{
    font-family:'Exo 2',sans-serif;
    background:var(--bg);
    color:var(--text);
    min-height:100vh;
    overflow-x:hidden;
  }

  /* ─── GRID BACKGROUND ───────────────────────── */
  .grid-bg{
    position:fixed;
    inset:0;
    z-index:0;
    pointer-events:none;
    background-image:
      linear-gradient(rgba(0,180,216,0.04) 1px,transparent 1px),
      linear-gradient(90deg,rgba(0,180,216,0.04) 1px,transparent 1px);
    background-size:60px 60px;
    animation:gm 20s linear infinite;
  }

  @keyframes gm{
    to{background-position:60px 60px;}
  }

  .app{
    position:relative;
    z-index:2;
    min-height:100vh;
    display:flex;
    flex-direction:column;
  }

  /* ─── NAVBAR ───────────────────────── */
  .nav{
    position:sticky;
    top:0;
    z-index:100;
    background:rgba(4,12,26,0.97);
    backdrop-filter:blur(20px);
    border-bottom:1px solid var(--border);
    padding:0 1.2rem;
    display:flex;
    align-items:center;
    justify-content:space-between;
    height:60px;
    box-shadow:0 4px 30px rgba(0,0,0,0.5);
  }

  .nav-brand{display:flex;align-items:center;gap:9px;}

  .nav-logo{
    width:36px;
    height:36px;
    background:linear-gradient(135deg,var(--cyan),var(--blue));
    border-radius:9px;
    display:flex;
    align-items:center;
    justify-content:center;
    font-size:18px;
    box-shadow:0 0 14px rgba(0,180,216,0.4);
  }

  .nav-title{
    font-family:'Orbitron',monospace;
    font-size:0.78rem;
    font-weight:700;
    letter-spacing:0.08em;
  }

  .nav-sub{
    font-size:0.56rem;
    color:var(--cyan);
    text-transform:uppercase;
    letter-spacing:0.14em;
  }

  /* ─── MAPVIEW (ECDIS STYLE) ───────────────────────── */
  .mapview{
    position:relative;
    width:100%;
    height:100%;
    background:radial-gradient(circle at center,#071428 0%,#040C1A 70%);
    overflow:hidden;
  }

  .mapview::before{
    content:"";
    position:absolute;
    inset:0;
    background-image:
      radial-gradient(rgba(0,180,216,0.08) 1px,transparent 1px),
      linear-gradient(rgba(0,180,216,0.03) 1px,transparent 1px);
    background-size:40px 40px,80px 80px;
    opacity:0.5;
    pointer-events:none;
    animation:seaDrift 30s linear infinite;
  }

  @keyframes seaDrift{
    from{transform:translateY(0);}
    to{transform:translateY(40px);}
  }

  .route-line{
    stroke:var(--cyan);
    stroke-width:3;
    filter:drop-shadow(0 0 6px rgba(0,180,216,0.6));
  }

  .wp-marker{
    width:10px;
    height:10px;
    border-radius:50%;
    background:var(--cyan);
    box-shadow:0 0 10px var(--cyan);
  }

  .ship-icon{
    width:14px;
    height:14px;
    background:var(--green);
    transform:rotate(45deg);
    border-radius:2px;
    box-shadow:0 0 12px rgba(0,200,150,0.8);
  }

  /* ─── CONTROLS ───────────────────────── */
  .map-controls{
    position:absolute;
    top:10px;
    right:10px;
    z-index:600;
    display:flex;
    flex-direction:column;
    gap:6px;
  }

  .map-ctrl-btn{
    padding:7px 10px;
    background:rgba(11,29,53,0.85);
    border:1px solid var(--border2);
    border-radius:8px;
    color:var(--text);
    font-size:0.72rem;
    cursor:pointer;
    transition:all 0.2s;
  }

  .map-ctrl-btn:hover{
    border-color:var(--cyan);
    color:var(--cyan);
  }

  /* ─── LEGEND ───────────────────────── */
  .map-legend{
    position:absolute;
    bottom:12px;
    right:12px;
    background:rgba(4,12,26,0.92);
    border:1px solid var(--border);
    border-radius:12px;
    padding:10px 12px;
    font-size:0.7rem;
    backdrop-filter:blur(12px);
  }

  /* ─── FOOTER — unified, same on all screen sizes ────────
     Added: position:relative + overflow:hidden so the wave
     divs animate correctly inside this single container.
  ───────────────────────────────────────────────────────── */
  .footer{
    position:relative;
    overflow:hidden;
    background:linear-gradient(180deg,rgba(7,20,40,0.98),rgba(4,12,26,1));
    border-top:1px solid var(--border2);
    padding:0.85rem 1.4rem 0.7rem;
    display:flex;
    flex-direction:column;
    gap:0;
    backdrop-filter:blur(14px);
    padding-bottom:env(safe-area-inset-bottom,0.7rem);
  }

  /* ── brand + owner left side ── */
  .footer-row{
    position:relative;
    z-index:10;
    display:flex;
    align-items:center;
    justify-content:space-between;
    gap:10px;
  }

  .footer-left{
    display:flex;
    flex-direction:column;
    gap:3px;
  }

  .footer-brand{
    font-family:'Orbitron',monospace;
    font-size:0.78rem;
    font-weight:700;
    color:var(--text2);
    letter-spacing:0.08em;
  }

  .footer-brand span{
    color:var(--cyan);
  }

  .footer-copy{
    font-size:0.62rem;
    font-weight:300;
    color:var(--text3);
    letter-spacing:0.03em;
  }

  /* ── Disclaimer — once, small, same weight as copyright ── */
  .footer-disclaimer{
    position:relative;
    z-index:10;
    font-size:0.58rem;
    font-weight:300;
    color:var(--text3);
    letter-spacing:0.02em;
    line-height:1.6;
    margin-top:6px;
    padding-top:6px;
    border-top:1px solid rgba(26,58,92,0.3);
  }

  /* ── Kept from original (used elsewhere) ── */
  .footer-status{
    display:flex;
    align-items:center;
    gap:8px;
    font-size:0.7rem;
    color:var(--text2);
  }

  .footer-dot{
    width:8px;
    height:8px;
    border-radius:50%;
    background:var(--green);
    box-shadow:0 0 10px var(--green);
    animation:pulse 2s infinite;
  }

  @keyframes pulse{
    0%,100%{opacity:1;}
    50%{opacity:0.4;}
  }

  /* ─── SCROLLBAR ───────────────────────── */
  ::-webkit-scrollbar{width:5px;}
  ::-webkit-scrollbar-thumb{background:var(--border2);border-radius:3px;}

  .leaflet-container{background:#040C1A !important;}

  .leaflet-popup-content-wrapper{
    background:#0B1D35;
    border:1px solid #1A3A5C;
    color:#E2EBF8;
    border-radius:10px;
  }

  .leaflet-popup-tip{background:#0B1D35;}

  /* ════════════════════════════════════════════════════════
     ─── INSTAGRAM BUTTON + ANIMATED WAVES (NEW) ────────────
     ════════════════════════════════════════════════════════ */

  /* Instagram logo button — gradient rounded square + white SVG */
  .dock-ig-btn{
    display:flex;
    align-items:center;
    gap:8px;
    text-decoration:none;
    color:#fff;
    font-size:0.72rem;
    font-weight:500;
    letter-spacing:0.04em;
    flex-shrink:0;
  }

  .ig-icon-wrap{
    width:36px;
    height:36px;
    border-radius:10px;
    background:linear-gradient(
      135deg,
      #405de6 0%,
      #5851db 15%,
      #833ab4 30%,
      #c13584 50%,
      #e1306c 65%,
      #fd1d1d 80%,
      #f77737 90%,
      #fcb045 100%
    );
    display:flex;
    align-items:center;
    justify-content:center;
    box-shadow:0 4px 14px rgba(193,53,132,0.4);
    transition:transform 0.2s,box-shadow 0.2s;
  }

  .dock-ig-btn:hover .ig-icon-wrap,
  .dock-ig-btn:active .ig-icon-wrap{
    transform:scale(1.1);
    box-shadow:0 6px 22px rgba(193,53,132,0.65);
  }

  /* ─── ANIMATED WAVES (inside .footer) ──────────────────── */
  .wave{
    position:absolute;
    bottom:-24px;
    left:-50%;
    width:200%;
    border-radius:43%;
    animation:waveMove linear infinite;
    pointer-events:none;
    z-index:1;
  }

  .wave1{
    height:55px;
    background:var(--cyan);
    opacity:0.10;
    animation-duration:5s;
    bottom:-6px;
  }

  .wave2{
    height:50px;
    background:var(--blue);
    opacity:0.07;
    animation-duration:7.5s;
    bottom:-14px;
  }

  .wave3{
    height:44px;
    background:var(--cyan);
    opacity:0.05;
    animation-duration:10s;
    bottom:-22px;
  }

  @keyframes waveMove{
    0%  {transform:rotate(0deg);}
    100%{transform:rotate(360deg);}
  }
`;
