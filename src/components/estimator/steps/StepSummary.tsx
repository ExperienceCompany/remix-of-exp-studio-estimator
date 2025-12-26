import { useState } from 'react';
import { useEstimator } from '@/contexts/EstimatorContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
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
import { ArrowLeft, Copy, FileText, RotateCcw, Download, Save } from 'lucide-react';
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
  const createLog = useCreateAdminLog();
  const [affiliateCode, setAffiliateCode] = useState('');
  const [affiliateName, setAffiliateName] = useState<string | null>(null);

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
      // Save quote to database first
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

      // Build crew display string
      const { lv1, lv2, lv3 } = selection.crewAllocation;
      const crewParts: string[] = [];
      if (lv1 > 0) crewParts.push(lv1 > 1 ? `Lv1 ×${lv1}` : 'Lv1');
      if (lv2 > 0) crewParts.push(lv2 > 1 ? `Lv2 ×${lv2}` : 'Lv2');
      if (lv3 > 0) crewParts.push(lv3 > 1 ? `Lv3 ×${lv3}` : 'Lv3');
    
      // Generate PDF with the saved quote ID
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

  return (
    <div className="space-y-6">
      {/* Summary Card */}
      <Card>
        <CardHeader>
          <CardTitle>Your Estimate</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Selection Summary */}
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <p className="text-muted-foreground">Session Type</p>
              <p className="font-medium">
                {selection.sessionType === 'diy' ? 'DIY' : 'EXP Session'}
              </p>
            </div>
            <div>
              <p className="text-muted-foreground">Studio</p>
              <p className="font-medium">
                {selection.studioType ? STUDIO_LABELS[selection.studioType] : '-'}
              </p>
            </div>
            <div>
              <p className="text-muted-foreground">Service</p>
              <p className="font-medium">
                {selection.serviceType ? SERVICE_LABELS[selection.serviceType] : '-'}
              </p>
            </div>
            <div>
              <p className="text-muted-foreground">Time Slot</p>
              <p className="font-medium">
                {selection.timeSlotType ? TIME_SLOT_LABELS[selection.timeSlotType] : '-'}
              </p>
            </div>
            <div>
              <p className="text-muted-foreground">Duration</p>
              <p className="font-medium">{selection.hours} hour(s)</p>
            </div>
            {selection.sessionType === 'serviced' && (() => {
              const { lv1, lv2, lv3 } = selection.crewAllocation;
              const totalCrew = lv1 + lv2 + lv3;
              if (totalCrew === 0 && !selection.providerLevel) return null;
              
              // Build crew display parts
              const crewParts: string[] = [];
              if (lv1 > 0) crewParts.push(lv1 > 1 ? `Lv1 ×${lv1}` : 'Lv1');
              if (lv2 > 0) crewParts.push(lv2 > 1 ? `Lv2 ×${lv2}` : 'Lv2');
              if (lv3 > 0) crewParts.push(lv3 > 1 ? `Lv3 ×${lv3}` : 'Lv3');
              
              // Fallback to providerLevel if no crewAllocation
              const crewDisplay = crewParts.length > 0 
                ? crewParts.join(', ') 
                : (selection.providerLevel ? PROVIDER_LEVEL_LABELS[selection.providerLevel] : '-');
              
              return (
                <div>
                  <p className="text-muted-foreground">Crew Allocation</p>
                  <p className="font-medium">{crewDisplay}</p>
                </div>
              );
            })()}
            {selection.serviceType === 'vodcast' && (
              <div>
                <p className="text-muted-foreground">Cameras</p>
                <p className="font-medium">{selection.cameraCount}</p>
              </div>
            )}
          </div>

          <Separator />

          {/* Line Items */}
          <div className="space-y-2">
            {totals.lineItems.map((item, index) => (
              <div key={index} className="flex justify-between text-sm">
                <span className="text-muted-foreground">{item.label}</span>
                <span className="font-medium">${item.amount.toFixed(2)}</span>
              </div>
            ))}
          </div>

          <Separator />

          {/* Total */}
          <div className="flex justify-between items-center">
            <span className="text-lg font-semibold">Estimated Total</span>
            <span className="text-2xl font-bold text-primary">
              ${totals.customerTotal.toFixed(2)}
            </span>
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
      <AffiliateEarningsCard customerTotal={totals.customerTotal} />

      {/* Actions */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Button variant="outline" onClick={handleCopyQuote}>
          <Copy className="h-4 w-4 mr-2" />
          Copy
        </Button>
        <Button variant="outline" onClick={handleDownloadQuote}>
          <Download className="h-4 w-4 mr-2" />
          Download
        </Button>
        {isAdmin && (
          <Button variant="outline" onClick={handleSaveToAdminLogs} disabled={createLog.isPending}>
            <Save className="h-4 w-4 mr-2" />
            {createLog.isPending ? 'Saving...' : 'Save to Logs'}
          </Button>
        )}
        <Button>
          <FileText className="h-4 w-4 mr-2" />
          Book This
        </Button>
      </div>

      <div className="flex justify-between">
        <Button variant="outline" onClick={() => setCurrentStep(5)}>
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
