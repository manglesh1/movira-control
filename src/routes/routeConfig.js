export const PARK_SECTIONS = Object.freeze([
  "modules",
  "billing",
  "payments",
  "payment-history",
  "billing-history",
  "onboarding",
  "audit",
  "authentication",
]);

export function isValidParkSection(section) {
  return !section || PARK_SECTIONS.includes(section);
}
