// City coordinates [longitude, latitude] for react-simple-maps
export const CITY_COORDS: Record<string, [number, number]> = {
  // North America
  NYC: [-74.006, 40.7128],
  LAX: [-118.2437, 34.0522],
  SFO: [-122.4194, 37.7749],
  SJC: [-121.8863, 37.3382], // San Jose
  CHI: [-87.6298, 41.8781],
  ORD: [-87.6298, 41.8781], // Chicago O'Hare (same as CHI)
  DAL: [-96.797, 32.7767],
  DFW: [-96.797, 32.7767], // Dallas (same as DAL)
  MIA: [-80.1918, 25.7617],
  SEA: [-122.3321, 47.6062],
  ATL: [-84.388, 33.749],
  DEN: [-104.9903, 39.7392],
  BOS: [-71.0589, 42.3601],
  WDC: [-77.0369, 38.9072], // Washington DC
  PIT: [-79.9959, 40.4406], // Pittsburgh
  SLC: [-111.891, 40.7608], // Salt Lake City
  MTL: [-73.5673, 45.5017], // Montreal
  TOR: [-79.3832, 43.6532], // Toronto

  // Europe
  LON: [-0.1276, 51.5074],
  FRA: [8.6821, 50.1109],
  AMS: [4.9041, 52.3676],
  PAR: [2.3522, 48.8566],
  MIL: [9.19, 45.4642],
  MAD: [-3.7038, 40.4168],
  BAR: [2.1734, 41.3851],
  ZUR: [8.5417, 47.3769],
  VIE: [16.3738, 48.2082],
  DUB: [-6.2603, 53.3498], // Dublin
  WAW: [21.0122, 52.2297], // Warsaw
  OSL: [10.7522, 59.9139], // Oslo
  STR: [7.7521, 48.5734], // Strasbourg
  MRS: [5.3698, 43.2965], // Marseille
  MUC: [11.5820, 48.1351], // Munich
  PRG: [14.4378, 50.0755], // Prague
  STO: [18.0686, 59.3293], // Stockholm

  // Asia Pacific
  TYO: [139.6917, 35.6895],
  SIN: [103.8198, 1.3521],
  HKG: [114.1694, 22.3193],
  SYD: [151.2093, -33.8688],
  SEO: [126.978, 37.5665],
  BOM: [72.8777, 19.076],
  BLR: [77.5946, 12.9716],
  SHA: [121.4737, 31.2304],
  BEI: [116.4074, 39.9042],
  MEL: [144.9631, -37.8136],

  // Middle East & Africa
  DXB: [55.2708, 25.2048],
  JNB: [28.0473, -26.2041],

  // South America
  SAO: [-46.6333, -23.5505],
  BOG: [-74.0721, 4.711],
  SCL: [-70.6693, -33.4489],
};

export const CITY_NAMES: Record<string, string> = {
  // North America
  NYC: 'New York',
  LAX: 'Los Angeles',
  SFO: 'San Francisco',
  SJC: 'San Jose',
  CHI: 'Chicago',
  ORD: 'Chicago',
  DAL: 'Dallas',
  DFW: 'Dallas',
  MIA: 'Miami',
  SEA: 'Seattle',
  ATL: 'Atlanta',
  DEN: 'Denver',
  BOS: 'Boston',
  WDC: 'Washington DC',
  PIT: 'Pittsburgh',
  SLC: 'Salt Lake City',
  MTL: 'Montreal',
  TOR: 'Toronto',

  // Europe
  LON: 'London',
  FRA: 'Frankfurt',
  AMS: 'Amsterdam',
  PAR: 'Paris',
  MIL: 'Milan',
  MAD: 'Madrid',
  BAR: 'Barcelona',
  ZUR: 'Zurich',
  VIE: 'Vienna',
  DUB: 'Dublin',
  WAW: 'Warsaw',
  OSL: 'Oslo',
  STR: 'Strasbourg',
  MRS: 'Marseille',
  MUC: 'Munich',
  PRG: 'Prague',
  STO: 'Stockholm',

  // Asia Pacific
  TYO: 'Tokyo',
  SIN: 'Singapore',
  HKG: 'Hong Kong',
  SYD: 'Sydney',
  SEO: 'Seoul',
  BOM: 'Mumbai',
  BLR: 'Bangalore',
  SHA: 'Shanghai',
  BEI: 'Beijing',
  MEL: 'Melbourne',

  // Middle East & Africa
  DXB: 'Dubai',
  JNB: 'Johannesburg',

  // South America
  SAO: 'Sao Paulo',
  BOG: 'Bogota',
  SCL: 'Santiago',
};

/**
 * Extract city code from device name (first 3 chars, uppercase)
 */
export function getCityFromDevice(device: string): string {
  return device.slice(0, 3).toUpperCase();
}
