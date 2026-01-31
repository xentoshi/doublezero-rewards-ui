'use client';

import React from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
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
    <Card className="h-full">
      <CardHeader className="pb-2">
        <CardTitle className="text-lg">Network Editor</CardTitle>
        <CardDescription className="font-mono text-xs">
          Edit the network topology. Links are physical fiber connections between cities. Demand defines traffic patterns between endpoints.
        </CardDescription>
      </CardHeader>
      <CardContent className="pt-0">
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
      </CardContent>
    </Card>
  );
}
