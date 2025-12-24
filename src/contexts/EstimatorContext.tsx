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
} from '@/types/estimator';
import { 
  useDiyRates, 
  useProviderLevels, 
  useVodcastCameraAddons, 
  useVerticalAutoeditAddons 
} from '@/hooks/useEstimatorData';

interface EstimatorContextValue {
  selection: EstimatorSelection;
  currentStep: number;
  setCurrentStep: (step: number) => void;
  updateSelection: (updates: Partial<EstimatorSelection>) => void;
  resetSelection: () => void;
  applyPackage: (preset: any) => void;
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
};

const EstimatorContext = createContext<EstimatorContextValue | undefined>(undefined);

export function EstimatorProvider({ children }: { children: React.ReactNode }) {
  const [selection, setSelection] = useState<EstimatorSelection>(initialSelection);
  const [currentStep, setCurrentStep] = useState(0);

  const { data: diyRates, isLoading: ratesLoading } = useDiyRates();
  const { data: providerLevels, isLoading: providersLoading } = useProviderLevels();
  const { data: cameraAddons, isLoading: camerasLoading } = useVodcastCameraAddons();
  const { data: autoEditAddons, isLoading: autoEditLoading } = useVerticalAutoeditAddons();

  const isLoading = ratesLoading || providersLoading || camerasLoading || autoEditLoading;

  const updateSelection = useCallback((updates: Partial<EstimatorSelection>) => {
    setSelection(prev => ({ ...prev, ...updates }));
  }, []);

  const resetSelection = useCallback(() => {
    setSelection(initialSelection);
    setCurrentStep(0);
  }, []);

  const applyPackage = useCallback((preset: any) => {
    // If photoshoot, force multimedia_studio
    const studioType = preset.service_type === 'photoshoot' 
      ? 'multimedia_studio' 
      : (preset.studio_type || null);
    
    setSelection({
      ...initialSelection,
      sessionType: preset.session_type || 'diy',
      studioType,
      serviceType: preset.service_type || null,
      providerLevel: preset.provider_level || null,
      cameraCount: preset.camera_count || 1,
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

    // Find the rate for current studio and time slot
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

    // Provider add-on (if serviced)
    let providerHourlyRate = 0;
    if (selection.sessionType === 'serviced' && selection.providerLevel && providerLevels) {
      const provider = providerLevels.find(p => p.level === selection.providerLevel);
      if (provider) {
        providerHourlyRate = Number(provider.hourly_rate);
        providerTotal = providerHourlyRate * selection.hours;
        lineItems.push({
          label: `Production Crew ${selection.providerLevel.toUpperCase()} (${selection.hours}hr @ $${providerHourlyRate}/hr)`,
          amount: providerTotal,
          type: 'provider',
        });
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

    // Auto-edit add-on
    if (selection.autoEditTier && autoEditAddons && selection.timeSlotType) {
      const timeSlotGroup = selection.timeSlotType.startsWith('mon_wed') ? 'mon_wed' 
        : selection.timeSlotType.startsWith('thu_fri') ? 'thu_fri' : 'sat_sun';
      
      const addon = autoEditAddons.find(
        a => a.time_slot_group === timeSlotGroup && a.tier_name === selection.autoEditTier
      );
      
      if (addon) {
        const hourlyAmount = Number(addon.hourly_amount);
        autoEditTotal = hourlyAmount * selection.hours;
        lineItems.push({
          label: `Auto-Edited Vertical Video (${selection.autoEditTier} - ${selection.hours}hr @ $${hourlyAmount}/hr)`,
          amount: autoEditTotal,
          type: 'autoedit',
        });
      }
    }

    // Editing items
    selection.editingItems.forEach(item => {
      const itemTotal = item.basePrice + (item.incrementPrice || 0) * Math.max(0, item.quantity - 1);
      editingTotal += itemTotal;
      lineItems.push({
        label: `${item.name} (x${item.quantity})`,
        amount: itemTotal,
        type: 'editing',
      });
    });

    const customerTotal = studioTotal + providerTotal + cameraAddonTotal + autoEditTotal + editingTotal;

    // Internal calculations
    let providerBasePay = 0;
    if (selection.sessionType === 'serviced' && selection.serviceType === 'photoshoot') {
      providerBasePay = 60;
    } else if (selection.sessionType === 'serviced' && selection.serviceType === 'vodcast') {
      providerBasePay = 30 * selection.cameraCount;
    }

    const providerHourlyPay = providerHourlyRate * selection.hours;
    const providerPayout = providerBasePay + providerHourlyPay;
    const grossMargin = customerTotal - providerPayout;
    const marginPerHour = selection.hours > 0 ? grossMargin / selection.hours : 0;
    const marginPercent = customerTotal > 0 ? (grossMargin / customerTotal) * 100 : 0;

    return {
      totals: {
        studioTotal,
        providerTotal,
        cameraAddonTotal,
        autoEditTotal,
        editingTotal,
        customerTotal,
        lineItems,
      },
      internalTotals: {
        studioTotal,
        providerTotal,
        cameraAddonTotal,
        autoEditTotal,
        editingTotal,
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
  }, [selection, diyRates, providerLevels, cameraAddons, autoEditAddons]);

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

export function useEstimator() {
  const context = useContext(EstimatorContext);
  if (!context) {
    throw new Error('useEstimator must be used within EstimatorProvider');
  }
  return context;
}
