import { MemberStatusBreakdown, RevenueByStatusResult } from "@/types/teamProject";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { CheckCircle2, Clock, Circle, BarChart3 } from "lucide-react";

interface RevenueByStatusTableProps {
  revenueData: RevenueByStatusResult;
}

export function RevenueByStatusTable({ revenueData }: RevenueByStatusTableProps) {
  const { members, unclaimed, totals } = revenueData;

  const formatCurrency = (amount: number) => 
    amount > 0 ? `$${amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : '—';

  const renderRow = (breakdown: MemberStatusBreakdown, isUnclaimed = false, isTotals = false) => (
    <TableRow 
      key={breakdown.memberId || (isUnclaimed ? 'unclaimed' : 'totals')} 
      className={isTotals ? 'bg-muted/50 font-semibold border-t-2' : isUnclaimed ? 'text-muted-foreground' : ''}
    >
      <TableCell className="font-medium">
        <div>
          <span>{breakdown.memberName}</span>
          {breakdown.role && !isUnclaimed && !isTotals && (
            <span className="text-xs text-muted-foreground ml-1">({breakdown.role})</span>
          )}
        </div>
      </TableCell>
      <TableCell className="text-center">
        <div className="text-green-600">{formatCurrency(breakdown.doneValue)}</div>
        <div className="text-xs text-muted-foreground">{breakdown.taskCounts.done} tasks</div>
      </TableCell>
      <TableCell className="text-center">
        <div className="text-amber-500">{formatCurrency(breakdown.inProgressValue)}</div>
        <div className="text-xs text-muted-foreground">{breakdown.taskCounts.inProgress} tasks</div>
      </TableCell>
      <TableCell className="text-center">
        <div className="text-muted-foreground">{formatCurrency(breakdown.todoValue)}</div>
        <div className="text-xs text-muted-foreground">{breakdown.taskCounts.todo} tasks</div>
      </TableCell>
      <TableCell className="text-right font-semibold">
        {formatCurrency(breakdown.totalValue)}
      </TableCell>
    </TableRow>
  );

  const hasData = members.length > 0 || unclaimed.totalValue > 0;

  if (!hasData) {
    return null;
  }

  return (
    <Card className="mb-4">
      <CardHeader className="pb-2">
        <CardTitle className="text-base flex items-center gap-2">
          <BarChart3 className="h-4 w-4" />
          Revenue by Status
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Team Member</TableHead>
                <TableHead className="text-center">
                  <div className="flex items-center justify-center gap-1">
                    <CheckCircle2 className="h-3 w-3 text-green-500" />
                    Done
                  </div>
                </TableHead>
                <TableHead className="text-center">
                  <div className="flex items-center justify-center gap-1">
                    <Clock className="h-3 w-3 text-amber-500" />
                    In Progress
                  </div>
                </TableHead>
                <TableHead className="text-center">
                  <div className="flex items-center justify-center gap-1">
                    <Circle className="h-3 w-3 text-muted-foreground" />
                    To Do
                  </div>
                </TableHead>
                <TableHead className="text-right">Total</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {members.map(m => renderRow(m))}
              {unclaimed.totalValue > 0 && renderRow(unclaimed, true)}
              {renderRow(totals, false, true)}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}
