import { NextRequest } from 'next/server';
import OpenAI from 'openai';
import { PDFParse } from 'pdf-parse';
import { auth } from '@/lib/auth/auth';

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return Response.json({ error: '未授权' }, { status: 401 });

  const apiKey = process.env['OPENAI_API_KEY'];
  if (!apiKey) return Response.json({ error: '未配置 OPENAI_API_KEY' }, { status: 500 });

  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return Response.json({ error: '无效请求' }, { status: 400 });
  }
  const file = form.get('file');
  const question = String(form.get('question') ?? '').trim();
  if (!(file instanceof File)) return Response.json({ error: '缺少 PDF 文件' }, { status: 400 });
  if (!question) return Response.json({ error: '缺少问题' }, { status: 400 });
  if (file.size > 10 * 1024 * 1024) return Response.json({ error: 'PDF 超过 10MB' }, { status: 400 });

  let text = '';
  try {
    const parser = new PDFParse({ data: new Uint8Array(await file.arrayBuffer()) });
    const result = await parser.getText();
    text = result.text.trim();
    await parser.destroy();
  } catch {
    return Response.json({ error: 'PDF 解析失败' }, { status: 422 });
  }
  if (!text) return Response.json({ error: 'PDF 没有可提取的文字' }, { status: 422 });

  const client = new OpenAI({ apiKey });
  try {
    const completion = await client.chat.completions.create({
      model: process.env['OPENAI_MODEL'] ?? 'gpt-4o-mini',
      messages: [
        { role: 'system', content: '你是一个文档问答助手。只根据提供的 PDF 内容回答，找不到答案时直接说明。' },
        { role: 'user', content: `问题：${question}\n\nPDF 内容：\n${text.slice(0, 12000)}` },
      ],
      temperature: 0.2,
    });
    const answer = completion.choices[0]?.message?.content?.trim() ?? '';
    return Response.json({ text: answer });
  } catch (error) {
    return Response.json({
      error: error instanceof Error ? error.message : 'AI 请求失败',
    }, { status: 502 });
  }
}
