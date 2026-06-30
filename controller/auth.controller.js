import { envConfig, transporter } from "../config/config";
import bcryptjs from "bcryptjs";
import prisma from "../libs/prisma";
import { sftpConfig } from "../config/config";

export const randomNum = () => {
  return Math.floor(Math.random() * 1000000)
    .toString()
    .padStart(6, "0");
};

export const authController = {
  login: async ({ body, set, jwt }) => {
    try {
      const { username, password } = body;

      if (!username || !password) {
        return (set.status = 400);
      }

      let user = await prisma.alumni.findUnique({
        where: {
          alumni_id: username,
        },
        select: {
          fname: true,
          alumni_id: true,
          allowedAccount: true,
          passwordHash: true,
          canUse: true,
        },
      });
      let roleId = 1;

      const isAlumniRegis = await prisma.regis_alumni.findFirst({
        where: {
          alumni_id: username,
        },
        select: {
          isApproved: true,
        },
      });

      if (user?.alumni_id && !isAlumniRegis) {
        return { err: "กรุณาลงทะเบียนบัณฑิตเพื่อเข้าใช้งานระบบ" };
      }
      if (user?.alumni_id && user.passwordHash) {
        if (isAlumniRegis.isApproved === "pending") {
          return {
            err: "บัญชีของคุณอยู่ระหว่างรอผู้ดูแลตรวจสอบและอนุมัติการลงทะเบียน โดยจะแจ้งผลการลงทะเบียนทางอีเมลภายใน 1-2 วัน",
          };
        }
        if (isAlumniRegis.isApproved === "refuse") {
          return {
            err: "การลงทะเบียนศิษย์เก่าของคุณถูกปฏิเสธ ระบบได้แจ้งสาเหตุและขั้นตอนการดำเนินการต่อไปทางอีเมลของคุณแล้ว!",
          };
        }
      }

      // aj , executive
      if (!user) {
        user = await prisma.professor.findUnique({
          where: {
            professor_id: username,
          },
          select: {
            professor_id: true,
            univercity_position: true,
            passwordHash: true,
            canUse: true,
            email: true,
            fname: true,
            allowedAccount: true,
          },
        });

        if (user) {
          roleId = 2;

          const aj_role = user.univercity_position;
          if (aj_role.includes("รองคณบดี") || aj_role.includes("คณบดี")) {
            roleId = 3;
          }
          if (
            aj_role.includes("รองอธิการบดี") ||
            aj_role.includes("อธิการบดี")
          ) {
            roleId = 4;
          }
        }
      }

      // admin
      if (!user) {
        user = await prisma.admin.findUnique({
          where: {
            username,
          },
          select: {
            fname: true,
            admin_id: true,
            passwordHash: true,
          },
        });
        if (!user) {
          return { err: "ไม่พบข้อมูลผู้ใช้งาน" };
        }

        // updateLoadin
        await prisma.admin.update({
          where: { username },
          data: {
            lastestLogin: new Date(),
          },
        });

        // check password
        const isPassMatch = await bcryptjs.compare(password, user.passwordHash);
        if (!isPassMatch) return { err: "รหัสผ่านไม่ถูกต้อง" };
        roleId = 5;
        const payload = {
          id: user.admin_id,
          fname: user?.fname,
          signInDate: Date.now(),
          roleId,
        };
        const token = await jwt.sign(payload);
        set.headers["Set-Cookie"] =
          `token=${token}; HttpOnly; Secure; Path=/; SameSite=Strict; Max-Age=86400`;
        set.status = 200;
        return {
          roleId,
          ok: true,
        };
      }

      // ตรวจสอบสถานะบัญชี
      if (!user.canUse) {
        set.status = 400;
        return {
          err: "บัญชีของคุณถูกระงับอยู่ในขณะนี้ โปรดติดต่อผู้เกี่ยวข้อง",
        };
      }

      const authNum = String(randomNum());

      // ลบ otp เก่าทิ้งก่อนสร้างใหม่ทุกครั้ง
      await prisma.otp.deleteMany({
        where: {
          ...(roleId === 1
            ? { alumniId: user.alumni_id }
            : { professorId: user.professor_id }),
        },
      });

      // เข้าสู่ระบบครั้งแรก ของอาจารย์และผู้บริหารที
      if (!user.allowedAccount) {
        if (username !== password) {
          return { err: "รหัสผ่านไม่ถูกต้อง" };
        }

        if (!user?.email) {
          return {
            err: "ไม่พบอีเมลของท่าน โปรดติดต่อเจ้าหน้าที่ผู้เกี่ยวข้อง",
          };
        }

        // บันทึก otp
        await prisma.otp.create({
          data: {
            code: authNum,
            professorId: user.professor_id,
          },
        });
        const mailOptions = {
          from: envConfig.mail_user,
          to: user.email,
          subject: "เข้าสู่ระบบครั้งแรก",
          text: `รหัสยืนยันตัวตนเข้าใช้งาน\nระบบสารสนเทศเครือข่ายศิษย์เก่า มหาวิทยาลัยราชภัฏมหาสารคามของคุณ${
            user.fname || ""
          } \n"${authNum}"`,
        };

        await transporter.sendMail(mailOptions);
        return {
          isFirstLogin: true,
          user: user?.professor_id,
          email: user.email,
        };
      }

      //   ยังไม่เปลี่ยนรหัสผ่าน
      if (username === password && roleId > 1) {
        const professor = await prisma.professor.findUnique({
          where: {
            professor_id: username,
          },
          select: {
            email: true,
          },
        });
        const toEmail = professor.email;
        if (!toEmail) {
          return {
            err: "คุณยังไม่เปลี่ยนรหัสผ่านและไม่พบอีเมลเพื่อส่งรหัสยืนยันตัวตน โปรดติดต่อเจ้าที่ผู้เกี่ยวข้อง",
          };
        }

        // บันทึก otp
        await prisma.otp.create({
          data: {
            code: authNum,
            professorId: user.professor_id,
          },
        });

        const mailOptions = {
          from: envConfig.mail_user,
          to: toEmail,
          subject: "รหัสยืนยันตัวตนเข้าใช้งานระบบ",
          text: `รหัสยืนยันตัวตนเข้าใช้งาน\nระบบสารสนเทศเครือข่ายศิษย์เก่า มหาวิทยาลัยราชภัฏมหาสารคามของ${user.fname} \n"${authNum}"`,
        };
        // console.log("🚀 ~ mailOptions:", mailOptions)

        await transporter.sendMail(mailOptions);
        return {
          isFirstLogin: true,
          key: authNum,
          user: user?.alumni_id || user?.professor_id,
          email: toEmail,
        };
      } else {
        const isMatch = await bcryptjs.compare(
          password,
          user.passwordHash || "",
        );
        if (!isMatch) {
          return { err: "รหัสผ่านไม่ถูกต้อง" };
        }
        const payload = {
          id: roleId < 2 ? user?.alumni_id : user?.professor_id,
          signInDate: Date.now(),
          ...(roleId > 1 && roleId < 5 && {position:user?.univercity_position}),
          roleId,
        };
        const token = await jwt.sign(payload);
        set.headers["Set-Cookie"] =
          `token=${token}; HttpOnly; Secure; Path=/; SameSite=Strict; Max-Age=86400`;
        set.status = 200;
        return {
          roleId,
          ok: true,
        };
      }
    } catch (error) {
      console.error(error);
      set.status = 500;
      return { error };
    }
  },

  authSuccess: async ({ body, set, jwt }) => {
    try {
      const { username: userId, code } = body;
      if (!userId || !code) {
        set.status = 400;
        return { err: "user not found" };
      }

      let user = {};
      let roleId = 1;
      user = await prisma.alumni // find user
        .findUnique({
          where: {
            alumni_id: userId,
          },
          select: {
            allowedAccount: true,
            alumni_id: true,
          },
        });
      if (!user) {
        user = await prisma.professor.findUnique({
          where: {
            professor_id: userId,
          },
          select: {
            allowedAccount: true,
            professor_id: true,
            univercity_position: true,
          },
        });
        roleId = 2;

        const aj_role = user.univercity_position;
        if (aj_role.includes("รองคณบดี") || aj_role.includes("คณบดี")) {
          roleId = 3;
        }
        if (aj_role.includes("รองอธิการบดี") || aj_role.includes("อธิการบดี")) {
          roleId = 4;
        }
      }

      // check otp
      const otp = await prisma.otp.findFirst({
        where: {
          code,
          ...(roleId === 1
            ? { alumniId: user.alumni_id }
            : { professorId: user.professor_id }),
        },
      });
      if (!otp) {
        return { err: "รหัสยืนยันตัวตนไม่ถูกต้อง" };
      }

      // otp correct then delete otp
      await prisma.otp.deleteMany({
        where: {
          code,
          ...(roleId === 1
            ? { alumniId: user.alumni_id }
            : { professorId: user.professor_id }),
        },
      });

      if (!user.allowedAccount) {
        if (user.alumni_id) {
          const facultyId = Number(userId.substring(3, 5));
          const depId = Number(userId.substring(4, 8));
          const salt = await bcryptjs.genSalt(12);
          const hash = await bcryptjs.hash(userId, salt);
          await prisma.alumni.update({
            where: {
              alumni_id: userId,
            },
            data: {
              allowedAccount: true,
              passwordHash: hash,
              facultyId,
              departmentId: depId,
              year_start: Number(
                `${new Date().getFullYear() + 543}`.substring(0, 2) +
                  `${user.alumni_id}`.substring(0, 2),
              ),
            },
          });
        } else {
          await prisma.professor.update({
            where: {
              professor_id: userId,
            },
            data: {
              allowedAccount: true,
            },
          });
        }

        const hadPrivacy = await prisma.user_privacy.findFirst({
          where: {
            ...(user?.alumni_id
              ? { alumniId: userId }
              : { professorId: userId }),
          },
        });
        if (!hadPrivacy) {
          await prisma.user_privacy.create({
            data: {
              ...(user?.alumni_id
                ? { alumniId: userId }
                : { professorId: userId }),
            },
          });
        }
      }

      const payload = {
        id: user.alumni_id || user?.professor_id,
        signInDate: Date.now(),
         ...(roleId > 1 && roleId < 5 && {position:user?.univercity_position}),
        roleId,
      };
      const token = await jwt.sign(payload);
      set.headers["Set-Cookie"] =
        `token=${token}; HttpOnly; Secure; Path=/; SameSite=Strict; Max-Age=86400`;

      set.status = 200;
      return {
        roleId: 1,
        ok: true,
      };
    } catch (err) {
      console.error(err);
      set.status = 500;
      return { err };
    }
  },

  checkLogin: async ({ store, set }) => {
    try {
      const user = store.user;
      const roleId = store.user.roleId;
      if (!user) {
        return (set.status = 400);
      }

      let data;
      if (roleId < 2) {
        data = await prisma.alumni.findFirst({
          where: {
            alumni_id: user?.id,
          },
          select: {
            profile: true,
            fname: true,
          },
        });
      } else {
        data = await prisma.professor.findFirst({
          where: {
            professor_id: user?.id,
          },
          select: {
            profile: true,
            facultyId: true,
            departmentId: true,
            fname: true,
          },
        });
      }

      set.status = 200;
      return {
        ...user,
        ...data,
      };
    } catch (err) {
      console.error(err);
      set.status = 500;
      return { err };
    }
  },
  logout: ({ set }) => {
    set.headers["Set-Cookie"] =
      `token=; HttpOnly; Secure; Path=/; SameSite=Strict; Max-Age=0`;

    set.status = 200;
    return { ok: true };
  },
  forgotpass_checkuser: async ({ body, set }) => {
    try {
      const { username } = body;
      if (!username) return (set.status = 400);

      let user;
      user = await prisma.alumni.findUnique({
        where: {
          alumni_id: username,
        },
        select: {
          fname: true,
          allowedAccount: true,
          alumni_contract: {
            select: {
              email1: true,
              email2: true,
            },
          },
        },
      });
      let isAlumni = true;
      if (!user) {
        user = await prisma.professor.findUnique({
          where: {
            professor_id: username,
          },
          select: {
            email: true,
            fname: true,
          },
        });
        isAlumni = false;

        if (!user) {
          return { err: "ไม่พบผู้ใช้งาน" };
        }
      }

      if (isAlumni && !user.allowedAccount) {
        return {
          err: "พบว่าคุณยังไม่เคยเข้าสู่ระบบสารสนเทศเครือข่ายศิษย์เก่า โปรดอ่านรายละเอียดที่หน้าแรก",
        };
      }

      if (
        isAlumni &&
        !user.alumni_contract.email1 &&
        !user.alumni_contract.email2
      ) {
        return { err: "ไม่พบอีเมล โปรดติดต่อเจ้าหน้าที่ผู้ประสานงาน" };
      }

      const authNum = randomNum();
      const toEmail = isAlumni
        ? user.alumni_contract.email1 || user.alumni_contract.email2
        : user?.email;
      const mailOptions = {
        from: envConfig.mail_user,
        to: toEmail,
        subject: "รหัสยืนยันตัวตนผู้ลืมรหัสผ่าน",
        text: `รหัสยืนยันตัวตนเพื่อเปลี่ยนรหัสผ่านของคุณ${user.fname} \n"${authNum}"`,
      };

      await transporter.sendMail(mailOptions);
      set.status = 200;
      return { ok: true, auth: authNum };
    } catch (err) {
      console.error(err);
      set.status = 500;
      return { err };
    }
  },
  forgotpass_newpass: async ({ body, set }) => {
    try {
      const { newPass, username } = body;
      if (!newPass || !username) return (set.status = 400);

      let update;
      let user;
      user = await prisma.alumni.findUnique({
        where: {
          alumni_id: username,
        },
        select: {
          alumni_id: true,
        },
      });

      const salt = await bcryptjs.genSalt(12);
      const hash = await bcryptjs.hash(newPass, salt);

      if (user) {
        update = await prisma.alumni.update({
          where: {
            alumni_id: username,
          },
          data: {
            passwordHash: hash,
          },
        });
      } else {
        user = await prisma.professor.findUnique({
          where: {
            professor_id: username,
          },
          select: {
            professor_id: true,
          },
        });
        if (!user) {
          return { err: "ไม่พบผู้ใช้งาน" };
        }

        update = await prisma.professor.update({
          where: {
            professor_id: username,
          },
          data: {
            passwordHash: hash,
          },
        });
      }

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
  regis_checkuser: async ({ set, body }) => {
    try {
      const { alumni_id } = body;
      if (!alumni_id) return (set.status = 400);

      const alumni = await prisma.alumni.findUnique({
        where: {
          alumni_id,
        },
        select: {
          passwordHash:true,
          allowedAccount: true,
          regis_alumni: {
            select: {
              isApproved: true,
            },
          },
        },
      });
      if (!alumni) return { err: "ไม่พบข้อมูลนักศึกษา" };
      if (alumni?.regis_alumni?.isApproved === "pending" && alumni.passwordHash) {
        return { err: "ผลการลงทะเบียนของคุณอยู่ระหว่างตรวจสอบโดยผู้ดูแล" };
      }
      if (alumni?.allowedAccount) {
        return {
          err: "พบว่าคุณเคยลงทะเบียนแล้ว โปรดเข้าสู่ระบบด้วยบัญชีของคุณ",
        };
      }

      await prisma.otp.deleteMany({
        where: {
          alumniId: alumni_id,
        },
      });

      const otp = String(randomNum());
      await prisma.otp.create({
        data: {
          code: otp,
          alumniId: alumni_id,
        },
      });

      const mailOptions = {
        from: envConfig.mail_user,
        to: alumni_id + "@rmu.ac.th",
        subject: "รหัสยืนยันตัวตนสำหรับลงทะเบียน",
        text: `รหัสยืนยันตัวตนสำหรับลงทะเบียน\nระบบสารสนเทศเครือข่ายศิษย์เก่า มหาวิทยาลัยราชภัฏมหาสารคามของคุณ \n"${otp}"`,
      };

      await transporter.sendMail(mailOptions);
      set.status = 200;
      return { ok: true, email: alumni_id + "@rmu.ac.th" };
    } catch (error) {
      console.error(error);
      set.status = 500;
      return { error };
    }
  },
  regis_checkotp: async ({ set, body }) => {
    try {
      const { alumni_id, otp } = body;
      if (!alumni_id || !otp) return (set.status = 400);

      const otpCorrect = await prisma.otp.findFirst({
        where: {
          code: otp,
          alumniId: alumni_id,
        },
      });
      if (!otpCorrect) {
        return { err: "รหัสยืนยันตัวตนไม่ถูกต้อง" };
      }

      await prisma.otp.deleteMany({
        where: {
          code: otp,
          alumniId: alumni_id,
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
  regis_create_password: async ({ set, body }) => {
    try {
      const { alumni_id, newPass } = body;
      if (!alumni_id || !newPass) return (set.status = 400);

      const alumni = await prisma.alumni.findFirst({
        where: {
          alumni_id,
        },
        select: {
          prefix: true,
          fname: true,
          lname: true,
          facultyId: true,
          departmentId: true,
          year_start: true,
          year_end: true,
        },
      });
      if (!alumni) return (set.status = 400);

      // อนุญาตให้ลงทะเบียนได้แล้ว และสร้างรหัสผ่านเริ่มต้นเป็นรหัสนักศึกษา
      const facultyId = alumni_id.substring(3, 5);
      const depId = alumni_id.substring(4, 8);
      const salt = await bcryptjs.genSalt(12);
      const hash = await bcryptjs.hash(newPass, salt);
      await prisma.alumni.update({
        where: {
          alumni_id,
        },
        data: {
          passwordHash: hash,
          facultyId: !alumni.facultyId ? facultyId : alumni.facultyId,
          departmentId: !alumni_id.departmentId ? depId : alumni.departmentId,
          year_start:
            `${new Date().getFullYear() + 543}`.substring(0, 2) +
            `${alumni_id}`.substring(0, 2),
        },
      });

      // สร้างช่องทางติดต่อศิษย์เก่า
      await prisma.alumni_contract.create({
        data: {
          alumniId: alumni_id,
          email1: alumni_id + "@rmu.ac.th",
        },
      });

      // สร้างการอนุญาตความเป็นส่วนตัวเริ่มต้น
      await prisma.user_privacy.create({
        data: {
          alumniId: alumni_id,
        },
      });

      set.status = 200;
      return { ok: true, alumni };
    } catch (error) {
      console.error(error);
      set.status = 500;
      return { error };
    }
  },
  regis_upload_slip: async ({ set, body }) => {
    try {
      const { alumni_id, slip, tel } = body;
      if (!alumni_id || !slip || !tel) return (set.status = 400);

      // check if already have slip
      // const hasSlip = await prisma.regis_alumni.findFirst({
      //   where: {
      //     alumni_id: alumni_id,
      //   },
      //   select: {
      //     id: true,
      //     alumni: {
      //       select: {
      //         alumni_id: true,
      //         prefix: true,
      //         lname: true,
      //         fname: true,
      //       },
      //     },
      //   },
      // });
      // if (hasSlip)
      //   return {
      //     err: "พบว่าคุณได้ส่งหลักฐานการชำระเงินแล้ว หากต้องการเปลี่ยนแปลงกรุณาติดต่อเจ้าหน้าที่ผู้ประสานงาน",
      //   };

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

      const newRegisSlip = await prisma.regis_alumni.create({
        data: {
          alumni: {
            connect: {
              alumni_id: alumni_id,
            },
          },
          slip_payment_url: imgName,
          email: alumni_id + "@rmu.ac.th",
          tel,
        },
        select: {
          alumni: {
            select: {
              alumni_id: true,
              prefix: true,
              lname: true,
              fname: true,
            },
          },
        },
      });
      if (!newRegisSlip) return (set.status = 400);

      const setting = await prisma.setting.findMany({
        select: {
          notify_email: true,
          allowedNotifyAlumniRegis: true,
        },
      });
      if (setting[0].allowedNotifyAlumniRegis) {
        const mailOptions = {
          from: envConfig.mail_user,
          to: setting[0].notify_email || envConfig.mail_user,
          subject:
            "แจ้งเตือน: ศิษย์เก่าลงทะเบียนและชำระค่าลงทะเบียนเรียบร้อยแล้ว",
          text: `
เรียน ผู้ดูแลระบบ

มีศิษย์เก่าได้ดำเนินการลงทะเบียนและชำระค่าลงทะเบียนสมาชิกศิษย์เก่าเรียบร้อยแล้ว

รายละเอียดผู้ลงทะเบียน
- รหัสนักศึกษา: ${newRegisSlip.alumni.alumni_id}
- ชื่อ-นามสกุล: ${newRegisSlip.alumni.prefix}${newRegisSlip.alumni.fname} ${newRegisSlip.alumni.lname}
- อีเมล: ${newRegisSlip.alumni.alumni_id || "-"}@rmu.ac.th
- วันเวลา: ${new Date().toLocaleString("th-TH")}

กรุณาเข้าสู่ระบบสารสนเทศเครือข่ายศิษย์เก่าเพื่อตรวจสอบข้อมูลการชำระเงินและดำเนินการพิจารณาอนุมัติสมาชิกต่อไป

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
