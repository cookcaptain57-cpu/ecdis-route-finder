/* eslint-disable */
import { useState, useEffect, useCallback, useRef, Component } from "react";
import { db } from "../firebase";
import { doc, getDoc, setDoc } from "firebase/firestore";

// ─── THEME ────────────────────────────────────────────────────────────────────
const S = {
  bg:   '#040C1A', bg2: '#060F1C', bg3: '#081220',
  bd:   'rgba(0,212,255,0.22)', bd2: 'rgba(0,212,255,0.10)',
  tx:   '#D0E8F8', dm:  '#5A7A90', vd:  '#243850',
  cy:   '#00D4FF', gn:  '#00FF88', gd:  '#FFD700',
  rd:   '#FF4757', or:  '#FF8C42', pu:  '#C084FC',
  sm:   '0.78rem', xs:  '0.68rem', lb:  '0.58rem',
};

const VESSEL_COLORS = {
  bulk:      { accent: '#F59E0B', light: 'rgba(245,158,11,0.15)',  label: '⚓ BULK CARRIER'   },
  tanker:    { accent: '#EF4444', light: 'rgba(239,68,68,0.15)',   label: '🛢 TANKER'          },
  container: { accent: '#3B82F6', light: 'rgba(59,130,246,0.15)', label: '📦 CONTAINER SHIP'  },
  gas:       { accent: '#8B5CF6', light: 'rgba(139,92,246,0.15)', label: '💨 GAS CARRIER'     },
};

// ─── STORAGE HELPERS (localStorage — used for small config items) ───────────
const load  = (k, def) => { try { return JSON.parse(localStorage.getItem(k) ?? 'null') ?? def; } catch { return def; } };
const save  = (k, v)   => { try { localStorage.setItem(k, JSON.stringify(v)); } catch {} };

// ─── INDEXEDDB HELPER (used for the live port-operation object, which can be
// large with many bay records — avoids synchronous JSON.stringify into
// localStorage on every keystroke, which was contributing to UI hangs) ──────
const CARGO_IDB_NAME    = 'navispherex_cargo_ops';
const CARGO_IDB_VERSION = 1;
const CARGO_IDB_STORE   = 'kv';

let _cargoIdbPromise = null;
function openCargoIdb() {
  if (_cargoIdbPromise) return _cargoIdbPromise;
  _cargoIdbPromise = new Promise((resolve, reject) => {
    if (typeof indexedDB === 'undefined') { reject(new Error('no idb')); return; }
    const req = indexedDB.open(CARGO_IDB_NAME, CARGO_IDB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(CARGO_IDB_STORE)) db.createObjectStore(CARGO_IDB_STORE);
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror   = () => reject(req.error);
  });
  return _cargoIdbPromise;
}

async function idbGetCargo(key, fallback) {
  try {
    const db = await openCargoIdb();
    return await new Promise((resolve) => {
      const tx = db.transaction(CARGO_IDB_STORE, 'readonly');
      const rq = tx.objectStore(CARGO_IDB_STORE).get(key);
      rq.onsuccess = () => resolve(rq.result !== undefined ? rq.result : fallback);
      rq.onerror   = () => resolve(fallback);
    });
  } catch {
    // Fallback to localStorage if IndexedDB unavailable
    return load(key, fallback);
  }
}

async function idbSetCargo(key, value) {
  try {
    const db = await openCargoIdb();
    return await new Promise((resolve) => {
      const tx = db.transaction(CARGO_IDB_STORE, 'readwrite');
      tx.objectStore(CARGO_IDB_STORE).put(value, key);
      tx.oncomplete = () => resolve(true);
      tx.onerror    = () => resolve(false);
    });
  } catch {
    save(key, value);
    return false;
  }
}

async function idbDeleteCargo(key) {
  try {
    const db = await openCargoIdb();
    return await new Promise((resolve) => {
      const tx = db.transaction(CARGO_IDB_STORE, 'readwrite');
      tx.objectStore(CARGO_IDB_STORE).delete(key);
      tx.oncomplete = () => resolve(true);
      tx.onerror    = () => resolve(false);
    });
  } catch {
    localStorage.removeItem(key);
    return false;
  }
}

// ─── SHARED UI PRIMITIVES ────────────────────────────────────────────────────
const Card = ({ children, style }) => (
  <div style={{ background: S.bg2, border: `1px solid ${S.bd2}`, borderRadius: 10, padding: '12px 14px', ...style }}>
    {children}
  </div>
);

const SectionLabel = ({ text, color }) => (
  <div style={{ color: color || S.dm, fontSize: S.lb, letterSpacing: 1, fontWeight: 700, textTransform: 'uppercase', marginBottom: 6 }}>
    {text}
  </div>
);

const Field = ({ label, value, onChange, type = 'text', placeholder = '', unit = '', readOnly = false, color }) => (
  <div style={{ marginBottom: 8 }}>
    <div style={{ color: S.dm, fontSize: S.lb, marginBottom: 3 }}>{label}</div>
    <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
      <input
        type={type} value={value} onChange={onChange} placeholder={placeholder} readOnly={readOnly}
        style={{ flex: 1, background: readOnly ? S.bg3 : '#060F1C', color: color || S.cy, border: `1px solid ${readOnly ? S.vd : S.bd2}`, borderRadius: 5, padding: '6px 8px', fontSize: S.xs, outline: 'none', fontFamily: 'monospace' }}
      />
      {unit && <span style={{ color: S.dm, fontSize: S.lb, whiteSpace: 'nowrap' }}>{unit}</span>}
    </div>
  </div>
);

const Btn = ({ onClick, children, color, style }) => (
  <button onClick={onClick} style={{ background: `${color || S.cy}18`, border: `1px solid ${color || S.cy}55`, color: color || S.cy, borderRadius: 6, padding: '6px 12px', fontSize: S.xs, cursor: 'pointer', fontWeight: 600, ...style }}>
    {children}
  </button>
);

const Badge = ({ text, color }) => (
  <span style={{ background: `${color}22`, border: `1px solid ${color}55`, color, borderRadius: 4, padding: '2px 7px', fontSize: S.lb, fontWeight: 700 }}>{text}</span>
);

const LogTable = ({ entries, columns, onDelete, accent }) => (
  <div style={{ maxHeight: 220, overflowY: 'auto', marginTop: 8 }}>
    {entries.length === 0
      ? <div style={{ color: S.vd, fontSize: S.xs, fontStyle: 'italic', textAlign: 'center', padding: '12px 0' }}>No entries yet</div>
      : entries.map((row, i) => (
        <div key={i} style={{ background: i % 2 === 0 ? S.bg3 : 'transparent', borderRadius: 5, padding: '6px 8px', marginBottom: 2, display: 'flex', gap: 6, alignItems: 'flex-start' }}>
          <div style={{ flex: 1, display: 'flex', flexWrap: 'wrap', gap: '4px 12px' }}>
            {columns.map(col => (
              <div key={col.key} style={{ minWidth: col.w || 60 }}>
                <div style={{ color: S.dm, fontSize: '0.52rem' }}>{col.label}</div>
                <div style={{ color: col.color || accent || S.cy, fontSize: S.lb, fontFamily: 'monospace', fontWeight: 600 }}>{row[col.key] ?? '—'}</div>
              </div>
            ))}
          </div>
          <button onClick={() => onDelete(i)} style={{ background: 'transparent', border: 'none', color: S.rd, fontSize: '0.75rem', cursor: 'pointer', flexShrink: 0, padding: '0 2px' }}>✕</button>
        </div>
      ))}
  </div>
);

// ─── EXPORT HELPER ────────────────────────────────────────────────────────────
const exportLog = (title, entries, columns) => {
  if (!entries.length) return;
  const header = columns.map(c => c.label).join('\t');
  const rows   = entries.map(e => columns.map(c => e[c.key] ?? '').join('\t'));
  const text   = [title, header, ...rows].join('\n');
  const a = document.createElement('a');
  a.href = 'data:text/plain;charset=utf-8,' + encodeURIComponent(text);
  a.download = `${title.replace(/\s+/g,'_')}_${new Date().toISOString().slice(0,10)}.txt`;
  a.click();
};

// ══════════════════════════════════════════════════════════════════════════════
// BULK CARRIER TABS
// ══════════════════════════════════════════════════════════════════════════════
function BulkHoldInspection() {
  const ACC = VESSEL_COLORS.bulk.accent;
  const KEY = 'cargo_bulk_hold_inspection';
  const [entries, setEntries] = useState(() => load(KEY, []));
  const [form, setForm] = useState({ ts: new Date().toISOString().slice(0,16), hold: '1', cargo: 'Grain', condition: 'Clean', dryness: 'Dry', residue: 'None', surveyor: '', remarks: '' });
  const set = k => e => setForm(f => ({ ...f, [k]: e.target.value }));
  const add = () => {
    const e = [...entries, { ...form }];
    setEntries(e); save(KEY, e);
    setForm(f => ({ ...f, ts: new Date().toISOString().slice(0,16), remarks: '' }));
  };
  const del = i => { const e = entries.filter((_, j) => j !== i); setEntries(e); save(KEY, e); };
  const COLS = [
    { key: 'ts', label: 'Date/Time', w: 110 },
    { key: 'hold', label: 'Hold #', w: 45 },
    { key: 'cargo', label: 'Cargo', w: 70 },
    { key: 'condition', label: 'Condition', w: 65 },
    { key: 'dryness', label: 'Dryness', w: 55 },
    { key: 'residue', label: 'Residue', w: 65 },
    { key: 'surveyor', label: 'Surveyor', w: 80 },
    { key: 'remarks', label: 'Remarks', w: 100 },
  ];
  return (
    <div>
      <Card style={{ marginBottom: 10 }}>
        <SectionLabel text="New Hold Inspection Entry" color={ACC} />
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 10px' }}>
          <Field label="Date / Time" value={form.ts} onChange={set('ts')} type="datetime-local" />
          <div style={{ marginBottom: 8 }}>
            <div style={{ color: S.dm, fontSize: S.lb, marginBottom: 3 }}>Hold Number</div>
            <select value={form.hold} onChange={set('hold')} style={{ width: '100%', background: S.bg3, color: S.cy, border: `1px solid ${S.bd2}`, borderRadius: 5, padding: '6px 8px', fontSize: S.xs }}>
              {[1,2,3,4,5,6,7].map(n => <option key={n} value={n}>{n}</option>)}
            </select>
          </div>
          <div style={{ marginBottom: 8 }}>
            <div style={{ color: S.dm, fontSize: S.lb, marginBottom: 3 }}>Cargo Type</div>
            <select value={form.cargo} onChange={set('cargo')} style={{ width: '100%', background: S.bg3, color: ACC, border: `1px solid ${S.bd2}`, borderRadius: 5, padding: '6px 8px', fontSize: S.xs }}>
              {['Grain','Coal','Fertilizer','Iron Ore','Cement','Salt','Sugar','Bauxite','Other'].map(c => <option key={c}>{c}</option>)}
            </select>
          </div>
          <div style={{ marginBottom: 8 }}>
            <div style={{ color: S.dm, fontSize: S.lb, marginBottom: 3 }}>Hold Condition</div>
            <select value={form.condition} onChange={set('condition')} style={{ width: '100%', background: S.bg3, color: form.condition === 'Clean' ? S.gn : form.condition === 'Requires Cleaning' ? S.rd : S.gd, border: `1px solid ${S.bd2}`, borderRadius: 5, padding: '6px 8px', fontSize: S.xs }}>
              {['Clean','Requires Cleaning','Failed Survey','Acceptable'].map(c => <option key={c}>{c}</option>)}
            </select>
          </div>
          <div style={{ marginBottom: 8 }}>
            <div style={{ color: S.dm, fontSize: S.lb, marginBottom: 3 }}>Dryness</div>
            <select value={form.dryness} onChange={set('dryness')} style={{ width: '100%', background: S.bg3, color: S.cy, border: `1px solid ${S.bd2}`, borderRadius: 5, padding: '6px 8px', fontSize: S.xs }}>
              {['Dry','Damp','Wet','Rust Stained'].map(c => <option key={c}>{c}</option>)}
            </select>
          </div>
          <div style={{ marginBottom: 8 }}>
            <div style={{ color: S.dm, fontSize: S.lb, marginBottom: 3 }}>Previous Cargo Residue</div>
            <select value={form.residue} onChange={set('residue')} style={{ width: '100%', background: S.bg3, color: S.cy, border: `1px solid ${S.bd2}`, borderRadius: 5, padding: '6px 8px', fontSize: S.xs }}>
              {['None','Traces','Significant','Requires Treatment'].map(c => <option key={c}>{c}</option>)}
            </select>
          </div>
        </div>
        <Field label="Surveyor Name" value={form.surveyor} onChange={set('surveyor')} placeholder="Surveyor / Inspector" />
        <Field label="Remarks" value={form.remarks} onChange={set('remarks')} placeholder="Additional notes…" />
        <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
          <Btn onClick={add} color={ACC} style={{ flex: 1 }}>+ Add Entry</Btn>
          <Btn onClick={() => exportLog('Hold Inspection Log', entries, COLS)} color={S.dm}>⬇ Export</Btn>
        </div>
      </Card>
      <Card>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
          <SectionLabel text={`Inspection Log (${entries.length})`} color={ACC} />
          {entries.length > 0 && <Btn onClick={() => { setEntries([]); save(KEY, []); }} color={S.rd} style={{ padding: '3px 8px', fontSize: S.lb }}>Clear All</Btn>}
        </div>
        <LogTable entries={entries} columns={COLS} onDelete={del} accent={ACC} />
      </Card>
    </div>
  );
}

function BulkHatchLog() {
  const ACC = VESSEL_COLORS.bulk.accent;
  const KEY = 'cargo_bulk_hatch_log';
  const [entries, setEntries] = useState(() => load(KEY, []));
  const [form, setForm] = useState({ ts: new Date().toISOString().slice(0,16), hatch: '1', method: 'Chalk Test', result: 'Pass', leaks: 'None', remarks: '' });
  const set = k => e => setForm(f => ({ ...f, [k]: e.target.value }));
  const add = () => { const e = [...entries, { ...form }]; setEntries(e); save(KEY, e); setForm(f => ({ ...f, ts: new Date().toISOString().slice(0,16), remarks: '' })); };
  const del = i => { const e = entries.filter((_, j) => j !== i); setEntries(e); save(KEY, e); };
  const COLS = [
    { key: 'ts', label: 'Date/Time', w: 110 }, { key: 'hatch', label: 'Hatch', w: 40 },
    { key: 'method', label: 'Method', w: 90 }, { key: 'result', label: 'Result', w: 55 },
    { key: 'leaks', label: 'Leaks', w: 60 }, { key: 'remarks', label: 'Remarks', w: 100 },
  ];
  return (
    <div>
      <Card style={{ marginBottom: 10 }}>
        <SectionLabel text="Hatch Cover Weathertightness Entry" color={ACC} />
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 10px' }}>
          <Field label="Date / Time" value={form.ts} onChange={set('ts')} type="datetime-local" />
          <div style={{ marginBottom: 8 }}>
            <div style={{ color: S.dm, fontSize: S.lb, marginBottom: 3 }}>Hatch Number</div>
            <select value={form.hatch} onChange={set('hatch')} style={{ width: '100%', background: S.bg3, color: S.cy, border: `1px solid ${S.bd2}`, borderRadius: 5, padding: '6px 8px', fontSize: S.xs }}>
              {[1,2,3,4,5,6,7].map(n => <option key={n} value={n}>{n}</option>)}
            </select>
          </div>
          <div style={{ marginBottom: 8 }}>
            <div style={{ color: S.dm, fontSize: S.lb, marginBottom: 3 }}>Test Method</div>
            <select value={form.method} onChange={set('method')} style={{ width: '100%', background: S.bg3, color: S.cy, border: `1px solid ${S.bd2}`, borderRadius: 5, padding: '6px 8px', fontSize: S.xs }}>
              {['Chalk Test','Ultrasonic Test','Hose Test','Visual Inspection'].map(c => <option key={c}>{c}</option>)}
            </select>
          </div>
          <div style={{ marginBottom: 8 }}>
            <div style={{ color: S.dm, fontSize: S.lb, marginBottom: 3 }}>Result</div>
            <select value={form.result} onChange={set('result')} style={{ width: '100%', background: S.bg3, color: form.result === 'Pass' ? S.gn : S.rd, border: `1px solid ${S.bd2}`, borderRadius: 5, padding: '6px 8px', fontSize: S.xs }}>
              {['Pass','Fail','Marginal','Pending Repair'].map(c => <option key={c}>{c}</option>)}
            </select>
          </div>
          <div style={{ marginBottom: 8 }}>
            <div style={{ color: S.dm, fontSize: S.lb, marginBottom: 3 }}>Leak Points</div>
            <select value={form.leaks} onChange={set('leaks')} style={{ width: '100%', background: S.bg3, color: S.cy, border: `1px solid ${S.bd2}`, borderRadius: 5, padding: '6px 8px', fontSize: S.xs }}>
              {['None','Corner Drains','Cross Joint','Longitudinal Joint','Multiple Points'].map(c => <option key={c}>{c}</option>)}
            </select>
          </div>
        </div>
        <Field label="Remarks / Corrective Action" value={form.remarks} onChange={set('remarks')} placeholder="Sealant applied, repairs required…" />
        <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
          <Btn onClick={add} color={ACC} style={{ flex: 1 }}>+ Add Entry</Btn>
          <Btn onClick={() => exportLog('Hatch Cover Log', entries, COLS)} color={S.dm}>⬇ Export</Btn>
        </div>
      </Card>
      <Card>
        <SectionLabel text={`Hatch Log (${entries.length})`} color={ACC} />
        <LogTable entries={entries} columns={COLS} onDelete={del} accent={ACC} />
      </Card>
    </div>
  );
}

function BulkBilgeLog() {
  const ACC = VESSEL_COLORS.bulk.accent;
  const KEY = 'cargo_bulk_bilge_log';
  const [entries, setEntries] = useState(() => load(KEY, []));
  const [form, setForm] = useState({ ts: new Date().toISOString().slice(0,16), hold: '1', level: '', pumped: '', contamination: 'None', remarks: '' });
  const set = k => e => setForm(f => ({ ...f, [k]: e.target.value }));
  const add = () => { if (!form.level) return; const e = [...entries, { ...form }]; setEntries(e); save(KEY, e); setForm(f => ({ ...f, ts: new Date().toISOString().slice(0,16), level: '', pumped: '', remarks: '' })); };
  const del = i => { const e = entries.filter((_, j) => j !== i); setEntries(e); save(KEY, e); };
  const COLS = [
    { key: 'ts', label: 'Date/Time', w: 110 }, { key: 'hold', label: 'Hold', w: 40 },
    { key: 'level', label: 'Level (mm)', w: 70 }, { key: 'pumped', label: 'Pumped (L)', w: 75 },
    { key: 'contamination', label: 'Contamination', w: 90 }, { key: 'remarks', label: 'Remarks', w: 100 },
  ];
  return (
    <div>
      <Card style={{ marginBottom: 10 }}>
        <SectionLabel text="Hold Bilge Log Entry" color={ACC} />
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 10px' }}>
          <Field label="Date / Time" value={form.ts} onChange={set('ts')} type="datetime-local" />
          <div style={{ marginBottom: 8 }}>
            <div style={{ color: S.dm, fontSize: S.lb, marginBottom: 3 }}>Hold Number</div>
            <select value={form.hold} onChange={set('hold')} style={{ width: '100%', background: S.bg3, color: S.cy, border: `1px solid ${S.bd2}`, borderRadius: 5, padding: '6px 8px', fontSize: S.xs }}>
              {[1,2,3,4,5,6,7].map(n => <option key={n} value={n}>{n}</option>)}
            </select>
          </div>
          <Field label="Bilge Level" value={form.level} onChange={set('level')} type="number" placeholder="0" unit="mm" />
          <Field label="Quantity Pumped" value={form.pumped} onChange={set('pumped')} type="number" placeholder="0" unit="L" />
          <div style={{ marginBottom: 8, gridColumn: '1/-1' }}>
            <div style={{ color: S.dm, fontSize: S.lb, marginBottom: 3 }}>Contamination</div>
            <select value={form.contamination} onChange={set('contamination')} style={{ width: '100%', background: S.bg3, color: form.contamination === 'None' ? S.gn : S.rd, border: `1px solid ${S.bd2}`, borderRadius: 5, padding: '6px 8px', fontSize: S.xs }}>
              {['None','Oil Sheen','Cargo Residue','Heavy Contamination'].map(c => <option key={c}>{c}</option>)}
            </select>
          </div>
        </div>
        <Field label="Remarks" value={form.remarks} onChange={set('remarks')} placeholder="Observations, actions taken…" />
        <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
          <Btn onClick={add} color={ACC} style={{ flex: 1 }}>+ Add Entry</Btn>
          <Btn onClick={() => exportLog('Hold Bilge Log', entries, COLS)} color={S.dm}>⬇ Export</Btn>
        </div>
      </Card>
      <Card>
        <SectionLabel text={`Bilge Log (${entries.length})`} color={ACC} />
        <LogTable entries={entries} columns={COLS} onDelete={del} accent={ACC} />
      </Card>
    </div>
  );
}

function BulkTrimmingCalc() {
  const ACC = VESSEL_COLORS.bulk.accent;
  const [holds, setHolds] = useState([
    { id: 1, capacity: 8500, loaded: 0, lcg: -40 },
    { id: 2, capacity: 9200, loaded: 0, lcg: -20 },
    { id: 3, capacity: 9200, loaded: 0, lcg: 0  },
    { id: 4, capacity: 9200, loaded: 0, lcg: 20 },
    { id: 5, capacity: 8500, loaded: 0, lcg: 40 },
  ]);
  const [lbp, setLbp]     = useState(180);
  const [lcf, setLcf]     = useState(0);
  const [tpc, setTpc]     = useState(28);
  const [gm,  setGm]      = useState(1.2);
  const update = (id, key, val) => setHolds(h => h.map(x => x.id === id ? { ...x, [key]: parseFloat(val) || 0 } : x));
  const totalLoaded = holds.reduce((s, h) => s + h.loaded, 0);
  const totalCap    = holds.reduce((s, h) => s + h.capacity, 0);
  const lcgVessel   = totalLoaded > 0 ? holds.reduce((s, h) => s + h.loaded * h.lcg, 0) / totalLoaded : 0;
  const trimMoment  = (lcgVessel - lcf) * totalLoaded;
  const trim        = tpc > 0 ? (trimMoment / (tpc * lbp)).toFixed(3) : '—';
  const trimDir     = parseFloat(trim) > 0 ? 'by Stern' : parseFloat(trim) < 0 ? 'by Head' : 'Even Keel';
  const trimColor   = Math.abs(parseFloat(trim)) < 0.5 ? S.gn : Math.abs(parseFloat(trim)) < 1.5 ? S.gd : S.rd;
  return (
    <div>
      <Card style={{ marginBottom: 10 }}>
        <SectionLabel text="Vessel Parameters" color={ACC} />
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 10px' }}>
          <Field label="LBP" value={lbp} onChange={e => setLbp(parseFloat(e.target.value)||0)} type="number" unit="m" />
          <Field label="LCF from Midship" value={lcf} onChange={e => setLcf(parseFloat(e.target.value)||0)} type="number" unit="m" placeholder="-ve fwd" />
          <Field label="TPC" value={tpc} onChange={e => setTpc(parseFloat(e.target.value)||0)} type="number" unit="t/cm" />
          <Field label="Initial GM" value={gm} onChange={e => setGm(parseFloat(e.target.value)||0)} type="number" unit="m" />
        </div>
      </Card>
      <Card style={{ marginBottom: 10 }}>
        <SectionLabel text="Hold Loading Distribution" color={ACC} />
        <div style={{ display: 'grid', gridTemplateColumns: '50px 1fr 1fr 1fr', gap: 4, marginBottom: 4 }}>
          {['Hold','Cap (t)','Loaded (t)','LCG (m)'].map(h => <div key={h} style={{ color: S.dm, fontSize: S.lb }}>{h}</div>)}
        </div>
        {holds.map(h => (
          <div key={h.id} style={{ display: 'grid', gridTemplateColumns: '50px 1fr 1fr 1fr', gap: 4, marginBottom: 4, alignItems: 'center' }}>
            <div style={{ color: ACC, fontWeight: 700, fontSize: S.xs }}>H{h.id}</div>
            <input type="number" value={h.capacity} onChange={e => update(h.id,'capacity',e.target.value)} style={{ background: S.bg3, color: S.dm, border: `1px solid ${S.vd}`, borderRadius: 4, padding: '4px 6px', fontSize: S.lb, outline: 'none', fontFamily: 'monospace' }}/>
            <input type="number" value={h.loaded} onChange={e => update(h.id,'loaded',e.target.value)} style={{ background: S.bg2, color: ACC, border: `1px solid ${S.bd2}`, borderRadius: 4, padding: '4px 6px', fontSize: S.lb, outline: 'none', fontFamily: 'monospace' }}/>
            <input type="number" value={h.lcg} onChange={e => update(h.id,'lcg',e.target.value)} style={{ background: S.bg3, color: S.dm, border: `1px solid ${S.vd}`, borderRadius: 4, padding: '4px 6px', fontSize: S.lb, outline: 'none', fontFamily: 'monospace' }}/>
          </div>
        ))}
        <div style={{ borderTop: `1px solid ${S.bd2}`, marginTop: 6, paddingTop: 6, display: 'flex', justifyContent: 'space-between' }}>
          <span style={{ color: S.dm, fontSize: S.xs }}>Total: <b style={{ color: ACC }}>{totalLoaded.toFixed(0)} t</b> / {totalCap.toFixed(0)} t</span>
          <span style={{ color: S.dm, fontSize: S.xs }}>LCG vessel: <b style={{ color: ACC }}>{lcgVessel.toFixed(2)} m</b></span>
        </div>
      </Card>
      <Card>
        <SectionLabel text="Trim Result" color={ACC} />
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8 }}>
          {[
            ['Trim Moment', `${(trimMoment).toFixed(0)} t·m`, S.cy],
            ['Calculated Trim', `${Math.abs(parseFloat(trim) || 0).toFixed(3)} m`, trimColor],
            ['Direction', trimDir, trimColor],
          ].map(([k, v, c]) => (
            <div key={k} style={{ background: S.bg3, borderRadius: 7, padding: '10px 12px', textAlign: 'center' }}>
              <div style={{ color: S.dm, fontSize: S.lb, marginBottom: 4 }}>{k}</div>
              <div style={{ color: c, fontFamily: 'monospace', fontSize: '0.9rem', fontWeight: 700 }}>{v}</div>
            </div>
          ))}
        </div>
        <div style={{ marginTop: 8, background: S.bg3, borderRadius: 6, padding: '8px 10px', fontSize: S.lb, color: S.dm, lineHeight: 1.7 }}>
          ℹ Positive LCG = aft of midship · Negative = fwd of midship<br/>
          ⚠ This is a simplified trim estimate. Always verify with vessel's loadicator.
        </div>
      </Card>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// TANKER TABS
