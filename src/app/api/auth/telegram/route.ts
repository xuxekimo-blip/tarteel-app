import { NextRequest, NextResponse } from "next/server";
import { verifyTelegramInitData } from "@/lib/telegram-auth";
import { getServiceSupabase } from "@/lib/supabase";

export async function POST(req: NextRequest) {
  const { initData } = await req.json();

  const tgUser = verifyTelegramInitData(initData, process.env.TELEGRAM_BOT_TOKEN!);
  if (!tgUser) {
    return NextResponse.json({ error: "invalid_signature" }, { status: 401 });
  }

  const supabase = getServiceSupabase();

  const { data: existing } = await supabase
    .from("users")
    .select("id")
    .eq("telegram_id", tgUser.id)
    .maybeSingle();

  let userId = existing?.id;
  if (!userId) {
    const { data: created, error } = await supabase
      .from("users")
      .insert({ telegram_id: tgUser.id, first_name: tgUser.first_name, username: tgUser.username })
      .select("id")
      .single();
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    userId = created.id;
  }

  // В прод-версии выдать подписанную сессионную cookie/JWT вместо голого userId.
  return NextResponse.json({ userId });
}
