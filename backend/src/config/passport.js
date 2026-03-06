import passport from 'passport';
import { Strategy as GoogleStrategy } from 'passport-google-oauth20';
import config from './index.js';

passport.use(
  new GoogleStrategy(
    {
      clientID:     config.google.clientId,
      clientSecret: config.google.clientSecret,
      callbackURL:  config.google.callbackUrl,
    },
    // The verify callback — called after Google returns the profile.
    // We pass the raw profile straight through; account lookup/creation
    // happens in the route handler so we can use the shared pool + logger.
    (_accessToken, _refreshToken, profile, done) => {
      done(null, profile);
    }
  )
);

export default passport;
