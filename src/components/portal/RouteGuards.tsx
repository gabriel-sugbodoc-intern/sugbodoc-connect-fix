import React, { useEffect, useState } from "react";
import { useLocation } from "@/lib/router-compat";
import { apiClient, clearAuthState } from "@/lib/api-client";
import Shell from "@/components/portal/layout/Shell";
import AdminShell from "@/components/portal/admin/AdminShell";

type GuardState = "loading" | "allowed" | "denied";

function useSession(allowedRoles?: string[]) {
  const [, setLocation] = useLocation();
  const [state, setState] = useState<GuardState>("loading");

  useEffect(() => {
    let active = true;
    const token = localStorage.getItem("sugbodoc_auth");
    if (!token) {
      setLocation("/login", { replace: true });
      return;
    }
    apiClient.getMe().then(({ data }: { data?: any }) => {
      if (!active) return;
      if (data?.user) {
        if (!allowedRoles) {
          setState("allowed");
          return;
        }
        setState(
          allowedRoles.includes(String(data.user.role ?? "").toLowerCase()) ? "allowed" : "denied",
        );
      } else {
        clearAuthState("expired");
        setLocation("/login", { replace: true });
      }
    });
    return () => {
      active = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [setLocation]);

  return state;
}

export function PortalPage({ children }: { children: React.ReactNode }) {
  const state = useSession();
  if (state !== "allowed") return null;
  return <Shell>{children}</Shell>;
}

export function AdminPage({
  children,
  allowedRoles = ["admin", "administrator"],
}: {
  children: React.ReactNode;
  allowedRoles?: string[];
}) {
  const [, setLocation] = useLocation();
  const state = useSession(allowedRoles);

  if (state === "loading") return null;

  if (state === "denied") {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background p-6">
        <div className="max-w-md rounded-2xl border bg-card p-8 text-center shadow-sm">
          <h1 className="text-2xl font-bold">Access Denied</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            You do not have permission to access this area.
          </p>
          <button
            onClick={() => setLocation("/dashboard")}
            className="mt-6 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground"
          >
            Return to Patient Portal
          </button>
        </div>
      </div>
    );
  }

  return <AdminShell>{children}</AdminShell>;
}
