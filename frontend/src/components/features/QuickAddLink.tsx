'use client';

import React, { useState, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Zap } from 'lucide-react';
import { toast } from 'sonner';
import { useNetworkStore } from '@/store/networkStore';
import { CITY_NAMES } from '@/lib/cities';

const AVAILABLE_CITIES = Object.keys(CITY_NAMES).sort();

interface QuickAddLinkProps {
  onRunCompare: () => void;
}

export function QuickAddLink({ onRunCompare }: QuickAddLinkProps) {
  const { modifiedNetwork, addLinkBetweenCities, syncModifiedToBaseline } = useNetworkStore();
  const getCityForDevice = (deviceName: string) => {
    return modifiedNetwork?.devices.find(d => d.Device === deviceName)?.City;
  };

  const [form, setForm] = useState({
    city1: '',
    city2: '',
    operator: '',
    latency: 25,
    bandwidth: 10,
  });

  const existingOperators = useMemo(() => {
    if (!modifiedNetwork) return [];
    const ops = new Set(modifiedNetwork.devices.map(d => d.Operator).filter(Boolean));
    return Array.from(ops).sort();
  }, [modifiedNetwork]);

  const isValid = form.city1 && form.city2 && form.operator && form.city1 !== form.city2;

  const handleAddAndCompare = () => {
    if (!isValid || !modifiedNetwork) return;

    // Check for duplicate: same operator already has a link between these cities
    const isDuplicate = modifiedNetwork.private_links.some(l => {
      const c1 = getCityForDevice(l.Device1);
      const c2 = getCityForDevice(l.Device2);
      const op = modifiedNetwork.devices.find(d => d.Device === l.Device1)?.Operator;
      if (!c1 || !c2 || !op) return false;
      const sameOp = op === form.operator;
      const sameCities = (c1 === form.city1 && c2 === form.city2) ||
                         (c1 === form.city2 && c2 === form.city1);
      return sameOp && sameCities;
    });

    if (isDuplicate) {
      toast.error('Duplicate link', {
        description: `${form.operator} already has a link between ${CITY_NAMES[form.city1] || form.city1} and ${CITY_NAMES[form.city2] || form.city2}.`,
      });
      return;
    }

    syncModifiedToBaseline();
    addLinkBetweenCities(form.city1, form.city2, form.operator, form.latency, form.bandwidth);
    toast.success('Link added', {
      description: `${CITY_NAMES[form.city1] || form.city1} to ${CITY_NAMES[form.city2] || form.city2} (${form.operator})`,
    });
    setTimeout(() => onRunCompare(), 0);
  };

  return (
    <Card className="border-2 border-ink">
      <CardHeader className="pb-2 p-4 border-b-2 border-ink">
        <CardTitle className="text-sm font-mono uppercase tracking-widest flex items-center gap-2">
          <Zap className="h-3.5 w-3.5" strokeWidth={1.5} />
          Add Link &amp; See Impact
        </CardTitle>
      </CardHeader>
      <CardContent className="p-4 pt-4 space-y-3">
        <div className="space-y-2">
          <div>
            <label className="text-xs font-mono uppercase tracking-widest text-neutral-500">From</label>
            <Select value={form.city1} onValueChange={(v) => setForm({ ...form, city1: v })}>
              <SelectTrigger className="h-8 text-sm">
                <SelectValue placeholder="Select city" />
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
            <Select value={form.city2} onValueChange={(v) => setForm({ ...form, city2: v })}>
              <SelectTrigger className="h-8 text-sm">
                <SelectValue placeholder="Select city" />
              </SelectTrigger>
              <SelectContent>
                {AVAILABLE_CITIES.filter(c => c !== form.city1).map(city => (
                  <SelectItem key={city} value={city}>
                    {CITY_NAMES[city]} ({city})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-2">
          <div>
            <label className="text-xs font-mono uppercase tracking-widest text-neutral-500">Operator</label>
            <Input
              placeholder="Name"
              className="h-8 text-sm"
              value={form.operator}
              onChange={(e) => setForm({ ...form, operator: e.target.value })}
              list="quick-operators"
            />
            <datalist id="quick-operators">
              {existingOperators.map(op => (
                <option key={op} value={op} />
              ))}
            </datalist>
          </div>
          <div>
            <label className="text-xs font-mono uppercase tracking-widest text-neutral-500">Latency</label>
            <Input
              type="number"
              step="0.1"
              min="0.1"
              className="h-8 text-sm"
              value={form.latency}
              onChange={(e) => setForm({ ...form, latency: Math.max(0.1, parseFloat(e.target.value) || 0.1) })}
            />
          </div>
          <div>
            <label className="text-xs font-mono uppercase tracking-widest text-neutral-500">BW (Gbps)</label>
            <Input
              type="number"
              min="1"
              className="h-8 text-sm"
              value={form.bandwidth}
              onChange={(e) => setForm({ ...form, bandwidth: Math.max(1, parseFloat(e.target.value) || 10) })}
            />
          </div>
        </div>

        <Button
          onClick={handleAddAndCompare}
          disabled={!isValid}
          className="w-full h-8 text-xs"
          size="sm"
        >
          <Zap className="h-3.5 w-3.5 mr-1.5" />
          Add Link and Compare Impact
        </Button>
      </CardContent>
    </Card>
  );
}
