const REDIS_URL =
  process.env.REDIS_URL ?? process.env.UPSTASH_REDIS_REST_URL;
const REDIS_TOKEN =
  process.env.REDIS_TOKEN ?? process.env.UPSTASH_REDIS_REST_TOKEN;

interface UpstashResponse<T> {
  result: T;
}

interface WrappedRedisValue<T> {
  value: T;
}

function assertRedisConfigured() {
  if (!REDIS_URL || !REDIS_TOKEN) {
    throw new Error(
      "Redis is not configured. Set REDIS_URL and REDIS_TOKEN."
    );
  }
}

async function upstashRequest<T>(
  path: string,
  init?: RequestInit
): Promise<T> {
  assertRedisConfigured();

  const response = await fetch(`${REDIS_URL}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${REDIS_TOKEN}`,
      "Content-Type": "application/json",
      ...(init?.headers ?? {}),
    },
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error(`Upstash request failed with status ${response.status}`);
  }

  const json = (await response.json()) as UpstashResponse<T>;
  return json.result;
}

export const redis = {
  isConfigured() {
    return Boolean(REDIS_URL && REDIS_TOKEN);
  },

  async getJSON<T>(key: string): Promise<T | null> {
    const result = await upstashRequest<string | null>(`/get/${key}`);
    if (!result) {
      return null;
    }

    const parsed = JSON.parse(result) as T | WrappedRedisValue<string>;
    if (
      typeof parsed === "object" &&
      parsed !== null &&
      "value" in parsed &&
      typeof parsed.value === "string"
    ) {
      return JSON.parse(parsed.value) as T;
    }

    return parsed as T;
  },

  async setJSON(key: string, value: unknown): Promise<void> {
    await upstashRequest(`/set/${key}`, {
      method: "POST",
      headers: {
        "Content-Type": "text/plain",
      },
      body: JSON.stringify(value),
    });
  },
};
