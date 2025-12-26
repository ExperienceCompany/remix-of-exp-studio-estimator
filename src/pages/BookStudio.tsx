import { useState, useMemo } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calendar } from '@/components/ui/calendar';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, CalendarDays, ChevronRight } from 'lucide-react';
import { useStudios } from '@/hooks/useEstimatorData';
import { useCalendarSettingsByStudio } from '@/hooks/useCalendarSettings';
import { useStudioBookings, useBlockedDates } from '@/hooks/useStudioBookings';
import { TimeSlotGrid } from '@/components/booking/TimeSlotGrid';
import { BookingForm } from '@/components/booking/BookingForm';
import { format, addDays, startOfDay, isSameDay } from 'date-fns';
import { cn } from '@/lib/utils';

type BookingStep = 'select-studio' | 'select-date' | 'select-time' | 'booking-form' | 'confirmation';

export default function BookStudio() {
  const { studioType } = useParams<{ studioType?: string }>();
  const navigate = useNavigate();
  
  const { data: studios, isLoading: studiosLoading } = useStudios();
  
  const [step, setStep] = useState<BookingStep>('select-studio');
  const [selectedStudioId, setSelectedStudioId] = useState<string>('');
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(undefined);
  const [selectedStartTime, setSelectedStartTime] = useState<string | null>(null);
  const [selectedEndTime, setSelectedEndTime] = useState<string | null>(null);

  const { data: settings } = useCalendarSettingsByStudio(selectedStudioId);
  
  // Calculate date range for bookings query
  const startDate = selectedDate ? format(selectedDate, 'yyyy-MM-dd') : undefined;
  const endDate = selectedDate ? format(selectedDate, 'yyyy-MM-dd') : undefined;
  
  const { data: bookings = [] } = useStudioBookings(selectedStudioId, startDate, endDate);
  const { data: blockedDates = [] } = useBlockedDates(selectedStudioId);

  // Pre-select studio from URL param
  useMemo(() => {
    if (studioType && studios?.length && !selectedStudioId) {
      const matchedStudio = studios.find(s => 
        s.type === studioType || s.name.toLowerCase().includes(studioType.replace('-', ' '))
      );
      if (matchedStudio) {
        setSelectedStudioId(matchedStudio.id);
        setStep('select-date');
      }
    }
  }, [studioType, studios, selectedStudioId]);

  const selectedStudio = studios?.find(s => s.id === selectedStudioId);

  // Check if a date is blocked
  const isDateBlocked = (date: Date) => {
    return blockedDates.some(bd => 
      isSameDay(new Date(bd.blocked_date), date)
    );
  };

  // Calculate max booking date
  const maxDate = settings ? addDays(new Date(), settings.advance_booking_days) : addDays(new Date(), 30);

  const handleStudioSelect = (studioId: string) => {
    setSelectedStudioId(studioId);
    setSelectedDate(undefined);
    setSelectedStartTime(null);
    setSelectedEndTime(null);
    setStep('select-date');
  };

  const handleDateSelect = (date: Date | undefined) => {
    setSelectedDate(date);
    setSelectedStartTime(null);
    setSelectedEndTime(null);
    if (date) {
      setStep('select-time');
    }
  };

  const handleTimeSlotClick = (time: string) => {
    if (!selectedStartTime) {
      // First click - set start time
      setSelectedStartTime(time);
      setSelectedEndTime(null);
    } else if (!selectedEndTime) {
      // Second click - set end time
      const [startHour, startMin] = selectedStartTime.split(':').map(Number);
      const [clickHour, clickMin] = time.split(':').map(Number);
      const startMinutes = startHour * 60 + startMin;
      const clickMinutes = clickHour * 60 + clickMin;

      if (clickMinutes <= startMinutes) {
        // If clicked before or on start, reset to new start
        setSelectedStartTime(time);
        setSelectedEndTime(null);
      } else {
        // Set end time (add increment to include full slot)
        const endMinutes = clickMinutes + (settings?.time_increment_minutes || 15);
        const endHour = Math.floor(endMinutes / 60);
        const endMin = endMinutes % 60;
        setSelectedEndTime(`${endHour.toString().padStart(2, '0')}:${endMin.toString().padStart(2, '0')}`);
      }
    } else {
      // Third click - reset
      setSelectedStartTime(time);
      setSelectedEndTime(null);
    }
  };

  const handleContinueToForm = () => {
    if (selectedStartTime && selectedEndTime) {
      setStep('booking-form');
    }
  };

  const handleBookingSuccess = () => {
    setStep('confirmation');
    // Reset after a delay
    setTimeout(() => {
      navigate('/book');
    }, 3000);
  };

  const formatTimeDisplay = (time: string) => {
    const [hour, min] = time.split(':').map(Number);
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const displayHour = hour % 12 || 12;
    return `${displayHour}:${min.toString().padStart(2, '0')} ${ampm}`;
  };

  if (studiosLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-pulse text-muted-foreground">Loading...</div>
      </div>
    );
  }

  const activeStudios = studios?.filter(s => s.is_active) || [];

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-card sticky top-0 z-50">
        <div className="container flex h-14 items-center justify-between">
          <Link to="/" className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Link>
          <span className="font-semibold">Book a Studio</span>
          <div className="w-16" />
        </div>
      </header>

      <section className="container py-6 max-w-3xl mx-auto">
        {/* Progress Steps */}
        <div className="flex items-center gap-2 mb-6 text-sm">
          <Badge variant={step === 'select-studio' ? 'default' : 'secondary'}>
            1. Studio
          </Badge>
          <ChevronRight className="h-4 w-4 text-muted-foreground" />
          <Badge variant={step === 'select-date' ? 'default' : selectedDate ? 'secondary' : 'outline'}>
            2. Date
          </Badge>
          <ChevronRight className="h-4 w-4 text-muted-foreground" />
          <Badge variant={step === 'select-time' ? 'default' : selectedEndTime ? 'secondary' : 'outline'}>
            3. Time
          </Badge>
          <ChevronRight className="h-4 w-4 text-muted-foreground" />
          <Badge variant={step === 'booking-form' ? 'default' : 'outline'}>
            4. Details
          </Badge>
        </div>

        {/* Step 1: Select Studio */}
        {step === 'select-studio' && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CalendarDays className="h-5 w-5" />
                Select a Studio
              </CardTitle>
              <CardDescription>
                Choose which studio you'd like to book
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {activeStudios.map((studio) => (
                <Button
                  key={studio.id}
                  variant="outline"
                  className="w-full justify-start h-auto py-4"
                  onClick={() => handleStudioSelect(studio.id)}
                >
                  <div className="text-left">
                    <div className="font-medium">{studio.name}</div>
                    {studio.description && (
                      <div className="text-sm text-muted-foreground">{studio.description}</div>
                    )}
                  </div>
                </Button>
              ))}
            </CardContent>
          </Card>
        )}

        {/* Step 2: Select Date */}
        {step === 'select-date' && selectedStudio && (
          <Card>
            <CardHeader>
              <CardTitle>Select a Date</CardTitle>
              <CardDescription>
                {selectedStudio.name} • Choose your preferred date
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex justify-center">
                <Calendar
                  mode="single"
                  selected={selectedDate}
                  onSelect={handleDateSelect}
                  disabled={(date) => 
                    date < startOfDay(new Date()) || 
                    date > maxDate ||
                    isDateBlocked(date)
                  }
                  className="rounded-md border pointer-events-auto"
                />
              </div>
              
              <div className="flex justify-between mt-4">
                <Button variant="outline" onClick={() => setStep('select-studio')}>
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Change Studio
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Step 3: Select Time */}
        {step === 'select-time' && selectedStudio && selectedDate && settings && (
          <Card>
            <CardHeader>
              <CardTitle>Select Time</CardTitle>
              <CardDescription>
                {selectedStudio.name} • {format(selectedDate, 'EEEE, MMMM d, yyyy')}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex flex-wrap gap-2 text-xs text-muted-foreground mb-4">
                <div className="flex items-center gap-1">
                  <div className="w-3 h-3 rounded bg-primary" />
                  Selected
                </div>
                <div className="flex items-center gap-1">
                  <div className="w-3 h-3 rounded bg-destructive/20 border border-destructive/30" />
                  Booked
                </div>
                <div className="flex items-center gap-1">
                  <div className="w-3 h-3 rounded bg-muted border" />
                  Unavailable
                </div>
              </div>

              <TimeSlotGrid
                date={selectedDate}
                settings={settings}
                bookings={bookings}
                selectedStart={selectedStartTime}
                selectedEnd={selectedEndTime}
                onSlotClick={handleTimeSlotClick}
                isBlocked={isDateBlocked(selectedDate)}
              />

              {selectedStartTime && (
                <div className="border-t pt-4 mt-4">
                  <p className="text-sm text-muted-foreground mb-2">
                    {selectedEndTime 
                      ? `Selected: ${formatTimeDisplay(selectedStartTime)} – ${formatTimeDisplay(selectedEndTime)}`
                      : `Start: ${formatTimeDisplay(selectedStartTime)} (click another slot to set end time)`
                    }
                  </p>
                  {settings.min_booking_hours && selectedEndTime && (
                    <p className="text-xs text-muted-foreground">
                      Min booking: {settings.min_booking_hours} hour(s)
                    </p>
                  )}
                </div>
              )}

              <div className="flex justify-between pt-4">
                <Button variant="outline" onClick={() => setStep('select-date')}>
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Change Date
                </Button>
                <Button 
                  onClick={handleContinueToForm}
                  disabled={!selectedStartTime || !selectedEndTime}
                >
                  Continue
                  <ChevronRight className="h-4 w-4 ml-2" />
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Step 4: Booking Form */}
        {step === 'booking-form' && selectedStudio && selectedDate && selectedStartTime && selectedEndTime && (
          <BookingForm
            studioId={selectedStudioId}
            studioName={selectedStudio.name}
            date={selectedDate}
            startTime={selectedStartTime}
            endTime={selectedEndTime}
            onSuccess={handleBookingSuccess}
            onCancel={() => setStep('select-time')}
          />
        )}
      </section>
    </div>
  );
}
