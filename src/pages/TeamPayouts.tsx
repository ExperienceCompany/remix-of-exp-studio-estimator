import { useState, useMemo } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, DollarSign, Calendar, Users, TrendingUp, FolderKanban, UserCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { format, startOfMonth, endOfMonth, startOfWeek, endOfWeek, subMonths } from "date-fns";

type DateRange = "this_week" | "this_month" | "last_month" | "all_time";

// Commission rate based on affiliate's lead count
const getCommissionRate = (leadCount: number): number => {
  if (leadCount >= 30) return 0.30;
  if (leadCount >= 21) return 0.20;
  if (leadCount >= 10) return 0.10;
  return 0.05;
};

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

  // Session Payouts Query
  const { data: quotes, isLoading: isLoadingQuotes } = useQuery({
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

  // Projects Payouts Query
  const { data: projectLogs, isLoading: isLoadingProjects } = useQuery({
    queryKey: ["project-payouts", dateRange],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("admin_logs")
        .select("*")
        .eq("log_type", "team_project")
        .gte("created_at", start.toISOString())
        .lte("created_at", end.toISOString())
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data;
    },
  });

  // Affiliate Payouts Query - Get completed quotes with affiliate codes
  const { data: affiliateQuotes, isLoading: isLoadingAffiliates } = useQuery({
    queryKey: ["affiliate-payouts", dateRange],
    queryFn: async () => {
      // First get quotes with affiliate codes
      const { data: quotesData, error: quotesError } = await supabase
        .from("quotes")
        .select("*")
        .not("affiliate_code", "is", null)
        .eq("status", "completed")
        .gte("created_at", start.toISOString())
        .lte("created_at", end.toISOString())
        .order("created_at", { ascending: false });

      if (quotesError) throw quotesError;
      if (!quotesData || quotesData.length === 0) return [];

      // Get unique affiliate codes
      const affiliateCodes = [...new Set(quotesData.map(q => q.affiliate_code).filter(Boolean))];
      
      // Fetch lead counts for each affiliate
      const { data: profiles, error: profilesError } = await supabase
        .from("profiles")
        .select("affiliate_code, lead_count")
        .in("affiliate_code", affiliateCodes);

      if (profilesError) throw profilesError;

      // Create a map of affiliate code to lead count
      const leadCountMap = new Map(
        (profiles || []).map(p => [p.affiliate_code, p.lead_count || 0])
      );

      // Calculate commission for each quote
      return quotesData.map(quote => {
        const leadCount = leadCountMap.get(quote.affiliate_code) || 0;
        const commissionRate = getCommissionRate(leadCount);
        const customerTotal = quote.customer_total || 0;
        const affiliatePayout = customerTotal * commissionRate;

        return {
          ...quote,
          leadCount,
          commissionRate,
          affiliatePayout,
        };
      });
    },
  });

  // Session stats
  const sessionStats = useMemo(() => {
    if (!quotes || quotes.length === 0) {
      return { totalPayouts: 0, sessionCount: 0, avgPayout: 0 };
    }

    const totalPayouts = quotes.reduce((sum, q) => sum + (q.provider_payout || 0), 0);
    const sessionCount = quotes.length;
    const avgPayout = sessionCount > 0 ? totalPayouts / sessionCount : 0;

    return { totalPayouts, sessionCount, avgPayout };
  }, [quotes]);

  // Project stats
  const projectStats = useMemo(() => {
    if (!projectLogs || projectLogs.length === 0) {
      return { totalRevenue: 0, totalTeamPayouts: 0, totalMargin: 0, projectCount: 0 };
    }

    const totalRevenue = projectLogs.reduce((sum, p) => sum + (p.customer_total || 0), 0);
    const totalTeamPayouts = projectLogs.reduce((sum, p) => sum + (p.provider_payout || 0), 0);
    const totalMargin = projectLogs.reduce((sum, p) => sum + (p.gross_margin || 0), 0);
    const projectCount = projectLogs.length;

    return { totalRevenue, totalTeamPayouts, totalMargin, projectCount };
  }, [projectLogs]);

  // Affiliate stats
  const affiliateStats = useMemo(() => {
    if (!affiliateQuotes || affiliateQuotes.length === 0) {
      return { totalPayouts: 0, bookingCount: 0, avgRate: 0 };
    }

    const totalPayouts = affiliateQuotes.reduce((sum, q) => sum + q.affiliatePayout, 0);
    const bookingCount = affiliateQuotes.length;
    const avgRate = affiliateQuotes.reduce((sum, q) => sum + q.commissionRate, 0) / bookingCount;

    return { totalPayouts, bookingCount, avgRate };
  }, [affiliateQuotes]);

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

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "active":
        return <Badge variant="default">Active</Badge>;
      case "closed":
        return <Badge variant="secondary">Closed</Badge>;
      case "archived":
        return <Badge variant="outline">Archived</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
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
              <CardTitle className="text-sm font-medium">Session Payouts</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatCurrency(sessionStats.totalPayouts)}</div>
              <p className="text-xs text-muted-foreground">{sessionStats.sessionCount} sessions</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Project Payouts</CardTitle>
              <FolderKanban className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatCurrency(projectStats.totalTeamPayouts)}</div>
              <p className="text-xs text-muted-foreground">{projectStats.projectCount} projects</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Affiliate Payouts</CardTitle>
              <UserCheck className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatCurrency(affiliateStats.totalPayouts)}</div>
              <p className="text-xs text-muted-foreground">{affiliateStats.bookingCount} referrals</p>
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
            {isLoadingQuotes ? (
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

        {/* Projects Payouts Table */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle>Projects Payouts</CardTitle>
            <CardDescription>Team earnings from completed projects</CardDescription>
          </CardHeader>
          <CardContent>
            {isLoadingProjects ? (
              <div className="text-center py-8 text-muted-foreground">Loading...</div>
            ) : !projectLogs || projectLogs.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                No projects found for this period
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Project</TableHead>
                    <TableHead className="text-right">Revenue</TableHead>
                    <TableHead className="text-right">Team Payout</TableHead>
                    <TableHead className="text-right">Studio Margin</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {projectLogs.map((project) => (
                    <TableRow key={project.id}>
                      <TableCell>
                        {format(new Date(project.created_at), "MMM d, yyyy")}
                      </TableCell>
                      <TableCell className="font-medium">{project.log_name || "Untitled Project"}</TableCell>
                      <TableCell className="text-right">{formatCurrency(project.customer_total || 0)}</TableCell>
                      <TableCell className="text-right font-medium">
                        {formatCurrency(project.provider_payout || 0)}
                      </TableCell>
                      <TableCell className="text-right text-muted-foreground">
                        {formatCurrency(project.gross_margin || 0)}
                      </TableCell>
                      <TableCell>{getStatusBadge(project.status)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        {/* Affiliate Payouts Table */}
        <Card>
          <CardHeader>
            <CardTitle>Affiliate Payouts</CardTitle>
            <CardDescription>Commission earnings from referred bookings</CardDescription>
          </CardHeader>
          <CardContent>
            {isLoadingAffiliates ? (
              <div className="text-center py-8 text-muted-foreground">Loading...</div>
            ) : !affiliateQuotes || affiliateQuotes.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                No affiliate referrals found for this period
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Affiliate</TableHead>
                    <TableHead className="text-right">Customer Total</TableHead>
                    <TableHead className="text-right">Rate</TableHead>
                    <TableHead className="text-right">Commission</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {affiliateQuotes.map((quote) => (
                    <TableRow key={quote.id}>
                      <TableCell>
                        {format(new Date(quote.created_at!), "MMM d, yyyy")}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">{quote.affiliate_code}</Badge>
                      </TableCell>
                      <TableCell className="text-right">{formatCurrency(quote.customer_total || 0)}</TableCell>
                      <TableCell className="text-right">{(quote.commissionRate * 100).toFixed(0)}%</TableCell>
                      <TableCell className="text-right font-medium">
                        {formatCurrency(quote.affiliatePayout)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default TeamPayouts;
