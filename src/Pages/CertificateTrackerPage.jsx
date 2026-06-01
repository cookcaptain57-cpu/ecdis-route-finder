/* eslint-disable */
// src/pages/CertificateTrackerPage.jsx
import { useState, useEffect } from "react";
import { db } from "../firebase";
import { doc, getDoc, setDoc } from "firebase/firestore";

// ─────────────────────────────────────────────────────────────────────────────
// CONSTANTS
// ─────────────────────────────────────────────────────────────────────────────
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

const KNOWN_CATEGORIES = [
  'Competency','Safety','Medical','Navigation','Engineering','Tanker','Personal','Others'
];
const CATEGORIES      = ['All', ...KNOWN_CATEGORIES];
const DRIVE_SCOPE     = 'https://www.googleapis.com/auth/drive.file';
const DRIVE_CLIENT_ID = '636056685819-b0mv1o4ftbdfirtan4svpoaa83ns49c6.apps.googleusercontent.com';
const DRIVE_FOLDER    = 'NavisphereX Certificates';
const EXPIRY_TIERS    = [
  { key:'expired', label:'Expired',     color:'#ff4757', test: d => d < 0 },
  { key:'1mo',     label:'< 1 Month',   color:'#ff5252', test: d => d >= 0   && d < 30  },
  { key:'2mo',     label:'< 2 Months',  color:'#ff6b35', test: d => d >= 30  && d < 60  },
  { key:'3mo',     label:'< 3 Months',  color:'#ff9f43', test: d => d >= 60  && d < 90  },
  { key:'6mo',     label:'< 6 Months',  color:'#ffa502', test: d => d >= 90  && d < 180 },
  { key:'12mo',    label:'< 12 Months', color:'#f0a500', test: d => d >= 180 && d < 365 },
];
const EMPTY_CERT = { name:'', certNo:'', issueDate:'', expiryDate:'', category:'Safety', notes:'' };

// ─────────────────────────────────────────────────────────────────────────────
// STATUS helper
// ─────────────────────────────────────────────────────────────────────────────
const STATUS = (expiryDate) => {
  if (!expiryDate) return { label:'Unknown', color:'var(--text3)', bg:'rgba(255,255,255,0.05)' };
  if (expiryDate === 'unlimited') return { label:'UNLIMITED', color:'#00b4d8', bg:'rgba(0,180,216,0.1)' };
  const days = Math.floor((new Date(expiryDate) - new Date()) / 86400000);
  if (days < 0)  return { label:'EXPIRED',       color:'#ff4757', bg:'rgba(255,71,87,0.12)',    days };
  if (days < 30) return { label:'EXPIRING SOON', color:'#ff6b35', bg:'rgba(255,107,53,0.12)',   days };
  if (days < 90) return { label:'DUE SOON',      color:'var(--gold)', bg:'rgba(240,165,0,0.1)', days };
  return             { label:'VALID',            color:'var(--green)', bg:'rgba(0,200,100,0.08)', days };
};

// ─────────────────────────────────────────────────────────────────────────────
// GOOGLE DRIVE HELPERS
// ─────────────────────────────────────────────────────────────────────────────
async function driveSearchFolder(token) {
  const q   = encodeURIComponent(`name='${DRIVE_FOLDER}' and mimeType='application/vnd.google-apps.folder' and trashed=false`);
  const res  = await fetch(`https://www.googleapis.com/drive/v3/files?q=${q}&fields=files(id,name)`, {
    headers: { Authorization:`Bearer ${token}` }
  });
  const data = await res.json();
  return data.files?.[0]?.id || null;
}

async function driveCreateFolder(token) {
  const res = await fetch('https://www.googleapis.com/drive/v3/files', {
    method:'POST',
    headers: { Authorization:`Bearer ${token}`, 'Content-Type':'application/json' },
    body: JSON.stringify({ name:DRIVE_FOLDER, mimeType:'application/vnd.google-apps.folder' })
  });
  return (await res.json()).id;
}

