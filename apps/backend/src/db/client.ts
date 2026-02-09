import postgres from "postgres";

const client = postgres(Bun.env.DATABASE_URL!, {
  ssl: 'require'
})

export default client;