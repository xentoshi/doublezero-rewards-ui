import { EpochFeeData } from '@/types/network';

const LAMPORTS_PER_SOL = 1_000_000_000;
const EPOCHS_PER_MONTH = 15;

const FEE_CSV_URL =
  'https://raw.githubusercontent.com/doublezerofoundation/fees/main/fees_and_payments.csv';

const COINGECKO_URL =
  'https://api.coingecko.com/api/v3/simple/price?ids=solana&vs_currencies=usd';

/**
 * Fetch the DoubleZero fee CSV from GitHub, find the latest epoch column,
 * and sum all validator fees for that epoch.
 */
export async function fetchEpochFees(): Promise<EpochFeeData> {
  const res = await fetch(FEE_CSV_URL);
  if (!res.ok) throw new Error(`Fee CSV fetch failed: ${res.status}`);
  const text = await res.text();

  const lines = text.split('\n').filter((l) => l.trim().length > 0);
  if (lines.length < 2) throw new Error('Fee CSV has no data rows');

  const header = lines[0];

  // Find all dz_fee_lamports_{epoch} columns
  const colRegex = /dz_fee_lamports_(\d+)/g;
  let match: RegExpExecArray | null;
  const epochCols: { epoch: number; index: number }[] = [];
  const headerParts = header.split(',');

  for (let i = 0; i < headerParts.length; i++) {
    colRegex.lastIndex = 0;
    match = colRegex.exec(headerParts[i].trim());
    if (match) {
      epochCols.push({ epoch: parseInt(match[1], 10), index: i });
    }
  }

  if (epochCols.length === 0) throw new Error('No fee epoch columns found in CSV');

  // Sort descending by epoch to try latest first
  epochCols.sort((a, b) => b.epoch - a.epoch);

  // Try each epoch column starting from the latest, skip if all zeros
  for (const col of epochCols) {
    let totalLamports = 0;
    let validatorCount = 0;

    for (let r = 1; r < lines.length; r++) {
      const parts = lines[r].split(',');
      const val = parseInt(parts[col.index]?.trim() || '0', 10);
      if (!isNaN(val) && val > 0) {
        totalLamports += val;
        validatorCount++;
      }
    }

    if (totalLamports > 0) {
      return {
        epoch: col.epoch,
        totalFeeSol: totalLamports / LAMPORTS_PER_SOL,
        validatorCount,
      };
    }
  }

  throw new Error('All epoch fee columns are zero');
}

/**
 * Fetch current SOL/USD price from CoinGecko. Returns null on failure.
 */
export async function fetchSolPrice(): Promise<number | null> {
  try {
    const res = await fetch(COINGECKO_URL);
    if (!res.ok) return null;
    const data = await res.json();
    return data?.solana?.usd ?? null;
  } catch {
    return null;
  }
}

/**
 * Compute estimated earnings from a Shapley share percentage and fee pool.
 */
export function computeEarnings(
  shapleyPercent: number,
  feePoolSol: number,
  solPrice: number | null
) {
  const fraction = shapleyPercent / 100;
  const solPerEpoch = fraction * feePoolSol;
  const solPerMonth = solPerEpoch * EPOCHS_PER_MONTH;
  const usdPerEpoch = solPrice != null ? solPerEpoch * solPrice : null;
  const usdPerMonth = solPrice != null ? solPerMonth * solPrice : null;

  return { solPerEpoch, solPerMonth, usdPerEpoch, usdPerMonth };
}

export { EPOCHS_PER_MONTH };
