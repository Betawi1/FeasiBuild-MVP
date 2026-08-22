export const PAYPAL_RETURN_URL = "https://feasibuild.app/checkout/success";
export const PAYPAL_CANCEL_URL = "https://feasibuild.app/checkout/cancel";

export function baseUrl(): string {
  const mode =
    process.env.NEXT_PUBLIC_PAYPAL_MODE || process.env.PAYPAL_MODE;
  return mode === "live"
    ? "https://api-m.paypal.com"
    : "https://api-m.sandbox.paypal.com";
}

export async function getPayPalAccessToken(): Promise<string> {
  const clientId =
    process.env.PAYPAL_CLIENT_ID || process.env.NEXT_PUBLIC_PAYPAL_CLIENT_ID;
  const secret = process.env.PAYPAL_CLIENT_SECRET;
  if (!clientId || !secret) {
    throw new Error("PayPal client credentials are not configured");
  }

  const auth = Buffer.from(`${clientId}:${secret}`).toString("base64");
  const res = await fetch(`${baseUrl()}/v1/oauth2/token`, {
    method: "POST",
    headers: {
      Authorization: `Basic ${auth}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: "grant_type=client_credentials",
  });
  const data = (await res.json()) as { access_token?: string };
  if (!data.access_token) {
    throw new Error("Failed to obtain PayPal access token");
  }
  return data.access_token;
}

function paypalJsonHeaders(token: string): HeadersInit {
  return {
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json",
  };
}

export async function getOrderDetails(orderId: string) {
  const token = await getPayPalAccessToken();
  const res = await fetch(`${baseUrl()}/v2/checkout/orders/${orderId}`, {
    headers: paypalJsonHeaders(token),
  });
  return res.json();
}

export async function capturePayPalOrder(orderId: string) {
  const token = await getPayPalAccessToken();
  const res = await fetch(
    `${baseUrl()}/v2/checkout/orders/${orderId}/capture`,
    {
      method: "POST",
      headers: paypalJsonHeaders(token),
    }
  );
  return res.json();
}

export async function getSubscriptionDetails(subscriptionId: string) {
  const token = await getPayPalAccessToken();
  const res = await fetch(
    `${baseUrl()}/v1/billing/subscriptions/${subscriptionId}`,
    {
      headers: paypalJsonHeaders(token),
    }
  );
  return res.json();
}

export async function verifyPayPalWebhook(
  headers: Headers,
  rawBody: string
): Promise<boolean> {
  const webhookId = process.env.PAYPAL_WEBHOOK_ID;
  if (!webhookId) {
    console.error("[PayPal] PAYPAL_WEBHOOK_ID is not set");
    return false;
  }

  let webhookEvent: unknown;
  try {
    webhookEvent = JSON.parse(rawBody);
  } catch {
    return false;
  }

  const token = await getPayPalAccessToken();
  const res = await fetch(
    `${baseUrl()}/v1/notifications/verify-webhook-signature`,
    {
      method: "POST",
      headers: paypalJsonHeaders(token),
      body: JSON.stringify({
        auth_algo: headers.get("paypal-auth-algo"),
        cert_url: headers.get("paypal-cert-url"),
        transmission_id: headers.get("paypal-transmission-id"),
        transmission_sig: headers.get("paypal-transmission-sig"),
        transmission_time: headers.get("paypal-transmission-time"),
        webhook_id: webhookId,
        webhook_event: webhookEvent,
      }),
    }
  );
  const data = (await res.json()) as { verification_status?: string };
  return data.verification_status === "SUCCESS";
}

export function findApproveUrl(links: unknown): string | undefined {
  if (!Array.isArray(links)) return undefined;
  const approve = links.find(
    (l) =>
      typeof l === "object" &&
      l !== null &&
      "rel" in l &&
      (l as { rel?: string }).rel === "approve"
  ) as { href?: string } | undefined;
  return typeof approve?.href === "string" ? approve.href : undefined;
}
