import express from 'express';
import { hydraAdmin } from '../app';

const router = express.Router();

// Mock user database (replace with your actual user management)
const users = [
  { id: '1', email: 'user@example.com', password: 'password123' },
  { id: '2', email: 'admin@example.com', password: 'admin123' }
];

function authenticateUser(email: string, password: string) {
  return users.find(user => user.email === email && user.password === password);
}

router.get('/', async (req, res, next) => {
  const challenge = req.query.login_challenge as string;

  if (!challenge) {
    return res.status(400).send('Login challenge is missing');
  }

  try {
    // Get login request from Hydra
    const loginRequest = await hydraAdmin.getOAuth2LoginRequest({
      loginChallenge: challenge
    });

    // Check if we can skip login (user already authenticated)
    if (loginRequest.skip) {
      const acceptData = await hydraAdmin.acceptOAuth2LoginRequest({
        loginChallenge: challenge,
        acceptOAuth2LoginRequest: {
          subject: loginRequest.subject!,
          remember: false,
          remember_for: 3600
        }
      });
      return res.redirect(acceptData.redirect_to);
    }

    // Render login form
    res.render('login', {
      challenge,
      action: '/login',
      csrfToken: req.csrfToken?.() || ''
    });

  } catch (error) {
    console.error('Login GET error:', error);
    return next(error);
  }
});

router.post('/', async (req, res, next) => {
  const challenge = req.body.challenge;
  const email = req.body.email;
  const password = req.body.password;
  const remember = req.body.remember;

  if (!challenge) {
    return res.status(400).send('Login challenge is missing');
  }

  try {
    // Get login request
    const loginRequest = await hydraAdmin.getOAuth2LoginRequest({
      loginChallenge: challenge
    });

    // Authenticate user
    const user = authenticateUser(email, password);

    if (!user) {
      return res.render('login', {
        challenge,
        error: 'Invalid credentials',
        action: '/login',
        csrfToken: req.csrfToken?.() || ''
      });
    }

    // Accept login request
    const acceptData = await hydraAdmin.acceptOAuth2LoginRequest({
      loginChallenge: challenge,
      acceptOAuth2LoginRequest: {
        subject: user.id,
        remember: Boolean(remember),
        remember_for: 3600,
        context: {
          email: user.email
        }
      }
    });

    res.redirect(acceptData.redirect_to);

  } catch (error) {
    console.error('Login POST error:', error);
    return next(error);
  }
});

module.exports = router;
