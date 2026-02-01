'use client';

import React from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { LinkEditor } from './LinkEditor';
import { DemandEditor } from './DemandEditor';
import { useNetworkStore } from '@/store/networkStore';

interface NetworkEditorProps {
  operatorFilter?: string | null;
}

export function NetworkEditor({ operatorFilter }: NetworkEditorProps) {
  const { modifiedNetwork } = useNetworkStore();

  if (!modifiedNetwork) return null;

  return (
    <div>
      <h3 className="text-base sm:text-lg font-serif font-bold text-ink mb-1">Network Editor</h3>
      <p className="font-mono text-xs text-neutral-500 mb-3">
        Edit the network topology. Links are physical fiber connections between cities. Demand defines traffic patterns between endpoints.
      </p>
      <Tabs defaultValue="links" className="w-full">
        <TabsList className="w-full">
          <TabsTrigger value="links" className="flex-1">
            Links ({modifiedNetwork.private_links.length})
          </TabsTrigger>
          <TabsTrigger value="demand" className="flex-1">
            Demand ({modifiedNetwork.demand.length})
          </TabsTrigger>
        </TabsList>
        <TabsContent value="links" className="mt-4">
          <LinkEditor operatorFilter={operatorFilter} />
        </TabsContent>
        <TabsContent value="demand" className="mt-4">
          <DemandEditor />
        </TabsContent>
      </Tabs>
    </div>
  );
}
