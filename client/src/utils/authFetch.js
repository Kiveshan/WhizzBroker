// Thin wrapper around the native fetch() that attaches the JWT from localStorage
// as an Authorization header. Use this instead of fetch() for any request to our
// own API so the call passes the server-side auth guard. The URL is passed through
// unchanged (preserving relative/proxy and absolute behaviour); only headers are added.
//
// Do NOT use this for third-party / S3 presigned URLs — those must not receive our
// Authorization header.
export const authFetch = (url, options = {}) => {
  const token = localStorage.getItem("token");
  return fetch(url, {
    ...options,
    headers: {
      ...(options.headers || {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  });
};

export default authFetch;
