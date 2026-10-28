"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { FormMessage } from "@/components/ui/form-message";
import { CardTitle, GlassCard } from "@/components/ui/glass-card";
import { TextField } from "@/components/ui/text-field";
import { UserAvatar } from "@/components/ui/user-avatar";
import { useCurrentUser } from "@/features/auth/current-user-context";
import { apiRequest } from "@/lib/api-client";
import type { UserProfile } from "@/types/user";
import { profileSchema, type ProfileValues } from "./profile-schema";
import { useFormResult } from "./use-form-result";

// Name, display name and phone. Email and role are shown but can only be
// changed by an administrator.
export function ProfileForm() {
  const user = useCurrentUser();
  const router = useRouter();
  const { result, run } = useFormResult();
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting, isDirty },
  } = useForm<ProfileValues>({
    resolver: zodResolver(profileSchema),
    defaultValues: { fullName: user.fullName, displayName: user.displayName, phone: user.phone ?? "" },
  });

  const onSubmit = handleSubmit(async (values) => {
    const saved = await run(
      () => apiRequest<UserProfile>("/users/me", { method: "PATCH", body: { ...values, phone: values.phone || null } }),
      "Profile saved",
    );
    if (saved) {
      reset(values);
      // Re-renders the server layout so the sidebar and top bar show the new name.
      router.refresh();
    }
  });

  return (
    <GlassCard aria-labelledby="settings-profile" className="flex flex-col gap-3.5">
      <CardTitle id="settings-profile">Profile</CardTitle>
      <div className="flex items-center gap-3.5">
        <UserAvatar name={user.displayName} className="size-14 text-lg" />
        <div className="flex min-w-0 flex-col">
          <span className="truncate text-lg font-semibold">{user.displayName}</span>
          <span className="truncate text-sm font-semibold text-muted">{user.email}</span>
        </div>
      </div>

      <form onSubmit={onSubmit} noValidate className="flex flex-col gap-3.5">
        <div className="grid grid-cols-[repeat(auto-fit,minmax(200px,1fr))] gap-3.5">
          <TextField label="Full name" autoComplete="name" error={errors.fullName?.message} {...register("fullName")} />
          <TextField label="Name shown on quotations" error={errors.displayName?.message} {...register("displayName")} />
          <TextField
            label="Mobile number"
            type="tel"
            autoComplete="tel"
            placeholder="+919635312988"
            error={errors.phone?.message}
            {...register("phone")}
          />
          <TextField label="Email · set by the administrator" value={user.email} disabled readOnly />
          <TextField label="Role · set by the administrator" value={user.role === "ADMIN" ? "Administrator" : "Staff"} disabled readOnly />
        </div>
        {result && <FormMessage tone={result.tone}>{result.text}</FormMessage>}
        <div className="flex flex-wrap gap-2.5">
          <Button type="submit" disabled={isSubmitting || !isDirty}>
            {isSubmitting ? "Saving…" : "Save profile"}
          </Button>
          <Button variant="neutral" disabled={isSubmitting || !isDirty} onClick={() => reset()}>
            Discard changes
          </Button>
        </div>
      </form>
    </GlassCard>
  );
}
