interface PayPalButtonsActions {
  subscription: {
    create: (opts: { plan_id: string; custom_id?: string }) => Promise<string>;
  };
}

interface PayPalButtonsInstance {
  render: (target: string | HTMLElement) => Promise<void>;
  close: () => Promise<void>;
}

interface PayPalNamespace {
  Buttons: (opts: {
    style?: Record<string, string>;
    createOrder?: () => Promise<string>;
    createSubscription?: (
      data: Record<string, unknown>,
      actions: PayPalButtonsActions
    ) => Promise<string>;
    onApprove?: (data: {
      orderID?: string;
      subscriptionID?: string;
    }) => Promise<void> | void;
    onError?: (err: unknown) => void;
  }) => PayPalButtonsInstance;
}

interface Window {
  paypal?: PayPalNamespace;
}
