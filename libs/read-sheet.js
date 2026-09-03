// utils/readSpreadsheet.ts

import Papa from "papaparse";
import * as XLSX from "xlsx";

export async function readSpreadsheet(file) {
  const buffer = Buffer.from(await file.arrayBuffer());
  const extension = file.name.split(".").pop()?.toLowerCase();

  switch (extension) {
    case "xlsx":
    case "xls": {
      const workbook = XLSX.read(buffer, {
        type: "buffer",
      });

      const sheet = workbook.Sheets[workbook.SheetNames[0]];

      return XLSX.utils.sheet_to_json(sheet, {
        defval: "",
      });
    }

    case "csv": {
      const csv = buffer.toString("utf8");

      const { data, errors } = Papa.parse(csv, {
        header: true,
        skipEmptyLines: true,
      });

      if (errors.length) {
        throw new Error(errors[0].message);
      }

      return data;
    }

    default:
      throw new Error("รองรับเฉพาะไฟล์ .xlsx และ .csv");
  }
}