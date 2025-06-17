import { Hono } from 'hono';
import { createClient } from '@supabase/supabase-js';
import { z } from 'zod';

type Bindings = {
	SUPABASE_URL: string;
	SUPABASE_ANON_KEY: string;
};

type NewsletterLocale = 'en' | 'de' | 'pl' | 'ro';

type NewsletterProps = {
    email: string;
    locale: NewsletterLocale;
}

const invalidEmailErrorText = 'Invalid Email Provided';
const emailExistsErrorText ="This email is already subscribed";
const unknownErrorText = "Unknown Error";

const newsletterEndpoint = new Hono<{ Bindings: Bindings }>();

newsletterEndpoint.post('/signup', async (c) => {
	try {
        const schema = z.object({
            email: z.string({
              invalid_type_error: "Invalid Email",
            }),
          });
        
        
        const {email} = (await c.req.json()) as NewsletterProps;
        const validated = schema.safeParse({email});
        if (!validated.success) {
            return Response.json({ error: `${invalidEmailErrorText}`});
          }

		const supabase = createClient(c.env.SUPABASE_URL, c.env.SUPABASE_ANON_KEY);
        const { error } = await supabase.from("newsletter").insert({ email });
		if (error) {
			if (error.code === '23505') {
				// 23505 = unique_violation in PostgreSQL
				return Response.json({ success: false, error: `${emailExistsErrorText}` });
			}
			return Response.json({ error: error.message || `${unknownErrorText}` });
		}

		return Response.json({ success: true });
	} catch (err) {
		return Response.json({ error: err });
	}
});

export default newsletterEndpoint;