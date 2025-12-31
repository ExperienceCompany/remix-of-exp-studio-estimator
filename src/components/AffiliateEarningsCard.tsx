import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { TrendingUp, Info, Loader2 } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

interface AffiliateEarningsCardProps {
  customerTotal: number;
  appliedCode?: string;
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

export function AffiliateEarningsCard({ customerTotal, appliedCode }: AffiliateEarningsCardProps) {
  const { isAffiliate, user } = useAuth();

  // Fetch user's lead count and affiliate code from their profile
  const { data: profile, isLoading } = useQuery({
    queryKey: ['user-profile-affiliate', user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      const { data, error } = await supabase
        .from('profiles')
        .select('lead_count, affiliate_code')
        .eq('id', user.id)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!user?.id && isAffiliate,
  });

  // Only show if user is affiliate AND applied code matches their own code
  const isOwnCode = appliedCode && 
    profile?.affiliate_code && 
    appliedCode.toUpperCase() === profile.affiliate_code.toUpperCase();

  if (!isAffiliate || !isOwnCode) return null;

  const leadCount = profile?.lead_count ?? 0;
  const { rate, tier } = getCommissionTier(leadCount);
  const earnings = customerTotal * rate;
  const nextTier = getNextTier(leadCount);

  return (
    <Card className="border-green-500/30 bg-green-500/5">
      <CardHeader className="pb-2">
        <CardTitle className="text-base flex items-center gap-2 text-green-600">
          <TrendingUp className="h-4 w-4" />
          Affiliate Earnings Estimate
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {isLoading ? (
          <div className="flex items-center justify-center py-4">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <>
            <div className="p-3 rounded-lg bg-background border space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Your Lead Count:</span>
                <span className="font-medium">{leadCount} leads</span>
              </div>
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
          </>
        )}
      </CardContent>
    </Card>
  );
}
