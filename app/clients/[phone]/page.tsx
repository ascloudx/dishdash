import Link from "next/link";
import BookingCard from "@/components/BookingCard";
import ClientProfileEditor from "@/components/ClientProfileEditor";
import ClientNotesEditor from "@/components/ClientNotesEditor";
import { BUSINESS } from "@/config/business";
import { getClientProfile } from "@/lib/clients";
import { buildFollowUpMessage, buildRebookingMessage, generateWhatsAppLink } from "@/lib/whatsapp";

export default async function ClientProfilePage({
  params,
}: {
  params: Promise<{ phone: string }>;
}) {
  const { phone } = await params;
  const profile = await getClientProfile(decodeURIComponent(phone));

  if (!profile) {
    return <div className="text-text-sub">Client not found.</div>;
  }

  const messageLink = generateWhatsAppLink(
    profile.client.phoneNormalized,
    buildFollowUpMessage(profile.client.name)
  );
  const rebookLink = generateWhatsAppLink(
    profile.client.phoneNormalized,
    buildRebookingMessage(profile.client.name)
  );

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between gap-4">
        <div>
          <p className="text-sm text-text-sub">Client Profile</p>
          <h2 className="text-3xl font-bold text-text-main">{profile.client.name}</h2>
          <p className="text-text-sub">{profile.client.phone || "No phone captured"}</p>
        </div>
        <Link href="/clients" className="rounded-full border border-gray-200 bg-white px-4 py-2 text-sm font-semibold text-text-sub">
          Back to clients
        </Link>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Metric label="Visits" value={profile.client.totalVisits} />
        <Metric label="Spent" value={`${BUSINESS.currency}${profile.client.totalSpent.toLocaleString(BUSINESS.locale)}`} />
        <Metric label="Last Visit" value={profile.client.lastVisit} />
        <Metric label="Score" value={Math.round(profile.client.score)} />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Metric label="Lifecycle" value={profile.client.lifecycle} />
        <Metric label="Tags" value={profile.client.tags.length || "None"} />
        <Metric label="Notes Logged" value={profile.client.notesHistory.length} />
      </div>

      <div className="glass rounded-3xl p-6">
        <h3 className="text-lg font-bold text-text-main">Preferences & Tags</h3>
        <div className="mt-3 flex flex-wrap gap-2">
          {profile.client.preferences.length > 0 ? (
            profile.client.preferences.map((preference) => (
              <span key={preference} className="rounded-full bg-brand-light px-3 py-1 text-sm font-medium text-brand">
                {preference}
              </span>
            ))
          ) : (
            <p className="text-sm text-text-sub">No explicit preferences captured yet.</p>
          )}
        </div>
        {profile.client.autoSummary ? (
          <div className="mt-4 rounded-2xl border border-sky-100 bg-sky-50/70 px-4 py-3">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-sky-700">Auto Memory</p>
            <p className="mt-1 text-sm text-sky-900">{profile.client.autoSummary}</p>
          </div>
        ) : null}
      </div>

      <div className="glass rounded-3xl p-6">
        <h3 className="text-lg font-bold text-text-main">Quick Actions</h3>
        <div className="mt-3 flex flex-wrap gap-3">
          {messageLink ? (
            <a
              href={messageLink}
              target="_blank"
              rel="noreferrer"
              className="rounded-full bg-brand px-4 py-2 text-sm font-semibold text-white"
            >
              Message client
            </a>
          ) : (
            <span className="rounded-full border border-gray-200 bg-white px-4 py-2 text-sm font-semibold text-text-sub">
              No WhatsApp number
            </span>
          )}
          {rebookLink ? (
            <a
              href={rebookLink}
              target="_blank"
              rel="noreferrer"
              className="rounded-full border border-rose-100 bg-rose-50 px-4 py-2 text-sm font-semibold text-brand"
            >
              Rebook client
            </a>
          ) : null}
        </div>
      </div>

      <ClientProfileEditor
        clientId={profile.client.id}
        initialName={profile.client.name}
        initialPhone={profile.client.phone}
      />

      <div className="glass rounded-3xl p-6">
        <h3 className="text-lg font-bold text-text-main">Notes History</h3>
        <div className="mt-3 space-y-2">
          {profile.client.notesHistory.length > 0 ? (
            profile.client.notesHistory.map((note, index) => (
              <div key={`${profile.client.id}-${index}`} className="rounded-2xl bg-white/70 px-4 py-3 text-sm text-text-sub">
                {note}
              </div>
            ))
          ) : (
            <p className="text-sm text-text-sub">No notes captured yet.</p>
          )}
        </div>
      </div>

      <ClientNotesEditor clientId={profile.client.id} initialNote={profile.client.note} />

      <div className="space-y-4">
        <h3 className="text-lg font-bold text-text-main">Booking History</h3>
        {profile.bookings.map((booking) => (
          <BookingCard key={booking.id} booking={booking} />
        ))}
      </div>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="glass rounded-2xl p-4">
      <p className="text-xs uppercase tracking-wide text-text-sub">{label}</p>
      <p className="mt-1 text-2xl font-bold text-text-main">{value}</p>
    </div>
  );
}
