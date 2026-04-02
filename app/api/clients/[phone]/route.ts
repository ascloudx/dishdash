import { NextResponse } from "next/server";
import { getClientProfile } from "@/lib/clients";

export async function GET(
  _request: Request,
  context: { params: Promise<{ phone: string }> }
) {
  try {
    const { phone } = await context.params;
    const profile = await getClientProfile(decodeURIComponent(phone));

    if (!profile) {
      return NextResponse.json({ error: "Client not found." }, { status: 404 });
    }

    return NextResponse.json(profile);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to load client profile.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
