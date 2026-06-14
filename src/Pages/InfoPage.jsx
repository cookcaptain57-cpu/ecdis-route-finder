/* eslint-disable */
// src/Pages/InfoPage.jsx — Help & Info combined page
import { useState, useRef, useEffect } from "react";

// ─── EmailJS loader ───────────────────────────────────────────────────────────
const EMAILJS_SERVICE_ID  = 'service_mwrpzca';
const EMAILJS_TEMPLATE_ID = 'template_s8975dd';
const EMAILJS_PUBLIC_KEY  = 'lN0Fa22niddYawf1w';

function loadEmailJS() {
  return new Promise((resolve, reject) => {
    if (window.emailjs) { resolve(window.emailjs); return; }
    const script = document.createElement('script');
    script.src = 'https://cdn.jsdelivr.net/npm/@emailjs/browser@4/dist/email.min.js';
    script.onload = () => resolve(window.emailjs);
    script.onerror = () => reject(new Error('EmailJS failed to load'));
    document.head.appendChild(script);
  });
}

// ─── StarRating ───────────────────────────────────────────────────────────────
function StarRating({ value, onChange }) {
  const [hover, setHover] = useState(0);
  return (
    <div style={{ display:'flex', gap:6 }}>
      {[1,2,3,4,5].map(star => (
        <span key={star}
          onMouseEnter={() => setHover(star)}
          onMouseLeave={() => setHover(0)}
          onClick={() => onChange(star)}
          style={{
            fontSize:'1.6rem', cursor:'pointer',
            color:(hover||value)>=star?'var(--gold)':'var(--border2)',
            transition:'all 0.15s',
            filter:(hover||value)>=star?'drop-shadow(0 0 6px rgba(240,165,0,0.5))':'none',
          }}>★</span>
      ))}
      {value > 0 && (
        <span style={{ fontSize:'0.72rem', color:'var(--text3)', alignSelf:'center', marginLeft:4 }}>
          {['','Poor','Fair','Good','Great','Excellent!'][value]}
        </span>
      )}
    </div>
  );
}

// ─── Contact Section (full, matches ContactPage.jsx) ─────────────────────────
const CONTACT_INFO = [
  { icon:'📧', label:'Email',     value:'navispherex@gmail.com',    link:'mailto:navispherex@gmail.com' },
  { icon:'💬', label:'WhatsApp',  value:'+91 95825 25349',          link:'https://wa.me/919582525349' },
  { icon:'📸', label:'Instagram', value:'@manish_the_navigator',    link:'https://instagram.com/manish_the_navigator' },
  { icon:'🌐', label:'Location',  value:'At Sea 🌊 / India',        link:null },
];
const CATEGORIES = [
  { value:'bug',        label:'🐛 Bug / Error Report' },
  { value:'suggestion', label:'💡 Feature Suggestion' },
  { value:'data',       label:'📦 Data Update Request' },
  { value:'query',      label:'🙋 General Query' },
  { value:'maritime',   label:'⚓ Maritime Content Feedback' },
  { value:'other',      label:'📝 Other' },
];
const USER_TYPES = [
  { value:'officer', label:'⚓ Deck / Engineer Officer' },
  { value:'student', label:'🎓 Maritime Student' },
  { value:'shore',   label:'🏢 Shore Staff' },
  { value:'other',   label:'👤 Other' },
];
const PRIORITIES = [
  { value:'low',    label:'🟢 Low',    color:'var(--green)' },
  { value:'medium', label:'🟡 Medium', color:'var(--gold)' },
  { value:'urgent', label:'🔴 Urgent', color:'var(--red)' },
];

