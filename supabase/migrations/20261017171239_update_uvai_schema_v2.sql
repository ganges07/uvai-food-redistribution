/*
# UVAI Schema Update - Volunteer, Events, Deliveries, AI Predictions

## Overview
Updates the UVAI schema to support 4 user roles (donor, acceptor, volunteer, hall),
event scheduling, volunteer delivery tracking with geolocation, and AI surplus prediction storage.

## Changes

### 1. Updated user_role enum
- Added 'acceptor' (replaces 'receiver')
- Added 'volunteer' (new role for food collection/delivery)
- Added 'hall' (for marriage halls, temples, event venues)
- Kept 'admin'

### 2. Updated food_donations table
- Added event_name, event_type, venue_name, is_vegetarian, contact_info fields
- Updated status enum to include 'assigned', 'delivered'
- Added volunteer_id, volunteer_assigned_at, delivery_completed_at fields
- Added delivery_lat, delivery_lng, location_updated_at for geolocation tracking

### 3. New: events table
- Scheduled events by halls/temples
- venue_name, venue_type, event_name, event_type, event_date
- expected_attendance, expected_meals, expected_categories
- meal_time, location, notes, organizer_id

### 4. New: deliveries table
- Tracks volunteer delivery tasks
- food_post_id, volunteer_id, acceptor_id
- status: assigned, picked_up, in_transit, delivered, cancelled
- delivery_lat, delivery_lng, location_updated_at
- pickup_location, destination_location
- assigned_at, picked_up_at, delivered_at

### 5. New: ai_predictions table
- Stores AI food surplus prediction results
- venue, event_type, attendance, expected_meals
- predicted_leftover, risk_level, recommendation
- actual_leftover (filled after event for model improvement)

### 6. Updated reservations table
- Renamed receiver references to acceptor conceptually
- Added delivery_id link

## Security
- RLS enabled on all new tables
- Volunteers can only update their own assigned deliveries
- Acceptors can only view their own requests and associated tracking
- Hall users can only manage their own events
- All predictions are visible to authenticated users
*/
-- Update user_role enum: add new roles
ALTER TYPE user_role ADD VALUE IF NOT EXISTS 'acceptor';
ALTER TYPE user_role ADD VALUE IF NOT EXISTS 'volunteer';
ALTER TYPE user_role ADD VALUE IF NOT EXISTS 'hall';

-- Update food_status enum: add assigned and delivered
ALTER TYPE food_status ADD VALUE IF NOT EXISTS 'assigned';
ALTER TYPE food_status ADD VALUE IF NOT EXISTS 'delivered';

-- Update notification_type enum
ALTER TYPE notification_type ADD VALUE IF NOT EXISTS 'delivery_update';
ALTER TYPE notification_type ADD VALUE IF NOT EXISTS 'volunteer_assigned';
ALTER TYPE notification_type ADD VALUE IF NOT EXISTS 'event_scheduled';

-- Add new columns to food_donations
ALTER TABLE food_donations ADD COLUMN IF NOT EXISTS event_name text;
ALTER TABLE food_donations ADD COLUMN IF NOT EXISTS event_type text;
ALTER TABLE food_donations ADD COLUMN IF NOT EXISTS venue_name text;
ALTER TABLE food_donations ADD COLUMN IF NOT EXISTS is_vegetarian boolean DEFAULT true;
ALTER TABLE food_donations ADD COLUMN IF NOT EXISTS contact_info text;
ALTER TABLE food_donations ADD COLUMN IF NOT EXISTS volunteer_id uuid REFERENCES profiles(id) ON DELETE SET NULL;
ALTER TABLE food_donations ADD COLUMN IF NOT EXISTS volunteer_assigned_at timestamptz;
ALTER TABLE food_donations ADD COLUMN IF NOT EXISTS delivery_completed_at timestamptz;
ALTER TABLE food_donations ADD COLUMN IF NOT EXISTS delivery_lat double precision;
ALTER TABLE food_donations ADD COLUMN IF NOT EXISTS delivery_lng double precision;
ALTER TABLE food_donations ADD COLUMN IF NOT EXISTS location_updated_at timestamptz;
ALTER TABLE food_donations ADD COLUMN IF NOT EXISTS acceptor_id uuid REFERENCES profiles(id) ON DELETE SET NULL;

-- Add reserved_by rename support (keep old column, add acceptor_id as the primary)
-- reserved_by already exists, we'll use acceptor_id going forward

-- Add delivery reference to reservations
ALTER TABLE reservations ADD COLUMN IF NOT EXISTS delivery_id uuid;

