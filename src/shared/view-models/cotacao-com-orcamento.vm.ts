import { CotacaoComOrcamentoDto } from "../service-proxies/service-proxies";

export type CotacaoComOrcamentoVM = CotacaoComOrcamentoDto & {
  uiSelectedMaterials?: { [key: string]: string };
  uiTotal?: number;
};
