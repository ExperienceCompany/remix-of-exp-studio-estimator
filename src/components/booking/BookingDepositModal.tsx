import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Separator } from '@/components/ui/separator';
import { CreditCard, CheckCircle, XCircle, AlertTriangle, Calendar, Clock } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface BookingDepositModalProps {
  open: boolean;
  onClose: () => void;
  seriesId: string;
  singleSessionCost: number;
  occurrenceCount: number;
  depositAmount: number;
  recurringTotal: number;
  bookingDetails?: {
    title?: string;
    startTime?: string;
    pattern?: string;
  };
}

export function BookingDepositModal({ 
  open, 
  onClose, 
  seriesId,
  singleSessionCost,
  occurrenceCount,
  depositAmount,
  recurringTotal,
  bookingDetails
}: BookingDepositModalProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [paymentStatus, setPaymentStatus] = useState<'idle' | 'processing' | 'success' | 'failed'>('idle');

  const processDeposit = useMutation({
    mutationFn: async (success: boolean) => {
      if (success) {
        // Update all bookings in the series to confirmed
        const { error } = await supabase
          .from('studio_bookings')
          .update({ 
            status: 'confirmed',
            deposit_paid: true,
            deposit_paid_at: new Date().toISOString(),
            square_payment_id: `deposit_${Date.now()}`,
          })
          .eq('repeat_series_id', seriesId)
          .neq('status', 'cancelled');
        
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['studio_bookings'] });
    },
  });

  const handleSimulatePayment = async (success: boolean) => {
    setPaymentStatus('processing');
    
    // Simulate payment processing delay
    await new Promise(resolve => setTimeout(resolve, 1500));
    
    if (success) {
      await processDeposit.mutateAsync(true);
      setPaymentStatus('success');
      toast({ title: 'Deposit paid! Booking confirmed.' });
      
      // Close modal after a delay
      setTimeout(() => {
        onClose();
        setPaymentStatus('idle');
      }, 2000);
    } else {
      setPaymentStatus('failed');
      toast({ title: 'Payment failed', variant: 'destructive' });
    }
  };

  const discountAmount = (singleSessionCost * occurrenceCount) * 0.10;

  return (
    <Dialog open={open} onOpenChange={() => {
      if (paymentStatus !== 'processing') {
        onClose();
        setPaymentStatus('idle');
      }
    }}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CreditCard className="h-5 w-5" />
            Pay Deposit to Confirm
          </DialogTitle>
          <DialogDescription>
            Complete your 50% deposit to confirm your recurring booking
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Booking Details */}
          {bookingDetails && (
            <div className="space-y-2 p-3 bg-muted/50 rounded-lg">
              {bookingDetails.title && (
                <div className="flex items-center gap-2 text-sm">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  <span className="font-medium">{bookingDetails.title}</span>
                </div>
              )}
              {bookingDetails.pattern && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Clock className="h-4 w-4" />
                  <span>{bookingDetails.pattern} • {occurrenceCount} sessions</span>
                </div>
              )}
            </div>
          )}

          {/* Cost Breakdown */}
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Single Session</span>
              <span>${singleSessionCost.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">× {occurrenceCount} occurrences</span>
              <span>${(singleSessionCost * occurrenceCount).toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-sm text-green-600">
              <span>Recurring Discount (10%)</span>
              <span>-${discountAmount.toFixed(2)}</span>
            </div>
            <Separator />
            <div className="flex justify-between text-sm font-medium">
              <span>Series Total</span>
              <span>${recurringTotal.toFixed(2)}</span>
            </div>
          </div>

          {/* Deposit Amount */}
          <div className="text-center py-4 bg-primary/5 rounded-lg">
            <p className="text-sm text-muted-foreground mb-1">Required Deposit (50%)</p>
            <p className="text-3xl font-bold">${depositAmount.toFixed(2)}</p>
          </div>

          {/* Test Mode Notice */}
          <Alert>
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              <strong>Test Mode:</strong> Square integration pending. 
              Click below to simulate payment.
            </AlertDescription>
          </Alert>

          {/* Payment Status */}
          {paymentStatus === 'processing' && (
            <div className="flex items-center justify-center gap-2 text-muted-foreground">
              <div className="h-4 w-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
              Processing payment...
            </div>
          )}

          {paymentStatus === 'success' && (
            <div className="flex items-center justify-center gap-2 text-green-600">
              <CheckCircle className="h-5 w-5" />
              Deposit paid! Booking confirmed.
            </div>
          )}

          {paymentStatus === 'failed' && (
            <div className="flex items-center justify-center gap-2 text-destructive">
              <XCircle className="h-5 w-5" />
              Payment failed. Please try again.
            </div>
          )}

          {/* Action Buttons */}
          {paymentStatus === 'idle' && (
            <div className="space-y-3">
              <Button 
                className="w-full" 
                size="lg"
                onClick={() => handleSimulatePayment(true)}
              >
                <CheckCircle className="h-4 w-4 mr-2" />
                Pay ${depositAmount.toFixed(2)} Deposit
              </Button>
              <Button 
                variant="outline" 
                className="w-full"
                onClick={() => handleSimulatePayment(false)}
              >
                <XCircle className="h-4 w-4 mr-2" />
                Simulate Failed Payment
              </Button>
            </div>
          )}

          {paymentStatus === 'failed' && (
            <Button 
              className="w-full" 
              onClick={() => setPaymentStatus('idle')}
            >
              Try Again
            </Button>
          )}
        </div>

        {/* Square Branding Placeholder */}
        <div className="border-t pt-4">
          <p className="text-xs text-center text-muted-foreground">
            Powered by Square • Secure Payment Processing
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}