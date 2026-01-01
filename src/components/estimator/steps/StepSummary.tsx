import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useEstimator } from '@/contexts/EstimatorContext';
import { GradientButton } from '@/components/ui/gradient-button';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { PriceCounter } from '@/components/ui/price-counter';
import { CelebrationAnimation } from '@/components/ui/celebration-animation';
import { 
  STUDIO_LABELS, 
  SERVICE_LABELS, 
  TIME_SLOT_LABELS, 
  PROVIDER_LEVEL_LABELS,
  StudioType,
  ServiceType,
  TimeSlotType,
  ProviderLevel,
} from '@/types/estimator';
import { ArrowLeft, RotateCcw, Download, Save, Timer, CheckCircle2, Sparkles } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { generateQuotePdf } from '@/lib/generateQuotePdf';
import { format } from 'date-fns';
import { supabase } from '@/integrations/supabase/client';
import type { Json } from '@/integrations/supabase/types';
import { useCreateAdminLog } from '@/hooks/useAdminLogs';
import { useAuth } from '@/hooks/useAuth';
import { AffiliateEarningsCard } from '@/components/AffiliateEarningsCard';
import { AffiliateCodeInput } from '@/components/AffiliateCodeInput';

export function StepSummary() {
  const { selection, totals, internalTotals, setCurrentStep, resetSelection } = useEstimator();
  const { toast } = useToast();
  const { isAdmin } = useAuth();
  const navigate = useNavigate();
  const createLog = useCreateAdminLog();
  const [affiliateCode, setAffiliateCode] = useState('');
  const [affiliateName, setAffiliateName] = useState<string | null>(null);
  const [isBooking, setIsBooking] = useState(false);
  const [showCelebration, setShowCelebration] = useState(true);

  const handleCopyQuote = () => {
    const lines = [
      '=== EXP Studio Quote ===',
      '',
      `Session Type: ${selection.sessionType === 'diy' ? 'DIY' : 'EXP Session'}`,
      `Studio: ${selection.studioType ? STUDIO_LABELS[selection.studioType] : 'Not selected'}`,
      `Service: ${selection.serviceType ? SERVICE_LABELS[selection.serviceType] : 'Not selected'}`,
      `Time Slot: ${selection.timeSlotType ? TIME_SLOT_LABELS[selection.timeSlotType] : 'Not selected'}`,
      `Duration: ${selection.hours} hour(s)`,
      '',
      '--- Line Items ---',
      ...totals.lineItems.map(item => `${item.label}: $${item.amount.toFixed(2)}`),
      '',
      `TOTAL: $${totals.customerTotal.toFixed(2)}`,
    ];

    navigator.clipboard.writeText(lines.join('\n'));
    toast({ title: 'Quote copied to clipboard!' });
  };

  const handleDownloadQuote = async () => {
    try {
      const insertData = {
        session_type: selection.sessionType as 'diy' | 'serviced',
        hours: selection.hours,
        camera_count: selection.cameraCount,
        selections_json: JSON.parse(JSON.stringify(selection)) as Json,
        totals_json: JSON.parse(JSON.stringify(totals)) as Json,
        customer_total: totals.customerTotal,
        status: 'draft' as const,
        affiliate_code: affiliateCode || null,
      };
      
      const { data: quote, error } = await supabase
        .from('quotes')
        .insert(insertData)
        .select('id')
        .single();

      if (error) throw error;

      const { lv1, lv2, lv3 } = selection.crewAllocation;
      const crewParts: string[] = [];
      if (lv1 > 0) crewParts.push(lv1 > 1 ? `Lv1 ×${lv1}` : 'Lv1');
      if (lv2 > 0) crewParts.push(lv2 > 1 ? `Lv2 ×${lv2}` : 'Lv2');
      if (lv3 > 0) crewParts.push(lv3 > 1 ? `Lv3 ×${lv3}` : 'Lv3');
    
      await generateQuotePdf({
        quoteNumber: quote.id,
        date: format(new Date(), 'MMMM d, yyyy'),
        sessionType: selection.sessionType === 'diy' ? 'DIY' : 'EXP Session',
        studio: selection.studioType ? STUDIO_LABELS[selection.studioType] : 'Not selected',
        service: selection.serviceType ? SERVICE_LABELS[selection.serviceType] : 'Not selected',
        timeSlot: selection.timeSlotType ? TIME_SLOT_LABELS[selection.timeSlotType] : 'Not selected',
        duration: `${selection.hours} hour(s)`,
        crew: crewParts.length > 0 ? crewParts.join(', ') : undefined,
        cameras: selection.serviceType === 'vodcast' ? selection.cameraCount : undefined,
        lineItems: totals.lineItems.map(item => ({ label: item.label, amount: item.amount })),
        total: totals.customerTotal,
      });
      
      toast({ title: 'Quote saved and downloaded!' });
    } catch (error) {
      console.error('Failed to save/generate quote:', error);
      toast({ title: 'Failed to generate quote', variant: 'destructive' });
    }
  };

  const handleSaveToAdminLogs = async () => {
    try {
      await createLog.mutateAsync({
        log_type: 'studio_estimate',
        log_name: `${selection.studioType ? STUDIO_LABELS[selection.studioType] : 'Studio'} - ${selection.serviceType ? SERVICE_LABELS[selection.serviceType] : 'Session'}`,
        customer_total: totals.customerTotal,
        provider_payout: internalTotals.providerPayout,
        gross_margin: internalTotals.grossMargin,
        hours: selection.hours,
        affiliate_code: affiliateCode || null,
        data_json: {
          selection,
          totals,
          internalTotals,
          affiliateCode: affiliateCode || null,
          affiliateName: affiliateName || null,
        },
      });
      toast({ title: 'Saved to Admin Logs!' });
    } catch (error) {
      console.error('Failed to save to admin logs:', error);
      toast({ title: 'Failed to save', variant: 'destructive' });
    }
  };

  const handleBook = async () => {
    setIsBooking(true);
    try {
      const quoteInsertData = {
        session_type: selection.sessionType as 'diy' | 'serviced',
        hours: selection.hours,
        camera_count: selection.cameraCount,
        selections_json: JSON.parse(JSON.stringify(selection)) as Json,
        totals_json: JSON.parse(JSON.stringify(totals)) as Json,
        customer_total: totals.customerTotal,
        provider_payout: internalTotals.providerPayout,
        gross_margin: internalTotals.grossMargin,
        status: 'approved' as const,
        affiliate_code: affiliateCode || null,
      };
      
      const { data: quote, error: quoteError } = await supabase
        .from('quotes')
        .insert(quoteInsertData)
        .select('id')
        .single();

      if (quoteError) throw quoteError;

      const sessionInsertData = {
        quote_id: quote.id,
        session_type: selection.sessionType,
        selections_json: JSON.parse(JSON.stringify({
          ...selection,
          totals,
          internalTotals,
        })) as Json,
        original_total: totals.customerTotal,
        affiliate_code: affiliateCode || null,
        status: 'pending',
      };

      const { data: session, error: sessionError } = await supabase
        .from('sessions')
        .insert(sessionInsertData)
        .select('id')
        .single();

      if (sessionError) throw sessionError;

      toast({ title: 'Session created! Starting timer...' });
      navigate(`/session/${session.id}`);
    } catch (error) {
      console.error('Failed to create session:', error);
      toast({ title: 'Failed to create session', variant: 'destructive' });
    } finally {
      setIsBooking(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Celebration Animation */}
      <CelebrationAnimation show={showCelebration} type="sparkle" />

      {/* Success Header */}
      <div className="text-center space-y-2">
        <div className="inline-flex items-center justify-center h-16 w-16 rounded-full bg-gradient-to-br from-[hsl(90,85%,50%)] to-[hsl(180,85%,50%)] mx-auto mb-2">
          <CheckCircle2 className="h-8 w-8 text-white" />
        </div>
        <h2 className="text-2xl font-bold">Your Estimate is Ready!</h2>
        <p className="text-muted-foreground">Review your selections below</p>
      </div>

      {/* Summary Card */}
      <Card className="rainbow-border rainbow-border-slow">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            Estimate Summary
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Selection Summary */}
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div className="p-3 rounded-lg bg-muted/50">
              <p className="text-muted-foreground text-xs">Session Type</p>
              <p className="font-semibold">
                {selection.sessionType === 'diy' ? 'DIY' : 'EXP Session'}
              </p>
            </div>
            <div className="p-3 rounded-lg bg-muted/50">
              <p className="text-muted-foreground text-xs">Studio</p>
              <p className="font-semibold">
                {selection.studioType ? STUDIO_LABELS[selection.studioType] : '-'}
              </p>
            </div>
            <div className="p-3 rounded-lg bg-muted/50">
              <p className="text-muted-foreground text-xs">Service</p>
              <p className="font-semibold">
                {selection.serviceType ? SERVICE_LABELS[selection.serviceType] : '-'}
              </p>
            </div>
            <div className="p-3 rounded-lg bg-muted/50">
              <p className="text-muted-foreground text-xs">Time Slot</p>
              <p className="font-semibold">
                {selection.timeSlotType ? TIME_SLOT_LABELS[selection.timeSlotType] : '-'}
              </p>
            </div>
            <div className="p-3 rounded-lg bg-muted/50">
              <p className="text-muted-foreground text-xs">Duration</p>
              <p className="font-semibold">{selection.hours} hour(s)</p>
            </div>
            {selection.sessionType === 'serviced' && (() => {
              const { lv1, lv2, lv3 } = selection.crewAllocation;
              const totalCrew = lv1 + lv2 + lv3;
              if (totalCrew === 0 && !selection.providerLevel) return null;
              
              const crewParts: string[] = [];
              if (lv1 > 0) crewParts.push(lv1 > 1 ? `Lv1 ×${lv1}` : 'Lv1');
              if (lv2 > 0) crewParts.push(lv2 > 1 ? `Lv2 ×${lv2}` : 'Lv2');
              if (lv3 > 0) crewParts.push(lv3 > 1 ? `Lv3 ×${lv3}` : 'Lv3');
              
              const crewDisplay = crewParts.length > 0 
                ? crewParts.join(', ') 
                : (selection.providerLevel ? PROVIDER_LEVEL_LABELS[selection.providerLevel] : '-');
              
              return (
                <div className="p-3 rounded-lg bg-muted/50">
                  <p className="text-muted-foreground text-xs">Crew</p>
                  <p className="font-semibold">{crewDisplay}</p>
                </div>
              );
            })()}
            {selection.serviceType === 'vodcast' && (
              <div className="p-3 rounded-lg bg-muted/50">
                <p className="text-muted-foreground text-xs">Cameras</p>
                <p className="font-semibold">{selection.cameraCount}</p>
              </div>
            )}
          </div>

          <Separator />

          {/* Line Items */}
          <div className="space-y-2">
            {totals.lineItems.map((item, index) => (
              <div key={index} className="flex justify-between text-sm py-1">
                <span className="text-muted-foreground">{item.label}</span>
                <span className="font-medium">${item.amount.toFixed(2)}</span>
              </div>
            ))}
          </div>

          <Separator />

          {/* Total */}
          <div className="flex justify-between items-center pt-2">
            <span className="text-lg font-semibold">Estimated Total</span>
            <PriceCounter value={Math.round(totals.customerTotal)} size="xl" className="text-primary" />
          </div>
        </CardContent>
      </Card>

      {/* Affiliate Code Input */}
      <AffiliateCodeInput 
        value={affiliateCode} 
        onChange={(code, name) => {
          setAffiliateCode(code);
          setAffiliateName(name);
        }} 
      />

      {/* Affiliate Earnings Card */}
      <AffiliateEarningsCard customerTotal={totals.customerTotal} appliedCode={affiliateCode} />

      {/* Actions */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        <Button variant="outline" onClick={handleDownloadQuote} className="h-12">
          <Download className="h-4 w-4 mr-2" />
          Download
        </Button>
        {isAdmin && (
          <Button variant="outline" onClick={handleSaveToAdminLogs} disabled={createLog.isPending} className="h-12">
            <Save className="h-4 w-4 mr-2" />
            {createLog.isPending ? 'Saving...' : 'Save to Logs'}
          </Button>
        )}
        <GradientButton onClick={handleBook} disabled={isBooking} className="h-12 sm:col-span-1 col-span-2">
          <Timer className="h-4 w-4 mr-2" />
          {isBooking ? 'Creating...' : 'Book This'}
        </GradientButton>
      </div>

      <div className="flex justify-between">
        <Button variant="outline" onClick={() => {
          const hasVideoEditing = selection.editingItems.some(item => item.category !== 'photo_editing');
          const isDiy = selection.sessionType === 'diy';
          
          if (hasVideoEditing) {
            setCurrentStep(isDiy ? 5 : 6);
          } else {
            setCurrentStep(isDiy ? 4 : 5);
          }
        }}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back
        </Button>
        <Button variant="ghost" onClick={resetSelection}>
          <RotateCcw className="h-4 w-4 mr-2" />
          Start Over
        </Button>
      </div>
    </div>
  );
}
