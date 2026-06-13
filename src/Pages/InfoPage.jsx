/* eslint-disable */
// src/Pages/InfoPage.jsx — Help & Info combined page
import { useState } from "react";

// ─── Inline content for each section ─────────────────────────────────────────

function ContactSection({ notify, user }) {
  const [form, setForm] = useState({
    name: user?.displayName || '', email: user?.email || '',
    userType: '', category: '', priority: 'medium', subject: '', message: '', rating: 0,
  });
  const [loading, setLoading]   = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [refId, setRefId]       = useState('');

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

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
      await addDoc(collection(db, 'contactMessages'), {
        name:form.name, email:form.email, userType:form.userType,
        category:form.category, priority:form.priority, subject:form.subject,
        message:form.message, rating:form.rating, refId:ref,
        read:false, userId:user?.uid||null, createdAt:serverTimestamp(),
      });
      setSubmitted(true);
      notify && notify('✅ Message sent!','success');
    } catch(e) { notify && notify('Failed: '+e.message,'error'); }
    setLoading(false);
  };

  if (submitted) return (
    <div style={{ background:'var(--card)', border:'1px solid rgba(0,200,150,0.3)', borderRadius:14, padding:'1.5rem', textAlign:'center' }}>
      <div style={{ fontSize:'2.5rem', marginBottom:8 }}>✅</div>
      <div style={{ fontFamily:'Orbitron,monospace', fontSize:'0.88rem', color:'var(--green)', marginBottom:6 }}>Message Sent!</div>
      <div style={{ fontSize:'0.78rem', color:'var(--text2)', marginBottom:12 }}>
        Thank you, <strong style={{color:'var(--cyan)'}}>{form.name}</strong>! We typically respond within <strong style={{color:'var(--gold)'}}>48 hours</strong>.
      </div>
      <div style={{ fontFamily:'Orbitron,monospace', fontSize:'0.72rem', color:'var(--cyan)', padding:'8px 14px', background:'rgba(0,180,216,0.07)', borderRadius:8, marginBottom:12 }}>Ref: {refId}</div>
      <button className="btn btn-secondary" onClick={() => { setSubmitted(false); setForm({name:user?.displayName||'',email:user?.email||'',userType:'',category:'',priority:'medium',subject:'',message:'',rating:0}); }}>
        ✉️ Send Another
      </button>
    </div>
  );

  return (
    <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(280px,1fr))', gap:'1rem' }}>
      {/* Static info */}
      <div style={{ display:'flex', flexDirection:'column', gap:'0.7rem' }}>
        <div style={{ background:'linear-gradient(135deg,var(--card),var(--card2))', border:'1px solid var(--border2)', borderRadius:14, padding:'1.2rem', textAlign:'center' }}>
          <div style={{ fontSize:'2rem', marginBottom:6 }}>🧭</div>
          <div style={{ fontFamily:'Orbitron,monospace', fontSize:'0.78rem', color:'var(--cyan)', marginBottom:2 }}>MANISH BHARTI</div>
          <div style={{ fontSize:'0.7rem', color:'var(--gold)' }}>2nd Officer · Developer</div>
          <div style={{ fontSize:'0.64rem', color:'var(--text3)', marginTop:4, fontStyle:'italic' }}>"Built at sea, for the sea"</div>
        </div>
        {[
          { icon:'📧', label:'Email', value:'navispherex@gmail.com', link:'mailto:navispherex@gmail.com' },
          { icon:'💬', label:'WhatsApp', value:'+91 95825 25349', link:'https://wa.me/919582525349' },
          { icon:'📸', label:'Instagram', value:'@manish_the_navigator', link:'https://instagram.com/manish_the_navigator' },
        ].map(c => (
          <div key={c.label} style={{ background:'var(--card)', border:'1px solid var(--border)', borderRadius:10, padding:'0.75rem 1rem', display:'flex', alignItems:'center', gap:10 }}>
            <div style={{ fontSize:'1.2rem', flexShrink:0 }}>{c.icon}</div>
            <div>
              <div style={{ fontSize:'0.58rem', color:'var(--text3)', textTransform:'uppercase', letterSpacing:'0.1em', marginBottom:2 }}>{c.label}</div>
              <a href={c.link} target="_blank" rel="noreferrer" style={{ fontSize:'0.76rem', color:'var(--cyan)', textDecoration:'none', fontWeight:600 }}>{c.value}</a>
            </div>
          </div>
        ))}
        <div className="info-box" style={{ marginBottom:0 }}>⏱ Typically responds within <strong>48 hours</strong>. WhatsApp is fastest for urgent queries.</div>
      </div>

      {/* Form */}
      <div style={{ background:'var(--card)', border:'1px solid var(--border2)', borderRadius:14, padding:'1.2rem' }}>
        <div style={{ fontFamily:'Orbitron,monospace', fontSize:'0.76rem', color:'var(--cyan)', marginBottom:'1rem' }}>✍️ Write to Us</div>
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:8 }}>
          <div className="ff" style={{margin:0}}><label className="fl">Name *</label><input className="fi" placeholder="Full name" value={form.name} onChange={e=>set('name',e.target.value)} /></div>
          <div className="ff" style={{margin:0}}><label className="fl">Email *</label><input className="fi" type="email" placeholder="your@email.com" value={form.email} onChange={e=>set('email',e.target.value)} /></div>
          <div className="ff" style={{margin:0}}><label className="fl">You are a…</label>
            <select className="fi" value={form.userType} onChange={e=>set('userType',e.target.value)}>
              <option value="">Optional</option>
              {USER_TYPES.map(t=><option key={t.value} value={t.value}>{t.label}</option>)}
            </select>
          </div>
          <div className="ff" style={{margin:0}}><label className="fl">Category *</label>
            <select className="fi" value={form.category} onChange={e=>set('category',e.target.value)}>
              <option value="">Select</option>
              {CATEGORIES.map(c=><option key={c.value} value={c.value}>{c.label}</option>)}
            </select>
          </div>
          <div className="ff" style={{gridColumn:'1/-1',margin:0}}>
            <label className="fl">Priority</label>
            <div style={{display:'flex',gap:6}}>
              {PRIORITIES.map(p=>(
                <button key={p.value} type="button" onClick={()=>set('priority',p.value)}
                  style={{flex:1,padding:'7px 4px',borderRadius:8,border:'1px solid',cursor:'pointer',fontFamily:'Exo 2,sans-serif',fontSize:'0.68rem',transition:'all 0.2s',
                    borderColor:form.priority===p.value?p.color:'var(--border)',
                    background:form.priority===p.value?`${p.color}18`:'transparent',
                    color:form.priority===p.value?p.color:'var(--text3)',
                    fontWeight:form.priority===p.value?700:400}}>
                  {p.label}
                </button>
              ))}
            </div>
          </div>
          <div className="ff" style={{gridColumn:'1/-1',margin:0}}><label className="fl">Subject *</label><input className="fi" placeholder="Brief subject" value={form.subject} onChange={e=>set('subject',e.target.value)} /></div>
          <div className="ff" style={{gridColumn:'1/-1',margin:0}}><label className="fl">Message *</label><textarea className="fi" rows={3} placeholder="Describe your query, suggestion or issue…" value={form.message} onChange={e=>set('message',e.target.value)} /></div>
        </div>
        <button className="btn btn-primary" style={{width:'100%',justifyContent:'center',marginTop:10}} onClick={handleSubmit} disabled={loading}>
          {loading?<><div className="spin" style={{width:14,height:14}}/>Sending…</>:'📨 Send Message'}
        </button>
        <div style={{fontSize:'0.62rem',color:'var(--text3)',marginTop:6}}>🔒 Your data is stored securely. We never share your information.</div>
      </div>
    </div>
  );
}

