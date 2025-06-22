"use client";

import { cn } from "@/lib/utils";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

export function SignUpForm({
  className,
  ...props
}: React.ComponentPropsWithoutRef<"div">) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [repeatPassword, setRepeatPassword] = useState("");
  const [name, setName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    const supabase = createClient();
    setIsLoading(true);
    setError(null);

    if (password !== repeatPassword) {
      setError("Passwords do not match");
      setIsLoading(false);
      return;
    }

    try {
      // Use NEXT_PUBLIC_SITE_URL if set, otherwise use window.location.origin
      const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || window.location.origin;
      
      const { error, data } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: `${siteUrl}/protected/recipes`,
        },
      });
      
      if (error) {
        // Check if user already exists
        if (error.message.includes("User already registered")) {
          setError("An account with this email already exists. Please login instead.");
          return;
        }
        throw error;
      }
      
      // Check if email is already registered but not confirmed
      if (data.user && data.user.identities && data.user.identities.length === 0) {
        setError("This email is already registered but not confirmed. Please check your email for the confirmation link.");
        return;
      }
      
      // Store the name in localStorage to be saved after email confirmation
      if (data.user && name.trim()) {
        localStorage.setItem('pendingUserName', name.trim());
      }
      
      // For demo account in development, auto-login after signup
      if (process.env.NODE_ENV === 'development' && email === "demo@recipeandme.app" && data.user) {
        // Sign in immediately for demo account
        const { error: signInError, data: signInData } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        
        if (!signInError && signInData?.session) {
          // Use window.location for a hard redirect to ensure cookies are properly set
          window.location.href = "/protected/recipes";
          return;
        }
      }
      
      router.push("/auth/sign-up-success");
    } catch (error: unknown) {
      setError(error instanceof Error ? error.message : "An error occurred");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className={cn("flex flex-col gap-6", className)} {...props}>
      <Card>
        <CardHeader>
          <CardTitle className="text-2xl">Sign up</CardTitle>
          <CardDescription>Create a new account</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSignUp}>
            <div className="flex flex-col gap-6">
              {/* Demo Account Info Banner - Only show in development */}
              {process.env.NODE_ENV === 'development' && (
                <div className="bg-accent/20 border border-accent rounded-lg p-4">
                  <p className="text-sm font-medium mb-2">🎉 Demo Account Available!</p>
                  <p className="text-sm text-muted-foreground mb-3">
                    For testing, you can use these credentials:
                  </p>
                  <div className="bg-background/60 rounded p-3 space-y-1 text-sm font-mono">
                    <p>Email: demo@recipeandme.app</p>
                    <p>Password: DemoRecipes2024!</p>
                  </div>
                  <Button 
                    type="button"
                    variant="secondary" 
                    size="sm" 
                    className="mt-3 w-full"
                    onClick={() => {
                      setEmail("demo@recipeandme.app");
                      setPassword("DemoRecipes2024!");
                      setRepeatPassword("DemoRecipes2024!");
                      setName("Demo User");
                    }}
                  >
                    Fill Demo Credentials
                  </Button>
                </div>
              )}
              <div className="grid gap-2">
                <Label htmlFor="name">Name (optional)</Label>
                <Input
                  id="name"
                  type="text"
                  placeholder="John Doe"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  maxLength={100}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="m@example.com"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
              <div className="grid gap-2">
                <div className="flex items-center">
                  <Label htmlFor="password">Password</Label>
                </div>
                <Input
                  id="password"
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </div>
              <div className="grid gap-2">
                <div className="flex items-center">
                  <Label htmlFor="repeat-password">Repeat Password</Label>
                </div>
                <Input
                  id="repeat-password"
                  type="password"
                  required
                  value={repeatPassword}
                  onChange={(e) => setRepeatPassword(e.target.value)}
                />
              </div>
              {error && <p className="text-sm text-red-500">{error}</p>}
              <Button type="submit" className="w-full" disabled={isLoading}>
                {isLoading ? "Creating an account..." : "Sign up"}
              </Button>
            </div>
            <div className="mt-4 text-center text-sm">
              Already have an account?{" "}
              <Link href="/auth/login" className="underline underline-offset-4">
                Login
              </Link>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
