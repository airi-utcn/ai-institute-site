const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

export type SubscriptionInput = { email: string; source: string };

// flat type because the tsconfig isn't strict and a union on `ok` doesn't narrow
export type SubscriptionCheck = {
  ok: boolean;
  value?: SubscriptionInput;
  code?: 'invalid_email' | 'consent_required';
  message?: string;
};

export function validateSubscription(input: any): SubscriptionCheck {
  const email = typeof input?.email === 'string' ? input.email.trim().toLowerCase() : '';

  if (email.length > 254 || !EMAIL_PATTERN.test(email)) {
    return { ok: false, code: 'invalid_email', message: 'Please enter a valid email address.' };
  }

  if (input.consentGiven !== true) {
    return { ok: false, code: 'consent_required', message: 'Consent is required to subscribe.' };
  }

  const source = typeof input.source === 'string' ? input.source.trim().slice(0, 64) : '';
  return { ok: true, value: { email, source } };
}

// `documents` is strapi.documents(uid), passed in so the logic can be tested without Strapi
export async function subscribeToNewsletter(documents: any, input: SubscriptionInput) {
  const data = {
    status: 'subscribed',
    consentGiven: true,
    consentTimestamp: new Date().toISOString(),
  };

  const existing = await documents.findFirst({ filters: { email: input.email } });

  if (existing) {
    if (existing.status === 'subscribed') return 'already_subscribed';

    // subscribing again after an unsubscribe
    await documents.update({ documentId: existing.documentId, data });
    return 'subscribed';
  }

  try {
    await documents.create({
      data: { ...data, email: input.email, source: input.source || null },
    });
  } catch (error) {
    // two requests at the same time, the unique index rejected the second one
    if (await documents.findFirst({ filters: { email: input.email } })) return 'already_subscribed';
    throw error;
  }

  return 'subscribed';
}
