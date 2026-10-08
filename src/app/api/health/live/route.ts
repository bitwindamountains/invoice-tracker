import { getEnvironment } from "@/lib/env";
export function GET(){return Response.json({status:"ok",version:getEnvironment().DEPLOYMENT_VERSION},{headers:{"Cache-Control":"no-store"}});}
