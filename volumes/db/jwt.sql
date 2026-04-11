-- Set JWT secret in the database so PostgREST can validate tokens
\set jwt_secret `echo "$JWT_SECRET"`

ALTER DATABASE postgres SET "app.settings.jwt_secret" TO :'jwt_secret';
ALTER DATABASE postgres SET "app.settings.jwt_exp" TO '3600';
