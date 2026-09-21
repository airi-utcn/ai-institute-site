import { getEventBySlug, transformEventData } from "@/lib/strapi";
import { NextResponse } from "next/server";

function formatDateToICS(dateStr) {
  if (!dateStr) return null;
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return null;
  // Format: YYYYMMDDTHHMMSSZ (UTC)
  return d.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
}

export async function GET(request, { params }) {
  const resolvedParams = await params;
  const { slug } = resolvedParams;
  
  if (!slug) {
    return new NextResponse("Not Found", { status: 404 });
  }

  const data = await getEventBySlug(slug, "en");
  if (!data) {
    return new NextResponse("Not Found", { status: 404 });
  }

  const event = transformEventData([data])[0];

  const dtstart = formatDateToICS(event.startDate) || formatDateToICS(new Date().toISOString());
  const dtend = formatDateToICS(event.endDate) || dtstart;
  const stamp = formatDateToICS(new Date().toISOString());

  const location = `${event.address || ''} ${event.roomOrPlatformLink || ''}`.trim();
  
  const icsString = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//AIRi UTCN//Events Calendar//EN",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    "BEGIN:VEVENT",
    `DTSTAMP:${stamp}`,
    `DTSTART:${dtstart}`,
    `DTEND:${dtend}`,
    `SUMMARY:${event.title}`,
    `DESCRIPTION:${event.description?.replace(/(\r\n|\n|\r)/gm, "\\n") || ''}`,
    `LOCATION:${location}`,
    "END:VEVENT",
    "END:VCALENDAR"
  ].join("\r\n");

  const headers = new Headers();
  headers.set('Content-Type', 'text/calendar; charset=utf-8');
  headers.set('Content-Disposition', `attachment; filename="event-${slug}.ics"`);

  return new NextResponse(icsString, {
    status: 200,
    headers,
  });
}
