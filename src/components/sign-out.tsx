"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { authClient } from "@/lib/auth-client";
import { LogOut } from "lucide-react";
export function SignOut() {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [failed, setFailed] = useState(false);
  return (
    <div>
      <button
        className="button secondary"
        disabled={pending}
        onClick={async () => {
          setPending(true);
          setFailed(false);
          try {
            const result = await authClient.signOut();
            if (result.error) throw new Error("Sign out failed");
            router.replace("/login");
            router.refresh();
          } catch {
            setFailed(true);
            setPending(false);
          }
        }}
      >
        <LogOut size={16} />
        {pending ? "Signing out…" : "Sign out"}
      </button>
      {failed && <p role="alert">Could not sign out. Please try again.</p>}
    </div>
  );
}
