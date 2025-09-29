# Ory Hydra OAuth2 Custom UI Example (Node.js)

This repository demonstrates a complete OAuth2 authentication flow using [Ory Hydra](https://www.ory.sh/hydra) as the authorization server, with custom Node.js applications for both the OAuth2 client and the login/consent UI.

## Architecture

- **Ory Hydra**: OAuth2 server (token issuance, validation, flows)
- **Login & Consent App**: Node.js app for user authentication and consent screens
- **Client App**: Node.js app that authenticates users via OAuth2
- **Resource Server**: (optional) API server that validates access tokens

## Folder Structure

```
ory-oauth2-app/
  hydra-setup/         # Hydra config and Docker Compose
  login-consent-app/   # Custom login & consent UI (TypeScript, Pug)
  client-app/          # OAuth2 client app (Express)
```

## Quick Start

### 1. Prerequisites

- Docker & Docker Compose
- Node.js (v12+)
- Git

### 2. Hydra Setup

```sh
cd ory-oauth2-app/hydra-setup
docker-compose up -d
```

Hydra runs on:
- Public: `http://0.0.0.0:4444`
- Admin: `http://0.0.0.0:4445`

### 3. Login & Consent App

```sh
cd ../login-consent-app
npm install
npm run build
npm run dev
```

Runs on: `http://0.0.0.0:3000`

### 4. Client App

```sh
cd ../client-app
npm install
npm start
```

Runs on: `http://0.0.0.0:4000`

### 5. Create OAuth2 Client

```sh
docker exec -it ory-oauth2-app_hydra_1 \
  hydra create client \
  --endpoint http://0.0.0.0:4445 \
  --name "My Node.js App" \
  --grant-types authorization_code,refresh_token \
  --response-types code \
  --scope openid,offline_access,email \
  --redirect-uris http://0.0.0.0:4000/callback
```

Copy the `CLIENT_ID` and `CLIENT_SECRET` into `client-app/.env`.

### 6. Test the Flow

1. Go to `http://0.0.0.0:4000`
2. Click "Login with OAuth2"
3. Login at `http://0.0.0.0:3000/login` (use `user@example.com` / `password123`)
4. Grant consent
5. Redirected back to client app with access token

## Security & Production Notes

- Use HTTPS in production
- Set secure session secrets
- Enable rate limiting and CSRF protection
- Use managed PostgreSQL for Hydra
- See guide for advanced topics: PKCE, custom scopes, token validation, logging

## References

- [Ory Hydra Docs](https://www.ory.sh/docs/hydra/self-hosted/quickstart)
- [Custom Login & Consent UI](https://www.ory.sh/docs/oauth2-oidc/custom-login-consent/flow)
- [OAuth2 Node.js Example](https://www.ory.sh/docs/getting-started/oauth2-openid/add-oauth2-openid-connect-nodejs-expressjs)

---

This project is a test project for OAuth2 authentication with custom UI using Ory Hydra and Node.js. Extend it for your own user management, social login, or advanced security needs.