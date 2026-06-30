import { departmentText, facultyText } from "./fac-dep-text";
import fs from "fs";
import path from "path";

const calculateBarYAxis = (data) => {
  const max = data?.maxStdValue;
  const step = Math.ceil(max / 5);
  const axis = Array.from(
    { length: max < 10 ? 3 : 5 },
    (_, i) => max - step * i,
  );
  return { yAxis: axis, maxValue: axis[0] }; // ส่ง maxValue ออกมาด้วย
};

const getPieStyle = (y) => {
  const total = Number(y?.allStd) || 1;

  const accept = (Number(y?.accept) / total) * 360;
  const noRegis = (Number(y?.no_regis) / total) * 360;
  const pending = (Number(y?.pendings) / total) * 360;
  const refuse = (Number(y?.refuse) / total) * 360;

  const d1 = accept;
  const d2 = d1 + noRegis;
  const d3 = d2 + pending;
  const d4 = d3 + refuse;

  return `
    background: conic-gradient(
      #60a5fa 0deg ${d1}deg,
      #d1d5db ${d1}deg ${d2}deg,
      #fdba74 ${d2}deg ${d3}deg,
      #f87171 ${d3}deg ${d4}deg
    );
  `;
};

const pieStyleAlumni = (y) => {
  const total = Number(y?.total) || 1;

  const mans = (Number(y?.mans) / total) * 360;
  const girls = (Number(y?.girls) / total) * 360;

  const d1 = mans;
  const d2 = d1 + girls;

  return `
    background: conic-gradient(
      #BFDBFE 0deg ${d1}deg,
      #FBCFE8 ${d1}deg ${d2}deg
    );
  `;
};

const pieStyleProfessor = (y) => {
  const total = Number(y?.total) || 1;

  const canuse = (Number(y?.canuse) / total) * 360;
  const cannotuse = (Number(y?.cannotuse) / total) * 360;

  const d1 = canuse;
  const d2 = d1 + cannotuse;

  return `
    background: conic-gradient(
      #22c55e 0deg ${d1}deg,
      #EF4444 ${d1}deg ${d2}deg
    );
  `;
};
const fontPath = path.join(process.cwd(), "public/fonts/Sarabun-Regular.ttf");

const fontBase64 = fs.readFileSync(fontPath).toString("base64");