function ContactSection({ notify, user }) {
  const [form, setForm] = useState({
    name:user?.displayName||'', email:user?.email||'',
    userType:'', category:'', priority:'medium', subject:'', message:'', rating:0,
  });
  const [screenshot,       setScreenshot]       = useState(null);
  const [screenshotPreview,setScreenshotPreview] = useState(null);
  const [loading,  setLoading]  = useState(false);
  const [submitted,setSubmitted]= useState(false);
  const [refId,    setRefId]    = useState('');
  const fileRef = useRef();

  const set = (k,v) => setForm(f=>({...f,[k]:v}));

  const handleFile = (e) => {
    const file = e.target.files[0]; if (!file) return;
    if (file.size > 5*1024*1024) { notify('Screenshot must be under 5MB','error'); return; }
    setScreenshot(file);
    const reader = new FileReader();
    reader.onload = ev => setScreenshotPreview(ev.target.result);
    reader.readAsDataURL(file);
  };

  const generateRef = () => {
    const ts = Date.now().toString(36).toUpperCase();
    const rand = Math.random().toString(36).substring(2,6).toUpperCase();
    return `NVX-${ts}-${rand}`;
  };

  const handleSubmit = async () => {
    if (!form.name.trim())    { notify && notify('Please enter your name','error'); return; }
    if (!form.email.trim())   { notify && notify('Please enter your email','error'); return; }
    if (!form.category)       { notify && notify('Please select a category','error'); return; }
    if (!form.subject.trim()) { notify && notify('Please enter a subject','error'); return; }
    if (!form.message.trim()) { notify && notify('Please write your message','error'); return; }
    setLoading(true);
    const ref = generateRef(); setRefId(ref);
    try {
      const { db } = await import('../firebase');
      const { collection, addDoc, serverTimestamp } = await import('firebase/firestore');
      await addDoc(collection(db,'contactMessages'), {
        name:form.name, email:form.email, userType:form.userType,
        category:form.category, priority:form.priority, subject:form.subject,
        message:form.message, rating:form.rating, refId:ref,
        read:false, userId:user?.uid||null, createdAt:serverTimestamp(),
      });
      if (EMAILJS_SERVICE_ID !== 'YOUR_SERVICE_ID') {
        try {
          const ejs = await loadEmailJS();
          await ejs.send(EMAILJS_SERVICE_ID, EMAILJS_TEMPLATE_ID, {
            from_name:form.name, from_email:form.email,
            user_type:form.userType||'Not specified',
            category:CATEGORIES.find(c=>c.value===form.category)?.label||form.category,
            priority:form.priority.toUpperCase(),
            subject:form.subject, message:form.message,
            rating:form.rating>0?`${form.rating}/5 stars`:'Not rated', ref_id:ref,
          }, EMAILJS_PUBLIC_KEY);
        } catch(emailErr) { console.warn('EmailJS non-fatal:',emailErr.message); }
      }
      setSubmitted(true);
      notify && notify('✅ Message sent successfully!','success');
    } catch(e) { notify && notify('Failed: '+(e.message||'Unknown error'),'error'); }
    setLoading(false);
  };

  if (submitted) return (
    <div style={{ background:'var(--card)', border:'1px solid rgba(0,200,150,0.3)', borderRadius:18, padding:'2.5rem', textAlign:'center', boxShadow:'0 0 40px rgba(0,200,150,0.1)' }}>
      <div style={{ fontSize:'3.5rem', marginBottom:'1rem' }}>✅</div>
      <div style={{ fontFamily:'Orbitron,monospace', fontSize:'1rem', fontWeight:700, color:'var(--green)', marginBottom:8 }}>Message Sent!</div>
      <div style={{ fontSize:'0.82rem', color:'var(--text2)', lineHeight:1.7, marginBottom:'1.4rem' }}>
        Thank you, <strong style={{color:'var(--cyan)'}}>{form.name}</strong>! Your message has been received.<br/>
        We typically respond within <strong style={{color:'var(--gold)'}}>48 hours</strong>.
      </div>
      <div style={{ background:'rgba(0,180,216,0.06)', border:'1px solid rgba(0,180,216,0.2)', borderRadius:10, padding:'10px 16px', marginBottom:'1.4rem', fontFamily:'Orbitron,monospace', fontSize:'0.8rem', color:'var(--cyan)', letterSpacing:'0.1em' }}>
        Reference: {refId}
      </div>
      <div style={{ fontSize:'0.72rem', color:'var(--text3)', marginBottom:'1.6rem' }}>Keep this reference number for follow-up queries.</div>
      <button className="btn btn-primary" style={{ justifyContent:'center' }}
        onClick={() => { setSubmitted(false); setForm({name:user?.displayName||'',email:user?.email||'',userType:'',category:'',priority:'medium',subject:'',message:'',rating:0}); setScreenshot(null); setScreenshotPreview(null); }}>
        ✉️ Send Another Message
      </button>
    </div>
  );

  return (
    <div>
      <div style={{ marginBottom:'1.4rem', textAlign:'center' }}>
        <div style={{ display:'flex', alignItems:'center', justifyContent:'center', gap:8, marginTop:8 }}>
          <div style={{ width:6, height:6, borderRadius:'50%', background:'var(--green)', boxShadow:'0 0 8px var(--green)', animation:'pulse 2s infinite' }}/>
          <span style={{ fontSize:'0.7rem', color:'var(--green)' }}>Typically responds within 48 hours</span>
        </div>
      </div>

      <div style={{ display:'grid', gridTemplateColumns:'1fr 1.6fr', gap:'1.4rem', alignItems:'start' }}>
        {/* LEFT: Contact Info */}
        <div style={{ display:'flex', flexDirection:'column', gap:'0.8rem' }}>
          <div style={{ background:'linear-gradient(135deg,var(--card),var(--card2))', border:'1px solid var(--border2)', borderRadius:16, padding:'1.4rem', textAlign:'center', position:'relative', overflow:'hidden' }}>
            <div style={{ position:'absolute', top:-20, right:-20, width:100, height:100, borderRadius:'50%', background:'rgba(0,180,216,0.05)', pointerEvents:'none' }}/>
            <div style={{ fontSize:'2.5rem', marginBottom:8 }}>🧭</div>
            <div style={{ fontFamily:'Orbitron,monospace', fontSize:'0.82rem', fontWeight:700, color:'var(--cyan)', marginBottom:3 }}>MANISH BHARTI</div>
            <div style={{ fontSize:'0.72rem', color:'var(--gold)', marginBottom:2 }}>2nd Officer</div>
            <div style={{ fontSize:'0.68rem', color:'var(--text3)', fontStyle:'italic' }}>"Built at sea, for the sea"</div>
          </div>
          {CONTACT_INFO.map(c => (
            <div key={c.label} style={{ background:'var(--card)', border:'1px solid var(--border)', borderRadius:12, padding:'0.9rem 1rem', display:'flex', alignItems:'center', gap:12 }}>
              <div style={{ fontSize:'1.3rem', flexShrink:0 }}>{c.icon}</div>
              <div style={{ flex:1, minWidth:0 }}>
                <div style={{ fontSize:'0.62rem', color:'var(--text3)', textTransform:'uppercase', letterSpacing:'0.1em', marginBottom:2 }}>{c.label}</div>
                {c.link
                  ? <a href={c.link} target="_blank" rel="noreferrer" style={{ fontSize:'0.78rem', color:'var(--cyan)', textDecoration:'none', fontWeight:600, wordBreak:'break-all' }}>{c.value}</a>
                  : <div style={{ fontSize:'0.78rem', color:'var(--text)', fontWeight:600 }}>{c.value}</div>
                }
              </div>
            </div>
          ))}
          <div className="info-box" style={{ marginBottom:0 }}>
            ⏱ <strong style={{color:'var(--cyan)'}}>Response Time</strong><br/>
            <span style={{ fontSize:'0.74rem' }}>We aim to reply within <strong>48 hours</strong>. For urgent issues, WhatsApp is fastest.</span>
          </div>
        </div>

        {/* RIGHT: Form */}
        <div style={{ background:'var(--card)', border:'1px solid var(--border2)', borderRadius:16, padding:'1.4rem' }}>
          <div style={{ fontFamily:'Orbitron,monospace', fontSize:'0.82rem', fontWeight:700, color:'var(--cyan)', marginBottom:'1.2rem', display:'flex', alignItems:'center', gap:8 }}>
            ✍️ Write to Us
          </div>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'0.8rem' }}>
            <div className="ff" style={{margin:0}}><label className="fl">Your Name *</label><input className="fi" placeholder="Full name" value={form.name} onChange={e=>set('name',e.target.value)}/></div>
            <div className="ff" style={{margin:0}}><label className="fl">Email Address *</label><input className="fi" type="email" placeholder="your@email.com" value={form.email} onChange={e=>set('email',e.target.value)}/></div>
            <div className="ff" style={{margin:0}}><label className="fl">You are a…</label>
              <select className="fi" value={form.userType} onChange={e=>set('userType',e.target.value)}>
                <option value="">Select (optional)</option>
                {USER_TYPES.map(t=><option key={t.value} value={t.value}>{t.label}</option>)}
              </select>
            </div>
            <div className="ff" style={{margin:0}}><label className="fl">Category *</label>
              <select className="fi" value={form.category} onChange={e=>set('category',e.target.value)}>
                <option value="">Select category</option>
                {CATEGORIES.map(c=><option key={c.value} value={c.value}>{c.label}</option>)}
              </select>
            </div>
            <div className="ff" style={{gridColumn:'1/-1',margin:0}}>
              <label className="fl">Priority</label>
              <div style={{ display:'flex', gap:8 }}>
                {PRIORITIES.map(p=>(
                  <button key={p.value} type="button" onClick={()=>set('priority',p.value)}
                    style={{ flex:1, padding:'8px 6px', borderRadius:9, border:'1px solid', cursor:'pointer', fontFamily:'Exo 2,sans-serif', fontSize:'0.72rem', transition:'all 0.2s',
                      borderColor:form.priority===p.value?p.color:'var(--border)',
                      background:form.priority===p.value?`${p.color}18`:'transparent',
                      color:form.priority===p.value?p.color:'var(--text3)',
                      fontWeight:form.priority===p.value?700:400 }}>
                    {p.label}
                  </button>
                ))}
              </div>
            </div>
            <div className="ff" style={{gridColumn:'1/-1',margin:0}}><label className="fl">Subject *</label><input className="fi" placeholder="Brief subject line" value={form.subject} onChange={e=>set('subject',e.target.value)}/></div>
            <div className="ff" style={{gridColumn:'1/-1',margin:0}}><label className="fl">Message *</label><textarea className="fi" rows={4} style={{resize:'vertical'}} placeholder="Describe your issue, suggestion, or query in detail…" value={form.message} onChange={e=>set('message',e.target.value)}/></div>
            <div className="ff" style={{gridColumn:'1/-1',margin:0}}>
              <label className="fl">Rate the App (optional)</label>
              <StarRating value={form.rating} onChange={v=>set('rating',v)}/>
            </div>
            <div className="ff" style={{gridColumn:'1/-1',margin:0}}>
              <label className="fl">Attach Screenshot (optional · max 5MB)</label>
              <div onClick={()=>fileRef.current?.click()}
                style={{ border:'2px dashed var(--border2)', borderRadius:10, padding:'1rem', textAlign:'center', cursor:'pointer', background:'var(--bg2)' }}>
                {screenshotPreview
                  ? <img src={screenshotPreview} alt="screenshot" style={{ maxHeight:120, borderRadius:8, objectFit:'contain' }}/>
                  : <div style={{ color:'var(--text3)', fontSize:'0.76rem' }}>📎 Click to attach image</div>
                }
                <input ref={fileRef} type="file" accept="image/*" style={{display:'none'}} onChange={handleFile}/>
              </div>
              {screenshot && (
                <button type="button" onClick={()=>{setScreenshot(null);setScreenshotPreview(null);}}
                  style={{ marginTop:4, background:'none', border:'none', color:'var(--red)', fontSize:'0.7rem', cursor:'pointer' }}>
                  ✕ Remove screenshot
                </button>
              )}
            </div>
          </div>
          <div style={{ marginTop:'1rem', display:'flex', gap:10, alignItems:'center', flexWrap:'wrap' }}>
            <button className="btn btn-primary" style={{ flex:1, justifyContent:'center', padding:'12px' }} onClick={handleSubmit} disabled={loading}>
              {loading?<><div className="spin" style={{width:14,height:14}}/>Sending…</>:'📨 Send Message'}
            </button>
          </div>
          <div style={{ marginTop:'0.8rem', fontSize:'0.66rem', color:'var(--text3)', lineHeight:1.5 }}>
            🔒 Your data is saved securely to our database. We never share your information.
          </div>
        </div>
      </div>

      <style>{`@media(max-width:700px){.contact-grid{grid-template-columns:1fr !important;}}`}</style>
    </div>
  );
}

