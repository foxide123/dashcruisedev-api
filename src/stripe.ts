import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';
import { Hono } from 'hono';
import Stripe from 'stripe';

type Bindings = {
	STRIPE_SECRET_KEY_LIVE: string;
	SUPABASE_KEY: string;
};

type StripeLocale = 'auto' | 'en' | 'de' | 'pl' | 'ro';

type SupportedCurrency = 'usd' | 'eur' | 'pln' | 'ron';
const SupportedCurrencies = ['usd', 'eur', 'pln', 'ron'];
const SupportedCurrenciesArray = SupportedCurrencies.join(', ');

const PlanNames = ['startup', 'standard'];
const PlanNamesString = PlanNames.join(', ');

const WebsitePlansLookupKeys = [
	'startup_monthly_usd',
	'standard_monthly_usd',
	'startup_monthly_eur',
	'standard_monthly_eur',
	'startup_monthly_pln',
	'standard_monthly_pln',
	'startup_monthly_ron',
	'standard_monthly_ron',
];

type StripeParams = {
	lookupKeyWithoutCurrency: string;
	language: StripeLocale;
	currency: SupportedCurrency;
};

type SessionParams = {
	sessionId: string;
};

const stripeEndpoint = new Hono<{ Bindings: Bindings }>();

stripeEndpoint.post('/website-plans/get-prices', async (c) => {
	const stripe = new Stripe(c.env.STRIPE_SECRET_KEY_LIVE, {
		apiVersion: '2025-02-24.acacia; custom_checkout_beta=v1' as any,
	});

	try {
		const prices = await stripe.prices.list({
			lookup_keys: WebsitePlansLookupKeys,
			expand: ['data.product'],
		});
		console.log('prices:', prices);
		return c.json({ data: prices, error: null });
	} catch (error) {
		return c.json({ data: null, error: `There was an error fetching prices: ${error instanceof Error ? error.message : error}` });
	}
});

stripeEndpoint.post('/checkout-session', async (c) => {
	try {
		let { lookupKeyWithoutCurrency, language, currency } = (await c.req.json()) as StripeParams;

		const stripe = new Stripe(c.env.STRIPE_SECRET_KEY_LIVE, {
			apiVersion: '2025-02-24.acacia; custom_checkout_beta=v1' as any,
		});

		const prices = await stripe.prices.list({
			lookup_keys: [`${lookupKeyWithoutCurrency}_${currency}`],
			expand: ['data.product'],
		});

		if (!prices) return c.json({ data: null, error: `Could not find stripe price for: ${lookupKeyWithoutCurrency}_${currency}` });

		const priceId = prices.data[0].id;

		if (!priceId)
			return c.json(
				{
					data: null,
					error: `Error: We couldn't find a product for the provided currency and plan name. Currently we support plans: [${PlanNamesString}] and currencies: [${SupportedCurrenciesArray}]`,
				},
				500,
			);

		const product = prices.data[0].product;
		let planName = 'unknown';

		if (typeof product !== 'string' && 'name' in product) {
			planName = product.name || 'unknown';
		}

		const session = await stripe.checkout.sessions.create({
			mode: 'subscription',
			success_url: `https://dashcruisedev.com/${language}/subscription/success?session_id={CHECKOUT_SESSION_ID}`,
			cancel_url: 'https://dashcruisedev.com/en',
			allow_promotion_codes: true,
			locale: language,
			automatic_tax: {
				enabled: true,
			},
			tax_id_collection: {
				enabled: true
			},
			/* can only be provided when customer is provided 		
			customer_update: {
				address: 'auto'
			}, */
			/* 			customer_creation: "always", only allowed with payment method instead of subscription */
			line_items: [
				{
					quantity: 1,
					price: priceId,
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
		return c.json({ data: { sessionId: session.id }, error: null }, 201);
	} catch (error) {
		console.error('Stripe error:', error);
		return c.json({ data: null, error: `Error while creating checkout session: ${error instanceof Error ? error.message : error}` }, 500);
	}
});

stripeEndpoint.post('/verify-session/:sessionId', zValidator('param', z.object({ sessionId: z.string() })), async (c) => {
	try {
		const { sessionId } = c.req.valid('param') as SessionParams;
		if (!sessionId) {
			return c.json({ error: 'Missing session id' }, { status: 400 });
		}
		const stripe = new Stripe(c.env.STRIPE_SECRET_KEY_LIVE, {
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
					customerDetails: session.customer_details,
					customerId: session.customer,
				},
				error: null,
			},
			{ status: 200 },
		);
	} catch (error) {
		return c.json({ data: null, error: `There was an error while verifying session: ${error instanceof Error ? error.message : error}` });
	}
});

export default stripeEndpoint;
