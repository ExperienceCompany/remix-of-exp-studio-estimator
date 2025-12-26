import { PhaseTotals, TASK_POINTS } from "@/types/teamProject";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Building2, Users, TrendingUp, FileDown, Save } from "lucide-react";
import { generateProjectPayoutPdf } from "@/lib/generateProjectPayoutPdf";
import { format } from "date-fns";
import { useCreateAdminLog } from "@/hooks/useAdminLogs";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";

interface PayoutDashboardProps {
  phaseTotals: PhaseTotals;
  projectName?: string;
}

export function PayoutDashboard({ phaseTotals, projectName = "" }: PayoutDashboardProps) {
  const { isAdmin } = useAuth();
  const createLog = useCreateAdminLog();
  const { toast } = useToast();

  const {
    phaseName,
    phaseRevenue,
    studioShare,
    teamPool,
    totalPoints,
    memberPayouts
  } = phaseTotals;

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2
    }).format(amount);
  };

  return (
    <div className="space-y-4">
      {/* Header Card */}
      <Card className="bg-primary/5 border-primary/20">
        <CardHeader className="pb-2">
          <CardTitle className="text-lg">{phaseName}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{formatCurrency(phaseRevenue)}</div>
          <p className="text-sm text-muted-foreground">Phase Revenue</p>
        </CardContent>
      </Card>

      {/* Split Overview */}
      <div className="grid grid-cols-2 gap-4">
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2 mb-2">
              <Building2 className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-medium">Studio Share</span>
            </div>
            <div className="text-xl font-bold">{formatCurrency(studioShare)}</div>
            <p className="text-xs text-muted-foreground">50% of revenue</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2 mb-2">
              <Users className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-medium">Team Pool</span>
            </div>
            <div className="text-xl font-bold">{formatCurrency(teamPool)}</div>
            <p className="text-xs text-muted-foreground">{totalPoints} total points</p>
          </CardContent>
        </Card>
      </div>

      {/* Member Payouts */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <TrendingUp className="h-4 w-4" />
            Team Payouts
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {memberPayouts.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">
              Add team members to see payout breakdown
            </p>
          ) : (
            memberPayouts.map((payout) => (
              <div key={payout.memberId} className="p-3 rounded-lg bg-muted/50 space-y-2">
                <div className="flex justify-between items-start">
                  <div>
                    <div className="font-medium">{payout.memberName}</div>
                    {payout.role && (
                      <div className="text-xs text-muted-foreground">{payout.role}</div>
                    )}
                  </div>
                  <div className="text-right">
                    <div className="font-bold text-primary">{formatCurrency(payout.payout)}</div>
                    <div className="text-xs text-muted-foreground">
                      {payout.percentOfPool.toFixed(1)}% of pool
                    </div>
                  </div>
                </div>
                
                <div className="grid grid-cols-3 gap-2 text-xs">
                  <div className="bg-background p-2 rounded">
                    <div className="text-muted-foreground">Lv1</div>
                    <div>{payout.lv1Tasks} × {TASK_POINTS.lv1} = <span className="font-medium">{payout.lv1Points}</span></div>
                  </div>
                  <div className="bg-background p-2 rounded">
                    <div className="text-muted-foreground">Lv2</div>
                    <div>{payout.lv2Tasks} × {TASK_POINTS.lv2} = <span className="font-medium">{payout.lv2Points}</span></div>
                  </div>
                  <div className="bg-background p-2 rounded">
                    <div className="text-muted-foreground">Lv3</div>
                    <div>{payout.lv3Tasks} × {TASK_POINTS.lv3} = <span className="font-medium">{payout.lv3Points}</span></div>
                  </div>
                </div>

                <div className="flex justify-between text-sm pt-1 border-t border-border">
                  <span>Total Points</span>
                  <span className="font-medium">{payout.totalPoints} pts</span>
                </div>
              </div>
            ))
          )}
        </CardContent>
      </Card>

      {/* Summary Footer */}
      {memberPayouts.length > 0 && (
        <Card className="border-primary/20">
          <CardContent className="pt-4 space-y-2">
            <div className="flex justify-between text-sm">
              <span>Total Team Payouts</span>
              <span className="font-medium text-destructive">
                -{formatCurrency(memberPayouts.reduce((sum, p) => sum + p.payout, 0))}
              </span>
            </div>
            <div className="flex justify-between text-sm">
              <span>Studio Gross Margin</span>
              <span className="font-medium text-green-600">
                +{formatCurrency(studioShare)}
              </span>
            </div>
            <div className="flex justify-between text-sm font-bold pt-2 border-t">
              <span>Margin %</span>
              <span>50%</span>
            </div>
            <div className="flex gap-2 mt-3">
              <Button
                variant="outline"
                size="sm"
                className="flex-1 gap-2"
                onClick={() => generateProjectPayoutPdf({
                  projectName: projectName || phaseName,
                  reportDate: format(new Date(), 'MMMM d, yyyy'),
                  phases: [phaseTotals],
                  grandTotals: {
                    revenue: phaseRevenue,
                    studioShare,
                    teamPool
                  }
                })}
              >
                <FileDown className="h-4 w-4" />
                Download PDF
              </Button>
              {isAdmin && (
                <Button
                  variant="outline"
                  size="sm"
                  className="flex-1 gap-2"
                  onClick={async () => {
                    try {
                      const totalPayouts = memberPayouts.reduce((sum, p) => sum + p.payout, 0);
                      await createLog.mutateAsync({
                        log_type: 'team_project',
                        log_name: projectName || phaseName,
                        customer_total: phaseRevenue,
                        provider_payout: totalPayouts,
                        gross_margin: studioShare,
                        data_json: {
                          phaseTotals,
                          projectName,
                        },
                      });
                      toast({ title: 'Saved to Admin Logs!' });
                    } catch {
                      toast({ title: 'Failed to save', variant: 'destructive' });
                    }
                  }}
                  disabled={createLog.isPending}
                >
                  <Save className="h-4 w-4" />
                  {createLog.isPending ? 'Saving...' : 'Save to Logs'}
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
