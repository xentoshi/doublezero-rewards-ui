# DoubleZero Contributor Rewards UI

A visual tool for network contributors to calculate and forecast their Shapley-based rewards in the DoubleZero protocol.

## Features

### Live Network Loading

Fetches the current DoubleZero network topology directly from mainnet-beta S3 snapshots (`doublezero-contributor-rewards-mn-beta-snapshots.s3.amazonaws.com`), parsing registered operators, devices, private links, and their geographic locations.

### Interactive Network Map

MapLibre-powered visualization of the full network topology with curved link arcs, city markers, and operator filtering.

### Rewards Forecast Mode

Allows new or existing contributors to get a precise estimate of a change in their contribution:

- **Add prospective links** under an existing contributor name or a new contributor name
- **Remove existing links** to model scenarios
- **Modify demand profiles** by adding, subtracting, or rearranging users in any city
- **Run Shapley calculations** and see results in absolute values and differenced against the status quo
- **Compare baseline vs modified** network configurations

### Link Value-Add Mode

Allows existing contributors to get a fuzzy estimate of the relative value-add of their links:

- Select an operator/contributor to analyze
- View per-link contribution estimates
- Includes appropriate warnings about approximation accuracy

## Prerequisites

- Node.js 18+ (for frontend)
- Python 3.11+ (for backend)
- Docker (optional, for containerized deployment)

## Quick Start

### Backend

```bash
cd backend

# Create virtual environment
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Run the server
uvicorn main:app --reload
```

The backend API will be available at http://localhost:8000

### Frontend

```bash
cd frontend

# Install dependencies
npm install

# Run development server
npm run dev
```

The frontend will be available at http://localhost:3000

## Using Docker

Build and run both services with Docker Compose:

```bash
docker compose up --build
```

- Frontend: http://localhost:3000
- Backend: http://localhost:8000

## Project Structure

```
doublezero-rewards-ui/
├── backend/
│   ├── main.py                  # FastAPI application + live data fetcher
│   ├── network_shapley.py       # Core Shapley algorithm
│   ├── network_linkestimate.py  # Link estimation algorithm
│   ├── requirements.txt
│   ├── Dockerfile
│   └── sample_data/             # Sample CSV files
├── frontend/
│   ├── src/
│   │   ├── app/                 # Next.js pages
│   │   ├── components/          # React components
│   │   ├── lib/                 # Utilities, API client, live data fetcher
│   │   ├── store/               # Zustand state management
│   │   └── types/               # TypeScript types
│   ├── package.json
│   └── Dockerfile
├── docker-compose.yml
└── README.md
```

## API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/health` | GET | Health check |
| `/api/live-network` | GET | Fetch latest network topology from DoubleZero S3 snapshots |
| `/api/simulate` | POST | Run Shapley calculation |
| `/api/compare` | POST | Compare baseline vs modified networks |
| `/api/link-estimate` | POST | Estimate per-link Shapley values |
| `/api/operators` | POST | Get list of operators from network |

## CSV File Formats

### Private Links (private_links.csv)
```
Device1,Device2,Latency,Bandwidth,Uptime,Shared
NYC1,LON1,45.60,10,0.99,NA
```

### Devices (devices.csv)
```
Device,Edge,Operator
NYC1,10,Alpha
```

### Demand (demand.csv)
```
Start,End,Receivers,Traffic,Priority,Type,Multicast
SIN,NYC,52,0.1,0.14,1,FALSE
```

### Public Links (public_links.csv)
```
City1,City2,Latency
NYC,LON,74.52
```

## Configuration

### Environment Variables

**Frontend:**
- `NEXT_PUBLIC_API_URL`: Backend API URL (default: `http://localhost:8000`)

### Simulation Parameters

- **Operator Uptime**: Reliability of operators (0-1, default: 0.98)
- **Contiguity Bonus**: Extra latency for mixing public/private links (default: 5.0ms)
- **Demand Multiplier**: Scale factor for demand (default: 1.0)

## Limitations

- Maximum 15 operators when operator_uptime < 1
- Maximum 20 operators when operator_uptime = 1
- Maximum 15 links per operator for link estimation

## Related Projects

- [network-shapley](https://github.com/doublezerofoundation/network-shapley) - Original Python implementation of the Shapley algorithm
- [doublezero-topology](https://github.com/malbeclabs/doublezero-topology) - Network topology data

## Technology Stack

- **Frontend**: Next.js 14, TypeScript, Tailwind CSS, Zustand, MapLibre GL, Recharts
- **Backend**: Python, FastAPI, NumPy, Pandas, SciPy
