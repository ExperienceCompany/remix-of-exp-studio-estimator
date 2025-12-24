// EXP Studio Calculation Engine

export interface StudioRate {
  firstHourRate: number;
  afterFirstHourRate: number | null;
}

export interface ProviderLevel {
  level: 'lv1' | 'lv2' | 'lv3';
  hourlyRate: number;
}

export interface SelectionState {
  sessionType: 'diy' | 'serviced';
  studioType: string;
  serviceType: string;
  timeSlotType: string;
  hours: number;
  providerLevel?: 'lv1' | 'lv2' | 'lv3';
  cameraCount?: number;
  autoEditTier?: string;
  editingItems?: { id: string; quantity: number }[];
}

export interface CalculationResult {
  studioTotal: number;
  providerTotal: number;
  cameraAddonTotal: number;
  autoEditTotal: number;
  editingTotal: number;
  customerTotal: number;
  providerPayout: number;
  grossMargin: number;
  marginPerHour: number;
  marginPercent: number;
  lineItems: LineItem[];
}

export interface LineItem {
  label: string;
  amount: number;
  type: 'studio' | 'provider' | 'addon' | 'editing';
  details?: string;
}

// Calculate studio total with first-hour and after-first-hour rates
export function calcStudioTotal(
  rate: StudioRate,
  hours: number
): number {
  if (hours <= 0) return 0;
  
  if (rate.afterFirstHourRate !== null && hours > 1) {
    return rate.firstHourRate + (hours - 1) * rate.afterFirstHourRate;
  }
  
  return hours * rate.firstHourRate;
}

// Get the time slot group for auto-edit add-ons
export function getTimeSlotGroup(timeSlotType: string): string {
  if (timeSlotType.startsWith('mon_wed')) return 'mon_wed';
  if (timeSlotType.startsWith('thu_fri')) return 'thu_fri';
  if (timeSlotType.startsWith('sat_sun')) return 'sat_sun';
  return 'mon_wed';
}

// Calculate camera add-on amount
export function getCameraAddonAmount(cameraCount: number): number {
  if (cameraCount <= 1) return 0;
  if (cameraCount === 2) return 40;
  if (cameraCount >= 3) return 80;
  return 0;
}

// Calculate provider payout (internal)
export function calcProviderPayout(
  serviceType: string,
  providerHourlyRate: number,
  hours: number,
  cameraCount: number = 1
): number {
  let payout = providerHourlyRate * hours;
  
  // Add base pay based on service type
  if (serviceType === 'photoshoot') {
    payout += 60; // $60 base for photoshoot
  } else if (serviceType === 'vodcast') {
    payout += 30 * cameraCount; // $30 per camera angle
  }
  
  return payout;
}

// Get provider hourly rate by level
export function getProviderHourlyRate(level: 'lv1' | 'lv2' | 'lv3'): number {
  const rates = { lv1: 20, lv2: 30, lv3: 40 };
  return rates[level] || 0;
}

// Format currency
export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(amount);
}

// Format percentage
export function formatPercent(value: number): string {
  return `${value.toFixed(1)}%`;
}
