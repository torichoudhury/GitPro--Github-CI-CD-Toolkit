import React, { useEffect, useRef } from 'react';

export default function LogDrawer({ stage, onClose }) {
  const drawerRef = useRef(null);

  // Close on Esc
  useEffect(() => {
    const handler = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onClose]);

  // Click outside to close
  const handleBackdrop = (e) => {
    if (e.target === drawerRef.current) onClose();
  };

  if (!stage) return null;

  const statusColors = {
    success:     '#3fb950',
    in_progress: '#58a6ff',
    pending:     '#8b949e',
    failure:     '#f85149',
  };
  const color = statusColors[stage.status === 'completed' ? stage.conclusion : stage.status] || '#8b949e';

  return (
    <div
      ref={drawerRef}
      onClick={handleBackdrop}
      className="fixed inset-0 bg-black/50 z-50 flex items-end justify-center"
      style={{ backdropFilter: 'blur(2px)' }}
    >
      <div className="w-full max-w-[860px] bg-gh-card border border-gh-border rounded-t-xl
                      animate-slide-in flex flex-col"
        style={{ maxHeight: '420px' }}>

        {/* Header */}
        <div className="flex items-center gap-3 px-4 py-3 border-b border-gh-border shrink-0">
          <span
            className="w-2.5 h-2.5 rounded-full shrink-0"
            style={{ background: color }}
          />
          <span className="text-gh-text font-semibold">{stage.name}</span>
          <span className="text-gh-muted text-xs font-mono ml-1">
            {stage.duration ? `· ${stage.duration}` : ''}
          </span>
          <button
            onClick={onClose}
            className="ml-auto text-gh-muted hover:text-gh-text text-lg leading-none transition-colors"
          >
            ✕
          </button>
        </div>

        {/* Log output */}
        <div className="log-scroll flex-1 overflow-y-auto">
          {stage.logs && stage.logs.length > 0 ? (
            stage.logs.map((line, i) => (
              <div key={i} className="flex gap-3 hover:bg-white/[0.03] px-1 rounded">
                <span className="text-gh-muted/40 select-none w-6 shrink-0 text-right">
                  {i + 1}
                </span>
                <span className={
                  line.startsWith('✓') ? 'text-gh-green' :
                  line.startsWith('✗') || line.includes('Error') ? 'text-red-400' :
                  line.startsWith('>') ? 'text-gh-blue' :
                  'text-gh-text'
                }>
                  {line}
                </span>
              </div>
            ))
          ) : (
            <div className="text-gh-muted text-xs text-center py-8">
              {stage.status === 'pending'
                ? 'Waiting for previous stages to complete…'
                : 'No log output available.'}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
