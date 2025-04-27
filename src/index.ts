import {Hono} from 'hono'
import articles from './articles'
import stripeEndpoint from "./stripe";

const app = new Hono()

app.get('/', (c) => c.text("Hello Cloudflare Workers!"))
app.route('/articles', articles);
app.route('/stripe', stripeEndpoint);

export default app