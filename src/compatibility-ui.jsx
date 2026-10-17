import React, { useEffect, useState } from 'react';
import { diagnosticSummary } from './compatibility.js';
const h = React.createElement;

export function CompatibilityNotice({ t, snapshot, retry }) {
  const [copied, setCopied] = useState(false);
  const code = snapshot.layout?.ok === false && snapshot.status === 'ready' ? 'layout' : snapshot.code;
  return h('section', { className: 'linggo-root linggo-compat-notice', role: 'alert' },
    h('strong', null, t('compat.title')),
    h('p', null, t(`compat.${code}`)),
    h('button', { onClick: retry }, t('compat.retry')),
    h('button', { onClick: async () => { try { await navigator.clipboard.writeText(diagnosticSummary(snapshot)); setCopied(true); } catch { setCopied(false); } } }, t(copied ? 'compat.copied' : 'compat.copy')),
    h('details', null, h('summary', null, t('compat.details')), h('pre', { style: { whiteSpace: 'pre-wrap', overflowWrap: 'anywhere', maxHeight: '40vh', overflow: 'auto' } }, diagnosticSummary(snapshot))),
  );
}

export function CompatibilitySettings({ t, api }) {
  const [snapshot, setSnapshot] = useState(null), [copied, setCopied] = useState(false);
  const refresh = () => api('clientCompatibility').then(setSnapshot);
  useEffect(() => { void refresh(); }, []);
  if (!snapshot) return null;
  return h('section', { className: 'linggo-compat-settings' },
    h('h3', null, t('compat.title')),
    h('p', { role: 'status' }, t(`compat.${snapshot.code}`)),
    h('pre', { style: { whiteSpace: 'pre-wrap', overflowWrap: 'anywhere', maxHeight: 260, overflow: 'auto' } }, diagnosticSummary(snapshot)),
    h('button', { onClick: async () => { try { await navigator.clipboard.writeText(diagnosticSummary(snapshot)); setCopied(true); } catch { setCopied(false); } } }, t(copied ? 'compat.copied' : 'compat.copy')),
    h('button', { onClick: async () => { await api('compatibility'); await refresh(); } }, t('compat.retry')),
  );
}
