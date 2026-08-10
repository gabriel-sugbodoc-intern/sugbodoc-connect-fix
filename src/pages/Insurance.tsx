import React, { useEffect, useState } from "react";
import { useLocation } from "@/lib/router-compat";
import { toast } from "sonner";
import InsuranceSection, { type InsurancePlan, type InsurancePolicy } from "@/components/portal/insurance/InsuranceSection";
import { apiClient } from "@/lib/api-client";
import { exportInsurancePolicy } from "@/lib/pdf-export";

export default function Insurance() {
  const [, setLocation] = useLocation();
  const [plans, setPlans] = useState<InsurancePlan[]>([]);
  const [policies, setPolicies] = useState<InsurancePolicy[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedPlan, setSelectedPlan] = useState<InsurancePlan | null>(null);
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [billingCycle, setBillingCycle] = useState<"monthly" | "annual">("annual");
  const [purchaseBusy, setPurchaseBusy] = useState(false);
  const [busyPolicyId, setBusyPolicyId] = useState<string>();

  const loadInsurance = async () => {
    const [plansResult, policiesResult] = await Promise.all([
      apiClient.getInsurancePlans(),
      apiClient.getInsurancePolicies(),
    ]);
    if (plansResult.data) setPlans(plansResult.data.plans as InsurancePlan[]);
    else toast.error(plansResult.error ?? "Could not load insurance plans.");
    if (policiesResult.data) setPolicies(policiesResult.data.policies as InsurancePolicy[]);
    else toast.error(policiesResult.error ?? "Could not load your insurance policies.");
  };

  useEffect(() => {
    loadInsurance().finally(() => setLoading(false));
    const sessionId = new URLSearchParams(window.location.search).get("checkout_session_id");
    if (!sessionId) return;
    apiClient.getCheckoutSession(sessionId).then(({ data, error }) => {
      if (error || !data || data.paymentStatus !== "paid") {
        toast.error("Insurance payment was not completed. Your policy remains pending.");
      } else {
        toast.success("Insurance payment confirmed and policy activated.");
        void loadInsurance();
      }
      window.history.replaceState({}, "", window.location.pathname);
    });
  }, []);

  const purchase = async () => {
    if (!selectedPlan) return;
    if (!termsAccepted) {
      toast.error("Accept the plan terms and conditions to continue.");
      return;
    }
    setPurchaseBusy(true);
    const purchaseResult = await apiClient.purchaseInsurance(selectedPlan.id, true, billingCycle);
    if (purchaseResult.error || !purchaseResult.data) {
      toast.error(purchaseResult.error ?? "Could not start the insurance purchase.");
      setPurchaseBusy(false);
      return;
    }
    const { checkout } = purchaseResult.data;
    const returnPath = window.location.pathname;
    const checkoutResult = await apiClient.createCheckoutSession(checkout.amount, checkout.description, {
      invoiceId: checkout.invoiceId,
      invoiceNo: checkout.invoiceNo,
      patientEmail: checkout.patientEmail,
      successUrl: `${window.location.origin}${returnPath}`,
      cancelUrl: `${window.location.origin}${returnPath}`,
    });
    if (checkoutResult.error || !checkoutResult.data?.url) {
      toast.error(checkoutResult.error ?? "Unable to start secure payment.");
      setPurchaseBusy(false);
      return;
    }
    window.location.assign(checkoutResult.data.url);
  };

  const downloadPolicy = async (policy: InsurancePolicy) => {
    const result = await apiClient.getInsurancePolicyPdf(policy.id);
    if (result.error || !result.data) {
      toast.error(result.error ?? "Could not generate the policy PDF.");
      return;
    }
    await exportInsurancePolicy(policy);
    toast.success("Policy PDF downloaded.");
  };

  const renewPolicy = async (policy: InsurancePolicy) => {
    setBusyPolicyId(policy.id);
    const result = await apiClient.renewInsurance(policy.id);
    setBusyPolicyId(undefined);
    if (result.error) toast.error(result.error);
    else toast.success(result.data?.message ?? "Renewal request received.");
  };

  return (
    <>
      <InsuranceSection
        plans={plans}
        policies={policies}
        loading={loading}
        onPurchase={(plan) => {
          setSelectedPlan(plan);
          setTermsAccepted(false);
          setBillingCycle("annual");
        }}
        onRenew={renewPolicy}
        onDownload={downloadPolicy}
        onOpenBilling={() => setLocation("/billing")}
        purchaseBusyPolicyId={busyPolicyId}
      />
      {selectedPlan && (
        <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/40 p-4" role="dialog" aria-modal="true" aria-labelledby="purchase-title">
          <div className="w-full max-w-lg rounded-2xl border border-border bg-card p-6 shadow-2xl">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-primary">Secure purchase</p>
                <h2 id="purchase-title" className="mt-1 text-xl font-bold">{selectedPlan.name}</h2>
                <p className="mt-1 text-sm text-muted-foreground">{selectedPlan.provider}</p>
              </div>
              <button onClick={() => setSelectedPlan(null)} className="rounded-lg p-2 hover:bg-muted" aria-label="Close purchase dialog">×</button>
            </div>
            <div className="mt-5 grid gap-3 sm:grid-cols-2">
              <button onClick={() => setBillingCycle("monthly")} className={`rounded-xl border p-4 text-left ${billingCycle === "monthly" ? "border-primary bg-accent ring-1 ring-primary" : "border-border"}`}>
                <p className="text-xs text-muted-foreground">Monthly premium</p>
                <p className="mt-1 text-lg font-bold text-primary">₱{Number(selectedPlan.monthlyPremium).toLocaleString("en-PH", { minimumFractionDigits: 2 })}</p>
              </button>
              <button onClick={() => setBillingCycle("annual")} className={`rounded-xl border p-4 text-left ${billingCycle === "annual" ? "border-primary bg-accent ring-1 ring-primary" : "border-border"}`}>
                <p className="text-xs text-muted-foreground">Annual premium</p>
                <p className="mt-1 text-lg font-bold text-primary">₱{Number(selectedPlan.annualPremium).toLocaleString("en-PH", { minimumFractionDigits: 2 })}</p>
              </button>
            </div>
            <div className="mt-4 rounded-xl bg-muted/60 p-4 text-sm">
              <div className="flex justify-between"><span className="text-muted-foreground">Coverage limit</span><span className="font-semibold">₱{Number(selectedPlan.coverageLimit).toLocaleString("en-PH")}</span></div>
              <div className="mt-2 flex justify-between"><span className="text-muted-foreground">Coverage</span><span className="font-semibold">{selectedPlan.coveragePercentage}%</span></div>
              <div className="mt-2 flex justify-between"><span className="text-muted-foreground">Validity</span><span className="font-semibold">{selectedPlan.validityMonths} months</span></div>
            </div>
            <label className="mt-5 flex items-start gap-3 text-sm">
              <input type="checkbox" checked={termsAccepted} onChange={(event) => setTermsAccepted(event.target.checked)} className="mt-1 h-4 w-4 accent-primary" />
              <span>I have reviewed and accept the plan's terms and conditions.</span>
            </label>
            <details className="mt-3 rounded-xl border border-border bg-muted/40 p-3 text-sm">
              <summary className="cursor-pointer font-semibold text-primary">View terms and conditions</summary>
              <p className="mt-2 whitespace-pre-line text-xs leading-5 text-muted-foreground">{selectedPlan.termsAndConditions}</p>
            </details>
            <p className="mt-3 text-xs leading-5 text-muted-foreground">You will be redirected to Stripe Checkout. Your policy is activated only after the payment is verified by SugboDoc.</p>
            <div className="mt-5 flex gap-2">
              <button onClick={() => setSelectedPlan(null)} className="flex-1 rounded-xl border border-border px-4 py-3 text-sm font-semibold">Cancel</button>
              <button disabled={purchaseBusy || !termsAccepted} onClick={purchase} className="flex-1 rounded-xl bg-primary px-4 py-3 text-sm font-semibold text-primary-foreground disabled:opacity-50">{purchaseBusy ? "Preparing payment..." : "Continue to payment"}</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}