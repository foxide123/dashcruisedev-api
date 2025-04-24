import {Hono} from 'hono'
import articles from './articles'

const app = new Hono()

app.get('/', (c) => c.text("Hello Cloudflare Workers!"))
app.route('/articles', articles);

export default app