-- Add sort_order column to time_slots table
ALTER TABLE public.time_slots ADD COLUMN sort_order INTEGER DEFAULT 0;

-- Set proper ordering: Mon-Wed (1-2), Thu-Fri (3-4), Sat-Sun (5-6)
UPDATE public.time_slots SET sort_order = 1 WHERE type = 'mon_wed_day';
UPDATE public.time_slots SET sort_order = 2 WHERE type = 'mon_wed_eve';
UPDATE public.time_slots SET sort_order = 3 WHERE type = 'thu_fri_day';
UPDATE public.time_slots SET sort_order = 4 WHERE type = 'thu_fri_eve';
UPDATE public.time_slots SET sort_order = 5 WHERE type = 'sat_sun_day';
UPDATE public.time_slots SET sort_order = 6 WHERE type = 'sat_sun_eve';