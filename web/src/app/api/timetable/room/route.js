import { NextResponse } from "next/server";
import {
  MAX_ROOM_SCHEDULE_DAYS,
  fetchRoomSchedule,
  inclusiveDayCount,
  isIsoDate,
} from "@/lib/timetable";

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const room = (searchParams.get("room") || "").trim();
  const from = searchParams.get("from") || "";
  const to = searchParams.get("to") || "";

  if (!room || room.length > 32) {
    return NextResponse.json(
      { error: "A laboratory room is required." },
      { status: 400 }
    );
  }

  if (!isIsoDate(from) || !isIsoDate(to) || to < from) {
    return NextResponse.json(
      { error: "Choose a valid date range." },
      { status: 400 }
    );
  }

  if (inclusiveDayCount(from, to) > MAX_ROOM_SCHEDULE_DAYS) {
    return NextResponse.json(
      {
        error: `A room schedule can cover at most ${MAX_ROOM_SCHEDULE_DAYS} days.`,
      },
      { status: 400 }
    );
  }

  try {
    const schedule = await fetchRoomSchedule({ room, from, to });

    return NextResponse.json(schedule, {
      headers: {
        // The timetable refreshes hourly. A short shared cache keeps the lab
        // pages cheap without hiding new bookings for long.
        "Cache-Control": "public, s-maxage=60, stale-while-revalidate=240",
      },
    });
  } catch (error) {
    console.error("Could not load the timetable room schedule", error);

    if (error?.status === 503) {
      return NextResponse.json(
        {
          error:
            "The timetable is being updated. Please try again in a few minutes.",
        },
        { status: 503 }
      );
    }

    return NextResponse.json(
      { error: "Could not load the room schedule." },
      { status: 502 }
    );
  }
}
