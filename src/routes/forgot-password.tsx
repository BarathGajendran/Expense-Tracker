import { createFileRoute, Link } from "@tanstack/react-router";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useState } from "react";
import { Loader2, MailCheck } from "lucide-react";
import { AuthLayout } from "@/components/auth-layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { authService } from "@/services/auth";
import { toast } from "sonner";

const schema = z.object({ email: z.string().trim().email("Enter a valid email") });
type FormVals = z.infer<typeof schema>;

export const Route = createFileRoute("/forgot-password")({ component: ForgotPage });

function ForgotPage() {
  const [sent, setSent] = useState(false);
  const [resetSuccess, setResetSuccess] = useState(false);
  const [resetError, setResetError] = useState("");
  const [resetting, setResetting] = useState(false);
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const { register, handleSubmit, formState: { errors, isSubmitting }, getValues } = useForm<FormVals>({
    resolver: zodResolver(schema), defaultValues: { email: "" },
  });

  const onSubmit = async (v: FormVals) => {
    try {
      await authService.forgotPassword(v.email);
      setSent(true);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to send reset link");
    }
  };

  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setResetError("");
    if (newPassword.length < 6) {
      setResetError("Password must be at least 6 characters.");
      return;
    }
    if (newPassword !== confirmPassword) {
      setResetError("Passwords do not match.");
      return;
    }
    setResetting(true);
    try {
      await authService.resetPasswordDirectly(getValues("email"), newPassword);
      setResetSuccess(true);
      toast.success("Password reset successfully!");
    } catch (err) {
      setResetError(err instanceof Error ? err.message : "Reset failed");
    } finally {
      setResetting(false);
    }
  };

  return (
    <AuthLayout
      title="Reset your password"
      subtitle="We'll email you a secure reset link"
      footer={<>Back to <Link to="/login" className="font-semibold text-primary hover:underline">Sign in</Link></>}
    >
      {sent ? (
        <div className="space-y-6 animate-fade-in">
          <div className="text-center">
            <div className="mx-auto grid h-12 w-12 place-items-center rounded-full bg-secondary/20 text-secondary-foreground">
              <MailCheck className="h-5 w-5" />
            </div>
            <p className="mt-4 font-medium">Check your inbox</p>
            <p className="mt-1 text-sm text-muted-foreground">If an account exists for <span className="font-medium text-foreground">{getValues("email")}</span>, you&apos;ll receive a reset link shortly.</p>
          </div>

          {!resetSuccess ? (
            <div className="glass border border-primary/20 bg-primary/5 rounded-2xl p-5 text-left space-y-4">
              <div>
                <p className="font-semibold text-sm text-primary flex items-center gap-1">🔧 Demo Mode Helper</p>
                <p className="text-xs text-muted-foreground">Since this is a client-side demo and cannot send real emails, you can set your new password directly below:</p>
              </div>

              <form onSubmit={handleReset} className="space-y-3">
                <div className="space-y-1">
                  <Label htmlFor="new-password">New Password</Label>
                  <Input 
                    id="new-password" 
                    type="password" 
                    placeholder="••••••••" 
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="confirm-password">Confirm Password</Label>
                  <Input 
                    id="confirm-password" 
                    type="password" 
                    placeholder="••••••••" 
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                  />
                </div>
                {resetError && <p className="text-xs text-destructive">{resetError}</p>}
                <Button type="submit" className="w-full gradient-primary text-white" disabled={resetting}>
                  {resetting ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Resetting...</> : "Reset Password Now"}
                </Button>
              </form>
            </div>
          ) : (
            <div className="glass border border-secondary/20 bg-secondary/5 rounded-2xl p-5 text-center space-y-2">
              <p className="font-semibold text-sm text-secondary-foreground">✅ Password Updated Successfully!</p>
              <p className="text-xs text-muted-foreground">Your mock database password has been updated. You can now go back to sign in.</p>
              <Link to="/login" className="inline-block mt-2 text-xs font-semibold text-primary hover:underline">Go to Sign In</Link>
            </div>
          )}
        </div>
      ) : (
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input id="email" type="email" {...register("email")} placeholder="you@example.com" />
            {errors.email && <p className="text-xs text-destructive">{errors.email.message}</p>}
          </div>
          <Button type="submit" className="w-full gradient-primary text-white" disabled={isSubmitting}>
            {isSubmitting ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Sending...</> : "Send reset link"}
          </Button>
        </form>
      )}
    </AuthLayout>
  );
}
