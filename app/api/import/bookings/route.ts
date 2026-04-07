import { NextRequest, NextResponse } from "next/server";
import { importStructuredBookings } from "@/lib/bookings";
import { parseRawBookings } from "@/lib/imports/parseRawBookings";
import type { StructuredImportEntry } from "@/lib/imports/structuredImport";

interface ImportRequestBody {
  rawData?: string;
  year?: number;
  entries?: StructuredImportEntry[];
  persist?: boolean;
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as ImportRequestBody;
    const rawData = body.rawData?.trim();
    const entries = Array.isArray(body.entries) ? body.entries : null;

    if (entries && entries.length > 0) {
      if (body.persist) {
        const summary = await importStructuredBookings(entries);
        return NextResponse.json({
          ok: true,
          mode: "structured_import",
          ...summary,
        });
      }

      const normalized = entries.map((entry) => ({
        ...entry,
        time: entry.time ?? "10:00 AM",
        price: typeof entry.price === "number" ? entry.price : 59,
      }));

      return NextResponse.json({
        ok: true,
        mode: "structured_preview",
        entries: normalized,
      });
    }

    if (!rawData) {
      return NextResponse.json(
        { error: "rawData or entries is required." },
        { status: 400 }
      );
    }

    const result = parseRawBookings(rawData, body.year);
    return NextResponse.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to parse raw bookings.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
