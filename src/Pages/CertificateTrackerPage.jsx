/* eslint-disable */
// src/pages/CertificateTrackerPage.jsx
import { useState, useEffect } from "react";
import { db } from "../firebase";
import { auth } from "../firebase";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { GoogleAuthProvider, signInWithPopup } from "firebase/auth";

const CERT_TEMPLATES = [
  { name:'Certificate of Competency (CoC)',     validity:5,  category:'Competency' },
  { name:'GMDSS GOC / ROC',                     validity:5,  category:'Competency' },
  { name:'Medical Certificate (ENG1 / ML5)',    validity:2,  category:'Medical' },
  { name:'STCW Basic Safety Training (BST)',    validity:5,  category:'Safety' },
  { name:'Proficiency in Survival Craft (PSC)', validity:5,  category:'Safety' },
  { name:'Advanced Fire Fighting (AFF)',         validity:5,  category:'Safety' },
  { name:'Medical First Aid (MEFA)',             validity:5,  category:'Medical' },
  { name:'Medical Care on Board (MCOB)',         validity:5,  category:'Medical' },
  { name:'ECDIS Type Specific',                 validity:5,  category:'Navigation' },
  { name:'ARPA / Radar Certificate',            validity:5,  category:'Navigation' },
  { name:'Bridge Resource Management (BRM)',    validity:5,  category:'Navigation' },
  { name:'Engine Room Resource Management',     validity:5,  category:'Engineering' },
  { name:'Oil Tanker Certificate',              validity:5,  category:'Tanker' },
  { name:'Chemical Tanker Certificate',         validity:5,  category:'Tanker' },
  { name:'Gas Tanker Certificate',              validity:5,  category:'Tanker' },
  { name:'COLREGS / Rules of the Road',         validity:5,  category:'Navigation' },
  { name:'Crowd Management',                    validity:5,  category:'Safety' },
  { name:'Passenger Ship Safety',               validity:5,  category:'Safety' },
  { name:'Passport',                            validity:10, category:'Personal' },
  { name:"CDC / Seaman's Book",                 validity:5,  category:'Personal' },
  { name:'SID - Seafarer Identity Document',    validity:5,  category:'Personal' },
  { name:'Visa',                                validity:2,  category:'Personal' },
  { name:'Yellow Fever Certificate',            validity:99, category:'Medical' },
  { name:'Flag State Certificate / Endorsement',validity:5,  category:'Competency' },
  { name:'STCW Endorsement',                    validity:5,  category:'Competency' },
  { name:'National Endorsement',               validity:5,  category:'Competency' },
];

const KNOWN_CATEGORIES = ['Competency','Safety','Medical','Navigation','Engineering','Tanker','Personal','Others'];

const STATUS = (expiryDate) => {
  if (!expiryDate) return { label:'Unknown', color:'var(--text3)', bg:'rgba(255,255,255,0.05)' };
  if (expiryDate === 'unlimited') return { label:'UNLIMITED', color:'#00b4d8', bg:'rgba(0,180,216,0.1)' };
  const days = Math.floor((new Date(expiryDate) - new Date()) / 86400000);
  if (days < 0)  return { label:'EXPIRED',       color:'#ff4757', bg:'rgba(255,71,87,0.12)',    days };
  if (days < 30) return { label:'EXPIRING SOON', color:'#ff6b35', bg:'rgba(255,107,53,0.12)',   days };
  if (days < 90) return { label:'DUE SOON',      color:'var(--gold)', bg:'rgba(240,165,0,0.1)', days };
  return             { label:'VALID',            color:'var(--green)', bg:'rgba(0,200,100,0.08)', days };
};

const CATEGORIES = ['All', ...KNOWN_CATEGORIES];

const EXPIRY_TIERS = [
  { key:'expired', label:'Expired',     color:'#ff4757', test: d => d < 0 },
  { key:'1mo',     label:'< 1 Month',   color:'#ff5252', test: d => d >= 0   && d < 30  },
  { key:'2mo',     label:'< 2 Months',  color:'#ff6b35', test: d => d >= 30  && d < 60  },
  { key:'3mo',     label:'< 3 Months',  color:'#ff9f43', test: d => d >= 60  && d < 90  },
  { key:'6mo',     label:'< 6 Months',  color:'#ffa502', test: d => d >= 90  && d < 180 },
  { key:'12mo',    label:'< 12 Months', color:'#f0a500', test: d => d >= 180 && d < 365 },
];

const EMPTY_CERT = { name:'', certNo:'', issueDate:'', expiryDate:'', category:'Safety', notes:'' };

// ── Google Drive API helpers ───────────────────────────────────────────────
const DRIVE_FOLDER_NAME = 'NavisphereX Certificates';
const DRIVE_SCOPE       = 'https://www.googleapis.com/auth/drive.file';

async function driveSearchFolder(token) {
  const q   = encodeURIComponent(`name='${DRIVE_FOLDER_NAME}' and mimeType='application/vnd.google-apps.folder' and trashed=false`);
  const res  = await fetch(`https://www.googleapis.com/drive/v3/files?q=${q}&fields=files(id,name)`, {
    headers: { Authorization: `Bearer ${token}` }
  });
  const data = await res.json();
  return data.files?.[0]?.id || null;
}

async function driveCreateFolder(token) {
  const res  = await fetch('https://www.googleapis.com/drive/v3/files', {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ name: DRIVE_FOLDER_NAME, mimeType: 'application/vnd.google-apps.folder' })
  });
  const data = await res.json();
  return data.id;
}

async function driveUploadFile(token, folderId, file, fileName) {
  const metadata = { name: fileName, parents: [folderId] };
  const form     = new FormData();
  form.append('metadata', new Blob([JSON.stringify(metadata)], { type: 'application/json' }));
  form.append('file', file);
  const res  = await fetch('https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,name', {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
    body: form
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error?.message || 'Upload failed');
  return data;
}

async function driveDeleteFile(token, fileId) {
  await fetch(`https://www.googleapis.com/drive/v3/files/${fileId}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${token}` }
  });
}

async function driveGetBlob(token, fileId) {
  const res = await fetch(`https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`, {
    headers: { Authorization: `Bearer ${token}` }
  });
  if (!res.ok) throw new Error('Download failed');
  return res.blob();
}

// ── Gemini AI Certificate Extraction ──────────────────────────────────────
const GEMINI_KEY = process.env.REACT_APP_GEMINI_API_KEY || '';
const GEMINI_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${GEMINI_KEY}`;

const fileToBase64 = (file) => new Promise((resolve, reject) => {
  const reader = new FileReader();
  reader.onload  = () => resolve(reader.result.split(',')[1]);
  reader.onerror = reject;
  reader.readAsDataURL(file);
});

async function extractCertData(file) {
  if (!GEMINI_KEY) throw new Error('REACT_APP_GEMINI_API_KEY not set in Vercel Environment Variables');
  const base64 = await fileToBase64(file);
  const res = await fetch(GEMINI_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{
        parts: [
          { inline_data: { mime_type: file.type, data: base64 } },
          {
            text: `You are a maritime certificate parser. Extract all readable information from this document.
