import { apiError } from "@/server/workspace-access";
import { receiveWebhook, webhookChallenge } from "@/server/whatsapp-webhooks";
export const runtime="nodejs";
export async function GET(request:Request,{params}:{params:Promise<{academyId:string}>}) {
  try {const {academyId}=await params;return new Response(webhookChallenge(academyId,new URL(request.url)),{headers:{"Cache-Control":"no-store"}});}catch(e){return apiError(e);}
}
export async function POST(request:Request,{params}:{params:Promise<{academyId:string}>}) {
  try {const {academyId}=await params;
    if(Number(request.headers.get("content-length") ?? 0)>1024*1024)return new Response(null,{status:413});
    const raw=await request.text();if(Buffer.byteLength(raw)>1024*1024)return new Response(null,{status:413});
    return Response.json(receiveWebhook(academyId,raw,request.headers.get("x-hub-signature-256")),{headers:{"Cache-Control":"no-store"}});
  }catch(e){return apiError(e);}
}
