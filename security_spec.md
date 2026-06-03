# Security Specification for Sri Srinivasa Kirana & General Store

This document specifies the security requirements and the "Dirty Dozen" payloads designed to test and harden the Firestore security rules.

## Data Invariants
1. Unauthenticated users cannot read or write to any collection.
2. Users can only write data within their own store boundaries (e.g. valid fields and roles).
3. The `role` field on a user is set securely; unauthenticated or staff users cannot privilege escalate themselves.
4. Transaction types are checked strictly, and transaction amounts/inventories cannot result in random state shortcuts.
5. All timestamps (`createdAt`, `updatedAt`, `timestamp`) must match `request.time`.

## The "Dirty Dozen" Payloads (Red Team Security Attacks)

1. **Anonymous Read Attempt on Products**: An unauthenticated user tries to fetch products.
2. **Anonymous Write Attempt on Products**: An unauthenticated user tries to create a product.
3. **Privilege Escalation on User Profile**: A staff user tries to update their own role from `staff` to `owner`.
4. **Identity Spoofing on User Profile Creation**: An authenticated user tries to create a user profile with a different user ID than their own authenticated UID.
5. **Ghost Field in Product**: A manager tries to create a product containing a custom field like `isUltraDiscounted: true` (Shadow Update Test).
6. **Negative Inventory Adjustment**: A user tries to set product stock to a negative number (`currentStock: -10`) during an update.
7. **Negative Prices**: A user tries to set product purchasePrice or sellingPrice below zero during creation or update.
8. **Invalid Transaction Type Manipulation**: A staff user tries to record a transaction with type `theft_by_aliens`.
9. **Mismatched Staff ID**: A user tries to create a transaction with `staffId` pointing to another user.
10. **Client-Forced Future Timestamps**: A user tries to set `createdAt` in a transaction or product to a future date instead of the server timestamp (`request.time`).
11. **Malicious ID Poisoning**: A user tries to insert a product with a 1MB string or high-byte characters as the `productId`.
12. **PII Data Scraping Blanket Query**: An authenticated staff or outsider tries to run `getDocs()` on the entire `users` collection containing PII (names, phone numbers, emails) without scoping queries correctly or when they do not have appropriate permissions (Staff shouldn't read all user details).

## Secure Rules Policy
We implement strict validation helpers inside `DRAFT_firestore.rules` and `firestore.rules`.
All write operations will be strictly verified via `isValidId()`, `isValid[Entity]()`, and restrictive role structures.
The rules require `request.auth != null`.
We will run ESLint rules verification to verify security compliance.
