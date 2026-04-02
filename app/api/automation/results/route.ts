import { NextResponse } from "next/server";
import { getAutomationReport } from "@/lib/automation/state";
import { getActiveServices } from "@/config/services";
import { getBookings } from "@/lib/bookings";
import { getClients } from "@/lib/clients";
import { flattenInsights, generateInsights } from "@/lib/insights/generateInsights";
import { getSettings } from "@/lib/settings";
import { getVisibleSlots } from "@/lib/slots";

export async function GET() {
  try {
    const stored =
      (await getAutomationReport()) ?? {
        generatedAt: null,
        reminders: [],
        reactivations: [],
        insights: [],
      };

    const [bookings, settings, clients] = await Promise.all([getBookings(), getSettings(), getClients()]);
    const insights = flattenInsights(
      generateInsights({
        bookings,
        services: getActiveServices(),
        clients,
        settings: {
          ...settings,
          visibleSlots: await getVisibleSlots(
            settings.businessHours.start,
            settings.businessHours.end
          ),
        },
      })
    );

    const results = {
      ...stored,
      insights,
    };

    return NextResponse.json(results);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to load automation results.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
