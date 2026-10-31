import { access, sameOrigin, privateJson, apiError } from "@/server/workspace-access";
import { communicationAction, communicationView } from "@/server/communication-service";
export const runtime="nodejs";
export async function GET(request:Request,{params}:{params:Promise<{academyId:string}>}) {
  try {const {academyId}=await params;return privateJson(communicationView(await access(request.headers,academyId)));}catch(e){return apiError(e);}
}
export async function POST(request:Request,{params}:{params:Promise<{academyId:string}>}) {
  try {sameOrigin(request);const {academyId}=await params;return privateJson(await communicationAction(await access(request.headers,academyId),await request.json()));}catch(e){return apiError(e);}
}
