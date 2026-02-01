'use client';

import React from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  ResponsiveContainer,
  Cell,
  Legend,
} from 'recharts';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Download, HelpCircle } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { useNetworkStore } from '@/store/networkStore';
import { formatPercent, formatValue, getOperatorColor, formatSol, formatUsd } from '@/lib/utils';
import { computeEarnings, EPOCHS_PER_MONTH } from '@/lib/fees';

function downloadCsv(filename: string, rows: Record<string, string | number>[]) {
  if (rows.length === 0) return;
  const headers = Object.keys(rows[0]);
  const csv = [headers.join(','), ...rows.map(r => headers.map(h => r[h]).join(','))].join('\n');
  const blob = new Blob([csv], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export function ResultsDisplay() {
  const { simulationResult, compareResult, mode } = useNetworkStore();

  if (mode === 'forecast' && compareResult) {
    return <ComparisonResults />;
  }

  if (!simulationResult) return null;

  const chartData = simulationResult.results.map((r) => ({
    name: r.Operator,
    value: r.Value,
    percent: r.Percent * 100,
  }));

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-base sm:text-lg font-serif font-bold text-ink">Simulation Results</h3>
        <div className="flex items-center gap-2">
          <Badge variant="outline">
            Total Value: {formatValue(simulationResult.total_value)}
          </Badge>
          <Button
            variant="outline"
            size="sm"
            onClick={() =>
              downloadCsv(
                'simulation-results.csv',
                simulationResult.results.map(r => ({
                  Operator: r.Operator,
                  Value: r.Value,
                  Percent: r.Percent,
                }))
              )
            }
          >
            <Download className="h-3 w-3 mr-1" />
            CSV
          </Button>
        </div>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* Chart */}
        <div className="h-[200px] sm:h-[250px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" stroke="#E5E5E0" />
              <XAxis type="number" tickFormatter={(v) => `${v.toFixed(0)}%`} style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 11 }} />
              <YAxis type="category" dataKey="name" width={60} style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 10 }} />
              <RechartsTooltip
                contentStyle={{ border: '1px solid #111111', backgroundColor: '#F9F9F7', fontFamily: 'JetBrains Mono, monospace', fontSize: 12 }}
                formatter={(value, name) => {
                  const numValue = typeof value === 'number' ? value : 0;
                  return [
                    name === 'percent' ? `${numValue.toFixed(2)}%` : numValue.toFixed(4),
                    name === 'percent' ? 'Share' : 'Value',
                  ];
                }}
              />
              <Bar dataKey="percent" name="Share">
                {chartData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={getOperatorColor(entry.name)} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Table */}
        <div className="max-h-[250px] overflow-auto overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="font-mono text-xs uppercase tracking-widest">Operator</TableHead>
                <TableHead className="text-right font-mono text-xs uppercase tracking-widest hidden sm:table-cell">Value</TableHead>
                <TableHead className="text-right font-mono text-xs uppercase tracking-widest">Share</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {simulationResult.results
                .sort((a, b) => b.Percent - a.Percent)
                .map((result) => (
                  <TableRow key={result.Operator} className="hover:bg-neutral-100 transition-colors">
                    <TableCell className="flex items-center gap-2">
                      <div
                        className="w-3 h-3 rounded-full"
                        style={{ backgroundColor: getOperatorColor(result.Operator) }}
                      />
                      <span className="text-sm">{result.Operator}</span>
                    </TableCell>
                    <TableCell className="text-right font-mono text-sm hidden sm:table-cell">
                      {formatValue(result.Value)}
                    </TableCell>
                    <TableCell className="text-right font-mono text-sm">
                      {formatPercent(result.Percent)}
                    </TableCell>
                  </TableRow>
                ))}
            </TableBody>
          </Table>
        </div>
      </div>
    </div>
  );
}

