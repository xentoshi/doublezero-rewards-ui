'use client';

import React, { useMemo, useCallback } from 'react';
import { Map as MapGL, Source, Layer, Marker, Popup, NavigationControl } from 'react-map-gl/maplibre';
import { useNetworkStore } from '@/store/networkStore';
import { CITY_COORDS, CITY_NAMES } from '@/lib/cities';
import { getOperatorColor, getUniqueOperators } from '@/lib/utils';

interface LinkData {
  operator: string;
  device1: string;
  device2: string;
  latency: number;
  bandwidth: number;
  city1: string;
  city2: string;
  coordinates: [[number, number], [number, number]];
}

interface CityData {
  city: string;
  coordinates: [number, number];
  operators: string[];
  linkCount: number;
}

interface PopupInfo {
  type: 'city' | 'link';
  lng: number;
  lat: number;
  data: CityData | LinkData;
}

/**
 * Generate a curved arc between two geographic points using a quadratic bezier.
 * Offsets the midpoint perpendicular to the line by ~15% of the distance.
 */
function generateArc(
  start: [number, number],
  end: [number, number],
  numPoints: number = 20
): [number, number][] {
  const midLng = (start[0] + end[0]) / 2;
  const midLat = (start[1] + end[1]) / 2;

  // Perpendicular offset
  const dx = end[0] - start[0];
  const dy = end[1] - start[1];
  const dist = Math.sqrt(dx * dx + dy * dy);
  const offsetAmount = dist * 0.15;

  // Perpendicular direction (rotate 90 degrees)
  const perpLng = -dy / dist * offsetAmount;
  const perpLat = dx / dist * offsetAmount;

  // Control point (offset midpoint)
  const ctrlLng = midLng + perpLng;
  const ctrlLat = midLat + perpLat;

  const points: [number, number][] = [];
  for (let i = 0; i <= numPoints; i++) {
    const t = i / numPoints;
    const oneMinusT = 1 - t;
    // Quadratic bezier: B(t) = (1-t)^2 * P0 + 2(1-t)t * P1 + t^2 * P2
    const lng = oneMinusT * oneMinusT * start[0] + 2 * oneMinusT * t * ctrlLng + t * t * end[0];
    const lat = oneMinusT * oneMinusT * start[1] + 2 * oneMinusT * t * ctrlLat + t * t * end[1];
    points.push([lng, lat]);
  }

  return points;
}

