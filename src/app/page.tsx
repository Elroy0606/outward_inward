import type { ReactNode } from "react";
import { AlertTriangle, Package } from "lucide-react";
import { DashboardShell } from "@/components/dashboard/dashboard-shell";
import { UserMenu } from "@/components/dashboard/user-menu";
import { createClient } from "@/lib/supabase/server";
import type { Shipment } from "@/lib/types";

function PageShell({
  children,
  userEmail,
  userRole,
}: {
  children: ReactNode;
  userEmail?: string;
  userRole?: string;
}) {
  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-30 mx-3 mt-3 rounded-2xl sm:mx-4 sm:mt-4 lg:mx-6 lg:mt-6">
        <div className="glass-card mx-auto flex max-w-7xl items-center gap-3 rounded-2xl px-4 py-3.5 sm:px-6">
          <div className="flex size-9 items-center justify-center rounded-xl bg-primary text-primary-foreground glow-tangerine">
            <Package className="size-5" />
          </div>
          <div className="min-w-0 flex-1">
            <h1 className="truncate text-lg font-semibold tracking-tight">
              Inward Outward Shipment Tracker
            </h1>
            <p className="truncate text-xs text-muted-foreground">
              Live shipment visibility, replacing the manual tracker sheet.
            </p>
          </div>
          {userEmail && <UserMenu email={userEmail} role={userRole ?? "staff"} />}
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">{children}</main>
    </div>
  );
}

export default async function DashboardPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const [{ data, error }, { data: profile }] = await Promise.all([
    supabase
      .from("shipments")
      .select("*")
      .order("shipment_date", { ascending: false })
      .order("created_at", { ascending: false }),
    user
      ? supabase.from("profiles").select("role").eq("id", user.id).single()
      : Promise.resolve({ data: null }),
  ]);

  return (
    <PageShell userEmail={user?.email} userRole={profile?.role}>
      {error ? (
        <div className="glass-card flex flex-col items-center gap-2 rounded-2xl border-dashed border-destructive/40 py-16 text-center">
          <AlertTriangle className="size-8 text-destructive" />
          <p className="font-medium text-destructive">Couldn&apos;t load shipments</p>
          <p className="max-w-md text-sm text-muted-foreground">
            {error.message}. Confirm your Supabase environment variables are set and the{" "}
            <code className="rounded bg-muted px-1 py-0.5">shipments</code> table exists (see
            CLAUDE.md for setup steps).
          </p>
        </div>
      ) : (
        <DashboardShell initialShipments={(data as Shipment[]) ?? []} />
      )}
    </PageShell>
  );
}
