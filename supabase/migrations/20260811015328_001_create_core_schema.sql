/*
# SugboDoc Core Healthcare Schema

## Overview
Creates the complete database schema for the SugboDoc healthcare portal — a multi-role
(patient / doctor / admin) application handling appointments, medical records, pharmacy
store, insurance, billing, and messaging.

## New Tables (all with RLS enabled)

### Authentication & Profiles
1. `profiles` — Extends auth.users with healthcare-specific fields (name, phone, role, demographics).
   - `id` uuid PK matching auth.users.id
   - `email` text unique
   - `name`, `phone`, `role` (patient/doctor/admin), `status`
   - `dob`, `blood_type`, `allergies` (text[])
   - `emergency_contact_name`, `emergency_contact_relation`, `emergency_contact_phone`
   - `email_verified` boolean

2. `departments` — Clinical department lookup
   - `id` uuid PK, `name` text unique

3. `doctors` — Doctor-specific profile extending profiles
   - `id` uuid PK → profiles.id
   - `specialty` text, `department_id` uuid → departments

### Clinical Data
4. `encounters` — Clinical visits
   - `patient_id`, `doctor_id`, `department_id`
   - `encounter_date`, `chief_complaint`, `diagnosis`, `summary`, etc.
   - `status` (Pending/In Progress/Completed/Cancelled)

5. `medical_records` — Polymorphic clinical records (vitals, prescriptions, labs, imaging, SOAP, diagnoses)
   - `patient_id`, `encounter_id` (nullable)
   - `kind` text, `data` jsonb

6. `patient_documents` — Uploaded files
   - `patient_id`, `encounter_id` (nullable)
   - `name`, `file_type`, `source_kind`, `storage_path`, `metadata` jsonb

### Appointments & Queue
7. `appointments` — Scheduled visits
   - `patient_id`, `doctor_id`, `doctor_name`, `specialty`, `clinic`
   - `appointment_date`, `appointment_time`, `status`, `notes`

8. `queue_entries` — Live clinic queue
   - `appointment_id` (nullable), `patient_id`
   - `queue_number`, `department_id`, `doctor_id`
   - `status`, `estimated_wait_minutes`

### Pharmacy Store
9. `store_branches` — Pharmacy locations
10. `store_products` — Pharmacy catalog (sku, name, price, stock, prescription_required, etc.)
11. `store_orders` — Patient orders (order_no, fulfillment, totals, status, payment_status)
12. `store_order_items` — Line items per order
13. `store_notifications` — Patient-facing store alerts

### Insurance
14. `insurance_plans` — Admin-managed plan catalog (code, name, provider, premiums, coverage, benefits)
15. `insurance_policies` — Patient's purchased policies
16. `insurance_requests` — Admin approval queue

### Billing
17. `bills` — Invoices (invoice_no, patient_id, amount, status, category, details jsonb)
18. `payment_transactions` — Completed payment records

### Messaging
19. `conversations` — Thread between patient and doctor/admin
20. `messages` — Individual messages (sender, text, file, read, sms fields)

## Security
- RLS enabled on EVERY table
- Owner-scoped policies using auth.uid() for patient data
- Doctors see their assigned patients' data
- Admins have broad access via role check in policies
- The `role` column on profiles is protected — users cannot self-elevate
- A SECURITY DEFINER function `change_user_role` allows only admins to change roles
- A trigger `on_auth_user_created` auto-creates a profile row on signup
*/

-- ─────────────────────────────────────────────────────────────────────────────
-- DEPARTMENTS
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS departments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text UNIQUE NOT NULL,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE departments ENABLE ROW LEVEL SECURITY;

-- ─────────────────────────────────────────────────────────────────────────────
-- PROFILES
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email text UNIQUE NOT NULL,
  name text NOT NULL DEFAULT '',
  phone text DEFAULT '',
  role text NOT NULL DEFAULT 'patient',
  status text NOT NULL DEFAULT 'active',
  dob text DEFAULT '',
  blood_type text DEFAULT '',
  allergies text[] DEFAULT '{}',
  emergency_contact_name text DEFAULT '',
  emergency_contact_relation text DEFAULT '',
  emergency_contact_phone text DEFAULT '',
  email_verified boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- ─────────────────────────────────────────────────────────────────────────────
-- DOCTORS
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS doctors (
  id uuid PRIMARY KEY REFERENCES profiles(id) ON DELETE CASCADE,
  specialty text NOT NULL DEFAULT 'General Medicine',
  department_id uuid REFERENCES departments(id),
  avatar_initials text DEFAULT '',
  created_at timestamptz DEFAULT now()
);
ALTER TABLE doctors ENABLE ROW LEVEL SECURITY;

