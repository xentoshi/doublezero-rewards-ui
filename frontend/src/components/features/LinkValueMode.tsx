'use client';

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { AlertTriangle, Info } from 'lucide-react';
import { useNetworkStore } from '@/store/networkStore';
import { formatPercent, formatValue, getUniqueOperators } from '@/lib/utils';
import { CITY_NAMES, getCityFromDevice } from '@/lib/cities';

function resolveDeviceToCity(device: string): string {
  const code = getCityFromDevice(device);
  return CITY_NAMES[code] || code;
}

export function LinkValueMode() {
  const { modifiedNetwork, linkEstimateResult, selectedOperator, setSelectedOperator } = useNetworkStore();

  if (!modifiedNetwork) return null;

  const operators = getUniqueOperators(modifiedNetwork.devices);

  return (
    <div className="space-y-4">
      {/* Operator Selector */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-lg">Link Value Estimation</CardTitle>
          <CardDescription>
            Select an operator to estimate the Shapley value contribution of each of their links
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4">
            <label className="text-xs font-mono uppercase tracking-widest text-neutral-500">Operator:</label>
            <Select value={selectedOperator || ''} onValueChange={setSelectedOperator}>
              <SelectTrigger className="w-[200px]">
                <SelectValue placeholder="Select an operator" />
              </SelectTrigger>
              <SelectContent>
                {operators.map((op) => (
                  <SelectItem key={op} value={op}>
                    {op}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Warning Banner */}
      <div className="border border-accent p-4">
        <div className="flex">
          <AlertTriangle className="h-5 w-5 text-accent shrink-0" />
          <div className="ml-3">
            <h3 className="text-xs font-mono uppercase tracking-widest text-accent mb-1">Important Note</h3>
            <p className="text-sm text-neutral-600">
              These are approximations. Link values may not sum exactly to the operator&apos;s total
              Shapley value due to interaction effects between links.
            </p>
          </div>
        </div>
      </div>

      {/* Computation Limitation Note */}
      <div className="border border-ink p-4">
        <div className="flex">
          <Info className="h-5 w-5 text-ink shrink-0" />
          <p className="ml-3 text-sm text-neutral-600">
            Note: Calculating per-link Shapley values is computationally intensive. For operators
            with many links, estimation may take longer or time out. This is a known limitation
            of the exhaustive Shapley computation and will improve in future versions.
          </p>
        </div>
      </div>

      {/* Results */}
      {linkEstimateResult && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-lg flex items-center justify-between">
              <span>Link Values for {selectedOperator}</span>
              <Badge variant="outline">
                Total: {formatValue(linkEstimateResult.total_value)}
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="max-h-[400px] overflow-auto border border-ink">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="font-mono text-xs uppercase tracking-widest">Route</TableHead>
                    <TableHead className="text-right font-mono text-xs uppercase tracking-widest">Latency</TableHead>
                    <TableHead className="text-right font-mono text-xs uppercase tracking-widest">BW</TableHead>
                    <TableHead className="text-right font-mono text-xs uppercase tracking-widest">Value</TableHead>
                    <TableHead className="text-right font-mono text-xs uppercase tracking-widest">Share</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {linkEstimateResult.results
                    .sort((a, b) => b.Percent - a.Percent)
                    .map((link, i) => (
                      <TableRow key={i} className="hover:bg-neutral-100 transition-colors">
                        <TableCell>
                          <span className="font-medium text-sm">{resolveDeviceToCity(link.Device1)}</span>
                          <span className="text-neutral-400 mx-1">&rarr;</span>
                          <span className="font-medium text-sm">{resolveDeviceToCity(link.Device2)}</span>
                          <span className="text-xs text-neutral-400 font-mono ml-2">
                            ({link.Device1} &ndash; {link.Device2})
                          </span>
                        </TableCell>
                        <TableCell className="text-right font-mono text-sm">
                          {link.Latency.toFixed(2)} ms
                        </TableCell>
                        <TableCell className="text-right font-mono text-sm">
                          {link.Bandwidth.toFixed(0)} G
                        </TableCell>
                        <TableCell className="text-right font-mono text-sm">
                          {formatValue(link.Value)}
                        </TableCell>
                        <TableCell className="text-right font-mono text-sm">
                          {formatPercent(link.Percent)}
                        </TableCell>
                      </TableRow>
                    ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