Return ONLY a valid JSON object — no markdown, no explanation, no extra text:
{
  "name":               "exact certificate title as printed",
  "certNo":             "certificate/document/book number or null",
  "issueDate":          "YYYY-MM-DD or null",
  "expiryDate":         "YYYY-MM-DD or null",
  "isUnlimited":        false,
  "issuingAuthority":   "issuing organization or null",
  "holderName":         "certificate holder full name or null",
  "category":           "one of: Competency, Safety, Medical, Navigation, Engineering, Tanker, Personal, Others",
  "notes":              "any other relevant info or null"
}
Set isUnlimited true if document shows no expiry, unlimited, for life, or similar.
Use null for any field not clearly visible. Return ONLY the JSON object.`
          }
        ]
      }],
      generationConfig: { temperature: 0.1, maxOutputTokens: 1000 }
    })
  });
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error?.message || `Gemini API error ${res.status}`);
  }
  const data  = await res.json();
  const text  = data.candidates?.[0]?.content?.parts?.[0]?.text || '{}';
  const clean = text.replace(/```json|```/g, '').trim();
  return JSON.parse(clean);
}
// ──────────────────────────────────────────────────────────────────────────

function CertificateTrackerPage({ user, notify }) {
  const [certs,     setCerts]     = useState([]);
  const [loading,   setLoading]   = useState(true);
  const [saving,    setSaving]    = useState(false);
  const [showAdd,   setShowAdd]   = useState(false);
  const [catFilter, setCatFilter] = useState('All');
  const [newCert,   setNewCert]   = useState({ ...EMPTY_CERT });
  const [customName,      setCustomName]      = useState(false);
  const [unlimitedExpiry, setUnlimitedExpiry] = useState(false);
  const [customCategory,  setCustomCategory]  = useState(false);

  const [editId,              setEditId]             = useState(null);
  const [editData,            setEditData]           = useState(null);
  const [editCustomName,      setEditCustomName]     = useState(false);
  const [editCustomCategory,  setEditCustomCategory] = useState(false);
  const [editUnlimited,       setEditUnlimited]      = useState(false);

  const [quickId,        setQuickId]        = useState(null);
  const [quickData,      setQuickData]      = useState({ certNo:'', expiryDate:'' });
  const [quickUnlimited, setQuickUnlimited] = useState(false);

  const [showExpDash, setShowExpDash] = useState(false);
  const [activeTier,  setActiveTier]  = useState(null);

  // Drive state
  const [driveToken,      setDriveToken]      = useState(null);
  const [driveConnected,  setDriveConnected]  = useState(false);
  const [driveFolderId,   setDriveFolderId]   = useState(null);
  const [uploadingId,     setUploadingId]     = useState(null);
  const [connectingDrive, setConnectingDrive] = useState(false);

  // AI Extraction state
  const [extractModal,  setExtractModal]  = useState(null);
  const [extracting,    setExtracting]    = useState(false);
  const [addScanFile,   setAddScanFile]   = useState(null);
  const [scanningAdd,   setScanningAdd]   = useState(false);
  const [addAiFields,   setAddAiFields]   = useState({});

  useEffect(() => {
    if (!user) return;
    loadCerts();
    initDrive();
  }, [user?.uid]);

  // ── Drive functions ───────────────────────────────────────────────────────
  const initDrive = () => {
    const token  = sessionStorage.getItem('nsx_drive_token');
    const expiry = sessionStorage.getItem('nsx_drive_expiry');
    if (token && expiry && Date.now() < parseInt(expiry)) {
      setDriveToken(token); setDriveConnected(true);
    }
  };

  const connectDrive = async () => {
    setConnectingDrive(true);
    try {
      const provider = new GoogleAuthProvider();
      provider.addScope(DRIVE_SCOPE);
      if (user?.email) provider.setCustomParameters({ login_hint: user.email });
      // ✅ FIX: uses auth imported directly from firebase.js
      const result = await signInWithPopup(auth, provider);
      const cred   = GoogleAuthProvider.credentialFromResult(result);
      const token  = cred.accessToken;
      sessionStorage.setItem('nsx_drive_token',  token);
      sessionStorage.setItem('nsx_drive_expiry', String(Date.now() + 3300000));
      setDriveToken(token); setDriveConnected(true);
      notify('✅ Google Drive connected', 'success');
    } catch(e) {
      if (e.code !== 'auth/popup-closed-by-user') notify('Drive connection failed: ' + e.message, 'error');
    }
    setConnectingDrive(false);
  };

  const disconnectDrive = () => {
    sessionStorage.removeItem('nsx_drive_token');
    sessionStorage.removeItem('nsx_drive_expiry');
    setDriveToken(null); setDriveConnected(false); setDriveFolderId(null);
    notify('Google Drive disconnected', 'success');
  };

  const getOrCreateFolder = async (token) => {
    if (driveFolderId) return driveFolderId;
    let fid = await driveSearchFolder(token);
    if (!fid) fid = await driveCreateFolder(token);
    setDriveFolderId(fid);
    return fid;
  };

  const viewDriveFile     = (fileId)           => window.open(`https://drive.google.com/file/d/${fileId}/view`, '_blank');

  const downloadDriveFile = async (fileId, fileName) => {
    if (!driveToken) { notify('Connect Google Drive to download', 'error'); return; }
    try {
      const blob = await driveGetBlob(driveToken, fileId);
      const url  = URL.createObjectURL(blob);
      const a    = document.createElement('a');
      a.href = url; a.download = fileName || 'certificate'; a.click();
      URL.revokeObjectURL(url);
    } catch(e) { notify('Download failed: ' + e.message, 'error'); }
  };

  const removeDriveFile = async (certId) => {
    const cert = certs.find(c => c.id === certId);
    if (!cert?.driveFileId) return;
    if (!window.confirm('Remove certificate copy from Google Drive?')) return;
    try {
      if (driveToken) await driveDeleteFile(driveToken, cert.driveFileId);
      const updated = certs.map(c => c.id === certId ? { ...c, driveFileId:null, driveFileName:null } : c);
      await saveCerts(updated);
      notify('Drive copy removed', 'success');
    } catch(e) { notify('Remove failed: ' + e.message, 'error'); }
  };

  // ── AI Extraction functions ───────────────────────────────────────────────
  const handleFileUpload = async (certId, file, isRenewal = false) => {
    const allowed = ['application/pdf','image/jpeg','image/png','image/jpg'];
    if (!allowed.includes(file.type)) { notify('Only PDF, JPG, PNG files allowed', 'error'); return; }
    if (file.size > 20 * 1024 * 1024) { notify('File too large — max 20MB', 'error'); return; }
    setExtractModal({ certId, file, reviewData:null, isRenewal, detected:null });
    setExtracting(true);
    setEditId(null); setQuickId(null);
    try {
      const extracted = await extractCertData(file);
      const existing  = certs.find(c => c.id === certId) || {};
      const reviewData = {
        name:             extracted.name            || existing.name     || '',
        certNo:           extracted.certNo          || existing.certNo   || '',
        issueDate:        extracted.issueDate       || existing.issueDate|| '',
        expiryDate:       extracted.isUnlimited ? '' : (extracted.expiryDate || existing.expiryDate || ''),
        isUnlimited:      extracted.isUnlimited     || existing.expiryDate === 'unlimited' || false,
        category:         extracted.category        || existing.category || 'Others',
        issuingAuthority: extracted.issuingAuthority|| '',
        holderName:       extracted.holderName      || '',
        notes:            extracted.notes           || existing.notes    || '',
      };
      const detected = {};
      if (extracted.name)            detected.name      = true;
      if (extracted.certNo)          detected.certNo    = true;
      if (extracted.issueDate)       detected.issueDate = true;
      if (extracted.expiryDate || extracted.isUnlimited) detected.expiryDate = true;
      if (extracted.category)        detected.category  = true;
      if (extracted.issuingAuthority || extracted.notes) detected.notes = true;
      setExtractModal({ certId, file, reviewData, isRenewal, detected });
    } catch(e) {
      const existing = certs.find(c => c.id === certId) || {};
      setExtractModal({
        certId, file, isRenewal, detected:{}, extractError: e.message,
        reviewData: {
          name: existing.name||'', certNo: existing.certNo||'',
          issueDate: existing.issueDate||'',
          expiryDate: existing.expiryDate === 'unlimited' ? '' : (existing.expiryDate||''),
          isUnlimited: existing.expiryDate === 'unlimited'||false,
          category: existing.category||'Others', issuingAuthority:'', holderName:'', notes: existing.notes||'',
        }
      });
      notify('Could not auto-read certificate — please fill in manually', 'error');
    }
    setExtracting(false);
  };

  const confirmExtraction = async () => {
    if (!extractModal?.reviewData) return;
    const { certId, file, reviewData, isRenewal } = extractModal;
    if (!reviewData.name) { notify('Enter certificate name', 'error'); return; }
    const finalExpiry = reviewData.isUnlimited ? 'unlimited' : reviewData.expiryDate;
    if (!finalExpiry)    { notify('Enter expiry date or select Unlimited', 'error'); return; }
    setUploadingId(certId);
    try {
      let driveFileId = null, driveFileName = null;
      if (driveToken) {
        const existing = certs.find(c => c.id === certId);
        if (isRenewal && existing?.driveFileId) {
          try { await driveDeleteFile(driveToken, existing.driveFileId); } catch {}
        }
        const folderId = await getOrCreateFolder(driveToken);
        const ext      = file.name.split('.').pop();
        const safeName = reviewData.name.replace(/[^a-zA-Z0-9 ]/g,'');
        const uploaded = await driveUploadFile(driveToken, folderId, file, `${safeName}_${certId}.${ext}`);
        driveFileId = uploaded.id; driveFileName = file.name;
      }
      const notesText = [
        reviewData.notes,
        reviewData.issuingAuthority ? `Issued by: ${reviewData.issuingAuthority}` : null,
        reviewData.holderName       ? `Holder: ${reviewData.holderName}` : null,
      ].filter(Boolean).join(' | ');
      const patch = {
        name: reviewData.name, certNo: reviewData.certNo,
        issueDate: reviewData.issueDate, expiryDate: finalExpiry,
        category: reviewData.category, notes: notesText,
        ...(driveFileId ? { driveFileId, driveFileName } : {}),
      };
      await saveCerts(certs.map(c => c.id === certId ? { ...c, ...patch } : c));
      setExtractModal(null);
      notify(driveToken ? '✅ Certificate updated and saved to Drive' : '✅ Certificate updated', 'success');
    } catch(e) { notify('Save failed: ' + e.message, 'error'); }
    setUploadingId(null);
  };

  const handleAddFormScan = async (file) => {
    const allowed = ['application/pdf','image/jpeg','image/png','image/jpg'];
    if (!allowed.includes(file.type)) { notify('Only PDF, JPG, PNG files allowed', 'error'); return; }
    if (file.size > 20 * 1024 * 1024) { notify('File too large — max 20MB', 'error'); return; }
    setAddScanFile(file); setScanningAdd(true); setAddAiFields({});
    try {
      const extracted = await extractCertData(file);
      const detected = {}, updates = {};
      if (extracted.name)     { updates.name      = extracted.name;      detected.name      = true; setCustomName(false); }
      if (extracted.certNo)   { updates.certNo    = extracted.certNo;    detected.certNo    = true; }
      if (extracted.issueDate){ updates.issueDate  = extracted.issueDate; detected.issueDate = true; }
      if (extracted.category) { updates.category   = extracted.category;  detected.category  = true; }
      if (extracted.isUnlimited) { setUnlimitedExpiry(true); detected.expiryDate = true; }
      else if (extracted.expiryDate) { updates.expiryDate = extracted.expiryDate; detected.expiryDate = true; }
      if (extracted.notes || extracted.issuingAuthority) {
        updates.notes = [extracted.notes, extracted.issuingAuthority ? `Issued by: ${extracted.issuingAuthority}` : null].filter(Boolean).join(' | ');
        detected.notes = true;
      }
      setNewCert(n => ({ ...n, ...updates }));
      setAddAiFields(detected);
      notify(`✅ Scanned — ${Object.keys(detected).length} fields auto-filled. Review below.`, 'success');
    } catch(e) { notify('Could not read certificate — please fill in manually', 'error'); }
    setScanningAdd(false);
  };

  // ── Core data functions ───────────────────────────────────────────────────
  const loadCerts = async () => {
    setLoading(true);
    try {
      const snap = await getDoc(doc(db, 'certificates', user.uid));
      if (snap.exists()) setCerts(snap.data().list || []);
    } catch {}
    setLoading(false);
  };

  const saveCerts = async (updated) => {
    setSaving(true);
    try {
      await setDoc(doc(db, 'certificates', user.uid), { list: updated, updatedAt: new Date().toISOString() });
      setCerts(updated);
    } catch(e) { notify('Save failed: ' + e.message, 'error'); }
    setSaving(false);
  };

  const addCert = async () => {
    const name = newCert.name;
    if (!name) { notify('Enter certificate name', 'error'); return; }
    const finalExpiry = unlimitedExpiry ? 'unlimited' : newCert.expiryDate;
    if (!finalExpiry) { notify('Enter expiry date or select Unlimited', 'error'); return; }
    const id  = Date.now().toString();
    let entry = { ...newCert, expiryDate: finalExpiry, id };
    if (addScanFile && driveToken) {
      try {
        const folderId = await getOrCreateFolder(driveToken);
        const ext      = addScanFile.name.split('.').pop();
        const safeName = name.replace(/[^a-zA-Z0-9 ]/g,'');
        const uploaded = await driveUploadFile(driveToken, folderId, addScanFile, `${safeName}_${id}.${ext}`);
        entry = { ...entry, driveFileId: uploaded.id, driveFileName: addScanFile.name };
      } catch(e) { notify('Added but Drive upload failed: ' + e.message, 'error'); }
    }
    await saveCerts([...certs, entry]);
    setNewCert({ ...EMPTY_CERT });
    setShowAdd(false); setCustomName(false); setCustomCategory(false);
    setUnlimitedExpiry(false); setAddScanFile(null); setAddAiFields({});
    notify('✅ Certificate added' + (entry.driveFileId ? ' and uploaded to Drive' : ''), 'success');
  };

  const deleteCert = async (id) => {
    if (!window.confirm('Delete this certificate?')) return;
    const cert = certs.find(c => c.id === id);
    if (cert?.driveFileId && driveToken) {
      try { await driveDeleteFile(driveToken, cert.driveFileId); } catch {}
    }
    await saveCerts(certs.filter(c => c.id !== id));
    notify('Deleted', 'success');
  };

  const startEdit = (cert) => {
    setEditId(cert.id); setEditData({ ...cert });
    setEditUnlimited(cert.expiryDate === 'unlimited');
    setEditCustomName(!CERT_TEMPLATES.find(t => t.name === cert.name));
    setEditCustomCategory(!KNOWN_CATEGORIES.includes(cert.category));
    setQuickId(null); setExtractModal(null);
  };

  const cancelEdit = () => {
    setEditId(null); setEditData(null);
    setEditCustomName(false); setEditCustomCategory(false); setEditUnlimited(false);
  };

  const saveEdit = async () => {
    if (!editData.name) { notify('Enter certificate name', 'error'); return; }
    const finalExpiry = editUnlimited ? 'unlimited' : editData.expiryDate;
    if (!finalExpiry)   { notify('Enter expiry date or select Unlimited', 'error'); return; }
    await saveCerts(certs.map(c => c.id === editId ? { ...editData, expiryDate: finalExpiry } : c));
    cancelEdit();
    notify('✅ Certificate updated', 'success');
  };

  const startQuick = (cert) => {
    setQuickId(cert.id);
    setQuickData({ certNo: cert.certNo||'', expiryDate: cert.expiryDate === 'unlimited' ? '' : (cert.expiryDate||'') });
    setQuickUnlimited(cert.expiryDate === 'unlimited');
    setEditId(null); cancelEdit(); setExtractModal(null);
  };

  const saveQuick = async (id) => {
    const finalExpiry = quickUnlimited ? 'unlimited' : quickData.expiryDate;
    if (!finalExpiry) { notify('Enter new expiry date or select Unlimited', 'error'); return; }
    await saveCerts(certs.map(c => c.id === id ? { ...c, expiryDate: finalExpiry, certNo: quickData.certNo||c.certNo } : c));
    setQuickId(null);
    notify('✅ Certificate renewed', 'success');
  };

  const getCertsByTier = (tier) =>
    certs.filter(c => {
      if (!c.expiryDate || c.expiryDate === 'unlimited') return false;
      const days = Math.floor((new Date(c.expiryDate) - new Date()) / 86400000);
      return tier.test(days);
    });

  const filtered = catFilter === 'All' ? certs : certs.filter(c => c.category === catFilter);
  const expiring = certs.filter(c => {
    if (!c.expiryDate || c.expiryDate === 'unlimited') return false;
    const s = STATUS(c.expiryDate);
    return s.days !== undefined && s.days < 90;
  });

  // ── Form field renderer ───────────────────────────────────────────────────
  const renderFormFields = (data, setData, isCN, setIsCN, isCC, setIsCC, isUnlim, setIsUnlim, aiFields = {}) => {
    const aiBadge = (field) => aiFields[field]
      ? <span style={{ marginLeft:5, fontSize:'0.58rem', background:'rgba(0,180,216,0.2)', color:'var(--cyan)', borderRadius:10, padding:'1px 5px', fontWeight:700 }}>🤖 AI</span>
      : null;
    return (
      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10 }}>
        <div className="ff" style={{ gridColumn:'1/-1', margin:0 }}>
          <label className="fl">Certificate / Document Name * {aiBadge('name')}</label>
          <select className="fi"
            value={isCN ? '__custom__' : (CERT_TEMPLATES.find(t => t.name === data.name) ? data.name : data.name ? '__custom__' : '')}
            onChange={e => {
              if (e.target.value === '__custom__') { setIsCN(true); setData(n => ({ ...n, name:'' })); }
              else {
                const t = CERT_TEMPLATES.find(c => c.name === e.target.value);
                setIsCN(false);
                setData(n => ({ ...n, name: e.target.value, category: t?.category||n.category }));
              }
            }}>
            <option value="">— Select certificate / document —</option>
            {CERT_TEMPLATES.map(c => <option key={c.name} value={c.name}>{c.name}</option>)}
            <option value="__custom__">✏️ Enter custom name…</option>
          </select>
          {isCN && (
            <input className="fi" style={{ marginTop:6 }} placeholder="Type custom certificate name…"
              value={data.name} onChange={e => setData(n => ({ ...n, name: e.target.value }))} />
          )}
        </div>
        <div className="ff" style={{ margin:0 }}>
          <label className="fl">Certificate No. {aiBadge('certNo')}</label>
          <input className="fi" placeholder="e.g. INE-12345" value={data.certNo}
            onChange={e => setData(n => ({ ...n, certNo: e.target.value }))} />
        </div>
        <div className="ff" style={{ margin:0 }}>
          <label className="fl">Category {aiBadge('category')}</label>
          {!isCC ? (
            <select className="fi" value={data.category}
              onChange={e => {
                if (e.target.value === '__custom_cat__') { setIsCC(true); setData(n => ({ ...n, category:'' })); }
                else setData(n => ({ ...n, category: e.target.value }));
              }}>
              {KNOWN_CATEGORIES.map(c => <option key={c}>{c}</option>)}
              <option value="__custom_cat__">✏️ Custom category…</option>
            </select>
          ) : (
            <div style={{ display:'flex', gap:6 }}>
              <input className="fi" placeholder="Custom category…" value={data.category}
                onChange={e => setData(n => ({ ...n, category: e.target.value }))} />
              <button style={{ background:'none', border:'1px solid var(--border)', borderRadius:6, color:'var(--text3)', cursor:'pointer', padding:'0 8px' }}
                onClick={() => { setIsCC(false); setData(n => ({ ...n, category:'Others' })); }}>✕</button>
            </div>
          )}
        </div>
        <div className="ff" style={{ margin:0 }}>
          <label className="fl">Issue Date {aiBadge('issueDate')}</label>
          <input className="fi" type="date" value={data.issueDate}
            onChange={e => setData(n => ({ ...n, issueDate: e.target.value }))} />
        </div>
        <div className="ff" style={{ gridColumn:'1/-1', margin:0 }}>
          <label className="fl">Expiry Date * {aiBadge('expiryDate')}</label>
          <label style={{ display:'flex', alignItems:'center', gap:6, cursor:'pointer', fontSize:'0.75rem', color:'var(--cyan)', marginBottom:6 }}>
            <input type="checkbox" checked={isUnlim} onChange={e => setIsUnlim(e.target.checked)} style={{ accentColor:'var(--cyan)' }} />
            ∞ No Expiry / Unlimited Validity
          </label>
          {!isUnlim && (
            <input className="fi" type="date" value={data.expiryDate}
              onChange={e => setData(n => ({ ...n, expiryDate: e.target.value }))} />
          )}
        </div>
        <div className="ff" style={{ gridColumn:'1/-1', margin:0 }}>
          <label className="fl">Notes {aiBadge('notes')}</label>
          <input className="fi" placeholder="Issuing authority, flag state, endorsements…" value={data.notes}
            onChange={e => setData(n => ({ ...n, notes: e.target.value }))} />
        </div>
      </div>
    );
  };

  // ── Extraction review fields ──────────────────────────────────────────────
  const renderExtractionFields = () => {
    if (!extractModal?.reviewData) return null;
    const { reviewData, detected } = extractModal;
    const setField = (field, val) => setExtractModal(m => ({ ...m, reviewData: { ...m.reviewData, [field]: val } }));
    const badge = (field) => detected?.[field]
      ? <span style={{ marginLeft:5, fontSize:'0.58rem', background:'rgba(0,180,216,0.22)', color:'var(--cyan)', borderRadius:10, padding:'1px 5px', fontWeight:700 }}>🤖 AI</span>
      : null;
    return (
      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:8 }}>
        <div className="ff" style={{ gridColumn:'1/-1', margin:0 }}>
          <label className="fl">Certificate Name * {badge('name')}</label>
          <input className="fi" value={reviewData.name||''} placeholder="Certificate name…"
            onChange={e => setField('name', e.target.value)} />
        </div>
        <div className="ff" style={{ margin:0 }}>
          <label className="fl">Certificate No. {badge('certNo')}</label>
          <input className="fi" value={reviewData.certNo||''} placeholder="Cert number…"
            onChange={e => setField('certNo', e.target.value)} />
        </div>
        <div className="ff" style={{ margin:0 }}>
          <label className="fl">Category {badge('category')}</label>
          <select className="fi" value={reviewData.category||'Others'} onChange={e => setField('category', e.target.value)}>
            {KNOWN_CATEGORIES.map(c => <option key={c}>{c}</option>)}
          </select>
        </div>
        <div className="ff" style={{ margin:0 }}>
          <label className="fl">Issue Date {badge('issueDate')}</label>
          <input className="fi" type="date" value={reviewData.issueDate||''} onChange={e => setField('issueDate', e.target.value)} />
        </div>
        <div className="ff" style={{ gridColumn:'1/-1', margin:0 }}>
          <label className="fl">Expiry Date * {badge('expiryDate')}</label>
          <label style={{ display:'flex', alignItems:'center', gap:6, cursor:'pointer', fontSize:'0.74rem', color:'var(--cyan)', marginBottom:6 }}>
            <input type="checkbox" checked={!!reviewData.isUnlimited} onChange={e => setField('isUnlimited', e.target.checked)} style={{ accentColor:'var(--cyan)' }} />
            ∞ No Expiry / Unlimited
          </label>
          {!reviewData.isUnlimited && (
            <input className="fi" type="date" value={reviewData.expiryDate||''} onChange={e => setField('expiryDate', e.target.value)} />
          )}
        </div>
        <div className="ff" style={{ margin:0 }}>
          <label className="fl">Issuing Authority {badge('notes')}</label>
          <input className="fi" value={reviewData.issuingAuthority||''} placeholder="Issuing organization…"
            onChange={e => setField('issuingAuthority', e.target.value)} />
        </div>
        <div className="ff" style={{ margin:0 }}>
          <label className="fl">Notes</label>
          <input className="fi" value={reviewData.notes||''} placeholder="Additional notes…"
            onChange={e => setField('notes', e.target.value)} />
        </div>
      </div>
    );
  };

  if (!user) return (
    <div className="section">
      <div className="empty">
        <div className="empty-icon">🔐</div>
        <div className="empty-t">Login Required</div>
        <div className="empty-d">Please log in to track your certificates.</div>
      </div>
    </div>
  );

  return (
    <div className="section">

      {/* Drive + AI Banner */}
      <div style={{ background: driveConnected ? 'rgba(0,200,100,0.06)' : 'rgba(0,180,216,0.06)',
        border:`1px solid ${driveConnected ? 'rgba(0,200,100,0.25)' : 'rgba(0,180,216,0.25)'}`,
        borderRadius:12, padding:'0.75rem 1rem', marginBottom:'1rem',
        display:'flex', alignItems:'center', justifyContent:'space-between', flexWrap:'wrap', gap:10 }}>
        <div style={{ flex:1, minWidth:0 }}>
          <div style={{ fontSize:'0.76rem', fontWeight:700,
            color: driveConnected ? 'var(--green)' : 'var(--cyan)', fontFamily:'Orbitron,monospace' }}>
            {driveConnected ? '✅ Google Drive Connected — 🤖 AI Certificate Scanner Active' : '☁️ Connect Google Drive to Enable AI Certificate Scanner'}
          </div>
          <div style={{ fontSize:'0.68rem', color:'var(--text3)', marginTop:3, lineHeight:1.5 }}>
            {driveConnected
              ? 'Upload any certificate photo or PDF → AI automatically reads all details. Files stored in your own Google Drive.'
              : 'Connect your Google Drive to upload certificate copies. AI will auto-read all details from photos or PDFs. Files go directly to your Drive — zero cost, full privacy.'}
          </div>
          {driveConnected && (
            <div style={{ display:'flex', gap:12, marginTop:6, flexWrap:'wrap' }}>
              {['📷 Upload photo or PDF','🤖 AI reads cert number & dates','✏️ Review & edit any field','☁️ Saved to your Google Drive'].map((s,i) => (
                <span key={i} style={{ fontSize:'0.64rem', color:'var(--text3)' }}>{s}</span>
              ))}
            </div>
          )}
        </div>
        {driveConnected ? (
          <div style={{ display:'flex', gap:6, flexShrink:0 }}>
            <a href="https://drive.google.com/drive/folders" target="_blank" rel="noreferrer"
              style={{ padding:'5px 12px', borderRadius:7, fontSize:'0.7rem', fontWeight:700,
                background:'rgba(0,200,100,0.12)', color:'var(--green)',
                border:'1px solid rgba(0,200,100,0.3)', textDecoration:'none' }}>
              📂 My Drive
            </a>
            <button onClick={disconnectDrive}
              style={{ padding:'5px 12px', borderRadius:7, fontSize:'0.7rem', cursor:'pointer',
                background:'none', color:'var(--text3)', border:'1px solid rgba(255,255,255,0.1)' }}>
              Disconnect
            </button>
          </div>
        ) : (
          <button onClick={connectDrive} disabled={connectingDrive}
            style={{ padding:'7px 18px', borderRadius:8, fontSize:'0.74rem', fontWeight:700,
              cursor:'pointer', background:'linear-gradient(135deg,#4285f4,#34a853)',
              color:'#fff', border:'none', whiteSpace:'nowrap', flexShrink:0,
              opacity: connectingDrive ? 0.7 : 1 }}>
            {connectingDrive ? 'Connecting…' : '🔗 Connect Google Drive'}
          </button>
        )}
      </div>

      {/* Header */}
      <div className="sec-hdr">
        <div className="sec-title">📜 Certificate Tracker</div>
        <div style={{ display:'flex', gap:8, alignItems:'center', flexWrap:'wrap' }}>
          {expiring.length > 0 && (
            <span style={{ background:'rgba(255,71,87,0.15)', color:'#ff4757',
              border:'1px solid rgba(255,71,87,0.3)', borderRadius:20, padding:'3px 10px',
              fontSize:'0.7rem', fontWeight:700 }}>⚠️ {expiring.length} expiring</span>
          )}
          <button style={{ padding:'6px 14px', fontSize:'0.74rem', background:'rgba(0,180,216,0.1)',
            color:'var(--cyan)', border:'1px solid rgba(0,180,216,0.3)', borderRadius:8, cursor:'pointer' }}
            onClick={() => { setShowExpDash(s => !s); setActiveTier(null); }}>
            {showExpDash ? '✕ Timeline' : '📅 Expiry Timeline'}
          </button>
          <button className="btn btn-primary" style={{ padding:'6px 14px', fontSize:'0.74rem' }}
            onClick={() => setShowAdd(s => !s)}>
            {showAdd ? '✕ Cancel' : '+ Add Certificate'}
          </button>
        </div>
      </div>

      {/* Expiry alerts */}
      {expiring.length > 0 && (
        <div style={{ background:'rgba(255,71,87,0.08)', border:'1px solid rgba(255,71,87,0.25)',
          borderRadius:10, padding:'0.8rem 1rem', marginBottom:'1rem' }}>
          <div style={{ fontFamily:'Orbitron,monospace', fontSize:'0.72rem', color:'#ff4757', marginBottom:'0.4rem' }}>⚠️ ACTION REQUIRED</div>
          {expiring.map((c,i) => {
            const s = STATUS(c.expiryDate);
            return (
              <div key={i} style={{ fontSize:'0.74rem', color:'var(--text2)', padding:'3px 0' }}>
                <span style={{ color:s.color, fontWeight:700 }}>{s.label}</span> — {c.name}
                {s.days >= 0 ? ` (${s.days} days left)` : ' (renewal overdue)'}
              </div>
            );
          })}
        </div>
      )}

      {/* Expiry Timeline */}
      {showExpDash && (
        <div style={{ background:'var(--card)', border:'1px solid rgba(0,180,216,0.2)', borderRadius:14, padding:'1.2rem', marginBottom:'1.2rem' }}>
          <div style={{ fontFamily:'Orbitron,monospace', fontSize:'0.78rem', color:'var(--cyan)', marginBottom:'1rem' }}>📅 CERTIFICATE EXPIRY TIMELINE</div>
          <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(110px,1fr))', gap:8, marginBottom:'1rem' }}>
            {EXPIRY_TIERS.map(tier => {
              const count = getCertsByTier(tier).length;
              const isActive = activeTier === tier.key;
              return (
                <div key={tier.key} onClick={() => setActiveTier(isActive ? null : tier.key)}
                  style={{ background: isActive ? `${tier.color}22` : `${tier.color}0d`,
                    border:`1px solid ${isActive ? tier.color : tier.color+'44'}`,
                    borderRadius:10, padding:'0.75rem 0.5rem', cursor:'pointer', textAlign:'center', transition:'all 0.2s' }}>
                  <div style={{ fontSize:'1.5rem', fontWeight:900, color: count > 0 ? tier.color : 'var(--text3)' }}>{count}</div>
                  <div style={{ fontSize:'0.62rem', color:'var(--text3)', marginTop:2, lineHeight:1.3 }}>{tier.label}</div>
                </div>
              );
            })}
          </div>
          {activeTier && (() => {
            const tier = EXPIRY_TIERS.find(t => t.key === activeTier);
            const tierCerts = getCertsByTier(tier);
            return (
              <div style={{ borderTop:`1px solid ${tier.color}33`, paddingTop:'0.8rem' }}>
                <div style={{ fontSize:'0.72rem', color:tier.color, fontWeight:700, fontFamily:'Orbitron,monospace', marginBottom:'0.6rem' }}>
                  {tier.label} — {tierCerts.length} certificate{tierCerts.length !== 1 ? 's' : ''}
                </div>
                {tierCerts.length === 0
                  ? <div style={{ fontSize:'0.74rem', color:'var(--text3)', textAlign:'center', padding:'0.8rem' }}>✅ No certificates in this range</div>
                  : <div style={{ display:'grid', gap:6 }}>
                      {tierCerts.map(c => {
                        const days = Math.floor((new Date(c.expiryDate) - new Date()) / 86400000);
                        return (
                          <div key={c.id} style={{ display:'flex', justifyContent:'space-between', alignItems:'center',
                            background:'rgba(255,255,255,0.03)', border:`1px solid ${tier.color}22`, borderRadius:8, padding:'0.5rem 0.8rem' }}>
                            <div>
                              <div style={{ fontSize:'0.78rem', fontWeight:700, color:'var(--text)' }}>{c.name}</div>
                              <div style={{ fontSize:'0.65rem', color:'var(--text3)' }}>{c.category}</div>
                            </div>
                            <div style={{ textAlign:'right', flexShrink:0 }}>
                              <div style={{ fontSize:'0.72rem', color:tier.color, fontWeight:700 }}>{days < 0 ? 'EXPIRED' : `${days}d left`}</div>
                              <div style={{ fontSize:'0.65rem', color:'var(--text3)' }}>{c.expiryDate}</div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                }
              </div>
            );
          })()}
          {EXPIRY_TIERS.every(t => getCertsByTier(t).length === 0) && (
            <div style={{ textAlign:'center', fontSize:'0.74rem', color:'var(--green)', padding:'0.4rem' }}>✅ All certificates valid for more than 12 months</div>
          )}
        </div>
      )}

      {/* Add Certificate Form */}
      {showAdd && (
        <div style={{ background:'var(--card)', border:'1px solid rgba(0,180,216,0.3)', borderRadius:14, padding:'1.3rem', marginBottom:'1.2rem' }}>
          <div style={{ fontFamily:'Orbitron,monospace', fontSize:'0.78rem', color:'var(--cyan)', marginBottom:'0.8rem' }}>+ Add New Certificate / Document</div>
          {/* AI Scan Banner */}
          <div style={{ background:'rgba(0,180,216,0.05)', border:'1px dashed rgba(0,180,216,0.35)', borderRadius:10, padding:'0.9rem', marginBottom:'1rem' }}>
            <div style={{ fontSize:'0.76rem', color:'var(--cyan)', fontWeight:700, marginBottom:3 }}>🤖 Smart Auto-Fill</div>
            <div style={{ fontSize:'0.68rem', color:'var(--text3)', marginBottom:10, lineHeight:1.5 }}>
              Upload a photo or PDF of your certificate — AI will automatically read and fill in all the details below. You can edit anything after.
            </div>
            <div style={{ display:'flex', alignItems:'center', gap:10, flexWrap:'wrap' }}>
              <input id="add-scan-input" type="file" accept=".pdf,.jpg,.jpeg,.png" style={{ display:'none' }}
                onChange={e => { if (e.target.files?.[0]) handleAddFormScan(e.target.files[0]); e.target.value=''; }} />
              <label htmlFor="add-scan-input"
                style={{ display:'inline-flex', alignItems:'center', gap:6, padding:'7px 16px', borderRadius:8,
                  cursor: scanningAdd ? 'default' : 'pointer', fontSize:'0.74rem', fontWeight:700,
                  background: 'rgba(0,180,216,0.15)', color:'var(--cyan)', border:'1px solid rgba(0,180,216,0.45)',
                  pointerEvents: scanningAdd ? 'none' : 'auto', opacity: scanningAdd ? 0.7 : 1 }}>
                {scanningAdd ? '⏳ AI Reading…' : '📷 Scan Certificate'}
              </label>
              {addScanFile && !scanningAdd && (
                <span style={{ fontSize:'0.68rem', color:'var(--green)', display:'flex', alignItems:'center', gap:6 }}>
                  ✅ {addScanFile.name}
                  {Object.keys(addAiFields).length > 0 &&
                    <span style={{ background:'rgba(0,180,216,0.15)', color:'var(--cyan)', borderRadius:10, padding:'1px 7px', fontSize:'0.6rem', fontWeight:700 }}>
                      🤖 {Object.keys(addAiFields).length} fields filled
                    </span>
                  }
                  <button onClick={() => { setAddScanFile(null); setAddAiFields({}); setNewCert({...EMPTY_CERT}); }}
                    style={{ background:'none', border:'none', color:'var(--text3)', cursor:'pointer', fontSize:'0.9rem' }}>✕</button>
                </span>
              )}
              {!addScanFile && <span style={{ fontSize:'0.65rem', color:'var(--text3)' }}>or fill in manually below</span>}
            </div>
          </div>
          {renderFormFields(newCert, setNewCert, customName, setCustomName, customCategory, setCustomCategory, unlimitedExpiry, setUnlimitedExpiry, addAiFields)}
          <button className="btn btn-primary" style={{ marginTop:10 }} onClick={addCert} disabled={saving}>
            {saving ? 'Saving…' : '✅ Add Certificate'}
          </button>
        </div>
      )}

      {/* Category filter */}
      <div className="fbar" style={{ marginBottom:'1rem' }}>
        {CATEGORIES.map(c => (
          <button key={c} className={`fbtn ${catFilter===c?'active':''}`} onClick={() => setCatFilter(c)}>{c}</button>
        ))}
      </div>

      {loading && <div className="loading"><div className="spin"/><span>Loading certificates…</span></div>}

      {!loading && filtered.length === 0 && (
        <div className="empty">
          <div className="empty-icon">📜</div>
          <div className="empty-t">No Certificates Added Yet</div>
          <div className="empty-d">Click "+ Add Certificate" to start tracking your STCW certificates and renewal dates.</div>
        </div>
      )}

      {filtered.length > 0 && (
        <div style={{ display:'grid', gap:'0.7rem' }}>
          {filtered.map(c => {
            const s             = STATUS(c.expiryDate);
            const isEditing     = editId      === c.id;
            const isQuickUpdate = quickId     === c.id;
            const isUploading   = uploadingId === c.id;
            const hasDriveFile  = !!c.driveFileId;
            const isExtracting  = extractModal?.certId === c.id;
            const miniBtn = (bg, color, border) => ({
              fontSize:'0.63rem', padding:'3px 8px', borderRadius:6, cursor:'pointer',
              background:bg, color, border, fontWeight:600, whiteSpace:'nowrap'
            });

            return (
              <div key={c.id} style={{ background:'var(--card)', border:`1px solid ${s.color}33`,
                borderRadius:12, padding:'1rem', display:'flex', flexDirection:'column', gap:0 }}>

                <div style={{ display:'flex', gap:12, alignItems:'flex-start' }}>
                  <div style={{ width:8, borderRadius:4, alignSelf:'stretch', background:s.color, flexShrink:0 }} />
                  <div style={{ flex:1, minWidth:0 }}>
                    <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', flexWrap:'wrap', gap:6 }}>
                      <div style={{ fontWeight:700, fontSize:'0.86rem', color:'var(--text)' }}>{c.name}</div>
                      <span style={{ padding:'2px 10px', borderRadius:20, fontSize:'0.62rem', fontWeight:700,
                        background:s.bg, color:s.color, border:`1px solid ${s.color}44`, flexShrink:0 }}>
                        {s.label}{s.days >= 0 ? ` · ${s.days}d left` : ''}
                      </span>
                    </div>
                    <div style={{ display:'flex', gap:14, marginTop:4, flexWrap:'wrap' }}>
                      {c.certNo    && <span style={{ fontSize:'0.72rem', color:'var(--text3)' }}>No: <strong style={{ color:'var(--cyan)' }}>{c.certNo}</strong></span>}
                      {c.issueDate && <span style={{ fontSize:'0.72rem', color:'var(--text3)' }}>Issued: {c.issueDate}</span>}
                      {c.expiryDate && c.expiryDate !== 'unlimited' && <span style={{ fontSize:'0.72rem', color:'var(--text3)' }}>Expires: <strong style={{ color:s.color }}>{c.expiryDate}</strong></span>}
                      {c.expiryDate === 'unlimited' && <span style={{ fontSize:'0.72rem', color:'#00b4d8' }}>∞ Unlimited Validity</span>}
                      <span style={{ fontSize:'0.62rem', color:'var(--text3)', background:'rgba(255,255,255,0.05)', padding:'1px 7px', borderRadius:10 }}>{c.category}</span>
                    </div>
                    {c.notes && <div style={{ fontSize:'0.72rem', color:'var(--text3)', marginTop:4 }}>📝 {c.notes}</div>}

                    {/* Drive file section */}
                    <div style={{ marginTop:8, display:'flex', alignItems:'center', gap:6, flexWrap:'wrap' }}>
                      {hasDriveFile ? (
                        <>
                          <span style={{ fontSize:'0.66rem', color:'var(--green)', background:'rgba(0,200,100,0.08)',
                            border:'1px solid rgba(0,200,100,0.25)', borderRadius:20, padding:'2px 8px',
                            maxWidth:180, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
                            ☁️ {c.driveFileName || 'Certificate on Drive'}
                          </span>
                          <button onClick={() => viewDriveFile(c.driveFileId)} style={miniBtn('rgba(0,180,216,0.1)','var(--cyan)','1px solid rgba(0,180,216,0.3)')}>📄 View</button>
                          <button onClick={() => downloadDriveFile(c.driveFileId, c.driveFileName)} style={miniBtn('rgba(100,200,100,0.1)','var(--green)','1px solid rgba(100,200,100,0.3)')}>⬇️ Download</button>
                          <>
                            <input id={`upd-${c.id}`} type="file" accept=".pdf,.jpg,.jpeg,.png" style={{ display:'none' }}
                              onChange={e => { if (e.target.files?.[0]) handleFileUpload(c.id, e.target.files[0], true); e.target.value=''; }} />
                            <label htmlFor={`upd-${c.id}`} style={{ ...miniBtn('rgba(240,165,0,0.1)','var(--gold)','1px solid rgba(240,165,0,0.35)'), cursor:'pointer', display:'inline-flex', alignItems:'center' }}>📁 Update File</label>
                          </>
                          <button onClick={() => removeDriveFile(c.id)} style={miniBtn('none','var(--text3)','1px solid rgba(255,255,255,0.1)')}>✕ Remove</button>
                        </>
                      ) : driveConnected ? (
                        <>
                          <input id={`drv-${c.id}`} type="file" accept=".pdf,.jpg,.jpeg,.png" style={{ display:'none' }}
                            onChange={e => { if (e.target.files?.[0]) handleFileUpload(c.id, e.target.files[0], false); e.target.value=''; }} />
                          <label htmlFor={`drv-${c.id}`}
                            style={{ fontSize:'0.65rem', padding:'3px 10px', borderRadius:6,
                              cursor: isUploading ? 'default' : 'pointer',
                              background:'rgba(0,180,216,0.07)', color:'var(--cyan)',
                              border:'1px dashed rgba(0,180,216,0.4)',
                              display:'inline-flex', alignItems:'center', gap:5,
                              pointerEvents: isUploading ? 'none' : 'auto', opacity: isUploading ? 0.6 : 1 }}>
                            {isUploading ? '⏳ Uploading…' : '📎 Upload Copy — 🤖 AI reads details'}
                          </label>
                        </>
                      ) : (
                        <span style={{ fontSize:'0.64rem', color:'var(--text3)', fontStyle:'italic' }}>Connect Drive above to upload certificate copy</span>
                      )}
                    </div>
                  </div>

                  {/* Action buttons */}
                  <div style={{ display:'flex', flexDirection:'column', gap:4, flexShrink:0 }}>
                    <button onClick={() => isQuickUpdate ? setQuickId(null) : startQuick(c)}
                      style={{ background: isQuickUpdate ? 'rgba(0,200,100,0.15)' : 'rgba(0,180,216,0.08)',
                        border:`1px solid ${isQuickUpdate ? 'rgba(0,200,100,0.4)' : 'rgba(0,180,216,0.3)'}`,
                        color: isQuickUpdate ? 'var(--green)' : 'var(--cyan)',
                        borderRadius:6, cursor:'pointer', fontSize:'0.63rem', padding:'4px 8px', fontWeight:700, whiteSpace:'nowrap' }}>
                      🔄 Renew
                    </button>
                    <button onClick={() => isEditing ? cancelEdit() : startEdit(c)}
                      style={{ background: isEditing ? 'rgba(240,165,0,0.15)' : 'rgba(255,255,255,0.05)',
                        border:`1px solid ${isEditing ? 'rgba(240,165,0,0.5)' : 'rgba(255,255,255,0.1)'}`,
                        color: isEditing ? 'var(--gold)' : 'var(--text2)',
                        borderRadius:6, cursor:'pointer', fontSize:'0.63rem', padding:'4px 8px', fontWeight:700 }}>
                      ✏️ Edit
                    </button>
                    <button onClick={() => deleteCert(c.id)}
                      style={{ background:'none', border:'1px solid rgba(255,71,87,0.25)',
                        color:'#ff4757', borderRadius:6, cursor:'pointer', fontSize:'0.63rem', padding:'4px 8px' }}>
                      🗑 Delete
                    </button>
                  </div>
                </div>

                {/* AI Extraction Review Panel */}
                {isExtracting && (
                  <div style={{ borderTop:'1px solid rgba(0,180,216,0.25)', marginTop:12, paddingTop:12 }}>
                    <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:10, flexWrap:'wrap', gap:6 }}>
                      <div style={{ fontFamily:'Orbitron,monospace', fontSize:'0.7rem', color:'var(--cyan)' }}>
                        {extracting ? '🔍 AI READING CERTIFICATE…' : '🤖 AI EXTRACTED DATA — Review & Edit if Needed'}
                      </div>
                      {!extracting && extractModal?.detected && Object.keys(extractModal.detected).length > 0 && (
                        <span style={{ fontSize:'0.62rem', color:'var(--green)', background:'rgba(0,200,100,0.1)', borderRadius:10, padding:'2px 8px', fontWeight:700 }}>
                          🤖 {Object.keys(extractModal.detected).length} fields auto-filled
                        </span>
                      )}
                    </div>
                    {extracting ? (
                      <div style={{ display:'flex', alignItems:'center', gap:10, padding:'1.5rem', justifyContent:'center' }}>
                        <div className="spin" />
                        <span style={{ fontSize:'0.75rem', color:'var(--text3)' }}>Analyzing certificate with AI…</span>
                      </div>
                    ) : (
                      <>
                        {extractModal?.extractError && (
                          <div style={{ fontSize:'0.7rem', color:'#ff6b35', marginBottom:10, background:'rgba(255,107,53,0.08)', borderRadius:8, padding:'6px 10px', border:'1px solid rgba(255,107,53,0.25)' }}>
                            ⚠️ Auto-read failed — please fill in details manually below
                          </div>
                        )}
                        {extractModal?.isRenewal && (
                          <div style={{ fontSize:'0.7rem', color:'var(--gold)', marginBottom:10, background:'rgba(240,165,0,0.08)', borderRadius:8, padding:'6px 10px', border:'1px solid rgba(240,165,0,0.25)' }}>
                            📁 Renewal — old file will be replaced in Drive. Update dates below if needed.
                          </div>
                        )}
                        {renderExtractionFields()}
                        <div style={{ display:'flex', gap:6, marginTop:12, flexWrap:'wrap' }}>
                          <button className="btn btn-primary" style={{ fontSize:'0.72rem', padding:'6px 16px' }}
                            onClick={confirmExtraction} disabled={saving || isUploading}>
                            {isUploading ? '⏳ Uploading to Drive…' : driveToken ? '✅ Confirm & Upload to Drive' : '✅ Confirm & Save'}
                          </button>
                          <button style={{ background:'none', border:'1px solid var(--border)', borderRadius:7,
                            color:'var(--text3)', cursor:'pointer', fontSize:'0.72rem', padding:'5px 12px' }}
                            onClick={() => setExtractModal(null)}>Cancel</button>
                        </div>
                      </>
                    )}
                  </div>
                )}

                {/* Quick Renew */}
                {isQuickUpdate && (
                  <div style={{ borderTop:'1px solid rgba(0,200,100,0.2)', marginTop:10, paddingTop:10 }}>
                    <div style={{ fontFamily:'Orbitron,monospace', fontSize:'0.68rem', color:'var(--green)', marginBottom:8 }}>🔄 QUICK RENEWAL</div>
                    <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:8 }}>
                      <div className="ff" style={{ margin:0 }}>
                        <label className="fl">New Certificate No.</label>
                        <input className="fi" placeholder="Updated cert number…" value={quickData.certNo}
                          onChange={e => setQuickData(d => ({ ...d, certNo: e.target.value }))} />
                      </div>
                      <div className="ff" style={{ margin:0 }}>
                        <label className="fl">New Expiry Date</label>
                        <label style={{ display:'flex', alignItems:'center', gap:5, cursor:'pointer', fontSize:'0.72rem', color:'var(--cyan)', marginBottom:5 }}>
                          <input type="checkbox" checked={quickUnlimited} onChange={e => setQuickUnlimited(e.target.checked)} style={{ accentColor:'var(--cyan)' }} /> ∞ Unlimited
                        </label>
                        {!quickUnlimited && (
                          <input className="fi" type="date" value={quickData.expiryDate}
                            onChange={e => setQuickData(d => ({ ...d, expiryDate: e.target.value }))} />
                        )}
                      </div>
                    </div>
                    <div style={{ display:'flex', gap:6, marginTop:8 }}>
                      <button className="btn btn-primary" style={{ fontSize:'0.72rem', padding:'5px 12px' }}
                        onClick={() => saveQuick(c.id)} disabled={saving}>
                        {saving ? 'Saving…' : '✅ Save Renewal'}
                      </button>
                      <button style={{ background:'none', border:'1px solid var(--border)', borderRadius:7,
                        color:'var(--text3)', cursor:'pointer', fontSize:'0.72rem', padding:'5px 10px' }}
                        onClick={() => setQuickId(null)}>Cancel</button>
                    </div>
                  </div>
                )}

                {/* Full Edit */}
                {isEditing && !isQuickUpdate && editData && (
                  <div style={{ borderTop:'1px solid rgba(240,165,0,0.25)', marginTop:10, paddingTop:10 }}>
                    <div style={{ fontFamily:'Orbitron,monospace', fontSize:'0.68rem', color:'var(--gold)', marginBottom:8 }}>✏️ EDIT CERTIFICATE</div>
                    {renderFormFields(editData, setEditData, editCustomName, setEditCustomName, editCustomCategory, setEditCustomCategory, editUnlimited, setEditUnlimited)}
                    <div style={{ display:'flex', gap:6, marginTop:10 }}>
                      <button className="btn btn-primary" style={{ fontSize:'0.72rem', padding:'5px 12px' }}
                        onClick={saveEdit} disabled={saving}>
                        {saving ? 'Saving…' : '✅ Save Changes'}
                      </button>
                      <button style={{ background:'none', border:'1px solid var(--border)', borderRadius:7,
                        color:'var(--text3)', cursor:'pointer', fontSize:'0.72rem', padding:'5px 10px' }}
                        onClick={cancelEdit}>Cancel</button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      <div className="info-box" style={{ marginTop:'1.2rem', fontSize:'0.72rem' }}>
        🔒 Certificate data stored in Firebase — visible only to you. Files stored in your own Google Drive. AI extraction powered by Google Gemini — your documents are never stored by the AI.
      </div>
    </div>
  );
}

export default CertificateTrackerPage;
