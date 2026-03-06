import passport from 'passport';
import config from './index.js';

// Only register the Google strategy when credentials are configured.
// Without this guard the server crashes on startup if the env vars are absent.
if (config.google.clientId && config.google.clientSecret) {
  const { Strategy: GoogleStrategy } = await import('passport-google-oauth20');
  passport.use(
    new GoogleStrategy(
      {
        clientID:     config.google.clientId,
        clientSecret: config.google.clientSecret,
        callbackURL:  config.google.callbackUrl,
      },
      (_accessToken, _refreshToken, profile, done) => {
        done(null, profile);
      }
    )
  );
}

export default passport;
