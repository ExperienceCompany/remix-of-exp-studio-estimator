export type SessionType = 'diy' | 'serviced';
export type StudioType = 'podcast_room' | 'audio_studio' | 'multimedia_studio' | 'digital_edit_studio' | 'full_studio_buyout';
export type ServiceType = 'audio_podcast' | 'vodcast' | 'recording_session' | 'photoshoot';
export type TimeSlotType = 'mon_wed_day' | 'mon_wed_eve' | 'thu_fri_day' | 'thu_fri_eve' | 'sat_sun_day' | 'sat_sun_eve';
export type ProviderLevel = 'lv1' | 'lv2' | 'lv3';
export type QuoteStatus = 'draft' | 'sent' | 'approved' | 'completed';

export interface PackagePricing {
  packageId: string;
  packageName: string;
  firstHourPrice: number;
  additionalHourPrice: number;
  includedEdits: number;
  payoutBase: number;
  payoutHourly: number;
  payoutEditsIncluded: number;
}

export interface EstimatorSelection {
  sessionType: SessionType;
  studioId: string | null;
  studioType: StudioType | null;
  serviceId: string | null;
  serviceType: ServiceType | null;
  timeSlotId: string | null;
  timeSlotType: TimeSlotType | null;
  hours: number;
  providerLevel: ProviderLevel | null;
  cameraCount: number;
  autoEditTier: string | null;
  editingItems: EditingItem[];
  sessionAddons: SessionAddon[];
  packagePricing: PackagePricing | null;
}

export interface SessionAddon {
  id: string;
  name: string;
  flatAmount: number;
}

export interface EditingItem {
  id: string;
  name: string;
  quantity: number;
  basePrice: number;      // Internal payout rate
  customerPrice: number;  // Customer-facing price (2× payout)
  incrementPrice: number | null;
}

export interface LineItem {
  label: string;
  amount: number;
  type: 'studio' | 'provider' | 'camera' | 'autoedit' | 'editing' | 'session_addon';
  details?: string;
}

export interface QuoteTotals {
  studioTotal: number;
  providerTotal: number;
  cameraAddonTotal: number;
  autoEditTotal: number;
  editingTotal: number;
  sessionAddonTotal: number;
  customerTotal: number;
  lineItems: LineItem[];
}

export interface InternalTotals extends QuoteTotals {
  providerBasePay: number;
  providerHourlyPay: number;
  providerPayout: number;
  grossMargin: number;
  marginPerHour: number;
  marginPercent: number;
}

export interface Package {
  id: string;
  name: string;
  description: string | null;
  preset_json: {
    session_type: SessionType;
    studio_type: StudioType;
    service_type: ServiceType;
    provider_level?: ProviderLevel;
    camera_count?: number;
  };
  display_order: number;
  is_package_pricing: boolean | null;
  package_price_first_hour: number | null;
  package_price_additional_hour: number | null;
  included_edits: number | null;
  payout_base: number | null;
  payout_hourly: number | null;
  payout_edits_included: number | null;
}

export const STEP_LABELS = [
  'Session Type',
  'Studio',
  'Service',
  'Day & Time',
  'Duration',
  'Add-ons',
  'Summary',
] as const;

export const DIY_STEP_LABELS = [
  'Session Type',
  'Studio',
  'Day & Time',
  'Duration',
  'Add-ons',
  'Summary',
] as const;

export const STUDIO_LABELS: Record<StudioType, string> = {
  podcast_room: 'Podcast Room',
  audio_studio: 'Audio Studio',
  multimedia_studio: 'Multimedia Studio',
  digital_edit_studio: 'Digital/Edit Studio',
  full_studio_buyout: 'Full Studio / Lobby',
};

export const SERVICE_LABELS: Record<ServiceType, string> = {
  audio_podcast: 'Audio Podcast',
  vodcast: 'Vodcast',
  recording_session: 'Recording Session',
  photoshoot: 'Photoshoot',
};

export const TIME_SLOT_LABELS: Record<TimeSlotType, string> = {
  mon_wed_day: 'Mon-Wed Day (10am-4pm)',
  mon_wed_eve: 'Mon-Wed Evening (4pm-10pm)',
  thu_fri_day: 'Thu-Fri Day (10am-4pm)',
  thu_fri_eve: 'Thu-Fri Evening (4pm-10pm)',
  sat_sun_day: 'Sat-Sun Day (10am-4pm)',
  sat_sun_eve: 'Sat-Sun Evening (4pm-10pm)',
};

export const PROVIDER_LEVEL_LABELS: Record<ProviderLevel, string> = {
  lv1: 'Level 1 (+$20/hr)',
  lv2: 'Level 2 (+$30/hr)',
  lv3: 'Level 3 (+$40/hr)',
};
