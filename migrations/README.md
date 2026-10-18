# Database migrations

Apply `001-game-revision.sql` to the existing PostgreSQL database before starting the server from PR #4 or a later branch. It gives every existing game revision 0; new games receive revision 0 automatically.

Run the SQL with the database owner, for example `psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f migrations/001-game-revision.sql`. Do not run migrations against a production database as part of the test suite.
