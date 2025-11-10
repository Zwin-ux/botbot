// Mock for node-fetch to avoid ESM issues in Jest
export default async function fetch(url: string | URL, init?: RequestInit): Promise<Response> {
  const urlStr = typeof url === 'string' ? url : url.toString();

  // Mock response
  return {
    ok: true,
    status: 200,
    statusText: 'OK',
    headers: new Headers(),
    json: async () => ({ mocked: true, url: urlStr }),
    text: async () => JSON.stringify({ mocked: true, url: urlStr }),
    blob: async () => new Blob(),
    arrayBuffer: async () => new ArrayBuffer(0),
    formData: async () => new FormData(),
  } as Response;
}

// Type for RequestInit
interface RequestInit {
  method?: string;
  headers?: Record<string, string>;
  body?: string;
  signal?: AbortSignal;
}
