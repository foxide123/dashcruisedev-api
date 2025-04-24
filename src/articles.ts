import { Hono } from 'hono';
import { createClient } from '@supabase/supabase-js';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';

type Bindings = {
	SUPABASE_URL: string;
	SUPABASE_KEY: string;
};

const articles = new Hono<{ Bindings: Bindings }>();

articles.get('/slugs-with-locale', async (c) => {
	const supabase = createClient(c.env.SUPABASE_URL, c.env.SUPABASE_KEY);

	const response = await supabase.from('PostTranslation').select(`
        slug,
        locale:Locale (
          locale
        )
      `);

	return c.json(response);
});

articles.get('/slugs-with-locale/:postId', zValidator('param', z.object({ postId: z.string() })), async (c) => {
	const { postId } = c.req.valid('param');

	const supabase = createClient(c.env.SUPABASE_URL, c.env.SUPABASE_KEY);

	const response = await supabase
		.from('PostTranslation')
		.select(
			`
        slug,
        locale:Locale (
          locale
        )
      `
		)
		.eq('post_id', postId);
	return c.json(response);
});

articles.post('/', (c) => c.json('create a post', 201));
articles.get('/:slug', zValidator('param', z.object({ slug: z.string() })), async (c) => {
	const { slug } = c.req.valid('param');

	const supabase = createClient(c.env.SUPABASE_URL, c.env.SUPABASE_KEY);

	const response = await supabase.from('PostTranslation').select('*').eq('slug', slug);

	return c.json(response);
});

export default articles;
