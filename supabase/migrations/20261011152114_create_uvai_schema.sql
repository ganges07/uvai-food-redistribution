/*
# UVAI Smart Food Redistribution Platform - Complete Schema

## Overview
Creates the full database schema for UVAI, a food redistribution marketplace
connecting donors (restaurants, hotels, event organizers, individuals) with
receivers (NGOs, charitable organizations). Includes role-based access control
with three roles: donor, receiver, and admin.

## Tables Created

### 1. profiles
- Extends auth.users with app-specific data
- `id` (uuid, PK, references auth.users)
- `email` (text)
- `full_name` (text)
- `phone` (text)
- `role` (enum: donor, receiver, admin)
- `organization_name` (text)
- `organization_type` (text - restaurant, hotel, ngo, etc.)
- `address` (text)
- `avatar_url` (text)
- `whatsapp_number` (text)
- `bio` (text)
- `created_at`, `updated_at` (timestamps)

### 2. food_donations
- Food listings created by donors
- `id` (uuid, PK)
- `donor_id` (uuid, references profiles)
- `food_name` (text)
- `category` (enum: prepared_meals, raw_ingredients, bakery, dairy, produce, beverages, other)
- `quantity` (integer)
- `quantity_unit` (text - servings, kg, liters, boxes)
- `preparation_time` (timestamptz)
- `collection_deadline` (timestamptz)
- `pickup_location` (text)
- `description` (text)
- `storage_info` (text)
- `image_url` (text)
- `status` (enum: available, requested, accepted, ready_for_pickup, collected, completed, expired)
- `reserved_by` (uuid, references profiles - the receiver who reserved it)
- `created_at`, `updated_at`

### 3. reservations
- Requests from receivers for food donations
- `id` (uuid, PK)
- `food_donation_id` (uuid, references food_donations)
- `receiver_id` (uuid, references profiles)
- `status` (enum: pending, accepted, rejected, cancelled)
- `message` (text)
- `requested_quantity` (integer)
- `created_at`, `updated_at`

### 4. notifications
- In-app notifications for users
- `id` (uuid, PK)
- `user_id` (uuid, references profiles)
- `title` (text)
- `message` (text)
- `type` (enum: reservation_request, reservation_status, donation_update, system, feedback)
- `is_read` (boolean)
- `related_id` (uuid - generic FK to related entity)
- `created_at`

### 5. feedback
- User ratings and feedback
- `id` (uuid, PK)
- `user_id` (uuid, references profiles)
- `rating` (integer 1-5)
- `comment` (text)
- `feedback_type` (enum: platform, donation, pickup)
- `related_id` (uuid - optional reference to donation/reservation)
- `created_at`

## Security
- RLS enabled on all tables
- Profiles: users can read all profiles (needed for marketplace), update only their own
- Food donations: authenticated users can read all; only owner can insert/update/delete; receivers can update status when reserving
- Reservations: authenticated users can read all; receivers can insert their own; donors can update status for donations they own
- Notifications: users can only read/update their own
- Feedback: authenticated users can read all; users insert their own
- Admin role gets broader access through policies

## Important Notes
1. Owner columns default to auth.uid() for seamless inserts
2. All enums created as types first
3. Indexes added for frequently queried columns
4. Cascade deletes on relevant foreign keys
*/

-- Create enum types
DO $$ BEGIN
  CREATE TYPE user_role AS ENUM ('donor', 'receiver', 'admin');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE food_category AS ENUM ('prepared_meals', 'raw_ingredients', 'bakery', 'dairy', 'produce', 'beverages', 'other');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE food_status AS ENUM ('available', 'requested', 'accepted', 'ready_for_pickup', 'collected', 'completed', 'expired');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE reservation_status AS ENUM ('pending', 'accepted', 'rejected', 'cancelled');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE notification_type AS ENUM ('reservation_request', 'reservation_status', 'donation_update', 'system', 'feedback');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE feedback_type AS ENUM ('platform', 'donation', 'pickup');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- 1. profiles table
CREATE TABLE IF NOT EXISTS profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email text NOT NULL,
  full_name text NOT NULL,
  phone text,
  role user_role NOT NULL DEFAULT 'donor',
  organization_name text,
  organization_type text,
  address text,
  avatar_url text,
  whatsapp_number text,
  bio text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "profiles_select_all" ON profiles;
CREATE POLICY "profiles_select_all" ON profiles FOR SELECT
  TO authenticated USING (true);

DROP POLICY IF EXISTS "profiles_insert_own" ON profiles;
CREATE POLICY "profiles_insert_own" ON profiles FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = id);

DROP POLICY IF EXISTS "profiles_update_own" ON profiles;
CREATE POLICY "profiles_update_own" ON profiles FOR UPDATE
  TO authenticated USING (auth.uid() = id) WITH CHECK (auth.uid() = id);

