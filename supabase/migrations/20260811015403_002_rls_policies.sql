/*
# RLS Policies for All Tables

## Security
- Profiles: users read/update own profile; admins read all; doctors read their patients
- Departments: readable by all authenticated users
- Doctors: readable by all authenticated users
- Clinical data (encounters, medical_records, patient_documents): patients see own, doctors see assigned, admins see all
- Appointments, queue: patients see own, doctors see assigned, admins see all
- Store: products/branches readable by all; orders/items/notifications owner-scoped + admin
- Insurance: plans readable by all; policies/requests owner-scoped + admin
- Bills, payment_transactions: owner-scoped + admin
- Conversations, messages: owner-scoped + admin + doctor (for assigned patients)
- Admin write operations (create/update/delete on store_products, insurance_plans, etc.): admin role only
*/

-- Helper: check if current user is admin
CREATE OR REPLACE FUNCTION is_admin()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin');
$$;

-- Helper: check if current user is doctor
CREATE OR REPLACE FUNCTION is_doctor()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'doctor');
$$;

-- ─────────────────────────────────────────────────────────────────────────────
-- PROFILES
-- ─────────────────────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "select_profiles" ON profiles;
CREATE POLICY "select_profiles" ON profiles FOR SELECT
  TO authenticated USING (
    auth.uid() = id OR is_admin() OR
    (is_doctor() AND EXISTS (
      SELECT 1 FROM appointments a
      WHERE a.doctor_id = auth.uid() AND a.patient_id = profiles.id
    ))
  );

DROP POLICY IF EXISTS "insert_profiles" ON profiles;
CREATE POLICY "insert_profiles" ON profiles FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = id);

DROP POLICY IF EXISTS "update_profiles" ON profiles;
CREATE POLICY "update_profiles" ON profiles FOR UPDATE
  TO authenticated USING (auth.uid() = id OR is_admin())
  WITH CHECK (auth.uid() = id OR is_admin());

-- ─────────────────────────────────────────────────────────────────────────────
-- DEPARTMENTS
-- ─────────────────────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "select_departments" ON departments;
CREATE POLICY "select_departments" ON departments FOR SELECT
  TO authenticated USING (true);

DROP POLICY IF EXISTS "manage_departments" ON departments;
CREATE POLICY "manage_departments" ON departments FOR ALL
  TO authenticated USING (is_admin()) WITH CHECK (is_admin());

-- ─────────────────────────────────────────────────────────────────────────────
-- DOCTORS
-- ─────────────────────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "select_doctors" ON doctors;
CREATE POLICY "select_doctors" ON doctors FOR SELECT
  TO authenticated USING (true);

DROP POLICY IF EXISTS "manage_doctors" ON doctors;
CREATE POLICY "manage_doctors" ON doctors FOR ALL
  TO authenticated USING (is_admin()) WITH CHECK (is_admin());

-- ─────────────────────────────────────────────────────────────────────────────
-- ENCOUNTERS
-- ─────────────────────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "select_encounters" ON encounters;
CREATE POLICY "select_encounters" ON encounters FOR SELECT
  TO authenticated USING (
    auth.uid() = patient_id OR
    auth.uid() = doctor_id OR
    is_admin()
  );

DROP POLICY IF EXISTS "insert_encounters" ON encounters;
CREATE POLICY "insert_encounters" ON encounters FOR INSERT
  TO authenticated WITH CHECK (
    auth.uid() = patient_id OR
    auth.uid() = doctor_id OR
    is_admin()
  );

DROP POLICY IF EXISTS "update_encounters" ON encounters;
CREATE POLICY "update_encounters" ON encounters FOR UPDATE
  TO authenticated USING (
    auth.uid() = patient_id OR
    auth.uid() = doctor_id OR
    is_admin()
  ) WITH CHECK (
    auth.uid() = patient_id OR
    auth.uid() = doctor_id OR
    is_admin()
  );

-- ─────────────────────────────────────────────────────────────────────────────
-- MEDICAL RECORDS
-- ─────────────────────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "select_medical_records" ON medical_records;
CREATE POLICY "select_medical_records" ON medical_records FOR SELECT
  TO authenticated USING (
    auth.uid() = patient_id OR
    is_admin() OR
    (is_doctor() AND EXISTS (
      SELECT 1 FROM encounters e WHERE e.id = medical_records.encounter_id AND e.doctor_id = auth.uid()
    ))
  );

DROP POLICY IF EXISTS "insert_medical_records" ON medical_records;
CREATE POLICY "insert_medical_records" ON medical_records FOR INSERT
  TO authenticated WITH CHECK (
    auth.uid() = patient_id OR is_admin() OR is_doctor()
  );

