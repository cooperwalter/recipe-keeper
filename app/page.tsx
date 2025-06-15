import { AuthButton } from "@/components/auth-button";
import { ThemeSwitcher } from "@/components/theme-switcher";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ChefHat, BookOpen, Heart, Users, Clock, Search } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

export default async function Home() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  
  // Redirect logged-in users to their recipes
  if (user) {
    redirect('/protected/recipes');
  }
  return (
    <main className="min-h-screen flex flex-col">
      {/* Navigation */}
      <nav className="w-full flex justify-center border-b border-b-foreground/10 h-16">
        <div className="w-full max-w-7xl flex justify-between items-center p-3 px-5">
          <div className="flex gap-2 items-center">
            <ChefHat className="h-6 w-6 text-primary" />
            <Link href="/" className="font-bold text-xl">
              Recipe Keeper
            </Link>
          </div>
          <div className="flex items-center gap-2 sm:gap-4">
            <ThemeSwitcher />
            <AuthButton />
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="flex-1 flex flex-col items-center justify-center px-5 py-20">
        <div className="max-w-4xl text-center space-y-6">
          <h1 className="text-4xl sm:text-5xl md:text-6xl font-bold tracking-tight">
            Preserve Your Family&apos;s
            <span className="text-primary block mt-2">Culinary Heritage</span>
          </h1>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Keep your treasured family recipes safe, organized, and accessible for generations to come. 
            Never lose Grandma&apos;s secret cookie recipe again.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center pt-4">
            <Link href="/auth/sign-up">
              <Button size="lg" className="gap-2 w-full sm:w-auto bg-primary text-primary-foreground hover:bg-primary/90">
                <BookOpen className="h-5 w-5" />
                Start Your Collection
              </Button>
            </Link>
            <Link href="/protected/recipes">
              <Button size="lg" variant="outline" className="gap-2 w-full sm:w-auto">
                <Search className="h-5 w-5" />
                Browse Recipes
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 px-5 bg-secondary/30">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-3xl font-bold text-center mb-12">
            Everything You Need to Preserve Family Recipes
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8">
            <FeatureCard
              icon={<BookOpen className="h-8 w-8" />}
              title="Digital Recipe Cards"
              description="Convert handwritten recipes into beautiful, searchable digital cards with photos and stories."
            />
            <FeatureCard
              icon={<Heart className="h-8 w-8" />}
              title="Family Memories"
              description="Attach notes, stories, and memories to each recipe to preserve the history behind the dish."
            />
            <FeatureCard
              icon={<Users className="h-8 w-8" />}
              title="Share with Family"
              description="Easily share recipes with family members and collaborate on your collection together."
            />
            <FeatureCard
              icon={<Search className="h-8 w-8" />}
              title="Smart Search"
              description="Find recipes quickly by name, ingredient, category, or even by who contributed them."
            />
            <FeatureCard
              icon={<Clock className="h-8 w-8" />}
              title="Version History"
              description="Track recipe modifications over time and see how family recipes evolve through generations."
            />
            <FeatureCard
              icon={<ChefHat className="h-8 w-8" />}
              title="Cook Mode"
              description="A clean, easy-to-read view perfect for cooking, with ingredient scaling and timers."
            />
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 px-5 bg-accent/20">
        <div className="max-w-4xl mx-auto text-center space-y-8">
          <h2 className="text-3xl md:text-4xl font-bold">
            Start Preserving Your Family&apos;s Culinary Legacy Today
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Join thousands of families who are safeguarding their treasured recipes for future generations.
          </p>
          <div className="pt-4">
            <Link href="/auth/sign-up">
              <Button size="lg" className="gap-2 bg-primary text-primary-foreground hover:bg-primary/90 px-8 py-6 text-lg">
                <BookOpen className="h-5 w-5" />
                Create Your Free Account
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
            <span className="font-semibold">Recipe Keeper</span>
            <span className="text-muted-foreground">© 2024</span>
          </div>
          <div className="flex flex-wrap justify-center gap-4 sm:gap-6 text-sm text-muted-foreground">
            <Link href="/about" className="hover:text-primary transition-colors">
              About
            </Link>
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
  description 
}: { 
  icon: React.ReactNode; 
  title: string; 
  description: string;
}) {
  return (
    <div className="flex flex-col items-center text-center space-y-3 p-6 rounded-xl bg-card border border-border/50 shadow-sm hover:shadow-md transition-shadow">
      <div className="text-primary">{icon}</div>
      <h3 className="text-xl font-semibold">{title}</h3>
      <p className="text-muted-foreground">{description}</p>
    </div>
  );
}