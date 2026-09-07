import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Package } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { LoginForm } from "@/app/login/login-form";

export const metadata: Metadata = {
  title: "Sign in — Inward Outward Shipment Tracker",
};

export default async function LoginPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) redirect("/");

  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <div className="glass-card w-full max-w-sm rounded-2xl p-8">
        <div className="mb-6 flex flex-col items-center gap-3 text-center">
          <div className="flex size-11 items-center justify-center rounded-xl bg-primary text-primary-foreground glow-tangerine">
            <Package className="size-5" />
          </div>
          <div>
            <h1 className="text-lg font-semibold tracking-tight">Sign in</h1>
            <p className="text-sm text-muted-foreground">Inward Outward Shipment Tracker</p>
          </div>
        </div>
        <LoginForm />
      </div>
    </div>
  );
}
