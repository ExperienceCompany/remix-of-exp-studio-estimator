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
  CrewAllocation,
  CrewPayoutDetail,
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

const initialCrewAllocation: CrewAllocation = { lv1: 0, lv2: 0, lv3: 0 };

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
  crewAllocation: initialCrewAllocation,
  cameraCount: 1,
  autoEditTier: null,
  editingItems: [],
  sessionAddons: [],
  packagePricing: null,
  affiliateCode: null,
  affiliateLeadCount: 0,
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
    // Determine studio type based on service type restrictions
    const getStudioType = () => {
      // Services with single studio requirement
      if (preset.service_type === 'photoshoot') return 'multimedia_studio';
      if (preset.service_type === 'recording_session') return 'audio_studio';
      if (preset.service_type === 'audio_podcast') return 'podcast_room';
      // For vodcast or others, use provided studio_type
      return preset.studio_type || null;
    };
    
    const studioType = getStudioType();
    
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
    
    const isServiced = preset.session_type === 'serviced';
    const isDiy = preset.session_type === 'diy';
    
    setSelection({
      ...initialSelection,
      sessionType: preset.session_type || 'diy',
      studioType,
      serviceType: preset.service_type || null,
      providerLevel: preset.provider_level || (isServiced ? 'lv2' : null),
      crewAllocation: isServiced ? { lv1: 0, lv2: 1, lv3: 0 } : initialCrewAllocation,
      cameraCount: preset.camera_count || 1,
      packagePricing,
    });
    
    // Navigate to the appropriate step
    // For DIY: step 2 is Day/Time
    // For serviced: step 3 is Day/Time
    if (isDiy) {
      setCurrentStep(2); // DIY: Day/Time is step 2
    } else {
      setCurrentStep(3); // Serviced: Day/Time is step 3
    }
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
      // Use crewAllocation for multi-level crew pricing
      if (selection.sessionType === 'serviced' && providerLevels) {
        const { lv1, lv2, lv3 } = selection.crewAllocation;
        const totalCrew = lv1 + lv2 + lv3;
        
        if (totalCrew > 0) {
          const lv1Rate = providerLevels.find(p => p.level === 'lv1')?.hourly_rate || 20;
          const lv2Rate = providerLevels.find(p => p.level === 'lv2')?.hourly_rate || 30;
          const lv3Rate = providerLevels.find(p => p.level === 'lv3')?.hourly_rate || 40;
          
          providerTotal = (lv1 * Number(lv1Rate) + lv2 * Number(lv2Rate) + lv3 * Number(lv3Rate)) * selection.hours;
          
          // Add line items for each level with crew
          if (lv1 > 0) {
            lineItems.push({
              label: `Lv1 Crew × ${lv1} (${selection.hours}hr @ $${lv1Rate}/hr)`,
              amount: lv1 * Number(lv1Rate) * selection.hours,
              type: 'provider',
            });
          }
          if (lv2 > 0) {
            lineItems.push({
              label: `Lv2 Crew × ${lv2} (${selection.hours}hr @ $${lv2Rate}/hr)`,
              amount: lv2 * Number(lv2Rate) * selection.hours,
              type: 'provider',
            });
          }
          if (lv3 > 0) {
            lineItems.push({
              label: `Lv3 Crew × ${lv3} (${selection.hours}hr @ $${lv3Rate}/hr)`,
              amount: lv3 * Number(lv3Rate) * selection.hours,
              type: 'provider',
            });
          }
        } else if (selection.providerLevel) {
          // Fallback to single provider level for backward compatibility
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

    // Video editing config for duration-based pricing
    const VIDEO_EDITING_CONFIG: Record<string, { baseDuration: number; incrementDuration: number }> = {
      social: { baseDuration: 1, incrementDuration: 1 },
      general_basic: { baseDuration: 15, incrementDuration: 15 },
      general_advanced: { baseDuration: 15, incrementDuration: 15 },
      long_form_simple: { baseDuration: 900, incrementDuration: 900 },
      long_form_advanced: { baseDuration: 900, incrementDuration: 900 },
    };

    // Editing items - calculate based on category type
    selection.editingItems.forEach(item => {
      const config = VIDEO_EDITING_CONFIG[item.category];
      let itemTotal: number;
      let labelDetails: string;
      
      if (config) {
        // Video editing: duration-based pricing
        const duration = item.quantity;
        if (duration <= config.baseDuration) {
          itemTotal = item.customerPrice;
        } else {
          const additionalIncrements = Math.ceil((duration - config.baseDuration) / config.incrementDuration);
          itemTotal = item.customerPrice + (additionalIncrements * (item.incrementPrice || 0));
        }
        
        // Format duration for display
        const formatDuration = (seconds: number) => {
          if (item.category === 'social') return `${seconds} bucket${seconds > 1 ? 's' : ''}`;
          if (seconds < 60) return `${seconds}s`;
          const mins = Math.floor(seconds / 60);
          if (mins < 60) return `${mins}min`;
          const hrs = Math.floor(mins / 60);
          return `${hrs}h${mins % 60 > 0 ? ` ${mins % 60}m` : ''}`;
        };
        labelDetails = formatDuration(duration);
      } else {
        // Photo editing: simple quantity × price
        itemTotal = item.customerPrice * item.quantity;
        labelDetails = `x${item.quantity} @ $${item.customerPrice}/ea`;
      }
      
      editingTotal += itemTotal;
      
      // Build crew assignment string for display
      let crewStr = '';
      if (item.assignedCrew) {
        const crewParts: string[] = [];
        if (item.assignedCrew.lv1) crewParts.push(item.assignedCrew.lv1 > 1 ? `Lv1 ×${item.assignedCrew.lv1}` : 'Lv1');
        if (item.assignedCrew.lv2) crewParts.push(item.assignedCrew.lv2 > 1 ? `Lv2 ×${item.assignedCrew.lv2}` : 'Lv2');
        if (item.assignedCrew.lv3) crewParts.push(item.assignedCrew.lv3 > 1 ? `Lv3 ×${item.assignedCrew.lv3}` : 'Lv3');
        if (crewParts.length > 0) crewStr = ` • ${crewParts.join(', ')}`;
      }
      
      lineItems.push({
        label: `${item.name} (${labelDetails})${crewStr}`,
        amount: itemTotal,
        type: 'editing',
      });
    });

    // Session add-ons (flat, hourly, or revision buckets)
    selection.sessionAddons.forEach(addon => {
      let addonAmount: number;
      let labelText: string;
      
      if (addon.name === 'Revisions' && addon.hours) {
        addonAmount = addon.flatAmount * addon.hours;
        labelText = `${addon.name} (${addon.hours}hr × $${addon.flatAmount}/hr)`;
      } else if (addon.isHourly) {
        addonAmount = addon.flatAmount * selection.hours;
        labelText = `${addon.name} (${selection.hours}hr × $${addon.flatAmount}/hr)`;
      } else {
        addonAmount = addon.flatAmount;
        labelText = addon.name;
      }
      
      sessionAddonTotal += addonAmount;
      lineItems.push({
        label: labelText,
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
        
        // Use crewAllocation for payout
        const { lv1, lv2, lv3 } = selection.crewAllocation;
        const totalCrew = lv1 + lv2 + lv3;
        
        if (totalCrew > 0 && providerLevels) {
          const lv1Rate = providerLevels.find(p => p.level === 'lv1')?.hourly_rate || 20;
          const lv2Rate = providerLevels.find(p => p.level === 'lv2')?.hourly_rate || 30;
          const lv3Rate = providerLevels.find(p => p.level === 'lv3')?.hourly_rate || 40;
          providerHourlyPay = (lv1 * Number(lv1Rate) + lv2 * Number(lv2Rate) + lv3 * Number(lv3Rate)) * selection.hours;
        } else if (selection.providerLevel && providerLevels) {
          // Fallback to single provider level
          const provider = providerLevels.find(p => p.level === selection.providerLevel);
          if (provider) {
            providerHourlyPay = Number(provider.hourly_rate) * selection.hours;
          }
        }
      }
    }

    // Add editor payout for additional editing items
    selection.editingItems.forEach(item => {
      const config = VIDEO_EDITING_CONFIG[item.category];
      if (config) {
        // Video editing: duration-based payout using base_price as internal rate
        const duration = item.quantity;
        if (duration <= config.baseDuration) {
          editorPayout += item.basePrice;
        } else {
          const additionalIncrements = Math.ceil((duration - config.baseDuration) / config.incrementDuration);
          // Internal increment = half of customer increment (since incrementPrice is already customer-facing)
          const internalIncrement = (item.incrementPrice || 0) / 2;
          editorPayout += item.basePrice + (additionalIncrements * internalIncrement);
        }
      } else {
        // Photo editing: quantity × basePrice
        editorPayout += item.basePrice * item.quantity;
      }
    });

    // Calculate per-crew payout breakdown
    const crewPayoutBreakdown: CrewPayoutDetail[] = [];
    const { lv1, lv2, lv3 } = selection.crewAllocation;
    const totalCrew = lv1 + lv2 + lv3;
    const basePayPerCrew = totalCrew > 0 ? providerBasePay / totalCrew : 0;

    if (selection.sessionType === 'serviced' && providerLevels && totalCrew > 0) {
      const lv1Rate = Number(providerLevels.find(p => p.level === 'lv1')?.hourly_rate || 20);
      const lv2Rate = Number(providerLevels.find(p => p.level === 'lv2')?.hourly_rate || 30);
      const lv3Rate = Number(providerLevels.find(p => p.level === 'lv3')?.hourly_rate || 40);

      if (lv1 > 0) {
        const hourlyPayout = lv1 * lv1Rate * selection.hours;
        const baseSplit = basePayPerCrew * lv1;
        crewPayoutBreakdown.push({
          level: 'lv1',
          count: lv1,
          hourlyRate: lv1Rate,
          hourlyPayout,
          baseSplit,
          totalPayout: hourlyPayout + baseSplit,
        });
      }
      if (lv2 > 0) {
        const hourlyPayout = lv2 * lv2Rate * selection.hours;
        const baseSplit = basePayPerCrew * lv2;
        crewPayoutBreakdown.push({
          level: 'lv2',
          count: lv2,
          hourlyRate: lv2Rate,
          hourlyPayout,
          baseSplit,
          totalPayout: hourlyPayout + baseSplit,
        });
      }
      if (lv3 > 0) {
        const hourlyPayout = lv3 * lv3Rate * selection.hours;
        const baseSplit = basePayPerCrew * lv3;
        crewPayoutBreakdown.push({
          level: 'lv3',
          count: lv3,
          hourlyRate: lv3Rate,
          hourlyPayout,
          baseSplit,
          totalPayout: hourlyPayout + baseSplit,
        });
      }
    }

    const providerPayout = providerBasePay + providerHourlyPay + editorPayout;
    const grossMargin = customerTotal - providerPayout;
    const marginPerHour = selection.hours > 0 ? grossMargin / selection.hours : 0;
    const marginPercent = customerTotal > 0 ? (grossMargin / customerTotal) * 100 : 0;

    // Affiliate commission calculation
    const getCommissionRate = (leadCount: number): number => {
      if (leadCount >= 30) return 0.30;
      if (leadCount >= 21) return 0.20;
      if (leadCount >= 10) return 0.10;
      return 0.05;
    };

    const affiliateCommissionRate = selection.affiliateCode ? getCommissionRate(selection.affiliateLeadCount) : 0;
    const affiliatePayout = selection.affiliateCode ? customerTotal * affiliateCommissionRate : 0;
    const adjustedGrossMargin = grossMargin - affiliatePayout;
    const adjustedMarginPerHour = selection.hours > 0 ? adjustedGrossMargin / selection.hours : 0;
    const adjustedMarginPercent = customerTotal > 0 ? (adjustedGrossMargin / customerTotal) * 100 : 0;

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
        crewPayoutBreakdown,
        editorPayout,
        affiliateCommissionRate,
        affiliatePayout,
        adjustedGrossMargin,
        adjustedMarginPerHour,
        adjustedMarginPercent,
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

