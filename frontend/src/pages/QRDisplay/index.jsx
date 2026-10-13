import React, { useState, useRef } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import upesMark from '../../assets/upes-mark.png';

export default function QRDisplay() {
  const [customUrl, setCustomUrl] = useState('');
  const printRef = useRef();

  const baseUrl = window.location.origin;
  const requestUrl = customUrl.trim() || `${baseUrl}/request`;

  const handlePrint = () => {
    const printArea = printRef.current;
    const win = window.open('', '_blank');
    win.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8" />
        <title>UPES Stationery Request QR</title>
        <style>
          * { box-sizing: border-box; margin: 0; padding: 0; }
          body { font-family: 'IBM Plex Sans', Arial, sans-serif; background: #fff; display: flex; align-items: center; justify-content: center; min-height: 100vh; }
          .card { padding: 40px; text-align: center; display: flex; flex-direction: column; align-items: center; gap: 18px; max-width: 480px; }
          h1 { font-size: 22px; font-weight: 700; color: #0b66b2; letter-spacing: -0.01em; }
          p { font-size: 15px; color: #4A4A48; line-height: 1.5; }
          .url { font-size: 11px; color: #9A9A96; word-break: break-all; margin-top: 6px; }
        </style>
      </head>
      <body>
        <div class="card">
          ${printArea.innerHTML}
        </div>
      </body>
      </html>
    `);
    win.document.close();
    win.focus();
    setTimeout(() => { win.print(); win.close(); }, 250);
  };

  return (
    <div style={{ minHeight: '100vh', background: '#f4f8fc', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 24, gap: 24 }}>

      {/* QR Display Card */}
      <div ref={printRef} style={{ background: '#fff', border: '1px solid #E5E5E5', borderRadius: 18, padding: '40px 48px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 20, textAlign: 'center', maxWidth: 420, width: '100%' }}>
        <img src={upesMark} alt="UPES" style={{ height: 44, width: 'auto', display: 'block' }} />

        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          <h1 style={{ margin: 0, fontSize: 22, fontWeight: 700, color: '#0b66b2', letterSpacing: '-0.01em' }}>Request Stationery</h1>
          <p style={{ margin: 0, fontSize: 15, color: '#4A4A48', lineHeight: 1.5 }}>Scan the QR code to submit your stationery request.</p>
        </div>

        <div style={{ padding: 16, background: '#fff', border: '3px solid #0b66b2', borderRadius: 14, display: 'inline-flex' }}>
          <QRCodeSVG
            value={requestUrl}
            size={220}
            level="M"
            fgColor="#0b66b2"
            bgColor="#ffffff"
            style={{ display: 'block' }}
          />
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          <span style={{ fontSize: 13.5, color: '#4A4A48', fontWeight: 500 }}>Or visit:</span>
          <span style={{ fontSize: 12, color: '#8A8A86', wordBreak: 'break-all', fontFamily: "'IBM Plex Mono', monospace" }}>{requestUrl}</span>
        </div>

        <p style={{ margin: 0, fontSize: 13, color: '#9A9A96', lineHeight: 1.45, maxWidth: 280 }}>
          No login needed. Enter your SAP ID to begin.
        </p>
      </div>

      {/* Controls (not printed) */}
      <div style={{ background: '#fff', border: '1px solid #E5E5E5', borderRadius: 14, padding: '18px 20px', width: '100%', maxWidth: 420, display: 'flex', flexDirection: 'column', gap: 14 }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
          <label style={{ fontSize: 13.5, fontWeight: 500, color: '#4A4A48' }}>
            Custom URL <span style={{ fontWeight: 400, color: '#8A8A86' }}>(optional — e.g. your server's IP)</span>
          </label>
          <input
            value={customUrl}
            onChange={e => setCustomUrl(e.target.value)}
            placeholder={`${baseUrl}/request`}
            style={{ height: 40, padding: '0 12px', border: '1px solid #CFCFCB', borderRadius: 8, font: 'inherit', fontSize: 14, color: '#1A1A1A' }}
          />
          <span style={{ fontSize: 12.5, color: '#8A8A86' }}>
            For phones on the same network, replace <code style={{ fontFamily: 'monospace', background: '#F0F0EE', padding: '1px 4px', borderRadius: 3 }}>localhost</code> with your machine's local IP address (e.g. <code style={{ fontFamily: 'monospace', background: '#F0F0EE', padding: '1px 4px', borderRadius: 3 }}>192.168.1.x</code>).
          </span>
        </div>

        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          <button
            onClick={handlePrint}
            style={{ flex: 1, height: 42, border: 'none', borderRadius: 9, background: '#0b66b2', color: '#fff', font: 'inherit', fontSize: 14, fontWeight: 500, cursor: 'pointer' }}
          >
            Print / Save as PDF
          </button>
          <a
            href="/receptionist/requests"
            style={{ height: 42, padding: '0 16px', border: '1px solid #E5E5E5', borderRadius: 9, background: '#fff', color: '#1A1A1A', font: 'inherit', fontSize: 14, fontWeight: 500, cursor: 'pointer', display: 'flex', alignItems: 'center', textDecoration: 'none' }}
          >
            Back to desk
          </a>
        </div>
      </div>
    </div>
  );
}
