# PharmaGuard Security Specification

This specification governs client-side operations on Google Cloud Firestore, defining robust controls to prevent Identity Spoofing, Privilege Escalation, or Orphaned/Corrupted write attacks.

## 1. Data Invariants & Zero-Trust State Machine
1. **Medicines & Scanning Bounds**: Medicines registered by manufacturers cannot have their status altered by patients. Patients may increment `currentScanCount` during active verification, but cannot change descriptions or batch credentials.
2. **Scan Records Compliance**: Scans cannot reference non-existing medicines during checking without warning flags.
3. **Identity Preservation**: A user can only access, write, or query logs linked strictly with their verified phone format or email address. 
4. **Secure OTP Challenges**: Active verification OTP challenge tokens expire within a tight 10-minute validity envelope.

## 2. The "Dirty Dozen" Malicious Exploits blocked by 'firestore.rules'
1. **The Ghost Medicine Injection**: Attempting to push fake active medicines into `/medicines` collection from a user-tier account.
2. **Identity Spoofing**: Attempting to create a Scan record on behalf of someone else's phone/email.
3. **The Counterfeit State Skip**: Setting `result = 'GENUINE'` on a malicious or expired signature directly without an OTP match.
4. **The Scan Count Inflation**: Artificially incrementing scan counts past limit envelopes.
5. **Admin Claim Fraud**: Artificially registering user status as `role: 'ADMIN'` in general databases.
6. **Report Tampering**: Patients editing, resolving or deleting prior submitted reported cases on the watchtower command.
7. **PII Scraping**: Attempting a blanket query/fetch of scans or reports submitted by other patients without exact filters.
8. **Shadow Field Injection**: Saving an OTP log with an added `isOwner: true` simulated credential.
9. **The Denial of Wallet Attack**: Injecting 1MB of binary payload in description or comment fields.
10. **The Clock Offset Exploit**: Forcing `scannedAt` or `reportedAt` timestamp fields to hardcoded values rather than `request.time`.
11. **Orphaned Write Attack**: Triggering a counterfeit report with an invalid ID format.
12. **The Code Bypass**: Logging an authenticated verification state without a corresponding valid OTP log matching the target token.

These threat scenarios are locked by global security filters.
