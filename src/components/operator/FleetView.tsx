'use client';

import Link from 'next/link';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { api, errorMessage, useRequireAuth } from '@/lib/auth';
import { useApi } from '@/lib/use-api';
import { projectToMap, TRACKING_LABEL } from '@/lib/listings-api';

type Vehicle = {
  vehicleId: string;
  listingId: string | null;
  title: string;
  registration: string;
  source: keyof typeof TRACKING_LABEL;
  status: 'on_trip' | 'late' | 'idle' | 'offline';
  flags: ('geofence' | 'speed' | 'offline' | 'late' | 'sos')[];
  bookingId: string | null;
  bookingCode: string | null;
  renter: string | null;
  returnDue: string | null;
  position: { lat: number; lng: number } | null;
  speedKmph: number | null;
  batteryPct: number | null;
  lastSeenMinutes: number | null;
  rules: { allowedArea: string | null; speedLimitKmph: number | null; offlineMinutes: number; lateGraceMinutes: number };
};
type Fleet = {
  center: { lat: number; lng: number; name: string; radiusKm: number } | null;
  counts: { all: number; onTrip: number; idle: number; offline: number };
  vehicles: Vehicle[];
  alerts: { id: string; type: string; message: string; createdAt: string; resolvedAt: string | null; vehicleId: string }[];
  simulator: boolean;
};
type Replay = {
  bookingCode: string;
  title: string;
  renter: string | null;
  from: string | null;
  to: string | null;
  distanceKm: number;
  maxSpeedKmph: number;
  stops: number;
  geofenceExits: number;
  points: { lat: number; lng: number; speedKmph: number | null; at: string }[];
};

const FILTERS = [
  { key: 'all', label: 'All' },
  { key: 'trip', label: 'On trip' },
  { key: 'idle', label: 'Idle' },
  { key: 'offline', label: 'Offline' },
] as const;

const FLAG_LABEL: Record<string, [string, string]> = {
  geofence: ['er', 'Outside area'],
  speed: ['er', 'Speeding'],
  sos: ['er', 'SOS'],
};

function statusChip(v: Vehicle): [string, string] {
  if (v.flags.length) return FLAG_LABEL[v.flags[0]] ?? ['er', v.flags[0]];
  if (v.status === 'late') return ['wa', 'Late'];
  if (v.status === 'on_trip') return ['tr', 'On trip'];
  if (v.status === 'offline') return ['', 'Device offline'];
  return ['', 'Idle at base'];
}

const time = (iso: string) => new Date(iso).toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit' });

