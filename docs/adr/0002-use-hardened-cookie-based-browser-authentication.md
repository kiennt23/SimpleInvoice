# ADR 0002: Use Hardened Cookie-Based Browser Authentication

Status: Accepted

Date: 2026-09-03

## Context

The assessment requires JWT-based authentication for a browser SPA and an API. The client-storage mechanism for the token was an open product decision (AUTH-007). The realistic candidates were browser storage with an Authorization header, or an HttpOnly cookie. Any token held in JavaScript-accessible browser storage is readable by script and exposed to XSS; any cookie is exposed to CSRF unless hardened. The proxy topology in the [architecture overview](../architecture.md) makes frontend and API same-origin, which shapes which hardening is practical.

## Decision

The API issues the JWT to the browser as a cookie, and the browser never touches the token value:

- `HttpOnly` and `SameSite=Lax` are always set. `HttpOnly` removes the token from JavaScript reachability, closing the XSS token-theft path that `localStorage` leaves open.
- `Secure` is required outside controlled local HTTP development, so production and hosted previews never send the cookie in cleartext.
- The cookie lifetime aligns with the configurable JWT expiry (AUTH-003), so the cookie never outlives the token it carries.
- Login sets the cookie; `GET /auth/me` restores the authenticated identity; when a protected-route request receives the eventual unauthenticated contract's response, the user is redirected to login. The unauthenticated status and body remain an open decision in the [requirements register](../requirements.md).
- Because `SameSite=Lax` alone does not cover all cross-site unsafe-request scenarios, every authenticated unsafe request (POST, PATCH, PUT, DELETE) must carry an `Origin` header that matches the configured application origin. A missing or mismatched Origin is rejected. The exact rejection status and body remain an open decision in the [requirements register](../requirements.md).
- Browser code never reads, stores, or transmits the token itself. There is no Authorization header path.

The normative rules live in the Requirements Specification's Authentication section. This ADR records only the rationale.

## Considered Alternatives

- **Bearer token in `localStorage` with an explicit Authorization header**: stateless and simple, and because the header is attached explicitly rather than automatically, it avoids classic cookie-style CSRF exposure. However, any storage JavaScript can read makes the bearer token reachable by an XSS bug, which exfiltrates a long-lived credential.
- **Token in memory only**: safest against storage theft, but the session dies on every refresh and `GET /auth/me` alone cannot restore a token that no longer exists.
- **`SameSite=Strict` cookie**: stronger CSRF posture, but it breaks the cookie on ordinary inbound navigations from other sites, which a reviewer's workflow may include.
- **Server-side sessions with opaque cookies**: solid, but the assessment explicitly requires JWT-based authentication, and this adds server-side session storage.

## Consequences

- All API calls must use relative, same-origin URLs through the proxy; a separately deployed API origin would need its own CSRF design.
- The backend must validate the `Origin` header on unsafe requests, which requires a configured application origin per environment.
- No logout or refresh-token mechanism is designed here; if either is approved later, it amends this ADR and the requirements.
- Login failure must store no cookie, matching AUTH-013.
- Cookie flags are environment-sensitive: a non-HTTPS deployment outside local development will not authenticate, by design.

## References

- [OWASP Session Management Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Session_Management_Cheat_Sheet.html)
- [OWASP Cross-Site Request Forgery Prevention Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Cross-Site_Request_Forgery_Prevention_Cheat_Sheet.html)
- [Architecture overview](../architecture.md)
- [Requirements Specification: Authentication](../requirements.md)
