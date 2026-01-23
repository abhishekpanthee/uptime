create table if not exists ownership (
  website_url varchar(254) primary key,
  owner_id integer not null references users(id) on delete cascade,
  is_public boolean not null default false
);
