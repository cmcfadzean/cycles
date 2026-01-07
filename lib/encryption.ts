import crypto from "crypto";

const ALGORITHM = "aes-256-gcm";
const IV_LENGTH = 16;
const AUTH_TAG_LENGTH = 16;

function getEncryptionKey(): Buffer {
  const secret = process.env.ENCRYPTION_SECRET;
  if (!secret) {
    throw new Error("ENCRYPTION_SECRET environment variable not configured");
  }
  // Create a 32-byte key from the secret using scrypt
  return crypto.scryptSync(secret, "cycles-app-salt", 32);
}

/**
 * Encrypts a plaintext string using AES-256-GCM
 * Returns a hex string containing: IV + AuthTag + EncryptedData
 */
export function encrypt(plaintext: string): string {
  const key = getEncryptionKey();
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);

  let encrypted = cipher.update(plaintext, "utf8", "hex");
  encrypted += cipher.final("hex");

  const authTag = cipher.getAuthTag();

  // Combine: IV (32 hex chars) + AuthTag (32 hex chars) + Encrypted data
  return iv.toString("hex") + authTag.toString("hex") + encrypted;
}

/**
 * Decrypts an encrypted string back to plaintext
 * Expects hex string format: IV + AuthTag + EncryptedData
 */
export function decrypt(encryptedText: string): string {
  const key = getEncryptionKey();

  // Extract components from the combined string
  const iv = Buffer.from(encryptedText.slice(0, IV_LENGTH * 2), "hex");
  const authTag = Buffer.from(
    encryptedText.slice(IV_LENGTH * 2, (IV_LENGTH + AUTH_TAG_LENGTH) * 2),
    "hex"
  );
  const encrypted = encryptedText.slice((IV_LENGTH + AUTH_TAG_LENGTH) * 2);

  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(authTag);

  let decrypted = decipher.update(encrypted, "hex", "utf8");
  decrypted += decipher.final("utf8");

  return decrypted;
}

