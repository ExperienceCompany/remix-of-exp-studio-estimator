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
import { CreditCard, CheckCircle, XCircle, AlertTriangle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface SquareCheckoutModalProps {
  open: boolean;
  onClose: () => void;
  sessionId: string;
  total: number;
}

export function SquareCheckoutModal({ open, onClose, sessionId, total }: SquareCheckoutModalProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [paymentStatus, setPaymentStatus] = useState<'idle' | 'processing' | 'success' | 'failed'>('idle');

  const updatePaymentStatus = useMutation({
    mutationFn: async (status: 'paid' | 'failed') => {
      const { error } = await supabase
        .from('sessions')
        .update({ 
          payment_status: status,
          square_payment_id: status === 'paid' ? `test_${Date.now()}` : null,
        })
        .eq('id', sessionId);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['session', sessionId] });
    },
  });

  const handleSimulatePayment = async (success: boolean) => {
    setPaymentStatus('processing');
    
    // Simulate payment processing delay
    await new Promise(resolve => setTimeout(resolve, 1500));
    
    if (success) {
      await updatePaymentStatus.mutateAsync('paid');
      setPaymentStatus('success');
      toast({ title: 'Payment successful!' });
      
      // Close modal after a delay
      setTimeout(() => {
        onClose();
        setPaymentStatus('idle');
      }, 2000);
    } else {
      await updatePaymentStatus.mutateAsync('failed');
      setPaymentStatus('failed');
      toast({ title: 'Payment failed', variant: 'destructive' });
    }
  };

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
            Pay Now - Square Checkout
          </DialogTitle>
          <DialogDescription>
            Complete your session payment
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Amount Display */}
          <div className="text-center py-4">
            <p className="text-4xl font-bold">${total.toFixed(2)}</p>
            <p className="text-sm text-muted-foreground mt-1">Session Total</p>
          </div>

          {/* Test Mode Notice */}
          <Alert>
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              <strong>Test Mode:</strong> Square API integration pending. 
              Click below to simulate a payment.
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
            <div className="flex items-center justify-center gap-2 text-green-500">
              <CheckCircle className="h-5 w-5" />
              Payment successful!
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
                Simulate Successful Payment
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
