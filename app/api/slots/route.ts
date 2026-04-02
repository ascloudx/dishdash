import { NextResponse } from "next/server";
import { getMergedSlots, getSlotStore } from "@/lib/slots";

export async function GET() {
  try {
    const [store, slots] = await Promise.all([getSlotStore(), getMergedSlots()]);
    return NextResponse.json({
      ...store,
      slots,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to load slots.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