// ─── About Section (full, matches AboutPage.jsx) ──────────────────────────────
const ABOUT_FEATURES = [
  { icon:'🗺',  title:'Route Planner',      desc:'Interactive ECDIS-style route planning with waypoints' },
  { icon:'⚓',  title:'Port Database',       desc:'27,000+ world ports with coordinates and details' },
  { icon:'📡',  title:'ECDIS Charts',        desc:'Digital chart files for major ECDIS brands' },
  { icon:'🛳',  title:'Vessel Search',       desc:'Search and track vessels worldwide' },
  { icon:'⏱',  title:'Sea Time Calculator', desc:'Track and calculate sea service time accurately' },
  { icon:'📜',  title:'Certificate Tracker', desc:'Never miss a certificate renewal again' },
  { icon:'🧮',  title:'Voyage Calculator',   desc:'Calculate ETA, fuel, distance and speed' },
  { icon:'📚',  title:'Maritime Library',    desc:'Reference publications and maritime documents' },
  { icon:'🔭',  title:'Compass Error',       desc:'Gyro and magnetic compass error calculations' },
  { icon:'🧭',  title:'Nav Mode',            desc:'Full-screen navigation and planning mode' },
  { icon:'📢',  title:'Port Notices',        desc:'Live port notices and maritime advisories' },
  { icon:'🪢',  title:'Knots & Mooring',     desc:'Visual guide to seamanship knots and mooring' },
  { icon:'🚨',  title:'Emergency Reference', desc:'Quick-access emergency procedures and contacts' },
  { icon:'🧳',  title:'Crew Journey',        desc:'Track your career voyage and sea service' },
];
const MILESTONES = [
  { year:'2024', event:'NavisphereX Marine — First version launched' },
  { year:'2025', event:'Port Database expanded to 27,000+ entries' },
  { year:'2025', event:'ECDIS Charts, Route Planner & Nav Mode added' },
  { year:'2026', event:'Full redesign — Sea Time, Certificates, Crew Journey' },
];

