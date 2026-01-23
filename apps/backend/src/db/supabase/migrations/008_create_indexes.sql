create index if not exists idx_users_email on users(email);
create index if not exists idx_ownership_owner_id on ownership(owner_id);
create index if not exists idx_analytics_website_url on analytics(website_url);
create index if not exists idx_refresh_tokens_user_id on refresh_tokens(user_id);
create index if not exists idx_password_reset_tokens_user_id on password_reset_tokens(user_id);