DROP POLICY IF EXISTS "update_medical_records" ON medical_records;
CREATE POLICY "update_medical_records" ON medical_records FOR UPDATE
  TO authenticated USING (
    auth.uid() = patient_id OR is_admin() OR is_doctor()
  ) WITH CHECK (
    auth.uid() = patient_id OR is_admin() OR is_doctor()
  );

-- ─────────────────────────────────────────────────────────────────────────────
-- PATIENT DOCUMENTS
-- ─────────────────────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "select_patient_documents" ON patient_documents;
CREATE POLICY "select_patient_documents" ON patient_documents FOR SELECT
  TO authenticated USING (
    auth.uid() = patient_id OR is_admin() OR
    (is_doctor() AND EXISTS (
      SELECT 1 FROM encounters e WHERE e.id = patient_documents.encounter_id AND e.doctor_id = auth.uid()
    ))
  );

DROP POLICY IF EXISTS "insert_patient_documents" ON patient_documents;
CREATE POLICY "insert_patient_documents" ON patient_documents FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = patient_id OR is_admin() OR is_doctor());

DROP POLICY IF EXISTS "update_patient_documents" ON patient_documents;
CREATE POLICY "update_patient_documents" ON patient_documents FOR UPDATE
  TO authenticated USING (auth.uid() = patient_id OR is_admin())
  WITH CHECK (auth.uid() = patient_id OR is_admin());

-- ─────────────────────────────────────────────────────────────────────────────
-- APPOINTMENTS
-- ─────────────────────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "select_appointments" ON appointments;
CREATE POLICY "select_appointments" ON appointments FOR SELECT
  TO authenticated USING (
    auth.uid() = patient_id OR
    auth.uid() = doctor_id OR
    is_admin()
  );

DROP POLICY IF EXISTS "insert_appointments" ON appointments;
CREATE POLICY "insert_appointments" ON appointments FOR INSERT
  TO authenticated WITH CHECK (
    auth.uid() = patient_id OR is_admin()
  );

DROP POLICY IF EXISTS "update_appointments" ON appointments;
CREATE POLICY "update_appointments" ON appointments FOR UPDATE
  TO authenticated USING (
    auth.uid() = patient_id OR
    auth.uid() = doctor_id OR
    is_admin()
  ) WITH CHECK (
    auth.uid() = patient_id OR
    auth.uid() = doctor_id OR
    is_admin()
  );

-- ─────────────────────────────────────────────────────────────────────────────
-- QUEUE ENTRIES
-- ─────────────────────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "select_queue_entries" ON queue_entries;
CREATE POLICY "select_queue_entries" ON queue_entries FOR SELECT
  TO authenticated USING (
    auth.uid() = patient_id OR
    auth.uid() = doctor_id OR
    is_admin()
  );

DROP POLICY IF EXISTS "insert_queue_entries" ON queue_entries;
CREATE POLICY "insert_queue_entries" ON queue_entries FOR INSERT
  TO authenticated WITH CHECK (
    auth.uid() = patient_id OR is_admin()
  );

DROP POLICY IF EXISTS "update_queue_entries" ON queue_entries;
CREATE POLICY "update_queue_entries" ON queue_entries FOR UPDATE
  TO authenticated USING (
    auth.uid() = patient_id OR
    auth.uid() = doctor_id OR
    is_admin()
  ) WITH CHECK (
    auth.uid() = patient_id OR
    auth.uid() = doctor_id OR
    is_admin()
  );

-- ─────────────────────────────────────────────────────────────────────────────
-- STORE BRANCHES
-- ─────────────────────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "select_store_branches" ON store_branches;
CREATE POLICY "select_store_branches" ON store_branches FOR SELECT
  TO authenticated USING (true);

DROP POLICY IF EXISTS "manage_store_branches" ON store_branches;
CREATE POLICY "manage_store_branches" ON store_branches FOR ALL
  TO authenticated USING (is_admin()) WITH CHECK (is_admin());

-- ─────────────────────────────────────────────────────────────────────────────
-- STORE PRODUCTS
-- ─────────────────────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "select_store_products" ON store_products;
CREATE POLICY "select_store_products" ON store_products FOR SELECT
  TO authenticated USING (true);

DROP POLICY IF EXISTS "insert_store_products" ON store_products;
CREATE POLICY "insert_store_products" ON store_products FOR INSERT
  TO authenticated WITH CHECK (is_admin());

