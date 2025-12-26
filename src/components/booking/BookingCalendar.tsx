import { useState, useMemo } from 'react';
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
  ChevronLeft,
  ChevronRight,
  Calendar,
  LayoutGrid,
  List,
  Columns,
} from 'lucide-react';
import { format, addMonths, subMonths, addWeeks, subWeeks, addDays, subDays, startOfMonth, endOfMonth, startOfWeek, endOfWeek } from 'date-fns';
import { useStudios, useDiyRates } from '@/hooks/useEstimatorData';
import { useStudioBookings } from '@/hooks/useStudioBookings';
import { useCalendarSettings } from '@/hooks/useCalendarSettings';
import { MonthView } from './views/MonthView';
import { DayView } from './views/DayView';
import { GridView } from './views/GridView';
import { ListView } from './views/ListView';
import type { StudioBooking } from '@/hooks/useStudioBookings';

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

  const { data: studios = [] } = useStudios();
  const { data: diyRates = [] } = useDiyRates();
  const { data: calendarSettings = [] } = useCalendarSettings();
  
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
      case 'list':
      default: {
        const start = format(currentDate, 'yyyy-MM-dd');
        const end = format(addDays(currentDate, 30), 'yyyy-MM-dd');
        return { start, end };
      }
    }
  }, [viewMode, currentDate]);

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

  return (
    <Card className="w-full">
      <CardHeader className="pb-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          {/* View Switcher */}
          <div className="flex items-center gap-1 border rounded-lg p-1">
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
            <CardTitle className="text-lg min-w-[200px]">{getTitle()}</CardTitle>
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
            onBookingClick={onBookingClick}
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
            onSlotClick={(studioId, time) => onDateSelect?.(currentDate, studioId)}
            onBookingClick={onBookingClick}
            onBookingCreate={(studioIds, startTime, endTime, cost) => 
              onBookingCreate?.(currentDate, studioIds, startTime, endTime, cost)
            }
          />
        )}
        {viewMode === 'grid' && (
          <GridView
            currentDate={currentDate}
            bookings={allBookings}
            studios={filterStudioId === 'all' ? activeStudios : activeStudios.filter(s => s.id === filterStudioId)}
            onDateClick={handleDateClick}
            onBookingClick={onBookingClick}
          />
        )}
        {viewMode === 'list' && (
          <ListView
            currentDate={currentDate}
            bookings={allBookings}
            studios={activeStudios}
            onBookingClick={onBookingClick}
          />
        )}
      </CardContent>
    </Card>
  );
}
