const stripePublishableKey = process.env.STRIPE_PUBLISHABLE_KEY || '';
const stripeSecretKey = process.env.STRIPE_SECRET_KEY || '';
const stripeWebhookSecret = process.env.STRIPE_WEBHOOK_SECRET || '';


 function getKeys(payment_method?: string) {
    let secret_key: string | undefined = stripeSecretKey;
    let publishable_key: string | undefined = stripePublishableKey;
  
    switch (payment_method) {
      case 'grabpay':
      case 'fpx':
        publishable_key = process.env.STRIPE_PUBLISHABLE_KEY_MY;
        secret_key = process.env.STRIPE_SECRET_KEY_MY;
        break;
      case 'au_becs_debit':
        publishable_key = process.env.STRIPE_PUBLISHABLE_KEY_AU;
        secret_key = process.env.STRIPE_SECRET_KEY_AU;
        break;
      case 'oxxo':
        publishable_key = process.env.STRIPE_PUBLISHABLE_KEY_MX;
        secret_key = process.env.STRIPE_SECRET_KEY_MX;
        break;
      case 'wechat_pay':
        publishable_key = process.env.STRIPE_PUBLISHABLE_KEY_WECHAT;
        secret_key = process.env.STRIPE_SECRET_KEY_WECHAT;
        break;
      case 'paypal':
      case 'revolut_pay':
        publishable_key = process.env.STRIPE_PUBLISHABLE_KEY_UK;
        secret_key = process.env.STRIPE_SECRET_KEY_UK;
        break;
      default:
        publishable_key = process.env.STRIPE_PUBLISHABLE_KEY;
        secret_key = process.env.STRIPE_SECRET_KEY;
    }
  
    return { secret_key, publishable_key };
}

export { getKeys }