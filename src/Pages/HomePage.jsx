/* eslint-disable */
import { useState, useEffect, useRef } from "react";
import { db } from "../firebase";
import { collection, getDocs, query, orderBy, limit, getDoc, doc } from "firebase/firestore";
import { idbGet } from "../sheets";

const MARITIME_TIPS = [
  "⚓ Always maintain a safe speed to allow adequate time to take avoiding action.",
  "🧭 Check gyro compass error against solar azimuth at least once per watch.",
  "📻 Monitor VHF Channel 16 at all times for distress, urgency and safety calls.",
  "🌊 A vessel not under command shows two all-round red lights vertically.",
  "⛽ Check bunker tanks before departure — fuel contamination causes most engine failures.",
  "🗺 Update charts to latest Notice to Mariners before departure.",
  "🌪 Northern Hemisphere cyclones rotate counter-clockwise. Dangerous semicircle is right of storm track.",
  "🔦 Test navigation lights before every departure — carry spare bulbs on ocean voyages.",
  "📋 STCW: minimum 10h rest in 24h, 77h rest in any 7-day period.",
  "⚠️ Rule 5 COLREGS: proper look-out at all times by sight, hearing and all available means.",
  "🌡 MARPOL Annex VI: sulphur limit 0.5% global, 0.1% in ECAs.",
  "🛢 Oil record book required for all machinery space operations on ships ≥400 GT.",
  "📡 AIS Class A transponders must be operational at all times when underway.",
  "⚓ Anchoring depth should not exceed 82m — beyond this anchor chain control is difficult.",
  "🧯 Fire drills must be conducted at least once a month (SOLAS Ch.III Reg.19).",
  "📦 Dangerous goods must be declared and stowed per IMDG Code requirements.",
  "🔐 ISM Code: every ship must have SMS and a Designated Person Ashore (DPA).",
  "🌐 GMDSS: all SOLAS ships must maintain continuous watch on distress frequencies.",
  "🚢 MARPOL Annex I: oily water discharge only if oil content is less than 15 ppm.",
  "💡 Magnetic compass error = Variation ± Deviation. Always apply before steering.",
];

const weatherIcon = (code) => {
  if (code === 0) return { icon:'☀️', desc:'Clear sky' };
  if (code <= 3)  return { icon:'🌤️', desc:'Partly cloudy' };
  if (code <= 48) return { icon:'🌫️', desc:'Foggy' };
  if (code <= 55) return { icon:'🌦️', desc:'Drizzle' };
  if (code <= 65) return { icon:'🌧️', desc:'Rain' };
  if (code <= 77) return { icon:'❄️',  desc:'Snow' };
  if (code <= 82) return { icon:'🌦️', desc:'Rain showers' };
  if (code <= 95) return { icon:'⛈️', desc:'Thunderstorm' };
  return { icon:'🌩️', desc:'Storm' };
};

const calcDays = (signOn, signOff) => {
  if (!signOn) return 0;
  const from = new Date(signOn), to = signOff ? new Date(signOff) : new Date();
  return Math.max(0, Math.floor((to - from) / 86400000));
};
const fmt = (d) => {
  const y=Math.floor(d/365),m=Math.floor((d%365)/30),r=d%30;
  return [y>0?`${y}y`:'',m>0?`${m}m`:'',`${r}d`].filter(Boolean).join(' ');
};

const AI_SYSTEM_PROMPT = `You are a Maritime Regulatory AI Assistant — an expert in all international maritime regulations and shipboard procedures. You provide accurate, concise, and practical answers.

You are an expert in:
- SOLAS (Safety of Life at Sea) — all chapters and amendments
- MARPOL (Marine Pollution) — all Annexes I through VI
- STCW (Standards of Training, Certification and Watchkeeping) — including Manila Amendments
- MLC 2006 (Maritime Labour Convention) — all titles and regulations
- COLREGS (International Regulations for Preventing Collisions at Sea) — all rules
- ISM Code (International Safety Management)
- ISPS Code (International Ship and Port Facility Security)
- Medical First Aid Guide / Ship Captain's Medical Guide
- IMDG Code (International Maritime Dangerous Goods)
- General shipboard safety, firefighting, lifesaving appliances, navigation

Response format:
- Be direct and practical — mariners need fast, accurate answers
- Always cite the specific regulation, chapter, rule, or annex (e.g. "SOLAS Ch.III Reg.7")
- Use bullet points for lists of requirements
- Keep answers focused and under 300 words
- If a question involves safety-critical info, add a brief note to verify against official publications
- If unsure, say so clearly rather than guessing`;

const AI_EXAMPLES = [
  "Spare cartridges for foam extinguisher?",
  "VHF distress channel?",
  "Lifeboat ration requirements?",
  "MLC overtime regulations?",
  "COLREG Rule 16 give-way action?",
  "MARPOL Annex I discharge criteria?",
  "STCW rest hour requirements?",
  "ISM Master's overriding authority?",
];

