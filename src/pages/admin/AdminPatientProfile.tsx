import React, { useEffect, useState } from 'react';
import { useParams, useLocation } from '@/lib/router-compat';
import { usePortalBase } from '@/lib/portal-base';
import { toast } from 'sonner';
import { 
  ArrowLeft, 
  User, 
  Mail, 
  Phone, 
  Calendar,
  MapPin,
  FileText,
  Download,
  Eye,
  Activity,
  Clock,
  Stethoscope,
  Pill,
  FlaskConical,
  DollarSign,
  ShoppingBag,
  AlertCircle,
  TrendingUp,
  Droplet,
  Heart,
  Wind,
  Thermometer,
} from 'lucide-react';
import { apiClient } from '@/lib/api-client';
import StatusBadge from '@/components/portal/admin/StatusBadge';

type PatientProfile = {
  id: string;
  name: string;
  email: string;
  phone?: string;
  dob?: string;
  age?: number;
  sex?: string;
  bloodType?: string;
  allergies?: string[];
  address?: string;
  emergencyContact?: {
    name: string;
    relation: string;
    phone: string;
  };
  insurance?: Array<{
    provider: string;
    planName?: string;
    policyNumber: string;
    coverageLimit?: string;
    remainingCoverage?: string;
    status?: string;
    expirationDate?: string;
    id?: string;
  }>;
  assignedPhysician?: {
    name: string;
    specialty: string;
  };
  status: string;
  createdAt: string;
  documents?: Array<{
    id: string;
    encounterRef?: string | null;
    name: string;
    type: string | null;
    uploadedAt: string;
    fileType?: string;
    sourceKind?: string;
    metadata?: {
      fileSize?: string | number | null;
      date?: string | null;
    };
  }>;
  appointments?: Array<{
    id: string;
    date?: string;
    time?: string;
    doctor?: string;
    department?: string;
    status: string;
    clinic?: string;
    appointmentDate?: string;
    appointmentTime?: string;
    doctorName?: string;
    specialty?: string;
  }>;
  records?: Array<{
    id: string;
    kind: string;
    encounterRef?: string | null;
    data: Record<string, any>;
    createdAt: string;
  }>;
  queue?: {
    id: string;
    status: string;
    department: string;
    position?: number;
    estimatedWaitTime?: number;
  } | null;
  billing?: {
    totalOutstanding: number;
    paidBills?: number;
    insuranceCoverage?: number;
    recentBills: Array<{
      id: string;
      invoiceNo: string;
      amount: number;
      status: string;
      dueDate?: string;
    }>;
    recentPayments?: Array<{
      invoiceNo: string;
      amount: number;
      status: string;
      paidAt?: string | Date | null;
    }>;
  };
  medicalStore?: {
    recentOrders: Array<{
      id: string;
      orderNo: string;
      totalAmount: number;
      status: string;
      orderDate: string;
      paymentStatus?: string;
      fulfillmentType?: string;
      pickupBranch?: string | null;
      deliveryStatus?: string;
    }>;
  };
};

