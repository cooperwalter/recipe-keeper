"use client";

import { cn } from "@/lib/utils";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { ButtonLoading } from "@/components/ui/loading-states";
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

export function LoginForm({
  className,
  ...props
}: React.ComponentPropsWithoutRef<"div">) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    const supabase = createClient();
    setIsLoading(true);
    setError(null);

    try {
      const { error, data } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      if (error) throw error;
      
      // Ensure we have a valid session
      if (data?.session) {
        // Use window.location for a hard redirect to ensure cookies are properly set
        window.location.href = "/protected/recipes";
      } else {
        // Fallback to router.push if no session (shouldn't happen)
        router.push("/protected/recipes");
      }
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
          <CardTitle className="text-2xl">Login</CardTitle>
          <CardDescription>
            Enter your email below to login to your account
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleLogin}>
            <div className="flex flex-col gap-6">
              {/* Demo Account Info Banner - Only show in development */}
              {process.env.NODE_ENV === 'development' && (
                <div className="bg-accent/20 border border-accent rounded-lg p-4">
                  <p className="text-sm font-medium mb-2">🎉 Demo Account Available!</p>
                  <p className="text-sm text-muted-foreground mb-3">
                    Try Recipe and Me with our demo account:
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
                    }}
                  >
                    Fill Demo Credentials
                  </Button>
                </div>
              )}
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
                  <Link
                    href="/auth/forgot-password"
                    className="ml-auto inline-block text-sm underline-offset-4 hover:underline"
                  >
                    Forgot your password?
                  </Link>
                </div>
                <Input
                  id="password"
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </div>
              {error && <p className="text-sm text-red-500">{error}</p>}
              <Button type="submit" className="w-full" disabled={isLoading}>
                <ButtonLoading isLoading={isLoading} loadingText="Logging in...">
                  Login
                </ButtonLoading>
              </Button>
            </div>
            <div className="mt-4 text-center text-sm">
              Don&apos;t have an account?{" "}
              <Link
                href="/auth/sign-up"
                className="underline underline-offset-4"
              >
                Sign up
              </Link>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
