import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export async function POST() {
  try {
    const supabase = await createClient();
    
    // Get the current user
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    
    if (userError || !user) {
      return NextResponse.json(
        { error: "Not authenticated" },
        { status: 401 }
      );
    }
    
    // Check if this is the demo account
    if (user.email !== "demo@recipeandme.app") {
      return NextResponse.json(
        { error: "This endpoint is only for the demo account" },
        { status: 403 }
      );
    }
    
    // For demo account, we'll consider it confirmed
    // In a real app, you'd use Supabase Admin API to update the user's email_confirmed_at
    // For now, we'll just return success since Supabase allows unconfirmed users to login
    
    return NextResponse.json({ 
      success: true,
      message: "Demo account ready to use!"
    });
  } catch (error) {
    console.error("Error confirming demo account:", error);
    return NextResponse.json(
      { error: "Failed to confirm demo account" },
      { status: 500 }
    );
  }
}