export default function AdminPatientProfile() {
  const params = useParams();
  const [, setLocation] = useLocation();
  const [patient, setPatient] = useState<PatientProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [documentPreview, setDocumentPreview] = useState<any | null>(null);
  const [updatingAppointment, setUpdatingAppointment] = useState<string | null>(null);
  const [selectedEncounterId, setSelectedEncounterId] = useState<string | null>(null);
  const [encounterScopedRecords, setEncounterScopedRecords] = useState<PatientProfile["records"] | null>(null);
  const [loadingEncounterRecords, setLoadingEncounterRecords] = useState(false);

  const patientId = params.id;

  useEffect(() => {
    if (!patientId) return;
    
    setIsLoading(true);
    apiClient.getAdminPatient?.(patientId)
      .then(({ data, error }) => {
        if (error) {
          toast.error(error);
        } else if (data) {
          const payload = data as any;
          const profile = payload.patient ?? payload;
           const insurance = Array.isArray(payload.insurance) ? payload.insurance : payload.insurance ? [payload.insurance] : [];
          const emergencyContact = profile.emergencyContactName ? {
            name: profile.emergencyContactName,
            relation: profile.emergencyContactRelation ?? 'Emergency contact',
            phone: profile.emergencyContactPhone ?? '—',
          } : undefined;
          const records = Array.isArray(payload.records) ? payload.records : [];

          setPatient({
            ...profile,
            emergencyContact,
             insurance: insurance.map((policy: any) => ({
               id: policy.id,
               provider: policy.provider,
               planName: policy.planName,
               policyNumber: policy.policyNumber,
               coverageLimit: policy.coverageLimit,
               remainingCoverage: policy.remainingCoverage,
               status: policy.status,
               expirationDate: policy.expirationDate,
             })),
            assignedPhysician: profile.assignedPhysician ? { name: profile.assignedPhysician.name, specialty: profile.assignedPhysician.department ?? profile.assignedPhysician.specialty ?? 'Clinical care' } : undefined,
            documents: payload.documents ?? [],
            records,
            appointments: payload.appointments ?? [],
            queue: payload.queue ?? null,
            billing: payload.billing ?? { totalOutstanding: 0, recentBills: [] },
            medicalStore: payload.medicalStore ?? { recentOrders: [] },
          } as PatientProfile);
           const latestEncounter = records
             .filter((record: any) => record.kind === 'encounter')
             .sort((left: any, right: any) => new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime())[0];
           setSelectedEncounterId(latestEncounter?.id ?? null);
           setEncounterScopedRecords(null);
        }
      })
      .finally(() => setIsLoading(false));
  }, [patientId]);

  useEffect(() => {
    if (!patientId || !selectedEncounterId) {
      setEncounterScopedRecords(null);
      setLoadingEncounterRecords(false);
      return;
    }
    let active = true;
    setLoadingEncounterRecords(true);
    setEncounterScopedRecords(null);
    apiClient.getAdminPatientEncounterRecords(patientId, selectedEncounterId).then(({ data, error }) => {
      if (!active) return;
      if (error || !data) {
        toast.error(error ?? "Could not load encounter records.");
        setEncounterScopedRecords(null);
        setLoadingEncounterRecords(false);
        return;
      }
      const encounter = data.encounter;
      setEncounterScopedRecords([
        {
          id: String(encounter.id),
          kind: "encounter",
          data: encounter,
          createdAt: String(encounter.createdAt ?? ""),
        },
        ...(data.records as NonNullable<PatientProfile["records"]>),
      ]);
      setLoadingEncounterRecords(false);
    });
    return () => {
      active = false;
    };
  }, [patientId, selectedEncounterId]);

  if (isLoading) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="h-12 bg-muted rounded" />
        <div className="h-48 bg-muted rounded-xl" />
        <div className="h-64 bg-muted rounded-xl" />
      </div>
    );
  }

  if (!patient) {
    return (
      <div className="py-16 text-center">
        <p className="text-muted-foreground">Patient not found</p>
        <button
          onClick={() => setLocation(`${portalBase}/patients`)}
          className="mt-4 text-primary hover:underline"
          data-testid="link-back-patients"
        >
          Back to patients
        </button>
      </div>
    );
  }

  const recordRows = patient.records ?? [];

  // All encounters regardless of selection — used for the encounter selector panel
  const allEncounters: Array<Record<string, any>> = recordRows
    .filter(r => r.kind === 'encounter')
    .map(r => ({ ...r.data, _id: r.id, _createdAt: r.createdAt }));

  // Encounter-specific cards only use the server response for the selected encounter.
  // Never fall back to the patient's complete record list while this request is pending.
  const filteredRecordRows = selectedEncounterId && encounterScopedRecords ? encounterScopedRecords : [];

  const recordsOf = (kind: string): Array<Record<string, any>> => filteredRecordRows
    .filter((record) => record.kind === kind)
    .map((record) => ({ ...record.data, _id: record.id, _createdAt: record.createdAt }));

  const vitals = recordsOf('vital');
  const prescriptions = recordsOf('prescription');
  const labs = recordsOf('lab');
  const imaging = recordsOf('imaging');
  const soapNotes = recordsOf('soap');
  const diagnoses = recordsOf('diagnosis');
  const procedures = recordsOf('procedure');

  const currentAppointment = patient.appointments?.filter(apt => ['Pending', 'Confirmed', 'Checked In', 'Waiting', 'In Progress'].includes(apt.status))[0];
  const selectedEncounter = allEncounters.find(encounter => encounter._id === selectedEncounterId);
  const visibleDocuments = (patient.documents ?? []).filter(document =>
    !document.encounterRef || document.encounterRef === selectedEncounterId,
  );

  const updateAppointment = async (id: string, status: string) => {
    setUpdatingAppointment(id);
    const result = await apiClient.updateAdminAppointmentStatus(id, status);
    setUpdatingAppointment(null);
    if (result.error || !result.data) {
      toast.error(result.error ?? 'Could not update appointment.');
      return;
    }
    setPatient(current => current ? {
      ...current,
      appointments: current.appointments?.map(appointment => appointment.id === id ? { ...appointment, status } : appointment),
    } : current);
    toast.success('Appointment status updated and patient notified.');
  };

  const previewDocument = async (document: any) => {
    const result = await apiClient.getAdminPatientDocument?.(patient.id, document.id);
    if (result.error) {
      toast.error(result.error);
      return;
    }
    setDocumentPreview(result.data);
  };

  const downloadDocument = (documentRecord: any) => {
    const content = JSON.stringify(documentPreview?.record?.data ?? documentRecord.metadata ?? documentRecord, null, 2);
    const blob = new Blob([content], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const anchor = window.document.createElement('a');
    anchor.href = url;
    anchor.download = `${String(documentRecord.name).replace(/[^a-z0-9]+/gi, '-').toLowerCase() || 'medical-document'}.json`;
    anchor.click();
    URL.revokeObjectURL(url);
  };

  const isAbnormal = (value: number | string | undefined, range: { min: number; max: number }) => {
    if (value === undefined || value === null || value === '—') return false;
    const num = typeof value === 'string' ? parseFloat(value) : value;
    if (isNaN(num)) return false;
    return num < range.min || num > range.max;
  };

  return (
    <div className="space-y-6 animate-in slide-up">
      {/* Header */}
      <div>
        <button
          onClick={() => setLocation(`${portalBase}/patients`)}
          className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-4"
          data-testid="button-back"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to patients
        </button>
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
          <div className="flex items-start gap-4">
            <div className="w-16 h-16 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-2xl font-bold shrink-0">
              {patient.name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()}
            </div>
            <div>
              <h1 className="text-2xl font-bold text-foreground">{patient.name}</h1>
              <p className="text-sm text-muted-foreground font-mono mt-1">ID: {patient.id}</p>
              <div className="flex items-center gap-2 mt-2">
                <StatusBadge status={patient.status} />
                <span className="text-xs text-muted-foreground">
                  Registered {new Date(patient.createdAt).toLocaleDateString()}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <Section title="Patient Information">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <InfoCard title="Patient Information" icon={<User className="w-4 h-4" />}>
            <InfoRow label="Patient ID" value={patient.id} />
            <InfoRow label="Full Name" value={patient.name} />
            <InfoRow label="Date of Birth" value={patient.dob ? new Date(patient.dob).toLocaleDateString() : '—'} />
            <InfoRow label="Age" value={patient.age ? `${patient.age} years` : '—'} />
            <InfoRow label="Sex" value={patient.sex || '—'} />
            <InfoRow label="Blood Type" value={patient.bloodType || '—'} />
            <InfoRow label="Civil Status" value="—" />
            <InfoRow label="Nationality" value="Filipino" />
            <InfoRow label="Registration Date" value={new Date(patient.createdAt).toLocaleDateString()} />
            <InfoRow label="Last Login" value="Not available" />
            <InfoRow label="Account Status" value={patient.status || 'Active'} />
          </InfoCard>
          <InfoCard title="Contact Information" icon={<Mail className="w-4 h-4" />}>
            <InfoRow label="Email" value={patient.email} />
            <InfoRow label="Phone" value={patient.phone || '—'} />
            <InfoRow label="Address" value={patient.address || '—'} />
          </InfoCard>
          <div className="space-y-6">
            {patient.emergencyContact && (
              <InfoCard title="Emergency Contact" icon={<Phone className="w-4 h-4" />}>
                <InfoRow label="Name" value={patient.emergencyContact.name} />
                <InfoRow label="Relation" value={patient.emergencyContact.relation} />
                <InfoRow label="Phone" value={patient.emergencyContact.phone} />
              </InfoCard>
            )}
            {patient.assignedPhysician && (
              <InfoCard title="Primary Care Physician" icon={<Stethoscope className="w-4 h-4" />}>
                <InfoRow label="Name" value={patient.assignedPhysician.name} />
                <InfoRow label="Specialty" value={patient.assignedPhysician.specialty} />
                <InfoRow label="Next Appointment" value={currentAppointment ? `${currentAppointment.date ?? currentAppointment.appointmentDate} · ${currentAppointment.time ?? currentAppointment.appointmentTime}` : 'None scheduled'} />
                <InfoRow label="Queue Status" value={patient.queue?.status || 'Not in queue'} />
              </InfoCard>
            )}
            {patient.allergies && patient.allergies.length > 0 && (
              <InfoCard title="Allergies" icon={<AlertCircle className="w-4 h-4" />}>
                <div className="flex flex-wrap gap-2">
                  {patient.allergies.map((allergy, index) => (
                    <span key={index} className="px-2 py-1 bg-red-50 text-red-700 border border-red-200 rounded text-xs font-medium">{allergy}</span>
                  ))}
                </div>
              </InfoCard>
            )}
          </div>
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-card border border-border rounded-xl p-5">
            <div className="flex items-center gap-2 mb-4"><Activity className="w-4 h-4 text-primary" /><h3 className="font-semibold text-foreground">Patient Summary</h3></div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <SummaryTile label="Encounters" value={allEncounters.length} onClick={() => setLocation(`/admin/encounters?patientId=${patient.id}`)} />
              <SummaryTile label="Appointments" value={patient.appointments?.length ?? 0} onClick={() => setLocation(`${portalBase}/appointments`)} />
              <SummaryTile label="Outstanding Bills" value={patient.billing?.recentBills.filter(bill => ['Pending', 'Failed'].includes(bill.status)).length ?? 0} onClick={() => setLocation(`${portalBase}/billing`)} />
              <SummaryTile label="Store Orders" value={patient.medicalStore?.recentOrders.length ?? 0} onClick={() => setLocation(`${portalBase}/orders`)} />
            </div>
          </div>
          <DocumentsCard documents={visibleDocuments} onPreview={previewDocument} onDownload={downloadDocument} />
        </div>
      </Section>

      <Section title="Clinical Records (Encounter Details)">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {allEncounters.length > 0 && (
            <div className="bg-card border border-border rounded-xl p-5">
              <div className="flex items-center justify-between gap-2 mb-3">
                <div className="flex items-center gap-2"><Stethoscope className="w-4 h-4 text-primary" /><h3 className="font-semibold text-foreground">Encounter History</h3><span className="text-xs text-muted-foreground">({allEncounters.length})</span></div>
              </div>
              <div className="space-y-1.5">
                {allEncounters.map(encounter => (
                  <button key={encounter._id} onClick={() => setSelectedEncounterId(encounter._id)} className={`w-full text-left px-3 py-2.5 rounded-lg text-sm transition-colors border ${selectedEncounterId === encounter._id ? 'bg-primary/10 border-primary/30 text-primary' : 'border-transparent hover:bg-muted'}`}>
                    <div className="font-medium">{encounter.date ?? new Date(encounter._createdAt).toLocaleDateString()}</div>
                    <div className="text-xs text-muted-foreground mt-0.5">{encounter.doctor ?? encounter.physician ?? 'Provider'} · {encounter.specialty ?? encounter.department ?? 'Clinical care'}</div>
                    {(encounter.chiefComplaint ?? encounter.complaint) && <div className="text-xs text-muted-foreground truncate">{encounter.chiefComplaint ?? encounter.complaint}</div>}
                  </button>
                ))}
              </div>
              <div className="mt-2 pt-2 border-t border-border text-xs text-muted-foreground flex items-center gap-1"><Activity className="w-3 h-3" />Showing records linked to the selected encounter only</div>
            </div>
          )}
          <InfoCard title="Encounter Details" icon={<Stethoscope className="w-4 h-4" />}>
            {selectedEncounter ? (
              <>
                <InfoRow label="Date" value={formatRecordDate(selectedEncounter)} />
                <InfoRow label="Provider" value={selectedEncounter.doctor ?? selectedEncounter.physician ?? '—'} />
                <InfoRow label="Department" value={selectedEncounter.department ?? selectedEncounter.specialty ?? '—'} />
                <InfoRow label="Clinic" value={selectedEncounter.clinic ?? '—'} />
                <InfoRow label="Chief Complaint" value={selectedEncounter.chiefComplaint ?? selectedEncounter.complaint ?? '—'} />
                <InfoRow label="Diagnosis" value={selectedEncounter.diagnosis ?? selectedEncounter.summary ?? '—'} />
                <InfoRow label="Status" value={selectedEncounter.status ?? 'Completed'} />
              </>
            ) : <EmptyState text="No encounter selected" />}
          </InfoCard>
          <div className="bg-card border border-border rounded-xl p-5">
            <div className="flex items-center gap-2 mb-4"><Activity className="w-4 h-4 text-primary" /><h3 className="font-semibold text-foreground">Encounter Summary</h3></div>
            <div className="grid grid-cols-2 gap-3">
              <SummaryTile label="SOAP Notes" value={soapNotes.length} />
              <SummaryTile label="Diagnoses" value={diagnoses.length} />
              <SummaryTile label="Vital Signs" value={vitals.length} />
              <SummaryTile label="Procedures" value={procedures.length} />
            </div>
            {loadingEncounterRecords && <div className="mt-4 text-xs text-muted-foreground">Loading selected encounter records…</div>}
          </div>
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <RecordListCard title="SOAP Notes" icon={<FileText className="w-4 h-4" />} records={soapNotes} emptyText="No SOAP notes for this encounter.">
            {record => <><InfoRow label="Date" value={formatRecordDate(record)} /><InfoRow label="Provider" value={record.doctor ?? record.physician ?? '—'} /><RecordText label="Subjective" value={record.subjective} /><RecordText label="Objective" value={record.objective} /><RecordText label="Assessment" value={record.assessment} /><RecordText label="Plan" value={record.plan} /></>}
          </RecordListCard>
          <RecordListCard title="Diagnoses" icon={<Activity className="w-4 h-4" />} records={diagnoses} emptyText="No diagnoses for this encounter.">
            {record => <><InfoRow label="Diagnosis" value={record.diagnosis ?? record.desc ?? '—'} /><InfoRow label="ICD Code" value={record.icdCode ?? record.code ?? '—'} /><InfoRow label="Date" value={formatRecordDate(record)} /><InfoRow label="Provider" value={record.diagnosingPhysician ?? record.physician ?? '—'} /><InfoRow label="Status" value={record.status ?? '—'} /></>}
          </RecordListCard>
          <RecordListCard title="Vital Signs" icon={<Heart className="w-4 h-4" />} records={vitals} emptyText="No vital signs for this encounter.">
            {record => <div className="space-y-2.5"><div className="text-xs text-muted-foreground">Recorded {formatRecordDate(record)}</div><VitalRow icon={<Activity className="w-3.5 h-3.5" />} label="Blood Pressure" value={record.bloodPressure ?? `${record.systolic ?? '—'}/${record.diastolic ?? '—'}`} abnormal={isAbnormal(record.systolic, { min: 90, max: 140 }) || isAbnormal(record.diastolic, { min: 60, max: 90 })} /><VitalRow icon={<Heart className="w-3.5 h-3.5" />} label="Heart Rate" value={`${record.heartRate ?? record.hr ?? '—'} bpm`} abnormal={isAbnormal(record.heartRate ?? record.hr, { min: 60, max: 100 })} /><VitalRow icon={<Wind className="w-3.5 h-3.5" />} label="Respiratory Rate" value={`${record.respiratoryRate ?? '—'} /min`} abnormal={isAbnormal(record.respiratoryRate, { min: 12, max: 20 })} /><VitalRow icon={<Thermometer className="w-3.5 h-3.5" />} label="Temperature" value={`${record.temperature ?? record.temp ?? '—'} °C`} abnormal={isAbnormal(record.temperature ?? record.temp, { min: 36.1, max: 37.2 })} /><VitalRow icon={<Droplet className="w-3.5 h-3.5" />} label="O₂ Saturation" value={`${record.oxygenSaturation ?? '—'}%`} abnormal={isAbnormal(record.oxygenSaturation, { min: 95, max: 100 })} /></div>}
          </RecordListCard>
          <RecordListCard title="Procedures" icon={<Activity className="w-4 h-4" />} records={procedures} emptyText="No procedures for this encounter.">
            {record => <><InfoRow label="Procedure" value={record.name ?? record.procedureName ?? record.type ?? record.description ?? '—'} /><InfoRow label="Date" value={formatRecordDate(record)} /><InfoRow label="Provider" value={record.doctor ?? record.physician ?? '—'} /><InfoRow label="Status" value={record.status ?? '—'} /></>}
          </RecordListCard>
        </div>
      </Section>

      <Section title="Medications">
        <RecordListCard title="Prescriptions" icon={<Pill className="w-4 h-4" />} records={prescriptions} emptyText="No prescriptions for this encounter.">
          {record => <><InfoRow label="Medication" value={record.medicationName ?? record.med ?? '—'} /><InfoRow label="Dosage" value={record.dosage ?? '—'} /><InfoRow label="Frequency" value={record.frequency ?? '—'} /><InfoRow label="Duration" value={record.duration ?? '—'} /><InfoRow label="Prescriber" value={record.prescribingDoctor ?? record.doctor ?? '—'} /><InfoRow label="Status" value={record.status ?? '—'} /></>}
        </RecordListCard>
      </Section>

      <Section title="Diagnostic Results">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <RecordListCard title="Laboratory Results" icon={<FlaskConical className="w-4 h-4" />} records={labs} emptyText="No laboratory results for this encounter.">
            {record => <><InfoRow label="Test" value={record.testName ?? record.test ?? '—'} /><InfoRow label="Result" value={record.resultSummary ?? record.value ?? '—'} /><InfoRow label="Reference Range" value={record.referenceRange ?? record.range ?? '—'} /><InfoRow label="Released" value={record.dateReleased ?? formatRecordDate(record)} /><InfoRow label="Status" value={record.status ?? record.resultStatus ?? '—'} /></>}
          </RecordListCard>
          <RecordListCard title="Imaging Results" icon={<Eye className="w-4 h-4" />} records={imaging} emptyText="No imaging results for this encounter.">
            {record => <><InfoRow label="Examination" value={record.examinationName ?? record.type ?? '—'} /><InfoRow label="Date" value={record.imagingDate ?? formatRecordDate(record)} /><InfoRow label="Radiologist" value={record.radiologist ?? '—'} /><RecordText label="Findings" value={record.findings} /><RecordText label="Impression" value={record.impression} /><InfoRow label="Status" value={record.status ?? '—'} /></>}
          </RecordListCard>
        </div>
      </Section>

      <Section title="Appointments">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <InfoCard title="Appointments" icon={<Calendar className="w-4 h-4" />}>
            {patient.appointments && patient.appointments.length > 0 ? patient.appointments.map(appointment => (
              <div key={appointment.id} className="border-t border-border pt-3 first:border-t-0 first:pt-0">
                <div className="flex items-start justify-between gap-3">
                  <div><div className="text-sm font-medium text-foreground">{appointment.date ?? appointment.appointmentDate} at {appointment.time ?? appointment.appointmentTime}</div><div className="text-xs text-muted-foreground mt-1">{appointment.doctor ?? appointment.doctorName} · {appointment.department ?? appointment.specialty}</div><div className="text-xs text-muted-foreground">{appointment.clinic ?? 'Clinic unavailable'}</div></div>
                  <StatusBadge status={appointment.status} />
                </div>
              </div>
            )) : <EmptyState text="No appointments found." />}
          </InfoCard>
          <div className="space-y-6">
            {currentAppointment && <InfoCard title="Current Appointment" icon={<Calendar className="w-4 h-4" />}>
              <InfoRow label="Date and Time" value={`${currentAppointment.date ?? currentAppointment.appointmentDate} at ${currentAppointment.time ?? currentAppointment.appointmentTime}`} />
              <InfoRow label="Provider" value={currentAppointment.doctor ?? currentAppointment.doctorName ?? '—'} />
              <InfoRow label="Clinic" value={currentAppointment.clinic ?? '—'} />
              <select disabled={updatingAppointment === currentAppointment.id} value={currentAppointment.status} onChange={event => updateAppointment(currentAppointment.id, event.target.value)} className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm font-medium">
                {['Pending', 'Confirmed', 'Checked In', 'Waiting', 'In Progress', 'Completed', 'Done', 'Cancelled', 'No Show', 'Rescheduled'].map(status => <option key={status}>{status}</option>)}
              </select>
            </InfoCard>}
            {patient.queue && <InfoCard title="Queue Status" icon={<Clock className="w-4 h-4" />}><InfoRow label="Department" value={patient.queue.department} /><InfoRow label="Status" value={patient.queue.status} />{patient.queue.position !== undefined && <InfoRow label="Position" value={`#${patient.queue.position}`} />}{patient.queue.estimatedWaitTime !== undefined && <InfoRow label="Est. Wait" value={`${patient.queue.estimatedWaitTime} min`} />}</InfoCard>}
          </div>
        </div>
      </Section>

      <Section title="Insurance">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {(patient.insurance ?? []).length > 0 ? (patient.insurance ?? []).map((policy, index) => (
            <InfoCard key={policy.id ?? `${policy.policyNumber}-${index}`} title="Insurance" icon={<FileText className="w-4 h-4" />}>
              <InfoRow label="Provider" value={policy.provider} /><InfoRow label="Plan" value={policy.planName || '—'} /><InfoRow label="Policy Number" value={policy.policyNumber} /><InfoRow label="Coverage Limit" value={policy.coverageLimit ? `₱${Number(policy.coverageLimit).toLocaleString('en-PH')}` : '—'} /><InfoRow label="Remaining Coverage" value={policy.remainingCoverage ? `₱${Number(policy.remainingCoverage).toLocaleString('en-PH')}` : '—'} /><InfoRow label="Coverage Status" value={policy.status || '—'} /><InfoRow label="Expiration" value={policy.expirationDate || '—'} />
            </InfoCard>
          )) : <InfoCard title="Insurance" icon={<FileText className="w-4 h-4" />}><EmptyState text="No insurance policies found." /></InfoCard>}
        </div>
      </Section>

      <Section title="Billing & Payments">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="bg-card border border-border rounded-xl p-5">
            <div className="flex items-center gap-2 mb-4"><DollarSign className="w-4 h-4 text-primary" /><h3 className="font-semibold text-foreground">Billing & Payments</h3></div>
            <div className="mb-4"><div className="text-xs text-muted-foreground">Total Outstanding</div><div className="text-2xl font-bold text-foreground">₱{(patient.billing?.totalOutstanding ?? 0).toLocaleString('en-PH', { minimumFractionDigits: 2 })}</div><div className="grid grid-cols-2 gap-2 text-xs mt-2"><div className="rounded-lg bg-muted/40 p-2"><span className="block text-muted-foreground">Paid bills</span><strong>{patient.billing?.paidBills ?? 0}</strong></div><div className="rounded-lg bg-muted/40 p-2"><span className="block text-muted-foreground">Insurance coverage</span><strong>₱{(patient.billing?.insuranceCoverage ?? 0).toLocaleString('en-PH')}</strong></div></div></div>
            {patient.billing?.recentBills && patient.billing.recentBills.length > 0 ? <div className="space-y-2"><div className="text-xs font-medium text-muted-foreground mb-2">Recent Bills</div>{patient.billing.recentBills.slice(0, 5).map(bill => <div key={bill.id} className="flex items-center justify-between text-sm border-t border-border pt-2"><div><div className="font-medium text-foreground">{bill.invoiceNo}</div><div className="text-xs text-muted-foreground">{bill.dueDate ? `Due ${new Date(bill.dueDate).toLocaleDateString()}` : 'No due date'}</div></div><div className="text-right"><div className="font-semibold">₱{bill.amount.toLocaleString('en-PH', { minimumFractionDigits: 2 })}</div><StatusBadge status={bill.status} /></div></div>)}<button onClick={() => setLocation(`${portalBase}/billing`)} className="w-full mt-2 text-xs text-primary hover:underline">View all billing</button></div> : <EmptyState text="No recent bills." />}
          </div>
          <InfoCard title="Payment History" icon={<DollarSign className="w-4 h-4" />}>{patient.billing?.recentPayments && patient.billing.recentPayments.length > 0 ? patient.billing.recentPayments.map(payment => <div key={`${payment.invoiceNo}-${payment.paidAt}`} className="flex items-center justify-between border-t border-border pt-3 first:border-t-0 first:pt-0"><div><div className="text-sm font-medium">{payment.invoiceNo}</div><div className="text-xs text-muted-foreground">{payment.paidAt ? new Date(payment.paidAt).toLocaleDateString() : 'Date unavailable'}</div></div><div className="text-right"><div className="font-semibold">₱{payment.amount.toLocaleString('en-PH', { minimumFractionDigits: 2 })}</div><StatusBadge status={payment.status} /></div></div>) : <EmptyState text="No payment history found." />}</InfoCard>
          <InfoCard title="Medical Store Orders" icon={<ShoppingBag className="w-4 h-4" />}>{patient.medicalStore?.recentOrders && patient.medicalStore.recentOrders.length > 0 ? <div className="space-y-2">{patient.medicalStore.recentOrders.slice(0, 5).map(order => <div key={order.id} className="flex items-center justify-between text-sm border-t border-border pt-2 first:border-t-0 first:pt-0"><div><div className="font-medium text-foreground">{order.orderNo}</div><div className="text-xs text-muted-foreground">{new Date(order.orderDate).toLocaleDateString()}</div></div><div className="text-right"><div className="font-semibold">₱{order.totalAmount.toLocaleString('en-PH', { minimumFractionDigits: 2 })}</div><StatusBadge status={order.status} /><p className="mt-1 text-[11px] text-muted-foreground">{order.paymentStatus || 'Payment pending'} · {order.fulfillmentType === 'pickup' ? 'Pickup' : 'Delivery'}</p></div></div>)}<button onClick={() => setLocation(`${portalBase}/orders`)} className="w-full mt-2 text-xs text-primary hover:underline">View all orders</button></div> : <EmptyState text="No recent orders." />}</InfoCard>
        </div>
      </Section>

      {documentPreview && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" role="dialog" aria-modal="true" aria-label="Document preview">
          <div className="max-h-[85vh] w-full max-w-2xl overflow-auto rounded-2xl border bg-card p-6 shadow-xl">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="text-lg font-bold">{documentPreview.document?.name ?? 'Document preview'}</h2>
                <p className="mt-1 text-xs text-muted-foreground">{documentPreview.document?.type ?? 'Medical document'} · Uploaded {documentPreview.document?.uploadedAt ? new Date(documentPreview.document.uploadedAt).toLocaleDateString() : 'date unavailable'}</p>
              </div>
              <button onClick={() => setDocumentPreview(null)} className="text-sm text-muted-foreground hover:text-foreground">Close</button>
            </div>
            <pre className="mt-5 whitespace-pre-wrap rounded-xl bg-muted p-4 text-xs leading-5">{JSON.stringify(documentPreview.record?.data ?? documentPreview.document?.metadata ?? {}, null, 2)}</pre>
            <div className="mt-5 flex justify-end">
              <button onClick={() => downloadDocument(documentPreview.document)} className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground"><Download className="h-4 w-4" /> Download record</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function InfoCard({ title, icon, children }: { title: string; icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="bg-card border border-border rounded-xl p-5">
      <div className="flex items-center gap-2 mb-4">
        <div className="text-primary">{icon}</div>
        <h3 className="font-semibold text-foreground">{title}</h3>
      </div>
      <div className="space-y-3">
        {children}
      </div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="space-y-5">
      <div className="flex items-center gap-4">
        <h2 className="text-sm font-bold uppercase tracking-[0.12em] text-foreground whitespace-nowrap">{title}</h2>
        <div className="h-px flex-1 bg-border" />
      </div>
      <div className="space-y-6">{children}</div>
    </section>
  );
}

function EmptyState({ text }: { text: string }) {
  return <div className="rounded-lg border border-dashed border-border bg-muted/20 p-4 text-sm text-muted-foreground">{text}</div>;
}

function formatRecordDate(record: Record<string, any>) {
  const value = record.date ?? record.encounterDate ?? record.prescriptionDate ?? record.dateRequested ?? record.imagingDate ?? record.dateDiagnosed ?? record._createdAt;
  if (!value) return '—';
  const parsed = new Date(String(value));
  return Number.isNaN(parsed.getTime()) ? String(value) : parsed.toLocaleDateString();
}

function RecordText({ label, value }: { label: string; value?: unknown }) {
  if (!value) return null;
  return (
    <div className="flex flex-col gap-1">
      <span className="text-xs text-muted-foreground uppercase tracking-wide">{label}</span>
      <p className="text-sm leading-5 text-foreground whitespace-pre-wrap">{String(value)}</p>
    </div>
  );
}

function RecordListCard({
  title,
  icon,
  records,
  emptyText,
  children,
}: {
  title: string;
  icon: React.ReactNode;
  records: Array<Record<string, any>>;
  emptyText: string;
  children: (record: Record<string, any>) => React.ReactNode;
}) {
  return (
    <InfoCard title={title} icon={icon}>
      {records.length > 0 ? (
        records.map((record, index) => (
          <div key={String(record._id ?? record.id ?? `${title}-${index}`)} className="space-y-3 border-t border-border pt-4 first:border-t-0 first:pt-0">
            {children(record)}
          </div>
        ))
      ) : (
        <EmptyState text={emptyText} />
      )}
    </InfoCard>
  );
}

function DocumentsCard({
  documents,
  onPreview,
  onDownload,
}: {
  documents: NonNullable<PatientProfile['documents']>;
  onPreview: (document: any) => void;
  onDownload: (document: any) => void;
}) {
  return (
    <InfoCard title="Documents" icon={<FileText className="w-4 h-4" />}>
      {documents.length > 0 ? (
        <div className="space-y-2">
          {documents.slice(0, 5).map(document => (
            <div key={document.id} className="flex items-center justify-between text-sm border-t border-border pt-2 first:border-t-0 first:pt-0" data-testid={`document-${document.id}`}>
              <div className="flex-1 min-w-0">
                <div className="font-medium text-foreground truncate">{document.name}</div>
                <div className="text-xs text-muted-foreground">{new Date(document.uploadedAt).toLocaleDateString()}</div>
              </div>
              <div className="flex items-center gap-2 ml-2">
                <button onClick={() => onPreview(document)} className="text-xs text-primary hover:underline" aria-label={`Preview ${document.name}`}>
                  <Eye className="h-3.5 w-3.5" />
                </button>
                <button onClick={() => onDownload(document)} className="text-xs text-primary hover:underline" aria-label={`Download ${document.name}`}>
                  <Download className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          ))}
          {documents.length > 5 && <div className="text-xs text-muted-foreground pt-2">+ {documents.length - 5} more documents</div>}
        </div>
      ) : (
        <EmptyState text="No documents uploaded." />
      )}
    </InfoCard>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col sm:grid sm:grid-cols-3 gap-1">
      <span className="text-xs text-muted-foreground uppercase tracking-wide">{label}</span>
      <span className="text-sm text-foreground sm:col-span-2 font-medium">{value}</span>
    </div>
  );
}

function SummaryTile({ label, value, onClick }: { label: string; value: number; onClick?: () => void }) {
  const content = (
    <>
      <div className="text-2xl font-bold text-foreground">{value}</div>
      <div className="text-xs text-muted-foreground">{label}</div>
    </>
  );
  if (!onClick) {
    return <div className="flex flex-col items-start rounded-lg border border-border bg-card p-3">{content}</div>;
  }
  return (
    <button onClick={onClick} className="flex flex-col items-start rounded-lg border border-border p-3 text-left transition-colors hover:border-primary hover:bg-accent/50">
      {content}
    </button>
  );
}

function VitalRow({ icon, label, value, abnormal }: { icon: React.ReactNode; label: string; value: string; abnormal?: boolean }) {
  return (
    <div className={`flex items-center justify-between p-2 rounded-lg ${abnormal ? 'bg-red-50 border border-red-200' : 'bg-muted/30'}`}>
      <div className="flex items-center gap-2">
        <div className={abnormal ? 'text-red-600' : 'text-muted-foreground'}>{icon}</div>
        <span className="text-xs font-medium text-foreground">{label}</span>
      </div>
      <span className={`text-sm font-semibold ${abnormal ? 'text-red-700' : 'text-foreground'}`}>{value}</span>
    </div>
  );
}
