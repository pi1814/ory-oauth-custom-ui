import express from 'express';
import { hydraAdmin } from '../app';

const router = express.Router();

router.get('/', async (req, res, next) => {
  const challenge = req.query.consent_challenge as string;

  if (!challenge) {
    return res.status(400).send('Consent challenge is missing');
  }

  try {
    // Get consent request from Hydra
    const consentRequest = await hydraAdmin.getOAuth2ConsentRequest({
      consentChallenge: challenge
    });

    // Check if we can skip consent
    if (consentRequest.skip) {
      const acceptData = await hydraAdmin.acceptOAuth2ConsentRequest({
        consentChallenge: challenge,
        acceptOAuth2ConsentRequest: {
          grant_scope: consentRequest.requested_scope,
          grant_access_token_audience: consentRequest.requested_access_token_audience,
          session: {
            id_token: {
              email: (consentRequest.context && typeof consentRequest.context === 'object' && 'email' in consentRequest.context)
                ? (consentRequest.context as { email?: string }).email
                : undefined
            }
          }
        }
      });
      return res.redirect(acceptData.redirect_to);
    }

    // Render consent form
    res.render('consent', {
      challenge,
      client: consentRequest.client,
      requested_scope: consentRequest.requested_scope,
      action: '/consent',
      csrfToken: req.csrfToken?.() || ''
    });

  } catch (error) {
    console.error('Consent GET error:', error);
    return next(error);
  }
});

router.post('/', async (req, res, next) => {
  const challenge = req.body.challenge;
  const grantScope = req.body.grant_scope || [];
  const remember = req.body.remember;

  if (!challenge) {
    return res.status(400).send('Consent challenge is missing');
  }

  try {
    // Get consent request
    const consentRequest = await hydraAdmin.getOAuth2ConsentRequest({
      consentChallenge: challenge
    });

    // Accept or reject consent
    if (req.body.submit === 'Deny access') {
      const rejectData = await hydraAdmin.rejectOAuth2ConsentRequest({
        consentChallenge: challenge,
        rejectOAuth2Request: {
          error: 'access_denied',
          error_description: 'The resource owner denied the request'
        }
      });
      return res.redirect(rejectData.redirect_to);
    }

    // Accept consent
    const acceptData = await hydraAdmin.acceptOAuth2ConsentRequest({
      consentChallenge: challenge,
      acceptOAuth2ConsentRequest: {
        grant_scope: Array.isArray(grantScope) ? grantScope : [grantScope],
        grant_access_token_audience: consentRequest.requested_access_token_audience,
        remember: Boolean(remember),
        remember_for: 3600,
        session: {
          id_token: {
            email: (consentRequest.context && typeof consentRequest.context === 'object' && 'email' in consentRequest.context)
              ? (consentRequest.context as { email?: string }).email
              : undefined
          },
          access_token: {
            custom_claim: 'custom_value'
          }
        }
      }
    });

    res.redirect(acceptData.redirect_to);

  } catch (error) {
    console.error('Consent POST error:', error);
    return next(error);
  }
});

module.exports = router;
