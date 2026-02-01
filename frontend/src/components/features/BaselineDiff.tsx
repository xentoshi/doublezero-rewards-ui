'use client';

import React, { useMemo } from 'react';
import { Badge } from '@/components/ui/badge';
import { useNetworkStore } from '@/store/networkStore';
import { CITY_NAMES, getCityFromDevice } from '@/lib/cities';

export function BaselineDiff() {
  const { baselineNetwork, modifiedNetwork } = useNetworkStore();

  const changes = useMemo(() => {
    if (!baselineNetwork || !modifiedNetwork) return null;

    const blLinkKeys = new Set(
      baselineNetwork.private_links.map(l => `${l.Device1}-${l.Device2}-${l.Bandwidth}-${l.Latency}`)
    );
    const modLinkKeys = new Set(
      modifiedNetwork.private_links.map(l => `${l.Device1}-${l.Device2}-${l.Bandwidth}-${l.Latency}`)
    );

    const addedLinks = modifiedNetwork.private_links.filter(
      l => !blLinkKeys.has(`${l.Device1}-${l.Device2}-${l.Bandwidth}-${l.Latency}`)
    );
    const removedLinks = baselineNetwork.private_links.filter(
      l => !modLinkKeys.has(`${l.Device1}-${l.Device2}-${l.Bandwidth}-${l.Latency}`)
    );

    const demandDelta = modifiedNetwork.demand.length - baselineNetwork.demand.length;

    if (addedLinks.length === 0 && removedLinks.length === 0 && demandDelta === 0) {
      return null;
    }

    return { addedLinks, removedLinks, demandDelta };
  }, [baselineNetwork, modifiedNetwork]);

  if (!changes) return null;

  const resolveCity = (device: string) => {
    const code = getCityFromDevice(device);
    return CITY_NAMES[code] || code;
  };

  return (
    <div className="py-3">
      <div className="text-xs font-mono uppercase tracking-widest text-neutral-500 mb-2">Changes from baseline</div>
      <div className="flex flex-wrap gap-2">
        {changes.addedLinks.map((link, i) => (
          <Badge key={`add-${i}`} variant="outline" className="border-ink text-ink">
            +{resolveCity(link.Device1)} &ndash; {resolveCity(link.Device2)}, {link.Bandwidth}G, {link.Latency}ms
          </Badge>
        ))}
        {changes.removedLinks.map((link, i) => (
          <Badge key={`rm-${i}`} variant="outline" className="border-accent text-accent">
            -{resolveCity(link.Device1)} &ndash; {resolveCity(link.Device2)}, {link.Bandwidth}G
          </Badge>
        ))}
        {changes.demandDelta !== 0 && (
          <Badge variant="outline" className="border-neutral-500 text-neutral-600">
            {changes.demandDelta > 0 ? '+' : ''}{changes.demandDelta} demand entries
          </Badge>
        )}
      </div>
    </div>
  );
}
