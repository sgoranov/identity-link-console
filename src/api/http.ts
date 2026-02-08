type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE'

type RequestOptions = Omit<RequestInit, 'method' | 'body'> & {
  method?: HttpMethod
  body?: unknown
}

const redirectToLogin = (serverProvidedUrl?: string) => {
  if (typeof window === 'undefined') return;

  const destination = serverProvidedUrl || '/login';
  const loginUrl = new URL(destination, window.location.origin);

  if (!serverProvidedUrl) {
    loginUrl.searchParams.set('redirect', window.location.href);
  }

  window.location.assign(loginUrl.toString());
};

export const fetchJson = async <T = unknown>(
  input: RequestInfo | URL,
  options: RequestOptions = {},
): Promise<T> => {
  const { method = 'GET', body, headers, ...rest } = options

  const response = await fetch(input, {
    method,
    credentials: 'include',
    headers: {
      ...(body === undefined ? {} : { 'Content-Type': 'application/json' }),
      ...headers,
    },
    body: body === undefined ? undefined : JSON.stringify(body),
    ...rest,
  })

  if (response.status === 401) {
    const data = await response.json().catch(() => ({}));
    redirectToLogin(data.loginUrl || data.location);
    throw new Error('Unauthorized');
  }

  if (response.status === 403) {
    throw new Error('Forbidden');
  }

  if (!response.ok) {
    let errorMessage = `Request failed with status ${response.status}`

    try {
      const data = await response.json()
      if (data && typeof data === 'object' && 'error' in data) {
        const messageValue = (data as { error?: unknown }).error
        if (typeof messageValue === 'string' && messageValue.trim().length > 0) {
          errorMessage = messageValue
        }
      }
    } catch {
      // Ignore parsing errors and keep the default message.
    }

    throw new Error(errorMessage)
  }

  if (response.status === 204) {
    return undefined as T
  }

  return (await response.json()) as T
}