DROP POLICY IF EXISTS "update_store_products" ON store_products;
CREATE POLICY "update_store_products" ON store_products FOR UPDATE
  TO authenticated USING (is_admin()) WITH CHECK (is_admin());

DROP POLICY IF EXISTS "delete_store_products" ON store_products;
CREATE POLICY "delete_store_products" ON store_products FOR DELETE
  TO authenticated USING (is_admin());

-- ─────────────────────────────────────────────────────────────────────────────
-- STORE ORDERS
-- ─────────────────────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "select_store_orders" ON store_orders;
CREATE POLICY "select_store_orders" ON store_orders FOR SELECT
  TO authenticated USING (auth.uid() = patient_id OR is_admin());

DROP POLICY IF EXISTS "insert_store_orders" ON store_orders;
CREATE POLICY "insert_store_orders" ON store_orders FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = patient_id);

DROP POLICY IF EXISTS "update_store_orders" ON store_orders;
CREATE POLICY "update_store_orders" ON store_orders FOR UPDATE
  TO authenticated USING (auth.uid() = patient_id OR is_admin())
  WITH CHECK (auth.uid() = patient_id OR is_admin());

-- ─────────────────────────────────────────────────────────────────────────────
-- STORE ORDER ITEMS
-- ─────────────────────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "select_store_order_items" ON store_order_items;
CREATE POLICY "select_store_order_items" ON store_order_items FOR SELECT
  TO authenticated USING (
    EXISTS (SELECT 1 FROM store_orders o WHERE o.id = store_order_items.order_id AND (o.patient_id = auth.uid() OR is_admin()))
  );

DROP POLICY IF EXISTS "insert_store_order_items" ON store_order_items;
CREATE POLICY "insert_store_order_items" ON store_order_items FOR INSERT
  TO authenticated WITH CHECK (
    EXISTS (SELECT 1 FROM store_orders o WHERE o.id = store_order_items.order_id AND (o.patient_id = auth.uid() OR is_admin()))
  );

-- ─────────────────────────────────────────────────────────────────────────────
-- STORE NOTIFICATIONS
-- ─────────────────────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "select_store_notifications" ON store_notifications;
CREATE POLICY "select_store_notifications" ON store_notifications FOR SELECT
  TO authenticated USING (auth.uid() = patient_id OR is_admin());

DROP POLICY IF EXISTS "insert_store_notifications" ON store_notifications;
CREATE POLICY "insert_store_notifications" ON store_notifications FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = patient_id OR is_admin());

DROP POLICY IF EXISTS "update_store_notifications" ON store_notifications;
CREATE POLICY "update_store_notifications" ON store_notifications FOR UPDATE
  TO authenticated USING (auth.uid() = patient_id OR is_admin())
  WITH CHECK (auth.uid() = patient_id OR is_admin());

-- ─────────────────────────────────────────────────────────────────────────────
-- INSURANCE PLANS
-- ─────────────────────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "select_insurance_plans" ON insurance_plans;
CREATE POLICY "select_insurance_plans" ON insurance_plans FOR SELECT
  TO authenticated USING (true);

DROP POLICY IF EXISTS "insert_insurance_plans" ON insurance_plans;
CREATE POLICY "insert_insurance_plans" ON insurance_plans FOR INSERT
  TO authenticated WITH CHECK (is_admin());

DROP POLICY IF EXISTS "update_insurance_plans" ON insurance_plans;
CREATE POLICY "update_insurance_plans" ON insurance_plans FOR UPDATE
  TO authenticated USING (is_admin()) WITH CHECK (is_admin());

DROP POLICY IF EXISTS "delete_insurance_plans" ON insurance_plans;
CREATE POLICY "delete_insurance_plans" ON insurance_plans FOR DELETE
  TO authenticated USING (is_admin());

-- ─────────────────────────────────────────────────────────────────────────────
-- INSURANCE POLICIES
-- ─────────────────────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "select_insurance_policies" ON insurance_policies;
CREATE POLICY "select_insurance_policies" ON insurance_policies FOR SELECT
  TO authenticated USING (auth.uid() = patient_id OR is_admin());

DROP POLICY IF EXISTS "insert_insurance_policies" ON insurance_policies;
CREATE POLICY "insert_insurance_policies" ON insurance_policies FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = patient_id OR is_admin());

DROP POLICY IF EXISTS "update_insurance_policies" ON insurance_policies;
CREATE POLICY "update_insurance_policies" ON insurance_policies FOR UPDATE
  TO authenticated USING (auth.uid() = patient_id OR is_admin())
  WITH CHECK (auth.uid() = patient_id OR is_admin());

