export class ApiError extends Error {
  constructor(message, status) {
    super(message);
    this.name = "ApiError";
    this.status = status;
  }
}

export async function api(path, { method = "GET", body, noRedirect = false } = {}) {
  const res = await fetch(path, {
    method,
    credentials: "same-origin",
    headers: body ? { "Content-Type": "application/json" } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  });
  let data = null;
  try {
    data = await res.json();
  } catch {
    data = {};
  }
  if (res.status === 401 && !noRedirect) {
    const next = encodeURIComponent(location.pathname + location.search);
    location.href = `/login.html?next=${next}`;
    throw new ApiError("登录已过期", 401);
  }
  if (!res.ok) throw new ApiError(data?.error || `请求失败 (${res.status})`, res.status);
  return data;
}

export function toastError(err) {
  console.error(err);
}
