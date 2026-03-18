import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export async function GET(request: NextRequest) {
  try {
    const supabase = createServerSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { searchParams } = new URL(request.url);
    const range = searchParams.get("range") || "7d";

    const daysMap: Record<string, number> = { "24h": 1, "7d": 7, "30d": 30, "90d": 90 };
    const days = daysMap[range] || 7;
    const since = new Date(Date.now() - days * 86400000).toISOString();

    const { data: logs, error } = await supabase
      .from("api_request_logs")
      .select("model, provider, tokens_prompt, tokens_completion, tokens_total, cost, latency_ms, status_code, created_at")
      .eq("user_id", user.id)
      .gte("created_at", since)
      .order("created_at", { ascending: true });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(logs || []);
  } catch (error: unknown) {
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
