'use client';

import React from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Info, HelpCircle } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { useNetworkStore } from '@/store/networkStore';
import { formatPercent, formatValue, formatSol, getUniqueOperators } from '@/lib/utils';
import { computeEarnings } from '@/lib/fees';
import { CITY_NAMES, getCityFromDevice } from '@/lib/cities';

function resolveDeviceToCity(device: string): string {
  const code = getCityFromDevice(device);
  return CITY_NAMES[code] || code;
}

export function LinkValueMode() {
  const { modifiedNetwork, linkEstimateResult, selectedOperator, setSelectedOperator, feePoolData, solPrice } = useNetworkStore();

  if (!modifiedNetwork) return null;

  const operators = getUniqueOperators(modifiedNetwork.devices);

  return (
    <div className="space-y-4">
      {/* Operator Selector */}
      <div>
        <h3 className="text-base sm:text-lg font-serif font-bold text-ink mb-1">Link Value Estimation</h3>
        <p className="font-mono text-xs text-neutral-500 mb-3">
          Select an operator to estimate the Shapley value contribution of each of their links
        </p>
        <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4">
          <label className="text-xs font-mono uppercase tracking-widest text-neutral-500">Operator:</label>
          <Select value={selectedOperator || ''} onValueChange={setSelectedOperator}>
            <SelectTrigger className="w-full sm:w-[200px]">
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
      </div>

      {/* Note */}
      <div className="border border-ink p-4">
        <div className="flex">
          <Info className="h-5 w-5 text-ink shrink-0" />
          <div className="ml-3 space-y-1">
            <p className="text-sm text-neutral-600">
              These are approximations — link values may not sum exactly to the operator&apos;s total
              Shapley value due to interaction effects between links.
            </p>
            <p className="text-sm text-neutral-600">
              Computation is exponential in complexity and may take longer or time out for operators with many links.
            </p>
          </div>
        </div>
      </div>

      {/* Results */}
      {linkEstimateResult && (
        <div>
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-base sm:text-lg font-serif font-bold text-ink">Link Values for {selectedOperator}</h3>
            <Badge variant="outline">
              Total: {formatValue(linkEstimateResult.total_value)}
            </Badge>
          </div>
          <div className="max-h-[400px] overflow-auto overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="font-mono text-xs uppercase tracking-widest">Route</TableHead>
                  <TableHead className="text-right font-mono text-xs uppercase tracking-widest hidden sm:table-cell">Latency</TableHead>
                  <TableHead className="text-right font-mono text-xs uppercase tracking-widest hidden sm:table-cell">BW</TableHead>
                  <TableHead className="text-right font-mono text-xs uppercase tracking-widest hidden sm:table-cell">Value</TableHead>
                  <TableHead className="text-right font-mono text-xs uppercase tracking-widest">Share</TableHead>
                  {feePoolData && (
                    <TableHead className="text-right hidden sm:table-cell">
                      <TooltipProvider delayDuration={0}>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <span className="inline-flex items-center gap-1 cursor-help font-mono text-xs uppercase tracking-widest">
                              Est. SOL/epoch
                              <HelpCircle className="h-3 w-3 text-neutral-400" />
                            </span>
                          </TooltipTrigger>
                          <TooltipContent>
                            <p className="text-xs max-w-[260px]">Estimated SOL earned per epoch for this link, based on its Shapley share of the fee pool. Source: <a href="https://github.com/doublezerofoundation/fees" className="underline" target="_blank" rel="noopener noreferrer">doublezerofoundation/fees</a>.</p>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    </TableHead>
                  )}
                </TableRow>
              </TableHeader>
              <TableBody>
                {linkEstimateResult.results
                  .sort((a, b) => b.Percent - a.Percent)
                  .map((link, i) => (
                    <TableRow key={i} className="hover:bg-neutral-100 transition-colors">
                      <TableCell>
                        <div>
                          <span className="font-medium text-sm">{resolveDeviceToCity(link.Device1)}</span>
                          <span className="text-neutral-400 mx-1">&rarr;</span>
                          <span className="font-medium text-sm">{resolveDeviceToCity(link.Device2)}</span>
                        </div>
                        <span className="text-xs text-neutral-400 font-mono hidden sm:inline">
                          ({link.Device1} &ndash; {link.Device2})
                        </span>
                      </TableCell>
                      <TableCell className="text-right font-mono text-sm hidden sm:table-cell">
                        {link.Latency.toFixed(2)} ms
                      </TableCell>
                      <TableCell className="text-right font-mono text-sm hidden sm:table-cell">
                        {link.Bandwidth.toFixed(0)} G
                      </TableCell>
                      <TableCell className="text-right font-mono text-sm hidden sm:table-cell">
                        {formatValue(link.Value)}
                      </TableCell>
                      <TableCell className="text-right font-mono text-sm">
                        {formatPercent(link.Percent)}
                      </TableCell>
                      {feePoolData && (
                        <TableCell className="text-right font-mono text-sm hidden sm:table-cell">
                          {formatSol(computeEarnings(link.Percent * 100, feePoolData.totalFeeSol, solPrice).solPerEpoch)}
                        </TableCell>
                      )}
                    </TableRow>
                  ))}
              </TableBody>
            </Table>
          </div>
        </div>
      )}
    </div>
  );
}
