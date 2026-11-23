"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { isIsoDate, nowInTimetableTimeZone } from "@/lib/timetable";

const ENDPOINT = "/api/lab-desk-reservations";
const DESKS = Array.from({ length: 12 }, (_, index) => index + 1);
const OPENING_TIME = "08:00";
const CLOSING_TIME = "20:00";

async function requestReservations(query, options) {
  const response = await fetch(`${ENDPOINT}${query}`, { ...options, cache: "no-store" });
  const payload = response.status === 204 ? null : await response.json().catch(() => null);

  if (!response.ok) {
    const error = new Error(payload?.error);
    error.status = response.status;
    throw error;
  }

  return payload;
}

function isFutureTime(date, time, now) {
  const [hours, minutes] = time.split(":").map(Number);
  return date > now.date || (date === now.date && hours * 60 + minutes > now.minutes);
}

function validateHours(date, startTime, endTime, now) {
  if (startTime < OPENING_TIME || endTime > CLOSING_TIME) {
    return "Choose a time between 08:00 and 20:00.";
  }
  if (startTime >= endTime) return "End time must be after start time.";
  if (!isFutureTime(date, startTime, now)) return "Choose a start time in the future.";
  return "";
}

function DeskSchedule({ desk, reservations, unavailable, canCancel, onCancel, pending, disabled }) {
  return (
    <li className="card min-w-0 p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h4 className="font-semibold">Desk {desk}</h4>
        {unavailable !== null && (
          <span className={unavailable ? "badge-gray" : "badge-primary"}>
            {unavailable ? "Unavailable" : "Available"}
          </span>
        )}
      </div>
      {reservations.length === 0 ? (
        <p className="text-muted mt-2 text-sm">No reservations</p>
      ) : (
        <ul className="mt-2 divide-y divide-gray-200 dark:divide-gray-800">
          {reservations.map((reservation) => (
            <li key={reservation.id} className="py-2 text-sm last:pb-0">
              <p className="font-medium tabular-nums">
                <time dateTime={reservation.startTime}>{reservation.startTime}</time>
                {"–"}
                <time dateTime={reservation.endTime}>{reservation.endTime}</time>
              </p>
              <div className="flex flex-wrap items-baseline justify-between gap-x-2 gap-y-1">
                <p className="text-body min-w-0 break-words">{reservation.bookedBy}</p>
                {reservation.mine && canCancel(reservation.startTime) && (
                  <button
                    type="button"
                    className="rounded font-medium text-primary-700 underline underline-offset-2 focus-visible:outline-primary-500 disabled:opacity-50 dark:text-primary-300"
                    disabled={disabled}
                    aria-label={`Cancel your reservation for desk ${desk} from ${reservation.startTime} to ${reservation.endTime}`}
                    onClick={() => onCancel(reservation)}
                  >
                    {pending === reservation.id ? "Canceling…" : "Cancel"}
                  </button>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
    </li>
  );
}

export default function LaboratoryDeskReservations({ laboratory, loginReturnTo }) {
  const [now, setNow] = useState(null);
  const [selectedDate, setSelectedDate] = useState(null);
  const [desk, setDesk] = useState("");
  const [startTime, setStartTime] = useState("");
  const [endTime, setEndTime] = useState("");
  const [result, setResult] = useState(null);
  const [revision, setRevision] = useState(0);
  const [pending, setPending] = useState("");
  const mutationInProgress = useRef(false);
  const [feedback, setFeedback] = useState(null);

  useEffect(() => {
    const updateClock = () => setNow(nowInTimetableTimeZone());
    updateClock();
    const timer = setInterval(updateClock, 15_000);
    return () => clearInterval(timer);
  }, []);

  const date = selectedDate ?? now?.date ?? "";
  const query = isIsoDate(date) ? `?${new URLSearchParams({ laboratory, date })}` : "";
  const schedule = result?.query === query ? result : null;
  const loading = !now || Boolean(query && schedule?.revision !== revision);
  const controlsDisabled = Boolean(pending) || loading;

  useEffect(() => {
    if (!query) return;
    const controller = new AbortController();

    requestReservations(query, { signal: controller.signal })
      .then((data) => {
        if (!Array.isArray(data?.reservations)) throw new Error();
        if (!controller.signal.aborted) {
          setResult({ query, revision, reservations: data.reservations });
        }
      })
      .catch((error) => {
        if (!controller.signal.aborted) {
          setResult({
            query,
            revision,
            signIn: error.status === 401,
            error: (error.status && error.message) || "Could not load the desk schedule.",
          });
        }
      });

    return () => controller.abort();
  }, [query, revision]);

  const hoursEntered = Boolean(startTime && endTime);
  const timeError = hoursEntered && isIsoDate(date) && now
    ? validateHours(date, startTime, endTime, now)
    : "";
  const availabilityKnown = Boolean(schedule?.reservations && hoursEntered && !timeError);
  const desks = DESKS.map((number) => {
    const reservations = schedule?.reservations?.filter((reservation) => reservation.desk === number) || [];
    return {
      number,
      reservations,
      unavailable: availabilityKnown
        ? reservations.some((reservation) => startTime < reservation.endTime && endTime > reservation.startTime)
        : null,
    };
  });
  const selectedDesk = desks.find(({ number }) => number === Number(desk));
  const canBook = availabilityKnown && selectedDesk && !selectedDesk.unavailable;

  async function mutate(action, path, options, successMessage, failureMessage) {
    if (mutationInProgress.current) return;
    mutationInProgress.current = true;
    setPending(action);
    setFeedback(null);

    try {
      await requestReservations(path, options);
      setFeedback({ message: successMessage });
      setRevision((value) => value + 1);
    } catch (error) {
      if (error.status === 401) {
        setResult({ query, revision, signIn: true });
        return;
      }

      setFeedback({ error: true, message: (error.status && error.message) || failureMessage });
      if (error.status === 404 || error.status === 409) setRevision((value) => value + 1);
    } finally {
      setPending("");
      mutationInProgress.current = false;
    }
  }

  function reserveDesk(event) {
    event.preventDefault();
    if (!canBook || controlsDisabled) return;

    mutate(
      "create",
      "",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ laboratory, date, desk: selectedDesk.number, startTime, endTime }),
      },
      `Desk ${selectedDesk.number} reserved for ${startTime}–${endTime}.`,
      "Could not reserve this desk. Please try again."
    );
  }

  function cancelReservation(reservation) {
    mutate(
      reservation.id,
      `?${new URLSearchParams({ id: reservation.id })}`,
      { method: "DELETE" },
      "Reservation canceled.",
      "Could not cancel this reservation. Please try again."
    );
  }

  if (schedule?.signIn) {
    return (
      <section className="card content-padding mx-auto max-w-xl space-y-4">
        <h2 className="text-xl font-semibold">Desk reservations</h2>
        <p className="text-body text-sm">
          Sign in with your UTCN account to view the desk schedule and make a reservation.
        </p>
        <Link href={`/login?returnTo=${encodeURIComponent(loginReturnTo)}`} prefetch={false} className="btn-primary">
          Sign in with UTCN
        </Link>
      </section>
    );
  }

  return (
    <section className="space-y-6" aria-labelledby="desk-reservations-heading">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h2 id="desk-reservations-heading" className="text-xl font-semibold">Desk reservations</h2>
          <p className="text-muted mt-1 text-sm" id="desk-reservation-hours">
            Desks can be reserved from 08:00 to 20:00 Bucharest time.
          </p>
        </div>
        <label className="w-full sm:w-auto">
          <span className="label">Reservation date</span>
          <input
            type="date"
            className="input"
            value={date}
            min={now?.date}
            disabled={!now || Boolean(pending)}
            onChange={(event) => {
              const value = event.target.value;
              if (value === date) return;
              setSelectedDate(value);
              setResult(null);
              setFeedback(null);
            }}
          />
        </label>
      </div>

      {feedback && (
        <p className={feedback.error ? "notice-warning text-sm" : "notice-info text-sm"} role={feedback.error ? "alert" : "status"}>
          {feedback.message}
        </p>
      )}

      {!query && now && <p className="text-muted text-sm">Choose a date to see the desk schedule.</p>}
      {loading && !schedule?.reservations && (
        <p className="text-muted py-4 text-sm" role="status">Loading the desk schedule…</p>
      )}
      {!loading && schedule?.error && (
        <div className="notice-warning space-y-3 text-sm" role="alert">
          <p>{schedule.error}</p>
          <button type="button" className="btn-secondary btn-sm" onClick={() => setRevision((value) => value + 1)}>
            Try again
          </button>
        </div>
      )}

      {schedule?.reservations && (
        <>
          <form className="card space-y-3 p-4" onSubmit={reserveDesk}>
            <fieldset disabled={controlsDisabled} className="grid items-end gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <legend className="sr-only">Reserve a desk</legend>
              <label>
                <span className="label">Start time</span>
                <input
                  type="time"
                  className="input"
                  min={OPENING_TIME}
                  max={CLOSING_TIME}
                  value={startTime}
                  onChange={(event) => setStartTime(event.target.value)}
                  aria-describedby="desk-reservation-hours"
                  required
                />
              </label>
              <label>
                <span className="label">End time</span>
                <input
                  type="time"
                  className="input"
                  min={OPENING_TIME}
                  max={CLOSING_TIME}
                  value={endTime}
                  onChange={(event) => setEndTime(event.target.value)}
                  aria-describedby="desk-reservation-hours"
                  required
                />
              </label>
              <div>
                <label htmlFor="desk-reservation-desk" className="label">Desk</label>
                <select id="desk-reservation-desk" className="input" value={desk} onChange={(event) => setDesk(event.target.value)} required>
                  <option value="">Choose a desk</option>
                  {desks.map(({ number, unavailable }) => (
                    <option key={number} value={number} disabled={unavailable}>
                      Desk {number}{unavailable ? " (unavailable)" : ""}
                    </option>
                  ))}
                </select>
              </div>
              <button type="submit" className="btn-primary" disabled={!canBook}>
                {pending === "create" ? "Reserving…" : "Reserve desk"}
              </button>
            </fieldset>
            {timeError && <p className="text-sm text-red-700 dark:text-red-400" role="status">{timeError}</p>}
            {selectedDesk?.unavailable && (
              <p className="text-sm text-red-700 dark:text-red-400" role="status">
                Desk {selectedDesk.number} is unavailable for the selected time.
              </p>
            )}
          </form>

          <div className="space-y-3">
            <h3 className="text-lg font-semibold">Desk schedule</h3>
            {loading && <p className="text-muted text-sm" role="status">Updating the desk schedule…</p>}
            {availabilityKnown && !loading && (
              <p className="text-muted text-sm">Availability is shown for {startTime}–{endTime}.</p>
            )}
            <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {desks.map(({ number, reservations, unavailable }) => (
                <DeskSchedule
                  key={number}
                  desk={number}
                  reservations={reservations}
                  unavailable={loading ? null : unavailable}
                  pending={pending}
                  onCancel={cancelReservation}
                  disabled={controlsDisabled}
                  canCancel={(time) => isFutureTime(date, time, now)}
                />
              ))}
            </ul>
          </div>
        </>
      )}
    </section>
  );
}

