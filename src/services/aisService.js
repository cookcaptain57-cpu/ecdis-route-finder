/* eslint-disable */
// src/services/aisService.js
// ─────────────────────────────────────────────────────────────────────────────
// Real-time AIS from SafePilot / Pilot Plug WiFi (offline, no internet needed)
//
// Connection flow:
//   AIS Device (TCP 4001) → tcp-ws-bridge.js (WS 4002) → aisService.js → NavModePage
//
// Decodes: !AIVDM !AIVDO (types 1,2,3,5,18,21,24) · $GPRMC · $HEHDT
// Handles: multi-part messages · malformed packets · stale removal · 500+ targets
// ─────────────────────────────────────────────────────────────────────────────

// ── WS hosts to try in order ──────────────────────────────────────────────
const WS_HOSTS = [
  'ws://192.168.1.1:4002',   // bridge on default SafePilot WiFi router
  'ws://10.0.0.1:4002',      // bridge on alternate router
  'ws://192.168.0.1:4002',   // bridge on common home router
  'ws://192.168.1.1:4001',   // direct WS if AIS device supports it
  'ws://10.0.0.1:10110',     // OpenCPN/multiplexer direct WS
];

// ── Stale target timeout: remove targets not updated in 10 minutes ─────────
const STALE_MS = 10 * 60 * 1000;

// ── COLREG classification ──────────────────────────────────────────────────
const COLREG = (ownCog, relBrg) => {
  const rel = ((relBrg - ownCog + 360) % 360);
  if (rel > 345 || rel < 15)      return 'HEAD-ON';
  if (rel >= 112.5 && rel <= 247.5) return 'OVERTAKING';
  if (rel > 15 && rel < 112.5)    return 'CROSSING-STBD';
  if (rel > 247.5 && rel < 345)   return 'CROSSING-PORT';
  return 'SAFE';
};

// ── CPA / TCPA (proper vector algebra) ────────────────────────────────────
const calcCPATCPA = (own, tgt) => {
  if (!own || !tgt || !own.lat || !tgt.lat) return { cpa: 999, tcpa: 0 };
  const DEG = Math.PI / 180;
  const cosLat = Math.cos(((own.lat + tgt.lat) / 2) * DEG);
  // Relative position (NM)
  const dx = (tgt.lon - own.lon) * cosLat * 60;
  const dy = (tgt.lat - own.lat) * 60;
  // Velocity components (NM/hr)
  const oCog = (own.cog || 0) * DEG, tCog = (tgt.cog || 0) * DEG;
  const ovx = (own.sog || 0) * Math.sin(oCog), ovy = (own.sog || 0) * Math.cos(oCog);
  const tvx = (tgt.sog || 0) * Math.sin(tCog), tvy = (tgt.sog || 0) * Math.cos(tCog);
  // Relative velocity
  const dvx = tvx - ovx, dvy = tvy - ovy;
  const dvSq = dvx * dvx + dvy * dvy;
  const dot  = dx * dvx + dy * dvy;
  const tcpa = dvSq > 1e-6 ? -dot / dvSq : 0;
  const cpax = dx + (tcpa > 0 ? tcpa : 0) * dvx;
  const cpay = dy + (tcpa > 0 ? tcpa : 0) * dvy;
  const cpa  = Math.sqrt(cpax * cpax + cpay * cpay);
  return { cpa: parseFloat(cpa.toFixed(2)), tcpa: parseFloat(Math.max(0, tcpa).toFixed(2)) };
};

// ── Bearing own→target ────────────────────────────────────────────────────
const bearingTo = (lat1, lon1, lat2, lon2) => {
  const D = Math.PI / 180;
  const dLon = (lon2 - lon1) * D;
  const y = Math.sin(dLon) * Math.cos(lat2 * D);
  const x = Math.cos(lat1 * D) * Math.sin(lat2 * D) -
            Math.sin(lat1 * D) * Math.cos(lat2 * D) * Math.cos(dLon);
  return ((Math.atan2(y, x) / D) + 360) % 360;
};

// ── NMEA checksum validation ───────────────────────────────────────────────
const validChecksum = (s) => {
  const st = s.indexOf('!') !== -1 ? s.indexOf('!') : s.indexOf('$');
  const end = s.lastIndexOf('*');
  if (st < 0 || end < 0 || end < st) return true; // no checksum — accept
  const body = s.slice(st + 1, end);
  const given = parseInt(s.slice(end + 1, end + 3), 16);
  const calc  = body.split('').reduce((x, c) => x ^ c.charCodeAt(0), 0);
  return calc === given;
};

// ── AIS 6-bit ASCII → bit array ───────────────────────────────────────────
const payloadToBits = (payload, fill = 0) => {
  const bits = [];
  for (const ch of payload) {
    let v = ch.charCodeAt(0) - 48;
    if (v > 39) v -= 8;
    v &= 0x3F;
    for (let b = 5; b >= 0; b--) bits.push((v >> b) & 1);
  }
  if (fill > 0) bits.splice(-fill);
  return bits;
};

