/**
 * Fully client-side MOCK implementation of the SugboDoc patient-portal API client.
 * No network requests are made — everything resolves from in-memory mock state
 * seeded from mock-data.ts / portal-demo-data.ts, so the demo UI behaves like a
 * real backend for the duration of the session.
 */

import {
  patient as demoPatient,
  doctors,
  appointments as seedAppointments,
  encounters as seedEncounters,
  prescriptions as seedPrescriptions,
  labResults as seedLabResults,
  diagnoses as seedDiagnoses,
  bills as seedBills,
  queueEntry,
  activityFeed,
} from "@/lib/mock-data";
import { demoConversations } from "@/lib/portal-demo-data";

export type AuthClearReason = "logout" | "expired";

export function clearAuthState(reason: AuthClearReason = "logout") {
  localStorage.removeItem("sugbodoc_auth");
  localStorage.removeItem("sugbodoc_user");
  window.dispatchEvent(new CustomEvent("sugbodoc:auth-cleared", { detail: { reason } }));
}

function delay(ms = 120) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function uid(prefix: string) {
  return `${prefix}_${Math.random().toString(36).slice(2, 10)}${Date.now().toString(36).slice(-4)}`;
}

function ok<T>(data: T): { data?: T; error?: string } {
  return { data };
}
function fail(error: string): { data?: never; error?: string } {
  return { error };
}

// ─────────────────────────────────────────────────────────────────────────────
// In-memory session user
// ─────────────────────────────────────────────────────────────────────────────

type StoredUser = {
  id: string;
  email: string;
  username?: string | null;
  name: string;
  phone?: string | null;
  role: string;
  status?: string;
  emailVerified?: boolean;
  /** Demo-only password for the seeded accounts. */
  password?: string;
};

let currentUser: StoredUser | null = null;

export type AppRole = "patient" | "doctor" | "admin";
export const APP_ROLES: AppRole[] = ["patient", "doctor", "admin"];

export function normalizeRole(role?: string | null): AppRole {
  const value = String(role ?? "").toLowerCase();
  if (value === "admin" || value === "administrator") return "admin";
  if (value === "doctor" || value === "physician") return "doctor";
  return "patient";
}

const USERS_STORAGE_KEY = "sugbodoc_users";

// Seeded directory of demo accounts. Roles are persisted locally so admin role
// changes survive reloads for the duration of the demo.
const seededUsers: StoredUser[] = [
  {
    id: "user_1",
    email: "juan.delacruz@example.com",
    password: "Patient123!",
    username: "juan.delacruz",
    name: demoPatient.name,
    phone: "09171234567",
    role: "patient",
    status: "active",
    emailVerified: true,
  },
  {
    id: "admin_1",
    email: "admin@sugbodoc.com",
    password: "Admin123!",
    username: "admin",
    name: "Admin User",
    phone: "09170000001",
    role: "admin",
    status: "active",
    emailVerified: true,
  },
  {
    id: "doctor_1",
    email: "doctor@sugbodoc.com",
    password: "Doctor123!",
    username: "doctor",
    name: doctors[0]?.name ?? "Dr. Ana Reyes",
    phone: "09170000002",
    role: "doctor",
    status: "active",
    emailVerified: true,
  },
];

let userDirectory: StoredUser[] = seededUsers.map((u) => ({ ...u }));
let directoryLoaded = false;

function loadDirectory() {
  if (directoryLoaded || typeof window === "undefined") return;
  directoryLoaded = true;
  try {
    const raw = localStorage.getItem(USERS_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as StoredUser[];
      if (Array.isArray(parsed) && parsed.length) {
        // Merge stored records over the seeds so new seeds still appear.
        const merged = seededUsers.map((seed) => {
          const stored = parsed.find((p) => p.email?.toLowerCase() === seed.email.toLowerCase());
          return stored ? { ...seed, ...stored } : { ...seed };
        });
        for (const stored of parsed) {
          if (!merged.some((m) => m.email?.toLowerCase() === stored.email?.toLowerCase())) {
            merged.push(stored);
          }
        }
        userDirectory = merged;
      }
    }
  } catch {
    userDirectory = seededUsers.map((u) => ({ ...u }));
  }
}

function persistDirectory() {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(USERS_STORAGE_KEY, JSON.stringify(userDirectory));
  } catch {
    // ignore quota errors in the demo
  }
}

function findUserByIdentifier(identifier: string): StoredUser | undefined {
  loadDirectory();
  const value = identifier.trim().toLowerCase();
  return userDirectory.find(
    (u) => u.email.toLowerCase() === value || (u.username ?? "").toLowerCase() === value,
  );
}

function makeUser(identifier: string, name?: string, phone?: string): StoredUser {
  const existing = findUserByIdentifier(identifier);
  if (existing) return { ...existing, ...(name ? { name } : {}), ...(phone ? { phone } : {}) };

  const lowered = identifier.toLowerCase();
  const role: AppRole = lowered.includes("admin")
    ? "admin"
    : lowered.includes("doctor")
      ? "doctor"
      : "patient";
  const user: StoredUser = {
    id: uid("user"),
    email: identifier.includes("@") ? identifier : `${identifier}@sugbodoc.ph`,
    username: identifier,
    name: name ?? (role === "admin" ? "Admin User" : role === "doctor" ? "Doctor" : demoPatient.name),
    phone: phone ?? "09171234567",
    role,
    status: "active",
    emailVerified: true,
  };
  loadDirectory();
  userDirectory.push(user);
  persistDirectory();
  return user;
}

/** The mock doctor directory name that a signed-in doctor account maps to. */
function currentDoctorName(): string | null {
  if (!currentUser || normalizeRole(currentUser.role) !== "doctor") return null;
  const match = doctors.find((d) => d.name.toLowerCase() === currentUser!.name.toLowerCase());
  return (match ?? doctors[0])?.name ?? null;
}


// ─────────────────────────────────────────────────────────────────────────────
// Patient account mock state
// ─────────────────────────────────────────────────────────────────────────────

const profileStore: Record<string, unknown> = {
  id: "user_1",
  email: "juan.delacruz@example.com",
  name: demoPatient.name,
  dob: demoPatient.dob,
  bloodType: demoPatient.bloodType,
  phone: "09171234567",
  allergies: [...demoPatient.allergies],
  emergencyContactName: demoPatient.emergencyContact.name,
  emergencyContactRelation: demoPatient.emergencyContact.relation,
  emergencyContactPhone: demoPatient.emergencyContact.phone,
};

