/* eslint-disable */
// src/pages/CertificateTrackerPage.jsx
import { useState, useEffect } from "react";
import { db } from "../firebase";
import { doc, getDoc, setDoc } from "firebase/firestore";

// ─── PREVIEW MODAL ────────────────────────────────────────────────────────────
function PreviewModal({ file, onClose }) {
  if (!file) return null;
  const isImage = file.name?.match(/\.(jpg|jpeg|png|gif|webp)$/i);
  return (
    <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,0.92)',zIndex:9999,display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',padding:'1rem'}} onClick={onClose}>
      <div style={{position:'absolute',top:16,right:16,cursor:'pointer',color:'#fff',fontSize:'1.5rem',fontWeight:700}} onClick={onClose}>✕</div>
      <div style={{fontSize:'0.75rem',color:'rgba(255,255,255,0.6)',marginBottom:12,textAlign:'center'}}>{file.name}</div>
      <div style={{maxWidth:'100%',maxHeight:'80vh',overflow:'auto'}} onClick={e=>e.stopPropagation()}>
        {isImage
          ? <img src={file.url} alt={file.name} style={{maxWidth:'100%',maxHeight:'75vh',borderRadius:8,objectFit:'contain'}}/>
          : <iframe src={file.url} title={file.name} style={{width:'min(700px,90vw)',height:'75vh',border:'none',borderRadius:8,background:'#fff'}}/>
        }
      </div>
      <button onClick={onClose} style={{marginTop:14,padding:'8px 24px',borderRadius:8,background:'rgba(255,255,255,0.1)',color:'#fff',border:'1px solid rgba(255,255,255,0.2)',cursor:'pointer',fontSize:'0.8rem'}}>Close</button>
    </div>
  );
}

// ─── CONSTANTS ────────────────────────────────────────────────────────────────
const CERT_TEMPLATES = [
  {name:'Certificate of Competency (CoC)',validity:5,category:'Competency'},
  {name:'GMDSS GOC / ROC',validity:5,category:'Competency'},
  {name:'Medical Certificate (ENG1 / ML5)',validity:2,category:'Medical'},
  {name:'STCW Basic Safety Training (BST)',validity:5,category:'Safety'},
  {name:'Proficiency in Survival Craft (PSC)',validity:5,category:'Safety'},
  {name:'Advanced Fire Fighting (AFF)',validity:5,category:'Safety'},
  {name:'Medical First Aid (MEFA)',validity:5,category:'Medical'},
  {name:'Medical Care on Board (MCOB)',validity:5,category:'Medical'},
  {name:'ECDIS Type Specific',validity:5,category:'Navigation'},
  {name:'ARPA / Radar Certificate',validity:5,category:'Navigation'},
  {name:'Bridge Resource Management (BRM)',validity:5,category:'Navigation'},
  {name:'Engine Room Resource Management',validity:5,category:'Engineering'},
  {name:'Oil Tanker Certificate',validity:5,category:'Tanker'},
  {name:'Chemical Tanker Certificate',validity:5,category:'Tanker'},
  {name:'Gas Tanker Certificate',validity:5,category:'Tanker'},
  {name:'COLREGS / Rules of the Road',validity:5,category:'Navigation'},
  {name:'Crowd Management',validity:5,category:'Safety'},
  {name:'Passenger Ship Safety',validity:5,category:'Safety'},
  {name:'Passport',validity:10,category:'Personal'},
  {name:"CDC / Seaman's Book",validity:5,category:'Personal'},
  {name:'SID - Seafarer Identity Document',validity:5,category:'Personal'},
  {name:'Visa',validity:2,category:'Personal'},
  {name:'Yellow Fever Certificate',validity:99,category:'Medical'},
  {name:'Flag State Certificate / Endorsement',validity:5,category:'Competency'},
  {name:'STCW Endorsement',validity:5,category:'Competency'},
  {name:'National Endorsement',validity:5,category:'Competency'},
];
const KNOWN_CATEGORIES = ['Competency','Safety','Medical','Navigation','Engineering','Tanker','Personal','Others'];
const CATEGORIES       = ['All',...KNOWN_CATEGORIES];
const DRIVE_SCOPE      = 'https://www.googleapis.com/auth/drive.file';
const DRIVE_CLIENT_ID  = '636056685819-b0mv1o4ftbdfirtan4svpoaa83ns49c6.apps.googleusercontent.com';
const DRIVE_FOLDER     = 'NavisphereX Certificates';
const EXPIRY_TIERS     = [
  {key:'expired',label:'Expired',    color:'#ff4757',test:d=>d<0},
  {key:'1mo',    label:'< 1 Month',  color:'#ff5252',test:d=>d>=0&&d<30},
  {key:'2mo',    label:'< 2 Months', color:'#ff6b35',test:d=>d>=30&&d<60},
  {key:'3mo',    label:'< 3 Months', color:'#ff9f43',test:d=>d>=60&&d<90},
  {key:'6mo',    label:'< 6 Months', color:'#ffa502',test:d=>d>=90&&d<180},
  {key:'12mo',   label:'< 12 Months',color:'#f0a500',test:d=>d>=180&&d<365},
];
const EMPTY_CERT = {name:'',certNo:'',issueDate:'',expiryDate:'',category:'Safety',notes:''};

const STATUS = (expiryDate) => {
  if (!expiryDate) return {label:'Unknown',color:'var(--text3)',bg:'rgba(255,255,255,0.05)'};
  if (expiryDate==='unlimited') return {label:'UNLIMITED',color:'#00b4d8',bg:'rgba(0,180,216,0.1)'};
  const days = Math.floor((new Date(expiryDate)-new Date())/86400000);
  if (days<0)  return {label:'EXPIRED',      color:'#ff4757',bg:'rgba(255,71,87,0.12)',days};
  if (days<30) return {label:'EXPIRING SOON',color:'#ff6b35',bg:'rgba(255,107,53,0.12)',days};
  if (days<90) return {label:'DUE SOON',     color:'var(--gold)',bg:'rgba(240,165,0,0.1)',days};
  return              {label:'VALID',         color:'var(--green)',bg:'rgba(0,200,100,0.08)',days};
};

// ─── DRIVE HELPERS ────────────────────────────────────────────────────────────
async function driveSearchFolder(token) {
  const q = encodeURIComponent(`name='${DRIVE_FOLDER}' and mimeType='application/vnd.google-apps.folder' and trashed=false`);
  const res = await fetch(`https://www.googleapis.com/drive/v3/files?q=${q}&fields=files(id,name)`,{headers:{Authorization:`Bearer ${token}`}});
  return (await res.json()).files?.[0]?.id||null;
}
async function driveCreateFolder(token) {
  const res = await fetch('https://www.googleapis.com/drive/v3/files',{method:'POST',headers:{Authorization:`Bearer ${token}`,'Content-Type':'application/json'},body:JSON.stringify({name:DRIVE_FOLDER,mimeType:'application/vnd.google-apps.folder'})});
  return (await res.json()).id;
}
async function driveUploadFile(token,folderId,file,fileName) {
  const form = new FormData();
  form.append('metadata',new Blob([JSON.stringify({name:fileName,parents:[folderId]})],{type:'application/json'}));
  form.append('file',file);
  const res = await fetch('https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,name',{method:'POST',headers:{Authorization:`Bearer ${token}`},body:form});
  const data = await res.json();
  if (!res.ok) throw new Error(data.error?.message||'Upload failed');
  return data;
}
async function driveDeleteFile(token,fileId) {
  await fetch(`https://www.googleapis.com/drive/v3/files/${fileId}`,{method:'DELETE',headers:{Authorization:`Bearer ${token}`}});
}
async function driveGetBlob(token,fileId) {
  const res = await fetch(`https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`,{headers:{Authorization:`Bearer ${token}`}});
  if (!res.ok) throw new Error('Download failed');
  return res.blob();
}

// ─── IMAGE COMPRESSION ────────────────────────────────────────────────────────
async function compressImage(file) {
  if (file.type==='application/pdf'||file.size<800*1024) return file;
  return new Promise(resolve=>{
    const img=new Image(),url=URL.createObjectURL(file);
    img.onload=()=>{
      URL.revokeObjectURL(url);
      const canvas=document.createElement('canvas');
      let{width,height}=img;const MAX=1200;
      if(width>height&&width>MAX){height=(height/width)*MAX;width=MAX;}
      else if(height>MAX){width=(width/height)*MAX;height=MAX;}
      canvas.width=Math.round(width);canvas.height=Math.round(height);
      canvas.getContext('2d').drawImage(img,0,0,canvas.width,canvas.height);
      canvas.toBlob(blob=>{
        const out=new File([blob],file.name.replace(/\.[^.]+$/,'.jpg'),{type:'image/jpeg'});
        console.info(`[Scanner] ${(file.size/1024).toFixed(0)}KB -> ${(out.size/1024).toFixed(0)}KB`);
        resolve(out);
      },'image/jpeg',0.82);
    };
    img.onerror=()=>{URL.revokeObjectURL(url);resolve(file);};
    img.src=url;
  });
}

// ─── AI SCANNER ───────────────────────────────────────────────────────────────
const _key = () => process.env.REACT_APP_GEMINI_API_KEY||'';
const fileToBase64 = file => new Promise((resolve,reject)=>{const r=new FileReader();r.onload=()=>resolve(r.result.split(',')[1]);r.onerror=reject;r.readAsDataURL(file);});

async function extractCertData(file) {
  const token = process.env.REACT_APP_HF_TOKEN || '';
  if (!token) throw new Error('NOT_CONFIGURED');

  // PDFs cannot be processed by the OCR model directly
  if (file.type === 'application/pdf') throw new Error('PDF_NOT_SUPPORTED');

  const res = await fetch(
    'https://api-inference.huggingface.co/models/microsoft/trocr-base-printed',
    {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': file.type },
      body: file
    }
  );

  if (!res.ok) {
    const e = await res.json().catch(()=>({}));
    console.error('[Scanner] HF error:', res.status, e);
    if (res.status === 503) throw new Error('QUOTA_EXCEEDED'); // model cold-starting, retry shortly
    if (res.status === 429) throw new Error('QUOTA_EXCEEDED');
    if (res.status === 401 || res.status === 403) throw new Error('INVALID_KEY');
    throw new Error(`HTTP_${res.status}`);
  }

  const data = await res.json();
  const text = Array.isArray(data) ? (data[0]?.generated_text || '') : (data.generated_text || '');
  if (!text) throw new Error('NO_TEXT_DETECTED');

  // Basic pattern matching from raw OCR text — OCR returns plain text, not structured data
  const dateRegex = /(\d{1,2}[\/\-\.]\d{1,2}[\/\-\.]\d{2,4})|(\d{4}[\/\-\.]\d{1,2}[\/\-\.]\d{1,2})/g;
  const dates = text.match(dateRegex) || [];
  const certNoMatch = text.match(/[A-Z]{2,}[\-\/]?\d{4,}/);

  const toISO = (d) => {
    const parts = d.split(/[\/\-\.]/);
    if (parts.length !== 3) return null;
    let [a,b,c] = parts;
    if (a.length === 4) return `${a}-${b.padStart(2,'0')}-${c.padStart(2,'0')}`;
    if (c.length === 4) return `${c}-${b.padStart(2,'0')}-${a.padStart(2,'0')}`;
    return null;
  };

  return {
    name: null,           // OCR cannot reliably identify certificate type — user selects manually
    certNo: certNoMatch ? certNoMatch[0] : null,
    issueDate: dates[0] ? toISO(dates[0]) : null,
    expiryDate: dates[1] ? toISO(dates[1]) : null,
    isUnlimited: false,
    issuingAuthority: null,
    holderName: null,
    category: null,
    notes: text.slice(0, 200) || null
  };
}


