'use client';

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

export default function ClientProfileEditor({
  clientId,
  initialName,
  initialPhone,
}: {
  clientId: string;
  initialName: string;
  initialPhone: string;
}) {
  const router = useRouter();
  const [name, setName] = useState(initialName);
  const [phone, setPhone] = useState(initialPhone);
  const [status, setStatus] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  async function saveProfile() {
    setStatus(null);

    try {
      const response = await fetch(`/api/clients/${encodeURIComponent(clientId)}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name,
          phone,
        }),
      });

      if (!response.ok) {
        const payload = (await response.json().catch(() => null)) as { error?: string } | null;
        throw new Error(payload?.error || "Failed to save client.");
      }

      const payload = (await response.json()) as {
        client?: {
          id: string;
        };
      };

      setStatus("Saved");
      startTransition(() => {
        if (payload.client?.id && payload.client.id !== clientId) {
          router.replace(`/clients/${encodeURIComponent(payload.client.id)}`);
        } else {
          router.refresh();
        }
      });
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Failed to save client.");
    }
  }

  return (
    <div className="glass rounded-3xl p-6">
      <div className="flex items-center justify-between gap-3">
        <h3 className="text-lg font-bold text-text-main">Edit Client</h3>
        {status ? <span className="text-xs font-semibold text-text-sub">{status}</span> : null}
      </div>

      <div className="mt-4 grid gap-4 md:grid-cols-2">
        <label className="space-y-2">
          <span className="text-xs font-semibold uppercase tracking-[0.16em] text-text-muted">Name</span>
          <input
            type="text"
            value={name}
            onChange={(event) => setName(event.target.value)}
            className="w-full rounded-2xl border border-white/70 bg-white/80 px-4 py-3 text-sm text-text-main outline-none focus:border-brand/40"
          />
        </label>

        <label className="space-y-2">
          <span className="text-xs font-semibold uppercase tracking-[0.16em] text-text-muted">Phone</span>
          <input
            type="text"
            value={phone}
            onChange={(event) => setPhone(event.target.value)}
            placeholder="+1 780-555-2001"
            className="w-full rounded-2xl border border-white/70 bg-white/80 px-4 py-3 text-sm text-text-main outline-none focus:border-brand/40"
          />
        </label>
      </div>

      <div className="mt-4 flex justify-end">
        <button
          type="button"
          onClick={saveProfile}
          disabled={isPending}
          className="rounded-full bg-brand px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
        >
          {isPending ? "Saving..." : "Save Profile"}
        </button>
      </div>
    </div>
  );
}