-- ─────────────────────────────────────────────────────────────────────────────
-- INSURANCE REQUESTS
-- ─────────────────────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "select_insurance_requests" ON insurance_requests;
CREATE POLICY "select_insurance_requests" ON insurance_requests FOR SELECT
  TO authenticated USING (auth.uid() = patient_id OR is_admin());

DROP POLICY IF EXISTS "insert_insurance_requests" ON insurance_requests;
CREATE POLICY "insert_insurance_requests" ON insurance_requests FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = patient_id OR is_admin());

DROP POLICY IF EXISTS "update_insurance_requests" ON insurance_requests;
CREATE POLICY "update_insurance_requests" ON insurance_requests FOR UPDATE
  TO authenticated USING (is_admin())
  WITH CHECK (is_admin());

-- ─────────────────────────────────────────────────────────────────────────────
-- BILLS
-- ─────────────────────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "select_bills" ON bills;
CREATE POLICY "select_bills" ON bills FOR SELECT
  TO authenticated USING (auth.uid() = patient_id OR is_admin());

DROP POLICY IF EXISTS "insert_bills" ON bills;
CREATE POLICY "insert_bills" ON bills FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = patient_id OR is_admin());

DROP POLICY IF EXISTS "update_bills" ON bills;
CREATE POLICY "update_bills" ON bills FOR UPDATE
  TO authenticated USING (auth.uid() = patient_id OR is_admin())
  WITH CHECK (auth.uid() = patient_id OR is_admin());

-- ─────────────────────────────────────────────────────────────────────────────
-- PAYMENT TRANSACTIONS
-- ─────────────────────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "select_payment_transactions" ON payment_transactions;
CREATE POLICY "select_payment_transactions" ON payment_transactions FOR SELECT
  TO authenticated USING (auth.uid() = patient_id OR is_admin());

DROP POLICY IF EXISTS "insert_payment_transactions" ON payment_transactions;
CREATE POLICY "insert_payment_transactions" ON payment_transactions FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = patient_id OR is_admin());

DROP POLICY IF EXISTS "update_payment_transactions" ON payment_transactions;
CREATE POLICY "update_payment_transactions" ON payment_transactions FOR UPDATE
  TO authenticated USING (is_admin())
  WITH CHECK (is_admin());

-- ─────────────────────────────────────────────────────────────────────────────
-- CONVERSATIONS
-- ─────────────────────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "select_conversations" ON conversations;
CREATE POLICY "select_conversations" ON conversations FOR SELECT
  TO authenticated USING (
    auth.uid() = patient_id OR
    auth.uid() = doctor_id OR
    is_admin()
  );

DROP POLICY IF EXISTS "insert_conversations" ON conversations;
CREATE POLICY "insert_conversations" ON conversations FOR INSERT
  TO authenticated WITH CHECK (
    auth.uid() = patient_id OR auth.uid() = doctor_id OR is_admin()
  );

DROP POLICY IF EXISTS "update_conversations" ON conversations;
CREATE POLICY "update_conversations" ON conversations FOR UPDATE
  TO authenticated USING (
    auth.uid() = patient_id OR auth.uid() = doctor_id OR is_admin()
  ) WITH CHECK (
    auth.uid() = patient_id OR auth.uid() = doctor_id OR is_admin()
  );

-- ─────────────────────────────────────────────────────────────────────────────
-- MESSAGES
-- ─────────────────────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "select_messages" ON messages;
CREATE POLICY "select_messages" ON messages FOR SELECT
  TO authenticated USING (
    EXISTS (SELECT 1 FROM conversations c WHERE c.id = messages.conversation_id AND
      (c.patient_id = auth.uid() OR c.doctor_id = auth.uid() OR is_admin()))
  );

DROP POLICY IF EXISTS "insert_messages" ON messages;
CREATE POLICY "insert_messages" ON messages FOR INSERT
  TO authenticated WITH CHECK (
    EXISTS (SELECT 1 FROM conversations c WHERE c.id = messages.conversation_id AND
      (c.patient_id = auth.uid() OR c.doctor_id = auth.uid() OR is_admin()))
  );

DROP POLICY IF EXISTS "update_messages" ON messages;
CREATE POLICY "update_messages" ON messages FOR UPDATE
  TO authenticated USING (
    EXISTS (SELECT 1 FROM conversations c WHERE c.id = messages.conversation_id AND
      (c.patient_id = auth.uid() OR c.doctor_id = auth.uid() OR is_admin()))
  );