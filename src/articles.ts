import { Hono } from 'hono';
import { createClient } from '@supabase/supabase-js';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';

type Bindings = {
	SUPABASE_URL: string;
	SUPABASE_KEY: string;
};

const articles = new Hono<{ Bindings: Bindings }>();

articles.post('/', (c) => c.json('create a post', 201));

articles.get('/slugs-with-locale', async (c) => {
	const supabase = createClient(c.env.SUPABASE_URL, c.env.SUPABASE_KEY);

	const response = await supabase.from('ArticleTranslation').select(`
		id,
		article_id,
        slug,
        locale:Locale (
          locale
        )
      `);

	return c.json(response);
});

articles.get('/:slug', zValidator('param', z.object({ slug: z.string() })), async (c) => {
	const { slug } = c.req.valid('param');

	const supabase = createClient(c.env.SUPABASE_URL, c.env.SUPABASE_KEY);

	const response = await supabase.from('ArticleTranslation').select('*').eq('slug', slug);

	return c.json(response);
});

articles.get('/slugs-with-locale/:articleId', zValidator('param', z.object({ articleId: z.string() })), async (c) => {
	const { articleId } = c.req.valid('param');

	const supabase = createClient(c.env.SUPABASE_URL, c.env.SUPABASE_KEY);

	const response = await supabase
		.from('ArticleTranslation')
		.select(
			`
		id,
		article_id,
        slug,
        locale:Locale (
          locale
        )
      `,
		)
		.eq('article_id', articleId);
	return c.json(response);
});

articles.get('/sections/:translationId', zValidator('param', z.object({ translationId: z.string() })), async (c) => {
	const { translationId } = c.req.valid('param');

	const supabase = createClient(c.env.SUPABASE_URL, c.env.SUPABASE_KEY);

	const response = await supabase
		.from('TranslationSections')
		.select(
			`
	  section_slug,
	  section_title,
	  order,
	  ArticleTranslation(
		  id,
		  Article
		  (
		  id
		  )
	  )
	  `,
		)
		.eq('translation_id', translationId);

	return c.json(response);
});

export default articles;
