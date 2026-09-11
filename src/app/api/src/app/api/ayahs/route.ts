import { NextRequest, NextResponse } from "next/server";
import { getServiceSupabase } from "@/lib/supabase";

export async function GET(req: NextRequest) {
  try {
    const surah = req.nextUrl.searchParams.get("surah");
    const ayah = req.nextUrl.searchParams.get("ayah");

    if (!surah) {
      return NextResponse.json({ error: "missing_params" }, { status: 400 });
    }

    const supabase = getServiceSupabase();

    if (ayah) {
      const { data, error } = await supabase
        .from("ayahs")
        .select("id, surah_number, ayah_number, text_uthmani, text_simple")
        .eq("surah_number", surah)
        .eq("ayah_number", ayah)
        .single();

      if (error || !data) {
        return NextResponse.json({ error: "ayah_not_found" }, { status: 404 });
      }
      return NextResponse.json({ ayah: data });
    }

    const { data, error } = await supabase
      .from("ayahs")
      .select("id, surah_number, ayah_number, text_simple")
      .eq("surah_number", surah)
      .order("ayah_number", { ascending: true });

    if (error) {
      return NextResponse.json({ error: `fetch_failed: ${error.message}` }, { status: 500 });
    }

    return NextResponse.json({ ayahs: data });
  } catch (err: any) {
    return NextResponse.json(
      { error: `ayahs_exception: ${err?.message ?? String(err)}` },
      { status: 500 }
    );
  }
}
