const CONTENT_API_ROUTE = 'content-api';
const CONTENT_API_TOKEN_STRATEGY = 'content-api-token';
const READ_ACTIONS = new Set(['findMany', 'findOne', 'findFirst', 'count']);

/**
 * Strapi treats every `status` value except the exact string "published" as a
 * draft request. That includes empty values (`?status=`), arrays, and values
 * such as "Draft" or "foo".
 */
export const hasRequestedNonPublishedStatus = (params: any) => {
  if (!params || !Object.prototype.hasOwnProperty.call(params, 'status')) {
    return false;
  }

  return params.status !== 'published';
};

export const isTrustedContentApiTokenRequest = (requestCtx: any) =>
  requestCtx?.state?.auth?.strategy?.name === CONTENT_API_TOKEN_STRATEGY;

/**
 * Public and user-authenticated content API reads must stay on the published
 * version. Draft reads are reserved for server-side content API tokens, which
 * are used by the preview flow.
 */
export const shouldBlockDraftRead = (
  action: string,
  params: any,
  requestCtx: any,
) => {
  if (!READ_ACTIONS.has(action)) {
    return false;
  }

  if (requestCtx?.state?.route?.info?.type !== CONTENT_API_ROUTE) {
    return false;
  }

  if (isTrustedContentApiTokenRequest(requestCtx)) {
    return false;
  }

  return hasRequestedNonPublishedStatus(params);
};

type ForbiddenErrorFactory = (message: string) => Error;

const createForbiddenError: ForbiddenErrorFactory = (message) => {
  // Loaded lazily so the guard logic can be unit-tested without Strapi installed.
  const { ForbiddenError } = require('@strapi/utils').errors;
  return new ForbiddenError(message);
};

export const registerDraftAccessGuard = (
  strapi: any,
  createError: ForbiddenErrorFactory = createForbiddenError,
) => {
  strapi.documents.use(async (ctx: any, next: any) => {
    const requestCtx = strapi.requestContext?.get?.();

    if (shouldBlockDraftRead(ctx.action, ctx.params, requestCtx)) {
      throw createError('Draft content is not available.');
    }

    return next();
  });
};
