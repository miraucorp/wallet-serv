import { AuContext } from "../types/types";

export const health = (ctx: AuContext) => {
  const data = {
    status: "ok",
  };
  ctx.response.ok(data, "ok");
};
