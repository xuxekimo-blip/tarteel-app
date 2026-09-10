import { createClient } from "@supabase/supabase-js";

// Используется только на сервере (в API route) — service_role key
// обходит row-level-security, поэтому сервер сам отвечает за то,
// чтобы отдавать пользователю только его собственные записи.
export function getServiceSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}
