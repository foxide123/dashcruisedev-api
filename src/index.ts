import {Hono} from 'hono'
import articles from './articles'
import stripeEndpoint from "./stripe";
import { cors } from 'hono/cors';

const app = new Hono()

app.use('*', cors({
    origin: "*",
    allowMethods: ["GET", "POST", "OPTIONS"]
}))

app.get('/', (c) => c.text("Hello Cloudflare Workers!"))
app.route('/articles', articles);
app.route('/stripe', stripeEndpoint);

export default app