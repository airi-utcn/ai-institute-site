import { redirect } from "next/navigation";
import { getAuthConfig } from "@/lib/auth/config";
import { getSession, safeReturnTo } from "@/lib/auth/session";

export const metadata = {
  title: "Sign in",
  description: "Sign in with your institutional account.",
  robots: { index: false, follow: false },
};

const ERROR_MESSAGES = {
  access_denied:
    "Sign-in was cancelled or your account was not permitted to continue.",
  auth: "The identity provider could not verify this sign-in. Please try again.",
  config:
    "Institutional sign-in is not configured yet. Please contact the site administrator.",
  domain:
    "This account is not allowed to use the reservation system. Use your institutional account.",
  group:
    "This account does not have access to the reservation system. Ask the AIRi team to add you to the correct group.",
  state:
    "The sign-in session expired before it completed. Please start again.",
};

export default async function LoginPage({ searchParams }) {
  const params = await searchParams;
  const returnTo = safeReturnTo(params.returnTo, "/");
  const error = typeof params.error === "string" ? params.error : "";

  const session = await getSession();
  if (session) {
    redirect(returnTo);
  }

  let authConfig = null;
  try {
    authConfig = getAuthConfig();
  } catch (error) {
    // The notice below explains the missing configuration; log the detail so
    // an operator can see which variable is wrong.
    console.error("Institutional sign-in configuration is invalid", error);
  }

  const configured = Boolean(authConfig);
  const providerName = authConfig?.providerName || "institutional account";
  const providerLabel =
    authConfig?.providerLabel || "Continue with institutional login";
  const message = ERROR_MESSAGES[error] || "";

  return (
    <main className="page-container">
      <section className="card content-padding mx-auto max-w-lg space-y-6">
        <div className="space-y-2">
          <p className="text-subtle text-xs font-semibold uppercase tracking-widest">
            AIRi @ UTCN
          </p>
          <h1 className="text-2xl font-semibold text-gray-900 dark:text-gray-100">
            Sign in to reserve equipment
          </h1>
          <p className="text-body text-sm">
            Reservations are available to authenticated members of the
            institute. Use your {providerName} to continue.
          </p>
        </div>

        {message && (
          <div className="notice notice-warning" role="alert">
            <p className="text-sm">{message}</p>
          </div>
        )}

        {!configured && !message && (
          <div className="notice notice-warning" role="alert">
            <p className="text-sm">
              Institutional sign-in is not configured yet. Please contact the
              site administrator.
            </p>
          </div>
        )}

        {configured && (
          <a
            href={`/api/auth/login?returnTo=${encodeURIComponent(returnTo)}`}
            className="btn-primary flex w-full items-center justify-center gap-3"
          >
            <InstitutionalLoginIcon />
            {providerLabel}
          </a>
        )}

        <p className="text-muted text-xs leading-relaxed">
          You will be redirected to the identity provider. Your password is
          never shared with this site.
        </p>
      </section>
    </main>
  );
}

function InstitutionalLoginIcon() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      className="h-5 w-5"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      xmlns="http://www.w3.org/2000/svg"
    >
      <circle cx="8" cy="15" r="4" />
      <path d="m10.85 12.15 7.4-7.4a2 2 0 0 1 2.83 2.83l-7.4 7.4" />
      <path d="m16 6 2 2" />
      <path d="m18 4 2 2" />
    </svg>
  );
}
