// Small side-view vehicle glyphs (24×24, single colour) used on map markers.

const PATHS: Record<string, string> = {
  // scooter: two small wheels, low deck, front shield and handlebar
  scooter:
    '<circle cx="5.5" cy="17" r="2.6"/><circle cx="18.5" cy="17" r="2.6"/><path d="M3.5 14.5c.8-2.2 2.6-3 5-3h4.5l1.6-4.5h2.2l1.4 6.2c1.3.4 2.3 1.4 2.3 2.8H8.8c-.2-1.4-1.4-2.4-3.3-2.4z"/><path d="M15.6 7l-.6-2.6h2.6" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/>',
  // motorbike: big wheels, tank and seat
  bike: '<circle cx="5" cy="16.5" r="3.2"/><circle cx="19" cy="16.5" r="3.2"/><path d="M5 16.5l4.5-5h6l3.5 5" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"/><path d="M8.5 10.2c1.4-1.6 3.6-2.2 6-1.6l1 2.4H8z"/><path d="M15.5 11l1.6-4.4h2.4" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/>',
  // car: body with cabin
  car: '<path d="M2.5 15.5v-2.3c0-1 .7-1.8 1.7-2l2.3-.5 2.2-3c.4-.5 1-.8 1.6-.8h4.6c.6 0 1.2.3 1.6.7l2.6 3 2.1.6c.8.2 1.3 1 1.3 1.8v2.5z"/><circle cx="7" cy="16.5" r="2.4"/><circle cx="17" cy="16.5" r="2.4"/>',
  // three-wheeler (auto rickshaw)
  three_wheeler:
    '<path d="M3 15.5V9.5C3 7 5 5.5 8 5.5h7.5l4.5 5v5z"/><circle cx="6.5" cy="17" r="2.3"/><circle cx="17.5" cy="17" r="2.3"/>',
  // truck: cargo box + cab
  truck:
    '<path d="M2 6.5h11v9H2z"/><path d="M13.5 9h4.3l3.7 4v2.5h-8z"/><circle cx="6" cy="17" r="2.2"/><circle cx="17.5" cy="17" r="2.2"/>',
};
PATHS.ev_two_wheeler = PATHS.scooter;
PATHS.ev_car = PATHS.car;
PATHS.lorry = PATHS.truck;

/** SVG markup for a vehicle type; electric types get a small lightning mark. */
export function vehicleIconSvg(type: string | undefined, size = 18): string {
  const body = PATHS[type ?? ""] ?? PATHS.car;
  const bolt = type?.startsWith("ev_")
    ? '<path d="M12.6 1.5L9.8 6h2.1l-.9 3.6 3.2-4.9h-2.1z" fill="#F5B800"/>'
    : "";
  return `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">${body}${bolt}</svg>`;
}
