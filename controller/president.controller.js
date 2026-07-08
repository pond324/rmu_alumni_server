import path from "path";
import { unlink } from "fs/promises";
import { existsSync } from "fs";
import { envConfig, sftpConfig, transporter } from "../config/config";
import prisma from "../libs/prisma";
import puppeteer, { launch } from "puppeteer-core";
import { ExportPdfHTML } from "../libs/export-pdf-html";
import bcrypt from "bcryptjs";
import fs from "fs";
import fsPromises from "fs/promises";
import {
  generateSecurePassword,
  generateSecureUsername,
} from "../libs/generate-password";
import { t } from "elysia";
import { departmentText, facultyText } from "../libs/fac-dep-text";
import { verifyFolderAccess } from "../libs/drive-service-account";
import { generateExcelBuffer } from "../libs/exxport-xlxs";
import {
  uploadFileToDrive,
  uploadFolderToDrive,
} from "../libs/oauth-drive-service";
import AdmZip from "adm-zip";

const logoBase64 = fs.readFileSync("./public/logo_rmu.png", {
  encoding: "base64",
});

const fontBase64 = fs
  .readFileSync("public/fonts/Sarabun-Regular.ttf")
  .toString("base64");

const fontStyle = `
  <style>
    @font-face {
      font-family: 'Sarabun';
      src: url(data:font/truetype;base64,${fontBase64}) format('truetype');
      font-weight: normal;
    }
    * { font-family: 'Sarabun', sans-serif; }
  </style>
`;

