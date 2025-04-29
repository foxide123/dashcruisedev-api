import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';
import { Hono } from 'hono';
import Stripe from 'stripe';

type Bindings = {
	STRIPE_SECRET_KEY_TEST: string;
	SUPABASE_KEY: string;
};

type StripeLocale = 'auto' | 'en' | 'de' | 'pl' | 'ro';

type SupportedCurrency = 'usd' | 'eur' | 'pln' | 'ron';
const SupportedCurrencies = ['usd', 'eur', 'pln', 'ron'];
const SupportedCurrenciesArray = SupportedCurrencies.join(', ');

const PlanNames = ['startup', 'standard'];
const PlanNamesString = PlanNames.join(', ');

type StripeParams = {
	amount: string;
	currency: SupportedCurrency;
	language: StripeLocale;
	planName: string;
};

type SessionParams = {
	sessionId: string;
};

const startupPrices = [
	{ currency: 'usd', priceId: 'price_1RJ33URwMzr6Vk2TV66GwGhx', lookupKey: 'startup_monthly_usd' },
	{ currency: 'eur', priceId: 'price_1RJ29TRwMzr6Vk2TICQAaVde', lookupKey: 'startup_monthly_eur' },
	{ currency: 'pln', priceId: 'price_1RJ2O9RwMzr6Vk2T4wnOA5nD', lookupKey: 'startup_monthly_pln' },
	{ currency: 'ron', priceId: 'price_1RJ2OwRwMzr6Vk2TVkN0ItZt', lookupKey: 'startup_monthly_ron' },
];

const standardPrices = [
	{ currency: 'usd', priceId: 'price_1RJ2QiRwMzr6Vk2TnJhfjV0g', lookupKey: 'standard_monthly_usd' },
	{ currency: 'eur', priceId: 'price_1RJ2RHRwMzr6Vk2TnF2uRnT8', lookupKey: 'standard_monthly_eur' },
	{ currency: 'pln', priceId: 'price_1RJ2RzRwMzr6Vk2TKbVAOwa8', lookupKey: 'standard_monthly_pln' },
	{ currency: 'ron', priceId: 'price_1RJ2SdRwMzr6Vk2TNQ504PYw', lookupKey: 'standard_monthly_ron' },
];

function getPriceId(planName: string, currency: SupportedCurrency): string | null {
	if (planName.toLowerCase() === 'startup') {
		const match = startupPrices.find((item) => item.currency === currency);
		return match?.priceId || null;
	}

	if (planName.toLowerCase() === 'standard') {
		const match = standardPrices.find((item) => item.currency === currency);
		return match?.priceId || null;
	}

	return null;
}

const stripeEndpoint = new Hono<{ Bindings: Bindings }>();

stripeEndpoint.post('/website-plans/get-prices', async (c) => {
	const stripe = new Stripe(c.env.STRIPE_SECRET_KEY_TEST, {
		apiVersion: '2025-02-24.acacia; custom_checkout_beta=v1' as any,
	});

	try {
		const prices = await stripe.prices.list({
			lookup_keys: [
				'startup_monthly_usd',
				'standard_monthly_usd',
				'startup_monthly_eur',
				'standard_monthly_eur',
				'startup_monthly_pln',
				'standard_monthly_pln',
				'startup_monthly_ron',
				'standard_monthly_ron',
			]
		});
		console.log("prices:", prices);
		return c.json({data: prices});
	} catch (error) {
		return c.json({error: `There was an error fetching prices: ${error instanceof Error ? error.message : error}`})
	}
});

stripeEndpoint.post('/checkout-session', async (c) => {
	try {
		let { amount, currency, language, planName } = (await c.req.json()) as StripeParams;

		planName = planName
			.replace(
				/([\u2700-\u27BF]|[\uE000-\uF8FF]|\uD83C[\uDC00-\uDFFF]|\uD83D[\uDC00-\uDFFF]|[\u2011-\u26FF]|\uD83E[\uDD10-\uDDFF])/g,

				'',
			)
			.replace(/\s+/g, ' ')
			.trim();

		const priceId = getPriceId(planName, currency);

		if (!priceId)
			return c.json(
				{
					error: `Error: We couldn't find a product for the provided currency and plan name. Currently we support plans: [${PlanNamesString}] and currencies: [${SupportedCurrenciesArray}]`,
				},
				500,
			);

		const stripe = new Stripe(c.env.STRIPE_SECRET_KEY_TEST, {
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
				},
			},
			{ status: 200 },
		);
	} catch (error) {
		return c.json({ error: `There was an error while verifying session: ${error instanceof Error ? error.message : error}` });
	}
});

export default stripeEndpoint;