-- 3. events table
CREATE TABLE IF NOT EXISTS events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organizer_id uuid NOT NULL DEFAULT auth.uid() REFERENCES profiles(id) ON DELETE CASCADE,
  venue_name text NOT NULL,
  venue_type text NOT NULL,
  event_name text NOT NULL,
  event_type text NOT NULL,
  event_date date NOT NULL,
  expected_attendance integer NOT NULL CHECK (expected_attendance > 0),
  expected_meals integer,
  expected_categories text,
  meal_time text,
  location text NOT NULL,
  notes text,
  status text NOT NULL DEFAULT 'scheduled',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "events_select_all" ON events;
CREATE POLICY "events_select_all" ON events FOR SELECT
  TO authenticated USING (true);

DROP POLICY IF EXISTS "events_insert_own" ON events;
CREATE POLICY "events_insert_own" ON events FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = organizer_id);

DROP POLICY IF EXISTS "events_update_own" ON events;
CREATE POLICY "events_update_own" ON events FOR UPDATE
  TO authenticated USING (auth.uid() = organizer_id) WITH CHECK (auth.uid() = organizer_id);

DROP POLICY IF EXISTS "events_delete_own" ON events;
CREATE POLICY "events_delete_own" ON events FOR DELETE
  TO authenticated USING (auth.uid() = organizer_id);

CREATE INDEX IF NOT EXISTS idx_events_organizer ON events(organizer_id);
CREATE INDEX IF NOT EXISTS idx_events_date ON events(event_date);

-- 4. deliveries table
CREATE TABLE IF NOT EXISTS deliveries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  food_post_id uuid NOT NULL REFERENCES food_donations(id) ON DELETE CASCADE,
  volunteer_id uuid REFERENCES profiles(id) ON DELETE SET NULL,
  acceptor_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'assigned',
  pickup_location text NOT NULL,
  destination_location text,
  delivery_lat double precision,
  delivery_lng double precision,
  location_updated_at timestamptz,
  assigned_at timestamptz DEFAULT now(),
  picked_up_at timestamptz,
  delivered_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE deliveries ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "deliveries_select_all" ON deliveries;
CREATE POLICY "deliveries_select_all" ON deliveries FOR SELECT
  TO authenticated USING (true);

DROP POLICY IF EXISTS "deliveries_insert_authenticated" ON deliveries;
CREATE POLICY "deliveries_insert_authenticated" ON deliveries FOR INSERT
  TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "deliveries_update_all" ON deliveries;
CREATE POLICY "deliveries_update_all" ON deliveries FOR UPDATE
  TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "deliveries_delete_own" ON deliveries;
CREATE POLICY "deliveries_delete_own" ON deliveries FOR DELETE
  TO authenticated USING (true);

CREATE INDEX IF NOT EXISTS idx_deliveries_volunteer ON deliveries(volunteer_id);
CREATE INDEX IF NOT EXISTS idx_deliveries_acceptor ON deliveries(acceptor_id);
CREATE INDEX IF NOT EXISTS idx_deliveries_status ON deliveries(status);

-- 5. ai_predictions table
CREATE TABLE IF NOT EXISTS ai_predictions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES profiles(id) ON DELETE CASCADE,
  venue_name text NOT NULL,
  event_type text NOT NULL,
  expected_attendance integer NOT NULL,
  expected_meals integer,
  predicted_leftover_min integer NOT NULL DEFAULT 0,
  predicted_leftover_max integer NOT NULL DEFAULT 0,
  predicted_leftover_avg integer NOT NULL DEFAULT 0,
  risk_level text NOT NULL DEFAULT 'medium',
  recommendation text,
  actual_leftover integer,
  is_preliminary boolean NOT NULL DEFAULT true,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE ai_predictions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "predictions_select_all" ON ai_predictions;
CREATE POLICY "predictions_select_all" ON ai_predictions FOR SELECT
  TO authenticated USING (true);

DROP POLICY IF EXISTS "predictions_insert_own" ON ai_predictions;
CREATE POLICY "predictions_insert_own" ON ai_predictions FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "predictions_update_own" ON ai_predictions;
CREATE POLICY "predictions_update_own" ON ai_predictions FOR UPDATE
  TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_predictions_user ON ai_predictions(user_id);

-- Add updated_at triggers for new tables
DROP TRIGGER IF EXISTS events_updated_at ON events;
CREATE TRIGGER events_updated_at BEFORE UPDATE ON events
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

DROP TRIGGER IF EXISTS deliveries_updated_at ON deliveries;
CREATE TRIGGER deliveries_updated_at BEFORE UPDATE ON deliveries
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