const b = (bits, s, l) => { let v = 0; for (let i = 0; i < l; i++) v = (v << 1) | (bits[s + i] || 0); return v >>> 0; };
const bs = (bits, s, l) => { const v = b(bits, s, l); return (v & (1 << (l - 1))) ? v - (1 << l) : v; };
const str6 = (bits, s, l) => {
  let out = '';
  for (let i = 0; i < l; i += 6) {
    const c = b(bits, s + i, 6);
    out += c < 32 ? String.fromCharCode(c + 64) : String.fromCharCode(c);
  }
  return out.replace(/@+$/, '').trim();
};

// ── AIS message decoder ───────────────────────────────────────────────────
const decodeAIS = (bits) => {
  if (!bits || bits.length < 28) return null;
  const type = b(bits, 0, 6);
  const mmsi = b(bits, 8, 30);
  if (!mmsi) return null;

  try {
    switch (type) {
      case 1: case 2: case 3: {
        // Class A Position Report
        const navStat = b(bits, 38, 4);
        const sog     = b(bits, 50, 10) / 10;
        const lon     = bs(bits, 61, 28) / 600000;
        const lat     = bs(bits, 89, 27) / 600000;
        const cog     = b(bits, 116, 12) / 10;
        const hdg     = b(bits, 128, 9);
        if (Math.abs(lat) > 90 || Math.abs(lon) > 180) return null;
        return { msgType: type, mmsi, sog, lon, lat,
          cog: cog >= 360 ? 0 : cog,
          hdg: hdg === 511 ? (cog >= 360 ? 0 : cog) : hdg,
          navStatus: navStat, classA: true };
      }
      case 5: {
        // Static & Voyage — min 426 bits
        if (bits.length < 426) return null;
        return { msgType: 5, mmsi,
          imo:      b(bits, 40, 30),
          callSign: str6(bits, 70, 42),
          name:     str6(bits, 112, 120),
          shipType: b(bits, 232, 8),
          dimA:     b(bits, 240, 9), dimB: b(bits, 249, 9),
          dimC:     b(bits, 258, 6), dimD: b(bits, 264, 6),
          draught:  b(bits, 294, 8) / 10,
          dest:     str6(bits, 302, 120) };
      }
      case 18: {
        // Class B Position Report
        const sog = b(bits, 46, 10) / 10;
        const lon = bs(bits, 57, 28) / 600000;
        const lat = bs(bits, 85, 27) / 600000;
        const cog = b(bits, 112, 12) / 10;
        const hdg = b(bits, 124, 9);
        if (Math.abs(lat) > 90 || Math.abs(lon) > 180) return null;
        return { msgType: 18, mmsi, sog, lon, lat,
          cog: cog >= 360 ? 0 : cog,
          hdg: hdg === 511 ? (cog >= 360 ? 0 : cog) : hdg,
          classA: false };
      }
      case 21: {
        // Aid-to-Navigation
        if (bits.length < 220) return null;
        const lon = bs(bits, 164, 28) / 600000;
        const lat = bs(bits, 192, 27) / 600000;
        if (Math.abs(lat) > 90 || Math.abs(lon) > 180) return null;
        return { msgType: 21, mmsi,
          name: str6(bits, 43, 120),
          atonType: b(bits, 38, 5),
          lon, lat, sog: 0, cog: 0, hdg: 0, isAtoN: true };
      }
      case 24: {
        // Class B Static Data
        const partNo = b(bits, 38, 2);
        if (partNo === 0 && bits.length >= 160)
          return { msgType: 24, mmsi, partNo: 0, name: str6(bits, 40, 120) };
        if (partNo === 1 && bits.length >= 168)
          return { msgType: 24, mmsi, partNo: 1,
            shipType: b(bits, 40, 8), callSign: str6(bits, 90, 42) };
        return null;
      }
      default:
        return { msgType: type, mmsi }; // position unknown — still track MMSI
    }
  } catch { return null; }
};

// ── $GPRMC parser → own ship position from GPS ────────────────────────────
const parseGPRMC = (s) => {
  // $GPRMC,hhmmss,A,llll.ll,a,yyyyy.yy,a,x.x,x.x,ddmmyy,*hh
  const p = s.split(',');
  if (p.length < 9 || p[2] !== 'A') return null;
  const rawLat = parseFloat(p[3]);
  const rawLon = parseFloat(p[5]);
  if (isNaN(rawLat) || isNaN(rawLon)) return null;
  const lat = Math.floor(rawLat / 100) + (rawLat % 100) / 60;
  const lon = Math.floor(rawLon / 100) + (rawLon % 100) / 60;
  return {
    lat: p[4] === 'S' ? -lat : lat,
    lon: p[6] === 'W' ? -lon : lon,
    sog: parseFloat(p[7]) || 0,
    cog: parseFloat(p[8]) || 0,
  };
};

