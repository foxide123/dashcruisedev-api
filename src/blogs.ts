import { zValidator } from "@hono/zod-validator";
import { z } from 'zod';
import { createClient } from "@supabase/supabase-js";
import { Hono } from "hono";

type Bindings = {
    SUPABASE_URL: string;
    SUPABASE_KEY: string;
}

const blogs = new Hono<{ Bindings: Bindings }>();

blogs.get("/", async (c) => {
    const supabase = createClient(c.env.SUPABASE_URL, c.env.SUPABASE_KEY);

    const response = await supabase.from('blog').select("*");

    return c.json(response);
})

blogs.get("/:id",  zValidator('param', z.object({ id: z.string() })), async (c) => {
    const { id } = c.req.valid('param');
    const supabase = createClient(c.env.SUPABASE_URL, c.env.SUPABASE_KEY);

    const response = await supabase.from('blog').select('*').eq('id', id);

    return c.json(response);
})

export default blogs;