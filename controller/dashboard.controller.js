import prisma from "../libs/prisma.js";

export const dashboardController = {
  getAll_AVG: async ({ store, set, query }) => {
    try {
      const { id, roleId } = store.user;
      if (roleId < 2) {
        set.status = 400;
        return;
      }

      const { facultyId, departmentId } = await prisma.professor.findUnique({
        where: { professor_id: id },
        select: { facultyId: true, departmentId: true },
      });

      let filterCondition = {};
      if (roleId < 3) {
        filterCondition = { departmentId };
      } else if (roleId === 3) {
        filterCondition = { facultyId };
      } // roleId > 3 จะได้ filterCondition = {}
      if (query?.facultyId) {
        filterCondition = { facultyId: query.facultyId };
      }
      if (query?.departmentId) {
        filterCondition = { departmentId: query.departmentId };
      }
      if (query?.selectYearStart) {
        filterCondition = {
          ...filterCondition,
          year_start: query?.selectYearStart,
        };
      }
      if (query?.selectYearEnd) {
        filterCondition = {
          ...filterCondition,
          year_end: query?.selectYearEnd,
        };
      }

      const [
        allAlumni,
        alumniWorking,
        salaryAvg,
        alumniStudy,
        alumniStudyMax,
        allProvince,
        populationJob,
        workPlaceLive,
        mostSalary,
        currentStudy,
        countryWork,
        studyOtherCountry,
      ] = await Promise.all([
        prisma.alumni.count({ where: filterCondition }),

        prisma.alumni.count({
          where: {
            ...filterCondition,
            work_expreriences: {
              some: { isCurrent: true },
            },
          },
        }),

        prisma.work_expreriences.aggregate({
          _avg: { salary: true },
          where: { alumni: filterCondition },
        }),

        prisma.alumni.count({
          where: {
            ...filterCondition,
            study_expreriences: {
              some: { continued_study: true, edu_level: "ปริญญาโท" },
            },
          },
        }),

        prisma.alumni.count({
          where: {
            ...filterCondition,
            study_expreriences: {
              some: { continued_study: true, edu_level: "ปริญญาเอก" },
            },
          },
        }),

        prisma.alumni_contract.groupBy({
          by: ["province"],
          where: {
            alumni: filterCondition,
          },
          _count: { province: true },
          orderBy: { _count: { province: "desc" } },
          take: 1,
        }),

        prisma.work_expreriences.groupBy({
          by: ["job_position"],
          where: {
            alumni: filterCondition,
            OR: [
              {
                job_position: {
                  not: null,
                  notIn: [""],
                },
              },
            ],
          },
          _count: { alumniId: true },
          orderBy: { _count: { alumniId: "desc" } },
          take: 1,
        }),

        prisma.work_expreriences.groupBy({
          by: ["company_place"],
          where: {
            alumni: filterCondition,
            isInThai: true,
          },
          _count: {
            alumniId: true,
          },
          orderBy: {
            _count: {
              alumniId: "desc",
            },
          },
          take: 1,
        }),

        prisma.work_expreriences.aggregate({
          _max: {
            salary: true,
          },
          where: {
            alumni: filterCondition,
            isCurrent: true,
          },
        }),

        prisma.alumni.count({
          where: {
            ...filterCondition,
            study_expreriences: {
              some: {
                continued_study: true,
                isCurrent: true,
              },
            },
          },
        }),

        prisma.alumni.count({
          where: {
            ...filterCondition,
            work_expreriences: {
              some: {
                isInThai: false,
              },
            },
          },
        }),

        prisma.alumni.count({
          where: {
            ...filterCondition,
            study_expreriences: {
              some: {
                isInThai: false,
                continued_study: true,
              },
            },
          },
        }),
      ]);
      set.status = 200;
      return {
        allAlumni,
        alumniStudy,
        salaryAvg: salaryAvg?._avg.salary ?? 0,
        alumniWorking,
        mostLiveProvince: allProvince[0]?.province ?? null,
        countMostLive: allProvince[0]?._count.province ?? 0,
        mostPopulationJob: populationJob[0]?.job_position ?? null,
        countPoplationJob: populationJob[0]?._count.alumniId ?? 0,
        workPlaceLive: workPlaceLive[0],
        mostSalary: mostSalary._max.salary,
        alumniStudyMax,
        currentStudy,
        studyOtherCountry,
        countryWork,
      };
    } catch (err) {
      console.error(err);
      set.status = 500;
      return { err };
    }
  },
  chart_bar_data: async ({ store, set, query }) => {
    try {
      const { id, roleId } = store.user;
      if (!id || id < 2) return (set.status = 400);

      const user = await prisma.professor.findUnique({
        where: {
          professor_id: id,
        },
        select: {
          facultyId: true,
        },
      });

      const { facultyId } = user;

      let whereQuery =
        roleId > 3
          ? null
          : {
              facultyId,
            };
      if (query?.facultyId) {
        whereQuery = { facultyId: query?.facultyId };
      }
      if (query?.selectYearStart) {
        whereQuery = {
          ...whereQuery,
          year_start: query?.selectYearStart,
        };
      }
      if (query?.selectYearEnd) {
        whereQuery = {
          ...whereQuery,
          year_end: query?.selectYearEnd,
        };
      }
      const [working, unemployed] = await Promise.all([
        prisma.alumni.groupBy({
          by: [roleId <= 3 || query?.facultyId ? "departmentId" : "facultyId"],
          _count: { alumni_id: true },
          where: {
            ...whereQuery,
            work_expreriences: {
              some: { isCurrent: true },
            },
          },
        }),
        prisma.alumni.groupBy({
          by: [roleId <= 3 || query?.facultyId ? "departmentId" : "facultyId"],
          _count: {
            alumni_id: true,
          },
          where: {
            ...whereQuery,
            work_expreriences: {
              none: { isCurrent: true },
            },
          },
        }),
      ]);

      const result = working.map((w) => {
        const u = unemployed.find((x) =>
          roleId < 3 || query?.facultyId
            ? x.departmentId === w.departmentId
            : x.facultyId === w.facultyId,
        ) || {
          _count: { alumni_id: 0 },
        };
        return {
          id: roleId < 3 || query?.facultyId ? w.departmentId : w?.facultyId,
          working: w._count.alumni_id,
          unemployed: u._count.alumni_id,
        };
      });

      unemployed.forEach((u) => {
        if (!result.find((r) => r.id === u.facultyId)) {
          result.push({
            id: roleId < 3 || query?.facultyId ? u.departmentId : u.facultyId,
            working: 0,
            unemployed: u._count.alumni_id,
          });
        }
      });

      set.status = 200;
      // console.log("🚀 ~ result:", result)
      return result;
    } catch (err) {
      console.error(err);
      set.status = 500;
      return { err };
    }
  },
  pie_chart_data: async ({ store, set, query }) => {
    try {
      const { id, roleId } = store.user;
      if (!id || id < 2) return (set.status = 400);

      const { facultyId: facId, selectYearStart, selectYearEnd } = query;

      let facultyId = facId;

      // ถ้าเป็นอาจารย์ (roleId = 3) → ดึง facultyId ของอาจารย์คนนั้น
      if (roleId === 3) {
        const user = await prisma.professor.findUnique({
          where: { professor_id: id },
          select: { facultyId: true },
        });
        facultyId = user?.facultyId;
      }

      // เงื่อนไข where หลัก
      const whereClause = {
        salary: { not: null },
        alumni: {},
      };

      // ถ้ามี facultyId → filter ตามคณะ
      if (facultyId) {
        whereClause.alumni.facultyId = facultyId;
      }

      // ถ้ามีปีเริ่มหรือปีจบ → filter ตาม alumni
      if (selectYearStart) {
        whereClause.alumni.year_start = selectYearStart;
      }
      if (selectYearEnd) {
        whereClause.alumni.year_end = selectYearEnd;
      }

      // Query: groupBy ศิษย์เก่า เพื่อเฉลี่ยเงินเดือน
      const result = await prisma.work_expreriences.groupBy({
        by: ["alumniId"],
        where: whereClause,
        _avg: { salary: true },
      });

      if (!result.length) {
        return [];
      }

      // ดึงข้อมูลคณะ/สาขาของศิษย์เก่าที่มีในผลลัพธ์
      const alumniWithFacultyDept = await prisma.alumni.findMany({
        where: {
          alumni_id: { in: result.map((r) => r.alumniId) },
        },
        select: {
          alumni_id: true,
          facultyId: true,
          departmentId: true,
          fname: true,
          lname: true,
        },
      });

      // รวมผลลัพธ์
      const merged = alumniWithFacultyDept.map((alum) => {
        const avgData = result.find((r) => r.alumniId === alum.alumni_id);
        return {
          facultyId: alum.facultyId,
          departmentId: alum.departmentId,
          alumniId: alum.alumni_id,
          fullname: `${alum.fname} ${alum.lname}`,
          averageSalary: avgData?._avg.salary ?? 0,
        };
      });

      // ✅ เฉลี่ยตามเงื่อนไข
      // ถ้ามี facultyId → เฉลี่ยตาม department (สาขา)
      // ถ้าไม่มี facultyId → เฉลี่ยตาม faculty
      const grouped = merged.reduce((acc, cur) => {
        const key = facultyId ? cur.departmentId : cur.facultyId;
        if (!key) return acc;
        if (!acc[key]) acc[key] = [];
        acc[key].push(cur.averageSalary);
        return acc;
      }, {});

      const final = Object.entries(grouped).map(([key, salaries]) => ({
        [facultyId ? "departmentId" : "facultyId"]: Number(key),
        avgSalary: salaries.reduce((a, b) => a + b, 0) / (salaries.length || 1),
      }));

      return final;
    } catch (err) {
      console.error(err);
      set.status = 500;
      return { err };
    }
  },

  population_job: async ({ store, set, query }) => {
    try {
      const { id, roleId } = store.user;

      const user = await prisma.professor.findUnique({
        where: {
          professor_id: id,
        },
        select: {
          facultyId: true,
          departmentId: true,
        },
      });

      const { departmentId, facultyId } = user;
      let queryStr =
        roleId > 3
          ? null
          : roleId < 3
            ? {
                departmentId,
              }
            : {
                facultyId,
              };
      if (query?.facultyId) {
        queryStr = { facultyId: query?.facultyId };
      }
      if (query?.departmentId) {
        queryStr = { departmentId: query?.departmentId };
      }
      if (query?.selectYearStart) {
        queryStr = {
          ...queryStr,
          year_start: query?.selectYearStart,
        };
      }
      if (query?.selectYearEnd) {
        queryStr = {
          ...queryStr,
          year_end: query?.selectYearEnd,
        };
      }
      const result = await prisma.work_expreriences.groupBy({
        by: ["job_position"],
        where: {
          alumni: {
            ...queryStr,
          },
          OR: [
            {
              job_position: {
                not: null,
                notIn: [""],
              },
            },
          ],
        },
        _count: {
          alumniId: true,
        },
        orderBy: {
          _count: {
            alumniId: "desc",
          },
        },
        take: 10,
      });

      set.status = 200;
      return result;
    } catch (err) {
      console.error(err);
      set.status = 500;
      return { err };
    }
  },
  most_live_province: async ({ store, set, query }) => {
    try {
      const { id, roleId } = store.user;

      const user = await prisma.professor.findUnique({
        where: {
          professor_id: id,
        },
        select: {
          facultyId: true,
          departmentId: true,
        },
      });

      const { departmentId, facultyId } = user;
      let queryStr =
        roleId > 3
          ? null
          : roleId < 3
            ? {
                departmentId,
              }
            : {
                facultyId,
              };

      if (query?.facultyId) {
        queryStr = { facultyId: query?.facultyId };
      }
      if (query?.departmentId) {
        queryStr = { departmentId: query?.departmentId };
      }
      if (query?.selectYearStart) {
        queryStr = {
          ...queryStr,
          year_start: query?.selectYearStart,
        };
      }
      if (query?.selectYearEnd) {
        queryStr = {
          ...queryStr,
          year_end: query?.selectYearEnd,
        };
      }

      const [result, total] = await Promise.all([
        prisma.work_expreriences.groupBy({
          by: ["company_place"],
          where: {
            alumni: { ...queryStr },

            isInThai: true,
          },
          _count: {
            alumniId: true,
          },
          orderBy: {
            _count: {
              alumniId: "desc",
            },
          },
        }),
        prisma.alumni.count({
          where: {
            ...queryStr,
            work_expreriences: {
              some: {
                isInThai: true,
              },
            },
          },
        }),
      ]);
      set.status = 200;
      return { result, total };
    } catch (err) {
      console.error(err);
      set.status = 500;
      return { err };
    }
  },
  workrate_percent: async ({ store, set, query }) => {
    try {
      const { id, roleId } = store.user;

      const user = await prisma.professor.findUnique({
        where: {
          professor_id: id,
        },
        select: {
          facultyId: true,
          departmentId: true,
        },
      });

      const { departmentId, facultyId } = user;
      let queryStr =
        roleId > 3
          ? null
          : roleId < 3
            ? {
                departmentId,
              }
            : {
                facultyId,
              };
      if (query?.facultyId) {
        queryStr = { facultyId: query?.facultyId };
      }
      if (query?.selectYearStart) {
        queryStr = {
          ...queryStr,
          year_start: query?.selectYearStart,
        };
      }
      if (query?.selectYearEnd) {
        queryStr = {
          ...queryStr,
          year_end: query?.selectYearEnd,
        };
      }
      // groupBy ตามคณะ
      const result = await prisma.alumni.groupBy({
        by: [roleId < 3 || query?.facultyId ? "departmentId" : "facultyId"],
        _count: { alumni_id: true },
        where: {
          ...queryStr,
        },
        orderBy: {
          _count: { alumni_id: "desc" },
        },
      });

      // นับศิษย์เก่าทั้งหมดแยกตามคณะ เอาเฉพาะศิษย์เก่าที่กรอกข้อมูลการทำงาน
      const totalByFaculty = await prisma.alumni.groupBy({
        by: [roleId < 3 || query?.facultyId ? "departmentId" : "facultyId"],
        _count: { alumni_id: true },
        where: {
          work_expreriences: {
            some: {},
          },
        },
      });

      // map มาคำนวณเปอร์เซ็นต์
      const percentByFaculty = result.map((r) => {
        const total =
          totalByFaculty.find((t) => t.facultyId === r.facultyId)?._count
            .alumni_id || 0;
        return {
          id: roleId < 3 || query?.facultyId ? r?.departmentId : r.facultyId,
          percent:
            total > 0
              ? ((r._count.alumni_id / total) * 100).toFixed(2)
              : "0.00",
        };
      });

      set.status = 200;
      return percentByFaculty; // [{ facultyId, employed, total, percent }, ...]
    } catch (err) {
      console.error(err);
      set.status = 500;
      return { err };
    }
  },
  no_work_data: async ({ store, set, query }) => {
    try {
      const { id, roleId } = store.user;

      const user = await prisma.professor.findUnique({
        where: {
          professor_id: id,
        },
        select: {
          facultyId: true,
          departmentId: true,
        },
      });

      const { departmentId, facultyId } = user;
      let queryStr =
        roleId > 3
          ? null
          : roleId < 3
            ? {
                departmentId,
              }
            : {
                facultyId,
              };

      if (query?.facultyId) {
        queryStr = { facultyId: query?.facultyId };
      }
      if (query?.departmentId) {
        queryStr = { departmentId: query?.departmentId };
      }
      if (query?.selectYearStart) {
        queryStr = {
          ...queryStr,
          year_start: query?.selectYearStart,
        };
      }
      if (query?.selectYearEnd) {
        queryStr = {
          ...queryStr,
          year_end: query?.selectYearEnd,
        };
      }

      const result = await prisma.alumni.groupBy({
        by: [roleId < 3 || query?.facultyId ? "departmentId" : "facultyId"],
        _count: {
          alumni_id: true,
        },
        where: {
          ...queryStr,
          work_expreriences: {
            none: {},
          },
        },
        orderBy: {
          _count: {
            alumni_id: "desc",
          },
        },
      });

      const alumniNoWork = await prisma.alumni.findMany({
        take: 10,
        where: {
          ...queryStr,
          work_expreriences: {
            none: {},
          },
        },
        select: {
          profile: true,
          prefix: true,
          fname: true,
          lname: true,
          alumni_id: true,
        },
      });

      set.status = 200;
      return { result, alumniNoWork };
    } catch (err) {
      console.error(err);
      set.status = 500;
      return { err };
    }
  },
  list_work_unemployed: async ({ store, set, query }) => {
    try {
      const { id, roleId } = store.user;
      const {
        page,
        facultyId,
        departmentId,
        take,
        search,
        sort,
        current,
        selectYearStart,
        selectYearEnd,
      } = query;
      const skip = take * (page - 1);
      const yearStartQ = selectYearStart ? { year_start: selectYearStart } : {};
      const yearEndQ = selectYearEnd ? { year_end: selectYearEnd } : {};

      const { facultyId: userFac, departmentId: userDep } =
        await prisma.professor.findUnique({
          where: {
            professor_id: id,
          },
          select: {
            facultyId: true,
            departmentId: true,
          },
        });

      let filter = {};
      if (roleId === 3) {
        filter = { facultyId: userFac };
      } else if (roleId < 3) {
        filter = { departmentId: userDep };
      }
      if (facultyId) {
        filter = { facultyId };
      }
      if (departmentId) {
        filter = { departmentId };
      }
      if (query?.selectYearStart) {
        filter = {
          ...filter,
          year_start: query?.selectYearStart,
        };
      }
      if (query?.selectYearEnd) {
        filter = {
          ...filter,
          year_end: query?.selectYearEnd,
        };
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
                contains: search,
              },
            },
          ],
        };
      }
      let work = {};
      if (current) {
        work = JSON.parse(current);
        filter = {
          ...filter,
          work_expreriences: {
            ...work,
          },
        };
      }

      const [result, total] = await Promise.all([
        prisma.alumni.findMany({
          skip,
          take: Number(take),
          where: {
            ...filter,
            ...yearStartQ,
            ...yearEndQ,
          },
          select: {
            alumni_id: true,
            year_start: true,
            prefix: true,
            fname: true,
            lname: true,
            facultyId: true,
            departmentId: true,
            year_end: true,
            work_expreriences: {
              take: 1,
              select: {
                isCurrent: true,
                continued_study: true,
              },
            },
          },
          orderBy: {
            ...JSON.parse(sort),
          },
        }),
        prisma.alumni.count({
          where: {
            ...filter,
            ...yearStartQ,
            ...yearEndQ,
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
  list_work: async ({ store, set, query }) => {
    try {
      const { id, roleId } = store.user;
      const {
        page,
        facultyId,
        departmentId,
        take,
        search,
        sort,
        extraFilter,
        selectYearStart,
        selectYearEnd,
      } = query;
      const skip = take * (page - 1);
      const yearStartQ = selectYearStart ? { year_start: selectYearStart } : {};
      const yearEndQ = selectYearEnd ? { year_end: selectYearEnd } : {};

      const { facultyId: userFac, departmentId: userDep } =
        await prisma.professor.findUnique({
          where: {
            professor_id: id,
          },
          select: {
            facultyId: true,
            departmentId: true,
          },
        });

      let filter = {};
      if (roleId === 3) {
        filter = { facultyId: userFac };
      } else if (roleId < 3) {
        filter = { departmentId: userDep };
      }
      if (facultyId) {
        filter = { facultyId };
      }
      if (departmentId) {
        filter = { departmentId };
      }
      if (query?.selectYearStart) {
        filter = {
          ...filter,
          year_start: query?.selectYearStart,
        };
      }
      if (query?.selectYearEnd) {
        filter = {
          ...filter,
          year_end: query?.selectYearEnd,
        };
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
                contains: search,
              },
            },
            {
              work_expreriences: {
                some: {
                  company_name: {
                    contains: search,
                    mode: "insensitive",
                  },
                },
              },
            },
            {
              work_expreriences: {
                some: {
                  company_place: {
                    contains: search,
                    mode: "insensitive",
                  },
                },
              },
            },
            {
              work_expreriences: {
                some: {
                  job_position: {
                    contains: search,
                    mode: "insensitive",
                  },
                },
              },
            },
            {
              work_expreriences: {
                some: {
                  edu_university: {
                    contains: search,
                    mode: "insensitive",
                  },
                },
              },
            },
          ],
        };
      }
      if (extraFilter) {
        filter = {
          ...filter,
          work_expreriences: {
            ...JSON.parse(extraFilter),
          },
        };
      }

      const [data, total] = await Promise.all([
        prisma.alumni.findMany({
          skip,
          take: Number(take),
          where: {
            ...filter,
            ...yearStartQ,
            ...yearEndQ,
          },
          select: {
            alumni_id: true,
            year_start: true,
            prefix: true,
            fname: true,
            lname: true,
            facultyId: true,
            year_end: true,
            departmentId: true,
            study_expreriences: {
              take: 1,
              where: {
                isCurrent: true,
              },
              select: {
                // continued_study: true,
                // job_position: true,
                // company_place: true,
                // company_name: true,
                // edu_university: true,
                edu_dep: true,
                edu_level: true,
                edu_faculty: true,
                edu_university: true,
              },
              orderBy: {
                year_end: "desc",
              },
            },
          },
          orderBy: {
            ...JSON.parse(sort),
          },
        }),
        prisma.alumni.count({
          where: {
            ...filter,
            ...yearStartQ,
            ...yearEndQ,
          },
        }),
      ]);

      set.status = 200;
      return {
        result: data,
        totalPage: Math.ceil(total / take) < 1 ? 1 : Math.ceil(total / take),
        total,
      };
    } catch (err) {
      console.error(err);
      set.status = 500;
      return { err };
    }
  },
  list_no_work_data: async ({ store, set, query }) => {
    try {
      const { id, roleId } = store.user;
      const {
        page,
        facultyId,
        departmentId,
        take,
        search,
        sort,
        selectYearStart,
        selectYearEnd,
      } = query;
      const skip = take * (page - 1);
      const yearStartQ = selectYearStart ? { year_start: selectYearStart } : {};
      const yearEndQ = selectYearEnd ? { year_end: selectYearEnd } : {};

      const { facultyId: userFac, departmentId: userDep } =
        await prisma.professor.findUnique({
          where: {
            professor_id: id,
          },
          select: {
            facultyId: true,
            departmentId: true,
          },
        });

      let filter = {};
      if (roleId === 3) {
        filter = { facultyId: userFac };
      } else if (roleId < 3) {
        filter = { departmentId: userDep };
      }
      if (facultyId) {
        filter = { facultyId: facultyId };
      }
      if (departmentId) {
        filter = { departmentId: departmentId };
      }
      if (query?.selectYearStart) {
        filter = {
          ...filter,
          year_start: query?.selectYearStart,
        };
      }
      if (query?.selectYearEnd) {
        filter = {
          ...filter,
          year_end: query?.selectYearEnd,
        };
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
                contains: search,
              },
            },
          ],
        };
      }

      const [result, total] = await Promise.all([
        prisma.alumni.findMany({
          take: Number(take),
          skip,
          where: {
            work_expreriences: {
              none: {},
            },
            ...filter,
            ...yearStartQ,
            ...yearEndQ,
          },
          select: {
            alumni_id: true,
            year_start: true,
            prefix: true,
            fname: true,
            lname: true,
            facultyId: true,
            departmentId: true,
            year_end: true,
          },
          orderBy: {
            ...JSON.parse(sort),
          },
        }),
        prisma.alumni.count({
          where: {
            work_expreriences: {
              none: {},
            },
            ...filter,
            ...yearStartQ,
            ...yearEndQ,
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
  work_place_rate: async ({ query, set, store }) => {
    try {
      const { roleId, id } = store.user;
      const { facultyId, departmentId } = query;

      const user = await prisma.professor.findUnique({
        where: {
          professor_id: id,
        },
        select: {
          facultyId: true,
          departmentId: true,
        },
      });

      let filter = {};
      if (roleId == 3) {
        filter = {
          facultyId: user.facultyId,
        };
      } else if (roleId < 3) {
        filter = {
          departmentId: user.departmentId,
        };
      }

      if (facultyId) {
        filter = {
          facultyId,
        };
      }
      if (departmentId) {
        filter = {
          departmentId,
        };
      }
      if (query?.selectYearStart) {
        filter = {
          ...filter,
          year_start: query?.selectYearStart,
        };
      }
      if (query?.selectYearEnd) {
        filter = {
          ...filter,
          year_end: query?.selectYearEnd,
        };
      }

      const [inThai, otherCountry, otherCountryList] = await Promise.all([
        prisma.alumni.count({
          where: {
            ...filter,
            work_expreriences: {
              some: {
                isInThai: true,
              },
            },
          },
        }),
        prisma.alumni.count({
          where: {
            ...filter,
            work_expreriences: {
              some: {
                isInThai: false,
              },
            },
          },
        }),
        prisma.work_expreriences.groupBy({
          by: ["company_place"],
          where: {
            alumni: {
              ...filter,
            },
            isInThai: false,
          },
          _count: {
            alumniId: true,
          },
          orderBy: {
            _count: {
              alumniId: "desc",
            },
          },
        }),
      ]);

      set.status = 200;
      return {
        result: [
          { name: "ทำงานในประเทศไทย", value: inThai },
          { name: "ทำงานต่างประเทศ", value: otherCountry },
        ],
        countryList: otherCountryList,
      };
    } catch (err) {
      console.error(err);
      set.status = 500;
      return { err };
    }
  },
  master_degree_list: async ({ set, store, query }) => {
    try {
      const { roleId, id } = store.user;
      const { facultyId, departmentId, search, page, take, sort, type } = query;
      const skip = Number(take) * (page - 1);

      const user = await prisma.professor.findUnique({
        where: {
          professor_id: id,
        },
        select: {
          facultyId: true,
          departmentId: true,
        },
      });

      let filter = {};
      if (roleId == 3) {
        filter = {
          facultyId: user.facultyId,
        };
      } else if (roleId < 3) {
        filter = {
          departmentId: user.departmentId,
        };
      }

      if (facultyId) {
        filter = {
          facultyId,
        };
      }
      if (departmentId) {
        filter = {
          departmentId,
        };
      }
      if (query?.selectYearStart) {
        filter = {
          ...filter,
          year_start: query?.selectYearStart,
        };
      }
      if (query?.selectYearEnd) {
        filter = {
          ...filter,
          year_end: query?.selectYearEnd,
        };
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
              fname: {
                contains: search,
                mode: "insensitive",
              },
            },
            {
              study_expreriences: {
                some: {
                  edu_university: {
                    contains: search,
                    mode: "insensitive",
                  },
                },
              },
            },
            {
              study_expreriences: {
                some: {
                  edu_dep: {
                    contains: search,
                    mode: "insensitive",
                  },
                },
              },
            },
          ],
        };
      }

      const [result, total] = await Promise.all([
        prisma.alumni.findMany({
          take: Number(take),
          skip,
          where: {
            ...filter,
            work_expreriences: {
              some: {
                continued_study: true,
                edu_level: type < 2 ? "ปริญญาโท" : "ปริญญาเอก",
              },
            },
          },
          select: {
            alumni_id: true,
            prefix: true,
            fname: true,
            lname: true,
            year_start: true,
            year_end: true,
            facultyId: true,
            departmentId: true,
            study_expreriences: {
              take: 1,
              where: {
                continued_study: true,
                edu_level: type < 2 ? "ปริญญาโท" : "ปริญญาเอก",
              },
              select: {
                edu_dep: true,
                edu_university: true,
              },
            },
          },
          orderBy: {
            ...JSON.parse(sort),
          },
        }),
        prisma.alumni.count({
          where: {
            ...filter,
            study_expreriences: {
              some: {
                continued_study: true,
                edu_level: type < 2 ? "ปริญญาโท" : "ปริญญาเอก",
              },
            },
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
  work_other_country_list: async ({ query, set, store }) => {
    try {
      const { roleId, id } = store.user;
      const { facultyId, departmentId, search, page, take, sort, type } = query;
      const skip = Number(take) * (page - 1);

      const user = await prisma.professor.findUnique({
        where: {
          professor_id: id,
        },
        select: {
          facultyId: true,
          departmentId: true,
        },
      });

      let filter = {};
      if (roleId == 3) {
        filter = {
          facultyId: user.facultyId,
        };
      } else if (roleId < 3) {
        filter = {
          departmentId: user.departmentId,
        };
      }

      if (facultyId) {
        filter = {
          facultyId,
        };
      }
      if (departmentId) {
        filter = {
          departmentId,
        };
      }
      if (query?.selectYearStart) {
        filter = {
          ...filter,
          year_start: query?.selectYearStart,
        };
      }
      if (query?.selectYearEnd) {
        filter = {
          ...filter,
          year_end: query?.selectYearEnd,
        };
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
              fname: {
                contains: search,
                mode: "insensitive",
              },
            },
            {
              work_expreriences: {
                some: {
                  job_position: {
                    contains: search,
                    mode: "insensitive",
                  },
                },
              },
            },
            {
              work_expreriences: {
                some: {
                  company_place: {
                    contains: search,
                    mode: "insensitive",
                  },
                },
              },
            },
          ],
        };
      }

      const [result, total] = await Promise.all([
        prisma.alumni.findMany({
          take: Number(take),
          skip,
          where: {
            ...filter,
            work_expreriences: {
              some: {
                continued_study: false,
                isInThai: false,
              },
            },
          },
          select: {
            alumni_id: true,
            prefix: true,
            fname: true,
            lname: true,
            year_start: true,
            year_end: true,
            facultyId: true,
            departmentId: true,
            work_expreriences: {
              take: 1,
              where: {
                isInThai: false,
              },
              select: {
                job_position: true,
                company_name: true,
                company_place: true,
              },
            },
          },
          orderBy: {
            ...JSON.parse(sort),
          },
        }),

        prisma.alumni.count({
          where: {
            ...filter,
            work_expreriences: {
              some: {
                continued_study: false,
                isInThai: false,
              },
            },
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
  most_salary_byname: async ({ set, store, query }) => {
    try {
      const { roleId, id } = store?.user;
      const { facultyId, departmentId } = await prisma.professor.findUnique({
        where: {
          professor_id: id,
        },
        select: {
          facultyId: true,
          departmentId: true,
        },
      });
      const { type } = query;

      let filterCondition = {};
      if (roleId < 3) {
        filterCondition = { departmentId };
      } else if (roleId === 3) {
        filterCondition = { facultyId };
      } // roleId > 3 จะได้ filterCondition = {}
      if (query?.facultyId) {
        filterCondition = { facultyId: query.facultyId };
      }
      if (query?.departmentId) {
        filterCondition = { departmentId: query.departmentId };
      }
      if (query?.selectYearStart) {
        filterCondition = {
          ...filterCondition,
          year_start: query?.selectYearStart,
        };
      }
      if (query?.selectYearEnd) {
        filterCondition = {
          ...filterCondition,
          year_end: query?.selectYearEnd,
        };
      }

      let salary = {};
      if (Number(type) < 2) {
        salary = await prisma.work_expreriences.aggregate({
          where: {
            isCurrent: true,
          },
          _max: {
            salary: true,
          },
        });
      } else {
        salary = await prisma.work_expreriences.aggregate({
          where: {
            isCurrent: true,
            continued_study: false,
          },
          _min: {
            salary: true,
          },
        });
      }

      const alumni = await prisma.work_expreriences.findFirst({
        where: {
          salary: Number(type) < 2 ? salary._max.salary : salary._min.salary,
        },
        select: {
          alumniId: true,
        },
      });

      set.status = 200;
      return alumni.alumniId;
    } catch (err) {
      console.error(err);
      set.status = 500;
      return { err };
    }
  },
  study_other_country_list: async ({ set, store, query }) => {
    try {
      const { roleId, id } = store.user;
      const { facultyId, departmentId, search, page, take, sort } = query;
      const skip = Number(take) * (page - 1);

      const user = await prisma.professor.findUnique({
        where: {
          professor_id: id,
        },
        select: {
          facultyId: true,
          departmentId: true,
        },
      });

      let filter = {};
      if (roleId == 3) {
        filter = {
          facultyId: user.facultyId,
        };
      } else if (roleId < 3) {
        filter = {
          departmentId: user.departmentId,
        };
      }

      if (facultyId) {
        filter = {
          facultyId,
        };
      }
      if (departmentId) {
        filter = {
          departmentId,
        };
      }
      if (query?.selectYearStart) {
        filter = {
          ...filter,
          year_start: query?.selectYearStart,
        };
      }
      if (query?.selectYearEnd) {
        filter = {
          ...filter,
          year_end: query?.selectYearEnd,
        };
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
              fname: {
                contains: search,
                mode: "insensitive",
              },
            },
            {
              work_expreriences: {
                some: {
                  edu_university: {
                    contains: search,
                    mode: "insensitive",
                  },
                },
              },
            },
            {
              work_expreriences: {
                some: {
                  company_place: {
                    contains: search,
                    mode: "insensitive",
                  },
                },
              },
            },
          ],
        };
      }
      if (query?.current) {
        filter = {
          ...filter,
          work_expreriences: {
            some: {
              isInThai: false,
              continued_study: true,
              ...JSON.parse(query?.current),
            },
          },
        };
      }

      const [result, total] = await Promise.all([
        prisma.alumni.findMany({
          take: Number(take),
          skip,
          where: {
            study_expreriences: {
              some: {
                isInThai: false,
                continued_study: true,
              },
            },
            ...filter,
          },
          select: {
            alumni_id: true,
            fname: true,
            lname: true,
            prefix: true,
            facultyId: true,
            departmentId: true,
            year_end: true,
            year_start: true,
            study_expreriences: {
              take: 1,
              where: {
                continued_study: true,
                isInThai: false,
              },
              select: {
                year_end: true,
                year_start: true,
                edu_university: true,
              },
              orderBy: {
                createdAt: "desc",
              },
            },
          },
          orderBy: {
            ...JSON.parse(sort),
          },
        }),
        prisma.alumni.count({
          where: {
            study_expreriences: {
              some: {
                isInThai: false,
                continued_study: true,
              },
            },
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
};
