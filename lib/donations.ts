/** Shared (client + server) donation constants and types. */

export interface UsdtNetwork {
  /** OxaPay network name sent to the API */
  id: string;
  /** Short label shown to users */
  label: string;
  /** Token standard / chain hint */
  tag: string;
  /** Official chain logo in /public/networks */
  logo: string;
}

/** USDT networks supported by OxaPay (see GET /v1/common/currencies). */
export const USDT_NETWORKS: UsdtNetwork[] = [
  { id: 'Tron', label: 'Tron', tag: 'TRC20', logo: '/networks/tron.svg' },
  { id: 'BSC', label: 'BNB Smart Chain', tag: 'BEP20', logo: '/networks/bsc.svg' },
  { id: 'The Open Network', label: 'TON', tag: 'TON', logo: '/networks/ton.svg' },
  { id: 'Solana', label: 'Solana', tag: 'SPL', logo: '/networks/solana.svg' },
  { id: 'Polygon', label: 'Polygon', tag: 'POL', logo: '/networks/polygon.svg' },
  { id: 'Ethereum', label: 'Ethereum', tag: 'ERC20', logo: '/networks/ethereum.svg' },
];

export const MIN_DONATION = 0.5;
export const MAX_DONATION = 100_000;
export const DONATION_PRESETS = [1, 2, 5, 10, 25, 50, 100];

export type DonationStatus = 'waiting' | 'paying' | 'paid' | 'expired' | 'failed';

/** Payment details shown while the user pays. */
export interface DonationPayment {
  trackId: string;
  amount: number;
  payAmount: number;
  payCurrency: string;
  network: string;
  address: string;
  memo: string;
  qrCode: string;
  expiredAt: number; // unix seconds
  status: DonationStatus;
}

export interface WallEntry {
  id: number;
  anonymous: boolean;
  name: string | null;
  username: string | null;
  photoUrl: string | null;
  userId: string | null;
  amount: number;
  network: string;
  paidAt: string;
}

/** Map OxaPay statuses onto ours. */
export function normalizeStatus(raw: unknown): DonationStatus {
  const s = String(raw || '').toLowerCase();
  if (s === 'paid' || s === 'manual_accept') return 'paid';
  if (s === 'paying' || s === 'confirming') return 'paying';
  if (s === 'expired') return 'expired';
  if (s === 'failed' || s === 'refunded' || s === 'refunding') return 'failed';
  return 'waiting';
}