-- ─────────────────────────────────────────────────────────────────────────────
-- ENCOUNTERS
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS encounters (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  doctor_id uuid REFERENCES profiles(id) ON DELETE SET NULL,
  department_id uuid REFERENCES departments(id),
  clinic text DEFAULT '',
  encounter_date text NOT NULL DEFAULT '',
  chief_complaint text DEFAULT '',
  history_of_present_illness text DEFAULT '',
  diagnosis text DEFAULT '',
  summary text DEFAULT '',
  treatment_provided text DEFAULT '',
  follow_up_recommendations text DEFAULT '',
  encounter_notes text DEFAULT '',
  status text NOT NULL DEFAULT 'Completed',
  created_at timestamptz DEFAULT now()
);
ALTER TABLE encounters ENABLE ROW LEVEL SECURITY;

-- ─────────────────────────────────────────────────────────────────────────────
-- MEDICAL RECORDS
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS medical_records (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  encounter_id uuid REFERENCES encounters(id) ON DELETE CASCADE,
  kind text NOT NULL,
  data jsonb NOT NULL DEFAULT '{}',
  created_at timestamptz DEFAULT now()
);
ALTER TABLE medical_records ENABLE ROW LEVEL SECURITY;

-- ─────────────────────────────────────────────────────────────────────────────
-- PATIENT DOCUMENTS
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS patient_documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  encounter_id uuid REFERENCES encounters(id) ON DELETE SET NULL,
  name text NOT NULL DEFAULT '',
  file_type text DEFAULT '',
  source_kind text DEFAULT 'upload',
  storage_path text DEFAULT '',
  metadata jsonb DEFAULT '{}',
  uploaded_at timestamptz DEFAULT now()
);
ALTER TABLE patient_documents ENABLE ROW LEVEL SECURITY;

-- ─────────────────────────────────────────────────────────────────────────────
-- APPOINTMENTS
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS appointments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  doctor_id uuid REFERENCES profiles(id) ON DELETE SET NULL,
  doctor_name text DEFAULT '',
  specialty text DEFAULT '',
  clinic text DEFAULT '',
  department_id uuid REFERENCES departments(id),
  appointment_date text NOT NULL DEFAULT '',
  appointment_time text DEFAULT '',
  status text NOT NULL DEFAULT 'Pending',
  notes text DEFAULT '',
  created_at timestamptz DEFAULT now()
);
ALTER TABLE appointments ENABLE ROW LEVEL SECURITY;

-- ─────────────────────────────────────────────────────────────────────────────
-- QUEUE ENTRIES
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS queue_entries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  appointment_id uuid REFERENCES appointments(id) ON DELETE SET NULL,
  patient_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  queue_number text NOT NULL DEFAULT '',
  department_id uuid REFERENCES departments(id),
  doctor_id uuid REFERENCES profiles(id) ON DELETE SET NULL,
  doctor_name text DEFAULT '',
  specialty text DEFAULT '',
  clinic text DEFAULT '',
  status text NOT NULL DEFAULT 'Waiting',
  estimated_wait_minutes integer,
  checked_in_at timestamptz,
  joined_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
ALTER TABLE queue_entries ENABLE ROW LEVEL SECURITY;

-- ─────────────────────────────────────────────────────────────────────────────
-- STORE BRANCHES
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS store_branches (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL DEFAULT '',
  address text DEFAULT '',
  hours text DEFAULT '',
  created_at timestamptz DEFAULT now()
);
ALTER TABLE store_branches ENABLE ROW LEVEL SECURITY;

-- ─────────────────────────────────────────────────────────────────────────────
-- STORE PRODUCTS
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS store_products (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sku text UNIQUE,
  name text NOT NULL DEFAULT '',
  description text DEFAULT '',
  category text DEFAULT '',
  brand text DEFAULT '',
  supplier text DEFAULT '',
  price numeric(12,2) DEFAULT 0,
  stock integer DEFAULT 0,
  reorder_level integer DEFAULT 20,
  prescription_required boolean DEFAULT false,
  image_url text DEFAULT '',
  rating numeric(3,1) DEFAULT 0,
  review_count integer DEFAULT 0,
  status text NOT NULL DEFAULT 'In Stock',
  active boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE store_products ENABLE ROW LEVEL SECURITY;

-- ─────────────────────────────────────────────────────────────────────────────
-- STORE ORDERS
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS store_orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_no text UNIQUE NOT NULL,
  patient_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  fulfillment_type text NOT NULL DEFAULT 'pickup',
  pickup_branch_id uuid REFERENCES store_branches(id),
  delivery_address text DEFAULT '',
  delivery_fee numeric(12,2) DEFAULT 0,
  subtotal numeric(12,2) DEFAULT 0,
  total numeric(12,2) DEFAULT 0,
  status text NOT NULL DEFAULT 'Pending',
  payment_status text DEFAULT 'Pending',
  tracking_no text DEFAULT '',
  estimated_delivery text DEFAULT '',
  received_at text DEFAULT '',
  created_at timestamptz DEFAULT now()
);
ALTER TABLE store_orders ENABLE ROW LEVEL SECURITY;

