import { getEventBySlug, transformEventData } from "@/lib/strapi";
import { NextResponse } from "next/server";

const ICS_DOMAIN = "airi.utcluj.ro";
const ICS_LINE_LIMIT = 75;

function formatDateToICS(dateStr) {
  if (!dateStr) return null;
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return null;
  // Format: YYYYMMDDTHHMMSSZ (UTC)
  return d.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
}

function escapeICSText(value) {
  return String(value ?? "")
    .replace(/\\/g, "\\\\")
    .replace(/\r\n|\r|\n/g, "\\n")
    .replace(/,/g, "\\,")
    .replace(/;/g, "\\;");
}

function foldICSLine(line) {
  const encoder = new TextEncoder();
  const chunks = [];
  let chunk = "";
  let size = 0;

  for (const char of String(line)) {
    const charSize = encoder.encode(char).length;
    // Continuation lines start with one space, which counts toward the limit.
    const limit = chunks.length === 0 ? ICS_LINE_LIMIT : ICS_LINE_LIMIT - 1;

    if (size + charSize > limit) {
      chunks.push(chunk);
      chunk = "";
      size = 0;
    }

    chunk += char;
    size += charSize;
  }

  chunks.push(chunk);
  return chunks.join("\r\n ");
}

function buildEventICS({ event, documentId, slug }) {
  const now = new Date();
  const dtstart = formatDateToICS(event.startDate) || formatDateToICS(now);
  let dtend = formatDateToICS(event.endDate) || dtstart;

  if (
    event.startDate &&
    event.endDate &&
    new Date(event.endDate) < new Date(event.startDate)
  ) {
    dtend = dtstart;
  }

  const location = `${event.address || ""} ${event.roomOrPlatformLink || ""}`.trim();
  const uid = `${documentId || slug}@${ICS_DOMAIN}`;

  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//AIRi UTCN//Events Calendar//EN",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    "BEGIN:VEVENT",
    `UID:${uid}`,
    `DTSTAMP:${formatDateToICS(now)}`,
    `DTSTART:${dtstart}`,
    `DTEND:${dtend}`,
    `SUMMARY:${escapeICSText(event.title)}`,
    `DESCRIPTION:${escapeICSText(event.description)}`,
    `LOCATION:${escapeICSText(location)}`,
    "END:VEVENT",
    "END:VCALENDAR",
  ];

  return `${lines.map(foldICSLine).join("\r\n")}\r\n`;
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
  const icsString = buildEventICS({
    event,
    documentId: data.documentId,
    slug,
  });

  const headers = new Headers();
  headers.set("Content-Type", "text/calendar; charset=utf-8");
  headers.set("Content-Disposition", `attachment; filename="event-${slug}.ics"`);

  return new NextResponse(icsString, {
    status: 200,
    headers,
  });
}
