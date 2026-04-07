/* eslint-disable @typescript-eslint/no-require-imports */
const fs = require("node:fs");

const env = {};
for (const line of fs.readFileSync(".env.local", "utf8").split(/\r?\n/)) {
  const match = line.match(/^([A-Z0-9_]+)=(.*)$/);
  if (!match) continue;
  let value = match[2].trim();
  if (
    (value.startsWith('"') && value.endsWith('"')) ||
    (value.startsWith("'") && value.endsWith("'"))
  ) {
    value = value.slice(1, -1);
  }
  env[match[1]] = value;
}

const url = env.REDIS_URL || env.UPSTASH_REDIS_REST_URL;
const token = env.REDIS_TOKEN || env.UPSTASH_REDIS_REST_TOKEN;

if (!url || !token) {
  throw new Error("Missing Redis credentials");
}

function normalizeName(name) {
  return String(name || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function slug(name) {
  return normalizeName(name).replace(/ /g, "-");
}

function buildPhone(index) {
  const suffix = String(2000 + index).padStart(4, "0");
  return {
    raw: `780-555-${suffix}`,
    normalized: `+1780555${suffix}`,
    valid: true,
  };
}

async function main() {
  const getRes = await fetch(`${url}/get/dira:bookings`, {
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
  });

  if (!getRes.ok) {
    throw new Error(`GET failed ${getRes.status}`);
  }

  const getJson = await getRes.json();
  const records = getJson.result ? JSON.parse(getJson.result) : [];

  if (!Array.isArray(records)) {
    throw new Error("Bookings payload is not an array");
  }

  const nameMap = new Map();
  let counter = 1;
  const updated = [];

  for (const record of records) {
    const phone = String(record.phone ?? "").trim();
    const phoneNormalized = String(record.phoneNormalized ?? "").trim();
    if (phone || phoneNormalized) {
      continue;
    }

    const nameKey = normalizeName(record.name);
    if (!nameKey) {
      continue;
    }

    if (!nameMap.has(nameKey)) {
      nameMap.set(nameKey, buildPhone(counter));
      counter += 1;
    }

    const placeholder = nameMap.get(nameKey);
    record.phone = placeholder.raw;
    record.phoneNormalized = placeholder.normalized;
    record.phoneValid = true;
    updated.push({
      name: record.name,
      phone: placeholder.raw,
      normalized: placeholder.normalized,
      bookingId: record.id,
    });
  }

  const setRes = await fetch(`${url}/set/dira:bookings`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "text/plain",
    },
    body: JSON.stringify(records),
  });

  if (!setRes.ok) {
    throw new Error(`SET failed ${setRes.status}`);
  }

  const uniqueClients = Array.from(
    new Map(
      updated.map((entry) => [
        slug(entry.name),
        {
          name: entry.name,
          phone: entry.phone,
          normalized: entry.normalized,
        },
      ])
    ).values()
  );

  console.log(
    JSON.stringify(
      {
        updatedBookings: updated.length,
        updatedClients: uniqueClients.length,
        sample: uniqueClients.slice(0, 12),
      },
      null,
      2
    )
  );
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
