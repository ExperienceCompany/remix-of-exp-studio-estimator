import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  ChevronLeft,
  ChevronRight,
  Calendar,
  LayoutGrid,
  List,
  Columns,
  Plus,
  Pencil,
} from 'lucide-react';
import { NewBookingModal } from './NewBookingModal';
import { format, addMonths, subMonths, addWeeks, subWeeks, addDays, subDays, startOfMonth, endOfMonth, startOfWeek, endOfWeek } from 'date-fns';
import { useStudios, useDiyRates } from '@/hooks/useEstimatorData';
import { useStudioBookings, useCancelBooking, useCancelSeriesFromDate, useCancelEntireSeries } from '@/hooks/useStudioBookings';
import { useCalendarSettings } from '@/hooks/useCalendarSettings';
import { useSharedStudioGroups } from '@/hooks/useSharedStudioGroups';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { MonthView } from './views/MonthView';
import { DayView } from './views/DayView';
import { GridView } from './views/GridView';
import { ListView } from './views/ListView';
import type { StudioBooking } from '@/hooks/useStudioBookings';

interface ModalPrefill {
  date: Date;
  studioIds: string[];
  startTime?: string;
  endTime?: string;
}

type ViewMode = 'month' | 'day' | 'grid' | 'list';

interface BookingCalendarProps {
  onDateSelect?: (date: Date, studioId?: string) => void;
  onBookingClick?: (booking: StudioBooking) => void;
  onBookingCreate?: (date: Date, studioIds: string[], startTime: string, endTime: string, estimatedCost: number) => void;
  initialDate?: Date;
  selectedStudioId?: string;
}

