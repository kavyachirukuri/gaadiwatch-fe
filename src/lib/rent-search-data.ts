// Sample rental listings for the Rent search page (W04).
// Shape matches what the listings API will return later.
export type VehicleKind = 'scooter' | 'bike' | 'car';
export type Fuel = 'petrol' | 'electric' | 'cng' | 'diesel';

export type RentListing = {
  id: string;
  title: string;
  kind: VehicleKind;
  fuel: Fuel;
  year: number;
  kmDriven: number;
  distanceKm: number;
  operator: string;
  rating: number;
  replyTime: string;
  pricePerDay: number;
  deposit: number;
  tracking: string;
  gps: boolean;
  deliveryFee: number | null; // null = no delivery, 0 = free
  instantBook: boolean;
  createdAt: string;
  map: { x: number; y: number }; // position on the placeholder map, in %
};

export const RENT_LISTINGS: RentListing[] = [
  { id: 'activa-6g', title: 'Honda Activa 6G', kind: 'scooter', fuel: 'petrol', year: 2023, kmDriven: 12480, distanceKm: 1.2, operator: 'Rao Self Drive', rating: 4.8, replyTime: '~15 min', pricePerDay: 399, deposit: 2000, tracking: 'GPS tracked', gps: true, deliveryFee: 99, instantBook: false, createdAt: '2026-10-28', map: { x: 40, y: 33 } },
  { id: 'ather-450x', title: 'Ather 450X', kind: 'scooter', fuel: 'electric', year: 2024, kmDriven: 6100, distanceKm: 2.0, operator: 'VoltRide HSR', rating: 4.9, replyTime: '~5 min', pricePerDay: 549, deposit: 3000, tracking: 'GPS via EV app', gps: true, deliveryFee: null, instantBook: true, createdAt: '2026-11-02', map: { x: 72, y: 22 } },
  { id: 'jupiter-125', title: 'TVS Jupiter 125', kind: 'scooter', fuel: 'petrol', year: 2022, kmDriven: 18400, distanceKm: 2.6, operator: 'Koramangala Wheels', rating: 4.6, replyTime: '~40 min', pricePerDay: 349, deposit: 1500, tracking: 'Phone tracking', gps: false, deliveryFee: null, instantBook: false, createdAt: '2026-09-15', map: { x: 22, y: 60 } },
  { id: 'ola-s1-air', title: 'Ola S1 Air', kind: 'scooter', fuel: 'electric', year: 2024, kmDriven: 4200, distanceKm: 3.1, operator: 'GreenGo Rentals', rating: 4.7, replyTime: '~20 min', pricePerDay: 449, deposit: 2500, tracking: 'GPS tracked', gps: true, deliveryFee: 0, instantBook: false, createdAt: '2026-10-30', map: { x: 75, y: 66 } },
  { id: 'access-125', title: 'Suzuki Access 125', kind: 'scooter', fuel: 'petrol', year: 2021, kmDriven: 26800, distanceKm: 3.8, operator: 'Rao Self Drive', rating: 4.5, replyTime: '~15 min', pricePerDay: 379, deposit: 1500, tracking: 'GPS tracked', gps: true, deliveryFee: 99, instantBook: true, createdAt: '2026-08-21', map: { x: 10, y: 14 } },
  { id: 'chetak', title: 'Bajaj Chetak', kind: 'scooter', fuel: 'electric', year: 2023, kmDriven: 9800, distanceKm: 4.4, operator: 'VoltRide HSR', rating: 4.7, replyTime: '~5 min', pricePerDay: 429, deposit: 2500, tracking: 'GPS via EV app', gps: true, deliveryFee: 149, instantBook: true, createdAt: '2026-10-05', map: { x: 55, y: 82 } },
  { id: 're-classic-350', title: 'Royal Enfield Classic 350', kind: 'bike', fuel: 'petrol', year: 2022, kmDriven: 21300, distanceKm: 3.4, operator: 'Indiranagar Riders', rating: 4.7, replyTime: '~25 min', pricePerDay: 1099, deposit: 5000, tracking: 'GPS tracked', gps: true, deliveryFee: null, instantBook: true, createdAt: '2026-10-12', map: { x: 62, y: 45 } },
  { id: 'pulsar-ns200', title: 'Bajaj Pulsar NS200', kind: 'bike', fuel: 'petrol', year: 2023, kmDriven: 11200, distanceKm: 5.0, operator: 'Koramangala Wheels', rating: 4.6, replyTime: '~40 min', pricePerDay: 899, deposit: 4000, tracking: 'GPS tracked', gps: true, deliveryFee: 149, instantBook: false, createdAt: '2026-09-30', map: { x: 30, y: 78 } },
  { id: 'swift-2021', title: 'Maruti Swift', kind: 'car', fuel: 'petrol', year: 2021, kmDriven: 38500, distanceKm: 4.1, operator: 'CityDrive BTM', rating: 4.8, replyTime: '~30 min', pricePerDay: 1899, deposit: 10000, tracking: 'GPS tracked', gps: true, deliveryFee: 299, instantBook: false, createdAt: '2026-10-20', map: { x: 48, y: 58 } },
  { id: 'nexon-ev', title: 'Tata Nexon EV', kind: 'car', fuel: 'electric', year: 2024, kmDriven: 14900, distanceKm: 5.6, operator: 'GreenGo Rentals', rating: 4.9, replyTime: '~20 min', pricePerDay: 2999, deposit: 15000, tracking: 'GPS tracked', gps: true, deliveryFee: 0, instantBook: true, createdAt: '2026-11-04', map: { x: 85, y: 40 } },
];
