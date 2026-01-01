import { useState, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { ArrowLeft, ArrowRight, Camera, Image, CheckCircle2, Minus, Plus, Save } from 'lucide-react';
import { useEditingMenu } from '@/hooks/useEstimatorData';
import { useCreateAdminLog } from '@/hooks/useAdminLogs';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { AffiliateEarningsCard } from '@/components/AffiliateEarningsCard';
import { AffiliateCodeInput } from '@/components/AffiliateCodeInput';

// Minimum edits for post-production flow (standalone /services route)
const ENHANCE_MINIMUM = 1;
const ENHANCE_MINIMUM_PRICE = 10; // Customer-facing price ($10/edit × 1 edit)

interface EstimatorState {
  step: number;
  serviceId: string | null;
  quantity: number;
  affiliateCode: string;
  affiliateName: string | null;
}

export function PhotoEditingEstimator() {
  const { data: editingMenu, isLoading } = useEditingMenu();
  const { isAdmin } = useAuth();
  const createLog = useCreateAdminLog();
  const { toast } = useToast();
  const [state, setState] = useState<EstimatorState>({
    step: 1,
    serviceId: null,
    quantity: 1,
    affiliateCode: '',
    affiliateName: null,
  });

  // Filter to photo editing services only
  const photoServices = useMemo(() => {
    return editingMenu?.filter(item => item.category === 'photo_editing') || [];
  }, [editingMenu]);

  const selectedService = useMemo(() => {
    return photoServices.find(s => s.id === state.serviceId);
  }, [photoServices, state.serviceId]);

  const isEnhance = selectedService?.name?.toLowerCase().includes('enhance');
  const minQuantity = isEnhance ? ENHANCE_MINIMUM : 1;

  const calculateTotal = useMemo(() => {
    if (!selectedService) return 0;
    const pricePerEdit = selectedService.customer_price || selectedService.base_price;
    
    if (isEnhance) {
      // Enforce $50 minimum for Enhance edits
      return Math.max(state.quantity * pricePerEdit, ENHANCE_MINIMUM_PRICE);
    }
    
    return state.quantity * pricePerEdit;
  }, [selectedService, state.quantity, isEnhance]);

  const handleServiceSelect = (serviceId: string) => {
    const service = photoServices.find(s => s.id === serviceId);
    const isEnhanceService = service?.name?.toLowerCase().includes('enhance');
    
    setState(prev => ({
      ...prev,
      serviceId,
      quantity: isEnhanceService ? ENHANCE_MINIMUM : 1,
    }));
  };

  const handleNext = () => {
    setState(prev => ({ ...prev, step: prev.step + 1 }));
  };

  const handleBack = () => {
    setState(prev => ({ ...prev, step: prev.step - 1 }));
  };

  const handleReset = () => {
    setState({
      step: 1,
      serviceId: null,
      quantity: 1,
      affiliateCode: '',
      affiliateName: null,
    });
  };

  // Step 1: Select edit type
  const renderStep1 = () => (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Camera className="h-5 w-5" />
          What type of photo editing do you need?
        </CardTitle>
        <CardDescription>
          Select the editing style that fits your project
        </CardDescription>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="text-center py-8 text-muted-foreground">Loading services...</div>
        ) : photoServices.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">No photo editing services available</div>
        ) : (
          <RadioGroup
            value={state.serviceId || ''}
            onValueChange={handleServiceSelect}
            className="space-y-3"
          >
            {photoServices.map((service) => {
              return (
                <div
                  key={service.id}
                  className={`flex items-start gap-3 p-4 border rounded-lg cursor-pointer transition-colors ${
                    state.serviceId === service.id ? 'border-foreground bg-muted' : 'hover:bg-muted/50'
                  }`}
                  onClick={() => handleServiceSelect(service.id)}
                >
                  <RadioGroupItem value={service.id} id={service.id} className="mt-1" />
                  <div className="flex-1">
                    <Label htmlFor={service.id} className="text-sm font-medium cursor-pointer">
                      {service.name}
                    </Label>
                    {service.description && (
                      <p className="text-xs text-muted-foreground mt-1">
                        {service.description}
                      </p>
                    )}
                    <p className="text-xs font-medium text-foreground mt-2">
                      ${service.customer_price || service.base_price}/edit
                    </p>
                  </div>
                </div>
              );
            })}
          </RadioGroup>
        )}

        <div className="flex justify-end mt-6">
          <Button onClick={handleNext} disabled={!state.serviceId}>
            Next
            <ArrowRight className="h-4 w-4 ml-2" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );

  // Step 2: Quantity
  const renderStep2 = () => {
    if (!selectedService) return null;
    const pricePerEdit = selectedService.customer_price || selectedService.base_price;

    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Image className="h-5 w-5" />
            How many photos do you need edited?
          </CardTitle>
          <CardDescription>
            {isEnhance 
              ? `Minimum ${ENHANCE_MINIMUM} edits ($${ENHANCE_MINIMUM_PRICE}) for Enhance tier`
              : `$${pricePerEdit} per edit`
            }
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center justify-center gap-4">
            <Button
              variant="outline"
              size="icon"
              className="h-12 w-12"
              onClick={() =>
                setState(prev => ({
                  ...prev,
                  quantity: Math.max(minQuantity, prev.quantity - 1),
                }))
              }
              disabled={state.quantity <= minQuantity}
            >
              <Minus className="h-5 w-5" />
            </Button>
            <div className="text-center min-w-[100px]">
              <span className="text-4xl font-bold">{state.quantity}</span>
              <p className="text-sm text-muted-foreground">photos</p>
            </div>
            <Button
              variant="outline"
              size="icon"
              className="h-12 w-12"
              onClick={() =>
                setState(prev => ({
                  ...prev,
                  quantity: prev.quantity + 1,
                }))
              }
            >
              <Plus className="h-5 w-5" />
            </Button>
          </div>

          {/* Quick quantity presets */}
          <div className="flex flex-wrap justify-center gap-2">
            {[10, 25, 50, 100].map((qty) => (
              <Button
                key={qty}
                variant={state.quantity === qty ? 'default' : 'outline'}
                size="sm"
                onClick={() => setState(prev => ({ ...prev, quantity: Math.max(minQuantity, qty) }))}
              >
                {qty} photos
              </Button>
            ))}
          </div>

          {/* Live pricing preview */}
          <div className="p-4 bg-muted/50 rounded-lg border">
            <div className="flex justify-between items-center">
              <span className="text-muted-foreground">
                {state.quantity} × ${pricePerEdit}/edit
              </span>
              <span className="text-xl font-bold">${calculateTotal}</span>
            </div>
            {isEnhance && state.quantity < ENHANCE_MINIMUM && (
              <p className="text-xs text-muted-foreground mt-2">
                Minimum {ENHANCE_MINIMUM} edits required
              </p>
            )}
          </div>

          <div className="flex justify-between mt-6">
            <Button variant="outline" onClick={handleBack}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back
            </Button>
            <Button onClick={handleNext}>
              Next
              <ArrowRight className="h-4 w-4 ml-2" />
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  };

  // Step 3: Summary
  const renderStep3 = () => {
    if (!selectedService) return null;
    const pricePerEdit = selectedService.customer_price || selectedService.base_price;

    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CheckCircle2 className="h-5 w-5 text-foreground" />
            Your Photo Editing Quote
          </CardTitle>
          <CardDescription>
            Review your selection and get started
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-3">
            <div className="flex justify-between py-2 border-b">
              <span className="text-muted-foreground">Edit Type</span>
              <span className="font-medium">{selectedService.name}</span>
            </div>
            <div className="flex justify-between py-2 border-b">
              <span className="text-muted-foreground">Quantity</span>
              <span className="font-medium">{state.quantity} photos</span>
            </div>
            <div className="flex justify-between py-2 border-b">
              <span className="text-muted-foreground">Price per Edit</span>
              <span className="font-medium">${pricePerEdit}</span>
            </div>
          </div>

          <div className="p-4 bg-muted rounded-lg border">
            <div className="flex justify-between items-center">
              <span className="text-lg font-semibold">Total</span>
              <span className="text-2xl font-bold text-foreground">${calculateTotal}</span>
            </div>
          </div>

          {/* Affiliate Code Input */}
          <AffiliateCodeInput 
            value={state.affiliateCode} 
            onChange={(code, name) => setState(prev => ({ ...prev, affiliateCode: code, affiliateName: name }))} 
          />

          {/* Affiliate Earnings Card */}
          <AffiliateEarningsCard customerTotal={calculateTotal} appliedCode={state.affiliateCode} />

          <div className="flex flex-wrap gap-2 justify-between mt-6">
            <Button variant="outline" onClick={handleBack}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back
            </Button>
            {isAdmin && (
              <Button
                variant="outline"
                onClick={async () => {
                  try {
                    await createLog.mutateAsync({
                      log_type: 'photo_editing',
                      log_name: `${selectedService.name} - ${state.quantity} photos`,
                      customer_total: calculateTotal,
                      provider_payout: state.quantity * selectedService.base_price,
                      gross_margin: calculateTotal - (state.quantity * selectedService.base_price),
                      affiliate_code: state.affiliateCode || null,
                      data_json: {
                        service: selectedService,
                        quantity: state.quantity,
                        total: calculateTotal,
                        affiliateCode: state.affiliateCode || null,
                        affiliateName: state.affiliateName || null,
                      },
                    });
                    toast({ title: 'Saved to Admin Logs!' });
                  } catch {
                    toast({ title: 'Failed to save', variant: 'destructive' });
                  }
                }}
                disabled={createLog.isPending}
              >
                <Save className="h-4 w-4 mr-2" />
                {createLog.isPending ? 'Saving...' : 'Save to Logs'}
              </Button>
            )}
            <Button variant="outline" onClick={handleReset}>
              Start Over
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  };

  return (
    <div className="space-y-4">
      {/* Progress indicator */}
      <div className="flex items-center justify-center gap-2 mb-6">
        {[1, 2, 3].map((s) => (
          <div
            key={s}
            className={`h-2 w-8 rounded-full transition-colors ${
              s <= state.step ? 'bg-foreground' : 'bg-muted'
            }`}
          />
        ))}
      </div>

      {state.step === 1 && renderStep1()}
      {state.step === 2 && renderStep2()}
      {state.step === 3 && renderStep3()}
    </div>
  );
}