let accountAppointments: Array<Record<string, any>> = seedAppointments.map((a) => ({
  id: a.id,
  doctorId: a.doctor.id,
  doctorName: a.doctor.name,
  specialty: a.doctor.specialty,
  clinic: a.clinic,
  appointmentDate: a.date,
  appointmentTime: a.time,
  status: a.status,
}));

let accountMessages: Array<Record<string, any>> = demoConversations.map((c) => ({
  id: c.id,
  doctorId: c.id,
  doctorName: c.contact.name,
  specialty: c.contact.specialty,
  preview: c.messages[c.messages.length - 1]?.text ?? "",
  unread: c.unread,
  time: c.messages[c.messages.length - 1]?.time ?? "",
}));

const conversationThreads: Record<string, Array<Record<string, any>>> = Object.fromEntries(
  demoConversations.map((c) => [c.id, c.messages.map((m) => ({ ...m }))]),
);

let queueState: Record<string, any> | null = {
  id: queueEntry.id,
  appointmentId: queueEntry.appointmentId,
  queueNumber: queueEntry.queueNumber,
  clinic: queueEntry.clinic,
  doctor: queueEntry.doctor,
  specialty: queueEntry.specialty,
  date: queueEntry.date,
  time: queueEntry.time,
  avgServiceMinutes: queueEntry.avgServiceMinutes,
  status: "Waiting",
};

// ─────────────────────────────────────────────────────────────────────────────
// Medical Store mock state
// ─────────────────────────────────────────────────────────────────────────────

const storeBranches = [
  { id: "br1", name: "Chong Hua Hospital Pharmacy", address: "Fuente Osmeña, Cebu City", hours: "7:00 AM – 9:00 PM" },
  { id: "br2", name: "SugboDoc Regional Pharmacy", address: "Banilad, Cebu City", hours: "24 Hours" },
  { id: "br3", name: "Cebu Doctors' Pharmacy", address: "Osmeña Blvd, Cebu City", hours: "8:00 AM – 8:00 PM" },
];

const storeCategories = ["Pain Relief", "Antibiotics", "Vitamins & Supplements", "Cardiac Care", "Diabetes Care", "First Aid"];

let storeProducts: Array<Record<string, any>> = [
  { id: "pr1", name: "Biogesic 500mg", description: "Paracetamol tablets for fever and pain relief", category: "Pain Relief", price: "5.50", stock: 340, brand: "Unilab", imageUrl: "", rating: "4.7", reviewCount: 128, prescriptionRequired: 0 },
  { id: "pr2", name: "Amoxicillin 500mg", description: "Broad-spectrum antibiotic capsules", category: "Antibiotics", price: "12.00", stock: 8, brand: "Pharex", imageUrl: "", rating: "4.5", reviewCount: 64, prescriptionRequired: 1 },
  { id: "pr3", name: "Vitamin C 1000mg", description: "Immune support ascorbic acid tablets", category: "Vitamins & Supplements", price: "9.75", stock: 210, brand: "Enervon", imageUrl: "", rating: "4.8", reviewCount: 210, prescriptionRequired: 0 },
  { id: "pr4", name: "Amlodipine 5mg", description: "Calcium channel blocker for hypertension", category: "Cardiac Care", price: "14.25", stock: 5, brand: "Pfizer", imageUrl: "", rating: "4.6", reviewCount: 47, prescriptionRequired: 1 },
  { id: "pr5", name: "Metformin 500mg", description: "Oral medication for type 2 diabetes", category: "Diabetes Care", price: "6.80", stock: 150, brand: "Glucophage", imageUrl: "", rating: "4.4", reviewCount: 92, prescriptionRequired: 1 },
  { id: "pr6", name: "First Aid Kit (Basic)", description: "Bandages, antiseptic and gauze essentials", category: "First Aid", price: "349.00", stock: 40, brand: "SafeGuard", imageUrl: "", rating: "4.9", reviewCount: 33, prescriptionRequired: 0 },
];

let storeOrders: Array<Record<string, any>> = [
  {
    id: "ord1", orderNo: "ORD-100234", fulfillmentType: "delivery", pickupBranch: null, deliveryAddress: "123 Mango Ave, Cebu City",
    deliveryFee: "80.00", subtotal: "27.75", total: "107.75", status: "Delivered", trackingNo: "TRK-5521", estimatedDelivery: "July 20, 2026",
    receivedAt: "July 20, 2026", createdAt: "July 17, 2026",
    items: [{ productName: "Biogesic 500mg", brand: "Unilab", unitPrice: "5.50", quantity: 3, lineTotal: "16.50" }, { productName: "Vitamin C 1000mg", brand: "Enervon", unitPrice: "9.75", quantity: 1, lineTotal: "9.75" }],
  },
  {
    id: "ord2", orderNo: "ORD-100255", fulfillmentType: "pickup", pickupBranch: "br1", deliveryAddress: null,
    deliveryFee: "0.00", subtotal: "12.00", total: "12.00", status: "Ready for Pickup", trackingNo: null, estimatedDelivery: null,
    receivedAt: null, createdAt: "July 26, 2026",
    items: [{ productName: "Amoxicillin 500mg", brand: "Pharex", unitPrice: "12.00", quantity: 1, lineTotal: "12.00" }],
  },
];

let storeNotifications: Array<Record<string, any>> = [
  { id: "sn1", title: "Order Ready for Pickup", message: "Your order ORD-100255 is ready at Chong Hua Hospital Pharmacy.", kind: "order", createdAt: "July 26, 2026" },
  { id: "sn2", title: "Low Stock Alert", message: "Amlodipine 5mg is running low in your saved list.", kind: "stock", createdAt: "July 24, 2026" },
];

// ─────────────────────────────────────────────────────────────────────────────
// Insurance mock state
// ─────────────────────────────────────────────────────────────────────────────

