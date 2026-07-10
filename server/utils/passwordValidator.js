/**
 * Validates password according to security requirements:
 * - At least 8 characters long
 * - At least one lowercase letter
 * - At least one uppercase letter
 * - At least one number
 * - At least one special character (!@#$%^&*)
 */

export const validatePassword = (password) => {
  if (!password) return "Password is required";
  if (password.length < 8)
    return "Password must be at least 8 characters long";
  if (!/[a-z]/.test(password))
    return "Password must include at least one lowercase letter";
  if (!/[A-Z]/.test(password))
    return "Password must include at least one uppercase letter";
  if (!/[0-9]/.test(password))
    return "Password must include at least one number";
  if (!/[!@#$%^&*]/.test(password))
    return "Password must include at least one special character (!@#$%^&*)";
  return true;
};