async function driveUploadFile(token, folderId, file, fileName) {
  const form = new FormData();
  form.append('metadata', new Blob([JSON.stringify({ name:fileName, parents:[folderId] })], { type:'application/json' }));
  form.append('file', file);
  const res  = await fetch('https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,name', {
    method:'POST', headers:{ Authorization:`Bearer ${token}` }, body:form
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error?.message || 'Upload failed');
  return data;
}

async function driveDeleteFile(token, fileId) {
  await fetch(`https://www.googleapis.com/drive/v3/files/${fileId}`, {
    method:'DELETE', headers:{ Authorization:`Bearer ${token}` }
  });
}

async function driveGetBlob(token, fileId) {
  const res = await fetch(`https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`, {
    headers:{ Authorization:`Bearer ${token}` }
  });
  if (!res.ok) throw new Error('Download failed');
  return res.blob();
}

// ─────────────────────────────────────────────────────────────────────────────
// IMPROVEMENT 2 — Auto image compression before scanning
// Compresses phone photos (often 4–8MB) down to under 800KB
// PDFs are passed through unchanged
// ─────────────────────────────────────────────────────────────────────────────
async function compressImage(file) {
  if (file.type === 'application/pdf')  return file;
  if (file.size < 800 * 1024)           return file; // already small
  return new Promise((resolve) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      URL.revokeObjectURL(url);
      const canvas = document.createElement('canvas');
      let { width, height } = img;
      const MAX = 1200;
      if (width > height && width > MAX)  { height = (height / width) * MAX; width = MAX; }
      else if (height > MAX)              { width  = (width / height) * MAX; height = MAX; }
      canvas.width = Math.round(width);
      canvas.height = Math.round(height);
      canvas.getContext('2d').drawImage(img, 0, 0, canvas.width, canvas.height);
      canvas.toBlob((blob) => {
        const out = new File([blob], file.name.replace(/\.[^.]+$/, '.jpg'), { type:'image/jpeg' });
        console.info(`[Scanner] Compressed ${(file.size/1024).toFixed(0)}KB → ${(out.size/1024).toFixed(0)}KB`);
        resolve(out);
      }, 'image/jpeg', 0.82);
    };
    img.onerror = () => { URL.revokeObjectURL(url); resolve(file); };
    img.src = url;
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// AI SCANNER  (internal — never mention Gemini/API to users)
// ─────────────────────────────────────────────────────────────────────────────
const _key = () => process.env.REACT_APP_GEMINI_API_KEY || '';

const fileToBase64 = (file) => new Promise((resolve, reject) => {
  const r = new FileReader();
  r.onload  = () => resolve(r.result.split(',')[1]);
  r.onerror = reject;
  r.readAsDataURL(file);
});

async function extractCertData(file) {
  const key = _key();
  if (!key) throw new Error('NOT_CONFIGURED');
  const base64 = await fileToBase64(file);
  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${key}`;
  const res = await fetch(url, {
    method:'POST', headers:{ 'Content-Type':'application/json' },
    body: JSON.stringify({
      contents:[{ parts:[
        { inline_data:{ mime_type: file.type === 'image/jpg' ? 'image/jpeg' : file.type, data:base64 } },
        { text:`You are a maritime certificate parser. Extract all readable information from this document.
Return ONLY a valid JSON object — no markdown, no explanation:
{
  "name": "exact certificate title as printed",
  "certNo": "certificate number or null",
  "issueDate": "YYYY-MM-DD or null",
  "expiryDate": "YYYY-MM-DD or null",
  "isUnlimited": false,
  "issuingAuthority": "issuing organization or null",
  "holderName": "holder full name or null",
  "category": "one of: Competency, Safety, Medical, Navigation, Engineering, Tanker, Personal, Others",
  "notes": "other relevant info or null"
}
Set isUnlimited true if document shows no expiry or unlimited. Return ONLY the JSON.` }
      ]}],
      generationConfig:{ temperature:0.1, maxOutputTokens:1000 }
    })
  });
  if (!res.ok) {
    const e = await res.json();
    console.error('[Scanner] API error:', e);
    const msg = e.error?.message || '';
    if (msg.includes('API_KEY_INVALID') || msg.includes('API key')) throw new Error('INVALID_KEY');
    if (msg.includes('quota') || msg.includes('QUOTA'))              throw new Error('QUOTA_EXCEEDED');
    throw new Error(msg || `HTTP_${res.status}`);
  }
  const data = await res.json();
  const text = data.candidates?.[0]?.content?.parts?.[0]?.text || '{}';
  return JSON.parse(text.replace(/```json|```/g,'').trim());
}

// User-friendly error messages — no technical details shown
function scanErrorMessage(code) {
  if (code === 'NOT_CONFIGURED') return 'Document scanning is not available right now.';
  if (code === 'INVALID_KEY')    return 'Document scanning is not available right now.';
  if (code === 'QUOTA_EXCEEDED') return 'Scanning limit reached. Please try again later.';
  if (code?.includes('NetworkError') || code?.includes('fetch'))
                                 return 'No internet connection. Please check your network and try again.';
  return 'Could not read this file automatically — please fill in the details below.';
}

// ─────────────────────────────────────────────────────────────────────────────
// COMPONENT
// ─────────────────────────────────────────────────────────────────────────────
function CertificateTrackerPage({ user, notify }) {

  // Core state
  const [certs,     setCerts]     = useState([]);
  const [loading,   setLoading]   = useState(true);
  const [saving,    setSaving]    = useState(false);
  const [showAdd,   setShowAdd]   = useState(false);
  const [catFilter, setCatFilter] = useState('All');
  const [newCert,   setNewCert]   = useState({ ...EMPTY_CERT });
  const [customName,      setCustomName]      = useState(false);
  const [unlimitedExpiry, setUnlimitedExpiry] = useState(false);
  const [customCategory,  setCustomCategory]  = useState(false);

  // Edit state
  const [editId,             setEditId]            = useState(null);
  const [editData,           setEditData]          = useState(null);
  const [editCustomName,     setEditCustomName]    = useState(false);
  const [editCustomCategory, setEditCustomCategory]= useState(false);
  const [editUnlimited,      setEditUnlimited]     = useState(false);

  // Quick renew state
  const [quickId,        setQuickId]        = useState(null);
  const [quickData,      setQuickData]      = useState({ certNo:'', expiryDate:'' });
  const [quickUnlimited, setQuickUnlimited] = useState(false);

  // Timeline state
  const [showExpDash, setShowExpDash] = useState(false);
  const [activeTier,  setActiveTier]  = useState(null);

  // Drive state
  const [driveToken,      setDriveToken]      = useState(null);
  const [driveConnected,  setDriveConnected]  = useState(false);
  const [driveEmail,      setDriveEmail]      = useState(null);       // IMPROVEMENT 6
  const [driveFolderId,   setDriveFolderId]   = useState(null);
  const [uploadingId,     setUploadingId]     = useState(null);
  const [connectingDrive, setConnectingDrive] = useState(false);
  const [driveExpired,    setDriveExpired]    = useState(false);      // IMPROVEMENT 5

  // AI / scan state
  const [extractModal,   setExtractModal]   = useState(null);
  const [extracting,     setExtracting]     = useState(false);
  const [extractErrMsg,  setExtractErrMsg]  = useState('');          // IMPROVEMENT 4
  const [addScanFile,    setAddScanFile]    = useState(null);
  const [scanningAdd,    setScanningAdd]    = useState(false);
  const [addAiFields,    setAddAiFields]    = useState({});
  const [addScanErrMsg,  setAddScanErrMsg]  = useState('');          // IMPROVEMENT 4

  // ─────────────────────────────────────────────────────────────────────────
  // IMPROVEMENT 1 — Diagnostic on load (admin only — console only)
  // ─────────────────────────────────────────────────────────────────────────
  useEffect(() => {
    const key = _key();
    if (!key) {
      console.error('[NavisphereX Scanner] ❌ REACT_APP_GEMINI_API_KEY is empty — check Vercel env vars and redeploy');
      return;
    }
    console.info('[NavisphereX Scanner] Key loaded, length:', key.length, '— testing connection…');
    fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${key}`, {
      method:'POST', headers:{ 'Content-Type':'application/json' },
      body: JSON.stringify({ contents:[{ parts:[{ text:'ping' }] }], generationConfig:{ maxOutputTokens:1 } })
    })
    .then(r => {
      if (r.ok) console.info('[NavisphereX Scanner] ✅ API connection verified — scanner ready');
      else      r.json().then(e => console.error('[NavisphereX Scanner] ❌ API error:', e.error?.message, '— full response:', e));
    })
    .catch(e => console.error('[NavisphereX Scanner] ❌ Network error:', e.message));
  }, []);

  useEffect(() => {
    if (!user) return;
    loadCerts();
    initDrive();
  }, [user?.uid]);

  // ─────────────────────────────────────────────────────────────────────────
  // DRIVE FUNCTIONS
  // ─────────────────────────────────────────────────────────────────────────

  // IMPROVEMENT 5 — Check token validity before Drive operations
  const isDriveTokenValid = () => {
    const expiry = sessionStorage.getItem('nsx_drive_expiry');
    return expiry && Date.now() < parseInt(expiry);
  };

  const initDrive = () => {
    const token  = sessionStorage.getItem('nsx_drive_token');
    const expiry = sessionStorage.getItem('nsx_drive_expiry');
    const email  = sessionStorage.getItem('nsx_drive_email');
    if (token && expiry && Date.now() < parseInt(expiry)) {
      setDriveToken(token);
      setDriveConnected(true);
      setDriveEmail(email);
      setDriveExpired(false);
    } else if (token) {
      // Token exists but expired
      setDriveExpired(true);
      setDriveConnected(false);
    }
  };

  const connectDrive = async () => {
    setConnectingDrive(true);
    setDriveExpired(false);
    try {
      await new Promise((resolve, reject) => {
        if (window.google?.accounts?.oauth2) { resolve(); return; }
        const script = document.createElement('script');
        script.src   = 'https://accounts.google.com/gsi/client';
        script.onload  = resolve;
        script.onerror = () => reject(new Error('Network error'));
        document.head.appendChild(script);
      });

      const token = await new Promise((resolve, reject) => {
        const client = window.google.accounts.oauth2.initTokenClient({
          client_id:  DRIVE_CLIENT_ID,
          scope:      DRIVE_SCOPE,
          login_hint: user?.email || '',
          callback:   (r) => {
            if (r.error) reject(new Error(r.error_description || r.error));
            else resolve(r.access_token);
          },
        });
        client.requestAccessToken({ prompt:'' });
      });

      // IMPROVEMENT 6 — Verify correct account
      const infoRes = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
        headers: { Authorization:`Bearer ${token}` }
      });
      const info = await infoRes.json();
      console.info('[Drive] Connected:', info.email, '| App account:', user?.email);

      if (info.email && user?.email && info.email.toLowerCase() !== user.email.toLowerCase()) {
        notify(`Please use ${user.email} to connect storage. Switch accounts and try again.`, 'error');
        setConnectingDrive(false);
        return;
      }

      sessionStorage.setItem('nsx_drive_token',  token);
      sessionStorage.setItem('nsx_drive_expiry', String(Date.now() + 3300000));
      sessionStorage.setItem('nsx_drive_email',  info.email || '');
      setDriveToken(token);
      setDriveConnected(true);
      setDriveEmail(info.email);
      setDriveExpired(false);
      notify('✅ Storage connected — your files are private to you', 'success');
    } catch(e) {
      console.error('[Drive] Connection error:', e);
      if (!e.message?.includes('popup_closed') && !e.message?.includes('access_denied')) {
        notify('Could not connect storage. Please try again.', 'error');
      }
    }
    setConnectingDrive(false);
  };

  const disconnectDrive = () => {
    sessionStorage.removeItem('nsx_drive_token');
    sessionStorage.removeItem('nsx_drive_expiry');
    sessionStorage.removeItem('nsx_drive_email');
    setDriveToken(null);
    setDriveConnected(false);
    setDriveEmail(null);
    setDriveFolderId(null);
    setDriveExpired(false);
    notify('Storage disconnected', 'success');
  };

  const getOrCreateFolder = async (token) => {
    if (driveFolderId) return driveFolderId;
    let fid = await driveSearchFolder(token);
    if (!fid) fid = await driveCreateFolder(token);
    setDriveFolderId(fid);
    return fid;
  };

  // IMPROVEMENT 5 — View file: uses browser Google session, no token needed
  const viewDriveFile = (id) => window.open(`https://drive.google.com/file/d/${id}/view`, '_blank');

  // IMPROVEMENT 5 — Download: checks token first, prompts reconnect if expired
  const downloadDriveFile = async (id, name) => {
    if (!isDriveTokenValid()) {
      setDriveExpired(true);
      notify('Session expired — please reconnect storage to download files', 'error');
      return;
    }
    try {
      const blob = await driveGetBlob(driveToken, id);
      const url  = URL.createObjectURL(blob);
      const a    = document.createElement('a');
      a.href = url; a.download = name || 'certificate'; a.click();
      URL.revokeObjectURL(url);
    } catch(e) {
      console.error('[Drive] Download error:', e);
      notify('Download failed. Please try again.', 'error');
    }
  };

  const removeDriveFile = async (certId) => {
    const cert = certs.find(c => c.id === certId);
    if (!cert?.driveFileId || !window.confirm('Remove certificate file from your cloud storage?')) return;
    try {
      if (driveToken && isDriveTokenValid()) await driveDeleteFile(driveToken, cert.driveFileId);
      await saveCerts(certs.map(c => c.id === certId ? { ...c, driveFileId:null, driveFileName:null } : c));
      notify('File removed', 'success');
    } catch(e) {
      console.error('[Drive] Remove error:', e);
      notify('Could not remove file. Please try again.', 'error');
    }
  };

  // ─────────────────────────────────────────────────────────────────────────
  // AI EXTRACTION
  // IMPROVEMENT 3 — Scan works independently of Drive connection
  // IMPROVEMENT 4 — Retry button on failure
  // ─────────────────────────────────────────────────────────────────────────
  const handleFileUpload = async (certId, file, isRenewal = false) => {
    const allowed = ['application/pdf','image/jpeg','image/png','image/jpg'];
    if (!allowed.includes(file.type)) { notify('Only PDF, JPG, or PNG files allowed', 'error'); return; }
    if (file.size > 25*1024*1024)     { notify('File too large — maximum 25MB', 'error'); return; }

    setExtractErrMsg('');
    setExtractModal({ certId, file, reviewData:null, isRenewal, detected:null });
    setExtracting(true);
    setEditId(null); setQuickId(null);

    try {
      // IMPROVEMENT 2 — compress before scanning
      const compressed = await compressImage(file);
      const ext        = await extractCertData(compressed);
      const existing   = certs.find(c => c.id === certId) || {};
      const reviewData = {
        name:             ext.name            || existing.name     || '',
        certNo:           ext.certNo          || existing.certNo   || '',
        issueDate:        ext.issueDate       || existing.issueDate|| '',
        expiryDate:       ext.isUnlimited ? '' : (ext.expiryDate || existing.expiryDate || ''),
        isUnlimited:      ext.isUnlimited     || existing.expiryDate === 'unlimited' || false,
        category:         ext.category        || existing.category || 'Others',
        issuingAuthority: ext.issuingAuthority|| '',
        holderName:       ext.holderName      || '',
        notes:            ext.notes           || existing.notes    || '',
      };
      const detected = {};
      if (ext.name)                        detected.name       = true;
      if (ext.certNo)                      detected.certNo     = true;
      if (ext.issueDate)                   detected.issueDate  = true;
      if (ext.expiryDate||ext.isUnlimited) detected.expiryDate = true;
      if (ext.category)                    detected.category   = true;
      if (ext.issuingAuthority||ext.notes) detected.notes      = true;
      setExtractModal({ certId, file, reviewData, isRenewal, detected });
    } catch(e) {
      console.error('[Scanner] Extraction error:', e.message);
      const existing = certs.find(c => c.id === certId) || {};
      const errMsg   = scanErrorMessage(e.message);
      setExtractErrMsg(errMsg);
      setExtractModal({
        certId, file, isRenewal, detected:{}, extractError:true,
        reviewData:{
          name:existing.name||'', certNo:existing.certNo||'',
          issueDate:existing.issueDate||'',
          expiryDate:existing.expiryDate==='unlimited'?'':(existing.expiryDate||''),
          isUnlimited:existing.expiryDate==='unlimited',
          category:existing.category||'Others',
          issuingAuthority:'', holderName:'', notes:existing.notes||''
        }
      });
    }
    setExtracting(false);
  };

  // IMPROVEMENT 4 — Retry function
  const retryExtraction = () => {
    if (!extractModal?.file) return;
    handleFileUpload(extractModal.certId, extractModal.file, extractModal.isRenewal);
  };

  const confirmExtraction = async () => {
    if (!extractModal?.reviewData) return;
    const { certId, file, reviewData, isRenewal } = extractModal;
    if (!reviewData.name) { notify('Please enter the certificate name', 'error'); return; }
    const finalExpiry = reviewData.isUnlimited ? 'unlimited' : reviewData.expiryDate;
    if (!finalExpiry)    { notify('Please enter an expiry date or select Unlimited', 'error'); return; }
    setUploadingId(certId);
    try {
      let driveFileId = null, driveFileName = null;
      // IMPROVEMENT 3 — upload to Drive only if connected and token valid
      if (driveToken && isDriveTokenValid()) {
        const existing = certs.find(c => c.id === certId);
        if (isRenewal && existing?.driveFileId) {
          try { await driveDeleteFile(driveToken, existing.driveFileId); } catch {}
        }
        const folderId = await getOrCreateFolder(driveToken);
        const safeName = reviewData.name.replace(/[^a-zA-Z0-9 ]/g,'');
        const ext      = file.name.split('.').pop();
        const uploaded = await driveUploadFile(driveToken, folderId, file, `${safeName}_${certId}.${ext}`);
        driveFileId = uploaded.id; driveFileName = file.name;
      }

      const notesText = [
        reviewData.notes,
        reviewData.issuingAuthority ? `Issued by: ${reviewData.issuingAuthority}` : null,
        reviewData.holderName       ? `Holder: ${reviewData.holderName}` : null,
      ].filter(Boolean).join(' | ');

      await saveCerts(certs.map(c => c.id === certId ? {
        ...c,
        name:reviewData.name, certNo:reviewData.certNo,
        issueDate:reviewData.issueDate, expiryDate:finalExpiry,
        category:reviewData.category, notes:notesText,
        ...(driveFileId ? { driveFileId, driveFileName } : {})
      } : c));

      setExtractModal(null);
      setExtractErrMsg('');
      const savedMsg = driveFileId
        ? '✅ Certificate updated and file saved to your storage'
        : '✅ Certificate details updated';
      if (!driveFileId && (driveConnected || driveExpired)) {
        notify(savedMsg + ' — connect storage to also save the file', 'success');
      } else {
        notify(savedMsg, 'success');
      }
    } catch(e) {
      console.error('[CertTracker] Save error:', e);
      notify('Could not save. Please check your connection and try again.', 'error');
    }
    setUploadingId(null);
  };

  // IMPROVEMENT 3 — Add form scan: works without Drive
  const handleAddFormScan = async (file) => {
    const allowed = ['application/pdf','image/jpeg','image/png','image/jpg'];
    if (!allowed.includes(file.type)) { notify('Only PDF, JPG, or PNG files allowed', 'error'); return; }
    if (file.size > 25*1024*1024)     { notify('File too large — maximum 25MB', 'error'); return; }

    setAddScanFile(file); setScanningAdd(true); setAddAiFields({}); setAddScanErrMsg('');
    try {
      // IMPROVEMENT 2 — compress before scanning
      const compressed = await compressImage(file);
      const ext        = await extractCertData(compressed);
      const detected = {}, updates = {};
      if (ext.name)        { updates.name=ext.name;           detected.name=true;      setCustomName(false); }
      if (ext.certNo)      { updates.certNo=ext.certNo;       detected.certNo=true;    }
      if (ext.issueDate)   { updates.issueDate=ext.issueDate; detected.issueDate=true; }
      if (ext.category)    { updates.category=ext.category;   detected.category=true;  }
      if (ext.isUnlimited) { setUnlimitedExpiry(true);        detected.expiryDate=true; }
      else if (ext.expiryDate) { updates.expiryDate=ext.expiryDate; detected.expiryDate=true; }
      if (ext.notes||ext.issuingAuthority) {
        updates.notes = [ext.notes, ext.issuingAuthority?`Issued by: ${ext.issuingAuthority}`:null].filter(Boolean).join(' | ');
        detected.notes = true;
      }
      setNewCert(n => ({ ...n, ...updates }));
      setAddAiFields(detected);
      notify(`✅ Certificate scanned — ${Object.keys(detected).length} fields filled. Review below.`, 'success');
    } catch(e) {
      console.error('[Scanner] Add-form scan error:', e.message);
      setAddScanErrMsg(scanErrorMessage(e.message));
    }
    setScanningAdd(false);
  };

  // IMPROVEMENT 4 — Retry add form scan
  const retryAddScan = () => {
    if (!addScanFile) return;
    handleAddFormScan(addScanFile);
  };

  // ─────────────────────────────────────────────────────────────────────────
  // CORE DATA FUNCTIONS
  // ─────────────────────────────────────────────────────────────────────────
  const loadCerts = async () => {
    setLoading(true);
    try {
      const snap = await getDoc(doc(db,'certificates',user.uid));
      if (snap.exists()) setCerts(snap.data().list||[]);
    } catch(e) { console.error('[CertTracker] Load error:', e); }
    setLoading(false);
  };

  const saveCerts = async (updated) => {
    setSaving(true);
    try {
      await setDoc(doc(db,'certificates',user.uid), { list:updated, updatedAt:new Date().toISOString() });
      setCerts(updated);
    } catch(e) {
      console.error('[CertTracker] Save error:', e);
      notify('Could not save changes. Please check your connection.', 'error');
    }
    setSaving(false);
  };

  const addCert = async () => {
    if (!newCert.name) { notify('Please enter the certificate name', 'error'); return; }
    const finalExpiry = unlimitedExpiry ? 'unlimited' : newCert.expiryDate;
    if (!finalExpiry)  { notify('Please enter an expiry date or select Unlimited', 'error'); return; }
    const id  = Date.now().toString();
    let entry = { ...newCert, expiryDate:finalExpiry, id };
    // IMPROVEMENT 3 — upload to Drive only if connected and token valid
    if (addScanFile && driveToken && isDriveTokenValid()) {
      try {
        const fid      = await getOrCreateFolder(driveToken);
        const safeName = newCert.name.replace(/[^a-zA-Z0-9 ]/g,'');
        const ext      = addScanFile.name.split('.').pop();
        const uploaded = await driveUploadFile(driveToken, fid, addScanFile, `${safeName}_${id}.${ext}`);
        entry = { ...entry, driveFileId:uploaded.id, driveFileName:addScanFile.name };
      } catch(e) {
        console.error('[Drive] Upload on add error:', e);
        notify('Certificate added but file upload failed. Upload it from the certificate card.', 'error');
      }
    }
    await saveCerts([...certs, entry]);
    setNewCert({...EMPTY_CERT}); setShowAdd(false); setCustomName(false);
    setCustomCategory(false); setUnlimitedExpiry(false);
    setAddScanFile(null); setAddAiFields({}); setAddScanErrMsg('');
    notify('✅ Certificate added' + (entry.driveFileId ? ' and file saved to your storage' : ''), 'success');
  };

  const deleteCert = async (id) => {
    if (!window.confirm('Delete this certificate? This cannot be undone.')) return;
    const cert = certs.find(c => c.id === id);
    if (cert?.driveFileId && driveToken && isDriveTokenValid()) {
      try { await driveDeleteFile(driveToken, cert.driveFileId); } catch(e) { console.error('[Drive] Delete file error:', e); }
    }
    await saveCerts(certs.filter(c => c.id !== id));
    notify('Certificate deleted', 'success');
  };

  const startEdit = (cert) => {
    setEditId(cert.id); setEditData({...cert});
    setEditUnlimited(cert.expiryDate==='unlimited');
    setEditCustomName(!CERT_TEMPLATES.find(t => t.name===cert.name));
    setEditCustomCategory(!KNOWN_CATEGORIES.includes(cert.category));
    setQuickId(null); setExtractModal(null);
  };
  const cancelEdit = () => {
    setEditId(null); setEditData(null);
    setEditCustomName(false); setEditCustomCategory(false); setEditUnlimited(false);
  };
  const saveEdit = async () => {
    if (!editData.name) { notify('Please enter the certificate name', 'error'); return; }
    const fe = editUnlimited ? 'unlimited' : editData.expiryDate;
    if (!fe) { notify('Please enter an expiry date', 'error'); return; }
    await saveCerts(certs.map(c => c.id===editId ? {...editData, expiryDate:fe} : c));
    cancelEdit(); notify('✅ Certificate updated', 'success');
  };

  const startQuick = (cert) => {
    setQuickId(cert.id);
    setQuickData({ certNo:cert.certNo||'', expiryDate:cert.expiryDate==='unlimited'?'':(cert.expiryDate||'') });
    setQuickUnlimited(cert.expiryDate==='unlimited');
    setEditId(null); cancelEdit(); setExtractModal(null);
  };
  const saveQuick = async (id) => {
    const fe = quickUnlimited ? 'unlimited' : quickData.expiryDate;
    if (!fe) { notify('Please enter the new expiry date', 'error'); return; }
    await saveCerts(certs.map(c => c.id===id ? {...c, expiryDate:fe, certNo:quickData.certNo||c.certNo} : c));
    setQuickId(null); notify('✅ Certificate renewed', 'success');
  };

  const getCertsByTier = (tier) => certs.filter(c => {
    if (!c.expiryDate||c.expiryDate==='unlimited') return false;
    return tier.test(Math.floor((new Date(c.expiryDate)-new Date())/86400000));
  });

  const filtered = catFilter==='All' ? certs : certs.filter(c => c.category===catFilter);
  const expiring = certs.filter(c => {
    if (!c.expiryDate||c.expiryDate==='unlimited') return false;
    const s = STATUS(c.expiryDate);
    return s.days!==undefined && s.days<90;
  });

  // ─────────────────────────────────────────────────────────────────────────
  // FORM FIELD RENDERER
  // ─────────────────────────────────────────────────────────────────────────
  const renderFormFields = (data, setData, isCN, setIsCN, isCC, setIsCC, isUnlim, setIsUnlim, aiFields={}) => {
    const badge = f => aiFields[f]
      ? <span style={{marginLeft:5,fontSize:'0.58rem',background:'rgba(0,180,216,0.2)',color:'var(--cyan)',borderRadius:10,padding:'1px 5px',fontWeight:700}}>✦ Auto</span>
      : null;
    return (
      <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:10}}>
        <div className="ff" style={{gridColumn:'1/-1',margin:0}}>
          <label className="fl">Name * {badge('name')}</label>
          <select className="fi"
            value={isCN?'__custom__':(CERT_TEMPLATES.find(t=>t.name===data.name)?data.name:data.name?'__custom__':'')}
            onChange={e=>{
              if(e.target.value==='__custom__'){setIsCN(true);setData(n=>({...n,name:''}))}
              else{const t=CERT_TEMPLATES.find(c=>c.name===e.target.value);setIsCN(false);setData(n=>({...n,name:e.target.value,category:t?.category||n.category}))}
            }}>
            <option value="">— Select certificate —</option>
            {CERT_TEMPLATES.map(c=><option key={c.name} value={c.name}>{c.name}</option>)}
            <option value="__custom__">✏️ Custom name…</option>
          </select>
          {isCN&&<input className="fi" style={{marginTop:6}} placeholder="Type custom name…" value={data.name} onChange={e=>setData(n=>({...n,name:e.target.value}))}/>}
        </div>
        <div className="ff" style={{margin:0}}>
          <label className="fl">Cert No. {badge('certNo')}</label>
          <input className="fi" placeholder="e.g. INE-12345" value={data.certNo} onChange={e=>setData(n=>({...n,certNo:e.target.value}))}/>
        </div>
        <div className="ff" style={{margin:0}}>
          <label className="fl">Category {badge('category')}</label>
          {!isCC
            ?<select className="fi" value={data.category} onChange={e=>{if(e.target.value==='__cc__'){setIsCC(true);setData(n=>({...n,category:''}))}else setData(n=>({...n,category:e.target.value}))}}>
               {KNOWN_CATEGORIES.map(c=><option key={c}>{c}</option>)}
               <option value="__cc__">✏️ Custom…</option>
             </select>
            :<div style={{display:'flex',gap:6}}>
               <input className="fi" placeholder="Custom category…" value={data.category} onChange={e=>setData(n=>({...n,category:e.target.value}))}/>
               <button style={{background:'none',border:'1px solid var(--border)',borderRadius:6,color:'var(--text3)',cursor:'pointer',padding:'0 8px'}} onClick={()=>{setIsCC(false);setData(n=>({...n,category:'Others'}))}}>✕</button>
             </div>
          }
        </div>
        <div className="ff" style={{margin:0}}>
          <label className="fl">Issue Date {badge('issueDate')}</label>
          <input className="fi" type="date" value={data.issueDate} onChange={e=>setData(n=>({...n,issueDate:e.target.value}))}/>
        </div>
        <div className="ff" style={{gridColumn:'1/-1',margin:0}}>
          <label className="fl">Expiry Date * {badge('expiryDate')}</label>
          <label style={{display:'flex',alignItems:'center',gap:6,cursor:'pointer',fontSize:'0.75rem',color:'var(--cyan)',marginBottom:6}}>
            <input type="checkbox" checked={isUnlim} onChange={e=>setIsUnlim(e.target.checked)} style={{accentColor:'var(--cyan)'}}/>
            ∞ No Expiry / Unlimited Validity
          </label>
          {!isUnlim&&<input className="fi" type="date" value={data.expiryDate} onChange={e=>setData(n=>({...n,expiryDate:e.target.value}))}/>}
        </div>
        <div className="ff" style={{gridColumn:'1/-1',margin:0}}>
          <label className="fl">Notes {badge('notes')}</label>
          <input className="fi" placeholder="Issuing authority, endorsements…" value={data.notes} onChange={e=>setData(n=>({...n,notes:e.target.value}))}/>
        </div>
      </div>
    );
  };

  // ─────────────────────────────────────────────────────────────────────────
  // EXTRACTION REVIEW FIELDS RENDERER
  // ─────────────────────────────────────────────────────────────────────────
  const renderExtractionFields = () => {
    if (!extractModal?.reviewData) return null;
    const {reviewData, detected} = extractModal;
    const sf    = (f,v) => setExtractModal(m=>({...m,reviewData:{...m.reviewData,[f]:v}}));
    const badge = f => detected?.[f]
      ? <span style={{marginLeft:5,fontSize:'0.58rem',background:'rgba(0,180,216,0.22)',color:'var(--cyan)',borderRadius:10,padding:'1px 5px',fontWeight:700}}>✦ Auto</span>
      : null;
    return (
      <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:8}}>
        <div className="ff" style={{gridColumn:'1/-1',margin:0}}>
          <label className="fl">Certificate Name * {badge('name')}</label>
          <input className="fi" value={reviewData.name||''} placeholder="Certificate name…" onChange={e=>sf('name',e.target.value)}/>
        </div>
        <div className="ff" style={{margin:0}}>
          <label className="fl">Cert No. {badge('certNo')}</label>
          <input className="fi" value={reviewData.certNo||''} placeholder="Cert number…" onChange={e=>sf('certNo',e.target.value)}/>
        </div>
        <div className="ff" style={{margin:0}}>
          <label className="fl">Category {badge('category')}</label>
          <select className="fi" value={reviewData.category||'Others'} onChange={e=>sf('category',e.target.value)}>
            {KNOWN_CATEGORIES.map(c=><option key={c}>{c}</option>)}
          </select>
        </div>
        <div className="ff" style={{margin:0}}>
          <label className="fl">Issue Date {badge('issueDate')}</label>
          <input className="fi" type="date" value={reviewData.issueDate||''} onChange={e=>sf('issueDate',e.target.value)}/>
        </div>
        <div className="ff" style={{gridColumn:'1/-1',margin:0}}>
          <label className="fl">Expiry Date * {badge('expiryDate')}</label>
          <label style={{display:'flex',alignItems:'center',gap:6,cursor:'pointer',fontSize:'0.74rem',color:'var(--cyan)',marginBottom:6}}>
            <input type="checkbox" checked={!!reviewData.isUnlimited} onChange={e=>sf('isUnlimited',e.target.checked)} style={{accentColor:'var(--cyan)'}}/>
            ∞ No Expiry / Unlimited
          </label>
          {!reviewData.isUnlimited&&<input className="fi" type="date" value={reviewData.expiryDate||''} onChange={e=>sf('expiryDate',e.target.value)}/>}
        </div>
        <div className="ff" style={{margin:0}}>
          <label className="fl">Issuing Authority {badge('notes')}</label>
          <input className="fi" value={reviewData.issuingAuthority||''} placeholder="Issuing organization…" onChange={e=>sf('issuingAuthority',e.target.value)}/>
        </div>
        <div className="ff" style={{margin:0}}>
          <label className="fl">Notes</label>
          <input className="fi" value={reviewData.notes||''} placeholder="Additional notes…" onChange={e=>sf('notes',e.target.value)}/>
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

  const mBtn = (bg,color,border) => ({
    fontSize:'0.63rem', padding:'3px 8px', borderRadius:6, cursor:'pointer',
    background:bg, color, border, fontWeight:600, whiteSpace:'nowrap'
  });

  // ─────────────────────────────────────────────────────────────────────────
  // RENDER
  // ─────────────────────────────────────────────────────────────────────────
  return (
    <div className="section">

      {/* ── IMPROVEMENT 5+6: Drive Banner with email + expiry warning ──────── */}
      {/* IMPROVEMENT 5 — Show reconnect prompt if session expired */}
      {driveExpired && !driveConnected && (
        <div style={{background:'rgba(255,107,53,0.08)',border:'1px solid rgba(255,107,53,0.35)',borderRadius:10,padding:'0.7rem 1rem',marginBottom:'0.8rem',display:'flex',alignItems:'center',justifyContent:'space-between',gap:10,flexWrap:'wrap'}}>
          <div style={{fontSize:'0.72rem',color:'#ff6b35'}}>
            ⏱ Storage session expired — reconnect to view and download your certificate files
          </div>
          <button onClick={connectDrive} disabled={connectingDrive}
            style={{padding:'5px 14px',borderRadius:7,fontSize:'0.7rem',fontWeight:700,cursor:'pointer',background:'rgba(255,107,53,0.15)',color:'#ff6b35',border:'1px solid rgba(255,107,53,0.4)'}}>
            {connectingDrive?'Connecting…':'🔗 Reconnect'}
          </button>
        </div>
      )}

      {/* Main Drive Banner */}
      <div style={{
        background: driveConnected?'rgba(0,200,100,0.06)':'rgba(0,180,216,0.06)',
        border:`1px solid ${driveConnected?'rgba(0,200,100,0.25)':'rgba(0,180,216,0.25)'}`,
        borderRadius:12, padding:'0.75rem 1rem', marginBottom:'1rem',
        display:'flex', alignItems:'center', justifyContent:'space-between', flexWrap:'wrap', gap:10
      }}>
        <div style={{flex:1,minWidth:0}}>
          <div style={{fontSize:'0.76rem',fontWeight:700,color:driveConnected?'var(--green)':'var(--cyan)',fontFamily:'Orbitron,monospace'}}>
            {driveConnected ? '✅ Cloud Storage Connected' : '☁️ Connect Cloud Storage'}
          </div>
          {/* IMPROVEMENT 6 — Show connected email */}
          {driveConnected && driveEmail && (
            <div style={{fontSize:'0.65rem',color:'var(--text3)',marginTop:2}}>
              Connected as <strong style={{color:'var(--cyan)'}}>{driveEmail}</strong>
            </div>
          )}
          <div style={{fontSize:'0.68rem',color:'var(--text3)',marginTop:3,lineHeight:1.5}}>
            {driveConnected
              ? 'Upload certificate photos or PDFs — details filled automatically. Files saved privately in your personal cloud storage.'
              : 'Connect to store certificate copies privately. Upload photos or PDFs and all details are filled in automatically. Files go to your personal cloud — zero storage cost.'}
          </div>
          {/* IMPROVEMENT 3 — Note that scanning works without Drive */}
          {!driveConnected && (
            <div style={{fontSize:'0.64rem',color:'var(--text3)',marginTop:4,fontStyle:'italic'}}>
              ℹ️ Document scanning works without connecting storage — connect only when you want to save files
            </div>
          )}
          {driveConnected && (
            <div style={{display:'flex',gap:12,marginTop:6,flexWrap:'wrap'}}>
              {['📷 Upload photo or PDF','✦ Details filled automatically','✏️ Review & edit fields','🔒 Your private storage'].map((s,i)=>(
                <span key={i} style={{fontSize:'0.63rem',color:'var(--text3)'}}>{s}</span>
              ))}
            </div>
          )}
        </div>
        {driveConnected
          ?<div style={{display:'flex',gap:6,flexShrink:0}}>
             <a href="https://drive.google.com/drive/folders" target="_blank" rel="noreferrer"
               style={{padding:'5px 12px',borderRadius:7,fontSize:'0.7rem',fontWeight:700,background:'rgba(0,200,100,0.12)',color:'var(--green)',border:'1px solid rgba(0,200,100,0.3)',textDecoration:'none'}}>
               📂 My Files
             </a>
             <button onClick={disconnectDrive}
               style={{padding:'5px 12px',borderRadius:7,fontSize:'0.7rem',cursor:'pointer',background:'none',color:'var(--text3)',border:'1px solid rgba(255,255,255,0.1)'}}>
               Disconnect
             </button>
           </div>
          :<button onClick={connectDrive} disabled={connectingDrive}
             style={{padding:'7px 18px',borderRadius:8,fontSize:'0.74rem',fontWeight:700,cursor:'pointer',background:'linear-gradient(135deg,#4285f4,#34a853)',color:'#fff',border:'none',whiteSpace:'nowrap',flexShrink:0,opacity:connectingDrive?0.7:1}}>
             {connectingDrive?'Connecting…':'🔗 Connect Storage'}
           </button>
        }
      </div>

      {/* ── Header ──────────────────────────────────────────────────────────── */}
      <div className="sec-hdr">
        <div className="sec-title">📜 Certificate Tracker</div>
        <div style={{display:'flex',gap:8,alignItems:'center',flexWrap:'wrap'}}>
          {expiring.length>0&&(
            <span style={{background:'rgba(255,71,87,0.15)',color:'#ff4757',border:'1px solid rgba(255,71,87,0.3)',borderRadius:20,padding:'3px 10px',fontSize:'0.7rem',fontWeight:700}}>
              ⚠️ {expiring.length} expiring
            </span>
          )}
          <button style={{padding:'6px 14px',fontSize:'0.74rem',background:'rgba(0,180,216,0.1)',color:'var(--cyan)',border:'1px solid rgba(0,180,216,0.3)',borderRadius:8,cursor:'pointer'}}
            onClick={()=>{setShowExpDash(s=>!s);setActiveTier(null);}}>
            {showExpDash?'✕ Timeline':'📅 Expiry Timeline'}
          </button>
          <button className="btn btn-primary" style={{padding:'6px 14px',fontSize:'0.74rem'}} onClick={()=>setShowAdd(s=>!s)}>
            {showAdd?'✕ Cancel':'+ Add Certificate'}
          </button>
        </div>
      </div>

      {/* ── Expiry alerts ────────────────────────────────────────────────────── */}
      {expiring.length>0&&(
        <div style={{background:'rgba(255,71,87,0.08)',border:'1px solid rgba(255,71,87,0.25)',borderRadius:10,padding:'0.8rem 1rem',marginBottom:'1rem'}}>
          <div style={{fontFamily:'Orbitron,monospace',fontSize:'0.72rem',color:'#ff4757',marginBottom:'0.4rem'}}>⚠️ ACTION REQUIRED</div>
          {expiring.map((c,i)=>{
            const s=STATUS(c.expiryDate);
            return(
              <div key={i} style={{fontSize:'0.74rem',color:'var(--text2)',padding:'3px 0'}}>
                <span style={{color:s.color,fontWeight:700}}>{s.label}</span> — {c.name}
                {s.days>=0?` (${s.days} days left)`:' (renewal overdue)'}
              </div>
            );
          })}
        </div>
      )}

      {/* ── Expiry Timeline ──────────────────────────────────────────────────── */}
      {showExpDash&&(
        <div style={{background:'var(--card)',border:'1px solid rgba(0,180,216,0.2)',borderRadius:14,padding:'1.2rem',marginBottom:'1.2rem'}}>
          <div style={{fontFamily:'Orbitron,monospace',fontSize:'0.78rem',color:'var(--cyan)',marginBottom:'1rem'}}>📅 CERTIFICATE EXPIRY TIMELINE</div>
          <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(110px,1fr))',gap:8,marginBottom:'1rem'}}>
            {EXPIRY_TIERS.map(tier=>{
              const count=getCertsByTier(tier).length, isA=activeTier===tier.key;
              return(
                <div key={tier.key} onClick={()=>setActiveTier(isA?null:tier.key)}
                  style={{background:isA?`${tier.color}22`:`${tier.color}0d`,border:`1px solid ${isA?tier.color:tier.color+'44'}`,borderRadius:10,padding:'0.75rem 0.5rem',cursor:'pointer',textAlign:'center',transition:'all 0.2s'}}>
                  <div style={{fontSize:'1.5rem',fontWeight:900,color:count>0?tier.color:'var(--text3)'}}>{count}</div>
                  <div style={{fontSize:'0.62rem',color:'var(--text3)',marginTop:2,lineHeight:1.3}}>{tier.label}</div>
                </div>
              );
            })}
          </div>
          {activeTier&&(()=>{
            const tier=EXPIRY_TIERS.find(t=>t.key===activeTier), tc=getCertsByTier(tier);
            return(
              <div style={{borderTop:`1px solid ${tier.color}33`,paddingTop:'0.8rem'}}>
                <div style={{fontSize:'0.72rem',color:tier.color,fontWeight:700,fontFamily:'Orbitron,monospace',marginBottom:'0.6rem'}}>
                  {tier.label} — {tc.length} cert{tc.length!==1?'s':''}
                </div>
                {tc.length===0
                  ?<div style={{fontSize:'0.74rem',color:'var(--text3)',textAlign:'center',padding:'0.8rem'}}>✅ None in this range</div>
                  :<div style={{display:'grid',gap:6}}>
                    {tc.map(c=>{
                      const days=Math.floor((new Date(c.expiryDate)-new Date())/86400000);
                      return(
                        <div key={c.id} style={{display:'flex',justifyContent:'space-between',alignItems:'center',background:'rgba(255,255,255,0.03)',border:`1px solid ${tier.color}22`,borderRadius:8,padding:'0.5rem 0.8rem'}}>
                          <div>
                            <div style={{fontSize:'0.78rem',fontWeight:700,color:'var(--text)'}}>{c.name}</div>
                            <div style={{fontSize:'0.65rem',color:'var(--text3)'}}>{c.category}</div>
                          </div>
                          <div style={{textAlign:'right'}}>
                            <div style={{fontSize:'0.72rem',color:tier.color,fontWeight:700}}>{days<0?'EXPIRED':`${days}d left`}</div>
                            <div style={{fontSize:'0.65rem',color:'var(--text3)'}}>{c.expiryDate}</div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                }
              </div>
            );
          })()}
          {EXPIRY_TIERS.every(t=>getCertsByTier(t).length===0)&&(
            <div style={{textAlign:'center',fontSize:'0.74rem',color:'var(--green)',padding:'0.4rem'}}>✅ All certificates valid for 12+ months</div>
          )}
        </div>
      )}

      {/* ── Add Form ─────────────────────────────────────────────────────────── */}
      {showAdd&&(
        <div style={{background:'var(--card)',border:'1px solid rgba(0,180,216,0.3)',borderRadius:14,padding:'1.3rem',marginBottom:'1.2rem'}}>
          <div style={{fontFamily:'Orbitron,monospace',fontSize:'0.78rem',color:'var(--cyan)',marginBottom:'0.8rem'}}>+ Add New Certificate / Document</div>

          {/* Scan banner */}
          <div style={{background:'rgba(0,180,216,0.05)',border:'1px dashed rgba(0,180,216,0.35)',borderRadius:10,padding:'0.9rem',marginBottom:'1rem'}}>
            <div style={{fontSize:'0.76rem',color:'var(--cyan)',fontWeight:700,marginBottom:3}}>✦ Smart Auto-Fill</div>
            <div style={{fontSize:'0.68rem',color:'var(--text3)',marginBottom:10,lineHeight:1.5}}>
              Upload a photo or PDF of your certificate — all details are filled in automatically. You can edit anything after.
            </div>
            <div style={{display:'flex',alignItems:'center',gap:10,flexWrap:'wrap'}}>
              <input id="add-scan-input" type="file" accept=".pdf,.jpg,.jpeg,.png" style={{display:'none'}}
                onChange={e=>{if(e.target.files?.[0])handleAddFormScan(e.target.files[0]);e.target.value='';}}/>
              <label htmlFor="add-scan-input"
                style={{display:'inline-flex',alignItems:'center',gap:6,padding:'7px 16px',borderRadius:8,cursor:scanningAdd?'default':'pointer',fontSize:'0.74rem',fontWeight:700,background:'rgba(0,180,216,0.15)',color:'var(--cyan)',border:'1px solid rgba(0,180,216,0.45)',pointerEvents:scanningAdd?'none':'auto',opacity:scanningAdd?0.7:1}}>
                {scanningAdd?'⏳ Reading…':'📷 Scan Certificate'}
              </label>
              {/* IMPROVEMENT 4 — Retry button in add form */}
              {addScanErrMsg && !scanningAdd && addScanFile && (
                <button onClick={retryAddScan}
                  style={{padding:'5px 12px',borderRadius:7,fontSize:'0.7rem',fontWeight:700,cursor:'pointer',background:'rgba(0,180,216,0.1)',color:'var(--cyan)',border:'1px solid rgba(0,180,216,0.35)'}}>
                  ↺ Try Again
                </button>
              )}
              {addScanFile&&!scanningAdd&&!addScanErrMsg&&(
                <span style={{fontSize:'0.68rem',color:'var(--green)',display:'flex',alignItems:'center',gap:6}}>
                  ✅ {addScanFile.name}
                  {Object.keys(addAiFields).length>0&&(
                    <span style={{background:'rgba(0,180,216,0.15)',color:'var(--cyan)',borderRadius:10,padding:'1px 7px',fontSize:'0.6rem',fontWeight:700}}>
                      ✦ {Object.keys(addAiFields).length} fields filled
                    </span>
                  )}
                  <button onClick={()=>{setAddScanFile(null);setAddAiFields({});setAddScanErrMsg('');setNewCert({...EMPTY_CERT});}}
                    style={{background:'none',border:'none',color:'var(--text3)',cursor:'pointer'}}>✕</button>
                </span>
              )}
              {/* IMPROVEMENT 4 — Error in add form */}
              {addScanErrMsg && !scanningAdd && (
                <span style={{fontSize:'0.68rem',color:'#ff6b35'}}>{addScanErrMsg}</span>
              )}
              {!addScanFile&&!addScanErrMsg&&<span style={{fontSize:'0.65rem',color:'var(--text3)'}}>or fill in manually below</span>}
            </div>
          </div>

          {renderFormFields(newCert,setNewCert,customName,setCustomName,customCategory,setCustomCategory,unlimitedExpiry,setUnlimitedExpiry,addAiFields)}

          {/* IMPROVEMENT 3 — Note about file saving without Drive */}
          {addScanFile && !driveConnected && (
            <div style={{fontSize:'0.68rem',color:'var(--text3)',marginTop:8,background:'rgba(255,255,255,0.03)',borderRadius:8,padding:'6px 10px',border:'1px solid rgba(255,255,255,0.08)'}}>
              ℹ️ Certificate details will be saved. To also save the file, connect cloud storage above.
            </div>
          )}

          <button className="btn btn-primary" style={{marginTop:10}} onClick={addCert} disabled={saving}>
            {saving?'Saving…':'✅ Add Certificate'}
          </button>
        </div>
      )}

      {/* ── Category filter ──────────────────────────────────────────────────── */}
      <div className="fbar" style={{marginBottom:'1rem'}}>
        {CATEGORIES.map(c=>(
          <button key={c} className={`fbtn ${catFilter===c?'active':''}`} onClick={()=>setCatFilter(c)}>{c}</button>
        ))}
      </div>

      {loading&&<div className="loading"><div className="spin"/><span>Loading certificates…</span></div>}
      {!loading&&filtered.length===0&&(
        <div className="empty">
          <div className="empty-icon">📜</div>
          <div className="empty-t">No Certificates Added Yet</div>
          <div className="empty-d">Click "+ Add Certificate" to start tracking your STCW certificates and renewal dates.</div>
        </div>
      )}

      {/* ── Certificate Cards ────────────────────────────────────────────────── */}
      {filtered.length>0&&(
        <div style={{display:'grid',gap:'0.7rem'}}>
          {filtered.map(c=>{
            const s    = STATUS(c.expiryDate);
            const isEd = editId===c.id;
            const isQU = quickId===c.id;
            const isUp = uploadingId===c.id;
            const hasDr= !!c.driveFileId;
            const isEx = extractModal?.certId===c.id;

            return(
              <div key={c.id} style={{background:'var(--card)',border:`1px solid ${s.color}33`,borderRadius:12,padding:'1rem',display:'flex',flexDirection:'column',gap:0}}>
                <div style={{display:'flex',gap:12,alignItems:'flex-start'}}>
                  <div style={{width:8,borderRadius:4,alignSelf:'stretch',background:s.color,flexShrink:0}}/>

                  <div style={{flex:1,minWidth:0}}>
                    {/* Title + badge */}
                    <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',flexWrap:'wrap',gap:6}}>
                      <div style={{fontWeight:700,fontSize:'0.86rem',color:'var(--text)'}}>{c.name}</div>
                      <span style={{padding:'2px 10px',borderRadius:20,fontSize:'0.62rem',fontWeight:700,background:s.bg,color:s.color,border:`1px solid ${s.color}44`,flexShrink:0}}>
                        {s.label}{s.days>=0?` · ${s.days}d left`:''}
                      </span>
                    </div>

                    {/* Meta */}
                    <div style={{display:'flex',gap:14,marginTop:4,flexWrap:'wrap'}}>
                      {c.certNo&&<span style={{fontSize:'0.72rem',color:'var(--text3)'}}>No: <strong style={{color:'var(--cyan)'}}>{c.certNo}</strong></span>}
                      {c.issueDate&&<span style={{fontSize:'0.72rem',color:'var(--text3)'}}>Issued: {c.issueDate}</span>}
                      {c.expiryDate&&c.expiryDate!=='unlimited'&&<span style={{fontSize:'0.72rem',color:'var(--text3)'}}>Expires: <strong style={{color:s.color}}>{c.expiryDate}</strong></span>}
                      {c.expiryDate==='unlimited'&&<span style={{fontSize:'0.72rem',color:'#00b4d8'}}>∞ Unlimited Validity</span>}
                      <span style={{fontSize:'0.62rem',color:'var(--text3)',background:'rgba(255,255,255,0.05)',padding:'1px 7px',borderRadius:10}}>{c.category}</span>
                    </div>
                    {c.notes&&<div style={{fontSize:'0.72rem',color:'var(--text3)',marginTop:4}}>📝 {c.notes}</div>}

                    {/* ── File section ── */}
                    <div style={{marginTop:8,display:'flex',alignItems:'center',gap:6,flexWrap:'wrap'}}>
                      {hasDr?(
                        <>
                          <span style={{fontSize:'0.66rem',color:'var(--green)',background:'rgba(0,200,100,0.08)',border:'1px solid rgba(0,200,100,0.25)',borderRadius:20,padding:'2px 8px',maxWidth:190,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>
                            ☁️ {c.driveFileName||'File saved'}
                          </span>
                          {/* IMPROVEMENT 5 — View always works (uses browser Google session) */}
                          <button onClick={()=>viewDriveFile(c.driveFileId)} style={mBtn('rgba(0,180,216,0.1)','var(--cyan)','1px solid rgba(0,180,216,0.3)')}>📄 View</button>
                          {/* IMPROVEMENT 5 — Download checks token, prompts reconnect if expired */}
                          <button onClick={()=>downloadDriveFile(c.driveFileId,c.driveFileName)} style={mBtn('rgba(100,200,100,0.1)','var(--green)','1px solid rgba(100,200,100,0.3)')}>⬇️ Download</button>
                          <>
                            <input id={`upd-${c.id}`} type="file" accept=".pdf,.jpg,.jpeg,.png" style={{display:'none'}}
                              onChange={e=>{if(e.target.files?.[0])handleFileUpload(c.id,e.target.files[0],true);e.target.value='';}}/>
                            <label htmlFor={`upd-${c.id}`} style={{...mBtn('rgba(240,165,0,0.1)','var(--gold)','1px solid rgba(240,165,0,0.35)'),cursor:'pointer',display:'inline-flex',alignItems:'center'}}>
                              📁 Update File
                            </label>
                          </>
                          <button onClick={()=>removeDriveFile(c.id)} style={mBtn('none','var(--text3)','1px solid rgba(255,255,255,0.1)')}>✕ Remove</button>
                        </>
                      ):driveConnected?(
                        <>
                          <input id={`drv-${c.id}`} type="file" accept=".pdf,.jpg,.jpeg,.png" style={{display:'none'}}
                            onChange={e=>{if(e.target.files?.[0])handleFileUpload(c.id,e.target.files[0],false);e.target.value='';}}/>
                          <label htmlFor={`drv-${c.id}`}
                            style={{fontSize:'0.65rem',padding:'3px 10px',borderRadius:6,cursor:isUp?'default':'pointer',background:'rgba(0,180,216,0.07)',color:'var(--cyan)',border:'1px dashed rgba(0,180,216,0.4)',display:'inline-flex',alignItems:'center',gap:5,pointerEvents:isUp?'none':'auto',opacity:isUp?0.6:1}}>
                            {isUp?'⏳ Uploading…':'📎 Upload Certificate Copy'}
                          </label>
                        </>
                      ):(
                        /* IMPROVEMENT 5 — Show reconnect if expired */
                        driveExpired?(
                          <button onClick={connectDrive} disabled={connectingDrive}
                            style={{fontSize:'0.64rem',padding:'3px 10px',borderRadius:6,cursor:'pointer',background:'rgba(255,107,53,0.08)',color:'#ff6b35',border:'1px solid rgba(255,107,53,0.3)'}}>
                            🔗 Reconnect to upload file
                          </button>
                        ):(
                          <span style={{fontSize:'0.64rem',color:'var(--text3)',fontStyle:'italic'}}>Connect storage above to save certificate file</span>
                        )
                      )}
                    </div>
                  </div>

                  {/* Action buttons */}
                  <div style={{display:'flex',flexDirection:'column',gap:4,flexShrink:0}}>
                    <button onClick={()=>isQU?setQuickId(null):startQuick(c)}
                      style={{background:isQU?'rgba(0,200,100,0.15)':'rgba(0,180,216,0.08)',border:`1px solid ${isQU?'rgba(0,200,100,0.4)':'rgba(0,180,216,0.3)'}`,color:isQU?'var(--green)':'var(--cyan)',borderRadius:6,cursor:'pointer',fontSize:'0.63rem',padding:'4px 8px',fontWeight:700,whiteSpace:'nowrap'}}>
                      🔄 Renew
                    </button>
                    <button onClick={()=>isEd?cancelEdit():startEdit(c)}
                      style={{background:isEd?'rgba(240,165,0,0.15)':'rgba(255,255,255,0.05)',border:`1px solid ${isEd?'rgba(240,165,0,0.5)':'rgba(255,255,255,0.1)'}`,color:isEd?'var(--gold)':'var(--text2)',borderRadius:6,cursor:'pointer',fontSize:'0.63rem',padding:'4px 8px',fontWeight:700}}>
                      ✏️ Edit
                    </button>
                    <button onClick={()=>deleteCert(c.id)}
                      style={{background:'none',border:'1px solid rgba(255,71,87,0.25)',color:'#ff4757',borderRadius:6,cursor:'pointer',fontSize:'0.63rem',padding:'4px 8px'}}>
                      🗑 Delete
                    </button>
                  </div>
                </div>

                {/* ── Scan / Extraction Panel ── */}
                {isEx&&(
                  <div style={{borderTop:'1px solid rgba(0,180,216,0.25)',marginTop:12,paddingTop:12}}>
                    <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:10,flexWrap:'wrap',gap:6}}>
                      <div style={{fontFamily:'Orbitron,monospace',fontSize:'0.7rem',color:'var(--cyan)'}}>
                        {extracting?'🔍 READING CERTIFICATE…':'✦ SCANNED DATA — Review & Edit if Needed'}
                      </div>
                      {!extracting&&extractModal?.detected&&Object.keys(extractModal.detected).length>0&&(
                        <span style={{fontSize:'0.62rem',color:'var(--green)',background:'rgba(0,200,100,0.1)',borderRadius:10,padding:'2px 8px',fontWeight:700}}>
                          ✦ {Object.keys(extractModal.detected).length} fields filled automatically
                        </span>
                      )}
                    </div>
                    {extracting
                      ?<div style={{display:'flex',alignItems:'center',gap:10,padding:'1.5rem',justifyContent:'center'}}>
                         <div className="spin"/>
                         <span style={{fontSize:'0.75rem',color:'var(--text3)'}}>Analysing certificate…</span>
                       </div>
                      :<>
                        {/* IMPROVEMENT 4 — Show error + retry button */}
                        {extractModal?.extractError&&(
                          <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',flexWrap:'wrap',gap:8,marginBottom:12,background:'rgba(255,107,53,0.08)',borderRadius:8,padding:'8px 10px',border:'1px solid rgba(255,107,53,0.25)'}}>
                            <span style={{fontSize:'0.7rem',color:'#ff6b35'}}>{extractErrMsg || 'Could not read this file — please fill in details below'}</span>
                            <button onClick={retryExtraction}
                              style={{padding:'4px 12px',borderRadius:6,fontSize:'0.7rem',fontWeight:700,cursor:'pointer',background:'rgba(255,107,53,0.15)',color:'#ff6b35',border:'1px solid rgba(255,107,53,0.4)',whiteSpace:'nowrap'}}>
                              ↺ Try Again
                            </button>
                          </div>
                        )}
                        {extractModal?.isRenewal&&(
                          <div style={{fontSize:'0.7rem',color:'var(--gold)',marginBottom:10,background:'rgba(240,165,0,0.08)',borderRadius:8,padding:'6px 10px',border:'1px solid rgba(240,165,0,0.25)'}}>
                            📁 Updating — existing file will be replaced in your storage
                          </div>
                        )}
                        {/* IMPROVEMENT 3 — Note if Drive not connected */}
                        {!driveConnected && !driveExpired && (
                          <div style={{fontSize:'0.68rem',color:'var(--text3)',marginBottom:10,background:'rgba(255,255,255,0.03)',borderRadius:8,padding:'6px 10px',border:'1px solid rgba(255,255,255,0.08)'}}>
                            ℹ️ Details will be saved. Connect cloud storage above to also save the file.
                          </div>
                        )}
                        {renderExtractionFields()}
                        <div style={{display:'flex',gap:6,marginTop:12,flexWrap:'wrap'}}>
                          <button className="btn btn-primary" style={{fontSize:'0.72rem',padding:'6px 16px'}}
                            onClick={confirmExtraction} disabled={saving||isUp}>
                            {isUp?'⏳ Saving…':driveConnected?'✅ Confirm & Save File to Storage':'✅ Confirm & Save Details'}
                          </button>
                          <button style={{background:'none',border:'1px solid var(--border)',borderRadius:7,color:'var(--text3)',cursor:'pointer',fontSize:'0.72rem',padding:'5px 12px'}}
                            onClick={()=>{setExtractModal(null);setExtractErrMsg('');}}>Cancel</button>
                        </div>
                      </>
                    }
                  </div>
                )}

                {/* ── Quick Renew ── */}
                {isQU&&(
                  <div style={{borderTop:'1px solid rgba(0,200,100,0.2)',marginTop:10,paddingTop:10}}>
                    <div style={{fontFamily:'Orbitron,monospace',fontSize:'0.68rem',color:'var(--green)',marginBottom:8}}>🔄 QUICK RENEWAL</div>
                    <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:8}}>
                      <div className="ff" style={{margin:0}}>
                        <label className="fl">New Certificate No.</label>
                        <input className="fi" placeholder="Updated number…" value={quickData.certNo} onChange={e=>setQuickData(d=>({...d,certNo:e.target.value}))}/>
                      </div>
                      <div className="ff" style={{margin:0}}>
                        <label className="fl">New Expiry Date</label>
                        <label style={{display:'flex',alignItems:'center',gap:5,cursor:'pointer',fontSize:'0.72rem',color:'var(--cyan)',marginBottom:5}}>
                          <input type="checkbox" checked={quickUnlimited} onChange={e=>setQuickUnlimited(e.target.checked)} style={{accentColor:'var(--cyan)'}}/>
                          ∞ Unlimited
                        </label>
                        {!quickUnlimited&&<input className="fi" type="date" value={quickData.expiryDate} onChange={e=>setQuickData(d=>({...d,expiryDate:e.target.value}))}/>}
                      </div>
                    </div>
                    <div style={{display:'flex',gap:6,marginTop:8}}>
                      <button className="btn btn-primary" style={{fontSize:'0.72rem',padding:'5px 12px'}} onClick={()=>saveQuick(c.id)} disabled={saving}>
                        {saving?'Saving…':'✅ Save Renewal'}
                      </button>
                      <button style={{background:'none',border:'1px solid var(--border)',borderRadius:7,color:'var(--text3)',cursor:'pointer',fontSize:'0.72rem',padding:'5px 10px'}} onClick={()=>setQuickId(null)}>
                        Cancel
                      </button>
                    </div>
                  </div>
                )}

                {/* ── Full Edit ── */}
                {isEd&&!isQU&&editData&&(
                  <div style={{borderTop:'1px solid rgba(240,165,0,0.25)',marginTop:10,paddingTop:10}}>
                    <div style={{fontFamily:'Orbitron,monospace',fontSize:'0.68rem',color:'var(--gold)',marginBottom:8}}>✏️ EDIT CERTIFICATE</div>
                    {renderFormFields(editData,setEditData,editCustomName,setEditCustomName,editCustomCategory,setEditCustomCategory,editUnlimited,setEditUnlimited)}
                    <div style={{display:'flex',gap:6,marginTop:10}}>
                      <button className="btn btn-primary" style={{fontSize:'0.72rem',padding:'5px 12px'}} onClick={saveEdit} disabled={saving}>
                        {saving?'Saving…':'✅ Save Changes'}
                      </button>
                      <button style={{background:'none',border:'1px solid var(--border)',borderRadius:7,color:'var(--text3)',cursor:'pointer',fontSize:'0.72rem',padding:'5px 10px'}} onClick={cancelEdit}>
                        Cancel
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      <div className="info-box" style={{marginTop:'1.2rem',fontSize:'0.72rem'}}>
        🔒 Certificate details stored securely — visible only to you. Document files are saved privately in your own personal cloud storage account.
      </div>
    </div>
  );
}

export default CertificateTrackerPage;
