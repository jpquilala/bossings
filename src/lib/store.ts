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
  mapQuery:
    "San Pablo City Water District, San Pablo City, Laguna, Philippines",
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
