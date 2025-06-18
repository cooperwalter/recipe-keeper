import { EnvVarWarning } from "@/components/env-var-warning";
import { AuthButton } from "@/components/auth-button";
import { ThemeSwitcher } from "@/components/theme-switcher";
import { hasEnvVars } from "@/lib/utils";
import Link from "next/link";
import { ChefHat } from "lucide-react";
import { ProfileNameHandler } from "@/components/profile/profile-name-handler";

export default function ProtectedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <main className="min-h-screen flex flex-col items-center">
      <ProfileNameHandler />
      <div className="flex-1 w-full flex flex-col gap-20 items-center">
        <nav className="w-full flex justify-center border-b border-b-foreground/10 h-16">
          <div className="w-full max-w-5xl flex justify-between items-center p-3 px-4 sm:px-5 text-sm">
            <div className="flex gap-3 sm:gap-5 items-center">
              <Link href={"/"} className="font-bold text-lg sm:text-base">Recipe Keeper</Link>
              <div className="h-5 w-px bg-border" />
              <Link 
                href={"/protected/recipes"} 
                className="text-sm font-normal text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1.5"
              >
                <ChefHat className="h-4 w-4" />
                My Recipes
              </Link>
            </div>
            <div className="flex items-center gap-2">
              <ThemeSwitcher />
              {!hasEnvVars ? <EnvVarWarning /> : <AuthButton />}
            </div>
          </div>
        </nav>
        <div className="flex-1 flex flex-col gap-12 sm:gap-20 max-w-5xl p-4 sm:p-5 w-full">
          {children}
        </div>
      </div>
    </main>
  );
}
