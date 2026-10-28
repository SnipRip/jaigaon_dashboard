"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { useSWRConfig } from "swr";
import { Button } from "@/components/ui/button";
import { FormMessage } from "@/components/ui/form-message";
import { CardTitle, GlassCard } from "@/components/ui/glass-card";
import { TextField } from "@/components/ui/text-field";
import { useCurrentUser } from "@/features/auth/current-user-context";
import { PasswordVisibilityToggle } from "@/features/auth/password-visibility-toggle";
import { apiRequest } from "@/lib/api-client";
import { formatDateTime } from "@/lib/format";
import { PASSWORD_RULE, passwordSchema, type PasswordValues } from "./password-schema";
import { SESSIONS_PATH } from "./sessions-path";
import { useFormResult } from "./use-form-result";

export function PasswordForm() {
  const user = useCurrentUser();
  const { mutate } = useSWRConfig();
  const { result, run } = useFormResult();
  const [showPasswords, setShowPasswords] = useState(false);
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<PasswordValues>({ resolver: zodResolver(passwordSchema) });

  const fieldType = showPasswords ? "text" : "password";

  const onSubmit = handleSubmit(async ({ currentPassword, newPassword }) => {
    const changed = await run(
      () => apiRequest("/users/me/password", { method: "POST", body: { currentPassword, newPassword } }),
      "Password updated. Other devices have been signed out.",
    );
    if (changed) {
      reset();
      // The backend revoked every other session, so the device list is stale.
      await mutate(SESSIONS_PATH);
    }
  });

  return (
    <GlassCard aria-labelledby="settings-password" className="flex flex-col gap-3.5">
      <div className="flex flex-col gap-1">
        <CardTitle id="settings-password">Change password</CardTitle>
        <span className="text-[13px] font-semibold text-muted">
          Last changed {formatDateTime(user.passwordChangedAt)}. Changing it signs you out of other devices.
        </span>
      </div>
      <form onSubmit={onSubmit} noValidate className="flex flex-col gap-3.5">
        <TextField
          label="Current password"
          type={fieldType}
          autoComplete="current-password"
          error={errors.currentPassword?.message}
          trailing={<PasswordVisibilityToggle visible={showPasswords} onToggle={() => setShowPasswords((v) => !v)} />}
          {...register("currentPassword")}
        />
        <TextField
          label="New password"
          type={fieldType}
          autoComplete="new-password"
          hint={PASSWORD_RULE}
          error={errors.newPassword?.message}
          {...register("newPassword")}
        />
        <TextField
          label="Confirm new password"
          type={fieldType}
          autoComplete="new-password"
          error={errors.confirmPassword?.message}
          {...register("confirmPassword")}
        />
        {result && <FormMessage tone={result.tone}>{result.text}</FormMessage>}
        <Button type="submit" disabled={isSubmitting} className="self-start">
          {isSubmitting ? "Updating…" : "Update password"}
        </Button>
      </form>
    </GlassCard>
  );
}
