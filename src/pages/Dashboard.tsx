import { Link } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { GradientButton } from "@/components/ui/gradient-button";
import { AnimatedProgress } from "@/components/ui/animated-progress";
import {
  CalendarDays,
  Timer,
  TrendingUp,
  Clock,
  ArrowRight,
  Sparkles,
} from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";

export default function Dashboard() {
  const { user, isStaff, isAdmin } = useAuth();

  // Fetch user's upcoming bookings
  const { data: upcomingBookings = [] } = useQuery({
    queryKey: ["user-upcoming-bookings", user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      const today = format(new Date(), "yyyy-MM-dd");
      const { data, error } = await supabase
        .from("studio_bookings")
        .select("*, studios(name)")
        .eq("created_by", user.id)
        .gte("booking_date", today)
        .neq("status", "cancelled")
        .order("booking_date", { ascending: true })
        .limit(5);
      if (error) throw error;
      return data || [];
    },
    enabled: !!user?.id,
  });

  // Fetch active sessions (for staff)
  const { data: activeSessions = [] } = useQuery({
    queryKey: ["active-sessions"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("sessions")
        .select("*")
        .eq("status", "active")
        .limit(5);
      if (error) throw error;
      return data || [];
    },
    enabled: isStaff,
  });

  // Calculate booking streak (gamification)
  const bookingStreak = upcomingBookings.length;
  const streakProgress = Math.min((bookingStreak / 5) * 100, 100);

  const firstName = user?.user_metadata?.full_name?.split(" ")[0] || "there";

  return (
    <div className="p-6 lg:p-8 space-y-8">
      {/* Welcome Header */}
      <div className="space-y-2">
        <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
          Welcome back, {firstName}!
          <Sparkles className="h-6 w-6 text-foreground animate-pulse-glow" />
        </h1>
        <p className="text-muted-foreground">
          Here's what's happening with your studio sessions.
        </p>
      </div>

      {/* Quick Stats */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Upcoming Bookings</CardTitle>
            <CalendarDays className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{upcomingBookings.length}</div>
            <p className="text-xs text-muted-foreground">
              scheduled sessions
            </p>
          </CardContent>
        </Card>

        {isStaff && (
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Active Sessions</CardTitle>
              <Timer className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{activeSessions.length}</div>
              <p className="text-xs text-muted-foreground">
                currently running
              </p>
            </CardContent>
          </Card>
        )}

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Booking Streak</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{bookingStreak}</div>
            <AnimatedProgress
              value={streakProgress}
              size="sm"
              className="mt-2"
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Next Session</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {upcomingBookings[0] ? (
              <>
                <div className="text-lg font-bold">
                  {format(new Date(upcomingBookings[0].booking_date), "MMM d")}
                </div>
                <p className="text-xs text-muted-foreground">
                  {upcomingBookings[0].start_time} - {upcomingBookings[0].end_time}
                </p>
              </>
            ) : (
              <div className="text-sm text-muted-foreground">No upcoming sessions</div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <div className="space-y-4">
        <h2 className="text-xl font-semibold">Quick Actions</h2>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          <Card className="hover:shadow-lg transition-shadow">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CalendarDays className="h-5 w-5 text-foreground" />
                Book a Studio
              </CardTitle>
              <CardDescription>
                Reserve your next session
              </CardDescription>
            </CardHeader>
            <CardContent>
              <GradientButton asChild className="w-full">
                <Link to="/book">
                  View Calendar
                  <ArrowRight className="h-4 w-4 ml-2" />
                </Link>
              </GradientButton>
            </CardContent>
          </Card>

          <Card className="hover:shadow-lg transition-shadow">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-foreground" />
                Get an Estimate
              </CardTitle>
              <CardDescription>
                Calculate session pricing
              </CardDescription>
            </CardHeader>
            <CardContent>
              <GradientButton asChild variant="ghost" className="w-full border border-border">
                <Link to="/estimate">
                  Start Estimate
                  <ArrowRight className="h-4 w-4 ml-2" />
                </Link>
              </GradientButton>
            </CardContent>
          </Card>

          {isStaff && (
            <Card className="hover:shadow-lg transition-shadow">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Timer className="h-5 w-5 text-foreground" />
                  Manage Sessions
                </CardTitle>
                <CardDescription>
                  View active and past sessions
                </CardDescription>
              </CardHeader>
              <CardContent>
                <GradientButton asChild variant="ghost" className="w-full border border-border">
                  <Link to="/sessions">
                    View Sessions
                    <ArrowRight className="h-4 w-4 ml-2" />
                  </Link>
                </GradientButton>
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      {/* Upcoming Bookings List */}
      {upcomingBookings.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold">Upcoming Sessions</h2>
            <Link to="/book" className="text-sm text-foreground hover:underline">
              View all
            </Link>
          </div>
          <div className="space-y-3">
            {upcomingBookings.slice(0, 3).map((booking) => (
              <Card key={booking.id} className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="rainbow-border rainbow-border-slow h-12 w-12 rounded-lg flex items-center justify-center bg-background">
                      <CalendarDays className="h-5 w-5 text-foreground" />
                    </div>
                    <div>
                      <p className="font-medium">
                        {(booking.studios as any)?.name || "Studio Session"}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {format(new Date(booking.booking_date), "EEEE, MMMM d")} • {booking.start_time} - {booking.end_time}
                      </p>
                    </div>
                  </div>
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                    booking.status === "confirmed" 
                      ? "bg-success/10 text-success" 
                      : "bg-warning/10 text-warning"
                  }`}>
                    {booking.status}
                  </span>
                </div>
              </Card>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
