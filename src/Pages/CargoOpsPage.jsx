/* eslint-disable */
import { useState, useEffect, useCallback } from "react";

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

// ─── STORAGE HELPERS ─────────────────────────────────────────────────────────
const load  = (k, def) => { try { return JSON.parse(localStorage.getItem(k) ?? 'null') ?? def; } catch { return def; } };
const save  = (k, v)   => { try { localStorage.setItem(k, JSON.stringify(v)); } catch {} };

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

function generateBays(from, to, type) {
  const bays = [];
  for (let i = from; i <= to; i++) {
    if (type === 'odd'  && i % 2 !== 0) bays.push(clPad(i));
    if (type === 'even' && i % 2 === 0) bays.push(clPad(i));
    if (type === 'all') bays.push(clPad(i));
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

// ─── SETUP WIZARD ────────────────────────────────────────────────────────────
function SetupWizard({ onSave }) {
  const [port,     setPort]     = useState('');
  const [vessel,   setVessel]   = useState('');
  const [bayFrom,  setBayFrom]  = useState('1');
  const [bayTo,    setBayTo]    = useState('55');
  const [bayType,  setBayType]  = useState('all');
  const [gantries, setGantries] = useState('2');
  const [movesPerHr, setMovesPerHr] = useState('25');
  const [totalLoad, setTotalLoad]   = useState('');
  const [totalDisch, setTotalDisch] = useState('');
  const [totalRest,  setTotalRest]  = useState('');

  const bayFromNum = parseInt(bayFrom) || 1;
  const bayToNum   = parseInt(bayTo)   || 1;
  const bayCount = generateBays(bayFromNum, bayToNum, bayType).length;

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
          <div style={{ color:S.dm, fontSize:S.lb, marginBottom:5 }}>Bay Type</div>
          <div style={{ display:'flex', gap:6 }}>
            {[['all','All (20ft+40ft)'],['odd','Odd only (20ft)'],['even','Even only (40ft)']].map(([v,l]) => (
              <button key={v} onClick={()=>setBayType(v)} style={{
                flex:1, background:bayType===v?`${ACC}20`:'transparent',
                border:`1px solid ${bayType===v?ACC:S.vd}`,
                color:bayType===v?ACC:S.dm, borderRadius:6, padding:'5px 4px',
                fontSize:S.lb, cursor:'pointer', fontWeight:bayType===v?700:400,
              }}>{l}</button>
            ))}
          </div>
        </div>
        <div style={{ color:S.gn, fontSize:S.xs, marginTop:4 }}>
          ✓ {bayCount} bays will be created (Bay {clPad(bayFromNum)} → Bay {clPad(bayToNum)})
        </div>
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
        const bays = generateBays(bayFromNum, bayToNum, bayType);
        onSave({
          port, vessel, bayType, bayFrom: bayFromNum, bayTo: bayToNum,
          gantries: parseInt(gantries) || 1,
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
          })),
        });
      }} color={ACC} style={{ width:'100%', marginTop:8, padding:'10px', fontSize:S.sm }}>
        🚀 Start Port Operation
      </Btn>
    </div>
  );
}