let insurancePlans: Array<Record<string, any>> = [
  { id: "plan1", providerRating: 4.4, providerMembers: 128400, providerAbout: "SugboDoc Insurance partners with Cebu's leading hospitals to keep everyday care affordable.", code: "BASIC-01", name: "SugboDoc Basic Care", provider: "SugboDoc Insurance", description: "Essential coverage for outpatient consultations and basic diagnostics.", monthlyPremium: "899.00", annualPremium: "9600.00", coverageLimit: "100000.00", coveragePercentage: 60, validityMonths: 12, benefits: ["Outpatient consultations", "Basic laboratory tests", "10% pharmacy discount"], active: 1, createdAt: "Jan 2, 2025" },
  { id: "plan2", providerRating: 4.7, providerMembers: 96250, providerAbout: "Extended cover for specialist and diagnostic care across accredited Cebu clinics.", code: "PLUS-02", name: "SugboDoc Plus", provider: "SugboDoc Insurance", description: "Extended coverage including specialist visits and imaging.", monthlyPremium: "1599.00", annualPremium: "17200.00", coverageLimit: "300000.00", coveragePercentage: 75, validityMonths: 12, benefits: ["Specialist consultations", "Imaging & diagnostics", "20% pharmacy discount", "Emergency room coverage"], active: 1, createdAt: "Jan 2, 2025" },
  { id: "plan3", providerRating: 4.9, providerMembers: 41870, providerAbout: "Premier tier with full hospitalization support and executive wellness benefits.", code: "PREMIER-03", name: "SugboDoc Premier", provider: "SugboDoc Insurance", description: "Comprehensive coverage with hospitalization and dental benefits.", monthlyPremium: "2899.00", annualPremium: "31200.00", coverageLimit: "750000.00", coveragePercentage: 90, validityMonths: 12, benefits: ["Full hospitalization", "Dental & vision", "30% pharmacy discount", "Annual executive check-up"], active: 1, createdAt: "Jan 2, 2025" },
];

let insurancePolicies: Array<Record<string, any>> = [];

let insuranceRequests: Array<Record<string, any>> = [
  { id: "ireq1", userId: "user_2", patientName: "Maria Lopez", patientEmail: "maria.lopez@example.com", planName: "SugboDoc Plus", provider: "SugboDoc Insurance", policyNumber: "SD-PL-88213", status: "Pending", premiumAmount: "17200.00", coverageLimit: "300000.00", createdAt: "July 25, 2026" },
  { id: "ireq2", userId: "user_3", patientName: "Carlos Tan", patientEmail: "carlos.tan@example.com", planName: "SugboDoc Basic Care", provider: "SugboDoc Insurance", policyNumber: "SD-BS-33110", status: "Approved", premiumAmount: "9600.00", coverageLimit: "100000.00", createdAt: "July 18, 2026" },
  { id: "ireq3", userId: "user_4", patientName: "Isabel Cruz", patientEmail: "isabel.cruz@example.com", planName: "SugboDoc Premier", provider: "SugboDoc Insurance", policyNumber: "SD-PR-99871", status: "Rejected", premiumAmount: "31200.00", coverageLimit: "750000.00", createdAt: "July 10, 2026" },
];

// ─────────────────────────────────────────────────────────────────────────────
// Payments mock state
// ─────────────────────────────────────────────────────────────────────────────

let paymentHistory: Array<Record<string, any>> = [
  { id: "txn1", description: "Consultation Fee", amount: "1500.00", status: "Paid", method: "GCash", createdAt: "July 15, 2026", transactionId: "pi_mock_1" },
  { id: "txn2", description: "Laboratory Package", amount: "2500.00", status: "Paid", method: "Card", createdAt: "July 15, 2026", transactionId: "pi_mock_2" },
];

const checkoutSessions = new Map<string, Record<string, any>>();
const paymentIntents = new Map<string, Record<string, any>>();

// ─────────────────────────────────────────────────────────────────────────────
// Admin mock state
// ─────────────────────────────────────────────────────────────────────────────

const departments = ["Internal Medicine", "Cardiology", "OB-GYN", "Pediatrics", "Dermatology"];

let adminPatients: Array<Record<string, any>> = Array.from({ length: 14 }).map((_, i) => {
  const names = ["Maria Lopez", "Carlos Tan", "Isabel Cruz", "Ronaldo Diaz", "Ana Bautista", "Miguel Torres", "Cristina Reyes", "Paolo Santiago", "Bea Villanueva", "Jerome Aguilar", "Lourdes Fernandez", "Kevin Uy", "Sofia Mendoza", "Danilo Cabrera"];
  const statuses = ["Active", "Active", "Active", "Inactive"];
  const name = names[i] ?? `Patient ${i + 1}`;
  return {
    id: `pt_${i + 1}`,
    name,
    email: `${name.toLowerCase().replace(/\s+/g, ".")}@example.com`,
    phone: `09${170000000 + i * 913}`,
    dob: `19${70 + (i % 30)}-0${(i % 9) + 1}-1${i % 9}`,
    age: 25 + (i % 40),
    sex: i % 2 === 0 ? "Female" : "Male",
    createdAt: `July ${1 + (i % 28)}, 2026`,
    assignedDoctor: doctors[i % doctors.length].name,
    status: statuses[i % statuses.length],
  };
});

let adminAppointments: Array<Record<string, any>> = Array.from({ length: 16 }).map((_, i) => {
  const patient = adminPatients[i % adminPatients.length];
  const doctor = doctors[i % doctors.length];
  const statuses = ["Confirmed", "Pending", "Completed", "Cancelled"];
  return {
    id: `apt_${i + 1}`,
    patientName: patient.name,
    patientId: patient.id,
    doctorName: doctor.name,
    department: doctor.specialty,
    date: `Aug ${1 + (i % 28)}, 2026`,
    time: `${8 + (i % 8)}:00 AM`,
    status: statuses[i % statuses.length],
    notes: i % 3 === 0 ? "Follow-up required" : "",
  };
});

let adminQueue: Array<Record<string, any>> = Array.from({ length: 10 }).map((_, i) => {
  const patient = adminPatients[i % adminPatients.length];
  const doctor = doctors[i % doctors.length];
  const statuses = ["Waiting", "Serving", "Completed", "No Show"];
  return {
    id: `q_${i + 1}`,
    queueNumber: String(40 + i),
    patientName: patient.name,
    patientId: patient.id,
    department: doctor.specialty,
    doctorName: doctor.name,
    status: statuses[i % statuses.length],
    estimatedWaitMinutes: 5 * (i + 1),
    checkedInAt: `${8 + Math.floor(i / 2)}:${(i % 2) * 30 || "00"} AM`,
    joinedAt: `${8 + Math.floor(i / 2)}:${(i % 2) * 30 || "00"} AM`,
  };
});

