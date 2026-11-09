import Link from 'next/link';
import { SearchCard } from '@/components/home/SearchCard';
import { rentListings, saleListings, vehicleTypes } from '@/lib/sample-listings';

export default function HomePage() {
  return (
    <>
      {/* Hero */}
      <section style={{ background: 'var(--hero)', color: '#fff' }}>
        <div className="wrap" style={{ display: 'flex', flexWrap: 'wrap', gap: 40, alignItems: 'center', paddingTop: 64, paddingBottom: 64 }}>
          <div style={{ flex: '1 1 560px', minWidth: 0, display: 'flex', flexDirection: 'column', gap: 22 }}>
            <span className="chip" style={{ background: '#1E4B40', color: '#CDEBE1', alignSelf: 'flex-start' }}>
              Now live in Hyderabad &amp; Bengaluru
            </span>
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
                  <strong>Ather 450X · KA 01 EV 2231</strong>
                  <div className="sm mut">34 km/h · inside geofence · updated 12 s ago</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <main className="wrap" style={{ display: 'flex', flexDirection: 'column', gap: 56 }}>
        {/* Vehicle types */}
        <section style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <h2 style={{ fontSize: 28 }}>Every vehicle type, one place</h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))', gap: 12 }}>
            {vehicleTypes.map((v) => (
              <Link key={v.name} className="card" href={v.href} style={{ padding: 16, textDecoration: 'none', color: 'var(--ink)' }}>
                <strong>{v.name}</strong>
                <div className="sm mut">{v.note}</div>
              </Link>
            ))}
          </div>
        </section>

        {/* Rentals */}
        <section style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'end', flexWrap: 'wrap', gap: 8 }}>
            <h2 style={{ fontSize: 28 }}>Rent near Koramangala</h2>
            <Link href="/rent">See all rentals</Link>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 20 }}>
            {rentListings.map((l) => (
              <Link key={l.id} href={`/listings/${l.id}`} className="card" style={{ overflow: 'hidden', textDecoration: 'none', color: 'var(--ink)', display: 'flex', flexDirection: 'column' }}>
                <div className="ph" style={{ height: 160, borderRadius: 0 }}>Photo · {l.title.split(' · ')[0]}</div>
                <div style={{ padding: 14, display: 'flex', flexDirection: 'column', gap: 8 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8 }}>
                    <strong>{l.title}</strong>
                    <span className="sm mut">{l.distance}</span>
                  </div>
                  <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                    {l.tags.map((t) => (
                      <span key={t.label} className={`chip ${t.tone ?? ''}`}>{t.label}</span>
                    ))}
                  </div>
                  <div>
                    <strong>{l.price}</strong>
                    <span className="sm mut">{l.priceNote}</span>
                  </div>
                  <div className="sm mut">{l.meta}</div>
                </div>
              </Link>
            ))}
          </div>
        </section>

        {/* For sale */}
        <section style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'end', flexWrap: 'wrap', gap: 8 }}>
            <h2 style={{ fontSize: 28 }}>For sale in Bengaluru</h2>
            <Link href="/buy">See all for sale</Link>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 20 }}>
            {saleListings.map((l) => (
              <Link key={l.id} href={`/listings/${l.id}`} className="card" style={{ overflow: 'hidden', textDecoration: 'none', color: 'var(--ink)' }}>
                <div className="ph" style={{ height: 150, borderRadius: 0 }}>Photo · {l.title.split(' · ')[0]}</div>
                <div style={{ padding: 14, display: 'flex', flexDirection: 'column', gap: 6 }}>
                  <strong>{l.title}</strong>
                  <div className="sm mut">{l.meta}</div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
                    <strong style={{ fontSize: 18 }}>{l.price}</strong>
                    <span className={`chip ${l.badge.tone ?? ''}`}>{l.badge.label}</span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </section>

        {/* Who it's for */}
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

        {/* Operator call to action */}
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
