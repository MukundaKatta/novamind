import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export async function GET() {
  try {
    const supabase = createServerSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { data: workspaces } = await supabase
      .from("workspaces")
      .select(`
        *,
        workspace_members(count)
      `)
      .order("created_at", { ascending: true });

    return NextResponse.json(workspaces || []);
  } catch (error: unknown) {
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = createServerSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await request.json();
    const { name, description } = body;

    if (!name) {
      return NextResponse.json({ error: "Name is required" }, { status: 400 });
    }

    const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

    const { data: workspace, error } = await supabase
      .from("workspaces")
      .insert({
        name,
        slug: `${slug}-${Date.now().toString(36)}`,
        description: description || null,
        owner_id: user.id,
      })
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    // Add owner as admin
    await supabase.from("workspace_members").insert({
      workspace_id: workspace.id,
      user_id: user.id,
      role: "admin",
    });

    return NextResponse.json(workspace);
  } catch (error: unknown) {
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
