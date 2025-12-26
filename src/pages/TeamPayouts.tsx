import { useState, useMemo } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, DollarSign, Calendar, Users, TrendingUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { format, startOfMonth, endOfMonth, startOfWeek, endOfWeek, subMonths } from "date-fns";

type DateRange = "this_week" | "this_month" | "last_month" | "all_time";

const TeamPayouts = () => {
  const [dateRange, setDateRange] = useState<DateRange>("this_month");

  const getDateBounds = (range: DateRange) => {
    const now = new Date();
    switch (range) {
      case "this_week":
        return { start: startOfWeek(now), end: endOfWeek(now) };
      case "this_month":
        return { start: startOfMonth(now), end: endOfMonth(now) };
      case "last_month":
        const lastMonth = subMonths(now, 1);
        return { start: startOfMonth(lastMonth), end: endOfMonth(lastMonth) };
      case "all_time":
        return { start: new Date("2020-01-01"), end: now };
    }
  };

  const { start, end } = getDateBounds(dateRange);

  const { data: quotes, isLoading } = useQuery({
    queryKey: ["team-payouts", dateRange],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("quotes")
        .select(`
          *,
          studios:studio_id(name),
          services:service_id(name, type)
        `)
        .gte("created_at", start.toISOString())
        .lte("created_at", end.toISOString())
        .not("provider_payout", "is", null)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data;
    },
  });

  const stats = useMemo(() => {
    if (!quotes || quotes.length === 0) {
      return { totalPayouts: 0, sessionCount: 0, avgPayout: 0 };
    }

    const totalPayouts = quotes.reduce((sum, q) => sum + (q.provider_payout || 0), 0);
    const sessionCount = quotes.length;
    const avgPayout = sessionCount > 0 ? totalPayouts / sessionCount : 0;

    return { totalPayouts, sessionCount, avgPayout };
  }, [quotes]);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
    }).format(amount);
  };

  const getProviderLevelDisplay = (level: string | null) => {
    switch (level) {
      case "lv1": return "Lv1 ($20/hr)";
      case "lv2": return "Lv2 ($30/hr)";
      case "lv3": return "Lv3 ($40/hr)";
      default: return "—";
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8 max-w-6xl">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" asChild>
              <Link to="/">
                <ArrowLeft className="h-5 w-5" />
              </Link>
            </Button>
            <div>
              <h1 className="text-3xl font-bold">Team Payouts</h1>
              <p className="text-muted-foreground">Staff earnings summary dashboard</p>
            </div>
          </div>
        </div>

        {/* Date Filter */}
        <div className="mb-6">
          <div className="flex items-center gap-3">
            <Calendar className="h-5 w-5 text-muted-foreground" />
            <Select value={dateRange} onValueChange={(v) => setDateRange(v as DateRange)}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Select range" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="this_week">This Week</SelectItem>
                <SelectItem value="this_month">This Month</SelectItem>
                <SelectItem value="last_month">Last Month</SelectItem>
                <SelectItem value="all_time">All Time</SelectItem>
              </SelectContent>
            </Select>
            <span className="text-sm text-muted-foreground">
              {format(start, "MMM d")} – {format(end, "MMM d, yyyy")}
            </span>
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Payouts</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatCurrency(stats.totalPayouts)}</div>
              <p className="text-xs text-muted-foreground">Provider earnings this period</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Sessions</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.sessionCount}</div>
              <p className="text-xs text-muted-foreground">Completed sessions</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Avg per Session</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatCurrency(stats.avgPayout)}</div>
              <p className="text-xs text-muted-foreground">Average payout</p>
            </CardContent>
          </Card>
        </div>

        {/* Session Payouts Table */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle>Session Payouts</CardTitle>
            <CardDescription>Provider earnings from completed sessions</CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="text-center py-8 text-muted-foreground">Loading...</div>
            ) : !quotes || quotes.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                No sessions found for this period
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Service</TableHead>
                    <TableHead>Studio</TableHead>
                    <TableHead>Hours</TableHead>
                    <TableHead>Provider Level</TableHead>
                    <TableHead className="text-right">Payout</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {quotes.map((quote) => (
                    <TableRow key={quote.id}>
                      <TableCell>
                        {format(new Date(quote.created_at!), "MMM d, yyyy")}
                      </TableCell>
                      <TableCell>{quote.services?.name || "—"}</TableCell>
                      <TableCell>{quote.studios?.name || "—"}</TableCell>
                      <TableCell>{quote.hours} hr{quote.hours !== 1 ? "s" : ""}</TableCell>
                      <TableCell>{getProviderLevelDisplay(quote.provider_level)}</TableCell>
                      <TableCell className="text-right font-medium">
                        {formatCurrency(quote.provider_payout || 0)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        {/* Editor Payouts Section - Placeholder for future enhancement */}
        <Card>
          <CardHeader>
            <CardTitle>Editor Payouts</CardTitle>
            <CardDescription>Photo/video editing earnings (coming soon)</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-center py-8 text-muted-foreground">
              Editor payout tracking will be available in a future update.
              <br />
              <span className="text-sm">Currently, editing payouts are calculated per-project in the Team Projects tool.</span>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default TeamPayouts;
