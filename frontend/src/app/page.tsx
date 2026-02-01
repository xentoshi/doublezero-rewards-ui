'use client';

import React, { useEffect, useState, useRef, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { Trash2, CheckCircle, XCircle, Play, Database, X, Info } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { toast } from 'sonner';
import { DataLoader } from '@/components/features/DataLoader';
import { NetworkEditor } from '@/components/features/NetworkEditor';
import { NetworkMap } from '@/components/features/NetworkMap';
import { ResultsDisplay } from '@/components/features/ResultsDisplay';
import { LinkValueMode } from '@/components/features/LinkValueMode';
import { ProgressBar } from '@/components/features/LoadingSpinner';
import { QuickAddLink } from '@/components/features/QuickAddLink';
import { BaselineDiff } from '@/components/features/BaselineDiff';
import { useNetworkStore, validateNetwork } from '@/store/networkStore';
import { checkHealth, runComparison, runLinkEstimate } from '@/lib/api';
import { AppMode } from '@/types/network';

// --- ErrorBanner ---
function ErrorBanner({ message, onDismiss }: { message: string; onDismiss: () => void }) {
  useEffect(() => {
    const timer = setTimeout(onDismiss, 10000);
    return () => clearTimeout(timer);
  }, [message, onDismiss]);

  return (
    <div className="border border-accent p-3 flex items-start justify-between gap-3">
      <p className="text-sm text-accent font-mono">{message}</p>
      <button onClick={onDismiss} className="text-accent hover:text-ink shrink-0">
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}

// --- ConfirmClear ---
function ConfirmClear({ onConfirm }: { onConfirm: () => void }) {
  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button variant="outline" size="sm">
          <Trash2 className="w-4 h-4 mr-1" />
          Clear
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Clear all data?</AlertDialogTitle>
          <AlertDialogDescription>
            This will remove all network data, results, and baselines. This cannot be undone.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction onClick={onConfirm}>Clear</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

// --- AboutDialog ---
function AboutDialog() {
  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button variant="ghost" size="sm">
          <Info className="w-4 h-4" />
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent className="max-w-lg max-h-[80vh] overflow-y-auto">
        <AlertDialogHeader>
          <AlertDialogTitle>About DoubleZero Rewards</AlertDialogTitle>
          <AlertDialogDescription asChild>
            <div className="space-y-4 text-sm text-neutral-600">
              <div>
                <h4 className="font-serif font-bold text-ink mb-1">What is this?</h4>
                <p className="font-body">A tool for simulating fair reward distribution across DoubleZero network contributors. It helps operators understand how their infrastructure contributions translate to reward shares.</p>
              </div>
              <div>
                <h4 className="font-serif font-bold text-ink mb-1">How are rewards calculated?</h4>
                <p className="font-body">Rewards are distributed using <strong>Shapley values</strong> from cooperative game theory. For every possible subset of operators, the tool solves an optimal traffic routing problem — minimizing total latency using only that group&apos;s private links plus the public internet. Then, for each operator, it measures how much the network improves when they join vs. when they&apos;re absent, averaged across all possible orderings. This gives each operator a mathematically fair share based on their true marginal contribution.</p>
              </div>
              <div>
                <h4 className="font-serif font-bold text-ink mb-1">What drives reward share?</h4>
                <ul className="list-disc list-inside space-y-1 font-body">
                  <li><strong>Critical links</strong> between underserved cities earn more — if your link is the only fast path, your contribution is high</li>
                  <li><strong>Redundant links</strong> that duplicate existing routes earn less</li>
                  <li><strong>Lower latency</strong> on your fiber directly increases your value</li>
                  <li><strong>Network coverage</strong> matters — connecting isolated cities creates outsized value</li>
                </ul>
              </div>
              <div>
                <h4 className="font-serif font-bold text-ink mb-1">What do Baseline and Delta mean?</h4>
                <p className="font-body"><strong>Baseline</strong> is the reward distribution for the original network before your changes. <strong>Modified</strong> is the distribution after your changes (adding/removing links). <strong>Delta</strong> is the difference — a positive delta means that operator gains reward share from your change, a negative delta means they lose share.</p>
              </div>
              <div>
                <h4 className="font-serif font-bold text-ink mb-1">How to Use</h4>
                <ol className="list-decimal list-inside space-y-1 font-body">
                  <li>Load the live network topology</li>
                  <li>Add a prospective link (city, operator, latency)</li>
                  <li>See how your reward share changes vs. the baseline</li>
                  <li>Use Link Value-Add mode to estimate per-link contributions</li>
                </ol>
              </div>
              <div>
                <h4 className="font-serif font-bold text-ink mb-1">Earnings Estimates</h4>
                <p className="font-body">After running a comparison, the tool estimates SOL and USD earnings by multiplying each operator&apos;s Shapley share by the real DoubleZero fee pool. Monthly projections assume ~15 epochs per month. These are estimates &mdash; actual earnings depend on future fee pools, network changes, and SOL price.</p>
              </div>
              <div>
                <h4 className="font-serif font-bold text-ink mb-1">Data Sources</h4>
                <ul className="list-disc list-inside space-y-1 font-body">
                  <li><strong>Network topology</strong> &mdash; from DoubleZero ledger</li>
                  <li><strong>Fee pool</strong> &mdash; from <a href="https://github.com/doublezerofoundation/fees" className="text-ink underline decoration-accent hover:text-accent" target="_blank" rel="noopener noreferrer">doublezerofoundation/fees</a> (per-validator fees assessed each epoch, 5% of block rewards)</li>
                  <li><strong>SOL price</strong> &mdash; from CoinGecko public API</li>
                </ul>
              </div>
              <div className="flex gap-4 pt-2 border-t border-ink">
                <a href="https://doublezero.xyz" className="text-ink underline decoration-2 decoration-accent hover:text-accent transition-colors" target="_blank" rel="noopener noreferrer">DoubleZero</a>
                <a href="https://doublezero.xyz/contribute" className="text-ink underline decoration-2 decoration-accent hover:text-accent transition-colors" target="_blank" rel="noopener noreferrer">Become a Contributor</a>
                <a href="https://discord.gg/doublezerotech" className="text-ink underline decoration-2 decoration-accent hover:text-accent transition-colors" target="_blank" rel="noopener noreferrer">Support</a>
              </div>
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogAction>Close</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

export default function Home() {
  const {
    hasData,
    mode,
    setMode,
    baselineNetwork,
    modifiedNetwork,
    params,
    isCalculating,
    calculatingMode,
    setCalculating,
    error,
    setError,
    setSimulationResult,
    setCompareResult,
    setLinkEstimateResult,
    selectedOperator,
    clearData,
    liveDataInfo,
    feePoolData,
    loadFeeData,
  } = useNetworkStore();

  const [apiHealthy, setApiHealthy] = useState<boolean | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  const cancelCalculation = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    setCalculating(false);
  };

  // Check API health on mount
  useEffect(() => {
    const checkApi = async () => {
      const healthy = await checkHealth();
      setApiHealthy(healthy);
    };
    checkApi();
    const interval = setInterval(checkApi, 30000);
    return () => clearInterval(interval);
  }, []);

  // Fetch fee pool data on mount
  useEffect(() => {
    loadFeeData();
  }, [loadFeeData]);

  const handleCompare = useCallback(async () => {
    if (!baselineNetwork || !modifiedNetwork || isCalculating) return;

    const validationError = validateNetwork(modifiedNetwork) || validateNetwork(baselineNetwork);
    if (validationError) {
      setError(validationError);
      return;
    }

    abortControllerRef.current = new AbortController();
    setCalculating(true, 'forecast');
    setError(null);

    try {
      const result = await runComparison(baselineNetwork, modifiedNetwork, params, abortControllerRef.current.signal);
      setSimulationResult(null);
      setCompareResult(result);
      toast.success('Comparison complete');
    } catch (err) {
      if (err instanceof Error && err.name === 'AbortError') return;
      setError(err instanceof Error ? err.message : 'Comparison failed');
    } finally {
      abortControllerRef.current = null;
      setCalculating(false);
    }
  }, [baselineNetwork, modifiedNetwork, isCalculating, params, setCalculating, setError, setSimulationResult, setCompareResult]);

  const handleLinkEstimate = async () => {
    if (!baselineNetwork || !selectedOperator || isCalculating) return;

    abortControllerRef.current = new AbortController();
    setCalculating(true, 'linkvalue');
    setError(null);

    try {
      const result = await runLinkEstimate(baselineNetwork, selectedOperator, params, abortControllerRef.current.signal);
      setLinkEstimateResult(result);
      toast.success('Link estimate complete');
    } catch (err) {
      if (err instanceof Error && err.name === 'AbortError') return;
      setError(err instanceof Error ? err.message : 'Link estimate failed');
    } finally {
      abortControllerRef.current = null;
      setCalculating(false);
    }
  };

  const handleModeChange = (value: string) => {
    setMode(value as AppMode);
  };

  const handleClearData = () => {
    clearData();
    toast.success('Data cleared');
  };

  return (
    <div className="min-h-screen flex flex-col">
      {isCalculating && calculatingMode === mode && <ProgressBar />}

      {/* Header */}
      <header className="bg-newsprint border-b-2 border-ink sticky top-0 z-40">
        <div className="max-w-[1600px] mx-auto px-4 py-3">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div className="flex items-center gap-4">
              <a href="/" className="flex items-center gap-2 hover:opacity-80 transition-opacity">
                <img src="/logo.svg" alt="DoubleZero" className="h-8 w-8" />
                <h1 className="text-xl font-serif font-bold text-ink">Rewards</h1>
              </a>
              <Badge variant={apiHealthy ? 'default' : apiHealthy === false ? 'destructive' : 'outline'}>
                {apiHealthy ? (
                  <><CheckCircle className="w-3 h-3 mr-1" /> API Connected</>
                ) : apiHealthy === false ? (
                  <><XCircle className="w-3 h-3 mr-1" /> API Offline</>
                ) : (
                  'Checking...'
                )}
              </Badge>
              {liveDataInfo && (
                <TooltipProvider delayDuration={0}>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <span className="ml-2 hidden sm:inline-flex">
                        <Badge variant="outline">
                          <Database className="w-3 h-3 mr-1" />
                          Epoch {liveDataInfo.epoch} | {liveDataInfo.linkCount} links | {liveDataInfo.operatorCount} operators
                        </Badge>
                      </span>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p className="text-xs">Network topology from DoubleZero ledger</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              )}
              {feePoolData && (
                <TooltipProvider delayDuration={0}>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <span className="hidden sm:inline-flex">
                        <Badge variant="outline">
                          Fee Pool: {feePoolData.totalFeeSol.toFixed(0)} SOL (epoch {feePoolData.epoch})
                        </Badge>
                      </span>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p className="text-xs max-w-[240px]">Total validator fees for epoch {feePoolData.epoch} across {feePoolData.validatorCount} validators. From <a href="https://github.com/doublezerofoundation/fees" className="underline" target="_blank" rel="noopener noreferrer">doublezerofoundation/fees</a>.</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              )}
            </div>

            <div className="flex items-center gap-2 sm:gap-3">
              {hasData && (
                <>
                  <Tabs value={mode} onValueChange={handleModeChange}>
                    <TabsList>
                      <TabsTrigger value="forecast" className="text-xs sm:text-sm px-2 sm:px-3">Forecast</TabsTrigger>
                      <TabsTrigger value="linkvalue" className="text-xs sm:text-sm px-2 sm:px-3">Link Value</TabsTrigger>
                    </TabsList>
                  </Tabs>

                  <div className="h-6 w-px bg-ink hidden sm:block" />

                  <ConfirmClear onConfirm={handleClearData} />
                </>
              )}
              <AboutDialog />
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-[1600px] mx-auto px-4 py-6 flex-1 w-full">
        {!hasData ? (
          <div className="flex items-center justify-center min-h-[600px]">
            <DataLoader />
          </div>
        ) : mode === 'forecast' ? (
          <ForecastMode
            onCompare={handleCompare}
            isCalculating={isCalculating && calculatingMode === 'forecast'}
            onCancel={cancelCalculation}
            error={error}
            onDismissError={() => setError(null)}
          />
        ) : (
          <LinkValueModeView
            onRunEstimate={handleLinkEstimate}
            isCalculating={isCalculating && calculatingMode === 'linkvalue'}
            onCancel={cancelCalculation}
            error={error}
            onDismissError={() => setError(null)}
          />
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-ink mt-auto bg-newsprint">
        <div className="max-w-[1600px] mx-auto px-4 py-4 sm:py-5">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-2 sm:gap-3">
            <div className="flex items-center gap-2 text-neutral-500">
              <img src="/logo.svg" alt="DoubleZero" className="h-4 w-4 opacity-50" />
              <a href="https://doublezero.xyz" className="text-xs font-mono hover:text-ink transition-colors" target="_blank" rel="noopener noreferrer">
                DoubleZero
              </a>
            </div>
            <div className="flex flex-wrap items-center justify-center gap-1">
              <a href="https://doublezero.xyz/contribute" className="text-xs font-mono text-neutral-500 hover:text-ink transition-colors px-2 sm:px-3 py-1 hover:bg-muted" target="_blank" rel="noopener noreferrer">
                Become a Contributor
              </a>
              <span className="text-neutral-300">|</span>
              <a href="https://discord.gg/doublezerotech" className="text-xs font-mono text-neutral-500 hover:text-ink transition-colors px-2 sm:px-3 py-1 hover:bg-muted" target="_blank" rel="noopener noreferrer">
                Support
              </a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}

interface ForecastModeProps {
  onCompare: () => void;
  isCalculating: boolean;
  onCancel: () => void;
  error: string | null;
  onDismissError: () => void;
}

function GettingStartedDialog({ onDismiss }: { onDismiss: () => void }) {
  return (
    <AlertDialog open onOpenChange={(open) => { if (!open) onDismiss(); }}>
      <AlertDialogContent className="max-w-md">
        <AlertDialogHeader>
          <AlertDialogTitle>How to Use This Tool</AlertDialogTitle>
          <AlertDialogDescription asChild>
            <div className="space-y-4 text-sm text-neutral-600">
              <div className="flex gap-3">
                <div className="text-xs font-mono uppercase tracking-widest text-neutral-400 shrink-0 pt-0.5">01</div>
                <p className="font-body">
                  Pick two cities, enter an operator name, and set the latency and bandwidth for your proposed link.
                </p>
              </div>
              <div className="flex gap-3">
                <div className="text-xs font-mono uppercase tracking-widest text-neutral-400 shrink-0 pt-0.5">02</div>
                <p className="font-body">
                  Click <strong className="text-ink">&ldquo;Add Link and Compare Impact&rdquo;</strong> &mdash; the tool will calculate how this change affects every operator&apos;s reward share.
                </p>
              </div>
              <div className="flex gap-3">
                <div className="text-xs font-mono uppercase tracking-widest text-neutral-400 shrink-0 pt-0.5">03</div>
                <p className="font-body">
                  Review the results to see who gains and who loses reward share. A positive delta means more rewards for that operator.
                </p>
              </div>
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogAction onClick={onDismiss}>Got it</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

function ForecastMode({ onCompare, isCalculating, onCancel, error, onDismissError }: ForecastModeProps) {
  const [showGuide, setShowGuide] = useState(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('dz-guide-dismissed') !== 'true';
    }
    return true;
  });
  const resultsRef = useRef<HTMLDivElement>(null);
  const { selectedOperator, compareResult, simulationResult } = useNetworkStore();
  const hasResults = !!compareResult || !!simulationResult;

  // Auto-scroll to results when comparison completes
  useEffect(() => {
    if (hasResults && resultsRef.current) {
      resultsRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }, [compareResult, simulationResult]);

  return (
    <div className="space-y-4">
      {/* Getting Started dialog — shown once, user dismisses */}
      {showGuide && !hasResults && !isCalculating && (
        <GettingStartedDialog onDismiss={() => { setShowGuide(false); localStorage.setItem('dz-guide-dismissed', 'true'); }} />
      )}

      {/* Row 1: Map (3/4) + Sidebar (1/4) */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
        {/* Network Map */}
        <div className="lg:col-span-3 h-[280px] sm:h-[350px] lg:h-[600px]">
          <NetworkMap />
        </div>

        {/* Sidebar — just the action */}
        <div className="lg:col-span-1 space-y-3">
          <QuickAddLink onRunCompare={onCompare} isCalculating={isCalculating} onCancel={onCancel} />

          {error && <ErrorBanner message={error} onDismiss={onDismissError} />}
        </div>
      </div>

      {/* Changes from baseline */}
      <BaselineDiff />

      {/* Results */}
      <div className="border-t border-muted" />
      <div ref={resultsRef}>
        <ResultsDisplay />
      </div>

      {/* Network Editor */}
      <div className="border-t border-muted" />
      <NetworkEditor operatorFilter={selectedOperator} />
    </div>
  );
}

interface LinkValueModeViewProps {
  onRunEstimate: () => void;
  isCalculating: boolean;
  onCancel: () => void;
  error: string | null;
  onDismissError: () => void;
}

function LinkValueModeView({ onRunEstimate, isCalculating, onCancel, error, onDismissError }: LinkValueModeViewProps) {
  const { selectedOperator } = useNetworkStore();
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    if (!isCalculating) {
      if (progress > 0) setProgress(100);
      const timer = setTimeout(() => setProgress(0), 400);
      return () => clearTimeout(timer);
    }
    setProgress(3);
    const interval = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 97) return prev;
        const remaining = 97 - prev;
        const increment = remaining * 0.04 + 0.3;
        return Math.min(prev + increment, 97);
      });
    }, 800);
    return () => clearInterval(interval);
  }, [isCalculating]);

  return (
    <div className="space-y-4">
      {/* Row 1: Map (2/3) + Sidebar (1/3) */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
        {/* Network Map */}
        <div className="lg:col-span-3 h-[280px] sm:h-[350px] lg:h-[600px]">
          <NetworkMap />
        </div>

        {/* Sidebar */}
        <div className="lg:col-span-1 space-y-4">
          <LinkValueMode />

          {isCalculating ? (
            <div className="space-y-2">
              <div className="w-full h-10 relative border border-ink bg-newsprint overflow-hidden">
                <div
                  className="absolute inset-y-0 left-0 bg-emerald-500 transition-all duration-700 ease-out"
                  style={{ width: `${progress}%` }}
                />
                <div className="absolute inset-0 flex items-center justify-between px-3">
                  <span className="text-xs font-mono uppercase tracking-widest text-ink">
                    Calculating... {Math.round(progress)}%
                  </span>
                  <button onClick={onCancel} className="text-ink hover:text-accent z-10">
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
              <p className="text-[11px] font-mono text-neutral-500 leading-tight">
                Shapley computation evaluates every possible coalition of operators. This is exponential in complexity and may take 30-60s for large networks.
              </p>
            </div>
          ) : (
            <Button onClick={onRunEstimate} disabled={!selectedOperator} className="w-full h-10 text-xs">
              <Play className="w-3.5 h-3.5 mr-1.5" />
              Estimate Link Values
            </Button>
          )}

          {error && <ErrorBanner message={error} onDismiss={onDismissError} />}
        </div>
      </div>
    </div>
  );
}
