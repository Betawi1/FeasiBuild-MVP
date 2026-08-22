import { clerkClient } from "@clerk/nextjs/server";
import { getCustomerTier } from "@/lib/entitlements";

export interface SubscriptionMeta {
  plan: "explorer" | "professional" | "advisory";
  lifetime: boolean;
  advisoryStatus: "active" | "cancelled" | "none";
  reportCredits: number;
  whiteLabel: boolean;
  paypalSubscriptionId?: string;
  updatedAt: string;
}

const DEFAULT_META: SubscriptionMeta = {
  plan: "explorer",
  lifetime: false,
  advisoryStatus: "none",
  reportCredits: 0,
  whiteLabel: false,
  updatedAt: "",
};

async function getClerk() {
  return clerkClient();
}

function userEmails(user: {
  primaryEmailAddress?: { emailAddress?: string } | null;
  emailAddresses?: { emailAddress?: string }[];
}): string[] {
  const emails = [
    user.primaryEmailAddress?.emailAddress,
    ...(user.emailAddresses ?? []).map((e) => e.emailAddress),
  ];
  return emails.filter((e): e is string => Boolean(e));
}

/** Founder/support allowlist overlay until metadata is populated by PayPal. */
function applyAllowlistOverlay(
  meta: SubscriptionMeta,
  emails: string[]
): SubscriptionMeta {
  for (const email of emails) {
    const tier = getCustomerTier(email);
    if (tier === "advisory") {
      if (meta.advisoryStatus !== "active") {
        meta.plan = "advisory";
        meta.advisoryStatus = "active";
      }
      meta.whiteLabel = true;
    } else if (tier === "pro") {
      meta.lifetime = true;
      if (meta.plan === "explorer") meta.plan = "professional";
    }
  }
  return meta;
}

export async function getSubMeta(userId: string): Promise<SubscriptionMeta> {
  const client = await getClerk();
  const user = await client.users.getUser(userId);
  const m = (user.publicMetadata as Record<string, unknown> | undefined)
    ?.subscription as Partial<SubscriptionMeta> | undefined;
  const meta = m ? { ...DEFAULT_META, ...m } : { ...DEFAULT_META };
  return applyAllowlistOverlay(meta, userEmails(user));
}

export async function setSubMeta(userId: string, meta: SubscriptionMeta) {
  meta.updatedAt = new Date().toISOString();
  const client = await getClerk();
  await client.users.updateUserMetadata(userId, {
    publicMetadata: { subscription: meta },
  });
}

export async function wasOrderGranted(
  userId: string,
  orderId: string
): Promise<boolean> {
  const client = await getClerk();
  const user = await client.users.getUser(userId);
  const granted = (user.privateMetadata as { paypalGrantedOrders?: string[] })
    ?.paypalGrantedOrders;
  return Array.isArray(granted) && granted.includes(orderId);
}

export async function markOrderGranted(userId: string, orderId: string) {
  const client = await getClerk();
  const user = await client.users.getUser(userId);
  const granted =
    (user.privateMetadata as { paypalGrantedOrders?: string[] })
      ?.paypalGrantedOrders ?? [];
  if (granted.includes(orderId)) return;
  await client.users.updateUserMetadata(userId, {
    privateMetadata: { paypalGrantedOrders: [...granted, orderId] },
  });
}