function scanErrorMessage(code) {
  // TEMP DEBUG: show raw error code to diagnose. Revert after fixed.
  if (code==='NOT_CONFIGURED')     return 'DEBUG: Token not configured (env var missing/empty)';
  if (code==='INVALID_KEY')        return 'DEBUG: Token rejected (401/403 - check permissions)';
  if (code==='QUOTA_EXCEEDED')     return 'QUOTA_EXCEEDED';
  if (code==='PDF_NOT_SUPPORTED')  return 'Auto-fill works for photos only — please fill in details for PDF files.';
  if (code==='NO_TEXT_DETECTED')   return 'DEBUG: No text detected in image';
  if (code?.includes('NetworkError')||code?.includes('fetch')) return 'No internet connection.';
  return 'DEBUG: ' + code;
}

// ─── COMPONENT ────────────────────────────────────────────────────────────────
function CertificateTrackerPage({user,notify}) {
  // Core
  const [certs,setCerts]         = useState([]);
  const [loading,setLoading]     = useState(true);
  const [saving,setSaving]       = useState(false);
  const [showAdd,setShowAdd]     = useState(false);
  const [catFilter,setCatFilter] = useState('All');
  const [newCert,setNewCert]     = useState({...EMPTY_CERT});
  const [customName,setCustomName]           = useState(false);
  const [unlimitedExpiry,setUnlimitedExpiry] = useState(false);
  const [customCategory,setCustomCategory]   = useState(false);
  // Edit
  const [editId,setEditId]                       = useState(null);
  const [editData,setEditData]                   = useState(null);
  const [editCustomName,setEditCustomName]       = useState(false);
  const [editCustomCategory,setEditCustomCategory]= useState(false);
  const [editUnlimited,setEditUnlimited]         = useState(false);
  // Quick renew
  const [quickId,setQuickId]           = useState(null);
  const [quickData,setQuickData]       = useState({certNo:'',expiryDate:''});
  const [quickUnlimited,setQuickUnlimited]= useState(false);
  // Timeline
  const [showExpDash,setShowExpDash] = useState(false);
  const [activeTier,setActiveTier]   = useState(null);
  // Drive
  const [driveToken,setDriveToken]           = useState(null);
  const [driveConnected,setDriveConnected]   = useState(false);
  const [driveEmail,setDriveEmail]           = useState(null);
  const [driveFolderId,setDriveFolderId]     = useState(null);
  const [uploadingId,setUploadingId]         = useState(null);
  const [connectingDrive,setConnectingDrive] = useState(false);
  const [driveExpired,setDriveExpired]       = useState(false);
  // AI
  const [extractModal,setExtractModal]   = useState(null);
  const [extracting,setExtracting]       = useState(false);
  const [extractErrMsg,setExtractErrMsg] = useState('');
  const [addScanFile,setAddScanFile]     = useState(null);
  const [scanningAdd,setScanningAdd]     = useState(false);
  const [addAiFields,setAddAiFields]     = useState({});
  const [addScanErrMsg,setAddScanErrMsg] = useState('');
  // NEW: Search & Sort
  const [searchQuery,setSearchQuery] = useState('');
  const [sortBy,setSortBy]           = useState('expiry');
  const [sortDir,setSortDir]         = useState('asc');
  // NEW: Bulk select
  const [selectMode,setSelectMode]   = useState(false);
  const [selectedIds,setSelectedIds] = useState(new Set());
  // NEW: Stats
  const [showStats,setShowStats]     = useState(false);
  // NEW: Renewal history
  const [showHistory,setShowHistory] = useState(null);
  // NEW: File preview
  const [previewFile,setPreviewFile]     = useState(null);
  const [previewLoading,setPreviewLoading]= useState(false);

  useEffect(()=>{if(!user)return;loadCerts();initDrive();},[user?.uid]);

  const isDriveTokenValid=()=>{const e=localStorage.getItem('nsx_drive_expiry');return e&&Date.now()<parseInt(e);};

  const initDrive=()=>{
    const token=localStorage.getItem('nsx_drive_token');
    const expiry=localStorage.getItem('nsx_drive_expiry');
    const email=localStorage.getItem('nsx_drive_email');
    if(token&&expiry&&Date.now()<parseInt(expiry)){
      setDriveToken(token);setDriveConnected(true);setDriveEmail(email);setDriveExpired(false);
    } else if(token&&email){
      // Token expired but we know the account — try silent refresh (no popup)
      silentRefreshDrive(email);
    }
  };

  // Silent token refresh — no popup shown to user. Falls back to Reconnect UI only if this fails.
  const silentRefreshDrive=async(email)=>{
    try{
      await new Promise((resolve,reject)=>{
        if(window.google?.accounts?.oauth2){resolve();return;}
        const sc=document.createElement('script');sc.src='https://accounts.google.com/gsi/client';
        sc.onload=resolve;sc.onerror=()=>reject(new Error('Network error'));document.head.appendChild(sc);
      });
      const token=await new Promise((resolve,reject)=>{
        let settled=false;
        const client=window.google.accounts.oauth2.initTokenClient({
          client_id:DRIVE_CLIENT_ID,scope:DRIVE_SCOPE,login_hint:email,
          callback:r=>{settled=true;if(r.error)reject(new Error(r.error_description||r.error));else resolve(r.access_token);}
        });
        // prompt:'none' attempts silent auth using existing Google session — no popup
        client.requestAccessToken({prompt:'none'});
        setTimeout(()=>{if(!settled)reject(new Error('timeout'));},4000);
      });
      localStorage.setItem('nsx_drive_token',token);
      localStorage.setItem('nsx_drive_expiry',String(Date.now()+3300000));
      setDriveToken(token);setDriveConnected(true);setDriveEmail(email);setDriveExpired(false);
      console.info('[Drive] Silent refresh successful');
    }catch(e){
      console.info('[Drive] Silent refresh failed, manual reconnect needed:',e.message);
      setDriveExpired(true);setDriveConnected(false);
    }
  };

  const connectDrive=async()=>{
    setConnectingDrive(true);setDriveExpired(false);
    try{
      await new Promise((resolve,reject)=>{
        if(window.google?.accounts?.oauth2){resolve();return;}
        const s=document.createElement('script');s.src='https://accounts.google.com/gsi/client';
        s.onload=resolve;s.onerror=()=>reject(new Error('Network error'));document.head.appendChild(s);
      });
      const token=await new Promise((resolve,reject)=>{
        window.google.accounts.oauth2.initTokenClient({client_id:DRIVE_CLIENT_ID,scope:DRIVE_SCOPE,login_hint:user?.email||'',
          callback:r=>{if(r.error)reject(new Error(r.error_description||r.error));else resolve(r.access_token);}
        }).requestAccessToken({prompt:''});
      });
      const info=await fetch('https://www.googleapis.com/oauth2/v3/userinfo',{headers:{Authorization:`Bearer ${token}`}}).then(r=>r.json());
      if(info.email&&user?.email&&info.email.toLowerCase()!==user.email.toLowerCase()){notify(`Please use ${user.email} to connect.`,'error');setConnectingDrive(false);return;}
      localStorage.setItem('nsx_drive_token',token);
      localStorage.setItem('nsx_drive_expiry',String(Date.now()+3300000));
      localStorage.setItem('nsx_drive_email',info.email||'');
      setDriveToken(token);setDriveConnected(true);setDriveEmail(info.email);setDriveExpired(false);
      notify('Storage connected','success');
    }catch(e){console.error('[Drive]',e);if(!e.message?.includes('popup_closed')&&!e.message?.includes('access_denied'))notify('Could not connect storage.','error');}
    setConnectingDrive(false);
  };

  const disconnectDrive=()=>{
    ['nsx_drive_token','nsx_drive_expiry','nsx_drive_email'].forEach(k=>localStorage.removeItem(k));
    setDriveToken(null);setDriveConnected(false);setDriveEmail(null);setDriveFolderId(null);setDriveExpired(false);
    notify('Storage disconnected','success');
  };

  const getOrCreateFolder=async(token)=>{
    if(driveFolderId)return driveFolderId;
    let fid=await driveSearchFolder(token);
    if(!fid)fid=await driveCreateFolder(token);
    setDriveFolderId(fid);return fid;
  };

  const viewDriveFile=id=>window.open(`https://drive.google.com/file/d/${id}/view`,'_blank');

  const downloadDriveFile=async(id,name)=>{
    if(!isDriveTokenValid()){setDriveExpired(true);notify('Session expired — reconnect storage','error');return;}
    try{const blob=await driveGetBlob(driveToken,id);const url=URL.createObjectURL(blob);const a=document.createElement('a');a.href=url;a.download=name||'certificate';a.click();URL.revokeObjectURL(url);}
    catch(e){console.error('[Drive] Download:',e);notify('Download failed.','error');}
  };

  const removeDriveFile=async(certId)=>{
    const cert=certs.find(c=>c.id===certId);
    if(!cert?.driveFileId||!window.confirm('Remove file from your cloud storage?'))return;
    try{
      if(driveToken&&isDriveTokenValid())await driveDeleteFile(driveToken,cert.driveFileId);
      await saveCerts(certs.map(c=>c.id===certId?{...c,driveFileId:null,driveFileName:null}:c));
      notify('File removed','success');
    }catch(e){console.error('[Drive] Remove:',e);notify('Could not remove file.','error');}
  };

  // NEW: Upload file only (no AI scan)
  const uploadFileOnly=async(certId,file)=>{
    if(!driveToken||!isDriveTokenValid()){setDriveExpired(true);notify('Connect storage first','error');return;}
    const allowed=['application/pdf','image/jpeg','image/png','image/jpg'];
    if(!allowed.includes(file.type)){notify('Only PDF, JPG, or PNG files allowed','error');return;}
    setUploadingId(certId);
    try{
      const folderId=await getOrCreateFolder(driveToken);
      const cert=certs.find(c=>c.id===certId)||{};
      const safeName=(cert.name||'Certificate').replace(/[^a-zA-Z0-9 ]/g,'');
      const ext=file.name.split('.').pop();
      const existing=cert.driveFileId;
      if(existing&&window.confirm('Replace existing file in storage?')){try{await driveDeleteFile(driveToken,existing);}catch{}}
      const uploaded=await driveUploadFile(driveToken,folderId,file,`${safeName}_${certId}.${ext}`);
      await saveCerts(certs.map(c=>c.id===certId?{...c,driveFileId:uploaded.id,driveFileName:file.name}:c));
      notify('File uploaded to your storage','success');
    }catch(e){console.error('[Drive] Upload only:',e);notify('Upload failed. Please try again.','error');}
    setUploadingId(null);
  };

  // NEW: Preview file from Drive
  const previewDriveFile=async(fileId,fileName)=>{
    const isImage=fileName?.match(/\.(jpg|jpeg|png|gif|webp)$/i);
    if(!isImage){viewDriveFile(fileId);return;}
    if(!isDriveTokenValid()){setDriveExpired(true);notify('Reconnect storage to preview','error');return;}
    setPreviewLoading(true);
    try{const blob=await driveGetBlob(driveToken,fileId);const url=URL.createObjectURL(blob);setPreviewFile({url,name:fileName,fileId});}
    catch(e){notify('Could not load preview','error');}
    setPreviewLoading(false);
  };

  const closePreview=()=>{if(previewFile?.url)URL.revokeObjectURL(previewFile.url);setPreviewFile(null);};

  // ── AI Extraction ─────────────────────────────────────────────────────────
  const handleFileUpload=async(certId,file,isRenewal=false)=>{
    const allowed=['application/pdf','image/jpeg','image/png','image/jpg'];
    if(!allowed.includes(file.type)){notify('Only PDF, JPG, or PNG files allowed','error');return;}
    if(file.size>25*1024*1024){notify('File too large — max 25MB','error');return;}
    setExtractErrMsg('');
    setExtractModal({certId,file,reviewData:null,isRenewal,detected:null});
    setExtracting(true);setEditId(null);setQuickId(null);
    try{
      const compressed=await compressImage(file);
      const ext=await extractCertData(compressed);
      const existing=certs.find(c=>c.id===certId)||{};
      const reviewData={
        name:ext.name||existing.name||'',certNo:ext.certNo||existing.certNo||'',
        issueDate:ext.issueDate||existing.issueDate||'',
        expiryDate:ext.isUnlimited?'':(ext.expiryDate||existing.expiryDate||''),
        isUnlimited:ext.isUnlimited||(existing.expiryDate==='unlimited')||false,
        category:ext.category||existing.category||'Others',
        issuingAuthority:ext.issuingAuthority||'',holderName:ext.holderName||'',
        notes:ext.notes||existing.notes||'',
      };
      const detected={};
      if(ext.name)detected.name=true;if(ext.certNo)detected.certNo=true;
      if(ext.issueDate)detected.issueDate=true;if(ext.expiryDate||ext.isUnlimited)detected.expiryDate=true;
      if(ext.category)detected.category=true;if(ext.issuingAuthority||ext.notes)detected.notes=true;
      setExtractModal({certId,file,reviewData,isRenewal,detected});
    }catch(e){
      console.error('[Scanner]',e.message);
      const existing=certs.find(c=>c.id===certId)||{};
      const errCode=scanErrorMessage(e.message);
      setExtractErrMsg(errCode);
      setExtractModal({certId,file,isRenewal,detected:{},extractError:true,quotaError:e.message==='QUOTA_EXCEEDED',
        reviewData:{name:existing.name||'',certNo:existing.certNo||'',issueDate:existing.issueDate||'',
          expiryDate:existing.expiryDate==='unlimited'?'':(existing.expiryDate||''),
          isUnlimited:existing.expiryDate==='unlimited',category:existing.category||'Others',
          issuingAuthority:'',holderName:'',notes:existing.notes||''}});
    }
    setExtracting(false);
  };

  const retryExtraction=()=>{if(extractModal?.file)handleFileUpload(extractModal.certId,extractModal.file,extractModal.isRenewal);};

  const confirmExtraction=async()=>{
    if(!extractModal?.reviewData)return;
    const{certId,file,reviewData,isRenewal}=extractModal;
    if(!reviewData.name){notify('Please enter certificate name','error');return;}
    const finalExpiry=reviewData.isUnlimited?'unlimited':reviewData.expiryDate;
    if(!finalExpiry){notify('Please enter expiry date or select Unlimited','error');return;}
    setUploadingId(certId);
    try{
      let driveFileId=null,driveFileName=null;
      if(driveToken&&isDriveTokenValid()){
        const existing=certs.find(c=>c.id===certId);
        if(isRenewal&&existing?.driveFileId){try{await driveDeleteFile(driveToken,existing.driveFileId);}catch{}}
        const folderId=await getOrCreateFolder(driveToken);
        const safeName=reviewData.name.replace(/[^a-zA-Z0-9 ]/g,'');
        const uploaded=await driveUploadFile(driveToken,folderId,file,`${safeName}_${certId}.${file.name.split('.').pop()}`);
        driveFileId=uploaded.id;driveFileName=file.name;
      }
      const notesText=[reviewData.notes,reviewData.issuingAuthority?`Issued by: ${reviewData.issuingAuthority}`:null,reviewData.holderName?`Holder: ${reviewData.holderName}`:null].filter(Boolean).join(' | ');
      // NEW: add renewal history entry
      const existing=certs.find(c=>c.id===certId)||{};
      const histEntry={date:new Date().toISOString().split('T')[0],certNo:reviewData.certNo,expiryDate:finalExpiry};
      const history=isRenewal?[...(existing.renewalHistory||[]),histEntry]:(existing.renewalHistory||[]);
      await saveCerts(certs.map(c=>c.id===certId?{...c,name:reviewData.name,certNo:reviewData.certNo,issueDate:reviewData.issueDate,expiryDate:finalExpiry,category:reviewData.category,notes:notesText,renewalHistory:history,...(driveFileId?{driveFileId,driveFileName}:{})}:c));
      setExtractModal(null);setExtractErrMsg('');
      notify(driveFileId?'Certificate updated and file saved':'Certificate details updated','success');
    }catch(e){console.error('[CertTracker] Save:',e);notify('Could not save. Please try again.','error');}
    setUploadingId(null);
  };

  const handleAddFormScan=async(file)=>{
    const allowed=['application/pdf','image/jpeg','image/png','image/jpg'];
    if(!allowed.includes(file.type)){notify('Only PDF, JPG, or PNG files allowed','error');return;}
    setAddScanFile(file);setScanningAdd(true);setAddAiFields({});setAddScanErrMsg('');
    try{
      const compressed=await compressImage(file);
      const ext=await extractCertData(compressed);
      const detected={},updates={};
      if(ext.name){updates.name=ext.name;detected.name=true;setCustomName(false);}
      if(ext.certNo){updates.certNo=ext.certNo;detected.certNo=true;}
      if(ext.issueDate){updates.issueDate=ext.issueDate;detected.issueDate=true;}
      if(ext.category){updates.category=ext.category;detected.category=true;}
      if(ext.isUnlimited){setUnlimitedExpiry(true);detected.expiryDate=true;}
      else if(ext.expiryDate){updates.expiryDate=ext.expiryDate;detected.expiryDate=true;}
      if(ext.notes||ext.issuingAuthority){updates.notes=[ext.notes,ext.issuingAuthority?`Issued by: ${ext.issuingAuthority}`:null].filter(Boolean).join(' | ');detected.notes=true;}
      setNewCert(n=>({...n,...updates}));setAddAiFields(detected);
      notify(`Scanned — ${Object.keys(detected).length} fields filled. Review below.`,'success');
    }catch(e){
      console.error('[Scanner] Add-form:',e.message);
      setAddScanErrMsg(e.message==='QUOTA_EXCEEDED'?'QUOTA_EXCEEDED':scanErrorMessage(e.message));
    }
    setScanningAdd(false);
  };

  const retryAddScan=()=>{if(addScanFile)handleAddFormScan(addScanFile);};

  // ── Core ──────────────────────────────────────────────────────────────────
  const loadCerts=async()=>{
    setLoading(true);
    try{const snap=await getDoc(doc(db,'certificates',user.uid));if(snap.exists())setCerts(snap.data().list||[]);}
    catch(e){console.error('[CertTracker] Load:',e);}
    setLoading(false);
  };

  const saveCerts=async(updated)=>{
    setSaving(true);
    try{await setDoc(doc(db,'certificates',user.uid),{list:updated,updatedAt:new Date().toISOString()});setCerts(updated);}
    catch(e){console.error('[CertTracker] Save:',e);notify('Could not save. Check your connection.','error');}
    setSaving(false);
  };

  const addCert=async()=>{
    if(!newCert.name){notify('Please enter certificate name','error');return;}
    const finalExpiry=unlimitedExpiry?'unlimited':newCert.expiryDate;
    if(!finalExpiry){notify('Please enter expiry date or select Unlimited','error');return;}
    const id=Date.now().toString();
    let entry={...newCert,expiryDate:finalExpiry,id,renewalHistory:[]};
    if(addScanFile&&driveToken&&isDriveTokenValid()){
      try{
        const fid=await getOrCreateFolder(driveToken);
        const up=await driveUploadFile(driveToken,fid,addScanFile,`${newCert.name.replace(/[^a-zA-Z0-9 ]/g,'')}_${id}.${addScanFile.name.split('.').pop()}`);
        entry={...entry,driveFileId:up.id,driveFileName:addScanFile.name};
      }catch(e){console.error('[Drive] Upload on add:',e);notify('Certificate added but file upload failed.','error');}
    }
    await saveCerts([...certs,entry]);
    setNewCert({...EMPTY_CERT});setShowAdd(false);setCustomName(false);
    setCustomCategory(false);setUnlimitedExpiry(false);setAddScanFile(null);setAddAiFields({});setAddScanErrMsg('');
    notify('Certificate added'+(entry.driveFileId?' and file saved':''),'success');
  };

  const deleteCert=async(id)=>{
    if(!window.confirm('Delete this certificate?'))return;
    const cert=certs.find(c=>c.id===id);
    if(cert?.driveFileId&&driveToken&&isDriveTokenValid()){try{await driveDeleteFile(driveToken,cert.driveFileId);}catch{}}
    await saveCerts(certs.filter(c=>c.id!==id));
    notify('Deleted','success');
  };

  const startEdit=cert=>{setEditId(cert.id);setEditData({...cert});setEditUnlimited(cert.expiryDate==='unlimited');setEditCustomName(!CERT_TEMPLATES.find(t=>t.name===cert.name));setEditCustomCategory(!KNOWN_CATEGORIES.includes(cert.category));setQuickId(null);setExtractModal(null);};
  const cancelEdit=()=>{setEditId(null);setEditData(null);setEditCustomName(false);setEditCustomCategory(false);setEditUnlimited(false);};
  const saveEdit=async()=>{
    if(!editData.name){notify('Enter certificate name','error');return;}
    const fe=editUnlimited?'unlimited':editData.expiryDate;
    if(!fe){notify('Enter expiry date','error');return;}
    await saveCerts(certs.map(c=>c.id===editId?{...editData,expiryDate:fe}:c));
    cancelEdit();notify('Updated','success');
  };

  const startQuick=cert=>{setQuickId(cert.id);setQuickData({certNo:cert.certNo||'',expiryDate:cert.expiryDate==='unlimited'?'':(cert.expiryDate||'')});setQuickUnlimited(cert.expiryDate==='unlimited');setEditId(null);cancelEdit();setExtractModal(null);};
  const saveQuick=async id=>{
    const fe=quickUnlimited?'unlimited':quickData.expiryDate;
    if(!fe){notify('Enter expiry date','error');return;}
    // NEW: save renewal history
    const cert=certs.find(c=>c.id===id)||{};
    const histEntry={date:new Date().toISOString().split('T')[0],certNo:quickData.certNo||cert.certNo||'',expiryDate:fe};
    await saveCerts(certs.map(c=>c.id===id?{...c,expiryDate:fe,certNo:quickData.certNo||c.certNo,renewalHistory:[...(c.renewalHistory||[]),histEntry]}:c));
    setQuickId(null);notify('Renewed','success');
  };

  // NEW: Duplicate cert
  const duplicateCert=cert=>{
    setNewCert({name:cert.name,certNo:'',issueDate:'',expiryDate:'',category:cert.category,notes:cert.notes||''});
    setCustomName(!CERT_TEMPLATES.find(t=>t.name===cert.name));
    setShowAdd(true);
    notify('Duplicated — fill in new dates below','success');
  };

  // NEW: Copy cert details to clipboard
  const copyCertDetails=cert=>{
    const s=STATUS(cert.expiryDate);
    const text=[`Certificate: ${cert.name}`,cert.certNo?`Number: ${cert.certNo}`:null,cert.issueDate?`Issued: ${cert.issueDate}`:null,`Expiry: ${cert.expiryDate==='unlimited'?'Unlimited':(cert.expiryDate||'N/A')}`,`Status: ${s.label}`,cert.notes?`Notes: ${cert.notes}`:null].filter(Boolean).join('\n');
    navigator.clipboard.writeText(text).then(()=>notify('Copied to clipboard','success')).catch(()=>notify('Copy failed','error'));
  };

  // NEW: Export CSV
  const exportCSV=()=>{
    const headers=['Name','Cert No.','Category','Issue Date','Expiry Date','Status','Notes'];
    const rows=certs.map(c=>{const s=STATUS(c.expiryDate);return[c.name,c.certNo||'',c.category,c.issueDate||'',c.expiryDate==='unlimited'?'Unlimited':(c.expiryDate||''),s.label,c.notes||''].map(v=>`"${String(v).replace(/"/g,'""')}"`).join(',');});
    const csv=[headers.join(','),...rows].join('\n');
    const blob=new Blob([csv],{type:'text/csv'});const url=URL.createObjectURL(blob);
    const a=document.createElement('a');a.href=url;a.download=`NavisphereX_Certificates_${new Date().toISOString().split('T')[0]}.csv`;a.click();URL.revokeObjectURL(url);
    notify('CSV downloaded','success');
  };

  // NEW: Export PDF (print)
  const exportPDF=()=>{
    const rows=certs.map(c=>{const s=STATUS(c.expiryDate);return`<tr><td>${c.name}</td><td>${c.certNo||''}</td><td>${c.category}</td><td>${c.issueDate||''}</td><td>${c.expiryDate==='unlimited'?'Unlimited':(c.expiryDate||'')}</td><td style="color:${s.color==='var(--green)'?'green':s.color==='#ff4757'?'red':'orange'}">${s.label}</td><td>${c.notes||''}</td></tr>`;}).join('');
    const html=`<!DOCTYPE html><html><head><title>NavisphereX Certificates</title><style>body{font-family:Arial,sans-serif;font-size:11px;margin:20px}h2{font-size:16px;margin-bottom:4px}p{font-size:10px;color:#666;margin:0 0 12px}table{width:100%;border-collapse:collapse}th,td{border:1px solid #ddd;padding:5px 7px;text-align:left}th{background:#f5f5f5;font-weight:600}tr:nth-child(even){background:#fafafa}@media print{button{display:none}}</style></head><body><h2>NavisphereX — Certificate Report</h2><p>Generated: ${new Date().toLocaleDateString()} | Total: ${certs.length} certificates</p><table><tr><th>Certificate Name</th><th>Cert No.</th><th>Category</th><th>Issue Date</th><th>Expiry Date</th><th>Status</th><th>Notes</th></tr>${rows}</table><br/><button onclick="window.print()">Print / Save as PDF</button></body></html>`;
    const win=window.open('','_blank');win.document.write(html);win.document.close();
    notify('Report opened — use Print to save as PDF','success');
  };

  // NEW: Bulk delete
  const toggleSelectMode=()=>{setSelectMode(s=>!s);setSelectedIds(new Set());};
  const toggleSelect=id=>{setSelectedIds(prev=>{const next=new Set(prev);if(next.has(id))next.delete(id);else next.add(id);return next;});};
  const selectAll=()=>setSelectedIds(new Set(getSortedFiltered().map(c=>c.id)));
  const bulkDelete=async()=>{
    if(!selectedIds.size)return;
    if(!window.confirm(`Delete ${selectedIds.size} selected certificates?`))return;
    for(const id of selectedIds){const cert=certs.find(c=>c.id===id);if(cert?.driveFileId&&driveToken&&isDriveTokenValid()){try{await driveDeleteFile(driveToken,cert.driveFileId);}catch{}}}
    await saveCerts(certs.filter(c=>!selectedIds.has(c.id)));
    setSelectedIds(new Set());setSelectMode(false);
    notify(`${selectedIds.size} certificates deleted`,'success');
  };

  const getCertsByTier=tier=>certs.filter(c=>{if(!c.expiryDate||c.expiryDate==='unlimited')return false;return tier.test(Math.floor((new Date(c.expiryDate)-new Date())/86400000));});

  // NEW: Sort + filter computation
  const getSortedFiltered=()=>{
    let result=catFilter==='All'?[...certs]:certs.filter(c=>c.category===catFilter);
    if(searchQuery.trim()){
      const q=searchQuery.toLowerCase();
      result=result.filter(c=>c.name?.toLowerCase().includes(q)||c.certNo?.toLowerCase().includes(q)||c.notes?.toLowerCase().includes(q)||c.category?.toLowerCase().includes(q));
    }
    result.sort((a,b)=>{
      if(sortBy==='name')return sortDir==='asc'?a.name.localeCompare(b.name):b.name.localeCompare(a.name);
      if(sortBy==='category')return sortDir==='asc'?a.category.localeCompare(b.category):b.category.localeCompare(a.category);
      if(sortBy==='added')return sortDir==='asc'?parseInt(a.id)-parseInt(b.id):parseInt(b.id)-parseInt(a.id);
      // Default: sort by expiry
      const da=a.expiryDate==='unlimited'?99999:a.expiryDate?Math.floor((new Date(a.expiryDate)-new Date())/86400000):-9999;
      const db2=b.expiryDate==='unlimited'?99999:b.expiryDate?Math.floor((new Date(b.expiryDate)-new Date())/86400000):-9999;
      return sortDir==='asc'?da-db2:db2-da;
    });
    return result;
  };

  // NEW: Statistics
  const getStats=()=>{
    const total=certs.length;
    const byCat={};
    KNOWN_CATEGORIES.forEach(c=>{byCat[c]=0;});
    let valid=0,expiringSoon=0,dueSoon=0,expired=0,unlimited=0;
    certs.forEach(c=>{
      byCat[c.category]=(byCat[c.category]||0)+1;
      const s=STATUS(c.expiryDate);
      if(s.label==='VALID')valid++;
      else if(s.label==='EXPIRING SOON')expiringSoon++;
      else if(s.label==='DUE SOON')dueSoon++;
      else if(s.label==='EXPIRED')expired++;
      else if(s.label==='UNLIMITED')unlimited++;
    });
    const nextExpiry=certs.filter(c=>c.expiryDate&&c.expiryDate!=='unlimited').map(c=>({name:c.name,days:Math.floor((new Date(c.expiryDate)-new Date())/86400000)})).filter(c=>c.days>=0).sort((a,b)=>a.days-b.days)[0];
    return{total,byCat,valid,expiringSoon,dueSoon,expired,unlimited,nextExpiry};
  };

  const filtered=getSortedFiltered();
  const expiring=certs.filter(c=>{if(!c.expiryDate||c.expiryDate==='unlimited')return false;const s=STATUS(c.expiryDate);return s.days!==undefined&&s.days<90;});

  // ── Form renderers ────────────────────────────────────────────────────────
  const renderFormFields=(data,setData,isCN,setIsCN,isCC,setIsCC,isUnlim,setIsUnlim,aiFields={})=>{
    const badge=f=>aiFields[f]?<span style={{marginLeft:5,fontSize:'0.58rem',background:'rgba(0,180,216,0.2)',color:'var(--cyan)',borderRadius:10,padding:'1px 5px',fontWeight:700}}>Auto</span>:null;
    return(
      <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:10}}>
        <div className="ff" style={{gridColumn:'1/-1',margin:0}}>
          <label className="fl">Name * {badge('name')}</label>
          <select className="fi" value={isCN?'__custom__':(CERT_TEMPLATES.find(t=>t.name===data.name)?data.name:data.name?'__custom__':'')}
            onChange={e=>{if(e.target.value==='__custom__'){setIsCN(true);setData(n=>({...n,name:''}))}else{const t=CERT_TEMPLATES.find(c=>c.name===e.target.value);setIsCN(false);setData(n=>({...n,name:e.target.value,category:t?.category||n.category}))}}}>
            <option value="">— Select certificate —</option>
            {CERT_TEMPLATES.map(c=><option key={c.name} value={c.name}>{c.name}</option>)}
            <option value="__custom__">✏️ Custom name…</option>
          </select>
          {isCN&&<input className="fi" style={{marginTop:6}} placeholder="Type custom name…" value={data.name} onChange={e=>setData(n=>({...n,name:e.target.value}))}/>}
        </div>
        <div className="ff" style={{margin:0}}><label className="fl">Cert No. {badge('certNo')}</label><input className="fi" placeholder="e.g. INE-12345" value={data.certNo} onChange={e=>setData(n=>({...n,certNo:e.target.value}))}/></div>
        <div className="ff" style={{margin:0}}>
          <label className="fl">Category {badge('category')}</label>
          {!isCC
            ?<select className="fi" value={data.category} onChange={e=>{if(e.target.value==='__cc__'){setIsCC(true);setData(n=>({...n,category:''}))}else setData(n=>({...n,category:e.target.value}))}}>
               {KNOWN_CATEGORIES.map(c=><option key={c}>{c}</option>)}
               <option value="__cc__">✏️ Custom…</option>
             </select>
            :<div style={{display:'flex',gap:6}}><input className="fi" placeholder="Custom category…" value={data.category} onChange={e=>setData(n=>({...n,category:e.target.value}))}/><button style={{background:'none',border:'1px solid var(--border)',borderRadius:6,color:'var(--text3)',cursor:'pointer',padding:'0 8px'}} onClick={()=>{setIsCC(false);setData(n=>({...n,category:'Others'}))}}>✕</button></div>
          }
        </div>
        <div className="ff" style={{margin:0}}><label className="fl">Issue Date {badge('issueDate')}</label><input className="fi" type="date" value={data.issueDate} onChange={e=>setData(n=>({...n,issueDate:e.target.value}))}/></div>
        <div className="ff" style={{gridColumn:'1/-1',margin:0}}>
          <label className="fl">Expiry Date * {badge('expiryDate')}</label>
          <label style={{display:'flex',alignItems:'center',gap:6,cursor:'pointer',fontSize:'0.75rem',color:'var(--cyan)',marginBottom:6}}><input type="checkbox" checked={isUnlim} onChange={e=>setIsUnlim(e.target.checked)} style={{accentColor:'var(--cyan)'}}/>∞ No Expiry / Unlimited</label>
          {!isUnlim&&<input className="fi" type="date" value={data.expiryDate} onChange={e=>setData(n=>({...n,expiryDate:e.target.value}))}/>}
        </div>
        <div className="ff" style={{gridColumn:'1/-1',margin:0}}>
          <label className="fl">Notes {badge('notes')}</label>
          {/* NEW: textarea for expanded notes */}
          <textarea className="fi" placeholder="Issuing authority, endorsements, flag state…" value={data.notes} onChange={e=>setData(n=>({...n,notes:e.target.value}))} style={{minHeight:60,resize:'vertical',fontFamily:'inherit',fontSize:'inherit'}}/>
        </div>
      </div>
    );
  };

  const renderExtractionFields=()=>{
    if(!extractModal?.reviewData)return null;
    const{reviewData,detected}=extractModal;
    const sf=(f,v)=>setExtractModal(m=>({...m,reviewData:{...m.reviewData,[f]:v}}));
    const badge=f=>detected?.[f]?<span style={{marginLeft:5,fontSize:'0.58rem',background:'rgba(0,180,216,0.22)',color:'var(--cyan)',borderRadius:10,padding:'1px 5px',fontWeight:700}}>Auto</span>:null;
    return(
      <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:8}}>
        <div className="ff" style={{gridColumn:'1/-1',margin:0}}><label className="fl">Certificate Name * {badge('name')}</label><input className="fi" value={reviewData.name||''} placeholder="Certificate name…" onChange={e=>sf('name',e.target.value)}/></div>
        <div className="ff" style={{margin:0}}><label className="fl">Cert No. {badge('certNo')}</label><input className="fi" value={reviewData.certNo||''} placeholder="Cert number…" onChange={e=>sf('certNo',e.target.value)}/></div>
        <div className="ff" style={{margin:0}}><label className="fl">Category {badge('category')}</label><select className="fi" value={reviewData.category||'Others'} onChange={e=>sf('category',e.target.value)}>{KNOWN_CATEGORIES.map(c=><option key={c}>{c}</option>)}</select></div>
        <div className="ff" style={{margin:0}}><label className="fl">Issue Date {badge('issueDate')}</label><input className="fi" type="date" value={reviewData.issueDate||''} onChange={e=>sf('issueDate',e.target.value)}/></div>
        <div className="ff" style={{gridColumn:'1/-1',margin:0}}>
          <label className="fl">Expiry Date * {badge('expiryDate')}</label>
          <label style={{display:'flex',alignItems:'center',gap:6,cursor:'pointer',fontSize:'0.74rem',color:'var(--cyan)',marginBottom:6}}><input type="checkbox" checked={!!reviewData.isUnlimited} onChange={e=>sf('isUnlimited',e.target.checked)} style={{accentColor:'var(--cyan)'}}/>∞ No Expiry / Unlimited</label>
          {!reviewData.isUnlimited&&<input className="fi" type="date" value={reviewData.expiryDate||''} onChange={e=>sf('expiryDate',e.target.value)}/>}
        </div>
        <div className="ff" style={{margin:0}}><label className="fl">Issuing Authority {badge('notes')}</label><input className="fi" value={reviewData.issuingAuthority||''} placeholder="Issuing organization…" onChange={e=>sf('issuingAuthority',e.target.value)}/></div>
        <div className="ff" style={{margin:0}}><label className="fl">Notes</label><textarea className="fi" value={reviewData.notes||''} placeholder="Additional notes…" onChange={e=>sf('notes',e.target.value)} style={{minHeight:50,resize:'vertical',fontFamily:'inherit',fontSize:'inherit'}}/></div>
      </div>
    );
  };

  if(!user)return(<div className="section"><div className="empty"><div className="empty-icon">🔐</div><div className="empty-t">Login Required</div><div className="empty-d">Please log in to track your certificates.</div></div></div>);

  const mBtn=(bg,color,border)=>({fontSize:'0.63rem',padding:'3px 8px',borderRadius:6,cursor:'pointer',background:bg,color,border,fontWeight:600,whiteSpace:'nowrap'});
  const stats=getStats();

  return(
    <div className="section">

      {/* File preview modal */}
      {previewFile&&<PreviewModal file={previewFile} onClose={closePreview}/>}

      {/* Session expired */}
      {driveExpired&&!driveConnected&&(
        <div style={{background:'rgba(255,107,53,0.08)',border:'1px solid rgba(255,107,53,0.35)',borderRadius:10,padding:'0.7rem 1rem',marginBottom:'0.8rem',display:'flex',alignItems:'center',justifyContent:'space-between',gap:10,flexWrap:'wrap'}}>
          <div style={{fontSize:'0.72rem',color:'#ff6b35'}}>⏱ Storage session expired — reconnect to download files</div>
          <button onClick={connectDrive} disabled={connectingDrive} style={{padding:'5px 14px',borderRadius:7,fontSize:'0.7rem',fontWeight:700,cursor:'pointer',background:'rgba(255,107,53,0.15)',color:'#ff6b35',border:'1px solid rgba(255,107,53,0.4)'}}>{connectingDrive?'Connecting…':'🔗 Reconnect'}</button>
        </div>
      )}

      {/* Drive banner */}
      <div style={{background:driveConnected?'rgba(0,200,100,0.06)':'rgba(0,180,216,0.06)',border:`1px solid ${driveConnected?'rgba(0,200,100,0.25)':'rgba(0,180,216,0.25)'}`,borderRadius:12,padding:'0.75rem 1rem',marginBottom:'1rem',display:'flex',alignItems:'center',justifyContent:'space-between',flexWrap:'wrap',gap:10}}>
        <div style={{flex:1,minWidth:0}}>
          <div style={{fontSize:'0.76rem',fontWeight:700,color:driveConnected?'var(--green)':'var(--cyan)',fontFamily:'Orbitron,monospace'}}>{driveConnected?'✅ Cloud Storage Connected':'☁️ Connect Cloud Storage'}</div>
          {driveConnected&&driveEmail&&<div style={{fontSize:'0.65rem',color:'var(--text3)',marginTop:2}}>Connected as <strong style={{color:'var(--cyan)'}}>{driveEmail}</strong></div>}
          <div style={{fontSize:'0.68rem',color:'var(--text3)',marginTop:3,lineHeight:1.5}}>{driveConnected?'Upload certificate photos or PDFs — details filled automatically. Files saved privately in your personal cloud.':'Connect to store certificate copies privately. Upload photos or PDFs and all details are filled in automatically.'}</div>
          {!driveConnected&&<div style={{fontSize:'0.64rem',color:'var(--text3)',marginTop:4,fontStyle:'italic'}}>ℹ️ Scanning works without storage — connect only when you want to save files</div>}
        </div>
        {driveConnected
          ?<div style={{display:'flex',gap:6,flexShrink:0}}>
             <a href="https://drive.google.com/drive/folders" target="_blank" rel="noreferrer" style={{padding:'5px 12px',borderRadius:7,fontSize:'0.7rem',fontWeight:700,background:'rgba(0,200,100,0.12)',color:'var(--green)',border:'1px solid rgba(0,200,100,0.3)',textDecoration:'none'}}>📂 My Files</a>
             <button onClick={disconnectDrive} style={{padding:'5px 12px',borderRadius:7,fontSize:'0.7rem',cursor:'pointer',background:'none',color:'var(--text3)',border:'1px solid rgba(255,255,255,0.1)'}}>Disconnect</button>
           </div>
          :<button onClick={connectDrive} disabled={connectingDrive} style={{padding:'7px 18px',borderRadius:8,fontSize:'0.74rem',fontWeight:700,cursor:'pointer',background:'linear-gradient(135deg,#4285f4,#34a853)',color:'#fff',border:'none',whiteSpace:'nowrap',flexShrink:0,opacity:connectingDrive?0.7:1}}>{connectingDrive?'Connecting…':'🔗 Connect Storage'}</button>
        }
      </div>

      {/* Header */}
      <div className="sec-hdr">
        <div className="sec-title">📜 Certificate Tracker</div>
        <div style={{display:'flex',gap:6,alignItems:'center',flexWrap:'wrap'}}>
          {expiring.length>0&&<span style={{background:'rgba(255,71,87,0.15)',color:'#ff4757',border:'1px solid rgba(255,71,87,0.3)',borderRadius:20,padding:'3px 10px',fontSize:'0.7rem',fontWeight:700}}>⚠️ {expiring.length} expiring</span>}
          <button style={{padding:'5px 10px',fontSize:'0.7rem',background:'rgba(0,180,216,0.1)',color:'var(--cyan)',border:'1px solid rgba(0,180,216,0.3)',borderRadius:7,cursor:'pointer'}} onClick={()=>{setShowExpDash(s=>!s);setActiveTier(null);}}>{showExpDash?'✕ Timeline':'📅 Timeline'}</button>
          <button style={{padding:'5px 10px',fontSize:'0.7rem',background:showStats?'rgba(240,165,0,0.2)':'rgba(255,255,255,0.05)',color:showStats?'var(--gold)':'var(--text2)',border:`1px solid ${showStats?'rgba(240,165,0,0.4)':'rgba(255,255,255,0.1)'}`,borderRadius:7,cursor:'pointer'}} onClick={()=>setShowStats(s=>!s)}>📊 Stats</button>
          <button style={{padding:'5px 10px',fontSize:'0.7rem',background:'rgba(255,255,255,0.05)',color:'var(--text2)',border:'1px solid rgba(255,255,255,0.1)',borderRadius:7,cursor:'pointer'}} onClick={exportCSV}>⬇️ CSV</button>
          <button style={{padding:'5px 10px',fontSize:'0.7rem',background:'rgba(255,255,255,0.05)',color:'var(--text2)',border:'1px solid rgba(255,255,255,0.1)',borderRadius:7,cursor:'pointer'}} onClick={exportPDF}>🖨 PDF</button>
          <button style={{padding:'5px 10px',fontSize:'0.7rem',background:selectMode?'rgba(255,71,87,0.15)':'rgba(255,255,255,0.05)',color:selectMode?'#ff4757':'var(--text2)',border:`1px solid ${selectMode?'rgba(255,71,87,0.3)':'rgba(255,255,255,0.1)'}`,borderRadius:7,cursor:'pointer'}} onClick={toggleSelectMode}>{selectMode?'✕ Cancel':'☑ Select'}</button>
          <button className="btn btn-primary" style={{padding:'6px 14px',fontSize:'0.74rem'}} onClick={()=>setShowAdd(s=>!s)}>{showAdd?'✕ Cancel':'+ Add'}</button>
        </div>
      </div>

      {/* Bulk delete bar */}
      {selectMode&&(
        <div style={{background:'rgba(255,71,87,0.08)',border:'1px solid rgba(255,71,87,0.25)',borderRadius:10,padding:'0.7rem 1rem',marginBottom:'0.8rem',display:'flex',alignItems:'center',justifyContent:'space-between',gap:10,flexWrap:'wrap'}}>
          <div style={{fontSize:'0.74rem',color:'#ff4757'}}>{selectedIds.size} of {filtered.length} selected</div>
          <div style={{display:'flex',gap:6}}>
            <button onClick={selectAll} style={{padding:'4px 10px',borderRadius:6,fontSize:'0.7rem',cursor:'pointer',background:'rgba(0,180,216,0.1)',color:'var(--cyan)',border:'1px solid rgba(0,180,216,0.3)'}}>Select All</button>
            <button onClick={bulkDelete} disabled={!selectedIds.size} style={{padding:'4px 10px',borderRadius:6,fontSize:'0.7rem',cursor:'pointer',background:'rgba(255,71,87,0.15)',color:'#ff4757',border:'1px solid rgba(255,71,87,0.3)',opacity:selectedIds.size?1:0.5}}>🗑 Delete ({selectedIds.size})</button>
          </div>
        </div>
      )}

      {/* NEW: Statistics Panel */}
      {showStats&&(
        <div style={{background:'var(--card)',border:'1px solid rgba(240,165,0,0.2)',borderRadius:14,padding:'1.2rem',marginBottom:'1.2rem'}}>
          <div style={{fontFamily:'Orbitron,monospace',fontSize:'0.78rem',color:'var(--gold)',marginBottom:'1rem'}}>📊 CERTIFICATE STATISTICS</div>
          <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(100px,1fr))',gap:8,marginBottom:'1rem'}}>
            {[{l:'Total',v:stats.total,c:'var(--cyan)'},{l:'Valid',v:stats.valid,c:'var(--green)'},{l:'Due Soon',v:stats.dueSoon,c:'var(--gold)'},{l:'Exp. Soon',v:stats.expiringSoon,c:'#ff6b35'},{l:'Expired',v:stats.expired,c:'#ff4757'},{l:'Unlimited',v:stats.unlimited,c:'#00b4d8'}].map((s,i)=>(
              <div key={i} style={{background:`${s.c}11`,border:`1px solid ${s.c}33`,borderRadius:10,padding:'0.7rem 0.5rem',textAlign:'center'}}>
                <div style={{fontSize:'1.4rem',fontWeight:900,color:s.v>0?s.c:'var(--text3)'}}>{s.v}</div>
                <div style={{fontSize:'0.62rem',color:'var(--text3)',marginTop:2}}>{s.l}</div>
              </div>
            ))}
          </div>
          <div style={{borderTop:'1px solid rgba(255,255,255,0.08)',paddingTop:'0.8rem'}}>
            <div style={{fontSize:'0.7rem',color:'var(--text3)',marginBottom:8}}>By Category</div>
            <div style={{display:'flex',flexWrap:'wrap',gap:6}}>
              {KNOWN_CATEGORIES.filter(c=>stats.byCat[c]>0).map(c=>(
                <span key={c} style={{fontSize:'0.65rem',padding:'2px 8px',borderRadius:10,background:'rgba(255,255,255,0.06)',color:'var(--text2)',border:'1px solid rgba(255,255,255,0.1)'}}>{c}: <strong style={{color:'var(--cyan)'}}>{stats.byCat[c]}</strong></span>
              ))}
            </div>
            {stats.nextExpiry&&<div style={{marginTop:8,fontSize:'0.7rem',color:'var(--text3)'}}>⏰ Next expiry: <strong style={{color:'#ff6b35'}}>{stats.nextExpiry.name}</strong> in <strong style={{color:'#ff6b35'}}>{stats.nextExpiry.days}d</strong></div>}
          </div>
        </div>
      )}

      {/* Expiry alerts */}
      {expiring.length>0&&(
        <div style={{background:'rgba(255,71,87,0.08)',border:'1px solid rgba(255,71,87,0.25)',borderRadius:10,padding:'0.8rem 1rem',marginBottom:'1rem'}}>
          <div style={{fontFamily:'Orbitron,monospace',fontSize:'0.72rem',color:'#ff4757',marginBottom:'0.4rem'}}>⚠️ ACTION REQUIRED</div>
          {expiring.map((c,i)=>{const s=STATUS(c.expiryDate);return(<div key={i} style={{fontSize:'0.74rem',color:'var(--text2)',padding:'3px 0'}}><span style={{color:s.color,fontWeight:700}}>{s.label}</span> — {c.name}{s.days>=0?` (${s.days} days left)`:' (renewal overdue)'}</div>);})}
        </div>
      )}

      {/* Timeline */}
      {showExpDash&&(
        <div style={{background:'var(--card)',border:'1px solid rgba(0,180,216,0.2)',borderRadius:14,padding:'1.2rem',marginBottom:'1.2rem'}}>
          <div style={{fontFamily:'Orbitron,monospace',fontSize:'0.78rem',color:'var(--cyan)',marginBottom:'1rem'}}>📅 CERTIFICATE EXPIRY TIMELINE</div>
          <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(110px,1fr))',gap:8,marginBottom:'1rem'}}>
            {EXPIRY_TIERS.map(tier=>{const count=getCertsByTier(tier).length,isA=activeTier===tier.key;return(
              <div key={tier.key} onClick={()=>setActiveTier(isA?null:tier.key)} style={{background:isA?`${tier.color}22`:`${tier.color}0d`,border:`1px solid ${isA?tier.color:tier.color+'44'}`,borderRadius:10,padding:'0.75rem 0.5rem',cursor:'pointer',textAlign:'center',transition:'all 0.2s'}}>
                <div style={{fontSize:'1.5rem',fontWeight:900,color:count>0?tier.color:'var(--text3)'}}>{count}</div>
                <div style={{fontSize:'0.62rem',color:'var(--text3)',marginTop:2,lineHeight:1.3}}>{tier.label}</div>
              </div>
            );})}
          </div>
          {activeTier&&(()=>{const tier=EXPIRY_TIERS.find(t=>t.key===activeTier),tc=getCertsByTier(tier);return(
            <div style={{borderTop:`1px solid ${tier.color}33`,paddingTop:'0.8rem'}}>
              <div style={{fontSize:'0.72rem',color:tier.color,fontWeight:700,fontFamily:'Orbitron,monospace',marginBottom:'0.6rem'}}>{tier.label} — {tc.length} cert{tc.length!==1?'s':''}</div>
              {tc.length===0?<div style={{fontSize:'0.74rem',color:'var(--text3)',textAlign:'center',padding:'0.8rem'}}>✅ None in this range</div>
                :<div style={{display:'grid',gap:6}}>{tc.map(c=>{const days=Math.floor((new Date(c.expiryDate)-new Date())/86400000);return(
                  <div key={c.id} style={{display:'flex',justifyContent:'space-between',alignItems:'center',background:'rgba(255,255,255,0.03)',border:`1px solid ${tier.color}22`,borderRadius:8,padding:'0.5rem 0.8rem'}}>
                    <div><div style={{fontSize:'0.78rem',fontWeight:700,color:'var(--text)'}}>{c.name}</div><div style={{fontSize:'0.65rem',color:'var(--text3)'}}>{c.category}</div></div>
                    <div style={{textAlign:'right'}}><div style={{fontSize:'0.72rem',color:tier.color,fontWeight:700}}>{days<0?'EXPIRED':`${days}d left`}</div><div style={{fontSize:'0.65rem',color:'var(--text3)'}}>{c.expiryDate}</div></div>
                  </div>
                );})}</div>
              }
            </div>
          );})()}
          {EXPIRY_TIERS.every(t=>getCertsByTier(t).length===0)&&<div style={{textAlign:'center',fontSize:'0.74rem',color:'var(--green)',padding:'0.4rem'}}>✅ All certificates valid for 12+ months</div>}
        </div>
      )}

      {/* Add form */}
      {showAdd&&(
        <div style={{background:'var(--card)',border:'1px solid rgba(0,180,216,0.3)',borderRadius:14,padding:'1.3rem',marginBottom:'1.2rem'}}>
          <div style={{fontFamily:'Orbitron,monospace',fontSize:'0.78rem',color:'var(--cyan)',marginBottom:'0.8rem'}}>+ Add New Certificate / Document</div>
          <div style={{background:'rgba(0,180,216,0.05)',border:'1px dashed rgba(0,180,216,0.35)',borderRadius:10,padding:'0.9rem',marginBottom:'1rem'}}>
            <div style={{fontSize:'0.76rem',color:'var(--cyan)',fontWeight:700,marginBottom:3}}>✦ Smart Auto-Fill</div>
            <div style={{fontSize:'0.68rem',color:'var(--text3)',marginBottom:10,lineHeight:1.5}}>Upload a clear photo of your certificate — we'll try to detect dates and certificate number. Please select the certificate name and category, and verify all details.</div>
            <div style={{display:'flex',alignItems:'center',gap:8,flexWrap:'wrap'}}>
              <input id="add-scan-input" type="file" accept=".pdf,.jpg,.jpeg,.png" style={{display:'none'}} onChange={e=>{if(e.target.files?.[0])handleAddFormScan(e.target.files[0]);e.target.value='';}}/>
              <label htmlFor="add-scan-input" style={{display:'inline-flex',alignItems:'center',gap:6,padding:'7px 14px',borderRadius:8,cursor:scanningAdd?'default':'pointer',fontSize:'0.72rem',fontWeight:700,background:'rgba(0,180,216,0.15)',color:'var(--cyan)',border:'1px solid rgba(0,180,216,0.45)',pointerEvents:scanningAdd?'none':'auto',opacity:scanningAdd?0.7:1}}>
                {scanningAdd?'⏳ Reading…':'📷 Scan Certificate'}
              </label>
              {/* NEW: Upload file only button in add form */}
              {driveConnected&&addScanFile&&(
                <span style={{fontSize:'0.68rem',color:'var(--text3)'}}>File ready to upload with certificate</span>
              )}
              {addScanErrMsg==='QUOTA_EXCEEDED'&&!scanningAdd&&(
                <div style={{width:'100%',background:'rgba(255,165,0,0.08)',border:'1px solid rgba(255,165,0,0.3)',borderRadius:8,padding:'8px 10px',marginTop:6}}>
                  <div style={{fontSize:'0.7rem',color:'#ffa502',marginBottom:6}}>⚠️ Scanning limit reached — you can still upload the file manually and fill details below</div>
                  <button onClick={retryAddScan} style={{padding:'4px 10px',borderRadius:6,fontSize:'0.68rem',cursor:'pointer',background:'rgba(0,180,216,0.1)',color:'var(--cyan)',border:'1px solid rgba(0,180,216,0.3)'}}>↺ Try Again Later</button>
                </div>
              )}
              {addScanErrMsg&&addScanErrMsg!=='QUOTA_EXCEEDED'&&!scanningAdd&&addScanFile&&<button onClick={retryAddScan} style={{padding:'5px 10px',borderRadius:7,fontSize:'0.7rem',fontWeight:700,cursor:'pointer',background:'rgba(0,180,216,0.1)',color:'var(--cyan)',border:'1px solid rgba(0,180,216,0.35)'}}>↺ Try Again</button>}
              {addScanFile&&!scanningAdd&&!addScanErrMsg&&(
                <span style={{fontSize:'0.68rem',color:'var(--green)',display:'flex',alignItems:'center',gap:6}}>
                  ✅ {addScanFile.name}
                  {Object.keys(addAiFields).length>0&&<span style={{background:'rgba(0,180,216,0.15)',color:'var(--cyan)',borderRadius:10,padding:'1px 7px',fontSize:'0.6rem',fontWeight:700}}>{Object.keys(addAiFields).length} fields filled</span>}
                  <button onClick={()=>{setAddScanFile(null);setAddAiFields({});setAddScanErrMsg('');setNewCert({...EMPTY_CERT});}} style={{background:'none',border:'none',color:'var(--text3)',cursor:'pointer'}}>✕</button>
                </span>
              )}
              {addScanErrMsg&&addScanErrMsg!=='QUOTA_EXCEEDED'&&!scanningAdd&&<span style={{fontSize:'0.68rem',color:'#ff6b35'}}>{addScanErrMsg}</span>}
              {!addScanFile&&!addScanErrMsg&&<span style={{fontSize:'0.65rem',color:'var(--text3)'}}>or fill in manually below</span>}
            </div>
          </div>
          {renderFormFields(newCert,setNewCert,customName,setCustomName,customCategory,setCustomCategory,unlimitedExpiry,setUnlimitedExpiry,addAiFields)}
          {addScanFile&&!driveConnected&&<div style={{fontSize:'0.68rem',color:'var(--text3)',marginTop:8,background:'rgba(255,255,255,0.03)',borderRadius:8,padding:'6px 10px',border:'1px solid rgba(255,255,255,0.08)'}}>ℹ️ Certificate details will be saved. Connect storage above to also save the file.</div>}
          <button className="btn btn-primary" style={{marginTop:10}} onClick={addCert} disabled={saving}>{saving?'Saving…':'✅ Add Certificate'}</button>
        </div>
      )}

      {/* NEW: Search + Sort bar */}
      <div style={{display:'flex',gap:8,marginBottom:'0.8rem',flexWrap:'wrap',alignItems:'center'}}>
        <input
          placeholder="🔍 Search certificates…"
          value={searchQuery}
          onChange={e=>setSearchQuery(e.target.value)}
          style={{flex:1,minWidth:140,padding:'6px 12px',borderRadius:8,background:'var(--card)',border:'1px solid rgba(255,255,255,0.1)',color:'var(--text)',fontSize:'0.76rem',outline:'none'}}
        />
        <select value={sortBy} onChange={e=>setSortBy(e.target.value)}
          style={{padding:'6px 10px',borderRadius:8,background:'var(--card)',border:'1px solid rgba(255,255,255,0.1)',color:'var(--text)',fontSize:'0.72rem',cursor:'pointer'}}>
          <option value="expiry">Sort: Expiry</option>
          <option value="name">Sort: Name</option>
          <option value="category">Sort: Category</option>
          <option value="added">Sort: Date Added</option>
        </select>
        <button onClick={()=>setSortDir(d=>d==='asc'?'desc':'asc')}
          style={{padding:'6px 10px',borderRadius:8,background:'var(--card)',border:'1px solid rgba(255,255,255,0.1)',color:'var(--text2)',cursor:'pointer',fontSize:'0.8rem'}}>
          {sortDir==='asc'?'↑':'↓'}
        </button>
      </div>

      {/* Category filter */}
      <div className="fbar" style={{marginBottom:'1rem'}}>
        {CATEGORIES.map(c=><button key={c} className={`fbtn ${catFilter===c?'active':''}`} onClick={()=>setCatFilter(c)}>{c}</button>)}
      </div>

      {loading&&<div className="loading"><div className="spin"/><span>Loading certificates…</span></div>}
      {!loading&&filtered.length===0&&<div className="empty"><div className="empty-icon">📜</div><div className="empty-t">{searchQuery?'No certificates match your search':'No Certificates Added Yet'}</div><div className="empty-d">{searchQuery?'Try a different search term':'Click "+ Add" to start tracking your STCW certificates.'}</div></div>}

      {/* Certificate cards */}
      {filtered.length>0&&(
        <div style={{display:'grid',gap:'0.7rem'}}>
          {filtered.map(c=>{
            const s=STATUS(c.expiryDate),isEd=editId===c.id,isQU=quickId===c.id,isUp=uploadingId===c.id,hasDr=!!c.driveFileId,isEx=extractModal?.certId===c.id,isSel=selectedIds.has(c.id);
            return(
            <div key={c.id} style={{background:'var(--card)',border:`1px solid ${selectMode&&isSel?'var(--cyan)':s.color+'33'}`,borderRadius:12,padding:'1rem',display:'flex',flexDirection:'column',gap:0,opacity:selectMode&&!isSel?0.7:1}}>
              <div style={{display:'flex',gap:10,alignItems:'flex-start'}}>
                {/* Select checkbox */}
                {selectMode&&(
                  <input type="checkbox" checked={isSel} onChange={()=>toggleSelect(c.id)}
                    style={{accentColor:'var(--cyan)',width:16,height:16,marginTop:3,flexShrink:0,cursor:'pointer'}}/>
                )}
                <div style={{width:8,borderRadius:4,alignSelf:'stretch',background:s.color,flexShrink:0}}/>
                <div style={{flex:1,minWidth:0}}>
                  {/* Title + status */}
                  <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',flexWrap:'wrap',gap:6}}>
                    <div style={{fontWeight:700,fontSize:'0.86rem',color:'var(--text)'}}>{c.name}</div>
                    <span style={{padding:'2px 10px',borderRadius:20,fontSize:'0.62rem',fontWeight:700,background:s.bg,color:s.color,border:`1px solid ${s.color}44`,flexShrink:0}}>{s.label}{s.days>=0?` · ${s.days}d left`:''}</span>
                  </div>
                  {/* Meta */}
                  <div style={{display:'flex',gap:14,marginTop:4,flexWrap:'wrap'}}>
                    {c.certNo&&<span style={{fontSize:'0.72rem',color:'var(--text3)'}}>No: <strong style={{color:'var(--cyan)'}}>{c.certNo}</strong></span>}
                    {c.issueDate&&<span style={{fontSize:'0.72rem',color:'var(--text3)'}}>Issued: {c.issueDate}</span>}
                    {c.expiryDate&&c.expiryDate!=='unlimited'&&<span style={{fontSize:'0.72rem',color:'var(--text3)'}}>Expires: <strong style={{color:s.color}}>{c.expiryDate}</strong></span>}
                    {c.expiryDate==='unlimited'&&<span style={{fontSize:'0.72rem',color:'#00b4d8'}}>∞ Unlimited</span>}
                    <span style={{fontSize:'0.62rem',color:'var(--text3)',background:'rgba(255,255,255,0.05)',padding:'1px 7px',borderRadius:10}}>{c.category}</span>
                  </div>
                  {c.notes&&<div style={{fontSize:'0.72rem',color:'var(--text3)',marginTop:4,whiteSpace:'pre-wrap'}}>📝 {c.notes}</div>}

                  {/* NEW: Renewal history */}
                  {c.renewalHistory?.length>0&&(
                    <div style={{marginTop:6}}>
                      <button onClick={()=>setShowHistory(showHistory===c.id?null:c.id)}
                        style={{...mBtn('rgba(0,180,216,0.06)','var(--text3)','1px solid rgba(255,255,255,0.08)'),fontSize:'0.62rem'}}>
                        📋 History ({c.renewalHistory.length})
                      </button>
                      {showHistory===c.id&&(
                        <div style={{marginTop:8,background:'rgba(255,255,255,0.03)',borderRadius:8,padding:'8px 10px',border:'1px solid rgba(255,255,255,0.08)'}}>
                          <div style={{fontSize:'0.65rem',color:'var(--text3)',fontFamily:'Orbitron,monospace',marginBottom:6}}>RENEWAL HISTORY</div>
                          {[...c.renewalHistory].reverse().map((h,i)=>(
                            <div key={i} style={{fontSize:'0.68rem',color:'var(--text2)',padding:'3px 0',borderBottom:i<c.renewalHistory.length-1?'1px solid rgba(255,255,255,0.05)':'none'}}>
                              <span style={{color:'var(--text3)'}}>{h.date}</span>
                              {h.certNo&&<> — No: <strong style={{color:'var(--cyan)'}}>{h.certNo}</strong></>}
                              {h.expiryDate&&<> → <strong style={{color:'var(--green)'}}>{h.expiryDate==='unlimited'?'Unlimited':h.expiryDate}</strong></>}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}

                  {/* File section */}
                  <div style={{marginTop:8,display:'flex',alignItems:'center',gap:6,flexWrap:'wrap'}}>
                    {hasDr?(
                      <>
                        <span style={{fontSize:'0.66rem',color:'var(--green)',background:'rgba(0,200,100,0.08)',border:'1px solid rgba(0,200,100,0.25)',borderRadius:20,padding:'2px 8px',maxWidth:190,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>☁️ {c.driveFileName||'File saved'}</span>
                        {/* NEW: Preview button */}
                        <button onClick={()=>previewDriveFile(c.driveFileId,c.driveFileName)} disabled={previewLoading} style={mBtn('rgba(100,100,200,0.1)','#a29bfe','1px solid rgba(100,100,200,0.3)')}>{previewLoading?'…':'👁 Preview'}</button>
                        <button onClick={()=>viewDriveFile(c.driveFileId)} style={mBtn('rgba(0,180,216,0.1)','var(--cyan)','1px solid rgba(0,180,216,0.3)')}>📄 View</button>
                        <button onClick={()=>downloadDriveFile(c.driveFileId,c.driveFileName)} style={mBtn('rgba(100,200,100,0.1)','var(--green)','1px solid rgba(100,200,100,0.3)')}>⬇️ Download</button>
                        {/* Update file — scan + upload */}
                        <><input id={`upd-${c.id}`} type="file" accept=".pdf,.jpg,.jpeg,.png" style={{display:'none'}} onChange={e=>{if(e.target.files?.[0])handleFileUpload(c.id,e.target.files[0],true);e.target.value='';}}/>
                        <label htmlFor={`upd-${c.id}`} style={{...mBtn('rgba(240,165,0,0.1)','var(--gold)','1px solid rgba(240,165,0,0.35)'),cursor:'pointer',display:'inline-flex',alignItems:'center'}}>📁 Update</label></>
                        <button onClick={()=>removeDriveFile(c.id)} style={mBtn('none','var(--text3)','1px solid rgba(255,255,255,0.1)')}>✕ Remove</button>
                      </>
                    ):driveConnected?(
                      <>
                        {/* Scan + upload */}
                        <input id={`drv-${c.id}`} type="file" accept=".pdf,.jpg,.jpeg,.png" style={{display:'none'}} onChange={e=>{if(e.target.files?.[0])handleFileUpload(c.id,e.target.files[0],false);e.target.value='';}}/>
                        <label htmlFor={`drv-${c.id}`} style={{fontSize:'0.65rem',padding:'3px 10px',borderRadius:6,cursor:isUp?'default':'pointer',background:'rgba(0,180,216,0.07)',color:'var(--cyan)',border:'1px dashed rgba(0,180,216,0.4)',display:'inline-flex',alignItems:'center',gap:5,pointerEvents:isUp?'none':'auto',opacity:isUp?0.6:1}}>
                          {isUp?'⏳ Uploading…':'📎 Upload & Scan'}
                        </label>
                        {/* NEW: Upload file only (no scan) */}
                        <><input id={`ufo-${c.id}`} type="file" accept=".pdf,.jpg,.jpeg,.png" style={{display:'none'}} onChange={e=>{if(e.target.files?.[0])uploadFileOnly(c.id,e.target.files[0]);e.target.value='';}}/>
                        <label htmlFor={`ufo-${c.id}`} style={{...mBtn('rgba(100,200,100,0.08)','var(--green)','1px dashed rgba(100,200,100,0.35)'),cursor:'pointer',display:'inline-flex',alignItems:'center'}}>
                          ☁️ Upload Only
                        </label></>
                      </>
                    ):driveExpired?(
                      <button onClick={connectDrive} style={{fontSize:'0.64rem',padding:'3px 10px',borderRadius:6,cursor:'pointer',background:'rgba(255,107,53,0.08)',color:'#ff6b35',border:'1px solid rgba(255,107,53,0.3)'}}>🔗 Reconnect to upload</button>
                    ):(
                      <span style={{fontSize:'0.64rem',color:'var(--text3)',fontStyle:'italic'}}>Connect storage above to save certificate file</span>
                    )}
                  </div>
                </div>

                {/* Action buttons */}
                {!selectMode&&(
                  <div style={{display:'flex',flexDirection:'column',gap:4,flexShrink:0}}>
                    <button onClick={()=>isQU?setQuickId(null):startQuick(c)} style={{background:isQU?'rgba(0,200,100,0.15)':'rgba(0,180,216,0.08)',border:`1px solid ${isQU?'rgba(0,200,100,0.4)':'rgba(0,180,216,0.3)'}`,color:isQU?'var(--green)':'var(--cyan)',borderRadius:6,cursor:'pointer',fontSize:'0.63rem',padding:'4px 7px',fontWeight:700,whiteSpace:'nowrap'}}>🔄 Renew</button>
                    <button onClick={()=>isEd?cancelEdit():startEdit(c)} style={{background:isEd?'rgba(240,165,0,0.15)':'rgba(255,255,255,0.05)',border:`1px solid ${isEd?'rgba(240,165,0,0.5)':'rgba(255,255,255,0.1)'}`,color:isEd?'var(--gold)':'var(--text2)',borderRadius:6,cursor:'pointer',fontSize:'0.63rem',padding:'4px 7px',fontWeight:700}}>✏️ Edit</button>
                    {/* NEW: Copy details */}
                    <button onClick={()=>copyCertDetails(c)} style={{background:'none',border:'1px solid rgba(255,255,255,0.1)',color:'var(--text3)',borderRadius:6,cursor:'pointer',fontSize:'0.63rem',padding:'4px 7px'}}>📋 Copy</button>
                    {/* NEW: Duplicate */}
                    <button onClick={()=>duplicateCert(c)} style={{background:'none',border:'1px solid rgba(0,180,216,0.2)',color:'var(--cyan)',borderRadius:6,cursor:'pointer',fontSize:'0.63rem',padding:'4px 7px'}}>⧉ Dupe</button>
                    <button onClick={()=>deleteCert(c.id)} style={{background:'none',border:'1px solid rgba(255,71,87,0.25)',color:'#ff4757',borderRadius:6,cursor:'pointer',fontSize:'0.63rem',padding:'4px 7px'}}>🗑</button>
                  </div>
                )}
              </div>

              {/* Scan/Extraction panel */}
              {isEx&&(
                <div style={{borderTop:'1px solid rgba(0,180,216,0.25)',marginTop:12,paddingTop:12}}>
                  <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:10,flexWrap:'wrap',gap:6}}>
                    <div style={{fontFamily:'Orbitron,monospace',fontSize:'0.7rem',color:'var(--cyan)'}}>{extracting?'🔍 READING CERTIFICATE…':'✦ SCANNED DATA — Review & Edit'}</div>
                    {!extracting&&extractModal?.detected&&Object.keys(extractModal.detected).length>0&&<span style={{fontSize:'0.62rem',color:'var(--green)',background:'rgba(0,200,100,0.1)',borderRadius:10,padding:'2px 8px',fontWeight:700}}>✦ {Object.keys(extractModal.detected).length} fields filled</span>}
                  </div>
                  {extracting?<div style={{display:'flex',alignItems:'center',gap:10,padding:'1.5rem',justifyContent:'center'}}><div className="spin"/><span style={{fontSize:'0.75rem',color:'var(--text3)'}}>Analysing certificate…</span></div>
                  :<>
                    {/* NEW: Quota fallback message */}
                    {extractModal?.quotaError&&(
                      <div style={{background:'rgba(255,165,0,0.08)',border:'1px solid rgba(255,165,0,0.3)',borderRadius:8,padding:'10px',marginBottom:12}}>
                        <div style={{fontSize:'0.72rem',color:'#ffa502',fontWeight:700,marginBottom:4}}>⚠️ Scanning limit reached</div>
                        <div style={{fontSize:'0.68rem',color:'var(--text3)',marginBottom:8}}>Auto-fill is temporarily unavailable. You can still fill in the details below and upload the file to your storage.</div>
                        <button onClick={retryExtraction} style={{padding:'4px 10px',borderRadius:6,fontSize:'0.68rem',cursor:'pointer',background:'rgba(0,180,216,0.1)',color:'var(--cyan)',border:'1px solid rgba(0,180,216,0.3)'}}>↺ Try Scan Again</button>
                      </div>
                    )}
                    {extractModal?.extractError&&!extractModal?.quotaError&&(
                      <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',flexWrap:'wrap',gap:8,marginBottom:12,background:'rgba(255,107,53,0.08)',borderRadius:8,padding:'8px 10px',border:'1px solid rgba(255,107,53,0.25)'}}>
                        <span style={{fontSize:'0.7rem',color:'#ff6b35'}}>{extractErrMsg||'Could not read this file — please fill in details below'}</span>
                        <button onClick={retryExtraction} style={{padding:'4px 10px',borderRadius:6,fontSize:'0.7rem',fontWeight:700,cursor:'pointer',background:'rgba(255,107,53,0.15)',color:'#ff6b35',border:'1px solid rgba(255,107,53,0.4)',whiteSpace:'nowrap'}}>↺ Try Again</button>
                      </div>
                    )}
                    {extractModal?.isRenewal&&<div style={{fontSize:'0.7rem',color:'var(--gold)',marginBottom:10,background:'rgba(240,165,0,0.08)',borderRadius:8,padding:'6px 10px',border:'1px solid rgba(240,165,0,0.25)'}}>📁 Updating — existing file will be replaced in your storage</div>}
                    {!driveConnected&&!driveExpired&&<div style={{fontSize:'0.68rem',color:'var(--text3)',marginBottom:10,background:'rgba(255,255,255,0.03)',borderRadius:8,padding:'6px 10px'}}>ℹ️ Details will be saved. Connect storage above to also save the file.</div>}
                    {renderExtractionFields()}
                    <div style={{display:'flex',gap:6,marginTop:12,flexWrap:'wrap'}}>
                      <button className="btn btn-primary" style={{fontSize:'0.72rem',padding:'6px 14px'}} onClick={confirmExtraction} disabled={saving||isUp}>{isUp?'⏳ Saving…':driveConnected?'✅ Confirm & Save to Storage':'✅ Confirm & Save Details'}</button>
                      <button style={{background:'none',border:'1px solid var(--border)',borderRadius:7,color:'var(--text3)',cursor:'pointer',fontSize:'0.72rem',padding:'5px 10px'}} onClick={()=>{setExtractModal(null);setExtractErrMsg('');}}>Cancel</button>
                    </div>
                  </>}
                </div>
              )}

              {/* Quick renew */}
              {isQU&&(
                <div style={{borderTop:'1px solid rgba(0,200,100,0.2)',marginTop:10,paddingTop:10}}>
                  <div style={{fontFamily:'Orbitron,monospace',fontSize:'0.68rem',color:'var(--green)',marginBottom:8}}>🔄 QUICK RENEWAL</div>
                  <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:8}}>
                    <div className="ff" style={{margin:0}}><label className="fl">New Cert No.</label><input className="fi" placeholder="Updated number…" value={quickData.certNo} onChange={e=>setQuickData(d=>({...d,certNo:e.target.value}))}/></div>
                    <div className="ff" style={{margin:0}}>
                      <label className="fl">New Expiry</label>
                      <label style={{display:'flex',alignItems:'center',gap:5,cursor:'pointer',fontSize:'0.72rem',color:'var(--cyan)',marginBottom:5}}><input type="checkbox" checked={quickUnlimited} onChange={e=>setQuickUnlimited(e.target.checked)} style={{accentColor:'var(--cyan)'}}/>∞ Unlimited</label>
                      {!quickUnlimited&&<input className="fi" type="date" value={quickData.expiryDate} onChange={e=>setQuickData(d=>({...d,expiryDate:e.target.value}))}/>}
                    </div>
                  </div>
                  <div style={{display:'flex',gap:6,marginTop:8}}>
                    <button className="btn btn-primary" style={{fontSize:'0.72rem',padding:'5px 12px'}} onClick={()=>saveQuick(c.id)} disabled={saving}>{saving?'Saving…':'✅ Save Renewal'}</button>
                    <button style={{background:'none',border:'1px solid var(--border)',borderRadius:7,color:'var(--text3)',cursor:'pointer',fontSize:'0.72rem',padding:'5px 10px'}} onClick={()=>setQuickId(null)}>Cancel</button>
                  </div>
                </div>
              )}

              {/* Full edit */}
              {isEd&&!isQU&&editData&&(
                <div style={{borderTop:'1px solid rgba(240,165,0,0.25)',marginTop:10,paddingTop:10}}>
                  <div style={{fontFamily:'Orbitron,monospace',fontSize:'0.68rem',color:'var(--gold)',marginBottom:8}}>✏️ EDIT CERTIFICATE</div>
                  {renderFormFields(editData,setEditData,editCustomName,setEditCustomName,editCustomCategory,setEditCustomCategory,editUnlimited,setEditUnlimited)}
                  <div style={{display:'flex',gap:6,marginTop:10}}>
                    <button className="btn btn-primary" style={{fontSize:'0.72rem',padding:'5px 12px'}} onClick={saveEdit} disabled={saving}>{saving?'Saving…':'✅ Save Changes'}</button>
                    <button style={{background:'none',border:'1px solid var(--border)',borderRadius:7,color:'var(--text3)',cursor:'pointer',fontSize:'0.72rem',padding:'5px 10px'}} onClick={cancelEdit}>Cancel</button>
                  </div>
                </div>
              )}
            </div>
            );
          })}
        </div>
      )}

      <div className="info-box" style={{marginTop:'1.2rem',fontSize:'0.72rem'}}>
        🔒 Certificate details stored securely — visible only to you. Document files saved privately in your own personal cloud storage.
      </div>
    </div>
  );
}

export default CertificateTrackerPage;