function AboutSection() {
  const FEATURES = [
    {icon:'🗺',title:'Route Planner'},{icon:'⚓',title:'Port Database'},{icon:'📡',title:'ECDIS Charts'},
    {icon:'🛳',title:'Vessel Search'},{icon:'⏱',title:'Sea Time Calc'},{icon:'📜',title:'Certificates'},
    {icon:'🧮',title:'Voyage Calc'},{icon:'📚',title:'Library'},{icon:'🔭',title:'Compass Error'},
    {icon:'🚨',title:'Emergency'},{icon:'📢',title:'Port Notices'},{icon:'🪢',title:'Knots'},
  ];
  return (
    <div style={{display:'flex',flexDirection:'column',gap:'1rem'}}>
      <div style={{background:'linear-gradient(135deg,rgba(0,180,216,0.07),rgba(21,101,192,0.1))',border:'1px solid var(--border2)',borderRadius:16,padding:'1.8rem',textAlign:'center',position:'relative',overflow:'hidden'}}>
        <div style={{position:'absolute',inset:0,backgroundImage:'linear-gradient(rgba(0,180,216,0.03) 1px,transparent 1px),linear-gradient(90deg,rgba(0,180,216,0.03) 1px,transparent 1px)',backgroundSize:'30px 30px',pointerEvents:'none'}}/>
        <div style={{position:'relative',zIndex:1}}>
          <div style={{fontSize:'2.5rem',marginBottom:8}}>🧭</div>
          <div style={{fontFamily:'Orbitron,monospace',fontSize:'1.4rem',fontWeight:900,marginBottom:4}}>NAVISPHERE<span style={{color:'var(--cyan)'}}>X</span></div>
          <div style={{fontSize:'0.64rem',color:'var(--cyan)',letterSpacing:'0.2em',marginBottom:12}}>MARINE SYSTEMS</div>
          <div style={{fontSize:'0.8rem',color:'var(--text2)',lineHeight:1.8,maxWidth:480,margin:'0 auto'}}>A professional maritime web platform built by a serving officer, designed for navigators, officers, and maritime students worldwide.</div>
          <div style={{display:'flex',gap:8,justifyContent:'center',flexWrap:'wrap',marginTop:12}}>
            <span style={{padding:'3px 12px',borderRadius:100,background:'rgba(0,180,216,0.12)',border:'1px solid rgba(0,180,216,0.25)',color:'var(--cyan)',fontSize:'0.68rem',fontFamily:'Orbitron,monospace'}}>v2.0.0</span>
            <span style={{padding:'3px 12px',borderRadius:100,background:'rgba(0,200,150,0.1)',border:'1px solid rgba(0,200,150,0.25)',color:'var(--green)',fontSize:'0.68rem'}}>🆓 Free to Use</span>
            <span style={{padding:'3px 12px',borderRadius:100,background:'rgba(240,165,0,0.1)',border:'1px solid rgba(240,165,0,0.25)',color:'var(--gold)',fontSize:'0.68rem'}}>⚓ Built for Seafarers</span>
          </div>
        </div>
      </div>
      <div style={{background:'var(--card)',border:'1px solid var(--border)',borderRadius:14,padding:'1.2rem'}}>
        <div style={{fontFamily:'Orbitron,monospace',fontSize:'0.76rem',color:'var(--cyan)',marginBottom:10}}>⚡ Features</div>
        <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(130px,1fr))',gap:8}}>
          {FEATURES.map(f=>(
            <div key={f.title} style={{background:'var(--bg2)',borderRadius:8,padding:'8px 10px',display:'flex',alignItems:'center',gap:8}}>
              <span style={{fontSize:'1.1rem'}}>{f.icon}</span>
              <span style={{fontSize:'0.7rem',color:'var(--text2)'}}>{f.title}</span>
            </div>
          ))}
        </div>
      </div>
      <div style={{background:'linear-gradient(135deg,var(--card),rgba(21,101,192,0.12))',border:'1px solid rgba(0,180,216,0.25)',borderRadius:14,padding:'1.4rem',display:'flex',gap:'1.2rem',alignItems:'center',flexWrap:'wrap'}}>
        <div style={{width:64,height:64,borderRadius:'50%',flexShrink:0,background:'linear-gradient(135deg,var(--cyan),var(--blue))',display:'flex',alignItems:'center',justifyContent:'center',fontSize:'1.8rem',boxShadow:'0 0 20px rgba(0,180,216,0.35)'}}>🧭</div>
        <div style={{flex:1,minWidth:180}}>
          <div style={{fontFamily:'Orbitron,monospace',fontSize:'0.9rem',fontWeight:700,marginBottom:3}}>MANISH BHARTI</div>
          <div style={{fontSize:'0.74rem',color:'var(--gold)',marginBottom:6}}>2nd Officer · NavisphereX Developer</div>
          <div style={{fontSize:'0.74rem',color:'var(--text2)',lineHeight:1.7,marginBottom:8}}>A serving maritime officer building tools to solve real problems at sea.</div>
          <div style={{display:'flex',gap:8,flexWrap:'wrap'}}>
            <a href="https://instagram.com/manish_the_navigator" target="_blank" rel="noreferrer" style={{display:'flex',alignItems:'center',gap:5,padding:'5px 10px',borderRadius:100,background:'linear-gradient(135deg,#833ab4,#fd1d1d,#fcb045)',color:'white',textDecoration:'none',fontSize:'0.7rem',fontWeight:700}}>📸 @manish_the_navigator</a>
          </div>
        </div>
      </div>
    </div>
  );
}

