import Elysia from "elysia";
import { presidentController } from "../controller/president.controller";
import { middleware } from "../middleware/auth.middleware";

export const presidentRoutes = new Elysia({ prefix: "/president" })
  .get("/year-options", presidentController.get_year_options)
  .get("/alumni-list", presidentController.alumni_list, {
    beforeHandle: middleware.staff,
  })

  // create news
  .post("/create-news", presidentController.create_news, {
    beforeHandle: middleware.staff,
  })
  // get many news
  .get("/get-news-donate", presidentController.get_news_donate, {
    beforeHandle: middleware.staff,
  })
  // delete news
  .delete("/delete-news/:id", presidentController.delete_news, {
    beforeHandle: middleware.staff,
  })
  // get by Id
  .get("/get-news/:id", presidentController.get_news_byId, {
    beforeHandle: middleware.staff,
  })
  //   update
  .post("/update-news/:id", presidentController.update_news, {
    beforeHandle: middleware.staff,
  })
  //   get avg
  .get("/all-avg-news", presidentController.get_all_avg, {
    beforeHandle: middleware.staff,
  })
  // update view
  .put("/update-news-view/:id", presidentController.update_view, {
    beforeHandle: middleware.staff,
  })
  // get other
  .get("/get-other-news/:category/:id", presidentController.get_other__news, {
    beforeHandle: middleware.staff,
  })
  // send email
  .post("/sendemail", presidentController.send_email, {
    beforeHandle: middleware.staff,
  })
  // delete contract alumni
  .delete(
    "/delete-contract/:alumniId",
    presidentController.delete_alumni_contract,
    { beforeHandle: middleware.staff },
  )
  // delete work ex
  .delete(
    "/delete-work-ex/:alumniId",
    presidentController.delete_work_exprerience,
    { beforeHandle: middleware.staff },
  )
  .get("/get-user", presidentController.get_users, {
    beforeHandle: middleware.staff,
  })
  .put("/manage-account/:user_id", presidentController.manage_account, {
    beforeHandle: middleware.staff,
  })
  // import alumni data
  .post("/import-confirm", presidentController.import_alumni_data, {
    beforeHandle: middleware.staff,
  })
  // regis alumni status stats
  .get(
    "/alumni-regis-status-stats",
    presidentController.get_alumni_regis_status_stats,
  )
  // get alumni regis data
  .get(
    "/get-alumni-regis-data/:alumniId",
    presidentController.get_alumni_regis_data,
    { beforeHandle: middleware.staff },
  )
  // accept regis alumni
  .put(
    "/accept-regis-alumni/:regisId",
    presidentController.accept_regis_alumni,
    { beforeHandle: middleware.staff },
  )
  // refuse regis alumni
  .put(
    "/refuse-regis-alumni/:regisId",
    presidentController.refuse_regis_alumni,
    { beforeHandle: middleware.staff },
  )
  // delete alumni regis
  .put(
    "/delete-alumni-regis/:regisId",
    presidentController.delete_alumni_regis,
    { beforeHandle: middleware.staff },
  )
  // export alumni regis data
  .post("/export-alumni-regis", presidentController.export_alumni_regis_data, {
    beforeHandle: middleware.staff,
  })
  // delete personel contract
  .delete(
    "/delete-professor-contract/:professorId",
    presidentController.delete_professor_id,
    { beforeHandle: middleware.staff },
  )
  // get import data history
  .get("/get-import-history", presidentController.get_import_history, {
    beforeHandle: middleware.staff,
  })
  .delete(
    "/delete-import-alumni/:importDataId",
    presidentController.delete_import_alumni,
    { beforeHandle: middleware.staff },
  )
  // delete alumni data
  .delete(
    "/delete-alumni-data/:alumniId",
    presidentController.delete_alumni_data,
    { beforeHandle: middleware.staff },
  )
  // export alumni data
  .post("/export-alumni-data", presidentController.export_alumni_data, {
    beforeHandle: middleware.staff,
  })
  // import personels data
  .post("/import-personel-confirm", presidentController.import_personel_data, {
    beforeHandle: middleware.staff,
  })
  // delete import history
  .delete(
    "/delete-import-history/:importId",
    presidentController.delete_import_history,
    { beforeHandle: middleware.staff },
  )
  // delete personel data form history
  .delete(
    "/delete-import-personel/:importDataId",
    presidentController.delete_import_personel,
    { beforeHandle: middleware.staff },
  )
  // export personel data
  .post("/export-personel-data", presidentController.export_personel_data, {
    beforeHandle: middleware.staff,
  })
  // delete personel data
  .delete(
    "/delete-personel-data/:professorId",
    presidentController.delete_personel_data,
    { beforeHandle: middleware.staff },
  )
  // add new admin (Admin only)
  .post("/new-admin", presidentController.add_new_admin, {
    beforeHandle: middleware.admin,
  })
  // get admin list (Admin only)
  .get("/get-admin-list", presidentController.get_admin_list, {
    beforeHandle: middleware.admin,
  })
  // edit admin (Admin only)
  .post("/edit-admin/:adminId", presidentController.update_admin, {
    beforeHandle: middleware.admin,
  })
  // delete admin (Admin only)
  .delete("/delete-admin/:adminId", presidentController.delete_admin, {
    beforeHandle: middleware.admin,
  })
  // export admin data (Admin only)
  .post("/export-admin-data", presidentController.export_admin_data, {
    beforeHandle: middleware.admin,
  })
  // get email stats
  .get("/get-sendtext-stats", presidentController.get_sendtext_stats, {
    beforeHandle: middleware.staff,
  })
  // get sendtext data
  .get("/get-sendtext-list", presidentController.get_sendText_list, {
    beforeHandle: middleware.staff,
  })
  // get alumni list
  .get(
    "/get-alumni-from-sendtext/:sendTextId",
    presidentController.get_alumni_from_sendText,
    { beforeHandle: middleware.staff },
  )
  // get data
  .get("/get-sendtext/:sendTextId", presidentController.get_sendtext_data, {
    beforeHandle: middleware.staff,
  })
  // delete send text
  .delete("/delete-sendtext/:sendTextId", presidentController.delete_sendtext, {
    beforeHandle: middleware.staff,
  })
  // report stats
  .get("/get-report-stats", presidentController.get_reports_stats, {
    beforeHandle: middleware.staff,
  })
  // alumni chart bar groupby fac
  .get(
    "/chartbar-alumni-groupbyfac",
    presidentController.get_alumni_chartbar_groupbyfac,
    { beforeHandle: middleware.staff },
  )
  // get get-alumni-groupbywork
  .get("/get-alumni-groupbywork", presidentController.get_alumni_bywork, {
    beforeHandle: middleware.staff,
  })
  // alumni-groupby-year
  .get("/alumni-groupby-year", presidentController.get_alumni_groupby_year, {
    beforeHandle: middleware.staff,
  })
  // professor by position
  .get(
    "/professor-groupby-position",
    presidentController.get_professor_broupby_postion,
    {
      beforeHandle: middleware.staff,
    },
  )
  // get send text history stats
  .get(
    "/send-text-grouby-sender",
    presidentController.get_sendtext_groupby_sender,
    { beforeHandle: middleware.staff },
  )
  // get news stats by category
  .get(
    "/news-groupby-category",
    presidentController.get_news_groupby_category,
    { beforeHandle: middleware.staff },
  )
  // get user canuse
  .get(
    "/get-user-and-account-canuse",
    presidentController.get_user_account_canuse,
    { beforeHandle: middleware.staff },
  )
  // get popular news
  .get("/get-popularnews", presidentController.get_popular_news, {
    beforeHandle: middleware.staff,
  })
  // get regis setting
  .get("/get-setting-data", presidentController.get_setting_data)

  // save regis payment slip (Admin only)
  .post(
    "/setting-edit-qrcode-payment/:id",
    presidentController.edit_setting_qrcode_payment,
    {
      beforeHandle: middleware.admin,
    },
  )
  // update regis payment (Admin only)
  .post("/update-regis-payment/:id", presidentController.update_regis_payment, {
    beforeHandle: middleware.admin,
  })
  // update fac dep link (Admin only)
  .put("/edit-fac-dep-sheet/:id", presidentController.edit_fac_dep_sheet, {
    beforeHandle: middleware.admin,
  })
  // update account setting (Admin only)
  .put(
    "/update-setting-account/:id",
    presidentController.update_account_setting,
    { beforeHandle: middleware.admin },
  )
  // update notify mail (Admin only)
  .put(
    "/update-setting-notify-mail/:id",
    presidentController.update_notify_mail,
    { beforeHandle: middleware.admin },
  )
  .post(
    "/check-drive-backup-verify/:id",
    presidentController.check_folder_id_verrify,
    { beforeHandle: middleware.admin },
  )
  .post(
    "/check-drive-filebackup-verify/:id",
    presidentController.check_filefolder_id_verrify,
    { beforeHandle: middleware.admin },
  )
  // export data to device (Admin only)
  .post("/backup-data", presidentController.backup_data, {
    beforeHandle: middleware.admin,
  })
  // backup files (Admin only)
  .post("/backup-files", presidentController.backup_files, {
    beforeHandle: middleware.admin,
  })
  // delete all data (Admin only)
  .post("/delete-data", presidentController.delete_all_data, {
    beforeHandle: middleware.admin,
  })
  // export alumni overview
  .get("/export-alumni-overview", presidentController.export_alumni_overview, {
    beforeHandle: middleware.staff,
  })
  // create fac (Admin only)
  .post("/create-faculty", presidentController?.create_faculty, {
    beforeHandle: middleware.admin,
  })
  // update fac (Admin only)
  .post("/edit-faculty/:id", presidentController.update_faculty, {
    beforeHandle: middleware.admin,
  })
  // get facultyList
  .get("/get-facultys", presidentController.get_faculty_list)
  // delete fac (Admin only)
  .delete("/delete-fac/:id", presidentController.delete_faculty, {
    beforeHandle: middleware.admin,
  })
  // create department (Admin only)
  .post("/create-department", presidentController?.create_department, {
    beforeHandle: middleware.admin,
  })
  // update department (Admin only)
  .post("/edit-department/:id", presidentController.update_std_department, {
    beforeHandle: middleware.admin,
  })
  // get departments
  .get("/get-departments", presidentController.get_department_list)
  // delete departments (Admin only)
  .delete("/delete-dep/:id", presidentController.delete_std_department, {
    beforeHandle: middleware.admin,
  })
  // create edulevel (Admin only)
  .post("/create-edulevel", presidentController.create_edulevel, {
    beforeHandle: middleware.admin,
  })
  // edu level list
  .get("/get-edulevels", presidentController.get_edu_level_list)
  // delete edu (Admin only)
  .delete("/delete-edulevel/:id", presidentController?.delete_edu_level, {
    beforeHandle: middleware.admin,
  })
  // update edu (Admin only)
  .post("/edit-edulevel/:id", presidentController.update_edu_level, {
    beforeHandle: middleware.admin,
  });

