import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { ArrowLeft, Download, CreditCard, RefreshCw, CheckCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { generateInvoicePdf } from '@/lib/generateInvoicePdf';
import { SquareCheckoutModal } from './SquareCheckoutModal';
import { SessionBreakdown } from './SessionBreakdown';
import { 
  STUDIO_LABELS, 
  SERVICE_LABELS, 
  TIME_SLOT_LABELS,
  StudioType,
  ServiceType,
  TimeSlotType,
} from '@/types/estimator';
import type { EstimatorSelection } from '@/types/estimator';
import { useDiyRates, useProviderLevels, useVodcastCameraAddons } from '@/hooks/useEstimatorData';
import { format } from 'date-fns';

interface Session {
  id: string;
  quote_id: string | null;
  status: string;
  started_at: string | null;
  ended_at: string | null;
  total_paused_seconds: number;
  actual_duration_seconds: number | null;
  session_type: string;
  selections_json: EstimatorSelection | null;
  original_total: number | null;
  final_total: number | null;
  payment_status: string;
  affiliate_code: string | null;
}

interface SessionEndScreenProps {
  session: Session;
  elapsedSeconds: number;
}

export function SessionEndScreen({ session, elapsedSeconds }: SessionEndScreenProps) {
  const navigate = useNavigate();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [showPayModal, setShowPayModal] = useState(false);
  const [isRecalculating, setIsRecalculating] = useState(false);

  const { data: diyRates } = useDiyRates();
  const { data: providerLevels } = useProviderLevels();
  const { data: cameraAddons } = useVodcastCameraAddons();

  const selection = session.selections_json as EstimatorSelection | null;

  // Calculate final total based on actual duration
  const finalCost = useMemo(() => {
    if (!selection) return { lineItems: [], total: 0 };

    const actualHours = elapsedSeconds / 3600;
    const lineItems: Array<{ label: string; amount: number }> = [];
    let total = 0;

    // Find matching DIY rate
    const matchingRate = diyRates?.find(
      r => r.studios?.type === selection.studioType && 
           r.time_slots?.type === selection.timeSlotType
    );

    if (matchingRate) {
      const firstHourRate = matchingRate.first_hour_rate;
      const afterFirstHourRate = matchingRate.after_first_hour_rate;
      
      const isThursToSun = selection.timeSlotType?.startsWith('thu') || 
                           selection.timeSlotType?.startsWith('sat');
      
      let studioCost = 0;
      if (actualHours <= 1 || !isThursToSun || !afterFirstHourRate) {
        studioCost = actualHours * firstHourRate;
      } else {
        studioCost = firstHourRate + ((actualHours - 1) * afterFirstHourRate);
      }
      
      const studioName = selection.studioType 
        ? (STUDIO_LABELS[selection.studioType as StudioType] || 'Studio')
        : 'Studio';
      
      lineItems.push({
        label: `${studioName} @ $${firstHourRate}/hr (${formatDurationExact(elapsedSeconds)})`,
        amount: studioCost,
      });
      total += studioCost;
    }

    // Provider cost
    if (selection.sessionType === 'serviced' && providerLevels) {
      const { lv1, lv2, lv3 } = selection.crewAllocation;
      const lv1Rate = providerLevels.find(p => p.level === 'lv1')?.hourly_rate || 20;
      const lv2Rate = providerLevels.find(p => p.level === 'lv2')?.hourly_rate || 30;
      const lv3Rate = providerLevels.find(p => p.level === 'lv3')?.hourly_rate || 40;
      
      const providerCost = actualHours * ((lv1 * lv1Rate) + (lv2 * lv2Rate) + (lv3 * lv3Rate));
      
      if (providerCost > 0) {
        const crewParts: string[] = [];
        if (lv1 > 0) crewParts.push(`Lv1 ×${lv1} @ $${lv1Rate}/hr`);
        if (lv2 > 0) crewParts.push(`Lv2 ×${lv2} @ $${lv2Rate}/hr`);
        if (lv3 > 0) crewParts.push(`Lv3 ×${lv3} @ $${lv3Rate}/hr`);
        
        lineItems.push({ 
          label: `Provider (${crewParts.join(', ')})`, 
          amount: providerCost 
        });
        total += providerCost;
      }
    }

    // Camera add-on
    if (selection.serviceType === 'vodcast' && selection.cameraCount > 0 && cameraAddons) {
      const cameraAddon = cameraAddons.find(c => c.cameras === selection.cameraCount);
      if (cameraAddon) {
        lineItems.push({
          label: `Camera Add-on (${selection.cameraCount} cameras)`,
          amount: cameraAddon.customer_addon_amount,
        });
        total += cameraAddon.customer_addon_amount;
      }
    }

    // Session add-ons
    selection.sessionAddons?.forEach(addon => {
      const addonCost = addon.isHourly ? addon.flatAmount * actualHours : addon.flatAmount;
      lineItems.push({ label: addon.name, amount: addonCost });
      total += addonCost;
    });

    // Editing items
    selection.editingItems?.forEach(item => {
      const itemCost = item.customerPrice * item.quantity;
      lineItems.push({ label: `${item.name} (×${item.quantity})`, amount: itemCost });
      total += itemCost;
    });

    return { lineItems, total };
  }, [selection, elapsedSeconds, diyRates, providerLevels, cameraAddons]);

  // Update final total mutation
  const updateFinalTotal = useMutation({
    mutationFn: async (finalTotal: number) => {
      const { error } = await supabase
        .from('sessions')
        .update({ final_total: finalTotal })
        .eq('id', session.id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['session', session.id] });
      toast({ title: 'Total recalculated!' });
    },
  });

  const handleRecalculate = async () => {
    setIsRecalculating(true);
    await updateFinalTotal.mutateAsync(finalCost.total);
    setIsRecalculating(false);
  };

  const handleDownloadInvoice = async () => {
    if (!selection) return;

    const crewParts: string[] = [];
    if (selection.crewAllocation.lv1 > 0) crewParts.push(`Lv1 ×${selection.crewAllocation.lv1}`);
    if (selection.crewAllocation.lv2 > 0) crewParts.push(`Lv2 ×${selection.crewAllocation.lv2}`);
    if (selection.crewAllocation.lv3 > 0) crewParts.push(`Lv3 ×${selection.crewAllocation.lv3}`);

    await generateInvoicePdf({
      invoiceNumber: session.id,
      date: format(new Date(), 'MMMM d, yyyy'),
      sessionType: selection.sessionType === 'diy' ? 'DIY' : 'EXP Session',
      studio: selection.studioType ? STUDIO_LABELS[selection.studioType as StudioType] : 'Not specified',
      service: selection.serviceType ? SERVICE_LABELS[selection.serviceType as ServiceType] : 'Not specified',
      timeSlot: selection.timeSlotType ? TIME_SLOT_LABELS[selection.timeSlotType as TimeSlotType] : 'Not specified',
      startTime: session.started_at ? format(new Date(session.started_at), 'h:mm a') : '-',
      endTime: session.ended_at ? format(new Date(session.ended_at), 'h:mm a') : '-',
      actualDuration: formatDurationExact(elapsedSeconds),
      crew: crewParts.length > 0 ? crewParts.join(', ') : undefined,
      cameras: selection.serviceType === 'vodcast' ? selection.cameraCount : undefined,
      lineItems: finalCost.lineItems,
      total: session.final_total || finalCost.total,
    });

    toast({ title: 'Invoice downloaded!' });
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="container max-w-4xl mx-auto py-8 px-4">
        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          <Button variant="ghost" size="icon" onClick={() => navigate('/estimate')}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="flex items-center gap-3">
            <CheckCircle className="h-8 w-8 text-green-500" />
            <div>
              <h1 className="text-2xl font-bold">Session Complete</h1>
              <p className="text-sm text-muted-foreground">
                {session.started_at && format(new Date(session.started_at), 'MMMM d, yyyy')}
              </p>
            </div>
          </div>
        </div>

        {/* Duration Summary */}
        <Card className="mb-6">
          <CardContent className="py-8 text-center">
            <p className="text-muted-foreground mb-2">Session Duration</p>
            <p className="text-4xl font-bold mb-4">{formatDurationExact(elapsedSeconds)}</p>
            <div className="flex justify-center gap-8 text-sm text-muted-foreground">
              <div>
                <span className="font-medium">Start:</span>{' '}
                {session.started_at ? format(new Date(session.started_at), 'h:mm a') : '-'}
              </div>
              <div>
                <span className="font-medium">End:</span>{' '}
                {session.ended_at ? format(new Date(session.ended_at), 'h:mm a') : '-'}
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="grid md:grid-cols-2 gap-6 mb-6">
          {/* Session Breakdown */}
          <SessionBreakdown selection={selection} />

          {/* Final Cost */}
          <Card>
            <CardHeader>
              <CardTitle>Final Billing</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {session.original_total && (
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Original Estimate</span>
                  <span className="text-muted-foreground line-through">
                    ${session.original_total.toFixed(2)}
                  </span>
                </div>
              )}

              <div className="space-y-2">
                {finalCost.lineItems.map((item, index) => (
                  <div key={index} className="flex justify-between text-sm">
                    <span className="text-muted-foreground">{item.label}</span>
                    <span className="font-medium">${item.amount.toFixed(2)}</span>
                  </div>
                ))}
              </div>

              <Separator />

              <div className="flex justify-between items-center">
                <span className="text-lg font-semibold">Final Total</span>
                <span className="text-2xl font-bold text-primary">
                  ${(session.final_total || finalCost.total).toFixed(2)}
                </span>
              </div>

              {session.affiliate_code && (
                <div className="text-sm text-muted-foreground">
                  Affiliate: {session.affiliate_code}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Actions */}
        <div className="flex flex-wrap gap-4 justify-center">
          <Button 
            variant="outline" 
            onClick={handleRecalculate}
            disabled={isRecalculating}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${isRecalculating ? 'animate-spin' : ''}`} />
            Recalculate
          </Button>
          <Button variant="outline" onClick={handleDownloadInvoice}>
            <Download className="h-4 w-4 mr-2" />
            Download Invoice
          </Button>
          <Button onClick={() => setShowPayModal(true)}>
            <CreditCard className="h-4 w-4 mr-2" />
            Pay Now
          </Button>
        </div>

        {/* Payment Status Badge */}
        {session.payment_status === 'paid' && (
          <div className="mt-6 text-center">
            <span className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-green-500/10 text-green-500 font-medium">
              <CheckCircle className="h-4 w-4" />
              Payment Complete
            </span>
          </div>
        )}
      </div>

      {/* Square Checkout Modal */}
      <SquareCheckoutModal
        open={showPayModal}
        onClose={() => setShowPayModal(false)}
        sessionId={session.id}
        total={session.final_total || finalCost.total}
      />
    </div>
  );
}

function formatDurationExact(seconds: number): string {
  const hrs = Math.floor(seconds / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  
  if (hrs > 0 && mins > 0) {
    return `${hrs}hr ${mins}min`;
  } else if (hrs > 0) {
    return `${hrs}hr`;
  } else {
    return `${mins}min`;
  }
}
