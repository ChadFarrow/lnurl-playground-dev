import crypto from "crypto";

// Encrypt function
export function encrypt(token, text) {
  const key = Buffer.from(token, "utf-8"); // Key used for encryption
  const iv = Buffer.alloc(16, 0); // Initialization vector (IV), typically random, but using a fixed IV here

  const cipher = crypto.createCipheriv("aes-256-cbc", key, iv);
  let encrypted = cipher.update(text, "utf8", "hex");
  encrypted += cipher.final("hex");
  return encrypted;
}

// Decrypt function
export function decrypt(token, encryptedText) {
  const key = Buffer.from(token, "utf-8"); // Key used for decryption
  const iv = Buffer.alloc(16, 0); // Same IV used for encryption

  const decipher = crypto.createDecipheriv("aes-256-cbc", key, iv);
  let decrypted = decipher.update(encryptedText, "hex", "utf8");
  decrypted += decipher.final("utf8");
  return decrypted;
}
