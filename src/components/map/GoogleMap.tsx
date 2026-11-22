"use client";

import { useEffect, useRef, useState } from "react";
import { loadGoogleMaps, MAP_ID } from "@/lib/google-maps";
import { vehicleIconSvg } from "@/lib/vehicle-icons";

type LatLng = { lat: number; lng: number };

export type MapMarker = LatLng & {
  id: string;
  /** price = price pill · vehicle = live vehicle dot · centre = search centre · tag = small label (Start / Now) */
  kind: "price" | "vehicle" | "centre" | "tag";
  title: string; // read by screen readers
  label?: string; // text shown on price pills and tags
  active?: boolean;
  alert?: boolean;
  /** Vehicle type (scooter, bike, car…) for the icon on price pills and live vehicles */
  vehicleType?: string;
  /** Direction of travel in degrees from north, for live vehicles */
  heading?: number | null;
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

// What a marker looks like; position and heading are left out because they change in place (smooth movement)
const sig = (m: MapMarker) =>
  `${m.id}|${m.kind}|${m.label ?? ""}|${m.active ? 1 : 0}|${m.alert ? 1 : 0}|${m.vehicleType ?? ""}`;

function markerElement(m: MapMarker) {
  const el = document.createElement(m.onClick ? "button" : "span");
  if (el instanceof HTMLButtonElement) el.type = "button";
  el.setAttribute("aria-label", m.title);
  el.title = m.title;
  if (m.kind === "price") {
    el.className = `gm-pin${m.active ? " on" : ""}`;
    if (m.vehicleType) el.innerHTML = vehicleIconSvg(m.vehicleType, 15);
    el.append(document.createTextNode(m.label ?? ""));
  } else if (m.kind === "vehicle") {
    // A round badge with the vehicle icon and an arrow showing the direction of travel
    el.className = `gm-car${m.alert ? " al" : ""}${m.active ? " on" : ""}`;
    el.innerHTML = `<span class="gm-dir"></span><span class="gm-badge">${vehicleIconSvg(m.vehicleType, 20)}</span>`;
    setHeading(el, m.heading);
  } else if (m.kind === "centre") {
    el.className = "gm-me";
  } else {
    el.className = `gm-pin${m.active ? " on" : ""}`;
    el.textContent = m.label ?? "";
  }
  return el;
}

function setHeading(el: HTMLElement, heading: number | null | undefined) {
  const dir = el.querySelector<HTMLElement>(".gm-dir");
  if (!dir) return;
  if (heading === null || heading === undefined) return; // keep the last direction while stopped
  dir.style.display = "block";
  dir.style.transform = `rotate(${heading}deg)`;
}

/** Glides a marker to a new position instead of jumping (about one second). */
function glide(
  marker: google.maps.marker.AdvancedMarkerElement,
  to: LatLng,
  anim: Map<google.maps.marker.AdvancedMarkerElement, number>,
) {
  const p = marker.position;
  const from =
    p instanceof google.maps.LatLng
      ? { lat: p.lat(), lng: p.lng() }
      : p
        ? { lat: Number(p.lat), lng: Number(p.lng) }
        : to;
  if (from.lat === to.lat && from.lng === to.lng) return;
  const prev = anim.get(marker);
  if (prev) cancelAnimationFrame(prev);
  const t0 = performance.now();
  const frame = (t: number) => {
    const k = Math.min(1, (t - t0) / 1000);
    marker.position = {
      lat: from.lat + (to.lat - from.lat) * k,
      lng: from.lng + (to.lng - from.lng) * k,
    };
    if (k < 1) anim.set(marker, requestAnimationFrame(frame));
    else anim.delete(marker);
  };
  anim.set(marker, requestAnimationFrame(frame));
}

// Less padding around the pins on small screens, so they don't get squeezed together
const edgePadding = (el: HTMLElement | null) =>
  el && el.clientWidth < 480 ? 24 : 48;

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
  const anim = useRef(
    new Map<google.maps.marker.AdvancedMarkerElement, number>(),
  );
  const shapes = useRef<{
    circle?: google.maps.Circle;
    line?: google.maps.Polyline;
  }>({});
  const fitted = useRef("");
  const lastBounds = useRef<google.maps.LatLngBounds | null>(null);
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
      if (old && old.sig === s) {
        // Same marker, maybe moved: glide it there and turn the arrow
        glide(old.marker, { lat: mk.lat, lng: mk.lng }, anim.current);
        if (old.marker.content instanceof HTMLElement)
          setHeading(old.marker.content, mk.heading);
        continue;
      }
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

  // Fit the view to everything shown — only when the set of places changes, not on hover or as vehicles move
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
    // Moving vehicles don't re-zoom the map: they count by id, not by where they are
    const key = [
      ...markers.map((p) =>
        p.kind === "vehicle"
          ? `v:${p.id}`
          : `${p.lat.toFixed(5)},${p.lng.toFixed(5)}`,
      ),
      ...(path ?? []).map((p) => `${p.lat.toFixed(5)},${p.lng.toFixed(5)}`),
      circle ? `c:${circle.lat},${circle.lng},${circle.radiusKm}` : "",
    ].join(";");
    if (key === fitted.current) return;
    fitted.current = key;
    if (pts.length === 1) {
      lastBounds.current = null;
      m.setCenter(pts[0]);
      m.setZoom(14);
      return;
    }
    const b = new google.maps.LatLngBounds();
    pts.forEach((p) => b.extend(p));
    lastBounds.current = b;
    m.fitBounds(b, edgePadding(box.current));
  }, [markers, path, circle, center, status]);

  // Phone rotated or window resized: fit the pins into the new size again
  useEffect(() => {
    const el = box.current;
    if (status !== "ready" || !el || typeof ResizeObserver === "undefined")
      return;
    let width = el.clientWidth;
    const ro = new ResizeObserver(() => {
      if (Math.abs(el.clientWidth - width) < 40) return;
      width = el.clientWidth;
      if (lastBounds.current && map.current)
        map.current.fitBounds(lastBounds.current, edgePadding(el));
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, [status]);

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
