import Elysia from "elysia";
import { presidentController } from "../controller/president.controller";
import { middleware } from "../middleware/auth.middleware";

export const presidentRoutes = new Elysia({ prefix: "/president" })
  .get("/year-options", presidentController.get_year_options)
  .get("/alumni-list", presidentController.alumni_list, {
    beforeHandle: middleware.auth,
  })

  // create news
  .post("/create-news", presidentController.create_news, {
    beforeHandle: middleware.auth,
  })
  // get many news
  .get("/get-news-donate", presidentController.get_news_donate, {
    beforeHandle: middleware.auth,
  })
  // delete news
  .delete("/delete-news/:id", presidentController.delete_news, {
    beforeHandle: middleware.auth,
  })
  // get by Id
  .get("/get-news/:id", presidentController.get_news_byId, {
    beforeHandle: middleware.auth,
  })
  //   update
  .post("/update-news/:id", presidentController.update_news, {
    beforeHandle: middleware.auth,
  })
  //   get avg
  .get("/all-avg-news", presidentController.get_all_avg, {
    beforeHandle: middleware.auth,
  })
  // update view
  .put("/update-news-view/:id", presidentController.update_view, {
    beforeHandle: middleware.auth,
  })
  // get other
  .get("/get-other-news/:category/:id", presidentController.get_other__news, {
    beforeHandle: middleware.auth,
  })
  // send email
  .post("/sendemail", presidentController.send_email, {
    beforeHandle: middleware.auth,
  })
  // delete contract alumni
  .delete(
    "/delete-contract/:alumniId",
    presidentController.delete_alumni_contract,
    { beforeHandle: middleware.auth },
  )
  // delete work ex
  .delete(
    "/delete-work-ex/:alumniId",
    presidentController.delete_work_exprerience,
    { beforeHandle: middleware.auth },
  )
  .get("/get-user", presidentController.get_users, {
    beforeHandle: middleware.auth,
  })
  .put("/manage-account/:user_id", presidentController.manage_account, {
    beforeHandle: middleware.auth,
  })
  // import alumni data
  .post("/import-confirm", presidentController.import_alumni_data, {
    beforeHandle: middleware.auth,
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
    { beforeHandle: middleware.auth },
  )
  // accept regis alumni
  .put(
    "/accept-regis-alumni/:regisId",
    presidentController.accept_regis_alumni,
    { beforeHandle: middleware.auth },
  )
  // refuse regis alumni
  .put(
    "/refuse-regis-alumni/:regisId",
    presidentController.refuse_regis_alumni,
    { beforeHandle: middleware.auth },
  )
  // delete alumni regis
  .put(
    "/delete-alumni-regis/:regisId",
    presidentController.delete_alumni_regis,
    { beforeHandle: middleware.auth },
  )
  // export alumni regis data
  .post("/export-alumni-regis", presidentController.export_alumni_regis_data, {
    beforeHandle: middleware.auth,
  })
  // delete personel contract
  .delete(
    "/delete-professor-contract/:professorId",
    presidentController.delete_professor_id,
    { beforeHandle: middleware.auth },
  )
  // get import data history
  .get("/get-import-history", presidentController.get_import_history, {
    beforeHandle: middleware.auth,
  })
  .delete(
    "/delete-import-alumni/:importDataId",
    presidentController.delete_import_alumni,
    { beforeHandle: middleware.auth },
  )
  // delete alumni data
  .delete(
    "/delete-alumni-data/:alumniId",
    presidentController.delete_alumni_data,
    { beforeHandle: middleware.auth },
  )
  // export alumni data
  .post("/export-alumni-data", presidentController.export_alumni_data, {
    beforeHandle: middleware.auth,
  })
  // import personels data
  .post("/import-personel-confirm", presidentController.import_personel_data, {
    beforeHandle: middleware.auth,
  })
  // delete import history
  .delete(
    "/delete-import-history/:importId",
    presidentController.delete_import_history,
    { beforeHandle: middleware.auth },
  )
  // delete personel data form history
  .delete(
    "/delete-import-personel/:importDataId",
    presidentController.delete_import_personel,
    { beforeHandle: middleware.auth },
  )
  // export personel data
  .post("/export-personel-data", presidentController.export_personel_data, {
    beforeHandle: middleware.auth,
  })
  // delete personel data
  .delete(
    "/delete-personel-data/:professorId",
    presidentController.delete_personel_data,
    { beforeHandle: middleware.auth },
  )
  // add new admin
  .post("/new-admin", presidentController.add_new_admin, {
    beforeHandle: middleware.auth,
  })
  // get admin list
  .get("/get-admin-list", presidentController.get_admin_list, {
    beforeHandle: middleware.auth,
  })
  // edit admin
  .post("/edit-admin/:adminId", presidentController.update_admin, {
    beforeHandle: middleware.auth,
  })
  // delete admin
  .delete("/delete-admin/:adminId", presidentController.delete_admin, {
    beforeHandle: middleware.auth,
  })
  // export admin data
  .post("/export-admin-data", presidentController.export_admin_data, {
    beforeHandle: middleware.auth,
  })
  // get email stats
  .get("/get-sendtext-stats", presidentController.get_sendtext_stats, {
    beforeHandle: middleware.auth,
  })
  // get sendtext data
  .get("/get-sendtext-list", presidentController.get_sendText_list, {
    beforeHandle: middleware.auth,
  })
  // get alumni list
  .get(
    "/get-alumni-from-sendtext/:sendTextId",
    presidentController.get_alumni_from_sendText,
    { beforeHandle: middleware.auth },
  )
  // get data
  .get("/get-sendtext/:sendTextId", presidentController.get_sendtext_data, {
    beforeHandle: middleware.auth,
  })
  // delete send text
  .delete("/delete-sendtext/:sendTextId", presidentController.delete_sendtext, {
    beforeHandle: middleware.auth,
  })
  // report stats
  .get("/get-report-stats", presidentController.get_reports_stats, {
    beforeHandle: middleware.auth,
  })
  // alumni chart bar groupby fac
  .get(
    "/chartbar-alumni-groupbyfac",
    presidentController.get_alumni_chartbar_groupbyfac,
    { beforeHandle: middleware.auth },
  )
  // get get-alumni-groupbywork
  .get("/get-alumni-groupbywork", presidentController.get_alumni_bywork, {
    beforeHandle: middleware.auth,
  })
  // alumni-groupby-year
  .get("/alumni-groupby-year", presidentController.get_alumni_groupby_year, {
    beforeHandle: middleware.auth,
  })
  // professor by position
  .get(
    "/professor-groupby-position",
    presidentController.get_professor_broupby_postion,
    {
      beforeHandle: middleware.auth,
    },
  )
  // get send text history stats
  .get(
    "/send-text-grouby-sender",
    presidentController.get_sendtext_groupby_sender,
    { beforeHandle: middleware.auth },
  )
  // get news stats by category
  .get(
    "/news-groupby-category",
    presidentController.get_news_groupby_category,
    { beforeHandle: middleware.auth },
  )
  // get user canuse
  .get(
    "/get-user-and-account-canuse",
    presidentController.get_user_account_canuse,
    { beforeHandle: middleware.auth },
  )
  // get popular news
  .get("/get-popularnews", presidentController.get_popular_news, {
    beforeHandle: middleware.auth,
  })
  // get regis setting
  .get("/get-setting-data", presidentController.get_setting_data)

  // save regis payment slip
  .post(
    "/setting-edit-qrcode-payment/:id",
    presidentController.edit_setting_qrcode_payment,
    {
      beforeHandle: middleware.auth,
    },
  )
  // update regis apyment
  .post("/update-regis-payment/:id", presidentController.update_regis_payment, {
    beforeHandle: middleware.auth,
  })
  // update fac dep link
  .put("/edit-fac-dep-sheet/:id", presidentController.edit_fac_dep_sheet, {
    beforeHandle: middleware.auth,
  })
  // update account setting
  .put(
    "/update-setting-account/:id",
    presidentController.update_account_setting,
    { beforeHandle: middleware.auth },
  )
  // update notify mail
  .put(
    "/update-setting-notify-mail/:id",
    presidentController.update_notify_mail,
    { beforeHandle: middleware.auth },
  )
  .post(
    "/check-drive-backup-verify/:id",
    presidentController.check_folder_id_verrify,
    { beforeHandle: middleware.auth },
  )
  .post(
    "/check-drive-filebackup-verify/:id",
    presidentController.check_filefolder_id_verrify,
    { beforeHandle: middleware.auth },
  )
  // export data to device
  .post("/backup-data", presidentController.backup_data, {
    beforeHandle: middleware.auth,
  })
  // backup files
  .post("/backup-files", presidentController.backup_files, {
    beforeHandle: middleware.auth,
  })
  // delete all data
  .post("/delete-data", presidentController.delete_all_data, {
    beforeHandle: middleware.auth,
  })
  // export alumni overview
  .get("/export-alumni-overview", presidentController.export_alumni_overview, {
    beforeHandle: middleware.auth,
  })
  // create fac
  .post("/create-faculty", presidentController?.create_faculty, {
    beforeHandle: middleware.auth,
  })
  // update fac
  .post("/edit-faculty/:id", presidentController.update_faculty, {
    beforeHandle: middleware.auth,
  })
  // get facultyList
  .get("/get-facultys", presidentController.get_faculty_list)
  // delete
  .delete("/delete-fac/:id", presidentController.delete_faculty, {
    beforeHandle: middleware.auth,
  })
  // crate department
  .post("/create-department", presidentController?.create_department, {
    beforeHandle: middleware.auth,
  })
  // update department
  .post("/edit-department/:id", presidentController.update_std_department, {
    beforeHandle: middleware.auth,
  })
  // get departments
  .get("/get-departments", presidentController.get_department_list)
  // delete departments
  .delete("/delete-dep/:id", presidentController.delete_std_department, {
    beforeHandle: middleware.auth,
  })
  // create edulevel
  .post("/create-edulevel", presidentController.create_edulevel, {
    beforeHandle: middleware.auth,
  })
  // edu level list
  .get("/get-edulevels", presidentController.get_edu_level_list)
  // delete edu
  .delete("/delete-edulevel/:id", presidentController?.delete_edu_level, {
    beforeHandle: middleware.auth,
  })
  // update edu
  .post("/edit-edulevel/:id", presidentController.update_edu_level, {
    beforeHandle: middleware.auth,
  });