-- ─────────────────────────────────────────────────────────────────────────────
-- STORE ORDER ITEMS
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS store_order_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL REFERENCES store_orders(id) ON DELETE CASCADE,
  product_id uuid REFERENCES store_products(id) ON DELETE SET NULL,
  product_name text NOT NULL DEFAULT '',
  brand text DEFAULT '',
  unit_price numeric(12,2) DEFAULT 0,
  quantity integer NOT NULL DEFAULT 1,
  line_total numeric(12,2) DEFAULT 0
);
ALTER TABLE store_order_items ENABLE ROW LEVEL SECURITY;

-- ─────────────────────────────────────────────────────────────────────────────
-- STORE NOTIFICATIONS
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS store_notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  title text NOT NULL DEFAULT '',
  message text DEFAULT '',
  kind text DEFAULT 'order',
  read boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE store_notifications ENABLE ROW LEVEL SECURITY;

-- ─────────────────────────────────────────────────────────────────────────────
-- INSURANCE PLANS
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS insurance_plans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text UNIQUE NOT NULL,
  name text NOT NULL DEFAULT '',
  provider text DEFAULT '',
  provider_description text DEFAULT '',
  provider_hotline text DEFAULT '',
  provider_website text DEFAULT '',
  provider_email text DEFAULT '',
  provider_rating numeric(3,1) DEFAULT 0,
  provider_members integer DEFAULT 0,
  description text DEFAULT '',
  monthly_premium numeric(12,2) DEFAULT 0,
  annual_premium numeric(12,2) DEFAULT 0,
  coverage_limit numeric(12,2) DEFAULT 0,
  coverage_percentage integer DEFAULT 0,
  validity_months integer DEFAULT 12,
  benefits text[] DEFAULT '{}',
  eligibility text[] DEFAULT '{}',
  waiting_period text DEFAULT '',
  exclusions text[] DEFAULT '{}',
  included_services text[] DEFAULT '{}',
  maximum_claims integer DEFAULT 0,
  renewal_policy text DEFAULT '',
  terms_and_conditions text DEFAULT '',
  faqs jsonb DEFAULT '[]',
  logo_url text DEFAULT '',
  card_image_url text DEFAULT '',
  active boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE insurance_plans ENABLE ROW LEVEL SECURITY;

-- ─────────────────────────────────────────────────────────────────────────────
-- INSURANCE POLICIES
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS insurance_policies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  plan_id uuid REFERENCES insurance_plans(id) ON DELETE SET NULL,
  plan_name text DEFAULT '',
  provider text DEFAULT '',
  policy_number text UNIQUE NOT NULL,
  insurance_id text DEFAULT '',
  status text NOT NULL DEFAULT 'Pending Payment',
  payment_status text DEFAULT 'Pending',
  premium_amount numeric(12,2) DEFAULT 0,
  billing_cycle text DEFAULT 'annual',
  coverage_limit numeric(12,2) DEFAULT 0,
  remaining_coverage numeric(12,2) DEFAULT 0,
  expiration_date text DEFAULT '',
  renewal_date text DEFAULT '',
  purchased_at timestamptz DEFAULT now()
);
ALTER TABLE insurance_policies ENABLE ROW LEVEL SECURITY;

-- ─────────────────────────────────────────────────────────────────────────────
-- INSURANCE REQUESTS
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS insurance_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  plan_id uuid REFERENCES insurance_plans(id) ON DELETE SET NULL,
  patient_name text DEFAULT '',
  patient_email text DEFAULT '',
  plan_name text DEFAULT '',
  provider text DEFAULT '',
  policy_number text DEFAULT '',
  status text NOT NULL DEFAULT 'Pending',
  premium_amount numeric(12,2) DEFAULT 0,
  coverage_limit numeric(12,2) DEFAULT 0,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE insurance_requests ENABLE ROW LEVEL SECURITY;

-- ─────────────────────────────────────────────────────────────────────────────
-- BILLS
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS bills (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_no text UNIQUE NOT NULL,
  patient_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  description text NOT NULL DEFAULT '',
  category text DEFAULT '',
  amount numeric(12,2) NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'Pending',
  payment_method text DEFAULT '',
  order_id uuid REFERENCES store_orders(id) ON DELETE SET NULL,
  policy_id uuid REFERENCES insurance_policies(id) ON DELETE SET NULL,
  details jsonb DEFAULT '{}',
  due_date text DEFAULT '',
  paid_at timestamptz,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE bills ENABLE ROW LEVEL SECURITY;

-- ─────────────────────────────────────────────────────────────────────────────
-- PAYMENT TRANSACTIONS
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS payment_transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  bill_id uuid REFERENCES bills(id) ON DELETE SET NULL,
  invoice_no text DEFAULT '',
  patient_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  description text DEFAULT '',
  amount_paid numeric(12,2) NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'Paid',
  method text DEFAULT '',
  category text DEFAULT '',
  transaction_id text DEFAULT '',
  payment_date timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now()
);
ALTER TABLE payment_transactions ENABLE ROW LEVEL SECURITY;

