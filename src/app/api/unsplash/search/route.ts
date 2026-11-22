import { NextResponse } from 'next/server';

/**
 * G1675 —— 「插入 Unsplash 图片」的搜索后端。
 *
 * 官方这一项接的是 Unsplash 图库；本地此前是灰掉的占位（`本地暂未实现`）。这条路由把那一格
 * 接上：配置了 `UNSPLASH_ACCESS_KEY` 就能搜、能插；没配则回 501，插入面板据此**保持**原来的
 * 禁用占位（不是假装能用）。
 */
export const runtime = 'nodejs';

export async function GET(request: Request) {
  const key = process.env.UNSPLASH_ACCESS_KEY;
  if (!key) {
    return NextResponse.json(
      { error: '未配置 UNSPLASH_ACCESS_KEY', configured: false },
      { status: 501 },
    );
  }

  const { searchParams } = new URL(request.url);
  const query = (searchParams.get('q') ?? '').trim();
  if (!query) {
    return NextResponse.json({ configured: true, results: [] });
  }

  const url = new URL('https://api.unsplash.com/search/photos');
  url.searchParams.set('query', query);
  url.searchParams.set('per_page', '18');
  url.searchParams.set('orientation', 'landscape');

  const response = await fetch(url, {
    headers: { Authorization: `Client-ID ${key}`, 'Accept-Version': 'v1' },
    cache: 'no-store',
  }).catch(() => null);

  if (!response || !response.ok) {
    return NextResponse.json({ configured: true, results: [], error: '图库服务暂不可用' }, { status: 502 });
  }

  const payload = (await response.json()) as {
    results?: {
      id: string;
      alt_description: string | null;
      urls: { small: string; regular: string };
      user: { name: string };
    }[];
  };

  return NextResponse.json({
    configured: true,
    results: (payload.results ?? []).map((photo) => ({
      id: photo.id,
      alt: photo.alt_description ?? photo.user?.name ?? 'Unsplash',
      thumb: photo.urls.small,
      full: photo.urls.regular,
      author: photo.user?.name ?? '',
    })),
  });
}
