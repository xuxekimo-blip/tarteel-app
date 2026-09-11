import { NextResponse } from "next/server";

export async function GET() {
  try {
    const res = await fetch("https://api.alquran.cloud/v1/surah", {
      cache: "no-store",
    });
    if (!res.ok) {
      return NextResponse.json(
        { error: `surahs_fetch_failed_${res.status}` },
        { status: 502 }
      );
    }
    const json = await res.json();
    const surahs = json.data.map((s: any) => ({
      number: s.number,
      name: s.name,
      englishName: s.englishName,
      numberOfAyahs: s.numberOfAyahs,
    }));
    return NextResponse.json({ surahs });
  } catch (err: any) {
    return NextResponse.json(
      { error: `surahs_exception: ${err?.message ?? String(err)}` },
      { status: 500 }
    );
  }
}
