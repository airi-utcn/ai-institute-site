"use client";
import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import PageHeader from "@/components/PageHeader";

export default function ReserveClient() {
  const { id } = useParams();
  const router = useRouter();

  const [asset, setAsset] = useState(null);
  const [form, setForm] = useState({
    userFirstName: "",
    userLastName: "",
    userEmail: "",
    startDate: "",
    endDate: "",
  });
  const [status, setStatus] = useState("idle");
  const [errorMsg, setErrorMsg] = useState("");

  useEffect(() => {
    fetch(`/api/equipment/${id}`)
      .then((res) => res.json())
      .then(setAsset);
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
          assetName: asset?.name,
          ...form,
        }),
      });

      const data = await res.json();

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

  return (
    <main className="page-container">
      <PageHeader
        title="Reserve Equipment"
        subtitle={asset ? `Complete the form for: ${asset.name}` : "Loading..."}
      />

      {asset && !asset.available && (
        <div className="notice notice-warning max-w-lg mx-auto mb-6">
          This equipment is currently unavailable. You can still submit a request for a future date.
        </div>
      )}

      <form onSubmit={handleSubmit} className="max-w-lg mx-auto card content-padding space-y-5">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="label">First name</label>
            <input
              type="text"
              name="userFirstName"
              value={form.userFirstName}
              onChange={handleChange}
              required
              className="input"
              placeholder="Ana"
            />
          </div>

          <div>
            <label className="label">Last name</label>
            <input
              type="text"
              name="userLastName"
              value={form.userLastName}
              onChange={handleChange}
              required
              className="input"
              placeholder="Popescu"
            />
          </div>
        </div>

        <div className="flex flex-col">
          <label className="label mb-1">Email</label>
          <input
            type="email"
            name="userEmail"
            value={form.userEmail}
            onChange={handleChange}
            required
            className="input w-full"
            placeholder="name@student.utcluj.ro"
          />
        </div>

        <div className="divider" />

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
      </form>
    </main>
  );
}