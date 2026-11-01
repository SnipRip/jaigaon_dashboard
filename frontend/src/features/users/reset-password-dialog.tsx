"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { FormMessage } from "@/components/ui/form-message";
import { GlassModal } from "@/components/ui/glass-modal";
import { TextField } from "@/components/ui/text-field";
import { PASSWORD_FIELD_PATTERN, PASSWORD_RULE } from "@/features/settings/password-schema";
import { ApiError } from "@/lib/api-client";
import { resetStaffPassword } from "./staff-api";
import type { StaffUser } from "./types";

const schema = z.object({ temporaryPassword: z.string().regex(PASSWORD_FIELD_PATTERN, PASSWORD_RULE) });

interface ResetPasswordDialogProps {
  user: StaffUser | null;
  onClose: () => void;
  onReset: (user: StaffUser) => void | Promise<void>;
}

// An administrator sets a temporary password and tells it to the person.
// Every device they are signed in on is signed out, and they must choose
// their own password at next sign-in. Also clears a lockout.
export function ResetPasswordDialog({ user, onClose, onReset }: ResetPasswordDialogProps) {
  const [error, setError] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<z.infer<typeof schema>>({ resolver: zodResolver(schema), defaultValues: { temporaryPassword: "" } });

  const close = () => (reset(), setError(null), onClose());

  const onSubmit = handleSubmit(async ({ temporaryPassword }) => {
    if (!user) return;
    setError(null);
    try {
      await onReset(await resetStaffPassword(user, temporaryPassword));
      close();
    } catch (failure) {
      setError(failure instanceof ApiError ? failure.message : "Could not reset the password. Try again.");
    }
  });

  return (
    <GlassModal
      open={user !== null}
      onOpenChange={(open) => !open && close()}
      title={`Reset password for ${user?.displayName ?? ""}`}
      description="They are signed out everywhere and choose their own password at next sign-in."
    >
      <form onSubmit={onSubmit} noValidate className="flex flex-col gap-3.5">
        <TextField label="Temporary password" autoComplete="off" hint={PASSWORD_RULE} error={errors.temporaryPassword?.message} {...register("temporaryPassword")} />
        {error && <FormMessage tone="error">{error}</FormMessage>}
        <div className="flex flex-wrap justify-end gap-2.5">
          <Button variant="neutral" onClick={close}>
            Cancel
          </Button>
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? "Resetting…" : "Reset password"}
          </Button>
        </div>
      </form>
    </GlassModal>
  );
}
