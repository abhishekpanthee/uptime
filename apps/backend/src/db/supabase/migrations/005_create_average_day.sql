create table if not exists average_day (
  website_url varchar(254) not null references ownership(website_url) on delete cascade,
  day_id varchar(8) not null,
  avg integer not null,
  sample_count integer not null,
  checked_at timestamp not null,
  primary key (website_url, day_id)
);
