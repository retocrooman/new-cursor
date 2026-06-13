export function toggleSubscriptionEventType(
  eventTypes: string[],
  eventType: string,
  checked: boolean,
): string[] {
  if (checked) {
    if (eventTypes.includes(eventType)) {
      return eventTypes;
    }
    return [...eventTypes, eventType];
  }

  return eventTypes.filter((value) => value !== eventType);
}
