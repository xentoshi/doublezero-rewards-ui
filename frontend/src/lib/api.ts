import {
  NetworkState,
  CompareResponse,
  LinkEstimateResponse,
  SimulationParams,
} from '@/types/network';

export const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

// Map known backend errors to user-friendly messages
const ERROR_MAP: Record<string, string> = {
  'Devices are not labeled correctly': 'Some device names are invalid. Each device must contain at least one digit and must not end with "00".',
  'Demand types are not represented correctly': 'Demand configuration is invalid. Each source city must use a unique Type ID.',
  'Not all devices are in the device table': 'Some links reference devices that do not exist. Check that all link endpoints have matching devices.',
  'Too many operators': 'The network has too many operators. Maximum is 20 operators (or 15 when uptime < 1).',
  'Duplicate links found': 'The network contains duplicate links between the same devices.',
  'Shared groups are not allowed': 'Shared link groups are not supported for per-link value estimation.',
};

function friendlyError(rawMessage: string): string {
  for (const [pattern, friendly] of Object.entries(ERROR_MAP)) {
    if (rawMessage.includes(pattern)) return friendly;
  }
  return rawMessage;
}

// Remove client-side IDs before sending to API
function stripIds<T extends { id?: string }>(items: T[]): Omit<T, 'id'>[] {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  return items.map(({ id, ...rest }) => rest);
}

function prepareNetworkForApi(network: NetworkState) {
  return {
    private_links: stripIds(network.private_links),
    devices: stripIds(network.devices),
    demand: stripIds(network.demand),
    public_links: stripIds(network.public_links),
  };
}

export async function checkHealth(): Promise<boolean> {
  try {
    const response = await fetch(`${API_URL}/health`);
    return response.ok;
  } catch {
    return false;
  }
}

export async function runComparison(
  baseline: NetworkState,
  modified: NetworkState,
  params: SimulationParams,
  signal?: AbortSignal
): Promise<CompareResponse> {
  const response = await fetch(`${API_URL}/api/compare`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      baseline: prepareNetworkForApi(baseline),
      modified: prepareNetworkForApi(modified),
      operator_uptime: params.operator_uptime,
      contiguity_bonus: params.contiguity_bonus,
      demand_multiplier: params.demand_multiplier,
    }),
    signal,
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(friendlyError(error.detail || 'Comparison failed'));
  }

  return response.json();
}

export async function runLinkEstimate(
  network: NetworkState,
  operatorFocus: string,
  params: SimulationParams,
  signal?: AbortSignal
): Promise<LinkEstimateResponse> {
  const response = await fetch(`${API_URL}/api/link-estimate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      network: prepareNetworkForApi(network),
      operator_focus: operatorFocus,
      contiguity_bonus: params.contiguity_bonus,
      demand_multiplier: params.demand_multiplier,
    }),
    signal,
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(friendlyError(error.detail || 'Link estimate failed'));
  }

  return response.json();
}

