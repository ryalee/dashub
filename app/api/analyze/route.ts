import { NextRequest, NextResponse } from "next/server";

const SYSTEM_PROMPT = `Você é um CFO e analista de negócios sênior. Analise os dados e retorne SOMENTE JSON válido, sem markdown, sem texto fora do JSON:

{"aiAnalysis":"string","insights":[{"tipo":"string","titulo":"string","texto":"string","metrica":"string"}]}

REGRAS aiAnalysis: 2 frases. Frase 1 = diagnóstico com 2-3 números reais dos dados. Frase 2 = principal oportunidade ou risco com valor concreto.

REGRAS insights: exatamente 5 objetos, nesta ordem:
1. tipo "positivo" — maior conquista dos dados com número exato
2. tipo "atencao" OU "critico" — risco 1 quantificado (concentração, queda, sazonalidade negativa)
3. tipo "atencao" OU "critico" — risco 2 diferente do anterior
4. tipo "sugestao" — ação concreta para próximo ciclo citando período e meta numérica
5. tipo "sugestao" — segunda ação prática com KPI-alvo específico

OBRIGATÓRIO: texto com 2 frases (fato com dado real + ação recomendada). metrica = número mais relevante (ex: "+18%", "R$ 4.091", "50.5%").
PROIBIDO: "monitore", "avalie", "considere", qualquer frase sem número concreto dos dados fornecidos.
tipos válidos APENAS: "positivo", "atencao", "critico", "sugestao"`;

export async function POST(req: NextRequest) {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error:"GROQ_API_KEY não configurada. Crie o arquivo .env.local com sua chave da API Groq." },
      { status: 500 },
    );
  }

  // analisa body
  let summary: string;
  try {
    const body = await req.json();
    summary = body?.summary?.trim() ?? "";
  } catch {
    return NextResponse.json(
      { error: "Body inválido — envie JSON com campo 'summary'" },
      { status: 400 },
    );
  }

  if (!summary) {
    return NextResponse.json(
      { error: "Campo 'summary' obrigatório e não pode ser vazio" },
      { status: 400 },
    );
  }

  // Chamar Groq API
  let groqRes: Response;
  try {
    groqRes = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "llama-3.3-70b-versatile",
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          { role: "user", content: summary }
        ],
        max_tokens: 1200,
        temperature: 0.1,
        response_format: { type: "json_object" }, // força json
      }),
    });
  } catch (err: any) {
    console.error("[/api/analyze] Erro de rede:", err?.message);
    return NextResponse.json(
      { error: `Erro ao conectar com Groq: ${err?.message}` },
      { status: 502 },
    );
  }

  if (!groqRes.ok) {
    const errText = await groqRes.text().catch(() => "");
    console.error(`[/api/analyze] Groq ${groqRes.status}:`, errText);
    return NextResponse.json(
      { error: `Groq API erro ${groqRes.status}: ${errText}` },
      { status: groqRes.status },
    );
  }

  // analisar resposta
  const data = await groqRes.json();
  const raw = (data.choices?.[0]?.message?.content ?? "").trim();

  // remove markdown se tiver
  const clean = raw
    .replace(/^```(?:json)?\n?/, "")
    .replace(/\n?```$/, "")
    .trim();

  let parsed: any;
  try {
    parsed = JSON.parse(clean);
  } catch {
    // tenta extrair json externo
    const jsonMatch = clean.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      console.error(
        "[/api/analyze] Não foi possível analisar:",
        clean.slice(0, 200),
      );
      return NextResponse.json(
        { error: "Resposta da IA não é JSON válido", raw: clean.slice(0, 200) },
        { status: 502 },
      );
    }
    try {
      parsed = JSON.parse(jsonMatch[0]);
    } catch {
      return NextResponse.json(
        { error: "JSON malformado na resposta da IA" },
        { status: 502 },
      );
    }
  }

  if (!Array.isArray(parsed?.insights) || parsed.insights.length === 0) {
    console.warn("[/api/analyze] Sem insights na resposta:", parsed);
    return NextResponse.json(
      { error: "IA não retornou insights", raw: parsed },
      { status: 502 },
    );
  }

  return NextResponse.json({
    aiAnalysis: parsed.aiAnalysis ?? "",
    insights: parsed.insights,
  });
}