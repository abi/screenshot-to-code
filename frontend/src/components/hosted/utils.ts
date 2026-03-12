export function capitalize(str: string): string {
  if (str.length === 0) {
    return str;
  }
  return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
}

export function formatPlanLabel(
  subscriberTier: string,
  billingInterval: string | null,
): string {
  const tierLabel = capitalize(subscriberTier);
  if (!billingInterval) {
    return tierLabel;
  }
  return `${tierLabel} ${capitalize(billingInterval)}`;
}
