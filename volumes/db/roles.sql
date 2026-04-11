-- Set passwords for all internal Supabase users
-- This runs on first database initialization
\set pgpass `echo "$POSTGRES_PASSWORD"`

ALTER USER authenticator WITH PASSWORD :'pgpass';
ALTER USER supabase_auth_admin WITH PASSWORD :'pgpass';
ALTER USER supabase_storage_admin WITH PASSWORD :'pgpass';
ALTER USER supabase_replication_admin WITH PASSWORD :'pgpass';
ALTER USER supabase_read_only_user WITH PASSWORD :'pgpass';
