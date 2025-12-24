import React, { createContext, useContext, useState, useCallback, useMemo } from 'react';
import { 
  EstimatorSelection, 
  QuoteTotals, 
  InternalTotals, 
  LineItem,
  SessionType,
  StudioType,
  ServiceType,
  TimeSlotType,
  ProviderLevel,
  EditingItem,
  PackagePricing,
} from '@/types/estimator';
import { 
  useDiyRates, 
  useProviderLevels, 
  useVodcastCameraAddons,
} from '@/hooks/useEstimatorData';

interface EstimatorContextValue {
  selection: EstimatorSelection;
  currentStep: number;
  setCurrentStep: (step: number) => void;
  updateSelection: (updates: Partial<EstimatorSelection>) => void;
  resetSelection: () => void;
  applyPackage: (preset: any, packageData?: any) => void;
  totals: QuoteTotals;
  internalTotals: InternalTotals;
  isLoading: boolean;
}

const initialSelection: EstimatorSelection = {
  sessionType: 'diy',
  studioId: null,
  studioType: null,
  serviceId: null,
  serviceType: null,
  timeSlotId: null,
  timeSlotType: null,
  hours: 1,
  providerLevel: null,
  cameraCount: 1,
  autoEditTier: null,
  editingItems: [],
  sessionAddons: [],
  packagePricing: null,
};

const EstimatorContext = createContext<EstimatorContextValue | undefined>(undefined);