export const ExportPdfHTML = {
  exportAlumniRegisData: async (data) => {
    try {
      const { yAxis, maxValue } = calculateBarYAxis(data);
      const maxBarHeight = 320;

      const groupByFac = await Promise.all(
        data.groupByFac.map(async (f) => ({
          ...f,
          facultyName: await facultyText(f.facId),
        })),
        // .filter((f) => searchFaculties.includes(f?.facId)),
      );

      const groupByDep = await Promise.all(
        data?.groupByDep?.map(async (d) => ({
          ...d,
          depName: await departmentText(d.depId),
        })),
      );

      const html = `<!doctype html>
<html lang="th">
  <head>
    <meta charset="UTF-8" />

    <script src="https://cdn.tailwindcss.com"><\/script>

    <style>
    @font-face {
  font-family: 'Sarabun';
  src: url(data:font/truetype;charset=utf-8;base64,${fontBase64})
       format('truetype');
}
      @page {
        size: A4;
        margin-top: 30mm;
        margin-bottom: 20mm;
        margin-left: 10mm;
        margin-right: 10mm;
      }
      * {
        margin: 0;
        padding: 0;
        letter-spacing: 1px;
        box-sizing: border-box;
      }
      body {
        font-family: "Sarabun", sans-serif;
      }

      thead {
        display: table-header-group;
      }

      tfoot {
        display: table-footer-group;
      }

      .page-break {
        page-break-before: always;
      }

      .no-break {
        page-break-inside: avoid;
         break-inside: avoid;
      }
      .chart-container {
        display: flex;
        width: 100%;
        margin-top: 35px;
      }

      .y-axis {
        width: 60px;
        height: 320px;

        display: flex;
        flex-direction: column;
        justify-content: space-between;

        text-align: right;
        padding-right: 10px;

        font-size: 12px;
        color: #555;
      }

     .chart-body {
  flex: 1;
  height: 320px;
  position: relative;
  border-left: 2px solid #444;
  border-bottom: 2px solid #444;
  margin-bottom: 80px;
  margin-top:15px;
}

      .grid-line {
        position: absolute;
        left: 0;
        right: 0;

        border-top: 1px dashed #d1d5db;
      }

      .bars-wrapper {
      width:100%;
        height: 100%;
        display: flex;
        align-items: flex-end;

        padding: 0 10px;
      }
      
.faculty-group {
  display: flex;
  flex-direction: column;
  align-items: center;
  position: relative;
  margin-left:28px;
}

      .bar-area {
        display: flex;
        align-items: flex-end;
        gap: 3.5px;
      }

      .bar-column {
        display: flex;
        flex-direction: column;
        align-items: center;
      }

      .bar-column span {
        font-size: 12px;
        font-weight: bold;
        margin-bottom: 4px;
      }

      .bar {
        border-radius: 4px 4px 0 0;
      }

      .unregistered {
        background: #d1d5db;
      }
      .pending {
        background-color: rgb(255, 152, 42);
      }
      .refuse {
        background-color: rgb(255, 42, 42);
      }

      .faculty-name {
  position: absolute;
  top: 8px;
  left: 50%;
  transform-origin: left center;
  transform: rotate(45deg);
  white-space: nowrap;
}

      /* ── Department bar ── */
      .dep-row {
        display: flex;
        align-items: center;
        gap: 16px;
        margin-bottom: 26px;
      }
      .dep-label {
        width: 200px;
        text-align: right;
        font-size: 12px;
        flex-shrink: 0;
      }
      .dep-total {
        width: 90px;
        text-align: right;
        font-size: 12px;
        font-weight: bold;
        flex-shrink: 0;
      }
      .dep-bar-wrap {
        flex: 1;
        display: flex;
        flex-direction: column;
        gap: 5px;
      }
      .dep-bar-track {
        display: flex;
        height: 14px;
        border-radius: 6px;
        overflow: hidden;
      }
      .dep-bar-track > div { height: 100%; }
      .dep-legend {
        display: flex;
        gap: 8px;
        font-size: 10px;
        color: #555;
        flex-wrap: wrap;
      }
      .dep-legend > span {
        display: flex;
        align-items: center;
        gap: 3px;
      }
      .dot {
        width: 9px;
        height: 9px;
        border-radius: 2px;
        display: inline-block;
        flex-shrink: 0;
      }
    </style>
  </head>

  <body class="text-gray-800 text-base w-full h-full">
    <!-- SUMMARY -->
    <div class="mt-3.5">
      <div class="pl-3 pb-1 border-l-[5px] border-l-blue-500 w-full">
        <p class="text-[16px] font-bold text-blue-600">
          สรุปภาพรวมการลงทะเบียน
        </p>
      </div>
      <div class="w-full ml-3 border-b mt-1.5 border-blue-300"></div>
      

      <div class="grid grid-cols-5 gap-3.5 mt-3.5">
        <div
          class="bg-blue-50 border border-blue-100 rounded-lg p-4 flex flex-col gap-2.5"
        >
          <p class="text-gray-500 text-[12px]">นักศึกษาทั้งหมด</p>

          <div class="text-2xl font-bold text-blue-700">${data?.allStd?.toLocaleString() || 0}</div>
        </div>

        <div
          class="bg-gray-50 border border-gray-100 rounded-lg p-4 flex flex-col gap-2.5"
        >
          <p class="text-gray-500 text-[12px]">ยังไม่ลงทะเบียน</p>
          <div class="text-2xl font-bold text-gray-700">${data?.no_regis?.toLocaleString() || 0}</div>
        </div>

        <div
          class="bg-green-50 border border-green-100 rounded-lg p-4 flex flex-col gap-2.5"
        >
          <p class="text-gray-500 text-[12px]">ลงทะเบียนแล้ว</p>
          <div class="text-2xl font-bold text-green-700">${data?.accept?.toLocaleString() || 0}</div>
        </div>

        <div
          class="bg-yellow-50 border border-yellow-60 rounded-lg p-4 flex flex-col gap-2.5"
        >
          <p class="text-gray-500 text-[12px]">รอตรวจสอบ</p>

          <div class="text-2xl font-bold text-yellow-700">${data?.pending?.toLocaleString() || 0}</div>
        </div>

        <div
          class="bg-red-50 border border-red-100 rounded-lg p-4 flex flex-col gap-2.5"
        >
          <p class="text-gray-500 text-[12px]">ปฏิเสธ</p>

          <div class="text-2xl font-bold text-red-700">${data?.refuse?.toLocaleString() || 0}</div>
        </div>
      </div>
    </div>

    <div class="mt-6">
      <div class="pl-3 pb-1 border-l-[5px] border-l-blue-500 w-full">
        <p class="text-[16px] font-bold text-blue-600">สรุปภาพรวมรายคณะ</p>
      </div>
      <div class="w-full ml-3 border-b border-blue-300 mt-1.5 "></div>

      <div class="chart-container">
       <div class="y-axis">
  ${yAxis.map((value) => `<div>${value.toLocaleString()}</div>`).join("")}
</div>

        <div class="chart-body">
          <!-- Grid -->
          <div class="grid-line" style="bottom: 0%"></div>
          <div class="grid-line" style="bottom: 16.6%"></div>
          <div class="grid-line" style="bottom: 33.3%"></div>
          <div class="grid-line" style="bottom: 50%"></div>
          <div class="grid-line" style="bottom: 66.6%"></div>
          <div class="grid-line" style="bottom: 83.3%"></div>
          <div class="grid-line" style="bottom: 100%"></div>

          <div class="bars-wrapper">
            <!-- bars -->
           ${groupByFac
             .map((f) => {
               const registeredHeight =
                 ((f.total || 0) / maxValue) * maxBarHeight;

               const noRegisHeight =
                 ((f.no_regis || 0) / maxValue) * maxBarHeight;

               return `
      <div class="faculty-group">
  <div class="bar-area">
    <div class="bar-column">
      <span>${f.total?.toLocaleString() || 0}</span>
      <div class="bar registered w-5"
        style="height:${registeredHeight}px; background:#3b82f6;">
      </div>
    </div>
    <div class="bar-column">
      <span>${f.no_regis?.toLocaleString() || 0}</span>
      <div class="bar unregistered w-5"
        style="height:${noRegisHeight}px; background:#d1d5db;">
      </div>
    </div>
  </div>

  <div style="position: relative; height: 0; width: 100%;">
    <div class="faculty-name">
      <p class="text-[12px]">${f.facultyName}</p>
    </div>
  </div>
</div>
    `;
             })
             .join("")}
            </div>
            </div>
      </div>
    </div>
        <div class="flex items-center mt-24 w-full justify-center gap-3">
              <div class="flex items-center gap-3">
                <span class="w-4 h-4 rounded bg-blue-500"></span>
                <span class="text-[12px]">นักศึกษาทั้งหมด</span>
              </div>

              <div class="flex items-center gap-3">
                <span class="w-4 h-4 rounded bg-gray-500"></span>
                <span class="text-[12px]">ยังไม่ผ่านการลงทะเบียน</span>
              </div>
            </div>
     
    <div class="mt-56">
      <div class="pl-3 pb-1 border-l-[5px] border-l-blue-500 w-full">
        <p class="text-[16px] font-bold text-blue-600">
          สรุปภาพรวมการลงทะเบียนของศิษย์เก่าแต่ละรุ่น
        </p>
      </div>
      <div class="w-full ml-3 mt-1.5 border-b border-blue-300"></div>

      <div class="mt-5 w-full grid grid-cols-2 gap-y-2.5">
      ${
        data?.groupByYear?.length < 1
          ? `<div class="w-full py-24 flex flex-col items-center gap-1 col-span-2">
        <p>ไม่พบข้อมูลที่คุณต้องการ</p>
        </div>`
          : data?.groupByYear
              ?.map(
                (y) =>
                  `<div class="grid grid-cols-1 gap-1.5 no-break">
  <p class="pl-5 font-bold">รุ่น ${y?.year}</p>

  <div class="flex items-center gap-5 px-5">
    <!-- Donut -->
    <div
      class="relative w-28 h-28 rounded-full"
     style="${getPieStyle(y)}"
    >
      <div
        class="absolute bg-white rounded-full inset-5 flex items-center justify-center"
      >
        <div class="text-center">
          <p class="text-gray-500 text-[11px]">ทั้งหมด</p>
          <p class="font-bold text-base">
            ${y?.allStd?.toLocaleString() || 0}
          </p>
        </div>
      </div>
    </div>

    <!-- Legend -->
    <div class="flex flex-col text-[11px] gap-2">
      <div class="flex items-center gap-2">
        <span class="w-3 h-3 rounded bg-blue-500"></span>
        <span>ลงทะเบียนแล้ว</span>
        <span>${y?.accept?.toLocaleString() || 0} คน</span>
      </div>

      <div class="flex items-center gap-2">
        <span class="w-3 h-3 rounded bg-gray-500"></span>
        <span>ยังไม่ลงทะเบียน</span>
        <span>${y?.no_regis?.toLocaleString() || 0} คน</span>
      </div>

      <div class="flex items-center gap-2">
        <span class="w-3 h-3 rounded bg-orange-500"></span>
        <span>รอตรวจสอบ</span>
        <span>${y?.pendings?.toLocaleString() || 0} คน</span>
      </div>

      <div class="flex items-center gap-2">
        <span class="w-3 h-3 rounded bg-red-500"></span>
        <span>การชำระโดนปฏิเสธ</span>
        <span>${y?.refuse?.toLocaleString() || 0} คน</span>
      </div>
    </div>
  </div>
</div>`,
              )
              .join("")
      }
        
        
        </div>
      </div>
    </div>
 

    <div class="mt-16">
      <div class="pl-3 pb-1 border-l-[5px] border-l-blue-500 w-full">
        <p class="text-[16px] font-bold text-blue-600">ข้อมูลการลงทะเบียนในแต่ละสาขาวิชา</p>
      </div>
      <div class="w-full ml-3 mt-1.5 border-b border-blue-300"></div>

      <div class="mt-5 w-full">
        ${groupByDep
          .map((d) => {
            const rowTotal =
              (Number(d?.accept) || 0) +
                (Number(d?.pending) || 0) +
                (Number(d?.refuse) || 0) +
                (Number(d?.no_regis) || 0) || 1;
            const pA = ((Number(d?.accept) || 0) / rowTotal) * 100;
            const pP = ((Number(d?.pending) || 0) / rowTotal) * 100;
            const pR = ((Number(d?.refuse) || 0) / rowTotal) * 100;
            const pN = ((Number(d?.no_regis) || 0) / rowTotal) * 100;
            return `
          <div class="dep-row no-break">
            <div class="dep-label">${d?.depName || ""}</div>
            <div class="dep-bar-wrap">
              <div class="dep-bar-track">
                <div style="width:${pA}%;background:#3b82f6;"></div>
                <div style="width:${pP}%;background:#f97316;"></div>
                <div style="width:${pR}%;background:#ef4444;"></div>
                <div style="width:${pN}%;background:#d1d5db;"></div>
              </div>
              <div class="dep-legend">
                <span><i class="dot" style="background:#3b82f6;"></i>ลงทะเบียน ${(d?.accept || 0).toLocaleString("th-TH")} คน</span>
                <span><i class="dot" style="background:#f97316;"></i>รอตรวจสอบ ${(d?.pending || 0).toLocaleString("th-TH")} คน</span>
                <span><i class="dot" style="background:#ef4444;"></i>ปฏิเสธ ${(d?.refuse || 0).toLocaleString("th-TH")} คน</span>
                <span><i class="dot" style="background:#d1d5db;"></i>ยังไม่ลงทะเบียน ${(d?.no_regis || 0).toLocaleString("th-TH")} คน</span>
              </div>
            </div>
            <div class="dep-total">ทั้งหมด ${(d?.total || 0).toLocaleString("th-TH")} คน</div>
          </div>`;
          })
          .join("")}
      </div>
    </div>
  
  </body>
</html>
`;

      return html;
    } catch (error) {
      console.error(error);
    }
  },
  exportAlumniData: async (data) => {
    try {
      const { yAxis, maxValue } = calculateBarYAxis(data);
      const maxBarHeight = 320;

      const groupByFac = await Promise.all(
        data.groupByFac.map(async (f) => ({
          ...f,
          facultyName: await facultyText(f.facId),
        })),
        // .filter((f) => searchFaculties.includes(f?.facId)),
      );

      const groupByDep = await Promise.all(
        data?.groupByDep?.map(async (d) => ({
          ...d,
          depName: await departmentText(d.depId),
        })),
      );

      const html = `<!doctype html>
<html lang="th">
  <head>
    <meta charset="UTF-8" />

    <script src="https://cdn.tailwindcss.com"><\/script>

    <style>
    @font-face {
  font-family: 'Sarabun';
  src: url(data:font/truetype;charset=utf-8;base64,${fontBase64})
       format('truetype');
}
      @page {
        size: A4;
        margin-top: 30mm;
        margin-bottom: 20mm;
        margin-left: 10mm;
        margin-right: 10mm;
      }
      * {
        margin: 0;
        padding: 0;
        letter-spacing: 1px;
        box-sizing: border-box;
      }
      body {
        font-family: "Sarabun", sans-serif;
      }

      thead {
        display: table-header-group;
      }

      tfoot {
        display: table-footer-group;
      }

      .page-break {
        page-break-before: always;
      }

      .no-break {
        page-break-inside: avoid;
         break-inside: avoid;
      }
      .chart-container {
        display: flex;
        width: 100%;
        margin-top: 35px;
      }

      .y-axis {
        width: 60px;
        height: 320px;

        display: flex;
        flex-direction: column;
        justify-content: space-between;

        text-align: right;
        padding-right: 10px;

        font-size: 12px;
        color: #555;
      }

     .chart-body {
  flex: 1;
  height: 320px;
  position: relative;
  border-left: 2px solid #444;
  border-bottom: 2px solid #444;
  margin-bottom: 80px;
  margin-top:15px;
}

      .grid-line {
        position: absolute;
        left: 0;
        right: 0;

        border-top: 1px dashed #d1d5db;
      }

      .bars-wrapper {
      width:100%;
        height: 100%;
        display: flex;
        align-items: flex-end;

        padding: 0 10px;
      }
      
.faculty-group {
  display: flex;
  flex-direction: column;
  align-items: center;
  position: relative;
  margin-left:10px;
}

      .bar-area {
        display: flex;
        align-items: flex-end;
        gap: 2.5px;
      }

      .bar-column {
        display: flex;
        flex-direction: column;
        align-items: center;
      }

      .bar-column span {
        font-size: 12px;
        font-weight: bold;
        margin-bottom: 4px;
      }

      .bar {
        border-radius: 4px 4px 0 0;
      }

      .unregistered {
        background: #d1d5db;
      }
      .pending {
        background-color: rgb(255, 152, 42);
      }
      .refuse {
        background-color: rgb(255, 42, 42);
      }

      .faculty-name {
  position: absolute;
  top: 8px;
  left: 20%;
  transform-origin: left center;
  transform: rotate(65deg);
  white-space: nowrap;
}

      /* ── Department bar ── */
      .dep-row {
        display: flex;
        align-items: center;
        gap: 16px;
        margin-bottom: 26px;
      }
      .dep-label {
        width: 200px;
        text-align: right;
        font-size: 12px;
        flex-shrink: 0;
      }
      .dep-total {
        width: 90px;
        text-align: right;
        font-size: 12px;
        font-weight: bold;
        flex-shrink: 0;
      }
      .dep-bar-wrap {
        flex: 1;
        display: flex;
        flex-direction: column;
        gap: 5px;
      }
      .dep-bar-track {
        display: flex;
        height: 14px;
        border-radius: 6px;
        overflow: hidden;
      }
      .dep-bar-track > div { height: 100%; }
      .dep-legend {
        display: flex;
        gap: 8px;
        font-size: 10px;
        color: #555;
        flex-wrap: wrap;
      }
      .dep-legend > span {
        display: flex;
        align-items: center;
        gap: 3px;
      }
      .dot {
        width: 9px;
        height: 9px;
        border-radius: 2px;
        display: inline-block;
        flex-shrink: 0;
      }
    </style>
  </head>

  <body class="text-gray-800 text-base w-full h-full">
    <!-- SUMMARY -->
    <div class="mt-3.5">
      <div class="pl-3 pb-1 border-l-[5px] border-l-blue-500 w-full">
        <p class="text-[16px] font-bold text-blue-600">
          สรุปภาพรวมจำนวนศิษย์เก่า
        </p>
      </div>
      <div class="w-full ml-3 border-b mt-1.5 border-blue-300"></div>
      

      <div class="grid grid-cols-4 gap-3.5 mt-3.5">
        <div
          class="bg-blue-50 border border-blue-100 rounded-lg p-4 flex flex-col gap-2.5"
        >
          <p class="text-gray-500 text-[12px]">นักศึกษาทั้งหมด</p>

          <div class="text-2xl font-bold text-blue-700">${data?.allAlumni?.toLocaleString() || 0}</div>
        </div>

        <div
          class="bg-gray-50 border border-gray-100 rounded-lg p-4 flex flex-col gap-2.5"
        >
          <p class="text-gray-500 text-[12px]">ศิษย์เก่าชาย</p>
          <div class="text-2xl font-bold text-gray-700">${data?.alumniMan?.toLocaleString() || 0}</div>
        </div>

        <div
          class="bg-pink-50 border border-pink-100 rounded-lg p-4 flex flex-col gap-2.5"
        >
          <p class="text-gray-500 text-[12px]">ศิษย์เก่าหญิง</p>
          <div class="text-2xl font-bold text-pink-700">${data?.alumniGirl?.toLocaleString() || 0}</div>
        </div>

        <div
          class="bg-yellow-50 border border-yellow-60 rounded-lg p-4 flex flex-col gap-2.5"
        >
          <p class="text-gray-500 text-[12px]">จำนวนรุ่น</p>

          <div class="text-2xl font-bold text-yellow-700">${data?.allYears?.toLocaleString() || 0}</div>
        </div>

       
      </div>
    </div>

    <div class="mt-6">
      <div class="pl-3 pb-1 border-l-[5px] border-l-blue-500 w-full">
        <p class="text-[16px] font-bold text-blue-600">สรุปภาพรวมรายคณะ</p>
      </div>
      <div class="w-full ml-3 border-b border-blue-300 mt-1.5 "></div>

      <div class="chart-container">
       <div class="y-axis">
  ${yAxis.map((value) => `<div>${value.toLocaleString()}</div>`).join("")}
</div>

        <div class="chart-body">
          <!-- Grid -->
          <div class="grid-line" style="bottom: 0%"></div>
          <div class="grid-line" style="bottom: 16.6%"></div>
          <div class="grid-line" style="bottom: 33.3%"></div>
          <div class="grid-line" style="bottom: 50%"></div>
          <div class="grid-line" style="bottom: 66.6%"></div>
          <div class="grid-line" style="bottom: 83.3%"></div>
          <div class="grid-line" style="bottom: 100%"></div>

          <div class="bars-wrapper">
            <!-- bars -->
           ${groupByFac
             .map((f) => {
               const registeredHeight =
                 ((f.total || 0) / maxValue) * maxBarHeight;

               const manHeight = ((f.mans || 0) / maxValue) * maxBarHeight;

               const girlHeight = ((f.girls || 0) / maxValue) * maxBarHeight;

               return `
      <div class="faculty-group">
  <div class="bar-area">
    <div class="bar-column">
      <span>${f.total?.toLocaleString() || 0}</span>
      <div class="bar registered w-4"
        style="height:${registeredHeight}px; background:#3b82f6;">
      </div>
    </div>
    <div class="bar-column">
      <span>${f.mans?.toLocaleString() || 0}</span>
      <div class="bar unregistered w-4"
        style="height:${manHeight}px; background:#22c55e;">
      </div>
    </div>
    <div class="bar-column">
      <span>${f.girls?.toLocaleString() || 0}</span>
      <div class="bar unregistered w-4"
        style="height:${girlHeight}px; background:#FAD1E8;">
      </div>
    </div>
  </div>

  <div style="position: relative; height: 0; width: 100%;">
    <div class="faculty-name">
      <p class="text-[12px]">${f.facultyName}</p>
    </div>
  </div>
</div>
    `;
             })
             .join("")}
            </div>
            </div>
      </div>
    </div>
        <div class="flex items-center mt-32 w-full justify-center gap-3">
              <div class="flex items-center gap-3">
                <span class="w-4 h-4 rounded bg-blue-500"></span>
                <span class="text-[12px]">นักศึกษาทั้งหมด</span>
              </div>

              <div class="flex items-center gap-3">
                <span class="w-4 h-4 rounded bg-blue-200"></span>
                <span class="text-[12px]">ชาย</span>
              </div>
               <div class="flex items-center gap-3">
                <span class="w-4 h-4 rounded bg-pink-200"></span>
                <span class="text-[12px]">หญิง</span>
              </div>
            </div>
     
    <div class="mt-56">
      <div class="pl-3 pb-1 border-l-[5px] border-l-blue-500 w-full">
        <p class="text-[16px] font-bold text-blue-600">
          สรุปภาพรวมของศิษย์เก่าแต่ละรุ่น
        </p>
      </div>
      <div class="w-full ml-3 mt-1.5 border-b border-blue-300"></div>

      <div class="mt-5 w-full grid grid-cols-2 gap-y-2.5">
      ${
        data?.groupByYear?.length < 1
          ? `<div class="w-full py-24 flex flex-col items-center gap-1 col-span-2">
        <p>ไม่พบข้อมูลที่คุณต้องการ</p>
        </div>`
          : data?.groupByYear
              ?.map(
                (y) =>
                  `<div class="grid grid-cols-1 gap-1.5 no-break">
  <p class="pl-5 font-bold">รุ่น ${y?.year}</p>

  <div class="flex items-center gap-5 px-5">
    <!-- Donut -->
    <div
      class="relative w-28 h-28 rounded-full"
     style="${pieStyleAlumni(y)}"
    >
      <div
        class="absolute bg-white rounded-full inset-5 flex items-center justify-center"
      >
        <div class="text-center">
          <p class="text-gray-500 text-[11px]">ทั้งหมด</p>
          <p class="font-bold text-base">
            ${y?.total?.toLocaleString() || 0}
          </p>
        </div>
      </div>
    </div>

    <!-- Legend -->
    <div class="flex flex-col text-[11px] gap-2">
    
      <div class="flex items-center gap-2">
        <span class="w-3 h-3 rounded bg-blue-200"></span>
        <span>ศิษย์เก่าชาย</span>
        <span>${y?.mans?.toLocaleString() || 0} คน</span>
      </div>

      <div class="flex items-center gap-2">
        <span class="w-3 h-3 rounded bg-pink-500"></span>
        <span>ศิษย์เก่าหญิง</span>
        <span>${y?.girls?.toLocaleString() || 0} คน</span>
      </div>

      
    </div>
  </div>
</div>`,
              )
              .join("")
      }
        
        
        </div>
      </div>
    </div>
 

    <div class="mt-16">
      <div class="pl-3 pb-1 border-l-[5px] border-l-blue-500 w-full">
        <p class="text-[16px] font-bold text-blue-600">ข้อมูลศิษย์เก่าในแต่ละสาขาวิชา</p>
      </div>
      <div class="w-full ml-3 mt-1.5 border-b border-blue-300"></div>

      <div class="mt-5 w-full">
        ${groupByDep
          .map((d) => {
            const rowTotal = (Number(d?.mans) || 0) + (Number(d?.girls) || 0);
            const pA = ((Number(d?.mans) || 0) / rowTotal) * 100;
            const pP = ((Number(d?.girls) || 0) / rowTotal) * 100;

            return `
          <div class="dep-row no-break">
            <div class="dep-label">${d?.depName || ""}</div>
            <div class="dep-bar-wrap">
              <div class="dep-bar-track">
                <div style="width:${pA}%;background:#BFDBFE;"></div>
                <div style="width:${pP}%;background:#FAD1E8;"></div>
              </div>
              <div class="dep-legend">
                <span><i class="dot" style="background:#BFDBFE;"></i>ศิษย์เก่าชาย ${(d?.mans || 0).toLocaleString("th-TH")} คน</span>
                <span><i class="dot" style="background:#FAD1E8;"></i>ศิษย์เก่าหญิง ${(d?.girls || 0).toLocaleString("th-TH")} คน</span>
              </div>
            </div>
            <div class="dep-total">ทั้งหมด ${(d?.total || 0).toLocaleString("th-TH")} คน</div>
          </div>`;
          })
          .join("")}
      </div>
    </div>
  
  </body>
</html>
`;

      return html;
    } catch (error) {
      console.error(error);
    }
  },
  exportPersonelData: async (data) => {
    try {
      const { yAxis, maxValue } = calculateBarYAxis(data);
      const maxBarHeight = 320;

      const groupByFac = await Promise.all(
        data.groupByFac.map(async (f) => ({
          ...f,
          facultyName: await facultyText(f.facId),
        })),
        // .filter((f) => searchFaculties.includes(f?.facId)),
      );

      const groupByDep = await Promise.all(
        data?.groupByDep?.map(async (d) => ({
          ...d,
          depName: await departmentText(d.depId),
        })),
      );

      const html = `<!doctype html>
<html lang="th">
  <head>
    <meta charset="UTF-8" />

    <script src="https://cdn.tailwindcss.com"><\/script>

    <style>
    @font-face {
  font-family: 'Sarabun';
  src: url(data:font/truetype;charset=utf-8;base64,${fontBase64})
       format('truetype');
}
      @page {
        size: A4;
        margin-top: 30mm;
        margin-bottom: 20mm;
        margin-left: 10mm;
        margin-right: 10mm;
      }
      * {
        margin: 0;
        padding: 0;
        letter-spacing: 1px;
        box-sizing: border-box;
      }
      body {
        font-family: "Sarabun", sans-serif;
      }

      thead {
        display: table-header-group;
      }

      tfoot {
        display: table-footer-group;
      }

      .page-break {
        page-break-before: always;
      }

      .no-break {
        page-break-inside: avoid;
         break-inside: avoid;
      }
      .chart-container {
        display: flex;
        width: 100%;
        margin-top: 35px;
      }

      .y-axis {
        width: 60px;
        height: 320px;

        display: flex;
        flex-direction: column;
        justify-content: space-between;

        text-align: right;
        padding-right: 10px;

        font-size: 12px;
        color: #555;
      }

     .chart-body {
  flex: 1;
  height: 320px;
  position: relative;
  border-left: 2px solid #444;
  border-bottom: 2px solid #444;
  margin-bottom: 80px;
  margin-top:15px;
}

      .grid-line {
        position: absolute;
        left: 0;
        right: 0;

        border-top: 1px dashed #d1d5db;
      }

      .bars-wrapper {
      width:100%;
        height: 100%;
        display: flex;
        align-items: flex-end;

        padding: 0 10px;
      }
      
.faculty-group {
  display: flex;
  flex-direction: column;
  align-items: center;
  position: relative;
  margin-left:10px;
}

      .bar-area {
        display: flex;
        align-items: flex-end;
        gap: 2.5px;
      }

      .bar-column {
        display: flex;
        flex-direction: column;
        align-items: center;
      }

      .bar-column span {
        font-size: 12px;
        font-weight: bold;
        margin-bottom: 4px;
      }

      .bar {
        border-radius: 4px 4px 0 0;
      }

      .unregistered {
        background: #22c55e;
      }
      .pending {
        background-color: rgb(255, 152, 42);
      }
      .refuse {
        background-color: rgb(255, 42, 42);
      }

      .faculty-name {
  position: absolute;
  top: 8px;
  left: 20%;
  transform-origin: left center;
  transform: rotate(65deg);
  white-space: nowrap;
}

      /* ── Department bar ── */
      .dep-row {
        display: flex;
        align-items: center;
        gap: 16px;
        margin-bottom: 26px;
      }
      .dep-label {
        width: 200px;
        text-align: right;
        font-size: 12px;
        flex-shrink: 0;
      }
      .dep-total {
        width: 90px;
        text-align: right;
        font-size: 12px;
        font-weight: bold;
        flex-shrink: 0;
      }
      .dep-bar-wrap {
        flex: 1;
        display: flex;
        flex-direction: column;
        gap: 5px;
      }
      .dep-bar-track {
        display: flex;
        height: 14px;
        border-radius: 6px;
        overflow: hidden;
      }
      .dep-bar-track > div { height: 100%; }
      .dep-legend {
        display: flex;
        gap: 8px;
        font-size: 10px;
        color: #555;
        flex-wrap: wrap;
      }
      .dep-legend > span {
        display: flex;
        align-items: center;
        gap: 3px;
      }
      .dot {
        width: 9px;
        height: 9px;
        border-radius: 2px;
        display: inline-block;
        flex-shrink: 0;
      }
    </style>
  </head>

  <body class="text-gray-800 text-base w-full h-full">
    <!-- SUMMARY -->
    <div class="mt-3.5">
      <div class="pl-3 pb-1 border-l-[5px] border-l-blue-500 w-full">
        <p class="text-[16px] font-bold text-blue-600">
          สรุปภาพรวมจำนวนบุคลากร
        </p>
      </div>
      <div class="w-full ml-3 border-b mt-1.5 border-blue-300"></div>
      

      <div class="grid grid-cols-4 gap-3.5 mt-3.5">
        <div
          class="bg-blue-50 border border-blue-100 rounded-lg p-4 flex flex-col gap-2.5"
        >
          <p class="text-gray-500 text-[12px]">บุคลากรทั้งหมด</p>

          <div class="text-2xl font-bold text-blue-700">${data?.allProfessor?.toLocaleString() || 0}</div>
        </div>

        <div
          class="bg-green-50 border border-gray-100 rounded-lg p-4 flex flex-col gap-2.5"
        >
          <p class="text-gray-500 text-[12px]">สามารถใช้งานบัญชีได้</p>
          <div class="text-2xl font-bold text-green-700">${data?.allCanuse?.toLocaleString() || 0}</div>
        </div>

        <div
          class="bg-pink-50 border border-pink-100 rounded-lg p-4 flex flex-col gap-2.5"
        >
          <p class="text-gray-500 text-[12px]">บัญชีถูกระงับ</p>
          <div class="text-2xl font-bold text-pink-700">${data?.allCannoUse?.toLocaleString() || 0}</div>
        </div>

        <div
          class="bg-yellow-50 border border-yellow-60 rounded-lg p-4 flex flex-col gap-2.5"
        >
          <p class="text-gray-500 text-[12px]">ตำแหน่งในระบบ</p>

          <div class="text-2xl font-bold text-yellow-700">${data?.allPosition?.toLocaleString() || 0}</div>
        </div>

       
      </div>
    </div>

    <div class="mt-6">
      <div class="pl-3 pb-1 border-l-[5px] border-l-blue-500 w-full">
        <p class="text-[16px] font-bold text-blue-600">สรุปภาพรวมรายคณะ</p>
      </div>
      <div class="w-full ml-3 border-b border-blue-300 mt-1.5 "></div>

      <div class="chart-container">
       <div class="y-axis">
  ${yAxis.map((value) => `<div>${value.toLocaleString()}</div>`).join("")}
</div>

        <div class="chart-body">
          <!-- Grid -->
          <div class="grid-line" style="bottom: 0%"></div>
          <div class="grid-line" style="bottom: 16.6%"></div>
          <div class="grid-line" style="bottom: 33.3%"></div>
          <div class="grid-line" style="bottom: 50%"></div>
          <div class="grid-line" style="bottom: 66.6%"></div>
          <div class="grid-line" style="bottom: 83.3%"></div>
          <div class="grid-line" style="bottom: 100%"></div>

          <div class="bars-wrapper">
            <!-- bars -->
           ${groupByFac
             .map((f) => {
               const registeredHeight =
                 ((f.total || 0) / maxValue) * maxBarHeight;

               const manHeight = ((f.canuse || 0) / maxValue) * maxBarHeight;

               const girlHeight =
                 ((f.cannotuse || 0) / maxValue) * maxBarHeight;

               return `
      <div class="faculty-group">
  <div class="bar-area">
    <div class="bar-column">
      <span>${f.total?.toLocaleString() || 0}</span>
      <div class="bar registered w-4"
        style="height:${registeredHeight}px; background:#3b82f6;">
      </div>
    </div>
    <div class="bar-column">
      <span>${f.canuse?.toLocaleString() || 0}</span>
      <div class="bar unregistered w-4"
        style="height:${manHeight}px; background:#22c55e;">
      </div>
    </div>
    <div class="bar-column">
      <span>${f.cannotuse?.toLocaleString() || 0}</span>
      <div class="bar unregistered w-4"
        style="height:${girlHeight}px; background:#EF4444;">
      </div>
    </div>
  </div>

  <div style="position: relative; height: 0; width: 100%;">
    <div class="faculty-name">
      <p class="text-[12px]">${f.facultyName}</p>
    </div>
  </div>
</div>
    `;
             })
             .join("")}
            </div>
            </div>
      </div>
    </div>
        <div class="flex items-center mt-32 w-full justify-center gap-3">
              <div class="flex items-center gap-3">
                <span class="w-4 h-4 rounded bg-blue-500"></span>
                <span class="text-[12px]">บุคลากรทั้งหมด</span>
              </div>

              <div class="flex items-center gap-3">
                <span class="w-4 h-4 rounded bg-green-500"></span>
                <span class="text-[12px]">บัญชีสามารถใช้งานได้</span>
              </div>
               <div class="flex items-center gap-3">
                <span class="w-4 h-4 rounded bg-red-500"></span>
                <span class="text-[12px]">บัญชีถูกระงับ</span>
              </div>
            </div>
     
    <div class="mt-56">
      <div class="pl-3 pb-1 border-l-[5px] border-l-blue-500 w-full">
        <p class="text-[16px] font-bold text-blue-600">
          สรุปภาพรวมการข้อมูลบุคลากรในแต่ละตำแหน่ง
        </p>
      </div>
      <div class="w-full ml-3 mt-1.5 border-b border-blue-300"></div>

      <div class="mt-5 w-full grid grid-cols-2 gap-y-2.5">
      ${
        data?.groupByPosition?.length < 1
          ? `<div class="w-full py-24 flex flex-col items-center gap-1 col-span-2">
        <p>ไม่พบข้อมูลที่คุณต้องการ</p>
        </div>`
          : data?.groupByPosition
              ?.map(
                (y) =>
                  `<div class="grid grid-cols-1 gap-1.5 no-break">
  <p class="pl-5 font-bold">ตำแหน่ง ${y?.univercity_position}</p>

  <div class="flex items-center gap-5 px-5">
    <!-- Donut -->
    <div
      class="relative w-28 h-28 rounded-full"
     style="${pieStyleProfessor(y)}"
    >
      <div
        class="absolute bg-white rounded-full inset-5 flex items-center justify-center"
      >
        <div class="text-center">
          <p class="text-gray-500 text-[11px]">ทั้งหมด</p>
          <p class="font-bold text-base">
            ${y?.total?.toLocaleString() || 0}
          </p>
        </div>
      </div>
    </div>

    <!-- Legend -->
    <div class="flex flex-col text-[11px] gap-2">
    
      <div class="flex items-center gap-2">
        <span class="w-3 h-3 rounded bg-green-500"></span>
        <span>บัญชีสามารถใช้งานได้</span>
        <span>${y?.canuse?.toLocaleString() || 0} คน</span>
      </div>

      <div class="flex items-center gap-2">
        <span class="w-3 h-3 rounded bg-red-500"></span>
        <span>บัญชีถูกระงับ</span>
        <span>${y?.cannotuse?.toLocaleString() || 0} คน</span>
      </div>

      
    </div>
  </div>
</div>`,
              )
              .join("")
      }
        
        
        </div>
      </div>
    </div>
 

    <div class="mt-16">
      <div class="pl-3 pb-1 border-l-[5px] border-l-blue-500 w-full">
        <p class="text-[16px] font-bold text-blue-600">ข้อมูลการบุคลากรในแต่ละสาขาวิชา</p>
      </div>
      <div class="w-full ml-3 mt-1.5 border-b border-blue-300"></div>

      <div class="mt-5 w-full">
        ${groupByDep
          .map((d) => {
            const rowTotal =
              (Number(d?.canuse) || 0) + (Number(d?.cannotuse) || 0);
            const pA = ((Number(d?.canuse) || 0) / rowTotal) * 100;
            const pP = ((Number(d?.cannotuse) || 0) / rowTotal) * 100;

            return `
          <div class="dep-row no-break">
            <div class="dep-label">${d?.depName || ""}</div>
            <div class="dep-bar-wrap">
              <div class="dep-bar-track">
                <div style="width:${pA}%;background:#22c55e;"></div>
                <div style="width:${pP}%;background:#EF4444;"></div>
              </div>
              <div class="dep-legend">
                <span><i class="dot" style="background:#22c55e;"></i>บัญชีใช้งานได้ ${(d?.canuse || 0).toLocaleString("th-TH")} คน</span>
                <span><i class="dot" style="background:#EF4444;"></i>บัญชีถูกระงับ ${(d?.cannotuse || 0).toLocaleString("th-TH")} คน</span>
              </div>
            </div>
            <div class="dep-total">ทั้งหมด ${(d?.total || 0).toLocaleString("th-TH")} คน</div>
          </div>`;
          })
          .join("")}
      </div>
    </div>
  
  </body>
</html>
`;

      return html;
    } catch (error) {
      console.error(error);
    }
  },
  exportOverviewAlumniData: async (data, selectYear, roleId) => {
    try {
      const html = `<!DOCTYPE html>
<html lang="th">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>รายงานจำนวนศิษย์เก่า</title>
<style>
@font-face {
  font-family: 'Sarabun';
  src: url(data:font/truetype;charset=utf-8;base64,${fontBase64})
       format('truetype');
}
  @page{
    size: A4;
    margin: 120px 40px 40px 40px;
  }

  *{
    box-sizing: border-box;
  }

  body{
    margin: 0;
    color: #000;
    font-size: 14px;
    line-height: 1.5;
    font-family: 'Sarabun', sans-serif;
  }

  h1{
    font-size: 20px;
    margin: 0 0 4px;
  }

  h2{
    font-size: 16px;
    margin: 24px 0 10px;
    break-after: avoid;
    page-break-after: avoid;
    font-weight:400;
  }

  table{
    border-collapse: separate;
    border-spacing: 0;
    width: 100%;
    margin-bottom: 24px;
    break-inside: auto;
    page-break-inside: auto;
  }

  thead{
    display: table-header-group;
  }

  tfoot{
    display: table-footer-group;
  }

  tr{
    break-inside: avoid;
    page-break-inside: avoid;
  }

  th, td{
    border: 0.5px solid #000;
    padding: 8px 12px;
    text-align: left;
    font-weight:400;
  }

  th{
    background-color: #e8f0f7;
  }

  thead tr:first-child th:first-child{
    border-top-left-radius: 10px;
  }

  thead tr:first-child th:last-child{
    border-top-right-radius: 10px;
  }

  td.num, th.num{
    text-align: right;
  }

  tfoot td{
    font-weight: bold;
    page-break-before: always;
  }
      .page-break {
        page-break-before: always;
      }

</style>
</head>
<body>

  <h1>รายงานข้อมูลศิษย์เก่า${selectYear ? " ในปีการศึกษา " + selectYear : ""}</h1>

  ${
    Number(roleId) > 3
      ? ` <h2>จำนวนศิษย์เก่าแยกตามคณะ</h2>
  <table>
    <thead>
      <tr>
        <th>ชื่อคณะ</th>
        <th class="num">จำนวนศิษย์เก่า</th>
      </tr>
    </thead>
    <tbody>
   <tbody>
${data.allAlumniGrounbByFac
  .map(
    (d) => `
      <tr>
        <td>${d.name ?? "-"}</td>
        <td class="num">${(d.value ?? 0).toLocaleString("th-TH")}</td>
      </tr>
    `,
  )
  .join("")}
</tbody>
    </tbody>
    <tfoot>
      <tr><td>รวมทั้งหมด</td><td class="num">${data.allAlumniGrounbByFac.reduce(
        (sum, x) => sum + x.value,
        0,
      )}</td></tr>
    </tfoot>
  </table>`
      : ``
  }
 

  <h2>จำนวนศิษย์เก่า${Number(roleId) >= 3 ? "แยกตาม" : "ภายใน"}สาขาวิชา</h2>
  <table>
    <thead>
      <tr>
        <th>ชื่อสาขาวิชา</th>
        <th class="num">จำนวนศิษย์เก่า</th>
      </tr>
    </thead>
    <tbody>
    ${data.allAlumniGroupbyDep
      .map(
        (d) => `
      <tr>
        <td>${d.name ?? "-"}</td>
        <td class="num">${(d.value ?? 0).toLocaleString("th-TH")}</td>
      </tr>
    `,
      )
      .join("")}
     
    </tbody>
    <tfoot>
      <tr><td>รวมทั้งหมด</td><td class="num">${data.allAlumniGroupbyDep.reduce(
        (sum, x) => sum + x.value,
        0,
      )}</td></tr>
    </tfoot>
  </table>

  ${
    Number(roleId > 3)
      ? `<h2>จำนวนศิษย์ที่มีงานทำและว่างงาน/ไม่พบข้อมูลในปัจจุบัน แยกตามคณะ</h2>
 <table>
    <thead>
      <tr>
        <th>ชื่อคณะ</th>
        <th class="num">มีงานทำ</th>
         <th class="num">ว่างงาน/ไม่พบข้อมูล</th>
      </tr>
    </thead>
    <tbody>
    ${data.allFacByWork
      .map(
        (d) => `
      <tr>
        <td>${d.name ?? "-"}</td>
        <td class="num">${(d.work ?? 0).toLocaleString("th-TH")}</td>
         <td class="num">${(d.unwork ?? 0).toLocaleString("th-TH")}</td>
      </tr>
    `,
      )
      .join("")}
     
    </tbody>
    <tfoot>
      <tr><td>รวมทั้งหมด</td><td class="num">${data.allFacByWork.reduce(
        (sum, x) => sum + x.work,
        0,
      )}</td><td class="num">${data.allFacByWork.reduce(
        (sum, x) => sum + x.unwork,
        0,
      )}</td></tr>
    </tfoot>
  </table>
`
      : ``
  }
    
   <h2>จำนวนศิษย์ที่มีงานทำและว่างงาน/ไม่พบข้อมูลในปัจจุบัน ${Number(roleId) >= 3 ? "แยกตาม" : "ภายใน"}สาขาวิชา</h2>
 <table>
    <thead>
      <tr>
        <th>ชื่อสาขาวิชา</th>
        <th class="num">มีงานทำ</th>
         <th class="num">ว่างงาน/ไม่พบข้อมูล</th>
      </tr>
    </thead>
    <tbody>
    ${data.allDepByWork
      .map(
        (d) => `
      <tr>
        <td>${d.name ?? "-"}</td>
        <td class="num">${(d.work ?? 0).toLocaleString("th-TH")}</td>
         <td class="num">${(d.unwork ?? 0).toLocaleString("th-TH")}</td>
      </tr>
    `,
      )
      .join("")}
     
    </tbody>
    <tfoot>
      <tr><td>รวมทั้งหมด</td><td class="num">${data.allDepByWork.reduce(
        (sum, x) => sum + x.work,
        0,
      )}</td><td class="num">${data.allDepByWork.reduce(
        (sum, x) => sum + x.unwork,
        0,
      )}</td></tr>
    </tfoot>
  </table>

  <h2>อาชีพยอดนิยมของศิษย์เก่า</h2>
 <table>
    <thead>
      <tr>
        <th>อาชีพ</th>
        <th class="num">จำนวนศิษย์เก่า</th>
      </tr>
    </thead>
    <tbody>
    ${data.mostPopularJob
      .map(
        (d) => `
      <tr>
        <td>${d.name ?? "-"}</td>
        <td class="num">${(d.value ?? 0).toLocaleString("th-TH")}</td>
      </tr>
    `,
      )
      .join("")}
     
    </tbody>
   
  </table>

  ${
    Number(roleId) > 3
      ? `<h2>จำนวนศิษย์ที่ศึกษาต่อแยกตามคณะ</h2>
 <table>
    <thead>
      <tr>
        <th>ชื่อคณะ</th>
        <th class="num">ระดับปริญญาโท</th>
         <th class="num">ระดับปริญญาเอก</th>
          <th class="num">ทั้งหมด</th>
      </tr>
    </thead>
    <tbody>
    ${data.allAlumniFacStudy
      .map(
        (d) => `
      <tr>
        <td>${d.name ?? "-"}</td>
        <td class="num">${(d.too ?? 0).toLocaleString("th-TH")}</td>
         <td class="num">${(d.eak ?? 0).toLocaleString("th-TH")}</td>
         <td class="num">${(d.value ?? 0).toLocaleString("th-TH")}</td>
      </tr>
    `,
      )
      .join("")}
     
    </tbody>
    <tfoot>
      <tr><td>รวมทั้งหมด</td><td class="num">${data.allAlumniFacStudy.reduce(
        (sum, x) => sum + x.too,
        0,
      )}</td><td class="num">${data.allAlumniFacStudy.reduce(
        (sum, x) => sum + x.eak,
        0,
      )}</td><td class="num">${data.allAlumniFacStudy.reduce(
        (sum, x) => sum + x.value,
        0,
      )}</td></tr>
    </tfoot>
  </table>`
      : ``
  }
  

  <h2>จำนวนศิษย์ที่ศึกษาต่อ${Number(roleId) >= 3 ? "แยกตาม" : "ภายใน"}สาขาวิชา</h2>
 <table>
    <thead>
      <tr>
        <th>ชื่อสาขาวิชา</th>
        <th class="num">ระดับปริญญาโท</th>
         <th class="num">ระดับปริญญาเอก</th>
          <th class="num">ทั้งหมด</th>
      </tr>
    </thead>
    <tbody>
    ${data.allAlumniByDepStudy
      .map(
        (d) => `
      <tr>
        <td>${d.name ?? "-"}</td>
        <td class="num">${(d.too ?? 0).toLocaleString("th-TH")}</td>
         <td class="num">${(d.eak ?? 0).toLocaleString("th-TH")}</td>
         <td class="num">${(d.value ?? 0).toLocaleString("th-TH")}</td>
      </tr>
    `,
      )
      .join("")}
     
    </tbody>
    <tfoot>
      <tr><td>รวมทั้งหมด</td><td class="num">${data.allAlumniByDepStudy.reduce(
        (sum, x) => sum + x.too,
        0,
      )}</td><td class="num">${data.allAlumniByDepStudy.reduce(
        (sum, x) => sum + x.eak,
        0,
      )}</td><td class="num">${data.allAlumniByDepStudy.reduce(
        (sum, x) => sum + x.value,
        0,
      )}</td></tr>
    </tfoot>
  </table>
</body>
</html>`;

      return html;
    } catch (error) {
      console.error(error);
    }
  },
};
