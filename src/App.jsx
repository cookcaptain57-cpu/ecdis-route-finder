/* eslint-disable */
import { useState, useEffect } from “react”;

// ── Firebase ────────────────────────────────────────────────────────────────
import { auth, db } from “./firebase”;
import {
signOut, onAuthStateChanged,
setPersistence, browserLocalPersistence,
} from “firebase/auth”;
import { doc, getDoc } from “firebase/firestore”;

// ── Constants ───────────────────────────────────────────────────────────────
import { ADMIN_EMAIL, PORTS_DB } from “./constants”;

// ── Sheets / API helpers ────────────────────────────────────────────────────
import { fetchChartSheet, fetchPortsFromSheet } from “./sheets”;

// ── Utilities ───────────────────────────────────────────────────────────────
import { normalizePortRow } from “./utils”;

// ── Styles ──────────────────────────────────────────────────────────────────
import { S } from “./styles”;

// ── Shared UI components ────────────────────────────────────────────────────
import Notif  from “./components/Notif”;
import Footer from “./components/Footer”;

// ── Pages ───────────────────────────────────────────────────────────────────
import HomePage            from “./Pages/HomePage”;
import RoutesPage          from “./Pages/RoutesPage”;
import ChartsPage          from “./Pages/ChartsPage”;
import RoutePlannerPage    from “./Pages/RoutePlannerPage”;
import LoginPage           from “./Pages/LoginPage”;
import AdminPage           from “./Pages/AdminPage”;
import NavModePage         from “./Pages/NavModePage”;
import PortSearchPage      from “./Pages/PortSearchPage”;
import MaritimeLibraryPage from “./Pages/MaritimeLibraryPage”;

