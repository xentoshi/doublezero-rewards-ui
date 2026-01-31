'use client';

import React from 'react';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Trash2, ArrowRight } from 'lucide-react';
import { useNetworkStore } from '@/store/networkStore';
import { CITY_NAMES, getCityFromDevice } from '@/lib/cities';
import { getOperatorColor } from '@/lib/utils';

interface LinkEditorProps {
  operatorFilter?: string | null;
}

export function LinkEditor({ operatorFilter }: LinkEditorProps) {
  const { modifiedNetwork, deletePrivateLink } = useNetworkStore();

  if (!modifiedNetwork) return null;

  const getCity = (deviceName: string) => {
    const dev = modifiedNetwork.devices.find(d => d.Device === deviceName);
    return dev?.City || getCityFromDevice(deviceName);
  };

  const getOperator = (deviceName: string) => {
    const dev = modifiedNetwork.devices.find(d => d.Device === deviceName);
    return dev?.Operator || 'Unknown';
  };

  const filteredLinks = [...modifiedNetwork.private_links].reverse().filter((link) => {
    if (!operatorFilter) return true;
    const op = getOperator(link.Device1);
    return op === operatorFilter;
  });

  return (
    <div className="space-y-4">
      {filteredLinks.length === 0 ? (
        <div className="text-center py-8 text-neutral-500 text-xs font-mono uppercase tracking-widest">
          {operatorFilter
            ? `No links for ${operatorFilter}. Select "All" to see all links.`
            : 'No links yet. Add links using the panel above.'}
        </div>
      ) : (
        <div className="max-h-[280px] overflow-auto overflow-x-auto border border-ink">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="font-mono text-xs uppercase tracking-widest">Route</TableHead>
                <TableHead className="font-mono text-xs uppercase tracking-widest">Operator</TableHead>
                <TableHead className="text-right font-mono text-xs uppercase tracking-widest">Latency</TableHead>
                <TableHead className="text-right font-mono text-xs uppercase tracking-widest">BW</TableHead>
                <TableHead className="w-[50px]"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredLinks.map((link) => {
                const operator = getOperator(link.Device1);
                return (
                  <TableRow key={link.id} className="hover:bg-neutral-100 transition-colors">
                    <TableCell>
                      <div className="flex items-center gap-2 text-sm">
                        <span className="font-medium">{CITY_NAMES[getCity(link.Device1)] || getCity(link.Device1)}</span>
                        <ArrowRight className="h-3 w-3 text-neutral-400" />
                        <span className="font-medium">{CITY_NAMES[getCity(link.Device2)] || getCity(link.Device2)}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <div
                          className="w-2.5 h-2.5 rounded-full"
                          style={{ backgroundColor: getOperatorColor(operator) }}
                        />
                        <span className="text-sm">{operator}</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-right font-mono text-sm">
                      {link.Latency.toFixed(1)} ms
                    </TableCell>
                    <TableCell className="text-right font-mono text-sm">
                      {link.Bandwidth} Gbps
                    </TableCell>
                    <TableCell>
                      <Button variant="ghost" size="icon" onClick={() => deletePrivateLink(link.id)}>
                        <Trash2 className="h-4 w-4 text-accent" />
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
