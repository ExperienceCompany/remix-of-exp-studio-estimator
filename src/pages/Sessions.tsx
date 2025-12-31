import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useDiyRates, useProviderLevels, useVodcastCameraAddons } from '@/hooks/useEstimatorData';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { ArrowLeft, Play, Pause, Square, Timer, ExternalLink, RefreshCw, CalendarDays, User, Clock, Calculator, UserCircle, FileText, CreditCard } from 'lucide-react';
import { SquareCheckoutModal } from '@/components/session/SquareCheckoutModal';
import { useToast } from '@/hooks/use-toast';
import { format, subDays, startOfDay } from 'date-fns';
import type { EstimatorSelection } from '@/types/estimator';
import { STUDIO_LABELS, StudioType, SERVICE_LABELS, ServiceType } from '@/types/estimator';
import { BookingCalendar } from '@/components/booking/BookingCalendar';

// Helper to derive time slot type from booking date and start time
const getTimeSlotTypeFromDateTime = (
  bookingDate: string | undefined,
  startTime: string | undefined
): string | null => {
  if (!bookingDate || !startTime) return null;

  const date = new Date(bookingDate + 'T12:00:00');
  const dayOfWeek = date.getDay();
  const hour = parseInt(startTime.split(':')[0], 10);
  const isEvening = hour >= 16;

  if (dayOfWeek >= 1 && dayOfWeek <= 3) {
    return isEvening ? 'mon_wed_eve' : 'mon_wed_day';
  } else if (dayOfWeek === 4 || dayOfWeek === 5) {
    return isEvening ? 'thu_fri_eve' : 'thu_fri_day';
  } else {
    return isEvening ? 'sat_sun_eve' : 'sat_sun_day';
  }
};

type SessionStatus = 'pending' | 'active' | 'paused' | 'completed' | 'cancelled';

interface Session {
  id: string;
  quote_id: string | null;
  status: SessionStatus;
  started_at: string | null;
  paused_at: string | null;
  ended_at: string | null;
  total_paused_seconds: number;
  actual_duration_seconds: number | null;
  session_type: string;
  selections_json: EstimatorSelection | null;
  original_total: number | null;
  final_total: number | null;
  payment_status: string;
  affiliate_code: string | null;
  created_at: string;
}

