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
function ContainerBayPlan() {
  const ACC = VESSEL_COLORS.container.accent;
  const KEY = 'cargo_container_bayplan';
  const [bays, setBays] = useState(() => load(KEY, []));
  const [form, setForm] = useState({ bay: '', row: '', tier: '', containerId: '', type: '20GP', weight: '', port: '', reefer: 'No', oog: 'No', dg: 'No', dgClass: '', remarks: '' });
  const set = k => e => setForm(f => ({ ...f, [k]: e.target.value }));
  const add = () => {
    if (!form.bay || !form.row || !form.tier || !form.containerId) return;
    const pos = `${String(form.bay).padStart(2,'0')}${String(form.row).padStart(2,'0')}${String(form.tier).padStart(2,'0')}`;
    const e = [...bays, { ...form, pos, ts: new Date().toISOString().slice(0,10) }];
    setBays(e); save(KEY, e);
    setForm(f => ({ ...f, containerId: '', weight: '', dgClass: '', remarks: '' }));
  };
  const del = i => { const e = bays.filter((_, j) => j !== i); setBays(e); save(KEY, e); };
  const [search, setSearch] = useState('');
  const filtered = bays.filter(b => !search || b.containerId.toLowerCase().includes(search.toLowerCase()) || b.pos.includes(search) || b.port.toLowerCase().includes(search.toLowerCase()));
  return (
    <div>
      <Card style={{ marginBottom: 10 }}>
        <SectionLabel text="Add Container to Bay Plan" color={ACC} />
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0 8px' }}>
          <Field label="Bay" value={form.bay} onChange={set('bay')} type="number" placeholder="01" />
          <Field label="Row" value={form.row} onChange={set('row')} type="number" placeholder="01" />
          <Field label="Tier" value={form.tier} onChange={set('tier')} type="number" placeholder="82" />
        </div>
        <Field label="Container ID" value={form.containerId} onChange={set('containerId')} placeholder="e.g. MSCU1234567" color={ACC} />
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 10px' }}>
          <div style={{ marginBottom: 8 }}>
            <div style={{ color: S.dm, fontSize: S.lb, marginBottom: 3 }}>Container Type</div>
            <select value={form.type} onChange={set('type')} style={{ width: '100%', background: S.bg3, color: S.cy, border: `1px solid ${S.bd2}`, borderRadius: 5, padding: '6px 8px', fontSize: S.xs }}>
              {['20GP','40GP','40HC','20RF','40RF','20OT','40OT','20FR','40FR','45HC'].map(t => <option key={t}>{t}</option>)}
            </select>
          </div>
          <Field label="Gross Weight" value={form.weight} onChange={set('weight')} type="number" placeholder="0" unit="kg" />
          <Field label="Discharge Port" value={form.port} onChange={set('port')} placeholder="e.g. SGSIN" />
          <div style={{ marginBottom: 8 }}>
            <div style={{ color: S.dm, fontSize: S.lb, marginBottom: 3 }}>Reefer</div>
            <select value={form.reefer} onChange={set('reefer')} style={{ width: '100%', background: S.bg3, color: form.reefer === 'Yes' ? S.cy : S.dm, border: `1px solid ${S.bd2}`, borderRadius: 5, padding: '6px 8px', fontSize: S.xs }}>
              {['No','Yes'].map(t => <option key={t}>{t}</option>)}
            </select>
          </div>
          <div style={{ marginBottom: 8 }}>
            <div style={{ color: S.dm, fontSize: S.lb, marginBottom: 3 }}>OOG</div>
            <select value={form.oog} onChange={set('oog')} style={{ width: '100%', background: S.bg3, color: form.oog === 'Yes' ? S.gd : S.dm, border: `1px solid ${S.bd2}`, borderRadius: 5, padding: '6px 8px', fontSize: S.xs }}>
              {['No','Yes'].map(t => <option key={t}>{t}</option>)}
            </select>
          </div>
          <div style={{ marginBottom: 8 }}>
            <div style={{ color: S.dm, fontSize: S.lb, marginBottom: 3 }}>DG Cargo</div>
            <select value={form.dg} onChange={set('dg')} style={{ width: '100%', background: S.bg3, color: form.dg === 'Yes' ? S.rd : S.dm, border: `1px solid ${S.bd2}`, borderRadius: 5, padding: '6px 8px', fontSize: S.xs }}>
              {['No','Yes'].map(t => <option key={t}>{t}</option>)}
            </select>
          </div>
          {form.dg === 'Yes' && <Field label="IMDG Class" value={form.dgClass} onChange={set('dgClass')} placeholder="e.g. 3, 8, 9" color={S.rd} />}
        </div>
        <Btn onClick={add} color={ACC} style={{ width: '100%', marginTop: 4 }}>+ Add to Bay Plan</Btn>
      </Card>
      <Card>
        <div style={{ display: 'flex', gap: 8, marginBottom: 8, alignItems: 'center' }}>
          <SectionLabel text={`Bay Plan (${bays.length} containers)`} color={ACC} />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search ID, port, position…" style={{ flex: 1, background: S.bg3, color: S.tx, border: `1px solid ${S.vd}`, borderRadius: 5, padding: '5px 8px', fontSize: S.xs, outline: 'none' }} />
        </div>
        <div style={{ maxHeight: 280, overflowY: 'auto' }}>
          {filtered.length === 0
            ? <div style={{ color: S.vd, fontSize: S.xs, textAlign: 'center', padding: '12px 0' }}>No containers found</div>
            : filtered.map((c, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 6, background: i % 2 === 0 ? S.bg3 : 'transparent', borderRadius: 5, padding: '5px 8px', marginBottom: 2 }}>
                <div style={{ fontFamily: 'monospace', color: ACC, fontWeight: 700, fontSize: S.xs, minWidth: 55 }}>{c.pos}</div>
                <div style={{ flex: 1 }}>
                  <div style={{ color: S.tx, fontSize: S.xs, fontWeight: 600 }}>{c.containerId}</div>
                  <div style={{ display: 'flex', gap: 4, marginTop: 2, flexWrap: 'wrap' }}>
                    <Badge text={c.type} color={S.cy} />
                    {c.reefer === 'Yes' && <Badge text="RF" color={S.cy} />}
                    {c.oog === 'Yes' && <Badge text="OOG" color={S.gd} />}
                    {c.dg === 'Yes' && <Badge text={`DG ${c.dgClass}`} color={S.rd} />}
                    <span style={{ color: S.dm, fontSize: S.lb }}>{c.port}</span>
                    {c.weight && <span style={{ color: S.dm, fontSize: S.lb }}>{(c.weight/1000).toFixed(1)}t</span>}
                  </div>
                </div>
                <button onClick={() => del(i)} style={{ background: 'transparent', border: 'none', color: S.rd, cursor: 'pointer', fontSize: '0.8rem' }}>✕</button>
              </div>
            ))}
        </div>
        {bays.length > 0 && (
          <div style={{ marginTop: 8, borderTop: `1px solid ${S.bd2}`, paddingTop: 6, display: 'flex', gap: 12 }}>
            {[
              ['Total', bays.length],
              ['Reefer', bays.filter(b => b.reefer === 'Yes').length],
              ['OOG', bays.filter(b => b.oog === 'Yes').length],
              ['DG', bays.filter(b => b.dg === 'Yes').length],
            ].map(([k, v]) => (
              <div key={k} style={{ textAlign: 'center' }}>
                <div style={{ color: S.dm, fontSize: S.lb }}>{k}</div>
                <div style={{ color: ACC, fontWeight: 700, fontFamily: 'monospace' }}>{v}</div>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}

function ContainerReefer() {
  const ACC = VESSEL_COLORS.container.accent;
  const KEY = 'cargo_container_reefer';
  const [entries, setEntries] = useState(() => load(KEY, []));
  const [form, setForm] = useState({ ts: new Date().toISOString().slice(0,16), containerId: '', setPoint: '', supply: '', return_: '', humidity: '', defrost: 'No', alarm: 'None', remarks: '' });
  const set = k => e => setForm(f => ({ ...f, [k]: e.target.value }));
  const add = () => { if (!form.containerId || !form.supply) return; const e = [...entries, { ...form }]; setEntries(e); save(KEY, e); setForm(f => ({ ...f, ts: new Date().toISOString().slice(0,16), containerId: '', supply: '', return_: '', humidity: '', remarks: '' })); };
  const del = i => { const e = entries.filter((_, j) => j !== i); setEntries(e); save(KEY, e); };
  const tempDiff = (parseFloat(form.supply) - parseFloat(form.setPoint)).toFixed(1);
  const COLS = [
    { key: 'ts', label: 'Date/Time', w: 110 }, { key: 'containerId', label: 'Container', w: 100 },
    { key: 'setPoint', label: 'Set °C', w: 55 }, { key: 'supply', label: 'Supply °C', w: 65 },
    { key: 'return_', label: 'Return °C', w: 65 }, { key: 'humidity', label: 'RH%', w: 45 },
    { key: 'alarm', label: 'Alarm', w: 80 }, { key: 'remarks', label: 'Remarks', w: 100 },
  ];
  return (
    <div>
      <Card style={{ marginBottom: 10 }}>
        <SectionLabel text="Reefer Monitoring Entry" color={ACC} />
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 10px' }}>
          <Field label="Date / Time" value={form.ts} onChange={set('ts')} type="datetime-local" />
          <Field label="Container ID" value={form.containerId} onChange={set('containerId')} placeholder="MSCU1234567" color={ACC} />
          <Field label="Set Point" value={form.setPoint} onChange={set('setPoint')} type="number" placeholder="e.g. -18" unit="°C" />
          <Field label="Supply Air Temp" value={form.supply} onChange={set('supply')} type="number" placeholder="°C" unit="°C" color={form.setPoint && form.supply && Math.abs(parseFloat(tempDiff)) > 3 ? S.rd : S.gn} />
          <Field label="Return Air Temp" value={form.return_} onChange={set('return_')} type="number" placeholder="°C" unit="°C" />
          <Field label="Humidity" value={form.humidity} onChange={set('humidity')} type="number" placeholder="%" unit="% RH" />
          <div style={{ marginBottom: 8 }}>
            <div style={{ color: S.dm, fontSize: S.lb, marginBottom: 3 }}>Defrost Running</div>
            <select value={form.defrost} onChange={set('defrost')} style={{ width: '100%', background: S.bg3, color: S.cy, border: `1px solid ${S.bd2}`, borderRadius: 5, padding: '6px 8px', fontSize: S.xs }}>
              {['No','Yes'].map(t => <option key={t}>{t}</option>)}
            </select>
          </div>
          <div style={{ marginBottom: 8 }}>
            <div style={{ color: S.dm, fontSize: S.lb, marginBottom: 3 }}>Alarm Status</div>
            <select value={form.alarm} onChange={set('alarm')} style={{ width: '100%', background: S.bg3, color: form.alarm === 'None' ? S.gn : S.rd, border: `1px solid ${S.bd2}`, borderRadius: 5, padding: '6px 8px', fontSize: S.xs }}>
              {['None','High Temp','Low Temp','Defrost Fault','Power Fault','Humidity Alarm'].map(t => <option key={t}>{t}</option>)}
            </select>
          </div>
        </div>
        {form.setPoint && form.supply && <div style={{ background: Math.abs(parseFloat(tempDiff)) <= 2 ? 'rgba(0,255,136,0.08)' : 'rgba(255,71,87,0.08)', border: `1px solid ${Math.abs(parseFloat(tempDiff)) <= 2 ? S.gn : S.rd}44`, borderRadius: 6, padding: '5px 10px', marginBottom: 8 }}>
          <span style={{ color: S.dm, fontSize: S.xs }}>Δ from set point: </span>
          <span style={{ color: Math.abs(parseFloat(tempDiff)) <= 2 ? S.gn : S.rd, fontWeight: 700, fontFamily: 'monospace' }}>{parseFloat(tempDiff) > 0 ? '+' : ''}{tempDiff}°C</span>
        </div>}
        <Field label="Remarks" value={form.remarks} onChange={set('remarks')} placeholder="Cargo condition, maintenance, actions…" />
        <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
          <Btn onClick={add} color={ACC} style={{ flex: 1 }}>+ Add Reading</Btn>
          <Btn onClick={() => exportLog('Reefer Monitoring Log', entries, COLS)} color={S.dm}>⬇ Export</Btn>
        </div>
      </Card>
      <Card>
        <SectionLabel text={`Reefer Log (${entries.length})`} color={ACC} />
        <LogTable entries={entries} columns={COLS} onDelete={del} accent={ACC} />
      </Card>
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
    { id: 'bayplan', label: '🗺 Bay Plan',        component: ContainerBayPlan   },
    { id: 'reefer',  label: '❄ Reefer Log',      component: ContainerReefer    },
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
