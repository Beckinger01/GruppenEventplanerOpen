export type PushSubscriptionJSON = {
  endpoint: string;
  expirationTime?: number | null;
  keys: { p256dh: string; auth: string };
};

export const store = {
  subs: new Map<string, PushSubscriptionJSON>(),
};
