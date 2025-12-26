import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useCreateBooking } from '@/hooks/useStudioBookings';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import { CheckCircle, Loader2 } from 'lucide-react';

interface BookingFormProps {
  studioId: string;
  studioName: string;
  date: Date;
  startTime: string;
  endTime: string;
  onSuccess: () => void;
  onCancel: () => void;
}

export function BookingForm({
  studioId,
  studioName,
  date,
  startTime,
  endTime,
  onSuccess,
  onCancel,
}: BookingFormProps) {
  const createBooking = useCreateBooking();
  const { toast } = useToast();
  const [submitted, setSubmitted] = useState(false);

  const [formData, setFormData] = useState({
    customerName: '',
    customerEmail: '',
    customerPhone: '',
    sessionType: 'diy',
    notes: '',
  });

  const formatTimeDisplay = (time: string) => {
    const [hour, min] = time.split(':').map(Number);
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const displayHour = hour % 12 || 12;
    return `${displayHour}:${min.toString().padStart(2, '0')} ${ampm}`;
  };

  const calculateDuration = () => {
    const [startHour, startMin] = startTime.split(':').map(Number);
    const [endHour, endMin] = endTime.split(':').map(Number);
    const startMinutes = startHour * 60 + startMin;
    const endMinutes = endHour * 60 + endMin;
    const durationMinutes = endMinutes - startMinutes;
    const hours = Math.floor(durationMinutes / 60);
    const mins = durationMinutes % 60;
    return hours > 0 ? `${hours}hr ${mins > 0 ? `${mins}min` : ''}`.trim() : `${mins}min`;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.customerName || !formData.customerEmail) {
      toast({ title: 'Please fill in required fields', variant: 'destructive' });
      return;
    }

    try {
      await createBooking.mutateAsync({
        studio_id: studioId,
        booking_date: format(date, 'yyyy-MM-dd'),
        start_time: startTime,
        end_time: endTime,
        booking_type: 'customer',
        status: 'pending',
        customer_name: formData.customerName,
        customer_email: formData.customerEmail,
        customer_phone: formData.customerPhone || null,
        session_type: formData.sessionType,
        notes: formData.notes || null,
        quote_id: null,
        created_by: null,
      });

      setSubmitted(true);
      toast({ title: 'Booking request submitted!' });
      
      setTimeout(() => {
        onSuccess();
      }, 2000);
    } catch (error) {
      toast({ title: 'Error submitting booking', variant: 'destructive' });
    }
  };

  if (submitted) {
    return (
      <Card>
        <CardContent className="pt-6 text-center">
          <CheckCircle className="h-16 w-16 text-green-500 mx-auto mb-4" />
          <h3 className="text-xl font-semibold mb-2">Booking Request Submitted!</h3>
          <p className="text-muted-foreground">
            We'll confirm your booking for {studioName} on{' '}
            {format(date, 'MMMM d, yyyy')} at {formatTimeDisplay(startTime)}.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Complete Your Booking</CardTitle>
        <CardDescription>
          {studioName} • {format(date, 'EEEE, MMMM d, yyyy')}
          <br />
          {formatTimeDisplay(startTime)} – {formatTimeDisplay(endTime)} ({calculateDuration()})
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Name *</Label>
            <Input
              id="name"
              value={formData.customerName}
              onChange={(e) => setFormData(prev => ({ ...prev, customerName: e.target.value }))}
              placeholder="Your full name"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="email">Email *</Label>
            <Input
              id="email"
              type="email"
              value={formData.customerEmail}
              onChange={(e) => setFormData(prev => ({ ...prev, customerEmail: e.target.value }))}
              placeholder="your@email.com"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="phone">Phone (optional)</Label>
            <Input
              id="phone"
              type="tel"
              value={formData.customerPhone}
              onChange={(e) => setFormData(prev => ({ ...prev, customerPhone: e.target.value }))}
              placeholder="(555) 123-4567"
            />
          </div>

          <div className="space-y-2">
            <Label>Session Type</Label>
            <RadioGroup
              value={formData.sessionType}
              onValueChange={(value) => setFormData(prev => ({ ...prev, sessionType: value }))}
              className="flex gap-4"
            >
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="diy" id="diy" />
                <Label htmlFor="diy" className="font-normal">DIY (Self-Operated)</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="serviced" id="serviced" />
                <Label htmlFor="serviced" className="font-normal">Serviced (With Crew)</Label>
              </div>
            </RadioGroup>
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">Notes (optional)</Label>
            <Textarea
              id="notes"
              value={formData.notes}
              onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
              placeholder="Any special requests or details about your session..."
              rows={3}
            />
          </div>

          <div className="flex gap-3 pt-4">
            <Button type="button" variant="outline" onClick={onCancel} className="flex-1">
              Cancel
            </Button>
            <Button type="submit" disabled={createBooking.isPending} className="flex-1">
              {createBooking.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Submit Booking
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
