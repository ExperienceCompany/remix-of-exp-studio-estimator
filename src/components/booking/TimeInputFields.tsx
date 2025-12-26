import { useMemo } from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertCircle } from 'lucide-react';
import { StudioBooking } from '@/hooks/useStudioBookings';

interface TimeInputFieldsProps {
  startTime: string | null;
  endTime: string | null;
  onStartChange: (time: string) => void;
  onEndChange: (time: string) => void;
  operatingStart: string;
  operatingEnd: string;
  timeIncrement: number;
  bookings: StudioBooking[];
  minBookingHours?: number;
  maxBookingHours?: number;
  selectedDate: Date;
}

// Convert 24h time string to minutes
const timeToMinutes = (time: string): number => {
  const [hours, mins] = time.split(':').map(Number);
  return hours * 60 + mins;
};

// Convert minutes to 24h time string
const minutesToTime = (minutes: number): string => {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
};

// Format time for display (12h with AM/PM)
const formatTimeDisplay = (time: string): string => {
  const [hour, min] = time.split(':').map(Number);
  const ampm = hour >= 12 ? 'PM' : 'AM';
  const displayHour = hour % 12 || 12;
  return `${displayHour}:${min.toString().padStart(2, '0')} ${ampm}`;
};

// Calculate duration in human-readable format
const formatDuration = (startTime: string | null, endTime: string | null): string => {
  if (!startTime || !endTime) return '--';
  
  const startMins = timeToMinutes(startTime);
  const endMins = timeToMinutes(endTime);
  const diff = endMins - startMins;
  
  if (diff <= 0) return '--';
  
  const hours = Math.floor(diff / 60);
  const mins = diff % 60;
  
  if (hours === 0) return `${mins} min`;
  if (mins === 0) return hours === 1 ? '1 hr' : `${hours} hrs`;
  return `${hours} hr${hours > 1 ? 's' : ''} ${mins} min`;
};

export function TimeInputFields({
  startTime,
  endTime,
  onStartChange,
  onEndChange,
  operatingStart,
  operatingEnd,
  timeIncrement,
  bookings,
  minBookingHours = 1,
  maxBookingHours = 8,
  selectedDate,
}: TimeInputFieldsProps) {
  // Generate all available time slots
  const timeSlots = useMemo(() => {
    const slots: string[] = [];
    const startMins = timeToMinutes(operatingStart);
    const endMins = timeToMinutes(operatingEnd);
    
    for (let m = startMins; m <= endMins; m += timeIncrement) {
      slots.push(minutesToTime(m));
    }
    return slots;
  }, [operatingStart, operatingEnd, timeIncrement]);

  // Check if a time overlaps with any booking
  const isTimeBooked = (time: string): boolean => {
    const timeMins = timeToMinutes(time);
    return bookings.some((booking) => {
      const bookingStart = timeToMinutes(booking.start_time);
      const bookingEnd = timeToMinutes(booking.end_time);
      return timeMins >= bookingStart && timeMins < bookingEnd;
    });
  };

  // Check if a time is in the past (for today)
  const isTimePast = (time: string): boolean => {
    const now = new Date();
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const selected = new Date(selectedDate);
    selected.setHours(0, 0, 0, 0);
    
    if (selected.getTime() > today.getTime()) return false;
    if (selected.getTime() < today.getTime()) return true;
    
    // Same day - check time
    const [hour, min] = time.split(':').map(Number);
    const slotTime = new Date(selectedDate);
    slotTime.setHours(hour, min, 0, 0);
    return slotTime <= now;
  };

  // Validation errors
  const validationError = useMemo(() => {
    if (!startTime || !endTime) return null;

    const startMins = timeToMinutes(startTime);
    const endMins = timeToMinutes(endTime);
    const durationHours = (endMins - startMins) / 60;

    if (endMins <= startMins) {
      return 'End time must be after start time';
    }

    if (durationHours < minBookingHours) {
      return `Minimum booking is ${minBookingHours} hour${minBookingHours > 1 ? 's' : ''}`;
    }

    if (durationHours > maxBookingHours) {
      return `Maximum booking is ${maxBookingHours} hours`;
    }

    // Check for overlapping bookings
    for (const booking of bookings) {
      const bookingStart = timeToMinutes(booking.start_time);
      const bookingEnd = timeToMinutes(booking.end_time);
      
      // Check if the selected range overlaps with this booking
      if (startMins < bookingEnd && endMins > bookingStart) {
        return 'Selected time overlaps with an existing booking';
      }
    }

    return null;
  }, [startTime, endTime, bookings, minBookingHours, maxBookingHours]);

  // Filter available end times based on selected start
  const availableEndSlots = useMemo(() => {
    if (!startTime) return timeSlots;
    
    const startMins = timeToMinutes(startTime);
    return timeSlots.filter(slot => timeToMinutes(slot) > startMins);
  }, [startTime, timeSlots]);

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-3 gap-4">
        {/* Start Time */}
        <div className="space-y-2">
          <Label htmlFor="start-time" className="text-sm font-medium">
            Start Time
          </Label>
          <Select value={startTime || ''} onValueChange={onStartChange}>
            <SelectTrigger id="start-time" className="w-full">
              <SelectValue placeholder="Select start" />
            </SelectTrigger>
            <SelectContent className="max-h-60 bg-popover">
              {timeSlots.map((slot) => {
                const isPast = isTimePast(slot);
                const isBooked = isTimeBooked(slot);
                const isDisabled = isPast || isBooked;
                
                return (
                  <SelectItem 
                    key={slot} 
                    value={slot}
                    disabled={isDisabled}
                    className={isDisabled ? 'text-muted-foreground' : ''}
                  >
                    {formatTimeDisplay(slot)}
                    {isBooked && ' (Booked)'}
                    {isPast && !isBooked && ' (Past)'}
                  </SelectItem>
                );
              })}
            </SelectContent>
          </Select>
        </div>

        {/* End Time */}
        <div className="space-y-2">
          <Label htmlFor="end-time" className="text-sm font-medium">
            End Time
          </Label>
          <Select 
            value={endTime || ''} 
            onValueChange={onEndChange}
            disabled={!startTime}
          >
            <SelectTrigger id="end-time" className="w-full">
              <SelectValue placeholder={startTime ? "Select end" : "Select start first"} />
            </SelectTrigger>
            <SelectContent className="max-h-60 bg-popover">
              {availableEndSlots.map((slot) => {
                const isBooked = isTimeBooked(slot);
                
                return (
                  <SelectItem 
                    key={slot} 
                    value={slot}
                    className={isBooked ? 'text-muted-foreground' : ''}
                  >
                    {formatTimeDisplay(slot)}
                    {isBooked && ' (Booked)'}
                  </SelectItem>
                );
              })}
            </SelectContent>
          </Select>
        </div>

        {/* Duration Display */}
        <div className="space-y-2">
          <Label className="text-sm font-medium">Duration</Label>
          <div className="h-10 px-3 py-2 rounded-md border border-input bg-muted/50 text-sm flex items-center">
            {formatDuration(startTime, endTime)}
          </div>
        </div>
      </div>

      {/* Validation Error */}
      {validationError && (
        <Alert variant="destructive" className="py-2">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription className="text-sm">
            {validationError}
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
}
