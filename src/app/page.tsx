import Link from 'next/link';
import { SearchCard } from '@/components/home/SearchCard';
import { VehicleTypes } from '@/components/home/VehicleTypes';
import { HomeListings } from '@/components/home/HomeListings';
import { LiveCities } from '@/components/home/LiveCities';

export default function HomePage() {
  return (
    <>
      {/* Hero */}
      <section style={{ background: 'var(--hero)', color: '#fff' }}>
        <div className="wrap" style={{ display: 'flex', flexWrap: 'wrap', gap: 40, alignItems: 'center', paddingTop: 64, paddingBottom: 64 }}>
          <div style={{ flex: '1 1 560px', minWidth: 0, display: 'flex', flexDirection: 'column', gap: 22 }}>
            <LiveCities />
            <h1 style={{ fontSize: 'clamp(36px, 5vw, 56px)', color: '#fff' }}>
              Rent it. Buy it. Sell it.
              <br />
              Always know where it is.
            </h1>
            <p style={{ fontSize: 18, color: '#CFE3DC', maxWidth: 560 }}>
              Rent scooters, bikes, EVs and cars from licensed operators, or buy and sell any vehicle — with GPS tracking built in.
            </p>
            <SearchCard />
            <p className="sm" style={{ color: '#A9C9BE' }}>
              We only rent out commercially registered vehicles from licensed operators. Private vehicles can be listed for sale.
            </p>
          </div>

          {/* Illustration of the live-tracking feature (not real data) */}
          <div style={{ flex: '1 1 420px', minWidth: 0 }} aria-hidden="true">
            <div className="map" style={{ height: 420, borderRadius: 18 }}>
              <div className="road" style={{ left: -20, top: 230, width: 700, transform: 'rotate(-14deg)' }} />
              <div className="fence" style={{ left: 70, top: 60, width: 340, height: 290 }} />
              <span className="veh" style={{ left: 260, top: 170 }} />
              <span className="veh" style={{ left: 150, top: 270 }} />
              <span className="veh off" style={{ left: 330, top: 300 }} />
              <div className="card" style={{ position: 'absolute', left: 20, bottom: 20, right: 20, padding: 14, display: 'flex', gap: 12, alignItems: 'center', color: 'var(--ink)' }}>
                <span className="chip tr">Live</span>
                <div style={{ flex: 1 }}>
                  <strong>Live tracking for every rental</strong>
                  <div className="sm mut">Location, speed and geofence alerts while the vehicle is out</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <main className="wrap" style={{ display: 'flex', flexDirection: 'column', gap: 56 }}>
        <section style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <h2 style={{ fontSize: 28 }}>Every vehicle type, one place</h2>
          <VehicleTypes />
        </section>

        <HomeListings />

        <section style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 20 }}>
          <div className="card" style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 10 }}>
            <span className="k">Renters</span>
            <h3 style={{ fontSize: 20 }}>Book in minutes</h3>
            <p className="mut">Verify once with Aadhaar and your driving licence, request a vehicle, pay only when the operator accepts. Deposit is held safely and refunded after return.</p>
          </div>
          <div className="card" style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 10 }}>
            <span className="k">Buyers &amp; sellers</span>
            <h3 style={{ fontSize: 20 }}>Deal without the hassle</h3>
            <p className="mut">RC-checked listings, chat with numbers hidden, test rides, offers and counters, and a step-by-step RC transfer checklist.</p>
          </div>
          <div className="card" style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 10 }}>
            <span className="k">Licensed operators</span>
            <h3 style={{ fontSize: 20 }}>Fill bookings, see every vehicle</h3>
            <p className="mut">List once to rent, sell or both. Accept requests, watch trips live with geofence alerts, and get weekly payouts with GST invoices.</p>
          </div>
        </section>

        <section className="card" style={{ padding: 28, display: 'flex', flexWrap: 'wrap', gap: 24, alignItems: 'center', background: 'var(--green-tint)', borderColor: '#C3E2D7' }}>
          <div style={{ flex: '1 1 420px' }}>
            <h2 style={{ fontSize: 26 }}>Run a licensed rental business or a small fleet?</h2>
            <p className="mut" style={{ marginTop: 8 }}>
              List scooters, bikes, EVs and cars. Track them live with a GaadiWatch GPS device, your existing tracker, or the renter&apos;s phone.
            </p>
          </div>
          <Link className="btn bp" href="/list-vehicle">List your vehicle</Link>
        </section>
      </main>
    </>
  );
}
