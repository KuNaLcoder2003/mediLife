const BASE = import.meta.env.VITE_API_URL;

async function post<T>(path: string, body?: object): Promise<T> {
  let res: Response;
  try {
    res = await fetch(`${BASE}${path}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: body ? JSON.stringify(body) : undefined,
      credentials: "include",
    });
  } catch {
    throw new Error("Can't reach the server. Check your connection and try again.");
  }
  const data = await res.json().catch(() => null);
  if (!res.ok || !data || data.valid === false) {
    throw new Error(typeof data?.message === "string" ? data.message : `Request failed (${res.status})`);
  }
  return data as T;
}

export const authApi = {
  signIn: async (email: string, password: string) =>
    (await post<{ accessToken: string }>("/auth/signin", { email, password })).accessToken,

  signUp: async (userDetails: object) =>
    (await post<{ accessToken: string }>("/auth/signup", { userDetails })).accessToken,

  googleUrl: async () => (await post<{ url: string }>("/auth/google")).url,
};