// ══════════════════════════════════════════════════════════════════════════════
function TankerCargoCalc() {
  const ACC = VESSEL_COLORS.tanker.accent;
  const [obsVol, setObsVol]   = useState('');
  const [api,    setApi]      = useState('');
  const [obsTemp,setObsTemp]  = useState('');
  const [stdTemp,setStdTemp]  = useState('15');
  const result = useCallback(() => {
    const ov = parseFloat(obsVol), a = parseFloat(api), ot = parseFloat(obsTemp), st = parseFloat(stdTemp);
    if (!ov || !a || isNaN(ot) || isNaN(st)) return null;
    const vcf  = 1 - 0.0006 * (ot - st);
    const stdVol = ov * vcf;
    const sg = 141.5 / (a + 131.5);
    const mt = stdVol * sg / 1000;
    return { vcf: vcf.toFixed(5), stdVol: stdVol.toFixed(3), sg: sg.toFixed(4), mt: mt.toFixed(3) };
  }, [obsVol, api, obsTemp, stdTemp]);
  const res = result();
  return (
    <div>
      <Card style={{ marginBottom: 10 }}>
        <SectionLabel text="Cargo Volume Calculator (API / VCF)" color={ACC} />
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 10px' }}>
          <Field label="Observed Volume" value={obsVol} onChange={e => setObsVol(e.target.value)} type="number" placeholder="0.000" unit="m³" />
          <Field label="API Gravity @ 60°F" value={api} onChange={e => setApi(e.target.value)} type="number" placeholder="e.g. 35.5" unit="°API" />
          <Field label="Observed Temperature" value={obsTemp} onChange={e => setObsTemp(e.target.value)} type="number" placeholder="e.g. 28" unit="°C" />
          <Field label="Standard Temperature" value={stdTemp} onChange={e => setStdTemp(e.target.value)} type="number" placeholder="15" unit="°C" />
        </div>
      </Card>
      {res
        ? <Card>
            <SectionLabel text="Calculation Result" color={ACC} />
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
              {[['VCF', res.vcf, S.cy], ['Std Volume', `${res.stdVol} m³`, ACC], ['Specific Gravity', res.sg, S.cy], ['Metric Tons', `${res.mt} MT`, S.gn]].map(([k, v, c]) => (
                <div key={k} style={{ background: S.bg3, borderRadius: 7, padding: '10px 12px' }}>
                  <div style={{ color: S.dm, fontSize: S.lb }}>{k}</div>
                  <div style={{ color: c, fontFamily: 'monospace', fontSize: '1rem', fontWeight: 700, marginTop: 2 }}>{v}</div>
                </div>
              ))}
            </div>
            <div style={{ marginTop: 8, color: S.dm, fontSize: S.lb, lineHeight: 1.6 }}>ℹ VCF calculated using simplified ASTM correction. For custody transfer use official ASTM tables.</div>
          </Card>
        : <Card><div style={{ color: S.vd, fontSize: S.xs, textAlign: 'center', padding: '16px 0' }}>Enter all values above to calculate</div></Card>}
    </div>
  );
}

function TankerCOW() {
  const ACC = VESSEL_COLORS.tanker.accent;
  const KEY = 'cargo_tanker_cow';
  const [entries, setEntries] = useState(() => load(KEY, []));
  const [form, setForm] = useState({ ts: new Date().toISOString().slice(0,16), tank: 'No.1 Centre', method: 'Fixed Machine', startTime: '', endTime: '', oxygenPre: '', remarks: '' });
  const set = k => e => setForm(f => ({ ...f, [k]: e.target.value }));
  const add = () => { const e = [...entries, { ...form }]; setEntries(e); save(KEY, e); setForm(f => ({ ...f, ts: new Date().toISOString().slice(0,16), startTime: '', endTime: '', oxygenPre: '', remarks: '' })); };
  const del = i => { const e = entries.filter((_, j) => j !== i); setEntries(e); save(KEY, e); };
  const COLS = [
    { key: 'ts', label: 'Date', w: 100 }, { key: 'tank', label: 'Tank', w: 90 },
    { key: 'method', label: 'Method', w: 100 }, { key: 'startTime', label: 'Start', w: 55 },
    { key: 'endTime', label: 'End', w: 55 }, { key: 'oxygenPre', label: 'O₂% Pre', w: 55 },
    { key: 'remarks', label: 'Remarks', w: 100 },
  ];
  return (
    <div>
      <Card style={{ marginBottom: 10 }}>
        <SectionLabel text="COW Record Entry (MARPOL Annex I)" color={ACC} />
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 10px' }}>
          <Field label="Date" value={form.ts} onChange={set('ts')} type="datetime-local" />
          <div style={{ marginBottom: 8 }}>
            <div style={{ color: S.dm, fontSize: S.lb, marginBottom: 3 }}>Tank</div>
            <select value={form.tank} onChange={set('tank')} style={{ width: '100%', background: S.bg3, color: ACC, border: `1px solid ${S.bd2}`, borderRadius: 5, padding: '6px 8px', fontSize: S.xs }}>
              {['No.1 Centre','No.2 Centre','No.3 Centre','No.1 Port','No.1 Stbd','No.2 Port','No.2 Stbd','No.3 Port','No.3 Stbd','Slop Port','Slop Stbd'].map(t => <option key={t}>{t}</option>)}
            </select>
          </div>
          <div style={{ marginBottom: 8 }}>
            <div style={{ color: S.dm, fontSize: S.lb, marginBottom: 3 }}>COW Method</div>
            <select value={form.method} onChange={set('method')} style={{ width: '100%', background: S.bg3, color: S.cy, border: `1px solid ${S.bd2}`, borderRadius: 5, padding: '6px 8px', fontSize: S.xs }}>
              {['Fixed Machine','Portable Machine','Multi-Stage','Bottom Wash','Full Wash'].map(t => <option key={t}>{t}</option>)}
            </select>
          </div>
          <Field label="O₂ % Before COW" value={form.oxygenPre} onChange={set('oxygenPre')} type="number" placeholder="< 8% required" unit="%" color={parseFloat(form.oxygenPre) < 8 ? S.gn : S.rd} />
          <Field label="Start Time" value={form.startTime} onChange={set('startTime')} type="time" />
          <Field label="End Time" value={form.endTime} onChange={set('endTime')} type="time" />
        </div>
        <Field label="Remarks" value={form.remarks} onChange={set('remarks')} placeholder="Observations, pressure, remarks…" />
        {parseFloat(form.oxygenPre) >= 8 && form.oxygenPre !== '' && (
          <div style={{ background: 'rgba(255,71,87,0.12)', border: `1px solid ${S.rd}`, borderRadius: 6, padding: '6px 10px', marginBottom: 8, color: S.rd, fontSize: S.xs }}>
            ⚠ O₂ level ≥ 8% — COW must NOT commence. IG system required.
          </div>
        )}
        <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
          <Btn onClick={add} color={ACC} style={{ flex: 1 }}>+ Add COW Record</Btn>
          <Btn onClick={() => exportLog('COW Record', entries, COLS)} color={S.dm}>⬇ Export</Btn>
        </div>
      </Card>
      <Card>
        <SectionLabel text={`COW Records (${entries.length})`} color={ACC} />
        <LogTable entries={entries} columns={COLS} onDelete={del} accent={ACC} />
      </Card>
    </div>
  );
}

function TankerIGLog() {
  const ACC = VESSEL_COLORS.tanker.accent;
  const KEY = 'cargo_tanker_ig_log';
  const [entries, setEntries] = useState(() => load(KEY, []));
  const [form, setForm] = useState({ ts: new Date().toISOString().slice(0,16), tank: 'No.1 Centre', o2: '', pressure: '', igSource: 'IG Generator', remarks: '' });
  const set = k => e => setForm(f => ({ ...f, [k]: e.target.value }));
  const add = () => { if (!form.o2) return; const e = [...entries, { ...form }]; setEntries(e); save(KEY, e); setForm(f => ({ ...f, ts: new Date().toISOString().slice(0,16), o2: '', pressure: '', remarks: '' })); };
  const del = i => { const e = entries.filter((_, j) => j !== i); setEntries(e); save(KEY, e); };
  const COLS = [
    { key: 'ts', label: 'Date/Time', w: 110 }, { key: 'tank', label: 'Tank', w: 90 },
    { key: 'o2', label: 'O₂ %', w: 50 }, { key: 'pressure', label: 'Press (mbar)', w: 80 },
    { key: 'igSource', label: 'IG Source', w: 90 }, { key: 'remarks', label: 'Remarks', w: 100 },
  ];
  return (
    <div>
      <Card style={{ marginBottom: 10 }}>
        <SectionLabel text="Inert Gas System Log" color={ACC} />
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 10px' }}>
          <Field label="Date / Time" value={form.ts} onChange={set('ts')} type="datetime-local" />
          <div style={{ marginBottom: 8 }}>
            <div style={{ color: S.dm, fontSize: S.lb, marginBottom: 3 }}>Tank</div>
            <select value={form.tank} onChange={set('tank')} style={{ width: '100%', background: S.bg3, color: ACC, border: `1px solid ${S.bd2}`, borderRadius: 5, padding: '6px 8px', fontSize: S.xs }}>
              {['No.1 Centre','No.2 Centre','No.3 Centre','No.1 Port','No.1 Stbd','No.2 Port','No.2 Stbd','Slop Port','Slop Stbd','All Tanks'].map(t => <option key={t}>{t}</option>)}
            </select>
          </div>
          <Field label="O₂ Content" value={form.o2} onChange={set('o2')} type="number" placeholder="< 8% required" unit="%" color={parseFloat(form.o2) < 8 ? S.gn : S.rd} />
          <Field label="Tank Pressure" value={form.pressure} onChange={set('pressure')} type="number" placeholder="positive" unit="mbar" color={parseFloat(form.pressure) > 0 ? S.gn : S.rd} />
          <div style={{ marginBottom: 8, gridColumn: '1/-1' }}>
            <div style={{ color: S.dm, fontSize: S.lb, marginBottom: 3 }}>IG Source</div>
            <select value={form.igSource} onChange={set('igSource')} style={{ width: '100%', background: S.bg3, color: S.cy, border: `1px solid ${S.bd2}`, borderRadius: 5, padding: '6px 8px', fontSize: S.xs }}>
              {['IG Generator','Flue Gas','Nitrogen','Blanketing Gas'].map(t => <option key={t}>{t}</option>)}
            </select>
          </div>
        </div>
        <Field label="Remarks" value={form.remarks} onChange={set('remarks')} placeholder="System status, alarms, actions…" />
        {parseFloat(form.o2) >= 8 && form.o2 !== '' && (
          <div style={{ background: 'rgba(255,71,87,0.12)', border: `1px solid ${S.rd}`, borderRadius: 6, padding: '6px 10px', marginBottom: 8, color: S.rd, fontSize: S.xs }}>
            ⚠ O₂ ≥ 8% — DANGER. Atmosphere not inerted. No hot work. No tank entry.
          </div>
        )}
        <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
          <Btn onClick={add} color={ACC} style={{ flex: 1 }}>+ Add IG Reading</Btn>
          <Btn onClick={() => exportLog('IG System Log', entries, COLS)} color={S.dm}>⬇ Export</Btn>
        </div>
      </Card>
      <Card>
        <SectionLabel text={`IG Log (${entries.length})`} color={ACC} />
        <LogTable entries={entries} columns={COLS} onDelete={del} accent={ACC} />
      </Card>
    </div>
  );
}

function TankerPumproom() {
  const ACC = VESSEL_COLORS.tanker.accent;
  const KEY = 'cargo_tanker_pumproom';
  const [entries, setEntries] = useState(() => load(KEY, []));
  const [form, setForm] = useState({ ts: new Date().toISOString().slice(0,16), bilgeLevel: '', ventilation: 'Running', noSmoking: 'Yes', h2s: '', hc: '', enteredBy: '', remarks: '' });
  const set = k => e => setForm(f => ({ ...f, [k]: e.target.value }));
  const add = () => { if (!form.bilgeLevel) return; const e = [...entries, { ...form }]; setEntries(e); save(KEY, e); setForm(f => ({ ...f, ts: new Date().toISOString().slice(0,16), bilgeLevel: '', h2s: '', hc: '', remarks: '' })); };
  const del = i => { const e = entries.filter((_, j) => j !== i); setEntries(e); save(KEY, e); };
  const COLS = [
    { key: 'ts', label: 'Date/Time', w: 110 }, { key: 'bilgeLevel', label: 'Bilge (mm)', w: 70 },
    { key: 'ventilation', label: 'Vent.', w: 60 }, { key: 'h2s', label: 'H₂S ppm', w: 65 },
    { key: 'hc', label: 'HC %LEL', w: 65 }, { key: 'enteredBy', label: 'By', w: 70 },
    { key: 'remarks', label: 'Remarks', w: 100 },
  ];
  return (
    <div>
      <Card style={{ marginBottom: 10 }}>
        <SectionLabel text="Pump Room Inspection Entry" color={ACC} />
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 10px' }}>
          <Field label="Date / Time" value={form.ts} onChange={set('ts')} type="datetime-local" />
          <Field label="Bilge Level" value={form.bilgeLevel} onChange={set('bilgeLevel')} type="number" placeholder="0" unit="mm" />
          <div style={{ marginBottom: 8 }}>
            <div style={{ color: S.dm, fontSize: S.lb, marginBottom: 3 }}>Ventilation</div>
            <select value={form.ventilation} onChange={set('ventilation')} style={{ width: '100%', background: S.bg3, color: form.ventilation === 'Running' ? S.gn : S.rd, border: `1px solid ${S.bd2}`, borderRadius: 5, padding: '6px 8px', fontSize: S.xs }}>
              {['Running','Stopped','Fault'].map(t => <option key={t}>{t}</option>)}
            </select>
          </div>
          <div style={{ marginBottom: 8 }}>
            <div style={{ color: S.dm, fontSize: S.lb, marginBottom: 3 }}>No Smoking Sign Posted</div>
            <select value={form.noSmoking} onChange={set('noSmoking')} style={{ width: '100%', background: S.bg3, color: form.noSmoking === 'Yes' ? S.gn : S.rd, border: `1px solid ${S.bd2}`, borderRadius: 5, padding: '6px 8px', fontSize: S.xs }}>
              {['Yes','No'].map(t => <option key={t}>{t}</option>)}
            </select>
          </div>
          <Field label="H₂S Reading" value={form.h2s} onChange={set('h2s')} type="number" placeholder="0" unit="ppm" color={parseFloat(form.h2s) > 1 ? S.rd : S.gn} />
          <Field label="HC Reading" value={form.hc} onChange={set('hc')} type="number" placeholder="0" unit="% LEL" color={parseFloat(form.hc) > 10 ? S.rd : S.gn} />
          <Field label="Inspected By" value={form.enteredBy} onChange={set('enteredBy')} placeholder="Name / Rank" />
        </div>
        {(parseFloat(form.h2s) > 1 || parseFloat(form.hc) > 10) && (
          <div style={{ background: 'rgba(255,71,87,0.12)', border: `1px solid ${S.rd}`, borderRadius: 6, padding: '6px 10px', marginBottom: 8, color: S.rd, fontSize: S.xs }}>
            ⚠ Gas readings above safe limits. Do NOT enter pump room. Notify Chief Officer immediately.
          </div>
        )}
        <Field label="Remarks" value={form.remarks} onChange={set('remarks')} placeholder="Observations, leaks, issues…" />
        <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
          <Btn onClick={add} color={ACC} style={{ flex: 1 }}>+ Add Inspection</Btn>
          <Btn onClick={() => exportLog('Pumproom Inspection Log', entries, COLS)} color={S.dm}>⬇ Export</Btn>
        </div>
      </Card>
      <Card>
        <SectionLabel text={`Pumproom Log (${entries.length})`} color={ACC} />
        <LogTable entries={entries} columns={COLS} onDelete={del} accent={ACC} />
      </Card>
    </div>
  );
}

function TankerHeatingLog() {
  const ACC = VESSEL_COLORS.tanker.accent;
  const KEY = 'cargo_tanker_heating';
  const [entries, setEntries] = useState(() => load(KEY, []));
  const [form, setForm] = useState({ ts: new Date().toISOString().slice(0,16), tank: 'No.1 Centre', targetTemp: '', actualTemp: '', steamIn: '', steamOut: '', remarks: '' });
  const set = k => e => setForm(f => ({ ...f, [k]: e.target.value }));
  const add = () => { if (!form.actualTemp) return; const e = [...entries, { ...form }]; setEntries(e); save(KEY, e); setForm(f => ({ ...f, ts: new Date().toISOString().slice(0,16), actualTemp: '', steamIn: '', steamOut: '', remarks: '' })); };
  const del = i => { const e = entries.filter((_, j) => j !== i); setEntries(e); save(KEY, e); };
  const diff = parseFloat(form.actualTemp) - parseFloat(form.targetTemp);
  const COLS = [
    { key: 'ts', label: 'Date/Time', w: 110 }, { key: 'tank', label: 'Tank', w: 90 },
    { key: 'targetTemp', label: 'Target °C', w: 65 }, { key: 'actualTemp', label: 'Actual °C', w: 65 },
    { key: 'steamIn', label: 'Steam In °C', w: 75 }, { key: 'steamOut', label: 'Steam Out °C', w: 80 },
    { key: 'remarks', label: 'Remarks', w: 100 },
  ];
  return (
    <div>
      <Card style={{ marginBottom: 10 }}>
        <SectionLabel text="Cargo Heating Log" color={ACC} />
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 10px' }}>
          <Field label="Date / Time" value={form.ts} onChange={set('ts')} type="datetime-local" />
          <div style={{ marginBottom: 8 }}>
            <div style={{ color: S.dm, fontSize: S.lb, marginBottom: 3 }}>Tank</div>
            <select value={form.tank} onChange={set('tank')} style={{ width: '100%', background: S.bg3, color: ACC, border: `1px solid ${S.bd2}`, borderRadius: 5, padding: '6px 8px', fontSize: S.xs }}>
              {['No.1 Centre','No.2 Centre','No.3 Centre','No.1 Port','No.1 Stbd','No.2 Port','No.2 Stbd','No.3 Port','No.3 Stbd','All Tanks'].map(t => <option key={t}>{t}</option>)}
            </select>
          </div>
          <Field label="Target Temperature" value={form.targetTemp} onChange={set('targetTemp')} type="number" placeholder="e.g. 45" unit="°C" />
          <Field label="Actual Temperature" value={form.actualTemp} onChange={set('actualTemp')} type="number" placeholder="measured" unit="°C" color={!isNaN(diff) && form.targetTemp ? (Math.abs(diff) <= 2 ? S.gn : Math.abs(diff) <= 5 ? S.gd : S.rd) : S.cy} />
          <Field label="Steam Inlet Temp" value={form.steamIn} onChange={set('steamIn')} type="number" placeholder="°C" unit="°C" />
          <Field label="Steam Outlet Temp" value={form.steamOut} onChange={set('steamOut')} type="number" placeholder="°C" unit="°C" />
        </div>
        {form.targetTemp && form.actualTemp && (
          <div style={{ background: Math.abs(diff) <= 2 ? 'rgba(0,255,136,0.08)' : 'rgba(255,179,0,0.08)', border: `1px solid ${Math.abs(diff) <= 2 ? S.gn : S.gd}44`, borderRadius: 6, padding: '6px 10px', marginBottom: 8 }}>
            <span style={{ color: S.dm, fontSize: S.xs }}>Δ from target: </span>
            <span style={{ color: Math.abs(diff) <= 2 ? S.gn : Math.abs(diff) <= 5 ? S.gd : S.rd, fontWeight: 700, fontFamily: 'monospace' }}>{diff > 0 ? '+' : ''}{diff.toFixed(1)}°C</span>
          </div>
        )}
        <Field label="Remarks" value={form.remarks} onChange={set('remarks')} placeholder="Steam flow, heating coil condition…" />
        <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
          <Btn onClick={add} color={ACC} style={{ flex: 1 }}>+ Add Reading</Btn>
          <Btn onClick={() => exportLog('Cargo Heating Log', entries, COLS)} color={S.dm}>⬇ Export</Btn>
        </div>
      </Card>
      <Card>
        <SectionLabel text={`Heating Log (${entries.length})`} color={ACC} />
        <LogTable entries={entries} columns={COLS} onDelete={del} accent={ACC} />
      </Card>
    </div>
  );
}

function TankerMSDS() {
  const ACC = VESSEL_COLORS.tanker.accent;
  const KEY = 'cargo_tanker_msds';
  const [sheets, setSheets] = useState(() => load(KEY, []));
  const [form, setForm] = useState({ cargo: '', flashPt: '', bpt: '', vaporDensity: '', toxicity: 'Low', h2sContent: 'None', emergency: '', ppe: 'Full Chemical Suit', remarks: '' });
  const set = k => e => setForm(f => ({ ...f, [k]: e.target.value }));
  const add = () => { if (!form.cargo) return; const e = [...sheets, { ...form, ts: new Date().toISOString().slice(0,10) }]; setSheets(e); save(KEY, e); setForm(f => ({ cargo: '', flashPt: '', bpt: '', vaporDensity: '', toxicity: 'Low', h2sContent: 'None', emergency: '', ppe: 'Full Chemical Suit', remarks: '' })); };
  const del = i => { const e = sheets.filter((_, j) => j !== i); setSheets(e); save(KEY, e); };
  return (
    <div>
      <Card style={{ marginBottom: 10 }}>
        <SectionLabel text="Add MSDS / Cargo Data Sheet" color={ACC} />
        <Field label="Cargo Name / Product" value={form.cargo} onChange={set('cargo')} placeholder="e.g. Crude Oil, Naphtha, Palm Oil" />
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 10px' }}>
          <Field label="Flash Point" value={form.flashPt} onChange={set('flashPt')} placeholder="°C" unit="°C" />
          <Field label="Boiling Point" value={form.bpt} onChange={set('bpt')} placeholder="°C" unit="°C" />
          <Field label="Vapor Density (Air=1)" value={form.vaporDensity} onChange={set('vaporDensity')} placeholder="e.g. 3.5" />
          <div style={{ marginBottom: 8 }}>
            <div style={{ color: S.dm, fontSize: S.lb, marginBottom: 3 }}>Toxicity</div>
            <select value={form.toxicity} onChange={set('toxicity')} style={{ width: '100%', background: S.bg3, color: form.toxicity === 'Low' ? S.gn : form.toxicity === 'Medium' ? S.gd : S.rd, border: `1px solid ${S.bd2}`, borderRadius: 5, padding: '6px 8px', fontSize: S.xs }}>
              {['Low','Medium','High','Extremely High'].map(t => <option key={t}>{t}</option>)}
            </select>
          </div>
          <div style={{ marginBottom: 8 }}>
            <div style={{ color: S.dm, fontSize: S.lb, marginBottom: 3 }}>H₂S Content</div>
            <select value={form.h2sContent} onChange={set('h2sContent')} style={{ width: '100%', background: S.bg3, color: form.h2sContent === 'None' ? S.gn : S.rd, border: `1px solid ${S.bd2}`, borderRadius: 5, padding: '6px 8px', fontSize: S.xs }}>
              {['None','Trace < 1ppm','Low 1-10ppm','High > 10ppm'].map(t => <option key={t}>{t}</option>)}
            </select>
          </div>
          <div style={{ marginBottom: 8 }}>
            <div style={{ color: S.dm, fontSize: S.lb, marginBottom: 3 }}>Required PPE</div>
            <select value={form.ppe} onChange={set('ppe')} style={{ width: '100%', background: S.bg3, color: S.cy, border: `1px solid ${S.bd2}`, borderRadius: 5, padding: '6px 8px', fontSize: S.xs }}>
              {['Standard Coveralls','Chemical Resistant Gloves','Full Chemical Suit','SCBA Required','Airline Breathing Apparatus'].map(t => <option key={t}>{t}</option>)}
            </select>
          </div>
        </div>
        <Field label="Emergency Response Summary" value={form.emergency} onChange={set('emergency')} placeholder="Fire: CO2/Foam. Spillage: contain and ventilate…" />
        <Field label="Additional Remarks" value={form.remarks} onChange={set('remarks')} placeholder="Cargo-specific notes, handling precautions…" />
        <Btn onClick={add} color={ACC} style={{ width: '100%', marginTop: 4 }}>+ Save MSDS Entry</Btn>
      </Card>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {sheets.length === 0
          ? <Card><div style={{ color: S.vd, fontSize: S.xs, textAlign: 'center', padding: '12px 0' }}>No MSDS entries saved</div></Card>
          : sheets.map((s, i) => (
            <Card key={i}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 6 }}>
                <div>
                  <div style={{ color: ACC, fontWeight: 700, fontSize: S.sm }}>{s.cargo}</div>
                  <div style={{ color: S.dm, fontSize: S.lb }}>Saved {s.ts}</div>
                </div>
                <div style={{ display: 'flex', gap: 4 }}>
                  <Badge text={s.toxicity} color={s.toxicity === 'Low' ? S.gn : s.toxicity === 'Medium' ? S.gd : S.rd} />
                  <button onClick={() => del(i)} style={{ background: 'transparent', border: 'none', color: S.rd, cursor: 'pointer', fontSize: '0.8rem' }}>✕</button>
                </div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 4 }}>
                {[['Flash Pt', s.flashPt ? s.flashPt + '°C' : '—'], ['Boil Pt', s.bpt ? s.bpt + '°C' : '—'], ['H₂S', s.h2sContent], ['Vapor Density', s.vaporDensity || '—'], ['PPE', s.ppe]].map(([k, v]) => (
                  <div key={k}><div style={{ color: S.dm, fontSize: '0.52rem' }}>{k}</div><div style={{ color: S.tx, fontSize: S.lb, fontWeight: 600 }}>{v}</div></div>
                ))}
              </div>
              {s.emergency && <div style={{ marginTop: 6, background: 'rgba(255,71,87,0.08)', borderRadius: 4, padding: '5px 7px', color: S.rd, fontSize: S.lb }}>🚨 {s.emergency}</div>}
            </Card>
          ))}
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// CONTAINER SHIP TABS
// ══════════════════════════════════════════════════════════════════════════════
// ══════════════════════════════════════════════════════════════════════════════
// CONTAINER SHIP TABS — Live Cargo Operations + Reefer Rounds
// (Replaces old ContainerBayPlan / ContainerReefer / ContainerOOG / ContainerLashing)
// ══════════════════════════════════════════════════════════════════════════════

