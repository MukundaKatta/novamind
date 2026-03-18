import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export async function GET(request: NextRequest) {
  try {
    const supabase = createServerSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { searchParams } = new URL(request.url);
    const scope = searchParams.get("scope") || "mine";

    let query = supabase.from("prompt_templates").select("*");

    if (scope === "public") {
      query = query.eq("is_public", true).order("use_count", { ascending: false });
    } else {
      query = query.eq("user_id", user.id).order("updated_at", { ascending: false });
    }

    const { data, error } = await query.limit(100);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(data || []);
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
    const { title, description, content, tags, category, is_public, workspace_id } = body;

    if (!title || !content) {
      return NextResponse.json({ error: "Title and content are required" }, { status: 400 });
    }

    const { data, error } = await supabase
      .from("prompt_templates")
      .insert({
        user_id: user.id,
        title,
        description: description || null,
        content,
        tags: tags || [],
        category: category || null,
        is_public: is_public || false,
        workspace_id: workspace_id || null,
      })
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json(data);
  } catch (error: unknown) {
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