function EarningsHighlight() {
  const { compareResult, feePoolData, solPrice } = useNetworkStore();
  if (!compareResult || !feePoolData) return null;

  // Find operator with largest positive delta
  const topGainer = compareResult.deltas
    .filter((d) => d.percent_delta > 0)
    .sort((a, b) => b.percent_delta - a.percent_delta)[0];

  if (!topGainer) return null;

  const modifiedPct = topGainer.modified_percent * 100;
  const deltaPct = topGainer.percent_delta * 100;
  const earnings = computeEarnings(modifiedPct, feePoolData.totalFeeSol, solPrice);
  const deltaEarnings = computeEarnings(deltaPct, feePoolData.totalFeeSol, solPrice);

  return (
    <div className="border-2 border-ink p-4 space-y-3">
      <div className="flex items-center gap-2">
        <h4 className="text-xs font-mono uppercase tracking-widest text-neutral-500">
          Estimated Earnings for {topGainer.Operator}
        </h4>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div>
          <p className="text-xs font-mono text-neutral-500 uppercase tracking-widest">Modified Share</p>
          <p className="text-lg font-mono font-bold text-ink">{modifiedPct.toFixed(2)}%</p>
        </div>
        <div>
          <p className="text-xs font-mono text-neutral-500 uppercase tracking-widest">Est. SOL/Epoch</p>
          <p className="text-lg font-mono font-bold text-ink">{formatSol(earnings.solPerEpoch)}</p>
        </div>
        <div>
          <p className="text-xs font-mono text-neutral-500 uppercase tracking-widest">Est. SOL/Month</p>
          <p className="text-lg font-mono font-bold text-ink">
            {formatSol(earnings.solPerMonth)}
            {earnings.usdPerMonth != null && (
              <span className="text-sm text-neutral-500 ml-1">(~{formatUsd(earnings.usdPerMonth)})</span>
            )}
          </p>
        </div>
        <div>
          <p className="text-xs font-mono text-neutral-500 uppercase tracking-widest">Gain from this Link</p>
          <p className="text-lg font-mono font-bold text-ink">
            +{formatSol(deltaEarnings.solPerEpoch)}/epoch
            {deltaEarnings.usdPerMonth != null && (
              <span className="text-sm text-neutral-500 ml-1">(+{formatUsd(deltaEarnings.usdPerMonth)}/mo)</span>
            )}
          </p>
        </div>
      </div>

      <p className="text-[11px] font-mono text-neutral-400">
        Based on epoch {feePoolData.epoch} fee pool of {feePoolData.totalFeeSol.toFixed(0)} SOL across {feePoolData.validatorCount} validators
        {' '}&bull; from{' '}
        <a href="https://github.com/doublezerofoundation/fees" className="underline hover:text-neutral-600" target="_blank" rel="noopener noreferrer">doublezerofoundation/fees</a>.
        {solPrice != null && <>{' '}SOL: ${solPrice.toFixed(2)} &bull; from CoinGecko.</>}
        {' '}Estimates use ~{EPOCHS_PER_MONTH} epochs/month. Actual earnings depend on future fee pools and network changes.
      </p>
    </div>
  );
}

