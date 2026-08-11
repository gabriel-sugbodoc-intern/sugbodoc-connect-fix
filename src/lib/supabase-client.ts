import { createClient } from "@supabase/supabase-js";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    "Missing Supabase environment variables. Ensure VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY are set.",
  );
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
});

export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          email: string;
          name: string;
          phone: string;
          role: string;
          status: string;
          dob: string;
          blood_type: string;
          allergies: string[];
          emergency_contact_name: string;
          emergency_contact_relation: string;
          emergency_contact_phone: string;
          email_verified: boolean;
          created_at: string;
        };
        Insert: {
          id: string;
          email: string;
          name?: string;
          phone?: string;
          role?: string;
          status?: string;
          dob?: string;
          blood_type?: string;
          allergies?: string[];
          emergency_contact_name?: string;
          emergency_contact_relation?: string;
          emergency_contact_phone?: string;
          email_verified?: boolean;
        };
        Update: Partial<Database["public"]["Tables"]["profiles"]["Insert"]>;
      };
      departments: {
        Row: { id: string; name: string; created_at: string };
        Insert: { id?: string; name: string };
        Update: { name?: string };
      };
      doctors: {
        Row: {
          id: string;
          specialty: string;
          department_id: string | null;
          avatar_initials: string;
          created_at: string;
        };
        Insert: {
          id: string;
          specialty?: string;
          department_id?: string | null;
          avatar_initials?: string;
        };
        Update: Partial<Database["public"]["Tables"]["doctors"]["Insert"]>;
      };
      encounters: {
        Row: {
          id: string;
          patient_id: string;
          doctor_id: string | null;
          department_id: string | null;
          clinic: string;
          encounter_date: string;
          chief_complaint: string;
          history_of_present_illness: string;
          diagnosis: string;
          summary: string;
          treatment_provided: string;
          follow_up_recommendations: string;
          encounter_notes: string;
          status: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          patient_id: string;
          doctor_id?: string | null;
          department_id?: string | null;
          clinic?: string;
          encounter_date: string;
          chief_complaint?: string;
          history_of_present_illness?: string;
          diagnosis?: string;
          summary?: string;
          treatment_provided?: string;
          follow_up_recommendations?: string;
          encounter_notes?: string;
          status?: string;
        };
        Update: Partial<Database["public"]["Tables"]["encounters"]["Insert"]>;
      };
      medical_records: {
        Row: {
          id: string;
          patient_id: string;
          encounter_id: string | null;
          kind: string;
          data: Record<string, unknown>;
          created_at: string;
        };
        Insert: {
          id?: string;
          patient_id: string;
          encounter_id?: string | null;
          kind: string;
          data?: Record<string, unknown>;
        };
        Update: Partial<Database["public"]["Tables"]["medical_records"]["Insert"]>;
      };
      patient_documents: {
        Row: {
          id: string;
          patient_id: string;
          encounter_id: string | null;
          name: string;
          file_type: string;
          source_kind: string;
          storage_path: string;
          metadata: Record<string, unknown>;
          uploaded_at: string;
        };
        Insert: {
          id?: string;
          patient_id: string;
          encounter_id?: string | null;
          name: string;
          file_type?: string;
          source_kind?: string;
          storage_path?: string;
          metadata?: Record<string, unknown>;
        };
        Update: Partial<Database["public"]["Tables"]["patient_documents"]["Insert"]>;
      };
      appointments: {
        Row: {
          id: string;
          patient_id: string;
          doctor_id: string | null;
          doctor_name: string;
          specialty: string;
          clinic: string;
          department_id: string | null;
          appointment_date: string;
          appointment_time: string;
          status: string;
          notes: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          patient_id: string;
          doctor_id?: string | null;
          doctor_name?: string;
          specialty?: string;
          clinic?: string;
          department_id?: string | null;
          appointment_date: string;
          appointment_time?: string;
          status?: string;
          notes?: string;
        };
        Update: Partial<Database["public"]["Tables"]["appointments"]["Insert"]>;
      };
      queue_entries: {
        Row: {
          id: string;
          appointment_id: string | null;
          patient_id: string;
          queue_number: string;
          department_id: string | null;
          doctor_id: string | null;
          doctor_name: string;
          specialty: string;
          clinic: string;
          status: string;
          estimated_wait_minutes: number | null;
          checked_in_at: string | null;
          joined_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          appointment_id?: string | null;
          patient_id: string;
          queue_number: string;
          department_id?: string | null;
          doctor_id?: string | null;
          doctor_name?: string;
          specialty?: string;
          clinic?: string;
          status?: string;
          estimated_wait_minutes?: number | null;
          checked_in_at?: string | null;
        };
        Update: Partial<Database["public"]["Tables"]["queue_entries"]["Insert"]>;
      };
      store_branches: {
        Row: { id: string; name: string; address: string; hours: string; created_at: string };
        Insert: { id?: string; name: string; address?: string; hours?: string };
        Update: { name?: string; address?: string; hours?: string };
      };
      store_products: {
        Row: {
          id: string;
          sku: string | null;
          name: string;
          description: string;
          category: string;
          brand: string;
          supplier: string;
          price: number;
          stock: number;
          reorder_level: number;
          prescription_required: boolean;
          image_url: string;
          rating: number;
          review_count: number;
          status: string;
          active: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          sku?: string;
          name: string;
          description?: string;
          category?: string;
          brand?: string;
          supplier?: string;
          price?: number;
          stock?: number;
          reorder_level?: number;
          prescription_required?: boolean;
          image_url?: string;
          rating?: number;
          review_count?: number;
          status?: string;
          active?: boolean;
        };
        Update: Partial<Database["public"]["Tables"]["store_products"]["Insert"]>;
      };
      store_orders: {
        Row: {
          id: string;
          order_no: string;
          patient_id: string;
          fulfillment_type: string;
          pickup_branch_id: string | null;
          delivery_address: string;
          delivery_fee: number;
          subtotal: number;
          total: number;
          status: string;
          payment_status: string;
          tracking_no: string;
          estimated_delivery: string;
          received_at: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          order_no: string;
          patient_id: string;
          fulfillment_type?: string;
          pickup_branch_id?: string | null;
          delivery_address?: string;
          delivery_fee?: number;
          subtotal?: number;
          total?: number;
          status?: string;
          payment_status?: string;
          tracking_no?: string;
          estimated_delivery?: string;
          received_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["store_orders"]["Insert"]>;
      };
      store_order_items: {
        Row: {
          id: string;
          order_id: string;
          product_id: string | null;
          product_name: string;
          brand: string;
          unit_price: number;
          quantity: number;
          line_total: number;
        };
        Insert: {
          id?: string;
          order_id: string;
          product_id?: string | null;
          product_name: string;
          brand?: string;
          unit_price?: number;
          quantity: number;
          line_total?: number;
        };
        Update: Partial<Database["public"]["Tables"]["store_order_items"]["Insert"]>;
      };
      store_notifications: {
        Row: {
          id: string;
          patient_id: string;
          title: string;
          message: string;
          kind: string;
          read: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          patient_id: string;
          title: string;
          message?: string;
          kind?: string;
          read?: boolean;
        };
        Update: Partial<Database["public"]["Tables"]["store_notifications"]["Insert"]>;
      };
      insurance_plans: {
        Row: {
          id: string;
          code: string;
          name: string;
          provider: string;
          provider_description: string;
          provider_hotline: string;
          provider_website: string;
          provider_email: string;
          provider_rating: number;
          provider_members: number;
          description: string;
          monthly_premium: number;
          annual_premium: number;
          coverage_limit: number;
          coverage_percentage: number;
          validity_months: number;
          benefits: string[];
          eligibility: string[];
          waiting_period: string;
          exclusions: string[];
          included_services: string[];
          maximum_claims: number;
          renewal_policy: string;
          terms_and_conditions: string;
          faqs: unknown;
          logo_url: string;
          card_image_url: string;
          active: boolean;
          created_at: string;
        };
        Insert: Record<string, unknown> & { code: string; name: string };
        Update: Record<string, unknown>;
      };
      insurance_policies: {
        Row: {
          id: string;
          patient_id: string;
          plan_id: string | null;
          plan_name: string;
          provider: string;
          policy_number: string;
          insurance_id: string;
          status: string;
          payment_status: string;
          premium_amount: number;
          billing_cycle: string;
          coverage_limit: number;
          remaining_coverage: number;
          expiration_date: string;
          renewal_date: string;
          purchased_at: string;
        };
        Insert: {
          id?: string;
          patient_id: string;
          plan_id?: string | null;
          plan_name?: string;
          provider?: string;
          policy_number: string;
          insurance_id?: string;
          status?: string;
          payment_status?: string;
          premium_amount?: number;
          billing_cycle?: string;
          coverage_limit?: number;
          remaining_coverage?: number;
          expiration_date?: string;
          renewal_date?: string;
        };
        Update: Partial<Database["public"]["Tables"]["insurance_policies"]["Insert"]>;
      };
      insurance_requests: {
        Row: {
          id: string;
          patient_id: string;
          plan_id: string | null;
          patient_name: string;
          patient_email: string;
          plan_name: string;
          provider: string;
          policy_number: string;
          status: string;
          premium_amount: number;
          coverage_limit: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          patient_id: string;
          plan_id?: string | null;
          patient_name?: string;
          patient_email?: string;
          plan_name?: string;
          provider?: string;
          policy_number?: string;
          status?: string;
          premium_amount?: number;
          coverage_limit?: number;
        };
        Update: Partial<Database["public"]["Tables"]["insurance_requests"]["Insert"]>;
      };
      bills: {
        Row: {
          id: string;
          invoice_no: string;
          patient_id: string;
          description: string;
          category: string;
          amount: number;
          status: string;
          payment_method: string;
          order_id: string | null;
          policy_id: string | null;
          details: Record<string, unknown>;
          due_date: string;
          paid_at: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          invoice_no: string;
          patient_id: string;
          description?: string;
          category?: string;
          amount: number;
          status?: string;
          payment_method?: string;
          order_id?: string | null;
          policy_id?: string | null;
          details?: Record<string, unknown>;
          due_date?: string;
          paid_at?: string | null;
        };
        Update: Partial<Database["public"]["Tables"]["bills"]["Insert"]>;
      };
      payment_transactions: {
        Row: {
          id: string;
          bill_id: string | null;
          invoice_no: string;
          patient_id: string;
          description: string;
          amount_paid: number;
          status: string;
          method: string;
          category: string;
          transaction_id: string;
          payment_date: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          bill_id?: string | null;
          invoice_no?: string;
          patient_id: string;
          description?: string;
          amount_paid: number;
          status?: string;
          method?: string;
          category?: string;
          transaction_id?: string;
        };
        Update: Partial<Database["public"]["Tables"]["payment_transactions"]["Insert"]>;
      };
      conversations: {
        Row: {
          id: string;
          patient_id: string;
          doctor_id: string | null;
          doctor_name: string;
          specialty: string;
          contact_name: string;
          contact_avatar: string;
          last_message_preview: string;
          last_message_at: string;
          unread_count: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          patient_id: string;
          doctor_id?: string | null;
          doctor_name?: string;
          specialty?: string;
          contact_name?: string;
          contact_avatar?: string;
          last_message_preview?: string;
          last_message_at?: string;
          unread_count?: number;
        };
        Update: Partial<Database["public"]["Tables"]["conversations"]["Insert"]>;
      };
      messages: {
        Row: {
          id: string;
          conversation_id: string;
          sender: string;
          text: string;
          file_name: string;
          file_storage_path: string;
          read: boolean;
          status: string;
          sms_status: string;
          sms_to: string;
          sms_from: string;
          sms_error: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          conversation_id: string;
          sender?: string;
          text?: string;
          file_name?: string;
          file_storage_path?: string;
          read?: boolean;
          status?: string;
          sms_status?: string;
          sms_to?: string;
          sms_from?: string;
          sms_error?: string;
        };
        Update: Partial<Database["public"]["Tables"]["messages"]["Insert"]>;
      };
    };
  };
};
