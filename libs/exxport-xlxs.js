import XLSX from "xlsx";

export const generateExcelBuffer = async (
  data
)=> {
  const workbook = XLSX.utils.book_new();

  const worksheet = XLSX.utils.json_to_sheet(data);

  XLSX.utils.book_append_sheet(
    workbook,
    worksheet,
    "Data"
  );

  return XLSX.write(workbook, {
    type: "buffer",
    bookType: "xlsx",
  });
};