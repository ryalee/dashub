export interface ReportData {
  id: string;
  name: string;
  createdAt: string;
  fileName: string;
  aiAnalysis?: string;
  aiSummary?: string; // persiste no storage para reusar após reload
  metrics: {
    faturamento: number;
    ticketMedio: number;
    clientesAtivos: number;
    margemLucro: number;
    faturamentoAnterior: number;
    ticketAnterior: number;
    clientesAnterior: number;
    margemAnterior: number;
  };
  evolucaoFaturamento: { mes: string; valor: number }[];
  despesasPorCategoria: { nome: string; valor: number; cor: string }[];
  insights: {
    tipo: "positivo" | "atencao" | "critico" | "sugestao";
    titulo: string;
    texto: string;
    metrica?: string;
  }[];
  topProdutos?: { nome: string; valor: number; percentual: number }[];
  rawData: Record<string, unknown>[];
}

export interface Settings {
  groqApiKey: string;
}