// ── Container Live Ops helpers (scoped to this section) ──
const clPad = n => String(n).padStart(2, '0');
const clNow = () => new Date().toTimeString().slice(0,5);
const clNowFull = () => new Date().toISOString().slice(0,16).replace('T',' ');
const ACC = VESSEL_COLORS.container.accent;

// ── Per-container model constants (Step 1 addition) ──
// Used by ContainerSearch, BayGridView, and the lashing/reefer/OOG status views.
// components below. These are additive — they do not alter any existing
// bay-level aggregate field or calculation.
const DG_CLASSES = ['', '1', '2', '3', '4', '5', '6', '7', '8', '9'];
const HOLD_DECK_OPTIONS = ['Deck', 'Hold'];
const CONTAINER_SIZE_OPTIONS = ['20', '40', '45'];
const CONTAINER_TYPE_OPTIONS = ['GP', 'HC', 'RF', 'OT', 'FR', 'TK'];

// ─── SHIP PARTICULARS (Firestore-persisted vessel bay/row/tier design) ─────
// Matches the persistence pattern already used in sheets.js: a single small
// Firestore document under the app_cache collection, with an IndexedDB
// mirror as a fast local fallback. Unlike route/chart data, ship particulars
// are small (one doc per vessel, no chunking needed).
const SHIP_PARTICULARS_DOC = 'ship_particulars';
const SHIP_PARTICULARS_IDB_KEY = 'cargo_ship_particulars_cache';

async function saveShipParticulars(particulars) {
  const record = { ...particulars, updatedAt: new Date().toISOString() };
  try {
    await setDoc(doc(db, 'app_cache', SHIP_PARTICULARS_DOC), record);
  } catch (e) {
    console.warn('saveShipParticulars: Firestore write failed, saved locally only:', e?.message);
  }
  await idbSetCargo(SHIP_PARTICULARS_IDB_KEY, record); // local mirror, always written
  return record;
}

async function loadShipParticulars() {
  try {
    const snap = await getDoc(doc(db, 'app_cache', SHIP_PARTICULARS_DOC));
    if (snap.exists()) {
      const data = snap.data();
      await idbSetCargo(SHIP_PARTICULARS_IDB_KEY, data); // refresh local mirror
      return data;
    }
  } catch (e) {
    console.warn('loadShipParticulars: Firestore read failed, trying local cache:', e?.message);
  }
  // Firestore unavailable or doc doesn't exist yet — fall back to local cache.
  return await idbGetCargo(SHIP_PARTICULARS_IDB_KEY, null);
}

async function deleteShipParticulars() {
  try {
    await setDoc(doc(db, 'app_cache', SHIP_PARTICULARS_DOC), { deleted: true, updatedAt: new Date().toISOString() });
  } catch (e) {
    console.warn('deleteShipParticulars: Firestore write failed:', e?.message);
  }
  await idbDeleteCargo(SHIP_PARTICULARS_IDB_KEY);
}

// Generates row labels for one side of the centerline, per the confirmed
// convention: Port = even numbers (02,04,06...), Starboard = odd (01,03,05...),
// counting outward from the centerline up to the configured max count.
function generateRowLabels(maxPort, maxStbd) {
  // Port (even) and starboard (odd) are two independent counting sequences
  // from the centerline, not one combined ascending sequence. Correct
  // display order, confirmed against a real stowage plan: port descending
  // from its outermost row down to 02, then starboard ascending from 01
  // out to its outermost row — e.g. 12,10,08,06,04,02,01,03,05,07,09,11.
  // The centerline pair (02 | 01) sits in the middle, not at either edge.
  const port = [];
  for (let i = (maxPort || 0); i >= 1; i--) port.push(String(i * 2).padStart(2, '0'));
  const stbd = [];
  for (let i = 0; i < (maxStbd || 0); i++) stbd.push(String(i * 2 + 1).padStart(2, '0'));
  return [...port, ...stbd];
}

// Generates tier labels per the confirmed convention: Hold = 02,04,06...
// up to maxTierHold; Deck = 72,74,76... up to maxTierDeck (count of deck
// tier levels, not the raw max number — e.g. maxTierDeck=4 => 72,74,76,78).
function generateTierLabels(maxTierHold, maxTierDeck) {
  const hold = [];
  for (let i = 1; i <= (maxTierHold || 0); i++) hold.push(String(i * 2).padStart(2, '0'));
  const deck = [];
  for (let i = 0; i < (maxTierDeck || 0); i++) deck.push(String(72 + i * 2).padStart(2, '0'));
  return { holdTiers: hold, deckTiers: deck };
}

// Builds the complete blank row/tier skeleton for one bay from its ship
// particulars entry, independent of whether any containers exist yet.
// This is the foundation BayGridView now renders from — every valid slot
// is shown (blank if empty), not just slots where containers happen to exist.
function buildEmptyGridFromParticulars(bayParticulars) {
  if (!bayParticulars) return null;
  const rows = generateRowLabels(bayParticulars.maxRowPort, bayParticulars.maxRowStbd);
  const { holdTiers, deckTiers } = generateTierLabels(bayParticulars.maxTierHold, bayParticulars.maxTierDeck);
  // items must always be an array (even when empty) — BayGridSection reads
  // section.items.length unconditionally once tiers/rows are non-empty.
  return {
    deck: { tiers: deckTiers.slice().sort((a, b) => parseInt(b, 10) - parseInt(a, 10)), rows, cellMap: {}, items: [] },
    hold: { tiers: holdTiers.slice().sort((a, b) => parseInt(b, 10) - parseInt(a, 10)), rows, cellMap: {}, items: [] },
  };
}

// Overlays real containers onto a blank skeleton (from buildEmptyGridFromParticulars)
// without losing any blank slot — every position from the skeleton survives;
// matching containers just populate their cellMap entry. items is rebuilt
// from the actual matched containers so BayGridSection's count/length reads
// stay accurate after the overlay.
function overlayContainersOnGrid(skeleton, containers) {
  if (!skeleton) return skeleton;
  const deckCellMap = { ...skeleton.deck.cellMap };
  const holdCellMap = { ...skeleton.hold.cellMap };
  (containers || []).forEach(c => {
    const key = `${c.row}_${c.tier}`;
    if (c.holdDeck === 'Deck') deckCellMap[key] = c;
    else holdCellMap[key] = c;
  });
  return {
    deck: { ...skeleton.deck, cellMap: deckCellMap, items: Object.values(deckCellMap) },
    hold: { ...skeleton.hold, cellMap: holdCellMap, items: Object.values(holdCellMap) },
  };
}

// Real-world container vessel bay numbering:
// - 'odd'  : 20ft bay slots only, step 2  (e.g. 01,03,05...95)
// - 'even2': 40ft bay slots, step 2       (e.g. 02,04,06...96) - rare, dense 40ft-capable layout
// - 'even4': 40ft bay slots, step 4       (e.g. 02,06,10,14...82) - MOST COMMON on modern container ships
// - 'all'  : every integer, step 1        (e.g. 01,02,03...) - small feeders only
// - 'custom': user-defined step
function generateBays(from, to, type, customStep) {
  const bays = [];
  let step = 1;
  let startParity = null; // null = no parity filter

  if (type === 'odd')    { step = 2; startParity = 1; }
  else if (type === 'even2') { step = 2; startParity = 0; }
  else if (type === 'even4') { step = 4; startParity = 0; }
  else if (type === 'all')   { step = 1; startParity = null; }
  else if (type === 'custom') { step = Math.max(1, parseInt(customStep) || 4); startParity = null; }

  // Align start to the correct parity/step so we don't skip the first valid bay
  let i = from;
  if (startParity !== null) {
    while (i % 2 !== startParity) i++;
  }
  // For step>2 with a parity requirement (even4), walk forward in steps of `step`
  // starting from the first valid even number >= from.
  for (; i <= to; i += step) {
    bays.push(clPad(i));
  }
  return bays;
}

// Status colors
const STATUS_COLOR = {
  idle:       S.vd,
  inprogress: S.gd,
  completed:  S.gn,
  hold:       S.rd,
};
const STATUS_LABEL = {
  idle:       'IDLE',
  inprogress: 'IN PROGRESS',
  completed:  'DONE',
  hold:       'ON HOLD',
};

const ProgressBar = ({ pct, color, height=6 }) => (
  <div style={{ background:S.bg3, borderRadius:99, height, overflow:'hidden', width:'100%' }}>
    <div style={{ background:color||ACC, height:'100%', width:`${Math.min(100,pct||0)}%`, borderRadius:99, transition:'width 0.4s' }} />
  </div>
);

const StatBox = ({ label, value, color, sub }) => (
  <div style={{ background:S.bg3, borderRadius:8, padding:'8px 10px', textAlign:'center', flex:1 }}>
    <div style={{ color:S.dm, fontSize:S.lb, marginBottom:3 }}>{label}</div>
    <div style={{ color:color||S.cy, fontFamily:'monospace', fontSize:'0.92rem', fontWeight:700 }}>{value}</div>
    {sub && <div style={{ color:S.dm, fontSize:S.ti, marginTop:2 }}>{sub}</div>}
  </div>
);

// ─── BAY GRID VIEW (visual row/tier plan, additive) ──────────────────────────
// Renders a bay's containers as a real row×tier grid, split Deck/Hold, matching
// the layout convention confirmed from research: tiers >=70 = Deck (sorted
// high-to-low so the top tier renders at the top), tiers <=22 = Hold (same
// sort). Rows are whatever values are actually present in the data, sorted to
// radiate outward from the centerline (00, then 01/02, 03/04, ...).
// Pure function — no side effects, easy to verify independent of rendering.
// ─── MASTER-BAY GROUPING (shared across grid, lashing, reefer, OOG) ─────────
// Real container vessels: even bay numbers are 40ft slots; the odd bays
// immediately before/after share the same physical deck space (e.g. bay 22
// is one 40ft slot occupying the same footprint as 20ft bays 21 + 23).
// This groups the flat bay list into "master bay" units keyed by the even
// (40ft) bay number, each holding its own bay plus up to two 20ft neighbors.
// Bays that don't fit this odd/even adjacency (e.g. unusual numbering from
// an import) are kept as their own single-bay group so nothing is dropped.
function groupBaysByMasterBay(bays) {
  const byNumber = {};
  bays.forEach(b => { byNumber[parseInt(b.bay, 10)] = b; });

  const used = new Set();
  const groups = [];

  // Pass 1: even bays with odd neighbors present become a master group.
  bays.forEach(b => {
    const n = parseInt(b.bay, 10);
    if (isNaN(n) || n % 2 !== 0) return; // only even (40ft) bays anchor a group
    if (used.has(b.bay)) return;
    const oddBefore = byNumber[n - 1];
    const oddAfter = byNumber[n + 1];
    const members = [b];
    if (oddBefore) members.push(oddBefore);
    if (oddAfter) members.push(oddAfter);
    members.forEach(m => used.add(m.bay));
    groups.push({ masterBay: b.bay, fortyFt: b, twentyFt: [oddBefore, oddAfter].filter(Boolean), members });
  });

  // Pass 2: anything left over (odd bays with no even neighbor, or odd-only
  // numbering schemes) becomes its own single-bay group.
  bays.forEach(b => {
    if (used.has(b.bay)) return;
    used.add(b.bay);
    groups.push({ masterBay: b.bay, fortyFt: null, twentyFt: [b], members: [b] });
  });

  groups.sort((a, b) => parseInt(a.masterBay, 10) - parseInt(b.masterBay, 10));
  return groups;
}

// ─── PORT FILTER (loading/discharging/departure/all-plan view) ─────────────
// A BAPLIE/MSC-XML file is a full-voyage snapshot — every container aboard
// the ship, regardless of which port loaded it or which port discharges it.
// This derives, for a given selected port and mode, which containers should
// be highlighted vs dimmed, so the person can isolate just this port's
// loading work, just this port's discharge work, the resulting departure
// condition, or the unfiltered full plan.
const PORT_FILTER_MODES = [
  ['loading', 'Loading'],
  ['discharging', 'Discharging'],
  ['departure', 'Departure Plan'],
  ['all', 'All Plan'],
];

// Collects every distinct port code appearing as a POL or POD across all
// containers, so the dropdown reflects what's actually in the imported file
// rather than a hardcoded list.
function collectPortsFromContainers(containers) {
  const ports = new Set();
  containers.forEach(c => {
    if (c.pol) ports.add(c.pol);
    if (c.pod) ports.add(c.pod);
  });
  return [...ports].sort();
}

// Returns { highlightedIds: Set<string>, newIds: Set<string> }.
// highlightedIds = containers relevant to the current mode (full color).
// Everything else should render dimmed by the caller.
// newIds (departure mode only) = containers loaded at this port and still
// aboard after it — marked distinctly so they're not confused with cargo
// that was already on the ship before this call.
function getPortFilterState(containers, selectedPort, mode) {
  const highlightedIds = new Set();
  const newIds = new Set();
  if (!selectedPort || mode === 'all') {
    containers.forEach(c => highlightedIds.add(c.id));
    return { highlightedIds, newIds, mode, selectedPort };
  }
  containers.forEach(c => {
    if (mode === 'loading' && c.pol === selectedPort) {
      highlightedIds.add(c.id);
    } else if (mode === 'discharging' && c.pod === selectedPort) {
      highlightedIds.add(c.id);
    } else if (mode === 'departure') {
      // Remains aboard after this port = not discharged here.
      if (c.pod !== selectedPort) {
        highlightedIds.add(c.id);
        if (c.pol === selectedPort) newIds.add(c.id); // newly loaded here, still aboard
      }
    }
  });
  return { highlightedIds, newIds, mode, selectedPort };
}

function PortFilterBar({ ports, selectedPort, onSelectPort, mode, onSelectMode }) {
  return (
    <div style={{ background:S.bg3, borderRadius:8, padding:'8px 10px', marginBottom:8 }}>
      <div style={{ display:'flex', gap:6, alignItems:'center', marginBottom:8, flexWrap:'wrap' }}>
        <span style={{ color:S.dm, fontSize:S.lb }}>Port:</span>
        <select value={selectedPort} onChange={e=>onSelectPort(e.target.value)} style={{
          flex:1, minWidth:100, background:S.bg2, color:ACC, border:`1px solid ${S.bd2}`,
          borderRadius:5, padding:'5px 7px', fontSize:S.xs, fontFamily:'monospace',
        }}>
          <option value=''>— Select Port —</option>
          {ports.map(p => <option key={p} value={p}>{p}</option>)}
        </select>
      </div>
      <div style={{ display:'flex', gap:4, flexWrap:'wrap' }}>
        {PORT_FILTER_MODES.map(([v,l]) => (
          <button key={v} onClick={()=>onSelectMode(v)} style={{
            flex:'1 1 calc(50% - 4px)', background:mode===v?`${ACC}20`:'transparent',
            border:`1px solid ${mode===v?ACC:S.vd}`, color:mode===v?ACC:S.dm,
            borderRadius:5, padding:'6px 4px', fontSize:S.ti, cursor:'pointer', fontWeight:mode===v?700:400,
          }}>{l}</button>
        ))}
      </div>
    </div>
  );
}

// ─── MERGED MASTER-BAY GRID (real paper-plan semantics) ────────────────────
// Confirmed via research + the real stowage plan reference: a 20ft bay and
// its 40ft "master" partner share the SAME physical row/tier slot space —
// one square on the paper plan equals one 20ft unit. A 40ft container draws
// as one wide block spanning two 20ft slots ("Russian"/mixed stowage is the
// reverse: two 20ft containers filling what would otherwise be one 40ft
// slot). This builds ONE unified grid per master-bay group instead of
// separate grids per member bay, matching that real-world layout exactly.
function buildMergedGroupGrid(group) {
  const fortyFt = group.fortyFt;
  const oddBays = group.twentyFt || [];

  const fortyFtContainers = fortyFt ? (fortyFt.containers || []) : [];
  // Two 20ft neighbors are possible (one fwd, one aft of the 40ft bay).
  const oddContainersByBay = oddBays.map(b => ({ bay: b.bay, containers: b.containers || [] }));

  // Union of every row/tier actually present across all member bays —
  // rows/tiers are shared coordinates, so this is the merged grid's axes.
  const allContainers = [
    ...fortyFtContainers,
    ...oddContainersByBay.flatMap(o => o.containers),
  ];

  const buildSection = (holdOrDeck) => {
    const relevant = allContainers.filter(c =>
      holdOrDeck === 'Deck' ? (parseInt(c.tier, 10) >= 70 || c.holdDeck === 'Deck') : !(parseInt(c.tier, 10) >= 70 || c.holdDeck === 'Deck')
    );
    const tiers = [...new Set(relevant.map(c => c.tier).filter(Boolean))]
      .sort((a, b) => parseInt(b, 10) - parseInt(a, 10));
    const rows = [...new Set(relevant.map(c => c.row).filter(Boolean))]
      .sort((a, b) => parseInt(a, 10) - parseInt(b, 10));

    const cellMap = {};
    rows.forEach(row => {
      tiers.forEach(tier => {
        const key = `${row}_${tier}`;
        const fortyC = fortyFtContainers.find(c => c.row === row && c.tier === tier);
        if (fortyC) {
          cellMap[key] = { type: '40ft', container: fortyC };
          return;
        }
        const oddMatches = oddContainersByBay
          .map(o => ({ bay: o.bay, container: o.containers.find(c => c.row === row && c.tier === tier) }))
          .filter(m => m.container);
        if (oddMatches.length === 2) {
          // Both 20ft neighbor slots filled at this position — equivalent
          // to the 40ft footprint being full ("Russian"/mixed stowage).
          cellMap[key] = { type: '40ft-equivalent', containers: oddMatches.map(m => m.container), bays: oddMatches.map(m => m.bay) };
        } else if (oddMatches.length === 1) {
          cellMap[key] = { type: '20ft', container: oddMatches[0].container, bay: oddMatches[0].bay };
        }
        // else: leave unset -> renders as a blank slot
      });
    });

    return { tiers, rows, cellMap, items: relevant };
  };

  return { deck: buildSection('Deck'), hold: buildSection('Hold') };
}

function groupContainersForGrid(containers) {
  const list = containers || [];
  const deckList = list.filter(c => parseInt(c.tier, 10) >= 70 || c.holdDeck === 'Deck');
  const holdList = list.filter(c => !(parseInt(c.tier, 10) >= 70 || c.holdDeck === 'Deck'));

  const buildSection = (items) => {
    const tiers = [...new Set(items.map(c => c.tier).filter(Boolean))]
      .sort((a, b) => parseInt(b, 10) - parseInt(a, 10)); // high tier at top
    const rows = [...new Set(items.map(c => c.row).filter(Boolean))]
      .sort((a, b) => parseInt(a, 10) - parseInt(b, 10)); // radiate outward (00 first)
    const cellMap = {};
    items.forEach(c => { cellMap[`${c.row}_${c.tier}`] = c; });
    return { tiers, rows, cellMap, items };
  };

  return { deck: buildSection(deckList), hold: buildSection(holdList) };
}

const GRID_FILTERS = [
  ['all', 'All', S.dm],
  ['dg', 'DG', S.rd],
  ['reefer', 'Reefer', S.cy],
  ['oog', 'OOG', S.or],
];

function GridFilterBar({ active, onChange }) {
  return (
    <div style={{ display:'flex', gap:5, marginBottom:8 }}>
      {GRID_FILTERS.map(([key, label, color]) => (
        <button key={key} onClick={()=>onChange(key)} style={{
          flex:1, background:active===key?`${color}20`:'transparent',
          border:`1px solid ${active===key?color:S.vd}`, color:active===key?color:S.dm,
          borderRadius:5, padding:'5px 4px', fontSize:S.ti, cursor:'pointer', fontWeight:active===key?700:400,
        }}>{label}</button>
      ))}
    </div>
  );
}

function gridCellMatchesFilter(container, filter) {
  if (!container) return false;
  if (filter === 'all') return true;
  if (filter === 'dg') return !!container.dgClass;
  if (filter === 'reefer') return !!container.reefer;
  if (filter === 'oog') return !!container.oog;
  return true;
}

function gridCellColor(container) {
  if (!container) return null;
  if (container.dgClass) return S.rd;
  if (container.reefer) return S.cy;
  if (container.oog) return S.or;
  return ACC;
}

