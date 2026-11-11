"use client";
import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { FaMapMarkerAlt } from "react-icons/fa";
import PageHeader from "@/components/PageHeader";
import SmartMediaImage from "@/components/shared/SmartMediaImage";
import { heroSizes } from "@/lib/media";

export default function ReserveClient({ user }) {
  const { id } = useParams();
  const router = useRouter();

  const [asset, setAsset] = useState(null);
  const [form, setForm] = useState({
    startDate: "",
    endDate: "",
  });
  const [status, setStatus] = useState("idle");
  const [errorMsg, setErrorMsg] = useState("");
  const [loadError, setLoadError] = useState("");

  const displayName =
    [user?.givenName, user?.familyName].filter(Boolean).join(" ") ||
    user?.name ||
    user?.email;

  useEffect(() => {
    let cancelled = false;
    setLoadError("");

    fetch(`/api/equipment/${id}`)
      .then(async (res) => {
        if (!res.ok) {
          throw new Error("Equipment not found");
        }
        return res.json();
      })
      .then((data) => {
        if (!cancelled) setAsset(data);
      })
      .catch(() => {
        if (!cancelled) {
          setLoadError(
            "This equipment could not be found. It may have been removed or the link is invalid."
          );
        }
      });

    return () => {
      cancelled = true;
    };
  }, [id]);

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (form.endDate < form.startDate) {
      setErrorMsg("End date must be after the start date");
      setStatus("error");
      return;
    }

    setStatus("submitting");
    setErrorMsg("");

    try {
      const res = await fetch("/api/reservations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          assetId: id,
          startDate: form.startDate,
          endDate: form.endDate,
        }),
      });

      const data = await res.json();

      if (res.status === 401) {
        router.push(
          `/login?returnTo=${encodeURIComponent(`/reserve/${id}`)}`
        );
        return;
      }

      if (!res.ok) {
        setErrorMsg(data.error || "Something went wrong");
        setStatus("error");
        return;
      }

      setStatus("success");
    } catch (err) {
      setErrorMsg("Could not submit the request. Please try again.");
      setStatus("error");
    }
  };

  if (status === "success") {
    return (
      <main className="page-container">
        <div className="notice notice-info max-w-lg mx-auto">
          <p className="text-body">
            Your reservation request for <strong>{asset?.name}</strong> has been submitted.
            An administrator will review it shortly.
          </p>
          <button onClick={() => router.push("/equipment")} className="btn-primary mt-4">
            Back to equipment
          </button>
        </div>
      </main>
    );
  }

  if (loadError) {
    return (
      <main className="page-container">
        <PageHeader title="Reserve Equipment" subtitle="Equipment unavailable" />
        <div className="notice notice-warning max-w-lg mx-auto">
          <p className="text-sm">{loadError}</p>
          <button
            onClick={() => router.push("/equipment")}
            className="btn-primary mt-4"
          >
            Back to equipment
          </button>
        </div>
      </main>
    );
  }

  return (
    <main className="page-container">
      <PageHeader
        title="Reserve Equipment"
        subtitle={asset ? `Complete the form for: ${asset.name}` : "Loading..."}
      />

      {asset && (
        <section className="card max-w-3xl mx-auto mb-6 overflow-hidden">
          <SmartMediaImage
            src={asset.image}
            alt={asset.name}
            aspectRatio="aspect-video"
            sizes={heroSizes(768)}
            priority
            fallback={
              <div className="flex flex-col items-center justify-center gap-2 text-gray-400 dark:text-gray-500">
                <span className="text-sm font-medium">
                  No image available
                </span>
              </div>
            }
            fallbackClassName="bg-gradient-to-br from-gray-50 via-white to-gray-200 dark:from-gray-900 dark:via-gray-900 dark:to-gray-800"
          />

          <div className="space-y-4 p-5 sm:p-6">
            <div className="flex flex-wrap items-center justify-end gap-3">
              {asset.roomNumber && (
                <span className="inline-flex items-center gap-1.5 rounded-full bg-gray-100 px-3 py-1 text-xs font-semibold text-gray-700 dark:bg-gray-800 dark:text-gray-300">
                  <FaMapMarkerAlt className="h-3 w-3 text-primary-500" />
                  {asset.roomNumber}
                </span>
              )}
            </div>

            {asset.description ? (
              <p className="text-body whitespace-pre-line">{asset.description}</p>
            ) : (
              <p className="text-muted text-sm">
                No description provided for this item.
              </p>
            )}
          </div>
        </section>
      )}

      {asset && !asset.available && (
        <div className="notice notice-warning max-w-lg mx-auto mb-6">
          This equipment is currently unavailable. You can still submit a request for a future date.
        </div>
      )}

      <section className="card content-padding max-w-lg mx-auto mb-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-subtle text-xs font-semibold uppercase tracking-widest">
              Signed in as
            </p>
            <p className="text-body mt-1 font-semibold">{displayName}</p>
            <p className="text-muted text-sm">{user?.email}</p>
          </div>
          <form action="/api/auth/signout" method="post">
            <button type="submit" className="btn-secondary text-sm">
              Sign out
            </button>
          </form>
        </div>
      </section>

      <form onSubmit={handleSubmit} className="max-w-lg mx-auto card content-padding space-y-5">
        <div>
          <p className="label mb-3">Reservation period</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-subtle mb-1 block">Start date</label>
              <input
                type="date"
                name="startDate"
                value={form.startDate}
                onChange={handleChange}
                required
                className="input"
              />
            </div>

            <div>
              <label className="text-subtle mb-1 block">End date</label>
              <input
                type="date"
                name="endDate"
                value={form.endDate}
                onChange={handleChange}
                required
                className="input"
              />
            </div>
          </div>
        </div>

        {status === "error" && (
          <div className="notice notice-warning">
            <p className="text-sm">{errorMsg}</p>
          </div>
        )}

        <button type="submit" disabled={status === "submitting"} className="btn-primary w-full">
          {status === "submitting" ? "Submitting..." : "Submit request"}
        </button>

        <p className="text-muted text-xs">
          The reservation will be submitted under {user?.email}.
        </p>
      </form>
    </main>
  );
}