function AboutSection({ setActiveSection }) {
  const [visibleCards, setVisibleCards] = useState(0);
  useEffect(() => {
    let i = 0;
    const t = setInterval(() => { i++; setVisibleCards(i); if(i>=ABOUT_FEATURES.length) clearInterval(t); }, 60);
    return () => clearInterval(t);
  }, []);

  return (
    <div style={{ display:'flex', flexDirection:'column', gap:'1rem' }}>
      {/* Hero */}
      <div style={{ background:'linear-gradient(135deg,rgba(0,180,216,0.08),rgba(21,101,192,0.12))', border:'1px solid var(--border2)', borderRadius:20, padding:'2.5rem 2rem', textAlign:'center', position:'relative', overflow:'hidden' }}>
        <div style={{ position:'absolute', inset:0, backgroundImage:'linear-gradient(rgba(0,180,216,0.03) 1px,transparent 1px),linear-gradient(90deg,rgba(0,180,216,0.03) 1px,transparent 1px)', backgroundSize:'30px 30px', pointerEvents:'none' }}/>
        <div style={{ position:'relative', zIndex:1 }}>
          <div style={{ fontSize:'3rem', marginBottom:12 }}>🧭</div>
          <div style={{ fontFamily:'Orbitron,monospace', fontSize:'1.6rem', fontWeight:900, letterSpacing:'0.08em', marginBottom:4 }}>NAVISPHERE<span style={{color:'var(--cyan)'}}>X</span></div>
          <div style={{ fontSize:'0.7rem', color:'var(--cyan)', letterSpacing:'0.2em', textTransform:'uppercase', marginBottom:16 }}>MARINE SYSTEMS</div>
          <div style={{ fontSize:'0.9rem', color:'var(--text2)', lineHeight:1.8, maxWidth:560, margin:'0 auto', marginBottom:20 }}>
            A professional maritime web platform built by a serving officer, designed for navigators, officers, and maritime students worldwide.
          </div>
          <div style={{ display:'flex', gap:10, justifyContent:'center', flexWrap:'wrap' }}>
            <span style={{ padding:'4px 14px', borderRadius:100, background:'rgba(0,180,216,0.12)', border:'1px solid rgba(0,180,216,0.25)', color:'var(--cyan)', fontSize:'0.7rem', fontFamily:'Orbitron,monospace' }}>v2.0.0</span>
            <span style={{ padding:'4px 14px', borderRadius:100, background:'rgba(0,200,150,0.1)', border:'1px solid rgba(0,200,150,0.25)', color:'var(--green)', fontSize:'0.7rem' }}>🆓 Free to Use</span>
            <span style={{ padding:'4px 14px', borderRadius:100, background:'rgba(240,165,0,0.1)', border:'1px solid rgba(240,165,0,0.25)', color:'var(--gold)', fontSize:'0.7rem' }}>⚓ Built for Seafarers</span>
          </div>
        </div>
      </div>

      {/* What is */}
      <div style={{ background:'var(--card)', border:'1px solid var(--border)', borderRadius:16, padding:'1.4rem' }}>
        <div style={{ fontFamily:'Orbitron,monospace', fontSize:'0.84rem', fontWeight:700, color:'var(--cyan)', marginBottom:'0.8rem' }}>🌊 What is NavisphereX Marine?</div>
        <div style={{ fontSize:'0.82rem', color:'var(--text2)', lineHeight:1.9 }}>
          NavisphereX Marine is a <strong style={{color:'var(--text)'}}>free, web-based maritime tool suite</strong> designed to solve real problems faced by seafarers onboard and ashore. From planning routes to tracking sea time, from searching ports to managing certificates — everything a navigator needs, in one place.
          <br/><br/>
          Unlike generic apps, NavisphereX is built by someone who actually uses it at sea. Every feature comes from a real need encountered onboard, making it <strong style={{color:'var(--cyan)'}}>practical, accurate, and constantly evolving</strong>.
        </div>
      </div>

      {/* Features */}
      <div>
        <div style={{ fontFamily:'Orbitron,monospace', fontSize:'0.84rem', fontWeight:700, color:'var(--gold)', marginBottom:'0.9rem' }}>⚡ Features</div>
        <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(200px,1fr))', gap:'0.7rem' }}>
          {ABOUT_FEATURES.map((f,i) => (
            <div key={f.title} style={{ background:'var(--card)', border:'1px solid var(--border)', borderRadius:12, padding:'0.9rem', opacity:i<visibleCards?1:0, transform:i<visibleCards?'translateY(0)':'translateY(12px)', transition:'all 0.35s ease' }}>
              <div style={{ fontSize:'1.4rem', marginBottom:6 }}>{f.icon}</div>
              <div style={{ fontFamily:'Orbitron,monospace', fontSize:'0.62rem', fontWeight:700, color:'var(--cyan)', marginBottom:4 }}>{f.title}</div>
              <div style={{ fontSize:'0.72rem', color:'var(--text3)', lineHeight:1.5 }}>{f.desc}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Why */}
      <div style={{ background:'var(--card)', border:'1px solid var(--border)', borderRadius:16, padding:'1.4rem' }}>
        <div style={{ fontFamily:'Orbitron,monospace', fontSize:'0.84rem', fontWeight:700, color:'var(--green)', marginBottom:'0.9rem' }}>💡 Why NavisphereX?</div>
        <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(220px,1fr))', gap:'0.8rem' }}>
          {[
            {icon:'🛳',title:'Real Sea Experience',desc:'Built by a serving officer who faces these challenges daily onboard.'},
            {icon:'🔧',title:'Solves Real Problems',desc:'Every feature addresses an actual pain point in maritime operations.'},
            {icon:'🆓',title:'Free & Accessible',desc:'No paywalls, no ads. Free for all maritime professionals and students.'},
            {icon:'🔄',title:'Constantly Improving',desc:'Regular updates based on user feedback and new requirements at sea.'},
          ].map(r=>(
            <div key={r.title} style={{ display:'flex', gap:12, alignItems:'flex-start' }}>
              <div style={{ fontSize:'1.5rem', flexShrink:0 }}>{r.icon}</div>
              <div>
                <div style={{ fontFamily:'Orbitron,monospace', fontSize:'0.66rem', fontWeight:700, color:'var(--text)', marginBottom:3 }}>{r.title}</div>
                <div style={{ fontSize:'0.72rem', color:'var(--text3)', lineHeight:1.5 }}>{r.desc}</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Timeline */}
      <div style={{ background:'var(--card)', border:'1px solid var(--border)', borderRadius:16, padding:'1.4rem' }}>
        <div style={{ fontFamily:'Orbitron,monospace', fontSize:'0.84rem', fontWeight:700, color:'var(--purple)', marginBottom:'0.9rem' }}>📅 Journey So Far</div>
        <div style={{ display:'flex', flexDirection:'column', gap:'0.7rem' }}>
          {MILESTONES.map((m,i)=>(
            <div key={i} style={{ display:'flex', gap:16, alignItems:'flex-start' }}>
              <div style={{ flexShrink:0, width:60, fontFamily:'Orbitron,monospace', fontSize:'0.65rem', fontWeight:700, color:'var(--cyan)', paddingTop:2 }}>{m.year}</div>
              <div style={{ flex:1, display:'flex', gap:10, alignItems:'flex-start' }}>
                <div style={{ width:8, height:8, borderRadius:'50%', background:'var(--cyan)', marginTop:4, flexShrink:0, boxShadow:'0 0 8px var(--cyan)' }}/>
                <div style={{ fontSize:'0.78rem', color:'var(--text2)', lineHeight:1.5 }}>{m.event}</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Developer */}
      <div style={{ background:'linear-gradient(135deg,var(--card),rgba(21,101,192,0.15))', border:'1px solid rgba(0,180,216,0.3)', borderRadius:16, padding:'1.6rem', display:'flex', gap:'1.4rem', alignItems:'center', flexWrap:'wrap' }}>
        <div style={{ width:80, height:80, borderRadius:'50%', flexShrink:0, background:'linear-gradient(135deg,var(--cyan),var(--blue))', display:'flex', alignItems:'center', justifyContent:'center', fontSize:'2.2rem', boxShadow:'0 0 24px rgba(0,180,216,0.4)' }}>🧭</div>
        <div style={{ flex:1, minWidth:200 }}>
          <div style={{ fontFamily:'Orbitron,monospace', fontSize:'1rem', fontWeight:700, color:'var(--text)', marginBottom:4 }}>MANISH BHARTI</div>
          <div style={{ fontSize:'0.78rem', color:'var(--gold)', marginBottom:6 }}>2nd Officer · NavisphereX Developer</div>
          <div style={{ fontSize:'0.76rem', color:'var(--text2)', lineHeight:1.7, marginBottom:10 }}>
            A serving maritime officer who builds tools to solve real problems at sea. NavisphereX Marine is a passion project born from the need for practical, accessible tools for the maritime community.
          </div>
          <div style={{ display:'flex', gap:8, flexWrap:'wrap' }}>
            <a href="https://instagram.com/manish_the_navigator" target="_blank" rel="noreferrer"
              style={{ display:'flex', alignItems:'center', gap:6, padding:'6px 12px', borderRadius:100, background:'linear-gradient(135deg,#833ab4,#fd1d1d,#fcb045)', color:'white', textDecoration:'none', fontSize:'0.72rem', fontWeight:700 }}>
              📸 @manish_the_navigator
            </a>
            <a href="mailto:navispherex@gmail.com"
              style={{ display:'flex', alignItems:'center', gap:6, padding:'6px 12px', borderRadius:100, background:'rgba(0,180,216,0.12)', border:'1px solid rgba(0,180,216,0.3)', color:'var(--cyan)', textDecoration:'none', fontSize:'0.72rem' }}>
              📧 navispherex@gmail.com
            </a>
          </div>
        </div>
      </div>

      {/* Bottom links */}
      <div style={{ display:'flex', gap:10, flexWrap:'wrap', justifyContent:'center' }}>
        {[
          {label:'⚖️ Legal & Terms',tab:'legal'},
          {label:'❓ FAQ',tab:'faq'},
          {label:'✉️ Contact Us',tab:'contact'},
        ].map(l=>(
          <button key={l.tab} className="btn btn-secondary"
            onClick={()=>setActiveSection(l.tab)}
            style={{ fontSize:'0.76rem' }}>
            {l.label}
          </button>
        ))}
      </div>
    </div>
  );
}

// ─── Legal Section (full, matches LegalPage.jsx) ──────────────────────────────
const DISCLAIMER_SECTIONS = [
  { icon:'⚠️', title:'For Reference Only', content:'NavisphereX Marine is designed as a reference and planning tool. All information, data, routes, charts, and calculations provided are for reference purposes only and must not be relied upon as the sole source for navigation decisions.' },
  { icon:'🧭', title:'Not a Substitute for Official Sources', content:'This application is NOT a substitute for official ECDIS systems, paper charts, nautical publications (NtM, Pilots, Sailing Directions), GMDSS, or any other official navigational tool. Always cross-check all data with official sources before use at sea.' },
  { icon:'📊', title:'Data Accuracy', content:'Port data, route information, vessel details, and all other data within NavisphereX Marine may not be 100% accurate, complete, or current. Data is sourced from publicly available databases and may contain errors or outdated information. Users must verify all data against official publications.' },
  { icon:'⚖️', title:'No Liability', content:'The developer (Manish Bharti) accepts no responsibility or liability for any navigational decisions, incidents, accidents, losses, or damages arising from the use of this application. By using NavisphereX Marine, you accept full responsibility for verifying all information independently.' },
  { icon:'🔄', title:'Data Currency', content:'Maritime data changes frequently — port restrictions, traffic schemes, regulations, and notices. NavisphereX Marine may not reflect the most current state of any port, route, or maritime zone. Always check current Notice to Mariners (NtM) and local port authority notices.' },
  { icon:'✅', title:'Acceptance', content:'Use of this application implies full acceptance of this disclaimer. If you do not agree with these terms, please discontinue use of NavisphereX Marine immediately.' },
];
const TC_SECTIONS = [
  { icon:'👥', title:'1. Who Can Use This App', content:'NavisphereX Marine is intended for maritime professionals, maritime students, shore-based maritime personnel, and anyone with a legitimate interest in maritime information. Users must be 16 years of age or older to register.' },
  { icon:'📝', title:'2. Account Registration', content:'To access certain features, you must create an account with a valid email address and password. You are responsible for maintaining the confidentiality of your account credentials. You must provide accurate information during registration. One account per user. Do not share your account with others.' },
  { icon:'✅', title:'3. Acceptable Use', content:'You agree to use NavisphereX Marine only for lawful purposes. You must not: attempt to scrape, copy, or redistribute app data or content; use the app to harass, harm, or defraud others; attempt to gain unauthorized access to any part of the app; use automated tools or bots to access the app; upload malicious content or attempt to compromise app security.' },
  { icon:'🔒', title:'4. Data Privacy', content:'We collect and store: your name, email address, rank, ship name, and profile information you provide; sea time entries and certificate data you enter; usage logs for app improvement. We do NOT sell your data to third parties. Your password is encrypted by Firebase and is never accessible to the developer.' },
  { icon:'📦', title:'5. Intellectual Property', content:'All content, design, code, and features of NavisphereX Marine are the intellectual property of Manish Bharti. You may not redistribute, resell, or commercially exploit any part of this application or its content without explicit written permission. Personal, non-commercial use is permitted and encouraged.' },
  { icon:'🔄', title:'6. Changes to the App', content:'NavisphereX Marine is a continuously evolving platform. Features may be added, modified, or removed at any time without prior notice. These Terms & Conditions may be updated at any time — continued use of the app constitutes acceptance of any changes.' },
  { icon:'🛡', title:'7. Account Suspension', content:'The developer reserves the right to suspend or terminate any user account at any time, with or without notice, for violations of these Terms & Conditions, misuse of the application, fraudulent activity, or any behavior deemed harmful to other users or the application.' },
  { icon:'⚖️', title:'8. Governing Law', content:'These Terms & Conditions are governed by the laws of India. Any disputes arising from the use of NavisphereX Marine shall be subject to the exclusive jurisdiction of the courts of India. By using this application, you consent to this jurisdiction.' },
  { icon:'📧', title:'9. Contact for Legal Queries', content:'For any questions regarding these Terms & Conditions or our Privacy Policy, please contact us at navispherex@gmail.com or via the Contact Us page. We will endeavour to respond within 48 hours.' },
];
const PRIVACY_SECTIONS = [
  { icon:'📦', title:'What We Collect', content:'Name, email, phone, rank, ship name, sea time entries, certificate records, and usage data you voluntarily provide.' },
  { icon:'🎯', title:'How We Use It', content:'To provide app features, personalise your experience, respond to support queries, and improve the app. We do not use your data for advertising.' },
  { icon:'🔐', title:'Data Storage', content:'Data is stored on Google Firebase (Firestore) with industry-standard encryption. Your password is never stored or accessible in plain text.' },
  { icon:'🚫', title:'Data Sharing', content:'We do not sell, trade, or transfer your data to third parties. Data may be shared only if required by law.' },
  { icon:'🗑', title:'Your Rights', content:'You may request deletion of your account and all associated data at any time by contacting navispherex@gmail.com.' },
  { icon:'🍪', title:'Cookies', content:'We use localStorage and sessionStorage for app preferences (theme, tabs). No third-party tracking cookies are used.' },
  { icon:'📧', title:'Contact', content:'Privacy queries: navispherex@gmail.com' },
];

function LegalSection({ setActiveSection }) {
  const [activeTab, setActiveTab] = useState('disclaimer');
  const LegalItem = ({icon,title,content}) => (
    <div style={{ background:'var(--card)', border:'1px solid var(--border)', borderRadius:12, padding:'1rem 1.2rem', marginBottom:'0.7rem', display:'flex', gap:12 }}>
      <div style={{ fontSize:'1.2rem', flexShrink:0, marginTop:2 }}>{icon}</div>
      <div>
        <div style={{ fontFamily:'Orbitron,monospace', fontSize:'0.72rem', fontWeight:700, color:'var(--cyan)', marginBottom:6 }}>{title}</div>
        <div style={{ fontSize:'0.78rem', color:'var(--text2)', lineHeight:1.8 }}>{content}</div>
      </div>
    </div>
  );
  return (
    <div>
      <div style={{ display:'flex', background:'var(--card)', border:'1px solid var(--border)', borderRadius:12, padding:6, marginBottom:'1.2rem', gap:6 }}>
        {[{k:'disclaimer',icon:'⚠️',label:'Disclaimer'},{k:'terms',icon:'📋',label:'Terms & Conditions'},{k:'privacy',icon:'🔒',label:'Privacy Policy'}].map(t=>(
          <button key={t.k} onClick={()=>setActiveTab(t.k)}
            style={{ flex:1, padding:'10px 16px', borderRadius:9, border:'none', cursor:'pointer', fontFamily:'Exo 2,sans-serif', fontSize:'0.8rem', fontWeight:600, transition:'all 0.2s',
              background:activeTab===t.k?'linear-gradient(135deg,var(--cyan),var(--blue))':'transparent',
              color:activeTab===t.k?'white':'var(--text2)' }}>
            {t.icon} {t.label}
          </button>
        ))}
      </div>
      <div style={{ fontSize:'0.68rem', color:'var(--text3)', marginBottom:'1rem', textAlign:'right' }}>Last updated: June 2026</div>
      {activeTab==='disclaimer' && (<>
        <div className="info-box" style={{ marginBottom:'1rem', borderColor:'rgba(240,165,0,0.3)', color:'var(--gold)' }}>
          ⚠️ <strong>Important:</strong> NavisphereX Marine is for reference and planning only. It must never be used as the sole source for navigation at sea.
        </div>
        {DISCLAIMER_SECTIONS.map((s,i)=><LegalItem key={i} {...s}/>)}
      </>)}
      {activeTab==='terms' && (<>
        <div className="info-box" style={{ marginBottom:'1rem' }}>📋 By creating an account and using NavisphereX Marine, you agree to all terms listed below.</div>
        {TC_SECTIONS.map((s,i)=><LegalItem key={i} {...s}/>)}
      </>)}
      {activeTab==='privacy' && (<>
        <div className="info-box" style={{ marginBottom:'1rem' }}>🔒 We value your privacy. Here's exactly what we collect and how we use it.</div>
        {PRIVACY_SECTIONS.map((s,i)=><LegalItem key={i} {...s}/>)}
      </>)}
      <div style={{ marginTop:'1.4rem', display:'flex', gap:10, flexWrap:'wrap', justifyContent:'center' }}>
        <button className="btn btn-secondary" onClick={()=>setActiveSection('contact')} style={{ fontSize:'0.76rem' }}>📧 Legal Queries — Contact Us</button>
        <button className="btn btn-secondary" onClick={()=>setActiveSection('about')} style={{ fontSize:'0.76rem' }}>🧭 About NavisphereX</button>
      </div>
    </div>
  );
}

// ─── FAQ Section (full, matches FAQPage.jsx) ──────────────────────────────────
const FAQ_CATEGORIES = [
  { category:'🚀 Getting Started', color:'var(--cyan)', items:[
    {q:'What is NavisphereX Marine?',a:'NavisphereX Marine is a free, professional-grade maritime web application built by a serving 2nd Officer. It provides tools for route planning, port search, sea time calculation, certificate tracking, vessel search, and much more — all in one place.'},
    {q:'Do I need to create an account to use the app?',a:'Some features are available without an account, but most features require a free registered account. Creating an account takes less than a minute and gives you full access to all tools including Sea Time Calculator, Certificate Tracker, and Crew Journey.'},
    {q:'Is NavisphereX Marine free to use?',a:'Yes! NavisphereX Marine is completely free to use. There is a Free tier (default) and a Paid tier with extended download limits. Core tools like Sea Time, Port Search, and Certificate Tracker are always free.'},
    {q:'What devices does it work on?',a:'NavisphereX Marine is a web application — it works on any modern browser on desktop, laptop, tablet, or mobile phone. No app download is required.'},
  ]},
  { category:'⚓ Port & Route Features', color:'var(--gold)', items:[
    {q:'How many ports are in the database?',a:'The port database contains 27,000+ world ports, sourced from UN/LOCODE and official maritime databases. Each port includes coordinates, country, and other details.'},
    {q:'Can I plan an actual navigation route?',a:'Yes! The Route Planner and Nav Mode provide ECDIS-style interactive route planning with waypoints, ETAs, and visual map display. However, these are planning tools only — always verify routes with official charts and publications.'},
    {q:'How do I download ECDIS charts?',a:'ECDIS charts are available in the Charts section after logging in. You can filter by brand (Furuno, JRC, Transas, etc.) and port. Download limits apply based on your account tier.'},
    {q:'Why is a port missing from the database?',a:'While we have 27,000+ ports, some smaller or newer ports may be missing. Please use the "Write to Us" contact form (category: Data Update Request) to report any missing ports and we will add them.'},
  ]},
  { category:'⏱ Sea Time & Certificates', color:'var(--green)', items:[
    {q:'How does the Sea Time Calculator work?',a:'The Sea Time Calculator lets you add multiple voyages/contracts with start and end dates, vessel name, and rank. It automatically calculates total days, months, and years of sea service — useful for CoC applications and career tracking.'},
    {q:'Is my sea time data safe?',a:'Yes. Your sea time entries are saved to your personal Firestore account and are only accessible to you. The developer cannot access your sea time data.'},
    {q:'Can I export my sea time records?',a:'Yes, the Sea Time Calculator supports Excel export of your full service record. This is useful for MMD applications and interview preparation.'},
    {q:'How does the Certificate Tracker work?',a:'Add your certificates with their expiry dates and the tracker will alert you before they expire. You can set reminder periods (e.g. 3 months, 1 month before expiry) so you never miss a renewal.'},
  ]},
  { category:'🔐 Account & Security', color:'var(--purple)', items:[
    {q:'I forgot my password. What do I do?',a:'On the Login page, click "Forgot Password" and enter your email address. A password reset link will be sent to your email. If you face issues, contact us at navispherex@gmail.com.'},
    {q:'How do I change my profile information?',a:'Go to My Account (accessible when logged in) to update your name, rank, ship name, phone, and other profile details.'},
    {q:'Can I delete my account?',a:'Yes. Contact us at navispherex@gmail.com or via the Contact Us page to request account deletion. All your data will be permanently removed within 7 days.'},
    {q:'What is the difference between Free and Paid tier?',a:'Free tier gives access to all core features with standard download limits for routes and charts. Paid tier increases download limits. Most tools (Sea Time, Port Search, Certificates, etc.) are unlimited on both tiers.'},
  ]},
  { category:'📱 Technical Issues', color:'var(--red)', items:[
    {q:'The app is loading slowly. What can I do?',a:'NavisphereX loads a large port database (~27,000 ports) on first use, which may take a moment. After the initial load, data is cached in your browser for fast offline access. Try refreshing if it seems stuck.'},
    {q:'The map is showing a blank/dark screen.',a:'This is a known Leaflet map issue when switching tabs. Try clicking the refresh or back button, or navigate away and return to the map page. We have implemented fixes for this and continue to improve stability.'},
    {q:'Will it work offline?',a:'Partially. Once data is loaded, routes, charts, and port data are cached to your browser (IndexedDB) and accessible offline. However, features requiring live data (vessel search, sheet sync) need an internet connection.'},
    {q:'I found a bug. How do I report it?',a:'We really appreciate bug reports! Use the Contact Us / Write to Us page, select category "Bug / Error Report" and priority "Urgent" if it is critical. Include a screenshot if possible — it helps us fix issues faster.'},
  ]},
];

function FAQItem({ q, a }) {
  const [open, setOpen] = useState(false);
  return (
    <div style={{ border:'1px solid', borderRadius:10, overflow:'hidden', marginBottom:'0.5rem', transition:'all 0.2s', borderColor:open?'rgba(0,180,216,0.3)':'var(--border)' }}>
      <button onClick={()=>setOpen(o=>!o)}
        style={{ width:'100%', padding:'0.9rem 1rem', background:open?'rgba(0,180,216,0.05)':'var(--card)', border:'none', color:'var(--text)', fontFamily:'Exo 2,sans-serif', fontSize:'0.82rem', fontWeight:600, textAlign:'left', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'space-between', gap:12, transition:'all 0.2s' }}>
        <span style={{ flex:1 }}>{q}</span>
        <span style={{ fontSize:'1rem', color:'var(--cyan)', transition:'transform 0.25s', transform:open?'rotate(180deg)':'rotate(0deg)', flexShrink:0 }}>▾</span>
      </button>
      {open && (
        <div style={{ padding:'0 1rem 0.9rem', background:'rgba(0,0,0,0.15)', fontSize:'0.78rem', color:'var(--text2)', lineHeight:1.8, borderTop:'1px solid rgba(0,180,216,0.1)', paddingTop:'0.8rem' }}>
          {a}
        </div>
      )}
    </div>
  );
}

function FAQSection({ setActiveSection }) {
  const [search, setSearch]           = useState('');
  const [openCategory, setOpenCategory] = useState(0);
  const filtered = search.trim()
    ? FAQ_CATEGORIES.map(cat=>({...cat, items:cat.items.filter(item=>item.q.toLowerCase().includes(search.toLowerCase())||item.a.toLowerCase().includes(search.toLowerCase()))})).filter(cat=>cat.items.length>0)
    : FAQ_CATEGORIES;

  return (
    <div>
      <div style={{ position:'relative', marginBottom:'1.4rem' }}>
        <span style={{ position:'absolute', left:12, top:'50%', transform:'translateY(-50%)', fontSize:'1rem', color:'var(--text3)', pointerEvents:'none' }}>🔍</span>
        <input className="fi" placeholder="Search FAQs…" value={search} onChange={e=>setSearch(e.target.value)} style={{ paddingLeft:38 }}/>
        {search && <button onClick={()=>setSearch('')} style={{ position:'absolute', right:10, top:'50%', transform:'translateY(-50%)', background:'none', border:'none', color:'var(--text3)', cursor:'pointer', fontSize:'1rem' }}>✕</button>}
      </div>
      {search && <div style={{ fontSize:'0.72rem', color:'var(--text3)', marginBottom:'0.8rem' }}>{filtered.reduce((a,c)=>a+c.items.length,0)} result(s) for "{search}"</div>}
      {filtered.length===0
        ? <div className="empty"><div className="empty-icon">❓</div><div className="empty-t">No results found</div><div className="empty-d">Try a different search term</div></div>
        : filtered.map((cat,ci)=>{
          const isOpen = search ? true : openCategory===ci;
          return (
            <div key={cat.category} style={{ marginBottom:'1rem' }}>
              <button onClick={()=>setOpenCategory(openCategory===ci?null:ci)}
                style={{ width:'100%', padding:'0.8rem 1rem', background:'var(--card2)', border:'1px solid var(--border2)', borderRadius:12, cursor:'pointer', color:cat.color, fontFamily:'Orbitron,monospace', fontSize:'0.76rem', fontWeight:700, textAlign:'left', display:'flex', alignItems:'center', justifyContent:'space-between', gap:8, transition:'all 0.2s', marginBottom:isOpen?8:0 }}>
                <span>{cat.category}</span>
                <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                  <span style={{ fontSize:'0.62rem', padding:'2px 8px', borderRadius:100, background:'rgba(255,255,255,0.07)', color:'var(--text3)', fontFamily:'Exo 2,sans-serif' }}>{cat.items.length} questions</span>
                  <span style={{ transition:'transform 0.25s', transform:isOpen?'rotate(180deg)':'rotate(0deg)', fontSize:'0.9rem' }}>▾</span>
                </div>
              </button>
              {isOpen && cat.items.map((item,ii)=><FAQItem key={ii} q={item.q} a={item.a}/>)}
            </div>
          );
        })
      }
      <div style={{ background:'linear-gradient(135deg,rgba(0,180,216,0.06),rgba(21,101,192,0.1))', border:'1px solid rgba(0,180,216,0.2)', borderRadius:16, padding:'1.4rem', textAlign:'center', marginTop:'1.4rem' }}>
        <div style={{ fontSize:'1.8rem', marginBottom:8 }}>💬</div>
        <div style={{ fontFamily:'Orbitron,monospace', fontSize:'0.78rem', fontWeight:700, color:'var(--cyan)', marginBottom:6 }}>Still Have a Question?</div>
        <div style={{ fontSize:'0.76rem', color:'var(--text2)', marginBottom:'1rem', lineHeight:1.6 }}>Can't find what you're looking for? Reach out directly — we're happy to help!</div>
        <button className="btn btn-primary" style={{ justifyContent:'center' }} onClick={()=>setActiveSection('contact')}>✉️ Contact Us</button>
      </div>
    </div>
  );
}

// ─── MAIN INFO PAGE ───────────────────────────────────────────────────────────
export default function InfoPage({ notify, user, setTab }) {
  const [activeSection, setActiveSection] = useState(null);

  const CARDS = [
    { id:'contact', icon:'✉️', label:'Contact Us',  sub:'Get in touch · Write to us · Report issues', color:'var(--cyan)',   bg:'linear-gradient(135deg,rgba(0,180,216,0.15),rgba(21,101,192,0.1))',  accent:'rgba(0,180,216,0.4)' },
    { id:'about',   icon:'🧭', label:'About',        sub:'About NavisphereX · Developer · Features',  color:'var(--gold)',   bg:'linear-gradient(135deg,rgba(240,165,0,0.15),rgba(212,144,10,0.08))', accent:'rgba(240,165,0,0.4)' },
    { id:'legal',   icon:'⚖️', label:'Legal',        sub:'Disclaimer · Terms & Conditions · Privacy', color:'#A78BFA',      bg:'linear-gradient(135deg,rgba(124,58,237,0.15),rgba(124,58,237,0.08))', accent:'rgba(124,58,237,0.4)' },
    { id:'faq',     icon:'❓', label:'FAQ',           sub:'Frequently asked questions · Help',         color:'var(--green)', bg:'linear-gradient(135deg,rgba(0,200,150,0.15),rgba(0,168,122,0.08))',  accent:'rgba(0,200,150,0.4)' },
  ];

  const activeCard = CARDS.find(c=>c.id===activeSection);

  // ── Sub-page view ──
  if (activeSection) {
    return (
      <div style={{ maxWidth:900, margin:'0 auto', padding:'1.2rem' }}>
        {/* Back header */}
        <div style={{ display:'flex', alignItems:'center', gap:12, marginBottom:'1.4rem' }}>
          <button onClick={()=>setActiveSection(null)}
            style={{ background:'rgba(255,255,255,0.06)', border:'1px solid var(--border)', borderRadius:9, padding:'7px 13px', cursor:'pointer', color:'var(--text2)', fontFamily:'Exo 2,sans-serif', fontSize:'0.78rem', display:'flex', alignItems:'center', gap:6, transition:'all 0.2s', flexShrink:0 }}
            onMouseEnter={e=>{e.currentTarget.style.borderColor='var(--cyan)';e.currentTarget.style.color='var(--cyan)';}}
            onMouseLeave={e=>{e.currentTarget.style.borderColor='var(--border)';e.currentTarget.style.color='var(--text2)';}}>
            ← Back
          </button>
          <div style={{ display:'flex', alignItems:'center', gap:10, flex:1 }}>
            <div style={{ width:36, height:36, borderRadius:10, background:activeCard?.bg, border:`1px solid ${activeCard?.accent}`, display:'flex', alignItems:'center', justifyContent:'center', fontSize:'1.3rem', flexShrink:0 }}>
              {activeCard?.icon}
            </div>
            <div>
              <div style={{ fontFamily:'Orbitron,monospace', fontSize:'0.88rem', fontWeight:700, color:activeCard?.color }}>{activeCard?.label}</div>
              <div style={{ fontSize:'0.64rem', color:'var(--text3)', marginTop:1 }}>Help &amp; Info</div>
            </div>
          </div>
        </div>
        <div style={{ height:1, background:`linear-gradient(90deg,${activeCard?.accent||'var(--border)'},transparent)`, marginBottom:'1.4rem' }}/>

        {activeSection==='contact' && <ContactSection notify={notify} user={user}/>}
        {activeSection==='about'   && <AboutSection setActiveSection={setActiveSection}/>}
        {activeSection==='legal'   && <LegalSection setActiveSection={setActiveSection}/>}
        {activeSection==='faq'     && <FAQSection setActiveSection={setActiveSection}/>}
      </div>
    );
  }

  // ── Cards grid ──
  return (
    <div style={{ maxWidth:900, margin:'0 auto', padding:'1.2rem' }}>
      <div style={{ marginBottom:'1.8rem', textAlign:'center' }}>
        <div style={{ fontFamily:'Orbitron,monospace', fontSize:'1.2rem', fontWeight:900, marginBottom:6, letterSpacing:'0.06em' }}>
          HELP <span style={{color:'var(--cyan)'}}>&amp; INFO</span>
        </div>
        <div style={{ fontSize:'0.78rem', color:'var(--text2)' }}>Contact us, learn about the app, or find quick answers</div>
      </div>

      <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(200px,1fr))', gap:'1rem' }}>
        {CARDS.map(card=>(
          <div key={card.id} onClick={()=>setActiveSection(card.id)}
            style={{ background:card.bg, border:`1px solid ${card.accent}`, borderRadius:16, padding:'1.6rem 1.2rem', cursor:'pointer', transition:'all 0.22s', textAlign:'center', display:'flex', flexDirection:'column', alignItems:'center', gap:10, position:'relative', overflow:'hidden' }}
            onMouseEnter={e=>{e.currentTarget.style.transform='translateY(-4px)';e.currentTarget.style.boxShadow=`0 12px 32px rgba(0,0,0,0.5),0 0 20px ${card.accent}44`;}}
            onMouseLeave={e=>{e.currentTarget.style.transform='translateY(0)';e.currentTarget.style.boxShadow='none';}}>
            <div style={{ position:'absolute', top:0, left:0, right:0, height:2, background:`linear-gradient(90deg,transparent,${card.color},transparent)` }}/>
            <div style={{ fontSize:'2.4rem', lineHeight:1 }}>{card.icon}</div>
            <div style={{ fontFamily:'Orbitron,monospace', fontSize:'0.76rem', fontWeight:700, color:card.color }}>{card.label}</div>
            <div style={{ fontSize:'0.66rem', color:'var(--text3)', lineHeight:1.6 }}>{card.sub}</div>
            <div style={{ marginTop:4, width:32, height:32, borderRadius:'50%', background:`${card.color}18`, border:`1px solid ${card.color}44`, display:'flex', alignItems:'center', justifyContent:'center', fontSize:'0.9rem', color:card.color }}>→</div>
          </div>
        ))}
      </div>

      <div style={{ marginTop:'2rem', padding:'1rem', background:'var(--card)', border:'1px solid var(--border)', borderRadius:12, display:'flex', alignItems:'center', gap:12 }}>
        <div style={{ fontSize:'1.6rem', flexShrink:0 }}>🧭</div>
        <div>
          <div style={{ fontFamily:'Orbitron,monospace', fontSize:'0.66rem', color:'var(--cyan)', marginBottom:2 }}>NAVISPHERE<span style={{color:'var(--text3)'}}>X</span> MARINE</div>
          <div style={{ fontSize:'0.68rem', color:'var(--text3)', lineHeight:1.5 }}>Built by <strong style={{color:'var(--text2)'}}>Manish Bharti · 2nd Officer</strong> · For any help, reach us via Contact Us above.</div>
        </div>
      </div>
    </div>
  );
}
