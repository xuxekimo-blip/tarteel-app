import { NextRequest, NextResponse } from "next/server";
import { getServiceSupabase } from "@/lib/supabase";

export async function GET(req: NextRequest) {
  try {
    const userId = req.nextUrl.searchParams.get("userId");

    if (!userId) {
      return NextResponse.json(
        { error: "missing_user_id" },
        { status: 400 }
      );
    }

    const supabase = getServiceSupabase();

    const { data, error } = await supabase
      .from("memorization_progress")
      .select("ayah_id, best_score, attempts_count, last_attempt_at")
      .eq("user_id", userId);

    if (error) {
      return NextResponse.json(
        {
          error: `progress_fetch_failed: ${error.message}`,
        },
        { status: 500 }
      );
    }

    const rows = data ?? [];

    const ayahsChecked = rows.length;

    const totalAttempts = rows.reduce(
      (sum, row) => sum + (row.attempts_count ?? 0),
      0
    );

    const averageScore =
      rows.length > 0
        ? rows.reduce(
            (sum, row) => sum + Number(row.best_score ?? 0),
            0
          ) / rows.length
        : 0;

    const bestScore =
      rows.length > 0
        ? Math.max(
            ...rows.map((row) => Number(row.best_score ?? 0))
          )
        : 0;

    return NextResponse.json({
      ayahsChecked,
      totalAttempts,
      averageScore,
      bestScore,
    });
  } catch (err: any) {
    return NextResponse.json(
      {
        error: `progress_exception: ${
          err?.message ?? String(err)
        }`,
      },
      { status: 500 }
    );
  }
}
