"use client";

import { useState, useTransition, type FormEvent } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { MotionButton } from "@/components/motion/motion-button";
import { signIn } from "@/lib/auth-actions";
import { Loader2 } from "lucide-react";

export function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isPending, startTransition] = useTransition();

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    startTransition(async () => {
      const result = await signIn(email, password);
      if (!result.success) {
        toast.error("Couldn't sign in", { description: result.error });
        return;
      }
      const redirectTo = searchParams.get("redirectTo") ?? "/";
      router.replace(redirectTo);
      router.refresh();
    });
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <Label htmlFor="email" className="mb-1.5">
          Email
        </Label>
        <Input
          id="email"
          type="email"
          required
          autoComplete="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@company.com"
        />
      </div>
      <div>
        <Label htmlFor="password" className="mb-1.5">
          Password
        </Label>
        <Input
          id="password"
          type="password"
          required
          autoComplete="current-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
      </div>
      <MotionButton
        type="submit"
        disabled={isPending}
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
        className="w-full gap-1.5"
      >
        {isPending && <Loader2 className="size-3.5 animate-spin" />}
        Sign in
      </MotionButton>
    </form>
  );
}