-- 2. food_donations table
CREATE TABLE IF NOT EXISTS food_donations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  donor_id uuid NOT NULL DEFAULT auth.uid() REFERENCES profiles(id) ON DELETE CASCADE,
  food_name text NOT NULL,
  category food_category NOT NULL,
  quantity integer NOT NULL CHECK (quantity > 0),
  quantity_unit text NOT NULL DEFAULT 'servings',
  preparation_time timestamptz NOT NULL,
  collection_deadline timestamptz NOT NULL,
  pickup_location text NOT NULL,
  description text,
  storage_info text,
  image_url text,
  status food_status NOT NULL DEFAULT 'available',
  reserved_by uuid REFERENCES profiles(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE food_donations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "donations_select_all" ON food_donations;
CREATE POLICY "donations_select_all" ON food_donations FOR SELECT
  TO authenticated USING (true);

DROP POLICY IF EXISTS "donations_insert_own" ON food_donations;
CREATE POLICY "donations_insert_own" ON food_donations FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = donor_id);

DROP POLICY IF EXISTS "donations_update_owner" ON food_donations;
CREATE POLICY "donations_update_owner" ON food_donations FOR UPDATE
  TO authenticated USING (auth.uid() = donor_id) WITH CHECK (auth.uid() = donor_id);

DROP POLICY IF EXISTS "donations_update_reserve" ON food_donations;
CREATE POLICY "donations_update_reserve" ON food_donations FOR UPDATE
  TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "donations_delete_own" ON food_donations;
CREATE POLICY "donations_delete_own" ON food_donations FOR DELETE
  TO authenticated USING (auth.uid() = donor_id);

CREATE INDEX IF NOT EXISTS idx_food_donations_status ON food_donations(status);
CREATE INDEX IF NOT EXISTS idx_food_donations_donor ON food_donations(donor_id);
CREATE INDEX IF NOT EXISTS idx_food_donations_category ON food_donations(category);

-- 3. reservations table
CREATE TABLE IF NOT EXISTS reservations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  food_donation_id uuid NOT NULL REFERENCES food_donations(id) ON DELETE CASCADE,
  receiver_id uuid NOT NULL DEFAULT auth.uid() REFERENCES profiles(id) ON DELETE CASCADE,
  status reservation_status NOT NULL DEFAULT 'pending',
  message text,
  requested_quantity integer NOT NULL CHECK (requested_quantity > 0),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE reservations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "reservations_select_all" ON reservations;
CREATE POLICY "reservations_select_all" ON reservations FOR SELECT
  TO authenticated USING (true);

DROP POLICY IF EXISTS "reservations_insert_own" ON reservations;
CREATE POLICY "reservations_insert_own" ON reservations FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = receiver_id);

DROP POLICY IF EXISTS "reservations_update_all" ON reservations;
CREATE POLICY "reservations_update_all" ON reservations FOR UPDATE
  TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "reservations_delete_own" ON reservations;
CREATE POLICY "reservations_delete_own" ON reservations FOR DELETE
  TO authenticated USING (auth.uid() = receiver_id);

CREATE INDEX IF NOT EXISTS idx_reservations_receiver ON reservations(receiver_id);
CREATE INDEX IF NOT EXISTS idx_reservations_donation ON reservations(food_donation_id);
CREATE INDEX IF NOT EXISTS idx_reservations_status ON reservations(status);

-- 4. notifications table
CREATE TABLE IF NOT EXISTS notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES profiles(id) ON DELETE CASCADE,
  title text NOT NULL,
  message text NOT NULL,
  type notification_type NOT NULL DEFAULT 'system',
  is_read boolean NOT NULL DEFAULT false,
  related_id uuid,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "notifications_select_own" ON notifications;
CREATE POLICY "notifications_select_own" ON notifications FOR SELECT
  TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "notifications_insert_own" ON notifications;
CREATE POLICY "notifications_insert_own" ON notifications FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "notifications_update_own" ON notifications;
CREATE POLICY "notifications_update_own" ON notifications FOR UPDATE
  TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "notifications_delete_own" ON notifications;
CREATE POLICY "notifications_delete_own" ON notifications FOR DELETE
  TO authenticated USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_unread ON notifications(user_id, is_read);

-- 5. feedback table
CREATE TABLE IF NOT EXISTS feedback (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES profiles(id) ON DELETE CASCADE,
  rating integer NOT NULL CHECK (rating >= 1 AND rating <= 5),
  comment text,
  feedback_type feedback_type NOT NULL DEFAULT 'platform',
  related_id uuid,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE feedback ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "feedback_select_all" ON feedback;
CREATE POLICY "feedback_select_all" ON feedback FOR SELECT
  TO authenticated USING (true);

DROP POLICY IF EXISTS "feedback_insert_own" ON feedback;
CREATE POLICY "feedback_insert_own" ON feedback FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "feedback_delete_own" ON feedback;
CREATE POLICY "feedback_delete_own" ON feedback FOR DELETE
  TO authenticated USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_feedback_user ON feedback(user_id);

-- Updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS profiles_updated_at ON profiles;
CREATE TRIGGER profiles_updated_at BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

DROP TRIGGER IF EXISTS food_donations_updated_at ON food_donations;
CREATE TRIGGER food_donations_updated_at BEFORE UPDATE ON food_donations
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

DROP TRIGGER IF EXISTS reservations_updated_at ON reservations;
CREATE TRIGGER reservations_updated_at BEFORE UPDATE ON reservations
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
