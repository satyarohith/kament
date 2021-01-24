/**
 * Validate whether the incoming request meets the provided terms.
 *
 * @param {Request} request
 * @param {*} terms
 */
export function validateRequest(request, terms) {
  const { allowedMethods = [], params = [] } = terms;
  if (allowedMethods.length > 0 && !allowedMethods.includes(request.method)) {
    throw new Error(`${request.method} requests are not allowed at this route`);
  }

  if (params.length > 0) {
    const { searchParams } = new URL(request.url);
    for (const param of params) {
      if (!searchParams.has(param)) {
        throw new Error(`/?${param}= is required to process this request`);
      }
    }
  }
}