function BayGridSection({ title, section, filter, onCellClick, portFilterState }) {
  if (!section || !Array.isArray(section.tiers) || !Array.isArray(section.rows) || section.tiers.length === 0 || section.rows.length === 0) {
    return (
      <div style={{ marginBottom:10 }}>
        <SectionLabel text={title} color={S.dm} />
        <div style={{ color:S.vd, fontSize:S.ti, fontStyle:'italic', padding:'6px 0' }}>No {title.toLowerCase()} containers in this bay</div>
      </div>
    );
  }
  return (
    <div style={{ marginBottom:10 }}>
      <SectionLabel text={`${title} (${(section.items || []).length})`} color={S.dm} />
      <div style={{ overflowX:'auto' }}>
        <div style={{ display:'inline-block', minWidth:'100%' }}>
          {/* Row header */}
          <div style={{ display:'flex', gap:2, marginBottom:2 }}>
            <div style={{ width:34, flexShrink:0 }} />
            {section.rows.map(r => (
              <div key={r} style={{ width:34, flexShrink:0, textAlign:'center', color:S.dm, fontSize:S.ti, fontFamily:'monospace' }}>{r}</div>
            ))}
          </div>
          {/* Tier rows, top (highest tier) to bottom */}
          {section.tiers.map(tier => (
            <div key={tier} style={{ display:'flex', gap:2, marginBottom:2 }}>
              <div style={{ width:34, flexShrink:0, textAlign:'right', color:S.dm, fontSize:S.ti, fontFamily:'monospace', paddingRight:4 }}>{tier}</div>
              {section.rows.map(r => {
                const c = section.cellMap[`${r}_${tier}`];
                const attrMatches = gridCellMatchesFilter(c, filter);
                // Combine the DG/Reefer/OOG attribute filter with the port filter
                // (loading/discharging/departure/all) — a cell only stays full
                // opacity if it matches both active filters. Checks mode/
                // selectedPort explicitly rather than inferring from set size,
                // since 'all' mode populates highlightedIds with everything.
                const portFilterActive = portFilterState && portFilterState.mode && portFilterState.mode !== 'all' && portFilterState.selectedPort;
                const portMatches = !portFilterActive || !c || portFilterState.highlightedIds.has(c.id);
                const matches = attrMatches && portMatches;
                const isNew = portFilterState && c && portFilterState.newIds && portFilterState.newIds.has(c.id);
                const color = gridCellColor(c);
                // Cell shows the container's POD code (real destination port), not the container ID.
                const podLabel = c ? (c.pod || '—') : '';
                return (
                  <div key={r} title={c ? `${c.id} → POD ${c.pod || '—'} (${c.size}'${c.type})${isNew ? ' [NEW]' : ''}` : ''}
                    onClick={() => c && onCellClick && onCellClick(c)}
                    style={{
                    width:34, height:30, flexShrink:0, borderRadius:4, position:'relative',
                    background: c ? (matches ? `${color}25` : `${color}08`) : S.bg3,
                    border: `1px solid ${c ? (matches ? color : S.vd) : S.vd}`,
                    borderWidth: isNew ? 2 : 1,
                    opacity: c && !matches ? 0.3 : 1,
                    display:'flex', alignItems:'center', justifyContent:'center',
                    fontSize:'0.42rem', color: c ? color : S.vd, fontFamily:'monospace', fontWeight:700,
                    overflow:'hidden', cursor: c ? 'pointer' : 'default',
                  }}>
                    {podLabel}
                    {isNew && <span style={{ position:'absolute', top:-2, right:-2, width:7, height:7, borderRadius:'50%', background:S.gn, border:`1px solid ${S.bg}` }} />}
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function BayGridView({ bay, onCellClick, portFilterState, bayParticulars }) {
  const [filter, setFilter] = useState('all');
  const containers = bay.containers || [];

  // Prefer the ship-particulars skeleton (full bay design, every slot shown)
  // when available. Falls back to deriving the grid purely from whatever
  // containers exist, so bays/voyages without particulars set up yet still
  // show something rather than nothing.
  const skeleton = bayParticulars ? buildEmptyGridFromParticulars(bayParticulars) : null;
  const grouped = skeleton ? overlayContainersOnGrid(skeleton, containers) : groupContainersForGrid(containers);

  if (!skeleton && containers.length === 0) {
    return (
      <div style={{ background:S.bg3, borderRadius:7, padding:'16px 12px', textAlign:'center', marginBottom:6 }}>
        <div style={{ color:S.vd, fontSize:S.xs, fontStyle:'italic' }}>
          No ship particulars or container data for this bay yet — set up Ship Particulars or import a loading plan to see the grid
        </div>
      </div>
    );
  }

  return (
    <div style={{ background:S.bg3, borderRadius:7, padding:'10px', marginBottom:6 }}>
      <GridFilterBar active={filter} onChange={setFilter} />
      <BayGridSection title="Deck" section={grouped.deck} filter={filter} onCellClick={onCellClick} portFilterState={portFilterState} />
      <BayGridSection title="Hold" section={grouped.hold} filter={filter} onCellClick={onCellClick} portFilterState={portFilterState} />
      <div style={{ display:'flex', gap:10, flexWrap:'wrap', marginTop:4 }}>
        {[['DG',S.rd],['Reefer',S.cy],['OOG',S.or],['Standard',ACC]].map(([l,c])=>(
          <span key={l} style={{ fontSize:S.ti, color:c }}>■ {l}</span>
        ))}
        {portFilterState && portFilterState.newIds && portFilterState.newIds.size > 0 && (
          <span style={{ fontSize:S.ti, color:S.gn }}>● NEW (loaded this port)</span>
        )}
      </div>
    </div>
  );
}

// ─── MERGED BAY GRID SECTION/VIEW (real paper-plan unified grid) ────────────
// Renders ONE grid for an entire master-bay group (40ft bay + its 20ft
// neighbors), with row/tier headers shown once — matching the real stowage
// plan where one square = one 20ft slot, and a 40ft container draws as a
// wider block spanning two slots. Replaces showing each member bay as a
// separate grid.
function MergedBayGridSection({ title, section, filter, onCellClick, portFilterState }) {
  if (!section || !Array.isArray(section.tiers) || !Array.isArray(section.rows) || section.tiers.length === 0 || section.rows.length === 0) {
    return (
      <div style={{ marginBottom:10 }}>
        <SectionLabel text={title} color={S.dm} />
        <div style={{ color:S.vd, fontSize:S.ti, fontStyle:'italic', padding:'6px 0' }}>No {title.toLowerCase()} containers in this bay group</div>
      </div>
    );
  }
  return (
    <div style={{ marginBottom:10 }}>
      <SectionLabel text={`${title} (${(section.items || []).length})`} color={S.dm} />
      <div style={{ overflowX:'auto' }}>
        <div style={{ display:'inline-block', minWidth:'100%' }}>
          <div style={{ display:'flex', gap:2, marginBottom:2 }}>
            <div style={{ width:34, flexShrink:0 }} />
            {section.rows.map(r => (
              <div key={r} style={{ width:34, flexShrink:0, textAlign:'center', color:S.dm, fontSize:S.ti, fontFamily:'monospace' }}>{r}</div>
            ))}
          </div>
          {section.tiers.map(tier => (
            <div key={tier} style={{ display:'flex', gap:2, marginBottom:2 }}>
              <div style={{ width:34, flexShrink:0, textAlign:'right', color:S.dm, fontSize:S.ti, fontFamily:'monospace', paddingRight:4 }}>{tier}</div>
              {section.rows.map(r => {
                const cell = section.cellMap[`${r}_${tier}`];
                if (!cell) {
                  return <div key={r} style={{ width:34, height:30, flexShrink:0, borderRadius:4, background:S.bg3, border:`1px solid ${S.vd}` }} />;
                }

                // Resolve display container(s), filter/port-filter matching,
                // and the visual treatment per cell type.
                const isFortyFt = cell.type === '40ft' || cell.type === '40ft-equivalent';
                const displayContainers = cell.type === '40ft-equivalent' ? cell.containers : [cell.container];
                const anyAttrMatch = displayContainers.some(c => gridCellMatchesFilter(c, filter));
                const portFilterActive = portFilterState && portFilterState.mode && portFilterState.mode !== 'all' && portFilterState.selectedPort;
                const anyPortMatch = !portFilterActive || displayContainers.some(c => portFilterState.highlightedIds.has(c.id));
                const matches = anyAttrMatch && anyPortMatch;
                const color = gridCellColor(displayContainers[0]);
                const podLabel = isFortyFt ? '40FT' : (cell.container.pod || '—');
                const tooltip = cell.type === '40ft-equivalent'
                  ? `${cell.containers[0].id} + ${cell.containers[1].id} (2x20ft, bays ${cell.bays.join('/')})`
                  : cell.type === '40ft'
                    ? `${cell.container.id} (40ft, bay ${cell.container.bay})`
                    : `${cell.container.id} → POD ${cell.container.pod || '—'} (20ft, bay ${cell.bay})`;

                return (
                  <div key={r} title={tooltip}
                    onClick={() => onCellClick && onCellClick(displayContainers[0])}
                    style={{
                      width:34, height:30, flexShrink:0, borderRadius:4,
                      background: matches ? `${color}25` : `${color}08`,
                      border: `1px solid ${matches ? color : S.vd}`,
                      borderStyle: isFortyFt ? 'double' : 'solid',
                      opacity: matches ? 1 : 0.35,
                      display:'flex', alignItems:'center', justifyContent:'center',
                      fontSize: isFortyFt ? '0.38rem' : '0.42rem', color, fontFamily:'monospace', fontWeight:700,
                      overflow:'hidden', cursor:'pointer',
                    }}>
                    {podLabel}
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function MergedBayGridView({ group, onCellClick, portFilterState }) {
  const [filter, setFilter] = useState('all');
  const totalContainers = group.members.reduce((s, b) => s + (b.containers ? b.containers.length : 0), 0);

  if (totalContainers === 0) {
    return (
      <div style={{ background:S.bg3, borderRadius:7, padding:'16px 12px', textAlign:'center', marginBottom:6 }}>
        <div style={{ color:S.vd, fontSize:S.xs, fontStyle:'italic' }}>
          No container-level data for this bay group yet — import a loading plan to see the grid
        </div>
      </div>
    );
  }

  const merged = buildMergedGroupGrid(group);

  return (
    <div style={{ background:S.bg3, borderRadius:7, padding:'10px', marginBottom:6 }}>
      <GridFilterBar active={filter} onChange={setFilter} />
      <MergedBayGridSection title="Deck" section={merged.deck} filter={filter} onCellClick={onCellClick} portFilterState={portFilterState} />
      <MergedBayGridSection title="Hold" section={merged.hold} filter={filter} onCellClick={onCellClick} portFilterState={portFilterState} />
      <div style={{ display:'flex', gap:10, flexWrap:'wrap', marginTop:4 }}>
        {[['DG',S.rd],['Reefer',S.cy],['OOG',S.or],['Standard',ACC]].map(([l,c])=>(
          <span key={l} style={{ fontSize:S.ti, color:c }}>■ {l}</span>
        ))}
        <span style={{ fontSize:S.ti, color:S.dm }}>▭ double border = 40ft</span>
        {portFilterState && portFilterState.newIds && portFilterState.newIds.size > 0 && (
          <span style={{ fontSize:S.ti, color:S.gn }}>● NEW (loaded this port)</span>
        )}
      </div>
    </div>
  );
}

// ─── SETUP WIZARD ────────────────────────────────────────────────────────────
function SetupWizard({ onSave }) {
  const [port,     setPort]     = useState('');
  const [vessel,   setVessel]   = useState('');
  const [bayFrom,  setBayFrom]  = useState('1');
  const [bayTo,    setBayTo]    = useState('55');
  const [bayType,  setBayType]  = useState('even4');
  const [customStep, setCustomStep] = useState('4');
  const [gantries, setGantries] = useState('2');
  const [movesPerHr, setMovesPerHr] = useState('25');
  const [totalLoad, setTotalLoad]   = useState('');
  const [totalDisch, setTotalDisch] = useState('');
  const [totalRest,  setTotalRest]  = useState('');

  const bayFromNum = parseInt(bayFrom) || 1;
  const bayToNum   = parseInt(bayTo)   || 1;
  const bayCount = generateBays(bayFromNum, bayToNum, bayType, customStep).length;
  const previewBays = generateBays(bayFromNum, bayToNum, bayType, customStep);

  return (
    <div style={{ padding:'16px 0' }}>
      <div style={{ background:`${ACC}10`, border:`1px solid ${ACC}30`, borderRadius:10,
        padding:'12px 14px', marginBottom:14 }}>
        <div style={{ color:ACC, fontWeight:700, fontSize:S.sm, marginBottom:2 }}>📦 New Port Call Setup</div>
        <div style={{ color:S.dm, fontSize:S.xs }}>Configure vessel and bay range for this port operation</div>
      </div>

      <Field label="Port Name" value={port} onChange={e=>setPort(e.target.value)} placeholder="e.g. Singapore, SGSIN" />
      <Field label="Vessel Name" value={vessel} onChange={e=>setVessel(e.target.value)} placeholder="e.g. MV EVER GIVEN" />

      <div style={{ background:S.bg3, borderRadius:8, padding:'10px 12px', marginBottom:10 }}>
        <SectionLabel text="Bay Range Configuration" color={ACC} />
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'0 10px' }}>
          <Field label="From Bay" value={bayFrom} onChange={e=>setBayFrom(e.target.value)} type="number" />
          <Field label="To Bay"   value={bayTo}   onChange={e=>setBayTo(e.target.value)}   type="number" />
        </div>
        <div style={{ marginBottom:8 }}>
          <div style={{ color:S.dm, fontSize:S.lb, marginBottom:5 }}>Bay Numbering Scheme</div>
          <div style={{ display:'flex', gap:6, flexWrap:'wrap' }}>
            {[
              ['even4','40ft step 4 (02,06,10…82)'],
              ['odd','20ft step 2 (01,03,05…)'],
              ['even2','40ft step 2 (02,04,06…)'],
              ['all','Every bay (step 1)'],
              ['custom','Custom step'],
            ].map(([v,l]) => (
              <button key={v} onClick={()=>setBayType(v)} style={{
                flex:'1 1 calc(50% - 6px)', minWidth:130, background:bayType===v?`${ACC}20`:'transparent',
                border:`1px solid ${bayType===v?ACC:S.vd}`,
                color:bayType===v?ACC:S.dm, borderRadius:6, padding:'6px 4px',
                fontSize:S.lb, cursor:'pointer', fontWeight:bayType===v?700:400,
              }}>{l}</button>
            ))}
          </div>
          {bayType === 'custom' && (
            <div style={{ marginTop:6 }}>
              <Field label="Custom Step (e.g. 4 = every 4th bay)" value={customStep}
                onChange={e=>setCustomStep(e.target.value)} type="number" placeholder="4" />
            </div>
          )}
        </div>
        <div style={{ color:bayCount>60?S.gd:S.gn, fontSize:S.xs, marginTop:4 }}>
          ✓ {bayCount} bays will be created
          {previewBays.length > 0 && <span style={{ color:S.dm }}> ({previewBays[0]} → {previewBays[previewBays.length-1]})</span>}
        </div>
        {bayCount > 60 && (
          <div style={{ background:'rgba(255,179,0,0.1)', border:`1px solid ${S.gd}44`, borderRadius:6, padding:'6px 9px', marginTop:6, color:S.gd, fontSize:S.xs }}>
            ⚠ {bayCount} bays is a lot — double check your numbering scheme. Most container vessels have 15-50 bays total. If this number looks too high, try "40ft step 4" instead of "Every bay".
          </div>
        )}
      </div>

      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'0 10px' }}>
        <Field label="Number of Gantry Cranes" value={gantries} onChange={e=>setGantries(e.target.value)} type="number" />
        <Field label="Moves per Hour / Gantry" value={movesPerHr} onChange={e=>setMovesPerHr(e.target.value)} type="number" unit="mvs" />
        <Field label="Total Planned Load" value={totalLoad} onChange={e=>setTotalLoad(e.target.value)} type="number" placeholder="0" unit="mvs" />
        <Field label="Total Planned Discharge" value={totalDisch} onChange={e=>setTotalDisch(e.target.value)} type="number" placeholder="0" unit="mvs" />
      </div>
      <Field label="Total Planned Restow" value={totalRest} onChange={e=>setTotalRest(e.target.value)} type="number" placeholder="0" unit="mvs" />

      <Btn onClick={() => {
        if (!port) return;
        const bays = generateBays(bayFromNum, bayToNum, bayType, customStep);
        if (bays.length > 200) {
          alert(`${bays.length} bays would be created — that's too many and may cause the app to slow down. Please check your bay range or numbering scheme.`);
          return;
        }
        onSave({
          port, vessel, bayType, customStep: parseInt(customStep)||4,
          bayFrom: bayFromNum, bayTo: bayToNum,
          gantries: Math.min(12, parseInt(gantries) || 1),
          movesPerHr: parseInt(movesPerHr) || 25,
          totalLoad: parseInt(totalLoad)||0,
          totalDisch: parseInt(totalDisch)||0,
          totalRest: parseInt(totalRest)||0,
          createdAt: clNowFull(),
          bays: bays.map(b => ({
            bay: b,
            status: 'idle',
            crane: '',
            planLoad: 0, planDisch: 0, planRest: 0,
            doneLoad: 0, doneDisch: 0, doneRest: 0,
            deckLoad: 0, deckDisch: 0,
            holdLoad: 0, holdDisch: 0,
            isDG: false, isReefer: false,
            startTime: '', endTime: '', notes: '',
            lashingDone: false,
            containers: [], // Step 1 addition: optional per-container records for this bay (search/DG/OOG/reefer)
          })),
        });
      }} color={ACC} style={{ width:'100%', marginTop:8, padding:'10px', fontSize:S.sm }}>
        🚀 Start Port Operation
      </Btn>
    </div>
  );
}

// ─── CONTAINER DETAIL MODAL ───────────────────────────────────────────────────
// Shown when a grid cell is tapped. Read-only — full info for one container.
function ContainerDetailModal({ container, onClose }) {
  if (!container) return null;
  const c = container;
  return (
    <div onClick={onClose} style={{
      position:'fixed', inset:0, background:'rgba(0,0,0,0.6)', zIndex:1000,
      display:'flex', alignItems:'center', justifyContent:'center', padding:16,
    }}>
      <div onClick={e=>e.stopPropagation()} style={{
        background:S.bg2, border:`1px solid ${S.bd}`, borderRadius:10,
        padding:'16px', maxWidth:340, width:'100%', maxHeight:'80vh', overflowY:'auto',
      }}>
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:10 }}>
          <span style={{ color:ACC, fontFamily:'monospace', fontWeight:900, fontSize:S.sm }}>{c.id}</span>
          <button onClick={onClose} style={{ background:'transparent', border:'none', color:S.dm, fontSize:'1rem', cursor:'pointer' }}>✕</button>
        </div>
        <div style={{ display:'flex', gap:5, flexWrap:'wrap', marginBottom:10 }}>
          {c.dgClass && <Badge text={`DG Class ${c.dgClass}`} color={S.rd} />}
          {c.reefer && <Badge text="Reefer" color={S.cy} />}
          {c.oog && <Badge text="OOG" color={S.or} />}
          {c.fullEmpty === 'empty' && <Badge text="Empty" color={S.dm} />}
        </div>
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:8 }}>
          {[
            ['Bay / Row / Tier', `${c.bay} / ${c.row} / ${c.tier}`],
            ['Hold or Deck', c.holdDeck],
            ['Size / Type', `${c.size||'—'}'${c.type||''}`],
            ['Weight', `${c.weight||0} kg`],
            ['POL', c.pol || '—'],
            ['POD', c.pod || '—'],
            ['Original POL', c.originalPol || '—'],
            ['Final Destination', c.finalDestination || '—'],
            ['Verified Weight', c.verifiedWeight ? 'Yes (VGM)' : 'No'],
          ].map(([l,v]) => (
            <div key={l}>
              <div style={{ color:S.dm, fontSize:S.ti }}>{l}</div>
              <div style={{ color:S.tx, fontSize:S.xs, fontWeight:600 }}>{v}</div>
            </div>
          ))}
        </div>
        {c.dgClasses && c.dgClasses.length > 0 && (
          <div style={{ marginTop:10, background:S.bg3, borderRadius:6, padding:'8px 10px' }}>
            <div style={{ color:S.rd, fontSize:S.ti, fontWeight:700, marginBottom:4 }}>Hazardous Cargo</div>
            {c.dgClasses.map((d,i) => (
              <div key={i} style={{ color:S.tx, fontSize:S.ti }}>Class {d.class} — UN {d.unNo || '—'}</div>
            ))}
          </div>
        )}
        {c.reefer && (
          <div style={{ marginTop:10, background:S.bg3, borderRadius:6, padding:'8px 10px' }}>
            <div style={{ color:S.cy, fontSize:S.ti, fontWeight:700, marginBottom:4 }}>Reefer Settings</div>
            <div style={{ color:S.tx, fontSize:S.ti }}>Set point: {c.reeferSetTemp || '—'}°C</div>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── MASTER BAY GROUP ─────────────────────────────────────────────────────────
// Wraps one 40ft bay + its 20ft neighbors (or a standalone bay) under a shared
// header, per the real-world convention that bay 22 (40ft) occupies the same
// physical deck space as bays 21+23 (20ft). Each member bay still renders its
// own full BayCard with independent status/progress — this is a display
// grouping only, not a data merge.
function MasterBayGroup({ group, gantries, movesPerHr, onUpdate, bayIndexMap, portFilterState, bayParticularsMap }) {
  const [selectedContainer, setSelectedContainer] = useState(null);
  const totalContainers = group.members.reduce((s, b) => s + (b.containers ? b.containers.length : 0), 0);
  // Label format matches the real paper stowage plan convention: the odd
  // (20ft) bay number is shown as the heading, with the even (40ft, master)
  // bay number in parentheses — e.g. "71(70)", "63(62)". When there's no
  // odd partner, or this is a standalone bay, just show its own number.
  const oddMember = group.members.find(b => parseInt(b.bay, 10) % 2 !== 0);
  const label = oddMember && group.fortyFt
    ? `Bay ${oddMember.bay}(${group.fortyFt.bay})`
    : `Bay ${group.masterBay}`;

  // Bay-level port filter relevance: a group is only "highlighted" if at
  // least one of its members has a container matching the active port
  // filter (loading/discharging/departure). In 'all' mode, or when no port
  // is selected, every group stays fully visible — this only dims groups
  // with zero relevant cargo for a genuinely active loading/discharging/
  // departure filter.
  const filterIsActive = portFilterState && portFilterState.mode && portFilterState.mode !== 'all' && portFilterState.selectedPort;
  const groupHasMatch = !filterIsActive || group.members.some(b =>
    (b.containers || []).some(c => portFilterState.highlightedIds.has(c.id))
  );

  // A merged grid only makes sense for an actual 40ft+20ft group (more than
  // one member). A standalone bay (no odd/even partner found) falls back to
  // its own BayCard-rendered grid, unchanged from before.
  const isMergeable = group.members.length > 1;

  return (
    <div style={{ border:`1px solid ${S.bd2}`, borderRadius:10, padding:'8px', marginBottom:8, background:'rgba(255,255,255,0.01)', opacity: groupHasMatch ? 1 : 0.35 }}>
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:6, padding:'0 4px' }}>
        <span style={{ color:S.dm, fontSize:S.ti, fontWeight:700, letterSpacing:0.5 }}>{label}</span>
        {totalContainers > 0 && <span style={{ color:S.dm, fontSize:S.ti }}>📦 {totalContainers} total</span>}
      </div>
      {group.members.map(b => (
        <BayCard key={b.bay} bay={b} idx={bayIndexMap[b.bay]}
          gantries={gantries} movesPerHr={movesPerHr}
          onUpdate={onUpdate} portFilterState={portFilterState}
          bayParticulars={bayParticularsMap ? bayParticularsMap[parseInt(b.bay, 10)] : null}
          hideOwnGrid={isMergeable} />
      ))}
      {isMergeable && (
        <div style={{ marginTop:6 }}>
          <SectionLabel text="Merged Bay Group Grid" color={ACC} />
          <MergedBayGridView group={group} onCellClick={setSelectedContainer} portFilterState={portFilterState} />
        </div>
      )}
      <ContainerDetailModal container={selectedContainer} onClose={()=>setSelectedContainer(null)} />
    </div>
  );
}


// ─── BAY CARD ────────────────────────────────────────────────────────────────
// rendered from LiveOps (one heading per 40ft bay + its 20ft neighbors), but
// each individual bay (40ft or 20ft) still tracks its own status/progress —
// the merge is a display grouping, not a data merge.
function BayCard({ bay, idx, gantries, onUpdate, movesPerHr, portFilterState, bayParticulars, hideOwnGrid }) {
  const [expanded, setExpanded] = useState(false);
  const [selectedContainer, setSelectedContainer] = useState(null);
  const col = STATUS_COLOR[bay.status] || S.vd;

  const planLoadDisch = bay.planLoad + bay.planDisch;
  const doneLoadDisch = bay.doneLoad + bay.doneDisch;
  const pct = planLoadDisch > 0 ? Math.round((doneLoadDisch / planLoadDisch) * 100) : 0;

  // Deck/Hold percentage split, derived from existing deckLoad/holdLoad/deckDisch/holdDisch
  // fields plus overall done-vs-plan ratio (we don't track separate done-deck/done-hold
  // counters, so we apply the overall completion ratio proportionally to each section's plan).
  const deckPlan = bay.deckLoad + bay.deckDisch;
  const holdPlan = bay.holdLoad + bay.holdDisch;
  const deckPct = deckPlan > 0 ? Math.min(100, Math.round((doneLoadDisch / planLoadDisch) * 100)) : 0;
  const holdPct = holdPlan > 0 ? Math.min(100, Math.round((doneLoadDisch / planLoadDisch) * 100)) : 0;

  const setStatus = (s) => {
    onUpdate(idx, 'status', s);
    if (s === 'inprogress' && !bay.startTime) onUpdate(idx, 'startTime', clNow());
    if (s === 'completed')  onUpdate(idx, 'endTime',   clNow());
  };

  const isBg = bay.status === 'inprogress' ? `${S.gd}08`
             : bay.status === 'completed'   ? `${S.gn}08`
             : bay.status === 'hold'        ? `${S.rd}08`
             : S.bg2;

  return (
    <div style={{ background:isBg, border:`1px solid ${col}40`,
      borderRadius:9, marginBottom:6, overflow:'hidden', transition:'all 0.2s' }}>

      {/* ── BAY HEADER ── */}
      <div style={{ display:'flex', alignItems:'center', gap:8, padding:'8px 10px',
        cursor:'pointer', userSelect:'none' }} onClick={() => setExpanded(e => !e)}>

        {/* Bay number */}
        <div style={{ background:`${col}20`, border:`1px solid ${col}50`,
          borderRadius:6, padding:'4px 8px', minWidth:42, textAlign:'center' }}>
          <div style={{ color:S.dm, fontSize:S.ti }}>BAY</div>
          <div style={{ color:col, fontFamily:'monospace', fontWeight:900, fontSize:'0.88rem' }}>{bay.bay}</div>
        </div>

        {/* Progress */}
        <div style={{ flex:1, minWidth:0 }}>
          <div style={{ display:'flex', justifyContent:'space-between', marginBottom:3 }}>
            <div style={{ display:'flex', gap:5, alignItems:'center', flexWrap:'wrap' }}>
              <span style={{ color:col, fontSize:S.lb, fontWeight:700 }}>{STATUS_LABEL[bay.status]}</span>
              {bay.isDG     && <span style={{ background:'rgba(255,71,87,0.2)',   color:S.rd, border:`1px solid ${S.rd}44`, borderRadius:3, padding:'0 4px', fontSize:S.ti, fontWeight:700 }}>DG</span>}
              {bay.isReefer && <span style={{ background:'rgba(0,212,255,0.15)', color:S.cy, border:`1px solid ${S.cy}44`, borderRadius:3, padding:'0 4px', fontSize:S.ti, fontWeight:700 }}>RF</span>}
              {bay.crane && <span style={{ color:S.dm, fontSize:S.ti }}>🏗 {bay.crane}</span>}
              {(bay.containers && bay.containers.length > 0) && <span style={{ color:S.dm, fontSize:S.ti }}>📦 {bay.containers.length}</span>}
            </div>
            <span style={{ color:col, fontSize:S.ti, fontWeight:700 }}>{pct}%</span>
          </div>
          {/* Deck / Hold progress bars, side by side */}
          <div style={{ display:'flex', gap:6, alignItems:'center' }}>
            <div style={{ flex:1 }}>
              <div style={{ display:'flex', justifyContent:'space-between' }}>
                <span style={{ color:S.dm, fontSize:'0.5rem' }}>DECK</span>
                <span style={{ color:S.dm, fontSize:'0.5rem' }}>{deckPlan > 0 ? `${deckPct}%` : '—'}</span>
              </div>
              <ProgressBar pct={deckPct} color={ACC} height={4} />
            </div>
            <div style={{ flex:1 }}>
              <div style={{ display:'flex', justifyContent:'space-between' }}>
                <span style={{ color:S.dm, fontSize:'0.5rem' }}>HOLD</span>
                <span style={{ color:S.dm, fontSize:'0.5rem' }}>{holdPlan > 0 ? `${holdPct}%` : '—'}</span>
              </div>
              <ProgressBar pct={holdPct} color={S.pu} height={4} />
            </div>
          </div>
        </div>

        {/* Quick status buttons */}
        <div style={{ display:'flex', flexDirection:'column', gap:3, flexShrink:0 }}>
          {bay.status !== 'inprogress' && bay.status !== 'completed' && (
            <button onClick={e=>{e.stopPropagation();setStatus('inprogress');}}
              style={{ background:`${S.gd}20`, border:`1px solid ${S.gd}55`, color:S.gd,
                borderRadius:4, padding:'3px 7px', fontSize:S.ti, cursor:'pointer', fontWeight:700, whiteSpace:'nowrap' }}>▶ START</button>
          )}
          {bay.status === 'inprogress' && (
            <button onClick={e=>{e.stopPropagation();setStatus('completed');}}
              style={{ background:`${S.gn}20`, border:`1px solid ${S.gn}55`, color:S.gn,
                borderRadius:4, padding:'3px 7px', fontSize:S.ti, cursor:'pointer', fontWeight:700, whiteSpace:'nowrap' }}>✓ DONE</button>
          )}
          {bay.status === 'completed' && (
            <span style={{ color:S.gn, fontSize:'1rem', textAlign:'center' }}>✅</span>
          )}
          <span style={{ color:S.vd, fontSize:S.ti, textAlign:'center' }}>{expanded ? '▲' : '▼'}</span>
        </div>
      </div>

      {/* ── EXPANDED DETAIL: grid view only (counters/manual-add removed — data comes from import) ── */}
      {expanded && (
        <div style={{ padding:'0 10px 10px', borderTop:`1px solid ${col}20` }}>
          <div style={{ marginTop:8 }}>
            {['idle','inprogress','completed','hold'].map(s => null) /* status buttons kept below for explicit control */}
          </div>
          <div style={{ display:'flex', gap:4, marginBottom:8, marginTop:8 }}>
            {['idle','inprogress','completed','hold'].map(s => (
              <button key={s} onClick={()=>setStatus(s)} style={{
                flex:1, background:bay.status===s?`${STATUS_COLOR[s]}25`:'transparent',
                border:`1px solid ${bay.status===s?STATUS_COLOR[s]:S.vd}`,
                color:bay.status===s?STATUS_COLOR[s]:S.dm,
                borderRadius:5, padding:'4px 2px', fontSize:S.ti, cursor:'pointer', fontWeight:bay.status===s?700:400,
              }}>{STATUS_LABEL[s]}</button>
            ))}
          </div>

          {!hideOwnGrid && (
            <BayGridView bay={bay} onCellClick={setSelectedContainer} portFilterState={portFilterState} bayParticulars={bayParticulars} />
          )}
        </div>
      )}

      <ContainerDetailModal container={selectedContainer} onClose={()=>setSelectedContainer(null)} />
    </div>
  );
}

// ─── LIVE OPS MAIN ────────────────────────────────────────────────────────────
// ─── OPS DASHBOARD ────────────────────────────────────────────────────────────
function OpsDashboard({ portOp, onGoToLiveOps, onReset }) {
  const bays = portOp.bays || [];
  const [activeGantries, setActiveGantries] = useState(portOp.gantries);

  const total  = bays.length;
  const done   = bays.filter(b => b.status === 'completed').length;
  const inProg = bays.filter(b => b.status === 'inprogress').length;
  const onHold = bays.filter(b => b.status === 'hold').length;
  const idle   = bays.filter(b => b.status === 'idle').length;

  const totalPlanMoves = bays.reduce((s,b) => s + b.planLoad + b.planDisch + b.planRest, 0);
  const totalDoneMoves = bays.reduce((s,b) => s + b.doneLoad + b.doneDisch + b.doneRest, 0);
  const totalRemMoves  = Math.max(0, totalPlanMoves - totalDoneMoves);
  const overallPct     = totalPlanMoves > 0 ? Math.round((totalDoneMoves / totalPlanMoves) * 100) : 0;

  const gantryOutput = activeGantries * portOp.movesPerHr;
  const etcHrs = gantryOutput > 0 ? totalRemMoves / gantryOutput : 0;
  const etcH   = Math.floor(etcHrs);
  const etcM   = Math.round((etcHrs % 1) * 60);
  const etcStr = totalRemMoves === 0 ? 'COMPLETE' : `${etcH}h ${etcM}m`;
  const etaTime = (() => {
    if (totalRemMoves === 0) return '—';
    const eta = new Date(Date.now() + etcHrs * 3600000);
    return `${clPad(eta.getHours())}:${clPad(eta.getMinutes())}`;
  })();

  const activeBaysWithCranes = bays.filter(b => b.status === 'inprogress' && b.crane);
  const craneUtilization = portOp.gantries > 0 ? Math.round((activeBaysWithCranes.length / activeGantries) * 100) : 0;

  const dgBays     = bays.filter(b=>b.isDG).length;
  const reeferBays = bays.filter(b=>b.isReefer).length;
  const lashingPending = bays.filter(b=>!b.lashingDone && b.status !== 'idle').length;

  return (
    <div>
      {/* Header */}
      <div style={{ background:`${ACC}10`, border:`1px solid ${ACC}30`, borderRadius:10,
        padding:'10px 13px', marginBottom:10, display:'flex', justifyContent:'space-between', alignItems:'flex-start', flexWrap:'wrap', gap:6 }}>
        <div>
          <div style={{ color:ACC, fontWeight:700, fontSize:S.sm }}>📦 {portOp.port}</div>
          <div style={{ color:S.dm, fontSize:S.xs }}>{portOp.vessel} · Started {portOp.createdAt}</div>
        </div>
        <Btn onClick={onReset} color={S.rd} style={{ padding:'3px 8px', fontSize:S.ti }}>⟳ New Port</Btn>
      </div>

      {/* Big overall progress ring/bar */}
      <div style={{ background:S.bg2, border:`1px solid ${S.bd2}`, borderRadius:12, padding:'16px', marginBottom:10, textAlign:'center' }}>
        <div style={{ color:S.dm, fontSize:S.xs, marginBottom:6 }}>OVERALL OPERATION PROGRESS</div>
        <div style={{ color:overallPct===100?S.gn:ACC, fontFamily:'monospace', fontWeight:900, fontSize:'2.2rem', lineHeight:1 }}>
          {overallPct}%
        </div>
        <div style={{ marginTop:8 }}>
          <ProgressBar pct={overallPct} color={overallPct===100?S.gn:ACC} height={12} />
        </div>
        <div style={{ color:S.dm, fontSize:S.xs, marginTop:6 }}>
          {totalDoneMoves.toLocaleString()} / {totalPlanMoves.toLocaleString()} moves completed
        </div>
      </div>

      {/* Key stats grid */}
      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:6, marginBottom:10 }}>
        <StatBox label="Bays Completed" value={`${done}/${total}`} color={S.gn} />
        <StatBox label="Bays Active" value={inProg} color={S.gd} sub={onHold>0?`${onHold} on hold`:undefined} />
        <StatBox label="Remaining Moves" value={totalRemMoves.toLocaleString()} color={totalRemMoves===0?S.gn:S.gd} />
        <StatBox label="Time to Finish" value={etcStr} color={totalRemMoves===0?S.gn:ACC} sub={`ETA ${etaTime}`} />
      </div>

      {/* Gantry panel */}
      <div style={{ background:S.bg2, border:`1px solid ${S.bd2}`, borderRadius:10, padding:'12px 14px', marginBottom:10 }}>
        <SectionLabel text="Gantry Crane Status" color={ACC} />
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:8 }}>
          <div>
            <div style={{ color:S.dm, fontSize:S.lb }}>Working Gantries Right Now</div>
            <div style={{ display:'flex', gap:3, marginTop:4 }}>
              {Array.from({length: 12}, (_,i)=>i+1).slice(0, Math.max(portOp.gantries, activeGantries) + 1).map(n => (
                <button key={n} onClick={()=>setActiveGantries(n)} style={{
                  background:activeGantries===n?`${ACC}25`:'transparent',
                  border:`1px solid ${activeGantries===n?ACC:S.vd}`,
                  color:activeGantries===n?ACC:S.dm,
                  borderRadius:5, padding:'4px 9px', fontSize:S.xs, cursor:'pointer', fontWeight:activeGantries===n?700:400,
                }}>{n}</button>
              ))}
            </div>
          </div>
          <div style={{ textAlign:'right' }}>
            <div style={{ color:S.dm, fontSize:S.lb }}>Combined Output</div>
            <div style={{ color:S.cy, fontFamily:'monospace', fontWeight:700, fontSize:'1rem' }}>{gantryOutput} mvs/hr</div>
          </div>
        </div>
        <div style={{ display:'flex', gap:12, flexWrap:'wrap' }}>
          <div style={{ fontSize:S.xs }}>
            <span style={{ color:S.dm }}>Cranes assigned to active bays: </span>
            <span style={{ color:ACC, fontWeight:700 }}>{activeBaysWithCranes.length}</span>
          </div>
          <div style={{ fontSize:S.xs }}>
            <span style={{ color:S.dm }}>Configured fleet size: </span>
            <span style={{ color:S.dm, fontWeight:700 }}>{portOp.gantries} (max 12)</span>
          </div>
        </div>
      </div>

      {/* Move type breakdown */}
      <div style={{ background:S.bg2, border:`1px solid ${S.bd2}`, borderRadius:10, padding:'12px 14px', marginBottom:10 }}>
        <SectionLabel text="Move Type Breakdown" color={ACC} />
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:6 }}>
          {[
            ['Load', bays.reduce((s,b)=>s+b.doneLoad,0), bays.reduce((s,b)=>s+b.planLoad,0), ACC],
            ['Discharge', bays.reduce((s,b)=>s+b.doneDisch,0), bays.reduce((s,b)=>s+b.planDisch,0), S.or],
            ['Restow', bays.reduce((s,b)=>s+b.doneRest,0), bays.reduce((s,b)=>s+b.planRest,0), S.pu],
          ].map(([l,d,p,c]) => {
            const pct = p > 0 ? Math.round((d/p)*100) : 0;
            return (
              <div key={l} style={{ background:S.bg3, borderRadius:7, padding:'8px 9px' }}>
                <div style={{ color:S.dm, fontSize:S.lb, marginBottom:3 }}>{l}</div>
                <div style={{ color:c, fontFamily:'monospace', fontWeight:700, fontSize:S.sm, marginBottom:4 }}>{d}/{p}</div>
                <ProgressBar pct={pct} color={c} height={4} />
              </div>
            );
          })}
        </div>
      </div>

      {/* Special cargo flags */}
      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:6, marginBottom:10 }}>
        <StatBox label="DG Bays" value={dgBays} color={dgBays>0?S.rd:S.dm} />
        <StatBox label="Reefer Bays" value={reeferBays} color={reeferBays>0?S.cy:S.dm} />
        <StatBox label="Lashing Pending" value={lashingPending} color={lashingPending>0?S.or:S.gn} />
      </div>

      {/* Bay status lists */}
      <div style={{ background:`${S.gn}08`, border:`1px solid ${S.gn}25`, borderRadius:10, padding:'12px 14px', marginBottom:10 }}>
        <SectionLabel text="Which Bays Are Where" color={S.gn} />
        {done > 0 && (
          <div style={{ marginBottom:6 }}>
            <span style={{ color:S.gn, fontSize:S.xs, fontWeight:700 }}>✅ Finished ({done}): </span>
            <span style={{ color:S.tx, fontSize:S.xs }}>{bays.filter(b=>b.status==='completed').map(b=>b.bay).join(', ')}</span>
          </div>
        )}
        {inProg > 0 && (
          <div style={{ marginBottom:6 }}>
            <span style={{ color:S.gd, fontSize:S.xs, fontWeight:700 }}>▶ In Progress ({inProg}): </span>
            <span style={{ color:S.tx, fontSize:S.xs }}>{bays.filter(b=>b.status==='inprogress').map(b=>`${b.bay}${b.crane?'('+b.crane+')':''}`).join(', ')}</span>
          </div>
        )}
        {onHold > 0 && (
          <div style={{ marginBottom:6 }}>
            <span style={{ color:S.rd, fontSize:S.xs, fontWeight:700 }}>⏸ On Hold ({onHold}): </span>
            <span style={{ color:S.tx, fontSize:S.xs }}>{bays.filter(b=>b.status==='hold').map(b=>b.bay).join(', ')}</span>
          </div>
        )}
        {idle > 0 && (
          <div>
            <span style={{ color:S.dm, fontSize:S.xs, fontWeight:700 }}>⏳ Not Started ({idle}): </span>
            <span style={{ color:S.dm, fontSize:S.xs }}>{bays.filter(b=>b.status==='idle').map(b=>b.bay).join(', ')}</span>
          </div>
        )}
        {total === 0 && <div style={{ color:S.vd, fontSize:S.xs, fontStyle:'italic' }}>No bays configured</div>}
      </div>

      <Btn onClick={onGoToLiveOps} color={ACC} style={{ width:'100%', padding:'10px', fontSize:S.sm }}>
        ⚡ Open Live Ops to Update Progress
      </Btn>
    </div>
  );
}

function LiveOps({ portOp, onUpdate, onReset }) {
  const [search,    setSearch]    = useState('');
  const [filter,    setFilter]    = useState('all');
  const [sortBy,    setSortBy]    = useState('bay');
  const [tickMode,  setTickMode]  = useState(false); // quick-tick mode
  const [extraGantries, setExtraGantries] = useState(portOp.gantries);
  const [portFilterPort, setPortFilterPort] = useState(portOp.port || '');
  const [portFilterMode, setPortFilterMode] = useState('all');
  const [shipParticulars, setShipParticulars] = useState(null);

  useEffect(() => {
    let mounted = true;
    loadShipParticulars().then(data => {
      if (!mounted) return;
      // Guard against a "deleted" marker doc (no bays array) or any other
      // malformed/partial data — never set state that downstream code
      // would call .forEach/.map on without a real bays array.
      const safe = (data && !data.deleted && Array.isArray(data.bays)) ? data : null;
      setShipParticulars(safe);
    }).catch(() => { if (mounted) setShipParticulars(null); });
    return () => { mounted = false; };
  }, []);

  // Keyed by numeric bay value, not the raw string — BAPLIE imports use
  // 3-digit bay codes ('058') while MSC XML imports use 2-digit ('05') for
  // the same physical bay. Ship Particulars is entered once per vessel and
  // must match either import format, so we compare by parsed integer value
  // rather than requiring identical string padding.
  const bayParticularsMap = {};
  if (shipParticulars && shipParticulars.bays) {
    shipParticulars.bays.forEach(bp => { bayParticularsMap[parseInt(bp.bay, 10)] = bp; });
  }

  const bays = portOp.bays || [];
  const allContainers = bays.flatMap(b => b.containers || []);
  const availablePorts = collectPortsFromContainers(allContainers);
  const portFilterState = getPortFilterState(allContainers, portFilterPort, portFilterMode);

  const updateBay = useCallback((idx, key, val) => {
    const updated = bays.map((b, i) => i === idx ? { ...b, [key]: val } : b);
    onUpdate({ ...portOp, bays: updated });
  }, [bays, portOp, onUpdate]);

  // ── STATS ──
  const total      = bays.length;
  const done       = bays.filter(b => b.status === 'completed').length;
  const inProg     = bays.filter(b => b.status === 'inprogress').length;
  const onHold     = bays.filter(b => b.status === 'hold').length;
  const idle       = bays.filter(b => b.status === 'idle').length;

  const totalPlanMoves = bays.reduce((s,b) => s + b.planLoad + b.planDisch + b.planRest, 0);
  const totalDoneMoves = bays.reduce((s,b) => s + b.doneLoad + b.doneDisch + b.doneRest, 0);
  const totalRemMoves  = Math.max(0, totalPlanMoves - totalDoneMoves);
  const overallPct     = totalPlanMoves > 0 ? Math.round((totalDoneMoves / totalPlanMoves) * 100) : 0;

  const totalGantryOutput = extraGantries * portOp.movesPerHr;
  const etcHrs  = totalGantryOutput > 0 ? totalRemMoves / totalGantryOutput : 0;
  const etcH    = Math.floor(etcHrs);
  const etcM    = Math.round((etcHrs % 1) * 60);
  const etcStr  = totalRemMoves === 0 ? 'COMPLETE' : `${etcH}h ${etcM}m`;

  const etaTime = (() => {
    if (totalRemMoves === 0) return '—';
    const ms  = etcHrs * 3600000;
    const eta = new Date(Date.now() + ms);
    return `${clPad(eta.getHours())}:${clPad(eta.getMinutes())}`;
  })();

  const doneL = bays.reduce((s,b)=>s+b.doneLoad,0);
  const doneD = bays.reduce((s,b)=>s+b.doneDisch,0);
  const doneR = bays.reduce((s,b)=>s+b.doneRest,0);
  const planL = bays.reduce((s,b)=>s+b.planLoad,0);
  const planD = bays.reduce((s,b)=>s+b.planDisch,0);
  const planR = bays.reduce((s,b)=>s+b.planRest,0);

  // ── FILTER + SORT ──
  const filtered = bays
    .map((b,i) => ({ ...b, _idx: i }))
    .filter(b => {
      if (search && !b.bay.includes(search)) return false;
      if (filter === 'inprogress') return b.status === 'inprogress';
      if (filter === 'completed')  return b.status === 'completed';
      if (filter === 'idle')       return b.status === 'idle';
      if (filter === 'hold')       return b.status === 'hold';
      if (filter === 'dg')         return b.isDG;
      if (filter === 'reefer')     return b.isReefer;
      if (filter === 'lashing')    return !b.lashingDone && b.status !== 'idle';
      return true;
    })
    .sort((a,b) => {
      if (sortBy === 'bay')    return a.bay.localeCompare(b.bay);
      if (sortBy === 'status') return a.status.localeCompare(b.status);
      if (sortBy === 'pct') {
        const pa = a.planLoad+a.planDisch+a.planRest;
        const pb = b.planLoad+b.planDisch+b.planRest;
        const va = pa > 0 ? (a.doneLoad+a.doneDisch+a.doneRest)/pa : 0;
        const vb = pb > 0 ? (b.doneLoad+b.doneDisch+b.doneRest)/pb : 0;
        return vb - va;
      }
      return 0;
    });

  // ── QUICK TICK (tap to toggle bay status inprogress→completed) ──
  const quickTick = (idx) => {
    const b = bays[idx];
    if (b.status === 'idle')       updateBay(idx, 'status', 'inprogress');
    else if (b.status === 'inprogress') {
      updateBay(idx, 'status', 'completed');
      if (!b.endTime) updateBay(idx, 'endTime', clNow());
    } else if (b.status === 'completed') updateBay(idx, 'status', 'idle');
  };

  return (
    <div>
      {/* ── PORT HEADER ── */}
      <div style={{ background:`${ACC}10`, border:`1px solid ${ACC}30`, borderRadius:10,
        padding:'10px 13px', marginBottom:10, display:'flex', justifyContent:'space-between', alignItems:'flex-start', flexWrap:'wrap', gap:6 }}>
        <div>
          <div style={{ color:ACC, fontWeight:700, fontSize:S.sm }}>📦 {portOp.port}</div>
          <div style={{ color:S.dm, fontSize:S.xs }}>{portOp.vessel} · Started {portOp.createdAt}</div>
        </div>
        <div style={{ display:'flex', gap:5, alignItems:'center' }}>
          <div style={{ color:S.dm, fontSize:S.lb }}>Active Gantries:</div>
          <div style={{ display:'flex', gap:3 }}>
            {Array.from({length: 12}, (_,i)=>i+1).slice(0, Math.min(12, portOp.gantries + 2)).map(n => (
              <button key={n} onClick={()=>setExtraGantries(n)} style={{
                background:extraGantries===n?`${ACC}25`:'transparent',
                border:`1px solid ${extraGantries===n?ACC:S.vd}`,
                color:extraGantries===n?ACC:S.dm,
                borderRadius:4, padding:'2px 6px', fontSize:S.ti, cursor:'pointer', fontWeight:extraGantries===n?700:400,
              }}>{n}</button>
            ))}
          </div>
          <Btn onClick={onReset} color={S.rd} style={{ padding:'3px 8px', fontSize:S.ti }}>⟳ New Port</Btn>
        </div>
      </div>

      {/* ── SUMMARY STATS ── */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:5, marginBottom:8 }}>
        <StatBox label="Done" value={done}    color={S.gn} sub={`of ${total} bays`} />
        <StatBox label="Active" value={inProg} color={S.gd} sub={`${onHold} on hold`} />
        <StatBox label="Remaining" value={idle} color={S.dm} sub="bays idle" />
        <StatBox label="Overall" value={`${overallPct}%`} color={overallPct===100?S.gn:ACC} sub={`${totalDoneMoves}/${totalPlanMoves} mvs`} />
      </div>

      {/* ── OVERALL PROGRESS BAR ── */}
      <div style={{ background:S.bg2, borderRadius:8, padding:'8px 12px', marginBottom:8 }}>
        <div style={{ display:'flex', justifyContent:'space-between', marginBottom:4 }}>
          <span style={{ color:S.dm, fontSize:S.xs }}>Overall Progress</span>
          <span style={{ color:overallPct===100?S.gn:ACC, fontFamily:'monospace', fontWeight:700, fontSize:S.xs }}>{overallPct}%</span>
        </div>
        <ProgressBar pct={overallPct} color={overallPct===100?S.gn:ACC} height={10} />
        <div style={{ display:'flex', gap:10, marginTop:5, flexWrap:'wrap' }}>
          {[['Load',doneL,planL,ACC],['Disch',doneD,planD,S.or],['Restow',doneR,planR,S.pu]].map(([l,d,p,c])=>(
            <div key={l} style={{ fontSize:S.ti }}>
              <span style={{ color:S.dm }}>{l}: </span>
              <span style={{ color:c, fontFamily:'monospace', fontWeight:700 }}>{d}/{p}</span>
            </div>
          ))}
        </div>
      </div>

      {/* ── ETC / ETA ── */}
      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr 1fr', gap:5, marginBottom:10 }}>
        <StatBox label="Rem. Moves" value={totalRemMoves} color={totalRemMoves===0?S.gn:S.gd} />
        <StatBox label="Gantry Rate" value={`${totalGantryOutput}/hr`} color={S.cy} sub={`${extraGantries}×${portOp.movesPerHr}`} />
        <StatBox label="Time to Finish" value={etcStr} color={totalRemMoves===0?S.gn:S.gd} />
        <StatBox label="ETA" value={etaTime} color={totalRemMoves===0?S.gn:ACC} />
      </div>

      {/* ── CONTROLS ── */}
      <div style={{ display:'flex', gap:5, marginBottom:8, flexWrap:'wrap', alignItems:'center' }}>
        <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Bay #…"
          style={{ width:64, background:S.bg3, color:S.cy, border:`1px solid ${S.bd2}`,
            borderRadius:5, padding:'5px 8px', fontSize:S.xs, outline:'none', fontFamily:'monospace' }} />
        {[['all','All'],['inprogress','Active'],['completed','Done'],['idle','Idle'],['hold','Hold'],['dg','DG'],['reefer','RF'],['lashing','Lash⚠']].map(([v,l])=>(
          <button key={v} onClick={()=>setFilter(v)} style={{
            background:filter===v?`${ACC}20`:'transparent',
            border:`1px solid ${filter===v?ACC:S.vd}`,
            color:filter===v?ACC:S.dm,
            borderRadius:5, padding:'4px 8px', fontSize:S.lb, cursor:'pointer',
          }}>{l}</button>
        ))}
        <div style={{ marginLeft:'auto', display:'flex', gap:4, alignItems:'center' }}>
          <span style={{ color:S.dm, fontSize:S.lb }}>Sort:</span>
          {[['bay','Bay'],['status','Status'],['pct','%']].map(([v,l])=>(
            <button key={v} onClick={()=>setSortBy(v)} style={{
              background:sortBy===v?`${ACC}20`:'transparent',
              border:`1px solid ${sortBy===v?ACC:S.vd}`,
              color:sortBy===v?ACC:S.dm,
              borderRadius:4, padding:'3px 7px', fontSize:S.lb, cursor:'pointer',
            }}>{l}</button>
          ))}
          <button onClick={()=>setTickMode(t=>!t)} style={{
            background:tickMode?'rgba(255,215,0,0.15)':'transparent',
            border:`1px solid ${tickMode?S.gd:S.vd}`,
            color:tickMode?S.gd:S.dm,
            borderRadius:5, padding:'4px 8px', fontSize:S.lb, cursor:'pointer', fontWeight:tickMode?700:400,
          }}>⚡ Quick Tick</button>
        </div>
      </div>

      {/* ── QUICK TICK MODE: grid of bay tiles ── */}
      {tickMode && (
        <div style={{ background:S.bg3, borderRadius:9, padding:'10px', marginBottom:10 }}>
          <div style={{ color:S.gd, fontSize:S.xs, fontWeight:700, marginBottom:6 }}>
            ⚡ Quick Tick Mode — tap bay to cycle: IDLE → ACTIVE → DONE → IDLE
          </div>
          <div style={{ display:'flex', flexWrap:'wrap', gap:5 }}>
            {bays.map((b,i) => {
              const c = STATUS_COLOR[b.status];
              return (
                <button key={i} onClick={()=>quickTick(i)} title={`Bay ${b.bay} — ${STATUS_LABEL[b.status]}`}
                  style={{ width:44, height:44, background:`${c}20`, border:`1.5px solid ${c}`,
                    borderRadius:7, color:c, fontFamily:'monospace', fontWeight:900, fontSize:'0.72rem',
                    cursor:'pointer', display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center',
                    padding:0, transition:'all 0.1s', position:'relative' }}>
                  {b.bay}
                  {b.status==='completed' && <span style={{ fontSize:'0.55rem', color:S.gn }}>✓</span>}
                  {b.status==='inprogress' && <span style={{ fontSize:'0.55rem', color:S.gd }}>▶</span>}
                  {b.isDG && <div style={{ position:'absolute', top:2, right:2, width:5, height:5, borderRadius:'50%', background:S.rd }} />}
                  {b.isReefer && <div style={{ position:'absolute', top:2, left:2, width:5, height:5, borderRadius:'50%', background:S.cy }} />}
                </button>
              );
            })}
          </div>
          <div style={{ marginTop:6, display:'flex', gap:10, flexWrap:'wrap' }}>
            {[['IDLE',S.vd],['ACTIVE',S.gd],['DONE',S.gn],['HOLD',S.rd]].map(([l,c])=>(
              <span key={l} style={{ fontSize:S.ti, color:c }}>■ {l}</span>
            ))}
            <span style={{ fontSize:S.ti, color:S.rd }}>● DG</span>
            <span style={{ fontSize:S.ti, color:S.cy }}>● Reefer</span>
          </div>
        </div>
      )}

      {/* ── PORT FILTER (loading / discharging / departure / all plan) ── */}
      <PortFilterBar ports={availablePorts} selectedPort={portFilterPort} onSelectPort={setPortFilterPort}
        mode={portFilterMode} onSelectMode={setPortFilterMode} />

      {/* ── BAY LIST (grouped by master/40ft bay, per real vessel convention) ── */}
      <div style={{ fontSize:S.ti, color:S.dm, marginBottom:5 }}>
        Showing {filtered.length} of {total} bays
      </div>
      {(() => {
        const bayIndexMap = {};
        bays.forEach((b, i) => { bayIndexMap[b.bay] = i; });
        const groups = groupBaysByMasterBay(filtered);
        return groups.map(g => (
          <MasterBayGroup key={g.masterBay} group={g}
            gantries={portOp.gantries} movesPerHr={portOp.movesPerHr}
            onUpdate={updateBay} bayIndexMap={bayIndexMap}
            portFilterState={portFilterState} bayParticularsMap={bayParticularsMap} />
        ));
      })()}

      {/* ── OPERATION SUMMARY ── */}
      <div style={{ background:`${S.gn}08`, border:`1px solid ${S.gn}25`, borderRadius:10,
        padding:'12px 14px', marginTop:10 }}>
        <SectionLabel text="Operation Summary" color={S.gn} />
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:6, marginBottom:8 }}>
          {[
            ['Bays Completed',done,S.gn],
            ['Bays Active',inProg,S.gd],
            ['Bays Remaining',idle,S.dm],
            ['DG Bays',bays.filter(b=>b.isDG).length,S.rd],
            ['Reefer Bays',bays.filter(b=>b.isReefer).length,S.cy],
            ['Lashing Pending',bays.filter(b=>!b.lashingDone&&b.status!=='idle').length,S.or],
          ].map(([l,v,c])=>(
            <div key={l} style={{ background:S.bg3, borderRadius:6, padding:'6px 8px', textAlign:'center' }}>
              <div style={{ color:S.dm, fontSize:S.ti }}>{l}</div>
              <div style={{ color:c, fontFamily:'monospace', fontWeight:700, fontSize:S.sm }}>{v}</div>
            </div>
          ))}
        </div>
        {done > 0 && (
          <div style={{ color:S.gn, fontSize:S.xs, fontWeight:600, marginBottom:4 }}>
            ✅ Completed Bays: {bays.filter(b=>b.status==='completed').map(b=>b.bay).join(', ')}
          </div>
        )}
        {inProg > 0 && (
          <div style={{ color:S.gd, fontSize:S.xs, fontWeight:600 }}>
            ▶ In Progress: {bays.filter(b=>b.status==='inprogress').map(b=>`${b.bay}${b.crane?' ('+b.crane+')':''}`).join(', ')}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── REEFER STATUS ────────────────────────────────────────────────────────────
// Replaces temperature-round logging with a simple load/discharge checklist.
// Mode toggle (Load/Discharge) shows bays with planned reefer containers for
// that mode, with a two-step tick: Loaded -> Checked, per bay. Uses two new
// additive bay fields (reeferLoadStatus, reeferDischStatus) following the
// same pattern as the existing lashingDone field.
function ReeferStatus({ portOp, onUpdateReefer }) {
  const [mode, setMode] = useState('load'); // 'load' | 'discharge'

  const bays = portOp?.bays || [];

  const reeferCountForBay = (b, m) => {
    if (b.containers && b.containers.length > 0) {
      return b.containers.filter(c => c.reefer && (m === 'load' ? c.pol === portOp.port : c.pod === portOp.port)).length;
    }
    return 0;
  };

  const relevantBays = bays.filter(b => b.isReefer && reeferCountForBay(b, mode) > 0);
  const groups = groupBaysByMasterBay(relevantBays);

  const statusKey = mode === 'load' ? 'reeferLoadStatus' : 'reeferDischStatus';

  const setBayStatus = (bayNumber, status) => {
    const updatedBays = portOp.bays.map(b => b.bay === bayNumber ? { ...b, [statusKey]: status } : b);
    onUpdateReefer({ ...portOp, bays: updatedBays });
  };

  const totalReefers = relevantBays.reduce((s, b) => s + reeferCountForBay(b, mode), 0);
  const loadedCount = relevantBays.filter(b => b[statusKey] === 'loaded' || b[statusKey] === 'checked').length;
  const checkedCount = relevantBays.filter(b => b[statusKey] === 'checked').length;

  return (
    <div>
      <Card style={{ marginBottom: 10 }}>
        <SectionLabel text="Reefer Status" color={S.cy} />
        <div style={{ display:'flex', gap:5, marginBottom:10 }}>
          {[['load','📥 Load'],['discharge','📤 Discharge']].map(([v,l]) => (
            <button key={v} onClick={()=>setMode(v)} style={{
              flex:1, background:mode===v?`${S.cy}20`:'transparent',
              border:`1px solid ${mode===v?S.cy:S.vd}`, color:mode===v?S.cy:S.dm,
              borderRadius:5, padding:'7px 4px', fontSize:S.xs, cursor:'pointer', fontWeight:mode===v?700:400,
            }}>{l}</button>
          ))}
        </div>
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:6 }}>
          <StatBox label="Reefer Bays" value={relevantBays.length} color={S.cy} />
          <StatBox label="Total Reefers" value={totalReefers} color={ACC} sub={mode === 'load' ? 'planned to load' : 'planned to discharge'} />
          <StatBox label="Checked" value={`${checkedCount}/${relevantBays.length}`} color={checkedCount===relevantBays.length && relevantBays.length>0 ? S.gn : S.gd} />
        </div>
      </Card>

      {groups.length === 0 && (
        <Card><div style={{ color:S.vd, fontSize:S.xs, textAlign:'center', padding:'16px 0' }}>
          No bays with reefer containers planned for {mode === 'load' ? 'loading' : 'discharge'} at this port
        </div></Card>
      )}

      {groups.map(g => (
        <Card key={g.masterBay} style={{ marginBottom: 8 }}>
          <div style={{ color:S.dm, fontSize:S.ti, fontWeight:700, marginBottom:6 }}>
            Bay {g.members.map(b=>b.bay).sort((a,b)=>parseInt(a,10)-parseInt(b,10)).join(' / ')}
          </div>
          {g.members.filter(b => b.isReefer && reeferCountForBay(b, mode) > 0).map(b => {
            const status = b[statusKey] || 'pending';
            const count = reeferCountForBay(b, mode);
            return (
              <div key={b.bay} style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'6px 4px', borderTop:`1px solid ${S.bd2}`, flexWrap:'wrap', gap:6 }}>
                <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                  <span style={{ color:S.cy, fontFamily:'monospace', fontWeight:700, fontSize:S.xs }}>Bay {b.bay}</span>
                  <span style={{ color:S.dm, fontSize:S.ti }}>❄ {count} reefer{count===1?'':'s'}</span>
                </div>
                <div style={{ display:'flex', gap:4 }}>
                  <button onClick={()=>setBayStatus(b.bay, status === 'loaded' || status === 'checked' ? 'pending' : 'loaded')} style={{
                    background: (status==='loaded'||status==='checked') ? `${S.gd}20` : 'transparent',
                    border:`1px solid ${(status==='loaded'||status==='checked') ? S.gd : S.vd}`,
                    color:(status==='loaded'||status==='checked') ? S.gd : S.dm,
                    borderRadius:5, padding:'5px 10px', fontSize:S.ti, cursor:'pointer', fontWeight:700,
                  }}>{mode==='load' ? 'Loaded' : 'Discharged'}</button>
                  <button onClick={()=>setBayStatus(b.bay, status === 'checked' ? 'loaded' : 'checked')} disabled={status==='pending'} style={{
                    background: status==='checked' ? `${S.gn}20` : 'transparent',
                    border:`1px solid ${status==='checked' ? S.gn : S.vd}`,
                    color: status==='checked' ? S.gn : (status==='pending' ? S.vd : S.dm),
                    borderRadius:5, padding:'5px 10px', fontSize:S.ti, cursor: status==='pending' ? 'default' : 'pointer', fontWeight:700,
                  }}>✅ Checked</button>
                </div>
              </div>
            );
          })}
        </Card>
      ))}
    </div>
  );
}

// ─── MAIN EXPORT ─────────────────────────────────────────────────────────────
// ─── NO-PLAN SKELETON PREVIEW ─────────────────────────────────────────────────
// Shown when no loading plan is loaded yet but Ship Particulars have been
// configured. Displays every configured bay's full empty grid (per the
// confirmed requirement: blank boxes for every real slot, not nothing at
// all) so the vessel's actual stowage layout is visible before any plan
// is imported or manually set up.
function NoPlanSkeletonPreview() {
  const [shipParticulars, setShipParticulars] = useState(null);
  const [loaded, setLoaded] = useState(false);
  const [expandedBay, setExpandedBay] = useState(null);

  useEffect(() => {
    let mounted = true;
    loadShipParticulars().then(data => {
      if (!mounted) return;
      const safe = (data && !data.deleted && Array.isArray(data.bays)) ? data : null;
      setShipParticulars(safe);
      setLoaded(true);
    }).catch(() => { if (mounted) setLoaded(true); });
    return () => { mounted = false; };
  }, []);

  if (!loaded) return null;
  if (!shipParticulars || !shipParticulars.bays || shipParticulars.bays.length === 0) return null;

  const bays = shipParticulars.bays;

  return (
    <Card style={{ marginBottom: 10 }}>
      <SectionLabel text={`Ship Skeleton — ${bays.length} Bays Configured, No Plan Loaded`} color={S.dm} />
      <div style={{ color:S.vd, fontSize:S.ti, fontStyle:'italic', marginBottom:8 }}>
        Showing the vessel's full bay layout from Ship Particulars. All slots are empty — import a loading plan or use the manual setup below to populate them.
      </div>
      <div style={{ display:'flex', flexWrap:'wrap', gap:5, marginBottom: expandedBay ? 8 : 0 }}>
        {bays.map(bp => (
          <button key={bp.bay} onClick={()=>setExpandedBay(expandedBay===bp.bay?null:bp.bay)} style={{
            background: expandedBay===bp.bay ? `${ACC}20` : S.bg3,
            border:`1px solid ${expandedBay===bp.bay ? ACC : S.vd}`,
            color: expandedBay===bp.bay ? ACC : S.dm,
            borderRadius:5, padding:'5px 9px', fontSize:S.ti, cursor:'pointer', fontFamily:'monospace', fontWeight:700,
          }}>{bp.bay}</button>
        ))}
      </div>
      {expandedBay && (() => {
        const bp = bays.find(b => b.bay === expandedBay);
        const skeleton = buildEmptyGridFromParticulars(bp);
        if (!skeleton) return null;
        return (
          <div style={{ background:S.bg3, borderRadius:7, padding:'10px', marginTop:8 }}>
            <BayGridSection title="Deck" section={skeleton.deck} filter="all" onCellClick={null} portFilterState={null} />
            <BayGridSection title="Hold" section={skeleton.hold} filter="all" onCellClick={null} portFilterState={null} />
          </div>
        );
      })()}
    </Card>
  );
}

function ContainerLiveOps() {
  const SETUP_KEY = 'cargo_container_port_op';
  const [portOp, setPortOp] = useState(null);
  const [loaded, setLoaded] = useState(false);
  const [activeTab, setActiveTab] = useState('dashboard');
  const writeTimerRef = useRef(null);

  // Load from IndexedDB on mount (falls back to localStorage automatically inside idbGetCargo)
  useEffect(() => {
    let mounted = true;
    idbGetCargo(SETUP_KEY, null).then(data => {
      if (!mounted) return;
      setPortOp(data);
      setLoaded(true);
    });
    return () => { mounted = false; };
  }, []);

  // Debounced write — avoids hammering IndexedDB/localStorage on every
  // rapid tap of +/- counters, which was a contributor to the UI hang.
  const persist = useCallback((op) => {
    setPortOp(op);
    if (writeTimerRef.current) clearTimeout(writeTimerRef.current);
    writeTimerRef.current = setTimeout(() => {
      idbSetCargo(SETUP_KEY, op);
    }, 300);
  }, []);

  useEffect(() => () => { if (writeTimerRef.current) clearTimeout(writeTimerRef.current); }, []);

  const handleSave = (op) => {
    setPortOp(op);
    idbSetCargo(SETUP_KEY, op); // immediate write on initial setup, no debounce needed
    setActiveTab('dashboard');
  };
  const handleUpdate = (op) => persist(op);
  const handleReset = () => {
    if (!window.confirm('Start a new port operation? Current data will be cleared.')) return;
    if (writeTimerRef.current) clearTimeout(writeTimerRef.current);
    setPortOp(null);
    idbDeleteCargo(SETUP_KEY);
  };

  const TABS = [
    { id:'dashboard', label:'📊 Dashboard'    },
    { id:'liveops',   label:'⚡ Live Ops'     },
    { id:'reefer',    label:'❄ Reefer Status' },
  ];

  if (!loaded) {
    return (
      <div style={{ display:'flex', alignItems:'center', justifyContent:'center', padding:'40px 0', color:S.dm, fontSize:S.xs }}>
        Loading port operation data…
      </div>
    );
  }

  if (!portOp) {
    return (
      <div>
        <NoPlanSkeletonPreview />
        <SetupWizard onSave={handleSave} />
      </div>
    );
  }

  return (
    <div>
      {/* Tab bar */}
      <div style={{ display:'flex', gap:4, marginBottom:10, borderBottom:`1px solid ${S.bd2}`, paddingBottom:8 }}>
        {TABS.map(t => (
          <button key={t.id} onClick={()=>setActiveTab(t.id)} style={{
            background:activeTab===t.id?`${ACC}20`:'transparent',
            border:`1px solid ${activeTab===t.id?ACC:S.vd}`,
            color:activeTab===t.id?ACC:S.dm,
            borderRadius:6, padding:'6px 14px', fontSize:S.xs, cursor:'pointer',
            fontWeight:activeTab===t.id?700:400,
          }}>{t.label}</button>
        ))}
      </div>

      {activeTab === 'dashboard' && (
        <OpsDashboard portOp={portOp} onGoToLiveOps={()=>setActiveTab('liveops')} onReset={handleReset} />
      )}
      {activeTab === 'liveops' && (
        <LiveOps portOp={portOp} onUpdate={handleUpdate} onReset={handleReset} />
      )}
      {activeTab === 'reefer' && (
        <ReeferStatus portOp={portOp} onUpdateReefer={handleUpdate} />
      )}
    </div>
  );
}

// ─── OOG STATUS (auto-populated, read-only) ─────────────────────────────────
// Replaces manual OOG entry. Pulls OOG containers directly from bay.containers
// (populated by BAPLIE/MSC XML import) — no manual form needed. Reads the
// live portOp via the same IndexedDB key as ContainerSearch/BaplieImport.
function ContainerOOG() {
  const SETUP_KEY = 'cargo_container_port_op';
  const [portOp, setPortOp] = useState(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    let mounted = true;
    idbGetCargo(SETUP_KEY, null).then(data => {
      if (!mounted) return;
      setPortOp(data);
      setLoaded(true);
    });
    return () => { mounted = false; };
  }, []);

  if (!loaded) {
    return <div style={{ textAlign:'center', padding:'30px 0', color:S.dm, fontSize:S.xs }}>Loading…</div>;
  }
  if (!portOp) {
    return <Card><div style={{ color:S.vd, fontSize:S.xs, textAlign:'center', padding:'16px 0' }}>No port operation set up yet. Import a loading plan first.</div></Card>;
  }

  const bays = portOp.bays || [];
  const oogByBay = bays
    .map(b => ({ bay: b.bay, containers: (b.containers || []).filter(c => c.oog) }))
    .filter(x => x.containers.length > 0);

  const totalOOG = oogByBay.reduce((s, x) => s + x.containers.length, 0);
  const bayObjects = oogByBay.map(x => bays.find(b => b.bay === x.bay)).filter(Boolean);
  const groups = groupBaysByMasterBay(bayObjects);

  return (
    <div>
      <Card style={{ marginBottom: 10 }}>
        <SectionLabel text="OOG Tracker" color={ACC} />
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:6 }}>
          <StatBox label="OOG Bays" value={oogByBay.length} color={S.or} />
          <StatBox label="Total OOG Containers" value={totalOOG} color={S.or} />
        </div>
        <div style={{ color:S.dm, fontSize:S.ti, marginTop:8 }}>Auto-populated from the imported loading plan — no manual entry needed.</div>
      </Card>

      {oogByBay.length === 0 && (
        <Card><div style={{ color:S.vd, fontSize:S.xs, textAlign:'center', padding:'16px 0' }}>No OOG containers found in the current loading plan</div></Card>
      )}

      {groups.map(g => {
        const groupOOG = g.members.flatMap(b => (b.containers || []).filter(c => c.oog).map(c => ({ ...c, bay: b.bay })));
        if (groupOOG.length === 0) return null;
        return (
          <Card key={g.masterBay} style={{ marginBottom: 8 }}>
            <div style={{ color:S.dm, fontSize:S.ti, fontWeight:700, marginBottom:6 }}>
              Bay {g.members.map(b=>b.bay).sort((a,b)=>parseInt(a,10)-parseInt(b,10)).join(' / ')}
            </div>
            {groupOOG.map((c, i) => (
              <div key={c.id + i} style={{ display:'flex', alignItems:'center', gap:8, padding:'6px 4px', borderTop:`1px solid ${S.bd2}`, flexWrap:'wrap' }}>
                <span style={{ color:S.or, fontFamily:'monospace', fontWeight:700, fontSize:S.xs }}>{c.id}</span>
                <span style={{ color:S.dm, fontSize:S.ti }}>Bay {c.bay} · {c.holdDeck}</span>
                <span style={{ color:S.dm, fontSize:S.ti }}>{c.size}'{c.type}</span>
                <span style={{ color:S.dm, fontSize:S.ti }}>{c.weight||0} kg</span>
                <span style={{ color:S.dm, fontSize:S.ti, marginLeft:'auto' }}>{c.pol||'—'} → {c.pod||'—'}</span>
                {c.oogDims && c.oogDims.length > 0 && (
                  <span style={{ color:S.or, fontSize:S.ti }}>📐 {c.oogDims.length} dim flag{c.oogDims.length===1?'':'s'}</span>
                )}
              </div>
            ))}
          </Card>
        );
      })}
    </div>
  );
}

