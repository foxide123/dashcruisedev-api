import { Hono } from "hono";
import Stripe from "stripe";

type Bindings = {
    STRIPE_SECRET_KEY: string;
    SUPABASE_KEY: string;
};

type StripeLocale = 'auto' | 'en' | 'de';

type StripeParams = {
	amount: string;
  currency: string;
  language: StripeLocale;
  planName: string;
}

const app = new Hono<{ Bindings: Bindings }>();

app.post('/checkout-session', async (c) => {
    const { amount, currency, language, planName } = (await c.req.json()) as StripeParams;

    try{
      const stripe = new Stripe(c.env.STRIPE_SECRET_KEY, {
        //eslint-disable-next-line
        apiVersion: "2025-02-24.acacia; custom_checkout_beta=v1" as any,
        });
    
        const session = await stripe.checkout.sessions.create({
          mode: "subscription",
          success_url: `https://dashcruisedev.com/${language}/subscription/success?session_id={CHECKOUT_SESSION_ID}}`,
          cancel_url: "https://dashcruisedev.com/en",
          allow_promotion_codes: true,
          locale: language,
          line_items: [
            {
              quantity: 1,
              price_data: {
                currency: currency,
                product_data: { name: "Website Plan" },
                recurring: { interval: "month" },
                unit_amount: Math.round(Number(amount) * 100),
              },
            },
          ],
          metadata: {
            plan: planName
          }
        });
        return c.json({sessionId: session.id}, 201)
    } catch(error){
      console.error("Stripe error:", error);
      return c.json({error: "Error while creating checkout session"}, 500);
    }}
);