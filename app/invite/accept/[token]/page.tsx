import { InviteRegistrationForm } from "@/app/components/InviteRegistrationForm";
import { validateInvitation } from "@/lib/shiftii-api";

export const dynamic = "force-dynamic";

export default async function AcceptInvitationPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  let error: string | null = null;

  try {
    await validateInvitation(token);
  } catch (caught) {
    error = caught instanceof Error ? caught.message : "Invitation token is invalid or expired.";
  }

  return (
    <main className="accept-shell">
      <section className="accept-panel">
        <div className="brand accept-brand">
          <span className="brand-mark">
            <i />
            <i />
            <i />
          </span>
          shiftii
        </div>
        <span className="pill success">Invitation</span>
        <h1>Finish your staff account</h1>
        {error ? (
          <div className="empty large">
            <span>!</span>
            <strong>This invitation cannot be used</strong>
            <p>{error}</p>
          </div>
        ) : (
          <>
            <p className="accept-copy">
              Create your password to join the workspace connected to this invite.
            </p>
            <InviteRegistrationForm token={token} />
          </>
        )}
      </section>
    </main>
  );
}
