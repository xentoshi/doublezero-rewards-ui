"""
DoubleZero Rewards API - FastAPI backend for Shapley value calculations
"""

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from typing import List, Optional
import asyncio
from concurrent.futures import ThreadPoolExecutor
from functools import partial
import pandas as pd
import numpy as np

from network_shapley import network_shapley
from network_linkestimate import network_linkestimate

# Thread pool for CPU-bound Shapley computations
_executor = ThreadPoolExecutor(max_workers=4)

app = FastAPI(
    title="DoubleZero Rewards API",
    description="API for calculating Shapley values for network operators",
    version="1.0.0"
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Pydantic models
class PrivateLink(BaseModel):
    Device1: str
    Device2: str
    Latency: float
    Bandwidth: float
    Uptime: float = 0.99
    Shared: Optional[str] = None

class Device(BaseModel):
    Device: str
    Edge: float
    Operator: str
    City: Optional[str] = None

class PublicLink(BaseModel):
    City1: str
    City2: str
    Latency: float

class DemandEntry(BaseModel):
    Start: str
    End: str
    Receivers: int
    Traffic: float
    Priority: float
    Type: int
    Multicast: bool = False

class NetworkState(BaseModel):
    private_links: List[PrivateLink]
    devices: List[Device]
    demand: List[DemandEntry]
    public_links: List[PublicLink]

class SimulationRequest(BaseModel):
    network: NetworkState
    operator_uptime: float = Field(default=0.98, ge=0, le=1)
    contiguity_bonus: float = Field(default=5.0, ge=0)
    demand_multiplier: float = Field(default=1.0, gt=0)

class CompareRequest(BaseModel):
    baseline: NetworkState
    modified: NetworkState
    operator_uptime: float = Field(default=0.98, ge=0, le=1)
    contiguity_bonus: float = Field(default=5.0, ge=0)
    demand_multiplier: float = Field(default=1.0, gt=0)

class LinkEstimateRequest(BaseModel):
    network: NetworkState
    operator_focus: str
    contiguity_bonus: float = Field(default=5.0, ge=0)
    demand_multiplier: float = Field(default=1.0, gt=0)

class OperatorResult(BaseModel):
    Operator: str
    Value: float
    Percent: float

class SimulationResponse(BaseModel):
    results: List[OperatorResult]
    total_value: float

class CompareResponse(BaseModel):
    baseline_results: List[OperatorResult]
    modified_results: List[OperatorResult]
    deltas: List[dict]
    baseline_total: float
    modified_total: float

class LinkResult(BaseModel):
    Device1: str
    Device2: str
    Bandwidth: float
    Latency: float
    Value: float
    Percent: float

class LinkEstimateResponse(BaseModel):
    results: List[LinkResult]
    total_value: float
    warning: str = "These are approximations. Link values may not sum to operator's total Shapley value."


def _safe_float(value) -> float:
    """Safely convert a value to float, returning NaN on failure."""
    try:
        return float(value)
    except (ValueError, TypeError):
        return pd.NA


def network_state_to_dataframes(network: NetworkState):
    """Convert NetworkState to pandas DataFrames"""

    # Private links
    private_links_data = []
    for link in network.private_links:
        private_links_data.append({
            'Device1': link.Device1,
            'Device2': link.Device2,
            'Latency': link.Latency,
            'Bandwidth': link.Bandwidth,
            'Uptime': link.Uptime,
            'Shared': pd.NA if link.Shared is None or link.Shared == 'NA' else _safe_float(link.Shared)
        })
    private_links_df = pd.DataFrame(private_links_data)

    # Devices
    devices_data = [{'Device': d.Device, 'Edge': d.Edge, 'Operator': d.Operator, 'City': d.City} for d in network.devices]
    devices_df = pd.DataFrame(devices_data)

    # Demand
    demand_data = []
    for d in network.demand:
        demand_data.append({
            'Start': d.Start,
            'End': d.End,
            'Receivers': d.Receivers,
            'Traffic': d.Traffic,
            'Priority': d.Priority,
            'Type': d.Type,
            'Multicast': d.Multicast
        })
    demand_df = pd.DataFrame(demand_data)

    # Public links
    public_links_data = [{'City1': p.City1, 'City2': p.City2, 'Latency': p.Latency} for p in network.public_links]
    public_links_df = pd.DataFrame(public_links_data)

    return private_links_df, devices_df, demand_df, public_links_df


@app.get("/health")
async def health_check():
    """Health check endpoint"""
    return {"status": "healthy", "service": "doublezero-rewards-api"}


@app.post("/api/simulate", response_model=SimulationResponse)
async def simulate(request: SimulationRequest):
    """Run Shapley calculation for a single network"""
    try:
        private_links_df, devices_df, demand_df, public_links_df = network_state_to_dataframes(request.network)

        # Check operator count
        operators = [x for x in pd.unique(devices_df["Operator"].dropna().astype(str)) if x != 'Private']
        n_ops = len(operators)
        if request.operator_uptime <= 0.99999999 and n_ops > 15:
            raise HTTPException(
                status_code=400,
                detail=f"Too many operators ({n_ops}). Maximum is 15 when operator_uptime < 1."
            )
        if n_ops > 20:
            raise HTTPException(
                status_code=400,
                detail=f"Too many operators ({n_ops}). Maximum is 20."
            )

        loop = asyncio.get_event_loop()
        result_df = await loop.run_in_executor(
            _executor,
            partial(
                network_shapley,
                private_links=private_links_df,
                devices=devices_df,
                demand=demand_df,
                public_links=public_links_df,
                operator_uptime=request.operator_uptime,
                contiguity_bonus=request.contiguity_bonus,
                demand_multiplier=request.demand_multiplier,
            ),
        )

        results = [
            OperatorResult(
                Operator=row['Operator'],
                Value=float(row['Value']),
                Percent=float(row['Percent'])
            )
            for _, row in result_df.iterrows()
        ]

        total_value = float(result_df['Value'].sum())

        return SimulationResponse(results=results, total_value=total_value)

    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Calculation error: {str(e)}")


@app.post("/api/compare", response_model=CompareResponse)
async def compare(request: CompareRequest):
    """Compare baseline vs modified network configurations"""
    try:
        # Calculate baseline and modified in parallel
        bl_private, bl_devices, bl_demand, bl_public = network_state_to_dataframes(request.baseline)
        mod_private, mod_devices, mod_demand, mod_public = network_state_to_dataframes(request.modified)

        loop = asyncio.get_event_loop()
        baseline_df, modified_df = await asyncio.gather(
            loop.run_in_executor(
                _executor,
                partial(
                    network_shapley,
                    private_links=bl_private,
                    devices=bl_devices,
                    demand=bl_demand,
                    public_links=bl_public,
                    operator_uptime=request.operator_uptime,
                    contiguity_bonus=request.contiguity_bonus,
                    demand_multiplier=request.demand_multiplier,
                ),
            ),
            loop.run_in_executor(
                _executor,
                partial(
                    network_shapley,
                    private_links=mod_private,
                    devices=mod_devices,
                    demand=mod_demand,
                    public_links=mod_public,
                    operator_uptime=request.operator_uptime,
                    contiguity_bonus=request.contiguity_bonus,
                    demand_multiplier=request.demand_multiplier,
                ),
            ),
        )

        baseline_results = [
            OperatorResult(
                Operator=row['Operator'],
                Value=float(row['Value']),
                Percent=float(row['Percent'])
            )
            for _, row in baseline_df.iterrows()
        ]

        modified_results = [
            OperatorResult(
                Operator=row['Operator'],
                Value=float(row['Value']),
                Percent=float(row['Percent'])
            )
            for _, row in modified_df.iterrows()
        ]

        # Calculate deltas
        baseline_dict = {row['Operator']: row for _, row in baseline_df.iterrows()}
        modified_dict = {row['Operator']: row for _, row in modified_df.iterrows()}

        all_operators = set(baseline_dict.keys()) | set(modified_dict.keys())
        deltas = []
        for op in sorted(all_operators):
            bl_val = float(baseline_dict.get(op, {}).get('Value', 0))
            bl_pct = float(baseline_dict.get(op, {}).get('Percent', 0))
            mod_val = float(modified_dict.get(op, {}).get('Value', 0))
            mod_pct = float(modified_dict.get(op, {}).get('Percent', 0))

            deltas.append({
                'Operator': op,
                'baseline_value': bl_val,
                'modified_value': mod_val,
                'value_delta': mod_val - bl_val,
                'baseline_percent': bl_pct,
                'modified_percent': mod_pct,
                'percent_delta': mod_pct - bl_pct
            })

        return CompareResponse(
            baseline_results=baseline_results,
            modified_results=modified_results,
            deltas=deltas,
            baseline_total=float(baseline_df['Value'].sum()),
            modified_total=float(modified_df['Value'].sum())
        )

    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Calculation error: {str(e)}")


@app.post("/api/link-estimate", response_model=LinkEstimateResponse)
async def link_estimate(request: LinkEstimateRequest):
    """Estimate per-link Shapley values for a specific operator"""
    try:
        private_links_df, devices_df, demand_df, public_links_df = network_state_to_dataframes(request.network)

        # Verify operator exists
        operators = [x for x in pd.unique(devices_df["Operator"].dropna().astype(str)) if x != 'Private']
        if request.operator_focus not in operators:
            raise HTTPException(
                status_code=400,
                detail=f"Operator '{request.operator_focus}' not found in network. Available operators: {operators}"
            )

        # Check link count for the operator (each link becomes a pseudo-operator, limit is 20)
        op_devices = set(devices_df.loc[devices_df['Operator'] == request.operator_focus, 'Device'].values)
        op_link_count = sum(
            1 for _, row in private_links_df.iterrows()
            if row['Device1'] in op_devices or row['Device2'] in op_devices
        )
        if op_link_count > 15:
            raise HTTPException(
                status_code=400,
                detail=f"Operator '{request.operator_focus}' has {op_link_count} links. Per-link estimation is limited to operators with 15 or fewer links (requires 2^N coalition evaluations). Try an operator with fewer links, e.g. one with under 10 links for fast results."
            )

        loop = asyncio.get_event_loop()
        result_df = await loop.run_in_executor(
            _executor,
            partial(
                network_linkestimate,
                private_links=private_links_df,
                devices=devices_df,
                demand=demand_df,
                public_links=public_links_df,
                operator_focus=request.operator_focus,
                contiguity_bonus=request.contiguity_bonus,
                demand_multiplier=request.demand_multiplier,
            ),
        )

        results = [
            LinkResult(
                Device1=row['Device1'],
                Device2=row['Device2'],
                Bandwidth=float(row['Bandwidth']),
                Latency=float(row['Latency']),
                Value=float(row['Value']),
                Percent=float(row['Percent'])
            )
            for _, row in result_df.iterrows()
        ]

        total_value = float(result_df['Value'].sum())

        return LinkEstimateResponse(results=results, total_value=total_value)

    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Calculation error: {str(e)}")


@app.post("/api/operators")
async def get_operators(network: NetworkState):
    """Get list of unique operators from network"""
    try:
        operators = list(set(d.Operator for d in network.devices if d.Operator and d.Operator != 'Private'))
        return {"operators": sorted(operators)}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# City mappings for location names
CITY_MAPPINGS = {
    'New York': 'NYC', 'Los Angeles': 'LAX', 'San Francisco': 'SFO', 'San Jose': 'SJC',
    'Chicago': 'CHI', 'Dallas': 'DAL', 'Seattle': 'SEA', 'Miami': 'MIA', 'Atlanta': 'ATL',
    'Denver': 'DEN', 'Boston': 'BOS', 'Washington DC': 'WDC', 'Pittsburgh': 'PIT',
    'Salt Lake City': 'SLC', 'Montreal': 'MTL', 'Toronto': 'TOR',
    'London': 'LON', 'Frankfurt': 'FRA', 'Amsterdam': 'AMS', 'Paris': 'PAR', 'Milan': 'MIL',
    'Madrid': 'MAD', 'Barcelona': 'BAR', 'Zurich': 'ZUR', 'Vienna': 'VIE', 'Dublin': 'DUB',
    'Warsaw': 'WAW', 'Oslo': 'OSL', 'Strasbourg': 'STR', 'Marseille': 'MRS', 'Munich': 'MUC',
    'Prague': 'PRG', 'Stockholm': 'STO',
    'Tokyo': 'TYO', 'Singapore': 'SIN', 'Hong Kong': 'HKG', 'Sydney': 'SYD', 'Seoul': 'SEO',
    'Mumbai': 'BOM', 'Bangalore': 'BLR', 'Shanghai': 'SHA', 'Beijing': 'BEI', 'Melbourne': 'MEL',
    'Dubai': 'DXB', 'Johannesburg': 'JNB', 'Sao Paulo': 'SAO', 'Bogota': 'BOG', 'Santiago': 'SCL',
}

# City coordinates for estimating public latency
CITY_COORDS = {
    'NYC': (40.7128, -74.006), 'LAX': (34.0522, -118.2437), 'SFO': (37.7749, -122.4194),
    'SJC': (37.3382, -121.8863), 'CHI': (41.8781, -87.6298), 'DAL': (32.7767, -96.797),
    'SEA': (47.6062, -122.3321), 'MIA': (25.7617, -80.1918), 'ATL': (33.749, -84.388),
    'DEN': (39.7392, -104.9903), 'BOS': (42.3601, -71.0589), 'WDC': (38.9072, -77.0369),
    'PIT': (40.4406, -79.9959), 'SLC': (40.7608, -111.891), 'MTL': (45.5017, -73.5673),
    'TOR': (43.6532, -79.3832),
    'LON': (51.5074, -0.1276), 'FRA': (50.1109, 8.6821), 'AMS': (52.3676, 4.9041),
    'PAR': (48.8566, 2.3522), 'MIL': (45.4642, 9.19), 'MAD': (40.4168, -3.7038),
    'BAR': (41.3851, 2.1734), 'ZUR': (47.3769, 8.5417), 'VIE': (48.2082, 16.3738),
    'DUB': (53.3498, -6.2603), 'WAW': (52.2297, 21.0122), 'OSL': (59.9139, 10.7522),
    'STR': (48.5734, 7.7521), 'MRS': (43.2965, 5.3698), 'MUC': (48.1351, 11.5820),
    'PRG': (50.0755, 14.4378), 'STO': (59.3293, 18.0686),
    'TYO': (35.6895, 139.6917), 'SIN': (1.3521, 103.8198), 'HKG': (22.3193, 114.1694),
    'SYD': (-33.8688, 151.2093), 'SEO': (37.5665, 126.978), 'BOM': (19.076, 72.8777),
    'BLR': (12.9716, 77.5946), 'SHA': (31.2304, 121.4737), 'BEI': (39.9042, 116.4074),
    'MEL': (-37.8136, 144.9631),
    'DXB': (25.2048, 55.2708), 'JNB': (-26.2041, 28.0473),
    'SAO': (-23.5505, -46.6333), 'BOG': (4.711, -74.0721), 'SCL': (-33.4489, -70.6693),
}

import math
import re
import httpx

def estimate_public_latency(city1: str, city2: str) -> float:
    """Estimate public internet latency between two cities"""
    coords1 = CITY_COORDS.get(city1)
    coords2 = CITY_COORDS.get(city2)
    if not coords1 or not coords2:
        return 100.0

    lat1, lng1 = math.radians(coords1[0]), math.radians(coords1[1])
    lat2, lng2 = math.radians(coords2[0]), math.radians(coords2[1])
    dlat, dlng = lat2 - lat1, lng2 - lng1

    a = math.sin(dlat/2)**2 + math.cos(lat1) * math.cos(lat2) * math.sin(dlng/2)**2
    c = 2 * math.atan2(math.sqrt(a), math.sqrt(1-a))
    distance = 6371 * c  # km

    # ~0.01ms per km + 20% overhead + 5ms floor
    return round((distance * 0.01 * 1.2 + 5) * 100) / 100


def map_location_to_city(name: str, code: str) -> str:
    """Map location name to standard city code"""
    if name in CITY_MAPPINGS:
        return CITY_MAPPINGS[name]
    # Try to extract from code like DRT-SEA10
    match = re.search(r'[A-Z]+-([A-Z]{3})\d*', code, re.I)
    if match:
        return match.group(1).upper()
    match = re.search(r'([A-Z]{3})\d*', code, re.I)
    if match:
        return match.group(1).upper()
    return code[:3].upper() if code else 'UNK'


def normalize_device_code(code: str, counter: dict) -> str:
    """
    Normalize device code to meet Shapley calculation requirements:
    1. Must contain at least one digit
    2. Must NOT end with "00" (reserved for public network nodes like NYC00)

    We preserve the original code as much as possible, only adding a suffix if needed.
    """
    if not code:
        code = 'UNK'

    # Only add digit suffix if code has no digits at all
    if not re.search(r'\d', code):
        if code not in counter:
            counter[code] = 0
        counter[code] += 1
        code = f"{code}{counter[code]}"

    # If code ends with "00", append "d" to distinguish from public nodes
    if code.endswith('00'):
        code = f"{code}d"

    return code


class LiveNetworkResponse(BaseModel):
    network: NetworkState
    epoch: int
    link_count: int
    operator_count: int


@app.get("/api/live-network", response_model=LiveNetworkResponse)
async def get_live_network():
    """Fetch and parse live network data from DoubleZero S3 bucket"""
    S3_BUCKET_URL = "https://doublezero-contributor-rewards-mn-beta-snapshots.s3.amazonaws.com"

    try:
        # List bucket to find latest epoch
        async with httpx.AsyncClient(timeout=30.0) as client:
            list_resp = await client.get(f"{S3_BUCKET_URL}?list-type=2")
            list_resp.raise_for_status()

        # Parse XML to find epochs
        import xml.etree.ElementTree as ET
        root = ET.fromstring(list_resp.text)
        ns = {'s3': 'http://s3.amazonaws.com/doc/2006-03-01/'}

        epochs = []
        for content in root.findall('.//s3:Contents', ns):
            key = content.find('s3:Key', ns)
            if key is not None and key.text:
                match = re.match(r'mn-epoch-(\d+)-snapshot\.json', key.text)
                if match:
                    epochs.append(int(match.group(1)))

        if not epochs:
            raise HTTPException(status_code=404, detail="No epochs found in S3 bucket")

        latest_epoch = max(epochs)

        # Fetch latest snapshot
        async with httpx.AsyncClient(timeout=120.0) as client:
            snap_resp = await client.get(f"{S3_BUCKET_URL}/mn-epoch-{latest_epoch}-snapshot.json")
            snap_resp.raise_for_status()
            snapshot = snap_resp.json()

        # Parse snapshot
        svc = snapshot['fetch_data']['dz_serviceability']

        # Build lookup maps
        devices_map = {pk: dev for pk, dev in svc['devices'].items()}
        locations_map = {pk: loc for pk, loc in svc['locations'].items()}
        contributors_map = {pk: contrib for pk, contrib in svc['contributors'].items()}

        private_links = []
        devices_list = []
        device_ids = {}  # Maps original code to normalized code (with digit)
        added_devices = set()  # Track added device codes to avoid duplicates
        cities = set()
        digit_counter = {}  # Counter for adding digits to codes without them

        for link in svc['links'].values():
            if link.get('status') != 'Activated':
                continue

            dev_a = devices_map.get(link.get('side_a_pk'))
            dev_z = devices_map.get(link.get('side_z_pk'))
            if not dev_a or not dev_z:
                continue

            contrib = contributors_map.get(link.get('contributor_pk'))
            contrib_name = contrib.get('code', 'Unknown') if contrib else 'Unknown'

            loc_a = locations_map.get(dev_a.get('location_pk'))
            loc_z = locations_map.get(dev_z.get('location_pk'))

            city_a = map_location_to_city(loc_a.get('name', ''), loc_a.get('code', '')) if loc_a else 'UNK'
            city_z = map_location_to_city(loc_z.get('name', ''), loc_z.get('code', '')) if loc_z else 'UNK'
            cities.add(city_a)
            cities.add(city_z)

            # Get device codes and ensure they have digits (required by Shapley calculation)
            code_a_raw = dev_a.get('code', '')
            code_z_raw = dev_z.get('code', '')

            # Use cached normalized code or create new one
            if code_a_raw not in device_ids:
                device_ids[code_a_raw] = normalize_device_code(code_a_raw, digit_counter)
            if code_z_raw not in device_ids:
                device_ids[code_z_raw] = normalize_device_code(code_z_raw, digit_counter)

            code_a = device_ids[code_a_raw]
            code_z = device_ids[code_z_raw]

            latency_ms = link.get('delay_ns', 0) / 1_000_000
            bandwidth_gbps = link.get('bandwidth', 10_000_000_000) / 1_000_000_000

            private_links.append(PrivateLink(
                Device1=code_a,
                Device2=code_z,
                Latency=round(latency_ms * 100) / 100,
                Bandwidth=round(bandwidth_gbps * 10) / 10,
                Uptime=0.99,
                Shared=None
            ))

            # Build devices in the same pass (avoids second iteration)
            if code_a_raw and code_a_raw not in added_devices:
                added_devices.add(code_a_raw)
                devices_list.append(Device(
                    Device=code_a,
                    Edge=10,
                    Operator=contrib_name,
                    City=city_a if city_a != 'UNK' else None
                ))

            if code_z_raw and code_z_raw not in added_devices:
                added_devices.add(code_z_raw)
                devices_list.append(Device(
                    Device=code_z,
                    Edge=10,
                    Operator=contrib_name,
                    City=city_z if city_z != 'UNK' else None
                ))

        # Generate public links
        city_list = [c for c in cities if c != 'UNK']
        public_links = []
        for i, c1 in enumerate(city_list):
            for c2 in city_list[i+1:]:
                public_links.append(PublicLink(
                    City1=c1,
                    City2=c2,
                    Latency=estimate_public_latency(c1, c2)
                ))

        # Generate default demand
        # Each Start city must have its own Type value (required by Shapley validation)
        demand = []
        major_hubs = ['SIN', 'NYC', 'LON', 'TYO', 'FRA', 'CHI', 'LAX']
        active_hubs = [h for h in major_hubs if h in city_list]
        if not active_hubs and city_list:
            active_hubs = [city_list[0]]

        import random
        # Seed random with epoch for reproducible demand across loads
        rng = random.Random(latest_epoch)
        for type_id, hub in enumerate(active_hubs, start=1):
            hub_priority = round(rng.random(), 2)
            for dest in sorted(city_list):
                if hub == dest:
                    continue
                demand.append(DemandEntry(
                    Start=hub,
                    End=dest,
                    Receivers=rng.randint(5, 55),
                    Traffic=0.1,
                    Priority=hub_priority,
                    Type=type_id,
                    Multicast=False
                ))

        network = NetworkState(
            private_links=private_links,
            devices=devices_list,
            demand=demand,
            public_links=public_links
        )

        operators = set(d.Operator for d in devices_list)

        return LiveNetworkResponse(
            network=network,
            epoch=latest_epoch,
            link_count=len(private_links),
            operator_count=len(operators)
        )

    except httpx.HTTPError as e:
        raise HTTPException(status_code=502, detail=f"Failed to fetch from S3: {str(e)}")
    except KeyError as e:
        raise HTTPException(status_code=500, detail=f"Invalid snapshot format: missing {str(e)}")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error processing snapshot: {str(e)}")


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
