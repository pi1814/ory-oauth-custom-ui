import express from 'express';
import session from 'express-session';
import cookieParser from 'cookie-parser';
import bodyParser from 'body-parser';
import csrf from 'csurf';
import path from 'path';
import { Configuration, OAuth2Api } from '@ory/client-fetch';
require('dotenv').config();

import cors from 'cors';

const app = express();
const port = process.env.PORT || 3000;

console.log('Hydra Admin URL:', process.env.HYDRA_ADMIN_URL);

if (!process.env.HYDRA_ADMIN_URL) {
  console.error('Error: HYDRA_ADMIN_URL environment variable must be set.');
  process.exit(1);
}

// Configure Ory Hydra client
const hydraAdmin = new OAuth2Api(
  new Configuration({
    basePath: process.env.HYDRA_ADMIN_URL || 'http://0.0.0.0:4445',
  })
);

app.use(session({
  secret: process.env.COOKIE_SECRET || 'change-me-in-production',
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: false,        // Set to true only if HTTPS
    sameSite: 'lax',      // 'lax' is best for OAuth2
    domain: '0.0.0.0',  // or custom domain, omit for default
    httpOnly: true
  }
}));

// View engine setup
app.set('view engine', 'pug');
app.set('views', path.join(__dirname, '../views'));

// Move CORS to the top (or at least before session and csrf)
app.use(cors({
  origin: ['http://0.0.0.0:3000', 'http://127.0.0.1:3000'],
  credentials: true
}));

app.use(cookieParser());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());

app.use(session({
  secret: process.env.COOKIE_SECRET || 'change-me',
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: false,
    sameSite: 'lax',
    httpOnly: true
    // remove domain for testing
  }
}));

const csrfProtection = csrf({ cookie: true });

app.use('/login', csrfProtection, require('./routes/login'));
app.use('/consent', csrfProtection, require('./routes/consent'));

app.get('/', (req, res) => {
  res.render('index', { title: 'Ory Hydra Login & Consent App' });
});

app.listen(port, () => {
  console.log(`Login & Consent app listening at http://0.0.0.0:${port}`);
});

export { hydraAdmin };
