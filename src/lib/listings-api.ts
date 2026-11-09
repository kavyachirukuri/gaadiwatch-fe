// Types and calls for the NestJS listings API.
import { API_URL } from './api';

export type Page<T> = {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  center: { name: string; lat: number; lng: number };
};

export type RentResult = {
  id: string;
  title: string;
  type: string;
  fuel: string;
  year: number;
  kmDriven: number | null;
  distanceKm: number;
  operator: string;
  rating: number | null;
  replyMinutes: number | null;
  pricePerDay: number;
  pricePerHour: number | null;
  deposit: number;
  trackingSource: 'gps_device' | 'tracker' | 'ev_app' | 'phone' | 'none';
  gpsTracked: boolean;
  deliveryFee: number | null;
  instantBook: boolean;
  lat: number;
  lng: number;
  createdAt: string;
};

export type BuyResult = {
  id: string;
  title: string;
  type: string;
  fuel: string;
  year: number;
  kmDriven: number | null;
  ownerCount: number;
  seller: 'private' | 'commercial';
  area: string;
  distanceKm: number;
  price: number;
  openToOffers: boolean;
  serviceHistory: boolean;
  gpsTracked: boolean;
  exRental: boolean;
  featured: boolean;
  lat: number;
  lng: number;
  createdAt: string;
};

type Params = Record<string, string | number | boolean | undefined | null>;

function toQuery(params: Params): string {
  const q = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (v === undefined || v === null || v === '' || v === false) continue;
    q.set(k, String(v));
  }
  return q.toString();
}

async function get<T>(path: string, params: Params, signal?: AbortSignal): Promise<T> {
  const res = await fetch(`${API_URL}${path}?${toQuery(params)}`, { signal, headers: { Accept: 'application/json' } });
  if (!res.ok) {
    const body = (await res.json().catch(() => null)) as { message?: string } | null;
    throw new Error(body?.message ?? `Request failed (${res.status})`);
  }
  return res.json() as Promise<T>;
}

export const searchRent = (params: Params, signal?: AbortSignal) => get<Page<RentResult>>('/listings/rent', params, signal);
export const searchBuy = (params: Params, signal?: AbortSignal) => get<Page<BuyResult>>('/listings/buy', params, signal);

// ---------- Display helpers ----------

export const TRACKING_LABEL: Record<RentResult['trackingSource'], string> = {
  gps_device: 'GPS tracked',
  tracker: 'GPS tracked',
  ev_app: 'GPS via EV app',
  phone: 'Phone tracking',
  none: 'Not tracked',
};

export function fuelLabel(fuel: string): string {
  if (fuel === 'cng') return 'CNG';
  if (fuel === 'electric') return 'Electric';
  return fuel.charAt(0).toUpperCase() + fuel.slice(1);
}

/** Places points inside a placeholder map box, as percentages. */
export function projectToMap(points: { lat: number; lng: number }[], center: { lat: number; lng: number }) {
  const all = [...points, center];
  const lats = all.map((p) => p.lat);
  const lngs = all.map((p) => p.lng);
  const minLat = Math.min(...lats), maxLat = Math.max(...lats);
  const minLng = Math.min(...lngs), maxLng = Math.max(...lngs);
  const spanLat = Math.max(maxLat - minLat, 0.01);
  const spanLng = Math.max(maxLng - minLng, 0.01);
  return (p: { lat: number; lng: number }) => ({
    x: 8 + ((p.lng - minLng) / spanLng) * 78,
    y: 10 + ((maxLat - p.lat) / spanLat) * 76,
  });
}

// ---------- Platform settings (GET /meta) ----------

export type VehicleCategory = { key: string; label: string; rent: boolean; buy: boolean };
export type Meta = {
  bookingFee: number;
  cancellationPolicies: Record<string, { label: string; summary: string }>;
  vehicleCategories: VehicleCategory[];
  cities: { key: string; name: string }[];
  areas: { name: string; city: string }[];
};

export const getMeta = (signal?: AbortSignal) => get<Meta>('/meta', {}, signal);

// ---------- Listing detail (GET /listings/:id) ----------

export type ListingDetail = {
  id: string;
  title: string;
  description: string | null;
  purpose: 'rent' | 'sell' | 'both';
  city: string;
  area: string;
  location: { lat: number; lng: number } | null;
  vehicle: {
    type: string;
    typeLabel: string;
    make: string;
    model: string;
    year: number;
    fuel: string;
    odometerKm: number | null;
    registrationMasked: string;
    registrationType: 'private' | 'commercial';
    ownerCount: number;
    licenceRequired: string;
  };
  tracking: { source: RentResult['trackingSource']; gpsTracked: boolean };
  rent: null | {
    pricePerHour: number | null;
    pricePerDay: number;
    pricePerWeek: number | null;
    pricePerMonth: number | null;
    deposit: number;
    freeKmPerDay: number | null;
    extraKmCharge: number | null;
    deliveryFee: number | null;
    instantBook: boolean;
    lateFeePerHour: number | null;
    lateGraceMinutes: number | null;
    fuelChargePerLitre: number | null;
    helmetsIncluded: number | null;
    speedLimitKmph: number | null;
    allowedArea: string | null;
    cancellation: { key: string; label: string; summary: string };
    bookingFee: number;
  };
  sale: null | { price: number; openToOffers: boolean; serviceHistory: boolean; exRental: boolean };
  seller: {
    kind: 'operator' | 'private';
    name: string;
    initials: string;
    kycVerified: boolean;
    gstinVerified: boolean;
    licenceVerified: boolean;
    rating: number | null;
    replyMinutes: number | null;
    vehicleCount: number;
    memberSince: string;
  };
  rating: { average: number | null; count: number };
  completedTrips: number;
  photos: { id: string; url: string }[];
  reviews: { id: string; rating: number; comment: string | null; author: string; createdAt: string }[];
  bookedRanges: { start: string; end: string }[];
  similar: { id: string; title: string; year: number; price: number; distanceKm: number; rating: number | null; unit: 'day' | 'total' }[];
};

export class NotFoundError extends Error {}

export async function getListing(id: string, signal?: AbortSignal): Promise<ListingDetail> {
  const res = await fetch(`${API_URL}/listings/${encodeURIComponent(id)}`, { signal, headers: { Accept: 'application/json' } });
  if (res.status === 404) throw new NotFoundError('Listing not found');
  if (!res.ok) throw new Error(`Request failed (${res.status})`);
  return res.json() as Promise<ListingDetail>;
}
