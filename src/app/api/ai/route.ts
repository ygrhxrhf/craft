import { NextRequest } from 'next/server';
import { auth } from '@/lib/auth/auth';
import { parseAiContext, renderContextPrompt } from '@/lib/ai/context';
import { ASSISTANT_DISABLED } from '@/lib/ai/assistant-access';
import { assistantAvailableForUser } from '@/actions/user/assistant';
import OpenAI from 'openai';

const actionPrompts: Record<string, string> = {
  rewrite: '请改写以下文本，使其更清晰流畅，保持原意，直接输出改写结果，不要解释：',
  continue: '请续写以下文本，风格与内容保持一致，输出 1-3 句续写内容，不要重复原文，不要解释：',
  translate: '请将以下文本翻译为英文（若原文是英文则翻译为中文），直接输出译文，不要解释：',
  summarize: '请总结以下文本的要点，输出简洁的摘要，不要解释：',
};

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return Response.json({ error: '未授权' }, { status: 401 });
  }
  // G162: the two disable axes (user-level and per-space) gate the assistant here.
  if (!(await assistantAvailableForUser())) {
    return Response.json({ error: ASSISTANT_DISABLED }, { status: 403 });
  }

  const apiKey = process.env['OPENAI_API_KEY'];
  if (!apiKey) {
    return Response.json({ error: '未配置 OPENAI_API_KEY' }, { status: 500 });
  }

  let body: { action?: string; prompt?: string; text?: string; context?: unknown };
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: '无效请求' }, { status: 400 });
  }

  const { action, prompt, text } = body;
  // G116: structured context, deduped by document id before it reaches the model.
  const context = parseAiContext(body.context);
  const contextPrompt = renderContextPrompt(context);
  const userContent = contextPrompt ? `${contextPrompt}\n\n${text ?? ''}` : text;
  const systemPrompt = prompt?.trim() ? prompt.trim().slice(0, 2000) : action ? actionPrompts[action] : undefined;
  if (!systemPrompt || !text?.trim()) {
    return Response.json({ error: '缺少参数' }, { status: 400 });
  }

  const client = new OpenAI({ apiKey });
  try {
    const completion = await client.chat.completions.create({
      model: process.env['OPENAI_MODEL'] ?? 'gpt-4o-mini',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userContent ?? '' },
      ],
      temperature: 0.7,
    });
    const result = completion.choices[0]?.message?.content?.trim() ?? '';
    return Response.json({ text: result });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'AI 请求失败';
    return Response.json({ error: message }, { status: 502 });
  }
}