// ── Main App shell (~150 lines) ─────────────────────────────────────────────
export default function App(){
const [tab,setTab]=useState(‘home’);
const [searchQ,setSearchQ]=useState(’’);
const [notif,setNotif]=useState(null);
const [menuOpen,setMenuOpen]=useState(false);
const [user,setUser]=useState(null);
const [userProfile,setUserProfile]=useState(null);
const [isBlocked,setIsBlocked]=useState(false);
const [routes,setRoutes]=useState([]);
const [charts,setCharts]=useState([]);
const [authChecked,setAuthChecked]=useState(false); // prevents flicker
const [loading,setLoading]=useState(false);
// Google Sheet live data — only ports preloaded, routes/charts searched live
const [sheetRoutes,setSheetRoutes]=useState([]);
const [sheetCharts,setSheetCharts]=useState([]);
const [sheetLoading,setSheetLoading]=useState(false);
const [portsDb,setPortsDb]=useState(PORTS_DB);

const isAdmin = user?.email===ADMIN_EMAIL;

const notify=(msg,type=‘success’)=>setNotif({msg,type,key:Date.now()});

const fetchSheets=()=>{
setSheetLoading(true);
const ROUTE_TABS=[“Sheet1”,“Routes”,“Route”,“Data”,“Sheet2”];
const fetchRouteSheet=()=>ROUTE_TABS.reduce(
(chain,tab)=>chain.catch(()=>
fetch(`https://opensheet.elk.sh/1ILzyQODb4Ig2mdq9auZ7aJOfdKBBM01t192VE59WbCE/${tab}`)
.then(r=>{if(!r.ok)throw new Error();return r.json();})
.then(d=>{if(!Array.isArray(d)||d.length===0)throw new Error();return d;})
),Promise.reject()
).catch(()=>[]);

```
Promise.all([fetchRouteSheet(),fetchChartSheet(),fetchPortsFromSheet()])
  .then(([d1,d2,d3])=>{
    setSheetRoutes(Array.isArray(d1)?d1:[]);
    setSheetCharts(Array.isArray(d2)?d2:[]);
    if(Array.isArray(d3)&&d3.length>0){
      const normalized=d3.map(normalizePortRow).filter(Boolean);
      const seen=new Set();
      const deduped=[];
      normalized.forEach(p=>{
        const key=`${p.name?.toLowerCase()}-${p.country?.toLowerCase()}`;
        if(!seen.has(key)&&p.lat&&p.lon){seen.add(key);deduped.push(p);}
      });
      const seedMap=new Map(PORTS_DB.map(p=>[p.id,p]));
      deduped.forEach(p=>{
        if(!seedMap.has(p.id)) seedMap.set(p.id,p);
        else seedMap.set(p.id,{...seedMap.get(p.id),...p});
      });
      const merged=[...seedMap.values()];
      PORTS_DB=merged;
      setPortsDb([...merged]);
      console.log(`Loaded ${merged.length} ports from sheet`);
    }
  }).catch(e=>console.log('Sheet fetch error',e))
  .finally(()=>setSheetLoading(false));
```

};

useEffect(()=>{fetchSheets();},[]);

useEffect(()=>{
// Set Firebase auth to persist across browser refresh
setPersistence(auth, browserLocalPersistence).catch(()=>{});
const unsub=onAuthStateChanged(auth,async u=>{
setUser(u);
if(u){
try{
const snap=await getDoc(doc(db,‘users’,u.uid));
if(snap.exists()){
const profile={id:snap.id,…snap.data()};
if(profile.blocked){
setIsBlocked(true);
await signOut(auth);
setUser(null);setUserProfile(null);
setAuthChecked(true);return;
}
setIsBlocked(false);setUserProfile(profile);
}else{setIsBlocked(false);setUserProfile(null);}
}catch{setUserProfile(null);setIsBlocked(false);}
}else{setUserProfile(null);}
setAuthChecked(true);
});
return()=>unsub();
},[]);

useEffect(()=>{
// Don’t pre-load all routes/charts — too slow with 20000+ files
// Data is fetched on-demand when user searches in RoutesPage/ChartsPage
setLoading(false);
},[]);

const TABS=[
{k:‘home’,    i:‘🏠’, l:‘Dashboard’},
{k:‘routes’,  i:‘🛤’, l:‘Routes’},
{k:‘charts’,  i:‘📊’, l:‘ECDIS Charts’, cls:‘gold’},
{k:‘planner’, i:‘🗺’, l:‘Route Planner’, cls:‘green’},
{k:‘navmode’, i:‘🧭’, l:‘Nav Mode’, cls:‘green’},
{k:‘ports’,   i:‘⚓’, l:‘Ports Database’},
{k:‘library’, i:‘📖’, l:‘Maritime Library’},
…(isAdmin?[{k:‘admin’,i:‘🛡’,l:‘Admin’}]:[]),
];

const handleSearch=(q)=>{setSearchQ(q);setTab(‘routes’);setMenuOpen(false);};
const switchTab=k=>{
// Gate: require login for everything except home, login
if(!user && k!==‘home’ && k!==‘login’){
setTab(‘login’);
setMenuOpen(false);
// Store intended tab to redirect after login
sessionStorage.setItem(‘intendedTab’, k);
return;
}
setTab(k);setMenuOpen(false);
};

// Planner needs full height
const isPlannerFull=tab===‘planner’||tab===‘navmode’;

return(
<>
<style>{S}</style>
{/* AUTH CHECK LOADING — prevents flicker/login loop on refresh */}
{!authChecked&&(
<div style={{position:‘fixed’,inset:0,background:‘var(–bg)’,display:‘flex’,alignItems:‘center’,justifyContent:‘center’,zIndex:9999}}>
<div style={{textAlign:‘center’}}>
<div className=“spin” style={{width:40,height:40,margin:‘0 auto 1rem’}}/>
<div style={{fontFamily:‘Orbitron,monospace’,fontSize:‘0.78rem’,color:‘var(–cyan)’}}>NAVISPHERE<span style={{color:‘var(–cyan)’}}>X</span></div>
</div>
</div>
)}
<div className="grid-bg"/>
<div className="app">
{/* NAV */}
<nav className="nav">
<div className=“nav-brand” onClick={()=>switchTab(‘home’)} style={{cursor:‘pointer’}}>
<div className="nav-logo">🧭</div>
<div>
<div className="nav-title">NAVISPHERE<span style={{color:‘var(–cyan)’}}>X</span></div>
<div className="nav-sub">MARINE</div>
</div>
</div>
<div className="nav-tabs">
{TABS.map(t=>(
<button key={t.k} className={`ntab ${t.cls||''} ${tab===t.k?'active':''}`} onClick={()=>switchTab(t.k)}>
{t.i} {t.l}
</button>
))}
{user
?<div className=“uc” onClick={()=>{signOut(auth);notify(‘Logged out’,‘info’);}}>
👥 {userProfile?.name?.split(’ ‘)[0]||user.email.split(’@’)[0]}{isAdmin?’ 🛡’:’’} · Logout
</div>
:<button className=“ntab” onClick={()=>switchTab(‘login’)}>🔐 Login</button>
}
</div>
<div style={{display:‘flex’,alignItems:‘center’,gap:8}}>
<div className="sd"/>
<button className=“burger” onClick={()=>setMenuOpen(o=>!o)}><span/><span/><span/></button>
</div>
</nav>

```
    {/* MOBILE MENU */}
    <div className={`mob-menu ${menuOpen?'open':''}`}>
      {TABS.map(t=><button key={t.k} className={`mtab ${tab===t.k?'active':''}`} onClick={()=>switchTab(t.k)}>{t.i} {t.l}</button>)}
      {user
        ?<button className="mtab" onClick={()=>{signOut(auth);notify('Logged out','info');setMenuOpen(false);}}>
          🚪 Logout ({userProfile?.name?.split(' ')[0]||user.email.split('@')[0]})
        </button>
        :<button className="mtab" onClick={()=>switchTab('login')}>🔐 Login / Register</button>
      }
    </div>

    {/* BLOCKED USER WARNING SCREEN */}
    {isBlocked&&(
      <div style={{position:'fixed',inset:0,background:'var(--bg)',zIndex:9999,display:'flex',alignItems:'center',justifyContent:'center',padding:'1.5rem'}}>
        <div style={{maxWidth:400,width:'100%',background:'var(--card)',border:'2px solid rgba(255,60,60,0.5)',borderRadius:16,padding:'2rem',textAlign:'center',boxShadow:'0 0 40px rgba(255,60,60,0.2)'}}>
          <div style={{fontSize:'3.5rem',marginBottom:'1rem'}}>⚠️</div>
          <div style={{fontFamily:'Orbitron,monospace',fontSize:'1rem',fontWeight:700,color:'#ff6b6b',marginBottom:'0.5rem',letterSpacing:1}}>
            ACCESS SUSPENDED
          </div>
          <div style={{fontSize:'0.82rem',color:'var(--text2)',lineHeight:1.6,marginBottom:'1.2rem'}}>
            Suspicious or unauthorised login activity has been detected on your account. Your access has been suspended by the administrator.
          </div>
          <div style={{background:'rgba(255,60,60,0.08)',border:'1px solid rgba(255,60,60,0.2)',borderRadius:10,padding:'12px',marginBottom:'1.4rem',fontSize:'0.76rem',color:'var(--text2)'}}>
            If you believe this is a mistake, please contact the owner to restore your access.
          </div>
          <a
            href="https://www.instagram.com/manish_the_navigator"
            target="_blank"
            rel="noreferrer"
            style={{display:'flex',alignItems:'center',justifyContent:'center',gap:10,
              background:'linear-gradient(135deg,#833ab4,#fd1d1d,#fcb045)',
              color:'white',borderRadius:10,padding:'12px 20px',textDecoration:'none',
              fontWeight:700,fontSize:'0.85rem',marginBottom:'1rem'}}>
            <span style={{fontSize:'1.2rem'}}>📸</span> Contact on Instagram
          </a>
          <div style={{fontSize:'0.68rem',color:'var(--text3)'}}>@manish_the_navigator</div>
          <button
            style={{marginTop:'1rem',background:'transparent',border:'1px solid var(--border)',color:'var(--text3)',borderRadius:8,padding:'6px 16px',fontSize:'0.7rem',cursor:'pointer'}}
            onClick={()=>setIsBlocked(false)}>
            Dismiss
          </button>
        </div>
      </div>
    )}

    <div style={{flex:1,display:'flex',flexDirection:'column',minHeight:0,overflow:isPlannerFull?'hidden':'auto'}}>
      {loading&&<div className="loading"><div className="spin"/><span>Connecting to Firebase…</span></div>}
      {!loading&&tab==='home'    &&<HomePage routes={routes} charts={charts} onSearch={handleSearch} setTab={switchTab} user={user} portsDb={portsDb}/>}
      {!loading&&tab==='routes'  &&<RoutesPage searchQuery={searchQ} notify={notify} user={user} setTab={switchTab}/>}
      {!loading&&tab==='charts'  &&<ChartsPage notify={notify} user={user} setTab={switchTab} isAdmin={isAdmin}/>}
      {!loading&&tab==='planner' &&<RoutePlannerPage notify={notify} sheetRoutes={[...routes,...sheetRoutes]} portsDb={portsDb}/>}
      {!loading&&tab==='ports'   &&<PortSearchPage portsDb={portsDb} sheetLoading={sheetLoading} refreshSheets={fetchSheets}/>}
      {!loading&&tab==='library' &&<MaritimeLibraryPage setTab={switchTab}/>}
      {!loading&&tab==='navmode' &&<NavModePage notify={notify} sheetRoutes={[...routes,...sheetRoutes]} portsDb={portsDb} setTab={switchTab}/>}
      {!loading&&tab==='login'   &&<LoginPage notify={notify} onLogin={(u,redirectTo)=>{setUser(u);setTab(redirectTo||'home');}}/>}

      {/* Login gate for unauthenticated users on protected tabs */}
      {!loading&&!user&&tab!=='home'&&tab!=='login'&&(
        <div style={{display:'flex',flex:1,alignItems:'center',justifyContent:'center',padding:'2rem'}}>
          <div style={{maxWidth:380,width:'100%',background:'var(--card)',border:'1px solid var(--border2)',
            borderRadius:16,padding:'2rem',textAlign:'center'}}>
            <div style={{fontSize:'3rem',marginBottom:'1rem'}}>🔐</div>
            <div style={{fontFamily:'Orbitron,monospace',fontSize:'0.9rem',fontWeight:700,marginBottom:'0.5rem'}}>
              Login Required
            </div>
            <div style={{fontSize:'0.82rem',color:'var(--text2)',marginBottom:'1.4rem',lineHeight:1.6}}>
              Create a free account to access Routes, Charts, Route Planner, Ports Database and Nav Mode.
            </div>
            <div style={{display:'flex',gap:10,justifyContent:'center'}}>
              <button className="btn btn-primary" onClick={()=>switchTab('login')}>🔐 Login</button>
              <button className="btn btn-secondary" onClick={()=>switchTab('login')}>✅ Register Free</button>
            </div>
          </div>
        </div>
      )}

      {!loading&&tab==='admin'&&(isAdmin
        ?<AdminPage notify={notify} routes={routes} setRoutes={setRoutes} charts={charts} setCharts={setCharts} sheetRoutes={sheetRoutes} sheetCharts={sheetCharts} refreshSheets={fetchSheets} sheetLoading={sheetLoading}/>
        :<div className="section"><div className="empty"><div className="empty-icon">🔒</div><div className="empty-t">Admin Access Only</div><div className="empty-d">Please login with admin credentials to access this panel.</div></div></div>
      )}
    </div>

    {/* FOOTER */}
    {tab!=='planner'&&<Footer/>}

    {/* NOTIFICATION */}
    {notif&&<Notif key={notif.key} msg={notif.msg} type={notif.type} onClose={()=>setNotif(null)}/>}
  </div>
</>
```

);
}