// ─── LASHING STATUS ───────────────────────────────────────────────────────────
// Replaces the old wind/sea-state lashing force calculator. This is a simple
// per-bay Completed/Remaining tracker for deck lashing, reusing the existing
// bay.lashingDone field (no new data model needed). Reads/writes the live
// portOp via the same IndexedDB key as ContainerLiveOps/ContainerSearch.
function LashingStatus() {
  const SETUP_KEY = 'cargo_container_port_op';
  const [portOp, setPortOp] = useState(null);
  const [loaded, setLoaded] = useState(false);
  const [filter, setFilter] = useState('40ft'); // '40ft' | 'loaded' | 'all'

  useEffect(() => {
    let mounted = true;
    idbGetCargo(SETUP_KEY, null).then(data => {
      if (!mounted) return;
      setPortOp(data);
      setLoaded(true);
    });
    return () => { mounted = false; };
  }, []);

  const toggleLashing = async (bayNumber) => {
    if (!portOp) return;
    const updatedBays = portOp.bays.map(b => b.bay === bayNumber ? { ...b, lashingDone: !b.lashingDone } : b);
    const updated = { ...portOp, bays: updatedBays };
    setPortOp(updated);
    await idbSetCargo(SETUP_KEY, updated);
  };

  if (!loaded) {
    return <div style={{ textAlign:'center', padding:'30px 0', color:S.dm, fontSize:S.xs }}>Loading…</div>;
  }
  if (!portOp) {
    return <Card><div style={{ color:S.vd, fontSize:S.xs, textAlign:'center', padding:'16px 0' }}>No port operation set up yet. Import a loading plan first.</div></Card>;
  }

  const bays = portOp.bays || [];

  // Deck-only: only bays with at least one deck container, or deckLoad/deckDisch > 0
  // for bays without per-container data, are relevant for lashing.
  const hasDeckCargo = (b) => {
    if (b.containers && b.containers.length > 0) return b.containers.some(c => c.holdDeck === 'Deck');
    return (b.deckLoad + b.deckDisch) > 0;
  };

  let visibleBays = bays.filter(hasDeckCargo);
  if (filter === '40ft') visibleBays = visibleBays.filter(b => parseInt(b.bay, 10) % 2 === 0);
  else if (filter === 'loaded') visibleBays = visibleBays.filter(b => b.status === 'completed' || b.doneLoad > 0);
  // 'all' keeps everything with deck cargo, including 20ft bays

  const groups = groupBaysByMasterBay(visibleBays);
  const completedCount = visibleBays.filter(b => b.lashingDone).length;

  return (
    <div>
      <Card style={{ marginBottom: 10 }}>
        <SectionLabel text="Lashing Status" color={ACC} />
        <div style={{ display:'flex', gap:5, marginBottom:10 }}>
          {[['40ft','40ft Bays'],['loaded','Loaded Bays'],['all','All Bays']].map(([v,l]) => (
            <button key={v} onClick={()=>setFilter(v)} style={{
              flex:1, background:filter===v?`${ACC}20`:'transparent',
              border:`1px solid ${filter===v?ACC:S.vd}`, color:filter===v?ACC:S.dm,
              borderRadius:5, padding:'6px 4px', fontSize:S.xs, cursor:'pointer', fontWeight:filter===v?700:400,
            }}>{l}</button>
          ))}
        </div>
        <div style={{ display:'flex', justifyContent:'space-between', color:S.dm, fontSize:S.xs }}>
          <span>Deck bays shown: {visibleBays.length}</span>
          <span style={{ color:completedCount===visibleBays.length && visibleBays.length>0 ? S.gn : S.gd, fontWeight:700 }}>{completedCount}/{visibleBays.length} completed</span>
        </div>
      </Card>

      {groups.length === 0 && (
        <Card><div style={{ color:S.vd, fontSize:S.xs, textAlign:'center', padding:'16px 0' }}>No deck bays match this filter</div></Card>
      )}

      {groups.map(g => (
        <Card key={g.masterBay} style={{ marginBottom: 8 }}>
          <div style={{ color:S.dm, fontSize:S.ti, fontWeight:700, marginBottom:6 }}>
            Bay {g.members.map(b=>b.bay).sort((a,b)=>parseInt(a,10)-parseInt(b,10)).join(' / ')}
          </div>
          {g.members.map(b => (
            <div key={b.bay} style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'6px 4px', borderTop:`1px solid ${S.bd2}` }}>
              <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                <span style={{ color:ACC, fontFamily:'monospace', fontWeight:700, fontSize:S.xs }}>Bay {b.bay}</span>
                <span style={{ color:S.dm, fontSize:S.ti }}>{parseInt(b.bay,10)%2===0 ? '40ft' : '20ft'}</span>
              </div>
              <button onClick={()=>toggleLashing(b.bay)} style={{
                background: b.lashingDone ? `${S.gn}20` : `${S.gd}15`,
                border: `1px solid ${b.lashingDone ? S.gn : S.gd}`,
                color: b.lashingDone ? S.gn : S.gd,
                borderRadius:6, padding:'5px 12px', fontSize:S.xs, cursor:'pointer', fontWeight:700,
              }}>
                {b.lashingDone ? '✓ Completed' : 'Remaining'}
              </button>
            </div>
          ))}
        </Card>
      ))}
    </div>
  );
}


