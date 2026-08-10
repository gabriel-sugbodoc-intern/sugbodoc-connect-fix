import React, { useState, useMemo } from "react";
import {
  Shield, Star, Users, Phone, Mail, Globe, Check, X, ChevronDown,
  AlertCircle, Download, Clock, CreditCard, FileText, ArrowRight,
  TrendingUp, Heart, Activity, Stethoscope, Building2, Calendar,
  Search, Filter, Sparkles, CheckCircle2, XCircle, MinusCircle,
} from "lucide-react";

export type InsurancePlan = {
  id: string;
  code: string;
  name: string;
  provider: string;
  providerDescription: string;
  providerHotline: string;
  providerWebsite: string;
  providerEmail: string;
  providerRating: number;
  providerMembers: number;
  monthlyPremium: string;
  annualPremium: string;
  coverageLimit: string;
  coveragePercentage: number;
  validityMonths: number;
  benefits: string[];
  eligibility: string[];
  waitingPeriod: string;
  exclusions: string[];
  includedServices: string[];
  maximumClaims: number;
  renewalPolicy: string;
  termsAndConditions: string;
  faqs: Array<{ question: string; answer: string }>;
  logoUrl?: string;
  cardImageUrl?: string;
  description: string;
  active: boolean;
};

export type InsurancePolicy = {
  id: string;
  planId: string;
  planName: string;
  provider: string;
  policyNumber: string;
  insuranceId: string;
  status: "active" | "expired" | "pending" | "cancelled";
  expirationDate: string;
  renewalDate: string;
  coverageLimit: string;
  remainingCoverage: string;
  paymentStatus: "paid" | "pending" | "overdue" | "failed" | "cancelled" | "refunded";
  premiumAmount: string;
  billId?: string;
  purchasedAt: string;
};

type InsuranceSectionProps = {
  plans: InsurancePlan[];
  policies: InsurancePolicy[];
  loading: boolean;
  onPurchase: (plan: InsurancePlan) => void;
  onRenew: (policy: InsurancePolicy) => void;
  onDownload: (policy: InsurancePolicy) => void;
  onOpenBilling: () => void;
  purchaseBusyPolicyId?: string;
};

const money = (value: number | string) =>
  `₱${Number(value).toLocaleString("en-PH", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const policyStatusStyles: Record<InsurancePolicy["status"], string> = {
  active: "bg-emerald-500/10 text-emerald-700 border-emerald-500/20",
  expired: "bg-red-500/10 text-red-700 border-red-500/20",
  pending: "bg-amber-500/10 text-amber-700 border-amber-500/20",
  cancelled: "bg-gray-500/10 text-gray-700 border-gray-500/20",
};

const paymentStatusStyles: Record<InsurancePolicy["paymentStatus"], string> = {
  paid: "bg-emerald-500/10 text-emerald-700 border-emerald-500/20",
  pending: "bg-amber-500/10 text-amber-700 border-amber-500/20",
  overdue: "bg-red-500/10 text-red-700 border-red-500/20",
  failed: "bg-red-500/10 text-red-700 border-red-500/20",
  cancelled: "bg-gray-500/10 text-gray-700 border-gray-500/20",
  refunded: "bg-blue-500/10 text-blue-700 border-blue-500/20",
};

function StatusBadge({ status, type }: { status: string; type: "policy" | "payment" }) {
  const styles = type === "policy" ? policyStatusStyles : paymentStatusStyles;
  const Icon = status === "active" || status === "paid" ? CheckCircle2 : status === "pending" ? Clock : XCircle;
  
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-semibold capitalize ${styles[status as keyof typeof styles] ?? "bg-muted text-muted-foreground border-border"}`}>
      <Icon className="h-3.5 w-3.5" />
      {status}
    </span>
  );
}