// ── $HEHDT / $GPHDT parser → true heading ─────────────────────────────────
const parseHDT = (s) => {
  const p = s.split(',');
  if (p.length < 2) return null;
  const hdg = parseFloat(p[1]);
  return isNaN(hdg) ? null : hdg;
};

// ─────────────────────────────────────────────────────────────────────────────
// AISService class
// ─────────────────────────────────────────────────────────────────────────────
class AISService {
  constructor() {
    this.ws              = null;
    this.targets         = new Map();   // mmsi → target
    this.multiPart       = new Map();   // seqKey → parts[]
    this.callbacks       = { update: [], status: [], alert: [], ownPos: [] };
    this.reconnectTimer  = null;
    this.staleTimer      = null;
    this.hostIdx         = 0;
    this.retryDelay      = 2000;
    this.maxRetryDelay   = 30000;
    this._status         = 'disconnected';
    this.ownShip         = null;        // set from $GPRMC or external
    this.customHosts     = [];
    this._active         = false;
    this._lineBuffer     = '';
  }

  // ── Public API ──────────────────────────────────────────────────────────

  /** Start connecting. hosts = optional array of ws:// URLs to try */
  start(hosts = []) {
    this._active = true;
    this.customHosts = hosts;
    this._connect();
    // Stale target cleanup every 60s
    this.staleTimer = setInterval(() => this._removeStale(), 60000);
  }

  stop() {
    this._active = false;
    clearTimeout(this.reconnectTimer);
    clearInterval(this.staleTimer);
    if (this.ws) { try { this.ws.close(1000, 'stopped'); } catch {} this.ws = null; }
    this._setStatus('disconnected');
    this.targets.clear();
  }

  /** Set own ship position (from GPS) for CPA calculation */
  setOwnShip(pos) { this.ownShip = pos; }

  /** Register callback. event = 'update' | 'status' | 'alert' | 'ownPos' */
  on(event, cb) {
    if (this.callbacks[event]) this.callbacks[event].push(cb);
    return () => { this.callbacks[event] = this.callbacks[event].filter(f => f !== cb); };
  }

  /** Get snapshot of all targets */
  getTargets() { return new Map(this.targets); }

  /** Inject a custom NMEA sentence (for testing) */
  inject(sentence) { this._parseLine(sentence.trim()); }

  // ── Connection ──────────────────────────────────────────────────────────

  _allHosts() { return [...this.customHosts, ...WS_HOSTS]; }

  _connect() {
    if (!this._active) return;
    const hosts = this._allHosts();
    const url   = hosts[this.hostIdx % hosts.length];
    this._setStatus(`connecting:${url}`);

    try {
      const ws = new WebSocket(url);
      this.ws = ws;

      ws.onopen = () => {
        this.retryDelay = 2000;
        this._setStatus('connected');
        this._emit('status', { status: 'connected', host: url, targets: this.targets.size });
      };

      ws.onmessage = (e) => {
        const data = typeof e.data === 'string' ? e.data : '';
        // Buffer incoming data — device may send partial lines
        this._lineBuffer += data;
        const lines = this._lineBuffer.split('\n');
        this._lineBuffer = lines.pop() || ''; // keep incomplete last line
        lines.forEach(l => { const t = l.trim(); if (t) this._parseLine(t); });
      };

      ws.onerror = () => { /* onclose handles retry */ };

      ws.onclose = (ev) => {
        this.ws = null;
        if (!this._active) return;
        if (ev.code !== 1000) {
          // Try next host on failure
          this.hostIdx++;
          this._setStatus('reconnecting');
          this.reconnectTimer = setTimeout(() => this._connect(), this.retryDelay);
          this.retryDelay = Math.min(this.retryDelay * 1.5, this.maxRetryDelay);
        }
      };
    } catch {
      this.hostIdx++;
      this.reconnectTimer = setTimeout(() => this._connect(), this.retryDelay);
      this.retryDelay = Math.min(this.retryDelay * 1.5, this.maxRetryDelay);
    }
  }

  // ── NMEA Parsing ────────────────────────────────────────────────────────

  _parseLine(line) {
    if (!line || line.length < 6) return;

    // AIS messages
    if (line.startsWith('!AIVDM') || line.startsWith('!AIVDO')) {
      if (!validChecksum(line)) return;
      this._handleVDM(line);
      return;
    }

    // Own GPS position from multiplexer
    if (line.startsWith('$GPRMC') || line.startsWith('$GNRMC') || line.startsWith('$GPRMC')) {
      const pos = parseGPRMC(line);
      if (pos) { this.ownShip = { ...this.ownShip, ...pos }; this._emit('ownPos', this.ownShip); }
      return;
    }

    // True heading
    if (line.startsWith('$HEHDT') || line.startsWith('$GPHDT') || line.startsWith('$INHDT')) {
      const hdg = parseHDT(line);
      if (hdg !== null) { this.ownShip = { ...(this.ownShip||{}), hdg }; this._emit('ownPos', this.ownShip); }
      return;
    }
  }