// ─── CONTAINER SEARCH (Step 1 addition) ──────────────────────────────────────
// Read-only search across all containers recorded across all bays in the
// current port operation. Reads portOp via the same IndexedDB key used by
// ContainerLiveOps, since this is a sibling tab rather than a nested child.
function ContainerSearch() {
  const SETUP_KEY = 'cargo_container_port_op'; // same key ContainerLiveOps uses — must stay identical
  const [portOp, setPortOp] = useState(null);
  const [loaded, setLoaded] = useState(false);

  const [q,        setQ]        = useState('');
  const [filterBay, setFilterBay] = useState('');
  const [filterPod, setFilterPod] = useState('');
  const [filterPol, setFilterPol] = useState('');
  const [filterDg,  setFilterDg]  = useState('');
  const [filterReefer, setFilterReefer] = useState(false);
  const [filterOOG,    setFilterOOG]    = useState(false);
  const [portFilterPort, setPortFilterPort] = useState('');
  const [portFilterMode, setPortFilterMode] = useState('all');

  useEffect(() => {
    let mounted = true;
    idbGetCargo(SETUP_KEY, null).then(data => {
      if (!mounted) return;
      setPortOp(data);
      setLoaded(true);
      if (data && data.port) setPortFilterPort(data.port);
    });
    return () => { mounted = false; };
  }, []);

  if (!loaded) {
    return (
      <div style={{ display:'flex', alignItems:'center', justifyContent:'center', padding:'40px 0', color:S.dm, fontSize:S.xs }}>
        Loading container records…
      </div>
    );
  }

  if (!portOp) {
    return (
      <Card>
        <div style={{ color:S.vd, fontSize:S.xs, textAlign:'center', padding:'16px 0' }}>
          No port operation set up yet. Configure one under "⚡ Live Cargo Ops" first.
        </div>
      </Card>
    );
  }

  // Flatten containers across all bays, attaching parent bay/status context.
  const allContainers = (portOp.bays || []).flatMap(b =>
    (b.containers || []).map(c => ({ ...c, bay: b.bay, bayStatus: b.status }))
  );

  const filtered = allContainers.filter(c => {
    if (q && !c.id.includes(q.toUpperCase())) return false;
    if (filterBay && c.bay !== filterBay) return false;
    if (filterPod && !(c.pod || '').toLowerCase().includes(filterPod.toLowerCase())) return false;
    if (filterPol && !(c.pol || '').toLowerCase().includes(filterPol.toLowerCase())) return false;
    if (filterDg && c.dgClass !== filterDg) return false;
    if (filterReefer && !c.reefer) return false;
    if (filterOOG && !c.oog) return false;
    return true;
  });

  const bayOptions = [...new Set((portOp.bays || []).map(b => b.bay))].sort();
  const availablePorts = collectPortsFromContainers(allContainers);
  const portFilterState = getPortFilterState(allContainers, portFilterPort, portFilterMode);

  return (
    <div>
      <Card style={{ marginBottom: 10 }}>
        <SectionLabel text="Container Search" color={ACC} />
        <Field label="Container ID" value={q} onChange={e=>setQ(e.target.value)} placeholder="e.g. MSCU1234567" color={ACC} />
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'0 10px' }}>
          <div style={{ marginBottom:8 }}>
            <div style={{ color:S.dm, fontSize:S.lb, marginBottom:3 }}>Bay</div>
            <select value={filterBay} onChange={e=>setFilterBay(e.target.value)} style={{ width:'100%', background:S.bg3, color:S.cy, border:`1px solid ${S.bd2}`, borderRadius:5, padding:'6px 8px', fontSize:S.xs }}>
              <option value=''>— Any Bay —</option>
              {bayOptions.map(b => <option key={b} value={b}>Bay {b}</option>)}
            </select>
          </div>
          <div style={{ marginBottom:8 }}>
            <div style={{ color:S.dm, fontSize:S.lb, marginBottom:3 }}>DG Class</div>
            <select value={filterDg} onChange={e=>setFilterDg(e.target.value)} style={{ width:'100%', background:S.bg3, color:filterDg?S.rd:S.cy, border:`1px solid ${S.bd2}`, borderRadius:5, padding:'6px 8px', fontSize:S.xs }}>
              <option value=''>— Any Class —</option>
              {DG_CLASSES.filter(c => c).map(c => <option key={c} value={c}>Class {c}</option>)}
            </select>
          </div>
          <Field label="POL" value={filterPol} onChange={e=>setFilterPol(e.target.value)} placeholder="Port of Loading" />
          <Field label="POD" value={filterPod} onChange={e=>setFilterPod(e.target.value)} placeholder="Port of Discharge" />
        </div>
        <div style={{ display:'flex', gap:6 }}>
          {[['reefer','❄ Reefer Only', filterReefer, setFilterReefer, S.cy],['oog','📐 OOG Only', filterOOG, setFilterOOG, S.or]].map(([k,l,val,setter,c]) => (
            <button key={k} onClick={()=>setter(v=>!v)} style={{
              flex:1, background:val?`${c}20`:'transparent',
              border:`1px solid ${val?c:S.vd}`, color:val?c:S.dm,
              borderRadius:5, padding:'6px 4px', fontSize:S.xs, cursor:'pointer', fontWeight:val?700:400,
            }}>{l}</button>
          ))}
        </div>
      </Card>

      <PortFilterBar ports={availablePorts} selectedPort={portFilterPort} onSelectPort={setPortFilterPort}
        mode={portFilterMode} onSelectMode={setPortFilterMode} />

      <div style={{ color:S.dm, fontSize:S.ti, marginBottom:6 }}>
        {filtered.length} of {allContainers.length} container record{allContainers.length === 1 ? '' : 's'} match
      </div>

      <Card>
        {filtered.length === 0
          ? <div style={{ color:S.vd, fontSize:S.xs, textAlign:'center', padding:'16px 0', fontStyle:'italic' }}>
              No containers match these filters
            </div>
          : (
            <div style={{ display:'flex', flexDirection:'column', gap:5 }}>
              {filtered.map((c, i) => {
                const portFilterActive = portFilterState && portFilterState.mode && portFilterState.mode !== 'all' && portFilterState.selectedPort;
                const portMatches = !portFilterActive || portFilterState.highlightedIds.has(c.id);
                const isNew = portFilterState.newIds && portFilterState.newIds.has(c.id);
                return (
                <div key={c.id + i} style={{ background:S.bg3, borderRadius:7, padding:'8px 10px', opacity: portMatches ? 1 : 0.4, border: isNew ? `1px solid ${S.gn}` : '1px solid transparent' }}>
                  <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:4, flexWrap:'wrap', gap:4 }}>
                    <span style={{ color:ACC, fontFamily:'monospace', fontWeight:700, fontSize:S.xs }}>{c.id}</span>
                    <div style={{ display:'flex', gap:4 }}>
                      <Badge text={`BAY ${c.bay}`} color={STATUS_COLOR[c.bayStatus] || S.dm} />
                      {c.dgClass && <Badge text={`DG${c.dgClass}`} color={S.rd} />}
                      {c.reefer && <Badge text="RF" color={S.cy} />}
                      {c.oog && <Badge text="OOG" color={S.or} />}
                      {isNew && <Badge text="NEW" color={S.gn} />}
                    </div>
                  </div>
                  <div style={{ display:'flex', gap:14, flexWrap:'wrap', fontSize:S.ti }}>
                    <div><span style={{ color:S.dm }}>Size: </span><span style={{ color:S.tx }}>{c.size}'{c.type}</span></div>
                    <div><span style={{ color:S.dm }}>Pos: </span><span style={{ color:S.tx }}>{c.holdDeck}</span></div>
                    <div><span style={{ color:S.dm }}>Wt: </span><span style={{ color:S.tx }}>{c.weight || 0} kg</span></div>
                    <div><span style={{ color:S.dm }}>POL: </span><span style={{ color:S.tx }}>{c.pol || '—'}</span></div>
                    <div><span style={{ color:S.dm }}>POD: </span><span style={{ color:S.tx }}>{c.pod || '—'}</span></div>
                  </div>
                </div>
                );
              })}
            </div>
          )}
      </Card>
    </div>
  );
}

