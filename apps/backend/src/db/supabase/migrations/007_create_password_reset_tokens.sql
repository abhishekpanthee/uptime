create table if not exists password_reset_tokens (
  id serial primary key,
  user_id integer not null references users(id) on delete cascade,
  token varchar(255) not null,
  expires_at timestamp not null,
  created_at timestamp not null default current_timestamp,
  used_at timestamp
);
