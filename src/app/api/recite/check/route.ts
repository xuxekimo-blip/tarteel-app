import { NextRequest, NextResponse } from "next/server";
import { getServiceSupabase } from "@/lib/supabase";
import { compareRecitation } from "@/lib/compare-recitation";

export async function POST(req: NextRequest) {
  const form = await req.formData();
  const audio = form.get("audio") as File | null;
  const userId = form.get("userId") as string | null;
  const ayahId = form.get("ayahId") as string | null;

  if (!audio || !userId || !ayahId) {
    return NextResponse.json({ error: "missing_fields" }, { status: 400 });
  }

  // 1. Распознавание речи через Groq Whisper (бесплатный и быстрый вариант старта).
  const whisperForm = new FormData();
  whisperForm.append("file", audio, "recitation.webm");
  whisperForm.append("model", "whisper-large-v3");
  whisperForm.append("language", "ar");

  const whisperRes = await fetch("https://api.groq.com/openai/v1/audio/transcriptions", {
    method: "POST",
    headers: { Authorization: `Bearer ${process.env.GROQ_API_KEY}` },
    body: whisperForm,
  });

  if (!whisperRes.ok) {
    return NextResponse.json({ error: "asr_failed" }, { status: 502 });
  }
  const { text: transcript } = await whisperRes.json();

  // 2. Получаем эталонный текст аята из базы.
  const supabase = getServiceSupabase();
  const { data: ayah, error: ayahErr } = await supabase
    .from("ayahs")
    .select("id, text_simple")
    .eq("id", ayahId)
    .single();

  if (ayahErr || !ayah) {
    return NextResponse.json({ error: "ayah_not_found" }, { status: 404 });
  }

  // 3. Сверяем слово за словом.
  const { results, score } = compareRecitation(ayah.text_simple, transcript);

  // 4. Сохраняем попытку и обновляем прогресс.
  await supabase.from("recitation_attempts").insert({
    user_id: userId,
    ayah_id: ayah.id,
    transcript,
    word_results: results,
    score,
  });

  const { data: progress } = await supabase
    .from("memorization_progress")
    .select("best_score, attempts_count")
    .eq("user_id", userId)
    .eq("ayah_id", ayah.id)
    .maybeSingle();

  await supabase.from("memorization_progress").upsert({
    user_id: userId,
    ayah_id: ayah.id,
    best_score: Math.max(progress?.best_score ?? 0, score),
    attempts_count: (progress?.attempts_count ?? 0) + 1,
    last_attempt_at: new Date().toISOString(),
  });

  return NextResponse.json({ transcript, results, score });
}