export function FleetView() {
  const { user } = useRequireAuth();
  const fleet = useApi<Fleet>(user ? '/operator/fleet' : null, { pollMs: 15_000 });
  const [filter, setFilter] = useState<(typeof FILTERS)[number]['key']>('all');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  if (fleet.error && !fleet.data) return <main className="wrap"><div className="note r">{fleet.error}</div></main>;
  if (!fleet.data) return <main className="wrap mut">Loading…</main>;
  const f = fleet.data;
  const shown = f.vehicles.filter((v) =>
    filter === 'all' ? true : filter === 'trip' ? v.status === 'on_trip' || v.status === 'late' : filter === 'idle' ? v.status === 'idle' : v.status === 'offline',
  );
  const selected = f.vehicles.find((v) => v.vehicleId === selectedId) ?? f.vehicles.find((v) => v.flags.length) ?? f.vehicles.find((v) => v.position) ?? null;

  async function simulate(bookingId: string) {
    setErr(null);
    try {
      await api(`/tracking/simulate/${bookingId}`, { method: 'POST' });
      fleet.reload();
    } catch (e) {
      setErr(errorMessage(e));
    }
  }

  return (
    <main style={{ display: 'flex', flexWrap: 'wrap', minHeight: 900 }}>
      <aside style={{ flex: '1 1 300px', maxWidth: 380, background: '#fff', borderRight: '1px solid var(--line)', display: 'flex', flexDirection: 'column' }} aria-label="Vehicles">
        <div style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 10, borderBottom: '1px solid var(--line)' }}>
          <Link href="/operator" className="sm">← Dashboard</Link>
          <h1 style={{ fontSize: 22 }}>Fleet · {f.counts.all} vehicles</h1>
          <div className="seg" style={{ flexWrap: 'wrap' }}>
            {FILTERS.map((x) => (
              <button key={x.key} type="button" className={filter === x.key ? 'on' : ''} onClick={() => setFilter(x.key)}>
                {x.label}{x.key === 'trip' ? ` ${f.counts.onTrip}` : x.key === 'idle' ? ` ${f.counts.idle}` : x.key === 'offline' ? ` ${f.counts.offline}` : ''}
              </button>
            ))}
          </div>
        </div>
        {shown.length === 0 && <p className="sm mut" style={{ padding: 16 }}>No vehicles here.</p>}
        {shown.map((v) => {
          const [cls, label] = statusChip(v);
          return (
            <button key={v.vehicleId} type="button" onClick={() => setSelectedId(v.vehicleId)} style={{ textAlign: 'left', border: 0, borderTop: '1px solid #EEEBE4', padding: '14px 16px', background: selected?.vehicleId === v.vehicleId ? 'var(--green-tint)' : '#fff', cursor: 'pointer', display: 'flex', flexDirection: 'column', gap: 4 }}>
              <span style={{ display: 'flex', justifyContent: 'space-between', gap: 8 }}><strong>{v.title} · ••{v.registration.slice(-2)}</strong><span className={`chip ${cls}`}>{label}</span></span>
              <span className="sm mut">
                {v.position
                  ? `${v.renter ?? 'Renter'} · ${v.speedKmph !== null ? `${Math.round(v.speedKmph)} km/h` : 'parked'} · ${v.lastSeenMinutes ?? '—'} min ago · ${TRACKING_LABEL[v.source] ?? v.source}`
                  : v.status === 'offline'
                    ? `Not on trip · last seen ${v.lastSeenMinutes !== null ? `${v.lastSeenMinutes} min ago` : 'never'}`
                    : v.bookingId
                      ? `${v.renter ?? 'Renter'} · waiting for first location`
                      : 'Location hidden · no active rental'}
              </span>
            </button>
          );
        })}
        <p className="xs mut" style={{ padding: 16 }}>You can see a vehicle&apos;s location only during an active rental. Idle vehicles show their device status only.</p>
      </aside>

      <section style={{ flex: '999 1 520px', minWidth: 0, display: 'flex', flexDirection: 'column' }} aria-label="Map and details">
        <FleetMap fleet={f} selected={selected} onSelect={setSelectedId} />
        {err && <div className="note r" style={{ margin: 16 }}>{err}</div>}
        {selected && <Details v={selected} onSimulate={f.simulator ? simulate : undefined} onReload={fleet.reload} />}
        <section className="card" style={{ margin: 16, padding: 18, display: 'flex', flexDirection: 'column', gap: 8 }} aria-labelledby="al">
          <h2 id="al" style={{ fontSize: 18 }}>Alerts · last 24 hours</h2>
          {f.alerts.length === 0 && <p className="sm mut">No alerts.</p>}
          {f.alerts.map((a) => (
            <div key={a.id} className="li" style={{ flexWrap: 'wrap' }}>
              <span className={`chip ${a.resolvedAt ? '' : a.type === 'late' ? 'wa' : 'er'}`}>{a.type}</span>
              <span className="sm" style={{ flex: 1 }}>{a.message}</span>
              <span className="xs mut">{time(a.createdAt)}</span>
              {!a.resolvedAt && (
                <button type="button" className="btn bt" style={{ minHeight: 30 }} onClick={() => void api(`/operator/alerts/${a.id}/resolve`, { method: 'POST' }).then(fleet.reload)}>Mark handled</button>
              )}
            </div>
          ))}
        </section>
      </section>
    </main>
  );
}

function FleetMap({ fleet: f, selected, onSelect }: { fleet: Fleet; selected: Vehicle | null; onSelect: (id: string) => void }) {
  const live = f.vehicles.filter((v) => v.position);
  const c = f.center;
  const fencePts = c ? [{ lat: c.lat + c.radiusKm / 111, lng: c.lng }, { lat: c.lat - c.radiusKm / 111, lng: c.lng }] : [];
  const center = c ?? live[0]?.position ?? { lat: 12.97, lng: 77.59 };
  const project = projectToMap([...live.map((v) => v.position!), ...fencePts], center);
  const fence = c ? [project(fencePts[0]), project(fencePts[1])] : null;
  return (
    <div className="map" style={{ height: 460 }} role="img" aria-label="Map of vehicles on trip">
      {fence && (
        <div className="fence" style={{ left: `${project(center).x - (fence[1].y - fence[0].y) / 2}%`, top: `${fence[0].y}%`, width: `${fence[1].y - fence[0].y}%`, height: `${fence[1].y - fence[0].y}%` }}>
          <span className="pin" style={{ left: 8, top: 8 }}>Geofence · {c!.name}</span>
        </div>
      )}
      {live.map((v) => {
        const p = project(v.position!);
        const alert = v.flags.length > 0;
        return (
          <button
            key={v.vehicleId}
            type="button"
            className={`veh ${alert ? 'al' : ''}`}
            style={{ left: `${p.x}%`, top: `${p.y}%`, cursor: 'pointer', padding: 0 }}
            aria-label={`${v.title} ${v.speedKmph ?? 0} km/h`}
            onClick={() => onSelect(v.vehicleId)}
          />
        );
      })}
      {selected?.position && (() => {
        const p = project(selected.position);
        return <span className="pin on" style={{ left: `calc(${p.x}% + 14px)`, top: `calc(${p.y}% - 10px)` }}>{selected.title} · {Math.round(selected.speedKmph ?? 0)} km/h</span>;
      })()}
      {live.length === 0 && <span className="pin" style={{ left: '40%', top: '45%' }}>No vehicles on trip right now</span>}
    </div>
  );
}

