'use client';

import React from 'react';
import { Loader2, X } from 'lucide-react';
import { Button } from '@/components/ui/button';

export function ProgressBar() {
  return (
    <div className="fixed top-0 left-0 right-0 z-50 h-1 bg-muted overflow-hidden">
      <div className="h-full bg-ink bg-[length:200%_100%] animate-shimmer w-full" />
    </div>
  );
}

interface LoadingSpinnerProps {
  message?: string;
  onCancel?: () => void;
}

export function LoadingSpinner({ message = 'Calculating...', onCancel }: LoadingSpinnerProps) {
  return (
    <div className="flex items-center gap-3 text-sm text-ink border border-ink px-3 py-2">
      <Loader2 className="h-4 w-4 animate-spin" />
      <span className="font-mono text-xs uppercase tracking-widest">{message}</span>
      {onCancel && (
        <Button variant="ghost" size="sm" onClick={onCancel}>
          <X className="h-3 w-3 mr-1" />
          Cancel
        </Button>
      )}
    </div>
  );
}
