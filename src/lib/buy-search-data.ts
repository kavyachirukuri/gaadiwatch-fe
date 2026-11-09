// Sample sale listings for the Buy search page (W10).
export type SaleKind = 'scooter' | 'bike' | 'car' | 'three_wheeler' | 'truck' | 'lorry';
export type SaleFuel = 'petrol' | 'diesel' | 'electric' | 'cng';
export type SellerType = 'private' | 'commercial';

export type SaleListing = {
  id: string;
  title: string;
  kind: SaleKind;
  fuel: SaleFuel;
  year: number;
  kmDriven: number;
  owners: number;
  seller: SellerType;
  area: string;
  distanceKm: number;
  price: number;
  openToOffers: boolean;
  serviceHistory: boolean;
  gpsHistory: boolean;
  exRental: boolean;
  featured: boolean;
  createdAt: string;
  map: { x: number; y: number };
};

export const SALE_LISTINGS: SaleListing[] = [
  { id: 'i20-asta', title: 'Hyundai i20 Asta', kind: 'car', fuel: 'petrol', year: 2019, kmDriven: 42000, owners: 1, seller: 'private', area: 'HSR Layout', distanceKm: 0.8, price: 620000, openToOffers: true, serviceHistory: true, gpsHistory: false, exRental: false, featured: true, createdAt: '2026-11-05', map: { x: 45, y: 40 } },
  { id: 'baleno-delta', title: 'Maruti Baleno Delta', kind: 'car', fuel: 'petrol', year: 2020, kmDriven: 38500, owners: 1, seller: 'private', area: 'Bellandur', distanceKm: 5.2, price: 580000, openToOffers: true, serviceHistory: false, gpsHistory: false, exRental: false, featured: false, createdAt: '2026-11-03', map: { x: 78, y: 28 } },
  { id: 'nexon-ev-2021', title: 'Tata Nexon EV', kind: 'car', fuel: 'electric', year: 2021, kmDriven: 51000, owners: 1, seller: 'commercial', area: 'BTM Layout', distanceKm: 3.9, price: 690000, openToOffers: false, serviceHistory: true, gpsHistory: true, exRental: true, featured: false, createdAt: '2026-11-01', map: { x: 22, y: 55 } },
  { id: 'amaze-s', title: 'Honda Amaze S', kind: 'car', fuel: 'petrol', year: 2018, kmDriven: 59000, owners: 2, seller: 'private', area: 'Koramangala', distanceKm: 4.6, price: 460000, openToOffers: true, serviceHistory: true, gpsHistory: false, exRental: false, featured: false, createdAt: '2026-10-27', map: { x: 30, y: 22 } },
  { id: 'swift-vxi', title: 'Maruti Swift VXi', kind: 'car', fuel: 'petrol', year: 2021, kmDriven: 31000, owners: 1, seller: 'commercial', area: 'HSR Layout', distanceKm: 1.4, price: 540000, openToOffers: true, serviceHistory: true, gpsHistory: true, exRental: true, featured: false, createdAt: '2026-10-30', map: { x: 52, y: 62 } },
  { id: 'sonet-htk', title: 'Kia Sonet HTK', kind: 'car', fuel: 'diesel', year: 2021, kmDriven: 47000, owners: 1, seller: 'private', area: 'Sarjapur Road', distanceKm: 8.7, price: 695000, openToOffers: false, serviceHistory: false, gpsHistory: false, exRental: false, featured: false, createdAt: '2026-10-22', map: { x: 85, y: 70 } },
  { id: 'jupiter-2021', title: 'TVS Jupiter', kind: 'scooter', fuel: 'petrol', year: 2021, kmDriven: 18400, owners: 1, seller: 'private', area: 'Jayanagar', distanceKm: 7.1, price: 52000, openToOffers: true, serviceHistory: true, gpsHistory: false, exRental: false, featured: false, createdAt: '2026-11-04', map: { x: 15, y: 80 } },
  { id: 'ola-s1-pro', title: 'Ola S1 Pro', kind: 'scooter', fuel: 'electric', year: 2023, kmDriven: 6100, owners: 1, seller: 'private', area: 'Whitefield', distanceKm: 14.2, price: 92000, openToOffers: true, serviceHistory: false, gpsHistory: false, exRental: false, featured: false, createdAt: '2026-10-29', map: { x: 92, y: 18 } },
  { id: 'activa-ex-rental', title: 'Honda Activa 6G', kind: 'scooter', fuel: 'petrol', year: 2022, kmDriven: 24800, owners: 1, seller: 'commercial', area: 'Koramangala', distanceKm: 4.4, price: 61000, openToOffers: true, serviceHistory: true, gpsHistory: true, exRental: true, featured: false, createdAt: '2026-11-02', map: { x: 36, y: 30 } },
  { id: 'pulsar-ns200', title: 'Bajaj Pulsar NS200', kind: 'bike', fuel: 'petrol', year: 2021, kmDriven: 19000, owners: 1, seller: 'private', area: 'Marathahalli', distanceKm: 9.3, price: 105000, openToOffers: true, serviceHistory: false, gpsHistory: false, exRental: false, featured: false, createdAt: '2026-10-25', map: { x: 70, y: 12 } },
  { id: 'bajaj-re-auto', title: 'Bajaj RE Auto', kind: 'three_wheeler', fuel: 'cng', year: 2018, kmDriven: 110000, owners: 1, seller: 'commercial', area: 'Yeshwanthpur', distanceKm: 16.0, price: 160000, openToOffers: true, serviceHistory: true, gpsHistory: false, exRental: false, featured: false, createdAt: '2026-10-18', map: { x: 8, y: 10 } },
  { id: 'tata-ace-gold', title: 'Tata Ace Gold', kind: 'truck', fuel: 'diesel', year: 2020, kmDriven: 76000, owners: 1, seller: 'commercial', area: 'Peenya', distanceKm: 18.5, price: 340000, openToOffers: false, serviceHistory: true, gpsHistory: true, exRental: false, featured: false, createdAt: '2026-10-20', map: { x: 12, y: 40 } },
  { id: 'ashok-leyland-1616', title: 'Ashok Leyland 1616', kind: 'lorry', fuel: 'diesel', year: 2019, kmDriven: 210000, owners: 1, seller: 'commercial', area: 'Hosur Road', distanceKm: 12.6, price: 1850000, openToOffers: true, serviceHistory: true, gpsHistory: true, exRental: false, featured: false, createdAt: '2026-10-15', map: { x: 62, y: 88 } },
];
