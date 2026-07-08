import bcryptjs from "bcryptjs";
import path from "path";
import { unlink } from "fs/promises";
import { existsSync } from "fs";
import { envConfig, sftpConfig, transporter } from "../config/config";
import prisma from "../libs/prisma";
import { randomNum } from "./auth.controller";

export const alumniController = {
  profile: async ({ store, set }) => {
    try {
      const id = store.user.id;
      if (!id) {
        set.status = 400;
        return;
      }

      const isAlumni = Number(store.user.roleId) < 2;

      // ฟิลด์ที่ใช้ร่วมกัน
      const commonSelect = {
        prefix: true,
        fname: true,
        lname: true,
        facultyId: true,
        departmentId: true,
        profile: true,
      };

      const selectAlumniContract = {
        phone1: true,
        phone2: true,
        email1: true,
        email2: true,
        facebook: true,
        address: true,
        tambon: true,
        amphure: true,
        province: true,
        zipcode: true,
      };

      let user;
      let contract;

      if (isAlumni) {
        user = await prisma.alumni.findUnique({
          where: { alumni_id: id },
          select: {
            ...commonSelect,
            alumni_id: true,
            year_start: true,
            year_end: true,
            updatedAt: true,
            work_expreriences: {
              take: 1,
              where: { isCurrent: true },
              select: {
                company_place: true,
                job_position: true,
                company_name: true,

                isCurrent: true,
              },
              orderBy: { createdAt: "desc" },
            },
            study_expreriences: {
              where: {
                isCurrent: true,
              },
              select: {
                edu_dep: true,
                edu_faculty: true,
                edu_level: true,
                edu_university: true,
              },
            },
            alumni_contract: {
              select: {
                phone1: true,
                phone2: true,
                email1: true,
                email2: true,
                facebook: true,
              },
            },
          },
        });
        contract = await prisma.alumni_contract.findUnique({
          where: { alumniId: id },
          select: {
            ...selectAlumniContract,
          },
        });
      } else {
        user = await prisma.professor.findFirst({
          where: { professor_id: id },
          select: {
            ...commonSelect,
            professor_id: true,
            academic_rank: true,
            univercity_position: true,
          },
        });
        contract = await prisma.alumni_contract.findFirst({
          where: { professorProfessor_id: id },
          select: {
            ...selectAlumniContract,
          },
        });
      }

      user = {
        ...user,
        ...contract,
      };

      set.status = 200;
      return { alumni: user };
    } catch (err) {
      console.error(err);
      set.status = 500;
      return { err };
    }
  },
  get_contract: async ({ set, store }) => {
    try {
      const { id, roleId } = store.user;
      if (!id) return (set.status = 400);

      let contract;
      if (Number(roleId) < 2) {
        contract = await prisma.alumni_contract.findUnique({
          where: {
            alumniId: id,
          },
          select: {
            id: true,
            phone1: true,
            phone2: true,
            email1: true,
            email2: true,
            facebook: true,
            address: true,
            tambon: true,
            amphure: true,
            province: true,
            zipcode: true,
          },
        });
      } else {
        contract = await prisma.alumni_contract.findFirst({
          where: {
            professorProfessor_id: id,
          },
          select: {
            phone1: true,
            phone2: true,
            email1: true,
            email2: true,
            facebook: true,
            address: true,
            tambon: true,
            amphure: true,
            province: true,
            zipcode: true,
          },
        });
      }

      set.status = 200;
      return contract;
    } catch (err) {
      console.error(err);
      set.status = 500;
      return { err };
    }
  },
  update_contact: async ({ body, store, set }) => {
    try {
      const { id, roleId } = store.user;
      const { phone1, phone2, email1, email2, facebook } = body;

      const isAlumni = roleId < 2;
      const idField = isAlumni ? "alumniId" : "professorProfessor_id";

      const hadContract = await prisma.alumni_contract.findFirst({
        where: { [idField]: id },
        select: {
          id: true,
        },
      });
      let update;
      let create;
      if (!hadContract) {
        create = await prisma.alumni_contract.create({
          data: {
            [idField]: id,
            phone1,
            phone2,
            email1,
            email2,
            facebook,
          },
        });
      } else {
        update = await prisma.alumni_contract.update({
          where: { id: hadContract.id },
          data: { phone1, phone2, email1, email2, facebook },
        });
      }

      if (!update && !create) {
        set.status = 400;
        return;
      }

      set.status = 200;
      return { success: true };
    } catch (err) {
      console.error(err);
      set.status = 500;
      return { err };
    }
  },
  upload_profile: async ({ body, set, store }) => {
    const sftp = await sftpConfig();
    try {
      const { file } = body;
      const { id, roleId } = store.user;

      if (!file) {
        set.status = 400;
        return { err: "ไม่พบไฟล์รูปภาพ" };
      }

      // Validate file type
      const allowedTypes = [
        "image/jpeg",
        "image/png",
        "image/webp",
        "image/gif",
      ];
      if (!allowedTypes.includes(file.type)) {
        set.status = 400;
        return { err: "รองรับเฉพาะไฟล์ภาพ (JPEG, PNG, WebP, GIF)" };
      }

      // Validate file size (5MB limit)
      const maxSize = 5 * 1024 * 1024;
      if (file.size > maxSize) {
        set.status = 400;
        return { err: "ขนาดไฟล์ต้องไม่เกิน 5MB" };
      }

      // กำหนด model และ id field
      const isAlumni = Number(roleId) < 2;
      const model = isAlumni ? "alumni" : "professor";
      const idField = isAlumni ? "alumni_id" : "professor_id";

      // ตรวจสอบว่ามีภาพเก่าไหม
      const hadImage = await prisma[model].findUnique({
        where: { [idField]: id },
        select: { profile: true },
      });

      // ทำความสะอาดชื่อไฟล์
      const sanitizedName =
        file.name?.replace(/[^a-zA-Z0-9.-]/g, "_") || "image.jpg";
      const imgName = `${Date.now()}_${sanitizedName}`;

      // Local path (Windows)
      const localPath = `./public/upload/${imgName}`;
      const remotePath = process.env.SFTP_PATH + imgName;

      // ลบภาพเก่า (ถ้ามี)
      if (hadImage?.profile) {
        try {
          const delLocalPath = path.join(
            import.meta.dir,
            "../public/upload",
            hadImage.profile,
          );
          const delRemotePath = process.env.SFTP_PATH + hadImage.profile;

          // ลบไฟล์ local
          if (existsSync(delLocalPath)) {
            await unlink(delLocalPath);
          }

          // ลบไฟล์บนเซิร์ฟเวอร์
          const remoteExists = await sftp.exists(delRemotePath);
          if (remoteExists) {
            await sftp.delete(delRemotePath);
          }
        } catch (delerr) {
          console.warn("Warning: Could not delete old image:", delerr.message);
          // ไม่ throw err เพราะไฟล์อาจถูกลบไปแล้ว
        }
      }

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

      // อัปเดตฐานข้อมูล
      const update = await prisma[model].update({
        where: { [idField]: id },
        data: { profile: imgName },
      });

      if (!update) {
        set.status = 400;
        return { err: "ไม่สามารถอัปเดตโปรไฟล์ได้" };
      }

      set.status = 200;
      return { ok: true, profile: imgName };
    } catch (err) {
      console.error(err);
      set.status = 500;
      return { err };
    } finally {
      await sftp.end();
    }
  },
  delete_profile: async ({ store, set }) => {
    const sftp = await sftpConfig();
    try {
      const { id, roleId } = store.user;
      if (!id) {
        set.status = 400;
        return { err: "ไม่พบผู้ใช้" };
      }

      // กำหนด model และ id field
      const isAlumni = Number(roleId) < 2;
      const model = isAlumni ? "alumni" : "professor";
      const idField = isAlumni ? "alumni_id" : "professor_id";

      // ดึงข้อมูลรูปปัจจุบัน
      const profile = await prisma[model].findUnique({
        where: { [idField]: id },
        select: { profile: true },
      });

      if (!profile?.profile) {
        set.status = 400;
        return { err: "ไม่พบรูปภาพของผู้ใช้" };
      }

      // ลบไฟล์ในเครื่อง
      const imgPath = path.join(
        import.meta.dir,
        "../public/upload",
        profile.profile,
      );
      if (existsSync(imgPath)) {
        await unlink(imgPath);
        const remotePath = process.env.SFTP_PATH + profile.profile;
        await sftp.delete(remotePath);
      }

      // อัปเดตฐานข้อมูล set profile = null
      await prisma[model].update({
        where: { [idField]: id },
        data: { profile: null },
      });

      set.status = 200;
      return { ok: true };
    } catch (err) {
      console.error(err);
      set.status = 500;
      return { err };
    } finally {
      await sftp.end();
    }
  },
  update_live: async ({ body, store, set }) => {
    try {
      const { id, roleId } = store?.user || {};
      if (!id) {
        set.status = 400;
        return { err: "ไม่พบผู้ใช้" };
      }

      const { address, tambon, amphure, province, zipcode } = body;

      // กำหนด model และ idField (แก้เป็น < 2 ถ้า alumni มีทั้ง role 0 และ 1)
      const isAlumni = Number(roleId) < 2;
      const idField = isAlumni ? "alumniId" : "professorProfessor_id";
      const hadContract = await prisma.alumni_contract.findUnique({
        where: { [idField]: id },
        select: {
          id: true,
        },
      });
      let update;
      let create;
      if (!hadContract.id) {
        create = await prisma.alumni_contract.create({
          data: {
            [idField]: id,
            address,
            tambon,
            amphure,
            province,
            zipcode: String(zipcode),
          },
        });
      } else {
        update = await prisma.alumni_contract.update({
          where: { id: hadContract.id },
          data: {
            address,
            tambon,
            amphure,
            province,
            zipcode: String(zipcode),
          },
        });
      }

      if (!update && !create) {
        set.status = 400;
        return { err: "ไม่สามารถอัปเดตข้อมูลที่อยู่ได้" };
      }

      set.status = 200;
      return { ok: true };
    } catch (err) {
      console.error(err);
      set.status = 500;
      return { err };
    }
  },
  get_privacy: async ({ store, set }) => {
    try {
      const { id, roleId } = store.user || {};
      if (!id) {
        set.status = 400;
        return { err: "ไม่พบผู้ใช้" };
      }

      // map field ตาม role
      const isAlumni = Number(roleId) < 2;
      const idField = isAlumni ? "alumniId" : "professorId";

      const privacy = await prisma.user_privacy.findFirst({
        where: { [idField]: id },
        select: {
          seeProfile: true,
          seeEmail: true,
          seePhone: true,
          seeFacebook: true,
          seeAddress: true,
          seeWorkExprerience: true,
          allowedAlumniSendEmail: true,
          allowedProfessorSendEmail: true,
          seeSalary: true,
        },
      });

      set.status = 200;
      return privacy || {};
    } catch (err) {
      console.error("Get privacy err:", err);
      set.status = 500;
      return { err: "เกิดข้อผิดพลาดในการดึงข้อมูล privacy" };
    }
  },
  update_privacy: async ({ body, store, set }) => {
    try {
      const id = store.user.id;
      if (!id) {
        set.status = 400;
        return { err: "Invalid user" };
      }

      // whitelist ฟิลด์ที่แก้ไขได้
      const allowedFields = [
        "seeProfile",
        "seeEmail",
        "seePhone",
        "seeFacebook",
        "seeAddress",
        "seeWorkExprerience",
        "seeSalary",
        "allowedAlumniSendEmail",
        "allowedProfessorSendEmail",
      ];

      const data = {};
      for (const key of allowedFields) {
        if (key in body) data[key] = body[key];
      }

      if (Object.keys(data).length === 0) {
        set.status = 400;
        return { err: "No valid fields to update" };
      }

      let update;
      if (store.user.roleId < 2) {
        update = await prisma.user_privacy.updateMany({
          where: { alumniId: id },
          data,
        });
      } else {
        update = await prisma.user_privacy.updateMany({
          where: { professorId: id },
          data,
        });
      }

      if (update.count === 0) {
        set.status = 404;
        return { err: "Privacy settings not found" };
      }

      set.status = 200;
      return { ok: true };
    } catch (err) {
      console.error(err);
      set.status = 500;
      return { err };
    }
  },
  work_create: async ({ body, store, set }) => {
    try {
      const {
        salary,
        edu_level,
        edu_faculty,
        edu_dep,
        edu_university,
        year_start,
        year_end,
        edu_performance,
        continued_study,
        isCurrent,
        ...rest
      } = body;

      if (continued_study) {
        await prisma.studey_expreriences.create({
          data: {
            alumni: {
              connect: {
                alumni_id: store?.user?.id,
              },
            },
            place: body?.company_place,
            isCurrent,
            edu_level,
            edu_faculty,
            edu_dep,
            edu_university,
            year_start,
            year_end,
            edu_performance,
            continued_study,
          },
        });
        set.status = 200; // ใช้ 201 สำหรับ create success
        return { ok: true };
      }
      await prisma.work_expreriences.create({
        data: {
          alumni: {
            connect: {
              alumni_id: store?.user?.id,
            },
          },
          salary: Number(salary),
          ...rest,
        },
      });

      set.status = 200; // ใช้ 201 สำหรับ create success
      return { ok: true };
    } catch (err) {
      console.error(err);
      set.status = 500;
      return { err };
    }
  },
  work_list: async ({ set, query, params }) => {
    try {
      const { alumniId: id } = params;
      if (!id) {
        return (set.status = 400);
      }
      const { search, type, page, sort } = query;

      const skip = 10 * (Number(page) - 1);

      const currentJob = Number(type);
      const queryJobType =
        currentJob === 0
          ? null
          : currentJob === 3
            ? {
                continued_study: true,
              }
            : {
                isCurrent: currentJob === 1 ? true : false,
              };

      const [
        workExprerience,
        total,
        workTimes,
        avgSalary,
        currentSalary,
        minSalary,
        study_ex,
      ] = await Promise.all([
        prisma.work_expreriences.findMany({
          take: 10,
          skip: skip,
          where: {
            alumniId: id,
            OR: search
              ? [
                  { job_position: { contains: search, mode: "insensitive" } },
                  { company_name: { contains: search, mode: "insensitive" } },
                  {
                    company_place: { contains: search, mode: "insensitive" },
                  },
                  { job_detail: { contains: search, mode: "insensitive" } },
                  {
                    job_responsibility: {
                      contains: search,
                      mode: "insensitive",
                    },
                  },
                  { job_skills: { contains: search, mode: "insensitive" } },
                  {
                    edu_level: {
                      contains: search,
                      mode: "insensitive",
                    },
                  },
                  {
                    edu_dep: {
                      contains: search,
                      mode: "insensitive",
                    },
                  },
                  {
                    edu_faculty: {
                      contains: search,
                      mode: "insensitive",
                    },
                  },
                  {
                    edu_university: {
                      contains: search,
                      mode: "insensitive",
                    },
                  },
                ]
              : undefined,
            ...queryJobType,
          },
          select: {
            id: true,
            job_position: true,
            company_name: true,
            company_place: true,
            start_date: true,
            isCurrent: true,
            end_date: true,
            job_detail: true,
            salary: true,
            job_responsibility: true,
            job_skills: true,
            remark: true,
            isOnTheLine: true,
            isInThai: true,
            alumniId: true,
          },
          orderBy: {
            ...JSON.parse(sort),
          },
        }),
        prisma.work_expreriences.count({
          where: {
            alumniId: id,
            OR: search
              ? [
                  { job_position: { contains: search, mode: "insensitive" } },
                  { company_name: { contains: search, mode: "insensitive" } },
                  {
                    company_place: { contains: search, mode: "insensitive" },
                  },
                  { job_detail: { contains: search, mode: "insensitive" } },
                  {
                    job_responsibility: {
                      contains: search,
                      mode: "insensitive",
                    },
                  },
                  { job_skills: { contains: search, mode: "insensitive" } },
                  {
                    edu_level: {
                      contains: search,
                      mode: "insensitive",
                    },
                  },
                  {
                    edu_dep: {
                      contains: search,
                      mode: "insensitive",
                    },
                  },
                  {
                    edu_faculty: {
                      contains: search,
                      mode: "insensitive",
                    },
                  },
                  {
                    edu_university: {
                      contains: search,
                      mode: "insensitive",
                    },
                  },
                ]
              : undefined,
            ...queryJobType,
          },
        }),
        prisma.work_expreriences.count({
          where: {
            alumniId: id,
          },
        }),
        prisma.work_expreriences.aggregate({
          where: {
            alumniId: id,
          },
          _avg: {
            salary: true,
          },
          _max: {
            salary: true,
          },
          _min: {
            salary: true,
          },
        }),
        prisma.work_expreriences.aggregate({
          where: {
            alumniId: id,
            isCurrent: true,
          },
          _sum: {
            salary: true,
          },
        }),
        prisma.work_expreriences.aggregate({
          where: {
            alumniId: id,
          },
          _min: {
            salary: true,
          },
        }),
        prisma.studey_expreriences.findMany({
          where: {
            alumniId: id,
          },
          select: {
            id: true,
            alumniId: true,
            continued_study: true,
            edu_dep: true,
            edu_faculty: true,
            edu_level: true,
            place: true,
            edu_performance: true,
            year_start: true,
            isCurrent: true,
            year_end: true,
            edu_university: true,
          },
        }),
      ]);
      set.status = 200;
      return {
        workExprerience: [...workExprerience, ...study_ex],
        totalPage: Math.ceil(total / 10) < 1 ? 1 : Math.ceil(total / 10),
        dataAvg: {
          workTimes,
          workTimes,
          avgSalary: avgSalary._avg.salary,
          maxSalary: avgSalary._max.salary,
          minSalary: minSalary._min.salary,
          currentSalary: currentSalary._sum.salary,
        },
      };
    } catch (err) {
      console.error(err);
      set.status = 500;
    }
  },
  delete_work: async ({ params, set, query }) => {
    try {
      const { id } = params;
      const { std } = query;

      if (std) {
        const del = await prisma.studey_expreriences.delete({
          where: {
            id: Number(id),
          },
        });
        if (!del) return (set.status = 400);
        set.status = 200;
        return { ok: true };
      }
      const del = await prisma.work_expreriences.delete({
        where: {
          id: Number(id),
        },
      });
      if (!del) return (set.status = 400);

      set.status = 200;
      return { ok: true };
    } catch (err) {
      console.error(err);
      set.status = 500;
      return { err };
    }
  },
  work_update: async ({ body, params, set, query }) => {
    try {
      const { id } = params;
      if (!id) return (set.status = 400);
      const {
        salary,
        edu_level,
        edu_faculty,
        edu_dep,
        edu_university,
        year_start,
        year_end,
        edu_performance,
        continued_study,
        isCurrent,
        ...rest
      } = body;

      const { std } = query;

      if (std) {
        const update = await prisma.studey_expreriences.update({
          where: {
            id: Number(id),
          },
          data: {
            place: body?.company_place,
            isCurrent,
            edu_level,
            edu_faculty,
            edu_dep,
            edu_university,
            year_start,
            year_end,
            edu_performance,
            continued_study,
            updatedAt: new Date(),
          },
        });
        if (!update) return (set.status = 400);

        set.status = 200;
        return { ok: true };
      }
      const update = await prisma.work_expreriences.update({
        where: {
          id: Number(id),
        },
        data: {
          alumni: {
            update: {
              updatedAt: new Date(),
            },
          },
          salary: Number(salary),
          ...rest,
          updatedAt: new Date(),
        },
      });
      if (!update) return (set.status = 400);

      set.status = 200;
      return { ok: true };
    } catch (err) {
      console.error(err);
      set.status = 500;
      return { err };
    }
  },
  update_password: async ({ body, store, set }) => {
    try {
      const id = store.user.id;
      const role = store.user.roleId;
      const { currentPass, newPass } = body;

      let user;
      if (role < 2) {
        user = await prisma.alumni.findUnique({
          where: {
            alumni_id: id,
          },
          select: {
            passwordHash: true,
          },
        });
      } else {
        user = await prisma.professor.findUnique({
          where: {
            professor_id: id,
          },
          select: {
            passwordHash: true,
          },
        });
      }
      if (!user) set.status = 400;

      const isMatch = await bcryptjs.compare(
        currentPass,
        user.passwordHash || "",
      );
      if (role < 2 && !isMatch) {
        return { err: "รหัสผ่านปัจจุบันไม่ถูกต้อง" };
      }

      const salt = await bcryptjs.genSalt(12);
      const hash = await bcryptjs.hash(newPass, salt);

      let update;
      if (role < 2) {
        update = await prisma.alumni.update({
          where: {
            alumni_id: id,
          },
          data: {
            passwordHash: hash,
          },
        });
      } else {
        update = await prisma.professor.update({
          where: {
            professor_id: id,
          },
          data: {
            passwordHash: hash,
          },
        });
      }

      if (!update) return (set.status = 400);

      set.headers["Set-Cookie"] =
        `token=; HttpOnly; Secure; Path=/; SameSite=Strict; Max-Age=0`;

      set.status = 200;
      return { ok: true };
    } catch (err) {
      console.error(err);
      set.status = 500;
      return { err };
    }
  },
  alumni_list: async ({ query, set, store }) => {
    try {
      const {
        page,
        fac,
        dep,
        search,
        sort,
        take,
        selectYearStart,
        selectYearEnd,
        selectEduLevel,
      } = query;

      const type = 1;
      const skip = take * (Number(page) - 1);

      const facQuery = fac ? { facultyId: fac } : {};
      let depIdQuery = dep ? { departmentId: dep } : {};
      const yearStartQ =
        selectYearStart && type < 2 ? { year_start: selectYearStart } : {};
      const yearEndQ =
        selectYearEnd && type < 2 ? { year_end: selectYearEnd } : {};
      const searchEdulevel = type < 2 ? { edu_levelId: selectEduLevel } : {};

      // search conditions
      const searchConditions = search
        ? [
            { prefix: { contains: search, mode: "insensitive" } },
            { fname: { contains: search, mode: "insensitive" } },
            { lname: { contains: search, mode: "insensitive" } },
            {
              year_start: {
                contains: search,
              },
            },
            {
              year_end: {
                contains: search,
              },
            },
          ]
        : [];

      if (search && type < 2) {
        searchConditions.push({
          work_expreriences: {
            some: {
              OR: [
                { company_place: { contains: search, mode: "insensitive" } },
                { job_position: { contains: search, mode: "insensitive" } },
              ],
            },
          },
        });
      }

      const searchQuery = search ? { OR: searchConditions } : {};

      // เลือก model และ select ตาม type
      const isAlumni = Number(type) === 1;
      const model = isAlumni ? prisma.alumni : prisma.professor;
      const sorting = isAlumni ? JSON.parse(sort) : {};
      const select = isAlumni
        ? {
            alumni_id: true,
            prefix: true,
            fname: true,
            lname: true,
            facultyId: true,
            departmentId: true,
            updatedAt: true,
            year_start: true,
            year_end: true,
            regis_alumni: {
              select: {
                isApproved: true,
                id: true,
              },
            },
          }
        : {
            professor_id: true,
            prefix: true,
            fname: true,
            lname: true,
            facultyId: true,
            departmentId: true,
            academic_rank: true,
            univercity_position: true,
          };

      // ดึงข้อมูล + count ใน Promise.all
      const [list, count] = await Promise.all([
        model.findMany({
          take: Number(take),
          skip,
          where: {
            ...facQuery,
            ...depIdQuery,
            ...searchQuery,
            ...yearEndQ,
            ...yearStartQ,
            ...searchEdulevel,
          },
          select,
          orderBy: {
            ...sorting,
          },
        }),
        model.count({
          where: {
            ...facQuery,
            ...depIdQuery,
            ...searchQuery,
            ...yearEndQ,
            ...yearStartQ,
            ...searchEdulevel,
          },
        }),
      ]);

      set.status = 200;
      return {
        data: list,
        totalPage: Math.max(1, Math.ceil(count / take)),
        all: count,
      };
    } catch (err) {
      console.error(err);
      set.status = 500;
      return { err };
    }
  },
  get_user_byId: async ({ params, set }) => {
    try {
      const { id, roleId } = params;
      if (!id || !roleId) return (set.status = 400);

      let user;
      if (Number(roleId < 2)) {
        const [data, contract, workTimes, avgSalary, currentSalary] =
          await Promise.all([
            prisma.alumni.findUnique({
              where: {
                alumni_id: id,
              },
              select: {
                year_start: true,
                alumni_id: true,
                prefix: true,
                fname: true,
                lname: true,
                facultyId: true,
                departmentId: true,
                year_end: true,
                updatedAt: true,
                profile: true,
                work_expreriences: {
                  select: {
                    id: true,
                    job_position: true,
                    company_name: true,
                    company_place: true,
                    start_date: true,
                    end_date: true,
                    isCurrent: true,
                    job_detail: true,
                    remark: true,
                  },
                  orderBy: {
                    isCurrent: "desc",
                  },
                },
                study_expreriences: {
                  select: {
                    id: true,
                    alumniId: true,
                    continued_study: true,
                    edu_dep: true,
                    edu_faculty: true,
                    edu_level: true,
                    place: true,
                    edu_performance: true,
                    year_start: true,
                    isCurrent: true,
                    year_end: true,
                    edu_university: true,
                  },
                },
                user_privacy: {
                  select: {
                    seeAddress: true,
                    seeEmail: true,
                    seeFacebook: true,
                    seePhone: true,
                    seeWorkExprerience: true,
                    seeProfile: true,
                    seeSalary: true,
                  },
                },
              },
            }),
            prisma.alumni_contract.findUnique({
              where: {
                alumniId: id,
              },
              select: {
                facebook: true,
                email1: true,
                email2: true,
                phone1: true,
                phone2: true,
                address: true,
                province: true,
                tambon: true,
                amphure: true,
                zipcode: true,
              },
            }),
            prisma.work_expreriences.count({
              where: {
                alumniId: id,
              },
            }),
            prisma.work_expreriences.aggregate({
              where: {
                alumniId: id,
              },
              _avg: {
                salary: true,
              },
              _max: {
                salary: true,
              },
              _min: {
                salary: true,
              },
            }),
            prisma.work_expreriences.aggregate({
              where: {
                alumniId: id,

                isCurrent: true,
              },
              _sum: {
                salary: true,
              },
            }),
          ]);

        user = {
          ...data,
          ...contract,
          workTimes,
          avgSalary: avgSalary._avg.salary,
          maxSalary: avgSalary._max.salary,
          minSalary: avgSalary._min.salary,
          currentSalary: currentSalary._sum.salary,
        };
      } else {
        user = await prisma.professor.findUnique({
          where: {
            professor_id: id,
          },
          select: {
            professor_id: true,
            prefix: true,
            fname: true,
            lname: true,
            academic_rank: true,
            univercity_position: true,
            facultyId: true,
            profile: true,
            departmentId: true,
            user_privacy: {
              select: {
                seeAddress: true,
                seeEmail: true,
                seeFacebook: true,
                seePhone: true,
                seeProfile: true,
              },
            },
          },
        });
        const contract = await prisma.alumni_contract.findFirst({
          where: {
            professorProfessor_id: id,
          },
          select: {
            facebook: true,
            email1: true,
            email2: true,
            phone1: true,
            phone2: true,
            address: true,
            province: true,
            tambon: true,
            amphure: true,
            zipcode: true,
          },
        });
        user = {
          ...user,
          ...contract,
        };
      }

      if (!user) return (set.status = 400);

      set.status = 200;
      return user;
    } catch (err) {
      console.error(err);
      set.status = 500;
      return { err };
    }
  },
  send_email: async ({ body, set, store }) => {
    try {
      const { id, text, roleId, sendMyContact } = body;
      if (!id || !text || !roleId) return (set.status = 400);

      const senderRole = Number(store.user.roleId);

      let sender;
      if (senderRole < 2) {
        sender = await prisma.alumni.findUnique({
          where: {
            alumni_id: store.user.id,
          },
          select: {
            prefix: true,
            fname: true,
            lname: true,
          },
        });
      } else {
        sender = await prisma.professor.findUnique({
          where: {
            professor_id: store.user.id,
          },
          select: {
            prefix: true,
            fname: true,
            lname: true,
            academic_rank: true,
          },
        });
      }

      let emailTo;
      let toUserPrivacy;
      if (Number(roleId) < 2) {
        emailTo = await prisma.alumni_contract.findUnique({
          where: {
            alumniId: id,
          },
          select: {
            email1: true,
            email2: true,
            phone1: true,
            phone2: true,
            facebook: true,
          },
        });
        toUserPrivacy = await prisma.user_privacy.findUnique({
          where: {
            alumniId: id,
          },
          select: {
            allowedAlumniSendEmail: true,
            allowedProfessorSendEmail: true,
          },
        });
      } else {
        emailTo = await prisma.alumni_contract.findUnique({
          where: {
            professorProfessor_id: id,
          },
          select: {
            email1: true,
            email2: true,
            phone1: true,
            phone2: true,
            facebook: true,
          },
        });
        toUserPrivacy = await prisma.user_privacy.findUnique({
          where: {
            professorId: id,
          },
          select: {
            allowedAlumniSendEmail: true,
            allowedProfessorSendEmail: true,
          },
        });
      }
      if (!emailTo?.email1 && !emailTo?.email2) {
        return { err: "ไม่พบอีเมลที่สามารถส่งได้" };
      }

      if (
        (senderRole < 2 && !toUserPrivacy?.allowedAlumniSendEmail) ||
        (senderRole >= 2 && !toUserPrivacy?.allowedProfessorSendEmail)
      ) {
        return { err: "ผู้ใช้คนนี้ปฏิเสธการรับข้อความจากคุณ" };
      }

      let senderContactText = "";
      if (sendMyContact) {
        let senderContact = null;
        if (senderRole < 2) {
          senderContact = await prisma.alumni_contract.findFirst({
            where: {
              alumniId: store?.user?.id,
            },
            select: {
              email1: true,
              email2: true,
              phone1: true,
              phone2: true,
              facebook: true,
            },
          });
        } else {
          senderContact = await prisma.alumni_contract.findFirst({
            where: {
              professorProfessor_id: store?.user?.id,
            },
            select: {
              email1: true,
              email2: true,
              phone1: true,
              phone2: true,
              facebook: true,
            },
          });
        }

        senderContactText = `โปรดติดต่อกลับทางช่องทางเหล่านี้\nEmail:${
          senderContact?.email1 || senderContact?.email2
        }\n${senderContact?.phone1 ? `Call : ${senderContact?.phone1}` : ""}${
          senderContact?.phone2 ? `\nCall : ${senderContact?.phone2}` : ""
        }${
          senderContact?.facebook
            ? `\nFacebook : ${senderContact?.facebook}`
            : ""
        }`;
      }

      const mailOptions = {
        from: emailTo?.email1 || emailTo?.email2,
        to: emailTo?.email1 || emailTo.email2,
        subject:
          "มีผู้ส่งข้อความหาคุณผ่านระบบสารสนเทศเครือข่ายศิษย์เก่ามหาวิทยาลัยราชภัฏมหาสารคาม",
        text: `ข้อความจาก${
          senderRole < 2 ? sender?.prefix || "" : sender?.academic_rank
        }${sender?.fname} ${sender.lname} ถึงคุณ${sender.fname} ${
          sender.lname
        }\n"${text}"\n\n${senderContactText}`,
      };

      await transporter.sendMail(mailOptions);
      await prisma.sendTextHistory.create({
        data: {
          sender_type: senderRole < 2 ? "alumni" : "professor",
          detail: text,
          title:
            senderRole < 2
              ? "ศิษย์เก่าส่งข้อความหาศิษย์เก่า"
              : "อาจารย์ส่งข้อความถึงศิษย์เก่า",
          ...(senderRole < 2
            ? {
                alumni: {
                  connect: {
                    alumni_id: store.user.id,
                  },
                },
              }
            : {
                professor: {
                  connect: {
                    professor_id: store.user.id,
                  },
                },
              }),
          alumniId: id,
        },
      });
      set.status = 200;
      return { ok: true };
    } catch (err) {
      console.error(err);
      set.status = 500;
      return { err };
    }
  },
  get_alumni_list: async ({ set, query }) => {
    try {
      const {
        facultyId,
        search,
        departmentId,
        selectYearStart,
        selectYearEnd,
        take,
        sort,
        page,
        regis_status,
        selectEduLevel,
      } = query;
      const skip = Number(take) * (Number(page) - 1);
      let filter = {};
      if (search) {
        filter = {
          OR: [
            {
              alumni_id: {
                contains: search,
                mode: "insensitive",
              },
            },
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
          ],
        };
      }
      if (facultyId) {
        filter = {
          ...filter,
          facultyId,
        };
      }
      if (departmentId) {
        filter = {
          ...filter,
          departmentId,
        };
      }
      if (regis_status !== "all" && regis_status !== "no-regis") {
        filter = {
          ...filter,
          regis_alumni: {
            isApproved: regis_status,
          },
        };
      }
      if (regis_status === "no-regis") {
        filter = {
          ...filter,
          regis_alumni: null,
        };
      }
      if (selectYearStart) {
        filter = {
          ...filter,
          year_start: selectYearStart,
        };
      }
      if (selectYearEnd) {
        filter = {
          ...filter,
          year_end: selectYearEnd,
        };
      }
      if (selectEduLevel) {
        filter = {
          ...filter,
          edu_levelId: selectEduLevel,
        };
      }

      const [data, total] = await Promise.all([
        prisma.alumni.findMany({
          take: Number(take),
          skip,
          orderBy: {
            ...JSON.parse(sort),
          },
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
        }),
        prisma.alumni.count({ where: filter }),
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
  edit_regis_get_otp: async ({ set, body }) => {
    try {
      const { alumni_id } = body;
      console.log("🚀 ~ body:", body);
      if (!alumni_id) return (set.status = 400);

      const alumni = await prisma.regis_alumni.findFirst({
        where: { alumni_id },
      });
      if (!alumni)
        return { err: "ไม่พบข้อมูลการลงทะเบียน ไม่สามารถดำเนินการได้" };

      const otp = randomNum();
      await prisma.$transaction(async (t) => {
        await t.otp.deleteMany({
          where: {
            alumniId: alumni_id,
          },
        });
        const newOTP = await t.otp.create({
          data: {
            code: otp,
            alumniId: alumni_id,
          },
        });
        if (!newOTP) return (set.status = 400);

        // sendmail
        const mailOptions = {
          from: envConfig.mail_user,
          to: alumni_id + "@rmu.ac.th",
          subject: "รหัสยืนยันตัวตนขอแก้ไขหลักฐานการชำระค่าลงทะเบียน",
          text: `รหัสยืนยันตัวตนสำหรับแก้ไขหลักฐานการชำระค่าลงทะเบียนของคุณ\n"${otp}"`,
        };

        await transporter.sendMail(mailOptions);

        set.status = 200;
        return { ok: true };
      });
    } catch (error) {
      console.error(error);
      set.status = 500;
      return { error };
    }
  },
  regis_edit_check_otp: async ({ set, body }) => {
    try {
      const { otp, alumni_id } = body;
      if (!otp || !alumni_id) return (set.status = 400);

      const findCorrectOTP = await prisma.otp.findFirst({
        where: {
          code: otp,
          alumniId: alumni_id,
        },
      });
      if (!findCorrectOTP) return { err: "รหัสยืนยันตัวตนไม่ถูกต้อง" };

      await prisma.otp.deleteMany({
        where: {
          code: otp,
          alumniId: alumni_id,
        },
      });

      const regisData = await prisma.regis_alumni.findFirst({
        where: {
          alumni_id,
        },
        select: {
          slip_payment_url: true,
          tel: true,
          id: true,
        },
      });

      set.status = 200;
      return { ok: true, regisData };
    } catch (error) {
      console.error(error);
      set.status = 500;
      return { error };
    }
  },
  regis_edit_slip: async ({ set, body }) => {
    try {
      const { regisDataId, alumni_id, slip, tel } = body;
      if (!regisDataId || !alumni_id || !slip || !tel)
        return (set.status = 400);

      const oldRegisData = await prisma.regis_alumni.findFirst({
        where: {
          alumni_id,
        },
        select: {
          id: true,
          slip_payment_url: true,
        },
      });
      if (!oldRegisData) return (set.status = 400);

      // delete old slip
      const sftp = await sftpConfig();
      // ลบไฟล์ในเครื่อง
      const imgPath = path.join(
        import.meta.dir,
        "../public/upload",
        oldRegisData.slip_payment_url,
      );
      if (existsSync(imgPath)) {
        await unlink(imgPath);
        const remotePath =
          process.env.SFTP_PATH + oldRegisData.slip_payment_url;
        await sftp.delete(remotePath);
      }

      const sanitizedName =
        slip?.name?.replace(/[^a-zA-Z0-9.-]/g, "_") || "image.jpg";
      const imgName = `${Date.now()}_${sanitizedName}`;

      // Local path (Windows)
      const localPath = `./public/upload/${imgName}`;
      const remotePath = process.env.SFTP_PATH + imgName;

      // บันทึกไฟล์ใน local
      await Bun.write(localPath, slip);

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

      // บันทึกลงฐานข้อมูล
      const update = await prisma.regis_alumni.update({
        where: {
          id: Number(regisDataId),
        },
        data: {
          tel,
          slip_payment_url: imgName,
          updatedAt: new Date(),
        },
        select: {
          alumni: {
            select: {
              alumni_id: true,
              fname: true,
              prefix: true,
              lname: true,
            },
          },
        },
      });
      if (!update) return (set.status = 400);

      // notify rmu email
      const setting = await prisma.setting.findMany({
        select: {
          notify_email: true,
          allowedNotifyAlumniEditRegis: true,
        },
      });

      if (setting[0].allowedNotifyAlumniEditRegis) {
        const mailOptions = {
          from: envConfig.mail_user,
          to: setting[0].notify_email || envConfig.mail_user,
          subject: "แจ้งเตือน: มีการแก้ไขข้อมูลการลงทะเบียนศิษย์เก่า",
          text: `
เรียน ผู้ดูแลระบบ

มีนักศึกษาได้ทำการแก้ไขข้อมูลการลงทะเบียนศิษย์เก่าในระบบเรียบร้อยแล้ว

รายละเอียดผู้ลงทะเบียน
- รหัสนักศึกษา: ${update.alumni.alumni_id}
- ชื่อ-นามสกุล: ${update.alumni.prefix}${update.alumni.fname} ${update.alumni.lname}
- อีเมล: ${update.alumni.alumni_id || "-"}@rmu.ac.th
- วันเวลา: ${new Date().toLocaleString("th-TH")}

กรุณาเข้าสู่ระบบสารสนเทศเครือข่ายศิษย์เก่าเพื่อตรวจสอบข้อมูลและดำเนินการพิจารณาต่อไป

ระบบสารสนเทศเครือข่ายศิษย์เก่า
มหาวิทยาลัยราชภัฏมหาสารคาม
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
};
