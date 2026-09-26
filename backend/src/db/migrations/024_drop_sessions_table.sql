-- express-session/connect-pg-simple was leftover scaffolding from the initial
-- (incomplete) commit: it never backed real authorization (requireAuth verifies
-- the JWT statelessly) and nothing besides express-session itself read from it.
-- Auth is now a single mechanism (JWT via Authorization: Bearer).
DROP TABLE IF EXISTS sessions;
