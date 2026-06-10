/* eslint-disable */
// src/Pages/ContactPage.jsx
const EMAILJS_SERVICE_ID  = 'service_mwrpzca';
const EMAILJS_TEMPLATE_ID = 'template_s8975dd';
const EMAILJS_PUBLIC_KEY  = 'lN0Fa22niddYawf1w';

import { useState, useRef, useEffect } from "react";
import { db } from "../firebase";
import { collection, addDoc, serverTimestamp } from "firebase/firestore";

const CONTACT_INFO = [
  { icon: '📧', label: 'Email', value: 'navispherex@gmail.com', link: 'mailto:navispherex@gmail.com' },
  { icon: '💬', label: 'WhatsApp', value: '+91 95825 25349', link: 'https://wa.me/919582525349' },
  { icon: '📸', label: 'Instagram', value: '@manish_the_navigator', link: 'https://instagram.com/manish_the_navigator' },
  { icon: '🌐', label: 'Location', value: 'At Sea 🌊 / India', link: null },
];

const CATEGORIES = [
  { value: 'bug',        label: '🐛 Bug / Error Report' },
  { value: 'suggestion', label: '💡 Feature Suggestion' },
  { value: 'data',       label: '📦 Data Update Request' },
  { value: 'query',      label: '🙋 General Query' },
  { value: 'maritime',   label: '⚓ Maritime Content Feedback' },
  { value: 'other',      label: '📝 Other' },
];

const USER_TYPES = [
  { value: 'officer',    label: '⚓ Deck / Engineer Officer' },
  { value: 'student',    label: '🎓 Maritime Student' },
  { value: 'shore',      label: '🏢 Shore Staff' },
  { value: 'other',      label: '👤 Other' },
];

const PRIORITIES = [
  { value: 'low',    label: '🟢 Low',    color: 'var(--green)' },
  { value: 'medium', label: '🟡 Medium', color: 'var(--gold)' },
  { value: 'urgent', label: '🔴 Urgent', color: 'var(--red)' },
];

// ── CHANGE: Load EmailJS via script tag (not dynamic import) ──
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

function StarRating({ value, onChange }) {
  const [hover, setHover] = useState(0);
  return (
    <div style={{ display: 'flex', gap: 6 }}>
      {[1, 2, 3, 4, 5].map(star => (
        <span key={star}
          onMouseEnter={() => setHover(star)}
          onMouseLeave={() => setHover(0)}
          onClick={() => onChange(star)}
          style={{
            fontSize: '1.6rem', cursor: 'pointer',
            color: (hover || value) >= star ? 'var(--gold)' : 'var(--border2)',
            transition: 'all 0.15s',
            filter: (hover || value) >= star ? 'drop-shadow(0 0 6px rgba(240,165,0,0.5))' : 'none',
          }}>★</span>
      ))}
      {value > 0 && (
        <span style={{ fontSize: '0.72rem', color: 'var(--text3)', alignSelf: 'center', marginLeft: 4 }}>
          {['','Poor','Fair','Good','Great','Excellent!'][value]}
        </span>
      )}
    </div>
  );
}

