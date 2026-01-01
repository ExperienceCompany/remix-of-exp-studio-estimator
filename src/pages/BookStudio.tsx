import { useState, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, ChevronRight } from 'lucide-react';
import { useStudios } from '@/hooks/useEstimatorData';
import { useCalendarSettingsByStudio } from '@/hooks/useCalendarSettings';
import { useStudioBookings, useBlockedDates } from '@/hooks/useStudioBookings';
import { TimeSlotGrid } from '@/components/booking/TimeSlotGrid';
import { TimeInputFields } from '@/components/booking/TimeInputFields';
import { BookingForm } from '@/components/booking/BookingForm';
import { BookingCalendar } from '@/components/booking/BookingCalendar';
import { format, isSameDay } from 'date-fns';

type BookingStep = 'calendar-view' | 'select-time' | 'booking-form' | 'confirmation';

export default function BookStudio() {
  const navigate = useNavigate();
  
  const { data: studios, isLoading: studiosLoading } = useStudios();
  
  const [step, setStep] = useState<BookingStep>('calendar-view');
  const [selectedStudioIds, setSelectedStudioIds] = useState<string[]>([]);
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(undefined);
  const [selectedStartTime, setSelectedStartTime] = useState<string | null>(null);
  const [selectedEndTime, setSelectedEndTime] = useState<string | null>(null);
  const [estimatedCost, setEstimatedCost] = useState<number>(0);

  // Use first selected studio for settings (they should be consistent)
  const primaryStudioId = selectedStudioIds[0] || '';
  const { data: settings } = useCalendarSettingsByStudio(primaryStudioId);
  
  // Calculate date range for bookings query
  const startDate = selectedDate ? format(selectedDate, 'yyyy-MM-dd') : undefined;
  const endDate = selectedDate ? format(selectedDate, 'yyyy-MM-dd') : undefined;
  
  const { data: bookings = [] } = useStudioBookings(primaryStudioId, startDate, endDate);
  const { data: blockedDates = [] } = useBlockedDates(primaryStudioId);

  const selectedStudios = studios?.filter(s => selectedStudioIds.includes(s.id)) || [];
  const activeStudios = studios?.filter(s => s.is_active) || [];

  // Check if a date is blocked
  const isDateBlocked = (date: Date) => {
    return blockedDates.some(bd => 
      isSameDay(new Date(bd.blocked_date), date)
    );
  };

  // Handle calendar date/studio selection
  const handleCalendarSelect = (date: Date, studioId?: string) => {
    setSelectedDate(date);
    if (studioId) {
      setSelectedStudioIds([studioId]);
    }
    setSelectedStartTime(null);
    setSelectedEndTime(null);
    
    // If we have both date and studio, move to time selection
    if (studioId || selectedStudioIds.length > 0) {
      setStep('select-time');
    }
  };

  // Handle inline booking creation from Day View (with multi-studio support)
  const handleInlineBookingCreate = (
    date: Date, 
    studioIds: string[], 
    startTime: string, 
    endTime: string,
    cost: number
  ) => {
    setSelectedDate(date);
    setSelectedStudioIds(studioIds);
    setSelectedStartTime(startTime);
    setSelectedEndTime(endTime);
    setEstimatedCost(cost);
    setStep('booking-form');
  };

  const handleTimeSlotClick = (time: string) => {
    if (!selectedStartTime) {
      setSelectedStartTime(time);
      setSelectedEndTime(null);
    } else if (!selectedEndTime) {
      const [startHour, startMin] = selectedStartTime.split(':').map(Number);
      const [clickHour, clickMin] = time.split(':').map(Number);
      const startMinutes = startHour * 60 + startMin;
      const clickMinutes = clickHour * 60 + clickMin;

      if (clickMinutes <= startMinutes) {
        setSelectedStartTime(time);
        setSelectedEndTime(null);
      } else {
        setSelectedEndTime(time);
      }
    } else {
      setSelectedStartTime(time);
      setSelectedEndTime(null);
    }
  };

  const handleStartTimeInputChange = (time: string) => {
    setSelectedStartTime(time);
    if (selectedEndTime) {
      const [startH, startM] = time.split(':').map(Number);
      const [endH, endM] = selectedEndTime.split(':').map(Number);
      if (endH * 60 + endM <= startH * 60 + startM) {
        setSelectedEndTime(null);
      }
    }
  };

  const handleEndTimeInputChange = (time: string) => {
    setSelectedEndTime(time);
  };

  // Validation check for enabling continue button (includes 15-min buffer)
  const isTimeSelectionValid = useMemo(() => {
    if (!selectedStartTime || !selectedEndTime || !settings) return false;
    
    const BUFFER_MINUTES = 15;
    
    const [startH, startM] = selectedStartTime.split(':').map(Number);
    const [endH, endM] = selectedEndTime.split(':').map(Number);
    const startMins = startH * 60 + startM;
    const endMins = endH * 60 + endM;
    const durationHours = (endMins - startMins) / 60;
    
    if (endMins <= startMins) return false;
    if (durationHours < settings.min_booking_hours) return false;
    if (durationHours > settings.max_booking_hours) return false;
    
    for (const booking of bookings) {
      const [bsH, bsM] = booking.start_time.split(':').map(Number);
      const [beH, beM] = booking.end_time.split(':').map(Number);
      const bookingStart = bsH * 60 + bsM;
      const bookingEnd = beH * 60 + beM;
      
      // Check overlap WITH buffer consideration
      if (startMins < (bookingEnd + BUFFER_MINUTES) && endMins > (bookingStart - BUFFER_MINUTES)) {
        return false;
      }
    }
    
    return true;
  }, [selectedStartTime, selectedEndTime, settings, bookings]);

  const handleContinueToForm = () => {
    if (isTimeSelectionValid) {
      setStep('booking-form');
    }
  };

  const handleBookingSuccess = () => {
    setStep('confirmation');
    setTimeout(() => {
      navigate('/book');
      window.location.reload();
    }, 3000);
  };

  const handleBackToCalendar = () => {
    setStep('calendar-view');
    setSelectedDate(undefined);
    setSelectedStudioIds([]);
    setSelectedStartTime(null);
    setSelectedEndTime(null);
    setEstimatedCost(0);
  };

  if (studiosLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-pulse text-muted-foreground">Loading...</div>
      </div>
    );
  }

  const primaryStudio = selectedStudios[0];

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

      <section className="container py-6">
        {/* Progress Steps */}
        <div className="flex items-center gap-2 mb-6 text-sm max-w-3xl mx-auto">
          <Badge variant={step === 'calendar-view' ? 'default' : selectedDate ? 'secondary' : 'outline'}>
            1. Calendar
          </Badge>
          <ChevronRight className="h-4 w-4 text-muted-foreground" />
          <Badge variant={step === 'select-time' ? 'default' : selectedEndTime ? 'secondary' : 'outline'}>
            2. Time
          </Badge>
          <ChevronRight className="h-4 w-4 text-muted-foreground" />
          <Badge variant={step === 'booking-form' ? 'default' : 'outline'}>
            3. Details
          </Badge>
        </div>

        {/* Step 1: Full-Width Calendar View */}
        {step === 'calendar-view' && (
          <div className="w-full">
            <div className="mb-4">
              <h2 className="text-xl font-semibold">Select a Date & Studio</h2>
              <p className="text-muted-foreground text-sm">
                Browse availability across all studios. Click a date to select a time slot, or use Day view to book directly.
              </p>
            </div>
            <BookingCalendar
              onDateSelect={handleCalendarSelect}
              onBookingCreate={handleInlineBookingCreate}
              onBookingClick={(booking) => {
                // Could show booking details modal
                console.log('Booking clicked:', booking);
              }}
            />
            
            {/* Quick Studio Selection */}
            {selectedDate && selectedStudioIds.length === 0 && (
              <Card className="mt-4 max-w-md mx-auto">
                <CardHeader>
                  <CardTitle className="text-lg">Select a Studio</CardTitle>
                  <CardDescription>
                    {format(selectedDate, 'EEEE, MMMM d, yyyy')}
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-2">
                  {activeStudios.map((studio) => (
                    <Button
                      key={studio.id}
                      variant="outline"
                      className="w-full justify-start"
                      onClick={() => {
                        setSelectedStudioIds([studio.id]);
                        setStep('select-time');
                      }}
                    >
                      {studio.name}
                    </Button>
                  ))}
                </CardContent>
              </Card>
            )}
          </div>
        )}

        {/* Step 2: Select Time */}
        {step === 'select-time' && primaryStudio && selectedDate && settings && (
          <Card className="max-w-3xl mx-auto">
            <CardHeader>
              <CardTitle>Select Time</CardTitle>
              <CardDescription>
                {selectedStudios.map(s => s.name).join(', ')} • {format(selectedDate, 'EEEE, MMMM d, yyyy')}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Time Input Fields */}
              <TimeInputFields
                startTime={selectedStartTime}
                endTime={selectedEndTime}
                onStartChange={handleStartTimeInputChange}
                onEndChange={handleEndTimeInputChange}
                operatingStart={settings.operating_start_time}
                operatingEnd={settings.operating_end_time}
                timeIncrement={settings.time_increment_minutes}
                bookings={bookings}
                minBookingHours={settings.min_booking_hours}
                maxBookingHours={settings.max_booking_hours}
                selectedDate={selectedDate}
              />

              {/* Legend */}
              <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
                <div className="flex items-center gap-1">
                  <div className="w-3 h-3 rounded bg-foreground" />
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

              {/* Time Slot Grid */}
              <TimeSlotGrid
                date={selectedDate}
                settings={settings}
                bookings={bookings}
                selectedStart={selectedStartTime}
                selectedEnd={selectedEndTime}
                onSlotClick={handleTimeSlotClick}
                isBlocked={isDateBlocked(selectedDate)}
              />

              <div className="flex justify-between pt-4 border-t">
                <Button variant="outline" onClick={handleBackToCalendar}>
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Back to Calendar
                </Button>
                <Button 
                  onClick={handleContinueToForm}
                  disabled={!isTimeSelectionValid}
                >
                  Continue
                  <ChevronRight className="h-4 w-4 ml-2" />
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Step 3: Booking Form */}
        {step === 'booking-form' && selectedStudioIds.length > 0 && selectedDate && selectedStartTime && selectedEndTime && (
          <div className="max-w-3xl mx-auto">
            {/* Show multi-studio info if applicable */}
            {selectedStudios.length > 1 && (
              <Card className="mb-4">
                <CardContent className="pt-4">
                  <div className="flex flex-wrap gap-2 text-sm">
                    <span className="text-muted-foreground">Selected studios:</span>
                    {selectedStudios.map(s => (
                      <Badge key={s.id} variant="secondary">{s.name}</Badge>
                    ))}
                    {estimatedCost > 0 && (
                      <span className="ml-auto font-semibold">Est. ${estimatedCost.toFixed(2)}</span>
                    )}
                  </div>
                </CardContent>
              </Card>
            )}
            <BookingForm
              studioId={primaryStudioId}
              studioName={selectedStudios.map(s => s.name).join(', ')}
              studioType={primaryStudio?.type}
              date={selectedDate}
              startTime={selectedStartTime}
              endTime={selectedEndTime}
              onSuccess={handleBookingSuccess}
              onCancel={() => setStep('select-time')}
            />
          </div>
        )}

        {/* Confirmation */}
        {step === 'confirmation' && (
          <Card className="max-w-md mx-auto text-center">
            <CardContent className="pt-8 pb-8">
              <div className="text-4xl mb-4">✓</div>
              <h2 className="text-xl font-semibold mb-2">Booking Submitted!</h2>
              <p className="text-muted-foreground">
                You'll receive a confirmation email shortly.
              </p>
            </CardContent>
          </Card>
        )}
      </section>
    </div>
  );
}
