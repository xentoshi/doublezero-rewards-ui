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
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Download, HelpCircle } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { useNetworkStore } from '@/store/networkStore';
import { formatPercent, formatValue, getOperatorColor } from '@/lib/utils';

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
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-lg flex items-center justify-between">
          <span>Simulation Results</span>
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
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 gap-4">
          {/* Chart */}
          <div className="h-[250px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="#E5E5E0" />
                <XAxis type="number" tickFormatter={(v) => `${v.toFixed(0)}%`} style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 11 }} />
                <YAxis type="category" dataKey="name" width={80} style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 11 }} />
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
          <div className="max-h-[250px] overflow-auto border border-ink">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="font-mono text-xs uppercase tracking-widest">Operator</TableHead>
                  <TableHead className="text-right font-mono text-xs uppercase tracking-widest">Value</TableHead>
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
                      <TableCell className="text-right font-mono text-sm">
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
      </CardContent>
    </Card>
  );
}

function ComparisonResults() {
  const { compareResult } = useNetworkStore();

  if (!compareResult) return null;

  const chartData = compareResult.deltas.map((d) => ({
    name: d.Operator,
    baseline: d.baseline_percent * 100,
    modified: d.modified_percent * 100,
    delta: d.percent_delta * 100,
  }));

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-lg flex items-center justify-between">
          <span>Comparison Results</span>
          <div className="flex items-center gap-2">
            <Badge variant="outline">
              Baseline: {formatValue(compareResult.baseline_total)}
            </Badge>
            <Badge variant="outline">
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
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 gap-4">
          {/* Chart */}
          <div className="h-[250px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="#E5E5E0" />
                <XAxis type="number" tickFormatter={(v) => `${v.toFixed(0)}%`} style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 11 }} />
                <YAxis type="category" dataKey="name" width={80} style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 11 }} />
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
          <div className="max-h-[250px] overflow-auto border border-ink">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="font-mono text-xs uppercase tracking-widest">Operator</TableHead>
                  <TableHead className="text-right">
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <span className="inline-flex items-center gap-1 cursor-help">
                            Baseline
                            <HelpCircle className="h-3 w-3 text-neutral-400" />
                          </span>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p className="text-xs max-w-[200px]">Reward share in the original network before changes</p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </TableHead>
                  <TableHead className="text-right">
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
                          <p className="text-xs max-w-[200px]">Change in reward share (Modified minus Baseline)</p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {compareResult.deltas
                  .sort((a, b) => Math.abs(b.percent_delta) - Math.abs(a.percent_delta))
                  .map((delta) => (
                    <TableRow key={delta.Operator} className="hover:bg-neutral-100 transition-colors">
                      <TableCell className="flex items-center gap-2">
                        <div
                          className="w-3 h-3 rounded-full"
                          style={{ backgroundColor: getOperatorColor(delta.Operator) }}
                        />
                        <span className="text-sm">{delta.Operator}</span>
                      </TableCell>
                      <TableCell className="text-right font-mono text-sm text-neutral-500">
                        {formatPercent(delta.baseline_percent)}
                      </TableCell>
                      <TableCell className="text-right font-mono text-sm">
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
                    </TableRow>
                  ))}
              </TableBody>
            </Table>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
