import { create } from 'zustand';
import {
  NetworkState,
  PrivateLink,
  Device,
  DemandEntry,
  PublicLink,
  AppMode,
  SimulationParams,
  SimulationResponse,
  CompareResponse,
  LinkEstimateResponse,
} from '@/types/network';
import { generateId, resetOperatorColors } from '@/lib/utils';
import { fetchLiveNetworkData } from '@/lib/liveData';
import { CITY_COORDS } from '@/lib/cities';

// Helper to estimate public internet latency between two cities
function estimatePublicLatency(city1: string, city2: string): number {
  const coords1 = CITY_COORDS[city1];
  const coords2 = CITY_COORDS[city2];
  if (!coords1 || !coords2) return 100;

  // Haversine formula for distance
  const [lng1, lat1] = coords1;
  const [lng2, lat2] = coords2;
  const R = 6371; // Earth radius in km
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) ** 2 +
            Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
            Math.sin(dLng / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const distance = R * c;

  // ~0.01ms per km + 20% overhead + 5ms floor
  return Math.round((distance * 0.01 * 1.2 + 5) * 100) / 100;
}

interface NetworkStore {
  // Data state
  baselineNetwork: NetworkState | null;
  modifiedNetwork: NetworkState | null;
  hasData: boolean;

  // Live data info
  liveDataInfo: {
    epoch: number;
    timestamp: string;
    linkCount: number;
    operatorCount: number;
  } | null;
  isLoadingLiveData: boolean;

  // Mode
  mode: AppMode;
  setMode: (mode: AppMode) => void;

  // Parameters
  params: SimulationParams;
  setParams: (params: Partial<SimulationParams>) => void;

  // Calculation state
  isCalculating: boolean;
  error: string | null;
  simulationResult: SimulationResponse | null;
  compareResult: CompareResponse | null;
  linkEstimateResult: LinkEstimateResponse | null;
  selectedOperator: string | null;

  // Actions
  loadEmptyNetwork: () => void;
  loadLiveData: () => Promise<void>;
  loadNetworkData: (network: NetworkState) => void;
  clearData: () => void;
  syncModifiedToBaseline: () => void;

  // Helper actions
  addLinkBetweenCities: (city1: string, city2: string, operator: string, latency: number, bandwidth: number) => void;

  // Calculation actions
  setCalculating: (isCalculating: boolean) => void;
  setError: (error: string | null) => void;
  setSimulationResult: (result: SimulationResponse | null) => void;
  setCompareResult: (result: CompareResponse | null) => void;
  setLinkEstimateResult: (result: LinkEstimateResponse | null) => void;
  setSelectedOperator: (operator: string | null) => void;

  // Modified network CRUD - Private Links
  addPrivateLink: (link: Omit<PrivateLink, 'id'>) => void;
  updatePrivateLink: (id: string, link: Partial<PrivateLink>) => void;
  deletePrivateLink: (id: string) => void;

  // Modified network CRUD - Devices
  addDevice: (device: Omit<Device, 'id'>) => void;
  updateDevice: (id: string, device: Partial<Device>) => void;
  deleteDevice: (id: string) => void;

  // Modified network CRUD - Demand
  addDemand: (demand: Omit<DemandEntry, 'id'>) => void;
  updateDemand: (id: string, demand: Partial<DemandEntry>) => void;
  deleteDemand: (id: string) => void;

  // Modified network CRUD - Public Links
  addPublicLink: (link: Omit<PublicLink, 'id'>) => void;
  updatePublicLink: (id: string, link: Partial<PublicLink>) => void;
  deletePublicLink: (id: string) => void;
}

function deepCloneNetwork(network: NetworkState): NetworkState {
  return JSON.parse(JSON.stringify(network));
}

// Pre-flight validation before API calls
export function validateNetwork(network: NetworkState): string | null {
  if (network.private_links.length === 0) {
    return 'No links in the network yet. Use "Add Link & See Impact" above to add a link between two cities, then the comparison will run automatically.';
  }
  if (network.devices.length === 0) {
    return 'The network has no devices. Add links to automatically create devices.';
  }
  // Check all link device references exist in the devices table
  const deviceNames = new Set(network.devices.map(d => d.Device));
  for (const link of network.private_links) {
    if (!deviceNames.has(link.Device1)) {
      return `Link references unknown device "${link.Device1}". Check the links table.`;
    }
    if (!deviceNames.has(link.Device2)) {
      return `Link references unknown device "${link.Device2}". Check the links table.`;
    }
  }
  // Check devices have digits (required by Shapley calculation)
  for (const device of network.devices) {
    if (!/\d/.test(device.Device)) {
      return `Device "${device.Device}" must contain at least one digit.`;
    }
  }
  if (network.demand.length === 0) {
    return 'The network has no demand entries. Add traffic demand before running a simulation.';
  }
  return null;
}