export function BookingCalendar({
  onDateSelect,
  onBookingClick,
  onBookingCreate,
  initialDate,
  selectedStudioId,
}: BookingCalendarProps) {
  const [viewMode, setViewMode] = useState<ViewMode>('month');
  const [currentDate, setCurrentDate] = useState(initialDate || new Date());
  const [filterStudioId, setFilterStudioId] = useState<string>(selectedStudioId || 'all');
  const [showNewBookingModal, setShowNewBookingModal] = useState(false);
  const [modalPrefill, setModalPrefill] = useState<ModalPrefill | null>(null);
  const [editingBooking, setEditingBooking] = useState<StudioBooking | null>(null);
  const [duplicatingFrom, setDuplicatingFrom] = useState<StudioBooking | null>(null);
  const [clearPendingTrigger, setClearPendingTrigger] = useState(0);
  const [pendingDurationUpdate, setPendingDurationUpdate] = useState<{ studioIds: string[]; startTime: string; endTime: string } | null>(null);
  
  // Cancel confirmation state
  const [cancelConfirm, setCancelConfirm] = useState<{
    booking: StudioBooking;
    scope: 'occurrence' | 'from_here' | 'series';
  } | null>(null);
  
  // Edit scope selection state for repeat bookings
  const [pendingEditBooking, setPendingEditBooking] = useState<StudioBooking | null>(null);
  const [editScope, setEditScope] = useState<'occurrence' | 'from_here' | 'series' | null>(null);
  
  // List view date range state
  const [listStartDate, setListStartDate] = useState<Date>(new Date());
  const [listEndDate, setListEndDate] = useState<Date>(addDays(new Date(), 14));

  const navigate = useNavigate();
  const { isAuthenticated, isStaff } = useAuth();
  const { toast } = useToast();
  const { data: studios = [] } = useStudios();
  const { data: diyRates = [] } = useDiyRates();
  const { data: calendarSettings = [] } = useCalendarSettings();
  const { data: sharedStudioGroups = [] } = useSharedStudioGroups();
  
  // Cancel mutations
  const cancelBooking = useCancelBooking();
  const cancelSeriesFromDate = useCancelSeriesFromDate();
  const cancelEntireSeries = useCancelEntireSeries();
  
  const activeStudios = useMemo(
    () => studios.filter((s) => s.is_active),
    [studios]
  );

  // Get default operating hours from first active calendar setting
  const defaultSettings = useMemo(() => {
    const setting = calendarSettings.find(s => s.is_active);
    return {
      operatingStart: setting?.operating_start_time || '10:00',
      operatingEnd: setting?.operating_end_time || '22:00',
      bufferMinutes: setting?.buffer_minutes || 15,
    };
  }, [calendarSettings]);

  // Calculate date range for fetching bookings based on view
  const dateRange = useMemo(() => {
    switch (viewMode) {
      case 'month': {
        const start = startOfWeek(startOfMonth(currentDate));
        const end = endOfWeek(endOfMonth(currentDate));
        return { start: format(start, 'yyyy-MM-dd'), end: format(end, 'yyyy-MM-dd') };
      }
      case 'day': {
        const dateStr = format(currentDate, 'yyyy-MM-dd');
        return { start: dateStr, end: dateStr };
      }
      case 'grid': {
        const start = startOfWeek(currentDate);
        const end = endOfWeek(currentDate);
        return { start: format(start, 'yyyy-MM-dd'), end: format(end, 'yyyy-MM-dd') };
      }
      case 'list': {
        // Use the list-specific date range for fetching
        return { 
          start: format(listStartDate, 'yyyy-MM-dd'), 
          end: format(listEndDate, 'yyyy-MM-dd') 
        };
      }
      default:
        return { start: format(currentDate, 'yyyy-MM-dd'), end: format(addDays(currentDate, 30), 'yyyy-MM-dd') };
    }
  }, [viewMode, currentDate, listStartDate, listEndDate]);

  const { data: allBookings = [] } = useStudioBookings(
    filterStudioId === 'all' ? undefined : filterStudioId,
    dateRange.start,
    dateRange.end
  );

  const handleNavigate = (direction: 'prev' | 'next' | 'today') => {
    if (direction === 'today') {
      setCurrentDate(new Date());
      return;
    }

    switch (viewMode) {
      case 'month':
        setCurrentDate(direction === 'prev' ? subMonths(currentDate, 1) : addMonths(currentDate, 1));
        break;
      case 'day':
        setCurrentDate(direction === 'prev' ? subDays(currentDate, 1) : addDays(currentDate, 1));
        break;
      case 'grid':
        setCurrentDate(direction === 'prev' ? subWeeks(currentDate, 1) : addWeeks(currentDate, 1));
        break;
      case 'list':
        setCurrentDate(direction === 'prev' ? subWeeks(currentDate, 2) : addWeeks(currentDate, 2));
        break;
    }
  };

  const getTitle = () => {
    switch (viewMode) {
      case 'month':
        return format(currentDate, 'MMMM yyyy');
      case 'day':
        return format(currentDate, 'EEEE, MMMM d, yyyy');
      case 'grid':
        return `Week of ${format(startOfWeek(currentDate), 'MMM d, yyyy')}`;
      case 'list':
        return `From ${format(currentDate, 'MMM d, yyyy')}`;
    }
  };

  const handleDateClick = (date: Date, studioId?: string) => {
    if (viewMode === 'month') {
      setCurrentDate(date);
      setViewMode('day');
    }
    onDateSelect?.(date, studioId);
  };

  // Open modal from slot click (Month/Grid views)
  const handleOpenModalFromSlot = (date: Date, studioId?: string) => {
    setModalPrefill({
      date,
      studioIds: studioId ? [studioId] : [],
    });
    setEditingBooking(null);
    setShowNewBookingModal(true);
  };

  // Open modal for editing existing booking (admin only)
  const handleBookingClickForEdit = (booking: StudioBooking) => {
    if (isStaff) {
      // If it's a repeat booking, show scope selection first
      if (booking.repeat_series_id) {
        setPendingEditBooking(booking);
        // Dialog will open based on pendingEditBooking being set
      } else {
        // Non-repeat booking: open edit modal directly
        setEditingBooking(booking);
        setEditScope('occurrence');
        setModalPrefill(null);
        setShowNewBookingModal(true);
      }
    }
    onBookingClick?.(booking);
  };

  // Handle edit scope selection for repeat bookings
  const handleEditScopeSelection = (scope: 'occurrence' | 'from_here' | 'series') => {
    if (pendingEditBooking) {
      setEditScope(scope);
      setEditingBooking(pendingEditBooking);
      setModalPrefill(null);
      setShowNewBookingModal(true);
      setPendingEditBooking(null);
    }
  };

  // Open modal from DayView with prefilled data
  const handleOpenModalFromDayView = (studioIds: string[], startTime: string, endTime: string) => {
    setModalPrefill({
      date: currentDate,
      studioIds,
      startTime,
      endTime,
    });
    setEditingBooking(null);
    setShowNewBookingModal(true);
  };

  const handleCloseModal = () => {
    setShowNewBookingModal(false);
    setEditingBooking(null);
    setDuplicatingFrom(null);
    setModalPrefill(null);
    setEditScope(null);
  };

  // Duplicate booking - prefill modal with booking data for new booking
  const handleDuplicateBooking = (booking: StudioBooking) => {
    setDuplicatingFrom(booking);
    setModalPrefill({
      date: new Date(booking.booking_date),
      studioIds: [booking.studio_id],
      startTime: booking.start_time,
      endTime: booking.end_time,
    });
    setEditingBooking(null);
    setShowNewBookingModal(true);
  };

  // Cancel booking with scope
  const handleCancelBooking = (booking: StudioBooking, scope: 'occurrence' | 'from_here' | 'series') => {
    setCancelConfirm({ booking, scope });
  };

  // Execute cancel after confirmation
  const executeCancelBooking = async () => {
    if (!cancelConfirm) return;
    
    const { booking, scope } = cancelConfirm;
    
    try {
      if (scope === 'occurrence') {
        await cancelBooking.mutateAsync(booking.id);
        toast({
          title: 'Booking cancelled',
          description: 'The booking has been cancelled.',
        });
      } else if (scope === 'from_here' && booking.repeat_series_id) {
        await cancelSeriesFromDate.mutateAsync({
          seriesId: booking.repeat_series_id,
          fromDate: booking.booking_date,
        });
        toast({
          title: 'Series cancelled',
          description: 'This and all following bookings have been cancelled.',
        });
      } else if (scope === 'series' && booking.repeat_series_id) {
        await cancelEntireSeries.mutateAsync(booking.repeat_series_id);
        toast({
          title: 'Series cancelled',
          description: 'The entire booking series has been cancelled.',
        });
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to cancel booking',
        variant: 'destructive',
      });
    }
    
    setCancelConfirm(null);
  };

  const getCancelDescription = () => {
    if (!cancelConfirm) return '';
    const { booking, scope } = cancelConfirm;
    const title = booking.title || booking.customer_name || 'this booking';
    
    if (scope === 'occurrence') {
      return `Are you sure you want to cancel "${title}" on ${format(new Date(booking.booking_date), 'MMMM d, yyyy')}?`;
    } else if (scope === 'from_here') {
      return `Are you sure you want to cancel "${title}" on ${format(new Date(booking.booking_date), 'MMMM d')} and all following occurrences in this series?`;
    } else {
      return `Are you sure you want to cancel the entire "${title}" repeat series? This will cancel all occurrences.`;
    }
  };

  return (
    <div className="relative">
      <Card className="w-full">
        <CardHeader className="pb-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            {/* View Switcher */}
            <div className="flex flex-wrap items-center gap-1 border rounded-lg p-1">
              <Button
                variant={viewMode === 'day' ? 'secondary' : 'ghost'}
                size="sm"
                onClick={() => setViewMode('day')}
                className="h-8"
              >
                <Columns className="h-4 w-4 mr-1" />
                Day
              </Button>
              <Button
                variant={viewMode === 'month' ? 'secondary' : 'ghost'}
                size="sm"
                onClick={() => setViewMode('month')}
                className="h-8"
              >
                <Calendar className="h-4 w-4 mr-1" />
                Month
              </Button>
              <Button
                variant={viewMode === 'grid' ? 'secondary' : 'ghost'}
                size="sm"
                onClick={() => setViewMode('grid')}
                className="h-8"
              >
                <LayoutGrid className="h-4 w-4 mr-1" />
                Grid
              </Button>
              <Button
                variant={viewMode === 'list' ? 'secondary' : 'ghost'}
                size="sm"
                onClick={() => setViewMode('list')}
                className="h-8"
              >
                <List className="h-4 w-4 mr-1" />
                List
              </Button>
            </div>

            {/* Navigation */}
            <div className="flex flex-col sm:flex-row sm:items-center gap-2">
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleNavigate('today')}
                >
                  Today
                </Button>
                <div className="flex items-center gap-1">
                  <Button
                    variant="outline"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => handleNavigate('prev')}
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => handleNavigate('next')}
                  >
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
              <CardTitle className="text-lg">{getTitle()}</CardTitle>
            </div>

            {/* Studio Filter */}
            <Select value={filterStudioId} onValueChange={setFilterStudioId}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="All Studios" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Studios</SelectItem>
                {activeStudios.map((studio) => (
                  <SelectItem key={studio.id} value={studio.id}>
                    {studio.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent>
          {viewMode === 'month' && (
            <MonthView
              currentDate={currentDate}
              bookings={allBookings}
              studios={activeStudios}
              onDateClick={handleDateClick}
              onSlotClick={handleOpenModalFromSlot}
              onBookingClick={handleBookingClickForEdit}
              onDuplicateBooking={handleDuplicateBooking}
              onCancelBooking={handleCancelBooking}
            />
          )}
          {viewMode === 'day' && (
            <DayView
              currentDate={currentDate}
              bookings={allBookings}
              studios={filterStudioId === 'all' ? activeStudios : activeStudios.filter(s => s.id === filterStudioId)}
              operatingStart={defaultSettings.operatingStart}
              operatingEnd={defaultSettings.operatingEnd}
              bufferMinutes={defaultSettings.bufferMinutes}
              diyRates={diyRates}
              sharedStudioGroups={sharedStudioGroups}
              calendarSettings={calendarSettings}
              onSlotClick={(studioId, time) => onDateSelect?.(currentDate, studioId)}
              onBookingClick={handleBookingClickForEdit}
              onOpenBookingModal={handleOpenModalFromDayView}
              clearPendingTrigger={clearPendingTrigger}
              externalPendingUpdate={pendingDurationUpdate}
              onDuplicateBooking={handleDuplicateBooking}
              onCancelBooking={handleCancelBooking}
            />
          )}
          {viewMode === 'grid' && (
            <GridView
              currentDate={currentDate}
              bookings={allBookings}
              studios={filterStudioId === 'all' ? activeStudios : activeStudios.filter(s => s.id === filterStudioId)}
              onDateClick={handleDateClick}
              onSlotClick={handleOpenModalFromSlot}
              onBookingClick={handleBookingClickForEdit}
              onDuplicateBooking={handleDuplicateBooking}
              onCancelBooking={handleCancelBooking}
            />
          )}
          {viewMode === 'list' && (
            <ListView
              currentDate={currentDate}
              bookings={allBookings}
              studios={activeStudios}
              onBookingClick={handleBookingClickForEdit}
              startDate={listStartDate}
              endDate={listEndDate}
              onDateRangeChange={(start, end) => {
                setListStartDate(start);
                setListEndDate(end);
              }}
              onDuplicateBooking={handleDuplicateBooking}
              onCancelBooking={handleCancelBooking}
            />
          )}
        </CardContent>
      </Card>

      {/* Floating Action Button - Visible to all, prompts auth for unauthenticated */}
      <Button
        onClick={() => {
          if (!isAuthenticated) {
            navigate('/auth?redirect=/book');
            return;
          }
          setModalPrefill(null);
          setEditingBooking(null);
          setShowNewBookingModal(true);
        }}
        className="fixed bottom-6 right-6 h-14 w-14 rounded-full shadow-lg z-50"
        size="icon"
      >
        <Plus className="h-6 w-6" />
      </Button>

      {/* New Booking Modal - Only render for authenticated users */}
      {isAuthenticated && (
        <NewBookingModal
          open={showNewBookingModal}
          onClose={handleCloseModal}
          studios={activeStudios}
          diyRates={diyRates}
          defaultDate={modalPrefill?.date || currentDate}
          defaultStudioIds={modalPrefill?.studioIds}
          defaultStartTime={modalPrefill?.startTime}
          defaultEndTime={modalPrefill?.endTime}
          existingBooking={editingBooking}
          duplicatingFrom={duplicatingFrom}
          operatingStart={defaultSettings.operatingStart}
          operatingEnd={defaultSettings.operatingEnd}
          editScope={editScope}
          onBookingCreated={() => {
            setClearPendingTrigger(prev => prev + 1);
            setPendingDurationUpdate(null);
            handleCloseModal();
          }}
          onDurationChange={(studioIds, startTime, endTime) => {
            setPendingDurationUpdate({ studioIds, startTime, endTime });
          }}
        />
      )}

      {/* Edit Scope Selection Dialog for Repeat Bookings */}
      <Dialog open={!!pendingEditBooking} onOpenChange={(open) => !open && setPendingEditBooking(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <div className="flex items-center gap-2">
              <Pencil className="h-5 w-5" />
              <DialogTitle>Edit {pendingEditBooking?.booking_type} booking</DialogTitle>
            </div>
          </DialogHeader>
          
          <div className="py-4">
            <p className="text-muted-foreground mb-4">
              This is a repeating booking. What would you like to edit?
            </p>
            
            <div className="flex flex-col gap-2">
              <Button
                variant="outline"
                className="justify-center py-6"
                onClick={() => handleEditScopeSelection('occurrence')}
              >
                This occurrence
              </Button>
              <Button
                variant="outline"
                className="justify-center py-6"
                onClick={() => handleEditScopeSelection('from_here')}
              >
                This and following
              </Button>
              <Button
                variant="outline"
                className="justify-center py-6"
                onClick={() => handleEditScopeSelection('series')}
              >
                The full series
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Cancel Confirmation Dialog */}
      <AlertDialog open={!!cancelConfirm} onOpenChange={(open) => !open && setCancelConfirm(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Cancel Booking</AlertDialogTitle>
            <AlertDialogDescription>
              {getCancelDescription()}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Keep Booking</AlertDialogCancel>
            <AlertDialogAction 
              onClick={executeCancelBooking}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Cancel Booking
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
