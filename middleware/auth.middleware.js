export const middleware = {
  auth: async ({ jwt, set, cookie, store }) => {
    const token = cookie?.token?.value?.split(" ")[0] || null;
    if (!token) {
      set.status = 401;
      throw new Error("token not found!");
    }

    const user = await jwt.verify(token);
    if (!user) {
      set.status = 401;
      throw new Error("invalid token!");
    }

    store.user = user;
  },

  requireRole: (minRoleId) => async ({ jwt, set, cookie, store }) => {
    const token = cookie?.token?.value?.split(" ")[0] || null;
    if (!token) {
      set.status = 401;
      throw new Error("token not found!");
    }

    const user = await jwt.verify(token);
    if (!user) {
      set.status = 401;
      throw new Error("invalid token!");
    }

    store.user = user;

    if (Number(user.roleId) < minRoleId) {
      set.status = 403;
      throw new Error("Forbidden: Insufficient permissions");
    }
  },

  staff: async (context) => {
    return middleware.requireRole(2)(context);
  },

  executive: async (context) => {
    return middleware.requireRole(3)(context);
  },

  president: async (context) => {
    return middleware.requireRole(4)(context);
  },

  admin: async ({ jwt, set, cookie, store }) => {
    const token = cookie?.token?.value?.split(" ")[0] || null;
    if (!token) {
      set.status = 401;
      throw new Error("token not found!");
    }

    const user = await jwt.verify(token);
    if (!user) {
      set.status = 401;
      throw new Error("invalid token!");
    }

    store.user = user;

    if (Number(user.roleId) !== 5) {
      set.status = 403;
      throw new Error("Forbidden: Admin access required");
    }
  },
};

