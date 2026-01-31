'use client';

import React, { useState, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Plus, Trash2, ArrowRight } from 'lucide-react';
import { useNetworkStore } from '@/store/networkStore';
import { CITY_NAMES } from '@/lib/cities';

const AVAILABLE_CITIES = Object.keys(CITY_NAMES).sort();

export function DemandEditor() {
  const { modifiedNetwork, addDemand, deleteDemand } = useNetworkStore();
  const [newDemand, setNewDemand] = useState({
    Start: '',
    End: '',
    Receivers: 10,
  });

  // Get the next available Type ID
  const nextTypeId = useMemo(() => {
    if (!modifiedNetwork) return 1;
    return modifiedNetwork.demand.reduce((max, d) => Math.max(max, d.Type), 0) + 1;
  }, [modifiedNetwork]);

  if (!modifiedNetwork) return null;

  const handleAdd = () => {
    if (newDemand.Start && newDemand.End && newDemand.Start !== newDemand.End) {
      addDemand({
        Start: newDemand.Start,
        End: newDemand.End,
        Receivers: newDemand.Receivers,
        Traffic: 0.1,
        Priority: 0.5,
        Type: nextTypeId,
        Multicast: false,
      });
      setNewDemand({
        Start: '',
        End: '',
        Receivers: 10,
      });
    }
  };

  return (
    <div className="space-y-4">
      {/* Add New Demand Form */}
      <div className="p-4 border border-ink space-y-3">
        <h4 className="text-xs font-mono uppercase tracking-widest">Add Traffic Demand</h4>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-xs font-mono uppercase tracking-widest text-neutral-500">From</label>
            <Select value={newDemand.Start} onValueChange={(v) => setNewDemand({ ...newDemand, Start: v })}>
              <SelectTrigger>
                <SelectValue placeholder="Source city" />
              </SelectTrigger>
              <SelectContent>
                {AVAILABLE_CITIES.map(city => (
                  <SelectItem key={city} value={city}>
                    {CITY_NAMES[city]} ({city})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <label className="text-xs font-mono uppercase tracking-widest text-neutral-500">To</label>
            <Select value={newDemand.End} onValueChange={(v) => setNewDemand({ ...newDemand, End: v })}>
              <SelectTrigger>
                <SelectValue placeholder="Destination city" />
              </SelectTrigger>
              <SelectContent>
                {AVAILABLE_CITIES.filter(c => c !== newDemand.Start).map(city => (
                  <SelectItem key={city} value={city}>
                    {CITY_NAMES[city]} ({city})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div>
          <label className="text-xs font-mono uppercase tracking-widest text-neutral-500">Users</label>
          <Input
            type="number"
            min="1"
            value={newDemand.Receivers}
            onChange={(e) => setNewDemand({ ...newDemand, Receivers: parseInt(e.target.value) || 1 })}
          />
        </div>

        <Button
          onClick={handleAdd}
          disabled={!newDemand.Start || !newDemand.End || newDemand.Start === newDemand.End}
          className="w-full"
        >
          <Plus className="h-4 w-4 mr-2" />
          Add Demand
        </Button>
      </div>

      {/* Demand Table */}
      {modifiedNetwork.demand.length === 0 ? (
        <div className="text-center py-8 text-neutral-500 text-xs font-mono uppercase tracking-widest">
          No demand entries yet. Add traffic demand above.
        </div>
      ) : (
        <div className="max-h-[280px] overflow-auto border border-ink">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Route</TableHead>
                <TableHead className="text-right">Users</TableHead>
                <TableHead className="w-[50px]"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {modifiedNetwork.demand.map((demand) => (
                <TableRow key={demand.id}>
                  <TableCell>
                    <div className="flex items-center gap-2 text-sm">
                      <span className="font-medium">{CITY_NAMES[demand.Start] || demand.Start}</span>
                      <ArrowRight className="h-3 w-3 text-neutral-400" />
                      <span className="font-medium">{CITY_NAMES[demand.End] || demand.End}</span>
                    </div>
                  </TableCell>
                  <TableCell className="text-right font-mono text-sm">
                    {demand.Receivers}
                  </TableCell>
                  <TableCell>
                    <Button variant="ghost" size="icon" onClick={() => deleteDemand(demand.id)}>
                      <Trash2 className="h-4 w-4 text-accent" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
