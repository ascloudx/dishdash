import { getClients } from "@/lib/clients";
import { NextResponse } from "next/server";

export async function GET() {
  try {
    const clients = await getClients();
    return NextResponse.json(clients);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to load clients.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
