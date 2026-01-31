'use client';

import React, { useEffect, useState, useRef, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
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
import { Trash2, CheckCircle, XCircle, Play, Database, Settings, X, Info } from 'lucide-react';
import { toast } from 'sonner';
import { DataLoader } from '@/components/features/DataLoader';
import { NetworkEditor } from '@/components/features/NetworkEditor';
import { NetworkMap } from '@/components/features/NetworkMap';
import { ResultsDisplay } from '@/components/features/ResultsDisplay';
import { LinkValueMode } from '@/components/features/LinkValueMode';
import { ProgressBar, LoadingSpinner } from '@/components/features/LoadingSpinner';
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

// --- ParametersPanel (compact for sidebar) ---
function ParametersPanel() {
  const { params, setParams } = useNetworkStore();

  return (
    <div className="grid grid-cols-1 gap-3 p-3 border border-ink">
      <div>
        <label className="text-xs font-mono uppercase tracking-widest text-neutral-500">Operator Uptime</label>
        <Input
          type="number"
          step="0.01"
          min="0"
          max="1"
          value={params.operator_uptime}
          onChange={(e) => setParams({ operator_uptime: parseFloat(e.target.value) || 0 })}
        />
      </div>
      <div>
        <label className="text-xs font-mono uppercase tracking-widest text-neutral-500">Contiguity Bonus</label>
        <Input
          type="number"
          step="0.5"
          value={params.contiguity_bonus}
          onChange={(e) => setParams({ contiguity_bonus: parseFloat(e.target.value) || 0 })}
        />
      </div>
      <div>
        <label className="text-xs font-mono uppercase tracking-widest text-neutral-500">Demand Multiplier</label>
        <Input
          type="number"
          step="0.1"
          value={params.demand_multiplier}
          onChange={(e) => setParams({ demand_multiplier: parseFloat(e.target.value) || 0 })}
        />
      </div>
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
      <AlertDialogContent className="max-w-lg">
        <AlertDialogHeader>
          <AlertDialogTitle>About DoubleZero Rewards</AlertDialogTitle>
          <AlertDialogDescription asChild>
            <div className="space-y-4 text-sm text-neutral-600">
              <div>
                <h4 className="font-serif font-bold text-ink mb-1">What is this?</h4>
                <p className="font-body">A tool for simulating fair reward distribution across DoubleZero network contributors. It helps operators understand how their infrastructure contributions translate to reward shares.</p>
              </div>
              <div>
                <h4 className="font-serif font-bold text-ink mb-1">Shapley Values</h4>
                <p className="font-body">Each operator&apos;s marginal contribution to network value is computed using cooperative game theory (Shapley values). This ensures rewards are allocated proportional to each participant&apos;s true contribution.</p>
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
              <div className="flex gap-4 pt-2 border-t border-ink">
                <a href="https://doublezero.xyz" className="text-ink underline decoration-2 decoration-accent hover:text-accent transition-colors" target="_blank" rel="noopener noreferrer">doublezero.xyz</a>
                <a href="https://doublezero.xyz/contribute" className="text-ink underline decoration-2 decoration-accent hover:text-accent transition-colors" target="_blank" rel="noopener noreferrer">Become a Contributor</a>
                <a href="https://discord.gg/doublezerotech" className="text-ink underline decoration-2 decoration-accent hover:text-accent transition-colors" target="_blank" rel="noopener noreferrer">Discord</a>
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
    setCalculating,
    error,
    setError,
    setSimulationResult,
    setCompareResult,
    setLinkEstimateResult,
    selectedOperator,
    clearData,
    liveDataInfo,
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

  const handleCompare = useCallback(async () => {
    if (!baselineNetwork || !modifiedNetwork || isCalculating) return;

    const validationError = validateNetwork(modifiedNetwork) || validateNetwork(baselineNetwork);
    if (validationError) {
      setError(validationError);
      return;
    }

    abortControllerRef.current = new AbortController();
    setCalculating(true);
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
    setCalculating(true);
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
      {isCalculating && <ProgressBar />}

      {/* Header */}
      <header className="bg-newsprint border-b-2 border-ink sticky top-0 z-40">
        <div className="max-w-[1600px] mx-auto px-4 py-3">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <img src="/logo.svg" alt="DoubleZero" className="h-8 w-8" />
                <h1 className="text-xl font-serif font-bold text-ink">Rewards</h1>
              </div>
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
                <Badge variant="outline" className="ml-2 hidden sm:flex">
                  <Database className="w-3 h-3 mr-1" />
                  Epoch {liveDataInfo.epoch} | {liveDataInfo.linkCount} links | {liveDataInfo.operatorCount} operators
                </Badge>
              )}
            </div>

            <div className="flex items-center gap-3">
              {hasData && (
                <>
                  <Tabs value={mode} onValueChange={handleModeChange}>
                    <TabsList>
                      <TabsTrigger value="forecast">Rewards Forecast</TabsTrigger>
                      <TabsTrigger value="linkvalue">Link Value-Add</TabsTrigger>
                    </TabsList>
                  </Tabs>

                  <div className="h-6 w-px bg-ink" />

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
            isCalculating={isCalculating}
            onCancel={cancelCalculation}
            error={error}
            onDismissError={() => setError(null)}
          />
        ) : (
          <LinkValueModeView
            onRunEstimate={handleLinkEstimate}
            isCalculating={isCalculating}
            onCancel={cancelCalculation}
            error={error}
            onDismissError={() => setError(null)}
          />
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-ink mt-auto bg-newsprint">
        <div className="max-w-[1600px] mx-auto px-4 py-5">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="flex items-center gap-2 text-neutral-500">
              <img src="/logo.svg" alt="DoubleZero" className="h-4 w-4 opacity-50" />
              <a href="https://doublezero.xyz" className="text-xs font-mono hover:text-ink transition-colors" target="_blank" rel="noopener noreferrer">
                doublezero.xyz
              </a>
            </div>
            <div className="flex items-center gap-1">
              <a href="https://doublezero.xyz/contribute" className="text-xs font-mono text-neutral-500 hover:text-ink transition-colors px-3 py-1 hover:bg-muted" target="_blank" rel="noopener noreferrer">
                Become a Contributor
              </a>
              <span className="text-neutral-300">|</span>
              <a href="https://discord.gg/doublezerotech" className="text-xs font-mono text-neutral-500 hover:text-ink transition-colors px-3 py-1 hover:bg-muted" target="_blank" rel="noopener noreferrer">
                Discord Support
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
  const [showParams, setShowParams] = useState(false);
  const [showGuide, setShowGuide] = useState(true);
  const { selectedOperator, compareResult, simulationResult } = useNetworkStore();
  const hasResults = !!compareResult || !!simulationResult;

  return (
    <div className="space-y-4">
      {/* Getting Started dialog — shown once, user dismisses */}
      {showGuide && !hasResults && !isCalculating && (
        <GettingStartedDialog onDismiss={() => setShowGuide(false)} />
      )}

      {/* Row 1: Map (2/3) + Sidebar (1/3) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Network Map */}
        <div className="lg:col-span-2 h-[350px] lg:h-[550px]">
          <NetworkMap />
        </div>

        {/* Sidebar — just the action */}
        <div className="lg:col-span-1 space-y-3">
          <QuickAddLink onRunCompare={onCompare} />

          {isCalculating && (
            <div className="space-y-2">
              <LoadingSpinner onCancel={onCancel} />
              <p className="text-[11px] font-mono text-neutral-500 leading-tight">
                Shapley computation evaluates every possible coalition of operators. This is exponential in complexity and may take 30-60s for large networks.
              </p>
            </div>
          )}

          {error && <ErrorBanner message={error} onDismiss={onDismissError} />}

          <div className="flex items-center text-xs font-mono text-neutral-500">
            <button
              onClick={() => setShowParams(!showParams)}
              className="flex items-center gap-1 hover:text-ink transition-colors"
            >
              <Settings className="h-3 w-3" />
              {showParams ? 'Hide params' : 'Parameters'}
            </button>
          </div>
          {showParams && <ParametersPanel />}
        </div>
      </div>

      {/* Row 2: Results — the answer, right below the action */}
      <ResultsDisplay />
      <BaselineDiff />

      {/* Row 3: Network Editor — full width for detailed editing */}
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

  return (
    <div className="space-y-4">
      {/* Row 1: Map (2/3) + Sidebar (1/3) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Network Map */}
        <div className="lg:col-span-2 h-[350px] lg:h-[550px]">
          <NetworkMap />
        </div>

        {/* Sidebar */}
        <div className="lg:col-span-1 space-y-4">
          <LinkValueMode />

          <Button onClick={onRunEstimate} disabled={!selectedOperator || isCalculating} className="w-full">
            <Play className="w-4 h-4 mr-1" />
            Estimate Link Values
          </Button>

          {isCalculating && (
            <div className="space-y-2">
              <LoadingSpinner onCancel={onCancel} />
              <p className="text-[11px] font-mono text-neutral-500 leading-tight">
                Shapley computation evaluates every possible coalition of operators. This is exponential in complexity and may take 30-60s for large networks.
              </p>
            </div>
          )}

          {error && <ErrorBanner message={error} onDismiss={onDismissError} />}
        </div>
      </div>
    </div>
  );
}
