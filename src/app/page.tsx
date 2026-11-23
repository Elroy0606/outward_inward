import type { ReactNode } from "react";
import Image from "next/image";
import { AlertTriangle } from "lucide-react";
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
      <header className="bg-gradient-to-r from-orange-600 via-orange-500 to-yellow-500 relative overflow-hidden sticky top-0 z-50 shadow-md">
        <div className="mx-auto flex max-w-[1600px] items-center gap-3 px-4 py-2.5 text-zinc-950 sm:px-6 lg:px-8">
          {/* The source PNG is 91x78, so 39px tall stays 1:1 on 2x screens. */}
          <div className="shrink-0 rounded-lg bg-white p-1 shadow-sm">
            <Image
              src="/images/logo.png"
              alt="Celsun logo"
              width={91}
              height={78}
              unoptimized
              priority
              className="h-[39px] w-auto object-contain"
            />
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-base font-bold tracking-tight sm:text-lg">
              <span className="sm:hidden">Celsun EcoEnergy</span>
              <span className="hidden sm:inline">
                Celsun EcoEnergy &amp; Infratech Holdings Pvt. Ltd.
              </span>
            </p>
            <h1 className="truncate text-xs font-semibold">Inward Outward Shipment Tracker</h1>
          </div>
          {userEmail && <UserMenu email={userEmail} role={userRole ?? "staff"} />}
        </div>
      </header>

      <main className="mx-auto max-w-[1600px] px-4 py-6 sm:px-6 lg:px-8">{children}</main>
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
