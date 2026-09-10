// Заполняет таблицу `ayahs` полным текстом Корана (6236 аятов).
// Источник: api.alquran.cloud — бесплатный публичный API.

const fs = require("fs");
const path = require("path");

function loadEnvLocal() {
  const envPath = path.join(__dirname, "..", ".env.local");
  if (!fs.existsSync(envPath)) return;
  const lines = fs.readFileSync(envPath, "utf8").split("\n");
  for (const line of lines) {
    const match = line.match(/^([A-Z0-9_]+)=(.*)$/);
    if (match) process.env[match[1]] = match[2].trim();
  }
}
loadEnvLocal();

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SERVICE_KEY) {
  console.error("Не найдены NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY в .env.local");
  process.exit(1);
}

async function fetchEdition(edition) {
  const res = await fetch(`https://api.alquran.cloud/v1/quran/${edition}`);
  if (!res.ok) throw new Error(`Не удалось загрузить издание ${edition}: ${res.status}`);
  const json = await res.json();
  return json.data.surahs;
}

async function main() {
  console.log("Загружаю текст с огласовками (quran-uthmani)...");
  const uthmani = await fetchEdition("quran-uthmani");

  console.log("Загружаю текст без огласовок (quran-simple)...");
  const simple = await fetchEdition("quran-simple");

  const rows = [];
  for (let s = 0; s < uthmani.length; s++) {
    const surahNumber = uthmani[s].number;
    const ayahsU = uthmani[s].ayahs;
    const ayahsS = simple[s].ayahs;
    for (let a = 0; a < ayahsU.length; a++) {
      rows.push({
        surah_number: surahNumber,
        ayah_number: ayahsU[a].numberInSurah,
        text_uthmani: ayahsU[a].text,
        text_simple: ayahsS[a].text,
      });
    }
  }

  console.log(`Собрано ${rows.length} аятов. Загружаю в Supabase пачками...`);

  const BATCH_SIZE = 500;
  for (let i = 0; i < rows.length; i += BATCH_SIZE) {
    const batch = rows.slice(i, i + BATCH_SIZE);
    const res = await fetch(`${SUPABASE_URL}/rest/v1/ayahs?on_conflict=surah_number,ayah_number`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        apikey: SERVICE_KEY,
        Authorization: `Bearer ${SERVICE_KEY}`,
        Prefer: "resolution=merge-duplicates",
      },
      body: JSON.stringify(batch),
    });
    if (!res.ok) {
      const text = await res.text();
      throw new Error(`Ошибка вставки пачки ${i}-${i + batch.length}: ${res.status} ${text}`);
    }
    console.log(`  ...загружено ${Math.min(i + BATCH_SIZE, rows.length)} / ${rows.length}`);
  }

  console.log("Готово! Весь текст Корана загружен в таблицу ayahs.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
