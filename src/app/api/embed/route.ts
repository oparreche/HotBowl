import { NextRequest } from "next/server";

export async function GET(request: NextRequest) {
  const url = request.nextUrl;
  const siteId = url.searchParams.get("siteId") || "";
  const surveyId = url.searchParams.get("surveyId") || "";
  const origin = url.origin;
  const js = `(() => {
    var d = document;
    var c = d.createElement('div');
    c.style.position='fixed'; c.style.bottom='24px'; c.style.right='24px';
    c.style.zIndex='2147483647'; c.style.width='360px'; c.style.maxWidth='100vw';
    c.style.height= '280px'; c.style.maxHeight='90vh'; c.style.boxShadow='0 8px 24px rgba(0,0,0,0.24)';
    c.style.borderRadius='12px'; c.style.overflow='hidden'; c.style.background='#fff';
    var f = d.createElement('iframe');
    f.src='${origin}/widget?siteId=${encodeURIComponent(siteId)}&surveyId=${encodeURIComponent(surveyId)}';
    f.style.width='100%'; f.style.height='280px'; f.style.border='0'; f.style.overflow='none';
    f.setAttribute('title','Survey'); f.setAttribute('loading','eager');
    c.appendChild(f); d.body.appendChild(c);
    function handleMessage(e){
      try {
        var data = e && e.data;
        if (!data || data.type!=='HB_EMBED') return;
        if (data.action==='REMOVE') {
          if (c && c.parentNode) c.parentNode.removeChild(c);
          window.removeEventListener('message', handleMessage);
        } else if (data.action==='HEIGHT') {
          var maxH = Math.floor(window.innerHeight * 0.9);
          var h = Math.max(360, Math.min(Number(data.height||0), maxH));
          c.style.height = h + 'px';
        }
      } catch {}
    }
    function onResize(){
      try {
        var maxH = Math.floor(window.innerHeight * 0.9);
        c.style.height = '280px';
      } catch {}
    }
    window.addEventListener('message', handleMessage);
    window.addEventListener('resize', onResize);
  })();`;
  return new Response(js, {
    status: 200,
    headers: {
      "Content-Type": "application/javascript; charset=utf-8",
      "Cache-Control": "no-store",
      "Access-Control-Allow-Origin": "*",
    },
  });
}
