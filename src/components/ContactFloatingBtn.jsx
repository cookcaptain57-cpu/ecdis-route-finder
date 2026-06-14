/* eslint-disable */
// src/components/ContactFloatingBtn.jsx
import { useState } from "react";

export default function ContactFloatingBtn({ setTab }) {
  const [open, setOpen] = useState(false);

  const options = [
    { icon:'✉️', label:'Contact Us',  sub:'Get in touch',        section:'contact' },
    { icon:'💡', label:'Write to Us', sub:'Suggestions & bugs',   section:'contact' },
    { icon:'❓', label:'FAQ',          sub:'Quick answers',        section:'faq'     },
    { icon:'🧭', label:'About',        sub:'About the app',        section:'about'   },
    { icon:'⚖️', label:'Legal',        sub:'Terms & disclaimer',   section:'legal'   },
  ];

  const handleNav = (section) => {
    setOpen(false);
    // Store which section to auto-open in InfoPage
    sessionStorage.setItem('info_section', section);
    setTab('info');
  };

  return (
    <>
      {open && (
        <div onClick={() => setOpen(false)}
          style={{ position:'fixed', inset:0, zIndex:9997, background:'rgba(0,0,0,0.35)', backdropFilter:'blur(2px)' }}
        />
      )}

      {open && (
        <div style={{
          position:'fixed', bottom:90, right:20, zIndex:9998,
          background:'var(--card)', border:'1px solid var(--border2)',
          borderRadius:16, padding:'0.6rem',
          boxShadow:'0 12px 48px rgba(0,0,0,0.6), 0 0 0 1px rgba(0,180,216,0.1)',
          minWidth:210, animation:'floatMenuIn 0.2s ease',
        }}>
          <div style={{ fontSize:'0.58rem', color:'var(--text3)', textTransform:'uppercase', letterSpacing:'0.12em', padding:'4px 8px 8px', marginBottom:4, borderBottom:'1px solid var(--border)' }}>
            NavisphereX Support
          </div>
          {options.map(opt => (
            <button key={opt.section + opt.label}
              onClick={() => handleNav(opt.section)}
              style={{ width:'100%', padding:'9px 10px', background:'transparent', border:'none', borderRadius:10, cursor:'pointer', display:'flex', alignItems:'center', gap:10, transition:'background 0.15s', textAlign:'left' }}
              onMouseEnter={e => e.currentTarget.style.background = 'rgba(0,180,216,0.07)'}
              onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
              <span style={{ fontSize:'1.1rem', flexShrink:0 }}>{opt.icon}</span>
              <div>
                <div style={{ fontSize:'0.78rem', fontWeight:600, color:'var(--text)' }}>{opt.label}</div>
                <div style={{ fontSize:'0.62rem', color:'var(--text3)' }}>{opt.sub}</div>
              </div>
            </button>
          ))}
          <div style={{ marginTop:6, borderTop:'1px solid var(--border)', padding:'8px 10px 4px' }}>
            <a href="mailto:navispherex@gmail.com"
              style={{ display:'flex', alignItems:'center', gap:8, textDecoration:'none', color:'var(--cyan)', fontSize:'0.72rem' }}>
              📧 navispherex@gmail.com
            </a>
          </div>
        </div>
      )}

      <button onClick={() => setOpen(o => !o)} title="Contact / Help"
        style={{
          position:'fixed', bottom:24, right:20, zIndex:9999,
          width:52, height:52, borderRadius:'50%',
          background:open ? 'linear-gradient(135deg,var(--red),#cc2233)' : 'linear-gradient(135deg,var(--cyan),var(--blue))',
          border:'none', cursor:'pointer',
          display:'flex', alignItems:'center', justifyContent:'center',
          fontSize:open ? '1.2rem' : '1.4rem',
          boxShadow:open ? '0 6px 24px rgba(255,71,87,0.5)' : '0 6px 24px rgba(0,180,216,0.5)',
          transition:'all 0.25s ease',
          transform:open ? 'rotate(45deg) scale(1.05)' : 'rotate(0deg) scale(1)',
        }}>
        {open ? '✕' : '💬'}
      </button>

      <style>{`
        @keyframes floatMenuIn {
          from { opacity:0; transform:translateY(12px) scale(0.96); }
          to   { opacity:1; transform:translateY(0) scale(1); }
        }
      `}</style>
    </>
  );
}
