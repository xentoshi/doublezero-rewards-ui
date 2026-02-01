export interface PrivateLink {
  id: string;
  Device1: string;
  Device2: string;
  Latency: number;
  Bandwidth: number;
  Uptime: number;
  Shared: string | null;
}

export interface Device {
  id: string;
  Device: string;
  Edge: number;
  Operator: string;
  City?: string; // Optional city code for mapping
}

export interface PublicLink {
  id: string;
  City1: string;
  City2: string;
  Latency: number;
}

export interface DemandEntry {
  id: string;
  Start: string;
  End: string;
  Receivers: number;
  Traffic: number;
  Priority: number;
  Type: number;
  Multicast: boolean;
}

export interface NetworkState {
  private_links: PrivateLink[];
  devices: Device[];
  demand: DemandEntry[];
  public_links: PublicLink[];
}

export interface OperatorResult {
  Operator: string;
  Value: number;
  Percent: number;
}

export interface SimulationResponse {
  results: OperatorResult[];
  total_value: number;
}

export interface DeltaResult {
  Operator: string;
  baseline_value: number;
  modified_value: number;
  value_delta: number;
  baseline_percent: number;
  modified_percent: number;
  percent_delta: number;
}

export interface CompareResponse {
  baseline_results: OperatorResult[];
  modified_results: OperatorResult[];
  deltas: DeltaResult[];
  baseline_total: number;
  modified_total: number;
}

export interface LinkResult {
  Device1: string;
  Device2: string;
  Bandwidth: number;
  Latency: number;
  Value: number;
  Percent: number;
}

export interface LinkEstimateResponse {
  results: LinkResult[];
  total_value: number;
  warning: string;
}

export interface EpochFeeData {
  epoch: number;
  totalFeeSol: number;
  validatorCount: number;
}

export type AppMode = 'forecast' | 'linkvalue';

export interface SimulationParams {
  operator_uptime: number;
  contiguity_bonus: number;
  demand_multiplier: number;
}
