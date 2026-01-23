create table if not exists refresh_tokens (
  id serial primary key,
  user_id integer not null references users(id) on delete cascade,
  token varchar(380) not null,
  expires_at timestamp not null,
  created_at timestamp not null default current_timestamp,
  revoked_at timestamp
);
