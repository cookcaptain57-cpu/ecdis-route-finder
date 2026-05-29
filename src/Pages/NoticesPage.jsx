/* eslint-disable */
// src/pages/NoticesPage.jsx
import { useState, useEffect } from "react";
import { db } from "../firebase";
import { collection, getDocs, query, orderBy } from "firebase/firestore";

const TYPE_CONFIG = {
  warning:   { label:'⚠️ Warning',   color:'#ff6b35', bg:'rgba(255,107,53,0.1)' },
  closure:   { label:'🚫 Closure',   color:'#ff4757', bg:'rgba(255,71,87,0.1)'  },
  restricted:{ label:'⛔ Restricted', color:'#ff6b81', bg:'rgba(255,107,129,0.1)'},
  info:      { label:'ℹ️ Info',       color:'var(--cyan)', bg:'rgba(0,180,216,0.08)' },
};

function NoticesPage({ notify }) {
  const [notices,  setNotices]  = useState([]);
  const [loading,  setLoading]  = useState(true);
  const [filter,   setFilter]   = useState('all');
  const [expanded, setExpanded] = useState(null);

  useEffect(() => { loadNotices(); }, []);

  const loadNotices = async () => {
    setLoading(true);
    try {
      const q = query(collection(db, 'notices'), orderBy('createdAt', 'desc'));
      const snap = await getDocs(q);
      setNotices(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    } catch (e) { console.warn('Notices load failed:', e); }
    setLoading(false);
  };

  const isActive = n => {
    if (!n.expiryDate) return true;
    return new Date(n.expiryDate) >= new Date();
  };

  const filtered = notices.filter(n => {
    if (filter === 'active')   return isActive(n);
    if (filter === 'expired')  return !isActive(n);
    if (filter !== 'all')      return n.type === filter;
    return true;
  });

  const activeCount = notices.filter(isActive).length;

  return (
    <div className="section">
      <div className="sec-hdr">
        <div className="sec-title">📢 Port Notices</div>
        <div style={{ display:'flex', gap:8, alignItems:'center' }}>
          {activeCount > 0 && (
            <span style={{ background:'rgba(255,71,87,0.15)', color:'#ff4757',
              border:'1px solid rgba(255,71,87,0.3)', borderRadius:20,
              padding:'3px 10px', fontSize:'0.7rem', fontWeight:700 }}>
              {activeCount} active
            </span>
          )}
          <button className="btn btn-secondary" style={{ padding:'5px 10px', fontSize:'0.7rem' }}
            onClick={loadNotices}>↺ Refresh</button>
        </div>
      </div>

      <div className="info-box" style={{ marginBottom:'1rem', fontSize:'0.74rem' }}>
        📌 Port closures, restricted areas, updated requirements and navigational warnings.
        Always verify with official sources before departure.
      </div>

      {/* Filter tabs */}
      <div className="fbar" style={{ marginBottom:'1rem', flexWrap:'wrap' }}>
        {[
          { k:'all',        l:'All' },
          { k:'active',     l:'Active' },
          { k:'warning',    l:'⚠️ Warnings' },
          { k:'closure',    l:'🚫 Closures' },
          { k:'restricted', l:'⛔ Restricted' },
          { k:'info',       l:'ℹ️ Info' },
        ].map(f => (
          <button key={f.k} className={`fbtn ${filter===f.k?'active':''}`}
            onClick={() => setFilter(f.k)}>{f.l}</button>
        ))}
      </div>

      {loading && <div className="loading"><div className="spin"/><span>Loading notices…</span></div>}

      {!loading && filtered.length === 0 && (
        <div className="empty">
          <div className="empty-icon">📢</div>
          <div className="empty-t">No Notices</div>
          <div className="empty-d">{filter === 'all' ? 'No port notices have been published yet.' : `No ${filter} notices found.`}</div>
        </div>
      )}

      <div style={{ display:'grid', gap:'0.8rem' }}>
        {filtered.map(n => {
          const tc  = TYPE_CONFIG[n.type] || TYPE_CONFIG.info;
          const act = isActive(n);
          return (
            <div key={n.id} style={{ background:'var(--card)', border:`1px solid ${tc.color}44`,
              borderRadius:14, overflow:'hidden', opacity: act ? 1 : 0.6 }}>
              <div style={{ padding:'1rem', cursor:'pointer' }}
                onClick={() => setExpanded(expanded === n.id ? null : n.id)}>
                <div style={{ display:'flex', gap:10, alignItems:'flex-start', flexWrap:'wrap' }}>
                  <span style={{ padding:'3px 10px', borderRadius:20, fontSize:'0.62rem', fontWeight:700,
                    background:tc.bg, color:tc.color, border:`1px solid ${tc.color}33`, flexShrink:0 }}>
                    {tc.label}
                  </span>
                  {!act && <span style={{ padding:'3px 10px', borderRadius:20, fontSize:'0.62rem',
                    background:'rgba(255,255,255,0.05)', color:'var(--text3)', border:'1px solid var(--border)' }}>
                    EXPIRED
                  </span>}
                  {n.portName && (
                    <span style={{ padding:'3px 10px', borderRadius:20, fontSize:'0.62rem',
                      background:'rgba(0,180,216,0.08)', color:'var(--cyan)', border:'1px solid rgba(0,180,216,0.2)' }}>
                      ⚓ {n.portName}
                    </span>
                  )}
                </div>
                <div style={{ fontWeight:700, fontSize:'0.9rem', color:'var(--text)', margin:'8px 0 4px' }}>
                  {n.title}
                </div>
                <div style={{ display:'flex', gap:16, flexWrap:'wrap' }}>
                  {n.createdAt && <span style={{ fontSize:'0.68rem', color:'var(--text3)' }}>
                    Published: {new Date(n.createdAt?.seconds * 1000 || n.createdAt).toLocaleDateString()}
                  </span>}
                  {n.expiryDate && <span style={{ fontSize:'0.68rem', color: act ? 'var(--text3)' : '#ff4757' }}>
                    {act ? 'Valid until' : 'Expired'}: {n.expiryDate}
                  </span>}
                </div>
              </div>

              {expanded === n.id && n.description && (
                <div style={{ padding:'0 1rem 1rem', borderTop:'1px solid var(--border)' }}>
                  <div style={{ paddingTop:'0.8rem', fontSize:'0.82rem', color:'var(--text2)', lineHeight:1.7,
                    whiteSpace:'pre-wrap' }}>
                    {n.description}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default NoticesPage;
