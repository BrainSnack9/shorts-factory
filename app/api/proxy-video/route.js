import { NextResponse } from "next/server";

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const videoUrl = searchParams.get("url");

    if (!videoUrl) {
      return NextResponse.json(
        { error: "URL parameter is required" },
        { status: 400 }
      );
    }

    // 외부 비디오 URL 검증 (보안을 위해 특정 도메인만 허용)
    const allowedDomains = [
      "videos.pexels.com",
      "cdn.pixabay.com",
      "sample-videos.com",
    ];

    const url = new URL(videoUrl);
    if (!allowedDomains.includes(url.hostname)) {
      return NextResponse.json(
        { error: "Domain not allowed" },
        { status: 403 }
      );
    }

    // 외부 비디오 가져오기
    const response = await fetch(videoUrl, {
      headers: {
        "User-Agent": "Mozilla/5.0 (compatible; VideoProxy/1.0)",
      },
    });

    if (!response.ok) {
      return NextResponse.json(
        { error: "Failed to fetch video" },
        { status: response.status }
      );
    }

    // 비디오 데이터를 스트리밍으로 반환
    const videoBuffer = await response.arrayBuffer();

    return new NextResponse(videoBuffer, {
      status: 200,
      headers: {
        "Content-Type": response.headers.get("content-type") || "video/mp4",
        "Content-Length": videoBuffer.byteLength.toString(),
        "Cache-Control": "public, max-age=3600", // 1시간 캐시
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET",
        "Access-Control-Allow-Headers": "Content-Type",
      },
    });
  } catch (error) {
    console.error("[proxy-video] Error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