function LegalSection() {
  const [activeTab, setActiveTab] = useState('disclaimer');
  const DISCLAIMER = [
    {icon:'⚠️',title:'For Reference Only',body:'NavisphereX Marine is for reference and planning only. It must not be relied upon as the sole source for navigation at sea.'},
    {icon:'🧭',title:'Not a Substitute',body:'This app is NOT a substitute for official ECDIS, charts, nautical publications, or any official navigational tool. Always cross-check with official sources.'},
    {icon:'📊',title:'Data Accuracy',body:'Port data, routes, and vessel details may not be 100% accurate or current. Always verify against official publications before use at sea.'},
    {icon:'⚖️',title:'No Liability',body:'The developer accepts no responsibility for navigational decisions made using this app. Users bear full responsibility for verifying information independently.'},
    {icon:'✅',title:'Acceptance',body:'Use of this application implies full acceptance of this disclaimer. If you do not agree, please discontinue use immediately.'},
  ];
  const TC = [
    {icon:'👥',title:'1. Who Can Use',body:'Maritime professionals, students, shore staff aged 16+. Accurate registration information required.'},
    {icon:'✅',title:'2. Acceptable Use',body:'No scraping, no bots, no misuse. Personal non-commercial use is permitted and encouraged.'},
    {icon:'🔒',title:'3. Data Privacy',body:'We store name, email, rank, sea time, and certificate data. We do not sell your data. Passwords are encrypted by Firebase.'},
    {icon:'📦',title:'4. Intellectual Property',body:'All content is the property of Manish Bharti. Personal use is permitted; commercial redistribution is not.'},
    {icon:'🛡',title:'5. Account Suspension',body:'The developer may suspend accounts for violations, misuse, or harmful behaviour at any time.'},
    {icon:'⚖️',title:'6. Governing Law',body:'Governed by Indian law. Disputes are subject to the jurisdiction of courts in India.'},
    {icon:'📧',title:'7. Contact',body:'For legal queries: navispherex@gmail.com'},
  ];
  return (
    <div>
      <div style={{display:'flex',background:'var(--card)',border:'1px solid var(--border)',borderRadius:10,padding:5,marginBottom:'1rem',gap:5}}>
        {[{k:'disclaimer',l:'⚠️ Disclaimer'},{k:'terms',l:'📋 Terms & Conditions'},{k:'privacy',l:'🔒 Privacy Policy'}].map(t=>(
          <button key={t.k} onClick={()=>setActiveTab(t.k)} style={{flex:1,padding:'8px 10px',borderRadius:8,border:'none',cursor:'pointer',fontFamily:'Exo 2,sans-serif',fontSize:'0.72rem',fontWeight:600,transition:'all 0.2s',
            background:activeTab===t.k?'linear-gradient(135deg,var(--cyan),var(--blue))':'transparent',
            color:activeTab===t.k?'white':'var(--text2)'}}>
            {t.l}
          </button>
        ))}
      </div>
      <div style={{fontSize:'0.64rem',color:'var(--text3)',marginBottom:'0.8rem',textAlign:'right'}}>Last updated: June 2026</div>
      {activeTab==='disclaimer' && (
        <>
          <div className="info-box" style={{borderColor:'rgba(240,165,0,0.3)',color:'var(--gold)',marginBottom:'0.8rem'}}>⚠️ NavisphereX Marine is for reference and planning only. Never use solely for navigation at sea.</div>
          {DISCLAIMER.map((s,i)=>(
            <div key={i} style={{background:'var(--card)',border:'1px solid var(--border)',borderRadius:10,padding:'0.9rem 1rem',marginBottom:6,display:'flex',gap:10}}>
              <span style={{fontSize:'1.1rem',flexShrink:0,marginTop:2}}>{s.icon}</span>
              <div><div style={{fontFamily:'Orbitron,monospace',fontSize:'0.64rem',color:'var(--cyan)',marginBottom:4}}>{s.title}</div><div style={{fontSize:'0.76rem',color:'var(--text2)',lineHeight:1.7}}>{s.body}</div></div>
            </div>
          ))}
        </>
      )}
      {activeTab==='terms' && (
        <>
          <div className="info-box" style={{marginBottom:'0.8rem'}}>📋 By creating an account, you agree to all terms below.</div>
          {TC.map((s,i)=>(
            <div key={i} style={{background:'var(--card)',border:'1px solid var(--border)',borderRadius:10,padding:'0.9rem 1rem',marginBottom:6,display:'flex',gap:10}}>
              <span style={{fontSize:'1.1rem',flexShrink:0,marginTop:2}}>{s.icon}</span>
              <div><div style={{fontFamily:'Orbitron,monospace',fontSize:'0.64rem',color:'var(--cyan)',marginBottom:4}}>{s.title}</div><div style={{fontSize:'0.76rem',color:'var(--text2)',lineHeight:1.7}}>{s.body}</div></div>
            </div>
          ))}
        </>
      )}
      {activeTab==='privacy' && (
        <>
          <div className="info-box" style={{marginBottom:'0.8rem'}}>🔒 We value your privacy. Here's exactly what we collect and how we use it.</div>
          {[
            {icon:'📦',title:'What We Collect',body:'Name, email, phone, rank, sea time entries, certificate records, and usage data you voluntarily provide.'},
            {icon:'🎯',title:'How We Use It',body:'To provide app features, personalise your experience, and respond to support queries. No advertising.'},
            {icon:'🔐',title:'Data Storage',body:'Stored on Google Firebase with industry-standard encryption. Passwords are never stored in plain text.'},
            {icon:'🚫',title:'Data Sharing',body:'We do not sell, trade, or transfer your data to third parties. Shared only if required by law.'},
            {icon:'🗑',title:'Your Rights',body:'Request deletion of your account and all data at any time: navispherex@gmail.com'},
          ].map((s,i)=>(
            <div key={i} style={{background:'var(--card)',border:'1px solid var(--border)',borderRadius:10,padding:'0.9rem 1rem',marginBottom:6,display:'flex',gap:10}}>
              <span style={{fontSize:'1.1rem',flexShrink:0,marginTop:2}}>{s.icon}</span>
              <div><div style={{fontFamily:'Orbitron,monospace',fontSize:'0.64rem',color:'var(--cyan)',marginBottom:4}}>{s.title}</div><div style={{fontSize:'0.76rem',color:'var(--text2)',lineHeight:1.7}}>{s.body}</div></div>
            </div>
          ))}
        </>
      )}
    </div>
  );
}

