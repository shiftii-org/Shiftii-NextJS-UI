"use client";

import { useState } from "react";

export function InviteRegistrationForm({ token }: { token: string }) {
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [password, setPassword] = useState("");
  const [status, setStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [message, setMessage] = useState("");

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setStatus("saving");
    setMessage("");

    try {
      const response = await fetch("/api/invitations/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          token,
          first_name: firstName,
          last_name: lastName,
          password,
        }),
      });
      const payload = (await response.json()) as { error?: string };

      if (!response.ok) {
        throw new Error(payload.error ?? "Unable to complete registration.");
      }

      setStatus("saved");
      setMessage("Your account is ready. You can now sign in with your organization code.");
      setPassword("");
    } catch (error) {
      setStatus("error");
      setMessage(error instanceof Error ? error.message : "Unable to complete registration.");
    }
  }

  return (
    <form className="accept-form" onSubmit={onSubmit}>
      <div className="form-grid">
        <label>
          First name
          <input
            autoComplete="given-name"
            onChange={(event) => setFirstName(event.target.value)}
            required
            value={firstName}
          />
        </label>
        <label>
          Last name
          <input
            autoComplete="family-name"
            onChange={(event) => setLastName(event.target.value)}
            required
            value={lastName}
          />
        </label>
      </div>
      <label>
        Password
        <input
          autoComplete="new-password"
          minLength={8}
          onChange={(event) => setPassword(event.target.value)}
          required
          type="password"
          value={password}
        />
      </label>
      <button className="primary" disabled={status === "saving" || status === "saved"} type="submit">
        {status === "saving" ? "Creating account..." : "Create account"}
      </button>
      {message && (
        <p className={`form-message ${status === "error" ? "error" : "success"}`}>{message}</p>
      )}
    </form>
  );
}
