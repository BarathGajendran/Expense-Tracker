import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { AuthLayout } from "@/components/auth-layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { useAuth } from "@/store/auth";

const schema = z.object({
  name: z.string().trim().min(2, "Enter your name").max(80),
  email: z.string().trim().email("Enter a valid email"),
  password: z.string().min(6, "Min 6 characters").max(72),
  confirm: z.string(),
  terms: z.boolean().refine((v) => v === true, { message: "You must accept the terms" }),
}).refine((v) => v.password === v.confirm, { path: ["confirm"], message: "Passwords don't match" });
type FormVals = z.infer<typeof schema>;

export const Route = createFileRoute("/signup")({ component: SignupPage });

function SignupPage() {
  const { signup } = useAuth();
  const navigate = useNavigate();
  const { register, handleSubmit, setValue, watch, formState: { errors, isSubmitting } } = useForm<FormVals>({
    resolver: zodResolver(schema),
    defaultValues: { name: "", email: "", password: "", confirm: "", terms: false },
  });

  const onSubmit = async (v: FormVals) => {
    try {
      await signup(v.name, v.email, v.password);
      toast.success("Account created");
      navigate({ to: "/dashboard" });
    } catch (e) { toast.error((e as Error).message); }
  };

  return (
    <AuthLayout
      title="Create your account"
      subtitle="Start tracking smarter in seconds"
      footer={<>Already have an account? <Link to="/login" className="font-semibold text-primary hover:underline">Sign in</Link></>}
    >
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="name">Full name</Label>
          <Input id="name" {...register("name")} placeholder="Enter your Name" />
          {errors.name && <p className="text-xs text-destructive">{errors.name.message}</p>}
        </div>
        <div className="space-y-2">
          <Label htmlFor="email">Email</Label>
          <Input id="email" type="email" {...register("email")} placeholder="you@example.com" />
          {errors.email && <p className="text-xs text-destructive">{errors.email.message}</p>}
        </div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="password">Password</Label>
            <Input id="password" type="password" {...register("password")} placeholder="••••••••" />
            {errors.password && <p className="text-xs text-destructive">{errors.password.message}</p>}
          </div>
          <div className="space-y-2">
            <Label htmlFor="confirm">Confirm</Label>
            <Input id="confirm" type="password" {...register("confirm")} placeholder="••••••••" />
            {errors.confirm && <p className="text-xs text-destructive">{errors.confirm.message}</p>}
          </div>
        </div>
        <label className="flex items-start gap-2 text-sm">
          <Checkbox
            checked={watch("terms")}
            onCheckedChange={(c) => setValue("terms", c === true, { shouldValidate: true })}
            className="mt-0.5"
          />
          <span>I agree to the <a className="text-primary hover:underline" href="#">Terms</a> and <a className="text-primary hover:underline" href="#">Privacy Policy</a>.</span>
        </label>
        {errors.terms && <p className="text-xs text-destructive">{errors.terms.message}</p>}
        <Button type="submit" className="w-full gradient-primary text-white hover:opacity-95" disabled={isSubmitting}>
          {isSubmitting ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Creating...</> : "Create account"}
        </Button>
      </form>
    </AuthLayout>
  );
}
