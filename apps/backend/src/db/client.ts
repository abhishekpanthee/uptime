import postgres from "postgres";

const client = postgres(process.env.AIVEN_DATABASE_URL!, {
  ssl: 'require'
})

export default client;