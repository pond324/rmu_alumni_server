import { Elysia } from "elysia";
import { envConfig } from "../config/config";
import "dotenv/config";
import jwt from "@elysiajs/jwt";
import { cors } from "@elysiajs/cors";
import authRoutes from "../routes/authRoute.js";
import { alumniRoutes } from "../routes/alumniRoute.js";
import staticPlugin from "@elysiajs/static";
import { dashboardRoute } from "../routes/dashboardRoute.js";
import { presidentRoutes } from "../routes/presidentRoute.js";

const app = new Elysia({ prefix: "/rmu-api" })
  // cors
  .use(
    cors({
      origin: ["http://localhost:3181", "https://alumni.rmu.ac.th","http://10.110.29.111:3181"],
      credentials: true,
    }),
  )
  // jwt
  .use(
    jwt({
      secret: envConfig.jwt_secret,
      name: "jwt",
      exp: "1d",
    }),
  )
  .use(
    staticPlugin({
      prefix: "/",
      assets: "./public",
    }),
  )
  // auth
  .use(authRoutes)
  // alumni
  .use(alumniRoutes)
  // dashboard
  .use(dashboardRoute)
  // president
  .use(presidentRoutes)

  .listen(envConfig.port);

console.log(
  `🦊 Elysia is running at ${app.server?.hostname}:${app.server?.port}
   ${envConfig.port}`,
);