// ─── BAY CARD ────────────────────────────────────────────────────────────────
function BayCard({ bay, idx, gantries, onUpdate, movesPerHr }) {
  const [expanded, setExpanded] = useState(false);
  const col = STATUS_COLOR[bay.status] || S.vd;
  const totalPlan = bay.planLoad + bay.planDisch + bay.planRest;
  const totalDone = bay.doneLoad + bay.doneDisch + bay.doneRest;
  const pct = totalPlan > 0 ? Math.round((totalDone / totalPlan) * 100) : 0;

  const upd = (key, val) => onUpdate(idx, key, val);

  const setStatus = (s) => {
    onUpdate(idx, 'status', s);
    if (s === 'inprogress' && !bay.startTime) onUpdate(idx, 'startTime', clNow());
    if (s === 'completed')  onUpdate(idx, 'endTime',   clNow());
  };

  const incr = (key, delta) => {
    const cur = bay[key] || 0;
    const next = Math.max(0, cur + delta);
    onUpdate(idx, key, next);
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
            </div>
            <span style={{ color:S.dm, fontSize:S.ti }}>{totalDone}/{totalPlan} mvs</span>
          </div>
          <ProgressBar pct={pct} color={col} />
          <div style={{ display:'flex', justifyContent:'space-between', marginTop:2 }}>
            <span style={{ color:S.dm, fontSize:S.ti }}>L:{bay.doneLoad} D:{bay.doneDisch} R:{bay.doneRest}</span>
            <span style={{ color:col, fontSize:S.ti, fontWeight:700 }}>{pct}%</span>
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

      {/* ── EXPANDED DETAIL ── */}
      {expanded && (
        <div style={{ padding:'0 10px 10px', borderTop:`1px solid ${col}20` }}>

          {/* Status buttons */}
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

          {/* Crane + flags */}
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'0 10px', marginBottom:6 }}>
            <div>
              <div style={{ color:S.dm, fontSize:S.lb, marginBottom:3 }}>Crane / Gantry</div>
              <select value={bay.crane} onChange={e=>upd('crane',e.target.value)}
                style={{ width:'100%', background:S.bg3, color:S.cy, border:`1px solid ${S.bd2}`,
                  borderRadius:5, padding:'5px 7px', fontSize:S.xs }}>
                <option value=''>— Unassigned —</option>
                {Array.from({length: gantries}, (_,i) => (
                  <option key={i+1} value={`G${i+1}`}>Gantry {i+1}</option>
                ))}
              </select>
            </div>
            <div>
              <div style={{ color:S.dm, fontSize:S.lb, marginBottom:3 }}>Bay Type</div>
              <div style={{ display:'flex', gap:5, marginTop:2 }}>
                {[['isDG','DG',S.rd],['isReefer','RF',S.cy],['lashingDone','⚓LSH',S.gn]].map(([k,l,c]) => (
                  <button key={k} onClick={()=>upd(k,!bay[k])} style={{
                    flex:1, background:bay[k]?`${c}20`:'transparent',
                    border:`1px solid ${bay[k]?c:S.vd}`, color:bay[k]?c:S.dm,
                    borderRadius:5, padding:'4px 2px', fontSize:S.ti, cursor:'pointer', fontWeight:bay[k]?700:400,
                  }}>{l}</button>
                ))}
              </div>
            </div>
          </div>

          {/* Planned moves */}
          <div style={{ background:S.bg3, borderRadius:7, padding:'8px 10px', marginBottom:6 }}>
            <SectionLabel text="Planned Moves" color={S.dm} />
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:'0 8px' }}>
              {[['planLoad','Load',ACC],['planDisch','Disch',S.or],['planRest','Restow',S.pu]].map(([k,l,c]) => (
                <div key={k}>
                  <div style={{ color:S.dm, fontSize:S.ti, marginBottom:2 }}>{l}</div>
                  <input type="number" value={bay[k]} min={0}
                    onChange={e=>upd(k,parseInt(e.target.value)||0)}
                    style={{ width:'100%', background:S.bg2, color:c, border:`1px solid ${S.bd2}`,
                      borderRadius:4, padding:'4px 6px', fontSize:S.xs, outline:'none', fontFamily:'monospace' }} />
                </div>
              ))}
            </div>
          </div>

          {/* Completed moves — counter buttons */}
          <div style={{ background:S.bg3, borderRadius:7, padding:'8px 10px', marginBottom:6 }}>
            <SectionLabel text="Completed Moves" color={S.gn} />
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:'0 8px' }}>
              {[['doneLoad','planLoad','Load',ACC],['doneDisch','planDisch','Disch',S.or],['doneRest','planRest','Restow',S.pu]].map(([dk,pk,l,c]) => (
                <div key={dk}>
                  <div style={{ color:S.dm, fontSize:S.ti, marginBottom:3 }}>{l} ({bay[dk]}/{bay[pk]})</div>
                  <div style={{ display:'flex', gap:3, alignItems:'center' }}>
                    <button onClick={()=>incr(dk,-1)} style={{ background:`${S.rd}15`, border:`1px solid ${S.rd}44`, color:S.rd, borderRadius:4, padding:'2px 7px', fontSize:'0.8rem', cursor:'pointer', fontWeight:700 }}>−</button>
                    <div style={{ flex:1, textAlign:'center', color:c, fontFamily:'monospace', fontWeight:700, fontSize:S.sm }}>{bay[dk]}</div>
                    <button onClick={()=>incr(dk,+1)} style={{ background:`${S.gn}15`, border:`1px solid ${S.gn}44`, color:S.gn, borderRadius:4, padding:'2px 7px', fontSize:'0.8rem', cursor:'pointer', fontWeight:700 }}>+</button>
                  </div>
                  <ProgressBar pct={bay[pk]>0?(bay[dk]/bay[pk])*100:0} color={c} height={4} />
                </div>
              ))}
            </div>
          </div>

          {/* Deck / Hold split */}
          <div style={{ background:S.bg3, borderRadius:7, padding:'8px 10px', marginBottom:6 }}>
            <SectionLabel text="Deck / Hold Split" color={S.dm} />
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr 1fr', gap:'0 6px' }}>
              {[['deckLoad','Deck Load',ACC],['holdLoad','Hold Load',S.te],['deckDisch','Deck Disch',S.or],['holdDisch','Hold Disch',S.pu]].map(([k,l,c])=>(
                <div key={k}>
                  <div style={{ color:S.dm, fontSize:S.ti, marginBottom:2 }}>{l}</div>
                  <input type="number" value={bay[k]} min={0}
                    onChange={e=>upd(k,parseInt(e.target.value)||0)}
                    style={{ width:'100%', background:S.bg2, color:c, border:`1px solid ${S.bd2}`,
                      borderRadius:4, padding:'4px 5px', fontSize:S.ti, outline:'none', fontFamily:'monospace' }}/>
                </div>
              ))}
            </div>
          </div>

          {/* Time + notes */}
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'0 10px', marginBottom:4 }}>
            {[['startTime','Start Time'],['endTime','End Time']].map(([k,l])=>(
              <div key={k}>
                <div style={{ color:S.dm, fontSize:S.lb, marginBottom:3 }}>{l}</div>
                <input type="time" value={bay[k]} onChange={e=>upd(k,e.target.value)}
                  style={{ width:'100%', background:S.bg3, color:S.gd, border:`1px solid ${S.bd2}`,
                    borderRadius:5, padding:'5px 7px', fontSize:S.xs, outline:'none', fontFamily:'monospace' }}/>
              </div>
            ))}
          </div>
          <div>
            <div style={{ color:S.dm, fontSize:S.lb, marginBottom:3 }}>Notes</div>
            <input value={bay.notes} onChange={e=>upd('notes',e.target.value)}
              placeholder="Damage, skip, special instruction…"
              style={{ width:'100%', background:S.bg3, color:S.tx, border:`1px solid ${S.bd2}`,
                borderRadius:5, padding:'5px 7px', fontSize:S.xs, outline:'none' }}/>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── LIVE OPS MAIN ────────────────────────────────────────────────────────────