// ─── BAPLIE EDIFACT IMPORT (Step 1.5 addition) ───────────────────────────────
// Parses a real UN/EDIFACT BAPLIE (D.95B / SMDG 2.2.1) bay-plan message into
// the bay.containers[] model. Field mapping was derived and verified against
// a real MSC BAPLIE file plus the official SMDG BAPLIE 2.2.1 user manual.
// This section is purely additive — it does not alter any existing function.

// BAPLIE segments are terminated by "'" (not newlines). Strip CR/LF first.
function baplieSplitSegments(rawText) {
  const cleaned = rawText.replace(/[\r\n]/g, '');
  return cleaned.split("'").map(s => s.trim()).filter(Boolean);
}

// Stowage cell code per SMDG ISO-format: BBBRRTT = bay(3) + row(2) + tier(2).
// Confirmed against real data: tier is always even; tier <=22 => Hold,
// tier >=70 => Deck (clean gap, no values fall between 23-69).
function baplieDecodeStowage(code) {
  const clean = code.split(':')[0];
  if (clean.length < 7) return null;
  const bay = clean.substring(0, 3);
  const row = clean.substring(3, 5);
  const tier = clean.substring(5, 7);
  const tierNum = parseInt(tier, 10);
  const holdDeck = tierNum >= 70 ? 'Deck' : 'Hold';
  return { bay, row, tier, holdDeck };
}

// ISO 6346 size/type code, e.g. "45G1", "22R1", "4530".
function baplieDecodeIsoSizeType(code) {
  if (!code) return { size: '', type: '' };
  const lengthChar = code[0];
  const sizeMap = { '2': '20', '4': '40', 'L': '45', 'M': '45' };
  const size = sizeMap[lengthChar] || '';
  const typeChars = code.substring(2, 4);
  let type = 'GP';
  if (typeChars.startsWith('R')) type = 'RF';
  else if (typeChars.startsWith('T')) type = 'TK';
  else if (typeChars.startsWith('U')) type = 'OT';
  else if (typeChars.startsWith('P')) type = 'FR';
  else if (typeChars.startsWith('G')) type = 'GP';
  return { size, type };
}

// Main BAPLIE parser. Pure function: text in, structured result out.
function parseBaplie(rawText) {
  const segments = baplieSplitSegments(rawText);
  const containers = [];
  const warnings = [];
  let currentPort = '';
  let nextPort = '';
  let vesselName = '';
  let cur = null;

  const pushCur = () => {
    if (cur && cur.id) containers.push(cur);
    cur = null;
  };

  for (const seg of segments) {
    const fields = seg.split('+');
    const tag = fields[0];

    if (tag === 'TDT') {
      const last = fields[fields.length - 1] || '';
      const parts = last.split(':');
      vesselName = parts[2] || parts[0] || '';
    } else if (tag === 'LOC') {
      const qualifier = fields[1];
      const locField = fields[2] || '';
      const locCode = locField.split(':')[0];

      if (qualifier === '5') {
        currentPort = locCode; // Place of Departure = current port for this snapshot
      } else if (qualifier === '61') {
        nextPort = locCode; // Next port of call
      } else if (qualifier === '147') {
        pushCur();
        const pos = baplieDecodeStowage(locField);
        if (!pos) {
          warnings.push(`Unparseable stowage code: ${locField}`);
          cur = { id: '', _skip: true };
        } else {
          cur = {
            id: '', weight: 0, pol: '', pod: '', originalPol: '', finalDestination: '',
            size: '', type: '', dgClass: '', dgClasses: [], reefer: false, reeferSetTemp: '',
            reeferRangeMin: '', reeferRangeMax: '', oog: false, oogDims: [],
            holdDeck: pos.holdDeck, bay: pos.bay, row: pos.row, tier: pos.tier,
            verifiedWeight: false, fullEmpty: 'full',
          };
        }
      } else if (cur) {
        if (qualifier === '9' && !cur.pol) cur.pol = locCode;       // Port of Loading
        else if (qualifier === '11' && !cur.pod) cur.pod = locCode; // Port of Discharge
        else if (qualifier === '76') cur.originalPol = locCode;     // Original Port of Loading
        else if (qualifier === '83') cur.finalDestination = locCode; // Place of Delivery
      }
    } else if (tag === 'MEA' && cur) {
      const qual = fields[1]; // 'VGM' = verified gross mass, 'WT' = unverified
      const valuePart = fields[fields.length - 1] || '';
      const kg = parseFloat(valuePart.split(':')[1] || valuePart.split(':')[0]);
      if (!isNaN(kg)) {
        cur.weight = kg;
        cur.verifiedWeight = qual === 'VGM';
      }
    } else if (tag === 'EQD' && cur) {
      const id = fields[2];
      const isoCode = fields[3] || '';
      const flag = fields[fields.length - 1];
      cur.id = (id || '').trim().toUpperCase();
      const st = baplieDecodeIsoSizeType(isoCode);
      cur.size = st.size;
      cur.type = st.type;
      cur.fullEmpty = flag === '4' ? 'empty' : 'full'; // 5=Full, 4=Empty
    } else if (tag === 'DGS' && cur) {
      const hazardField = fields[2] || '';
      const dgClass = hazardField.split(':')[0];
      const unNoField = fields[3] || '';
      const unNo = unNoField.split(':')[0];
      if (dgClass) {
        cur.dgClasses.push({ class: dgClass, unNo });
        if (!cur.dgClass) cur.dgClass = dgClass; // primary class = first DGS encountered
      }
    } else if (tag === 'TMP' && cur) {
      const tempField = fields[2] || '';
      cur.reefer = true;
      cur.reeferSetTemp = tempField.split(':')[0];
    } else if (tag === 'RNG' && cur) {
      const parts = (fields[2] || '').split(':');
      cur.reeferRangeMin = parts[1] || '';
      cur.reeferRangeMax = parts[2] || '';
    } else if (tag === 'DIM' && cur) {
      const qual = fields[1]; // qualifiers 5-9 = over-length/width/height (OOG)
      if (['5', '6', '7', '8', '9'].includes(qual)) {
        cur.oog = true;
        cur.oogDims.push({ qualifier: qual, raw: fields[2] || '' });
      }
    }
  }
  pushCur();

  const skipped = containers.filter(c => c._skip).length;
  const clean = containers.filter(c => !c._skip && c.id);

  return {
    containers: clean,
    currentPort,
    nextPort,
    vesselName,
    warnings,
    skippedCount: skipped,
    totalParsed: clean.length,
  };
}

// Builds a portOp object (same shape SetupWizard produces) from parsed BAPLIE
// containers. Auto-creates one bay entry per unique bay code found, and sets
// planLoad/planDisch from containers whose pol/pod match the BAPLIE's current
// port (LOC+5), per the confirmed import behavior. doneLoad/doneDisch start
// at 0 — actual progress is still ticked manually as before.
function buildPortOpFromBaplie(parsed, portName, vesselNameOverride) {
  const byBay = {};
  for (const c of parsed.containers) {
    if (!byBay[c.bay]) byBay[c.bay] = [];
    byBay[c.bay].push(c);
  }

  const bayList = Object.keys(byBay).sort().map(bayCode => {
    const list = byBay[bayCode];
    const planLoad = list.filter(c => c.pol === parsed.currentPort).length;
    const planDisch = list.filter(c => c.pod === parsed.currentPort).length;
    const isDG = list.some(c => c.dgClass);
    const isReefer = list.some(c => c.reefer);
    const deckLoad = list.filter(c => c.holdDeck === 'Deck' && c.pol === parsed.currentPort).length;
    const holdLoad = list.filter(c => c.holdDeck === 'Hold' && c.pol === parsed.currentPort).length;
    const deckDisch = list.filter(c => c.holdDeck === 'Deck' && c.pod === parsed.currentPort).length;
    const holdDisch = list.filter(c => c.holdDeck === 'Hold' && c.pod === parsed.currentPort).length;

    return {
      bay: bayCode,
      status: 'idle',
      crane: '',
      planLoad, planDisch, planRest: 0,
      doneLoad: 0, doneDisch: 0, doneRest: 0,
      deckLoad, deckDisch, holdLoad, holdDisch,
      isDG, isReefer,
      startTime: '', endTime: '', notes: '',
      lashingDone: false,
      containers: list,
    };
  });

  return {
    port: portName || parsed.currentPort || 'Imported Port',
    vessel: vesselNameOverride || parsed.vesselName || '',
    bayType: 'custom', customStep: 1,
    bayFrom: 0, bayTo: 0,
    gantries: 2, movesPerHr: 25,
    totalLoad: bayList.reduce((s, b) => s + b.planLoad, 0),
    totalDisch: bayList.reduce((s, b) => s + b.planDisch, 0),
    totalRest: 0,
    createdAt: clNowFull(),
    bays: bayList,
  };
}

// ─── MSC BAYPLAN XML IMPORT (additive — second supported import format) ─────
// Some planners send MSC's proprietary "BayPlan" XML export instead of BAPLIE
// EDIFACT. Confirmed against a real 3,027-container MSC AZRA file. Key
// difference from BAPLIE: StowPosition here is 6 digits (bay 2 + row 2 +
// tier 2), NOT 7 digits (bay 3 + row 2 + tier 2) like BAPLIE — same tier
// threshold rule applies (tier <=22 => Hold, tier >=70 => Deck).
function isMscBayPlanXml(text) {
  return text.includes('<BayPlan>') && text.includes('<Containers>');
}

// Extracts the text content of a simple (non-repeating) XML tag from a block.
function xmlTag(block, tag) {
  const m = block.match(new RegExp(`<${tag}>([\\s\\S]*?)</${tag}>`));
  return m ? m[1].trim() : '';
}

// MSC's HazardousCargo Class is a 2-digit code: first digit = IMDG class,
// second digit = division (e.g. "42" => Class 4, Division 2). A single-digit
// class (no division) is left as-is.
function decodeMscDgClass(code) {
  const c = (code || '').trim();
  if (!c) return '';
  if (c.length >= 2) return `${c[0]}.${c.slice(1)}`;
  return c;
}

function decodeMscStowPosition(code) {
  const clean = (code || '').trim();
  if (clean.length < 6) return null;
  const bay = clean.substring(0, 2);
  const row = clean.substring(2, 4);
  const tier = clean.substring(4, 6);
  const tierNum = parseInt(tier, 10);
  const holdDeck = tierNum >= 70 ? 'Deck' : 'Hold';
  return { bay, row, tier, holdDeck };
}

function parseMscBayPlanXml(rawText) {
  const warnings = [];
  const vesselName = xmlTag(rawText, 'VesselName');
  const loadingPort = xmlTag(rawText, 'LoadingPort'); // used as "current port" reference, same role as BAPLIE's LOC+5
  const voyage = xmlTag(rawText, 'Voyage');

  const containerBlocks = rawText.split('<Container>').slice(1).map(s => s.split('</Container>')[0]);
  const containers = [];

  for (const block of containerBlocks) {
    const id = xmlTag(block, 'ContainerNumber').toUpperCase();
    if (!id) { warnings.push('Container block with no ContainerNumber skipped'); continue; }

    const stowRaw = xmlTag(block, 'StowPosition');
    const pos = decodeMscStowPosition(stowRaw);
    if (!pos) { warnings.push(`Unparseable StowPosition for ${id}: ${stowRaw}`); continue; }

    const isoCode = xmlTag(block, 'CtrIsoCode');
    const st = baplieDecodeIsoSizeType(isoCode); // reuse existing ISO 6346 decoder — same code format

    const isReefer = xmlTag(block, 'IsReeferContainer') === 'true';
    const isOOG = xmlTag(block, 'IsOverDimensionContainer') === 'true' || xmlTag(block, 'IsOverSlotContainer') === 'true';
    const fullEmptyRaw = xmlTag(block, 'FullEmpty');

    // HazardousCargos can contain multiple HazardousCargo entries per container.
    const dgClasses = [];
    const hazBlocks = block.split('<HazardousCargo>').slice(1).map(s => s.split('</HazardousCargo>')[0]);
    for (const hz of hazBlocks) {
      const cls = decodeMscDgClass(xmlTag(hz, 'Class'));
      const unNo = xmlTag(hz, 'UNNumber');
      if (cls) dgClasses.push({ class: cls, unNo });
    }

    containers.push({
      id,
      weight: parseFloat(xmlTag(block, 'GrossWeight')) || 0,
      pol: xmlTag(block, 'LoadingPort'),
      pod: xmlTag(block, 'DischargingPort'),
      originalPol: xmlTag(block, 'OriginPort'),
      finalDestination: xmlTag(block, 'FinalDischargePort') || xmlTag(block, 'DestinationPort'),
      size: st.size, type: st.type,
      dgClass: dgClasses.length ? dgClasses[0].class : '',
      dgClasses,
      reefer: isReefer, reeferSetTemp: '', reeferRangeMin: '', reeferRangeMax: '',
      oog: isOOG, oogDims: [],
      holdDeck: pos.holdDeck, bay: pos.bay, row: pos.row, tier: pos.tier,
      verifiedWeight: xmlTag(block, 'VerifiedGrossMass') === 'Y',
      fullEmpty: fullEmptyRaw === 'E' ? 'empty' : 'full',
    });
  }

  return {
    containers,
    currentPort: loadingPort,
    nextPort: '', // not present in this XML format — only the rotation file has full schedule
    vesselName: vesselName + (voyage ? ` (${voyage})` : ''),
    warnings,
    skippedCount: containerBlocks.length - containers.length,
    totalParsed: containers.length,
  };
}

