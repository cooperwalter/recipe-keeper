import Link from "next/link";
import { ChefHat } from "lucide-react";

export default function AboutPage() {
  return (
    <main className="min-h-screen flex flex-col">
      <nav className="w-full flex justify-center border-b border-b-foreground/10 h-16">
        <div className="w-full max-w-7xl flex justify-between items-center p-3 px-5">
          <Link href="/" className="flex gap-2 items-center">
            <ChefHat className="h-6 w-6 text-primary" />
            <span className="font-bold text-xl">Recipe Keeper</span>
          </Link>
        </div>
      </nav>
      
      <div className="flex-1 flex flex-col items-center justify-center px-5 py-20">
        <div className="max-w-2xl text-center space-y-6">
          <h1 className="text-4xl font-bold">About Recipe Keeper</h1>
          <p className="text-lg text-muted-foreground">
            Recipe Keeper is a family recipe preservation platform that helps you capture, digitize, and share 
            cherished family recipes across generations. Our mission is to ensure that no family recipe is ever lost.
          </p>
          <Link href="/" className="text-primary hover:underline">
            Back to Home
          </Link>
        </div>
      </div>
    </main>
  );
}