let adminOrders: Array<Record<string, any>> = Array.from({ length: 9 }).map((_, i) => {
  const patient = adminPatients[i % adminPatients.length];
  const statuses = ["Pending", "Preparing", "Ready for Pickup", "Out for Delivery", "Delivered", "Completed"];
  const fulfillment = i % 2 === 0 ? "delivery" : "pickup";
  return {
    id: `aord_${i + 1}`,
    orderNo: `ORD-10${100 + i}`,
    patientName: patient.name,
    fulfillmentType: fulfillment,
    deliveryAddress: fulfillment === "delivery" ? "123 Mango Ave, Cebu City" : null,
    status: statuses[i % statuses.length],
    paymentStatus: i % 3 === 0 ? "Paid" : "Pending",
    total: (250 + i * 37.5).toFixed(2),
    createdAt: `Aug ${1 + i}, 2026`,
    receivedAt: null,
    items: [{ productName: storeProducts[i % storeProducts.length].name, quantity: 1 + (i % 3) }],
  };
});

let adminBills: Array<Record<string, any>> = Array.from({ length: 11 }).map((_, i) => {
  const patient = adminPatients[i % adminPatients.length];
  const statuses = ["Paid", "Pending", "Overdue"];
  const categories = ["Consultation", "Laboratory", "Imaging", "Pharmacy", "Insurance"];
  return {
    id: `bill_${i + 1}`,
    invoiceNo: `INV-20${300 + i}`,
    patientName: patient.name,
    description: `${categories[i % categories.length]} charges`,
    category: categories[i % categories.length],
    amount: (500 + i * 220).toFixed(2),
    status: statuses[i % statuses.length],
    paymentMethod: i % 2 === 0 ? "GCash" : null,
    createdAt: `July ${1 + i}, 2026`,
    paidAt: statuses[i % statuses.length] === "Paid" ? `July ${2 + i}, 2026` : null,
  };
});

let adminEncounters: Array<Record<string, any>> = Array.from({ length: 12 }).map((_, i) => {
  const patient = adminPatients[i % adminPatients.length];
  const doctor = doctors[i % doctors.length];
  return {
    id: `enc_${i + 1}`,
    patientId: patient.id,
    patientName: patient.name,
    date: `July ${1 + i}, 2026`,
    doctor: doctor.name,
    department: doctor.specialty,
    specialty: doctor.specialty,
    chiefComplaint: seedEncounters[i % seedEncounters.length].complaint,
    complaint: seedEncounters[i % seedEncounters.length].complaint,
    diagnosis: seedDiagnoses[i % seedDiagnoses.length].desc,
    summary: seedEncounters[i % seedEncounters.length].summary,
    historyOfPresentIllness: "Patient reports symptoms consistent with the chief complaint, gradually worsening over recent days.",
    treatmentProvided: "Medication prescribed and lifestyle counseling provided.",
    followUpRecommendations: "Follow-up visit recommended in 2–4 weeks.",
    encounterNotes: "Vitals stable; no acute distress observed during consultation.",
    status: i % 4 === 0 ? "Draft" : "Finalized",
    createdAt: `July ${1 + i}, 2026`,
  };
});

let adminInventory: Array<Record<string, any>> = storeProducts.map((p, i) => ({
  ...p,
  reorderLevel: 20,
  supplier: ["MedSupply PH", "PharmaLink Distributors", "CebuMed Wholesale"][i % 3],
  unitPrice: Number(p.price),
  status: p.stock === 0 ? "Out of Stock" : p.stock < 20 ? "Low Stock" : "In Stock",
}));

let adminMessagingThreads: Record<string, Array<Record<string, any>>> = Object.fromEntries(
  adminPatients.slice(0, 6).map((p, i) => [
    p.id,
    [
      { id: `am_${i}_1`, sender: "patient", text: "Hello, I wanted to ask about my recent lab results.", createdAt: "July 20, 2026 9:00 AM", smsStatus: null, smsTo: null, smsFrom: null, smsError: null },
      { id: `am_${i}_2`, sender: "admin", text: "Hi! Your results look normal overall. Let's discuss at your next visit.", createdAt: "July 20, 2026 9:15 AM", smsStatus: "sent", smsTo: p.phone, smsFrom: "SugboDoc", smsError: null },
    ],
  ]),
);

let dashboardRecentRegistrations = adminPatients.slice(0, 5);

// ─────────────────────────────────────────────────────────────────────────────
// Helpers for filtering
// ─────────────────────────────────────────────────────────────────────────────

function matchesSearch(value: string | undefined, search?: string) {
  if (!search) return true;
  return (value ?? "").toLowerCase().includes(search.toLowerCase());
}

// ─────────────────────────────────────────────────────────────────────────────
// apiClient
// ─────────────────────────────────────────────────────────────────────────────