export function EstimatorProvider({ children }: { children: React.ReactNode }) {
  const [selection, setSelection] = useState<EstimatorSelection>(initialSelection);
  const [currentStep, setCurrentStep] = useState(0);

  const { data: diyRates, isLoading: ratesLoading } = useDiyRates();
  const { data: providerLevels, isLoading: providersLoading } = useProviderLevels();
  const { data: cameraAddons, isLoading: camerasLoading } = useVodcastCameraAddons();

  const isLoading = ratesLoading || providersLoading || camerasLoading;

  const updateSelection = useCallback((updates: Partial<EstimatorSelection>) => {
    setSelection(prev => ({ ...prev, ...updates }));
  }, []);

  const resetSelection = useCallback(() => {
    setSelection(initialSelection);
    setCurrentStep(0);
  }, []);

  const applyPackage = useCallback((preset: any, packageData?: any) => {
    // If photoshoot, force multimedia_studio
    const studioType = preset.service_type === 'photoshoot' 
      ? 'multimedia_studio' 
      : (preset.studio_type || null);
    
    // Build package pricing if this is a fixed-price package
    let packagePricing: PackagePricing | null = null;
    if (packageData?.is_package_pricing) {
      packagePricing = {
        packageId: packageData.id,
        packageName: packageData.name,
        firstHourPrice: Number(packageData.package_price_first_hour),
        additionalHourPrice: Number(packageData.package_price_additional_hour),
        includedEdits: Number(packageData.included_edits) || 0,
        payoutBase: Number(packageData.payout_base) || 0,
        payoutHourly: Number(packageData.payout_hourly) || 0,
        payoutEditsIncluded: Number(packageData.payout_edits_included) || 0,
      };
    }
    
    setSelection({
      ...initialSelection,
      sessionType: preset.session_type || 'diy',
      studioType,
      serviceType: preset.service_type || null,
      providerLevel: preset.provider_level || null,
      cameraCount: preset.camera_count || 1,
      packagePricing,
    });
    setCurrentStep(3); // Go to time slot selection
  }, []);

  // Calculate totals
  const { totals, internalTotals } = useMemo(() => {
    const lineItems: LineItem[] = [];
    let studioTotal = 0;
    let providerTotal = 0;
    let cameraAddonTotal = 0;
    let autoEditTotal = 0;
    let editingTotal = 0;
    let sessionAddonTotal = 0;
    let packageTotal = 0;

    // Check if we have package pricing (fixed price package)
    const pkg = selection.packagePricing;
    
    if (pkg) {
      // Package pricing - use fixed rates
      if (selection.hours === 1) {
        packageTotal = pkg.firstHourPrice;
      } else {
        packageTotal = pkg.firstHourPrice + (selection.hours - 1) * pkg.additionalHourPrice;
      }
      
      lineItems.push({
        label: `${pkg.packageName} (${selection.hours}hr${selection.hours > 1 ? ` - $${pkg.firstHourPrice} + ${selection.hours - 1}×$${pkg.additionalHourPrice}` : ''})`,
        amount: packageTotal,
        type: 'studio',
      });

      // Add note about included edits if any
      if (pkg.includedEdits > 0) {
        lineItems.push({
          label: `Included: ${pkg.includedEdits} Enhance Edits`,
          amount: 0,
          type: 'editing',
          details: 'Included in package',
        });
      }
    } else {
      // Standard pricing - Find the rate for current studio and time slot
      if (diyRates && selection.studioType && selection.timeSlotType) {
        const rate = diyRates.find(
          r => r.studios?.type === selection.studioType && r.time_slots?.type === selection.timeSlotType
        );
        
        if (rate) {
          const firstHour = Number(rate.first_hour_rate);
          const afterFirstHour = rate.after_first_hour_rate ? Number(rate.after_first_hour_rate) : null;
          
          if (afterFirstHour !== null && selection.hours > 1) {
            studioTotal = firstHour + (selection.hours - 1) * afterFirstHour;
            lineItems.push({
              label: `Studio (1hr @ $${firstHour} + ${selection.hours - 1}hr @ $${afterFirstHour})`,
              amount: studioTotal,
              type: 'studio',
            });
          } else {
            studioTotal = selection.hours * firstHour;
            lineItems.push({
              label: `Studio (${selection.hours}hr @ $${firstHour}/hr)`,
              amount: studioTotal,
              type: 'studio',
            });
          }
        }
      }

      // Provider add-on (if serviced and NOT package pricing)
      if (selection.sessionType === 'serviced' && selection.providerLevel && providerLevels) {
        const provider = providerLevels.find(p => p.level === selection.providerLevel);
        if (provider) {
          const providerHourlyRate = Number(provider.hourly_rate);
          providerTotal = providerHourlyRate * selection.hours;
          lineItems.push({
            label: `Production Crew ${selection.providerLevel.toUpperCase()} (${selection.hours}hr @ $${providerHourlyRate}/hr)`,
            amount: providerTotal,
            type: 'provider',
          });
        }
      }
    }

    // Camera add-on (for vodcast)
    if (selection.serviceType === 'vodcast' && selection.cameraCount > 1 && cameraAddons) {
      const addon = cameraAddons.find(a => a.cameras === selection.cameraCount);
      if (addon) {
        cameraAddonTotal = Number(addon.customer_addon_amount);
        lineItems.push({
          label: `Camera Add-on (${selection.cameraCount} cameras)`,
          amount: cameraAddonTotal,
          type: 'camera',
        });
      }
    }

    // Editing items - use customerPrice for client total
    selection.editingItems.forEach(item => {
      const itemTotal = item.customerPrice * item.quantity;
      editingTotal += itemTotal;
      lineItems.push({
        label: `${item.name} (x${item.quantity} @ $${item.customerPrice}/ea)`,
        amount: itemTotal,
        type: 'editing',
      });
    });

    // Session add-ons (flat or hourly)
    selection.sessionAddons.forEach(addon => {
      const addonAmount = addon.isHourly 
        ? addon.flatAmount * selection.hours 
        : addon.flatAmount;
      sessionAddonTotal += addonAmount;
      lineItems.push({
        label: addon.isHourly 
          ? `${addon.name} (${selection.hours}hr × $${addon.flatAmount}/hr)` 
          : addon.name,
        amount: addonAmount,
        type: 'session_addon',
      });
    });

    const customerTotal = packageTotal + studioTotal + providerTotal + cameraAddonTotal + autoEditTotal + editingTotal + sessionAddonTotal;

    // Internal calculations
    let providerBasePay = 0;
    let providerHourlyPay = 0;
    let editorPayout = 0;

    if (pkg) {
      // Package payout calculation
      providerBasePay = pkg.payoutBase;
      providerHourlyPay = pkg.payoutHourly * selection.hours;
      // Editor gets $5/edit for the included edits
      editorPayout = pkg.payoutEditsIncluded * 5;
    } else {
      // Standard payout calculation
      if (selection.sessionType === 'serviced') {
        if (selection.serviceType === 'photoshoot') {
          providerBasePay = 60;
        } else if (selection.serviceType === 'vodcast') {
          providerBasePay = 30 * selection.cameraCount;
        }
        
        if (selection.providerLevel && providerLevels) {
          const provider = providerLevels.find(p => p.level === selection.providerLevel);
          if (provider) {
            providerHourlyPay = Number(provider.hourly_rate) * selection.hours;
          }
        }
      }
    }

    // Add editor payout for additional editing items (basePrice = payout rate)
    selection.editingItems.forEach(item => {
      editorPayout += item.basePrice * item.quantity;
    });

    const providerPayout = providerBasePay + providerHourlyPay + editorPayout;
    const grossMargin = customerTotal - providerPayout;
    const marginPerHour = selection.hours > 0 ? grossMargin / selection.hours : 0;
    const marginPercent = customerTotal > 0 ? (grossMargin / customerTotal) * 100 : 0;

    return {
      totals: {
        studioTotal: packageTotal || studioTotal,
        providerTotal,
        cameraAddonTotal,
        autoEditTotal,
        editingTotal,
        sessionAddonTotal,
        customerTotal,
        lineItems,
      },
      internalTotals: {
        studioTotal: packageTotal || studioTotal,
        providerTotal,
        cameraAddonTotal,
        autoEditTotal,
        editingTotal,
        sessionAddonTotal,
        customerTotal,
        lineItems,
        providerBasePay,
        providerHourlyPay,
        providerPayout,
        grossMargin,
        marginPerHour,
        marginPercent,
      },
    };
  }, [selection, diyRates, providerLevels, cameraAddons]);

  const value: EstimatorContextValue = {
    selection,
    currentStep,
    setCurrentStep,
    updateSelection,
    resetSelection,
    applyPackage,
    totals,
    internalTotals,
    isLoading,
  };

  return (
    <EstimatorContext.Provider value={value}>
      {children}
    </EstimatorContext.Provider>
  );
}

export function useEstimator(): EstimatorContextValue {
  const context = useContext(EstimatorContext);
  if (context === undefined) {
    throw new Error('useEstimator must be used within EstimatorProvider');
  }
  return context;
}
