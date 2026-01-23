create table if not exists users (
  id serial primary key,
  name varchar(38) not null,
  email varchar(254) not null unique,
  password varchar(255) not null,
  created_at timestamp default current_timestamp not null
);