function FAQSection() {
  const [search, setSearch]     = useState('');
  const [openItem, setOpenItem] = useState(null);
  const FAQ_ITEMS = [
    {q:'What is NavisphereX Marine?',a:'A free, professional-grade maritime web application built by a serving 2nd Officer. It provides tools for route planning, port search, sea time, certificates, vessel search, and more.'},
    {q:'Is it free to use?',a:'Yes! NavisphereX Marine is completely free. There is a Free tier (default) and a Paid tier with extended download limits. Core tools are always free.'},
    {q:'How many ports are in the database?',a:'Over 27,000 world ports, sourced from UN/LOCODE and official maritime databases with coordinates and country data.'},
    {q:'How does the Sea Time Calculator work?',a:'Add voyages with start/end dates, vessel name, and rank. It automatically calculates total sea service time for CoC applications.'},
    {q:'Can I export my sea time records?',a:'Yes, the Sea Time Calculator supports Excel export of your full service record — useful for MMD applications and interviews.'},
    {q:'I forgot my password. What do I do?',a:'On the Login page, click "Forgot Password" and enter your email. A reset link will be sent. Contact navispherex@gmail.com if you need further help.'},
    {q:'The app is loading slowly.',a:'NavisphereX loads a large port database on first use. After initial load, data is cached for fast offline access. Try refreshing if stuck.'},
    {q:'I found a bug. How do I report it?',a:'Use the Contact Us form, select category "Bug / Error Report" and priority "Urgent". Attach a screenshot if possible — it helps us fix faster.'},
    {q:'Will it work offline?',a:'Partially. Once loaded, routes, charts, and port data are cached to your browser. Features requiring live data (vessel search, sync) need internet.'},
    {q:'How do I delete my account?',a:'Contact navispherex@gmail.com or use the Contact Us form to request account deletion. All data will be permanently removed within 7 days.'},
  ];
  const filtered = search ? FAQ_ITEMS.filter(f=>f.q.toLowerCase().includes(search.toLowerCase())||f.a.toLowerCase().includes(search.toLowerCase())) : FAQ_ITEMS;
  return (
    <div>
      <div style={{position:'relative',marginBottom:'1rem'}}>
        <span style={{position:'absolute',left:12,top:'50%',transform:'translateY(-50%)',fontSize:'0.9rem',color:'var(--text3)',pointerEvents:'none'}}>🔍</span>
        <input className="fi" placeholder="Search FAQs…" value={search} onChange={e=>setSearch(e.target.value)} style={{paddingLeft:36}}/>
        {search && <button onClick={()=>setSearch('')} style={{position:'absolute',right:10,top:'50%',transform:'translateY(-50%)',background:'none',border:'none',color:'var(--text3)',cursor:'pointer',fontSize:'1rem'}}>✕</button>}
      </div>
      {filtered.length===0
        ? <div className="empty"><div className="empty-icon">❓</div><div className="empty-t">No results</div><div className="empty-d">Try a different search term</div></div>
        : filtered.map((item,i)=>(
          <div key={i} style={{border:'1px solid',borderColor:openItem===i?'rgba(0,180,216,0.3)':'var(--border)',borderRadius:10,overflow:'hidden',marginBottom:6,transition:'all 0.2s'}}>
            <button onClick={()=>setOpenItem(openItem===i?null:i)}
              style={{width:'100%',padding:'0.85rem 1rem',background:openItem===i?'rgba(0,180,216,0.05)':'var(--card)',border:'none',color:'var(--text)',fontFamily:'Exo 2,sans-serif',fontSize:'0.8rem',fontWeight:600,textAlign:'left',cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'space-between',gap:10}}>
              <span style={{flex:1}}>{item.q}</span>
              <span style={{color:'var(--cyan)',transition:'transform 0.25s',transform:openItem===i?'rotate(180deg)':'rotate(0deg)',flexShrink:0}}>▾</span>
            </button>
            {openItem===i && (
              <div style={{padding:'0 1rem 0.85rem',background:'rgba(0,0,0,0.12)',fontSize:'0.76rem',color:'var(--text2)',lineHeight:1.8,borderTop:'1px solid rgba(0,180,216,0.1)',paddingTop:'0.75rem'}}>
                {item.a}
              </div>
            )}
          </div>
        ))
      }
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

  const activeCard = CARDS.find(c => c.id === activeSection);

  // ── Sub-page view ──
  if (activeSection) {
    return (
      <div style={{ maxWidth:900, margin:'0 auto', padding:'1.2rem' }}>
        {/* Sub-page header with back button */}
        <div style={{ display:'flex', alignItems:'center', gap:12, marginBottom:'1.4rem' }}>
          <button
            onClick={() => setActiveSection(null)}
            style={{ background:'rgba(255,255,255,0.06)', border:'1px solid var(--border)', borderRadius:9, padding:'7px 13px', cursor:'pointer', color:'var(--text2)', fontFamily:'Exo 2,sans-serif', fontSize:'0.78rem', display:'flex', alignItems:'center', gap:6, transition:'all 0.2s', flexShrink:0 }}
            onMouseEnter={e => { e.currentTarget.style.borderColor='var(--cyan)'; e.currentTarget.style.color='var(--cyan)'; }}
            onMouseLeave={e => { e.currentTarget.style.borderColor='var(--border)'; e.currentTarget.style.color='var(--text2)'; }}>
            ← Back
          </button>
          <div style={{ display:'flex', alignItems:'center', gap:10, flex:1 }}>
            <div style={{ width:36, height:36, borderRadius:10, background:activeCard?.bg, border:`1px solid ${activeCard?.accent}`, display:'flex', alignItems:'center', justifyContent:'center', fontSize:'1.3rem', flexShrink:0 }}>
              {activeCard?.icon}
            </div>
            <div>
              <div style={{ fontFamily:'Orbitron,monospace', fontSize:'0.88rem', fontWeight:700, color:activeCard?.color }}>
                {activeCard?.label}
              </div>
              <div style={{ fontSize:'0.64rem', color:'var(--text3)', marginTop:1 }}>Help &amp; Info</div>
            </div>
          </div>
        </div>

        {/* Divider */}
        <div style={{ height:1, background:`linear-gradient(90deg,${activeCard?.accent||'var(--border)'},transparent)`, marginBottom:'1.4rem' }} />

        {/* Section content */}
        {activeSection === 'contact' && <ContactSection notify={notify} user={user} />}
        {activeSection === 'about'   && <AboutSection />}
        {activeSection === 'legal'   && <LegalSection />}
        {activeSection === 'faq'     && <FAQSection />}
      </div>
    );
  }

  // ── Cards grid view (default) ──
  return (
    <div style={{ maxWidth:900, margin:'0 auto', padding:'1.2rem' }}>
      {/* Header */}
      <div style={{ marginBottom:'1.8rem', textAlign:'center' }}>
        <div style={{ fontFamily:'Orbitron,monospace', fontSize:'1.2rem', fontWeight:900, marginBottom:6, letterSpacing:'0.06em' }}>
          HELP <span style={{ color:'var(--cyan)' }}>&amp; INFO</span>
        </div>
        <div style={{ fontSize:'0.78rem', color:'var(--text2)' }}>Contact us, learn about the app, or find quick answers</div>
      </div>

      {/* 2×2 Cards grid */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(200px,1fr))', gap:'1rem' }}>
        {CARDS.map(card => (
          <div
            key={card.id}
            onClick={() => setActiveSection(card.id)}
            style={{
              background: card.bg,
              border: `1px solid ${card.accent}`,
              borderRadius: 16,
              padding: '1.6rem 1.2rem',
              cursor: 'pointer',
              transition: 'all 0.22s',
              textAlign: 'center',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: 10,
              position: 'relative',
              overflow: 'hidden',
            }}
            onMouseEnter={e => {
              e.currentTarget.style.transform = 'translateY(-4px)';
              e.currentTarget.style.boxShadow = `0 12px 32px rgba(0,0,0,0.5), 0 0 20px ${card.accent}44`;
            }}
            onMouseLeave={e => {
              e.currentTarget.style.transform = 'translateY(0)';
              e.currentTarget.style.boxShadow = 'none';
            }}>
            {/* Top accent line */}
            <div style={{ position:'absolute', top:0, left:0, right:0, height:2, background:`linear-gradient(90deg,transparent,${card.color},transparent)` }} />

            <div style={{ fontSize:'2.4rem', lineHeight:1 }}>{card.icon}</div>
            <div style={{ fontFamily:'Orbitron,monospace', fontSize:'0.76rem', fontWeight:700, color:card.color }}>{card.label}</div>
            <div style={{ fontSize:'0.66rem', color:'var(--text3)', lineHeight:1.6 }}>{card.sub}</div>

            {/* Arrow */}
            <div style={{ marginTop:4, width:32, height:32, borderRadius:'50%', background:`${card.color}18`, border:`1px solid ${card.color}44`, display:'flex', alignItems:'center', justifyContent:'center', fontSize:'0.9rem', color:card.color }}>
              →
            </div>
          </div>
        ))}
      </div>

      {/* Bottom brand note */}
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
