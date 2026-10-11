import { authentication } from "@/server/auth";
export const runtime = "nodejs";
export async function GET(request: Request) {
  return (await authentication()).handler(request);
}
export async function POST(request: Request) {
  return (await authentication()).handler(request);
}
