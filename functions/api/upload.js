// R2 이미지 업로드 API
export async function onRequestPost(context) {
  const { request, env } = context;

  // CORS 헤더
  const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
  };

  try {
    const formData = await request.formData();
    const file = formData.get("file");
    const type = formData.get("type") || "background"; // 'background' 또는 'profile'

    if (!file) {
      return new Response(JSON.stringify({ error: "No file uploaded" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 파일 타입 검증 (이미지만 허용)
    if (!file.type.startsWith("image/")) {
      return new Response(
        JSON.stringify({ error: "Only image files are allowed" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // 파일명 생성 (중복 방지)
    const timestamp = Date.now();
    const randomStr = Math.random().toString(36).substring(2, 8);
    const extension = file.name.split(".").pop();
    const folder = type === "profile" ? "profiles" : "backgrounds";
    const fileName = `${folder}/${timestamp}-${randomStr}.${extension}`;

    // R2에 업로드
    await env.MY_BUCKET.put(fileName, file.stream(), {
      httpMetadata: {
        contentType: file.type,
      },
    });

    // 공개 URL 생성 (R2 public bucket URL)
    const publicUrl = `https://pub-6338ef5f0581459fb6d9667db7b52696.r2.dev/${fileName}`;

    return new Response(
      JSON.stringify({
        success: true,
        url: publicUrl,
        fileName: fileName,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Upload error:", error);
    return new Response(
      JSON.stringify({
        error: "Upload failed",
        message: error.message,
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
}

// OPTIONS 요청 처리 (CORS preflight)
export async function onRequestOptions() {
  return new Response(null, {
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
    },
  });
}
