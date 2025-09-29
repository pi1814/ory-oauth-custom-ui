const express = require('express');
const session = require('express-session');
const { AuthorizationCode } = require('simple-oauth2');
const crypto = require('crypto');
require('dotenv').config();
const csrf =  require('csurf');
const cookieParser = require('cookie-parser'); 

const app = express();
const port = process.env.PORT || 4000;


if (!process.env.CLIENT_ID || !process.env.CLIENT_SECRET) {
  console.error('Error: CLIENT_ID and CLIENT_SECRET environment variables must be set.');
  process.exit(1);
}

// OAuth2 client configuration
const oauth2Client = new AuthorizationCode({
  client: {
    id: process.env.CLIENT_ID, // Set from OAuth2 client creation
    secret: process.env.CLIENT_SECRET, // Set from OAuth2 client creation
  },
  auth: {
    tokenHost: 'http://0.0.0.0:4444',
    tokenPath: '/oauth2/token',
    authorizePath: '/oauth2/auth',
  },
});

const cors = require('cors');
const csrfProtection = csrf({ cookie: false });

// Add this before your routes
app.use(cors({
  origin: 'http://0.0.0.0', // your client origin
  credentials: true // Allow cookies to be sent
}));

app.use(cookieParser());


// Session middleware
app.use(session({
  secret: 'your-session-secret',
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: false,        // Set to true only if HTTPS
    sameSite: 'lax',      // 'lax' is best for OAuth2
    domain: '0.0.0.0',  // or custom domain, omit for default
    httpOnly: true
  },
  withCredentials: true
}));

// Routes
app.get('/', csrfProtection, (req, res) => {
  if (req.session.accessToken) {
    res.json({
      message: 'You are authenticated!',
      token: req.session.accessToken
    });
  } else {
    res.send(`
      <h1>OAuth2 Demo Client</h1>
      <p>You are not authenticated.</p>
      <a href="/auth">Login with OAuth2</a>
    `);
  }
});

app.get('/auth', csrfProtection, (req, res) => {
  const authorizationUri = oauth2Client.authorizeURL({
    redirect_uri: 'http://0.0.0.0:4000/callback',
    scope: 'openid offline_access email',
    state: crypto.randomBytes(16).toString('hex'),
    withCredentials: true
  });

  res.redirect(authorizationUri);
});

app.get('/callback', csrfProtection, async (req, res) => {
  const { code, state } = req.query;

  if (!code) {
    return res.status(400).send('Authorization code is missing');
  }

  try {
    // Exchange authorization code for access token
    const result = await oauth2Client.getToken({
      code,
      redirect_uri: 'http://0.0.0.0:4000/callback',
      scope: 'openid offline_access email',
      withCredentials: true
    });

    // Store tokens in session
    req.session.accessToken = result.token.access_token;
    req.session.refreshToken = result.token.refresh_token;
    req.session.idToken = result.token.id_token;

    res.redirect('/');
  } catch (error) {
    console.error('Token exchange error:', error);
    res.status(500).send('Authentication failed');
  }
});

app.get('/logout', csrfProtection, (req, res) => {
  req.session.destroy();
  res.redirect('/');
});

app.get('/profile', csrfProtection, (req, res) => {
  if (!req.session.accessToken) {
    return res.status(401).send('Not authenticated');
  }

  // In a real application, you would use the access token to call protected APIs
  res.json({
    message: 'This is a protected resource',
    accessToken: req.session.accessToken,
    idToken: req.session.idToken
  });
});

app.listen(port, () => {
  console.log(`Client app listening at http://0.0.0.0:${port}`);
});
