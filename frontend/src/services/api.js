import axios from "axios";

/* ============================================================
   CONFIGURATION
============================================================ */

const TOKEN_KEY = "meditwin.token";

const API_BASE =
  import.meta.env.VITE_API_URL ||
  "https://meditwin-digital-twin.onrender.com/api/v1";


/* ============================================================
   AXIOS INSTANCE
============================================================ */

export const api = axios.create({
  baseURL: API_BASE,
  timeout: 60000,
  withCredentials: true,
});


/* ============================================================
   TOKEN MANAGEMENT
============================================================ */

export const getToken = () => {
  try {
    return localStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
};


export const setToken = (token) => {
  try {
    if (token) {
      localStorage.setItem(TOKEN_KEY, token);
    } else {
      localStorage.removeItem(TOKEN_KEY);
    }
  } catch {
    // Ignore localStorage errors
  }
};


/* ============================================================
   UNAUTHORIZED HANDLER
============================================================ */

let onUnauthorized = null;

export const setUnauthorizedHandler = (handler) => {
  onUnauthorized = handler;
};


/* ============================================================
   REQUEST INTERCEPTOR
============================================================ */

api.interceptors.request.use(
  (config) => {
    const token = getToken();

    config.headers = config.headers || {};

    /*
     * Add JWT token when available
     */
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    /*
     * JSON requests
     */
    if (
      config.data &&
      !(config.data instanceof FormData)
    ) {
      config.headers["Content-Type"] = "application/json";
    }

    /*
     * IMPORTANT:
     * Do not manually set multipart/form-data.
     * Browser/Axios will generate the boundary.
     */
    if (config.data instanceof FormData) {
      delete config.headers["Content-Type"];
    }

    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);


/* ============================================================
   ERROR MESSAGE
============================================================ */

const explain = (error) => {
  const response = error?.response;
  const data = response?.data;

  /*
   * Backend:
   *
   * {
   *   success: false,
   *   error: {
   *     message: "..."
   *   }
   * }
   */

  if (data?.error?.message) {
    return data.error.message;
  }

  if (data?.message) {
    return data.message;
  }

  if (typeof data?.detail === "string") {
    return data.detail;
  }

  /*
   * Network error
   */
  if (
    error?.code === "ERR_NETWORK" ||
    !response
  ) {
    return (
      "Cannot reach the MediTwin backend server. " +
      "Check the Render backend URL and Netlify environment variables."
    );
  }

  /*
   * Timeout
   */
  if (
    error?.code === "ECONNABORTED" ||
    error?.code === "ETIMEDOUT"
  ) {
    return "The server took too long to respond.";
  }

  /*
   * HTTP errors
   */
  switch (response.status) {
    case 400:
      return "Invalid request. Please check the submitted information.";

    case 401:
      return "You are not authenticated. Please login again.";

    case 403:
      return "You do not have permission to perform this action.";

    case 404:
      return "The requested record was not found.";

    case 409:
      return "The request conflicts with the current state.";

    case 413:
      return "The uploaded image is too large.";

    case 422:
      return "The submitted data is invalid.";

    case 429:
      return "Too many requests. Please wait and try again.";

    case 500:
      return "Internal server error.";

    case 502:
      return "The backend server is unavailable.";

    case 503:
      return "The requested service is currently unavailable.";

    default:
      return `Server error (${response.status}).`;
  }
};


/* ============================================================
   RESPONSE INTERCEPTOR
============================================================ */

api.interceptors.response.use(
  (response) => {
    return response;
  },

  (error) => {
    const response = error?.response;
    const config = error?.config;

    const isLogin =
      config?.url?.includes("/auth/login");

    /*
     * Handle expired/invalid authentication
     */
    if (
      response?.status === 401 &&
      !isLogin
    ) {
      if (onUnauthorized) {
        onUnauthorized();
      }
    }

    const friendlyError =
      new Error(explain(error));

    friendlyError.status =
      response?.status;

    friendlyError.data =
      response?.data;

    friendlyError.originalError =
      error;

    return Promise.reject(friendlyError);
  }
);


/* ============================================================
   RESPONSE HELPERS
============================================================ */

const unwrap = (response) => {
  return (
    response?.data?.data ??
    response?.data
  );
};


const unwrapFull = (response) => {
  return {
    data:
      response?.data?.data ??
      response?.data,

    meta:
      response?.data?.meta ??
      null,
  };
};


/* ============================================================
   HTTP HELPERS
============================================================ */

const get = (
  url,
  params
) => {
  return api
    .get(url, {
      params,
    })
    .then(unwrap);
};


const getFull = (
  url,
  params
) => {
  return api
    .get(url, {
      params,
    })
    .then(unwrapFull);
};


const post = (
  url,
  body,
  config = {}
) => {
  return api
    .post(
      url,
      body,
      config
    )
    .then(unwrap);
};


const patch = (
  url,
  body,
  config = {}
) => {
  return api
    .patch(
      url,
      body,
      config
    )
    .then(unwrap);
};


const del = (
  url,
  config = {}
) => {
  return api
    .delete(
      url,
      config
    )
    .then(unwrap);
};


/* ============================================================
   AUTH
============================================================ */

export const auth = {

  login: (
    email,
    password
  ) => {
    return post(
      "/auth/login",
      {
        email,
        password,
      }
    );
  },


  register: (
    payload
  ) => {
    return post(
      "/auth/register",
      payload
    );
  },


  me: () => {
    return get(
      "/auth/me"
    );
  },


  updateProfile: (
    payload
  ) => {
    return patch(
      "/auth/me",
      payload
    );
  },


  changePassword: (
    currentPassword,
    newPassword
  ) => {
    return post(
      "/auth/change-password",
      {
        currentPassword,
        newPassword,
      }
    );
  },
};


/* ============================================================
   ROBOTS
============================================================ */

export const robots = {

  list: () => {
    return get(
      "/robots"
    );
  },


  one: (
    robotId
  ) => {
    return get(
      `/robots/${robotId}`
    );
  },


  telemetry: (
    robotId
  ) => {
    return get(
      `/robots/${robotId}/telemetry`
    );
  },


dispatch: (
  robotId,
  body = {}
) => {
  if (robotId) {
    return post(
      `/robots/${robotId}/dispatch`,
      body
    );
  }

  return post(
    `/robots/dispatch`,
    body
  );
},


  recall: (
    robotId
  ) => {
    return post(
      `/robots/${robotId}/recall`
    );
  },


  stop: (
    robotId
  ) => {
    return post(
      `/robots/${robotId}/stop`
    );
  },


  clearStop: (
    robotId
  ) => {
    return post(
      `/robots/${robotId}/clear-stop`
    );
  },
};


/* ============================================================
   WASTE
============================================================ */

export const waste = {

  list: (
    params = {}
  ) => {

    const cleanParams = {
      ...params,
    };

    /*
     * Don't send fake hospital ID
     */
    if (
      cleanParams.hospitalId ===
      "DEFAULT_HOSPITAL"
    ) {
      delete cleanParams.hospitalId;
    }

    return getFull(
      "/waste",
      cleanParams
    );
  },


  one: (
    id
  ) => {
    return get(
      `/waste/${id}`
    );
  },


  create: (
    body
  ) => {
    return post(
      "/waste",
      body
    );
  },


  reclassify: (
    id,
    category,
    reason
  ) => {
    return patch(
      `/waste/${id}/category`,
      {
        category,
        reason,
      }
    );
  },


  remove: (
    id
  ) => {
    return del(
      `/waste/${id}`
    );
  },


  exportCsv: (
    params = {}
  ) => {

    const cleanParams = {
      ...params,
    };

    if (
      cleanParams.hospitalId ===
      "DEFAULT_HOSPITAL"
    ) {
      delete cleanParams.hospitalId;
    }

    return api
      .get(
        "/waste/export",
        {
          params: cleanParams,
          responseType: "blob",
        }
      )
      .then(
        (response) => response.data
      );
  },
};


/* ============================================================
   AI
============================================================ */

export const ai = {

  categories: () => {
    return get(
      "/ai/categories"
    );
  },


  health: () => {
    return get(
      "/ai/health"
    );
  },


  classify: ({
    file,
    department,
    weight,
    persist = true,
    dispatch = false,
    robotId = null,
  }) => {

    if (!file) {
      throw new Error(
        'Attach an image in the "image" field'
      );
    }

    const form =
      new FormData();

    form.append(
      "image",
      file
    );

    if (department) {
      form.append(
        "department",
        department
      );
    }

    if (
      weight !== undefined &&
      weight !== null &&
      weight !== ""
    ) {
      form.append(
        "weight",
        String(weight)
      );
    }

    form.append(
      "persist",
      String(persist)
    );

    form.append(
      "dispatch",
      String(dispatch)
    );

    if (robotId) {
      form.append(
        "robotId",
        robotId
      );
    }

    return post(
      "/ai/classify",
      form,
      {
        timeout: 60000,
      }
    );
  },
};


/* ============================================================
   TASKS
============================================================ */

export const tasks = {

  list: (
    params = {}
  ) => {
    return getFull(
      "/tasks",
      params
    );
  },


  one: (
    taskId
  ) => {
    return get(
      `/tasks/${taskId}`
    );
  },


  create: (
    body
  ) => {
    return post(
      "/tasks",
      body
    );
  },


  setStatus: (
    taskId,
    status,
    reason = ""
  ) => {
    return patch(
      `/tasks/${taskId}/status`,
      {
        status,
        reason,
      }
    );
  },
};


/* ============================================================
   COMPARTMENTS
============================================================ */

export const compartments = {

  list: (
    params = {}
  ) => {
    return get(
      "/compartments",
      params
    );
  },


  one: (
    id
  ) => {
    return get(
      `/compartments/${id}`
    );
  },


  scheduleDisposal: (
    id,
    note = ""
  ) => {
    return post(
      `/compartments/${id}/schedule-disposal`,
      {
        note,
      }
    );
  },


  empty: (
    id,
    body = {}
  ) => {
    return post(
      `/compartments/${id}/empty`,
      body
    );
  },
};


/* ============================================================
   ANALYTICS
============================================================ */

export const analytics = {

  overview: () => {
    return get(
      "/analytics/overview"
    );
  },


  byCategory: (
    params = {}
  ) => {
    return get(
      "/analytics/waste-by-category",
      params
    );
  },


  byDepartment: (
    params = {}
  ) => {
    return get(
      "/analytics/waste-by-department",
      params
    );
  },


  daily: (
    params = {}
  ) => {
    return get(
      "/analytics/daily",
      params
    );
  },


  aiPerformance: (
    params = {}
  ) => {
    return get(
      "/analytics/ai-performance",
      params
    );
  },


  fleet: () => {
    return get(
      "/analytics/fleet"
    );
  },
};


/* ============================================================
   ALERTS
============================================================ */

export const alerts = {

  list: (
    params = {}
  ) => {
    return getFull(
      "/alerts",
      params
    );
  },


  acknowledge: (
    id
  ) => {
    return post(
      `/alerts/${id}/acknowledge`
    );
  },


  acknowledgeAll: () => {
    return post(
      "/alerts/acknowledge-all"
    );
  },
};


/* ============================================================
   AUDIT
============================================================ */

export const audit = {

  list: (
    params = {}
  ) => {
    return getFull(
      "/audit",
      params
    );
  },
};


/* ============================================================
   HOSPITAL
============================================================ */

export const hospital = {

  get: () => {
    return get(
      "/hospital"
    );
  },


  layout: () => {
    return get(
      "/hospital/layout"
    );
  },


  previewRoute: (
    from,
    to
  ) => {
    return post(
      "/hospital/route",
      {
        from,
        to,
      }
    );
  },


  update: (
    body
  ) => {
    return patch(
      "/hospital",
      body
    );
  },
};


/* ============================================================
   SYSTEM
============================================================ */

export const system = {

  status: () => {
    return get(
      "/system/status"
    );
  },
};


/* ============================================================
   DEFAULT EXPORT
============================================================ */

export default {
  api,

  auth,

  robots,

  waste,

  ai,

  tasks,

  compartments,

  analytics,

  alerts,

  audit,

  hospital,

  system,

  getToken,

  setToken,

  setUnauthorizedHandler,
};
