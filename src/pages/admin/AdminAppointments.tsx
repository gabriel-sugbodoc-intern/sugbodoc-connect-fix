import React, { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { Calendar, Filter, ChevronDown } from 'lucide-react';
import { apiClient } from '@/lib/api-client';
import SearchFilter from '@/components/portal/admin/SearchFilter';
import StatusBadge from '@/components/portal/admin/StatusBadge';

type Appointment = {
  id: string;
  patientName: string;
  patientId: string;
  doctorName: string;
  department: string;
  date: string;
  time: string;
  status: string;
  notes?: string;
};

export default function AdminAppointments() {
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [departmentFilter, setDepartmentFilter] = useState('all');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  useEffect(() => {
    setIsLoading(true);
    apiClient.getAdminAppointments?.({ 
      search: searchQuery, 
      status: statusFilter !== 'all' ? statusFilter : undefined,
      department: departmentFilter !== 'all' ? departmentFilter : undefined,
    })
      .then(({ data, error }) => {
        if (error) {
          toast.error(error);
        } else if (data) {
          setAppointments((data as any).appointments || []);
        }
      })
      .finally(() => setIsLoading(false));
  }, [searchQuery, statusFilter, departmentFilter]);

  const filteredAppointments = appointments.filter(apt => {
    const matchesSearch = !searchQuery || 
      apt.patientName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      apt.doctorName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      apt.patientId.toLowerCase().includes(searchQuery.toLowerCase());
    
    return matchesSearch;
  });

  const departments = Array.from(new Set(appointments.map(a => a.department)));
  const updateStatus = async (appointment: Appointment, status: string) => {
    setUpdatingId(appointment.id);
    const result = await apiClient.updateAdminAppointmentStatus(appointment.id, status);
    setUpdatingId(null);
    if (result.error || !result.data) {
      toast.error(result.error ?? 'Could not update appointment.');
      return;
    }
    setAppointments(current => current.map(item => item.id === appointment.id ? { ...item, status } : item));
    toast.success('Appointment status updated');
  };

  return (
    <div className="space-y-6 animate-in slide-up">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
          <Calendar className="w-6 h-6 text-primary" />
          Appointments
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          {filteredAppointments.length} appointment{filteredAppointments.length !== 1 ? 's' : ''} found
        </p>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <SearchFilter
          value={searchQuery}
          onChange={setSearchQuery}
          placeholder="Search by patient, doctor, or ID..."
          className="flex-1"
        />
        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-muted-foreground shrink-0" />
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-2 border border-input rounded-lg bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            data-testid="select-status-filter"
          >
            <option value="all">All Status</option>
            <option value="confirmed">Confirmed</option>
            <option value="pending">Pending</option>
            <option value="completed">Completed</option>
            <option value="cancelled">Cancelled</option>
          </select>
          <select
            value={departmentFilter}
            onChange={(e) => setDepartmentFilter(e.target.value)}
            className="px-3 py-2 border border-input rounded-lg bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            data-testid="select-department-filter"
          >
            <option value="all">All Departments</option>
            {departments.map(dept => (
              <option key={dept} value={dept}>{dept}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Table */}
      {isLoading ? (
        <div className="bg-card border border-border rounded-xl p-8 text-center">
          <div className="animate-pulse space-y-3">
            <div className="h-12 bg-muted rounded" />
            <div className="h-12 bg-muted rounded" />
            <div className="h-12 bg-muted rounded" />
          </div>
        </div>
      ) : filteredAppointments.length === 0 ? (
        <div className="bg-card border border-border rounded-xl p-12 text-center">
          <Calendar className="w-12 h-12 text-muted-foreground mx-auto mb-4 opacity-50" />
          <p className="font-medium text-foreground">No appointments found</p>
          <p className="text-sm text-muted-foreground mt-1">
            Try adjusting your search or filter criteria
          </p>
        </div>
      ) : (
        <div className="bg-card border border-border rounded-xl overflow-hidden">
          {/* Desktop Table */}
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/50 text-muted-foreground text-xs uppercase">
                <tr>
                  <th className="px-5 py-3 text-left font-medium">Date & Time</th>
                  <th className="px-5 py-3 text-left font-medium">Patient</th>
                  <th className="px-5 py-3 text-left font-medium">Doctor</th>
                  <th className="px-5 py-3 text-left font-medium">Department</th>
                  <th className="px-5 py-3 text-left font-medium">Status</th>
                  <th className="px-5 py-3 text-left font-medium">Notes</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filteredAppointments.map(apt => (
                  <tr
                    key={apt.id}
                    className="hover:bg-muted/30 transition-colors"
                    data-testid={`appointment-row-${apt.id}`}
                  >
                    <td className="px-5 py-3 font-medium text-foreground whitespace-nowrap">
                      <div>{apt.date}</div>
                      <div className="text-xs text-muted-foreground mt-0.5">{apt.time}</div>
                    </td>
                    <td className="px-5 py-3">
                      <div className="font-medium text-foreground">{apt.patientName}</div>
                      <div className="text-xs text-muted-foreground font-mono mt-0.5">
                        {apt.patientId.slice(0, 8)}
                      </div>
                    </td>
                    <td className="px-5 py-3 text-foreground">{apt.doctorName}</td>
                    <td className="px-5 py-3 text-muted-foreground">{apt.department}</td>
                    <td className="px-5 py-3">
                      <select disabled={updatingId === apt.id} value={apt.status} onChange={event => updateStatus(apt, event.target.value)} className="rounded-lg border border-input bg-background px-2 py-1 text-xs font-medium">
                        {['Pending', 'Confirmed', 'Checked In', 'Waiting', 'In Progress', 'Completed', 'Cancelled', 'No Show', 'Rescheduled'].map(status => <option key={`desktop-${apt.id}-${status}`} value={status}>{status}</option>)}
                      </select>
                    </td>
                    <td className="px-5 py-3 text-xs text-muted-foreground max-w-xs truncate">
                      {apt.notes || '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile List */}
          <div className="md:hidden divide-y divide-border">
            {filteredAppointments.map(apt => (
              <div key={apt.id} className="px-4 py-4" data-testid={`appointment-card-${apt.id}`}>
                <div className="flex items-start justify-between gap-3 mb-3">
                  <div>
                    <p className="font-semibold text-foreground">{apt.patientName}</p>
                    <p className="text-xs text-muted-foreground mt-1">{apt.doctorName}</p>
                  </div>
                   <select disabled={updatingId === apt.id} value={apt.status} onChange={event => updateStatus(apt, event.target.value)} className="rounded-lg border border-input bg-background px-2 py-1 text-xs font-medium">
                     {['Pending', 'Confirmed', 'Checked In', 'Waiting', 'In Progress', 'Completed', 'Cancelled', 'No Show', 'Rescheduled'].map(status => <option key={`mobile-${apt.id}-${status}`} value={status}>{status}</option>)}
                   </select>
                </div>
                <div className="text-xs text-muted-foreground space-y-1">
                  <div className="flex items-center gap-2">
                    <Calendar className="w-3 h-3" />
                    <span>{apt.date} at {apt.time}</span>
                  </div>
                  <div>{apt.department}</div>
                </div>
                {apt.notes && (
                  <button
                    onClick={() => setExpandedId(expandedId === apt.id ? null : apt.id)}
                    className="mt-3 flex items-center gap-1 text-xs text-primary font-medium"
                  >
                    <span>Notes</span>
                    <ChevronDown className={`w-3 h-3 transition-transform ${expandedId === apt.id ? 'rotate-180' : ''}`} />
                  </button>
                )}
                {expandedId === apt.id && apt.notes && (
                  <p className="mt-2 text-xs text-foreground bg-muted/50 p-3 rounded-lg">
                    {apt.notes}
                  </p>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
