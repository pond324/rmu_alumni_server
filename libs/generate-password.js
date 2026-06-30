export function generateSecurePassword() {
  const length = 12;

  const letters = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ";
  const numbers = "0123456789";
  const specials = "!@#$%^&*()_+[]{}|;:,.<>?";

  const allChars = letters + numbers + specials;

  let password = "";

  // ใส่อักขระบังคับอย่างน้อย 1 ตัว
  password += letters[Math.floor(Math.random() * letters.length)];
  password += numbers[Math.floor(Math.random() * numbers.length)];
  password += specials[Math.floor(Math.random() * specials.length)];

  // เติมส่วนที่เหลือด้วยอักขระผสม
  for (let i = 3; i < length; i++) {
    password += allChars[Math.floor(Math.random() * allChars.length)];
  }

  // สลับตำแหน่งอักขระแบบสุ่มเพื่อความปลอดภัย
  password = password
    .split("")
    .sort(() => 0.5 - Math.random())
    .join("");

  return password;
}

export function generateSecureUsername(length = 10) {
  const chars =
    "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";

  let username = "";

  for (let i = 0; i < length; i++) {
    username += chars[Math.floor(Math.random() * chars.length)];
  }

  return username;
}
