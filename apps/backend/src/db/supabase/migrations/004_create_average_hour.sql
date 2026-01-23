create table if not exists average_hour (
  website_url varchar(254) not null references ownership(website_url) on delete cascade,
  hour_id varchar(10) not null,
  avg integer not null,
  sample_count integer not null,
  checked_at timestamp not null,
  primary key (website_url, hour_id)
);
