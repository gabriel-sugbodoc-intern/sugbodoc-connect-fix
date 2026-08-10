import React, { useEffect, useState } from 'react';
import { CreditCard, RefreshCw, Search } from 'lucide-react';
import { toast } from 'sonner';
import { apiClient } from '@/lib/api-client';
import StatusBadge from '@/components/portal/admin/StatusBadge';

type Bill = {
  id: string;
  invoiceNo: string;
  patientName: string;
  description: string;
  category: string;
  amount: string;
  status: string;
  paymentMethod?: string | null;
  createdAt: string;
  paidAt?: string | null;
};

export default function AdminBilling() {
  const [bills, setBills] = useState<Bill[]>([]);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('all');
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    const result = await apiClient.getAdminBilling({ search, status: status === 'all' ? undefined : status });
    if (result.error) toast.error(result.error);
    else if (result.data) setBills(result.data.bills as Bill[]);
    setLoading(false);
  };

  useEffect(() => {
    load();
    const interval = window.setInterval(load, 15000);
    return () => window.clearInterval(interval);
  }, [search, status]);

  return (
    <div className="space-y-6 animate-in slide-up">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold"><CreditCard className="h-6 w-6 text-primary" />Billing & Payments</h1>
          <p className="mt-1 text-sm text-muted-foreground">Patient bills, store purchases, and payment reconciliation</p>
        </div>
        <button onClick={load} disabled={loading} className="inline-flex items-center gap-2 self-start rounded-lg bg-primary px-3 py-2 text-sm font-semibold text-primary-foreground disabled:opacity-60"><RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />Refresh</button>
      </div>
      <div className="flex flex-col gap-3 sm:flex-row">
        <label className="relative flex-1"><Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" /><input value={search} onChange={event => setSearch(event.target.value)} placeholder="Search invoice, patient, or service..." className="min-h-10 w-full rounded-lg border border-input bg-background pl-10 pr-3 text-sm outline-none focus:ring-2 focus:ring-primary" /></label>
        <select value={status} onChange={event => setStatus(event.target.value)} className="min-h-10 rounded-lg border border-input bg-background px-3 text-sm"><option value="all">All statuses</option><option value="Pending">Outstanding</option><option value="Paid">Paid</option><option value="Failed">Failed</option><option value="Refunded">Refunded</option></select>
      </div>
      <div className="overflow-hidden rounded-xl border border-border bg-card">
        {loading && !bills.length ? <div className="p-10 text-center text-sm text-muted-foreground">Loading billing records...</div> : !bills.length ? <div className="p-10 text-center text-sm text-muted-foreground">No billing records found.</div> : <div className="overflow-x-auto"><table className="w-full text-sm"><thead className="bg-muted/50 text-left text-xs uppercase text-muted-foreground"><tr><th className="px-5 py-3">Invoice</th><th className="px-5 py-3">Patient</th><th className="px-5 py-3">Description</th><th className="px-5 py-3">Category</th><th className="px-5 py-3">Amount</th><th className="px-5 py-3">Status</th><th className="px-5 py-3">Payment</th></tr></thead><tbody className="divide-y divide-border">{bills.map(bill => <tr key={bill.id} className="hover:bg-muted/30"><td className="px-5 py-4"><p className="font-mono font-semibold">{bill.invoiceNo}</p><p className="text-xs text-muted-foreground">{new Date(bill.createdAt).toLocaleDateString('en-PH')}</p></td><td className="px-5 py-4 font-medium">{bill.patientName}</td><td className="px-5 py-4 max-w-xs truncate">{bill.description}</td><td className="px-5 py-4 text-muted-foreground">{bill.category}</td><td className="px-5 py-4 font-semibold">₱{Number(bill.amount).toLocaleString()}</td><td className="px-5 py-4"><StatusBadge status={bill.status} /></td><td className="px-5 py-4 text-muted-foreground">{bill.paymentMethod ?? '—'}</td></tr>)}</tbody></table></div>}
      </div>
    </div>
  );
}