export default function Sessions() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { isStaff, isAdmin, isLoading: authLoading } = useAuth();

  // Filters
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [dateFilter, setDateFilter] = useState<string>('all');
  
  // Checkout modal state
  const [checkoutSession, setCheckoutSession] = useState<Session | null>(null);

  // Real-time timers
  const [now, setNow] = useState(Date.now());

  // Update timers every second
  useEffect(() => {
    const interval = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(interval);
  }, []);

  // Fetch rate data for live calculation
  const { data: diyRates } = useDiyRates();
  const { data: providerLevels } = useProviderLevels();
  const { data: cameraAddons } = useVodcastCameraAddons();

  // Fetch sessions
  const { data: sessions = [], isLoading, refetch } = useQuery({
    queryKey: ['sessions', statusFilter, typeFilter, dateFilter],
    queryFn: async () => {
      let query = supabase
        .from('sessions')
        .select('*')
        .order('created_at', { ascending: false });

      // Apply filters
      if (statusFilter !== 'all') {
        query = query.eq('status', statusFilter);
      }
      if (typeFilter !== 'all') {
        query = query.eq('session_type', typeFilter);
      }
      if (dateFilter !== 'all') {
        const now = new Date();
        let startDate: Date;
        switch (dateFilter) {
          case 'today':
            startDate = startOfDay(now);
            break;
          case 'week':
            startDate = subDays(now, 7);
            break;
          case 'month':
            startDate = subDays(now, 30);
            break;
          default:
            startDate = new Date(0);
        }
        query = query.gte('created_at', startDate.toISOString());
      }

      const { data, error } = await query;
      if (error) throw error;
      return (data || []).map(s => ({
        ...s,
        selections_json: s.selections_json as unknown as EstimatorSelection | null,
      })) as Session[];
    },
    enabled: isStaff || isAdmin,
  });

  // Realtime subscription
  useEffect(() => {
    const channel = supabase
      .channel('sessions-changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'sessions' },
        () => {
          queryClient.invalidateQueries({ queryKey: ['sessions'] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient]);

  // Update session mutation
  const updateSession = useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: Record<string, unknown> }) => {
      const { error } = await supabase
        .from('sessions')
        .update(updates)
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sessions'] });
    },
    onError: () => {
      toast({ title: 'Failed to update session', variant: 'destructive' });
    },
  });

  // Handle status change from dropdown
  const handleStatusChange = (session: Session, newStatus: SessionStatus) => {
    const updates: Record<string, unknown> = { status: newStatus };
    
    // If completing a session that never used timer, set final_total to estimate
    if (newStatus === 'completed' && !session.started_at) {
      updates.final_total = getEstimateTotal(session) || 0;
      updates.ended_at = new Date().toISOString();
    }
    
    // If cancelling, we don't change totals - display handles 25% calculation
    if (newStatus === 'cancelled' && !session.ended_at) {
      updates.ended_at = new Date().toISOString();
    }
    
    updateSession.mutate({ id: session.id, updates });
    toast({ title: `Session marked as ${newStatus}` });
  };

  const handleStart = (session: Session) => {
    updateSession.mutate({
      id: session.id,
      updates: { status: 'active', started_at: new Date().toISOString() },
    });
    toast({ title: 'Session started!' });
  };

  const handlePause = (session: Session) => {
    updateSession.mutate({
      id: session.id,
      updates: { status: 'paused', paused_at: new Date().toISOString() },
    });
    toast({ title: 'Session paused' });
  };

  const handleResume = (session: Session) => {
    if (!session.paused_at) return;
    const pausedAt = new Date(session.paused_at).getTime();
    const additionalPausedSeconds = Math.floor((Date.now() - pausedAt) / 1000);

    updateSession.mutate({
      id: session.id,
      updates: {
        status: 'active',
        paused_at: null,
        total_paused_seconds: (session.total_paused_seconds || 0) + additionalPausedSeconds,
      },
    });
    toast({ title: 'Session resumed!' });
  };

  const handleEnd = (session: Session) => {
    if (!session.started_at) return;
    let finalDuration = 0;
    if (session.status === 'paused' && session.paused_at) {
      const startTime = new Date(session.started_at).getTime();
      const pauseTime = new Date(session.paused_at).getTime();
      finalDuration = Math.floor((pauseTime - startTime) / 1000) - (session.total_paused_seconds || 0);
    } else {
      const startTime = new Date(session.started_at).getTime();
      finalDuration = Math.floor((Date.now() - startTime) / 1000) - (session.total_paused_seconds || 0);
    }

    updateSession.mutate({
      id: session.id,
      updates: {
        status: 'completed',
        ended_at: new Date().toISOString(),
        actual_duration_seconds: finalDuration,
      },
    });
    toast({ title: 'Session ended!' });
  };

  // Calculate elapsed time for active sessions
  const getElapsedSeconds = (session: Session): number => {
    if (!session.started_at) return 0;
    if (session.status === 'completed' && session.actual_duration_seconds) {
      return session.actual_duration_seconds;
    }
    if (session.status === 'paused' && session.paused_at) {
      const startTime = new Date(session.started_at).getTime();
      const pauseTime = new Date(session.paused_at).getTime();
      return Math.max(0, Math.floor((pauseTime - startTime) / 1000) - (session.total_paused_seconds || 0));
    }
    if (session.status === 'active') {
      const startTime = new Date(session.started_at).getTime();
      return Math.max(0, Math.floor((now - startTime) / 1000) - (session.total_paused_seconds || 0));
    }
    return 0;
  };

  const formatTime = (seconds: number): string => {
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    return `${hrs.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const formatDuration = (seconds: number): string => {
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    
    if (hrs > 0) return `${hrs}h ${mins}m`;
    if (mins > 0) return `${mins}m`;
    return `${secs}s`;
  };

  const getStudioName = (session: Session): string => {
    // First try studioName from booking, then studioType label
    const studioName = (session.selections_json as any)?.studioName;
    if (studioName) return studioName;
    const studioType = session.selections_json?.studioType;
    return studioType ? (STUDIO_LABELS[studioType as StudioType] || studioType) : '—';
  };

  const formatTime12Hour = (time: string): string => {
    const [hours, minutes] = time.split(':').map(Number);
    const period = hours >= 12 ? 'PM' : 'AM';
    const hrs12 = hours % 12 || 12;
    return `${hrs12}:${minutes.toString().padStart(2, '0')} ${period}`;
  };

  const getSessionDate = (session: Session): string => {
    const bookingDate = (session.selections_json as any)?.bookingDate;
    if (bookingDate) {
      return format(new Date(bookingDate), 'MMM d, yyyy');
    }
    return format(new Date(session.created_at), 'MMM d, yyyy');
  };

  const getTimeRange = (session: Session): string | null => {
    const start = (session.selections_json as any)?.startTime;
    const end = (session.selections_json as any)?.endTime;
    if (start && end) {
      return `${formatTime12Hour(start)} - ${formatTime12Hour(end)}`;
    }
    return null;
  };

  const getServiceName = (session: Session): string | null => {
    const serviceType = session.selections_json?.serviceType;
    return serviceType ? (SERVICE_LABELS[serviceType as ServiceType] || serviceType) : null;
  };

  const getCustomerName = (session: Session): string | null => {
    return (session.selections_json as any)?.customerName || null;
  };

  const getCrewDisplay = (session: Session): string | null => {
    const crew = session.selections_json?.crewAllocation;
    if (crew && (crew.lv1 > 0 || crew.lv2 > 0 || crew.lv3 > 0)) {
      const parts = [];
      if (crew.lv1 > 0) parts.push(`Lv1 ×${crew.lv1}`);
      if (crew.lv2 > 0) parts.push(`Lv2 ×${crew.lv2}`);
      if (crew.lv3 > 0) parts.push(`Lv3 ×${crew.lv3}`);
      return parts.join(', ');
    }
    return null;
  };

  // Get holder info (creator or customer) with role
  const getHolderInfo = (session: Session): { name: string | null; role: string | null; email: string | null; phone: string | null } => {
    const sel = session.selections_json as any;
    
    // Use new holderName/holderRole fields first (populated by trigger)
    const holderName = sel?.holderName;
    const holderRole = sel?.holderRole;
    const holderEmail = sel?.holderEmail;
    const holderPhone = sel?.holderPhone;
    
    if (holderName) {
      return { 
        name: holderName, 
        role: holderRole || null,
        email: holderEmail || null,
        phone: holderPhone || null
      };
    }
    
    // Fallback to legacy fields
    const creatorName = sel?.creatorName;
    const creatorRole = sel?.creatorRole;
    const customerName = sel?.customerName;
    const customerEmail = sel?.customerEmail;
    const customerPhone = sel?.customerPhone;
    
    if (creatorName) {
      return { name: creatorName, role: creatorRole || null, email: null, phone: null };
    }
    if (customerName) {
      return { name: customerName, role: 'customer', email: customerEmail || null, phone: customerPhone || null };
    }
    return { name: null, role: null, email: null, phone: null };
  };

  const getHolderRoleBadge = (role: string | null) => {
    if (!role) return null;
    switch (role) {
      case 'admin':
        return <Badge variant="destructive" className="text-xs">Admin</Badge>;
      case 'staff':
        return <Badge variant="default" className="text-xs">Staff</Badge>;
      case 'customer':
        return <Badge variant="outline" className="text-xs border-green-500 text-green-600">Customer</Badge>;
      default:
        return <Badge variant="secondary" className="text-xs">{role}</Badge>;
    }
  };

  const getSessionTitle = (session: Session): string | null => {
    return (session.selections_json as any)?.title || null;
  };

  const getPeopleCount = (session: Session): number | null => {
    return (session.selections_json as any)?.peopleCount || null;
  };

  const getSessionHours = (session: Session): number | null => {
    // First try direct hours field
    if (session.selections_json?.hours) {
      return session.selections_json.hours;
    }
    // Calculate from start/end time
    const start = (session.selections_json as any)?.startTime;
    const end = (session.selections_json as any)?.endTime;
    if (start && end) {
      const [startH, startM] = start.split(':').map(Number);
      const [endH, endM] = end.split(':').map(Number);
      const startMins = startH * 60 + startM;
      const endMins = endH * 60 + endM;
      const diffHours = (endMins - startMins) / 60;
      return diffHours > 0 ? diffHours : null;
    }
    return null;
  };

  const getEstimateTotal = (session: Session): number | null => {
    return session.original_total || 
           (session.selections_json as any)?.estimatedTotal ||
           (session.selections_json as any)?.totals?.customerTotal ||
           null;
  };

  const getCurrentTotal = (session: Session): number | null => {
    // For completed sessions, use final_total
    if (session.final_total != null) {
      return session.final_total;
    }
    
    // For active/paused sessions, calculate based on elapsed time using fetched rates
    if (session.status === 'active' || session.status === 'paused') {
      const elapsedSeconds = getElapsedSeconds(session);
      const currentHours = elapsedSeconds / 3600;
      const sel = session.selections_json as any;
      
      let total = 0;
      
      // Derive time slot type from booking date and start time
      const timeSlotType = sel?.timeSlotType || 
        getTimeSlotTypeFromDateTime(sel?.bookingDate, sel?.startTime);
      
      // Find matching DIY rate from database
      const matchingRate = diyRates?.find(
        r => r.studios?.type === sel?.studioType && 
             r.time_slots?.type === timeSlotType
      );
      
      // Studio cost calculation
      if (matchingRate) {
        total += currentHours * matchingRate.first_hour_rate;
      }
      
      // Provider cost (serviced sessions)
      if (sel?.sessionType === 'serviced' && sel?.crewAllocation) {
        const { lv1 = 0, lv2 = 0, lv3 = 0 } = sel.crewAllocation;
        const lv1Rate = providerLevels?.find(p => p.level === 'lv1')?.hourly_rate || 20;
        const lv2Rate = providerLevels?.find(p => p.level === 'lv2')?.hourly_rate || 30;
        const lv3Rate = providerLevels?.find(p => p.level === 'lv3')?.hourly_rate || 40;
        total += currentHours * ((lv1 * lv1Rate) + (lv2 * lv2Rate) + (lv3 * lv3Rate));
      }
      
      // Camera add-on (flat fee for vodcast)
      if (sel?.serviceType === 'vodcast' && sel?.cameraCount > 0) {
        const cameraAddon = cameraAddons?.find(c => c.cameras === sel.cameraCount);
        if (cameraAddon) total += cameraAddon.customer_addon_amount;
      }
      
      // Session add-ons
      if (sel?.sessionAddons?.length > 0) {
        for (const addon of sel.sessionAddons) {
          if (addon.is_hourly) {
            total += currentHours * addon.flat_amount;
          } else {
            total += addon.flat_amount;
          }
        }
      }
      
      return total;
    }
    
    return null;
  };

  const getSessionSource = (session: Session): 'estimate' | 'booking' => {
    if (session.quote_id) return 'estimate';
    if ((session.selections_json as any)?.bookingId) return 'booking';
    return 'estimate';
  };

  const getSourceBadge = (session: Session) => {
    const source = getSessionSource(session);
    if (source === 'booking') {
      return (
        <Badge variant="outline" className="border-amber-500 text-amber-600 bg-amber-500/10">
          <CalendarDays className="h-3 w-3 mr-1" />
          Booking
        </Badge>
      );
    }
    return (
      <Badge variant="outline" className="border-blue-500 text-blue-600 bg-blue-500/10">
        <Calculator className="h-3 w-3 mr-1" />
        Estimate
      </Badge>
    );
  };

  const getStatusBadge = (status: SessionStatus) => {
    switch (status) {
      case 'active':
        return <Badge className="bg-green-500/10 text-green-600 hover:bg-green-500/20">● Active</Badge>;
      case 'paused':
        return <Badge className="bg-yellow-500/10 text-yellow-600 hover:bg-yellow-500/20">⏸ Paused</Badge>;
      case 'pending':
        return <Badge variant="secondary">○ Pending</Badge>;
      case 'completed':
        return <Badge className="bg-blue-500/10 text-blue-600 hover:bg-blue-500/20">✓ Completed</Badge>;
      case 'cancelled':
        return <Badge variant="destructive">✗ Cancelled</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  // Redirect non-staff users
  if (!authLoading && !isStaff && !isAdmin) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Card className="max-w-md">
          <CardContent className="pt-6 text-center">
            <p className="text-destructive mb-4">Access denied. Staff only.</p>
            <Button onClick={() => navigate('/')}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Home
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Separate active/paused from history
  const activeSessions = sessions.filter(s => s.status === 'active' || s.status === 'paused' || s.status === 'pending');
  const historySessions = sessions.filter(s => s.status === 'completed' || s.status === 'cancelled');

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto py-8 px-4">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => navigate('/')}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <h1 className="text-2xl font-bold">Studio Sessions</h1>
              <p className="text-sm text-muted-foreground">
                Monitor active sessions and view calendar bookings
              </p>
            </div>
          </div>
          <Button variant="outline" size="sm" onClick={() => refetch()}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
        </div>

        {/* Tabs for Sessions vs Calendar */}
        <Tabs defaultValue="sessions" className="mb-6">
          <TabsList>
            <TabsTrigger value="sessions">
              <Timer className="h-4 w-4 mr-2" />
              Sessions
            </TabsTrigger>
            <TabsTrigger value="calendar">
              <CalendarDays className="h-4 w-4 mr-2" />
              Calendar Bookings
            </TabsTrigger>
          </TabsList>

          <TabsContent value="calendar" className="mt-6">
            <BookingCalendar
              onBookingClick={(booking) => {
                toast({
                  title: booking.customer_name || 'Booking',
                  description: `${format(new Date(booking.booking_date), 'MMM d')} at ${booking.start_time} - ${booking.end_time}`,
                });
              }}
            />
          </TabsContent>

          <TabsContent value="sessions" className="mt-6">

        {/* Filters */}
        <div className="flex flex-wrap gap-4 mb-6">
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[150px]">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="active">Active</SelectItem>
              <SelectItem value="paused">Paused</SelectItem>
              <SelectItem value="completed">Completed</SelectItem>
            </SelectContent>
          </Select>

          <Select value={typeFilter} onValueChange={setTypeFilter}>
            <SelectTrigger className="w-[150px]">
              <SelectValue placeholder="Type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Types</SelectItem>
              <SelectItem value="diy">DIY</SelectItem>
              <SelectItem value="serviced">EXP Session</SelectItem>
            </SelectContent>
          </Select>

          <Select value={dateFilter} onValueChange={setDateFilter}>
            <SelectTrigger className="w-[150px]">
              <SelectValue placeholder="Date" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Time</SelectItem>
              <SelectItem value="today">Today</SelectItem>
              <SelectItem value="week">This Week</SelectItem>
              <SelectItem value="month">This Month</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Side-by-side layout for Active Sessions + Session History */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Active Sessions */}
        {activeSessions.length > 0 && (
          <Card className="lg:col-span-1">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Timer className="h-5 w-5" />
                Active Sessions ({activeSessions.length})
              </CardTitle>
              <CardDescription>Live sessions with real-time timers</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {activeSessions.map(session => (
                <div
                  key={session.id}
                  className="flex flex-col sm:flex-row sm:items-start justify-between p-4 border rounded-lg gap-4"
                >
                  <div className="flex-1 space-y-2">
                    {/* Row 1: Status, Type, Source, Studio */}
                    <div className="flex items-center gap-2 flex-wrap">
                      {getStatusBadge(session.status)}
                      <span className="font-medium">
                        {session.session_type === 'diy' ? 'DIY' : 'EXP'}
                      </span>
                      {getSourceBadge(session)}
                      <span className="text-muted-foreground">•</span>
                      <span className="text-muted-foreground">{getStudioName(session)}</span>
                    </div>

                    {/* Row 2: Title if exists */}
                    {getSessionTitle(session) && (
                      <div className="font-semibold text-lg">
                        {getSessionTitle(session)}
                      </div>
                    )}

                    {/* Row 3: Date, Time Range, Service, Duration */}
                    <div className="flex items-center gap-2 text-sm text-muted-foreground flex-wrap">
                      <span className="flex items-center gap-1">
                        <CalendarDays className="h-3.5 w-3.5" />
                        {getSessionDate(session)}
                      </span>
                      {getTimeRange(session) && (
                        <>
                          <span>•</span>
                          <span className="flex items-center gap-1">
                            <Clock className="h-3.5 w-3.5" />
                            {getTimeRange(session)}
                          </span>
                        </>
                      )}
                      {getServiceName(session) && (
                        <>
                          <span>•</span>
                          <span>{getServiceName(session)}</span>
                        </>
                      )}
                      {getSessionHours(session) && (
                        <>
                          <span>•</span>
                          <span>{getSessionHours(session)}hr{getSessionHours(session)! > 1 ? 's' : ''}</span>
                        </>
                      )}
                    </div>

                    {/* Row 4: Holder, People, Crew, Estimate */}
                    <div className="flex items-center gap-3 text-sm flex-wrap">
                      {(() => {
                        const holder = getHolderInfo(session);
                        if (holder.name) {
                          return (
                            <span className="flex items-center gap-1.5 text-foreground">
                              <UserCircle className="h-3.5 w-3.5" />
                              <span>{holder.name}</span>
                              {getHolderRoleBadge(holder.role)}
                            </span>
                          );
                        }
                        return null;
                      })()}
                      {getPeopleCount(session) && getPeopleCount(session)! > 1 && (
                        <Badge variant="outline" className="text-xs">
                          {getPeopleCount(session)} people
                        </Badge>
                      )}
                      {getCrewDisplay(session) && (
                        <Badge variant="outline" className="text-xs">
                          {getCrewDisplay(session)}
                        </Badge>
                      )}
                      {getEstimateTotal(session) != null && (
                        <span className="text-muted-foreground">
                          Est: ${getEstimateTotal(session)?.toFixed(2)}
                        </span>
                      )}
                      {getCurrentTotal(session) != null && (
                        <span className="font-medium text-primary">
                          Current: ${getCurrentTotal(session)?.toFixed(2)}
                        </span>
                      )}
                    </div>

                    {/* Timer - prominent display */}
                    <div className="text-2xl font-mono font-bold">
                      ⏱ {formatTime(getElapsedSeconds(session))}
                    </div>
                  </div>

                  <div className="flex gap-2 flex-wrap sm:flex-col sm:items-end">
                    {session.status === 'pending' && (
                      <Button size="sm" onClick={() => handleStart(session)} disabled={updateSession.isPending}>
                        <Play className="h-4 w-4 mr-1" />
                        Start
                      </Button>
                    )}
                    {session.status === 'active' && (
                      <>
                        <Button size="sm" variant="outline" onClick={() => handlePause(session)} disabled={updateSession.isPending}>
                          <Pause className="h-4 w-4 mr-1" />
                          Pause
                        </Button>
                        <Button size="sm" variant="destructive" onClick={() => handleEnd(session)} disabled={updateSession.isPending}>
                          <Square className="h-4 w-4 mr-1" />
                          End
                        </Button>
                      </>
                    )}
                    {session.status === 'paused' && (
                      <>
                        <Button size="sm" onClick={() => handleResume(session)} disabled={updateSession.isPending}>
                          <Play className="h-4 w-4 mr-1" />
                          Resume
                        </Button>
                        <Button size="sm" variant="destructive" onClick={() => handleEnd(session)} disabled={updateSession.isPending}>
                          <Square className="h-4 w-4 mr-1" />
                          End
                        </Button>
                      </>
                    )}
                    <Button size="sm" variant="ghost" asChild>
                      <Link to={`/session/${session.id}`}>
                        <ExternalLink className="h-4 w-4" />
                      </Link>
                    </Button>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        )}

        {/* Sessions History */}
        <Card className={activeSessions.length > 0 ? "lg:col-span-2" : "lg:col-span-3"}>
          <CardHeader>
            <CardTitle>Session History</CardTitle>
            <CardDescription>All recorded studio sessions</CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="text-center py-8 text-muted-foreground">Loading sessions...</div>
            ) : sessions.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">No sessions found</div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Source</TableHead>
                    <TableHead>Studio</TableHead>
                    <TableHead>Holder</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Duration</TableHead>
                    <TableHead className="text-right">Est. Total</TableHead>
                    <TableHead className="text-right">Current</TableHead>
                    <TableHead></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sessions.map(session => {
                    const holder = getHolderInfo(session);
                    return (
                      <TableRow key={session.id} className="cursor-pointer hover:bg-muted/50" onClick={() => navigate(`/session/${session.id}`)}>
                        <TableCell>{format(new Date(session.created_at), 'MMM d, yyyy')}</TableCell>
                        <TableCell>{session.session_type === 'diy' ? 'DIY' : 'EXP'}</TableCell>
                        <TableCell>{getSourceBadge(session)}</TableCell>
                        <TableCell>{getStudioName(session)}</TableCell>
                        <TableCell>
                          {holder.name ? (
                            <div className="flex items-center gap-1.5">
                              <span className="truncate max-w-[120px]">{holder.name}</span>
                              {getHolderRoleBadge(holder.role)}
                            </div>
                          ) : (
                            <span className="text-muted-foreground">—</span>
                          )}
                        </TableCell>
                        <TableCell onClick={e => e.stopPropagation()}>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <div className="cursor-pointer">{getStatusBadge(session.status)}</div>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent className="bg-background">
                              <DropdownMenuItem onClick={() => handleStatusChange(session, 'pending')}>
                                ○ Pending
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => handleStatusChange(session, 'completed')}>
                                ✓ Completed
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => handleStatusChange(session, 'cancelled')}>
                                ✗ Cancelled
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                        <TableCell>
                          {session.actual_duration_seconds
                            ? formatDuration(session.actual_duration_seconds)
                            : session.status === 'active' || session.status === 'paused'
                            ? formatTime(getElapsedSeconds(session))
                            : '—'}
                        </TableCell>
                        <TableCell className="text-right text-muted-foreground">
                          {getEstimateTotal(session) != null
                            ? `$${getEstimateTotal(session)?.toFixed(2)}`
                            : '—'}
                        </TableCell>
                        <TableCell className="text-right font-medium">
                          {session.status === 'completed' && session.final_total != null
                            ? `$${session.final_total.toFixed(2)}`
                            : session.status === 'cancelled'
                            ? <span className="text-destructive">${((getEstimateTotal(session) ?? 0) * 0.25).toFixed(2)}</span>
                            : session.status === 'active' || session.status === 'paused'
                            ? <span className="text-primary">${(getCurrentTotal(session) ?? 0).toFixed(2)}</span>
                            : '—'}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1">
                            {/* Pause/Play/Stop controls for active/paused sessions */}
                            {session.status === 'active' && (
                              <>
                                <Button 
                                  size="sm" 
                                  variant="ghost" 
                                  onClick={e => { e.stopPropagation(); handlePause(session); }}
                                  title="Pause Session"
                                  disabled={updateSession.isPending}
                                >
                                  <Pause className="h-4 w-4" />
                                </Button>
                                <Button 
                                  size="sm" 
                                  variant="ghost"
                                  className="text-destructive"
                                  onClick={e => { e.stopPropagation(); handleEnd(session); }}
                                  title="End Session"
                                  disabled={updateSession.isPending}
                                >
                                  <Square className="h-4 w-4" />
                                </Button>
                              </>
                            )}
                            {session.status === 'paused' && (
                              <>
                                <Button 
                                  size="sm" 
                                  variant="ghost" 
                                  onClick={e => { e.stopPropagation(); handleResume(session); }}
                                  title="Resume Session"
                                  disabled={updateSession.isPending}
                                >
                                  <Play className="h-4 w-4" />
                                </Button>
                                <Button 
                                  size="sm" 
                                  variant="ghost"
                                  className="text-destructive"
                                  onClick={e => { e.stopPropagation(); handleEnd(session); }}
                                  title="End Session"
                                  disabled={updateSession.isPending}
                                >
                                  <Square className="h-4 w-4" />
                                </Button>
                              </>
                            )}
                            
                            {/* Invoice button for cancelled sessions */}
                            {session.status === 'cancelled' && (
                              <Button 
                                size="sm" 
                                variant="ghost" 
                                onClick={e => { e.stopPropagation(); setCheckoutSession(session); }}
                                title="Generate Invoice"
                              >
                                <FileText className="h-4 w-4" />
                              </Button>
                            )}
                            
                            {/* Checkout button for completed sessions (unpaid) */}
                            {session.status === 'completed' && session.payment_status !== 'paid' && (
                              <Button 
                                size="sm" 
                                variant="ghost"
                                className="text-green-600"
                                onClick={e => { e.stopPropagation(); setCheckoutSession(session); }}
                                title="Pay Now"
                              >
                                <CreditCard className="h-4 w-4" />
                              </Button>
                            )}
                            
                            <Button size="sm" variant="ghost" asChild onClick={e => e.stopPropagation()}>
                              <Link to={`/session/${session.id}`}>
                                <ExternalLink className="h-4 w-4" />
                              </Link>
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
        </div>
          </TabsContent>
        </Tabs>
      </div>
      
      {/* Square Checkout Modal */}
      {checkoutSession && (
        <SquareCheckoutModal
          open={!!checkoutSession}
          onClose={() => setCheckoutSession(null)}
          sessionId={checkoutSession.id}
          total={
            checkoutSession.status === 'cancelled'
              ? (getEstimateTotal(checkoutSession) ?? 0) * 0.25  // 25% cancellation fee
              : checkoutSession.final_total ?? getEstimateTotal(checkoutSession) ?? 0
          }
        />
      )}
    </div>
  );
}