-- ─────────────────────────────────────────────────────────────────────────────
-- CONVERSATIONS
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS conversations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  doctor_id uuid REFERENCES profiles(id) ON DELETE CASCADE,
  doctor_name text DEFAULT '',
  specialty text DEFAULT '',
  contact_name text DEFAULT '',
  contact_avatar text DEFAULT '',
  last_message_preview text DEFAULT '',
  last_message_at timestamptz DEFAULT now(),
  unread_count integer DEFAULT 0,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;

-- ─────────────────────────────────────────────────────────────────────────────
-- MESSAGES
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id uuid NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  sender text NOT NULL DEFAULT 'patient',
  text text DEFAULT '',
  file_name text DEFAULT '',
  file_storage_path text DEFAULT '',
  read boolean DEFAULT false,
  status text DEFAULT 'Sent',
  sms_status text DEFAULT '',
  sms_to text DEFAULT '',
  sms_from text DEFAULT '',
  sms_error text DEFAULT '',
  created_at timestamptz DEFAULT now()
);
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;

-- ─────────────────────────────────────────────────────────────────────────────
-- INDEXES
-- ─────────────────────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_profiles_role ON profiles(role);
CREATE INDEX IF NOT EXISTS idx_encounters_patient ON encounters(patient_id);
CREATE INDEX IF NOT EXISTS idx_encounters_doctor ON encounters(doctor_id);
CREATE INDEX IF NOT EXISTS idx_medical_records_patient ON medical_records(patient_id);
CREATE INDEX IF NOT EXISTS idx_medical_records_kind ON medical_records(kind);
CREATE INDEX IF NOT EXISTS idx_appointments_patient ON appointments(patient_id);
CREATE INDEX IF NOT EXISTS idx_appointments_doctor ON appointments(doctor_id);
CREATE INDEX IF NOT EXISTS idx_queue_entries_patient ON queue_entries(patient_id);
CREATE INDEX IF NOT EXISTS idx_store_orders_patient ON store_orders(patient_id);
CREATE INDEX IF NOT EXISTS idx_store_order_items_order ON store_order_items(order_id);
CREATE INDEX IF NOT EXISTS idx_insurance_policies_patient ON insurance_policies(patient_id);
CREATE INDEX IF NOT EXISTS idx_bills_patient ON bills(patient_id);
CREATE INDEX IF NOT EXISTS idx_payment_transactions_patient ON payment_transactions(patient_id);
CREATE INDEX IF NOT EXISTS idx_conversations_patient ON conversations(patient_id);
CREATE INDEX IF NOT EXISTS idx_messages_conversation ON messages(conversation_id);

-- ─────────────────────────────────────────────────────────────────────────────
-- HELPER: get current user role
-- ─────────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION get_current_role()
RETURNS text
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(
    (SELECT role FROM profiles WHERE id = auth.uid()),
    'anon'
  );
$$;

-- ─────────────────────────────────────────────────────────────────────────────
-- SECURITY DEFINER: change_user_role (admin only)
-- ─────────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION change_user_role(target_user_id uuid, new_role text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  caller_role text;
  target_record jsonb;
BEGIN
  SELECT role INTO caller_role FROM profiles WHERE id = auth.uid();
  IF caller_role IS NULL OR caller_role <> 'admin' THEN
    RAISE EXCEPTION 'Only administrators can change user roles';
  END IF;
  IF auth.uid() = target_user_id AND new_role <> 'admin' THEN
    RAISE EXCEPTION 'You cannot remove your own administrator role';
  END IF;

  UPDATE profiles SET role = new_role WHERE id = target_user_id
  RETURNING to_jsonb(profiles) INTO target_record;

  IF target_record IS NULL THEN
    RAISE EXCEPTION 'User not found';
  END IF;

  RETURN target_record;
END;
$$;

GRANT EXECUTE ON FUNCTION change_user_role(uuid, text) TO authenticated;

-- ─────────────────────────────────────────────────────────────────────────────
-- TRIGGER: auto-create profile on auth signup
-- ─────────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, name, role, status, email_verified)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'name', ''),
    'patient',
    'active',
    COALESCE((NEW.email_confirmed_at IS NOT NULL), false)
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();