export function NetworkMap() {
  const { modifiedNetwork, selectedOperator, setSelectedOperator } = useNetworkStore();
  const [popupInfo, setPopupInfo] = React.useState<PopupInfo | null>(null);

  const { links, cities, geoJsonLines } = useMemo(() => {
    if (!modifiedNetwork) return { links: [], cities: [], geoJsonLines: null };

    // Build device to city and operator maps
    const deviceCityMap = new Map<string, string>();
    const deviceOperatorMap = new Map<string, string>();

    modifiedNetwork.devices.forEach((d) => {
      deviceOperatorMap.set(d.Device, d.Operator);
      if (d.City) {
        deviceCityMap.set(d.Device, d.City);
      }
    });

    const linkList: LinkData[] = [];
    const cityMap = new Map<string, { operators: Set<string>; linkCount: number }>();

    // Process private links
    modifiedNetwork.private_links.forEach((link) => {
      const city1 = deviceCityMap.get(link.Device1);
      const city2 = deviceCityMap.get(link.Device2);

      if (!city1 || !city2) return;

      const coord1 = CITY_COORDS[city1];
      const coord2 = CITY_COORDS[city2];

      if (!coord1 || !coord2) return;

      const operator = deviceOperatorMap.get(link.Device1) || 'Unknown';

      linkList.push({
        operator,
        device1: link.Device1,
        device2: link.Device2,
        latency: link.Latency,
        bandwidth: link.Bandwidth,
        city1,
        city2,
        coordinates: [coord1, coord2],
      });

      // Track cities
      [city1, city2].forEach((city) => {
        if (!cityMap.has(city)) {
          cityMap.set(city, { operators: new Set(), linkCount: 0 });
        }
        const data = cityMap.get(city)!;
        data.operators.add(operator);
        data.linkCount++;
      });
    });

    // Build city list
    const cityList: CityData[] = [];
    cityMap.forEach((data, city) => {
      const coords = CITY_COORDS[city];
      if (coords) {
        cityList.push({
          city,
          coordinates: coords,
          operators: Array.from(data.operators),
          linkCount: data.linkCount,
        });
      }
    });

    // Build GeoJSON for lines with curved arcs
    const features = linkList.map((link, i) => ({
      type: 'Feature' as const,
      id: i,
      properties: {
        operator: link.operator,
        color: getOperatorColor(link.operator),
        latency: link.latency,
        bandwidth: link.bandwidth,
        city1: link.city1,
        city2: link.city2,
      },
      geometry: {
        type: 'LineString' as const,
        coordinates: generateArc(link.coordinates[0], link.coordinates[1]),
      },
    }));

    const geoJson = {
      type: 'FeatureCollection' as const,
      features,
    };

    return { links: linkList, cities: cityList, geoJsonLines: geoJson };
  }, [modifiedNetwork]);

  // Filter based on selected operator
  const filteredGeoJson = useMemo(() => {
    if (!geoJsonLines) return null;
    if (!selectedOperator) return geoJsonLines;

    return {
      ...geoJsonLines,
      features: geoJsonLines.features.filter(
        (f) => f.properties.operator === selectedOperator
      ),
    };
  }, [geoJsonLines, selectedOperator]);

  const filteredCities = useMemo(() => {
    if (!selectedOperator) return cities;
    return cities.filter((c) => c.operators.includes(selectedOperator));
  }, [cities, selectedOperator]);

  const handleCityClick = useCallback((city: CityData) => {
    setPopupInfo({
      type: 'city',
      lng: city.coordinates[0],
      lat: city.coordinates[1],
      data: city,
    });
  }, []);

  if (!modifiedNetwork) return null;

  const operators = getUniqueOperators(modifiedNetwork.devices);
  const filteredLinkCount = filteredGeoJson?.features.length || 0;

  return (
    <div className="h-full w-full relative border border-ink overflow-hidden">
      <MapGL
        initialViewState={{
          longitude: 10,
          latitude: 30,
          zoom: 1.5,
        }}
        style={{ width: '100%', height: '100%' }}
        mapStyle="https://basemaps.cartocdn.com/gl/positron-gl-style/style.json"
        renderWorldCopies={false}
        attributionControl={false}
      >
        <NavigationControl position="top-right" />

        {/* Lines layer */}
        {filteredGeoJson && (
          <Source id="links" type="geojson" data={filteredGeoJson}>
            <Layer
              id="links-layer"
              type="line"
              paint={{
                'line-color': ['get', 'color'],
                'line-width': 2,
                'line-opacity': 0.8,
              }}
            />
          </Source>
        )}

        {/* City markers */}
        {filteredCities.map((city) => (
          <Marker
            key={city.city}
            longitude={city.coordinates[0]}
            latitude={city.coordinates[1]}
            anchor="center"
            onClick={(e) => {
              e.originalEvent.stopPropagation();
              handleCityClick(city);
            }}
          >
            <div
              className="cursor-pointer"
              style={{
                width: Math.max(12, Math.min(24, city.linkCount * 2)),
                height: Math.max(12, Math.min(24, city.linkCount * 2)),
                borderRadius: '50%',
                backgroundColor: getOperatorColor(selectedOperator || city.operators[0]),
                border: '2px solid #111111',
                boxShadow: '2px 2px 0px 0px #111111',
              }}
              title={CITY_NAMES[city.city] || city.city}
            />
          </Marker>
        ))}

        {/* Popup */}
        {popupInfo && (
          <Popup
            longitude={popupInfo.lng}
            latitude={popupInfo.lat}
            anchor="bottom"
            onClose={() => setPopupInfo(null)}
            closeButton={true}
            closeOnClick={false}
          >
            {popupInfo.type === 'city' && (
              <div className="p-1">
                <div className="font-serif font-bold text-ink">
                  {CITY_NAMES[(popupInfo.data as CityData).city] || (popupInfo.data as CityData).city}
                </div>
                <div className="text-sm font-mono text-neutral-600">
                  {(popupInfo.data as CityData).linkCount} links
                </div>
                <div className="text-sm font-mono text-neutral-600">
                  Operators: {(popupInfo.data as CityData).operators.join(', ')}
                </div>
              </div>
            )}
          </Popup>
        )}
      </MapGL>

      {/* Overlay: Stats */}
      <div className="absolute top-2 left-2 bg-newsprint/90 backdrop-blur-sm px-2 py-1 border border-ink text-xs font-mono text-neutral-600">
        {selectedOperator ? (
          <span>{filteredLinkCount} links — <strong className="text-ink">{selectedOperator}</strong></span>
        ) : (
          <span>{cities.length} cities · {links.length} links</span>
        )}
      </div>

      {/* Overlay: Legend */}
      <div className="absolute bottom-2 left-2 right-2 bg-newsprint/90 backdrop-blur-sm border border-ink p-2">
        <div className="flex flex-wrap gap-1.5">
          <button
            onClick={() => setSelectedOperator(null)}
            className={`text-xs font-mono uppercase tracking-wider px-2 py-1 border transition-colors ${
              !selectedOperator
                ? 'bg-ink text-newsprint border-ink'
                : 'bg-newsprint text-ink border-neutral-300 hover:border-ink'
            }`}
          >
            All
          </button>
          {operators.map((operator) => (
            <button
              key={operator}
              onClick={() => setSelectedOperator(selectedOperator === operator ? null : operator)}
              className={`flex items-center gap-1.5 text-xs font-mono px-2 py-1 border transition-colors ${
                selectedOperator === operator
                  ? 'bg-ink text-newsprint border-ink'
                  : selectedOperator
                  ? 'bg-muted text-neutral-400 border-neutral-200'
                  : 'bg-newsprint text-ink border-neutral-300 hover:border-ink'
              }`}
            >
              <div
                className="w-2.5 h-2.5 rounded-full"
                style={{ backgroundColor: getOperatorColor(operator) }}
              />
              <span>{operator}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
