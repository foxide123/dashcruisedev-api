import { Hono } from 'hono';
import { createClient } from '@supabase/supabase-js';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';
import { Resend } from "resend";

type Bindings = {
	RESEND_API_KEY: string;
};

type SubmitFormApiRequest = {
	email: string;
	name: string;
	message: string;
};

const mailEndpoint = new Hono<{ Bindings: Bindings }>();

mailEndpoint.post('/submit-form', async (c) => {
	try {
		const { email, name, message } = (await c.req.json()) as SubmitFormApiRequest;

		const resendApi = c.env.RESEND_API_KEY;

		const resend = new Resend(resendApi);
		const { data, error } = await resend.emails.send({
			// from: `Acme <${email}>`,
			from: 'Acme <contact@dashcruisedev.com>',
			to: ['contact@dashcruisedev.com'],
			replyTo: `${email}`,
			subject: 'Name: Jakub, Message: Hello',
			//subject: `Name: ${name}, Message: ${message}`,
			html: `<p><strong>Name:</strong> ${name}</p><p><strong>Email:</strong> ${email}</p><p><strong>Message:</strong> ${message}</p>`,
			//react: <EmailTemplate name={name} message={message} />
		});

		if (error) {
			console.error('Error while sending an email:', error);
			return Response.json({ error }, { status: 500 });
		}

		return Response.json(data);
	} catch (error) {}
});

export default mailEndpoint;
