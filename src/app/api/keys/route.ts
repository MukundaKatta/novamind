import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { generateApiKey, hashApiKeySecure } from "@/lib/utils/api-keys";
import { nanoid } from "nanoid";

export async function GET() {
  try {
    const supabase = createServerSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { data: keys } = await supabase
      .from("api_keys")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });

    return NextResponse.json(keys || []);
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
    const {
      name,
      rate_limit_rpm = 60,
      rate_limit_rpd = 1000,
      rate_limit_tpm = 100000,
      workspace_id,
      allowed_models = [],
      expires_at,
    } = body;

    if (!name) {
      return NextResponse.json({ error: "Name is required" }, { status: 400 });
    }

    // Generate API key
    const rawKey = `nm_live_${nanoid(40)}`;
    const prefix = rawKey.substring(0, 12);
    const keyHash = await hashApiKeySecure(rawKey);

    const { data: apiKey, error } = await supabase
      .from("api_keys")
      .insert({
        user_id: user.id,
        workspace_id: workspace_id || null,
        name,
        key_hash: keyHash,
        key_prefix: prefix,
        rate_limit_rpm,
        rate_limit_rpd,
        rate_limit_tpm,
        allowed_models,
        expires_at: expires_at || null,
      })
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    // Return the key only once - it won't be shown again
    return NextResponse.json({
      ...apiKey,
      key: rawKey,
    });
  } catch (error: unknown) {
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const supabase = createServerSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");
    if (!id) return NextResponse.json({ error: "ID required" }, { status: 400 });

    await supabase.from("api_keys").delete().eq("id", id).eq("user_id", user.id);

    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