export const apiClient = {
  // Auth
  register: async (email: string, name: string, _password: string, phone?: string) => {
    await delay();
    const user = makeUser(email, name, phone);
    currentUser = user;
    return ok({ token: "mock-token", user });
  },

  login: async (identifier: string, password: string) => {
    await delay();
    if (!identifier) return fail("Please enter your credentials");
    const existing = findUserByIdentifier(identifier);
    if (existing?.password && existing.password !== password) {
      return fail("Incorrect email or password.");
    }
    const user = makeUser(identifier);
    currentUser = user;
    return ok({ token: "mock-token", user });
  },

  getMe: async () => {
    await delay();
    if (!currentUser && typeof window !== "undefined") {
      // Restore the demo session across full page reloads.
      const stored = localStorage.getItem("sugbodoc_user");
      const token = localStorage.getItem("sugbodoc_auth");
      if (stored && token) {
        try {
          currentUser = JSON.parse(stored) as StoredUser;
        } catch {
          currentUser = null;
        }
      }
    }
    if (!currentUser) return fail("Not authenticated");
    // Always resolve the role from the directory so admin role changes apply immediately.
    const directoryUser = findUserByIdentifier(currentUser.email ?? currentUser.username ?? "");
    if (directoryUser) {
      currentUser = { ...currentUser, role: directoryUser.role, name: directoryUser.name };
      if (typeof window !== "undefined") {
        localStorage.setItem("sugbodoc_user", JSON.stringify(currentUser));
      }
    }
    return ok({ user: currentUser });
  },

  logout: async () => {
    await delay();
    currentUser = null;
    return ok({ ok: true });
  },

  // Role management (admin only)
  getManagedUsers: async (search?: string) => {
    await delay();
    if (!currentUser || normalizeRole(currentUser.role) !== "admin") {
      return fail("Only administrators can manage roles");
    }
    loadDirectory();
    const users = userDirectory
      .filter((u) => matchesSearch(u.name, search) || matchesSearch(u.email, search))
      .map((u) => ({ ...u, role: normalizeRole(u.role) }));
    return ok({ users });
  },

  updateUserRole: async (userId: string, role: AppRole) => {
    await delay();
    if (!currentUser || normalizeRole(currentUser.role) !== "admin") {
      return fail("Only administrators can change roles");
    }
    loadDirectory();
    const user = userDirectory.find((u) => u.id === userId);
    if (!user) return fail("User not found");
    if (user.id === currentUser.id && role !== "admin") {
      return fail("You cannot remove your own administrator role");
    }
    user.role = normalizeRole(role);
    persistDirectory();
    return ok({ user: { ...user } });
  },

  // Doctor endpoints (scoped to the signed-in doctor)
  getDoctorDashboard: async () => {
    await delay();
    const doctorName = currentDoctorName();
    if (!doctorName) return fail("Not authorized");
    const patients = adminPatients.filter((p) => p.assignedDoctor === doctorName);
    const appointments = adminAppointments.filter((a) => a.doctorName === doctorName);
    const encounters = adminEncounters.filter((e) => e.doctor === doctorName);
    const queue = adminQueue.filter((q) => q.doctorName === doctorName);
    return ok({
      doctor: { name: doctorName, specialty: doctors.find((d) => d.name === doctorName)?.specialty ?? "General Medicine" },
      summary: {
        assignedPatients: patients.length,
        upcomingAppointments: appointments.filter((a) => a.status === "Confirmed" || a.status === "Pending").length,
        encounters: encounters.length,
        waitingInQueue: queue.filter((q) => q.status === "Waiting" || q.status === "Serving").length,
      },
      recentAppointments: appointments.slice(0, 6),
      recentEncounters: encounters.slice(0, 6),
      assignedPatients: patients.slice(0, 6),
    });
  },


  getProfile: async () => {
    await delay();
    return ok({ user: { ...profileStore } as any });
  },

  updateProfile: async (profile: Record<string, unknown>) => {
    await delay();
    Object.assign(profileStore, profile);
    return ok({ user: { ...profileStore } });
  },

  getAppointments: async () => {
    await delay();
    return ok({ appointments: accountAppointments as any });
  },

  createAppointment: async (appointment: {
    doctorId: string; doctorName: string; specialty: string; clinic: string;
    appointmentDate: string; appointmentTime: string;
  }) => {
    await delay();
    const newAppointment = { id: uid("appt"), status: "Pending", ...appointment };
    accountAppointments = [newAppointment, ...accountAppointments];
    return ok({ appointment: newAppointment, email: { sent: true } as { sent: boolean; reason?: string; attempts?: number } });
  },

  cancelAppointment: async (id: string) => {
    await delay();
    const appointment = accountAppointments.find((a) => a.id === id);
    if (!appointment) return fail("Appointment not found");
    appointment.status = "Cancelled";
    return ok({ appointment });
  },

  getAccountData: async () => {
    await delay();
    return ok({
      profile: { ...profileStore },
      appointments: accountAppointments,
      records: seedEncounters,
      messages: accountMessages,
      bills: seedBills.outstanding,
      queue: queueState,
    });
  },

  getAccountEncounters: async () => {
    await delay();
    return ok({ encounters: seedEncounters as any });
  },

  getAccountEncounterRecords: async (encounterId: string) => {
    await delay();
    const encounter = seedEncounters.find((e) => e.id === encounterId) ?? seedEncounters[0];
    return ok({
      encounter,
      records: [
        { id: uid("rec"), type: "Prescription", data: seedPrescriptions },
        { id: uid("rec"), type: "Lab Result", data: seedLabResults },
      ],
    });
  },

  getQueue: async () => {
    await delay();
    return ok({ queue: queueState });
  },

  sendPatientMessage: async (message: { doctorId: string; doctorName: string; specialty: string; text?: string; fileName?: string }) => {
    await delay();
    const thread = conversationThreads[message.doctorId] ?? (conversationThreads[message.doctorId] = []);
    const newMessage = {
      id: uid("msg"),
      sender: "patient",
      text: message.text ?? `Sent a file: ${message.fileName}`,
      time: "Just now",
      status: "Sent",
      read: true,
    };
    thread.push(newMessage);
    const existing = accountMessages.find((m) => m.doctorId === message.doctorId);
    if (existing) {
      existing.preview = newMessage.text;
      existing.time = "Just now";
    } else {
      accountMessages = [
        { id: uid("inbox"), doctorId: message.doctorId, doctorName: message.doctorName, specialty: message.specialty, preview: newMessage.text, unread: 0, time: "Just now" },
        ...accountMessages,
      ];
    }
    return ok({ message: newMessage });
  },

  getConversationMessages: async (doctorId: string) => {
    await delay();
    return ok({ messages: conversationThreads[doctorId] ?? [] });
  },

  // Medical Store
  getStoreProducts: async () => {
    await delay();
    return ok({ products: storeProducts, categories: storeCategories, branches: storeBranches });
  },

  getStoreOrders: async () => {
    await delay();
    return ok({ orders: storeOrders });
  },

  confirmStoreOrderReceived: async (id: string) => {
    await delay();
    const order = storeOrders.find((o) => o.id === id);
    if (!order) return fail("Order not found");
    order.status = "Completed";
    order.receivedAt = "Just now";
    return ok({ order });
  },

  createStoreOrder: async (order: { items: Array<{ productId: string; quantity: number }>; fulfillmentType: "pickup" | "delivery"; deliveryAddress?: string; pickupBranch?: string }) => {
    await delay();
    const items = order.items.map((item) => {
      const product = storeProducts.find((p) => p.id === item.productId);
      if (product) product.stock = Math.max(0, product.stock - item.quantity);
      const unitPrice = Number(product?.price ?? 0);
      return {
        productName: product?.name ?? "Item",
        brand: product?.brand ?? "",
        unitPrice: unitPrice.toFixed(2),
        quantity: item.quantity,
        lineTotal: (unitPrice * item.quantity).toFixed(2),
      };
    });
    const subtotal = items.reduce((sum, i) => sum + Number(i.lineTotal), 0);
    const deliveryFee = order.fulfillmentType === "delivery" ? 80 : 0;
    const newOrder = {
      id: uid("ord"),
      orderNo: `ORD-${Math.floor(100000 + Math.random() * 899999)}`,
      fulfillmentType: order.fulfillmentType,
      pickupBranch: order.pickupBranch ?? null,
      deliveryAddress: order.deliveryAddress ?? null,
      deliveryFee: deliveryFee.toFixed(2),
      subtotal: subtotal.toFixed(2),
      total: (subtotal + deliveryFee).toFixed(2),
      status: "Pending",
      trackingNo: null,
      estimatedDelivery: order.fulfillmentType === "delivery" ? "3-5 business days" : null,
      receivedAt: null,
      createdAt: "Just now",
      items,
    };
    storeOrders = [newOrder, ...storeOrders];
    return ok({ order: newOrder });
  },

  getStoreNotifications: async () => {
    await delay();
    return ok({ notifications: storeNotifications });
  },

  getInsurancePlans: async () => {
    await delay();
    return ok({ plans: insurancePlans.filter((p) => p.active) });
  },

  getInsurancePolicies: async () => {
    await delay();
    return ok({ policies: insurancePolicies });
  },

  purchaseInsurance: async (planId: string, _termsAccepted: boolean, billingCycle: "monthly" | "annual" = "annual") => {
    await delay();
    const plan = insurancePlans.find((p) => p.id === planId);
    if (!plan) return fail("Plan not found");
    const amount = billingCycle === "monthly" ? Number(plan.monthlyPremium) : Number(plan.annualPremium);
    const policy = {
      id: uid("policy"),
      planId: plan.id,
      planName: plan.name,
      provider: plan.provider,
      policyNumber: `SD-${plan.code}-${Math.floor(10000 + Math.random() * 89999)}`,
      coverageLimit: plan.coverageLimit,
      remainingCoverage: plan.coverageLimit,
      status: "Pending Payment",
      billingCycle,
      expirationDate: "July 2027",
      createdAt: "Just now",
    };
    insurancePolicies = [policy, ...insurancePolicies];
    const bill = {
      id: uid("bill"),
      invoiceNo: `INV-${Math.floor(10000 + Math.random() * 89999)}`,
      description: `${plan.name} - Insurance Premium (${billingCycle})`,
      amount: amount.toFixed(2),
      status: "Pending",
      createdAt: "Just now",
    };
    return ok({
      policy,
      bill,
      checkout: {
        invoiceId: bill.id,
        invoiceNo: bill.invoiceNo,
        amount,
        description: bill.description,
        patientEmail: String(profileStore.email ?? ""),
      },
    });
  },

  renewInsurance: async (policyId: string) => {
    await delay();
    const policy = insurancePolicies.find((p) => p.id === policyId);
    if (!policy) return fail("Policy not found");
    policy.status = "Active";
    policy.expirationDate = "July 2028";
    return ok({ message: "Policy renewed successfully" });
  },

  getInsurancePolicyPdf: async (policyId: string) => {
    await delay();
    const policy = insurancePolicies.find((p) => p.id === policyId) ?? { id: policyId };
    return ok({ placeholder: true, filename: `policy-${policyId}.pdf`, policy, message: "PDF generation is a placeholder in this demo." });
  },

  // Payments
  getPaymentConfig: async () => {
    await delay();
    return ok({ publishableKey: "pk_mock_demo", configured: false });
  },

  createPaymentIntent: async (
    amount: number,
    description: string,
    details?: { invoiceId?: string; invoiceNo?: string; patientEmail?: string },
  ) => {
    await delay();
    const intentId = uid("pi");
    paymentIntents.set(intentId, { amount, description, ...details, status: "requires_confirmation" });
    return ok({ clientSecret: `${intentId}_secret_mock`, intentId });
  },

  createCheckoutSession: async (
    amount: number,
    description: string,
    details: { invoiceId?: string; invoiceNo?: string; patientEmail?: string; successUrl: string; cancelUrl: string },
  ) => {
    await delay();
    const sessionId = uid("cs");
    checkoutSessions.set(sessionId, {
      sessionId,
      status: "complete",
      paymentStatus: "paid",
      paymentIntentId: uid("pi"),
      amountTotal: Math.round(amount * 100),
      currency: "php",
      metadata: {
        invoice_id: details.invoiceId ?? "",
        invoice_no: details.invoiceNo ?? "",
        description,
      },
    });
    const url = `${details.successUrl}${details.successUrl.includes("?") ? "&" : "?"}session_id=${sessionId}`;
    return ok({ sessionId, url });
  },

  getCheckoutSession: async (sessionId: string) => {
    await delay();
    const session = checkoutSessions.get(sessionId);
    if (!session) {
      return ok({
        sessionId,
        status: null,
        paymentStatus: null,
        paymentIntentId: null,
        amountTotal: null,
        currency: null,
        metadata: {},
      });
    }
    return ok(session as any);
  },

  getPaymentHistory: async () => {
    await delay();
    return ok({ transactions: paymentHistory });
  },

  confirmPayment: async (intentId: string) => {
    await delay();
    const intent = paymentIntents.get(intentId);
    if (intent) intent.status = "succeeded";
    return ok({ status: "succeeded", intentId });
  },

  // Notifications
  sendSMS: async (_to: string, _message: string) => {
    await delay();
    return ok({ sent: true });
  },

  sendEmail: async (_to: string, _subject: string, _html: string, _text?: string) => {
    await delay();
    return ok({ sent: true });
  },

  // Admin endpoints
  getAdminDashboard: async () => {
    await delay();
    return ok({
      summary: {
        totalRegisteredPatients: adminPatients.length,
        activeAppointmentsToday: adminAppointments.filter((a) => a.status === "Confirmed" || a.status === "Pending").length,
        activeQueueCount: adminQueue.filter((q) => q.status === "Waiting" || q.status === "Serving").length,
        inventoryItems: adminInventory.length,
        lowStockAlerts: adminInventory.filter((p) => p.status === "Low Stock" || p.status === "Out of Stock").length,
      },
      recentPatientRegistrations: dashboardRecentRegistrations,
      recentAppointments: adminAppointments.slice(0, 6),
      recentOrders: adminOrders.slice(0, 6),
    });
  },

  getAdminPatients: async (params?: { search?: string; status?: string; sortBy?: string; sortDir?: string }) => {
    await delay();
    const scope = currentDoctorName();
    let results = adminPatients.filter((p) => {
      if (scope && p.assignedDoctor !== scope) return false;
      if (params?.status && params.status !== "all" && p.status !== params.status) return false;
      if (params?.search && !(matchesSearch(p.name, params.search) || matchesSearch(p.email, params.search))) return false;
      return true;
    });
    if (params?.sortBy) {
      const dir = params.sortDir === "desc" ? -1 : 1;
      results = [...results].sort((a, b) => (a[params.sortBy!] > b[params.sortBy!] ? 1 : -1) * dir);
    }
    return ok({ patients: results, total: results.length });
  },

  getAdminPatient: async (id: string) => {
    await delay();
    const patient = adminPatients.find((p) => p.id === id);
    if (!patient) return fail("Patient not found");
    const scope = currentDoctorName();
    if (scope && patient.assignedDoctor !== scope) return fail("You are not authorized to view this patient");
    return ok({
      patient: {
        ...patient,
        bloodType: "O+",
        allergies: ["Penicillin"],
        address: "Cebu City, Philippines",
        emergencyContact: { name: "Family Contact", relation: "Spouse", phone: "09171234567" },
        insurance: { provider: "SugboDoc Insurance", planName: "SugboDoc Plus", policyNumber: "SD-PL-00123", coverageLimit: "300000.00", remainingCoverage: "275000.00", status: "Active", expirationDate: "July 2027" },
        assignedDoctorInfo: { name: patient.assignedDoctor, specialty: doctors.find((d) => d.name === patient.assignedDoctor)?.specialty ?? "General Medicine" },
      },
      documents: [
        { id: uid("doc"), encounterRef: null, name: "Lab Results - CBC.pdf", type: "Lab Result", uploadedAt: "July 20, 2026", fileType: "pdf", sourceKind: "upload", meta: { fileSize: "220 KB", date: "July 20, 2026" } },
      ],
      appointments: adminAppointments.filter((a) => a.patientId === id),
      encounters: adminEncounters.filter((e) => e.patientId === id),
    });
  },

  getAdminPatientEncounterRecords: async (patientId: string, encounterId: string) => {
    await delay();
    const encounter = adminEncounters.find((e) => e.id === encounterId && e.patientId === patientId) ?? adminEncounters.find((e) => e.id === encounterId);
    if (!encounter) return fail("Encounter not found");
    return ok({ encounter, records: [{ id: uid("rec"), kind: "record", encounterRef: encounter.id, data: seedPrescriptions, createdAt: "July 20, 2026" }] });
  },

  getAdminPatientDocument: async (patientId: string, recordId: string) => {
    await delay();
    return ok({
      document: { id: recordId, name: "Lab Results - CBC.pdf", type: "Lab Result", uploadedAt: "July 20, 2026" },
      record: { id: recordId, patientId, data: seedLabResults },
    });
  },

  getAdminAppointments: async (params?: { search?: string; status?: string; department?: string; doctor?: string; date?: string }) => {
    await delay();
    const scope = currentDoctorName();
    const results = adminAppointments.filter((a) => {
      if (scope && a.doctorName !== scope) return false;
      if (params?.status && params.status !== "all" && a.status !== params.status) return false;
      if (params?.department && params.department !== "all" && a.department !== params.department) return false;
      if (params?.doctor && params.doctor !== "all" && a.doctorName !== params.doctor) return false;
      if (params?.date && a.date !== params.date) return false;
      if (params?.search && !(matchesSearch(a.patientName, params.search) || matchesSearch(a.doctorName, params.search))) return false;
      return true;
    });
    return ok({ appointments: results, total: results.length });
  },

  getAdminQueue: async (params?: { search?: string; department?: string; status?: string }) => {
    await delay();
    const scope = currentDoctorName();
    const results = adminQueue.filter((q) => {
      if (scope && q.doctorName !== scope) return false;
      if (params?.status && params.status !== "all" && q.status !== params.status) return false;
      if (params?.department && params.department !== "all" && q.department !== params.department) return false;
      if (params?.search && !matchesSearch(q.patientName, params.search)) return false;
      return true;
    });
    return ok({ queue: results, total: results.length });
  },

  getAdminInventory: async (params?: { search?: string; category?: string; status?: string }) => {
    await delay();
    const results = adminInventory.filter((p) => {
      if (params?.status && params.status !== "all" && p.status !== params.status) return false;
      if (params?.category && params.category !== "all" && p.category !== params.category) return false;
      if (params?.search && !matchesSearch(p.name, params.search)) return false;
      return true;
    });
    return ok({ products: results, categories: storeCategories, total: results.length });
  },

  updateAdminAppointmentStatus: async (id: string, status: string) => {
    await delay();
    const appointment = adminAppointments.find((a) => a.id === id) ?? accountAppointments.find((a) => a.id === id);
    if (!appointment) return fail("Appointment not found");
    appointment.status = status;
    return ok({ appointment });
  },

  updateAdminQueueStatus: async (id: string, status: string) => {
    await delay();
    const entry = adminQueue.find((q) => q.id === id);
    if (!entry) return fail("Queue entry not found");
    entry.status = status;
    return ok({ queue: entry });
  },

  updateAdminInventoryStock: async (id: string, stock: number) => {
    await delay();
    const product = adminInventory.find((p) => p.id === id);
    if (!product) return fail("Product not found");
    product.stock = stock;
    product.status = stock === 0 ? "Out of Stock" : stock < (product.reorderLevel ?? 20) ? "Low Stock" : "In Stock";
    const catalog = storeProducts.find((p) => p.id === id);
    if (catalog) catalog.stock = stock;
    return ok({ product });
  },

  getAdminOrders: async (params?: { search?: string; status?: string }) => {
    await delay();
    const results = adminOrders.filter((o) => {
      if (params?.status && params.status !== "all" && o.status !== params.status) return false;
      if (params?.search && !(matchesSearch(o.patientName, params.search) || matchesSearch(o.orderNo, params.search))) return false;
      return true;
    });
    return ok({ orders: results });
  },

  updateAdminOrderStatus: async (id: string, update: { status?: string; paymentStatus?: string }) => {
    await delay();
    const order = adminOrders.find((o) => o.id === id);
    if (!order) return fail("Order not found");
    if (update.status) order.status = update.status;
    if (update.paymentStatus) order.paymentStatus = update.paymentStatus;
    return ok({ order });
  },

  getAdminBilling: async (params?: { search?: string; status?: string }) => {
    await delay();
    const results = adminBills.filter((b) => {
      if (params?.status && params.status !== "all" && b.status !== params.status) return false;
      if (params?.search && !(matchesSearch(b.patientName, params.search) || matchesSearch(b.invoiceNo, params.search))) return false;
      return true;
    });
    return ok({ bills: results });
  },

  getAdminEncounters: async (params?: { search?: string; patientId?: string; doctor?: string; department?: string; dateFrom?: string; dateTo?: string; sortBy?: string; sortDir?: string; page?: number; limit?: number }) => {
    await delay();
    const scope = currentDoctorName();
    let results = adminEncounters.filter((e) => {
      if (scope && e.doctor !== scope) return false;
      if (params?.patientId && e.patientId !== params.patientId) return false;
      if (params?.doctor && params.doctor !== "all" && e.doctor !== params.doctor) return false;
      if (params?.department && params.department !== "all" && e.department !== params.department) return false;
      if (params?.search && !(matchesSearch(e.patientName, params.search) || matchesSearch(e.diagnosis, params.search))) return false;
      return true;
    });
    if (params?.sortBy) {
      const dir = params.sortDir === "desc" ? -1 : 1;
      results = [...results].sort((a, b) => (a[params.sortBy!] > b[params.sortBy!] ? 1 : -1) * dir);
    }
    const total = results.length;
    const page = params?.page ?? 1;
    const limit = params?.limit ?? total;
    const start = (page - 1) * limit;
    const paged = results.slice(start, start + limit);
    return ok({ encounters: paged, total, page, limit });
  },

  getAdminEncounter: async (id: string) => {
    await delay();
    const encounter = adminEncounters.find((e) => e.id === id);
    if (!encounter) return fail("Encounter not found");
    return ok({ encounter });
  },

  updateAdminEncounter: async (id: string, update: Record<string, any>) => {
    await delay();
    const encounter = adminEncounters.find((e) => e.id === id);
    if (!encounter) return fail("Encounter not found");
    Object.assign(encounter, update);
    return ok({ encounter });
  },

  // Admin Insurance Requests
  getAdminInsuranceRequests: async (params?: { status?: string; search?: string }) => {
    await delay();
    const results = insuranceRequests.filter((r) => {
      if (params?.status && params.status !== "all" && r.status !== params.status) return false;
      if (params?.search && !(matchesSearch(r.patientName, params.search) || matchesSearch(r.policyNumber, params.search))) return false;
      return true;
    });
    return ok({ requests: results });
  },

  updateAdminInsuranceRequest: async (id: string, action: "approve" | "reject") => {
    await delay();
    const request = insuranceRequests.find((r) => r.id === id);
    if (!request) return fail("Request not found");
    request.status = action === "approve" ? "Approved" : "Rejected";
    return ok({ policy: request });
  },

  // Admin Product CRUD
  createAdminProduct: async (data: Record<string, any>) => {
    await delay();
    const product = {
      id: uid("prod"),
      sku: data.sku ?? uid("sku").toUpperCase(),
      status: "In Stock",
      reorderLevel: 20,
      supplier: "MedSupply PH",
      ...data,
    };
    adminInventory = [product, ...adminInventory];
    storeProducts = [product, ...storeProducts];
    return ok({ product });
  },

  updateAdminProduct: async (id: string, data: Record<string, any>) => {
    await delay();
    const product = adminInventory.find((p) => p.id === id);
    if (!product) return fail("Product not found");
    Object.assign(product, data);
    const catalog = storeProducts.find((p) => p.id === id);
    if (catalog) Object.assign(catalog, data);
    return ok({ product });
  },

  deleteAdminProduct: async (id: string) => {
    await delay();
    adminInventory = adminInventory.filter((p) => p.id !== id);
    storeProducts = storeProducts.filter((p) => p.id !== id);
    return ok({ ok: true });
  },

  // Admin Insurance Plan CRUD
  getAdminInsurancePlans: async () => {
    await delay();
    return ok({ plans: insurancePlans });
  },

  createAdminInsurancePlan: async (data: Record<string, any>) => {
    await delay();
    const plan = { id: uid("plan"), active: 1, createdAt: "Just now", benefits: [], ...data };
    insurancePlans = [plan, ...insurancePlans];
    return ok({ plan });
  },

  updateAdminInsurancePlan: async (id: string, data: Record<string, any>) => {
    await delay();
    const plan = insurancePlans.find((p) => p.id === id);
    if (!plan) return fail("Plan not found");
    Object.assign(plan, data);
    return ok({ plan });
  },

  deleteAdminInsurancePlan: async (id: string) => {
    await delay();
    insurancePlans = insurancePlans.filter((p) => p.id !== id);
    return ok({ ok: true });
  },

  // Admin Messaging
  getAdminMessagingPatients: async (search?: string) => {
    await delay();
    const scope = currentDoctorName();
    const results = adminPatients.filter(
      (p) => (!scope || p.assignedDoctor === scope) && (matchesSearch(p.name, search) || matchesSearch(p.email, search)),
    );
    return ok({ patients: results.map((p) => ({ id: p.id, name: p.name, email: p.email, phone: p.phone })) });
  },

  getAdminConversation: async (patientId: string) => {
    await delay();
    const patient = adminPatients.find((p) => p.id === patientId);
    const scope = currentDoctorName();
    if (scope && patient && patient.assignedDoctor !== scope) return fail("You are not authorized to view this conversation");
    return ok({ messages: adminMessagingThreads[patientId] ?? [], patient: patient ? { id: patient.id, name: patient.name, email: patient.email, phone: patient.phone } : { id: patientId, name: "Patient", email: "", phone: "" } });
  },

  sendAdminMessage: async (patientId: string, text: string, sendSms = false) => {
    await delay();
    const thread = adminMessagingThreads[patientId] ?? (adminMessagingThreads[patientId] = []);
    const patient = adminPatients.find((p) => p.id === patientId);
    const message = {
      id: uid("amsg"),
      sender: "admin",
      text,
      createdAt: "Just now",
      smsStatus: sendSms ? "sent" : null,
      smsTo: sendSms ? patient?.phone ?? null : null,
      smsFrom: sendSms ? "SugboDoc" : null,
      smsError: null,
    };
    thread.push(message);
    return ok({ message, sms: sendSms ? { sent: true, sid: uid("sms"), to: patient?.phone, from: "SugboDoc" } : undefined });
  },
};

export async function logoutCurrentSession() {
  const result = await apiClient.logout();
  clearAuthState("logout");
  return result;
}
