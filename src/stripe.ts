import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';
import { Hono } from 'hono';
import Stripe from 'stripe';

type Bindings = {
	STRIPE_SECRET_KEY_TEST: string;
	SUPABASE_KEY: string;
};

type StripeLocale = 'auto' | 'en' | 'de' | 'pl' | 'ro';

type StripeParams = {
	amount: string;
	currency: string;
	language: StripeLocale;
	planName: string;
};

type SessionParams = {
	sessionId: string;
};

const stripeEndpoint = new Hono<{ Bindings: Bindings }>();

stripeEndpoint.post('/checkout-session', async (c) => {
	try {
		const { amount, currency, language, planName } = (await c.req.json()) as StripeParams;

		const stripe = new Stripe(c.env.STRIPE_SECRET_KEY_TEST, {
			//eslint-disable-next-line
			apiVersion: '2025-02-24.acacia; custom_checkout_beta=v1' as any,
		});

		const session = await stripe.checkout.sessions.create({
			mode: 'subscription',
			success_url: `https://dashcruisedev.com/${language}/subscription/success?session_id={CHECKOUT_SESSION_ID}`,
			cancel_url: 'https://dashcruisedev.com/en',
			allow_promotion_codes: true,
			locale: language,
			line_items: [
				{
					quantity: 1,
          price: "price_1R4ATYRwMzr6Vk2TslQMw3R0"
					/* price_data: {
						currency: currency,
						product_data: { name: 'Website Plan' },
						recurring: { interval: 'month' },
						unit_amount: Math.round(Number(amount) * 100),
					}, */
				},
			],
			metadata: {
				plan: planName,
			},
		});
		return c.json({ sessionId: session.id }, 201);
	} catch (error) {
		console.error('Stripe error:', error);
		return c.json({ error: `Error while creating checkout session: ${error instanceof Error ? error.message : error}` }, 500);
	}
});

stripeEndpoint.post('/verify-session/:sessionId', zValidator('param', z.object({ sessionId: z.string() })), async (c) => {
	try {
		const { sessionId } = c.req.valid('param') as SessionParams;
		if (!sessionId) {
			return c.json({ error: 'Missing session id' }, { status: 400 });
		}
		const stripe = new Stripe(c.env.STRIPE_SECRET_KEY_TEST, {
			apiVersion: '2025-02-24.acacia; custom_checkout_beta=v1' as any,
		});

    const session = await stripe.checkout.sessions.retrieve(sessionId);

		return c.json(
			{
        data: {
          email: session.customer_email,
          subscriptionId: session.subscription,
          paymentStatus: session.payment_status,
          mode: session.mode,
          plan: session.metadata?.plan,
        }
			},
			{ status: 200 },
		);
	} catch (error) {
		return c.json({ error: `There was an error while verifying session: ${error instanceof Error ? error.message : error}` });
	}
});

export default stripeEndpoint;
