'use client';

import { useId, useState } from 'react';
import { errorMessage, uploadFile } from '@/lib/auth';

/** A button that uploads one photo or PDF and hands back its URL. */
export function FilePick({
  label,
  accept = 'image/*',
  onUploaded,
  className = 'btn bs',
  style,
  staff,
}: {
  label: React.ReactNode;
  accept?: string;
  onUploaded: (url: string, file: File) => void;
  className?: string;
  style?: React.CSSProperties;
  staff?: boolean;
}) {
  const id = useId();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function pick(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    setBusy(true);
    setError(null);
    try {
      onUploaded(await uploadFile(file, staff), file);
    } catch (err) {
      setError(errorMessage(err, 'Upload failed'));
    } finally {
      setBusy(false);
    }
  }

  return (
    <span style={{ display: 'inline-flex', flexDirection: 'column', gap: 4 }}>
      <label htmlFor={id} className={className} style={{ cursor: busy ? 'wait' : 'pointer', ...style }}>
        {busy ? 'Uploading…' : label}
      </label>
      <input id={id} type="file" accept={accept} onChange={(e) => void pick(e)} className="sr-only" disabled={busy} />
      {error && <span className="xs" style={{ color: '#9B1C13' }}>{error}</span>}
    </span>
  );
}

/** Thumbnail for an uploaded file (image or PDF link). */
export function Thumb({ url, label, height = 110, onRemove }: { url: string; label?: string; height?: number; onRemove?: () => void }) {
  const isPdf = url.toLowerCase().endsWith('.pdf');
  return (
    <figure style={{ margin: 0, position: 'relative' }}>
      <a href={url} target="_blank" rel="noreferrer" style={{ display: 'block' }}>
        {isPdf ? (
          <div className="ph" style={{ height }}>PDF</div>
        ) : (
          // eslint-disable-next-line @next/next/no-img-element -- user uploads come from the API server
          <img src={url} alt={label ?? 'Uploaded photo'} style={{ width: '100%', height, objectFit: 'cover', borderRadius: 10, border: '2px solid var(--green)' }} />
        )}
      </a>
      {label && <figcaption className="xs mut" style={{ marginTop: 4 }}>{label}</figcaption>}
      {onRemove && (
        <button type="button" onClick={onRemove} aria-label={`Remove ${label ?? 'photo'}`} className="btn bt" style={{ position: 'absolute', top: 4, right: 4, minHeight: 28, padding: '0 8px', background: '#fff' }}>
          ×
        </button>
      )}
    </figure>
  );
}
