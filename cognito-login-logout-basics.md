# Cognito + SPA Auth: Simple Guide

This guide explains how login and logout work for a Single‑Page App (SPA) with Amazon Cognito. Plain language. Minimal jargon.

---

## 1) The players
- **Your SPA**: the browser app.
- **Your API**: backend that accepts requests with an **access token**.
- **Identity Provider (IdP)**: **Amazon Cognito**. Hosts the login page and issues tokens.

---

## 2) Login flow (Authorization Code + PKCE)
1. SPA redirects the user to Cognito `/authorize` with:
   - `client_id`, `redirect_uri`, `response_type=code`, `scope`, and `code_challenge`.
2. User signs in on Cognito’s page.
3. Cognito redirects back to your `redirect_uri` with a one‑time **code**.
4. SPA exchanges the code at `/oauth2/token` with `code_verifier`.
5. Cognito returns tokens. SPA stores them and the user is “logged in”.

**Why PKCE?** It binds the code to your SPA so a stolen code cannot be used elsewhere.

**Endpoints live on the Hosted UI domain**:  
`https://<domain-prefix>.auth.<region>.amazoncognito.com`

- `/authorize`  
- `/oauth2/token`  
- `/logout`  
- `/oauth2/revoke`

---

## 3) Tokens
- **ID token** (JWT): who the user is. For the UI. Contains claims like `email`, `sub`, `cognito:groups`, `exp`.
- **Access token** (JWT): what the app can do. Sent to your API in `Authorization: Bearer <token>`.
- **Refresh token** (opaque string): lets the SPA fetch new ID/Access tokens without a new login.

**Lifetimes** are set per app client in Cognito. Access is short‑lived. Refresh is long‑lived (days–weeks).

---

## 4) Where to store tokens in a SPA
- Prefer **memory** or **sessionStorage**.
- Avoid `localStorage` for high‑risk apps.
- Never put tokens in URLs.

---

## 5) Refresh flow
1. Access token expires.
2. SPA calls `/oauth2/token` with `grant_type=refresh_token`, the **refresh token**, and `client_id`.
3. Cognito returns a new access token (and usually a new ID token).

---

## 6) Calling your API
- Send the **access token** in the header:
  ```http
  GET /patients HTTP/1.1
  Host: api.example.com
  Authorization: Bearer <ACCESS_TOKEN>
  ```
- API validates signature and claims:
  - `iss` matches your user pool issuer
  - `aud`/`client_id` matches expectation
  - `exp` not expired
  - scopes or groups as needed

---

## 7) Logout types
1. **Local logout**: clear tokens in the SPA. Fast, but the Cognito session and refresh token may still work.
2. **Server session logout**: browser goes to:
   ```
   https://<hosted-ui>/logout?client_id=<CLIENT_ID>&logout_uri=<ALLOWED_SIGN_OUT_URL>
   ```
   Cognito clears its Hosted UI cookie and redirects to `logout_uri`.
3. **Refresh token revoke**:
   ```http
   POST https://<hosted-ui>/oauth2/revoke
   Content-Type: application/x-www-form-urlencoded

   token=<REFRESH_TOKEN>&token_type_hint=refresh_token&client_id=<CLIENT_ID>
   ```
   Cognito invalidates the refresh token on the server.

**Note**: Already‑issued **access tokens** keep working until they expire. That is normal for OAuth.

---

## 8) Cognito checklist
- Use the **Hosted UI domain** as your base: `https://<prefix>.auth.<region>.amazoncognito.com`.
- App client: Authorization Code (PKCE). “Enable token revocation” on.
- **Allowed callback URLs** include your `redirect_uri` (e.g., `http://localhost:4200/`).
- **Allowed sign‑out URLs** include your `logout_uri` (e.g., `http://localhost:4200/auth/login`).
- Scopes: `openid email phone profile` (plus any custom scopes you use).

---

## 9) Typical SPA behavior
**On app start**  
- Call a `checkAuth()` method. If not authenticated, redirect to Hosted UI `/authorize`.

**On logout button**  
- Revoke the refresh token at `/oauth2/revoke` (server logout of refresh).  
- Clear local state (local logout).  
- Redirect browser to `/logout?client_id=...&logout_uri=...` (server session logout).  
- Land on your app (e.g., `/` or `/auth/login`). The app’s `checkAuth()` detects no session and sends to Hosted UI if needed.

---

## 10) Common mistakes
- Using the user‑pool issuer URL (`cognito-idp`) as the authority instead of the Hosted UI domain.
- Not adding `client_id` to the revoke request.
- `logout_uri` not in “Allowed sign‑out URLs”.
- Sending the **ID token** to your API instead of the **access token**.
- Clock skew causing “token expired” right after login.

---

## 11) Quick reference
**Authorize (start login):**
```
GET https://<hosted-ui>/authorize?
  client_id=<CLIENT_ID>&
  redirect_uri=<CALLBACK_URL>&
  response_type=code&
  scope=openid%20email%20profile&
  code_challenge=<CHALLENGE>&
  code_challenge_method=S256
```

**Token (exchange code):**
```
POST https://<hosted-ui>/oauth2/token
Content-Type: application/x-www-form-urlencoded

grant_type=authorization_code&
code=<CODE>&
redirect_uri=<CALLBACK_URL>&
client_id=<CLIENT_ID>&
code_verifier=<VERIFIER>
```

**Refresh:**
```
POST https://<hosted-ui>/oauth2/token
Content-Type: application/x-www-form-urlencoded

grant_type=refresh_token&
refresh_token=<REFRESH_TOKEN>&
client_id=<CLIENT_ID>
```

**Logout (clear Hosted UI session):**
```
GET https://<hosted-ui>/logout?client_id=<CLIENT_ID>&logout_uri=<ALLOWED_SIGN_OUT_URL>
```

**Revoke (invalidate refresh token):**
```
POST https://<hosted-ui>/oauth2/revoke
Content-Type: application/x-www-form-urlencoded

token=<REFRESH_TOKEN>&token_type_hint=refresh_token&client_id=<CLIENT_ID>
```

---

## 12) Glossary
- **IdP**: Identity Provider. Authenticates users and issues tokens.
- **OIDC**: OpenID Connect. Adds identity (ID token) to OAuth 2.0.
- **OAuth 2.0**: Protocol for delegated access (access and refresh tokens).
- **PKCE**: Mechanism that secures public clients like SPAs.
- **Scopes**: Requested permissions.
- **Claims**: Fields inside a token (e.g., `email`, `exp`).
- **JWKS**: Public keys endpoint used to verify JWT signatures.

---

## 13) Minimal mental model
- **Login** = redirect to Cognito → get tokens → store.  
- **API calls** = send **access token**.  
- **Refresh** = swap refresh token for new tokens.  
- **Logout** = revoke refresh token + clear local + `/logout`.
