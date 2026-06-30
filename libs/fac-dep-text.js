const facIdNormalized = (name, facId) => {
  let returnFac = 1 + facId.substring(0, 1);
  switch (name) {
    case "คณะวิศวกรรมศาสตร์":
      returnFac = "21";
      break;
    case "คณะรัฐศาสตร์และรัฐประศาสนศาสตร์":
      returnFac = "62";
      break;
    default:
      break;
  }

  return returnFac;
};

const FACULTY_URL =
  "https://docs.google.com/spreadsheets/d/e/2PACX-1vQZzv2CzWL8KZsrF4skEyDrCeiDVLy8XEji7MNI8oxGxBh34Pogpsr69fy6KCKomQ/pub?output=csv";
const DEPARTMENT_URL =
  "https://docs.google.com/spreadsheets/d/e/2PACX-1vTgGDU9zsZ_T5f5uxBQq2Jd8PNfgLj4yGQEr-KJOqgxokumjyEgZPcpAHoxElMJ1A/pub?output=csv";

let faculties = null;

const getFaculties = async () => {
  if (faculties) return faculties;

  const res = await fetch(FACULTY_URL);
  const csvText = await res.text();

  faculties = [
    ...csvText
      .split("\n")
      .slice(1)
      .map((r) => {
        const col = r.split(",");

        return {
          id: facIdNormalized(
            col[1]?.trim().replace(/\r/g, ""),
            String(col[0]?.trim()),
          ),
          name: col[1]?.trim().replace(/\r/g, ""),
        };
      })
      .filter((f) => f.id && f.name),

    { id: 17, name: "คณะเทคโนโลยีสารสนเทศ" },
    { id: 28, name: "บัณฑิตวิทยาลัย" },
  ];

  return faculties;
};

let departments = null;

const getDepartments = async () => {
  if (departments) return departments;

  const res = await fetch(DEPARTMENT_URL);
  const csvText = await res.text();

  departments = csvText
    .split("\n")
    .slice(2)
    .map((r) => {
      const col = r.split(",");

      return {
        id: col[0]?.trim(),
        name: col[1]?.trim().replace(/\r/g, ""),
      };
    })
    .filter((f) => f.id && f.name);

  return departments;
};

const run = async () => {
  await getFaculties();
  await getDepartments();
};

run();

export const facultyText = async (facId) => {
  try {
    if (isNaN(Number(facId))) return facId;

    const faculties = await getFaculties();

    return (
      faculties.find((f) => String(f.id)[1] === String(facId)[1])?.name ||
      "ไม่พบรหัสคณะนี้"
    );
  } catch (error) {
    console.error(error);
    return "ไม่พบรหัสคณะนี้";
  }
};

export const departmentText = async (depId) => {
  try {
    if (isNaN(Number(depId))) return depId;

    const departments = await getDepartments();

    return (
      departments.find((dep) => Number(dep.id) === Number(depId))?.name ||
      "ไม่พบสาขาวิชานี้"
    );
  } catch (error) {
    console.error(error);
    return "ไม่พบสาขาวิชานี้";
  }
};