export default function ContactPage({ notify, user }) {
  const [form, setForm] = useState({
    name: user?.displayName || '',
    email: user?.email || '',
    userType: '',
    category: '',
    priority: 'medium',
    subject: '',
    message: '',
    rating: 0,
  });
  const [screenshot, setScreenshot] = useState(null);
  const [screenshotPreview, setScreenshotPreview] = useState(null);
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [refId, setRefId] = useState('');
  const fileRef = useRef();

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const handleFile = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) { notify('Screenshot must be under 5MB', 'error'); return; }
    setScreenshot(file);
    const reader = new FileReader();
    reader.onload = ev => setScreenshotPreview(ev.target.result);
    reader.readAsDataURL(file);
  };

  const generateRef = () => {
    const ts = Date.now().toString(36).toUpperCase();
    const rand = Math.random().toString(36).substring(2, 6).toUpperCase();
    return `NVX-${ts}-${rand}`;
  };

  const handleSubmit = async () => {
    if (!form.name.trim())    { notify('Please enter your name', 'error'); return; }
    if (!form.email.trim())   { notify('Please enter your email', 'error'); return; }
    if (!form.category)       { notify('Please select a category', 'error'); return; }
    if (!form.subject.trim()) { notify('Please enter a subject', 'error'); return; }
    if (!form.message.trim()) { notify('Please write your message', 'error'); return; }

    setLoading(true);
    const ref = generateRef();
    setRefId(ref);

    try {
      // ── 1. Save to Firestore ──
      await addDoc(collection(db, 'contactMessages'), {
        name:      form.name,
        email:     form.email,
        userType:  form.userType,
        category:  form.category,
        priority:  form.priority,
        subject:   form.subject,
        message:   form.message,
        rating:    form.rating,
        refId:     ref,
        read:      false,
        userId:    user?.uid || null,
        createdAt: serverTimestamp(),
      });

      // ── 2. Send via EmailJS — CHANGE: use script tag loader, not dynamic import ──
      if (
        EMAILJS_SERVICE_ID !== 'YOUR_SERVICE_ID' &&
        EMAILJS_TEMPLATE_ID !== 'YOUR_TEMPLATE_ID' &&
        EMAILJS_PUBLIC_KEY !== 'YOUR_PUBLIC_KEY'
      ) {
        try {
          const ejs = await loadEmailJS();
          await ejs.send(
            EMAILJS_SERVICE_ID,
            EMAILJS_TEMPLATE_ID,
            {
              from_name:  form.name,
              from_email: form.email,
              user_type:  form.userType || 'Not specified',
              category:   CATEGORIES.find(c => c.value === form.category)?.label || form.category,
              priority:   form.priority.toUpperCase(),
              subject:    form.subject,
              message:    form.message,
              rating:     form.rating > 0 ? `${form.rating}/5 stars` : 'Not rated',
              ref_id:     ref,
            },
            EMAILJS_PUBLIC_KEY
          );
        } catch (emailErr) {
          // EmailJS failure is non-fatal — Firestore save already succeeded
          console.warn('EmailJS send failed (non-fatal):', emailErr.message);
        }
      }

      setSubmitted(true);
      notify('✅ Message sent successfully!', 'success');
    } catch (e) {
      console.warn('ContactPage submit error:', e);
      notify('Failed to send: ' + (e.message || 'Unknown error'), 'error');
    }
    setLoading(false);
  };

  // ── Success Screen ──
  if (submitted) return (
    <div className="section" style={{ maxWidth: 600, margin: '0 auto' }}>
      <div style={{
        background: 'var(--card)', border: '1px solid rgba(0,200,150,0.3)',
        borderRadius: 18, padding: '2.5rem', textAlign: 'center',
        boxShadow: '0 0 40px rgba(0,200,150,0.1)',
      }}>
        <div style={{ fontSize: '3.5rem', marginBottom: '1rem' }}>✅</div>
        <div style={{ fontFamily: 'Orbitron,monospace', fontSize: '1rem', fontWeight: 700, color: 'var(--green)', marginBottom: 8 }}>
          Message Sent!
        </div>
        <div style={{ fontSize: '0.82rem', color: 'var(--text2)', lineHeight: 1.7, marginBottom: '1.4rem' }}>
          Thank you, <strong style={{ color: 'var(--cyan)' }}>{form.name}</strong>!
          Your message has been received.<br />
          We typically respond within <strong style={{ color: 'var(--gold)' }}>48 hours</strong>.
        </div>
        <div style={{
          background: 'rgba(0,180,216,0.06)', border: '1px solid rgba(0,180,216,0.2)',
          borderRadius: 10, padding: '10px 16px', marginBottom: '1.4rem',
          fontFamily: 'Orbitron,monospace', fontSize: '0.8rem', color: 'var(--cyan)', letterSpacing: '0.1em',
        }}>
          Reference: {refId}
        </div>
        <div style={{ fontSize: '0.72rem', color: 'var(--text3)', marginBottom: '1.6rem' }}>
          Keep this reference number for follow-up queries.
        </div>
        <button className="btn btn-primary" style={{ justifyContent: 'center' }}
          onClick={() => {
            setSubmitted(false);
            setForm({ name: user?.displayName || '', email: user?.email || '', userType: '', category: '', priority: 'medium', subject: '', message: '', rating: 0 });
            setScreenshot(null);
            setScreenshotPreview(null);
          }}>
          ✉️ Send Another Message
        </button>
      </div>
    </div>
  );

  return (
    <div className="section" style={{ maxWidth: 900, margin: '0 auto' }}>

      <div style={{ marginBottom: '1.8rem', textAlign: 'center' }}>
        <div style={{ fontFamily: 'Orbitron,monospace', fontSize: '1.3rem', fontWeight: 900, marginBottom: 6, letterSpacing: '0.06em' }}>
          CONTACT <span style={{ color: 'var(--cyan)' }}>US</span>
        </div>
        <div style={{ fontSize: '0.8rem', color: 'var(--text2)', lineHeight: 1.6 }}>
          Reach out, report issues, suggest features, or just say hello 👋
        </div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, marginTop: 8 }}>
          <div style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--green)', boxShadow: '0 0 8px var(--green)', animation: 'pulse 2s infinite' }} />
          <span style={{ fontSize: '0.7rem', color: 'var(--green)' }}>Typically responds within 48 hours</span>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.6fr', gap: '1.4rem', alignItems: 'start' }}>

        {/* LEFT: Contact Info */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.8rem' }}>
          <div style={{
            background: 'linear-gradient(135deg,var(--card),var(--card2))',
            border: '1px solid var(--border2)', borderRadius: 16, padding: '1.4rem',
            textAlign: 'center', position: 'relative', overflow: 'hidden',
          }}>
            <div style={{ position: 'absolute', top: -20, right: -20, width: 100, height: 100, borderRadius: '50%', background: 'rgba(0,180,216,0.05)', pointerEvents: 'none' }} />
            <div style={{ fontSize: '2.5rem', marginBottom: 8 }}>🧭</div>
            <div style={{ fontFamily: 'Orbitron,monospace', fontSize: '0.82rem', fontWeight: 700, color: 'var(--cyan)', marginBottom: 3 }}>MANISH BHARTI</div>
            <div style={{ fontSize: '0.72rem', color: 'var(--gold)', marginBottom: 2 }}>2nd Officer</div>
            <div style={{ fontSize: '0.68rem', color: 'var(--text3)', fontStyle: 'italic' }}>"Built at sea, for the sea"</div>
          </div>

          {CONTACT_INFO.map(c => (
            <div key={c.label} style={{
              background: 'var(--card)', border: '1px solid var(--border)',
              borderRadius: 12, padding: '0.9rem 1rem',
              display: 'flex', alignItems: 'center', gap: 12,
            }}>
              <div style={{ fontSize: '1.3rem', flexShrink: 0 }}>{c.icon}</div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: '0.62rem', color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 2 }}>{c.label}</div>
                {c.link
                  ? <a href={c.link} target="_blank" rel="noreferrer" style={{ fontSize: '0.78rem', color: 'var(--cyan)', textDecoration: 'none', fontWeight: 600, wordBreak: 'break-all' }}>{c.value}</a>
                  : <div style={{ fontSize: '0.78rem', color: 'var(--text)', fontWeight: 600 }}>{c.value}</div>
                }
              </div>
            </div>
          ))}

          <div className="info-box" style={{ marginBottom: 0 }}>
            ⏱ <strong style={{ color: 'var(--cyan)' }}>Response Time</strong><br />
            <span style={{ fontSize: '0.74rem' }}>We aim to reply within <strong>48 hours</strong>. For urgent issues, WhatsApp is fastest.</span>
          </div>
        </div>

        {/* RIGHT: Form */}
        <div style={{ background: 'var(--card)', border: '1px solid var(--border2)', borderRadius: 16, padding: '1.4rem' }}>
          <div style={{ fontFamily: 'Orbitron,monospace', fontSize: '0.82rem', fontWeight: 700, color: 'var(--cyan)', marginBottom: '1.2rem', display: 'flex', alignItems: 'center', gap: 8 }}>
            ✍️ Write to Us
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.8rem' }}>
            <div className="ff" style={{ margin: 0 }}>
              <label className="fl">Your Name *</label>
              <input className="fi" placeholder="Full name" value={form.name} onChange={e => set('name', e.target.value)} />
            </div>
            <div className="ff" style={{ margin: 0 }}>
              <label className="fl">Email Address *</label>
              <input className="fi" type="email" placeholder="your@email.com" value={form.email} onChange={e => set('email', e.target.value)} />
            </div>
            <div className="ff" style={{ margin: 0 }}>
              <label className="fl">You are a…</label>
              <select className="fi" value={form.userType} onChange={e => set('userType', e.target.value)}>
                <option value="">Select (optional)</option>
                {USER_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
              </select>
            </div>
            <div className="ff" style={{ margin: 0 }}>
              <label className="fl">Category *</label>
              <select className="fi" value={form.category} onChange={e => set('category', e.target.value)}>
                <option value="">Select category</option>
                {CATEGORIES.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
              </select>
            </div>
            <div className="ff" style={{ gridColumn: '1/-1', margin: 0 }}>
              <label className="fl">Priority</label>
              <div style={{ display: 'flex', gap: 8 }}>
                {PRIORITIES.map(p => (
                  <button key={p.value} type="button"
                    onClick={() => set('priority', p.value)}
                    style={{
                      flex: 1, padding: '8px 6px', borderRadius: 9, border: '1px solid',
                      borderColor: form.priority === p.value ? p.color : 'var(--border)',
                      background: form.priority === p.value ? `${p.color}18` : 'transparent',
                      color: form.priority === p.value ? p.color : 'var(--text3)',
                      fontFamily: 'Exo 2,sans-serif', fontSize: '0.72rem',
                      fontWeight: form.priority === p.value ? 700 : 400,
                      cursor: 'pointer', transition: 'all 0.2s',
                    }}>
                    {p.label}
                  </button>
                ))}
              </div>
            </div>
            <div className="ff" style={{ gridColumn: '1/-1', margin: 0 }}>
              <label className="fl">Subject *</label>
              <input className="fi" placeholder="Brief subject line" value={form.subject} onChange={e => set('subject', e.target.value)} />
            </div>
            <div className="ff" style={{ gridColumn: '1/-1', margin: 0 }}>
              <label className="fl">Message *</label>
              <textarea className="fi" rows={4} style={{ resize: 'vertical' }}
                placeholder="Describe your issue, suggestion, or query in detail…"
                value={form.message} onChange={e => set('message', e.target.value)} />
            </div>
            <div className="ff" style={{ gridColumn: '1/-1', margin: 0 }}>
              <label className="fl">Rate the App (optional)</label>
              <StarRating value={form.rating} onChange={v => set('rating', v)} />
            </div>
            <div className="ff" style={{ gridColumn: '1/-1', margin: 0 }}>
              <label className="fl">Attach Screenshot (optional · max 5MB)</label>
              <div
                onClick={() => fileRef.current?.click()}
                style={{
                  border: '2px dashed var(--border2)', borderRadius: 10,
                  padding: '1rem', textAlign: 'center', cursor: 'pointer',
                  background: 'var(--bg2)',
                }}>
                {screenshotPreview
                  ? <img src={screenshotPreview} alt="screenshot" style={{ maxHeight: 120, borderRadius: 8, objectFit: 'contain' }} />
                  : <div style={{ color: 'var(--text3)', fontSize: '0.76rem' }}>📎 Click to attach image</div>
                }
                <input ref={fileRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={handleFile} />
              </div>
              {screenshot && (
                <button type="button" onClick={() => { setScreenshot(null); setScreenshotPreview(null); }}
                  style={{ marginTop: 4, background: 'none', border: 'none', color: 'var(--red)', fontSize: '0.7rem', cursor: 'pointer' }}>
                  ✕ Remove screenshot
                </button>
              )}
            </div>
          </div>

          <div style={{ marginTop: '1rem', display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
            <button className="btn btn-primary" style={{ flex: 1, justifyContent: 'center', padding: '12px' }}
              onClick={handleSubmit} disabled={loading}>
              {loading
                ? <><div className="spin" style={{ width: 14, height: 14 }} /> Sending…</>
                : '📨 Send Message'}
            </button>
          </div>
          <div style={{ marginTop: '0.8rem', fontSize: '0.66rem', color: 'var(--text3)', lineHeight: 1.5 }}>
            🔒 Your data is saved securely to our database. We never share your information.
          </div>
        </div>
      </div>

      <style>{`
        @media(max-width:700px){
          .contact-grid { grid-template-columns: 1fr !important; }
        }
      `}</style>
    </div>
  );
}
