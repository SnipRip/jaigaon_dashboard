"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { FormMessage } from "@/components/ui/form-message";
import { TextField } from "@/components/ui/text-field";
import { HOME_PATH } from "@/config/auth";
import { apiRequest } from "@/lib/api-client";
import type { UserProfile } from "@/types/user";
import { loginSchema, type LoginValues } from "./login-schema";
import { PasswordVisibilityToggle } from "./password-visibility-toggle";

export function LoginForm() {
  const [showPassword, setShowPassword] = useState(false);
  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<LoginValues>({ resolver: zodResolver(loginSchema) });

  const onSubmit = handleSubmit(async (values) => {
    try {
      await apiRequest<UserProfile>("/auth/login", {
        method: "POST",
        body: values,
        skipAuthRedirect: true,
      });
      // Full page load so the server renders the app with the new session cookie.
      window.location.assign(HOME_PATH);
    } catch (error) {
      setError("root", {
        message: error instanceof Error ? error.message : "Could not sign in. Please try again.",
      });
    }
  });

  return (
    <form onSubmit={onSubmit} noValidate className="flex flex-col gap-4">
      <TextField
        label="Email"
        type="email"
        autoComplete="username"
        placeholder="name@example.com"
        error={errors.email?.message}
        className="h-12"
        {...register("email")}
      />
      <TextField
        label="Password"
        type={showPassword ? "text" : "password"}
        autoComplete="current-password"
        error={errors.password?.message}
        className="h-12"
        trailing={<PasswordVisibilityToggle visible={showPassword} onToggle={() => setShowPassword((v) => !v)} />}
        {...register("password")}
      />
      {errors.root?.message && <FormMessage tone="error">{errors.root.message}</FormMessage>}
      <Button type="submit" disabled={isSubmitting} className="h-[50px] text-[15px]">
        {isSubmitting ? "Signing in…" : "Sign in"}
      </Button>
    </form>
  );
}