function MaritimeAIWidget() {
  const [isOpen, setIsOpen]         = useState(false);
  const [messages, setMessages]     = useState([]);
  const [input, setInput]           = useState('');
  const [loading, setLoading]       = useState(false);
  const [streamText, setStreamText] = useState('');
  const [copied, setCopied]         = useState(null);
  const bottomRef = useRef(null);
  const inputRef  = useRef(null);

  useEffect(() => { if (isOpen) bottomRef.current?.scrollIntoView({ behavior:'smooth' }); }, [messages, streamText, isOpen]);
  useEffect(() => { if (isOpen) setTimeout(() => inputRef.current?.focus(), 100); }, [isOpen]);

  const sendMessage = async (text) => {
    const question = (text || input).trim();
    if (!question || loading) return;
    setInput('');
    const userMsg = { role:'user', content:question };
    const newHistory = [...messages, userMsg];
    setMessages(newHistory);
    setLoading(true);
    setStreamText('');
    try {
      const response = await fetch('https://api.anthropic.com/v1/messages', {
        method:'POST',
        headers:{ 'Content-Type':'application/json' },
        body:JSON.stringify({
          model:'claude-sonnet-4-20250514', max_tokens:1000,
          system:AI_SYSTEM_PROMPT,
          messages:newHistory.map(m=>({ role:m.role, content:m.content })),
          stream:true,
        }),
      });
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let fullText = '';
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        const chunk = decoder.decode(value);
        const lines = chunk.split('\n').filter(l=>l.startsWith('data: '));
        for (const line of lines) {
          try {
            const json = JSON.parse(line.replace('data: ',''));
            if (json.type==='content_block_delta' && json.delta?.text) { fullText+=json.delta.text; setStreamText(fullText); }
          } catch {}
        }
      }
      setMessages(prev=>[...prev,{ role:'assistant', content:fullText }]);
      setStreamText('');
    } catch {
      setMessages(prev=>[...prev,{ role:'assistant', content:'⚠️ Connection error. Please try again.' }]);
      setStreamText('');
    } finally { setLoading(false); }
  };

  const handleKey = (e) => { if (e.key==='Enter'&&!e.shiftKey) { e.preventDefault(); sendMessage(); } };
  const clearChat = () => { setMessages([]); setStreamText(''); setInput(''); };
  const copyText = (text, idx) => { navigator.clipboard.writeText(text); setCopied(idx); setTimeout(()=>setCopied(null),1800); };

  const formatMsg = (text) => text.split('\n').map((line,i) => {
    if (line.startsWith('- ')||line.startsWith('• ')) return (
      <div key={i} style={{display:'flex',gap:7,marginBottom:3}}>
        <span style={{color:'var(--cyan)',flexShrink:0,marginTop:1}}>▸</span>
        <span>{line.replace(/^[-•]\s/,'')}</span>
      </div>
    );
    if (line.trim()==='') return <div key={i} style={{height:5}}/>;
    const parts = line.split(/\*\*(.+?)\*\*/);
    return <div key={i} style={{marginBottom:2}}>{parts.map((p,j)=>j%2===1?<strong key={j} style={{color:'var(--cyan)'}}>{p}</strong>:p)}</div>;
  });

  return (
    <div style={{ marginBottom:'1.4rem' }}>
      <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:'0.8rem' }}>
        <div style={{ width:4, height:22, background:'linear-gradient(180deg,#00C896,#00a87a)', borderRadius:2 }} />
        <div style={{ fontFamily:'Orbitron,monospace', fontSize:'0.78rem', fontWeight:700, letterSpacing:'0.06em', flex:1 }}>Maritime AI Assistant</div>
        <span style={{ padding:'2px 8px', borderRadius:6, fontSize:'0.56rem', fontWeight:700, background:'rgba(0,200,150,0.15)', color:'var(--green)', border:'1px solid rgba(0,200,150,0.3)' }}>FREE · AI</span>
      </div>
      {!isOpen && (
        <div onClick={()=>setIsOpen(true)} style={{ background:'var(--card)', border:'1px solid rgba(0,200,150,0.25)', borderRadius:16, padding:'1rem 1.2rem', cursor:'pointer', transition:'all 0.2s', display:'flex', alignItems:'center', gap:14 }}
          onMouseEnter={e=>{e.currentTarget.style.borderColor='rgba(0,200,150,0.5)';e.currentTarget.style.transform='translateY(-2px)';e.currentTarget.style.boxShadow='0 8px 28px rgba(0,0,0,0.4)';}}
          onMouseLeave={e=>{e.currentTarget.style.borderColor='rgba(0,200,150,0.25)';e.currentTarget.style.transform='translateY(0)';e.currentTarget.style.boxShadow='none';}}>
          <div style={{ width:50, height:50, borderRadius:14, flexShrink:0, background:'linear-gradient(135deg,#00C896,#00a87a)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:'1.6rem', boxShadow:'0 6px 20px rgba(0,200,150,0.35)' }}>⚓</div>
          <div style={{ flex:1, minWidth:0 }}>
            <div style={{ fontFamily:'Orbitron,monospace', fontSize:'0.72rem', fontWeight:700, color:'var(--green)', marginBottom:4 }}>Ask Anything Maritime</div>
            <div style={{ fontSize:'0.72rem', color:'var(--text2)', lineHeight:1.5 }}>SOLAS · MARPOL · STCW · MLC · COLREG · ISM · Medical</div>
            <div style={{ display:'flex', gap:5, flexWrap:'wrap', marginTop:7 }}>
              {AI_EXAMPLES.slice(0,3).map((q,i)=>(
                <span key={i} style={{ padding:'2px 8px', borderRadius:20, background:'rgba(0,200,150,0.08)', border:'1px solid rgba(0,200,150,0.2)', color:'var(--text3)', fontSize:'0.62rem' }}>{q}</span>
              ))}
              <span style={{ padding:'2px 8px', borderRadius:20, fontSize:'0.62rem', color:'var(--text3)' }}>+more</span>
            </div>
          </div>
          <div style={{ fontSize:'1.2rem', color:'var(--green)', flexShrink:0 }}>→</div>
        </div>
      )}
      {isOpen && (
        <div style={{ background:'var(--card)', border:'1px solid rgba(0,200,150,0.3)', borderRadius:16, overflow:'hidden', boxShadow:'0 12px 40px rgba(0,0,0,0.5)' }}>
          <div style={{ display:'flex', alignItems:'center', gap:10, padding:'12px 14px', background:'linear-gradient(135deg,rgba(0,200,150,0.08),rgba(0,168,122,0.05))', borderBottom:'1px solid rgba(0,200,150,0.15)' }}>
            <div style={{ width:34, height:34, borderRadius:9, flexShrink:0, background:'linear-gradient(135deg,#00C896,#00a87a)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:'1.1rem', boxShadow:'0 4px 12px rgba(0,200,150,0.4)' }}>⚓</div>
            <div style={{ flex:1 }}>
              <div style={{ fontFamily:'Orbitron,monospace', fontSize:'0.72rem', fontWeight:700, color:'var(--green)' }}>Maritime AI Assistant</div>
              <div style={{ fontSize:'0.6rem', color:'var(--text3)' }}>SOLAS · MARPOL · STCW · MLC · COLREG · ISM · IMDG · Medical</div>
            </div>
            <div style={{ display:'flex', gap:6 }}>
              {messages.length>0 && <button onClick={clearChat} style={{ background:'rgba(255,71,87,0.1)', border:'1px solid rgba(255,71,87,0.25)', color:'#ff4757', borderRadius:7, padding:'4px 9px', fontSize:'0.66rem', cursor:'pointer', fontFamily:'Exo 2,sans-serif' }}>Clear</button>}
              <button onClick={()=>setIsOpen(false)} style={{ background:'rgba(255,255,255,0.06)', border:'1px solid var(--border)', color:'var(--text2)', borderRadius:7, padding:'4px 9px', fontSize:'0.8rem', cursor:'pointer' }}>✕</button>
            </div>
          </div>
          <div style={{ height:320, overflowY:'auto', padding:'12px 14px', scrollbarWidth:'thin', scrollbarColor:'var(--border2) transparent' }}>
            {messages.length===0 && !loading && (
              <div style={{ textAlign:'center', paddingTop:20, paddingBottom:10 }}>
                <div style={{ fontSize:'2.2rem', marginBottom:8 }}>🧭</div>
                <div style={{ color:'var(--text2)', fontSize:'0.78rem', marginBottom:4 }}>Ask any maritime regulation question</div>
                <div style={{ color:'var(--text3)', fontSize:'0.68rem', marginBottom:18 }}>Powered by AI · Covers all IMO regulations</div>
                <div style={{ display:'flex', flexWrap:'wrap', gap:7, justifyContent:'center' }}>
                  {AI_EXAMPLES.map((q,i)=>(
                    <button key={i} onClick={()=>sendMessage(q)} style={{ background:'rgba(0,200,150,0.06)', border:'1px solid rgba(0,200,150,0.2)', color:'var(--text2)', borderRadius:9, padding:'6px 11px', fontSize:'0.7rem', cursor:'pointer', fontFamily:'Exo 2,sans-serif', transition:'all 0.15s', textAlign:'left', lineHeight:1.4, maxWidth:200 }}
                      onMouseEnter={e=>{e.currentTarget.style.background='rgba(0,200,150,0.14)';e.currentTarget.style.color='var(--green)';e.currentTarget.style.borderColor='rgba(0,200,150,0.4)';}}
                      onMouseLeave={e=>{e.currentTarget.style.background='rgba(0,200,150,0.06)';e.currentTarget.style.color='var(--text2)';e.currentTarget.style.borderColor='rgba(0,200,150,0.2)';}}>
                      {q}
                    </button>
                  ))}
                </div>
              </div>
            )}
            {messages.map((msg,idx)=>(
              <div key={idx} style={{ marginBottom:14, display:'flex', flexDirection:'column', alignItems:msg.role==='user'?'flex-end':'flex-start' }}>
                <div style={{ fontSize:'0.58rem', fontWeight:700, letterSpacing:'0.1em', color:msg.role==='user'?'var(--cyan)':'var(--green)', marginBottom:4, paddingRight:msg.role==='user'?2:0, paddingLeft:msg.role==='assistant'?2:0 }}>{msg.role==='user'?'YOU':'⚓ MARITIME AI'}</div>
                <div style={{ maxWidth:'88%', position:'relative', background:msg.role==='user'?'linear-gradient(135deg,rgba(0,100,180,0.35),rgba(21,101,192,0.3))':'rgba(255,255,255,0.04)', border:msg.role==='user'?'1px solid rgba(0,180,216,0.3)':'1px solid rgba(0,200,150,0.15)', borderRadius:msg.role==='user'?'13px 13px 3px 13px':'13px 13px 13px 3px', padding:'9px 12px', fontSize:'0.78rem', lineHeight:1.65, color:'var(--text)' }}>
                  {msg.role==='assistant'?formatMsg(msg.content):msg.content}
                  {msg.role==='assistant' && <button onClick={()=>copyText(msg.content,idx)} style={{ position:'absolute', top:6, right:6, background:'rgba(255,255,255,0.06)', border:'1px solid rgba(255,255,255,0.1)', borderRadius:5, padding:'2px 6px', fontSize:'0.58rem', cursor:'pointer', color:copied===idx?'var(--green)':'var(--text3)', fontFamily:'Exo 2,sans-serif', transition:'color 0.2s' }}>{copied===idx?'✓ copied':'copy'}</button>}
                </div>
              </div>
            ))}
            {loading && (
              <div style={{ marginBottom:14, display:'flex', flexDirection:'column', alignItems:'flex-start' }}>
                <div style={{ fontSize:'0.58rem', fontWeight:700, letterSpacing:'0.1em', color:'var(--green)', marginBottom:4, paddingLeft:2 }}>⚓ MARITIME AI</div>
                <div style={{ maxWidth:'88%', background:'rgba(255,255,255,0.04)', border:'1px solid rgba(0,200,150,0.15)', borderRadius:'13px 13px 13px 3px', padding:'9px 12px', fontSize:'0.78rem', lineHeight:1.65, color:'var(--text)' }}>
                  {streamText?<>{formatMsg(streamText)}<span style={{color:'var(--cyan)',animation:'ai-blink 0.8s infinite'}}>▌</span></>:(
                    <span style={{display:'flex',gap:5,alignItems:'center'}}>
                      <span style={{width:6,height:6,borderRadius:'50%',background:'var(--green)',animation:'ai-dot 1s infinite 0s',display:'inline-block'}}/>
                      <span style={{width:6,height:6,borderRadius:'50%',background:'var(--green)',animation:'ai-dot 1s infinite 0.2s',display:'inline-block'}}/>
                      <span style={{width:6,height:6,borderRadius:'50%',background:'var(--green)',animation:'ai-dot 1s infinite 0.4s',display:'inline-block'}}/>
                    </span>
                  )}
                </div>
              </div>
            )}
            <div ref={bottomRef}/>
          </div>
          <div style={{ borderTop:'1px solid rgba(0,200,150,0.12)', padding:'10px 12px', background:'rgba(0,0,0,0.15)' }}>
            <div style={{ display:'flex', gap:8, alignItems:'flex-end', background:'var(--bg2)', border:'1px solid var(--border2)', borderRadius:11, padding:'8px 10px', transition:'border-color 0.2s' }}
              onFocusCapture={e=>e.currentTarget.style.borderColor='rgba(0,200,150,0.4)'}
              onBlurCapture={e=>e.currentTarget.style.borderColor='var(--border2)'}>
              <textarea ref={inputRef} value={input} onChange={e=>setInput(e.target.value)} onKeyDown={handleKey} disabled={loading} placeholder="Ask about SOLAS, MARPOL, STCW, COLREG, MLC, ISM, Medical..." rows={1}
                style={{ flex:1, background:'transparent', border:'none', outline:'none', color:'var(--text)', fontSize:'0.8rem', lineHeight:1.5, resize:'none', fontFamily:'Exo 2,sans-serif', maxHeight:80, overflowY:'auto', scrollbarWidth:'none' }}
                onInput={e=>{e.target.style.height='auto';e.target.style.height=Math.min(e.target.scrollHeight,80)+'px';}}/>
              <button onClick={()=>sendMessage()} disabled={!input.trim()||loading}
                style={{ width:34, height:34, flexShrink:0, borderRadius:9, border:'none', background:input.trim()&&!loading?'linear-gradient(135deg,#00C896,#00a87a)':'rgba(255,255,255,0.06)', cursor:input.trim()&&!loading?'pointer':'not-allowed', display:'flex', alignItems:'center', justifyContent:'center', fontSize:'0.9rem', transition:'all 0.2s', boxShadow:input.trim()&&!loading?'0 4px 14px rgba(0,200,150,0.4)':'none' }}>
                {loading?<span style={{fontSize:'0.6rem',color:'var(--green)'}}>…</span>:<span style={{color:input.trim()?'#fff':'var(--text3)'}}>➤</span>}
              </button>
            </div>
            <div style={{ textAlign:'center', marginTop:6, fontSize:'0.6rem', color:'var(--text3)' }}>⚠️ Always verify against official IMO publications and company SMS</div>
          </div>
        </div>
      )}
      <style>{`@keyframes ai-blink{0%,100%{opacity:1}50%{opacity:0}}@keyframes ai-dot{0%,100%{opacity:0.3;transform:scale(0.85)}50%{opacity:1;transform:scale(1.15)}}`}</style>
    </div>
  );
}

export default function HomePage({ routes, charts, onSearch, setTab, user, portsDb=[], userProfile=null }) {
  const [q,            setQ]           = useState('');
  const [qResults,     setQResults]    = useState([]);
  const [tipIndex,     setTipIndex]    = useState(() => Math.floor(Date.now()/86400000) % MARITIME_TIPS.length);
  const [portNotice,   setPortNotice]  = useState(null);
  const [weather,      setWeather]     = useState(null);
  const [weatherQ,     setWeatherQ]    = useState('');
  const [weatherSugg,  setWeatherSugg] = useState([]);
  const [weatherLoading,setWeatherLoading] = useState(false);
  const [gpsLoading,   setGpsLoading]  = useState(false);
  const [isOffline,    setIsOffline]   = useState(false);
  const [seaTimeDays,  setSeaTimeDays] = useState(null);
  const [expCerts,     setExpCerts]    = useState([]);
  const [cachedRoutes, setCachedRoutes]= useState([]);
  const [cachedCharts, setCachedCharts]= useState([]);
  const [showTabSettings, setShowTabSettings] = useState(false);
  const [pinnedTabs, setPinnedTabs]    = useState(() => {
    try {
      const saved = JSON.parse(localStorage.getItem('hp_pinned_tabs') || 'null');
      return saved || ['routes','charts','planner','navmode','ports','library'];
    } catch { return ['routes','charts','planner','navmode','ports','library']; }
  });
  const wRef = useRef();

  useEffect(() => {
    idbGet('routes_d').then(d=>{if(Array.isArray(d)&&d.length>0){setIsOffline(true);setCachedRoutes(d);}}).catch(()=>{});
    idbGet('charts_d').then(d=>{if(Array.isArray(d)&&d.length>0)setCachedCharts(d);}).catch(()=>{});
    loadPortNotice();
    if (user) { loadSeaTime(); loadCerts(); }
    const h = e => { if (!wRef.current?.contains(e.target)) { setQResults([]); setWeatherSugg([]); } };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, [user?.uid]);

  useEffect(() => {
    if (!weatherQ || weatherQ.length < 2) { setWeatherSugg([]); return; }
    const ql = weatherQ.toLowerCase();
    setWeatherSugg(portsDb.filter(p=>p.lat&&p.lon&&(p.name||'').toLowerCase().includes(ql)).slice(0,6));
  }, [weatherQ, portsDb]);

  const loadPortNotice = async () => {
    try {
      const snap = await getDocs(query(collection(db,'notices'),orderBy('createdAt','desc'),limit(1)));
      if (!snap.empty) { const n={id:snap.docs[0].id,...snap.docs[0].data()}; if(!n.expiryDate||new Date(n.expiryDate)>=new Date()) setPortNotice(n); }
    } catch {}
  };
  const loadSeaTime = async () => {
    try { const s=await getDoc(doc(db,'seatime',user.uid)); if(s.exists()) setSeaTimeDays((s.data().entries||[]).reduce((t,e)=>t+calcDays(e.signOn,e.signOff),0)); } catch {}
  };
  const loadCerts = async () => {
    try { const s=await getDoc(doc(db,'certificates',user.uid)); if(s.exists()) setExpCerts((s.data().list||[]).filter(c=>{if(!c.expiryDate)return false;const d=Math.floor((new Date(c.expiryDate)-new Date())/86400000);return d>=0&&d<=90;})); } catch {}
  };

  const fetchWeatherByCoords = async (lat, lon, portName) => {
    setWeatherLoading(true);
    try {
      const r = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,wind_speed_10m,weather_code&wind_speed_unit=kn&timezone=auto`);
      const d = await r.json(); const c = d.current;
      setWeather({ temp:Math.round(c.temperature_2m), wind:Math.round(c.wind_speed_10m), code:c.weather_code, port:portName||'Your Location' });
      setWeatherQ(''); setWeatherSugg([]);
    } catch {}
    setWeatherLoading(false);
  };

  const fetchWeather = async (port) => {
    if (!port?.lat || !port?.lon) return;
    await fetchWeatherByCoords(port.lat, port.lon, port.name);
  };

  // ── ADDED: GPS current weather ─────────────────────────────────────────────
  const fetchGPSWeather = () => {
    if (!navigator.geolocation) { return; }
    setGpsLoading(true);
    navigator.geolocation.getCurrentPosition(
      pos => { fetchWeatherByCoords(pos.coords.latitude, pos.coords.longitude, '📍 Your Position'); setGpsLoading(false); },
      () => { setGpsLoading(false); }
    );
  };

  const doSearch = (sq) => {
    const s = (sq!==undefined?sq:q).trim();
    if (!s||s.length<2) { setQResults([]); return; }
    const ql = s.toLowerCase();
    const allRoutes = [...cachedRoutes,...routes];
    const allCharts = [...cachedCharts,...charts];
    const rr = allRoutes.filter(r=>Object.values(r).join(' ').toLowerCase().includes(ql)).slice(0,4).map(r=>({type:'route',label:r['File Name']||r.fileName||'Route',sub:r['Port Name']||r.portName||''}));
    const cr = allCharts.filter(c=>Object.values(c).join(' ').toLowerCase().includes(ql)).slice(0,4).map(c=>({type:'chart',label:c['File Name']||c.fileName||'Chart',sub:c['Port Name']||c.portName||''}));
    const pr = portsDb.filter(p=>(p.name||'').toLowerCase().includes(ql)).slice(0,4).map(p=>({type:'port',label:p.name,sub:p.country||''}));
    setQResults([...rr,...cr,...pr]);
  };

  const wc = weather ? weatherIcon(weather.code) : null;

  const ALL_FEATURES = [
    { icon:'🚢', label:'ROUTES',          desc:'Browse, search & download routes.',             tab:'routes',    color:'#00B4D8', bg:'linear-gradient(135deg,#00B4D8,#1565C0)' },
    { icon:'📡', label:'ECDIS CHARTS',    desc:'Charts for all major ECDIS brands.',            tab:'charts',    color:'#F0A500', bg:'linear-gradient(135deg,#F0A500,#D4900A)' },
    { icon:'📐', label:'ROUTE PLANNER',   desc:'Plan optimised routes with advanced tools.',    tab:'planner',   color:'#00C896', bg:'linear-gradient(135deg,#00C896,#00a87a)' },
    { icon:'🧭', label:'NAV MODE',        desc:'Navigate with precision.',                      tab:'navmode',   color:'#A78BFA', bg:'linear-gradient(135deg,#7C3AED,#A78BFA)', badge:'NEW' },
    { icon:'⚓', label:'PORTS DATABASE',  desc:'27,000+ global ports with coordinates.',        tab:'ports',     color:'#00B4D8', bg:'linear-gradient(135deg,#00B4D8,#0070cc)' },
    { icon:'📚', label:'MARITIME LIBRARY',desc:'SOLAS, MARPOL, IMO, STCW & more.',            tab:'library',   color:'#F0A500', bg:'linear-gradient(135deg,#F0A500,#b07000)' },
    { icon:'🛳', label:'VESSEL SEARCH',   desc:'Search by IMO, MMSI or flag state.',           tab:'vessel',    color:'#A78BFA', bg:'linear-gradient(135deg,#7C3AED,#A78BFA)' },
    { icon:'🧮', label:'VOYAGE CALC',     desc:'Calculate distance, duration and fuel.',       tab:'voyage',    color:'#00C896', bg:'linear-gradient(135deg,#00C896,#00a87a)' },
    { icon:'📜', label:'CERTIFICATES',    desc:'Track STCW certificate expiry dates.',         tab:'certs',     color:'#F0A500', bg:'linear-gradient(135deg,#F0A500,#b07000)' },
    { icon:'⏱', label:'SEA TIME',        desc:'Log sea service time across all ships.',       tab:'seatime',   color:'#00B4D8', bg:'linear-gradient(135deg,#00B4D8,#1565C0)' },
    { icon:'📢', label:'PORT NOTICES',    desc:'Closures, restrictions & warnings.',           tab:'notices',   color:'#ff6b35', bg:'linear-gradient(135deg,#ff6b35,#cc4400)' },
    { icon:'🔭', label:'COMPASS ERROR',   desc:'Calculate and log compass errors.',            tab:'compass',   color:'#A78BFA', bg:'linear-gradient(135deg,#7C3AED,#A78BFA)' },
    { icon:'🪢', label:'KNOTS & MOORING', desc:'Reference guide for knots and mooring.',       tab:'knots',     color:'#00C896', bg:'linear-gradient(135deg,#00C896,#00a87a)' },
    { icon:'🚨', label:'EMERGENCY',       desc:'Emergency procedures & contacts.',             tab:'emergency', color:'#FF4757', bg:'linear-gradient(135deg,#FF4757,#cc2233)' },
    { icon:'🗺', label:'NAV & BRIDGE',    desc:'Navigation and bridge procedures.',            tab:'navbridge', color:'#00B4D8', bg:'linear-gradient(135deg,#00B4D8,#1565C0)' },
    { icon:'⏱', label:'SEA TIME',        desc:'Log sea service time across all ships.',       tab:'seatime',   color:'#00B4D8', bg:'linear-gradient(135deg,#00B4D8,#1565C0)' },
    { icon:'🧳', label:'CREW JOURNEY',    desc:'Track your career voyage.',                    tab:'crewjourney',color:'#A78BFA',bg:'linear-gradient(135deg,#7C3AED,#A78BFA)' },
    { icon:'🏖', label:'PORT & SHORE',    desc:'Port info, shore leave & services.',           tab:'portshore', color:'#00C896', bg:'linear-gradient(135deg,#00C896,#00a87a)' },
    { icon:'🔭', label:'CELESTIAL NAV',   desc:'Sight reduction & celestial navigation.',      tab:'sights',    color:'#F0A500', bg:'linear-gradient(135deg,#F0A500,#b07000)', badge:'NEW' },
    { icon:'ℹ️', label:'HELP & INFO',     desc:'Contact, About, Legal, FAQ.',                  tab:'info',      color:'#00B4D8', bg:'linear-gradient(135deg,#00B4D8,#1565C0)' },
  ].filter((f,i,arr)=>arr.findIndex(x=>x.tab===f.tab)===i); // dedupe

  const FEATURES = ALL_FEATURES.filter(f => pinnedTabs.includes(f.tab));

  const savePinnedTabs = (tabs) => { setPinnedTabs(tabs); localStorage.setItem('hp_pinned_tabs', JSON.stringify(tabs)); };
  const togglePin = (tabKey) => {
    if (pinnedTabs.includes(tabKey)) { savePinnedTabs(pinnedTabs.filter(k=>k!==tabKey)); }
    else { if (pinnedTabs.length >= 6) return; savePinnedTabs([...pinnedTabs, tabKey]); }
  };

  const KNOWLEDGE = [
    { icon:'⚓', label:'SOLAS',         sub:'Safety of Life at Sea',  tab:'library' },
    { icon:'🌊', label:'MARPOL',        sub:'Pollution Prevention',   tab:'library' },
    { icon:'🎓', label:'STCW',          sub:'Standards of Training',  tab:'library' },
    { icon:'🏛', label:'IMO CIRCULARS', sub:'Latest IMO Circulars',   tab:'library' },
    { icon:'🖥', label:'ECDIS MANUALS', sub:'User Manuals & Guides',  tab:'library' },
  ];

  return (
    <div style={{ background:'var(--bg)', minHeight:'calc(100vh - 56px)' }}>

      {/* ── Hero Section ── */}
      <div style={{ position:'relative', background:'linear-gradient(135deg,#020810 0%,#040C1A 40%,#071428 70%,#0a1e3a 100%)', overflow:'hidden', padding:'2rem 1.5rem 2.5rem', borderBottom:'1px solid var(--border)' }}>
        <div style={{ position:'absolute', inset:0, opacity:0.15, backgroundImage:'linear-gradient(rgba(0,180,216,0.3) 1px,transparent 1px),linear-gradient(90deg,rgba(0,180,216,0.3) 1px,transparent 1px)', backgroundSize:'40px 40px', pointerEvents:'none' }}/>
        <div style={{ position:'absolute', top:16, right:16, display:'flex', alignItems:'center', gap:6, fontSize:'0.7rem', color:'var(--green)' }}>
          <span style={{ width:8, height:8, borderRadius:'50%', background:'var(--green)', boxShadow:'0 0 8px var(--green)', animation:'pulse 2s infinite', display:'inline-block' }}/>Live Data
        </div>

        {portNotice && (
          <div onClick={()=>setTab('notices')} style={{ background:'rgba(255,107,53,0.1)', border:'1px solid rgba(255,107,53,0.3)', borderRadius:8, padding:'8px 12px', marginBottom:'1rem', cursor:'pointer', display:'flex', alignItems:'center', gap:8, fontSize:'0.74rem' }}>
            <span>⚠️</span>
            <span style={{ color:'var(--text2)', flex:1 }}><strong style={{color:'#ff6b35'}}>Port Notice:</strong> {portNotice.title}</span>
            <span style={{ color:'#ff6b35', fontSize:'0.68rem' }}>View all →</span>
          </div>
        )}

        {/* ── Hero layout: text + weather widget ── */}
        <div style={{ display:'flex', alignItems:'flex-start', gap:'1.5rem', flexWrap:'wrap' }}>
          <div style={{ flex:1, minWidth:240 }}>
            <div style={{ fontSize:'0.6rem', color:'var(--text3)', letterSpacing:'0.18em', marginBottom:'0.5rem', textTransform:'uppercase', display:'flex', gap:6, flexWrap:'wrap' }}>
              {'SMART NAVIGATION · ROUTES · CHARTS · PORTS · MARITIME LIBRARY'.split('·').map((t,i)=>(<span key={i}>{t.trim()}{i<4?' ·':''}</span>))}
            </div>
            <h1 style={{ fontFamily:'Orbitron,monospace', fontSize:'clamp(1.4rem,4vw,2.2rem)', fontWeight:900, letterSpacing:'0.04em', margin:'0 0 0.6rem', lineHeight:1.15 }}>
              NAVISPHERE<span style={{color:'var(--cyan)'}}>X</span> MARINE
            </h1>
            <p style={{ fontSize:'0.86rem', color:'var(--text2)', lineHeight:1.6, marginBottom:'1.2rem', maxWidth:480 }}>
              Your all-in-one maritime platform for planning, navigation and knowledge.
              {user && <span style={{color:'var(--cyan)'}}> Welcome{userProfile?.rank?`, ${userProfile.rank} `:', '}{userProfile?.name?.split(' ')[0]||user.email.split('@')[0]}!</span>}
            </p>
            <div ref={wRef} style={{ position:'relative', maxWidth:500 }}>
              <div style={{ display:'flex', gap:8 }}>
                <div className="siw" style={{flex:1}}>
                  <span className="si-ic">🔍</span>
                  <input className="si" style={{paddingLeft:40,fontSize:'0.86rem'}} placeholder="Search routes, charts, ports… type anything" value={q} onChange={e=>{setQ(e.target.value);doSearch(e.target.value);}} onKeyDown={e=>e.key==='Enter'&&q.trim()&&onSearch(q)}/>
                </div>
                <button className="btn btn-primary" style={{padding:'0 16px',fontSize:'0.8rem',flexShrink:0}} onClick={()=>{if(q.trim())onSearch(q);}}>Search</button>
              </div>
              {qResults.length>0 && (
                <div style={{ position:'absolute', top:'calc(100% + 6px)', left:0, right:0, zIndex:300, background:'var(--card)', border:'1px solid var(--border)', borderRadius:12, boxShadow:'0 12px 40px rgba(0,0,0,0.6)', overflow:'hidden' }}>
                  {['route','chart','port'].map(type=>{
                    const items=qResults.filter(r=>r.type===type); if(!items.length)return null;
                    const cols={route:'var(--cyan)',chart:'var(--gold)',port:'var(--green)'};
                    const lbls={route:'Routes',chart:'Charts',port:'Ports'};
                    return (<div key={type}>
                      <div style={{padding:'5px 12px',fontSize:'0.58rem',color:'var(--text3)',textTransform:'uppercase',letterSpacing:'0.1em',borderBottom:'1px solid var(--border)',background:'rgba(255,255,255,0.02)'}}>{lbls[type]}</div>
                      {items.map((r,i)=>(
                        <div key={i} onMouseDown={()=>{setQ('');setQResults([]);onSearch(r.label);}} style={{padding:'8px 12px',cursor:'pointer',display:'flex',gap:8,alignItems:'center',borderBottom:'1px solid rgba(255,255,255,0.03)'}}
                          onMouseEnter={e=>e.currentTarget.style.background='rgba(0,180,216,0.07)'}
                          onMouseLeave={e=>e.currentTarget.style.background='transparent'}>
                          <span style={{width:7,height:7,borderRadius:'50%',background:cols[type],flexShrink:0}}/>
                          <div><div style={{fontSize:'0.8rem'}}>{r.label}</div>{r.sub&&<div style={{fontSize:'0.66rem',color:'var(--text3)'}}>{r.sub}</div>}</div>
                        </div>
                      ))}
                    </div>);
                  })}
                </div>
              )}
            </div>
          </div>

          {/* ── WEATHER WIDGET in hero (replaces ship) ── */}
          <div style={{ flexShrink:0, width:180, background:'rgba(7,20,40,0.7)', border:'1px solid rgba(0,180,216,0.2)', borderRadius:14, padding:'0.9rem', backdropFilter:'blur(10px)' }}>
            <div style={{ display:'flex', alignItems:'center', gap:6, marginBottom:'0.6rem' }}>
              <div style={{ width:22, height:22, borderRadius:6, background:'linear-gradient(135deg,var(--cyan),var(--blue))', display:'flex', alignItems:'center', justifyContent:'center', fontSize:'0.8rem' }}>🌊</div>
              <div style={{ fontFamily:'Orbitron,monospace', fontSize:'0.58rem', color:'var(--cyan)', letterSpacing:'0.08em' }}>WEATHER</div>
            </div>
            {/* GPS button */}
            <button onClick={fetchGPSWeather} disabled={gpsLoading}
              style={{ width:'100%', padding:'6px 8px', borderRadius:7, border:'1px solid rgba(0,200,150,0.3)', background:'rgba(0,200,150,0.08)', color:'var(--green)', fontFamily:'Exo 2,sans-serif', fontSize:'0.68rem', cursor:'pointer', marginBottom:'0.5rem', display:'flex', alignItems:'center', justifyContent:'center', gap:5, transition:'all 0.2s' }}
              onMouseEnter={e=>e.currentTarget.style.background='rgba(0,200,150,0.16)'}
              onMouseLeave={e=>e.currentTarget.style.background='rgba(0,200,150,0.08)'}>
              {gpsLoading?<><div className="spin" style={{width:10,height:10}}/>Locating…</>:<>📍 Use My Location</>}
            </button>
            {/* Port search */}
            <div style={{position:'relative',marginBottom:'0.5rem'}}>
              <div className="siw">
                <span className="si-ic" style={{fontSize:'0.7rem'}}>⚓</span>
                <input className="si" style={{paddingLeft:26,fontSize:'0.72rem',padding:'6px 6px 6px 24px'}} placeholder="Search port…" value={weatherQ} onChange={e=>setWeatherQ(e.target.value)}/>
              </div>
              {weatherSugg.length>0 && (
                <div style={{position:'absolute',top:'calc(100% + 3px)',left:0,right:0,zIndex:200,background:'var(--card)',border:'1px solid var(--border)',borderRadius:8,boxShadow:'0 8px 24px rgba(0,0,0,0.5)',overflow:'hidden',maxHeight:140,overflowY:'auto'}}>
                  {weatherSugg.map((p,i)=>(
                    <div key={i} onMouseDown={()=>fetchWeather(p)} style={{padding:'6px 9px',cursor:'pointer',fontSize:'0.72rem',borderBottom:'1px solid rgba(255,255,255,0.04)'}}
                      onMouseEnter={e=>e.currentTarget.style.background='rgba(0,180,216,0.08)'}
                      onMouseLeave={e=>e.currentTarget.style.background='transparent'}>
                      {p.name} <span style={{color:'var(--text3)',fontSize:'0.62rem'}}>{p.country}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
            {/* Weather display */}
            {weatherLoading && <div style={{textAlign:'center',fontSize:'0.68rem',color:'var(--text3)',padding:'0.4rem 0'}}><div className="spin" style={{width:14,height:14,margin:'0 auto'}}/></div>}
            {weather && !weatherLoading && (
              <div style={{display:'flex',alignItems:'center',gap:8}}>
                <div style={{fontSize:'1.8rem'}}>{wc?.icon}</div>
                <div>
                  <div style={{fontFamily:'Orbitron,monospace',fontSize:'1rem',fontWeight:700,color:'var(--cyan)'}}>{weather.temp}°C</div>
                  <div style={{fontSize:'0.64rem',color:'var(--text2)'}}>💨 {weather.wind} kts</div>
                  <div style={{fontSize:'0.6rem',color:'var(--text3)',marginTop:1}}>{weather.port}</div>
                </div>
              </div>
            )}
            {!weather && !weatherLoading && <div style={{fontSize:'0.66rem',color:'var(--text3)',textAlign:'center',padding:'0.3rem 0'}}>📍 or search a port</div>}
          </div>
        </div>
      </div>

      <div style={{ padding:'1.4rem 1.2rem', maxWidth:1100, margin:'0 auto' }}>

        {/* Personal widgets */}
        {user && (seaTimeDays!==null||expCerts.length>0||isOffline) && (
          <div style={{display:'flex',gap:10,flexWrap:'wrap',marginBottom:'1.4rem'}}>
            {seaTimeDays!==null && (
              <div onClick={()=>setTab('seatime')} style={{background:'var(--card)',border:'1px solid rgba(0,180,216,0.25)',borderRadius:12,padding:'10px 14px',cursor:'pointer',display:'flex',alignItems:'center',gap:10,flex:'1',minWidth:140}}>
                <div style={{fontSize:'1.6rem'}}>⏱</div>
                <div><div style={{fontFamily:'Orbitron,monospace',fontSize:'0.82rem',fontWeight:700,color:'var(--cyan)'}}>{fmt(seaTimeDays)}</div><div style={{fontSize:'0.6rem',color:'var(--text3)',textTransform:'uppercase'}}>Sea Time</div></div>
              </div>
            )}
            {expCerts.length>0 && (
              <div onClick={()=>setTab('certs')} style={{background:'rgba(255,71,87,0.06)',border:'1px solid rgba(255,71,87,0.3)',borderRadius:12,padding:'10px 14px',cursor:'pointer',display:'flex',alignItems:'center',gap:10,flex:'1',minWidth:140}}>
                <div style={{fontSize:'1.6rem'}}>📜</div>
                <div><div style={{fontFamily:'Orbitron,monospace',fontSize:'0.82rem',fontWeight:700,color:'#ff4757'}}>{expCerts.length} Expiring</div><div style={{fontSize:'0.6rem',color:'#ff4757',textTransform:'uppercase'}}>Certificates</div></div>
              </div>
            )}
            {isOffline && (
              <div style={{background:'rgba(0,200,100,0.06)',border:'1px solid rgba(0,200,100,0.25)',borderRadius:12,padding:'10px 14px',display:'flex',alignItems:'center',gap:10,minWidth:120}}>
                <div style={{fontSize:'1.6rem'}}>✅</div>
                <div><div style={{fontFamily:'Orbitron,monospace',fontSize:'0.72rem',fontWeight:700,color:'var(--green)'}}>Available</div><div style={{fontSize:'0.6rem',color:'var(--green)',textTransform:'uppercase'}}>Offline</div></div>
              </div>
            )}
          </div>
        )}

        {/* Explore section header */}
        <div style={{marginBottom:'0.6rem',display:'flex',alignItems:'center',gap:10}}>
          <div style={{width:4,height:22,background:'linear-gradient(180deg,var(--cyan),var(--blue))',borderRadius:2}}/>
          <div style={{fontFamily:'Orbitron,monospace',fontSize:'0.78rem',fontWeight:700,letterSpacing:'0.06em',flex:1}}>Explore NavisphereX Marine</div>
          <button onClick={()=>setShowTabSettings(true)} style={{background:'rgba(0,180,216,0.08)',border:'1px solid rgba(0,180,216,0.25)',borderRadius:7,padding:'4px 9px',cursor:'pointer',fontSize:'0.72rem',color:'var(--cyan)',display:'flex',alignItems:'center',gap:5,fontFamily:'Exo 2,sans-serif'}}>
            ⚙️ Customise
          </button>
        </div>

        {/* Tab Customisation Modal — now uses ALL_FEATURES which includes all tabs */}
        {showTabSettings && (
          <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,0.65)',zIndex:9990,display:'flex',alignItems:'flex-end',justifyContent:'center'}} onClick={e=>e.target===e.currentTarget&&setShowTabSettings(false)}>
            <div style={{background:'var(--card)',border:'1px solid var(--border)',borderRadius:'18px 18px 0 0',padding:'1.4rem',width:'100%',maxWidth:600,maxHeight:'80vh',overflowY:'auto'}}>
              <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:'0.4rem'}}>
                <div style={{fontFamily:'Orbitron,monospace',fontSize:'0.82rem',fontWeight:700,color:'var(--cyan)'}}>⚙️ Customise Dashboard Tabs</div>
                <button onClick={()=>setShowTabSettings(false)} style={{background:'none',border:'none',color:'var(--text3)',cursor:'pointer',fontSize:'1.3rem'}}>✕</button>
              </div>
              <div style={{fontSize:'0.72rem',color:'var(--text3)',marginBottom:'1rem'}}>
                Select up to <strong style={{color:'var(--cyan)'}}>6 tabs</strong> to show on your dashboard. Currently: <strong style={{color:pinnedTabs.length>=6?'var(--gold)':'var(--green)'}}>{pinnedTabs.length}/6</strong>
              </div>
              <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:8}}>
                {ALL_FEATURES.map(f=>{
                  const pinned=pinnedTabs.includes(f.tab);
                  const disabled=!pinned&&pinnedTabs.length>=6;
                  return (
                    <div key={f.tab} onClick={()=>!disabled&&togglePin(f.tab)}
                      style={{display:'flex',alignItems:'center',gap:10,padding:'10px 12px',borderRadius:10,border:`1px solid ${pinned?f.color+'55':'var(--border)'}`,background:pinned?`${f.color}12`:'rgba(255,255,255,0.02)',cursor:disabled?'not-allowed':'pointer',opacity:disabled?0.45:1,transition:'all 0.15s'}}>
                      <div style={{width:34,height:34,borderRadius:9,background:f.bg,display:'flex',alignItems:'center',justifyContent:'center',fontSize:'1.2rem',flexShrink:0}}>{f.icon}</div>
                      <div style={{flex:1,minWidth:0}}>
                        <div style={{fontFamily:'Orbitron,monospace',fontSize:'0.6rem',fontWeight:700,color:pinned?f.color:'var(--text2)'}}>{f.label}</div>
                      </div>
                      <div style={{width:18,height:18,borderRadius:'50%',flexShrink:0,background:pinned?'var(--green)':'rgba(255,255,255,0.08)',border:`1px solid ${pinned?'var(--green)':'var(--border)'}`,display:'flex',alignItems:'center',justifyContent:'center',fontSize:'0.7rem',color:'white'}}>
                        {pinned?'✓':''}
                      </div>
                    </div>
                  );
                })}
              </div>
              <button className="btn btn-primary" style={{width:'100%',justifyContent:'center',marginTop:'1rem'}} onClick={()=>setShowTabSettings(false)}>✅ Done</button>
            </div>
          </div>
        )}

        {/* Feature cards */}
        <div className="hp-features-grid" style={{marginBottom:'1.4rem'}}>
          {FEATURES.map((f,i)=>(
            <div key={i} onClick={()=>setTab(f.tab)} style={{background:'var(--card)',border:'1px solid var(--border)',borderRadius:16,padding:'1.2rem',cursor:'pointer',transition:'all 0.25s',position:'relative',overflow:'hidden',display:'flex',flexDirection:'column',gap:10}}
              onMouseEnter={e=>{e.currentTarget.style.borderColor=f.color+'55';e.currentTarget.style.transform='translateY(-3px)';e.currentTarget.style.boxShadow=`0 12px 32px rgba(0,0,0,0.5),0 0 20px ${f.color}18`;}}
              onMouseLeave={e=>{e.currentTarget.style.borderColor='var(--border)';e.currentTarget.style.transform='translateY(0)';e.currentTarget.style.boxShadow='none';}}>
              <div style={{position:'absolute',top:0,left:0,right:0,height:2,background:f.bg,opacity:0.6}}/>
              {f.badge && <span style={{position:'absolute',top:10,right:10,padding:'2px 7px',borderRadius:6,fontSize:'0.56rem',fontWeight:700,background:'rgba(0,200,100,0.15)',color:'var(--green)',border:'1px solid rgba(0,200,100,0.3)'}}>{f.badge}</span>}
              <div style={{width:52,height:52,borderRadius:14,background:f.bg,display:'flex',alignItems:'center',justifyContent:'center',fontSize:'1.7rem',boxShadow:`0 6px 20px ${f.color}40`}}>{f.icon}</div>
              <div>
                <div style={{fontFamily:'Orbitron,monospace',fontSize:'0.68rem',fontWeight:700,color:f.color,letterSpacing:'0.06em',marginBottom:4}}>{f.label}</div>
                <div style={{fontSize:'0.74rem',color:'var(--text2)',lineHeight:1.5}}>{f.desc}</div>
              </div>
              <div style={{marginTop:'auto',fontSize:'0.7rem',color:f.color,display:'flex',alignItems:'center',gap:4}}>Explore <span>→</span></div>
            </div>
          ))}
        </div>

        {/* My Account */}
        {user && (
          <div onClick={()=>setTab('account')} style={{background:'linear-gradient(135deg,var(--card) 0%,#0F2444 100%)',border:'1px solid rgba(0,180,216,0.2)',borderRadius:16,padding:'1.2rem',cursor:'pointer',display:'flex',alignItems:'center',gap:16,marginBottom:'1.4rem',transition:'all 0.2s',position:'relative',overflow:'hidden'}}
            onMouseEnter={e=>{e.currentTarget.style.borderColor='rgba(0,180,216,0.4)';e.currentTarget.style.boxShadow='0 8px 28px rgba(0,0,0,0.4)';}}
            onMouseLeave={e=>{e.currentTarget.style.borderColor='rgba(0,180,216,0.2)';e.currentTarget.style.boxShadow='none';}}>
            <div style={{width:50,height:50,borderRadius:'50%',background:'linear-gradient(135deg,var(--cyan),var(--blue))',display:'flex',alignItems:'center',justifyContent:'center',fontSize:'1.5rem',flexShrink:0}}>👤</div>
            <div style={{flex:1}}>
              <div style={{fontFamily:'Orbitron,monospace',fontSize:'0.82rem',fontWeight:700,color:'var(--cyan)',marginBottom:2}}>MY ACCOUNT</div>
              <div style={{fontSize:'0.74rem',color:'var(--text2)'}}>{userProfile?.name?`${userProfile?.rank?userProfile.rank+' ':''}${userProfile.name}`:'Login, save routes, manage your data.'}</div>
            </div>
            <div style={{fontSize:'1.2rem',color:'var(--cyan)',flexShrink:0}}>→</div>
          </div>
        )}

        {/* Quick Actions */}
        <div style={{marginBottom:'0.6rem',display:'flex',alignItems:'center',gap:10}}>
          <div style={{width:4,height:22,background:'linear-gradient(180deg,var(--gold),var(--gold2))',borderRadius:2}}/>
          <div style={{fontFamily:'Orbitron,monospace',fontSize:'0.78rem',fontWeight:700,letterSpacing:'0.06em'}}>Quick Actions</div>
        </div>
        <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(130px,1fr))',gap:8,marginBottom:'1.4rem'}}>
          {[
            {icon:'⬇️',label:'Download Latest',sub:'Get latest updates',tab:'routes',color:'var(--green)'},
            {icon:'📊',label:'New Charts',sub:'Explore new charts',tab:'charts',color:'var(--gold)'},
            {icon:'🚢',label:'Vessel Search',sub:'IMO / MMSI lookup',tab:'vessel',color:'#A78BFA'},
            {icon:'🧮',label:'Voyage Calc',sub:'Distance & duration',tab:'voyage',color:'var(--cyan)'},
          ].map((a,i)=>(
            <button key={i} onClick={()=>setTab(a.tab)} style={{padding:'10px',borderRadius:10,border:`1px solid ${a.color}33`,background:`${a.color}0a`,cursor:'pointer',display:'flex',flexDirection:'column',alignItems:'flex-start',gap:4,fontFamily:'Exo 2,sans-serif',transition:'all 0.2s'}}
              onMouseEnter={e=>e.currentTarget.style.background=`${a.color}18`}
              onMouseLeave={e=>e.currentTarget.style.background=`${a.color}0a`}>
              <div style={{width:36,height:36,borderRadius:9,background:a.color+'22',display:'flex',alignItems:'center',justifyContent:'center',fontSize:'1.2rem'}}>{a.icon}</div>
              <div style={{fontSize:'0.74rem',fontWeight:600,color:a.color,textAlign:'left'}}>{a.label}</div>
              <div style={{fontSize:'0.62rem',color:'var(--text3)'}}>{a.sub}</div>
            </button>
          ))}
        </div>

        {/* Maritime Knowledge Hub */}
        <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:'0.8rem'}}>
          <div style={{display:'flex',alignItems:'center',gap:10}}>
            <div style={{width:4,height:22,background:'linear-gradient(180deg,#A78BFA,#7C3AED)',borderRadius:2}}/>
            <div style={{fontFamily:'Orbitron,monospace',fontSize:'0.78rem',fontWeight:700}}>Maritime Knowledge Hub</div>
          </div>
          <button onClick={()=>setTab('library')} style={{fontSize:'0.72rem',color:'var(--cyan)',background:'none',border:'none',cursor:'pointer'}}>View all →</button>
        </div>
        <div style={{display:'flex',gap:8,overflowX:'auto',paddingBottom:8,marginBottom:'1.4rem',scrollbarWidth:'none'}}>
          {KNOWLEDGE.map((k,i)=>(
            <div key={i} onClick={()=>setTab(k.tab)} style={{flexShrink:0,width:130,background:'var(--card)',border:'1px solid var(--border)',borderRadius:12,padding:'1rem',cursor:'pointer',transition:'all 0.2s'}}
              onMouseEnter={e=>{e.currentTarget.style.borderColor='rgba(167,139,250,0.4)';e.currentTarget.style.transform='translateY(-2px)';}}
              onMouseLeave={e=>{e.currentTarget.style.borderColor='var(--border)';e.currentTarget.style.transform='translateY(0)';}}>
              <div style={{fontSize:'1.8rem',marginBottom:6}}>{k.icon}</div>
              <div style={{fontFamily:'Orbitron,monospace',fontSize:'0.64rem',fontWeight:700,color:'#A78BFA',marginBottom:4}}>{k.label}</div>
              <div style={{fontSize:'0.64rem',color:'var(--text3)',lineHeight:1.4}}>{k.sub}</div>
            </div>
          ))}
        </div>

        {/* AI Widget */}
        <MaritimeAIWidget />

        {/* Tip of the Day */}
        <div style={{display:'grid',gridTemplateColumns:'1fr',gap:'1rem',marginBottom:'1.4rem'}}>
          <div style={{background:'var(--card)',border:'1px solid var(--border)',borderRadius:14,padding:'1.1rem'}}>
            <div style={{display:'flex',alignItems:'center',gap:8,marginBottom:'0.6rem'}}>
              <div style={{width:28,height:28,borderRadius:7,background:'linear-gradient(135deg,var(--gold),var(--gold2))',display:'flex',alignItems:'center',justifyContent:'center',fontSize:'0.9rem'}}>💡</div>
              <div style={{fontFamily:'Orbitron,monospace',fontSize:'0.65rem',color:'var(--gold)',letterSpacing:'0.08em'}}>TIP OF THE DAY</div>
            </div>
            <div style={{fontSize:'0.78rem',color:'var(--text2)',lineHeight:1.7,minHeight:'3.5rem'}}>{MARITIME_TIPS[tipIndex]}</div>
            <button className="btn btn-secondary" style={{marginTop:'0.8rem',padding:'4px 10px',fontSize:'0.66rem'}} onClick={()=>setTipIndex(i=>(i+1)%MARITIME_TIPS.length)}>Next tip →</button>
          </div>
        </div>

      </div>

      <style>{`
        @keyframes float{0%,100%{transform:translateY(0)}50%{transform:translateY(-10px)}}
        .hp-features-grid{display:grid;grid-template-columns:repeat(2,1fr);gap:0.8rem;}
        @media(min-width:640px){.hp-features-grid{grid-template-columns:repeat(3,1fr);}}
        @media(max-width:480px){.hero-weather{display:none;}}
      `}</style>
    </div>
  );
}
