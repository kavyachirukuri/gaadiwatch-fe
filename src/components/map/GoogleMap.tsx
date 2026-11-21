"use client";

import { useEffect, useRef, useState } from "react";
import { loadGoogleMaps, MAP_ID } from "@/lib/google-maps";

type LatLng = { lat: number; lng: number };

export type MapMarker = LatLng & {
  id: string;
  /** price = price pill · vehicle = live vehicle dot · centre = search centre · tag = small label (Start / Now) */
  kind: "price" | "vehicle" | "centre" | "tag";
  title: string; // read by screen readers
  label?: string; // text shown on price pills and tags
  active?: boolean;
  alert?: boolean;
  onClick?: () => void;
  onHover?: () => void;
};

type Props = {
  markers: MapMarker[];
  center: LatLng;
  circle?: (LatLng & { radiusKm: number }) | null;
  path?: LatLng[];
  ariaLabel: string;
  className?: string;
  style?: React.CSSProperties;
  /** Shown if Google Maps can't load (no network, bad key). */
  fallback?: React.ReactNode;
};

const sig = (m: MapMarker) =>
  `${m.id}|${m.kind}|${m.lat}|${m.lng}|${m.label ?? ""}|${m.active ? 1 : 0}|${m.alert ? 1 : 0}`;

function markerElement(m: MapMarker) {
  const el = document.createElement(m.onClick ? "button" : "span");
  if (el instanceof HTMLButtonElement) el.type = "button";
  el.setAttribute("aria-label", m.title);
  el.title = m.title;
  if (m.kind === "price") {
    el.className = `gm-pin${m.active ? " on" : ""}`;
    el.textContent = m.label ?? "";
  } else if (m.kind === "vehicle") {
    el.className = `gm-veh${m.alert ? " al" : ""}${m.active ? " on" : ""}`;
  } else if (m.kind === "centre") {
    el.className = "gm-me";
  } else {
    el.className = `gm-pin${m.active ? " on" : ""}`;
    el.textContent = m.label ?? "";
  }
  return el;
}

/** A real Google map with price pills, vehicle dots, a geofence circle and a route line. */
export function GoogleMap({
  markers,
  center,
  circle,
  path,
  ariaLabel,
  className,
  style,
  fallback,
}: Props) {
  const box = useRef<HTMLDivElement>(null);
  const map = useRef<google.maps.Map | null>(null);
  const drawn = useRef(
    new Map<
      string,
      { sig: string; marker: google.maps.marker.AdvancedMarkerElement }
    >(),
  );
  const latest = useRef(markers);
  const shapes = useRef<{
    circle?: google.maps.Circle;
    line?: google.maps.Polyline;
  }>({});
  const fitted = useRef("");
  const shapesKey = useRef("");
  const [status, setStatus] = useState<"loading" | "ready" | "error">(
    "loading",
  );

  useEffect(() => {
    latest.current = markers;
  });

  // Create the map once
  useEffect(() => {
    let live = true;
    loadGoogleMaps()
      .then(() => {
        if (!live || !box.current || map.current) return;
        map.current = new google.maps.Map(box.current, {
          center,
          zoom: 12,
          mapId: MAP_ID,
          clickableIcons: false,
          streetViewControl: false,
          mapTypeControl: false,
          fullscreenControl: true,
          gestureHandling: "cooperative",
        });
        setStatus("ready");
      })
      .catch(() => live && setStatus("error"));
    return () => {
      live = false;
    };
    // the first centre is enough; later views are set by fitBounds
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Markers: only redraw the ones that changed (keeps hover smooth)
  useEffect(() => {
    const m = map.current;
    if (status !== "ready" || !m) return;
    const keep = new Set<string>();
    for (const mk of markers) {
      keep.add(mk.id);
      const s = sig(mk);
      const old = drawn.current.get(mk.id);
      if (old && old.sig === s) continue;
      if (old) old.marker.map = null;
      const el = markerElement(mk);
      const id = mk.id;
      el.addEventListener("click", () =>
        latest.current.find((x) => x.id === id)?.onClick?.(),
      );
      el.addEventListener("mouseenter", () =>
        latest.current.find((x) => x.id === id)?.onHover?.(),
      );
      el.addEventListener("focus", () =>
        latest.current.find((x) => x.id === id)?.onHover?.(),
      );
      const marker = new google.maps.marker.AdvancedMarkerElement({
        map: m,
        position: { lat: mk.lat, lng: mk.lng },
        content: el,
        zIndex: mk.active ? 10 : mk.kind === "centre" ? 5 : 1,
      });
      drawn.current.set(mk.id, { sig: s, marker });
    }
    for (const [id, d] of drawn.current) {
      if (!keep.has(id)) {
        d.marker.map = null;
        drawn.current.delete(id);
      }
    }
  }, [markers, status]);

  // Geofence circle + route line
  useEffect(() => {
    const m = map.current;
    if (status !== "ready" || !m) return;
    const key = JSON.stringify([circle ?? null, path ?? null]);
    if (key === shapesKey.current) return; // same shapes as last time: nothing to redraw
    shapesKey.current = key;
    shapes.current.circle?.setMap(null);
    shapes.current.line?.setMap(null);
    shapes.current = {};
    if (circle) {
      shapes.current.circle = new google.maps.Circle({
        map: m,
        center: { lat: circle.lat, lng: circle.lng },
        radius: circle.radiusKm * 1000,
        strokeColor: "#1d5fd1",
        strokeOpacity: 0.8,
        strokeWeight: 2,
        fillColor: "#1d5fd1",
        fillOpacity: 0.06,
        clickable: false,
      });
    }
    if (path && path.length > 1) {
      shapes.current.line = new google.maps.Polyline({
        map: m,
        path,
        strokeColor: "#1d5fd1",
        strokeOpacity: 0.9,
        strokeWeight: 4,
        clickable: false,
      });
    }
  }, [circle, path, status]);

  // Fit the view to everything shown — only when the set of places changes, not on hover
  useEffect(() => {
    const m = map.current;
    if (status !== "ready" || !m) return;
    const pts: LatLng[] = [...markers, ...(path ?? [])];
    if (circle) {
      const d = circle.radiusKm / 111;
      pts.push(
        { lat: circle.lat + d, lng: circle.lng + d },
        { lat: circle.lat - d, lng: circle.lng - d },
      );
    }
    if (!pts.length) pts.push(center);
    const key = pts
      .map((p) => `${p.lat.toFixed(5)},${p.lng.toFixed(5)}`)
      .join(";");
    if (key === fitted.current) return;
    fitted.current = key;
    if (pts.length === 1) {
      m.setCenter(pts[0]);
      m.setZoom(14);
      return;
    }
    const b = new google.maps.LatLngBounds();
    pts.forEach((p) => b.extend(p));
    m.fitBounds(b, 48);
  }, [markers, path, circle, center, status]);

  if (status === "error" && fallback) return <>{fallback}</>;
  return (
    <div
      className={className}
      style={{ position: "relative", ...style }}
      role="region"
      aria-label={ariaLabel}
    >
      <div
        ref={box}
        style={{ position: "absolute", inset: 0, borderRadius: "inherit" }}
      />
      {status === "loading" && (
        <span
          className="chip"
          style={{
            position: "absolute",
            top: 14,
            left: "50%",
            transform: "translateX(-50%)",
            zIndex: 3,
            background: "#fff",
          }}
        >
          Loading map…
        </span>
      )}
    </div>
  );
}
