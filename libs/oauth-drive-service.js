import { google } from "googleapis";
import { Readable } from "stream";
import fs from "fs";
import path from "path";
const oauth2Client = new google.auth.OAuth2(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET,
);

oauth2Client.setCredentials({
  refresh_token: process.env.GOOGLE_REFRESH_TOKEN,
});

export const drive = google.drive({
  version: "v3",
  auth: oauth2Client,
});

export const uploadFileToDrive = async (fileBuffer, fileName, folderId) => {
  const folder = await drive.files.get({
    fileId: folderId,
    fields: "id,name,driveId,owners",
    supportsAllDrives: true,
  });
  if (!folder) return false;

  const stream = Readable.from(fileBuffer);

  const response = await drive.files.create({
    supportsAllDrives: true,
    requestBody: {
      name: fileName,
      parents: [folderId],
    },
    media: {
      mimeType:
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      body: stream,
    },
    fields: "id,name,webViewLink",
  });

  return response.data;
};

export const uploadFolderToDrive = async (folderId) => {
  const uploadDir = path.join(process.cwd(), "public", "upload");
  const files = await fs.promises.readdir(uploadDir);

  const results = [];

  for (const fileName of files) {
    const filePath = path.join(uploadDir, fileName);

    const stat = await fs.promises.stat(filePath);

    if (!stat.isFile()) continue;

    const response = await drive.files.create({
      requestBody: {
        name: fileName,
        parents: [folderId],
      },
      media: {
        body: fs.createReadStream(filePath),
      },
      fields: "id,name,webViewLink",
    });

    results.push(response.data);
  }

  return results;
};
