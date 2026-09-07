"use client";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { signOut } from "@/lib/auth-actions";
import { LogOut, User } from "lucide-react";

export function UserMenu({ email, role }: { email: string; role: string }) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="sm" className="gap-1.5 text-muted-foreground">
          <User className="size-4" />
          <span className="hidden max-w-[160px] truncate sm:inline">{email}</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuLabel>
          Signed in as <span className="font-medium text-foreground capitalize">{role}</span>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild variant="destructive">
          <form action={signOut} className="w-full">
            <button type="submit" className="flex w-full items-center gap-1.5">
              <LogOut className="size-3.5" />
              Sign out
            </button>
          </form>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
