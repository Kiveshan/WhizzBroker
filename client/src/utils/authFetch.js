// Thin wrapper around the native fetch() that attaches the JWT from localStorage
// as an Authorization header. Use this instead of fetch() for any request to our
// own API so the call passes the server-side auth guard. The URL is passed through
// unchanged (preserving relative/proxy and absolute behaviour); only headers are added.
//
// Do NOT use this for third-party / S3 presigned URLs — those must not receive our
// Authorization header.
//
// On a 401 (expired/invalid token), mirrors api.js's handleTokenExpiration: clears
// the stored session and redirects to login, instead of leaving the caller to show
// a raw "Invalid token" error with no way forward.
const handleUnauthorized = () => {
  localStorage.removeItem("token");
  localStorage.removeItem("user");
  window.dispatchEvent(new CustomEvent("tokenExpired"));
  window.dispatchEvent(new CustomEvent("userLoggedOut"));
  if (window.location.pathname !== "/") {
    window.location.href = "/";
  }
};

export const authFetch = async (url, options = {}) => {
  const token = localStorage.getItem("token");
  const response = await fetch(url, {
    ...options,
    headers: {
      ...(options.headers || {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  });

  if (response.status === 401) {
    handleUnauthorized();
  }

  return response;
};

export default authFetch;