export const useNetworkStore = create<NetworkStore>((set, get) => ({
  // Initial state
  baselineNetwork: null,
  modifiedNetwork: null,
  hasData: false,
  liveDataInfo: null,
  isLoadingLiveData: false,
  mode: 'forecast',
  params: {
    operator_uptime: 0.98,
    contiguity_bonus: 5.0,
    demand_multiplier: 1.0,
  },
  isCalculating: false,
  error: null,
  simulationResult: null,
  compareResult: null,
  linkEstimateResult: null,
  selectedOperator: null,

  setMode: (mode) => set({ mode, compareResult: null, linkEstimateResult: null }),
  setParams: (params) => set((state) => ({ params: { ...state.params, ...params } })),

  loadLiveData: async () => {
    set({ isLoadingLiveData: true, error: null });
    try {
      const result = await fetchLiveNetworkData();
      set({
        baselineNetwork: result.network,
        modifiedNetwork: deepCloneNetwork(result.network),
        hasData: true,
        liveDataInfo: {
          epoch: result.epoch,
          timestamp: result.timestamp,
          linkCount: result.linkCount,
          operatorCount: result.operatorCount,
        },
        isLoadingLiveData: false,
        error: null,
        simulationResult: null,
        compareResult: null,
        linkEstimateResult: null,
      });
    } catch (err) {
      set({
        isLoadingLiveData: false,
        error: err instanceof Error ? err.message : 'Failed to load live data',
      });
      throw err;
    }
  },

  loadEmptyNetwork: () => {
    const emptyNetwork: NetworkState = {
      private_links: [],
      devices: [],
      demand: [],
      public_links: [],
    };
    set({
      baselineNetwork: emptyNetwork,
      modifiedNetwork: deepCloneNetwork(emptyNetwork),
      hasData: true,
      error: null,
      simulationResult: null,
      compareResult: null,
      linkEstimateResult: null,
    });
  },

  loadNetworkData: (network) => {
    set({
      baselineNetwork: network,
      modifiedNetwork: deepCloneNetwork(network),
      hasData: true,
      error: null,
      simulationResult: null,
      compareResult: null,
      linkEstimateResult: null,
    });
  },

  clearData: () => {
    resetOperatorColors();
    set({
      baselineNetwork: null,
      modifiedNetwork: null,
      hasData: false,
      simulationResult: null,
      compareResult: null,
      linkEstimateResult: null,
      error: null,
    });
  },

  syncModifiedToBaseline: () => {
    const { modifiedNetwork } = get();
    if (modifiedNetwork) {
      set({
        baselineNetwork: deepCloneNetwork(modifiedNetwork),
        compareResult: null,
        simulationResult: null,
      });
    }
  },

  setCalculating: (isCalculating) => set({ isCalculating }),
  setError: (error) => set({ error }),
  setSimulationResult: (result) => set({ simulationResult: result }),
  setCompareResult: (result) => set({ compareResult: result }),
  setLinkEstimateResult: (result) => set({ linkEstimateResult: result }),
  setSelectedOperator: (operator) => set({ selectedOperator: operator }),

  // Private Links CRUD
  addPrivateLink: (link) => {
    set((state) => {
      if (!state.modifiedNetwork) return state;
      return {
        modifiedNetwork: {
          ...state.modifiedNetwork,
          private_links: [...state.modifiedNetwork.private_links, { ...link, id: generateId() }],
        },
      };
    });
  },
  updatePrivateLink: (id, link) => {
    set((state) => {
      if (!state.modifiedNetwork) return state;
      return {
        modifiedNetwork: {
          ...state.modifiedNetwork,
          private_links: state.modifiedNetwork.private_links.map((l) =>
            l.id === id ? { ...l, ...link } : l
          ),
        },
      };
    });
  },
  deletePrivateLink: (id) => {
    set((state) => {
      if (!state.modifiedNetwork) return state;
      return {
        modifiedNetwork: {
          ...state.modifiedNetwork,
          private_links: state.modifiedNetwork.private_links.filter((l) => l.id !== id),
        },
      };
    });
  },

  // Devices CRUD
  addDevice: (device) => {
    set((state) => {
      if (!state.modifiedNetwork) return state;
      // Auto-derive City from Device name (first 3 chars) if not provided
      const city = device.City || device.Device.slice(0, 3).toUpperCase();
      return {
        modifiedNetwork: {
          ...state.modifiedNetwork,
          devices: [...state.modifiedNetwork.devices, { ...device, id: generateId(), City: city }],
        },
      };
    });
  },
  updateDevice: (id, device) => {
    set((state) => {
      if (!state.modifiedNetwork) return state;
      return {
        modifiedNetwork: {
          ...state.modifiedNetwork,
          devices: state.modifiedNetwork.devices.map((d) =>
            d.id === id ? { ...d, ...device } : d
          ),
        },
      };
    });
  },
  deleteDevice: (id) => {
    set((state) => {
      if (!state.modifiedNetwork) return state;
      const device = state.modifiedNetwork.devices.find((d) => d.id === id);
      if (!device) return state;
      const deviceName = device.Device;
      return {
        modifiedNetwork: {
          ...state.modifiedNetwork,
          devices: state.modifiedNetwork.devices.filter((d) => d.id !== id),
          // Cascade-delete: remove private links referencing this device
          private_links: state.modifiedNetwork.private_links.filter(
            (l) => l.Device1 !== deviceName && l.Device2 !== deviceName
          ),
        },
      };
    });
  },

  // Demand CRUD
  addDemand: (demand) => {
    set((state) => {
      if (!state.modifiedNetwork) return state;
      return {
        modifiedNetwork: {
          ...state.modifiedNetwork,
          demand: [...state.modifiedNetwork.demand, { ...demand, id: generateId() }],
        },
      };
    });
  },
  updateDemand: (id, demand) => {
    set((state) => {
      if (!state.modifiedNetwork) return state;
      return {
        modifiedNetwork: {
          ...state.modifiedNetwork,
          demand: state.modifiedNetwork.demand.map((d) =>
            d.id === id ? { ...d, ...demand } : d
          ),
        },
      };
    });
  },
  deleteDemand: (id) => {
    set((state) => {
      if (!state.modifiedNetwork) return state;
      return {
        modifiedNetwork: {
          ...state.modifiedNetwork,
          demand: state.modifiedNetwork.demand.filter((d) => d.id !== id),
        },
      };
    });
  },

  // Public Links CRUD
  addPublicLink: (link) => {
    set((state) => {
      if (!state.modifiedNetwork) return state;
      return {
        modifiedNetwork: {
          ...state.modifiedNetwork,
          public_links: [...state.modifiedNetwork.public_links, { ...link, id: generateId() }],
        },
      };
    });
  },
  updatePublicLink: (id, link) => {
    set((state) => {
      if (!state.modifiedNetwork) return state;
      return {
        modifiedNetwork: {
          ...state.modifiedNetwork,
          public_links: state.modifiedNetwork.public_links.map((l) =>
            l.id === id ? { ...l, ...link } : l
          ),
        },
      };
    });
  },
  deletePublicLink: (id) => {
    set((state) => {
      if (!state.modifiedNetwork) return state;
      return {
        modifiedNetwork: {
          ...state.modifiedNetwork,
          public_links: state.modifiedNetwork.public_links.filter((l) => l.id !== id),
        },
      };
    });
  },

  addLinkBetweenCities: (city1, city2, operator, latency, bandwidth) => {
    set((state) => {
      if (!state.modifiedNetwork) return state;

      // Find or create devices for each city
      const existingDevices = state.modifiedNetwork.devices;

      // Get next device number for each city
      const getNextDeviceNum = (city: string) => {
        const cityDevices = existingDevices.filter(d => d.Device.startsWith(city));
        if (cityDevices.length === 0) return 1;
        const nums = cityDevices.map(d => parseInt(d.Device.slice(3)) || 0);
        return Math.max(...nums) + 1;
      };

      // Find existing device for operator in city, or create new one
      const findOrCreateDevice = (city: string, op: string) => {
        const existing = existingDevices.find(d => d.Device.startsWith(city) && d.Operator === op);
        if (existing) return { device: existing, isNew: false };
        const num = getNextDeviceNum(city);
        return {
          device: { id: generateId(), Device: `${city}${num}`, Edge: 10, Operator: op, City: city },
          isNew: true,
        };
      };

      const result1 = findOrCreateDevice(city1, operator);
      const result2 = findOrCreateDevice(city2, operator);

      // Check for duplicate: same operator already has a link between these two cities
      const isDuplicate = state.modifiedNetwork.private_links.some(l => {
        const dev1 = existingDevices.find(d => d.Device === l.Device1);
        const dev2 = existingDevices.find(d => d.Device === l.Device2);
        if (!dev1 || !dev2) return false;
        const sameOperator = dev1.Operator === operator;
        const sameCities = (dev1.City === city1 && dev2.City === city2) ||
                           (dev1.City === city2 && dev2.City === city1);
        return sameOperator && sameCities;
      });

      if (isDuplicate) return state;

      const newDevices = [...existingDevices];
      if (result1.isNew) newDevices.push(result1.device);
      if (result2.isNew) newDevices.push(result2.device);

      const newLink: PrivateLink = {
        id: generateId(),
        Device1: result1.device.Device,
        Device2: result2.device.Device,
        Latency: latency,
        Bandwidth: bandwidth,
        Uptime: 0.99,
        Shared: null,
      };

      // Get all cities in the network (including new ones)
      const allCities = new Set<string>();
      newDevices.forEach(d => {
        if (d.City) allCities.add(d.City);
      });

      // Generate public links between all cities that don't already exist
      const existingPublicLinks = new Set(
        state.modifiedNetwork.public_links.map(l => [l.City1, l.City2].sort().join('-'))
      );
      const newPublicLinks = [...state.modifiedNetwork.public_links];
      const citiesArray = Array.from(allCities);

      for (let i = 0; i < citiesArray.length; i++) {
        for (let j = i + 1; j < citiesArray.length; j++) {
          const key = [citiesArray[i], citiesArray[j]].sort().join('-');
          if (!existingPublicLinks.has(key)) {
            newPublicLinks.push({
              id: generateId(),
              City1: citiesArray[i],
              City2: citiesArray[j],
              Latency: estimatePublicLatency(citiesArray[i], citiesArray[j]),
            });
            existingPublicLinks.add(key);
          }
        }
      }

      // Generate demand entries if none exist for new cities
      // Each Start city must have its own unique Type value (required by Shapley validation)
      const existingStartCities = new Set(
        state.modifiedNetwork.demand.map(d => d.Start)
      );
      const newDemand = [...state.modifiedNetwork.demand];

      // Get next available Type ID
      const maxType = state.modifiedNetwork.demand.reduce((max, d) => Math.max(max, d.Type), 0);
      let nextTypeId = maxType + 1;

      // Add demand from each new city to all other cities, AND from existing hubs to new city
      const newCities: string[] = [];
      [city1, city2].forEach(newCity => {
        if (!existingStartCities.has(newCity) && citiesArray.length > 1) {
          newCities.push(newCity);
          const typeForCity = nextTypeId++;
          // Use seeded-style deterministic values based on city code
          const seed = newCity.split('').reduce((acc, ch) => acc + ch.charCodeAt(0), 0);
          const cityPriority = Math.round(((seed * 7) % 100) / 100 * 100) / 100;
          citiesArray.forEach(destCity => {
            if (destCity !== newCity) {
              const pairSeed = seed + destCity.split('').reduce((acc, ch) => acc + ch.charCodeAt(0), 0);
              newDemand.push({
                id: generateId(),
                Start: newCity,
                End: destCity,
                Receivers: (pairSeed % 50) + 5,
                Traffic: 0.1,
                Priority: cityPriority,
                Type: typeForCity,
                Multicast: false,
              });
            }
          });
          existingStartCities.add(newCity);
        }
      });

      // Also add inbound demand: from existing hub cities TO each new city
      if (newCities.length > 0) {
        newCities.forEach(newCity => {
          existingStartCities.forEach(hubCity => {
            if (hubCity === newCity) return;
            // Check if demand from this hub to the new city already exists
            const alreadyExists = newDemand.some(d => d.Start === hubCity && d.End === newCity);
            if (!alreadyExists) {
              // Find the Type used by this hub city
              const hubDemands = newDemand.filter(d => d.Start === hubCity);
              const hubType = hubDemands.length > 0 ? hubDemands[0].Type : nextTypeId++;
              const hubPriority = hubDemands.length > 0 ? hubDemands[0].Priority : 0.5;
              const seed = hubCity.split('').reduce((acc, ch) => acc + ch.charCodeAt(0), 0) +
                           newCity.split('').reduce((acc, ch) => acc + ch.charCodeAt(0), 0);
              newDemand.push({
                id: generateId(),
                Start: hubCity,
                End: newCity,
                Receivers: (seed % 50) + 5,
                Traffic: 0.1,
                Priority: hubPriority,
                Type: hubType,
                Multicast: false,
              });
            }
          });
        });
      }

      return {
        modifiedNetwork: {
          ...state.modifiedNetwork,
          devices: newDevices,
          private_links: [...state.modifiedNetwork.private_links, newLink],
          public_links: newPublicLinks,
          demand: newDemand,
        },
      };
    });
  },
}));
