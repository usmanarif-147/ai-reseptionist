-- WIMP-06: Booking Integration Bridge
-- Adds nullable columns to appointments so widget-driven bookings link back to the
-- chat session/visitor/customer that drove them. Direct booking-page users leave
-- these NULL (fully backwards-compatible).
-- Safe to run multiple times (idempotent).

ALTER TABLE public.appointments
  ADD COLUMN IF NOT EXISTS chat_session_id UUID,
  ADD COLUMN IF NOT EXISTS visitor_id TEXT,
  ADD COLUMN IF NOT EXISTS widget_customer_id UUID REFERENCES public.widget_customers(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_appointments_business_chat_session
  ON public.appointments (business_id, chat_session_id);