  _handleVDM(sentence) {
    const parts = sentence.split(',');
    if (parts.length < 7) return;
    const total   = parseInt(parts[1]) || 1;
    const partNum = parseInt(parts[2]) || 1;
    const seqId   = parts[3] || '0';
    const chan    = parts[4] || 'A';
    const payload = parts[5] || '';
    const fill    = parseInt(parts[6]) || 0;
    if (!payload) return;

    if (total === 1) {
      // Single sentence
      this._decodeAndMerge(payload, fill);
      return;
    }

    // Multi-part — assemble
    const key = `${seqId}_${chan}`;
    if (!this.multiPart.has(key)) this.multiPart.set(key, { parts: new Array(total), fill, total });
    const mp = this.multiPart.get(key);
    mp.parts[partNum - 1] = payload;

    if (mp.parts.filter(Boolean).length === total) {
      this.multiPart.delete(key);
      const full = mp.parts.join('');
      this._decodeAndMerge(full, mp.fill);
    }

    // Flush stale multi-part buffer if too large
    if (this.multiPart.size > 200) this.multiPart.clear();
  }

  _decodeAndMerge(payload, fill) {
    try {
      const bits = payloadToBits(payload, fill);
      const decoded = decodeAIS(bits);
      if (!decoded || !decoded.mmsi) return;
      this._mergeTarget(decoded);
    } catch {}
  }

  // ── Target store ─────────────────────────────────────────────────────────

  _mergeTarget(decoded) {
    const { mmsi } = decoded;
    const existing = this.targets.get(mmsi) || { mmsi };

    // Merge fields — static data (type 5,24) augments position data (types 1,2,3,18)
    const updated = { ...existing, ...decoded, ts: Date.now() };

    // For static/voyage messages (type 5, type 24), don't overwrite lat/lon
    if ([5].includes(decoded.msgType)) {
      updated.lat = existing.lat;
      updated.lon = existing.lon;
      updated.sog = existing.sog;
      updated.cog = existing.cog;
      updated.hdg = existing.hdg;
    }
    if (decoded.msgType === 24) {
      updated.lat = existing.lat;
      updated.lon = existing.lon;
    }

    // Compute CPA/TCPA if own ship is known and target has position
    if (this.ownShip?.lat && updated.lat) {
      const { cpa, tcpa } = calcCPATCPA(this.ownShip, updated);
      const brg = bearingTo(this.ownShip.lat, this.ownShip.lon, updated.lat, updated.lon);
      const colreg = COLREG(this.ownShip.cog || 0, brg);
      updated.cpa   = cpa;
      updated.tcpa  = tcpa;
      updated.brg   = parseFloat(brg.toFixed(1));
      updated.colreg = colreg;
      updated.range = parseFloat(
        Math.sqrt(
          Math.pow((updated.lon - this.ownShip.lon) * Math.cos(this.ownShip.lat * Math.PI / 180) * 60, 2) +
          Math.pow((updated.lat - this.ownShip.lat) * 60, 2)
        ).toFixed(2)
      );

      // Collision alert: CPA < 1 NM AND TCPA < 30 min
      if (cpa < 1.0 && tcpa < 0.5 && tcpa > 0) {
        this._emit('alert', {
          mmsi, name: updated.name || String(mmsi),
          cpa, tcpa, colreg,
          severity: cpa < 0.3 ? 'CRITICAL' : 'WARNING',
        });
      }
    }

    this.targets.set(mmsi, updated);
    this._emit('update', { target: updated, targets: this.targets });
  }

  _removeStale() {
    const cutoff = Date.now() - STALE_MS;
    let removed = 0;
    for (const [mmsi, t] of this.targets) {
      if ((t.ts || 0) < cutoff) { this.targets.delete(mmsi); removed++; }
    }
    if (removed > 0) this._emit('update', { target: null, targets: this.targets });
  }

  // ── Internals ────────────────────────────────────────────────────────────

  _setStatus(s) {
    this._status = s;
    this._emit('status', { status: s, targets: this.targets.size });
  }

  _emit(event, data) {
    (this.callbacks[event] || []).forEach(cb => { try { cb(data); } catch {} });
  }
}

// ── Singleton export ──────────────────────────────────────────────────────
const aisServiceInstance = new AISService();
export default aisServiceInstance;

// Also export the class for custom instances
export { AISService, calcCPATCPA, bearingTo, decodeAIS, payloadToBits };
