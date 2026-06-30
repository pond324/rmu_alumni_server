import Elysia from "elysia";
import { alumniController } from "../controller/alumni.controller";
import { middleware } from "../middleware/auth.middleware";

export const alumniRoutes = new Elysia({ prefix: "/alumni" })

  // get profile
  .get("/profile", alumniController.profile, { beforeHandle: middleware.auth })
  // update contact
  .post("/update-contact", alumniController.update_contact, {
    beforeHandle: middleware.auth,
  })
  // upload profile img
  .post("/upload-profile", alumniController.upload_profile, {
    beforeHandle: middleware.auth,
  })
  // delete profile img
  .delete("/delete-profile", alumniController.delete_profile, {
    beforeHandle: middleware.auth,
  })
  // update live
  .post("/update-live", alumniController.update_live, {
    beforeHandle: middleware.auth,
  })
  // privacy
  .get("/privacy", alumniController.get_privacy, {
    beforeHandle: middleware.auth,
  })
  // update privacy
  .post("/privacy-update", alumniController.update_privacy, {
    beforeHandle: middleware.auth,
  })
  // create work exprerience
  .post("/work-create", alumniController.work_create, {
    beforeHandle: middleware.auth,
  })
  // get work exprerience
  .get("/work-list/:alumniId", alumniController.work_list, {
    beforeHandle: middleware.auth,
  })
  // delete work
  .delete("/work-delete/:id", alumniController.delete_work, {
    beforeHandle: middleware.auth,
  })
  // update work
  .post("/work-update/:id", alumniController.work_update, {
    beforeHandle: middleware.auth,
  })
  // change-password
  .put("/change-password", alumniController.update_password, {
    beforeHandle: middleware.auth,
  })
  // search data list
  .get("/search-user", alumniController.alumni_list, {
    beforeHandle: middleware.auth,
  })
  // get user by id
  .get("/user/:id/:roleId", alumniController.get_user_byId, {
    beforeHandle: middleware.auth,
  })
  // send emai;
  .post("/send-email", alumniController.send_email, {
    beforeHandle: middleware.auth,
  })
  // get contract
  .get("/contract", alumniController.get_contract, {
    beforeHandle: middleware.auth,
  })
  // regis alumni list
  .get("/regis-alumni-list", alumniController.get_alumni_list)
  // regis edit get otp
  .post("/regis-otp-edit", alumniController.edit_regis_get_otp)
  // regis edit check otp
  .post("/edit-regis-otp-check",alumniController.regis_edit_check_otp)
  // regis edit slip
  .put("/regis-edit-slip",alumniController.regis_edit_slip)
