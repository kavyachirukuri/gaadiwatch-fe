import type { RentResult } from './listings-api';

type TrackingSource = RentResult['trackingSource'];

export type BookingStatus =
  | 'requested'
  | 'accepted'
  | 'declined'
  | 'paid'
  | 'active'
  | 'returned'
  | 'completed'
  | 'cancelled'
  | 'disputed';

export type Booking = {
  id: string;
  code: string;
  status: BookingStatus;
  paymentStatus: 'pending' | 'authorized' | 'captured' | 'released' | 'refunded' | 'partially_refunded';
  startAt: string;
  endAt: string;
  createdAt: string;
  acceptedAt: string | null;
  replyBy: string | null;
  declinedAt: string | null;
  declineReason: string | null;
  cancelledAt: string | null;
  cancelReason: string | null;
  refundAmount: number | null;
  startedAt: string | null;
  returnedAt: string | null;
  completedAt: string | null;
  settlement: {
    kmDriven: number | null;
    extraKmFee: number;
    fuelFee: number;
    lateFee: number;
    damageKept: number;
    depositRefund: number | null;
    settledAt: string | null;
  };
  price: {
    rent: number;
    bookingFee: number;
    gstOnFees: number;
    deliveryFee: number;
    damageProtection: number;
    rentalTotal: number;
    deposit: number;
  };
  delivery: boolean;
  listing: {
    id: string;
    title: string;
    area: string;
    city: string;
    year: number;
    type: string;
    registration: string;
    freeKmPerDay: number | null;
    extraKmCharge: number | null;
    lateGraceMinutes: number | null;
    cancellationPolicy: string;
    trackingSource: TrackingSource;
  };
  operator: { id: string; name: string; phone: string | null };
  renter?: { id: string; name: string; kycVerified: boolean; licenceVerified: boolean; licenceClasses: string[]; phone: string | null };
};

export type CancelPreview = { refund: number; kept: number; free: boolean; freeUntil: string | null };

export type OperatorSummary = {
  pendingRequests: number;
  activeTrips: number;
  upcomingTrips: number;
  bookingsThisMonth: number;
  earningsThisMonth: number;
  vehicles: number;
  listingsByStatus: Record<string, number>;
};

export const STATUS_LABEL: Record<BookingStatus, [string, string]> = {
  requested: ['wa', 'Waiting for operator'],
  accepted: ['ok', 'Confirmed'],
  paid: ['ok', 'Confirmed'],
  active: ['tr', 'On trip'],
  returned: ['tr', 'Returned'],
  completed: ['', 'Completed'],
  declined: ['er', 'Declined'],
  cancelled: ['er', 'Cancelled'],
  disputed: ['er', 'In dispute'],
};

export const fmtDateTime = (iso: string) =>
  new Intl.DateTimeFormat('en-IN', { weekday: 'short', day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' }).format(new Date(iso));

export function timeLeft(iso: string, now: number) {
  const ms = new Date(iso).getTime() - now;
  if (ms <= 0) return 'now';
  const m = Math.round(ms / 60000);
  return m >= 60 ? `${Math.floor(m / 60)} h ${m % 60} min` : `${m} min`;
}
