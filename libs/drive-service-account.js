// lib/drive-service-account.ts
import { google } from "googleapis";

const auth = new google.auth.GoogleAuth({
  credentials: {
    project_id: process.env.GOOGLE_PROJECT_ID,
    client_email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
    private_key: process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY?.replace(
      /\\n/g,
      "\n",
    ),
  },
  scopes: ["https://www.googleapis.com/auth/drive"],
});

const drive = google.drive({
  version: "v3",
  auth,
});

export async function verifyFolderAccess(folderId) {
  const drive = google.drive({ version: "v3", auth });

  try {
    await drive.files.get({ fileId: folderId, fields: "id, name, mimeType" });
    return true;
  } catch (err) {
    if (err.code === 404) return false; // ไม่มีสิทธิ์เข้าถึง หรือ folder id ผิด
    throw err;
  }
}
