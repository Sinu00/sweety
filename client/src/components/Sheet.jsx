import { useEffect, useRef } from 'react';
import Icon from './Icon';

// Bottom sheet on phones, centred dialog on larger screens.
export default function Sheet({ title, onClose, children }) {
  const panelRef = useRef(null);
  // Captured on first render, before any autoFocus inside the sheet runs.
  const openerRef = useRef(document.activeElement);

  useEffect(() => {
    const onKey = (e) => e.key === 'Escape' && onClose();
    document.addEventListener('keydown', onKey);
    document.body.classList.add('no-scroll');
    const opener = openerRef.current;
    // Focus the field marked data-autofocus (e.g. the glucose value), else the panel.
    (panelRef.current?.querySelector('[data-autofocus]') || panelRef.current)?.focus();
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.classList.remove('no-scroll');
      opener?.focus?.();
    };
  }, [onClose]);

  return (
    <div className="sheet-backdrop" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div
        className="sheet"
        role="dialog"
        aria-modal="true"
        aria-labelledby="sheet-title"
        tabIndex={-1}
        ref={panelRef}
      >
        <div className="sheet-grip" aria-hidden="true" />
        <div className="sheet-head">
          <h2 id="sheet-title">{title}</h2>
          <button type="button" className="icon-btn" onClick={onClose} aria-label="Close">
            <Icon name="close" />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}