function ComparisonResults() {
  const { compareResult, feePoolData, solPrice } = useNetworkStore();

  if (!compareResult) return null;

  const hasFeeData = feePoolData != null;

  const chartData = compareResult.deltas.map((d) => ({
    name: d.Operator,
    baseline: d.baseline_percent * 100,
    modified: d.modified_percent * 100,
    delta: d.percent_delta * 100,
  }));

  return (
    <div className="space-y-4">
      {/* Earnings Highlight — only shown when fee data available and there's a gainer */}
      <EarningsHighlight />

      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 mb-3">
        <h3 className="text-base sm:text-lg font-serif font-bold text-ink">Comparison Results</h3>
        <div className="flex items-center gap-2 flex-wrap">
          <Badge variant="outline" className="text-xs">
            Baseline: {formatValue(compareResult.baseline_total)}
          </Badge>
          <Badge variant="outline" className="text-xs">
            Modified: {formatValue(compareResult.modified_total)}
          </Badge>
          <Button
            variant="outline"
            size="sm"
            onClick={() =>
              downloadCsv(
                'comparison-results.csv',
                compareResult.deltas.map(d => ({
                  Operator: d.Operator,
                  Baseline_Value: d.baseline_value,
                  Modified_Value: d.modified_value,
                  Value_Delta: d.value_delta,
                  Baseline_Percent: d.baseline_percent,
                  Modified_Percent: d.modified_percent,
                  Percent_Delta: d.percent_delta,
                }))
              )
            }
          >
            <Download className="h-3 w-3 mr-1" />
            CSV
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* Chart */}
        <div className="h-[200px] sm:h-[250px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" stroke="#E5E5E0" />
              <XAxis type="number" tickFormatter={(v) => `${v.toFixed(0)}%`} style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 11 }} />
              <YAxis type="category" dataKey="name" width={60} style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 10 }} />
              <RechartsTooltip
                contentStyle={{ border: '1px solid #111111', backgroundColor: '#F9F9F7', fontFamily: 'JetBrains Mono, monospace', fontSize: 12 }}
                formatter={(value) => {
                  const numValue = typeof value === 'number' ? value : 0;
                  return `${numValue.toFixed(2)}%`;
                }}
              />
              <Legend wrapperStyle={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 11 }} />
              <Bar dataKey="baseline" name="Baseline" fill="#999999" />
              <Bar dataKey="modified" name="Modified" fill="#111111" />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Table */}
        <div className="max-h-[250px] overflow-auto overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="font-mono text-xs uppercase tracking-widest">Operator</TableHead>
                <TableHead className="text-right hidden sm:table-cell">
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <span className="inline-flex items-center gap-1 cursor-help">
                          Baseline
                          <HelpCircle className="h-3 w-3 text-neutral-400" />
                        </span>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p className="text-xs max-w-[200px]">Reward share in the original network before your changes</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </TableHead>
                <TableHead className="text-right hidden sm:table-cell">
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <span className="inline-flex items-center gap-1 cursor-help">
                          Modified
                          <HelpCircle className="h-3 w-3 text-neutral-400" />
                        </span>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p className="text-xs max-w-[200px]">Reward share after your network changes</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </TableHead>
                <TableHead className="text-right">
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <span className="inline-flex items-center gap-1 cursor-help">
                          Delta
                          <HelpCircle className="h-3 w-3 text-neutral-400" />
                        </span>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p className="text-xs max-w-[220px]">The change in reward share caused by your network modification. A positive delta means more rewards for that operator; a negative delta means fewer rewards.</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </TableHead>
                {hasFeeData && (
                  <>
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
                            <p className="text-xs max-w-[260px]">Estimated SOL earned per epoch based on the operator&apos;s modified Shapley share applied to the current fee pool. Source: <a href="https://github.com/doublezerofoundation/fees" className="underline" target="_blank" rel="noopener noreferrer">doublezerofoundation/fees</a>.</p>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    </TableHead>
                    <TableHead className="text-right hidden sm:table-cell">
                      <TooltipProvider delayDuration={0}>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <span className="inline-flex items-center gap-1 cursor-help font-mono text-xs uppercase tracking-widest">
                              Est. SOL/month
                              <HelpCircle className="h-3 w-3 text-neutral-400" />
                            </span>
                          </TooltipTrigger>
                          <TooltipContent>
                            <p className="text-xs max-w-[260px]">Projected monthly SOL earnings (~{EPOCHS_PER_MONTH} epochs/month). USD conversion from CoinGecko spot price. Actual rewards depend on future fee pools and network changes.</p>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    </TableHead>
                  </>
                )}
              </TableRow>
            </TableHeader>
            <TableBody>
              {compareResult.deltas
                .sort((a, b) => Math.abs(b.percent_delta) - Math.abs(a.percent_delta))
                .map((delta) => {
                  const earnings = hasFeeData
                    ? computeEarnings(delta.modified_percent * 100, feePoolData.totalFeeSol, solPrice)
                    : null;
                  return (
                    <TableRow key={delta.Operator} className="hover:bg-neutral-100 transition-colors">
                      <TableCell className="flex items-center gap-2">
                        <div
                          className="w-3 h-3 rounded-full"
                          style={{ backgroundColor: getOperatorColor(delta.Operator) }}
                        />
                        <span className="text-sm">{delta.Operator}</span>
                      </TableCell>
                      <TableCell className="text-right font-mono text-sm text-neutral-500 hidden sm:table-cell">
                        {formatPercent(delta.baseline_percent)}
                      </TableCell>
                      <TableCell className="text-right font-mono text-sm hidden sm:table-cell">
                        {formatPercent(delta.modified_percent)}
                      </TableCell>
                      <TableCell className="text-right font-mono text-sm">
                        <span
                          className={
                            delta.percent_delta > 0
                              ? 'text-ink font-bold'
                              : delta.percent_delta < 0
                              ? 'text-accent font-bold'
                              : ''
                          }
                        >
                          {delta.percent_delta > 0 ? '+' : ''}
                          {formatPercent(delta.percent_delta)}
                        </span>
                      </TableCell>
                      {earnings && (
                        <>
                          <TableCell className="text-right font-mono text-sm hidden sm:table-cell">
                            {formatSol(earnings.solPerEpoch)}
                          </TableCell>
                          <TableCell className="text-right font-mono text-sm hidden sm:table-cell">
                            {formatSol(earnings.solPerMonth)}
                            {earnings.usdPerMonth != null && (
                              <span className="text-neutral-400 ml-1 text-xs">(~{formatUsd(earnings.usdPerMonth)})</span>
                            )}
                          </TableCell>
                        </>
                      )}
                    </TableRow>
                  );
                })}
            </TableBody>
          </Table>
        </div>
      </div>

      {/* Explainer */}
      <p className="text-xs font-mono text-neutral-500 mt-3">
        <strong className="text-ink">Baseline</strong> is the reward distribution before your changes.{' '}
        <strong className="text-ink">Modified</strong> is after. The <strong className="text-ink">Delta</strong> column shows who gains or loses reward share.
      </p>

    </div>
  );
}
