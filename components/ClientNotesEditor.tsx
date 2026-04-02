'use client';

import { useState } from "react";

export default function ClientNotesEditor({
  clientId,
  initialNote,
}: {
  clientId: string;
  initialNote: string;
}) {
  const [note, setNote] = useState(initialNote);
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState<string | null>(null);

  async function saveNote() {
    setSaving(true);
    setStatus(null);

    try {
      const response = await fetch(`/api/clients/${encodeURIComponent(clientId)}/notes`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ note }),
      });

      if (!response.ok) {
        throw new Error("Failed to save notes.");
      }

      setStatus("Saved");
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Failed to save notes.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="glass rounded-3xl p-6">
      <div className="flex items-center justify-between gap-3">
        <h3 className="text-lg font-bold text-text-main">Client Notes</h3>
        {status ? <span className="text-xs font-semibold text-text-sub">{status}</span> : null}
      </div>
      <textarea
        value={note}
        onChange={(event) => setNote(event.target.value)}
        placeholder="Add preferences, budget signals, event notes, or time preferences…"
        className="mt-3 min-h-32 w-full rounded-2xl border border-white/70 bg-white/80 px-4 py-3 text-sm text-text-main outline-none focus:border-brand/40"
      />
      <div className="mt-3 flex justify-end">
        <button
          type="button"
          onClick={saveNote}
          disabled={saving}
          className="rounded-full bg-brand px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
        >
          {saving ? "Saving..." : "Save Notes"}
        </button>
      </div>
    </div>
  );
}
