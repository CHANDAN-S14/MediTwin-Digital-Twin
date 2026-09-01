const API_BASE =
  import.meta.env.VITE_API_URL ||
  "http://localhost:5000/api/v1";

async function request(endpoint, options = {}) {
  const url = `${API_BASE}${endpoint}`;

  try {
    const response = await fetch(url, {
      ...options,
      headers: {
        "Content-Type": "application/json",
        ...(options.headers || {}),
      },
      credentials: "include",
    });

    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      throw new Error(
        data?.error?.message ||
        data?.message ||
        `Request failed with status ${response.status}`
      );
    }

    return data;
  } catch (error) {
    console.error("API Error:", error);
    throw error;
  }
}

export const api = {
  get: (endpoint) =>
    request(endpoint, {
      method: "GET",
    }),

  post: (endpoint, body) =>
    request(endpoint, {
      method: "POST",
      body: JSON.stringify(body),
    }),

  put: (endpoint, body) =>
    request(endpoint, {
      method: "PUT",
      body: JSON.stringify(body),
    }),

  patch: (endpoint, body) =>
    request(endpoint, {
      method: "PATCH",
      body: JSON.stringify(body),
    }),

  delete: (endpoint) =>
    request(endpoint, {
      method: "DELETE",
    }),
};

export default api;