function PlanCard({ plan, onSelect, onCompare, isComparing }: {
  plan: InsurancePlan;
  onSelect: () => void;
  onCompare: () => void;
  isComparing: boolean;
}) {
  const [expanded, setExpanded] = useState(false);

  return (
    <article className="group relative overflow-hidden rounded-2xl border border-border bg-card shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md">
      {isComparing && (
        <div className="absolute right-3 top-3 z-10">
          <button
            onClick={(e) => { e.stopPropagation(); onCompare(); }}
            className="rounded-lg bg-primary/10 p-2 text-primary ring-2 ring-primary"
            aria-label="Remove from comparison"
          >
            <Check className="h-4 w-4" />
          </button>
        </div>
      )}

      <div className="relative aspect-[16/7] overflow-hidden bg-gradient-to-br from-primary/[0.08] via-accent/60 to-primary/5">
        {plan.cardImageUrl ? (
          <img src={plan.cardImageUrl} alt="" className="h-full w-full object-cover" />
        ) : (
          <div className="flex h-full items-center justify-center">
            <Shield className="h-16 w-16 text-primary/20" />
          </div>
        )}
        <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/60 to-transparent p-4">
          {plan.logoUrl && <img src={plan.logoUrl} alt={plan.provider} className="h-8 object-contain" />}
        </div>
      </div>

      <div className="space-y-4 p-5">
        <div>
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0 flex-1">
              <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-primary">
                {plan.provider}
              </p>
              <h3 className="mt-1 font-semibold leading-5 text-foreground">{plan.name}</h3>
            </div>
            <div className="flex items-center gap-1 text-xs text-amber-600">
              <Star className="h-3.5 w-3.5 fill-current" />
              {Number(plan.providerRating ?? 0).toFixed(1)}
            </div>
          </div>
          <p className="mt-2 line-clamp-2 text-xs leading-5 text-muted-foreground">{plan.description}</p>
        </div>

        <div className="flex items-center gap-3 text-xs text-muted-foreground">
          <span className="inline-flex items-center gap-1">
            <Users className="h-3.5 w-3.5" />
            {Number(plan.providerMembers ?? 0).toLocaleString()}
          </span>
          <span className="inline-flex items-center gap-1">
            <TrendingUp className="h-3.5 w-3.5" />
            {plan.coveragePercentage}% coverage
          </span>
        </div>

        <div className="space-y-1.5 rounded-xl bg-accent/50 p-3">
          <div className="flex items-baseline justify-between">
            <span className="text-xs text-muted-foreground">Monthly</span>
            <span className="text-lg font-bold text-primary">{money(plan.monthlyPremium)}</span>
          </div>
          <div className="flex items-baseline justify-between border-t border-border pt-1.5">
            <span className="text-xs text-muted-foreground">Annual</span>
            <span className="text-sm font-semibold">{money(plan.annualPremium)}</span>
          </div>
          <p className="text-[10px] text-muted-foreground">
            Coverage up to {money(plan.coverageLimit)}
          </p>
        </div>

        <div className="flex gap-2">
          <button
            onClick={onSelect}
            className="flex-1 rounded-xl bg-primary px-3 py-2.5 text-sm font-semibold text-primary-foreground transition hover:bg-primary/90"
          >
            View details
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); onCompare(); }}
            className={`rounded-xl border px-3 py-2.5 text-sm font-semibold transition ${
              isComparing
                ? "border-primary bg-primary/10 text-primary"
                : "border-border text-muted-foreground hover:border-primary hover:text-primary"
            }`}
            aria-label="Compare plan"
          >
            <Filter className="h-4 w-4" />
          </button>
        </div>

        {expanded && (
          <div className="space-y-3 border-t border-border pt-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-primary">Key benefits</p>
              <ul className="mt-2 space-y-1">
                {plan.benefits.slice(0, 3).map((benefit, i) => (
                  <li key={i} className="flex items-start gap-2 text-xs text-muted-foreground">
                    <Check className="mt-0.5 h-3 w-3 shrink-0 text-emerald-600" />
                    <span>{benefit}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        )}
      </div>
    </article>
  );
}

function PlanDetailModal({ plan, onClose, onPurchase }: {
  plan: InsurancePlan;
  onClose: () => void;
  onPurchase: () => void;
}) {
  const [activeTab, setActiveTab] = useState<"overview" | "benefits" | "terms">("overview");

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/40 p-4">
      <div
        className="my-8 w-full max-w-3xl rounded-2xl border border-border bg-card shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="sticky top-0 z-10 rounded-t-2xl border-b border-border bg-card/95 p-5 backdrop-blur">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-start gap-4">
              {plan.logoUrl && (
                <img src={plan.logoUrl} alt={plan.provider} className="h-12 w-auto object-contain" />
              )}
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-primary">{plan.provider}</p>
                <h2 className="mt-1 text-xl font-bold">{plan.name}</h2>
                <div className="mt-2 flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                  <span className="inline-flex items-center gap-1">
                    <Star className="h-3.5 w-3.5 fill-current text-amber-600" />
                    {Number(plan.providerRating ?? 0).toFixed(1)} rating
                  </span>
                  <span className="inline-flex items-center gap-1">
                    <Users className="h-3.5 w-3.5" />
                    {Number(plan.providerMembers ?? 0).toLocaleString()} members
                  </span>
                </div>
              </div>
            </div>
            <button
              onClick={onClose}
              className="rounded-lg p-2 hover:bg-muted"
              aria-label="Close"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        <div className="border-b border-border bg-muted/30 px-5">
          <div className="flex gap-1">
            {(["overview", "benefits", "terms"] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`rounded-t-lg px-4 py-3 text-sm font-semibold capitalize transition ${
                  activeTab === tab
                    ? "bg-card text-primary"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {tab}
              </button>
            ))}
          </div>
        </div>

        <div className="max-h-[60vh] overflow-y-auto p-6">
          {activeTab === "overview" && (
            <div className="space-y-6">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="rounded-xl border border-border bg-accent/30 p-4">
                  <p className="text-xs font-semibold uppercase tracking-wider text-primary">Monthly premium</p>
                  <p className="mt-1 text-2xl font-bold">{money(plan.monthlyPremium)}</p>
                  <p className="mt-1 text-xs text-muted-foreground">Billed monthly</p>
                </div>
                <div className="rounded-xl border border-border bg-accent/30 p-4">
                  <p className="text-xs font-semibold uppercase tracking-wider text-primary">Annual premium</p>
                  <p className="mt-1 text-2xl font-bold">{money(plan.annualPremium)}</p>
                  <p className="mt-1 text-xs text-muted-foreground">Save with annual billing</p>
                </div>
                <div className="rounded-xl border border-border bg-accent/30 p-4">
                  <p className="text-xs font-semibold uppercase tracking-wider text-primary">Coverage limit</p>
                  <p className="mt-1 text-2xl font-bold">{money(plan.coverageLimit)}</p>
                  <p className="mt-1 text-xs text-muted-foreground">Maximum coverage</p>
                </div>
                <div className="rounded-xl border border-border bg-accent/30 p-4">
                  <p className="text-xs font-semibold uppercase tracking-wider text-primary">Coverage rate</p>
                  <p className="mt-1 text-2xl font-bold">{plan.coveragePercentage}%</p>
                  <p className="mt-1 text-xs text-muted-foreground">Of eligible expenses</p>
                </div>
              </div>

              <div>
                <h3 className="text-sm font-semibold">About {plan.provider}</h3>
                <p className="mt-2 text-sm leading-6 text-muted-foreground">{plan.providerDescription}</p>
                <div className="mt-4 grid gap-3 sm:grid-cols-2">
                  <a
                    href={`tel:${plan.providerHotline}`}
                    className="flex items-center gap-2 text-sm text-primary hover:underline"
                  >
                    <Phone className="h-4 w-4" />
                    {plan.providerHotline}
                  </a>
                  <a
                    href={`mailto:${plan.providerEmail}`}
                    className="flex items-center gap-2 text-sm text-primary hover:underline"
                  >
                    <Mail className="h-4 w-4" />
                    {plan.providerEmail}
                  </a>
                  <a
                    href={plan.providerWebsite}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 text-sm text-primary hover:underline"
                  >
                    <Globe className="h-4 w-4" />
                    Visit website
                  </a>
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wider text-primary">Validity period</p>
                  <p className="mt-1 text-sm">{plan.validityMonths} months</p>
                </div>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wider text-primary">Waiting period</p>
                  <p className="mt-1 text-sm">{plan.waitingPeriod}</p>
                </div>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wider text-primary">Maximum claims</p>
                  <p className="mt-1 text-sm">{plan.maximumClaims} per year</p>
                </div>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wider text-primary">Renewal policy</p>
                  <p className="mt-1 text-sm">{plan.renewalPolicy}</p>
                </div>
              </div>
            </div>
          )}

          {activeTab === "benefits" && (
            <div className="space-y-6">
              <div>
                <h3 className="text-sm font-semibold">Covered benefits</h3>
                <ul className="mt-3 space-y-2">
                  {plan.benefits.map((benefit, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm">
                      <Check className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
                      <span>{benefit}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <div>
                <h3 className="text-sm font-semibold">Included services</h3>
                <div className="mt-3 grid gap-2 sm:grid-cols-2">
                  {plan.includedServices.map((service, i) => (
                    <div key={i} className="flex items-center gap-2 rounded-lg bg-accent/50 p-3 text-sm">
                      <Activity className="h-4 w-4 shrink-0 text-primary" />
                      <span>{service}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <h3 className="text-sm font-semibold">Eligibility requirements</h3>
                <ul className="mt-3 space-y-2">
                  {plan.eligibility.map((req, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm text-muted-foreground">
                      <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                      <span>{req}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <div>
                <h3 className="text-sm font-semibold">Exclusions</h3>
                <ul className="mt-3 space-y-2">
                  {plan.exclusions.map((exclusion, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm text-muted-foreground">
                      <X className="mt-0.5 h-4 w-4 shrink-0 text-red-500" />
                      <span>{exclusion}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          )}

          {activeTab === "terms" && (
            <div className="space-y-6">
              <div>
                <h3 className="text-sm font-semibold">Terms and conditions</h3>
                <div className="mt-3 rounded-xl border border-border bg-muted/30 p-4">
                  <p className="whitespace-pre-line text-sm leading-6 text-muted-foreground">
                    {plan.termsAndConditions}
                  </p>
                </div>
              </div>

              {plan.faqs.length > 0 && (
                <div>
                  <h3 className="text-sm font-semibold">Frequently asked questions</h3>
                  <div className="mt-3 space-y-3">
                    {plan.faqs.map((faq, i) => (
                      <details key={i} className="group rounded-xl border border-border bg-card p-4">
                        <summary className="flex cursor-pointer items-start justify-between gap-4 text-sm font-semibold">
                          {faq.question}
                          <ChevronDown className="h-4 w-4 shrink-0 transition group-open:rotate-180" />
                        </summary>
                        <p className="mt-3 text-sm leading-6 text-muted-foreground">{faq.answer}</p>
                      </details>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        <div className="sticky bottom-0 rounded-b-2xl border-t border-border bg-card/95 p-5 backdrop-blur">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-xs text-muted-foreground">Starting at</p>
              <p className="text-2xl font-bold text-primary">{money(plan.monthlyPremium)}/mo</p>
            </div>
            <button
              onClick={onPurchase}
              className="flex items-center justify-center gap-2 rounded-xl bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground transition hover:bg-primary/90"
            >
              Purchase plan
              <ArrowRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function CompareModal({ plans, onClose, onPurchase }: {
  plans: InsurancePlan[];
  onClose: () => void;
  onPurchase: (plan: InsurancePlan) => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/40 p-4">
      <div className="my-8 w-full max-w-6xl rounded-2xl border border-border bg-card shadow-2xl">
        <div className="flex items-center justify-between border-b border-border p-5">
          <div>
            <h2 className="text-xl font-bold">Compare plans</h2>
            <p className="mt-1 text-sm text-muted-foreground">Side-by-side comparison of {plans.length} plans</p>
          </div>
          <button onClick={onClose} className="rounded-lg p-2 hover:bg-muted" aria-label="Close">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="border-b border-border bg-muted/30">
              <tr>
                <th className="sticky left-0 z-10 bg-muted/30 px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider">
                  Feature
                </th>
                {plans.map((plan) => (
                  <th key={plan.id} className="min-w-64 px-4 py-3 text-left">
                    <div className="space-y-2">
                      <p className="text-xs font-semibold uppercase tracking-wider text-primary">{plan.provider}</p>
                      <p className="text-sm font-bold text-foreground">{plan.name}</p>
                      <p className="text-lg font-bold text-primary">{money(plan.monthlyPremium)}/mo</p>
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              <tr className="hover:bg-muted/20">
                <td className="sticky left-0 bg-card px-4 py-3 text-sm font-medium">Annual premium</td>
                {plans.map((plan) => (
                  <td key={plan.id} className="px-4 py-3 text-sm">{money(plan.annualPremium)}</td>
                ))}
              </tr>
              <tr className="hover:bg-muted/20">
                <td className="sticky left-0 bg-card px-4 py-3 text-sm font-medium">Coverage limit</td>
                {plans.map((plan) => (
                  <td key={plan.id} className="px-4 py-3 text-sm font-semibold">{money(plan.coverageLimit)}</td>
                ))}
              </tr>
              <tr className="hover:bg-muted/20">
                <td className="sticky left-0 bg-card px-4 py-3 text-sm font-medium">Coverage percentage</td>
                {plans.map((plan) => (
                  <td key={plan.id} className="px-4 py-3 text-sm">{plan.coveragePercentage}%</td>
                ))}
              </tr>
              <tr className="hover:bg-muted/20">
                <td className="sticky left-0 bg-card px-4 py-3 text-sm font-medium">Provider rating</td>
                {plans.map((plan) => (
                  <td key={plan.id} className="px-4 py-3">
                    <div className="flex items-center gap-1 text-sm">
                      <Star className="h-4 w-4 fill-current text-amber-600" />
                      {Number(plan.providerRating ?? 0).toFixed(1)}
                    </div>
                  </td>
                ))}
              </tr>
              <tr className="hover:bg-muted/20">
                <td className="sticky left-0 bg-card px-4 py-3 text-sm font-medium">Waiting period</td>
                {plans.map((plan) => (
                  <td key={plan.id} className="px-4 py-3 text-sm">{plan.waitingPeriod}</td>
                ))}
              </tr>
              <tr className="hover:bg-muted/20">
                <td className="sticky left-0 bg-card px-4 py-3 text-sm font-medium">Maximum claims/year</td>
                {plans.map((plan) => (
                  <td key={plan.id} className="px-4 py-3 text-sm">{plan.maximumClaims}</td>
                ))}
              </tr>
              <tr className="hover:bg-muted/20">
                <td className="sticky left-0 bg-card px-4 py-3 text-sm font-medium">Validity</td>
                {plans.map((plan) => (
                  <td key={plan.id} className="px-4 py-3 text-sm">{plan.validityMonths} months</td>
                ))}
              </tr>
              <tr className="hover:bg-muted/20">
                <td className="sticky left-0 bg-card px-4 py-3 text-sm font-medium">Actions</td>
                {plans.map((plan) => (
                  <td key={plan.id} className="px-4 py-3">
                    <button
                      onClick={() => onPurchase(plan)}
                      className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground transition hover:bg-primary/90"
                    >
                      Purchase
                    </button>
                  </td>
                ))}
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function PolicyCard({ policy, onRenew, onDownload, isBusy }: {
  policy: InsurancePolicy;
  onRenew: () => void;
  onDownload: () => void;
  isBusy: boolean;
}) {
  const expiresIn = Math.ceil((new Date(policy.expirationDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
  const isExpiringSoon = expiresIn <= 30 && expiresIn > 0;
  const coverageUsed = ((Number(policy.coverageLimit) - Number(policy.remainingCoverage)) / Number(policy.coverageLimit)) * 100;

  return (
    <article className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
      <div className="space-y-4 p-5">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <StatusBadge status={policy.status} type="policy" />
              <StatusBadge status={policy.paymentStatus} type="payment" />
            </div>
            <h3 className="mt-2 font-semibold">{policy.planName}</h3>
            <p className="text-sm text-muted-foreground">{policy.provider}</p>
          </div>
          <Shield className="h-10 w-10 text-primary/20" />
        </div>

        <div className="grid gap-3 text-sm sm:grid-cols-2">
          <div>
            <p className="text-xs text-muted-foreground">Policy number</p>
            <p className="mt-0.5 font-mono font-medium">{policy.policyNumber}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Insurance ID</p>
            <p className="mt-0.5 font-mono font-medium">{policy.insuranceId}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Premium</p>
            <p className="mt-0.5 font-semibold">{money(policy.premiumAmount)}/mo</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Expires</p>
            <p className="mt-0.5 font-medium">
              {new Date(policy.expirationDate).toLocaleDateString("en-PH", { dateStyle: "medium" })}
            </p>
          </div>
        </div>

        {isExpiringSoon && policy.status === "active" && (
          <div className="flex items-start gap-2 rounded-lg bg-amber-500/10 p-3 text-sm text-amber-700">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
            <p>Your policy expires in {expiresIn} days. Renew now to avoid coverage gaps.</p>
          </div>
        )}

        <div>
          <div className="mb-2 flex items-center justify-between text-xs">
            <span className="text-muted-foreground">Coverage used</span>
            <span className="font-semibold">
              {money(policy.remainingCoverage)} / {money(policy.coverageLimit)}
            </span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-muted">
            <div
              className="h-full rounded-full bg-primary transition-all"
              style={{ width: `${Math.min(coverageUsed, 100)}%` }}
            />
          </div>
        </div>

        <div className="flex gap-2">
          {policy.status === "active" && (
            <button
              onClick={onRenew}
              disabled={isBusy}
              className="flex-1 rounded-xl border border-primary bg-primary/10 px-3 py-2 text-sm font-semibold text-primary transition hover:bg-primary/20 disabled:opacity-50"
            >
              {isBusy ? "Processing..." : "Renew"}
            </button>
          )}
          <button
            onClick={onDownload}
            className="flex-1 rounded-xl border border-border px-3 py-2 text-sm font-semibold transition hover:bg-muted"
          >
            <Download className="mx-auto h-4 w-4" />
          </button>
        </div>
      </div>
    </article>
  );
}

export default function InsuranceSection({
  plans,
  policies,
  loading,
  onPurchase,
  onRenew,
  onDownload,
  onOpenBilling,
  purchaseBusyPolicyId,
}: InsuranceSectionProps) {
  const [activeTab, setActiveTab] = useState<"browse" | "my-insurance">("browse");
  const [search, setSearch] = useState("");
  const [selectedPlan, setSelectedPlan] = useState<InsurancePlan | null>(null);
  const [comparingPlans, setComparingPlans] = useState<InsurancePlan[]>([]);
  const [comparisonOpen, setComparisonOpen] = useState(false);

  const filteredPlans = useMemo(
    () =>
      plans.filter(
        (plan) =>
          plan.active &&
          `${plan.name} ${plan.provider} ${plan.description}`
            .toLowerCase()
            .includes(search.toLowerCase())
      ),
    [plans, search]
  );

  const toggleCompare = (plan: InsurancePlan) => {
    setComparingPlans((prev) =>
      prev.find((p) => p.id === plan.id)
        ? prev.filter((p) => p.id !== plan.id)
        : prev.length < 3
        ? [...prev, plan]
        : prev
    );
  };

  if (loading) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="h-32 rounded-2xl bg-muted" />
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-96 rounded-2xl bg-muted" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-7">
      <section className="relative overflow-hidden rounded-3xl border border-primary/15 bg-gradient-to-br from-primary/[0.12] via-card to-accent/60 p-6 md:p-8">
        <div className="relative z-10 max-w-2xl">
          <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-primary/20 bg-card/80 px-3 py-1.5 text-xs font-semibold text-primary">
            <Shield className="h-3.5 w-3.5" />
            Insurance Plans
          </div>
          <h1 className="text-2xl font-bold tracking-tight md:text-3xl">
            Coverage you can trust, care you deserve.
          </h1>
          <p className="mt-2 max-w-xl text-sm leading-6 text-muted-foreground">
            Explore comprehensive health insurance plans from trusted providers. Compare benefits,
            manage your policies, and protect your health with confidence.
          </p>
          <div className="mt-5 flex flex-wrap gap-2 text-xs text-muted-foreground">
            <span className="inline-flex items-center gap-1.5">
              <Check className="h-4 w-4 text-primary" />
              Verified providers
            </span>
            <span className="inline-flex items-center gap-1.5">
              <Heart className="h-4 w-4 text-primary" />
              Comprehensive coverage
            </span>
            <span className="inline-flex items-center gap-1.5">
              <Sparkles className="h-4 w-4 text-primary" />
              Easy renewal
            </span>
          </div>
        </div>
        <Shield className="absolute -bottom-8 -right-4 h-44 w-44 rotate-12 text-primary/10" />
      </section>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex rounded-xl bg-muted p-1">
          <button
            onClick={() => setActiveTab("browse")}
            className={`rounded-lg px-4 py-2 text-sm font-semibold ${
              activeTab === "browse" ? "bg-card text-primary shadow-sm" : "text-muted-foreground"
            }`}
          >
            Browse plans
          </button>
          <button
            onClick={() => setActiveTab("my-insurance")}
            className={`rounded-lg px-4 py-2 text-sm font-semibold ${
              activeTab === "my-insurance" ? "bg-card text-primary shadow-sm" : "text-muted-foreground"
            }`}
          >
            My insurance
            {policies.length > 0 && <span className="ml-1 text-xs">({policies.length})</span>}
          </button>
        </div>

        {activeTab === "browse" && comparingPlans.length > 0 && (
          <button
            onClick={() => setComparisonOpen(true)}
            className="inline-flex items-center gap-2 rounded-xl border border-primary/20 bg-primary/10 px-4 py-2 text-sm font-semibold text-primary"
          >
            <Filter className="h-4 w-4" />
            Comparing {comparingPlans.length} plan{comparingPlans.length !== 1 ? "s" : ""}
          </button>
        )}
      </div>

      {activeTab === "browse" ? (
        <section className="space-y-5">
          <div className="flex flex-col gap-3 md:flex-row">
            <label className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search insurance plans..."
                className="min-h-11 w-full rounded-xl border border-input bg-card pl-10 pr-4 text-sm outline-none ring-primary transition focus:ring-2"
              />
            </label>
            {comparingPlans.length >= 2 && (
              <button
                onClick={() => setComparisonOpen(true)}
                className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground transition hover:bg-primary/90"
              >
                Compare {comparingPlans.length} plans
                <ArrowRight className="h-4 w-4" />
              </button>
            )}
          </div>

          {filteredPlans.length > 0 ? (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {filteredPlans.map((plan) => (
                <PlanCard
                  key={plan.id}
                  plan={plan}
                  onSelect={() => setSelectedPlan(plan)}
                  onCompare={() => toggleCompare(plan)}
                  isComparing={comparingPlans.some((p) => p.id === plan.id)}
                />
              ))}
            </div>
          ) : (
            <div className="rounded-2xl border border-dashed border-border bg-card p-12 text-center">
              <Search className="mx-auto h-9 w-9 text-muted-foreground/50" />
              <h2 className="mt-3 font-semibold">No plans found</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Try adjusting your search or browse all available plans.
              </p>
            </div>
          )}
        </section>
      ) : (
        <section className="space-y-4">
          {policies.length > 0 ? (
            <>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {policies.map((policy) => (
                  <PolicyCard
                    key={policy.id}
                    policy={policy}
                    onRenew={() => onRenew(policy)}
                    onDownload={() => onDownload(policy)}
                    isBusy={purchaseBusyPolicyId === policy.id}
                  />
                ))}
              </div>
              {policies.some((p) => p.billId) && (
                <div className="rounded-xl border border-border bg-card p-4">
                  <div className="flex items-start gap-3">
                    <CreditCard className="mt-1 h-5 w-5 text-primary" />
                    <div className="flex-1">
                      <p className="text-sm font-semibold">Pending payments</p>
                      <p className="mt-1 text-xs text-muted-foreground">
                        You have unpaid insurance bills. Review and pay them in Pay Bills.
                      </p>
                    </div>
                    <button
                      onClick={onOpenBilling}
                      className="rounded-lg bg-primary px-3 py-2 text-sm font-semibold text-primary-foreground transition hover:bg-primary/90"
                    >
                      View bills
                    </button>
                  </div>
                </div>
              )}
            </>
          ) : (
            <div className="rounded-2xl border border-dashed border-border bg-card p-12 text-center">
              <Shield className="mx-auto h-10 w-10 text-primary/50" />
              <h2 className="mt-3 font-semibold">No active insurance policies</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Browse available plans and purchase coverage to protect your health.
              </p>
              <button
                onClick={() => setActiveTab("browse")}
                className="mt-5 inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground"
              >
                Browse plans
                <ArrowRight className="h-4 w-4" />
              </button>
            </div>
          )}
        </section>
      )}

      {selectedPlan && (
        <PlanDetailModal
          plan={selectedPlan}
          onClose={() => setSelectedPlan(null)}
          onPurchase={() => {
            onPurchase(selectedPlan);
            setSelectedPlan(null);
          }}
        />
      )}

      {comparisonOpen && comparingPlans.length >= 2 && (
        <CompareModal
          plans={comparingPlans}
          onClose={() => setComparisonOpen(false)}
          onPurchase={(plan) => {
            onPurchase(plan);
            setComparisonOpen(false);
          }}
        />
      )}
    </div>
  );
}
