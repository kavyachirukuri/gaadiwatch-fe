import type { Metadata } from 'next';
import { OperatorRequests } from '@/components/operator/OperatorRequests';

export const metadata: Metadata = { title: 'Bookings · GaadiWatch' };

export default function OperatorRequestsPage() {
  return <OperatorRequests />;
}
