import { AuthButton } from "@/components/auth-button";
import { ThemeSwitcher } from "@/components/theme-switcher";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ChefHat, BookOpen, Heart, Users, Search, Camera, Mic, Scale, FileText, Link2, History } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { db } from "@/lib/db";
import { userProfiles } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { SiteLogo } from "@/components/navigation/site-logo";

export default async function Home() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  
  let userName = null;
  if (user) {
    const [profile] = await db
      .select()
      .from(userProfiles)
      .where(eq(userProfiles.userId, user.id))
      .limit(1);
    userName = profile?.name;
  }
  
  return (
    <main className="min-h-screen flex flex-col">
      {/* Navigation */}
      <nav className="w-full flex justify-center border-b border-b-foreground/10 h-16">
        <div className="w-full max-w-7xl flex justify-between items-center p-3 px-5">
          <SiteLogo />
          <div className="flex items-center gap-2 sm:gap-4">
            {user && (
              <Link href="/protected/recipes">
                <Button variant="outline" size="sm" className="gap-1.5">
                  <ChefHat className="h-4 w-4" />
                  My Recipes
                </Button>
              </Link>
            )}
            <ThemeSwitcher />
            <AuthButton />
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="flex-1 flex flex-col items-center justify-center px-5 py-20">
        <div className="max-w-4xl text-center space-y-6">
          <h1 className="text-4xl sm:text-5xl md:text-6xl font-bold tracking-tight">
            {userName ? (
              <>
                Welcome back, {userName}!
                <span className="text-primary block mt-2">Your Culinary Heritage Awaits</span>
              </>
            ) : (
              <>
                Preserve & Create Your Family&apos;s
                <span className="text-primary block mt-2">Culinary Heritage</span>
              </>
            )}
          </h1>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Keep your treasured family recipes safe, organized, and accessible for generations to come. 
            Create new traditions with your own recipes that will become tomorrow&apos;s family favorites.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center pt-4">
            <Link href={user ? "/protected/recipes" : "/auth/sign-up"}>
              <Button size="lg" className="gap-2 w-full sm:w-auto bg-primary text-primary-foreground hover:bg-primary/90">
                <BookOpen className="h-5 w-5" />
                {user ? "Go to Your Collection" : "Start Your Collection"}
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 px-5 bg-secondary/30">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-3xl font-bold text-center mb-12">
            Everything You Need to Preserve Family Recipes and Create Your Own
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8">
            <FeatureCard
              icon={<Camera className="h-8 w-8" />}
              title="Recipe Scanning"
              description="Snap a photo of handwritten cards or recipe books and our AI instantly converts them to digital format."
            />
            <FeatureCard
              icon={<Mic className="h-8 w-8" />}
              title="Voice Recording"
              description="Record recipes verbally or modify them with voice commands using AI transcription."
            />
            <FeatureCard
              icon={<Link2 className="h-8 w-8" />}
              title="Import from URLs"
              description="Automatically extract recipes from any website and add them to your collection."
            />
            <FeatureCard
              icon={<Heart className="h-8 w-8" />}
              title="Family Memories"
              description="Attach notes, stories, and memories to each recipe to preserve the history behind the dish."
            />
            <FeatureCard
              icon={<Scale className="h-8 w-8" />}
              title="Smart Scaling"
              description="Adjust servings with intelligent ingredient scaling and save custom adjustments."
            />
            <FeatureCard
              icon={<History className="h-8 w-8" />}
              title="Version History"
              description="Track recipe changes over time with full version comparison and restoration."
            />
            <FeatureCard
              icon={<FileText className="h-8 w-8" />}
              title="Print-Ready Cards"
              description="Generate beautiful recipe cards optimized for printing and sharing offline."
            />
            <FeatureCard
              icon={<Users className="h-8 w-8" />}
              title="Share with Family"
              description="Easily share recipes with family members and collaborate on your collection together."
            />
            <FeatureCard
              icon={<Search className="h-8 w-8" />}
              title="Smart Search & Filters"
              description="Find recipes by name, category, dietary preferences, or cooking time with advanced filters."
              comingSoon
            />
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 px-5 bg-accent/20">
        <div className="max-w-4xl mx-auto text-center space-y-8">
          <h2 className="text-3xl md:text-4xl font-bold">
            Start Building Your Family&apos;s Culinary Legacy Today
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Join thousands of families who are preserving cherished recipes and creating new ones to pass down through generations.
          </p>
          <div className="pt-4">
            <Link href={user ? "/protected/recipes" : "/auth/sign-up"}>
              <Button size="lg" className="gap-2 bg-primary text-primary-foreground hover:bg-primary/90 px-8 py-6 text-lg">
                <BookOpen className="h-5 w-5" />
                {user ? "Go to Your Collection" : "Create Your Free Account"}
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="w-full border-t py-8">
        <div className="max-w-7xl mx-auto px-5 flex flex-col md:flex-row justify-between items-center gap-6 md:gap-4">
          <div className="flex items-center gap-2">
            <ChefHat className="h-5 w-5 text-primary" />
            <span className="font-semibold">Recipe and Me</span>
            <span className="text-muted-foreground">© {new Date().getFullYear()}</span>
          </div>
          <div className="flex flex-wrap justify-center gap-4 sm:gap-6 text-sm text-muted-foreground">
            <Link href="/privacy" className="hover:text-primary transition-colors">
              Privacy
            </Link>
            <Link href="/terms" className="hover:text-primary transition-colors">
              Terms
            </Link>
            <Link href="/contact" className="hover:text-primary transition-colors">
              Contact
            </Link>
          </div>
        </div>
      </footer>
    </main>
  );
}

function FeatureCard({ 
  icon, 
  title, 
  description,
  comingSoon = false
}: { 
  icon: React.ReactNode; 
  title: string; 
  description: string;
  comingSoon?: boolean;
}) {
  return (
    <div className="relative flex flex-col items-center text-center space-y-3 p-6 rounded-xl bg-card border border-border/50 shadow-sm hover:shadow-md transition-shadow">
      {comingSoon && (
        <div className="absolute top-2 right-2 bg-primary text-primary-foreground text-xs font-semibold px-2 py-1 rounded-full">
          Coming Soon
        </div>
      )}
      <div className="text-primary">{icon}</div>
      <h3 className="text-xl font-semibold">{title}</h3>
      <p className="text-muted-foreground">{description}</p>
    </div>
  );
}