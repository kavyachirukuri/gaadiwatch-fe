// Loads the Google Maps JavaScript API once, on demand (browser only).
// Set NEXT_PUBLIC_GOOGLE_MAPS_API_KEY to turn real maps on; without it the
// app keeps showing the simple map preview.

const KEY = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY ?? "";

/** Map ID from Google Cloud (needed for custom markers). DEMO_MAP_ID works for testing. */
export const MAP_ID = process.env.NEXT_PUBLIC_GOOGLE_MAP_ID || "DEMO_MAP_ID";

export const hasGoogleMaps = KEY.length > 0;

let loading: Promise<void> | null = null;

export function loadGoogleMaps(): Promise<void> {
  if (!hasGoogleMaps)
    return Promise.reject(new Error("Google Maps key is not set"));
  if (typeof window === "undefined")
    return Promise.reject(new Error("Google Maps runs in the browser only"));
  if (typeof google !== "undefined" && google.maps?.Map)
    return Promise.resolve();
  if (loading) return loading;
  loading = new Promise<void>((resolve, reject) => {
    const callback = "__gwMapsReady";
    (window as unknown as Record<string, unknown>)[callback] = () => resolve();
    const s = document.createElement("script");
    s.src =
      `https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(KEY)}` +
      `&v=weekly&loading=async&libraries=marker&region=IN&language=en&callback=${callback}`;
    s.async = true;
    s.onerror = () => {
      loading = null;
      reject(new Error("Google Maps failed to load"));
    };
    document.head.appendChild(s);
  });
  return loading;
}
