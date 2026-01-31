/**
 * Live Data Fetcher
 *
 * Fetches network topology data via the backend API which proxies
 * requests to the DoubleZero S3 bucket.
 */

import { NetworkState, PrivateLink, Device, PublicLink, DemandEntry } from '@/types/network';
import { generateId } from './utils';
import { API_URL } from './api';

export interface LiveDataResult {
  network: NetworkState;
  epoch: number;
  timestamp: string;
  linkCount: number;
  operatorCount: number;
}

/**
 * Add IDs to network data returned from the backend
 */
function addIdsToNetwork(network: {
  private_links: Omit<PrivateLink, 'id'>[];
  devices: Omit<Device, 'id'>[];
  public_links: Omit<PublicLink, 'id'>[];
  demand: Omit<DemandEntry, 'id'>[];
}): NetworkState {
  return {
    private_links: network.private_links.map(link => ({
      ...link,
      id: generateId(),
    })),
    devices: network.devices.map(device => ({
      ...device,
      id: generateId(),
    })),
    public_links: network.public_links.map(link => ({
      ...link,
      id: generateId(),
    })),
    demand: network.demand.map(entry => ({
      ...entry,
      id: generateId(),
    })),
  };
}

/**
 * Fetch and parse live network data via backend API
 */
export async function fetchLiveNetworkData(): Promise<LiveDataResult> {
  const response = await fetch(`${API_URL}/api/live-network`);

  if (!response.ok) {
    const error = await response.json().catch(() => ({ detail: response.statusText }));
    throw new Error(error.detail || 'Failed to fetch live network data');
  }

  const data = await response.json();

  // Add IDs to the network data
  const network = addIdsToNetwork(data.network);

  return {
    network,
    epoch: data.epoch,
    timestamp: new Date().toISOString(),
    linkCount: data.link_count,
    operatorCount: data.operator_count,
  };
}
