# 0002 - Anonymous Identity via Fingerprint Hashing

## Status

Accepted

## Context

ShareLlama needed a way to:

- Allow users to submit configurations without creating accounts
- Prevent spam and abuse
- Enable users to edit/delete their own submissions
- Track votes per user (one vote per user per submission)
- Preserve user privacy (no PII storage)

Traditional authentication (email/password, OAuth) creates friction and requires storing user data. We wanted a frictionless experience while maintaining basic abuse prevention.

## Decision

**Anonymous Identity System:**

1. **Browser Fingerprint:** Generate a unique identifier from browser properties
2. **SHA-256 Hash:** Hash the fingerprint server-side (one-way, privacy-preserving)
3. **Storage:** Store only the hash (never the raw fingerprint)
4. **Admin Token:** Generate random 32-char token for edit/delete operations
5. **Return Once:** Show admin token to user only at creation time

### Implementation

```typescript
// Client-side: collect fingerprint
const fingerprint = await getBrowserFingerprint();

// Send with requests
headers: { "X-Fingerprint": fingerprint }

// Server-side: hash and store
const authorHash = await hashFingerprint(fingerprint);
const editToken = await generateToken(32);

// Store hash, never raw fingerprint
await db.insert(submissions).values({ authorHash, editToken, ... });
```

### Admin Token Pattern

- Random 32-character hex string
- Stored in database (hashed or plain)
- Returned once to user at creation
- Required for PATCH /submissions/:id/admin/:token
- Required for DELETE /submissions/:id/admin/:token
- Lost token = lost ability to edit (intentional)

### Vote Tracking

```typescript
// One vote per (voterHash, submissionId)
UNIQUE(voterHash, submissionId) constraint

// Vote value: 1 (upvote) or -1 (downvote)
// Same vote twice = remove vote
// Different vote = update vote
```

## Consequences

### Positive

- **No accounts required:** Zero friction for first-time users
- **Privacy-preserving:** No email, username, or PII stored
- **Abuse prevention:** Fingerprint makes it harder to spam
- **Edit capability:** Admin token allows anonymous ownership
- **Vote integrity:** One vote per user per submission

### Negative

- **Token loss:** Users who lose admin token can't edit submissions
- **Fingerprint changes:** Clearing browser data changes identity
- **No cross-device:** Identity tied to specific browser/device
- **Limited recovery:** No way to recover lost tokens
- **Potential collisions:** Theoretical fingerprint collisions (rare)

### Mitigations

- **Clear UX warnings:** "Save this link - you'll lose edit access"
- **Copy-to-clipboard:** Auto-copy admin link
- **Fingerprint stability:** Use stable browser properties
- **Rate limiting:** Prevent spam even from same fingerprint

## Alternatives Considered

### 1. Full User Accounts (Auth0, Clerk, etc.)

**Pros:**

- Password recovery
- Cross-device sync
- Better abuse prevention

**Cons:**

- High friction (email verification, passwords)
- Privacy concerns (PII storage)
- Infrastructure complexity
- Cost at scale

**Verdict:** Overkill for simple config sharing

### 2. Magic Links (Passwordless Email)

**Pros:**

- No passwords
- Email-based recovery
- Cross-device capable

**Cons:**

- Still requires email (privacy)
- Email delivery issues
- Slower UX (check email)

**Verdict:** Still too much friction for our use case

### 3. LocalStorage-Only Identity

**Pros:**

- Simple
- No server changes

**Cons:**

- Easy to lose (clear browser)
- No spam prevention
- Can't track across sessions

**Verdict:** Insufficient for abuse prevention

### 4. Wallet-Based (Web3)

**Pros:**

- True ownership
- Cross-device
- No central authority

**Cons:**

- Huge friction for non-crypto users
- Unnecessary complexity
- Gas fees (if on-chain)

**Verdict:** Wrong audience, wrong problem

## Technical Details

### Fingerprint Generation

Use stable browser properties:

- User agent
- Screen resolution
- Timezone
- Language
- Canvas fingerprint (optional)
- WebGL fingerprint (optional)

Avoid:

- Cookies (can be cleared)
- LocalStorage (can be cleared)
- IP address (changes, privacy)

### Hashing Algorithm

**SHA-256** via Web Crypto API:

```typescript
async function hashFingerprint(fingerprint: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(fingerprint);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
}
```

**Why SHA-256:**

- One-way (can't reverse to get fingerprint)
- Fast (no need for slow hashing like bcrypt)
- Standard (crypto.subtle API available everywhere)
- 256-bit output (collision-resistant)

### Admin Token Generation

```typescript
async function generateToken(length: number): Promise<string> {
  const bytes = new Uint8Array(length);
  crypto.getRandomValues(bytes);
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("")
    .slice(0, length);
}
```

**Why 32 characters:**

- 256 bits of entropy (32 bytes = 256 bits)
- URL-safe (hex encoding)
- Short enough to copy, long enough to be secure

## Security Considerations

### Fingerprint Spoofing

**Risk:** Attacker could spoof fingerprint to impersonate

**Mitigation:**

- Combine multiple properties (harder to spoof all)
- Rate limiting per fingerprint
- Turnstile CAPTCHA for submissions

### Token Enumeration

**Risk:** Attacker could guess admin tokens

**Mitigation:**

- 32 hex chars = 256 bits of entropy
- Rate limiting on admin endpoints
- Constant-time comparison (prevent timing attacks)

### Hash Collisions

**Risk:** Two fingerprints produce same hash

**Mitigation:**

- SHA-256 collision probability: ~1 in 2^128 (negligible)
- Even if collision occurs, minimal impact (wrong vote attribution)

## Future Improvements

1. **Optional email binding:** Allow users to add email later for recovery
2. **Account upgrade path:** Convert anonymous submissions to account
3. **Better fingerprinting:** Use more stable browser properties
4. **Device linking:** Allow multiple devices per identity (with consent)

## References

- [FingerprintJS](https://fingerprintjs.com) - Commercial fingerprinting service
- [Browser Fingerprinting Survey](https://arxiv.org/abs/2005.02115) - Academic research
- [Web Crypto API](https://developer.mozilla.org/en-US/docs/Web/API/Web_Crypto_API)
- [Cloudflare Turnstile](https://www.cloudflare.com/products/turnstile/)
