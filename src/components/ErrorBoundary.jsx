/* eslint-disable */
// src/components/ErrorBoundary.jsx
// Catches any crash in its children and shows the real error message
// instead of the app going blank. Must be a class component — React
// only supports error boundaries this way, no hook equivalent exists.

import { Component } from "react";

export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { error: null };
  }

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error, info) {
    // Logged to console so it's visible via remote debugging (chrome://inspect)
    console.error('[ErrorBoundary]', error, info?.componentStack);
  }

  render() {
    if (this.state.error) {
      return (
        <div style={{
          minHeight: '100vh', display: 'flex', flexDirection: 'column',
          alignItems: 'center', justifyContent: 'center', background: '#040C1A',
          color: '#E2EBF8', padding: '2rem', textAlign: 'center', gap: 16,
        }}>
          <div style={{ fontSize: '3rem' }}>⚠️</div>
          <div style={{ fontFamily: 'Orbitron,monospace', fontSize: '1rem', fontWeight: 700, color: '#F0A500' }}>
            Something broke
          </div>
          <div style={{
            background: 'rgba(255,71,87,0.1)', border: '1px solid rgba(255,71,87,0.3)',
            borderRadius: 8, padding: '12px 16px', maxWidth: 500, fontSize: '0.78rem',
            color: '#FF4757', fontFamily: 'monospace', wordBreak: 'break-word',
          }}>
            {this.state.error?.message || String(this.state.error)}
          </div>
          <button
            onClick={() => this.setState({ error: null })}
            style={{
              background: 'linear-gradient(135deg,#00B4D8,#1565C0)', border: 'none',
              borderRadius: 10, padding: '12px 24px', color: 'white', fontWeight: 700,
              fontFamily: "'Exo 2',sans-serif", fontSize: '0.85rem', cursor: 'pointer',
            }}
          >
            ↺ Try Again
          </button>
          <div style={{ fontSize: '0.68rem', color: '#5A7A90' }}>
            Screenshot this message and send it over — that's what actually lets me fix it.
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