export const presidentController = {
  alumni_list: async ({ set, query }) => {
    try {
      const {
        page,
        facultyId,
        departmentId,
        take,
        search,
        sort,
        current,
        selectEduLevel,
      } = query;
      const skip = take * (page - 1);

      let filter = {};

      if (facultyId) {
        filter = { facultyId: facultyId };
      }
      if (departmentId) {
        filter = { departmentId: departmentId };
      }
      if (search) {
        filter = {
          ...filter,
          OR: [
            {
              prefix: {
                contains: search,
                mode: "insensitive",
              },
            },
            {
              fname: {
                contains: search,
                mode: "insensitive",
              },
            },
            {
              lname: {
                contains: search,
                mode: "insensitive",
              },
            },
            {
              year_start: {
                contains: String(search),
                mode: "insensitive",
              },
            },
            {
              alumni_id: {
                contains: String(search),
                mode: "insensitive",
              },
            },
          ],
        };
      }
      if (selectEduLevel) {
        filter = {
          ...filter,
          edu_levelId: selectEduLevel,
        };
      }
      let work = {};
      if (current) {
        work = JSON.parse(current);
        filter = {
          ...filter,
          ...work,
        };
      }

      const [result, total] = await Promise.all([
        prisma.alumni.findMany({
          skip,
          take: Number(take),
          where: {
            ...filter,
          },
          select: {
            alumni_id: true,
            year_start: true,
            year_end: true,
            prefix: true,
            fname: true,
            lname: true,
            facultyId: true,
            departmentId: true,
            createtAt: true,
            canUse: true,
            work_expreriences: {
              select: {
                isCurrent: true,
              },
            },
            regis_alumni: {
              select: {
                isApproved: true,
                id: true,
              },
            },
          },
          orderBy: {
            ...(sort ? JSON.parse(sort) : { year_start: "desc" }),
          },
        }),
        prisma.alumni.count({
          where: {
            ...filter,
          },
        }),
      ]);

      set.status = 200;
      return {
        result,
        totalPage: Math.ceil(total / take) < 1 ? 1 : Math.ceil(total / take),
        total,
      };
    } catch (err) {
      console.error(err);
      set.status = 500;
      return { err };
    }
  },
  create_news: async ({ body, set }) => {
    try {
      const {
        thumnail,
        isPublish,
        target_money,
        current_money,
        donate_end,
        ...rest
      } = body;
      if (!thumnail) {
        return (set.status = 400);
      }
      // save image
      const imgName = Date.now() + "_" + thumnail.name?.split(" ").join("");

      const create = await prisma.news_donatios.create({
        data: {
          target_money:
            target_money == "undefined" ? null : Number(target_money),
          current_money:
            current_money == "undefined" ? null : Number(current_money),
          donate_end: donate_end == "undefined" ? null : donate_end,
          ...rest,
          thumnail: imgName,
          date: String(new Date().getDate()),
          month: String(new Date().getMonth() + 1),
          year: String(new Date().getFullYear() + 543),
          view: 0,
          isPublish: JSON.parse(isPublish),
        },
      });
      if (!create) {
        return (set.status = 400);
      }
      Bun.write("./public/upload/" + imgName, thumnail);

      set.status = 200;
      return { ok: true };
    } catch (err) {
      console.error(err);
      set.status = 500;
    }
  },
  get_news_donate: async ({ set, query, store }) => {
    try {
      const { roleId } = store.user;
      const {
        page,
        take,
        sort,
        searchType,
        searchDate,
        searchMonth,
        searchCategory,
        search,
      } = query;
      const skip = Number(take) * (page - 1);

      let filter = {};
      if (searchType == 1) {
        filter = {
          category: "0",
        };
      } else if (searchType == 2) {
        filter = {
          category: "1",
        };
      }
      if (roleId < 5) {
        filter = {
          ...filter,
          isPublish: true,
        };
      }
      if (searchCategory == 1) {
        filter = {
          ...filter,
          isPublish: true,
        };
      } else if (searchCategory == 2) {
        filter = {
          ...filter,
          isPublish: false,
        };
      }
      if (searchDate) {
        filter = {
          ...filter,
          date: `${searchDate}`,
        };
      }
      if (searchMonth) {
        filter = {
          ...filter,
          month: `${searchMonth}`,
        };
      }
      if (search) {
        filter = {
          ...filter,
          OR: [
            {
              title: {
                contains: search,
                mode: "insensitive",
              },
            },
            {
              short_detail: {
                contains: search,
                mode: "insensitive",
              },
            },
          ],
        };
      }

      const [result, total] = await Promise.all([
        prisma.news_donatios.findMany({
          skip,
          take: Number(take),
          where: {
            ...filter,
          },
          select: {
            id: true,
            detail: true,
            thumnail: true,
            createdAt: true,
            updatedAt: true,
            title: true,
            short_detail: true,
            view: true,
            category: true,
            target_money: true,
            current_money: true,
            donate_end: true,
            isPublish: true,
          },
          orderBy: {
            ...JSON.parse(sort),
          },
        }),
        prisma.news_donatios.count({
          where: {
            ...filter,
          },
        }),
      ]);

      set.status = 200;
      return {
        result,
        totalPage: Math.ceil(total / take) < 1 ? 1 : Math.ceil(total / take),
        total,
      };
    } catch (err) {
      console.error(err);
      set.status = 500;
      return { err };
    }
  },
  delete_news: async ({ params, set }) => {
    try {
      const { id } = params;
      if (!id) return (set.status = 400);

      const deleteThumNail = await prisma.news_donatios.findFirst({
        where: {
          id: Number(id),
        },
        select: {
          thumnail: true,
        },
      });
      if (deleteThumNail.thumnail) {
        const delPath = path.join(
          import.meta.dir,
          "../public/upload",
          deleteThumNail.thumnail,
        );
        if (existsSync(delPath)) {
          await unlink(delPath);
        }
      }

      const del = await prisma.news_donatios.delete({
        where: {
          id: Number(id),
        },
      });
      if (!del) {
        return (set.status = 400);
      }

      set.status = 200;
      return { ok: true };
    } catch (err) {
      console.error(err);
      set.status = 500;
      return { err };
    }
  },
  get_news_byId: async ({ params, set }) => {
    try {
      const { id } = params;
      if (!id) {
        console.log(id);
        return (set.status = 400);
      }

      const data = await prisma.news_donatios.findUnique({
        where: {
          id: Number(id),
        },
        select: {
          title: true,
          thumnail: true,
          isPublish: true,
          short_detail: true,
          detail: true,
          target_money: true,
          category: true,
          current_money: true,
          donate_end: true,
          createdAt: true,
          view: true,
        },
      });

      set.status = 200;
      return data;
    } catch (err) {
      console.error(err);
      set.status = 500;
      return { err };
    }
  },
  update_news: async ({ body, set, params }) => {
    try {
      const {
        thumnail,
        isPublish,
        target_money,
        current_money,
        donate_end,
        ...rest
      } = body;
      const { id } = params;
      if (!id) {
        return (set.status = 400);
      }

      const oldImage = await prisma.news_donatios.findUnique({
        where: {
          id: Number(id),
        },
        select: {
          thumnail: true,
        },
      });
      let updateImage = "";
      if (thumnail !== "null") {
        // delete oldimage
        const delPath = path.join(
          import.meta.dir,
          "../public/upload",
          oldImage.thumnail,
        );
        if (!existsSync(delPath)) {
          return { err: "ไม่พบไฟล์ที่ต้องการแก้ไข" };
        }

        await unlink(delPath);

        updateImage = Date.now() + "_" + thumnail.name?.split(" ").join("");
        Bun.write("./public/upload/" + updateImage, thumnail);
      }

      const update = await prisma.news_donatios.update({
        where: {
          id: Number(id),
        },
        data: {
          updatedAt: new Date(),
          target_money:
            target_money == "undefined" ? null : Number(target_money),
          current_money:
            current_money == "undefined" ? null : Number(current_money),
          donate_end: donate_end == "undefined" ? null : donate_end,
          ...rest,
          thumnail: thumnail !== "null" ? updateImage : oldImage.thumnail,
          date: String(new Date().getDate()),
          month: String(new Date().getMonth() + 1),
          year: String(new Date().getFullYear() + 543),
          view: 0,
          isPublish: JSON.parse(isPublish),
        },
      });

      if (!update) {
        return (set.status = 400);
      }

      set.status = 200;
      return { ok: true };
    } catch (err) {
      console.error(err);
      set.status = 500;
      return { err };
    }
  },
  get_all_avg: async ({ set }) => {
    try {
      const [all, allNews, allDonation, allViews, allMoney] = await Promise.all(
        [
          prisma.news_donatios.count(),
          prisma.news_donatios.count({
            where: {
              category: "0",
            },
          }),
          prisma.news_donatios.count({
            where: {
              category: "1",
            },
          }),
          prisma.news_donatios.aggregate({
            _max: {
              view: true,
            },
          }),
          prisma.news_donatios.aggregate({
            where: {
              category: "1",
            },
            _sum: {
              current_money: true,
            },
          }),
        ],
      );

      set.status = 200;
      return {
        all,
        allNews,
        allDonation,
        allViews: allViews._max.view,
        allMoney: allMoney._sum.current_money,
      };
    } catch (err) {
      console.error(err);
      set.status = 500;
      return { err };
    }
  },
  update_view: async ({ params, set }) => {
    try {
      const { id } = params;
      if (!id) {
        return (set.status = 400);
      }

      const oldView = await prisma.news_donatios.findUnique({
        where: {
          id: Number(id),
        },
        select: {
          view: true,
        },
      });

      const update = await prisma.news_donatios.update({
        where: {
          id: Number(id),
        },
        data: {
          view: oldView.view + 1,
        },
      });
      if (!update) {
        return (set.status = 400);
      }

      set.status = 200;
      return { ok: true };
    } catch (err) {
      console.error(err);
      set.status = 500;
      return { err };
    }
  },
  get_other__news: async ({ set, params }) => {
    try {
      const { category, id } = params;

      const result = await prisma.news_donatios.findMany({
        take: 5,
        where: {
          category: `${category}`,
          id: {
            not: Number(id),
          },
          isPublish: true,
        },
        select: {
          id: true,
          title: true,
          view: true,
          createdAt: true,
        },
        orderBy: {
          createdAt: "desc",
        },
      });

      set.status = 200;
      return result;
    } catch (err) {
      console.error(err);
      set.status = 500;
      return { err };
    }
  },
  send_email: async ({ body, set, query, store }) => {
    try {
      const { title, detail, selectCategory, selectAlumniId } = body;
      console.log("🚀 ~ body:", body);
      if (!title || !detail || !selectCategory || !selectAlumniId) {
        return (set.status = 400);
      }
      const senderRole = Number(store.user.roleId);

      // add to sendTextHistory

      const alumniEmails = await prisma.alumni.findMany({
        where: {
          alumni_id: {
            in: selectAlumniId,
          },
        },
        select: {
          alumni_id: true,
          alumni_contract: {
            select: {
              email1: true,
              email2: true,
            },
          },
        },
      });
      // console.log("🚀 ~ alumniEmails:", alumniEmails);
      if (alumniEmails) {
        alumniEmails.forEach(async (a) => {
          const toEmail =
            a?.alumni_contract?.email1 ||
            a?.alumni_contract?.email2 ||
            a?.alumni_id + "@rmu.ac.th";
          const mailOptions = {
            from: envConfig.mail_user,
            to: toEmail,
            subject:
              "ข้อความจากระบบสารสนเทศเครือข่ายศิษย์เก่ามหาวิทยาลัยราชภัฏมหาสารคาม",
            html: `<h4>${title}</h4><br/>${detail}`,
          };

          await transporter.sendMail(mailOptions);
        });
        const newHistory = await prisma.sendTextHistory.create({
          data: {
            sender_type: senderRole < 3 ? "professor" : "admin",
            ...(senderRole < 5
              ? {
                  professor: {
                    connect: {
                      professor_id: store.user.id,
                    },
                  },
                }
              : {
                  admin: {
                    connect: {
                      admin_id: store.user.id,
                    },
                  },
                }),
            detail,
            title,
            alumniId: selectAlumniId.join(","),
            category: selectCategory.join(","),
          },
        });
        if (!newHistory) return (set.status = 400);
      }

      set.status = 200;
      return { ok: true };
    } catch (err) {
      console.error(err);
      set.status = 500;
      return { err };
    }
  },
  delete_alumni_contract: async ({ params, set, query }) => {
    try {
      const { alumniId } = params;
      if (!alumniId) {
        return (set.status = 400);
      }

      const hadContract = await prisma.alumni_contract.findUnique({
        where: {
          alumniId,
        },
      });
      if (!hadContract) {
        return { err: "ไม่พบช่องทางการติดต่อของศิษย์เก่ารายนี้" };
      }
      const del = await prisma.alumni_contract.delete({
        where: {
          alumniId,
        },
      });
      if (!del) {
        return (set.status = 400);
      }

      // sendEmail
      const { reasonToDelete } = query;
      const emailTo = await prisma.alumni_contract.findUnique({
        where: {
          alumniId,
        },
        select: {
          email1: true,
          email2: true,
        },
      });
      if (emailTo && (emailTo.email1 || emailTo.email2)) {
        const mailOptions = {
          from: envConfig.mail_user,
          to: emailTo.email1 || emailTo.email2 || alumniId + "@rmu.ac.th",
          subject: "แจ้งเตือนลบข้อมูลช่องทางการติดต่อของคุณ",
          text: `ระบบสารสนเทศเครือข่ายศิษย์เก่ามหาวิทยาลัยราชภัฏมหาสารคาม ได้ลบข้อมูลช่องทางการติดต่อของคุณเพราะ\n"${reasonToDelete}"\nข้อมูลของคุณถูกลบโดยผู้ดูแลระบบ`,
        };
        await transporter.sendMail(mailOptions);
      }

      set.status = 200;
      return { ok: true };
    } catch (err) {
      console.error(err);
      set.status = 500;
      return { err };
    }
  },
  delete_work_exprerience: async ({ set, params, query }) => {
    try {
      const { alumniId } = params;
      if (!alumniId) {
        return (set.status = 400);
      }

      const del = await prisma.work_expreriences.deleteMany({
        where: {
          alumniId,
        },
      });
      if (!del) {
        return (set.status = 400);
      }
      const delStd = await prisma.studey_expreriences.deleteMany({
        where: {
          alumniId,
        },
      });
      if (!delStd) {
        return (set.status = 400);
      }

      // sendEmail
      const { reasonToDelete } = query;
      const emailTo = await prisma.alumni_contract.findUnique({
        where: {
          alumniId,
        },
        select: {
          email1: true,
          email2: true,
        },
      });
      if (emailTo && (emailTo.email1 || emailTo.email2)) {
        const mailOptions = {
          from: envConfig.mail_user,
          to: emailTo.email1 || emailTo.email2 || alumniId + "@rmu.ac.th",
          subject: "แจ้งเตือนลบข้อมูลช่องทางการติดต่อของคุณ",
          text: `ระบบสารสนเทศเครือข่ายศิษย์เก่ามหาวิทยาลัยราชภัฏมหาสารคาม ได้ลบข้อมูลช่องทางการติดต่อของคุณเพราะ\n"${reasonToDelete}"\nข้อมูลของคุณถูกลบโดยผู้ดูแลระบบ`,
        };
        await transporter.sendMail(mailOptions);
      }

      set.status = 200;
      return { ok: true };
    } catch (err) {
      console.error(err);
      set.status = 500;
      return { err };
    }
  },
  get_users: async ({ set, query }) => {
    try {
      const {
        page,
        facultyId,
        departmentId,
        take,
        search,
        sort,
        filter: extra,
      } = query;
      const skip = take * (page - 1);

      let filter = {};
      if (facultyId) {
        filter = { facultyId };
      }
      if (departmentId) {
        filter = { departmentId };
      }
      if (search) {
        filter = {
          ...filter,
          OR: [
            {
              prefix: {
                contains: search,
                mode: "insensitive",
              },
            },
            {
              fname: {
                contains: search,
                mode: "insensitive",
              },
            },
            {
              lname: {
                contains: search,
                mode: "insensitive",
              },
            },
            {
              academic_rank: {
                contains: search,
                mode: "insensitive",
              },
            },
            {
              univercity_position: {
                contains: search,
                mode: "insensitive",
              },
            },
          ],
        };
      }

      if (extra) {
        filter = {
          ...filter,
          ...JSON.parse(extra),
        };
      }
      const [data, total] = await Promise.all([
        prisma.professor.findMany({
          take: Number(take),
          skip,
          where: {
            ...filter,
          },
          select: {
            professor_id: true,
            academic_rank: true,
            createdAt: true,
            fname: true,
            lname: true,
            prefix: true,
            departmentId: true,
            facultyId: true,
            univercity_position: true,
            canUse: true,
          },
          orderBy: {
            createdAt: "desc",
          },
        }),
        prisma.professor.count({
          where: {
            ...filter,
          },
        }),
      ]);

      set.status = 200;
      return {
        data,
        total,
        totalPage: Math.ceil(total / take) < 1 ? 1 : Math.ceil(total / take),
      };
    } catch (err) {
      console.error(err);
      set.status = 500;
      return { err };
    }
  },
  manage_account: async ({ set, body, params, store }) => {
    try {
      const { user_id } = params;
      if (!user_id) {
        set.status = 400;
        return { err: "Missing user_id" };
      }
      if (store?.user?.id === user_id) {
        return { err: "ไม่สามารถดำเนินการส่วนนี้ได้" };
      }

      const { canUse, role } = body;

      // Single update query with all needed data
      let update;
      if (role == 1) {
        update = await prisma.alumni.update({
          where: {
            alumni_id: user_id,
          },
          data: {
            canUse,
          },
        });
      } else if (role == 2) {
        update = await prisma.professor.update({
          where: {
            professor_id: user_id,
          },
          data: {
            canUse,
          },
        });
      } else if (role == 5) {
        update = await prisma.admin.update({
          where: {
            admin_id: user_id,
          },
          data: {
            canUse,
          },
        });
      }

      if (!update) {
        set.status = 400;
        return { err: "Update failed or contract not found" };
      }

      // Use data from update query (no redundant query)
      const contract = await prisma.alumni_contract.findFirst({
        where: {
          alumniId: user_id,
        },
        select: {
          email1: true,
          email2: true,
        },
      });
      const recipientEmail = contract?.email1 || contract?.email2;

      if (recipientEmail) {
        // FIXED: Corrected logic - canUse means account is active/approved
        const mailOptions = {
          from: envConfig.mail_user,
          to: recipientEmail,
          subject: canUse
            ? "แจ้งเตือนบัญชีได้รับการอนุมัติโดยผู้ดูแลระบบ"
            : "แจ้งเตือนบัญชีถูกระงับชั่วคราวโดยผู้ดูแลระบบ",
          html: `
<div style="font-family: 'Sarabun', sans-serif; background-color: #f6f9fc; padding: 30px;">
  <table align="center" width="600" style="background-color: #ffffff; border-radius: 12px; box-shadow: 0 4px 10px rgba(0,0,0,0.05); overflow: hidden;">
    <tr>
      <td style="background-color: #007bff; color: #ffffff; text-align: center; padding: 20px;">
        <h2 style="margin: 0;">ระบบสารสนเทศเครือข่ายศิษย์เก่า</h2>
        <p style="margin: 0;">มหาวิทยาลัยราชภัฏมหาสารคาม</p>
      </td>
    </tr>

    <tr>
      <td style="padding: 30px; color: #333333;">
        <h3 style="color: #007bff; margin-top: 0;">
          ${
            canUse
              ? "✅ บัญชีของคุณได้รับการอนุมัติแล้ว"
              : "⚠️ บัญชีของคุณถูกระงับชั่วคราว"
          }
        </h3>
        ${
          canUse
            ? `
            <p style="font-size: 15px; line-height: 1.6;">
              ขอแจ้งให้ทราบว่า บัญชีของคุณได้ผ่านการตรวจสอบและ 
              <strong style="color:#28a745;">ได้รับการอนุมัติ</strong> แล้ว 
              คุณสามารถเข้าสู่ระบบสารสนเทศเครือข่ายศิษย์เก่าได้ทันที
            </p>`
            : `
            <p style="font-size: 15px; line-height: 1.6;">
              บัญชีของคุณได้ถูก <strong style="color:#dc3545;">ระงับการใช้งานชั่วคราว</strong> 
              โดยผู้ดูแลระบบ เนื่องจากอาจมีการตรวจสอบข้อมูลเพิ่มเติม
              หากต้องการข้อมูลเพิ่มเติม โปรดติดต่อเจ้าหน้าที่ดูแลระบบผ่านช่องทางที่ระบุด้านล่าง
            </p>`
        }
        <hr style="border: none; border-top: 1px solid #e0e0e0; margin: 30px 0;">

      </td>
    </tr>
  </table>
</div>
`,
        };

        await transporter.sendMail(mailOptions);
      }

      set.status = 200;
      return { ok: true };
    } catch (err) {
      console.error(err);
      set.status = 500;
      return { err };
    }
  },
  import_alumni_data: async ({ set, body, store }) => {
    try {
      const { data, file, fileSize } = body;
      const dataParse = JSON.parse(data);
      if (!data || !file) return (set.status = 400);
      const addHistory = await prisma.import_history.create({
        data: {
          file_name: file?.name,
          import_type: "alumni",
          file_size: Number(fileSize),
          total_rows: dataParse?.length || 0,
          admin: {
            connect: {
              admin_id: store?.user?.id,
            },
          },
          started_at: new Date(),
        },
        select: {
          id: true,
        },
      });
      if (!addHistory) return (set.status = 400);

      const setting = await prisma.setting.findMany({
        select: {
          skipAlumniDuplicate: true,
          allowedAlumniAccount: true,
        },
      });

      await prisma.alumni.createMany({
        data: dataParse.map((row) => ({
          ...row,
          ...(!setting[0].allowedAlumniAccount && { canUse: false }),
          import_historyId: addHistory.id,
        })),
        ...(setting[0].skipAlumniDuplicate && { skipDuplicates: true }),
      });

      set.status = 200;
      return { ok: true };
    } catch (error) {
      console.error(error);
      set.status = 500;
      return { error };
    }
  },
  get_year_options: async ({}) => {
    try {
      const [yearStart, yearEnd] = await Promise.all([
        prisma.alumni.groupBy({
          by: ["year_start"],
          orderBy: {
            year_start: "desc",
          },
          take: 30,
        }),
        prisma.alumni.groupBy({
          by: ["year_end"],
          orderBy: {
            year_end: "desc",
          },
          take: 30,
        }),
      ]);

      const start = yearStart
        .filter((y) => y.year_start !== null)
        .map((y) => y.year_start);
      const end = yearEnd
        .filter((y) => y.year_end !== null)
        .map((y) => y.year_end);
      return {
        yearStart: start,
        yearEnd: end,
      };
    } catch (error) {
      console.error(error);
      set.status = 500;
      return { error };
    }
  },
  get_alumni_regis_status_stats: async ({ set }) => {
    try {
      const [all, pendings, accepts, refuses, no_regis, stds] =
        await Promise.all([
          prisma.regis_alumni.count({}),
          prisma.regis_alumni.count({
            where: { isApproved: "pending" },
          }),
          prisma.regis_alumni.count({
            where: { isApproved: "accept" },
          }),
          prisma.regis_alumni.count({
            where: { isApproved: "refuse" },
          }),
          prisma.alumni.count({
            where: {
              regis_alumni: null,
            },
          }),
          prisma.alumni.count(),
        ]);

      set.status = 200;
      return { all, pendings, accepts, refuses, no_regis, stds };
    } catch (error) {
      console.error(error);
      set.status = 500;
      return { error };
    }
  },
  get_alumni_regis_data: async ({ set, params }) => {
    try {
      const { alumniId } = params;
      // console.log("🚀 ~ alumniId:", alumniId)
      if (!alumniId) return (set.status = 400);

      const regisData = await prisma.regis_alumni.findFirst({
        where: {
          alumni_id: alumniId,
        },
        select: {
          id: true,
          tel: true,
          slip_payment_url: true,
          isApproved: true,
          createdAt: true,
          updatedAt: true,
        },
      });

      set.status = 200;
      return regisData;
    } catch (error) {
      console.error(error);
      set.status = 500;
      return { error };
    }
  },
  accept_regis_alumni: async ({ set, params, body }) => {
    try {
      const { regisId } = params;
      if (!regisId) return (set.status = 400);
      const { alumni_id } = body;
      if (!alumni_id) return (set.status = 400);

      if (!isNaN(Number(regisId))) {
        const update = await prisma.regis_alumni.update({
          where: {
            id: Number(regisId),
          },
          data: {
            isApproved: "accept",
          },
          select: {
            alumni: {
              select: {
                alumni_id: true,
                fname: true,
                lname: true,
              },
            },
          },
        });
        if (!update) return (set.status = 400);
      } else {
        const createRegis = await prisma.regis_alumni.create({
          data: {
            alumni_id,
            tel: "",
            email: "",
            isApproved: "accept",
            slip_payment_url: "",
          },
        });
      }

      // update allowed account
      const updateAlumni = await prisma.alumni.update({
        where: {
          alumni_id: alumni_id,
        },
        data: {
          allowedAccount: true,
        },
        select: {
          fname: true,
          alumni_id: true,
          lname: true,
        },
      });

      // sendEmail
      const mailOptions = {
        from: envConfig.mail_user,
        to: updateAlumni.alumni_id + "@rmu.ac.th",
        subject: "ลงทะเบียนศิษย์เก่าสำเร็จ!",
        html: `
    <div style="font-family: Arial, sans-serif; background-color: #f4f8ff; padding: 30px;">
      <div style="max-width: 600px; margin: auto; background: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 12px rgba(0,0,0,0.1);">
        
        <div style="background: #1e88e5; color: white; text-align: center; padding: 25px;">
          <h1 style="margin: 0;">ลงทะเบียนศิษย์เก่าสำเร็จ</h1>
        </div>

        <div style="padding: 30px; color: #333;">
          <h2 style="color: #1e88e5;">สวัสดี คุณ${updateAlumni.fname} ${updateAlumni.lname}</h2>

          <p>
            ผู้ดูแลระบบได้รับข้อมูลการลงทะเบียนศิษย์เก่าของท่านเรียบร้อยแล้ว
            ขอบคุณที่เข้าร่วมเป็นส่วนหนึ่งของเครือข่ายศิษย์เก่า มหาวิทยาลัยราชภัฏมหาสารคาม
          </p>

        

          <div style="text-align: center; margin-top: 30px;">
            <a
              href="https://alumni.rmu.ac.th"
              style="
                background: #1e88e5;
                color: white;
                text-decoration: none;
                padding: 12px 24px;
                border-radius: 8px;
                display: inline-block;
              "
            >
              เข้าสู่ระบบศิษย์เก่า
            </a>
          </div>
        </div>

        <div style="background: #f5f9ff; text-align: center; padding: 15px; color: #666; font-size: 13px;">
          © ${new Date().getFullYear()} ระบบสารสนเทศเครือข่ายศิษย์เก่า มหาวิทยาลัยราชภัฏมหาสารคาม
        </div>

      </div>
    </div>
  `,
      };
      await transporter.sendMail(mailOptions);

      set.status = 200;
      return { ok: true };
    } catch (error) {
      console.error(error);
      set.status = 500;
      return { error };
    }
  },
  refuse_regis_alumni: async ({ set, params, body }) => {
    try {
      const { regisId } = params;
      if (!regisId) return (set.status = 400);

      const { reason } = body;
      if (!reason) return (set.status = 400);

      const update = await prisma.regis_alumni.update({
        where: {
          id: Number(regisId),
        },
        data: {
          isApproved: "refuse",
        },
        select: {
          alumni: {
            select: {
              alumni_id: true,
              fname: true,
              lname: true,
            },
          },
        },
      });

      // update allowed account
      await prisma.alumni.update({
        where: {
          alumni_id: update.alumni.alumni_id,
        },
        data: {
          allowedAccount: false,
        },
      });

      // sendEmail
      const mailOptions = {
        from: envConfig.mail_user,
        to: update.alumni.alumni_id + "@rmu.ac.th",
        subject: "แจ้งผลการพิจารณาการลงทะเบียนศิษย์เก่า",
        html: `
    <div style="font-family: Arial, sans-serif; background-color: #f4f8ff; padding: 30px;">
      <div style="max-width: 600px; margin: auto; background: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 12px rgba(0,0,0,0.1);">

        <div style="background: #1e88e5; color: white; text-align: center; padding: 25px;">
          <h1 style="margin: 0;">แจ้งผลการพิจารณา</h1>
        </div>

        <div style="padding: 30px; color: #333;">
          <h2 style="color: #1e88e5;">สวัสดี คุณ${update.alumni.fname} ${update.alumni.lname}</h2>

          <p>
            ขอขอบคุณที่ท่านได้ยื่นคำขอลงทะเบียนศิษย์เก่าผ่านระบบ
          </p>

          <div style="
  background: #fef2f2;
  border-left: 4px solid #ef4444;
  padding: 15px;
  margin: 20px 0;
  color: #991b1b;
">
  <strong>ผลการพิจารณา:</strong>
  ไม่สามารถอนุมัติคำขอลงทะเบียนของท่านได้ในขณะนี้
</div>

          <p><strong>เหตุผล:</strong></p>

          <div style="background: #f8f9fa; border-radius: 8px; padding: 15px; margin-bottom: 20px;">
            ${reason || "ข้อมูลที่ส่งมาไม่ครบถ้วน หรือไม่ตรงกับข้อมูลที่มีอยู่ในระบบ"}
          </div>

          <p>
            หากท่านต้องการแก้ไขข้อมูลหรือส่งเอกสารเพิ่มเติม
            สามารถดำเนินการได้ที่เว็บไซต์ ไปที่เมนู "ตรวจสอบรายชื่อ" -> ค้นหารายชื่อของคุณ -> "แก้ไขหลักฐานการชำระ"
          </p>

          <div style="text-align: center; margin-top: 30px;">
            <a
              href="https://alumni.rmu.ac.th"
              style="
                background: #1e88e5;
                color: white;
                text-decoration: none;
                padding: 12px 24px;
                border-radius: 8px;
                display: inline-block;
              "
            >
              กลับสู่เว็บไซต์ศิษย์เก่า
            </a>
          </div>
        </div>

        <div style="background: #f5f9ff; text-align: center; padding: 15px; color: #666; font-size: 13px;">
          © ${new Date().getFullYear()} ระบบสารสนเทศเครือข่ายศิษย์เก่า มหาวิทยาลัยราชภัฏมหาสารคาม
        </div>

      </div>
    </div>
  `,
      };

      await transporter.sendMail(mailOptions);

      set.status = 200;
      return { ok: true };
    } catch (error) {
      console.error(error);
      set.status = 500;
      return { error };
    }
  },
  delete_alumni_regis: async ({ set, params, body }) => {
    try {
      const { regisId } = params;
      if (!regisId) return (set.status = 400);

      const { reason, alumni_id } = body;
      if (!reason || !alumni_id) return (set.status = 400);

      const update = await prisma.regis_alumni.delete({
        where: {
          id: Number(regisId),
        },
      });

      // update allowed account
      const updateAlumni = await prisma.alumni.update({
        where: {
          alumni_id,
        },
        data: {
          allowedAccount: false,
        },
      });

      // sendEmail
      const mailOptions = {
        from: envConfig.mail_user,
        to: alumni_id + "@rmu.ac.th",
        subject: "แจ้งยกเลิกข้อมูลการลงทะเบียนศิษย์เก่า!",
        html: `
    <div style="font-family: Arial, sans-serif; background-color: #f4f8ff; padding: 30px;">
      <div style="max-width: 600px; margin: auto; background: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 12px rgba(0,0,0,0.1);">

        <div style="background: #1e88e5; color: white; text-align: center; padding: 25px;">
          <h1 style="margin: 0;">แจ้งยกเลิกข้อมูลการลงทะเบียนโดยผู้ดูแล</h1>
        </div>

        <div style="padding: 30px; color: #333;">
          <h2 style="color: #1e88e5;">สวัสดี คุณ${updateAlumni.fname} ${updateAlumni.lname}</h2>

         <p>
  ขอขอบคุณที่ท่านได้ลงทะเบียนในระบบสารสนเทศเครือข่ายศิษย์เก่า
</p>

<p>
  ขณะนี้ข้อมูลการลงทะเบียนศิษย์เก่าของท่านถูกยกเลิกออกจากระบบแล้ว
</p>

          

         <p><strong>สาเหตุการยกเลิก:</strong></p>

<div style="
  background: #f8f9fa;
  border-radius: 8px;
  padding: 15px;
  margin-bottom: 20px;
">
  ${reason || "ข้อมูลถูกยกเลิกโดยผู้ดูแลระบบ"}
</div>

          <p>
            หากการยกเลิกดังกล่าวเกิดจากความผิดพลาด
  หรือต้องการลงทะเบียนใหม่ กรุณาติดต่อผู้ดูแลระบบ
  หรือดำเนินการลงทะเบียนใหม่ผ่านเว็บไซต์ศิษย์เก่า
          </p>

          <div style="text-align: center; margin-top: 30px;">
            <a
              href="https://alumni.rmu.ac.th"
              style="
                background: #1e88e5;
                color: white;
                text-decoration: none;
                padding: 12px 24px;
                border-radius: 8px;
                display: inline-block;
              "
            >
              กลับสู่เว็บไซต์ศิษย์เก่า
            </a>
          </div>
        </div>

        <div style="background: #f5f9ff; text-align: center; padding: 15px; color: #666; font-size: 13px;">
          © ${new Date().getFullYear()} ระบบสารสนเทศเครือข่ายศิษย์เก่า มหาวิทยาลัยราชภัฏมหาสารคาม
        </div>

      </div>
    </div>
  `,
      };

      await transporter.sendMail(mailOptions);

      set.status = 200;
      return { ok: true };
    } catch (error) {
      console.error(error);
      set.status = 500;
      return { error };
    }
  },
  export_alumni_regis_data: async ({ set, body }) => {
    try {
      // console.log("🚀 ~ query:", body);
      const {
        selecetFacultyId,
        selectDepartmentId,
        selectFileType,
        selectRegisStatus,
        fileName,
        selectYearStart,
      } = body;
      let filter = {};
      const normallizedData = (data) => {
        return data
          .filter((s) => s || s !== null || s !== undefined)
          .map((s) => String(s));
      };

      if (selecetFacultyId.length > 0) {
        filter = {
          facultyId: {
            in: normallizedData(selecetFacultyId),
          },
        };
      }
      if (selectDepartmentId.length > 0) {
        filter = {
          ...filter,
          departmentId: {
            in: normallizedData(selectDepartmentId),
          },
        };
      }
      if (
        selectFileType == 1 &&
        !selectRegisStatus.includes("all") &&
        !selectRegisStatus.includes("no_regis")
      ) {
        filter = {
          ...filter,
          regis_alumni: {
            isApproved: { in: selectRegisStatus },
          },
        };
      }
      if (selectFileType == 1 && selectRegisStatus.includes("no_regis")) {
        filter = {
          ...filter,
          regis_alumni: null,
        };
      }
      if (selectYearStart.length > 0) {
        filter = {
          ...filter,
          year_start: { in: selectYearStart },
        };
      }

      // console.log("🚀 ~ filter:", filter);
      if (selectFileType == 1) {
        const data = await prisma.alumni.findMany({
          where: filter,
          select: {
            alumni_id: true,
            prefix: true,
            fname: true,
            lname: true,
            facultyId: true,
            departmentId: true,
            year_start: true,
            year_end: true,
            regis_alumni: {
              select: {
                isApproved: true,
              },
            },
          },
        });

        if (data.length < 1) return { err: "ไม่พบข้อมูลที่ต้องการส่งออก" };
        set.status = 200;
        return data;
      } else {
        const [
          allStd,
          no_regis,
          accept,
          pending,
          refuse,
          groupByFac,
          groupByFacNoRegis,
          groupByYearAccept,
          groupByYearNoRegis,
          groupByYearPending,
          groupByYearRefuse,
          groupByYearAllStd,
          maxStdValue,
          groupByDep,
          groupByDepAccept,
          groupbByDepNoRegis,
          groupByDepPending,
          groupByDepRefuse,
        ] = await Promise.all([
          prisma.alumni.count({}),
          prisma.alumni.count({ where: { regis_alumni: null } }),
          prisma.alumni.count({
            where: {
              regis_alumni: {
                isApproved: "accept",
              },
            },
          }),
          prisma.alumni.count({
            where: {
              regis_alumni: {
                isApproved: "pending",
              },
            },
          }),
          prisma.alumni.count({
            where: {
              regis_alumni: {
                isApproved: "refuse",
              },
            },
          }),
          prisma.alumni.groupBy({
            by: ["facultyId"],
            where: {
              ...filter,
            },
            _count: {
              alumni_id: true,
            },
          }),
          prisma.alumni.groupBy({
            by: ["facultyId"],
            where: {
              ...filter,
              OR: [
                {
                  regis_alumni: null,
                },
                {
                  regis_alumni: {
                    isApproved: { not: "accept" },
                  },
                },
              ],
            },
            _count: {
              alumni_id: true,
            },
          }),
          prisma.alumni.groupBy({
            where: {
              ...filter,
              regis_alumni: {
                isApproved: "accept",
              },
            },
            by: ["year_start"],
            _count: {
              alumni_id: true,
            },
          }),
          prisma.alumni.groupBy({
            where: {
              ...filter,
              regis_alumni: null,
            },
            by: ["year_start"],
            _count: {
              alumni_id: true,
            },
          }),
          prisma.alumni.groupBy({
            where: {
              ...filter,
              regis_alumni: {
                isApproved: "pending",
              },
            },
            by: ["year_start"],
            _count: {
              alumni_id: true,
            },
          }),
          prisma.alumni.groupBy({
            where: {
              ...filter,
              regis_alumni: {
                isApproved: "refuse",
              },
            },
            by: ["year_start"],
            _count: {
              alumni_id: true,
            },
          }),
          prisma.alumni.groupBy({
            by: ["year_start"],
            where: {
              ...filter,
            },
            orderBy: {
              year_start: "desc",
            },
            _count: {
              alumni_id: true,
            },
          }),
          prisma.alumni.groupBy({
            where: {
              ...filter,
            },
            by: ["facultyId"],
            _count: {
              alumni_id: true,
            },
          }),
          prisma.alumni.groupBy({
            by: ["departmentId"],
            where: {
              ...(normallizedData(selectDepartmentId).length > 0 && {
                departmentId: { in: normallizedData(selectDepartmentId) },
              }),
            },
            _count: {
              alumni_id: true,
            },
          }),
          prisma.alumni.groupBy({
            by: ["departmentId"],
            where: {
              ...(normallizedData(selectDepartmentId).length > 0 && {
                departmentId: { in: normallizedData(selectDepartmentId) },
              }),
              regis_alumni: {
                isApproved: "accept",
              },
            },
            _count: {
              alumni_id: true,
            },
          }),
          prisma.alumni.groupBy({
            by: ["departmentId"],
            where: {
              ...(normallizedData(selectDepartmentId).length > 0 && {
                departmentId: { in: normallizedData(selectDepartmentId) },
              }),
              regis_alumni: null,
            },
            _count: {
              alumni_id: true,
            },
          }),
          prisma.alumni.groupBy({
            by: ["departmentId"],
            where: {
              ...(normallizedData(selectDepartmentId).length > 0 && {
                departmentId: { in: normallizedData(selectDepartmentId) },
              }),
              regis_alumni: {
                isApproved: "pending",
              },
            },
            _count: {
              alumni_id: true,
            },
          }),
          prisma.alumni.groupBy({
            by: ["departmentId"],
            where: {
              ...(normallizedData(selectDepartmentId).length > 0 && {
                departmentId: { in: normallizedData(selectDepartmentId) },
              }),
              regis_alumni: {
                isApproved: "refuse",
              },
            },
            _count: {
              alumni_id: true,
            },
          }),
        ]);
        const browser = await puppeteer.launch({
          executablePath: process.env.PUPPETEER_EXECUTABLE_PATH || undefined,
          headless: true,
          args: [
            "--no-sandbox",
            "--disable-setuid-sandbox",
            "--disable-dev-shm-usage",
          ],
        });

        const page = await browser.newPage();

        await page.setContent(
          await ExportPdfHTML.exportAlumniRegisData({
            maxStdValue: Math.max(
              ...maxStdValue.map((item) => item._count.alumni_id),
            ),
            allStd,
            no_regis,
            accept,
            pending,
            refuse,
            groupByFac: groupByFac.map((f) => {
              const match = groupByFacNoRegis.find(
                (a) => a.facultyId === f.facultyId,
              );
              return {
                facId: f.facultyId,
                total: f._count.alumni_id,
                no_regis: match ? match._count.alumni_id : 0,
              };
            }),
            groupByYear: groupByYearAllStd.map((y) => {
              const matchNoRegis = groupByYearNoRegis.find(
                (n) => n.year_start === y.year_start,
              );
              const matchPending = groupByYearPending.find(
                (p) => p.year_start === y.year_start,
              );
              const matchRefuse = groupByYearRefuse.find(
                (r) => r.year_start === y.year_start,
              );
              const matchAccept = groupByYearAccept.find(
                (s) => s.year_start === y.year_start,
              );
              return {
                year: y.year_start,
                accept: matchAccept ? matchAccept._count.alumni_id : 0,
                no_regis: matchNoRegis ? matchNoRegis._count.alumni_id : 0,
                pendings: matchPending ? matchPending._count.alumni_id : 0,
                refuse: matchRefuse ? matchRefuse._count.alumni_id : 0,
                allStd: y._count.alumni_id,
              };
            }),
            groupByDep: groupByDep.map((d) => {
              const matchAccept = groupByDepAccept.find(
                (a) => a.departmentId === d.departmentId,
              );
              const matchNoregis = groupbByDepNoRegis.find(
                (a) => a.departmentId === d.departmentId,
              );
              const matchPending = groupByDepPending.find(
                (a) => a.departmentId === d.departmentId,
              );
              const matchRefuse = groupByDepRefuse.find(
                (a) => a.departmentId === d.departmentId,
              );

              return {
                depId: d.departmentId,
                total: d._count.alumni_id,
                accept: matchAccept ? matchAccept._count.alumni_id : 0,
                no_regis: matchNoregis ? matchNoregis._count.alumni_id : 0,
                pendings: matchPending ? matchPending._count.alumni_id : 0,
                refuse: matchRefuse ? matchRefuse._count.alumni_id : 0,
              };
            }),
          }),
          {
            waitUntil: "networkidle0",
          },
        );
        const pdfBuffer = await page.pdf({
          format: "A4",
          printBackground: true,
          preferCSSPageSize: true,
          displayHeaderFooter: true,
          headerTemplate: `
    <div style="
      width: 100%;
      display: flex;
      align-items: flex-start;
      padding: 8px 20px;
      justify-content: space-between;
      border-bottom: 3px solid #2563eb;
      box-sizing: border-box;
      font-family: 'Sarabun', sans-serif;
    ">
      <div style="display: flex; align-items: center; gap: 8px;">
        <div style="width: 60px; height: 60px; border-radius: 50%; overflow: hidden;">
          <img
              src="data:image/png;base64,${logoBase64}"
            style="width: 100%; height: 100%; object-fit: cover;"
          />
        </div>
        <div style="display: flex; flex-direction: column; gap: 4px;">
          <p style="margin: 0; font-size: 11px; color: #1f2937;">มหาวิทยาลัยราชภัฏมหาสารคาม</p>
          <p style="margin: 0; font-size: 14px; font-weight: bold; color: #2563eb; line-height: 1;">
            รายงานข้อมูลการลงทะเบียนศิษย์เก่า
          </p>
          <p style="margin: 0; font-size: 11px; color: #3b82f6;">
            ระบบสารสนเทศเครือข่ายศิษย์เก่า มหาวิทยาลัยราชภัฏมหาสารคาม
          </p>
        </div>
      </div>
      <div style="display: flex; flex-direction: column; align-items: flex-end;">
        <p style="margin: 0; font-size: 10px; color: #6b7280;">วันที่ออกรายงาน</p>
        <p style="margin: 0; font-size: 10px; color: #6b7280;">
          ${new Date().toLocaleTimeString("th-TH", { day: "numeric", year: "numeric", month: "long" })}
        </p>
      </div>
    </div>`,
          footerTemplate: `
    <div style="
      width: 100%;
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 10px 40px;
      background-color: #eff6ff;
      box-sizing: border-box;
      font-family: 'Sarabun', sans-serif;
    ">
      <div style="display: flex; flex-direction: column; gap: 2px;">
        <p style="margin: 0; font-size: 10px; color: #1f2937;">
          ระบบสารสนเทศเครือข่ายศิษย์เก่า มหาวิทยาลัยราชภัฏมหาสารคาม
        </p>
        <p style="margin: 0; font-size: 10px; color: #1f2937;">
          ข้อมูล ณ ${new Date().toLocaleDateString("th-TH", { day: "numeric", month: "long", year: "numeric" })}
        </p>
      </div>
      <div style="display: flex; align-items: center; gap: 4px; font-size: 12px; color: #2563eb;">
        <span>หน้า</span>
        <span class="pageNumber"></span>
        <span>/</span>
        <span class="totalPages"></span>
      </div>
    </div>`,
        });

        await browser.close();

        return new Response(pdfBuffer, {
          headers: {
            "Content-Type": "application/pdf",
            "Content-Disposition": `attachment; filename="report.pdf"; filename*=UTF-8''${encodeURIComponent(fileName)}`,
          },
        });
      }
    } catch (error) {
      console.error(error);
      set.status = 500;
      return { error };
    }
  },
  delete_professor_id: async ({ set, params, query }) => {
    try {
      const { professorId } = params;
      const { reason } = query;
      if (!professorId || !reason) return (set.status = 400);

      const professor = await prisma.professor.findFirst({
        where: {
          professor_id: professorId,
        },
        select: {
          fname: true,
          lname: true,
          academic_rank: true,
          alumni_contract: {
            select: {
              email1: true,
              email2: true,
            },
          },
        },
      });
      if (!professor) return (set.status = 400);

      const del = await prisma.alumni_contract.deleteMany({
        where: {
          professorProfessor_id: professorId,
        },
      });
      if (!del) return (set.status = 400);

      const toEmail =
        professor?.alumni_contract[0]?.email1 ||
        professor?.alumni_contract[0]?.email2;

      // send email
      if (!toEmail) {
        set.status = 200;
        return { ok: true };
      }

      const mailOptions = {
        from: envConfig.mail_user,
        to: toEmail,
        subject: "แจ้งเตือนการลบช่องทางการติดต่อ",
        html: `
    <div style="
      background:#f4f8fc;
      padding:40px 20px;
      font-family:'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
      color:#334155;
    ">
      <div style="
        max-width:600px;
        margin:0 auto;
        background:#ffffff;
        border-radius:12px;
        overflow:hidden;
        box-shadow:0 4px 12px rgba(0,0,0,0.08);
      ">
        

        <!-- Body -->
        <div style="padding:32px;">
          <p style="font-size:16px; margin-top:0;">
            เรียน <strong>${professor.academic_rank || "อาจารย์"}${professor.fname} ${professor.lname}</strong>
          </p>

          <p style="line-height:1.8;">
            ระบบสารสนเทศเครือข่ายศิษย์เก่า มหาวิทยาลัยราชภัฏมหาสารคาม
            ขอแจ้งให้ทราบว่า
            <strong style="color:#dc2626;">
              ผู้ดูแล ได้ลบช่องทางการติดต่อของท่านได้ถูกลบออกจากระบบแล้ว
            </strong>
          </p>

         <div style="
  background:#fef2f2;
  border-left:4px solid #dc2626;
  padding:16px;
  margin:24px 0;
  border-radius:6px;
">
  <div style="
    font-weight:600;
    color:#b91c1c;
    margin-bottom:8px;
  ">
    เหตุผลในการลบช่องทางการติดต่อ
  </div>

  <div style="
    color:#475569;
    line-height:1.8;
  ">
    ${reason || "ไม่ได้ระบุเหตุผล"}
  </div>
</div>
          <p style="line-height:1.8;">
            ท่านสามารถเข้าสู่ระบบเพื่อตรวจสอบข้อมูลส่วนตัว
            และจัดการช่องทางการติดต่อได้ตลอดเวลา
          </p>

          <div style="text-align:center; margin:32px 0;">
            <a
              href="https://alumni.rmu.ac.th"
              style="
                display:inline-block;
                background:#2563eb;
                color:#ffffff;
                text-decoration:none;
                padding:12px 28px;
                border-radius:8px;
                font-weight:600;
              "
            >
              เข้าสู่ระบบ
            </a>
          </div>
        </div>

        <!-- Footer -->
        <div style="
          background:#f8fafc;
          padding:20px;
          text-align:center;
          font-size:13px;
          color:#64748b;
          border-top:1px solid #e2e8f0;
        ">
          <p style="margin:0;">
            ระบบสารสนเทศเครือข่ายศิษย์เก่า
          </p>
          <p style="margin:6px 0 0 0;">
            มหาวิทยาลัยราชภัฏมหาสารคาม
          </p>
        </div>
      </div>
    </div>
  `,
      };
      await transporter.sendMail(mailOptions);

      set.status = 200;
      return { ok: true };
    } catch (error) {
      console.error(error);
      set.status = 500;
      return { error };
    }
  },
  get_import_history: async ({ set, query }) => {
    try {
      const { search, date, page, type } = query;
      const take = 10;
      const skip = take * (page - 1);
      let filter = { import_type: type };
      if (search) {
        filter = {
          ...filter,
          OR: [
            {
              file_name: {
                contains: search,
                mode: "insensitive",
              },
            },
          ],
        };
      }
      if (date) {
        const startDate = new Date(`${date}T00:00:00.000Z`);
        const endDate = new Date(`${date}T23:59:59.999Z`);
        filter = {
          ...filter,
          createdAt: {
            gte: startDate,
            lte: endDate,
          },
        };
      }

      const [data, total] = await Promise.all([
        prisma.import_history.findMany({
          where: filter,
          orderBy: {
            created_at: "desc",
          },
          skip,
          take,
          select: {
            id: true,
            import_type: true,
            admin: {
              select: {
                prefix: true,
                fname: true,
                lname: true,
              },
            },
            file_name: true,
            file_size: true,
            total_rows: true,
            created_at: true,
          },
        }),
        prisma.import_history.count({
          where: filter,
        }),
      ]);

      set.status = 200;
      return {
        data,
        total,
        totalPage: Math.ceil(total / take) < 1 ? 1 : Math.ceil(total / take),
      };
    } catch (error) {
      console.error(error);
      set.status = 500;
      return { error };
    }
  },
  delete_import_alumni: async ({ set, params, query, store }) => {
    try {
      const { importDataId } = params;
      if (!importDataId) return (set.status = 400);

      const { deleteThisHistory, password } = query;
      const findAdmin = await prisma.admin.findFirst({
        where: {
          admin_id: store?.user?.id,
        },
        select: {
          passwordHash: true,
        },
      });
      if (!findAdmin) return (set.status = 400);

      const passwordMatch = await bcrypt.compare(
        password,
        findAdmin.passwordHash,
      );
      if (!passwordMatch)
        return { err: "รหัสผ่านไม่ถูกต้องไม่สามารถลบข้อมูลได้" };

      await prisma.alumni.deleteMany({
        where: {
          import_historyId: importDataId,
        },
      });
      if (Boolean(deleteThisHistory) === true) {
        await prisma.import_history.delete({
          where: {
            id: importDataId,
          },
        });
      }

      set.status = 200;
      return { ok: true };
    } catch (error) {
      console.error(error);
      set.status = 500;
      return { error };
    }
  },
  delete_alumni_data: async ({ set, params, query, store }) => {
    try {
      const { alumniId } = params;
      if (!alumniId) return (set.status = 400);

      const { toggleDeleteType, reason, password } = query;
      if (!reason || !password) return (set.status = 400);

      const admin = await prisma.admin.findFirst({
        where: {
          admin_id: store?.user?.id,
        },
        select: {
          passwordHash: true,
        },
      });
      if (!admin) return (set.status = 400);

      const matchPassword = await bcrypt.compare(password, admin.passwordHash);
      if (!matchPassword) return { err: "ยืนยันตัวตนไม่ถูกต้อง" };

      const alumniEmails = await prisma.alumni.findFirst({
        where: {
          alumni_id: alumniId,
        },
        select: {
          alumni_contract: {
            select: {
              email1: true,
              email2: true,
            },
          },
          fname: true,
        },
      });
      if (!alumniEmails) return (set.status = 400);

      // delete
      await prisma.alumni.delete({
        where: {
          alumni_id: alumniId,
        },
      });
      if (Number(toggleDeleteType) == 2) {
        await Promise.all([
          prisma.alumni_contract.deleteMany({
            where: {
              alumniId,
            },
          }),
          prisma.user_privacy.deleteMany({
            where: {
              alumniId,
            },
          }),
          prisma.work_expreriences.deleteMany({
            where: {
              alumniId,
            },
          }),
          prisma.studey_expreriences.deleteMany({
            where: {
              alumniId,
            },
          }),
        ]);
      }

      // sendEmail
      const toEmail =
        alumniEmails?.alumni_contract?.email1 ||
        alumniEmails?.alumni_contract?.email2 ||
        alumniId + "@rmu.ac.th";
      if (toEmail) {
        const isDeleteAll = Number(toggleDeleteType) === 2;
        const subject = isDeleteAll
          ? "แจ้งการลบข้อมูลศิษย์เก่า"
          : "แจ้งการลบบัญชีศิษย์เก่า";
        const mailOptions = {
          from: envConfig.mail_user,
          to: toEmail,
          subject,
          html: `
<!DOCTYPE html>
<html lang="th">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
</head>
<body style="margin:0;padding:0;background-color:#EBF4FB;font-family:Tahoma,sans-serif;">

  <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#EBF4FB;padding:32px 0;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background-color:#ffffff;border-radius:8px;overflow:hidden;border:1px solid #B8D8F0;">

          <!-- Header -->
          <tr>
            <td style="background-color:#1565C0;padding:24px 32px;text-align:center;">
              <p style="margin:0;font-size:13px;color:#90CAF9;letter-spacing:1px;">มหาวิทยาลัยราชภัฏมหาสารคาม</p>
              <h1 style="margin:8px 0 0;font-size:20px;font-weight:bold;color:#ffffff;">ระบบสารสนเทศเครือข่ายศิษย์เก่า</h1>
            </td>
          </tr>

          <!-- Alert Banner -->
          <tr>
            <td style="background-color:#C62828;padding:12px 32px;text-align:center;">
              <p style="margin:0;font-size:15px;font-weight:bold;color:#ffffff;">
                ${isDeleteAll ? "⚠ แจ้งการลบบัญชีและข้อมูลทั้งหมด" : "⚠ แจ้งการลบบัญชีศิษย์เก่า"}
              </p>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="padding:32px;">

              <p style="margin:0 0 16px;font-size:15px;color:#1A237E;">
                สวัสดี <strong>${alumniEmails?.fname || ""}</strong>
              </p>

              ${
                isDeleteAll
                  ? `
                <p style="margin:0 0 16px;font-size:14px;color:#333333;line-height:1.7;">
                  ผู้ดูแลระบบได้ดำเนินการ
                  <span style="color:#C62828;font-weight:bold;">ลบบัญชีและข้อมูลทั้งหมดที่เกี่ยวข้อง</span>
                  เรียบร้อยแล้ว
                </p>

                <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#EBF4FB;border-left:4px solid #1565C0;border-radius:4px;margin:16px 0;">
                  <tr>
                    <td style="padding:16px 20px;">
                      <p style="margin:0 0 8px;font-size:13px;font-weight:bold;color:#1565C0;">ข้อมูลที่ถูกลบออกจากระบบ</p>
                      <ul style="margin:0;padding-left:20px;font-size:13px;color:#333333;line-height:2;">
                        <li>ข้อมูลการติดต่อ</li>
                        <li>ประวัติการศึกษา</li>
                        <li>ประวัติการทำงาน</li>
                        <li>การตั้งค่าความเป็นส่วนตัว</li>
                        <li>ข้อมูลอื่น ๆ ที่เชื่อมโยงกับบัญชี</li>
                      </ul>
                    </td>
                  </tr>
                </table>
                  `
                  : `
                <p style="margin:0 0 16px;font-size:14px;color:#333333;line-height:1.7;">
                  ผู้ดูแลระบบได้ดำเนินการ
                  <span style="color:#C62828;font-weight:bold;">ลบเฉพาะบัญชีศิษย์เก่า</span>
                  เรียบร้อยแล้ว
                </p>

                <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#EBF4FB;border-left:4px solid #1565C0;border-radius:4px;margin:16px 0;">
                  <tr>
                    <td style="padding:16px 20px;">
                      <p style="margin:0;font-size:13px;color:#1565C0;line-height:1.7;">
                        ข้อมูลอื่น ๆ ที่เกี่ยวข้องกับบัญชีดังกล่าว <strong>ยังคงอยู่ในระบบ</strong>
                      </p>
                    </td>
                  </tr>
                </table>
                  `
              }

              <!-- Reason Box -->
              <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#FFF8F8;border:1px solid #FFCDD2;border-radius:4px;margin:20px 0;">
                <tr>
                  <td style="padding:14px 18px;">
                    <p style="margin:0 0 4px;font-size:12px;font-weight:bold;color:#C62828;text-transform:uppercase;letter-spacing:0.5px;">เหตุผลในการดำเนินการ</p>
                    <p style="margin:0;font-size:14px;color:#333333;">${reason || "-"}</p>
                  </td>
                </tr>
              </table>

              <p style="margin:24px 0 0;font-size:13px;color:#666666;line-height:1.7;">
                หากท่านมีข้อสงสัยหรือต้องการสอบถามข้อมูลเพิ่มเติม กรุณาติดต่อผู้ดูแลระบบ
              </p>

            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background-color:#1565C0;padding:20px 32px;text-align:center;">
              <p style="margin:0;font-size:13px;color:#90CAF9;">ระบบสารสนเทศเครือข่ายศิษย์เก่า</p>
              <p style="margin:4px 0 0;font-size:13px;font-weight:bold;color:#ffffff;">มหาวิทยาลัยราชภัฏมหาสารคาม</p>
              <p style="margin:8px 0 0;font-size:11px;color:#64B5F6;">อีเมลนี้ถูกส่งโดยระบบอัตโนมัติ กรุณาอย่าตอบกลับ</p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>

</body>
</html>
    `,
        };

        await transporter.sendMail(mailOptions);
      }

      set.status = 200;
      return { ok: true };
    } catch (error) {
      console.error(error);
      set.status = 500;
      return { error };
    }
  },
  export_alumni_data: async ({ set, body }) => {
    try {
      const {
        selecetFacultyId,
        selectDepartmentId,
        selectFileType,
        fileName,
        selectYearStart,
        selectAlumniField,
      } = body;
      let filter = {};
      const normallizedData = (data) => {
        return data
          .filter((s) => s || s !== null || s !== undefined)
          .map((s) => String(s));
      };

      if (selecetFacultyId.length > 0) {
        filter = {
          facultyId: {
            in: normallizedData(selecetFacultyId),
          },
        };
      }
      if (selectDepartmentId.length > 0) {
        filter = {
          ...filter,
          departmentId: {
            in: normallizedData(selectDepartmentId),
          },
        };
      }

      if (selectYearStart.length > 0) {
        filter = {
          ...filter,
          year_start: { in: selectYearStart },
        };
      }

      if (selectFileType == 1) {
        const selectFiled = selectAlumniField.filter((f) => Boolean(f));
        // console.log("🚀 ~ selectFiled:", selectFiled);
        const select = {
          prefix: selectFiled.includes("prefix"),
          alumni_id: selectFiled.includes("alumni_id"),
          fname: selectFiled.includes("fname"),
          lname: selectFiled.includes("lname"),
          year_start: selectFiled.includes("year_start"),
          year_end: selectFiled.includes("year_end"),
          facultyId: true,
          departmentId: true,
        };
        const selectContract = {
          ...(selectFiled.includes("address") && {
            address: true,
            tambon: true,
            amphure: true,
            province: true,
            zipcode: true,
          }),

          ...(selectFiled.includes("phone") && {
            phone1: true,
            phone2: true,
          }),

          ...(selectFiled.includes("email") && {
            email1: true,
            email2: true,
          }),

          ...(selectFiled.includes("facebook") && {
            facebook: true,
          }),
        };
        const data = await prisma.alumni.findMany({
          where: filter,
          select: {
            ...select,
            ...(!Object.values(selectContract).every(
              (value) => value === null || value === undefined || value === "",
            ) && {
              alumni_contract: {
                select: { ...selectContract },
              },
            }),
          },
        });
        // console.log("🚀 ~ data:", data);

        if (data.length < 1) return { err: "ไม่พบข้อมูลที่ต้องการส่งออก" };
        set.status = 200;
        return data;
      } else {
        const [
          allAlumni,
          alumniMan,
          alumniGirl,
          allYears,
          groupbyFac,
          groupByFacMan,
          groupByNang,
          groupByYear,
          groupByYearMan,
          groupByYearNang,
          groupByDep,
          groupByDepMan,
          groupByDepNang,
        ] = await Promise.all([
          prisma.alumni.count(),
          prisma.alumni.count({
            where: {
              prefix: "นาย",
            },
          }),
          prisma.alumni.count({
            where: {
              prefix: {
                contains: "นาง",
              },
            },
          }),
          prisma.alumni.groupBy({
            by: ["year_start"],
            _count: {
              alumni_id: true,
            },
          }),
          prisma.alumni.groupBy({
            by: ["facultyId"],
            where: {
              ...(normallizedData(selecetFacultyId).length > 0 && {
                facultyId: { in: normallizedData(selecetFacultyId) },
              }),
            },
            _count: { alumni_id: true },
          }),
          prisma.alumni.groupBy({
            by: ["facultyId"],
            where: {
              prefix: "นาย",
              ...(normallizedData(selecetFacultyId).length > 0 && {
                facultyId: { in: normallizedData(selecetFacultyId) },
              }),
            },
            _count: { alumni_id: true },
          }),
          prisma.alumni.groupBy({
            by: ["facultyId"],
            where: {
              prefix: {
                contains: "นาง",
              },
              ...(normallizedData(selecetFacultyId).length > 0 && {
                facultyId: { in: normallizedData(selecetFacultyId) },
              }),
            },
            _count: { alumni_id: true },
          }),
          prisma.alumni.groupBy({
            by: ["year_start"],
            where: {
              ...(normallizedData(selectYearStart).length > 0 && {
                year_start: { in: normallizedData(selectYearStart) },
              }),
            },
            _count: {
              alumni_id: true,
            },
          }),
          prisma.alumni.groupBy({
            by: ["year_start"],
            where: {
              prefix: "นาย",
              ...(normallizedData(selectYearStart).length > 0 && {
                year_start: { in: normallizedData(selectYearStart) },
              }),
            },
            _count: {
              alumni_id: true,
            },
          }),
          prisma.alumni.groupBy({
            by: ["year_start"],
            where: {
              prefix: {
                contains: "นาง",
              },
              ...(normallizedData(selectYearStart).length > 0 && {
                year_start: { in: normallizedData(selectYearStart) },
              }),
            },
            _count: {
              alumni_id: true,
            },
          }),
          prisma.alumni.groupBy({
            by: ["departmentId"],
            where: {
              ...(normallizedData(selectDepartmentId).length > 0 && {
                departmentId: { in: normallizedData(selectDepartmentId) },
              }),
            },
            _count: {
              alumni_id: true,
            },
          }),
          prisma.alumni.groupBy({
            by: ["departmentId"],
            where: {
              prefix: "นาย",
              ...(normallizedData(selectDepartmentId).length > 0 && {
                departmentId: { in: normallizedData(selectDepartmentId) },
              }),
            },
            _count: {
              alumni_id: true,
            },
          }),
          prisma.alumni.groupBy({
            by: ["departmentId"],
            where: {
              prefix: {
                contains: "นาง",
              },
              ...(normallizedData(selectDepartmentId).length > 0 && {
                departmentId: { in: normallizedData(selectDepartmentId) },
              }),
            },
            _count: {
              alumni_id: true,
            },
          }),
        ]);

        const browser = await puppeteer.launch({
          executablePath: process.env.PUPPETEER_EXECUTABLE_PATH || undefined,
          headless: true,
          args: [
            "--no-sandbox",
            "--disable-setuid-sandbox",
            "--disable-dev-shm-usage",
          ],
        });

        const page = await browser.newPage();

        await page.setContent(
          await ExportPdfHTML.exportAlumniData({
            maxStdValue: Math.max(
              ...groupbyFac.map((item) => item._count.alumni_id),
            ),
            allAlumni,
            alumniMan,
            alumniGirl,
            allYears: allYears.length,
            groupByFac: groupbyFac.map((f) => {
              const mathcMan = groupByFacMan.find(
                (m) => m.facultyId === f.facultyId,
              );
              const matchNang = groupByNang.find(
                (n) => n.facultyId === f.facultyId,
              );

              return {
                facId: f.facultyId,
                total: f._count.alumni_id,
                mans: mathcMan ? mathcMan._count.alumni_id : 0,
                girls: matchNang ? matchNang._count.alumni_id : 0,
              };
            }),
            groupByYear: groupByYear.map((f) => {
              const mathcMan = groupByYearMan.find(
                (m) => m.year_start === f.year_start,
              );
              const matchNang = groupByYearNang.find(
                (n) => n.year_start === f.year_start,
              );

              return {
                year: f.year_start,
                total: f._count.alumni_id,
                mans: mathcMan ? mathcMan._count.alumni_id : 0,
                girls: matchNang ? matchNang._count.alumni_id : 0,
              };
            }),
            groupByDep: groupByDep.map((f) => {
              const mathcMan = groupByDepMan.find(
                (m) => m.departmentId === f.departmentId,
              );
              const matchNang = groupByDepNang.find(
                (n) => n.departmentId === f.departmentId,
              );

              return {
                depId: f.departmentId,
                total: f._count.alumni_id,
                mans: mathcMan ? mathcMan._count.alumni_id : 0,
                girls: matchNang ? matchNang._count.alumni_id : 0,
              };
            }),
          }),
          {
            waitUntil: "networkidle0",
          },
        );
        const pdfBuffer = await page.pdf({
          format: "A4",
          printBackground: true,
          preferCSSPageSize: true,
          displayHeaderFooter: true,
          headerTemplate: `
    <div style="
      width: 100%;
      display: flex;
      align-items: flex-start;
      padding: 8px 20px;
      justify-content: space-between;
      border-bottom: 3px solid #2563eb;
      box-sizing: border-box;
      font-family: 'Sarabun', sans-serif;
    ">
      <div style="display: flex; align-items: center; gap: 8px;">
        <div style="width: 60px; height: 60px; border-radius: 50%; overflow: hidden;">
          <img
              src="data:image/png;base64,${logoBase64}"
            style="width: 100%; height: 100%; object-fit: cover;"
          />
        </div>
        <div style="display: flex; flex-direction: column; gap: 4px;">
          <p style="margin: 0; font-size: 11px; color: #1f2937;">มหาวิทยาลัยราชภัฏมหาสารคาม</p>
          <p style="margin: 0; font-size: 14px; font-weight: bold; color: #2563eb; line-height: 1;">
            รายงานข้อมูลศิษย์เก่า
          </p>
          <p style="margin: 0; font-size: 11px; color: #3b82f6;">
            ระบบสารสนเทศเครือข่ายศิษย์เก่า มหาวิทยาลัยราชภัฏมหาสารคาม
          </p>
        </div>
      </div>
      <div style="display: flex; flex-direction: column; align-items: flex-end;">
        <p style="margin: 0; font-size: 10px; color: #6b7280;">วันที่ออกรายงาน</p>
        <p style="margin: 0; font-size: 10px; color: #6b7280;">
          ${new Date().toLocaleTimeString("th-TH", { day: "numeric", year: "numeric", month: "long" })}
        </p>
      </div>
    </div>`,
          footerTemplate: `
    <div style="
      width: 100%;
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 10px 40px;
      background-color: #eff6ff;
      box-sizing: border-box;
      font-family: 'Sarabun', sans-serif;
    ">
      <div style="display: flex; flex-direction: column; gap: 2px;">
        <p style="margin: 0; font-size: 10px; color: #1f2937;">
          ระบบสารสนเทศเครือข่ายศิษย์เก่า มหาวิทยาลัยราชภัฏมหาสารคาม
        </p>
        <p style="margin: 0; font-size: 10px; color: #1f2937;">
          ข้อมูล ณ ${new Date().toLocaleDateString("th-TH", { day: "numeric", month: "long", year: "numeric" })}
        </p>
      </div>
      <div style="display: flex; align-items: center; gap: 4px; font-size: 12px; color: #2563eb;">
        <span>หน้า</span>
        <span class="pageNumber"></span>
        <span>/</span>
        <span class="totalPages"></span>
      </div>
    </div>`,
        });

        await browser.close();

        return new Response(pdfBuffer, {
          headers: {
            "Content-Type": "application/pdf",
            "Content-Disposition": `attachment; filename="report.pdf"; filename*=UTF-8''${encodeURIComponent(fileName)}`,
          },
        });
      }
    } catch (error) {
      console.error(error);
    }
  },
  import_personel_data: async ({ set, body, store }) => {
    try {
      const { data, file, fileSize } = body;
      const dataParse = JSON.parse(data);
      if (!data || !file) return (set.status = 400);
      const addHistory = await prisma.import_history.create({
        data: {
          file_name: file?.name,
          import_type: "personel",
          file_size: Number(fileSize),
          total_rows: dataParse?.length || 0,
          admin: {
            connect: {
              admin_id: store?.user?.id,
            },
          },
          started_at: new Date(),
        },
        select: {
          id: true,
        },
      });
      if (!addHistory) return (set.status = 400);

      const setting = await prisma.setting.findMany({
        select: {
          skipPersonelDuplicate: true,
          allowedPersonelAccount: true,
        },
      });

      await prisma.professor.createMany({
        data: dataParse.map((row) => ({
          ...row,
          ...(!setting[0].allowedPersonelAccount && { canUse: false }),
          import_historyId: addHistory.id,
        })),
        ...(setting[0].skipPersonelDuplicate && { skipDuplicates: true }),
      });

      set.status = 200;
      return { ok: true };
    } catch (error) {
      console.error(error);
      set.status = 500;
      return { error };
    }
  },
  delete_import_history: async ({ set, params }) => {
    try {
      const { importId } = params;
      if (!importId) return (set.status = 400);

      const del = await prisma.import_history.delete({
        where: {
          id: importId,
        },
      });
      if (!del) return (set.status = 400);

      set.status = 200;
      return { ok: true };
    } catch (error) {
      console.error(error);
      set.status = 500;
      return { error };
    }
  },
  delete_import_personel: async ({ set, params, query, store }) => {
    try {
      const { importDataId } = params;
      if (!importDataId) return (set.status = 400);

      const { deleteThisHistory, password } = query;
      const findAdmin = await prisma.admin.findFirst({
        where: {
          admin_id: store?.user?.id,
        },
        select: {
          passwordHash: true,
        },
      });
      if (!findAdmin) return (set.status = 400);

      const passwordMatch = await bcrypt.compare(
        password,
        findAdmin.passwordHash,
      );
      if (!passwordMatch)
        return { err: "รหัสผ่านไม่ถูกต้องไม่สามารถลบข้อมูลได้" };

      await prisma.professor.deleteMany({
        where: {
          import_historyId: importDataId,
        },
      });
      if (Boolean(deleteThisHistory) === true) {
        await prisma.import_history.delete({
          where: {
            id: importDataId,
          },
        });
      }

      set.status = 200;
      return { ok: true };
    } catch (error) {
      console.error(error);
      set.status = 500;
      return { error };
    }
  },
  export_personel_data: async ({ set, body }) => {
    try {
      const {
        selecetFacultyId,
        selectDepartmentId,
        selectFileType,
        fileName,
        selectYearStart,
        selectPersonelField,
        selectPosition,
      } = body;
      let filter = {};
      const normallizedData = (data) => {
        return data
          .filter(
            (s) => s || s !== null || s !== undefined || s !== "ทุกตำแหน่ง",
          )
          .map((s) => String(s));
      };
      if (selecetFacultyId.length > 0) {
        filter = {
          facultyId: {
            in: normallizedData(selecetFacultyId),
          },
        };
      }
      if (selectDepartmentId.length > 0) {
        filter = {
          ...filter,
          departmentId: {
            in: normallizedData(selectDepartmentId),
          },
        };
      }
      // if (selectPosition) {
      //   filter = {
      //     ...filter,
      //     univercity_position: {
      //       in: ["อธิการบดี"],
      //     },
      //   };
      // }

      if (selectFileType == 1) {
        const selectFiled = selectPersonelField.filter((f) => Boolean(f));
        // console.log("🚀 ~ selectFiled:", selectFiled);
        const select = {
          prefix: selectFiled.includes("prefix"),
          academic_rank: selectFiled.includes("academic_rank"),
          univercity_position: selectFiled.includes("univercity_position"),
          professor_id: selectFiled.includes("professor_id"),
          fname: selectFiled.includes("fname"),
          lname: selectFiled.includes("lname"),
          facultyId: true,
          departmentId: true,
        };
        const selectContract = {
          ...(selectFiled.includes("address") && {
            address: true,
            tambon: true,
            amphure: true,
            province: true,
            zipcode: true,
          }),

          ...(selectFiled.includes("phone") && {
            phone1: true,
            phone2: true,
          }),

          ...(selectFiled.includes("email") && {
            email1: true,
            email2: true,
          }),

          ...(selectFiled.includes("facebook") && {
            facebook: true,
          }),
        };
        const data = await prisma.professor.findMany({
          where: filter,
          select: {
            ...select,
            ...(!Object.values(selectContract).every(
              (value) => value === null || value === undefined || value === "",
            ) && {
              alumni_contract: {
                select: { ...selectContract },
              },
            }),
          },
        });
        // console.log("🚀 ~ data:", data);

        if (data.length < 1) return { err: "ไม่พบข้อมูลที่ต้องการส่งออก" };
        set.status = 200;
        return data;
      } else {
        const [
          allProfessor,
          allCanuse,
          allCannoUse,
          allPosition,
          groupbyFac,
          groupByFacCanUse,
          groupByFacCannotUse,
          groupByPosition,
          groupByPositionCanUse,
          groupByPositionCannotUse,
          groupByDep,
          groupByDepCanUse,
          groupByDepCanNotUse,
        ] = await Promise.all([
          prisma.professor.count(),
          prisma.professor.count({
            where: {
              canUse: true,
            },
          }),
          prisma.professor.count({
            where: {
              canUse: false,
            },
          }),
          prisma.professor.groupBy({
            by: ["univercity_position"],
            _count: {
              professor_id: true,
            },
          }),
          prisma.professor.groupBy({
            by: ["facultyId"],
            where: {
              ...(normallizedData(selecetFacultyId).length > 0 && {
                facultyId: { in: normallizedData(selecetFacultyId) },
              }),
            },
            _count: { professor_id: true },
          }),
          prisma.professor.groupBy({
            by: ["facultyId"],
            where: {
              canUse: true,
              ...(normallizedData(selecetFacultyId).length > 0 && {
                facultyId: { in: normallizedData(selecetFacultyId) },
              }),
            },
            _count: { professor_id: true },
          }),
          prisma.professor.groupBy({
            by: ["facultyId"],
            where: {
              canUse: false,
              ...(normallizedData(selecetFacultyId).length > 0 && {
                facultyId: { in: normallizedData(selecetFacultyId) },
              }),
            },
            _count: { professor_id: true },
          }),
          prisma.professor.groupBy({
            by: ["univercity_position"],
            where: {
              ...(normallizedData(selectPosition).length > 0 && {
                univercity_position: { in: normallizedData(selectPosition) },
              }),
            },
            _count: {
              professor_id: true,
            },
          }),
          prisma.professor.groupBy({
            by: ["univercity_position"],
            where: {
              canUse: true,
              ...(normallizedData(selectPosition).length > 0 && {
                univercity_position: { in: normallizedData(selectPosition) },
              }),
            },
            _count: {
              professor_id: true,
            },
          }),
          prisma.professor.groupBy({
            by: ["univercity_position"],
            where: {
              canUse: false,
              ...(normallizedData(selectPosition).length > 0 && {
                univercity_position: { in: normallizedData(selectPosition) },
              }),
            },
            _count: {
              professor_id: true,
            },
          }),
          prisma.professor.groupBy({
            by: ["departmentId"],
            where: {
              ...(normallizedData(selectDepartmentId).length > 0 && {
                departmentId: { in: normallizedData(selectDepartmentId) },
              }),
            },
            _count: {
              professor_id: true,
            },
          }),
          prisma.professor.groupBy({
            by: ["departmentId"],
            where: {
              canUse: true,
              ...(normallizedData(selectDepartmentId).length > 0 && {
                departmentId: { in: normallizedData(selectDepartmentId) },
              }),
            },
            _count: {
              professor_id: true,
            },
          }),
          prisma.professor.groupBy({
            by: ["departmentId"],
            where: {
              canUse: false,
              ...(normallizedData(selectDepartmentId).length > 0 && {
                departmentId: { in: normallizedData(selectDepartmentId) },
              }),
            },
            _count: {
              professor_id: true,
            },
          }),
        ]);

        const browser = await puppeteer.launch({
          executablePath: process.env.PUPPETEER_EXECUTABLE_PATH || undefined,
          headless: true,
          args: [
            "--no-sandbox",
            "--disable-setuid-sandbox",
            "--disable-dev-shm-usage",
          ],
        });

        const page = await browser.newPage();

        await page.setContent(
          await ExportPdfHTML.exportPersonelData({
            maxStdValue: Math.max(
              ...groupbyFac.map((item) => item._count.professor_id),
            ),
            allProfessor,
            allCanuse,
            allCannoUse,
            allPosition: allPosition.length,
            groupByFac: groupbyFac.map((f) => {
              const mathcCanuse = groupByFacCanUse.find(
                (m) => m.facultyId === f.facultyId,
              );
              const matchCannotUse = groupByFacCannotUse.find(
                (n) => n.facultyId === f.facultyId,
              );

              return {
                facId: f.facultyId,
                total: f._count.professor_id,
                canuse: mathcCanuse ? mathcCanuse._count.professor_id : 0,
                cannotuse: matchCannotUse
                  ? matchCannotUse._count.professor_id
                  : 0,
              };
            }),
            groupByPosition: groupByPosition.map((f) => {
              const matchCanUse = groupByPositionCanUse.find(
                (m) => m.univercity_position === f.univercity_position,
              );
              const matchNang = groupByPositionCannotUse.find(
                (n) => n.univercity_position === f.univercity_position,
              );

              return {
                univercity_position: f.univercity_position,
                total: f._count.professor_id,
                canuse: matchCanUse ? matchCanUse._count.professor_id : 0,
                cannotuse: matchNang ? matchNang._count.professor_id : 0,
              };
            }),
            groupByDep: groupByDep.map((f) => {
              const matchCanUse = groupByDepCanUse.find(
                (m) => m.departmentId === f.departmentId,
              );
              const matchNang = groupByDepCanNotUse.find(
                (n) => n.departmentId === f.departmentId,
              );

              return {
                depId: f.departmentId,
                total: f._count.professor_id,
                canuse: matchCanUse ? matchCanUse._count.professor_id : 0,
                cannotuse: matchNang ? matchNang._count.professor_id : 0,
              };
            }),
          }),
          {
            waitUntil: "networkidle0",
          },
        );
        const pdfBuffer = await page.pdf({
          format: "A4",
          printBackground: true,
          preferCSSPageSize: true,
          displayHeaderFooter: true,
          headerTemplate: `
    <div style="
      width: 100%;
      display: flex;
      align-items: flex-start;
      padding: 8px 20px;
      justify-content: space-between;
      border-bottom: 3px solid #2563eb;
      box-sizing: border-box;
      font-family: 'Sarabun', sans-serif;
    ">
      <div style="display: flex; align-items: center; gap: 8px;">
        <div style="width: 60px; height: 60px; border-radius: 50%; overflow: hidden;">
          <img
              src="data:image/png;base64,${logoBase64}"
            style="width: 100%; height: 100%; object-fit: cover;"
          />
        </div>
        <div style="display: flex; flex-direction: column; gap: 4px;">
          <p style="margin: 0; font-size: 11px; color: #1f2937;">มหาวิทยาลัยราชภัฏมหาสารคาม</p>
          <p style="margin: 0; font-size: 14px; font-weight: bold; color: #2563eb; line-height: 1;">
            รายงานข้อมูลบุคลากร
          </p>
          <p style="margin: 0; font-size: 11px; color: #3b82f6;">
            ระบบสารสนเทศเครือข่ายศิษย์เก่า มหาวิทยาลัยราชภัฏมหาสารคาม
          </p>
        </div>
      </div>
      <div style="display: flex; flex-direction: column; align-items: flex-end;">
        <p style="margin: 0; font-size: 10px; color: #6b7280;">วันที่ออกรายงาน</p>
        <p style="margin: 0; font-size: 10px; color: #6b7280;">
          ${new Date().toLocaleTimeString("th-TH", { day: "numeric", year: "numeric", month: "long" })}
        </p>
      </div>
    </div>`,
          footerTemplate: `
    <div style="
      width: 100%;
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 10px 40px;
      background-color: #eff6ff;
      box-sizing: border-box;
      font-family: 'Sarabun', sans-serif;
    ">
      <div style="display: flex; flex-direction: column; gap: 2px;">
        <p style="margin: 0; font-size: 10px; color: #1f2937;">
          ระบบสารสนเทศเครือข่ายศิษย์เก่า มหาวิทยาลัยราชภัฏมหาสารคาม
        </p>
        <p style="margin: 0; font-size: 10px; color: #1f2937;">
          ข้อมูล ณ ${new Date().toLocaleDateString("th-TH", { day: "numeric", month: "long", year: "numeric" })}
        </p>
      </div>
      <div style="display: flex; align-items: center; gap: 4px; font-size: 12px; color: #2563eb;">
        <span>หน้า</span>
        <span class="pageNumber"></span>
        <span>/</span>
        <span class="totalPages"></span>
      </div>
    </div>`,
        });

        await browser.close();

        return new Response(pdfBuffer, {
          headers: {
            "Content-Type": "application/pdf",
            "Content-Disposition": `attachment; filename="report.pdf"; filename*=UTF-8''${encodeURIComponent(fileName)}`,
          },
        });
      }
    } catch (error) {
      console.error(error);
      set.status = 500;
      return { error };
    }
  },
  delete_personel_data: async ({ set, params, query, store }) => {
    try {
      const { professorId } = params;
      if (!professorId) return (set.status = 400);

      const { toggleDeleteType, reason, password } = query;
      if (!reason || !password) return (set.status = 400);

      const admin = await prisma.admin.findFirst({
        where: {
          admin_id: store?.user?.id,
        },
        select: {
          passwordHash: true,
        },
      });
      if (!admin) return (set.status = 400);

      const matchPassword = await bcrypt.compare(password, admin.passwordHash);
      if (!matchPassword) return { err: "ยืนยันตัวตนไม่ถูกต้อง" };

      const professorEmails = await prisma.professor.findFirst({
        where: {
          professor_id: professorId,
        },
        select: {
          alumni_contract: {
            select: {
              email1: true,
              email2: true,
            },
          },
          fname: true,
          academic_rank: true,
        },
      });
      if (!professorEmails) return (set.status = 400);

      // delete
      await prisma.professor.delete({
        where: {
          professor_id: professorId,
        },
      });
      if (Number(toggleDeleteType) == 2) {
        await Promise.all([
          prisma.alumni_contract.deleteMany({
            where: {
              professorProfessor_id: professorId,
            },
          }),
          prisma.user_privacy.deleteMany({
            where: {
              professorId,
            },
          }),
        ]);
      }

      // sendEmail
      const toEmail =
        professorEmails?.alumni_contract?.email1 ||
        professorEmails?.alumni_contract?.email2;
      if (toEmail) {
        const isDeleteAll = Number(toggleDeleteType) === 2;
        const subject = isDeleteAll
          ? "แจ้งการลบข้อมูลบุคลากร"
          : "แจ้งการลบบัญชีบุคลากร";
        const mailOptions = {
          from: envConfig.mail_user,
          to: toEmail,
          subject,
          html: `
<!DOCTYPE html>
<html lang="th">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
</head>
<body style="margin:0;padding:0;background-color:#EBF4FB;font-family:Tahoma,sans-serif;">

  <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#EBF4FB;padding:32px 0;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background-color:#ffffff;border-radius:8px;overflow:hidden;border:1px solid #B8D8F0;">

          <!-- Header -->
          <tr>
            <td style="background-color:#1565C0;padding:24px 32px;text-align:center;">
              <p style="margin:0;font-size:13px;color:#90CAF9;letter-spacing:1px;">มหาวิทยาลัยราชภัฏมหาสารคาม</p>
              <h1 style="margin:8px 0 0;font-size:20px;font-weight:bold;color:#ffffff;">ระบบสารสนเทศเครือข่ายศิษย์เก่า</h1>
            </td>
          </tr>

          <!-- Alert Banner -->
          <tr>
            <td style="background-color:#C62828;padding:12px 32px;text-align:center;">
              <p style="margin:0;font-size:15px;font-weight:bold;color:#ffffff;">
                ${isDeleteAll ? "⚠ แจ้งการลบบัญชีและข้อมูลทั้งหมด" : "⚠ แจ้งการลบบัญชีศิษย์เก่า"}
              </p>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="padding:32px;">

              <p style="margin:0 0 16px;font-size:15px;color:#1A237E;">
                เรียน <strong>${professorEmails?.academic_rank || "อาจารย์"}${professorEmails?.fname || ""}</strong>
              </p>

              ${
                isDeleteAll
                  ? `
                <p style="margin:0 0 16px;font-size:14px;color:#333333;line-height:1.7;">
                  ผู้ดูแลระบบได้ดำเนินการ
                  <span style="color:#C62828;font-weight:bold;">ลบบัญชีและข้อมูลทั้งหมดที่เกี่ยวข้อง</span>
                  เรียบร้อยแล้ว
                </p>

                <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#EBF4FB;border-left:4px solid #1565C0;border-radius:4px;margin:16px 0;">
                  <tr>
                    <td style="padding:16px 20px;">
                      <p style="margin:0 0 8px;font-size:13px;font-weight:bold;color:#1565C0;">ข้อมูลที่ถูกลบออกจากระบบ</p>
                      <ul style="margin:0;padding-left:20px;font-size:13px;color:#333333;line-height:2;">
                        <li>ข้อมูลการติดต่อ</li>
                        <li>การตั้งค่าความเป็นส่วนตัว</li>
                        <li>ข้อมูลอื่น ๆ ที่เชื่อมโยงกับบัญชี</li>
                      </ul>
                    </td>
                  </tr>
                </table>
                  `
                  : `
                <p style="margin:0 0 16px;font-size:14px;color:#333333;line-height:1.7;">
                  ผู้ดูแลระบบได้ดำเนินการ
                  <span style="color:#C62828;font-weight:bold;">ลบเฉพาะบัญชีศิษย์เก่า</span>
                  เรียบร้อยแล้ว
                </p>

                <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#EBF4FB;border-left:4px solid #1565C0;border-radius:4px;margin:16px 0;">
                  <tr>
                    <td style="padding:16px 20px;">
                      <p style="margin:0;font-size:13px;color:#1565C0;line-height:1.7;">
                        ข้อมูลอื่น ๆ ที่เกี่ยวข้องกับบัญชีดังกล่าว <strong>ยังคงอยู่ในระบบ</strong>
                      </p>
                    </td>
                  </tr>
                </table>
                  `
              }

              <!-- Reason Box -->
              <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#FFF8F8;border:1px solid #FFCDD2;border-radius:4px;margin:20px 0;">
                <tr>
                  <td style="padding:14px 18px;">
                    <p style="margin:0 0 4px;font-size:12px;font-weight:bold;color:#C62828;text-transform:uppercase;letter-spacing:0.5px;">เหตุผลในการดำเนินการ</p>
                    <p style="margin:0;font-size:14px;color:#333333;">${reason || "-"}</p>
                  </td>
                </tr>
              </table>

              <p style="margin:24px 0 0;font-size:13px;color:#666666;line-height:1.7;">
                หากท่านมีข้อสงสัยหรือต้องการสอบถามข้อมูลเพิ่มเติม กรุณาติดต่อผู้ดูแลระบบ
              </p>

            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background-color:#1565C0;padding:20px 32px;text-align:center;">
              <p style="margin:0;font-size:13px;color:#90CAF9;">ระบบสารสนเทศเครือข่ายศิษย์เก่า</p>
              <p style="margin:4px 0 0;font-size:13px;font-weight:bold;color:#ffffff;">มหาวิทยาลัยราชภัฏมหาสารคาม</p>
              <p style="margin:8px 0 0;font-size:11px;color:#64B5F6;">อีเมลนี้ถูกส่งโดยระบบอัตโนมัติ กรุณาอย่าตอบกลับ</p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>

</body>
</html>
    `,
        };

        await transporter.sendMail(mailOptions);
      }

      set.status = 200;
      return { ok: true };
    } catch (error) {
      console.error(error);
      set.status = 500;
      return { error };
    }
  },
  add_new_admin: async ({ set, body }) => {
    try {
      const { prefix, fname, lname, email, tel, profile } = body;
      if (!prefix || !fname || !lname || !email || !tel)
        return (set.status = 400);

      let imgName = "";
      if (profile) {
        const sanitizedName =
          profile?.name?.replace(/[^a-zA-Z0-9.-]/g, "_") || "image.jpg";
        imgName = `${Date.now()}_${sanitizedName}`;

        // Local path (Windows)
        const localPath = `./public/upload/${imgName}`;
        const remotePath = process.env.SFTP_PATH + imgName;

        // บันทึกไฟล์ใน local
        await Bun.write(localPath, profile);
        const sfpt = await sftpConfig();

        // ตรวจสอบว่าโฟลเดอร์บนเซิร์ฟเวอร์มีอยู่ไหม
        const remoteDir = remotePath.substring(0, remotePath.lastIndexOf("/"));
        const sftp = await sftpConfig();
        try {
          await sftp.mkdir(remoteDir, true);
        } catch (mkdirerr) {
          // โฟลเดอร์อาจมีอยู่แล้ว
          if (mkdirerr.code !== 4) {
            throw mkdirerr;
          }
        }

        // อัปโหลดไปยังเซิร์ฟเวอร์ผ่าน SFTP
        await sftp.put(localPath, remotePath, {
          writeStreamOptions: {
            flags: "w",
            mode: 0o666,
          },
        });

        // ตรวจสอบว่าอัปโหลดสำเร็จ
        const uploaded = await sftp.exists(remotePath);
        if (!uploaded) {
          throw new err("File upload verification failed");
        }
      }

      const username = generateSecureUsername();
      const password = generateSecurePassword();
      const salt = await bcrypt.genSalt(12);
      const hash = await bcrypt.hash(password, salt);

      const setting = await prisma.setting.findMany({
        select: {
          allowedAdminAccount: true,
        },
      });
      // new admin
      const newAdmin = await prisma.admin.create({
        data: {
          fname,
          lname,
          email,
          prefix,
          tel,
          profile: imgName,
          username,
          passwordHash: hash,
          ...(!setting[0].allowedAdminAccount && { canUse: false }),
        },
      });
      if (!newAdmin) return (set.status = 400);
      // send Email
      if (email) {
        const mailOptions = {
          from: envConfig.mail_user,
          to: email,
          subject:
            "ข้อมูลเข้าสู่ระบบสารสนเทศเครือข่ายศิษย์เก่า มหาวิทยาลัยราชภัฏมหาสารคาม",
          html: `

<!DOCTYPE html>
<html lang="th">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
</head>
<body style="margin:0;padding:0;background-color:#EBF4FB;font-family:Tahoma,sans-serif;">

  <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#EBF4FB;padding:32px 0;">
    <tr>
      <td align="center">

        <table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background:#ffffff;border:1px solid #D6EAF8;border-radius:8px;overflow:hidden;">

          <!-- Header -->
          <tr>
            <td style="background:#1565C0;padding:28px;text-align:center;">
              <p style="margin:0;color:#BBDEFB;font-size:13px;">
                มหาวิทยาลัยราชภัฏมหาสารคาม
              </p>
              <h1 style="margin:8px 0 0;color:#ffffff;font-size:22px;">
                ระบบสารสนเทศเครือข่ายศิษย์เก่า
              </h1>
            </td>
          </tr>

          <!-- Title -->
          <tr>
            <td style="background:#E3F2FD;padding:14px 24px;text-align:center;">
              <p style="margin:0;font-size:16px;font-weight:bold;color:#0D47A1;">
                แจ้งข้อมูลสำหรับเข้าสู่ระบบ
              </p>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="padding:32px;">

              <p style="margin:0 0 16px;font-size:15px;color:#333;">
                สวัสดี คุณ
                <strong>
                ${fname || ""} ${lname || ""}
                </strong>
              </p>

              <p style="margin:0 0 18px;font-size:14px;color:#333;line-height:1.8;">
                บัญชีผู้ดูแลของท่านได้รับการสร้างเรียบร้อยแล้ว
                กรุณาใช้ข้อมูลด้านล่างสำหรับเข้าสู่ระบบสารสนเทศเครือข่ายศิษย์เก่า
              </p>

              <!-- Login Box -->
              <table width="100%" cellpadding="0" cellspacing="0"
                style="background:#F8FBFF;border:1px solid #90CAF9;border-radius:6px;">
                <tr>
                  <td style="padding:24px;">

                    <p style="margin:0 0 12px;font-size:13px;color:#1565C0;font-weight:bold;">
                      ข้อมูลเข้าสู่ระบบ
                    </p>

                    <table width="100%" cellpadding="0" cellspacing="0">
                      <tr>
                        <td style="padding:10px 0;width:120px;font-size:14px;font-weight:bold;color:#333;">
                         รหัสผ่านผู้ใช้งาน
                        </td>
                        <td style="padding:10px 0;font-size:15px;color:#0D47A1;font-weight:bold;">
                          ${username}
                        </td>
                      </tr>

                      <tr>
                        <td style="padding:10px 0;width:120px;font-size:14px;font-weight:bold;color:#333;">
                          รหัสผ่าน
                        </td>
                        <td style="padding:10px 0;font-size:15px;color:#C62828;font-weight:bold;">
                          ${password}
                        </td>
                      </tr>
                    </table>

                  </td>
                </tr>
              </table>

              <!-- Warning -->
              <table width="100%" cellpadding="0" cellspacing="0"
                style="margin-top:20px;background:#FFF8E1;border-left:4px solid #FFA000;border-radius:4px;">
                <tr>
                  <td style="padding:16px;">
                    <p style="margin:0;font-size:13px;color:#5D4037;line-height:1.8;">
                      เพื่อความปลอดภัยของข้อมูล ขอแนะนำให้ท่านเปลี่ยนรหัสผ่านทันทีหลังจากเข้าสู่ระบบครั้งแรก
                    </p>
                  </td>
                </tr>
              </table>

              <!-- Login URL -->
              <table width="100%" cellpadding="0" cellspacing="0" style="margin-top:24px;">
                <tr>
                  <td align="center">
                    <a href="https://alumni.rmu.ac.th/"
                      style="
                        display:inline-block;
                        background:#1565C0;
                        color:#ffffff;
                        text-decoration:none;
                        padding:12px 28px;
                        border-radius:4px;
                        font-size:14px;
                        font-weight:bold;
                      ">
                      เข้าสู่ระบบ
                    </a>
                  </td>
                </tr>
              </table>

              <p style="margin:24px 0 0;font-size:13px;color:#666;line-height:1.8;">
                หากท่านมีข้อสงสัยหรือพบปัญหาในการใช้งาน
                กรุณาติดต่อผู้ดูแลระบบ
              </p>

            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background:#1565C0;padding:20px;text-align:center;">
              <p style="margin:0;color:#BBDEFB;font-size:13px;">
                ระบบสารสนเทศเครือข่ายศิษย์เก่า
              </p>
              <p style="margin:5px 0 0;color:#ffffff;font-size:13px;font-weight:bold;">
                มหาวิทยาลัยราชภัฏมหาสารคาม
              </p>
              <p style="margin:10px 0 0;color:#90CAF9;font-size:11px;">
                อีเมลนี้ถูกส่งโดยระบบอัตโนมัติ กรุณาอย่าตอบกลับ
              </p>
            </td>
          </tr>

        </table>

      </td>
    </tr>
  </table>

</body>
</html>
    `,
        };

        await transporter.sendMail(mailOptions);

        set.status = 200;
        return { ok: true };
      }
    } catch (error) {
      console.error(error);
      set.status = 500;
      return { error };
    }
  },
  get_admin_list: async ({ set, query }) => {
    try {
      const { page, search, take, filter, sort } = query;
      const skip = Number(take) * (page - 1);
      let where = {};
      if (search) {
        where = {
          OR: [
            {
              prefix: {
                contains: search,
                mode: "insensitive",
              },
            },
            {
              fname: {
                contains: search,
                mode: "insensitive",
              },
            },
            {
              lname: {
                contains: search,
                mode: "insensitive",
              },
            },
            {
              email: {
                contains: search,
                mode: "insensitive",
              },
            },
          ],
        };
      }
      if (filter && filter !== "ทุกสถานะ") {
        where = {
          ...where,
          ...JSON.parse(filter),
        };
      }

      const [data, total] = await Promise.all([
        prisma.admin.findMany({
          take: Number(take),
          skip,
          orderBy: {
            ...JSON.parse(sort),
          },
          where,
          select: {
            admin_id: true,
            profile: true,
            prefix: true,
            fname: true,
            lname: true,
            email: true,
            tel: true,
            canUse: true,
            createdAt: true,
            lastestLogin: true,
          },
        }),
        prisma.admin.count({
          where,
        }),
      ]);
      set.status = 200;
      return {
        data,
        total,
        totalPage: Math.ceil(total / take) < 1 ? 1 : Math.ceil(total / take),
      };
    } catch (error) {
      console.error(error);
      set.status = 500;
      return { error };
    }
  },
  update_admin: async ({ set, body, params }) => {
    try {
      const { adminId } = params;
      if (!adminId) return (set.status = 400);

      const { prefix, fname, lname, email, tel, profile, profileChange } = body;
      if (!prefix || !fname || !lname || !email || !tel)
        return (set.status = 400);

      const sftp = await sftpConfig();
      const oldProfile = await prisma.admin.findFirst({
        where: {
          admin_id: adminId,
        },
        select: {
          profile: true,
        },
      });
      if (profileChange && oldProfile.profile) {
        if (!oldProfile) return (set.status = 400);

        const imgPath = path.join(
          import.meta.dir,
          "../public/upload",
          oldProfile.profile,
        );
        if (existsSync(imgPath)) {
          await unlink(imgPath);
          const remotePath = process.env.SFTP_PATH + oldProfile.profile;
          await sftp.delete(remotePath);
        }
      }
      let imgName = null;
      if (profile && profile?.name) {
        const sanitizedName =
          profile?.name?.replace(/[^a-zA-Z0-9.-]/g, "_") || "image.jpg";
        imgName = `${Date.now()}_${sanitizedName}`;

        // Local path (Windows)
        const localPath = `./public/upload/${imgName}`;
        const remotePath = process.env.SFTP_PATH + imgName;

        // บันทึกไฟล์ใน local
        await Bun.write(localPath, profile);
        const sfpt = await sftpConfig();

        // ตรวจสอบว่าโฟลเดอร์บนเซิร์ฟเวอร์มีอยู่ไหม
        const remoteDir = remotePath.substring(0, remotePath.lastIndexOf("/"));
        const sftp = await sftpConfig();
        try {
          await sftp.mkdir(remoteDir, true);
        } catch (mkdirerr) {
          // โฟลเดอร์อาจมีอยู่แล้ว
          if (mkdirerr.code !== 4) {
            throw mkdirerr;
          }
        }

        // อัปโหลดไปยังเซิร์ฟเวอร์ผ่าน SFTP
        await sftp.put(localPath, remotePath, {
          writeStreamOptions: {
            flags: "w",
            mode: 0o666,
          },
        });

        // ตรวจสอบว่าอัปโหลดสำเร็จ
        const uploaded = await sftp.exists(remotePath);
        if (!uploaded) {
          throw new err("File upload verification failed");
        }
      }

      const updateAdmin = await prisma.admin.update({
        where: {
          admin_id: adminId,
        },
        data: {
          fname,
          lname,
          email,
          prefix,
          tel,
          profile: imgName,
        },
      });
      if (!updateAdmin) return (set.status = 400);

      set.status = 200;
      return { ok: true };
    } catch (error) {
      console.error(error);
      set.status = 500;
      return { error };
    }
  },
  delete_admin: async ({ set, params, query }) => {
    try {
      const { adminId } = params;
      if (!adminId) return (set.status = 400);
      const { reason } = query;
      if (!reason) return (set.status = 400);
      const email = await prisma.admin.findFirst({
        where: {
          admin_id: adminId,
        },
        select: {
          email: true,
          fname: true,
          lname: true,
        },
      });
      if (!email) return (set.status = 400);

      // delete
      const del = await prisma.admin.delete({
        where: {
          admin_id: adminId,
        },
      });
      if (!del) return (set.status = 400);

      // sendEmail
      const toEmail = email.email;
      if (toEmail) {
        const mailOptions = {
          from: envConfig.mail_user,
          to: toEmail,
          subject:
            "แจ้งการลบบัญชีผู้ดูแลระบบ - ระบบสารสนเทศเครือข่ายศิษย์เก่า มหาวิทยาลัยราชภัฏมหาสารคาม",
          html: `
<!DOCTYPE html>
<html lang="th">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
</head>
<body style="margin:0;padding:0;background-color:#EBF4FB;font-family:Tahoma,sans-serif;">

<table width="100%" cellpadding="0" cellspacing="0" style="background-color:#EBF4FB;padding:32px 0;">
  <tr>
    <td align="center">

      <table width="600" cellpadding="0" cellspacing="0"
        style="max-width:600px;width:100%;background:#ffffff;border:1px solid #D6EAF8;border-radius:8px;overflow:hidden;">

        <!-- Header -->
        <tr>
          <td style="background:#1565C0;padding:28px;text-align:center;">
            <p style="margin:0;color:#BBDEFB;font-size:13px;">
              มหาวิทยาลัยราชภัฏมหาสารคาม
            </p>
            <h1 style="margin:8px 0 0;color:#ffffff;font-size:22px;">
              ระบบสารสนเทศเครือข่ายศิษย์เก่า
            </h1>
          </td>
        </tr>

        <!-- Alert -->
        <tr>
          <td style="background:#C62828;padding:14px;text-align:center;">
            <p style="margin:0;color:#ffffff;font-size:16px;font-weight:bold;">
              แจ้งการลบบัญชีผู้ดูแลระบบ
            </p>
          </td>
        </tr>

        <!-- Body -->
        <tr>
          <td style="padding:32px;">

            <p style="margin:0 0 16px;font-size:15px;color:#333;">
              เรียน คุณ
              <strong>${email?.fname || ""} ${email?.lname || ""}</strong>
            </p>

            <p style="margin:0 0 18px;font-size:14px;color:#333;line-height:1.8;">
              ขอเรียนแจ้งให้ทราบว่า บัญชีผู้ดูแลระบบของท่านใน
              <strong>ระบบสารสนเทศเครือข่ายศิษย์เก่า มหาวิทยาลัยราชภัฏมหาสารคาม</strong>
              ได้ถูกดำเนินการลบออกจากระบบเรียบร้อยแล้ว
            </p>

            <!-- Status Box -->
            <table width="100%" cellpadding="0" cellspacing="0"
              style="background:#FFF5F5;border:1px solid #EF9A9A;border-radius:6px;">
              <tr>
                <td style="padding:20px;">
                  <p style="margin:0;font-size:14px;color:#C62828;font-weight:bold;">
                    สถานะ : บัญชีผู้ดูแลระบบถูกลบแล้ว
                  </p>
                </td>
              </tr>
            </table>

            <!-- Reason -->
            <table width="100%" cellpadding="0" cellspacing="0"
              style="margin-top:20px;background:#FFF8F8;border:1px solid #FFCDD2;border-radius:6px;">
              <tr>
                <td style="padding:18px;">
                  <p style="margin:0 0 8px;font-size:12px;font-weight:bold;color:#C62828;text-transform:uppercase;">
                    เหตุผลในการดำเนินการ
                  </p>
                  <p style="margin:0;font-size:14px;color:#333;line-height:1.8;">
                    ${reason || "-"}
                  </p>
                </td>
              </tr>
            </table>

            <p style="margin:24px 0 0;font-size:13px;color:#666;line-height:1.8;">
              หากท่านเชื่อว่าการดำเนินการดังกล่าวเกิดจากความผิดพลาด
              หรือต้องการสอบถามข้อมูลเพิ่มเติม กรุณาติดต่อผู้ดูแลระบบ
              เพื่อขอรับความช่วยเหลือ
            </p>

          </td>
        </tr>

        <!-- Footer -->
        <tr>
          <td style="background:#1565C0;padding:20px;text-align:center;">
            <p style="margin:0;color:#BBDEFB;font-size:13px;">
              ระบบสารสนเทศเครือข่ายศิษย์เก่า
            </p>
            <p style="margin:5px 0 0;color:#ffffff;font-size:13px;font-weight:bold;">
              มหาวิทยาลัยราชภัฏมหาสารคาม
            </p>
            <p style="margin:10px 0 0;color:#90CAF9;font-size:11px;">
              อีเมลนี้ถูกส่งโดยระบบอัตโนมัติ กรุณาอย่าตอบกลับ
            </p>
          </td>
        </tr>

      </table>

    </td>
  </tr>
</table>

</body>
</html>
    `,
        };

        await transporter.sendMail(mailOptions);

        set.status = 200;
        return { ok: true };
      }
    } catch (error) {
      console.error(error);
      set.status = 500;
      return { error };
    }
  },
  export_admin_data: async ({ set, body }) => {
    try {
      const { fileName, selectDataFiled } = body;
      if (!fileName || selectDataFiled.length < 1) return (set.status = 400);

      const selectFiled = selectDataFiled.filter((f) => Boolean(f));
      // console.log("🚀 ~ selectFiled:", selectFiled);
      const select = {
        prefix: selectFiled.includes("prefix"),
        fname: selectFiled.includes("fname"),
        lname: selectFiled.includes("lname"),
        createdAt: selectFiled.includes("createdAt"),
        lastestLogin: selectFiled.includes("lastestLogin"),
        email: selectFiled.includes("email"),
        tel: selectFiled.includes("tel"),
      };

      const data = await prisma.admin.findMany({
        select,
      });
      // console.log("🚀 ~ data:", data);

      if (data.length < 1) return { err: "ไม่พบข้อมูลที่ต้องการส่งออก" };
      set.status = 200;
      return data;
    } catch (error) {
      console.error(error);
      set.status = 500;
      return { error };
    }
  },
  get_sendtext_stats: async ({ set }) => {
    try {
      const [all, allAdmin, allEx, allProfessor, allAlumni] = await Promise.all(
        [
          prisma.sendTextHistory.count(),
          prisma.sendTextHistory.count({
            where: {
              sender_type: "admin",
            },
          }),
          prisma.sendTextHistory.count({
            where: {
              sender_type: "executive",
            },
          }),
          prisma.sendTextHistory.count({
            where: {
              sender_type: "professor",
            },
          }),
          prisma.sendTextHistory.count({
            where: {
              sender_type: "alumni",
            },
          }),
        ],
      );

      set.status = 200;
      return { all, allAdmin, allEx, allProfessor, allAlumni };
    } catch (error) {
      console.error(error);
      set.status = 500;
      return { error };
    }
  },
  get_sendText_list: async ({ set, query }) => {
    try {
      const { search, page, take, sort, searchSender } = query;
      console.log("🚀 ~ query:", query);
      const skip = Number(take) * (page - 1);
      let where = {};
      if (search) {
        where = {
          OR: [
            {
              title: {
                contains: search,
                mode: "insensitive",
              },
            },
            {
              detail: {
                contains: search,
                mode: "insensitive",
              },
            },
          ],
        };
      }
      if (searchSender !== "all") {
        where = {
          ...where,
          sender_type: searchSender,
        };
      }

      const [data, total] = await Promise.all([
        prisma.sendTextHistory.findMany({
          take: Number(take),
          skip,
          orderBy: {
            ...JSON.parse(sort),
          },
          where,
          select: {
            createdAt: true,
            alumniId: true,
            category: true,
            title: true,
            detail: true,
            id: true,
            admin: {
              select: {
                prefix: true,
                fname: true,
                lname: true,
                // email:true
              },
            },
            professor: {
              select: {
                fname: true,
                academic_rank: true,
                lname: true,
              },
            },
            alumni: {
              select: {
                prefix: true,
                fname: true,
                lname: true,
              },
            },
            sender_type: true,
          },
        }),
        prisma.sendTextHistory.count({
          where,
        }),
      ]);

      set.status = 200;
      return {
        data,
        total,
        totalPage: Math.ceil(total / take) < 1 ? 1 : Math.ceil(total / take),
      };
    } catch (error) {
      console.error(error);
      set.status = 500;
      return { error };
    }
  },
  get_alumni_from_sendText: async ({ set, params }) => {
    try {
      const { sendTextId } = params;
      if (!sendTextId) return (set.status = 400);
      const data = await prisma.sendTextHistory.findFirst({
        where: {
          id: Number(sendTextId),
        },
        select: {
          alumniId: true,
        },
      });
      if (!data) return (set.status = 400);

      const alumnies = await prisma.alumni.findMany({
        where: {
          alumni_id: {
            in: data.alumniId.split(","),
          },
        },
        select: {
          prefix: true,
          fname: true,
          lname: true,
          alumni_id: true,
          facultyId: true,
          departmentId: true,
          year_end: true,
          year_start: true,
        },
      });
      if (!alumnies) return (set.status = 400);

      set.status = 200;
      return alumnies;
    } catch (error) {
      console.error(error);
      set.status = 500;
      return { error };
    }
  },
  get_sendtext_data: async ({ set, params }) => {
    try {
      const { sendTextId } = params;
      if (!sendTextId) return (set.status = 400);
      const data = await prisma.sendTextHistory.findFirst({
        where: {
          id: Number(sendTextId),
        },
        select: {
          alumniId: true,
          title: true,
          detail: true,
          category: true,
        },
      });
      if (!data) return (set.status = 400);

      set.status = 200;
      return data;
    } catch (error) {
      console.error(error);
      set.status = 500;
      return { error };
    }
  },
  delete_sendtext: async ({ set, params }) => {
    try {
      const { sendTextId } = params;
      if (!sendTextId) return (set.status = 400);

      const del = await prisma.sendTextHistory.delete({
        where: {
          id: Number(sendTextId),
        },
      });
      if (!del) return (set.status = 400);

      set.status = 200;
      return { ok: true };
    } catch (error) {
      console.error(error);
      set.status = 500;
      return { error };
    }
  },
  get_reports_stats: async ({ set }) => {
    try {
      const [
        allAlumni,
        allAlumniNoRegis,
        allPersonel,
        allPersonelCanNotUse,
        allAdmin,
        allAdminCanNotUse,
        allAlumniPending,
        allAlumniRefuse,
        allNews,
        allNewsViews,
        allCurrentMoney,
        allSend,
        allImportAlumni,
        allImportPersonel,
      ] = await Promise.all([
        prisma.alumni.count(),
        prisma.alumni.count({
          where: {
            OR: [
              {
                regis_alumni: null,
              },
              {
                regis_alumni: { isApproved: { not: "accept" } },
              },
            ],
          },
        }),
        prisma.professor.count(),
        prisma.professor.count({
          where: {
            canUse: false,
          },
        }),
        prisma.admin.count(),
        prisma.admin.count({
          where: {
            canUse: false,
          },
        }),
        prisma.alumni.count({
          where: {
            regis_alumni: {
              isApproved: "pending",
            },
          },
        }),
        prisma.alumni.count({
          where: {
            regis_alumni: {
              isApproved: "refuse",
            },
          },
        }),
        prisma.news_donatios.count(),
        prisma.news_donatios.aggregate({
          _sum: {
            view: true,
          },
        }),
        prisma.news_donatios.aggregate({
          _sum: {
            current_money: true,
          },
        }),
        prisma.sendTextHistory.count(),
        prisma.import_history.count({
          where: {
            import_type: "alumni",
          },
        }),
        prisma.import_history.count({
          where: {
            import_type: "personel",
          },
        }),
      ]);

      set.status = 200;
      return {
        allAlumni,
        allAlumniNoRegis,
        allPersonel,
        allPersonelCanNotUse,
        allAdmin,
        allAdminCanNotUse,
        allAlumniPending,
        allAlumniRefuse,
        allNews,
        allNewsViews: allNewsViews._sum.view,
        allCurrentMoney: allCurrentMoney._sum.current_money,
        allSend,
        allImportAlumni,
        allImportPersonel,
      };
    } catch (error) {
      console.error(error);
      set.status = 500;
      return { error };
    }
  },
  get_alumni_chartbar_groupbyfac: async ({ set }) => {
    try {
      const [all, allMens, allGrirs] = await Promise.all([
        prisma.alumni.groupBy({
          by: ["facultyId"],
          _count: {
            alumni_id: true,
          },
        }),
        prisma.alumni.groupBy({
          by: ["facultyId"],
          where: {
            prefix: "นาย",
          },
          _count: {
            alumni_id: true,
          },
        }),
        prisma.alumni.groupBy({
          by: ["facultyId"],
          where: {
            prefix: { contains: "นาง" },
          },
          _count: {
            alumni_id: true,
          },
        }),
      ]);

      const data = all.map((a) => {
        const matchMen = allMens.find((m) => m.facultyId === a.facultyId);
        const matchGirl = allGrirs.find((g) => g.facultyId === a.facultyId);
        return {
          facId: a.facultyId,
          mens: matchMen ? matchMen._count.alumni_id : 0,
          girls: matchGirl ? matchGirl._count.alumni_id : 0,
        };
      });

      set.status = 200;
      return data;
    } catch (error) {
      console.error(error);
      set.status = 500;
      return { error };
    }
  },
  get_alumni_bywork: async ({ set }) => {
    try {
      const [workInThai, workInOther, continueStudy, NoData, NoJob] =
        await Promise.all([
          prisma.alumni.count({
            where: {
              work_expreriences: {
                some: {
                  isInThai: true,
                },
              },
            },
          }),
          prisma.alumni.count({
            where: {
              work_expreriences: {
                some: {
                  isInThai: false,
                },
              },
            },
          }),
          prisma.alumni.count({
            where: {
              study_expreriences: {
                some: {},
              },
            },
          }),
          prisma.alumni.count({
            where: {
              AND: [
                {
                  work_expreriences: {
                    none: {},
                  },
                },
                {
                  study_expreriences: {
                    none: {},
                  },
                },
              ],
            },
          }),
          prisma.alumni.count({
            where: {
              work_expreriences: {
                some: {
                  isCurrent: true,
                },
              },
            },
          }),
        ]);

      set.status = 200;
      return { workInThai, workInOther, continueStudy, NoData, NoJob };
    } catch (error) {
      console.error(error);
      set.status = 500;
      return { error };
    }
  },
  get_alumni_groupby_year: async ({ set }) => {
    try {
      const data = await prisma.alumni.groupBy({
        by: ["year_start"],
        take: 10,
        orderBy: {
          year_start: "desc",
        },
        _count: {
          alumni_id: true,
        },
      });

      set.status = 200;
      return {
        data: data.map((d) => ({
          name: `${d?.year_start}`,
          value: d?._count.alumni_id,
        })),
      };
    } catch (error) {
      console.error(error);
      set.status = 500;
      return { error };
    }
  },
  get_professor_broupby_postion: async ({ set }) => {
    try {
      const data = await prisma.professor.groupBy({
        by: ["univercity_position"],
        _count: {
          professor_id: true,
        },
      });

      set.status = 200;
      return {
        data: data.map((d) => ({
          name: d.univercity_position,
          value: d._count.professor_id,
        })),
      };
    } catch (error) {
      console.error(error);
      set.status = 500;
      return { error };
    }
  },
  get_sendtext_groupby_sender: async ({ set }) => {
    try {
      const data = await prisma.sendTextHistory.groupBy({
        by: ["sender_type"],
        _count: {
          id: true,
        },
      });

      const displayThaisender = (sender) => {
        let text = "ศิษย์เก่า";
        switch (sender) {
          case "professor":
            text = "อาจารย์/ผู้บริหาร";
            break;
          case "admin":
            text = "ผู้ดูแล";
            break;
          default:
            break;
        }
        return text;
      };

      set.status = 200;
      return {
        data: data?.map((d) => ({
          name: displayThaisender(d?.sender_type),
          value: d._count.id,
        })),
      };
    } catch (error) {
      console.error(error);
      set.status = 500;
      return { error };
    }
  },
  get_news_groupby_category: async ({ set }) => {
    try {
      const data = await prisma.news_donatios.groupBy({
        by: ["category"],
        _count: {
          id: true,
        },
      });

      set.status = 200;
      return {
        data: data?.map((d) => ({
          name: d?.category == 0 ? "ข่าวสาร/กิจกรรม" : "โครงการบริจาค",
          value: d?._count.id,
        })),
      };
    } catch (error) {
      console.error(error);
      set.status = 500;
      return { error };
    }
  },
  get_user_account_canuse: async ({ set }) => {
    try {
      const [
        allAlumni,
        canUseAlumni,
        allProfessor,
        professorCanUse,
        allAdmin,
        adminCanuse,
      ] = await Promise.all([
        prisma.alumni.count(),
        prisma.alumni.count({
          where: {
            canUse: true,
          },
        }),
        prisma.professor.count(),
        prisma.professor.count({
          where: {
            canUse: true,
          },
        }),
        prisma.admin.count(),
        prisma.admin.count({
          where: {
            canUse: true,
          },
        }),
      ]);

      const data = [
        {
          name: "ศิษย์เก่าที่อนุญาตใช่งาน",
          canUse: canUseAlumni,
          all: allAlumni,
          percent: (canUseAlumni / allAlumni) * 100,
        },
        {
          name: "อาจารย์ที่เปิดใช้งาน",
          canUse: professorCanUse,
          all: allProfessor,
          percent: (professorCanUse / allProfessor) * 100,
        },
        {
          name: "ผู้ดูแลระบบที่ใช้งานอยู่",
          canUse: adminCanuse,
          all: allAdmin,
          percent: (adminCanuse / allAdmin) * 100,
        },
      ];

      set.status = 200;
      return { data };
    } catch (error) {
      console.error(error);
      set.status = 500;
      return { error };
    }
  },
  get_popular_news: async ({ set }) => {
    try {
      const data = await prisma.news_donatios.findMany({
        take: 10,
        orderBy: {
          view: "desc",
        },
        select: {
          title: true,
          category: true,
          view: true,
          updatedAt: true,
        },
      });
      set.status = 200;
      return data;
    } catch (error) {
      console.error(error);
      set.status = 500;
      return { error };
    }
  },
  get_setting_data: async ({ set }) => {
    try {
      const data = await prisma.setting.findMany({
        select: {
          id: true,
          regis_payment: true,
          dep_sheet_link: true,
          fac_sheet_link: true,
          regis_payment_qrcode: true,
          regis_payment_account_back: true,
          regis_payment_account_name: true,
          regis_payment_account_number: true,
          skipAlumniDuplicate: true,
          skipPersonelDuplicate: true,
          allowedAlumniAccount: true,
          allowedPersonelAccount: true,
          allowedAdminAccount: true,
          allowedNotifyAlumniEditRegis: true,
          allowedNotifyAlumniRegis: true,
          notify_email: true,
          backup_folderid: true,
          filebackup_folderid: true,
        },
      });

      set.status = 200;
      return data[0];
    } catch (error) {
      console.error(error);
      set.status = 500;
      return { error };
    }
  },
  edit_setting_qrcode_payment: async ({ set, body, params }) => {
    try {
      const { id } = params;
      if (!id) return (set.status = 400);

      const {
        file,
        regis_payment,
        regis_payment_account_name,
        regis_payment_account_number,
        regis_payment_account_back,
      } = body;
      if (
        !file ||
        !regis_payment ||
        !regis_payment_account_back ||
        !regis_payment_account_name ||
        !regis_payment_account_number
      )
        return (set.status = 400);

      const findOldSlip = await prisma.setting.findFirst({
        where: {
          id: Number(id),
        },
        select: {
          regis_payment_qrcode: true,
        },
      });
      const sftp = await sftpConfig();
      if (findOldSlip) {
        // ลบไฟล์ในเครื่อง
        const imgPath = path.join(
          import.meta.dir,
          "../public/upload",
          findOldSlip.regis_payment_qrcode,
        );
        if (existsSync(imgPath)) {
          await unlink(imgPath);
          const remotePath =
            process.env.SFTP_PATH + findOldSlip.regis_payment_qrcode;
          await sftp.delete(remotePath);
        }
      }

      const sanitizedName =
        file?.name?.replace(/[^a-zA-Z0-9.-]/g, "_") || "image.jpg";
      const imgName = `${Date.now()}_${sanitizedName}`;

      // Local path (Windows)
      const localPath = `./public/upload/${imgName}`;
      const remotePath = process.env.SFTP_PATH + imgName;

      // บันทึกไฟล์ใน local
      await Bun.write(localPath, file);

      // ตรวจสอบว่าโฟลเดอร์บนเซิร์ฟเวอร์มีอยู่ไหม
      const remoteDir = remotePath.substring(0, remotePath.lastIndexOf("/"));
      try {
        await sftp.mkdir(remoteDir, true);
      } catch (mkdirerr) {
        // โฟลเดอร์อาจมีอยู่แล้ว
        if (mkdirerr.code !== 4) {
          throw mkdirerr;
        }
      }

      // อัปโหลดไปยังเซิร์ฟเวอร์ผ่าน SFTP
      await sftp.put(localPath, remotePath, {
        writeStreamOptions: {
          flags: "w",
          mode: 0o666,
        },
      });

      // ตรวจสอบว่าอัปโหลดสำเร็จ
      const uploaded = await sftp.exists(remotePath);
      if (!uploaded) {
        throw new err("File upload verification failed");
      }

      // update
      const update = await prisma.setting.update({
        where: {
          id: Number(id),
        },
        data: {
          regis_payment_qrcode: imgName,
          regis_payment: Number(regis_payment),
          regis_payment_account_back,
          regis_payment_account_name,
          regis_payment_account_number,
        },
      });

      set.status = 200;
      return { ok: true };
    } catch (error) {
      console.error(error);
      set.status = 500;
      return { error };
    }
  },
  update_regis_payment: async ({ set, body, params }) => {
    try {
      const { id } = params;
      if (!id) return (set.status = 400);
      const { regisPayment } = body;
      if (!regisPayment) return (set.status = 400);

      const update = await prisma.setting.update({
        where: {
          id: Number(id),
        },
        data: {
          regis_payment: Number(regisPayment),
        },
      });

      set.status = 200;
      return { ok: true };
    } catch (error) {
      console.error(error);
      set.status = 500;
      return { error };
    }
  },
  edit_fac_dep_sheet: async ({ set, body, params }) => {
    try {
      const { id } = params;
      if (!id) return (set.status = 400);
      const { fac_sheet_link, dep_sheet_link } = body;
      if (!dep_sheet_link && !fac_sheet_link) return (set.status = 400);

      const update = await prisma.setting.update({
        where: {
          id: Number(id),
        },
        data: {
          fac_sheet_link,
          dep_sheet_link,
        },
      });

      set.status = 200;
      return { ok: true };
    } catch (error) {
      console.error(error);
      set.status = 500;
      return { error };
    }
  },
  update_account_setting: async ({ set, body, params }) => {
    try {
      const { id } = params;
      if (!id) return (set.status = 400);

      const update = await prisma.setting.update({
        where: {
          id: Number(id),
        },
        data: {
          ...body,
        },
      });

      set.status = 200;
      return { ok: true };
    } catch (error) {
      console.error(error);
      set.status = 500;
      return { error };
    }
  },
  update_notify_mail: async ({ set, body, params }) => {
    try {
      const { id } = params;
      if (!id) return (set.status = 400);

      const update = await prisma.setting.update({
        where: {
          id: Number(id),
        },
        data: {
          ...body,
        },
      });

      set.status = 200;
      return { ok: true };
    } catch (error) {
      console.error(error);
      set.status = 500;
      return { error };
    }
  },
  check_folder_id_verrify: async ({ set, body, params }) => {
    try {
      const { id } = params;
      if (!id) return (set.status = 400);

      const { backup_folderid } = body;
      if (!backup_folderid) return (set.status = 400);

      const hasAccess = await verifyFolderAccess(backup_folderid);
      if (!hasAccess) {
        return {
          err: "ไม่สามารถเข้าถึงโฟลเดอร์นี้ได้ กรุณาแชร์สิทธิ์ Editor ให้กับ alumnisystem-backup-service@powerful-lore-500507-h9.iam.gserviceaccount.com ก่อน",
        };
      }

      const update = await prisma.setting.update({
        where: {
          id: Number(id),
        },
        data: {
          backup_folderid,
        },
      });
      if (!update) return (set.status = 400);

      set.status = 200;
      return { ok: true };
    } catch (error) {
      console.error(error);
      set.status = 500;
      return { error };
    }
  },
  check_filefolder_id_verrify: async ({ set, body, params }) => {
    try {
      const { id } = params;
      if (!id) return (set.status = 400);

      const { filebackup_folderid } = body;
      if (!filebackup_folderid) return (set.status = 400);

      const hasAccess = await verifyFolderAccess(filebackup_folderid);
      if (!hasAccess) {
        return {
          err: "ไม่สามารถเข้าถึงโฟลเดอร์นี้ได้ กรุณาแชร์สิทธิ์ Editor ให้กับ alumnisystem-backup-service@powerful-lore-500507-h9.iam.gserviceaccount.com ก่อน",
        };
      }

      const update = await prisma.setting.update({
        where: {
          id: Number(id),
        },
        data: {
          filebackup_folderid,
        },
      });
      if (!update) return (set.status = 400);

      set.status = 200;
      return { ok: true };
    } catch (error) {
      console.error(error);
      set.status = 500;
      return { error };
    }
  },
  backup_data: async ({ set, body }) => {
    try {
      const { model, toDrive } = body;
      if (!model) return (set.status = 400);

      const data = await prisma[model].findMany();
      if (data.length < 1 || !data)
        return { err: "ไม่พบข้อมูลที่ต้องการสำรอง" };

      if (!toDrive) {
        set.status = 200;
        return data;
      }

      const setting = await prisma.setting.findMany({
        select: {
          backup_folderid: true,
        },
      });

      if (!setting[0].backup_folderid)
        return { err: "ไม่พบโฟลเดอร์ที่ใช้สำรองข้อมูล" };
      const excelBuffer = await generateExcelBuffer(data);
      const uploaded = await uploadFileToDrive(
        excelBuffer,
        `backup_${model}_${Date.now()}.xlsx`,
        setting[0].backup_folderid,
      );

      set.status = 200;
      return { ok: true };
    } catch (error) {
      console.error(error);
      set.status = 500;
      return { error };
    }
  },
  backup_files: async ({ set, body }) => {
    try {
      const { model, toDrive } = body;
      if (!model) return (set.status = 400);

      if (!toDrive) {
        const zip = new AdmZip();

        zip.addLocalFolder(path.join(process.cwd(), "public", "upload"));

        const buffer = zip.toBuffer();

        set.headers["Content-Type"] = "application/zip";
        set.headers["Content-Disposition"] =
          'attachment; filename="alumnisystembackupfiles.zip"';

        return new Response(buffer);
      }

      const setting = await prisma.setting.findMany({
        select: {
          filebackup_folderid: true,
        },
      });
      if (!setting[0].filebackup_folderid)
        return { err: "ไม่พบโฟลเดอร์ที่ใช้สำรองข้อมูล" };
      uploadFolderToDrive(setting[0].filebackup_folderid);

      set.status = 200;
      return { ok: true };
    } catch (error) {
      console.error(error);
      set.status = 500;
      return { error };
    }
  },
  delete_all_data: async ({ set, body, store }) => {
    try {
      const { model, password } = body;
      if (!model || !password) return (set.status = 400);

      const findAdmin = await prisma.admin.findFirst({
        where: {
          admin_id: store?.user?.id,
        },
        select: {
          passwordHash: true,
        },
      });
      if (!findAdmin) return (set.status = 400);

      if (model === "files") {
        const uploadDir = path.join(process.cwd(), "public", "upload");

        const files = await fsPromises.readdir(uploadDir);

        for (const file of files) {
          const filePath = path.join(uploadDir, file);

          const stat = await fsPromises.stat(filePath);

          // const sftp = await sftpConfig();
          // if (existsSync(filePath)) {
          //   const remotePath =
          //     process.env.SFTP_PATH + oldRegisData.slip_payment_url;
          //   await sftp.delete(remotePath);
          // }

          if (stat.isFile()) {
            await fsPromises.unlink(filePath);
          }
        }

        set.status = 200;
        return { ok: true };
      }

      const passwordMatch = await bcrypt.compare(
        password,
        findAdmin.passwordHash,
      );
      if (!passwordMatch)
        return { err: "รหัสผ่านไม่ถูกต้องไม่สามารถลบข้อมูลได้" };

      const del = await prisma[model].deleteMany();
      if (!del) return (set.status = 400);

      set.status = 200;
      return { ok: true };
    } catch (error) {
      console.error(error);
      set.status = 500;
      return { error };
    }
  },
  export_alumni_overview: async ({ set, query, store }) => {
    try {
      // console.log("🚀 ~ query:", body);
      const { selecetFacultyId, selectDepartmentId, selectYearStart } = query;
      let filter = {};
      const normallizedData = (data) => {
        if (!data) return [];
        return data
          .filter((s) => s || s !== null || s !== undefined)
          .map((s) => String(s));
      };

      const { roleId } = store.user;
      // console.log("🚀 ~ store:", store);

      let filterFac =
        normallizedData(selecetFacultyId).length > 1
          ? {
              facultyId: {
                in: normallizedData(selecetFacultyId),
              },
            }
          : {};
      let filterDep =
        normallizedData(selectDepartmentId).length > 1
          ? {
              departmentId: {
                in: normallizedData(selectDepartmentId),
              },
            }
          : {};
      let filterYear =
        selectYearStart.length > 1
          ? { year_start: { in: selectYearStart } }
          : {};
      if (roleId <= 3) {
        const user = await prisma.professor.findFirst({
          where: {
            professor_id: store?.user?.id,
          },
          select: {
            departmentId: true,
            facultyId: true,
          },
        });

        filterFac = {
          facultyId: user.facultyId,
        };
        if (roleId < 3) {
          filterDep = {
            departmentId: user.departmentId,
          };
        }
      }

      const [
        allAlumniGroupbyFac,
        allAlumniGrounbByDep,
        allFacAlumniByWork,
        allFacAlumniByUnWork,
        allDepAlumniByWork,
        allDepAlumniByUnWork,
        mostPopularJob,
        allAlumniFacStudy,
        allAlumniByDepStudy,
        alumniFacStudyTo,
        alumniFacStudyEk,
        alumniDepStudyTo,
        alumniDepStudyEak,
      ] = await Promise.all([
        prisma.alumni.groupBy({
          where: filterFac,
          by: ["facultyId"],
          _count: {
            alumni_id: true,
          },
        }),
        prisma.alumni.groupBy({
          by: ["departmentId"],
          where: filterDep,
          _count: {
            alumni_id: true,
          },
        }),
        prisma.alumni.groupBy({
          by: ["facultyId"],
          where: {
            ...filterFac,
            work_expreriences: {
              some: {
                isCurrent: true,
              },
            },
          },
          _count: {
            alumni_id: true,
          },
        }),
        prisma.alumni.groupBy({
          by: ["facultyId"],
          where: {
            ...filterFac,
            work_expreriences: {
              every: {
                isCurrent: false,
              },
            },
          },
          _count: {
            alumni_id: true,
          },
        }),
        prisma.alumni.groupBy({
          by: ["departmentId"],
          where: {
            ...filterDep,
            work_expreriences: {
              some: {
                isCurrent: true,
              },
            },
          },
          _count: {
            alumni_id: true,
          },
        }),
        prisma.alumni.groupBy({
          by: ["departmentId"],
          where: {
            ...filterDep,
            work_expreriences: {
              every: {
                isCurrent: false,
              },
            },
          },
          _count: {
            alumni_id: true,
          },
        }),
        prisma.work_expreriences.groupBy({
          where: {
            alumni: {
              ...filterDep,
              ...filterFac,
            },
          },
          by: ["job_position"],
          _count: {
            id: true,
          },
          orderBy: {
            _count: {
              id: "desc",
            },
          },
          take: 10,
        }),
        prisma.alumni.groupBy({
          by: ["facultyId"],
          where: {
            ...filterFac,
          },
          _count: {
            alumni_id: true,
          },
        }),
        prisma.alumni.groupBy({
          by: ["departmentId"],
          where: {
            ...filterDep,
          },
          _count: {
            alumni_id: true,
          },
        }),
        prisma.alumni.groupBy({
          by: ["facultyId"],
          where: {
            ...filterFac,
            study_expreriences: {
              some: {
                edu_level: "ปริญญาโท",
              },
            },
          },
          _count: {
            alumni_id: true,
          },
        }),
        prisma.alumni.groupBy({
          by: ["facultyId"],
          where: {
            ...filterFac,
            study_expreriences: {
              some: {
                edu_level: "ปริญญาเอก",
              },
            },
          },
          _count: {
            alumni_id: true,
          },
        }),
        prisma.alumni.groupBy({
          by: ["departmentId"],
          where: {
            ...filterDep,
            study_expreriences: {
              some: {
                edu_level: "ปริญญาโท",
              },
            },
          },
          _count: {
            alumni_id: true,
          },
        }),
        prisma.alumni.groupBy({
          by: ["departmentId"],
          where: {
            ...filterDep,
            study_expreriences: {
              some: {
                edu_level: "ปริญญาเอก",
              },
            },
          },
          _count: {
            alumni_id: true,
          },
        }),
      ]);

      const data = {
        allAlumniGrounbByFac: await Promise.all(
          allAlumniGroupbyFac.map(async (a) => ({
            name: await facultyText(a.facultyId),
            value: a._count.alumni_id,
          })),
        ),

        allAlumniGroupbyDep: await Promise.all(
          allAlumniGrounbByDep.map(async (a) => ({
            name: await departmentText(a.departmentId),
            value: a._count.alumni_id,
          })),
        ),

        allFacByWork: await Promise.all(
          allAlumniGroupbyFac.map(async (af) => {
            const macthWork = allFacAlumniByWork.find(
              (aw) => aw.facultyId === af.facultyId,
            );
            const matchUnwork = allFacAlumniByUnWork.find(
              (au) => au.facultyId === af.facultyId,
            );

            return {
              name: await facultyText(af.facultyId),
              work: macthWork ? macthWork._count.alumni_id : 0,
              unwork: matchUnwork ? matchUnwork._count.alumni_id : 0,
            };
          }),
        ),

        allDepByWork: await Promise.all(
          allAlumniGrounbByDep.map(async (af) => {
            const macthWork = allDepAlumniByWork.find(
              (aw) => aw.departmentId === af.departmentId,
            );
            const matchUnwork = allDepAlumniByUnWork.find(
              (au) => au.departmentId === af.departmentId,
            );

            return {
              name: await departmentText(af.departmentId),
              work: macthWork ? macthWork._count.alumni_id : 0,
              unwork: matchUnwork ? matchUnwork._count.alumni_id : 0,
            };
          }),
        ),

        mostPopularJob: mostPopularJob.map((mp) => ({
          name: mp.job_position,
          value: mp._count.id,
        })),

        allAlumniFacStudy: await Promise.all(
          allAlumniFacStudy.map(async (as) => {
            const matchTo = alumniFacStudyTo.find(
              (at) => at.facultyId === as.facultyId,
            );
            const matchEak = alumniFacStudyEk.find(
              (at) => at.facultyId === as.facultyId,
            );
            return {
              name: await facultyText(as.facultyId),
              value: as._count.alumni_id,
              too: matchTo ? matchTo._count.alumni_id : 0,
              eak: matchEak ? matchEak._count.alumni_id : 0,
            };
          }),
        ),

        allAlumniByDepStudy: await Promise.all(
          allAlumniByDepStudy.map(async (fs) => {
            const matchTo = alumniDepStudyTo.find(
              (at) => at.departmentId === fs.departmentId,
            );
            const matchEak = alumniDepStudyEak.find(
              (at) => at.departmentId === fs.departmentId,
            );
            return {
              name: await departmentText(fs.departmentId),
              value: fs._count.alumni_id,
              too: matchTo ? matchTo._count.alumni_id : 0,
              eak: matchEak ? matchEak._count.alumni_id : 0,
            };
          }),
        ),
      };
      // console.log("🚀 ~ data:", data)

      // console.log("🚀 ~ filter:", filter);

      const browser = await puppeteer.launch({
        executablePath: process.env.PUPPETEER_EXECUTABLE_PATH || undefined,
        headless: true,
        args: [
          "--no-sandbox",
          "--disable-setuid-sandbox",
          "--disable-dev-shm-usage",
        ],
      });

      const page = await browser.newPage();

      await page.setContent(
        await ExportPdfHTML.exportOverviewAlumniData(
          data,
          selectYearStart,
          roleId,
        ),
        {
          waitUntil: "networkidle0",
        },
      );
      const pdfBuffer = await page.pdf({
        format: "A4",
        printBackground: true,
        preferCSSPageSize: true,
        displayHeaderFooter: true,
        headerTemplate: `
          ${fontStyle}
    <div style="
      width: 100%;
      display: flex;
      align-items: flex-start;
      padding: 8px 20px;
      justify-content: space-between;
      border-bottom: 3px solid #2563eb;
      box-sizing: border-box;
      font-family: 'Sarabun', sans-serif;
    ">
      <div style="display: flex; align-items: center; gap: 8px;">
        <div style="width: 60px; height: 60px; border-radius: 50%; overflow: hidden;">
          <img
              src="data:image/png;base64,${logoBase64}"
            style="width: 100%; height: 100%; object-fit: cover;"
          />
        </div>
        <div style="display: flex; flex-direction: column; gap: 4px;">
          <p style="margin: 0; font-size: 14px; color: #1f2937;">มหาวิทยาลัยราชภัฏมหาสารคาม</p>
          <p style="margin: 0; font-size: 16px; font-weight: bold; color: #2563eb; line-height: 1;">
            รายงานข้อมูลศิษย์เก่า
          </p>
          <p style="margin: 0; font-size: 14px; color: #3b82f6;">
            ระบบสารสนเทศเครือข่ายศิษย์เก่า มหาวิทยาลัยราชภัฏมหาสารคาม
          </p>
        </div>
      </div>
      <div style="display: flex; flex-direction: column; align-items: flex-end;">
        <p style="margin: 0; font-size: 12px; color: #6b7280;">วันที่ออกรายงาน</p>
        <p style="margin: 0; font-size: 12px; color: #6b7280;">
          ${new Date().toLocaleTimeString("th-TH", { day: "numeric", year: "numeric", month: "long" })}
        </p>
      </div>
    </div>`,
        footerTemplate: `
    <div style="
      width: 100%;
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 10px 40px;
      background-color: #eff6ff;
      box-sizing: border-box;
      font-family: 'Sarabun', sans-serif;
    ">
      <div style="display: flex; flex-direction: column; gap: 2px;">
        <p style="margin: 0; font-size: 14px; color: #1f2937;">
          ระบบสารสนเทศเครือข่ายศิษย์เก่า มหาวิทยาลัยราชภัฏมหาสารคาม
        </p>
        <p style="margin: 0; font-size: 14px; color: #1f2937;">
          ข้อมูล ณ ${new Date().toLocaleDateString("th-TH", { day: "numeric", month: "long", year: "numeric" })}
        </p>
      </div>
      <div style="display: flex; align-items: center; gap: 4px; font-size: 12px; color: #2563eb;">
        <span>หน้า</span>
        <span class="pageNumber"></span>
        <span>/</span>
        <span class="totalPages"></span>
      </div>
    </div>`,
      });

      await browser.close();

      return new Response(pdfBuffer, {
        headers: {
          "Content-Type": "application/pdf",
          "Content-Disposition": `attachment; filename="report.pdf"; filename*=UTF-8''${encodeURIComponent("รายงานข้อมูล")}`,
        },
      });
    } catch (error) {
      console.error(error);
      set.status = 500;
      return { error };
    }
  },
  create_faculty: async ({ set, body }) => {
    try {
      const { faculty_id, faculty_name } = body;
      if (!faculty_id || !faculty_name) return (set.status = 400);

      // findExit id
      const isExist = await prisma.faculty.findFirst({
        where: {
          faculty_id,
        },
      });
      if (isExist) return { err: "พบรหัสคณะนี้ถูกใช้งานแล้ว" };

      const create = await prisma.faculty.create({
        data: body,
      });
      if (!create) return (set.status = 400);

      set.status = 200;
      return { ok: true };
    } catch (error) {
      console.error(error);
      set.status = 500;
      return { error };
    }
  },
  update_faculty: async ({ set, body, params }) => {
    try {
      const { id } = params;
      if (!id) return (set.status = 400);

      const { faculty_id, faculty_name } = body;
      if (!faculty_id || !faculty_name) return (set.status = 400);

      // findExit id
      const isExist = await prisma.faculty.findFirst({
        where: {
          faculty_id: id,
        },
        select: {
          faculty_id: true,
        },
      });
      if (!isExist) return (set.status = 400);
      if (id !== isExist?.faculty_id) {
        if (isExist) return { err: "พบรหัสคณะนี้ถูกใช้งานแล้ว" };
      }

      const create = await prisma.faculty.update({
        where: {
          faculty_id: id,
        },
        data: body,
      });
      if (!create) return (set.status = 400);

      set.status = 200;
      return { ok: true };
    } catch (error) {
      console.error(error);
      set.status = 500;
      return { error };
    }
  },
  get_faculty_list: async ({ set, query }) => {
    try {
      const { search, page, isOptions } = query;
      let filter = {};
      if (search) {
        filter = {
          OR: [
            {
              faculty_id: {
                contains: search,
                mode: "insensitive",
              },
            },
            {
              faculty_name: {
                contains: search,
                mode: "insensitive",
              },
            },
          ],
        };
      }
      const take = 10;
      const skip = take * (page - 1);
      const [data, total] = await Promise.all([
        prisma.faculty.findMany({
          ...(!isOptions && {
            take,
            skip,
          }),
          where: filter,
          orderBy: {
            createdAt: "desc",
          },
          select: {
            faculty_id: true,
            faculty_name: true,
          },
        }),
        prisma.faculty.count(),
      ]);

      set.status = 200;
      return {
        data,
        total,
        totalPage: Math.ceil(total / take) < 1 ? 1 : Math.ceil(total / take),
      };
    } catch (error) {
      console.error(error);
      set.status = 500;
      return { error };
    }
  },
  delete_faculty: async ({ set, params }) => {
    try {
      const { id } = params;
      if (!id) return (set.status = 400);
      const del = await prisma.faculty.delete({
        where: { faculty_id: id },
      });
      if (!del) return (set.status = 400);

      set.status = 200;
      return { ok: true };
    } catch (error) {
      console.error(error);
      set.status = 500;
      return { error };
    }
  },
  create_department: async ({ set, body }) => {
    try {
      const { faculty_id, department_id, department_name } = body;
      // console.log("🚀 ~ body:", body);
      if (!faculty_id || !department_id || !department_name)
        return (set.status = 400);

      // findExit id
      const isExist = await prisma.std_departments.findFirst({
        where: {
          department_id,
        },
      });
      if (isExist) return { err: "พบรหัสสาขาวิชานี้ถูกใช้งานแล้ว" };

      const create = await prisma.std_departments.create({
        data: body,
      });

      if (!create) return (set.status = 400);

      set.status = 200;
      return { ok: true };
    } catch (error) {
      console.error(error);
      set.status = 500;
      return { error };
    }
  },
  update_std_department: async ({ set, body, params }) => {
    try {
      const { id } = params;
      if (!id) return (set.status = 400);

      const { faculty_id, department_id, department_name } = body;
      if (!faculty_id || !department_id || !department_name)
        return (set.status = 400);

      // findExit id
      const isExist = await prisma.std_departments.findFirst({
        where: {
          department_id: id,
        },
      });
      if (!isExist) return (set.status = 400);
      if (id !== isExist?.department_id) {
        if (isExist) return { err: "พบรหัสคณะนี้ถูกใช้งานแล้ว" };
      }

      const create = await prisma.std_departments.update({
        where: {
          department_id: id,
        },
        data: {
          faculty_id,
          department_id,
          department_name,
        },
      });
      if (!create) return (set.status = 400);

      set.status = 200;
      return { ok: true };
    } catch (error) {
      console.error(error);
      set.status = 500;
      return { error };
    }
  },
  get_department_list: async ({ set, query }) => {
    try {
      const { search, page, isOptions, selectFacultyId } = query;
      let filter = {};
      if (search) {
        filter = {
          OR: [
            {
              department_id: {
                contains: search,
                mode: "insensitive",
              },
            },
            {
              department_name: {
                contains: search,
                mode: "insensitive",
              },
            },
          ],
        };
      }
      if (selectFacultyId) {
        filter = {
          ...filter,
          faculty_id: selectFacultyId,
        };
      }
      const take = 10;
      const skip = take * (page - 1);
      const [data, total] = await Promise.all([
        prisma.std_departments.findMany({
          ...(!isOptions && {
            take,
            skip,
          }),
          orderBy: {
            createdAt: "desc",
          },
          where: filter,
          select: {
            department_id: true,
            department_name: true,
            faculty: {
              select: {
                faculty_id: true,
                faculty_name: true,
              },
            },
          },
        }),
        prisma.std_departments.count(),
      ]);

      set.status = 200;
      return {
        data,
        total,
        totalPage: Math.ceil(total / take) < 1 ? 1 : Math.ceil(total / take),
      };
    } catch (error) {
      console.error(error);
      set.status = 500;
      return { error };
    }
  },
  delete_std_department: async ({ set, params }) => {
    try {
      const { id } = params;
      if (!id) return (set.status = 400);
      const del = await prisma.std_departments.delete({
        where: { department_id: id },
      });
      if (!del) return (set.status = 400);

      set.status = 200;
      return { ok: true };
    } catch (error) {
      console.error(error);
      set.status = 500;
      return { error };
    }
  },
  create_edulevel: async ({ set, body }) => {
    try {
      const { edu_levelId, edu_level_name } = body;
      // console.log("🚀 ~ body:", body);
      if (!edu_levelId || !edu_level_name) return (set.status = 400);

      // findExit id
      const isExist = await prisma.edu_level.findFirst({
        where: {
          edu_levelId,
        },
      });
      if (isExist) return { err: "พบรหัสระดับการศึกษานี้ถูกใช้งานแล้ว" };

      const create = await prisma.edu_level.create({
        data: body,
      });

      if (!create) return (set.status = 400);

      set.status = 200;
      return { ok: true };
    } catch (error) {
      console.error(error);
      set.status = 500;
      return { error };
    }
  },
  get_edu_level_list: async ({ set, query }) => {
    try {
      const { search, page, isOptions } = query;
      let filter = {};
      if (search) {
        filter = {
          OR: [
            {
              edu_levelId: {
                contains: search,
                mode: "insensitive",
              },
            },
            {
              edu_level_name: {
                contains: search,
                mode: "insensitive",
              },
            },
          ],
        };
      }

      const take = 10;
      const skip = take * (page - 1);
      const [data, total] = await Promise.all([
        prisma.edu_level.findMany({
          ...(!isOptions && {
            take,
            skip,
          }),
          orderBy: {
            createdAt: "desc",
          },
          where: filter,
          select: {
            edu_levelId: true,
            edu_level_name: true,
          },
        }),
        prisma.edu_level.count(),
      ]);

      set.status = 200;
      return {
        data,
        total,
        totalPage: Math.ceil(total / take) < 1 ? 1 : Math.ceil(total / take),
      };
    } catch (error) {
      console.error(error);
      set.status = 500;
      return { error };
    }
  },
  delete_edu_level: async ({ set, params }) => {
    try {
      const { id } = params;
      if (!id) return (set.status = 400);
      const del = await prisma.edu_level.delete({
        where: { edu_levelId: id },
      });
      if (!del) return (set.status = 400);

      set.status = 200;
      return { ok: true };
    } catch (error) {
      console.error(error);
      set.status = 500;
      return { error };
    }
  },
  update_edu_level: async ({ set, body, params }) => {
    try {
      const { id } = params;
      console.log("🚀 ~ id:", id);
      if (!id) return (set.status = 400);

      const { edu_levelId, edu_level_name } = body;
      // console.log("🚀 ~ body:", body);
      if (!edu_levelId || !edu_level_name) return (set.status = 400);

      // findExit id
      const isExist = await prisma.edu_level.findFirst({
        where: {
          edu_levelId: id,
        },
      });
      if (!isExist) return (set.status = 400);
      if (id !== isExist?.edu_levelId) {
        if (isExist) return { err: "พบรหัสระดับการศึกษานี้ถูกใช้งานแล้ว" };
      }

      const create = await prisma.edu_level.update({
        where: {
          edu_levelId: id,
        },
        data: body,
      });

      set.status = 200;
      return { ok: true };
    } catch (error) {
      console.error(error);
      set.status = 500;
      return { error };
    }
  },
};
