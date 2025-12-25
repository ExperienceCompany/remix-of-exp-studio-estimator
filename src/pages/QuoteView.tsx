import { useParams, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import { format } from 'date-fns';
import { FileText, ArrowRight } from 'lucide-react';
import { 
  STUDIO_LABELS, 
  SERVICE_LABELS, 
  TIME_SLOT_LABELS,
  StudioType,
  ServiceType,
  TimeSlotType,
} from '@/types/estimator';

export default function QuoteView() {
  const { id } = useParams<{ id: string }>();

  const { data: quote, isLoading, error } = useQuery({
    queryKey: ['quote', id],
    queryFn: async () => {
      if (!id) throw new Error('No quote ID provided');
      
      const { data, error } = await supabase
        .from('quotes')
        .select('*')
        .eq('id', id)
        .maybeSingle();
      
      if (error) throw error;
      if (!data) throw new Error('Quote not found');
      
      return data;
    },
    enabled: !!id,
  });

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background p-6">
        <div className="max-w-2xl mx-auto space-y-6">
          <Skeleton className="h-12 w-48" />
          <Card>
            <CardHeader>
              <Skeleton className="h-8 w-32" />
            </CardHeader>
            <CardContent className="space-y-4">
              <Skeleton className="h-6 w-full" />
              <Skeleton className="h-6 w-3/4" />
              <Skeleton className="h-6 w-1/2" />
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  if (error || !quote) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-6">
        <Card className="max-w-md w-full text-center">
          <CardContent className="pt-6 space-y-4">
            <FileText className="h-16 w-16 mx-auto text-muted-foreground" />
            <h1 className="text-2xl font-bold">Quote Not Found</h1>
            <p className="text-muted-foreground">
              This quote may have expired or doesn't exist.
            </p>
            <Button asChild>
              <Link to="/estimate">
                Get Your Own Quote
                <ArrowRight className="h-4 w-4 ml-2" />
              </Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Parse stored JSON data
  const selections = quote.selections_json as Record<string, unknown> | null;
  const totals = quote.totals_json as { lineItems?: Array<{ label: string; amount: number }>; customerTotal?: number } | null;
  
  // Get display values
  const studioType = selections?.studioType as StudioType | undefined;
  const serviceType = selections?.serviceType as ServiceType | undefined;
  const timeSlotType = selections?.timeSlotType as TimeSlotType | undefined;
  const crewAllocation = selections?.crewAllocation as { lv1: number; lv2: number; lv3: number } | undefined;

  // Build crew display
  const crewParts: string[] = [];
  if (crewAllocation) {
    if (crewAllocation.lv1 > 0) crewParts.push(crewAllocation.lv1 > 1 ? `Lv1 ×${crewAllocation.lv1}` : 'Lv1');
    if (crewAllocation.lv2 > 0) crewParts.push(crewAllocation.lv2 > 1 ? `Lv2 ×${crewAllocation.lv2}` : 'Lv2');
    if (crewAllocation.lv3 > 0) crewParts.push(crewAllocation.lv3 > 1 ? `Lv3 ×${crewAllocation.lv3}` : 'Lv3');
  }

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-2xl mx-auto space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold">EXP Studio</h1>
          <p className="text-muted-foreground">Quote</p>
        </div>

        {/* Quote Details */}
        <Card>
          <CardHeader>
            <div className="flex justify-between items-start">
              <div>
                <CardTitle>Quote Details</CardTitle>
                <p className="text-sm text-muted-foreground mt-1">
                  Quote #: {quote.id.slice(0, 8).toUpperCase()}
                </p>
              </div>
              <p className="text-sm text-muted-foreground">
                {format(new Date(quote.created_at || new Date()), 'MMMM d, yyyy')}
              </p>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Session Info */}
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-muted-foreground">Session Type</p>
                <p className="font-medium">
                  {quote.session_type === 'diy' ? 'DIY' : 'EXP Session'}
                </p>
              </div>
              <div>
                <p className="text-muted-foreground">Studio</p>
                <p className="font-medium">
                  {studioType ? STUDIO_LABELS[studioType] : '-'}
                </p>
              </div>
              <div>
                <p className="text-muted-foreground">Service</p>
                <p className="font-medium">
                  {serviceType ? SERVICE_LABELS[serviceType] : '-'}
                </p>
              </div>
              <div>
                <p className="text-muted-foreground">Time Slot</p>
                <p className="font-medium">
                  {timeSlotType ? TIME_SLOT_LABELS[timeSlotType] : '-'}
                </p>
              </div>
              <div>
                <p className="text-muted-foreground">Duration</p>
                <p className="font-medium">{quote.hours} hour(s)</p>
              </div>
              {crewParts.length > 0 && (
                <div>
                  <p className="text-muted-foreground">Crew</p>
                  <p className="font-medium">{crewParts.join(', ')}</p>
                </div>
              )}
              {quote.camera_count && quote.camera_count > 1 && (
                <div>
                  <p className="text-muted-foreground">Cameras</p>
                  <p className="font-medium">{quote.camera_count}</p>
                </div>
              )}
            </div>

            <Separator />

            {/* Line Items */}
            {totals?.lineItems && totals.lineItems.length > 0 && (
              <div className="space-y-2">
                <h3 className="font-semibold">Pricing Breakdown</h3>
                {totals.lineItems.map((item, index) => (
                  <div key={index} className="flex justify-between text-sm">
                    <span className="text-muted-foreground">{item.label}</span>
                    <span className="font-medium">${item.amount.toFixed(2)}</span>
                  </div>
                ))}
              </div>
            )}

            <Separator />

            {/* Total */}
            <div className="flex justify-between items-center">
              <span className="text-lg font-semibold">Total</span>
              <span className="text-2xl font-bold text-primary">
                ${(quote.customer_total || totals?.customerTotal || 0).toFixed(2)}
              </span>
            </div>
          </CardContent>
        </Card>

        {/* CTA */}
        <Card>
          <CardContent className="pt-6 text-center space-y-4">
            <p className="text-muted-foreground">
              Ready to book your session?
            </p>
            <Button asChild size="lg">
              <Link to="/estimate">
                Get Your Own Quote
                <ArrowRight className="h-4 w-4 ml-2" />
              </Link>
            </Button>
          </CardContent>
        </Card>

        {/* Footer */}
        <p className="text-center text-sm text-muted-foreground">
          This quote is valid for 30 days from the date above.
        </p>
      </div>
    </div>
  );
}
