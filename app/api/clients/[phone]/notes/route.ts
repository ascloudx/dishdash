import { NextResponse } from "next/server";
import { updateClientNote } from "@/lib/clientNotes";

interface UpdateClientNotePayload {
  note?: string;
}

export async function PATCH(
  request: Request,
  context: { params: Promise<{ phone: string }> }
) {
  try {
    const { phone } = await context.params;
    const payload = (await request.json()) as UpdateClientNotePayload;
    const clientId = decodeURIComponent(phone).trim();

    if (!clientId) {
      return NextResponse.json({ error: "Client id is required." }, { status: 400 });
    }

    const note = payload.note?.trim() ?? "";
    const record = await updateClientNote(clientId, note);
    return NextResponse.json(record);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to update client notes.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
