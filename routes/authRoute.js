import Elysia from "elysia";
import { authController } from "../controller/auth.controller";
import { middleware } from "../middleware/auth.middleware";
import { rateLimit } from "elysia-rate-limit";

const authRoutes = new Elysia({ prefix: "/auth" })

  // login
  .guard((app) =>
    app
      .use(
        rateLimit({
          duration: 15 * 60 * 1000,
          max: 20,
          errorResponse: "พยายามเข้าสู่ระบบหรือส่งคำขอบ่อยเกินไป กรุณาลองใหม่ในอีก 15 นาที"
        })
      )
      .post("/login", authController.login)
      // auth otp
      .post("/key-auth", authController.authSuccess)
      // register
      .post("/regis-check-user", authController.regis_checkuser)
      // check otp regis
      .post("/regis-check-otp", authController.regis_checkotp)
      // register alumni
      .post("/regis-alumni", authController.regis_create_password)
      // upload slip
      .post("/regis-upload-slip", authController.regis_upload_slip)
  )

  // check login
  .get("/check-user", authController.checkLogin, {
    beforeHandle: middleware.auth,
  })
  // logout
  .get("/log-out", authController.logout, { beforeHandle: middleware.auth })
  // forgot password check
  .post("/forgot-pass/checkuser", authController.forgotpass_checkuser)
  // save new pass
  .put("/forgot-pass/newpass", authController.forgotpass_newpass)


export default authRoutes;
