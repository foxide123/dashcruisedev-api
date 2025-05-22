import {Hono} from 'hono'
import articles from './articles'
import stripeEndpoint from "./stripe";
import mailEndpoint from "./mail";
import newsletterEndpoint from "./newsletter"
import blogs from './blogs';
import { cors } from 'hono/cors';

const app = new Hono()

app.use('*', cors({
    origin: "*",
    allowMethods: ["GET", "POST", "OPTIONS"]
}))

app.get('/', (c) => c.text("Hello Cloudflare Workers!"))
app.route('/articles', articles);
app.route('/stripe', stripeEndpoint);
app.route('/mail', mailEndpoint);
app.route('/newsletter', newsletterEndpoint);
app.route('/blogs', blogs);

export default app