function LiveOps({ portOp, onUpdate, onReset }) {
  const [search,    setSearch]    = useState('');
  const [filter,    setFilter]    = useState('all');
  const [sortBy,    setSortBy]    = useState('bay');
  const [tickMode,  setTickMode]  = useState(false); // quick-tick mode
  const [extraGantries, setExtraGantries] = useState(portOp.gantries);

  const bays = portOp.bays || [];

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
    const eta = new Date(Date.clNow() + ms);
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
            {[1,2,3,4,5,6,7,8].slice(0, portOp.gantries + 2).map(n => (
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

      {/* ── BAY LIST ── */}
      <div style={{ fontSize:S.ti, color:S.dm, marginBottom:5 }}>
        Showing {filtered.length} of {total} bays
      </div>
      {filtered.map(b => (
        <BayCard key={b.bay} bay={b} idx={b._idx}
          gantries={portOp.gantries} movesPerHr={portOp.movesPerHr}
          onUpdate={updateBay} />
      ))}

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

// ─── REEFER ROUNDS ────────────────────────────────────────────────────────────
function ReeferRounds({ portOp, onUpdateReefer }) {
  const KEY = `cargo_reefer_rounds_${portOp?.port || 'default'}`;
  const [rounds, setRounds] = useState(() => load(KEY, []));
  const [form, setForm] = useState({
    ts: new Date().toISOString().slice(0,16),
    bay: '', containerId: '', opType: 'Loading',
    setPoint: '', supply: '', returnTemp: '',
    humidity: '', alarm: 'None', defrost: 'No',
    inspector: '', remarks: '',
  });
  const [filterBay, setFilterBay] = useState('');
  const [filterOp,  setFilterOp]  = useState('all');
  const set = k => e => setForm(f => ({ ...f, [k]: e.target.value }));

  // Get reefer bays from port op for quick select
  const reeferBays = portOp?.bays?.filter(b => b.isReefer).map(b => b.bay) || [];

  const saveRounds = (r) => { setRounds(r); save(KEY, r); };

  const add = () => {
    if (!form.bay || !form.supply) return;
    const diff = parseFloat(form.supply) - parseFloat(form.setPoint);
    const entry = { ...form, tempDiff: isNaN(diff) ? '' : diff.toFixed(1), id: Date.clNow() };
    saveRounds([...rounds, entry]);
    setForm(f => ({ ...f, ts: new Date().toISOString().slice(0,16), supply: '', returnTemp: '', humidity: '', remarks: '' }));
  };

  const del = (id) => saveRounds(rounds.filter(r => r.id !== id));

  const filtered = rounds.filter(r => {
    if (filterBay && !r.bay.includes(filterBay)) return false;
    if (filterOp !== 'all' && r.opType !== filterOp) return false;
    return true;
  });

  // Stats
  const alarmCount = rounds.filter(r => r.alarm !== 'None').length;
  const loadCount  = rounds.filter(r => r.opType === 'Loading').length;
  const dischCount = rounds.filter(r => r.opType === 'Discharging').length;
  const restCount  = rounds.filter(r => r.opType === 'Restow').length;
  const outOfRange = rounds.filter(r => Math.abs(parseFloat(r.tempDiff)||0) > 3).length;

  return (
    <div>
      {/* Stats */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:5, marginBottom:10 }}>
        <StatBox label="Total Rounds" value={rounds.length} color={S.cy} />
        <StatBox label="Load/Disch/Rest" value={`${loadCount}/${dischCount}/${restCount}`} color={ACC} />
        <StatBox label="Alarms" value={alarmCount} color={alarmCount>0?S.rd:S.gn} />
        <StatBox label="Out of Range" value={outOfRange} color={outOfRange>0?S.rd:S.gn} sub=">3°C diff" />
      </div>

      {/* Form */}
      <div style={{ background:S.bg2, border:`1px solid ${S.bd2}`, borderRadius:10, padding:'12px 14px', marginBottom:10 }}>
        <SectionLabel text="New Reefer Round Entry" color={S.cy} />

        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'0 10px' }}>
          <Field label="Date / Time" value={form.ts} onChange={set('ts')} type="datetime-local" />
          <div style={{ marginBottom:7 }}>
            <div style={{ color:S.dm, fontSize:S.lb, marginBottom:2 }}>Bay</div>
            <div style={{ display:'flex', gap:4 }}>
              <input value={form.bay} onChange={set('bay')} placeholder="e.g. 06"
                style={{ flex:1, background:S.bg3, color:S.cy, border:`1px solid ${S.bd2}`,
                  borderRadius:5, padding:'5px 7px', fontSize:S.xs, outline:'none', fontFamily:'monospace' }}/>
              {reeferBays.length > 0 && (
                <select onChange={e=>{if(e.target.value) setForm(f=>({...f, bay:e.target.value}));}}
                  style={{ background:S.bg3, color:S.cy, border:`1px solid ${S.bd2}`, borderRadius:5, padding:'5px 4px', fontSize:S.ti }}>
                  <option value=''>RF Bays</option>
                  {reeferBays.map(b=><option key={b} value={b}>Bay {b}</option>)}
                </select>
              )}
            </div>
          </div>
        </div>

        <Field label="Container ID (optional)" value={form.containerId} onChange={set('containerId')} placeholder="e.g. MSCU1234567" />

        <div style={{ marginBottom:7 }}>
          <div style={{ color:S.dm, fontSize:S.lb, marginBottom:3 }}>Operation Type</div>
          <div style={{ display:'flex', gap:5 }}>
            {['Loading','Discharging','Restow','Monitoring'].map(v => (
              <button key={v} onClick={()=>setForm(f=>({...f,opType:v}))} style={{
                flex:1, background:form.opType===v?`${ACC}25`:'transparent',
                border:`1px solid ${form.opType===v?ACC:S.vd}`,
                color:form.opType===v?ACC:S.dm,
                borderRadius:5, padding:'5px 3px', fontSize:S.ti, cursor:'pointer', fontWeight:form.opType===v?700:400,
              }}>{v}</button>
            ))}
          </div>
        </div>

        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:'0 8px' }}>
          <Field label="Set Point" value={form.setPoint} onChange={set('setPoint')} type="number" placeholder="°C" unit="°C" />
          <Field label="Supply Temp" value={form.supply} onChange={set('supply')} type="number" placeholder="°C" unit="°C"
            color={form.setPoint&&form.supply&&Math.abs(parseFloat(form.supply)-parseFloat(form.setPoint))>3?S.rd:S.gn} />
          <Field label="Return Temp" value={form.returnTemp} onChange={set('returnTemp')} type="number" placeholder="°C" unit="°C" />
        </div>

        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:'0 8px' }}>
          <Field label="Humidity" value={form.humidity} onChange={set('humidity')} type="number" placeholder="%" unit="% RH" />
          <div style={{ marginBottom:7 }}>
            <div style={{ color:S.dm, fontSize:S.lb, marginBottom:2 }}>Alarm</div>
            <select value={form.alarm} onChange={set('alarm')}
              style={{ width:'100%', background:S.bg3, color:form.alarm!=='None'?S.rd:S.gn,
                border:`1px solid ${S.bd2}`, borderRadius:5, padding:'5px 6px', fontSize:S.xs }}>
              {['None','High Temp','Low Temp','Defrost Fault','Power Fault','Humidity Alarm','Compressor Fault'].map(a=>(
                <option key={a}>{a}</option>
              ))}
            </select>
          </div>
          <div style={{ marginBottom:7 }}>
            <div style={{ color:S.dm, fontSize:S.lb, marginBottom:2 }}>Defrost</div>
            <select value={form.defrost} onChange={set('defrost')}
              style={{ width:'100%', background:S.bg3, color:S.cy,
                border:`1px solid ${S.bd2}`, borderRadius:5, padding:'5px 6px', fontSize:S.xs }}>
              {['No','Yes'].map(a=><option key={a}>{a}</option>)}
            </select>
          </div>
        </div>

        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'0 10px' }}>
          <Field label="Inspector Name" value={form.inspector} onChange={set('inspector')} placeholder="Officer / Rating" />
          <Field label="Remarks" value={form.remarks} onChange={set('remarks')} placeholder="Observations, actions…" />
        </div>

        {form.setPoint && form.supply && (() => {
          const d = parseFloat(form.supply) - parseFloat(form.setPoint);
          if (isNaN(d)) return null;
          return (
            <div style={{ background:Math.abs(d)<=3?'rgba(0,255,136,0.07)':'rgba(255,71,87,0.1)',
              border:`1px solid ${Math.abs(d)<=3?S.gn:S.rd}44`, borderRadius:6, padding:'5px 10px', marginBottom:7 }}>
              <span style={{ color:S.dm, fontSize:S.xs }}>Δ from set point: </span>
              <span style={{ color:Math.abs(d)<=3?S.gn:S.rd, fontWeight:700, fontFamily:'monospace' }}>
                {d>0?'+':''}{d.toFixed(1)}°C
              </span>
              {Math.abs(d) > 3 && <span style={{ color:S.rd, fontSize:S.xs }}> ⚠ OUT OF RANGE</span>}
            </div>
          );
        })()}

        <div style={{ display:'flex', gap:6 }}>
          <button onClick={add} style={{ flex:1, background:`${S.cy}18`, border:`1px solid ${S.cy}55`,
            color:S.cy, borderRadius:6, padding:'8px', fontSize:S.xs, cursor:'pointer', fontWeight:700 }}>
            + Add Round
          </button>
          <button onClick={()=>{
            const txt = ['REEFER ROUNDS LOG','Bay\tContainer\tOp\tSetPt\tSupply\tReturn\tΔ\tAlarm\tTime\tInspector\tRemarks',
              ...rounds.map(r=>`${r.bay}\t${r.containerId||''}\t${r.opType}\t${r.setPoint}°C\t${r.supply}°C\t${r.returnTemp}°C\t${r.tempDiff}°C\t${r.alarm}\t${r.ts}\t${r.inspector}\t${r.remarks}`)
            ].join('\n');
            const a=document.createElement('a');
            a.href='data:text/plain;charset=utf-8,'+encodeURIComponent(txt);
            a.download=`Reefer_Rounds_${portOp?.port||'log'}_${new Date().toISOString().slice(0,10)}.txt`;
            a.click();
          }} style={{ background:`${S.dm}18`, border:`1px solid ${S.dm}44`, color:S.dm,
            borderRadius:6, padding:'8px 12px', fontSize:S.xs, cursor:'pointer' }}>
            ⬇ Export
          </button>
        </div>
      </div>

      {/* Filter */}
      <div style={{ display:'flex', gap:5, marginBottom:8, flexWrap:'wrap' }}>
        <input value={filterBay} onChange={e=>setFilterBay(e.target.value)} placeholder="Bay #…"
          style={{ width:60, background:S.bg3, color:S.cy, border:`1px solid ${S.bd2}`,
            borderRadius:5, padding:'4px 7px', fontSize:S.xs, outline:'none', fontFamily:'monospace' }}/>
        {[['all','All'],['Loading','Load'],['Discharging','Disch'],['Restow','Rest'],['Monitoring','Mon']].map(([v,l])=>(
          <button key={v} onClick={()=>setFilterOp(v)} style={{
            background:filterOp===v?`${S.cy}15`:'transparent',
            border:`1px solid ${filterOp===v?S.cy:S.vd}`,
            color:filterOp===v?S.cy:S.dm,
            borderRadius:5, padding:'4px 8px', fontSize:S.lb, cursor:'pointer',
          }}>{l}</button>
        ))}
        {rounds.length > 0 && (
          <Btn onClick={()=>{if(window.confirm('Clear all reefer rounds?')) saveRounds([]);}}
            color={S.rd} style={{ padding:'4px 8px', fontSize:S.lb, marginLeft:'auto' }}>
            Clear All
          </Btn>
        )}
      </div>

      {/* Rounds list */}
      <div style={{ display:'flex', flexDirection:'column', gap:5 }}>
        {filtered.length === 0
          ? <div style={{ color:S.vd, fontSize:S.xs, textAlign:'center', padding:'20px 0', fontStyle:'italic' }}>
              No rounds logged yet
            </div>
          : filtered.slice().reverse().map(r => {
            const diff = parseFloat(r.tempDiff);
            const outRange = !isNaN(diff) && Math.abs(diff) > 3;
            return (
              <div key={r.id} style={{ background:outRange?'rgba(255,71,87,0.06)':S.bg2,
                border:`1px solid ${outRange?S.rd+'44':S.bd3}`, borderRadius:8, padding:'8px 10px' }}>
                <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:4 }}>
                  <div style={{ display:'flex', gap:6, alignItems:'center', flexWrap:'wrap' }}>
                    <span style={{ background:`${ACC}20`, color:ACC, border:`1px solid ${ACC}44`,
                      borderRadius:4, padding:'1px 7px', fontFamily:'monospace', fontWeight:700, fontSize:S.xs }}>
                      BAY {r.bay}
                    </span>
                    <span style={{ background:r.opType==='Loading'?`${ACC}15`:r.opType==='Discharging'?'rgba(255,140,66,0.15)':r.opType==='Restow'?'rgba(192,132,252,0.15)':'rgba(0,212,255,0.1)',
                      color:r.opType==='Loading'?ACC:r.opType==='Discharging'?S.or:r.opType==='Restow'?S.pu:S.cy,
                      border:'none', borderRadius:4, padding:'1px 7px', fontSize:S.lb, fontWeight:700 }}>
                      {r.opType}
                    </span>
                    {r.alarm !== 'None' && (
                      <span style={{ background:'rgba(255,71,87,0.15)', color:S.rd, borderRadius:4, padding:'1px 6px', fontSize:S.lb, fontWeight:700 }}>
                        ⚠ {r.alarm}
                      </span>
                    )}
                  </div>
                  <div style={{ display:'flex', gap:5, alignItems:'center' }}>
                    <span style={{ color:S.dm, fontSize:S.ti }}>{r.ts}</span>
                    <button onClick={()=>del(r.id)} style={{ background:'transparent', border:'none', color:S.rd, cursor:'pointer', fontSize:'0.75rem' }}>✕</button>
                  </div>
                </div>
                <div style={{ display:'flex', gap:12, flexWrap:'wrap' }}>
                  {[
                    ['Set',r.setPoint?r.setPoint+'°C':'—',S.dm],
                    ['Supply',r.supply?r.supply+'°C':'—',outRange?S.rd:S.gn],
                    ['Return',r.returnTemp?r.returnTemp+'°C':'—',S.cy],
                    ['Δ',r.tempDiff?(r.tempDiff>0?'+':'')+r.tempDiff+'°C':'—',outRange?S.rd:S.gn],
                    ['RH',r.humidity?r.humidity+'%':'—',S.dm],
                  ].map(([l,v,c])=>(
                    <div key={l}>
                      <span style={{ color:S.dm, fontSize:S.ti }}>{l}: </span>
                      <span style={{ color:c, fontFamily:'monospace', fontWeight:700, fontSize:S.xs }}>{v}</span>
                    </div>
                  ))}
                  {r.containerId && <div><span style={{ color:S.dm, fontSize:S.ti }}>ID: </span><span style={{ color:S.tx, fontSize:S.ti }}>{r.containerId}</span></div>}
                  {r.inspector   && <div><span style={{ color:S.dm, fontSize:S.ti }}>By: </span><span style={{ color:S.dm, fontSize:S.ti }}>{r.inspector}</span></div>}
                </div>
                {r.remarks && <div style={{ color:S.dm, fontSize:S.ti, marginTop:3, fontStyle:'italic' }}>📝 {r.remarks}</div>}
              </div>
            );
          })}
      </div>

      {/* Reefer summary */}
      {rounds.length > 0 && (
        <div style={{ background:`${S.cy}06`, border:`1px solid ${S.cy}20`, borderRadius:9, padding:'10px 12px', marginTop:10 }}>
          <SectionLabel text="Reefer Round Summary" color={S.cy} />
          <div style={{ display:'flex', gap:12, flexWrap:'wrap' }}>
            {[...new Set(rounds.map(r=>r.bay))].sort().map(bay => {
              const bayRounds = rounds.filter(r=>r.bay===bay);
              const lastRound = bayRounds[bayRounds.length-1];
              const diff = parseFloat(lastRound?.tempDiff);
              const ok = isNaN(diff) || Math.abs(diff) <= 3;
              return (
                <div key={bay} style={{ background:S.bg3, borderRadius:6, padding:'5px 9px', textAlign:'center' }}>
                  <div style={{ color:ACC, fontFamily:'monospace', fontWeight:700, fontSize:S.xs }}>Bay {bay}</div>
                  <div style={{ color:S.dm, fontSize:S.ti }}>{bayRounds.length} rounds</div>
                  <div style={{ color:ok?S.gn:S.rd, fontSize:S.ti, fontWeight:700 }}>
                    {lastRound?.supply ? lastRound.supply+'°C' : '—'} {ok?'✓':'⚠'}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── MAIN EXPORT ─────────────────────────────────────────────────────────────
function ContainerLiveOps() {
  const SETUP_KEY = 'cargo_container_port_op';
  const [portOp, setPortOp] = useState(() => load(SETUP_KEY, null));
  const [activeTab, setActiveTab] = useState('liveops');

  const handleSave = (op) => { setPortOp(op); save(SETUP_KEY, op); };
  const handleUpdate = (op) => { setPortOp(op); save(SETUP_KEY, op); };
  const handleReset = () => {
    if (!window.confirm('Start a new port operation? Current data will be saved in history.')) return;
    setPortOp(null); save(SETUP_KEY, null);
  };

  const TABS = [
    { id:'liveops',  label:'⚡ Live Ops'      },
    { id:'reefer',   label:'❄ Reefer Rounds'  },
  ];

  if (!portOp) {
    return (
      <div>
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

      {activeTab === 'liveops' && (
        <LiveOps portOp={portOp} onUpdate={handleUpdate} onReset={handleReset} />
      )}
      {activeTab === 'reefer' && (
        <ReeferRounds portOp={portOp} onUpdateReefer={handleUpdate} />
      )}
    </div>
  );
}
function ContainerOOG() {
  const ACC = VESSEL_COLORS.container.accent;
  const KEY = 'cargo_container_oog';
  const [entries, setEntries] = useState(() => load(KEY, []));
  const [form, setForm] = useState({ containerId: '', bay: '', overHeight: '', overWidth: '', overLength: '', weight: '', lashingPts: '', airDraftClear: 'Yes', remarks: '' });
  const set = k => e => setForm(f => ({ ...f, [k]: e.target.value }));
  const add = () => { if (!form.containerId) return; const e = [...entries, { ...form, ts: new Date().toISOString().slice(0,10) }]; setEntries(e); save(KEY, e); setForm({ containerId: '', bay: '', overHeight: '', overWidth: '', overLength: '', weight: '', lashingPts: '', airDraftClear: 'Yes', remarks: '' }); };
  const del = i => { const e = entries.filter((_, j) => j !== i); setEntries(e); save(KEY, e); };
  const COLS = [
    { key: 'ts', label: 'Date', w: 80 }, { key: 'containerId', label: 'Container', w: 100 },
    { key: 'bay', label: 'Bay', w: 35 }, { key: 'overHeight', label: 'O/H (m)', w: 60 },
    { key: 'overWidth', label: 'O/W (m)', w: 60 }, { key: 'weight', label: 'Wt (kg)', w: 65 },
    { key: 'airDraftClear', label: 'Air Draft', w: 65 }, { key: 'remarks', label: 'Remarks', w: 100 },
  ];
  return (
    <div>
      <Card style={{ marginBottom: 10 }}>
        <SectionLabel text="OOG Cargo Tracker" color={ACC} />
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 10px' }}>
          <Field label="Container ID" value={form.containerId} onChange={set('containerId')} placeholder="MSCU1234567" color={ACC} />
          <Field label="Bay Position" value={form.bay} onChange={set('bay')} placeholder="e.g. 04" />
          <Field label="Over Height" value={form.overHeight} onChange={set('overHeight')} type="number" placeholder="0.00" unit="m" color={S.gd} />
          <Field label="Over Width (each side)" value={form.overWidth} onChange={set('overWidth')} type="number" placeholder="0.00" unit="m" color={S.gd} />
          <Field label="Over Length" value={form.overLength} onChange={set('overLength')} type="number" placeholder="0.00" unit="m" color={S.gd} />
          <Field label="Gross Weight" value={form.weight} onChange={set('weight')} type="number" placeholder="kg" unit="kg" />
          <Field label="Lashing Points" value={form.lashingPts} onChange={set('lashingPts')} placeholder="e.g. 4 points" />
          <div style={{ marginBottom: 8 }}>
            <div style={{ color: S.dm, fontSize: S.lb, marginBottom: 3 }}>Air Draft Clearance Verified</div>
            <select value={form.airDraftClear} onChange={set('airDraftClear')} style={{ width: '100%', background: S.bg3, color: form.airDraftClear === 'Yes' ? S.gn : S.rd, border: `1px solid ${S.bd2}`, borderRadius: 5, padding: '6px 8px', fontSize: S.xs }}>
              {['Yes','No','Pending Check'].map(t => <option key={t}>{t}</option>)}
            </select>
          </div>
        </div>
        <Field label="Remarks / Special Instructions" value={form.remarks} onChange={set('remarks')} placeholder="Bridge clearances, lashing notes, cargo sensitivity…" />
        <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
          <Btn onClick={add} color={ACC} style={{ flex: 1 }}>+ Add OOG Entry</Btn>
          <Btn onClick={() => exportLog('OOG Cargo Log', entries, COLS)} color={S.dm}>⬇ Export</Btn>
        </div>
      </Card>
      <Card>
        <SectionLabel text={`OOG Tracker (${entries.length})`} color={ACC} />
        <LogTable entries={entries} columns={COLS} onDelete={del} accent={ACC} />
      </Card>
    </div>
  );
}

function ContainerLashing() {
  const ACC = VESSEL_COLORS.container.accent;
  const [bays, setBays] = useState([
    { bay: '01', tiers: 6, stackWeight: 0, lashBridgeCap: 800 },
    { bay: '03', tiers: 6, stackWeight: 0, lashBridgeCap: 800 },
    { bay: '05', tiers: 6, stackWeight: 0, lashBridgeCap: 900 },
    { bay: '07', tiers: 6, stackWeight: 0, lashBridgeCap: 900 },
  ]);
  const [windSpeed, setWindSpeed] = useState(28);
  const [seaState,  setSeaState]  = useState(4);
  const upd = (i, k, v) => setBays(b => b.map((x, j) => j === i ? { ...x, [k]: parseFloat(v) || 0 } : x));
  const getLashForce = (sw, ws, ss) => {
    const windF  = 0.5 * 1.225 * Math.pow(ws * 0.514, 2) * 25 / 1000;
    const seaF   = ss * 0.8 * sw * 0.01;
    return windF + seaF;
  };
  return (
    <div>
      <Card style={{ marginBottom: 10 }}>
        <SectionLabel text="Environmental Parameters" color={ACC} />
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 10px' }}>
          <Field label="Wind Speed" value={windSpeed} onChange={e => setWindSpeed(parseFloat(e.target.value)||0)} type="number" unit="kn" />
          <div style={{ marginBottom: 8 }}>
            <div style={{ color: S.dm, fontSize: S.lb, marginBottom: 3 }}>Sea State (Douglas)</div>
            <select value={seaState} onChange={e => setSeaState(parseFloat(e.target.value))} style={{ width: '100%', background: S.bg3, color: S.cy, border: `1px solid ${S.bd2}`, borderRadius: 5, padding: '6px 8px', fontSize: S.xs }}>
              {[1,2,3,4,5,6,7,8,9].map(n => <option key={n} value={n}>{n}</option>)}
            </select>
          </div>
        </div>
      </Card>
      <Card style={{ marginBottom: 10 }}>
        <SectionLabel text="Bay Stack Assessment" color={ACC} />
        <div style={{ display: 'grid', gridTemplateColumns: '45px 1fr 1fr 1fr', gap: 4, marginBottom: 4 }}>
          {['Bay','Stack Wt (t)','Bridge Cap (t)','Status'].map(h => <div key={h} style={{ color: S.dm, fontSize: S.lb }}>{h}</div>)}
        </div>
        {bays.map((b, i) => {
          const force = getLashForce(b.stackWeight, windSpeed, seaState);
          const util  = b.lashBridgeCap > 0 ? (force / b.lashBridgeCap * 100) : 0;
          const col   = util < 70 ? S.gn : util < 90 ? S.gd : S.rd;
          return (
            <div key={i} style={{ display: 'grid', gridTemplateColumns: '45px 1fr 1fr 1fr', gap: 4, marginBottom: 6, alignItems: 'center' }}>
              <div style={{ color: ACC, fontWeight: 700, fontSize: S.xs }}>B{b.bay}</div>
              <input type="number" value={b.stackWeight} onChange={e => upd(i,'stackWeight',e.target.value)} style={{ background: S.bg2, color: ACC, border: `1px solid ${S.bd2}`, borderRadius: 4, padding: '4px 6px', fontSize: S.lb, outline: 'none', fontFamily: 'monospace' }}/>
              <input type="number" value={b.lashBridgeCap} onChange={e => upd(i,'lashBridgeCap',e.target.value)} style={{ background: S.bg3, color: S.dm, border: `1px solid ${S.vd}`, borderRadius: 4, padding: '4px 6px', fontSize: S.lb, outline: 'none', fontFamily: 'monospace' }}/>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                <div style={{ background: S.bg3, borderRadius: 3, height: 6, overflow: 'hidden' }}>
                  <div style={{ background: col, height: '100%', width: `${Math.min(util, 100)}%`, transition: 'width 0.3s' }} />
                </div>
                <span style={{ color: col, fontSize: S.lb, fontFamily: 'monospace' }}>{util.toFixed(0)}%</span>
              </div>
            </div>
          );
        })}
      </Card>
      <Card>
        <div style={{ color: S.dm, fontSize: S.lb, lineHeight: 1.7 }}>
          ℹ Force estimation based on simplified wind + sea state loading.<br/>
          ⚠ Always verify with CSS Code lashing calculation software for actual securing operations.
        </div>
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
    { id: 'liveops', label: '⚡ Live Cargo Ops',  component: ContainerLiveOps   },
    { id: 'oog',     label: '📐 OOG Tracker',     component: ContainerOOG       },
    { id: 'lashing', label: '⚓ Lashing Calc',    component: ContainerLashing   },
  ],
  gas: [
    { id: 'bog',     label: '🔥 Boil-Off Calc',  component: GasBoilOff         },
    { id: 'comp',    label: '⚙ Compressor Log',  component: GasCompressorLog   },
  ],
};

// ══════════════════════════════════════════════════════════════════════════════
// MAIN PAGE
// ══════════════════════════════════════════════════════════════════════════════
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
        <ActiveComp notify={notify} />
      </div>

    </div>
  );
}
