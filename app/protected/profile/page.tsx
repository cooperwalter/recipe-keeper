import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { User, Calendar, BookOpen, Heart } from "lucide-react";
import Link from "next/link";

export default async function ProfilePage() {
  const supabase = await createClient();
  
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) {
    redirect("/auth/login");
  }

  // Get user's recipe statistics
  const { count: recipeCount } = await supabase
    .from("recipes")
    .select("*", { count: "exact", head: true })
    .eq("created_by", user.id);

  const { count: favoriteCount } = await supabase
    .from("favorites")
    .select("*", { count: "exact", head: true })
    .eq("user_id", user.id);

  const memberSince = new Date(user.created_at).toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric"
  });

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <h1 className="text-3xl font-bold">My Profile</h1>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Account Information */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="h-5 w-5" />
              Account Information
            </CardTitle>
            <CardDescription>Your account details</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <p className="text-sm text-muted-foreground">Email</p>
              <p className="font-medium">{user.email}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Member Since</p>
              <p className="font-medium flex items-center gap-2">
                <Calendar className="h-4 w-4" />
                {memberSince}
              </p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">User ID</p>
              <p className="font-mono text-xs text-muted-foreground">{user.id}</p>
            </div>
          </CardContent>
        </Card>

        {/* Recipe Statistics */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BookOpen className="h-5 w-5" />
              Recipe Statistics
            </CardTitle>
            <CardDescription>Your recipe collection overview</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex justify-between items-center">
              <p className="text-sm text-muted-foreground">Total Recipes</p>
              <p className="text-2xl font-bold">{recipeCount || 0}</p>
            </div>
            <div className="flex justify-between items-center">
              <p className="text-sm text-muted-foreground">Favorite Recipes</p>
              <p className="text-2xl font-bold flex items-center gap-2">
                <Heart className="h-5 w-5 text-red-500" />
                {favoriteCount || 0}
              </p>
            </div>
            <div className="pt-4">
              <Link href="/protected/recipes">
                <Button variant="outline" className="w-full">
                  View My Recipes
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Account Actions */}
      <Card>
        <CardHeader>
          <CardTitle>Account Actions</CardTitle>
          <CardDescription>Manage your account settings</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Link href="/auth/update-password">
            <Button variant="outline" className="w-full sm:w-auto">
              Update Password
            </Button>
          </Link>
          <p className="text-sm text-muted-foreground">
            Need to change your email or delete your account? Please contact support.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}