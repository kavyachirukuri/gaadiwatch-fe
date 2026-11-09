// Sample data for the Home page until the listings API is ready.
export type RentCard = {
  id: string;
  title: string;
  distance: string;
  tags: { label: string; tone?: 'tr' | 'ok' }[];
  price: string;
  priceNote: string;
  meta: string;
};

export type SaleCard = {
  id: string;
  title: string;
  meta: string;
  price: string;
  badge: { label: string; tone?: 'ok' };
};

export const rentListings: RentCard[] = [
  { id: 'activa-6g', title: 'Honda Activa 6G · 2023', distance: '1.2 km', tags: [{ label: 'GPS tracked', tone: 'tr' }, { label: 'Licensed operator', tone: 'ok' }], price: '₹399', priceNote: '/day · ₹59/hr', meta: '4.8 ★ (126 trips) · Koramangala 5th Block' },
  { id: 'ather-450x', title: 'Ather 450X · 2024', distance: '2.0 km', tags: [{ label: 'GPS tracked', tone: 'tr' }, { label: 'EV' }, { label: 'Delivery' }], price: '₹549', priceNote: '/day · ₹79/hr', meta: '4.9 ★ (88 trips) · HSR Layout' },
  { id: 're-classic-350', title: 'RE Classic 350 · 2022', distance: '3.4 km', tags: [{ label: 'GPS tracked', tone: 'tr' }, { label: 'Instant book' }], price: '₹1,099', priceNote: '/day · ₹149/hr', meta: '4.7 ★ (64 trips) · Indiranagar' },
  { id: 'swift-2021', title: 'Maruti Swift · 2021', distance: '4.1 km', tags: [{ label: 'GPS tracked', tone: 'tr' }, { label: 'Self-drive' }], price: '₹1,899', priceNote: '/day · 300 km free', meta: '4.8 ★ (41 trips) · BTM Layout' },
];

export const saleListings: SaleCard[] = [
  { id: 'i20-asta', title: 'Hyundai i20 Asta · 2019', meta: 'Petrol · 42,000 km · 1st owner', price: '₹6.2 lakh', badge: { label: 'Open to offers', tone: 'ok' } },
  { id: 'jupiter-2021', title: 'TVS Jupiter · 2021', meta: 'Petrol · 18,400 km · private', price: '₹52,000', badge: { label: 'Open to offers', tone: 'ok' } },
  { id: 'tata-ace', title: 'Tata Ace Gold · 2020', meta: 'Diesel · 76,000 km · commercial', price: '₹3.4 lakh', badge: { label: 'Fixed price' } },
  { id: 'bajaj-re', title: 'Bajaj RE Auto · 2018', meta: 'CNG · 1.1 lakh km · commercial', price: '₹1.6 lakh', badge: { label: 'Open to offers', tone: 'ok' } },
];

export const vehicleTypes = [
  { name: 'Scooters', note: 'Rent · Buy', href: '/rent' },
  { name: 'Bikes', note: 'Rent · Buy', href: '/rent' },
  { name: 'EVs', note: 'Rent · Buy', href: '/rent' },
  { name: 'Cars', note: 'Rent · Buy', href: '/rent' },
  { name: '3-wheelers', note: 'Buy · rent soon', href: '/buy' },
  { name: 'Trucks', note: 'Buy · rent soon', href: '/buy' },
  { name: 'Lorries', note: 'Buy only', href: '/buy' },
];