// ─── BAPLIE IMPORT UI ─────────────────────────────────────────────────────────
// ─── SHIP PARTICULARS SETUP ──────────────────────────────────────────────────
// Lets the user define the vessel's actual bay/row/tier design once, persisted
// to Firestore (and mirrored to IndexedDB). Uses a template + bulk-assign
// approach so ~80+ bays don't need to be entered one at a time: define a few
// reusable templates, apply each to a bay range, then fine-tune individual
// bays afterward if needed.
function ShipParticularsSetup() {
  const [vesselName, setVesselName] = useState('');
  const [templates, setTemplates] = useState([
    { id: 't1', name: 'Standard 40ft', maxRowPort: 8, maxRowStbd: 8, maxTierHold: 8, maxTierDeck: 6 },
  ]);
  const [bays, setBays] = useState([]); // [{ bay, templateId, maxRowPort, maxRowStbd, maxTierHold, maxTierDeck }]
  const [loaded, setLoaded] = useState(false);
  const [saving, setSaving] = useState(false);
  const [savedAt, setSavedAt] = useState('');

  // Bulk-assign form state
  const [rangeFrom, setRangeFrom] = useState('1');
  const [rangeTo, setRangeTo] = useState('86');
  const [rangeTemplateId, setRangeTemplateId] = useState('t1');
  const [editingBay, setEditingBay] = useState(null); // bay number being fine-tuned, or null

  useEffect(() => {
    let mounted = true;
    loadShipParticulars().then(data => {
      if (!mounted) return;
      if (data && !data.deleted) {
        setVesselName(data.vesselName || '');
        setTemplates(data.bayTemplates && data.bayTemplates.length ? data.bayTemplates : templates);
        setBays(data.bays || []);
        setSavedAt(data.updatedAt || '');
      }
      setLoaded(true);
    }).catch(() => { if (mounted) setLoaded(true); });
    return () => { mounted = false; };
  }, []);

  const addTemplate = () => {
    const id = 't' + Date.now();
    setTemplates(t => [...t, { id, name: 'New Template', maxRowPort: 8, maxRowStbd: 8, maxTierHold: 8, maxTierDeck: 6 }]);
  };
  const updateTemplate = (id, key, val) => {
    setTemplates(t => t.map(tpl => tpl.id === id ? { ...tpl, [key]: val } : tpl));
  };
  const deleteTemplate = (id) => {
    setTemplates(t => t.filter(tpl => tpl.id !== id));
  };

  const applyRangeToTemplate = () => {
    const from = parseInt(rangeFrom, 10), to = parseInt(rangeTo, 10);
    if (isNaN(from) || isNaN(to) || from > to) return;
    const tpl = templates.find(t => t.id === rangeTemplateId);
    if (!tpl) return;
    const newBays = [];
    for (let n = from; n <= to; n++) {
      const bayStr = String(n).padStart(2, '0');
      newBays.push({ bay: bayStr, templateId: tpl.id, maxRowPort: tpl.maxRowPort, maxRowStbd: tpl.maxRowStbd, maxTierHold: tpl.maxTierHold, maxTierDeck: tpl.maxTierDeck });
    }
    // Replace any existing entries in this range, keep everything outside it untouched.
    setBays(prev => {
      const outsideRange = prev.filter(b => { const n = parseInt(b.bay, 10); return n < from || n > to; });
      return [...outsideRange, ...newBays].sort((a, b) => parseInt(a.bay, 10) - parseInt(b.bay, 10));
    });
  };

  const updateBayOverride = (bayNum, key, val) => {
    setBays(prev => prev.map(b => b.bay === bayNum ? { ...b, [key]: val, templateId: 'custom' } : b));
  };

  const removeBay = (bayNum) => {
    setBays(prev => prev.filter(b => b.bay !== bayNum));
  };

  const handleSave = async () => {
    setSaving(true);
    const record = await saveShipParticulars({ vesselName, bayTemplates: templates, bays });
    setSavedAt(record.updatedAt);
    setSaving(false);
  };

  const handleClear = async () => {
    if (!window.confirm('Remove all ship particulars? This cannot be undone — you will need to set up bay configuration again.')) return;
    await deleteShipParticulars();
    setVesselName('');
    setBays([]);
    setSavedAt('');
  };

  if (!loaded) {
    return <div style={{ textAlign:'center', padding:'30px 0', color:S.dm, fontSize:S.xs }}>Loading ship particulars…</div>;
  }

  return (
    <div>
      <Card style={{ marginBottom: 10 }}>
        <SectionLabel text="Ship Particulars" color={ACC} />
        <div style={{ color:S.dm, fontSize:S.xs, marginBottom:8, lineHeight:1.6 }}>
          Define the vessel's actual bay/row/tier design once. This generates the full
          empty stowage grid (every valid slot shown, whether occupied or not) and is
          saved to Firestore so it persists until you change or remove it.
        </div>
        <Field label="Vessel Name" value={vesselName} onChange={e=>setVesselName(e.target.value)} placeholder="e.g. MSC AZRA" />
        {savedAt && <div style={{ color:S.dm, fontSize:S.ti }}>Last saved: {savedAt}</div>}
      </Card>

      <Card style={{ marginBottom: 10 }}>
        <SectionLabel text="Bay Templates" color={S.cy} />
        <div style={{ color:S.dm, fontSize:S.ti, marginBottom:8 }}>
          Rows: Port = even (02,04…), Starboard = odd (01,03…), counted from centerline.
          Tiers: Hold = 02,04… up to your max; Deck = 72,74… for the number of deck levels you set.
        </div>
        {templates.map(t => (
          <div key={t.id} style={{ background:S.bg3, borderRadius:7, padding:'8px 10px', marginBottom:6 }}>
            <div style={{ display:'flex', gap:6, alignItems:'center', marginBottom:6 }}>
              <input value={t.name} onChange={e=>updateTemplate(t.id,'name',e.target.value)}
                style={{ flex:1, background:S.bg2, color:S.cy, border:`1px solid ${S.bd2}`, borderRadius:5, padding:'5px 7px', fontSize:S.xs }} />
              <button onClick={()=>deleteTemplate(t.id)} style={{ background:'transparent', border:'none', color:S.rd, cursor:'pointer', fontSize:'0.8rem' }}>✕</button>
            </div>
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr 1fr', gap:'0 6px' }}>
              {[['maxRowPort','Port Rows'],['maxRowStbd','Stbd Rows'],['maxTierHold','Hold Tiers'],['maxTierDeck','Deck Tiers']].map(([k,l]) => (
                <div key={k}>
                  <div style={{ color:S.dm, fontSize:'0.5rem', marginBottom:2 }}>{l}</div>
                  <input type="number" value={t[k]} min={0}
                    onChange={e=>updateTemplate(t.id,k,parseInt(e.target.value)||0)}
                    style={{ width:'100%', background:S.bg2, color:ACC, border:`1px solid ${S.bd2}`, borderRadius:4, padding:'4px 5px', fontSize:S.ti, fontFamily:'monospace' }} />
                </div>
              ))}
            </div>
          </div>
        ))}
        <Btn onClick={addTemplate} color={S.cy} style={{ width:'100%' }}>+ Add Template</Btn>
      </Card>

      <Card style={{ marginBottom: 10 }}>
        <SectionLabel text="Assign Template to Bay Range" color={S.gd} />
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'0 10px' }}>
          <Field label="From Bay" value={rangeFrom} onChange={e=>setRangeFrom(e.target.value)} type="number" />
          <Field label="To Bay" value={rangeTo} onChange={e=>setRangeTo(e.target.value)} type="number" />
        </div>
        <div style={{ marginBottom:8 }}>
          <div style={{ color:S.dm, fontSize:S.lb, marginBottom:3 }}>Template</div>
          <select value={rangeTemplateId} onChange={e=>setRangeTemplateId(e.target.value)}
            style={{ width:'100%', background:S.bg3, color:S.cy, border:`1px solid ${S.bd2}`, borderRadius:5, padding:'6px 8px', fontSize:S.xs }}>
            {templates.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
          </select>
        </div>
        <Btn onClick={applyRangeToTemplate} color={S.gd} style={{ width:'100%' }}>Apply to Bays {rangeFrom}–{rangeTo}</Btn>
      </Card>

      <Card style={{ marginBottom: 10 }}>
        <SectionLabel text={`Configured Bays (${bays.length})`} color={S.dm} />
        {bays.length === 0 ? (
          <div style={{ color:S.vd, fontSize:S.xs, fontStyle:'italic', textAlign:'center', padding:'10px 0' }}>No bays configured yet — apply a template above</div>
        ) : (
          <div style={{ maxHeight:280, overflowY:'auto' }}>
            {bays.map(b => (
              <div key={b.bay} style={{ background:S.bg3, borderRadius:6, padding:'6px 8px', marginBottom:4 }}>
                <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}
                  onClick={()=>setEditingBay(editingBay===b.bay?null:b.bay)}>
                  <span style={{ color:ACC, fontFamily:'monospace', fontWeight:700, fontSize:S.xs, cursor:'pointer' }}>Bay {b.bay}</span>
                  <span style={{ color:S.dm, fontSize:S.ti }}>
                    Rows {b.maxRowPort}P/{b.maxRowStbd}S · Hold {b.maxTierHold} · Deck {b.maxTierDeck}
                  </span>
                  <button onClick={(e)=>{e.stopPropagation();removeBay(b.bay);}} style={{ background:'transparent', border:'none', color:S.rd, cursor:'pointer', fontSize:'0.7rem' }}>✕</button>
                </div>
                {editingBay === b.bay && (
                  <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr 1fr', gap:'6px 6px', marginTop:6 }}>
                    {[['maxRowPort','Port Rows'],['maxRowStbd','Stbd Rows'],['maxTierHold','Hold Tiers'],['maxTierDeck','Deck Tiers']].map(([k,l]) => (
                      <div key={k}>
                        <div style={{ color:S.dm, fontSize:'0.5rem', marginBottom:2 }}>{l}</div>
                        <input type="number" value={b[k]} min={0}
                          onChange={e=>updateBayOverride(b.bay,k,parseInt(e.target.value)||0)}
                          style={{ width:'100%', background:S.bg2, color:S.gd, border:`1px solid ${S.bd2}`, borderRadius:4, padding:'4px 5px', fontSize:S.ti, fontFamily:'monospace' }} />
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </Card>

      <div style={{ display:'flex', gap:8 }}>
        <Btn onClick={handleSave} color={S.gn} style={{ flex:1, padding:'10px' }}>{saving ? 'Saving…' : '💾 Save Ship Particulars'}</Btn>
        <Btn onClick={handleClear} color={S.rd} style={{ padding:'10px 14px' }}>Clear</Btn>
      </div>
    </div>
  );
}

function BaplieImport() {
  const SETUP_KEY = 'cargo_container_port_op'; // same key ContainerLiveOps/ContainerSearch use
  const SAVED_PLANS_KEY = 'cargo_container_saved_plans'; // array of {id, fileName, format, importedAt, summary, portOp}
  const [fileName, setFileName] = useState('');
  const [parsed, setParsed] = useState(null);
  const [detectedFormat, setDetectedFormat] = useState('');
  const [error, setError] = useState('');
  const [importing, setImporting] = useState(false);
  const [imported, setImported] = useState(false);
  const [savedPlans, setSavedPlans] = useState([]);
  const [savedPlansLoaded, setSavedPlansLoaded] = useState(false);
  const fileInputRef = useRef(null);

  useEffect(() => {
    let mounted = true;
    idbGetCargo(SAVED_PLANS_KEY, []).then(list => {
      if (!mounted) return;
      setSavedPlans(Array.isArray(list) ? list : []);
      setSavedPlansLoaded(true);
    });
    return () => { mounted = false; };
  }, []);

  const handleFile = (file) => {
    setError('');
    setParsed(null);
    setImported(false);
    setDetectedFormat('');
    setFileName(file.name);
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const text = e.target.result;
        // Auto-detect format: MSC BayPlan XML vs standard BAPLIE EDIFACT.
        // Detection does not assume file extension — some planners rename
        // files, so we check the actual content structure.
        const isXml = isMscBayPlanXml(text);
        const result = isXml ? parseMscBayPlanXml(text) : parseBaplie(text);
        setDetectedFormat(isXml ? 'MSC BayPlan XML' : 'BAPLIE EDIFACT');
        if (result.totalParsed === 0) {
          setError('No containers could be parsed from this file. Is it a valid BAPLIE (.edi/.txt) or MSC BayPlan (.xml) file?');
          return;
        }
        setParsed(result);
      } catch (err) {
        setError('Failed to parse file: ' + (err?.message || String(err)));
      }
    };
    reader.onerror = () => setError('Could not read the file.');
    reader.readAsText(file);
  };

  const onFileInputChange = (e) => {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
  };

  const onDrop = (e) => {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (file) handleFile(file);
  };

  const confirmImport = async () => {
    if (!parsed) return;
    setImporting(true);
    const op = buildPortOpFromBaplie(parsed, parsed.currentPort, parsed.vesselName);
    await idbSetCargo(SETUP_KEY, op); // Replace, per confirmed import behavior

    // Save this import to history so the user can reload it later without
    // re-uploading the file, alongside other previously imported plans.
    const record = {
      id: Date.now(),
      fileName,
      format: detectedFormat,
      importedAt: clNowFull(),
      port: op.port,
      vessel: op.vessel,
      totalContainers: parsed.totalParsed,
      bayCount: op.bays.length,
      portOp: op,
    };
    const updatedPlans = [record, ...savedPlans].slice(0, 20); // keep last 20
    setSavedPlans(updatedPlans);
    await idbSetCargo(SAVED_PLANS_KEY, updatedPlans);

    setImporting(false);
    setImported(true);
  };

  const reloadSavedPlan = async (record) => {
    await idbSetCargo(SETUP_KEY, record.portOp);
    setImported(true);
    setParsed({ totalParsed: record.totalContainers, currentPort: record.port, vesselName: record.vessel, containers: record.portOp.bays.flatMap(b => b.containers || []), warnings: [] });
    setDetectedFormat(record.format);
    setFileName(record.fileName);
  };

  const deleteSavedPlan = async (id) => {
    const updated = savedPlans.filter(p => p.id !== id);
    setSavedPlans(updated);
    await idbSetCargo(SAVED_PLANS_KEY, updated);
  };

  const dgCount = parsed ? parsed.containers.filter(c => c.dgClass).length : 0;
  const reeferCount = parsed ? parsed.containers.filter(c => c.reefer).length : 0;
  const oogCount = parsed ? parsed.containers.filter(c => c.oog).length : 0;
  const emptyCount = parsed ? parsed.containers.filter(c => c.fullEmpty === 'empty').length : 0;
  const bayCount = parsed ? new Set(parsed.containers.map(c => c.bay)).size : 0;
  const planLoadCount = parsed ? parsed.containers.filter(c => c.pol === parsed.currentPort).length : 0;
  const planDischCount = parsed ? parsed.containers.filter(c => c.pod === parsed.currentPort).length : 0;

  return (
    <div>
      <Card style={{ marginBottom: 10 }}>
        <SectionLabel text="Import Loading Plan (BAPLIE or MSC XML)" color={ACC} />
        <div style={{ color: S.dm, fontSize: S.xs, marginBottom: 10, lineHeight: 1.6 }}>
          Upload a UN/EDIFACT BAPLIE (.edi/.txt) or an MSC BayPlan XML (.xml)
          loading plan from your planner — the format is detected automatically.
          This will replace the current port operation entirely — all bays and
          containers will be rebuilt from the imported file.
        </div>

        <div
          onDrop={onDrop}
          onDragOver={(e) => e.preventDefault()}
          onClick={() => fileInputRef.current?.click()}
          style={{
            border: `2px dashed ${S.bd2}`, borderRadius: 8, padding: '24px 12px',
            textAlign: 'center', cursor: 'pointer', background: S.bg3, marginBottom: 10,
          }}
        >
          <div style={{ color: S.cy, fontSize: S.sm, fontWeight: 700, marginBottom: 4 }}>📥 Drop loading plan file here, or tap to browse</div>
          <div style={{ color: S.dm, fontSize: S.ti }}>{fileName || '.edi, .txt, or .xml'}</div>
          <input ref={fileInputRef} type="file" accept=".edi,.txt,.xml" onChange={onFileInputChange} style={{ display: 'none' }} />
        </div>

        {error && (
          <div style={{ background: 'rgba(255,71,87,0.12)', border: `1px solid ${S.rd}`, borderRadius: 6, padding: '8px 10px', color: S.rd, fontSize: S.xs, marginBottom: 8 }}>
            ⚠ {error}
          </div>
        )}
      </Card>

      {parsed && !imported && (
        <Card style={{ marginBottom: 10 }}>
          <SectionLabel text="Parse Summary — Review Before Import" color={S.gd} />
          {detectedFormat && (
            <div style={{ color: S.dm, fontSize: S.ti, marginBottom: 8 }}>Detected format: <span style={{ color: S.cy, fontWeight: 700 }}>{detectedFormat}</span></div>
          )}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 6, marginBottom: 10 }}>
            <StatBox label="Containers" value={parsed.totalParsed} color={ACC} />
            <StatBox label="Bays Found" value={bayCount} color={S.cy} />
            <StatBox label="Current Port" value={parsed.currentPort || '—'} color={S.gn} />
            <StatBox label="DG Containers" value={dgCount} color={dgCount > 0 ? S.rd : S.dm} />
            <StatBox label="Reefer" value={reeferCount} color={reeferCount > 0 ? S.cy : S.dm} />
            <StatBox label="OOG" value={oogCount} color={oogCount > 0 ? S.or : S.dm} />
            <StatBox label="Empty Units" value={emptyCount} color={S.dm} />
            <StatBox label="Loading Here" value={planLoadCount} color={ACC} sub="will set planLoad" />
            <StatBox label="Discharging Here" value={planDischCount} color={S.or} sub="will set planDisch" />
          </div>
          {parsed.vesselName && (
            <div style={{ color: S.dm, fontSize: S.xs, marginBottom: 6 }}>Vessel: <span style={{ color: S.tx, fontWeight: 600 }}>{parsed.vesselName}</span></div>
          )}
          {parsed.nextPort && (
            <div style={{ color: S.dm, fontSize: S.xs, marginBottom: 6 }}>Next port of call: <span style={{ color: S.tx, fontWeight: 600 }}>{parsed.nextPort}</span></div>
          )}
          {parsed.warnings.length > 0 && (
            <div style={{ background: 'rgba(255,179,0,0.1)', border: `1px solid ${S.gd}44`, borderRadius: 6, padding: '8px 10px', color: S.gd, fontSize: S.xs, marginBottom: 8 }}>
              ⚠ {parsed.warnings.length} warning(s) during parsing — {parsed.warnings.slice(0, 3).join('; ')}
            </div>
          )}
          <div style={{ background: 'rgba(255,71,87,0.08)', border: `1px solid ${S.rd}44`, borderRadius: 6, padding: '8px 10px', color: S.rd, fontSize: S.xs, marginBottom: 10 }}>
            ⚠ Importing will REPLACE your current port operation (all existing bays and containers will be cleared and rebuilt from this file).
          </div>
          <Btn onClick={confirmImport} color={S.gn} style={{ width: '100%', padding: '10px' }}>
            {importing ? 'Importing…' : `✓ Confirm Import — Replace Current Port Operation`}
          </Btn>
        </Card>
      )}

      {imported && (
        <Card style={{ marginBottom: 10 }}>
          <div style={{ color: S.gn, fontSize: S.sm, fontWeight: 700, textAlign: 'center', padding: '10px 0' }}>
            ✅ {fileName ? 'Loaded' : 'Import complete'} — {parsed.totalParsed} containers across {bayCount} bays.
          </div>
          <div style={{ color: S.dm, fontSize: S.xs, textAlign: 'center' }}>
            Switch to "⚡ Live Cargo Ops" to view the dashboard, or "🔍 Container Search" to look up containers.
          </div>
        </Card>
      )}

      {/* ── SAVED PLANS ── */}
      <Card>
        <SectionLabel text={`Saved Plans (${savedPlans.length})`} color={S.dm} />
        {!savedPlansLoaded ? (
          <div style={{ color: S.dm, fontSize: S.xs, textAlign: 'center', padding: '10px 0' }}>Loading…</div>
        ) : savedPlans.length === 0 ? (
          <div style={{ color: S.vd, fontSize: S.xs, fontStyle: 'italic', textAlign: 'center', padding: '10px 0' }}>
            No saved plans yet — successful imports are saved here automatically.
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {savedPlans.map(p => (
              <div key={p.id} style={{ background: S.bg3, borderRadius: 7, padding: '8px 10px', display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                <div style={{ flex: 1, minWidth: 140 }}>
                  <div style={{ color: S.tx, fontSize: S.xs, fontWeight: 600 }}>{p.fileName}</div>
                  <div style={{ color: S.dm, fontSize: S.ti }}>
                    {p.format} · {p.totalContainers} containers · {p.bayCount} bays · {p.vessel || '—'} · {p.importedAt}
                  </div>
                </div>
                <Btn onClick={() => reloadSavedPlan(p)} color={ACC} style={{ padding: '5px 10px', fontSize: S.ti }}>↺ Reload</Btn>
                <button onClick={() => deleteSavedPlan(p.id)} style={{ background: 'transparent', border: 'none', color: S.rd, cursor: 'pointer', fontSize: '0.8rem' }}>✕</button>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// GAS CARRIER TABS
// ══════════════════════════════════════════════════════════════════════════════
function GasBoilOff() {
  const ACC = VESSEL_COLORS.gas.accent;
  const KEY = 'cargo_gas_boiloff';
  const [entries, setEntries] = useState(() => load(KEY, []));
  const [form, setForm] = useState({ ts: new Date().toISOString().slice(0,16), cargoOnboard: '', boilOffRate: '', lngPrice: '', reliquefied: 'No', gCVValue: '53.6', remarks: '' });
  const set = k => e => setForm(f => ({ ...f, [k]: e.target.value }));
  const calc = () => {
    const c = parseFloat(form.cargoOnboard), r = parseFloat(form.boilOffRate) / 100, p = parseFloat(form.lngPrice), g = parseFloat(form.gCVValue);
    if (!c || !r) return null;
    const dailyBoilOff = c * r;
    const dailyCost    = p ? dailyBoilOff * p : null;
    const energyMJ     = dailyBoilOff * g * 1000;
    return { dailyBoilOff: dailyBoilOff.toFixed(1), dailyCost: dailyCost ? dailyCost.toFixed(0) : null, energyMJ: energyMJ.toFixed(0) };
  };
  const res = calc();
  const add = () => {
    if (!form.cargoOnboard || !form.boilOffRate) return;
    const r = calc();
    const e = [...entries, { ...form, dailyBoilOff: r?.dailyBoilOff || '' }];
    setEntries(e); save(KEY, e);
    setForm(f => ({ ...f, ts: new Date().toISOString().slice(0,16), cargoOnboard: '', remarks: '' }));
  };
  const del = i => { const e = entries.filter((_, j) => j !== i); setEntries(e); save(KEY, e); };
  const COLS = [
    { key: 'ts', label: 'Date/Time', w: 110 }, { key: 'cargoOnboard', label: 'COB (MT)', w: 70 },
    { key: 'boilOffRate', label: 'BOR %/day', w: 75 }, { key: 'dailyBoilOff', label: 'Daily BOG (MT)', w: 90 },
    { key: 'reliquefied', label: 'Reliq.', w: 50 }, { key: 'remarks', label: 'Remarks', w: 100 },
  ];
  return (
    <div>
      <Card style={{ marginBottom: 10 }}>
        <SectionLabel text="Boil-Off Rate Calculator" color={ACC} />
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 10px' }}>
          <Field label="Cargo On Board" value={form.cargoOnboard} onChange={set('cargoOnboard')} type="number" placeholder="MT" unit="MT" />
          <Field label="Boil-Off Rate" value={form.boilOffRate} onChange={set('boilOffRate')} type="number" placeholder="e.g. 0.15" unit="% /day" />
          <Field label="LNG Price (optional)" value={form.lngPrice} onChange={set('lngPrice')} type="number" placeholder="USD/MT" unit="$/MT" />
          <Field label="GCV Value" value={form.gCVValue} onChange={set('gCVValue')} type="number" placeholder="53.6" unit="MJ/kg" />
          <div style={{ marginBottom: 8, gridColumn: '1/-1' }}>
            <div style={{ color: S.dm, fontSize: S.lb, marginBottom: 3 }}>Reliquefaction Decision</div>
            <select value={form.reliquefied} onChange={set('reliquefied')} style={{ width: '100%', background: S.bg3, color: S.cy, border: `1px solid ${S.bd2}`, borderRadius: 5, padding: '6px 8px', fontSize: S.xs }}>
              {['No','Yes - Full Reliq','Yes - Partial','Burned as Fuel'].map(t => <option key={t}>{t}</option>)}
            </select>
          </div>
        </div>
        {res && (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8, marginBottom: 10 }}>
            {[
              ['Daily BOG', `${res.dailyBoilOff} MT`, ACC],
              ['Energy', `${parseInt(res.energyMJ).toLocaleString()} MJ`, S.cy],
              ['Daily Cost', res.dailyCost ? `$${parseInt(res.dailyCost).toLocaleString()}` : 'N/A', S.gd],
            ].map(([k, v, c]) => (
              <div key={k} style={{ background: S.bg3, borderRadius: 7, padding: '10px 12px', textAlign: 'center' }}>
                <div style={{ color: S.dm, fontSize: S.lb }}>{k}</div>
                <div style={{ color: c, fontFamily: 'monospace', fontSize: '0.88rem', fontWeight: 700, marginTop: 2 }}>{v}</div>
              </div>
            ))}
          </div>
        )}
        <Field label="Remarks" value={form.remarks} onChange={set('remarks')} placeholder="Tank conditions, reliq plant status…" />
        <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
          <Btn onClick={add} color={ACC} style={{ flex: 1 }}>+ Log BOG Entry</Btn>
          <Btn onClick={() => exportLog('Boil-Off Log', entries, COLS)} color={S.dm}>⬇ Export</Btn>
        </div>
      </Card>
      <Card>
        <SectionLabel text={`BOG Log (${entries.length})`} color={ACC} />
        <LogTable entries={entries} columns={COLS} onDelete={del} accent={ACC} />
      </Card>
    </div>
  );
}

function GasCompressorLog() {
  const ACC = VESSEL_COLORS.gas.accent;
  const KEY = 'cargo_gas_compressor';
  const [entries, setEntries] = useState(() => load(KEY, []));
  const [form, setForm] = useState({ ts: new Date().toISOString().slice(0,16), compressor: 'HD Compressor No.1', suctionPress: '', dischargePress: '', suctionTemp: '', dischargeTemp: '', rpm: '', runHours: '', remarks: '' });
  const set = k => e => setForm(f => ({ ...f, [k]: e.target.value }));
  const add = () => { if (!form.suctionPress) return; const e = [...entries, { ...form }]; setEntries(e); save(KEY, e); setForm(f => ({ ...f, ts: new Date().toISOString().slice(0,16), suctionPress: '', dischargePress: '', suctionTemp: '', dischargeTemp: '', rpm: '', remarks: '' })); };
  const del = i => { const e = entries.filter((_, j) => j !== i); setEntries(e); save(KEY, e); };
  const comprRatio = form.suctionPress && form.dischargePress ? (parseFloat(form.dischargePress) / parseFloat(form.suctionPress)).toFixed(2) : '—';
  const COLS = [
    { key: 'ts', label: 'Date/Time', w: 110 }, { key: 'compressor', label: 'Unit', w: 120 },
    { key: 'suctionPress', label: 'Suct.P (bar)', w: 80 }, { key: 'dischargePress', label: 'Disch.P (bar)', w: 85 },
    { key: 'suctionTemp', label: 'Suct.T °C', w: 70 }, { key: 'dischargeTemp', label: 'Disch.T °C', w: 75 },
    { key: 'rpm', label: 'RPM', w: 50 }, { key: 'runHours', label: 'Run Hrs', w: 60 },
    { key: 'remarks', label: 'Remarks', w: 100 },
  ];
  return (
    <div>
      <Card style={{ marginBottom: 10 }}>
        <SectionLabel text="Compressor Log Entry" color={ACC} />
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 10px' }}>
          <Field label="Date / Time" value={form.ts} onChange={set('ts')} type="datetime-local" />
          <div style={{ marginBottom: 8 }}>
            <div style={{ color: S.dm, fontSize: S.lb, marginBottom: 3 }}>Compressor Unit</div>
            <select value={form.compressor} onChange={set('compressor')} style={{ width: '100%', background: S.bg3, color: ACC, border: `1px solid ${S.bd2}`, borderRadius: 5, padding: '6px 8px', fontSize: S.xs }}>
              {['HD Compressor No.1','HD Compressor No.2','LD Compressor No.1','LD Compressor No.2','Cargo Compressor No.1','Boil-Off Compressor'].map(t => <option key={t}>{t}</option>)}
            </select>
          </div>
          <Field label="Suction Pressure" value={form.suctionPress} onChange={set('suctionPress')} type="number" placeholder="bar g" unit="bar g" />
          <Field label="Discharge Pressure" value={form.dischargePress} onChange={set('dischargePress')} type="number" placeholder="bar g" unit="bar g" />
          <Field label="Suction Temperature" value={form.suctionTemp} onChange={set('suctionTemp')} type="number" placeholder="°C" unit="°C" />
          <Field label="Discharge Temperature" value={form.dischargeTemp} onChange={set('dischargeTemp')} type="number" placeholder="°C" unit="°C" />
          <Field label="RPM" value={form.rpm} onChange={set('rpm')} type="number" placeholder="RPM" unit="RPM" />
          <Field label="Running Hours" value={form.runHours} onChange={set('runHours')} type="number" placeholder="cumulative" unit="hrs" />
        </div>
        {form.suctionPress && form.dischargePress && (
          <div style={{ background: S.bg3, borderRadius: 6, padding: '6px 10px', marginBottom: 8, display: 'flex', gap: 16 }}>
            <div><span style={{ color: S.dm, fontSize: S.lb }}>Compression Ratio: </span><span style={{ color: ACC, fontFamily: 'monospace', fontWeight: 700 }}>{comprRatio}</span></div>
            {form.suctionTemp && form.dischargeTemp && <div><span style={{ color: S.dm, fontSize: S.lb }}>ΔT: </span><span style={{ color: S.cy, fontFamily: 'monospace', fontWeight: 700 }}>{(parseFloat(form.dischargeTemp) - parseFloat(form.suctionTemp)).toFixed(1)}°C</span></div>}
          </div>
        )}
        <Field label="Remarks" value={form.remarks} onChange={set('remarks')} placeholder="Vibration, noise, alarms, maintenance notes…" />
        <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
          <Btn onClick={add} color={ACC} style={{ flex: 1 }}>+ Add Log Entry</Btn>
          <Btn onClick={() => exportLog('Compressor Log', entries, COLS)} color={S.dm}>⬇ Export</Btn>
        </div>
      </Card>
      <Card>
        <SectionLabel text={`Compressor Log (${entries.length})`} color={ACC} />
        <LogTable entries={entries} columns={COLS} onDelete={del} accent={ACC} />
      </Card>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// TAB CONFIG
// ══════════════════════════════════════════════════════════════════════════════
const VESSEL_TABS = {
  bulk: [
    { id: 'hold',    label: '📋 Hold Inspect',   component: BulkHoldInspection },
    { id: 'hatch',   label: '🚪 Hatch Cover',    component: BulkHatchLog       },
    { id: 'bilge',   label: '💧 Hold Bilge',      component: BulkBilgeLog       },
    { id: 'trim',    label: '⚖ Trim Calc',       component: BulkTrimmingCalc   },
  ],
  tanker: [
    { id: 'cargo',   label: '🧮 Cargo Calc',     component: TankerCargoCalc    },
    { id: 'cow',     label: '🛢 COW Record',      component: TankerCOW          },
    { id: 'ig',      label: '💨 IG System',       component: TankerIGLog        },
    { id: 'pump',    label: '⚙ Pump Room',       component: TankerPumproom     },
    { id: 'heat',    label: '🌡 Heating Log',     component: TankerHeatingLog   },
    { id: 'msds',    label: '☣ MSDS',            component: TankerMSDS         },
  ],
  container: [
    { id: 'particulars', label: '🚢 Ship Particulars', component: ShipParticularsSetup },
    { id: 'liveops', label: '⚡ Live Cargo Ops',  component: ContainerLiveOps   },
    { id: 'import',  label: '📥 Import Plan',    component: BaplieImport       },
    { id: 'search',  label: '🔍 Container Search', component: ContainerSearch  },
    { id: 'oog',     label: '📐 OOG Tracker',     component: ContainerOOG       },
    { id: 'lashing', label: '⚓ Lashing Status',  component: LashingStatus      },
  ],
  gas: [
    { id: 'bog',     label: '🔥 Boil-Off Calc',  component: GasBoilOff         },
    { id: 'comp',    label: '⚙ Compressor Log',  component: GasCompressorLog   },
  ],
};

// ══════════════════════════════════════════════════════════════════════════════
// MAIN PAGE
// ══════════════════════════════════════════════════════════════════════════════
// ─── ERROR BOUNDARY ───────────────────────────────────────────────────────────
// Wraps the active tab's content so an uncaught render error shows a message
// and a recovery option instead of unmounting the whole app to a blank white
// screen. Error boundaries must be class components — there is no hook
// equivalent for catching render errors thrown by child components.
class CargoOpsErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }
  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }
  componentDidCatch(error, info) {
    console.error('CargoOps tab crashed:', error, info);
  }
  render() {
    if (this.state.hasError) {
      return (
        <div style={{ padding: '20px 14px', textAlign: 'center' }}>
          <div style={{ color: S.rd, fontSize: S.sm, fontWeight: 700, marginBottom: 8 }}>⚠ This tab hit an error</div>
          <div style={{ color: S.dm, fontSize: S.xs, marginBottom: 14, lineHeight: 1.6 }}>
            {this.state.error?.message || 'Something went wrong rendering this tab.'}
          </div>
          <button onClick={() => this.setState({ hasError: false, error: null })} style={{
            background: `${ACC}18`, border: `1px solid ${ACC}55`, color: ACC,
            borderRadius: 6, padding: '8px 16px', fontSize: S.xs, cursor: 'pointer', fontWeight: 600,
          }}>Try Again</button>
        </div>
      );
    }
    return this.props.children;
  }
}

export default function CargoOpsPage({ notify }) {
  const [vesselType, setVesselType] = useState(() => localStorage.getItem('cargoops_vesseltype') || 'bulk');
  const [activeTab,  setActiveTab]  = useState(() => localStorage.getItem('cargoops_tab') || 'hold');

  const selectVessel = (vt) => {
    setVesselType(vt);
    localStorage.setItem('cargoops_vesseltype', vt);
    const firstTab = VESSEL_TABS[vt][0].id;
    setActiveTab(firstTab);
    localStorage.setItem('cargoops_tab', firstTab);
  };

  const selectTab = (id) => {
    setActiveTab(id);
    localStorage.setItem('cargoops_tab', id);
  };

  const vc   = VESSEL_COLORS[vesselType];
  const tabs = VESSEL_TABS[vesselType];
  const tab  = tabs.find(t => t.id === activeTab) || tabs[0];
  const ActiveComp = tab.component;

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', background: S.bg, minHeight: 0, overflow: 'hidden' }}>

      {/* HEADER */}
      <div style={{ height: 48, display: 'flex', alignItems: 'center', padding: '0 12px', background: '#020810', borderBottom: `1px solid ${S.bd}`, flexShrink: 0, gap: 8 }}>
        <span style={{ color: vc.accent, fontWeight: 700, fontSize: '0.82rem', letterSpacing: 1 }}>🚢 CARGO OPS</span>
        <span style={{ color: S.vd, fontSize: '0.65rem' }}>|</span>
        <span style={{ color: S.dm, fontSize: '0.68rem' }}>{vc.label}</span>
      </div>

      {/* VESSEL TYPE SELECTOR */}
      <div style={{ display: 'flex', gap: 6, padding: '8px 12px', background: '#020810', borderBottom: `1px solid ${S.bd2}`, flexShrink: 0, flexWrap: 'wrap' }}>
        {Object.entries(VESSEL_COLORS).map(([vt, cfg]) => (
          <button key={vt} onClick={() => selectVessel(vt)} style={{
            flex: 1, minWidth: 72, background: vesselType === vt ? cfg.light : 'transparent',
            border: `1px solid ${vesselType === vt ? cfg.accent : S.vd}`,
            color: vesselType === vt ? cfg.accent : S.dm,
            borderRadius: 7, padding: '6px 4px', fontSize: '0.63rem', cursor: 'pointer', fontWeight: vesselType === vt ? 700 : 400,
            transition: 'all 0.15s',
          }}>
            {cfg.label}
          </button>
        ))}
      </div>

      {/* FUNCTION TABS */}
      <div style={{ display: 'flex', gap: 4, padding: '6px 12px', background: S.bg3, borderBottom: `1px solid ${S.bd2}`, flexShrink: 0, overflowX: 'auto' }}>
        {tabs.map(t => (
          <button key={t.id} onClick={() => selectTab(t.id)} style={{
            flexShrink: 0, background: activeTab === t.id ? vc.light : 'transparent',
            border: `1px solid ${activeTab === t.id ? vc.accent : S.vd}`,
            color: activeTab === t.id ? vc.accent : S.dm,
            borderRadius: 6, padding: '5px 10px', fontSize: '0.62rem', cursor: 'pointer',
            fontWeight: activeTab === t.id ? 700 : 400, whiteSpace: 'nowrap',
          }}>
            {t.label}
          </button>
        ))}
      </div>

      {/* ACTIVE CONTENT */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '12px', minHeight: 0 }}>
        <CargoOpsErrorBoundary key={activeTab}>
          <ActiveComp notify={notify} />
        </CargoOpsErrorBoundary>
      </div>

    </div>
  );
                   }