function Details({ v, onSimulate, onReload }: { v: Vehicle; onSimulate?: (bookingId: string) => Promise<void>; onReload: () => void }) {
  const router = useRouter();
  const [replayOpen, setReplayOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  return (
    <section className="card" style={{ margin: 16, padding: 18, display: 'flex', flexDirection: 'column', gap: 12 }} aria-label={`${v.title} details`}>
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, flexWrap: 'wrap' }}>
        <h2 style={{ fontSize: 20 }}>{v.title} · {v.registration}</h2>
        {v.flags.includes('geofence') && <span className="chip er">Left {v.rules.allowedArea}</span>}
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: 12 }} className="sm">
        <Stat k="Speed" v={v.position ? `${Math.round(v.speedKmph ?? 0)} km/h` : '—'} />
        <Stat k="Last update" v={v.lastSeenMinutes !== null ? `${v.lastSeenMinutes} min ago` : '—'} />
        {v.batteryPct !== null && <Stat k="Battery" v={`${v.batteryPct}%`} />}
        <Stat k="Source" v={TRACKING_LABEL[v.source] ?? v.source} />
        <Stat k="Renter" v={v.renter ?? '—'} />
        <Stat k="Return due" v={v.returnDue ? new Date(v.returnDue).toLocaleString('en-IN', { weekday: 'short', hour: 'numeric', minute: '2-digit' }) : '—'} />
      </div>
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        {v.bookingId && (
          <button type="button" className="btn bs" onClick={() => void api<{ id: string }>('/conversations', { body: { bookingId: v.bookingId } }).then((r) => router.push(`/messages?c=${r.id}`))}>Message renter</button>
        )}
        <Link className="btn bt" href="/help">Call support</Link>
        {v.bookingId && <button type="button" className="btn bt" onClick={() => setReplayOpen((o) => !o)}>{replayOpen ? 'Hide' : 'Trip replay'}</button>}
        {v.bookingId && onSimulate && (
          <button type="button" className="btn bt" disabled={busy} onClick={() => { setBusy(true); void onSimulate(v.bookingId!).finally(() => { setBusy(false); onReload(); }); }}>
            {busy ? 'Simulating…' : 'Simulate trip (test)'}
          </button>
        )}
      </div>
      <div className="sm" style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        <strong>Alert rules</strong>
        <span>Geofence · {v.rules.allowedArea ?? 'none'}</span>
        <span>Over-speed · {v.rules.speedLimitKmph ? `above ${v.rules.speedLimitKmph} km/h` : 'off'}</span>
        <span>Offline · more than {v.rules.offlineMinutes} min (GPS devices)</span>
        <span>Late return · after {v.rules.lateGraceMinutes} min grace</span>
        {v.listingId && <Link href={`/list-vehicle?id=${v.listingId}#s6`}>Edit rules</Link>}
      </div>
      {replayOpen && v.bookingId && <ReplayView bookingId={v.bookingId} />}
    </section>
  );
}

function ReplayView({ bookingId }: { bookingId: string }) {
  const { data } = useApi<Replay>(`/trips/${bookingId}/replay`);
  if (!data) return <p className="sm mut">Loading replay…</p>;
  if (data.points.length < 2) return <p className="sm mut">No route recorded yet for {data.bookingCode}.</p>;
  const project = projectToMap(data.points, data.points[0]);
  const pts = data.points.map((p) => project(p));
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      <strong className="sm">Trip replay · {data.title} · #{data.bookingCode}{data.renter ? ` · ${data.renter}` : ''}</strong>
      <div className="map" style={{ height: 220, borderRadius: 10 }}>
        <svg viewBox="0 0 100 100" preserveAspectRatio="none" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }} aria-hidden="true">
          <polyline points={pts.map((p) => `${p.x},${p.y}`).join(' ')} fill="none" stroke="#1D5FD1" strokeWidth="1.2" vectorEffect="non-scaling-stroke" />
        </svg>
        <span className="pin" style={{ left: `${pts[0].x}%`, top: `${pts[0].y}%` }}>Start</span>
        <span className="pin on" style={{ left: `${pts.at(-1)!.x}%`, top: `${pts.at(-1)!.y}%` }}>Now</span>
      </div>
      <div className="sm" style={{ display: 'flex', gap: 14, flexWrap: 'wrap' }}>
        <span>{data.from ? time(data.from) : ''} → {data.to ? time(data.to) : ''} · {data.distanceKm} km</span>
        <span>Max speed {data.maxSpeedKmph} km/h</span>
        <span>{data.stops} stops</span>
        <span>{data.geofenceExits} geofence exit{data.geofenceExits === 1 ? '' : 's'}</span>
      </div>
    </div>
  );
}

function Stat({ k, v }: { k: string; v: string }) {
  return (
    <div>
      <div className="mut xs">{k}</div>
      <strong>{v}</strong>
    </div>
  );
}
