'use client';

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Plus, Globe } from 'lucide-react';
import { toast } from 'sonner';
import { useNetworkStore } from '@/store/networkStore';

export function DataLoader() {
  const { loadEmptyNetwork, loadLiveData, isLoadingLiveData } = useNetworkStore();
  const [liveError, setLiveError] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);

  // Simulated progress bar during loading
  useEffect(() => {
    if (!isLoadingLiveData) {
      setProgress(0);
      return;
    }
    setProgress(3);
    const interval = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 95) return prev;
        const remaining = 95 - prev;
        const increment = remaining * 0.05 + 0.4;
        return Math.min(prev + increment, 95);
      });
    }, 700);
    return () => clearInterval(interval);
  }, [isLoadingLiveData]);

  const handleLoadLiveData = async () => {
    setLiveError(null);
    try {
      await loadLiveData();
      setProgress(100);
      toast.success('Live network loaded');
    } catch (err) {
      setLiveError(err instanceof Error ? err.message : 'Failed to load live data');
    }
  };

  const handleLoadEmpty = () => {
    loadEmptyNetwork();
    toast.success('Empty network created');
  };

  return (
    <Card className="max-w-lg mx-auto">
      <CardHeader className="text-center border-b-0">
        <div className="flex justify-center mb-3 sm:mb-4">
          <img src="/logo.svg" alt="DoubleZero" className="h-12 w-12 sm:h-16 sm:w-16" />
        </div>
        <CardTitle className="text-2xl sm:text-3xl font-serif">DoubleZero Rewards</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {isLoadingLiveData ? (
          <div className="border border-ink p-6 space-y-4">
            <div className="flex justify-center">
              <Globe className="h-8 w-8 text-ink animate-pulse" />
            </div>
            {/* Progress bar */}
            <div className="h-1 bg-muted overflow-hidden">
              <div
                className="h-full bg-ink transition-all duration-500 ease-out"
                style={{ width: `${progress}%` }}
              />
            </div>
            <p className="text-sm text-ink text-center font-mono uppercase tracking-widest">
              Fetching network topology...
            </p>
            <p className="text-xs text-neutral-500 text-center font-mono">
              This may take up to 30 seconds
            </p>
          </div>
        ) : (
          <Button
            onClick={handleLoadLiveData}
            variant="default"
            className="w-full"
            size="lg"
          >
            <Globe className="mr-2 h-4 w-4" />
            Load Live Network
          </Button>
        )}

        {liveError && (
          <p className="text-xs text-accent text-center">{liveError}</p>
        )}

        <div className="relative py-2">
          <div className="absolute inset-0 flex items-center">
            <span className="w-full border-t border-ink" />
          </div>
          <div className="relative flex justify-center text-xs uppercase">
            <span className="bg-newsprint px-2 text-neutral-500 font-mono tracking-widest">or</span>
          </div>
        </div>

        <div>
          <Button onClick={handleLoadEmpty} variant="outline" className="w-full" size="lg">
            <Plus className="mr-2 h-4 w-4" />
            Build Custom Network
          </Button>
          <p className="text-xs text-neutral-500 text-center mt-2 font-mono">
            Start empty and build your own network by adding links
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
