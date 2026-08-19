import { publicEnv } from "./env";

/** Single source of truth for store details shown across the site. */
export const STORE = {
  name: "Bossing's Flying Saucer",
  tagline: "Sarap na Lumilipad!",
  address:
    "Near Pines Memorial, in front of San Pablo City Water District Complex, San Pablo City, Laguna",
  city: "San Pablo City, Laguna",
  phoneDigits: publicEnv.storePhone,
  get phoneDisplay() {
    // 09915481541 -> 0991 548 1541
    const d = this.phoneDigits;
    return d.length === 11 ? `${d.slice(0, 4)} ${d.slice(4, 7)} ${d.slice(7)}` : d;
  },
  messengerUrl: publicEnv.messengerUrl,
  facebookUrl: "https://www.facebook.com/profile.php?id=61566948203272",
  /**
   * GCash account number. Currently the same line as the store phone, but
   * kept as its own field: the payment account and the contact number are
   * separate facts, and changing one must not silently change the other.
   */
  gcashDigits: publicEnv.storePhone,
  get gcashDisplay() {
    const d = this.gcashDigits;
    return d.length === 11 ? `${d.slice(0, 4)} ${d.slice(4, 7)} ${d.slice(7)}` : d;
  },
  /**
   * Exact stall coordinates, from the owner's own Google Maps pin
   * (https://maps.app.goo.gl/eosgiZx1BqnhFTay5). Reverse-geocodes to
   * F. Amante Drive, San Jose, San Pablo, Laguna.
   *
   * Coordinates rather than a text search: the previous query resolved to the
   * Water District complex, which is a neighbouring landmark rather than the
   * stall itself, so the pin landed in the wrong spot.
   */
  coordinates: { lat: 14.057721, lng: 121.341096 },
  get mapQuery() {
    return `${this.coordinates.lat},${this.coordinates.lng}`;
  },
} as const;

/** Default store hours — editable from /location and persisted server-side. */
export const DEFAULT_HOURS: { day: string; open: string; close: string; closed: boolean }[] = [
  { day: "Monday", open: "15:00", close: "22:00", closed: false },
  { day: "Tuesday", open: "15:00", close: "22:00", closed: false },
  { day: "Wednesday", open: "15:00", close: "22:00", closed: false },
  { day: "Thursday", open: "15:00", close: "22:00", closed: false },
  { day: "Friday", open: "15:00", close: "23:00", closed: false },
  { day: "Saturday", open: "14:00", close: "23:00", closed: false },
  { day: "Sunday", open: "14:00", close: "22:00", closed: false },
];
