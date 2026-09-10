import crypto from "crypto";

/**
 * Проверяет initData, которую Telegram Mini App присылает при открытии.
 * НИКОГДА не доверяй данным пользователя, пока подпись не проверена здесь,
 * на сервере — клиент можно подделать, секретный ключ бота на клиенте нет.
 * Документация: https://core.telegram.org/bots/webapps#validating-data-received-via-the-mini-app
 */
export function verifyTelegramInitData(initData: string, botToken: string) {
  const params = new URLSearchParams(initData);
  const hash = params.get("hash");
  if (!hash) return null;

  params.delete("hash");
  const dataCheckString = [...params.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([k, v]) => `${k}=${v}`)
    .join("\n");

  const secretKey = crypto.createHmac("sha256", "WebAppData").update(botToken).digest();
  const computedHash = crypto.createHmac("sha256", secretKey).update(dataCheckString).digest("hex");

  if (computedHash !== hash) return null;

  const userRaw = params.get("user");
  if (!userRaw) return null;

  const user = JSON.parse(userRaw) as {
    id: number;
    first_name: string;
    username?: string;
  };

  return user;
}
