"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

const roles = ["DOCTOR", "NURSE", "STAFF", "ADMIN"];

export function InviteStaffForm() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [role, setRole] = useState("NURSE");
  const [status, setStatus] = useState<"idle" | "sending" | "sent" | "error">("idle");
  const [message, setMessage] = useState("");

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setStatus("sending");
    setMessage("");

    try {
      const response = await fetch("/api/invitations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, role }),
      });
      const payload = (await response.json()) as { error?: string };

      if (!response.ok) {
        throw new Error(payload.error ?? "Unable to send invitation.");
      }

      setStatus("sent");
      setMessage(`Invitation sent to ${email.trim().toLowerCase()}.`);
      setEmail("");
      router.refresh();
    } catch (error) {
      setStatus("error");
      setMessage(error instanceof Error ? error.message : "Unable to send invitation.");
    }
  }

  return (
    <form className="invite-form" onSubmit={onSubmit}>
      <label>
        Email
        <input
          autoComplete="email"
          inputMode="email"
          onChange={(event) => setEmail(event.target.value)}
          placeholder="staff@example.com"
          required
          type="email"
          value={email}
        />
      </label>
      <label>
        Role
        <select onChange={(event) => setRole(event.target.value)} value={role}>
          {roles.map((roleName) => (
            <option key={roleName} value={roleName}>
              {roleName}
            </option>
          ))}
        </select>
      </label>
      <button className="primary" disabled={status === "sending"} type="submit">
        {status === "sending" ? "Sending..." : "Send invite"}
      </button>
      {message && (
        <p className={`form-message ${status === "error" ? "error" : "success"}`}>{message}</p>
      )}
    </form>
  );
}
