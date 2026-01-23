create table if not exists analytics (
  id serial primary key,
  website_url varchar(254) not null references ownership(website_url) on delete cascade,
  ping5 integer,
  checked_at timestamp default current_timestamp
);
