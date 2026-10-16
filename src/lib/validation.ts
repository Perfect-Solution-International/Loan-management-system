/**
 * Sri Lankan Identity & Contact Information Validation Utilities
 */

/**
 * Validates Sri Lankan National Identity Card (NIC) number.
 * - Old format: 9 digits followed by 'V' or 'X' (e.g. 852341234V)
 * - New format: 12 digits (e.g. 198523412345)
 */
export function isValidSriLankanNIC(nic: string): boolean {
  if (!nic) return false;
  const clean = nic.trim().toUpperCase();
  // Old NIC: 9 digits + V/X
  const oldNicRegex = /^[0-9]{9}[VX]$/;
  // New NIC: 12 digits
  const newNicRegex = /^[0-9]{12}$/;

  return oldNicRegex.test(clean) || newNicRegex.test(clean);
}

/**
 * Validates Sri Lankan mobile phone number.
 * Accepts:
 * - 07XXXXXXXX (10 digits starting with 07)
 * - +947XXXXXXXX or 947XXXXXXXX (international format)
 */
export function isValidSriLankanPhone(phone: string): boolean {
  if (!phone) return false;
  const clean = phone.replace(/[\s\-\(\)]/g, "");
  // Local 10 digits starting with 07
  const localRegex = /^07[0-9]{8}$/;
  // International format starting with +94 or 94
  const intlRegex = /^(\+94|94)7[0-9]{8}$/;

  return localRegex.test(clean) || intlRegex.test(clean);
}

/**
 * Standardizes a Sri Lankan phone number to 10-digit local format: 07XXXXXXXX
 */
export function formatSriLankanPhone(phone: string): string {
  if (!phone) return "";
  let clean = phone.replace(/[^0-9]/g, "");
  if (clean.startsWith("947") && clean.length === 11) {
    clean = "0" + clean.slice(2);
  }
  return clean;
}

/**
 * Validates an image file size and ensures it doesn't exceed 2MB before upload
 */
export function validateImageFile(file: File, maxMb: number = 2): { valid: boolean; error?: string } {
  if (!file) return { valid: false, error: "No file selected" };
  const allowedTypes = ["image/jpeg", "image/png", "image/webp", "application/pdf"];
  if (!allowedTypes.includes(file.type)) {
    return { valid: false, error: "Only JPG, PNG, WEBP images or PDF files are allowed" };
  }
  if (file.size > maxMb * 1024 * 1024) {
    return { valid: false, error: `File size exceeds ${maxMb}MB limit. Please choose a smaller image.` };
  }
  return { valid: true };
}

