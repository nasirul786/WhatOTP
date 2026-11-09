/** Authenticated fetch helper: sends the Telegram initData as a bearer token. */
export function api(
    url: string,
    initData: string | undefined,
    init: { method?: string; body?: unknown } = {}
) {
    const hasBody = init.body !== undefined;
    return fetch(url, {
        method: init.method ?? (hasBody ? 'POST' : 'GET'),
        headers: {
            ...(hasBody ? { 'Content-Type': 'application/json' } : {}),
            Authorization: `Bearer ${initData}`,
        },
        body: hasBody ? JSON.stringify(init.body) : undefined,
    });
}

/** POST to an auth endpoint; initData is included in the body as those routes expect. */
export const postAuth = (url: string, initData: string | undefined, body: Record<string, unknown> = {}) =>
    api(url, initData, { method: 'POST', body: { initData, ...body } });
