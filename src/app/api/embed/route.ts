import { NextRequest } from "next/server";

export async function GET(request: NextRequest) {
  const url = request.nextUrl;
  const siteId = url.searchParams.get("siteId") || "";
  const surveyId = url.searchParams.get("surveyId") || "";
  const origin = url.origin;
  const js = `(() => { var s = document.currentScript; var d = document; var c = d.createElement('div'); c.style.position='fixed'; c.style.bottom='24px'; c.style.right='24px'; c.style.zIndex='2147483647'; c.style.width='360px'; c.style.maxWidth='90vw'; c.style.height='520px'; c.style.boxShadow='0 8px 24px rgba(0,0,0,0.24)'; c.style.borderRadius='12px'; c.style.overflow='hidden'; c.style.background='transparent'; var f = d.createElement('iframe'); f.src='${origin}/widget?siteId=${encodeURIComponent(siteId)}&surveyId=${encodeURIComponent(surveyId)}'; f.style.width='100%'; f.style.height='100%'; f.style.border='0'; f.setAttribute('title','Survey'); f.setAttribute('loading','eager'); c.appendChild(f); d.body.appendChild(c); })();`;
  return new Response(js, {
    status: 200,
    headers: {
      "Content-Type": "application/javascript; charset=utf-8",
      "Cache-Control": "no-store",
      "Access-Control-Allow-Origin": "*",
    },
  });
}
