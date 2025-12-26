import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Minus, Plus, TrendingUp, Info } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';

interface AffiliateEarningsCardProps {
  customerTotal: number;
}

interface CommissionTier {
  rate: number;
  tier: string;
  min: number;
  max: number;
}

const getCommissionTier = (leads: number): CommissionTier => {
  if (leads >= 30) return { rate: 0.30, tier: '30-40+ leads', min: 30, max: 40 };
  if (leads >= 21) return { rate: 0.20, tier: '21-30 leads', min: 21, max: 29 };
  if (leads >= 10) return { rate: 0.10, tier: '10-20 leads', min: 10, max: 20 };
  return { rate: 0.05, tier: '0-9 leads', min: 0, max: 9 };
};

const getNextTier = (leads: number): { leadsNeeded: number; nextRate: number } | null => {
  if (leads >= 30) return null; // Already at max
  if (leads >= 21) return { leadsNeeded: 30 - leads, nextRate: 0.30 };
  if (leads >= 10) return { leadsNeeded: 21 - leads, nextRate: 0.20 };
  return { leadsNeeded: 10 - leads, nextRate: 0.10 };
};

export function AffiliateEarningsCard({ customerTotal }: AffiliateEarningsCardProps) {
  const { isAffiliate } = useAuth();
  const [leadCount, setLeadCount] = useState(0);

  if (!isAffiliate) return null;

  const { rate, tier } = getCommissionTier(leadCount);
  const earnings = customerTotal * rate;
  const nextTier = getNextTier(leadCount);

  const handleLeadChange = (value: number) => {
    setLeadCount(Math.max(0, Math.min(50, value)));
  };

  return (
    <Card className="border-green-500/30 bg-green-500/5">
      <CardHeader className="pb-2">
        <CardTitle className="text-base flex items-center gap-2 text-green-600">
          <TrendingUp className="h-4 w-4" />
          Affiliate Earnings Estimate
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label className="text-sm text-muted-foreground">Your Current Lead Count</Label>
          <div className="flex items-center gap-3">
            <Button
              variant="outline"
              size="icon"
              className="h-9 w-9"
              onClick={() => handleLeadChange(leadCount - 1)}
              disabled={leadCount <= 0}
            >
              <Minus className="h-4 w-4" />
            </Button>
            <Input
              type="number"
              value={leadCount}
              onChange={(e) => handleLeadChange(parseInt(e.target.value) || 0)}
              className="w-20 text-center"
              min={0}
              max={50}
            />
            <Button
              variant="outline"
              size="icon"
              className="h-9 w-9"
              onClick={() => handleLeadChange(leadCount + 1)}
              disabled={leadCount >= 50}
            >
              <Plus className="h-4 w-4" />
            </Button>
            <span className="text-sm text-muted-foreground">leads</span>
          </div>
        </div>

        <div className="p-3 rounded-lg bg-background border space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Your Tier:</span>
            <span className="font-medium">{tier} ({(rate * 100).toFixed(0)}%)</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Session Value:</span>
            <span className="font-medium">${customerTotal.toFixed(2)}</span>
          </div>
          <div className="flex justify-between items-center pt-2 border-t">
            <span className="font-medium">Potential Earnings:</span>
            <span className="text-xl font-bold text-green-600">${earnings.toFixed(2)}</span>
          </div>
        </div>

        {nextTier && (
          <div className="flex items-start gap-2 p-2 rounded bg-muted/50 text-xs text-muted-foreground">
            <Info className="h-3.5 w-3.5 mt-0.5 shrink-0" />
            <span>
              Complete {nextTier.leadsNeeded} more lead{nextTier.leadsNeeded > 1 ? 's' : ''} to reach {(nextTier.nextRate * 100).toFixed(0)}% tier
            </span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
