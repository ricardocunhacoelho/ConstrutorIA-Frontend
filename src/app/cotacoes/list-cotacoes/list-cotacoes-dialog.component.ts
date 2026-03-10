import {
    ChangeDetectorRef,
    Component,
    EventEmitter,
    Input,
    OnInit,
    Output
} from '@angular/core';
import { CommonModule, NgIf } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { BsModalRef, BsModalService } from 'ngx-bootstrap/modal';
import { TableModule } from 'primeng/table';
import { PaginatorModule } from 'primeng/paginator';

import {
    CompraDto,
    CompraServiceProxy,
    CotacaoComOrcamentoDto,
    CotacaoDto,
    CotacaoServiceProxy,
    CreateEnderecoDto,
    CreateMaterialPedidoCompraDto,
    CreateMelhorCompraDto,
    CreatePedidoCompraDto,
    CriarFluxoCompletoDto,
    FormaPagamento,
    GetMensagensNaoLidasCountInput,
    IntervencaoCompraDto,
    IntervencaoCompraServiceProxy,
    MaterialCotadoDto,
    MaterialOrcadoDto,
    MelhorCompraStatus,
    ObraLancamentoFinanceiroServiceProxy,
    OrcamentoDto,
    PedidoCompraDto,
    PedidoCompraServiceProxy,
    ResolverIntervencaoDto,
    SimpleLookupDto,
    SimpleLookupWithAdressDto
} from '../../../shared/service-proxies/service-proxies';

import { CreateCotacaoDialogComponent } from '../create-cotacao/create-cotacao-dialog.component';

import {
    trigger,
    style,
    transition,
    animate
} from '@angular/animations';
import { SelecionarEnderecoDialogComponent } from './selecionar-endereco-dialog/selecionar-endereco-dialog.component';
import { forkJoin, map, of, switchMap } from 'rxjs';
import { ConfirmarPagamentoDialogComponent } from '@shared/components/confirmar-pagamento-dialog/confirmar-pagamento-dialog.component.';
import { ConversaModalComponent } from '@shared/components/conversa-modal/conversa-modal.component';


const MENOR_VALOR_TIPO = 'MENOR_VALOR_POR_ITEM';

// Type guards
function isOpcaoOutroFornecedor(opcao: any): opcao is OpcaoOutroFornecedor {
    return opcao && typeof opcao === 'object' && opcao.tipo === 'OUTRO_FORNECEDOR';
}

function isOpcaoSugestao(opcao: any): opcao is OpcaoSugestao {
    return opcao && typeof opcao === 'object' && opcao.tipo === 'ACEITAR_SUGESTAO';
}

function isOpcaoManterOriginal(opcao: any): opcao is OpcaoManterOriginal {
    return opcao && typeof opcao === 'object' && opcao.tipo === 'MANTER_ORIGINAL';
}

function isOpcaoManterOriginalPrazo(opcao: any): opcao is OpcaoManterOriginalPrazo {
    return opcao && typeof opcao === 'object' && opcao.tipo === 'MANTER_ORIGINAL_PRAZO';
}

function isOpcaoNovoFornecedor(opcao: any): opcao is OpcaoNovoFornecedor {
    return opcao && typeof opcao === 'object' && opcao.tipo === 'NOVO_FORNECEDOR';
}
interface ResultadoEnderecoPagamento {
    tipoEntrega: 'OBRA' | 'OUTRO' | 'RETIRADA';
    endereco?: CreateEnderecoDto;
    enderecoObraId?: string;
    formaPagamento?: 'PIX' | 'CREDITO' | 'DEBITO' | 'DINHEIRO' | 'FATURADO';
}

type StatusGrupo = 'PAGO' | 'CONCLUIDO' | 'PEDIDO' | 'SUBSTITUIDO' | 'RESOLVIDO' | 'PENDENTE' | null;
interface CotacaoComOrcamentoViewModel {
    id: string;
    solicitacaoMaterialId?: string;
    obraId?: string;
    obra?: SimpleLookupWithAdressDto;
    fornecedor?: SimpleLookupDto;
    orcamento?: OrcamentoDto;
    hasOrcamento: boolean;
    total?: number;
    displayStatus?: string;
    observacaoInterna?: string;
    observacaoFornecedor?: string;
    materiaisCotados: MaterialCotadoDto[];
    statusView?: string;
    status?: string;
    retiradaNoFornecedor?: boolean;
    quantidadeNotificacoes?: number;

    materiaisAgrupados?: MaterialVMGrupo[];
}


interface FluxoCompraBaseViewModel {
    id: string;
    tipo: 'COTACAO' | 'MENOR_VALOR_POR_ITEM';

    materiaisAgrupados: MaterialVMGrupo[];

    enderecoEntrega?: {
        id?: string;
        formatado: string;
        origem: 'COMPRA' | 'PEDIDO' | 'ORCAMENTO';
    };

    usuarioPedido?: string;
    compraEfetivada?: InfoCompraFornecedor;
    pagamentoConfirmado?: InfoPagamentoCompra;
    displayStatus: string;
    quantidadeNotificacoes?: number;
}

interface CotacaoFluxoViewModel extends FluxoCompraBaseViewModel {
    tipo: 'COTACAO';

    id: string;
    solicitacaoMaterialId?: string;
    obraId?: string;
    obra?: SimpleLookupWithAdressDto;
    fornecedor?: SimpleLookupDto;
    orcamento?: OrcamentoDto;
    hasOrcamento: boolean;
    total?: number;
    observacaoInterna?: string;
    observacaoFornecedor?: string;
    materiaisCotados: MaterialCotadoDto[]
    statusView?: string;
    status?: string;
}


interface MenorValorPorItemViewModel
    extends FluxoCompraBaseViewModel {

    tipo: 'MENOR_VALOR_POR_ITEM';
    id: 'menor-valor-por-item';

    obraId?: string;
    obra?: SimpleLookupWithAdressDto;
    solicitacaoMaterialId?: string;

    resumoFrete: {
        possuiFretePorItem: boolean;
        fornecedoresComFrete: string[];
    };
}

type FluxoCompraViewModel =
    | CotacaoFluxoViewModel
    | MenorValorPorItemViewModel;



type MaterialVMExtended = {
    fornecedorNome?: string;
    cotacaoId?: string;
    pedidoId?: string;

    id?: string;
    orcamentoId?: string;
    nome?: string | undefined;
    precoItem?: number | undefined;
    precoTotal?: number | undefined;
    emFalta: boolean;
    quantidade?: number | undefined;
    unidade?: string | undefined;
    especificacao?: string | undefined;
    fornecedorId?: string | undefined;
    observacaoInternaOrcamentoOrigem?: string | undefined;
    observacaoFornecedorOrcamentoOrigem?: string | undefined;
    valorFreteOrcamentoOrigem?: number | undefined;
    condicaoFreteOrcamentoOrigem?: string | undefined;
    valorDescontoOrcamentoOrigem?: number | undefined;
    condicaoDescontoOrcamentoOrigem?: string | undefined;
};

interface MaterialVMGrupo {
    nome: string;
    variacoes: MaterialVMExtended[];
    selected: MaterialVMExtended | null;
    removido?: boolean;
    feitoPedido?: boolean;
    jaComprado?: boolean;
    cotacaoSelecionadaId?: string;
    prazoEntrega?: string;
    observacao?: string;
    intervencao?: IntervencaoCompraDto;

    intervencoes?: IntervencaoCompraDto[];
    sugestoes?: {
        intervencaoId: string;
        especificacao: string;
        precoItem: number;
    }[];
    intervencaoResolvida?: boolean;
    opcaoSelecionada?: OpcaoSelecionada;

    materialCotadoId?: string;

    substituido?: boolean;
    novoFornecedorId?: string;
    materialOriginalId?: string;
}

type InfoCompraFornecedor = {
    fornecedorNome: string;
    prazoEntrega?: string;
    observacao?: string;
};

type InfoPagamentoCompra = {
    data?: string;
    valor?: number;
    formaPagamento?: any;
};

interface AlternativaFornecedor {
    fornecedorId: string;
    fornecedorNome: string;
    cotacaoId: string;
    orcamentoId: string;
    materialId: string;
    precoItem: number;
    precoTotal: number;
    especificacao: string;
    quantidade: number;
    unidade: string;
    observacao?: string;
    emFalta: boolean;

    // Dados do orçamento original
    valorFrete?: number;
    valorDesconto?: number;
    condicaoFrete?: string;
    condicaoDesconto?: string;
}

// Tipos de opção possíveis
interface OpcaoBase {
    tipo: 'ACEITAR_SUGESTAO' | 'OUTRO_FORNECEDOR' | 'MANTER_ORIGINAL' | 'MANTER_ORIGINAL_PRAZO' | 'NOVO_FORNECEDOR';
}

interface OpcaoSugestao extends OpcaoBase {
    tipo: 'ACEITAR_SUGESTAO';
    intervencaoId?: string;
    materialSugerido: {
        especificacao: string;
        precoItem: number;
    };
}

interface OpcaoOutroFornecedor extends OpcaoBase {
    tipo: 'OUTRO_FORNECEDOR';
    fornecedorId: string;
    fornecedorNome: string;
    cotacaoId: string;
    orcamentoId: string;
    materialId: string;
    precoItem: number;
    precoTotal: number;
    especificacao: string;
}

interface OpcaoManterOriginal extends OpcaoBase {
    tipo: 'MANTER_ORIGINAL';
}

interface OpcaoManterOriginalPrazo extends OpcaoBase {
    tipo: 'MANTER_ORIGINAL_PRAZO';
}

interface OpcaoNovoFornecedor extends OpcaoBase {
    tipo: 'NOVO_FORNECEDOR';
}

type OpcaoSelecionada =
    | OpcaoSugestao
    | OpcaoOutroFornecedor
    | OpcaoManterOriginal
    | OpcaoNovoFornecedor
    | string;

@Component({
    selector: 'app-cotacoes-list-dialog',
    standalone: true,
    templateUrl: './list-cotacoes-dialog.component.html',
    styleUrls: ['./list-cotacoes-dialog.component.scss'],
    imports: [
        CommonModule,
        NgIf,
        FormsModule,
        TableModule,
        PaginatorModule,
    ],
    animations: [
        trigger('expandCollapse', [
            transition(':enter', [
                style({ height: 0, opacity: 0, overflow: 'hidden' }),
                animate('500ms ease', style({ height: '*', opacity: 1 }))
            ]),
            transition(':leave', [
                style({ height: '*', opacity: 1, overflow: 'hidden' }),
                animate('500ms ease', style({ height: 0, opacity: 0 }))
            ])
        ])
    ]
})
export class CotacoesListDialogComponent implements OnInit {
    @Input() solicitacaoId: string;
    @Output() onSave = new EventEmitter<void>();

    pedidosCache?: PedidoCompraDto[];
    cotacoesCache?: CotacaoComOrcamentoDto[];
    comprasCache?: CompraDto[];

    fluxoCompraVM: FluxoCompraViewModel[] = [];
    obraNome: string = '';
    expandedIndex: number | null = null;
    expanded: boolean[] = [];
    loading = false;
    naoCompensaMelhorCompra = false;
    savingCompra = false;
    pedidoOrigemId: string | null = null;
    existePedido: boolean = false;
    menorValorPorItemAgrupada: {
        fornecedorId: string;
        fornecedor: string;
        grupos: MaterialVMGrupo[];
        prazoEntrega?: string;
        observacao?: string;
        pagamentoConfirmado?: InfoPagamentoCompra;
        quantidadeNotificacoes?: number;
    }[] = [];

    private alternativasCache = new Map<string, AlternativaFornecedor[]>();

    constructor(
        public bsModalRef: BsModalRef,
        private _cotacaoService: CotacaoServiceProxy,
        private _pedidoCompraService: PedidoCompraServiceProxy,
        private _compraService: CompraServiceProxy,
        private _intervencaoCompraService: IntervencaoCompraServiceProxy,
        private _obraLancamentoFinanceiroService: ObraLancamentoFinanceiroServiceProxy,
        private _modalService: BsModalService,
        private cdr: ChangeDetectorRef
    ) { }

    ngOnInit(): void {
        this.loadCotacoes();
    }

    loadCotacoes(): void {
        this.loading = true;

        forkJoin({
            cotacoesComOrcamento: this._cotacaoService.getAllWithOrcamentoBySolicitacao(this.solicitacaoId),
            pedidos: this._pedidoCompraService.getAllBySolicitacao(this.solicitacaoId),
            compras: this._compraService.getAllBySolicitacao(this.solicitacaoId),
            intervencoesCompras: this._intervencaoCompraService.getAllBySolicitacao(this.solicitacaoId),
            lancamentos: this._obraLancamentoFinanceiroService.getAllBySolicitacao(this.solicitacaoId)
        }).pipe(
            switchMap(results => {
                const cotacaoIds = results.cotacoesComOrcamento.map(c => c.id);
                const pedidoIds = results.pedidos.map(p => p.id);

                if (cotacaoIds.length === 0 && pedidoIds.length === 0) {
                    return of({ ...results, mensagens: [] });
                }

                const input = new GetMensagensNaoLidasCountInput();
                input.cotacaoIds = cotacaoIds;
                input.pedidoIds = pedidoIds;

                return this._cotacaoService.getMensagensNaoLidasCount(input).pipe(
                    map(mensagens => ({ ...results, mensagens }))
                );
            })
        ).subscribe(({
            cotacoesComOrcamento,
            pedidos,
            compras,
            intervencoesCompras,
            lancamentos,
            mensagens
        }) => {

            const notificacoesMap = new Map<string, number>();

            if (mensagens && mensagens.length) {
                mensagens.forEach(m => {
                    notificacoesMap.set(`${m.tipo}_${m.id}`, m.quantidade);
                });
            }

            this.pedidosCache = pedidos;
            this.cotacoesCache = cotacoesComOrcamento;
            this.comprasCache = compras;

            this.obraNome = cotacoesComOrcamento[0]?.obra?.nome || '';

            const list = (cotacoesComOrcamento as CotacaoComOrcamentoViewModel[]) || [];

            list.forEach(c => {
                if (c.hasOrcamento && c.orcamento) {
                    c.materiaisAgrupados = this.groupMateriaisFromOrcamento(c.orcamento, c);
                }

                c.quantidadeNotificacoes = notificacoesMap.get(`cotacao_${c.id}`) || 0;
            });

            if (pedidos && pedidos.length) {
                (pedidos as any[]).forEach(p => {
                    p.quantidadeNotificacoes = notificacoesMap.get(`pedido_${p.id}`) || 0;
                });
            }

            const temMaisDeUm = list.filter(c =>
                c.hasOrcamento && c.orcamento?.materiaisOrcados?.length
            ).length > 1;

            if (temMaisDeUm) {
                const menoresValoresPorItens = this.buildMenorValorPorItem(list);

                const totalMelhor = this.getTotal(menoresValoresPorItens);
                const totaisIndividuais = list.map(c => this.getTotal(c));
                const menorIndividual = Math.min(...totaisIndividuais);

                if (totalMelhor === menorIndividual) {
                    this.naoCompensaMelhorCompra = true;
                }

                const cotacoesFluxo = this.mapToCotacaoFluxo(list);

                this.fluxoCompraVM = [
                    ...cotacoesFluxo,
                    menoresValoresPorItens
                ];
                this.expanded = new Array(this.fluxoCompraVM.length).fill(false);

            } else {
                this.fluxoCompraVM = this.mapToCotacaoFluxo(list);
                this.expanded = new Array(this.fluxoCompraVM.length).fill(false);
            }

            this.conciliarPedidosECompras(this.fluxoCompraVM, pedidos, compras);
            this.aplicarIntervencoes(this.fluxoCompraVM, intervencoesCompras);

            const menorValorPorItem = this.fluxoCompraVM.find(
                (c): c is MenorValorPorItemViewModel =>
                    c.tipo === 'MENOR_VALOR_POR_ITEM'
            );

            if (menorValorPorItem) {
                this.menorValorPorItemAgrupada =
                    this.buildGruposPorFornecedor(menorValorPorItem);

                if (this.menorValorPorItemAgrupada && pedidos) {
                    this.menorValorPorItemAgrupada.forEach(grupoFornecedor => {
                        const pedidosDoFornecedor = (pedidos as any[]).filter(p =>
                            p.fornecedorId === grupoFornecedor.fornecedorId &&
                            p.isMelhorCompra === true
                        );

                        const cotacoesDoFornecedor = (cotacoesComOrcamento as any[]).filter(c =>
                            c.fornecedorId === grupoFornecedor.fornecedorId
                        );

                        let notificacoesCotacao = cotacoesDoFornecedor.reduce(
                            (total, p) => total + (p.quantidadeNotificacoes || 0), 0
                        );

                        let notificacoesPedidos = pedidosDoFornecedor.reduce(
                            (total, p) => total + (p.quantidadeNotificacoes || 0), 0
                        );

                        grupoFornecedor.quantidadeNotificacoes = notificacoesCotacao + notificacoesPedidos;
                    });
                }
            }

            this.conciliarPagamentos(this.fluxoCompraVM, compras, lancamentos);

            this.loading = false;
            this.cdr.detectChanges();
        }, error => {
            console.error('Erro ao carregar cotações:', error);
            this.loading = false;
            abp.notify.error('Erro ao carregar cotações');
        });
    }

    private mapToCotacaoFluxo(
        cotacoes: CotacaoComOrcamentoViewModel[]
    ): CotacaoFluxoViewModel[] {

        return cotacoes.map(c => ({
            tipo: 'COTACAO',

            id: c.id,
            solicitacaoMaterialId: c.solicitacaoMaterialId,
            obraId: c.obraId,
            obra: c.obra,
            fornecedor: c.fornecedor,
            orcamento: c.orcamento,
            hasOrcamento: c.hasOrcamento,
            total: c.total,
            observacaoInterna: c.observacaoInterna,
            observacaoFornecedor: c.observacaoFornecedor,
            materiaisCotados: c.materiaisCotados,
            statusView: c.statusView,
            status: c.status,
            quantidadeNotificacoes: c.quantidadeNotificacoes,

            displayStatus: c.displayStatus ?? 'Cotação',
            materiaisAgrupados: c.materiaisAgrupados ?? [],
            enderecoEntrega: !c.retiradaNoFornecedor && c.orcamento?.enderecoEntrega?.id
                ? {
                    id: c.orcamento.enderecoEntrega.id,
                    formatado: this.formatarEndereco(c.orcamento.enderecoEntrega),
                    origem: 'ORCAMENTO'
                }
                : null
        }));
    }

    private conciliarPedidosECompras(
        fluxos: FluxoCompraViewModel[],
        pedidos: any[],
        compras: any[]
    ): void {

        if (!fluxos?.length) return;

        const materiaisPedidos = new Set<string>();
        const materiaisComprados = new Set<string>();

        const materialParaPedido = new Map<string, { pedidoId: string, fornecedorId: string, fornecedorNome: string }>();

        (pedidos || []).forEach(pedido => {
            (pedido.materiaisPedidosCompra || []).forEach((mat: any) => {
                if (mat.materialOrcadoId) {
                    materiaisPedidos.add(mat.materialOrcadoId);

                    materialParaPedido.set(mat.materialOrcadoId, {
                        pedidoId: pedido.id,
                        fornecedorId: pedido.fornecedorId,
                        fornecedorNome: pedido.fornecedor?.nome || 'Fornecedor'
                    });
                }
            });
        });

        (compras || []).forEach(compra => {
            (compra.materiaisComprados || []).forEach((mat: any) => {
                if (mat.materialOrcadoId) {
                    materiaisComprados.add(mat.materialOrcadoId);
                }
            });
        });

        fluxos.forEach(fluxo => {

            let jaComprado = false;

            if (fluxo.materiaisAgrupados?.length) {
                fluxo.materiaisAgrupados.forEach(grupo => {

                    let foiPedido = false;
                    let foiComprado = false;

                    grupo.variacoes.forEach(v => {
                        if (!v.id) return;

                        if (materiaisPedidos.has(v.id)) {
                            foiPedido = true;

                            const dadosPedido = materialParaPedido.get(v.id);
                            if (dadosPedido && dadosPedido.fornecedorId !== v.fornecedorId) {
                                grupo.substituido = true;
                                grupo.novoFornecedorId = dadosPedido.fornecedorId;
                                if (grupo.selected) {
                                    grupo.selected.fornecedorId = dadosPedido.fornecedorId;
                                    grupo.selected.fornecedorNome = dadosPedido.fornecedorNome;
                                    grupo.selected.pedidoId = dadosPedido.pedidoId;
                                }
                            }
                        }

                        if (materiaisComprados.has(v.id)) foiComprado = true;
                    });

                    grupo.feitoPedido = foiPedido;
                    grupo.jaComprado = foiComprado;
                    jaComprado = jaComprado || foiComprado;

                    if (grupo.jaComprado) {
                        grupo.removido = false;
                        grupo.selected = grupo.selected ?? grupo.variacoes[0];
                        if (fluxo.tipo === MENOR_VALOR_TIPO) {
                            grupo.prazoEntrega = compras.find(c => c.cotacaoId === grupo.selected?.cotacaoId)?.prazoEntrega;
                            grupo.observacao = compras.find(c => c.cotacaoId === grupo.selected?.cotacaoId)?.observacao;
                        }
                    }
                });
                if (fluxo.tipo !== MENOR_VALOR_TIPO && jaComprado) {
                    let infos = {
                        fornecedorNome: compras.find(c => c.cotacaoId === fluxo.id)?.fornecedorNome,
                        prazoEntrega: compras.find(c => c.cotacaoId === fluxo.id)?.prazoEntrega,
                        observacao: compras.find(c => c.cotacaoId === fluxo.id)?.observacao,
                    };
                    fluxo.compraEfetivada = infos;
                }
            }

            // ==========================
            // ENDEREÇO (COMPRA > PEDIDO)
            // ==========================

            // 🔥 COMPRA
            const compra = (compras || []).find(c =>
                c.cotacaoId === fluxo.id
            );

            // 🔹 PEDIDO
            const pedido = (pedidos || []).find(p =>
                fluxo.tipo === MENOR_VALOR_TIPO
                    ? p.isMelhorCompra
                    : p.cotacaoId === fluxo.id
            );

            if (pedido?.user?.nome) {
                fluxo.usuarioPedido = pedido.user.nome;
            }

            if (compra?.enderecoEntrega) {
                fluxo.enderecoEntrega = {
                    id: compra.enderecoEntrega.id,
                    formatado: this.formatarEndereco(compra.enderecoEntrega),
                    origem: 'COMPRA'
                };
                return;
            }

            if (pedido?.enderecoEntrega) {
                fluxo.enderecoEntrega = {
                    id: pedido.enderecoEntrega.id,
                    formatado: this.formatarEndereco(pedido.enderecoEntrega),
                    origem: 'PEDIDO'
                };
            }

        });

        // ==========================
        // BLOQUEIO DE COTAÇÕES
        // ==========================
        this.pedidoOrigemId = null;
        this.existePedido = false;

        const pedidoMenorValorItem = (pedidos || []).find(p => p.isMelhorCompra);

        if (pedidoMenorValorItem) {
            this.existePedido = true;
            this.pedidoOrigemId = MENOR_VALOR_TIPO;
            return;
        }

        const pedidoNormal = (pedidos || []).find(p => p.cotacaoId);

        if (pedidoNormal) {
            this.existePedido = true;
            this.pedidoOrigemId = pedidoNormal.cotacaoId;
        }
    }

    private aplicarIntervencoes(
        cotacoes: FluxoCompraViewModel[],
        intervencoes: IntervencaoCompraDto[]
    ): void {
        if (!intervencoes?.length) return;

        // Agrupa intervenções por materialOrcadoId
        const intervencoesPorMaterial = new Map<string, IntervencaoCompraDto[]>();
        intervencoes.forEach(interv => {
            const materialOrcadoId = interv.materialPedidoCompra?.materialOrcadoId;
            if (!materialOrcadoId) return;
            if (!intervencoesPorMaterial.has(materialOrcadoId)) {
                intervencoesPorMaterial.set(materialOrcadoId, []);
            }
            intervencoesPorMaterial.get(materialOrcadoId)!.push(interv);
        });

        cotacoes.forEach(cotacao => {
            cotacao.materiaisAgrupados?.forEach(grupo => {
                // Se o grupo tem um material selecionado, verifica se há intervenções para ele
                const materialOrcadoId = grupo.selected?.id;
                if (!materialOrcadoId) return;

                const intervencoesDoGrupo = intervencoesPorMaterial.get(materialOrcadoId) || [];
                if (intervencoesDoGrupo.length === 0) return;

                // Guarda todas as intervenções do grupo
                grupo.intervencoes = intervencoesDoGrupo;

                // Extrai as sugestões das intervenções (apenas as que têm material sugerido)
                const sugestoes = intervencoesDoGrupo
                    .filter(i => !i.resolvida && i.materialSugeridoEspecificacao)
                    .map(i => ({
                        intervencaoId: i.id,
                        especificacao: i.materialSugeridoEspecificacao!,
                        precoItem: i.materialSugeridoPrecoItem || 0
                    }));
                grupo.sugestoes = sugestoes;


                if (intervencoesDoGrupo.length > 0) {
                    grupo.intervencao = intervencoesDoGrupo[0];
                    grupo.intervencoes = intervencoesDoGrupo;
                    grupo.intervencaoResolvida = intervencoesDoGrupo.every(i => i.resolvida);

                    grupo.sugestoes = intervencoesDoGrupo
                        .filter(i => !i.resolvida && i.materialSugeridoEspecificacao)
                        .map(i => ({
                            intervencaoId: i.id,
                            especificacao: i.materialSugeridoEspecificacao!,
                            precoItem: i.materialSugeridoPrecoItem || 0
                        }));
                }
            });
        });
    }

    private conciliarPagamentos(
        fluxos: FluxoCompraViewModel[],
        compras: CompraDto[],
        lancamentos: any[]
    ): void {

        if (!lancamentos?.length) return;

        fluxos.forEach(fluxo => {

            // ============================
            // COTAÇÃO NORMAL
            // ============================
            if (fluxo.tipo !== MENOR_VALOR_TIPO) {

                const compra = compras.find(c => c.cotacaoId === fluxo.id);
                if (!compra) return;

                const lancamento = lancamentos.find(l => l.compraId === compra.id);

                if (lancamento) {
                    fluxo.pagamentoConfirmado = {
                        data: lancamento.dataLancamento,
                        valor: lancamento.valorPago,
                        formaPagamento: lancamento.formaDePagamentoString
                    };
                }

                return;
            }

            // ============================
            // MENOR VALOR POR ITEM
            // ============================

            this.menorValorPorItemAgrupada?.forEach(bloco => {

                const compra = compras.find(c =>
                    c.fornecedorId === bloco.fornecedorId &&
                    c.isMelhorCompra
                );

                if (!compra) return;

                const lancamento = lancamentos.find(l =>
                    l.compraId === compra.id
                );

                if (lancamento) {
                    bloco.pagamentoConfirmado = {
                        data: lancamento.dataLancamento,
                        valor: lancamento.valorPago,
                        formaPagamento: lancamento.formaDePagamentoString
                    };
                }
            });

        });
    }


    private formatarEndereco(endereco: any): string {
        if (!endereco) return 'Endereço não informado';

        return `${endereco.rua}, ${endereco.numero} - ${endereco.bairro}, 
                ${endereco.cidade} - ${endereco.uf}, CEP: ${endereco.cep}`;
    }

    canExpand(fluxo: FluxoCompraViewModel): boolean {
        if (this.isCardDesabilitado(fluxo)) return false;

        if (fluxo.tipo === MENOR_VALOR_TIPO && this.naoCompensaMelhorCompra) {
            return false;
        }

        return true;
    }


    isCardDesabilitado(fluxo: FluxoCompraViewModel): boolean {

        if (!this.existePedido) return false;

        if (this.pedidoOrigemId === MENOR_VALOR_TIPO) {
            return fluxo.tipo !== MENOR_VALOR_TIPO;
        }

        return fluxo.id !== this.pedidoOrigemId;
    }


    groupMateriaisFromOrcamento(
        orcamento: any,
        cotacao: CotacaoComOrcamentoViewModel
    ): MaterialVMGrupo[] {
        if (!orcamento?.materiaisOrcados) return [];

        const grupos: Record<string, MaterialVMGrupo> = {};

        for (const mat of orcamento.materiaisOrcados) {
            const key = mat.materialCotadoId ?? (mat.nome || '').trim();

            if (!grupos[key]) {
                grupos[key] = {
                    nome: mat.nome ?? key,
                    variacoes: [],
                    selected: null
                };
            }

            const v = Object.assign(new MaterialOrcadoDto(), mat) as MaterialVMExtended;
            v.fornecedorNome = cotacao.fornecedor?.nome;
            v.cotacaoId = cotacao.id;
            v.valorDescontoOrcamentoOrigem = orcamento.valorDesconto;
            v.condicaoDescontoOrcamentoOrigem = orcamento.condicaoDesconto;
            v.valorFreteOrcamentoOrigem = orcamento.valorFrete;
            v.condicaoFreteOrcamentoOrigem = orcamento.condicaoFrete;
            v.observacaoInternaOrcamentoOrigem = cotacao.observacaoInterna;
            v.observacaoFornecedorOrcamentoOrigem = cotacao.observacaoFornecedor;
            grupos[key].variacoes.push(v);
        }

        Object.values(grupos).forEach(group => {
            group.variacoes.sort(
                (a, b) => (a.precoTotal ?? Number.MAX_VALUE) - (b.precoTotal ?? Number.MAX_VALUE)
            );
            group.selected = group.variacoes[0] ?? null;
        });

        return Object.values(grupos);
    }

    private isGrupoAtivoNoFluxo(grupo: MaterialVMGrupo): boolean {
        if (grupo.removido) return false;
        if (grupo.intervencao) {
            return false;
        }
        return true;
    }

    private isGrupoInteragivel(grupo: MaterialVMGrupo): boolean {
        if (grupo.removido) return false;
        if (grupo.intervencao && !grupo.intervencao.resolvida) return false;
        if (grupo.intervencao?.resolvida) return false;
        if (grupo.feitoPedido || grupo.jaComprado || grupo.substituido) return false;
        return true;
    }

    private isGrupoVisivelNoResumo(grupo: MaterialVMGrupo): boolean {
        return !grupo.removido;
    }

    private buildGruposPorFornecedor(
        cotacao: FluxoCompraViewModel
    ): {
        fornecedorId: string;
        fornecedor: string;
        grupos: MaterialVMGrupo[];
        prazoEntrega?: string;
        observacao?: string;
    }[] {

        const map = new Map<string, {
            fornecedorNome: string;
            grupos: MaterialVMGrupo[];
        }>();

        (cotacao.materiaisAgrupados || [])
            .filter(g => !g.removido && g.selected)
            .forEach(g => {

                const fornecedorId = g.selected!.fornecedorId;
                const fornecedorNome =
                    g.selected?.fornecedorNome || 'Fornecedor não informado';

                if (!map.has(fornecedorId)) {
                    map.set(fornecedorId, {
                        fornecedorNome,
                        grupos: []
                    });
                }

                map.get(fornecedorId)!.grupos.push(g);
            });

        return Array.from(map.entries())
            .map(([fornecedorId, value]) => {

                const grupoComprado = value.grupos.find(g => g.jaComprado);

                return {
                    fornecedorId,
                    fornecedor: value.fornecedorNome,
                    grupos: value.grupos,
                    prazoEntrega: grupoComprado?.prazoEntrega,
                    observacao: grupoComprado?.observacao
                };
            })
            .sort((a, b) => b.grupos.length - a.grupos.length);
    }


    buildMenorValorPorItem(
        cotacoes: CotacaoComOrcamentoViewModel[]
    ): MenorValorPorItemViewModel {

        const todasVariacoes: MaterialVMExtended[] = [];

        for (const c of cotacoes) {
            if (!c.hasOrcamento || !c.orcamento?.materiaisOrcados) continue;

            for (const mat of c.orcamento.materiaisOrcados) {
                const v = mat as MaterialVMExtended;
                v.fornecedorNome = c.fornecedor?.nome;
                v.cotacaoId = c.id;
                v.valorDescontoOrcamentoOrigem = c.orcamento?.valorDesconto;
                v.condicaoDescontoOrcamentoOrigem = c.orcamento?.condicaoDesconto;
                v.valorFreteOrcamentoOrigem = c.orcamento?.valorFrete;
                v.condicaoFreteOrcamentoOrigem = c.orcamento?.condicaoFrete;
                v.observacaoInternaOrcamentoOrigem = c.observacaoInterna;
                v.observacaoFornecedorOrcamentoOrigem = c.observacaoFornecedor;
                todasVariacoes.push(v);
            }
        }

        const gruposMap: Record<string, MaterialVMGrupo> = {};

        for (const v of todasVariacoes) {
            const key = (v.nome || '').trim();

            if (!gruposMap[key]) {
                gruposMap[key] = {
                    nome: key,
                    variacoes: [],
                    selected: null
                };
            }

            gruposMap[key].variacoes.push(v);
        }

        Object.values(gruposMap).forEach(g => {
            g.variacoes.sort(
                (a, b) => (a.precoTotal ?? Number.MAX_VALUE) - (b.precoTotal ?? Number.MAX_VALUE)
            );

            const disponivel = g.variacoes.find(v => !v.emFalta);
            g.selected = disponivel ?? g.variacoes[0] ?? null;
        });

        return {
            id: 'menor-valor-por-item',
            tipo: 'MENOR_VALOR_POR_ITEM',

            obraId: cotacoes[0]?.obraId,
            obra: cotacoes[0]?.obra,
            solicitacaoMaterialId: cotacoes[0]?.solicitacaoMaterialId,

            materiaisAgrupados: Object.values(gruposMap),

            resumoFrete: {
                possuiFretePorItem: false,
                fornecedoresComFrete: []
            },

            displayStatus: 'Menor valor por Item',
        };
    }


    trackByFornecedor(index: number, item: any): string {
        return item.fornecedor;
    }

    trackByGrupo(index: number, grupo: MaterialVMGrupo): string {
        return grupo.nome;
    }

    getTotalGasto(fluxo: FluxoCompraViewModel): number {
        return (fluxo.materiaisAgrupados || [])
            .filter((g: MaterialVMGrupo) => this.isGrupoAtivoNoFluxo(g) && g.jaComprado)
            .map(g => g.selected?.precoTotal ?? 0)
            .reduce((a, b) => a + b, 0);
    }

    getTotalRestante(fluxo: FluxoCompraViewModel): number {
        const total = this.getTotal(fluxo);
        const gasto = this.getTotalGasto(fluxo);
        return total - gasto;
    }

    getResumoStatus(fluxo: FluxoCompraViewModel): { texto: string; classe: string } {
        if (fluxo.pagamentoConfirmado) {
            return { texto: 'Pagamento realizado e custo lançado na obra', classe: 'text-success' };
        }

        const grupos = (fluxo.materiaisAgrupados || [])
            .filter((g: MaterialVMGrupo) => this.isGrupoAtivoNoFluxo(g));
        const isMenorValorItem = fluxo.tipo === MENOR_VALOR_TIPO;

        if (!grupos.length) {
            return { texto: 'Sem materiais', classe: 'text-muted' };
        }

        const total = grupos.length;
        const comprados = grupos.filter(g => g.jaComprado).length;
        const pedidos = grupos.filter(g => g.feitoPedido).length;

        if (isMenorValorItem) {

            if (this.naoCompensaMelhorCompra) {
                return {
                    texto: ' — Um dos fornecedores já possui o menor valor.',
                    classe: 'text-muted'
                };
            }

            if (comprados > 0) {
                return {
                    texto: ' — Compra parcial em andamento',
                    classe: 'text-warning'
                };
            }

            if (pedidos > 0) {
                return {
                    texto: ' — Pedido realizado, aguardando confirmação fornecedor(es)',
                    classe: 'text-primary'
                };
            }

            return {
                texto: ' — Aguardando pedido',
                classe: 'text-muted'
            };
        }

        const pedidoEhMenorValorItem = this.pedidoOrigemId === MENOR_VALOR_TIPO;

        if (pedidoEhMenorValorItem) {
            return {
                texto: 'Itens incluídos no "Menor Valor Item"',
                classe: 'text-muted'
            };
        }

        if (comprados === total) {
            return {
                texto: '- Pedido concluído, aguardando confirmação de pagamento',
                classe: 'text-success'
            };
        }

        if (comprados > 0) {
            return {
                texto: 'Compra parcial em andamento',
                classe: 'text-warning'
            };
        }

        if (pedidos > 0) {
            return {
                texto: '— Pedido realizado, aguardando confirmação do fornecedor',
                classe: 'text-primary'
            };
        }

        return {
            texto: 'Cotação concluída. Orçamento disponível para formalização do pedido.',
            classe: 'text-muted'
        };
    }

    getInfoPagamentoBloco(bloco: any): { texto: string; classe: string } | null {
        const gruposAtivos = (bloco.grupos || [])
            .filter((g: MaterialVMGrupo) => this.isGrupoAtivoNoFluxo(g));

        if (!gruposAtivos.length) return null;

        if (gruposAtivos.some(g => !!g.intervencao && !g.intervencao.resolvida)) {
            return {
                texto: 'Há intervenções não resolvidas.',
                classe: 'text-danger'
            };
        }

        const todosComprados = gruposAtivos.every(g => g.jaComprado);
        const algumPedido = gruposAtivos.some(g => g.feitoPedido);
        const algumNaoComprado = gruposAtivos.some(g => !g.jaComprado);

        if (todosComprados) {
            return {
                texto: `Pedido concluído. 🔴 AÇÃO OBRIGATÓRIA: O setor financeiro deve entrar em contato com o fornecedor ${bloco.fornecedor} para realizar o pagamento. Após o pagamento, confirme e lance o custo do pedido na obra.`,
                classe: 'text-primary'
            };
        }

        if (algumPedido && algumNaoComprado) {
            return {
                texto: 'Aguardando confirmação do fornecedor.',
                classe: 'text-info'
            };
        }

        return null;
    }

    getTotalBloco(bloco: any): number {
        return (bloco.grupos || [])
            .filter((g: MaterialVMGrupo) => this.isGrupoAtivoNoFluxo(g))
            .map(g => g.selected?.precoTotal ?? 0)
            .reduce((a, b) => a + b, 0);
    }

    getTotal(fluxo: any): number {
        if (fluxo.tipo !== MENOR_VALOR_TIPO && !fluxo.hasOrcamento) return fluxo.total ?? 0;

        return (fluxo.materiaisAgrupados || [])
            .filter((g: MaterialVMGrupo) => this.isGrupoAtivoNoFluxo(g))
            .map((g: any) => g.selected?.precoTotal ?? 0)
            .reduce((a: number, b: number) => a + b, 0);
    }

    getFreteBloco(bloco: any): number {
        const grupo = (bloco.grupos || []).find(g => !g.removido && g.selected);
        return grupo?.selected?.valorFreteOrcamentoOrigem ?? 0;
    }

    getDescontoBloco(bloco: any): number {
        const grupo = (bloco.grupos || []).find(g => !g.removido && g.selected);
        return grupo?.selected?.valorDescontoOrcamentoOrigem ?? 0;
    }

    getCondicaoDescontoBloco(bloco: any): string {
        const grupo = (bloco.grupos || []).find(g => !g.removido && g.selected);
        return grupo?.selected?.condicaoDescontoOrcamentoOrigem ?? '';
    }

    getTotalComFreteEDescontoBloco(bloco: any): number {
        const totalProdutos = this.getTotalBloco(bloco);
        const frete = this.getFreteBloco(bloco);
        const desconto = this.getDescontoBloco(bloco);

        return totalProdutos + frete - desconto;
    }

    todosCompradosBloco(bloco: any): boolean {
        const grupos = (bloco.grupos || [])
            .filter((g: MaterialVMGrupo) => this.isGrupoAtivoNoFluxo(g));
        return grupos.length > 0 && grupos.every(g => g.jaComprado);
    }

    getInfoPagamentoFluxo(fluxo: any): { texto: string; classe: string } | null {
        if (this.temIntervencaoPendenteNoFluxo(fluxo)) return {
            texto: 'Há intervenções não resolvidas.',
            classe: 'text-danger'
        };

        const gruposParaCompra = (fluxo.materiaisAgrupados || [])
            .filter((g: MaterialVMGrupo) => this.isGrupoAtivoNoFluxo(g));

        if (!gruposParaCompra.length) return null;

        const todosComprados = gruposParaCompra.every(g => g.jaComprado);
        const algumPedido = gruposParaCompra.some(g => g.feitoPedido);
        const algumNaoComprado = gruposParaCompra.some(g => !g.jaComprado);

        if (fluxo.pagamentoConfirmado) {
            return { texto: 'Pagamento realizado e custo lançado na obra', classe: 'text-success' };
        }

        if (todosComprados) {
            return {
                texto: `Lembre-se: 🔴 AÇÃO OBRIGATÓRIA: O setor financeiro deve entrar em contato com o fornecedor ${fluxo.fornecedor?.nome} para realizar o pagamento. Após o pagamento, confirme e lance o custo do pedido na obra.`,
                classe: 'text-primary'
            };
        }

        if (algumPedido && algumNaoComprado) {
            return {
                texto: 'Aguardando confirmação do fornecedor.',
                classe: 'text-info'
            };
        }

        return null;
    }

    todosCompradosFluxo(fluxo: any): boolean {
        if (this.temIntervencaoPendenteNoFluxo(fluxo)) return false;

        const grupos = (fluxo.materiaisAgrupados || [])
            .filter((g: MaterialVMGrupo) => this.isGrupoAtivoNoFluxo(g));
        return grupos.length > 0 && grupos.every(g => g.jaComprado);
    }

    private temIntervencaoPendenteNoFluxo(fluxo: FluxoCompraViewModel): boolean {
        return (fluxo.materiaisAgrupados || []).some(g =>
            g.intervencao && !g.intervencao.resolvida
        );
    }

    toggleExpand(index: number): void {
        this.expanded[index] = !this.expanded[index];
    }

    novaCotacao(): void {
        this.bsModalRef.hide();

        const ref = this._modalService.show(CreateCotacaoDialogComponent, {
            class: 'modal-xl',
            initialState: { solicitacaoId: this.solicitacaoId }
        });

        ref.content.onSave.subscribe(() => this.onSave.emit());
    }

    removerGrupo(cotacao: any, grupo: any): void {
        grupo.removido = !grupo.removido;
    }

    async realizarCompra(fluxo: FluxoCompraViewModel): Promise<void> {
        if (this.savingCompra) return;

        const result = await this.abrirDialogEndereco(fluxo);

        if (!result) return;

        this.savingCompra = true;

        if (fluxo.tipo === MENOR_VALOR_TIPO && !this.naoCompensaMelhorCompra) {
            this.gerarPedidosMelhorCompra(fluxo as MenorValorPorItemViewModel, result);
            return;
        }

        this.gerarPedidoCompra(fluxo as CotacaoFluxoViewModel, result);
    }

    private abrirDialogEndereco(
        fluxo: FluxoCompraViewModel
    ): Promise<ResultadoEnderecoPagamento> {
        return new Promise(resolve => {

            const endereco = fluxo?.obra?.endereco;
            const enderecoFormatado = endereco
                ? `${endereco.rua}, ${endereco.numero} - ${endereco.bairro}, ${endereco.cidade} - ${endereco.uf}, CEP: ${endereco.cep}`
                : '';

            const modalRef = this._modalService.show(
                SelecionarEnderecoDialogComponent,
                {
                    class: 'modal-md',
                    backdrop: 'static',
                    keyboard: false
                }
            );

            modalRef.content.enderecoObraId = endereco?.id;
            modalRef.content.enderecoObraFormatado = enderecoFormatado;

            modalRef.content.selecionarFormaPagamento = true;

            const oldHide = modalRef.hide;

            modalRef.hide = () => {
                const content = modalRef.content;
                oldHide.apply(modalRef);

                if (!content.confirmado) {
                    resolve(null);
                    return;
                }

                resolve({
                    tipoEntrega: content.tipoEntrega,
                    endereco: content.tipoEntrega === 'OUTRO'
                        ? content.endereco
                        : null,
                    enderecoObraId: content.tipoEntrega === 'OBRA'
                        ? content.enderecoObraId
                        : null,
                    formaPagamento: content.formaPagamento ?? null
                });
            };
        });
    }

    private gerarPedidosMelhorCompra(
        menorValorPorItem: MenorValorPorItemViewModel,
        enderecoResult: any
    ): void {
        abp.ui.setBusy();
        const dto = new CreateMelhorCompraDto();
        dto.solicitacaoMaterialId = menorValorPorItem.solicitacaoMaterialId;
        dto.obraId = menorValorPorItem.obraId;
        dto.userId = abp.session.userId;
        dto.status = MelhorCompraStatus.EmAndamento;
        dto.total = this.getTotal(menorValorPorItem);

        dto.pedidosCompra = this.montarPedidosParaMelhorCompra(menorValorPorItem, enderecoResult);

        this._pedidoCompraService.gerarPedidosMelhorCompra(dto).subscribe(() => {
            this.savingCompra = false;
            this.onSave.emit();
            this.bsModalRef.hide();
            abp.ui.clearBusy();

            this.cdr.detectChanges();
        });

    }


    private montarPedidosParaMelhorCompra(
        menorValorPorItem: MenorValorPorItemViewModel,
        enderecoResult: any
    ): CreatePedidoCompraDto[] {

        const grupos = menorValorPorItem.materiaisAgrupados || [];
        const pedidosPorFornecedor = new Map<string, CreatePedidoCompraDto>();

        grupos
            .filter(g => !g.removido && g.selected)
            .forEach(g => {

                const v = g.selected!;
                const fornecedorId = v.fornecedorId;

                if (!pedidosPorFornecedor.has(fornecedorId)) {

                    const pedido = new CreatePedidoCompraDto();

                    pedido.solicitacaoMaterialId = menorValorPorItem.solicitacaoMaterialId;
                    pedido.cotacaoId = v.cotacaoId;
                    pedido.orcamentoId = v.orcamentoId;
                    pedido.obraId = menorValorPorItem.obraId;
                    pedido.userId = abp.session.userId;
                    pedido.isMelhorCompra = true;
                    pedido.materiaisPedidosCompra = [];
                    pedido.fornecedorId = fornecedorId;

                    pedido.valorFrete = v.valorFreteOrcamentoOrigem;
                    pedido.condicaoFrete = v.condicaoFreteOrcamentoOrigem;
                    pedido.valorDesconto = v.valorDescontoOrcamentoOrigem;
                    pedido.condicaoDesconto = v.condicaoDescontoOrcamentoOrigem;
                    pedido.formaDePagamento = this.mapFormaPagamento(enderecoResult?.formaPagamento);

                    if (enderecoResult?.tipoEntrega === 'OBRA') {
                        pedido.enderecoEntregaId = enderecoResult.enderecoObraId;
                    } else if (enderecoResult?.tipoEntrega === 'OUTRO') {
                        pedido.enderecoEntrega = enderecoResult.endereco;
                    } else if (enderecoResult?.tipoEntrega === 'RETIRADA') {
                        pedido.retiradaNoFornecedor = true;
                    }

                    pedidosPorFornecedor.set(fornecedorId, pedido);
                }

                const mat = new CreateMaterialPedidoCompraDto();
                mat.nome = v.nome;
                mat.quantidade = String(v.quantidade);
                mat.unidade = v.unidade;
                mat.especificacao = v.especificacao;
                mat.fornecedorId = fornecedorId;
                mat.solicitacaoMaterialId = menorValorPorItem.solicitacaoMaterialId;
                mat.cotacaoId = v.cotacaoId;
                mat.orcamentoId = v.orcamentoId;
                mat.materialOrcadoId = v.id;
                mat.precoItem = v.precoItem;
                mat.precoTotal = v.precoTotal;

                pedidosPorFornecedor.get(fornecedorId)!
                    .materiaisPedidosCompra.push(mat);
            });

        return Array.from(pedidosPorFornecedor.values());
    }


    private gerarPedidoCompra(
        cotacaoFluxo: CotacaoFluxoViewModel,
        enderecoResult: any
    ): void {
        abp.ui.setBusy();

        const dto = new CreatePedidoCompraDto();
        dto.solicitacaoMaterialId = cotacaoFluxo.solicitacaoMaterialId;
        dto.cotacaoId = cotacaoFluxo.id;
        dto.obraId = cotacaoFluxo.obraId;
        dto.userId = abp.session.userId;
        dto.observacaoInterna = cotacaoFluxo.observacaoInterna;
        dto.observacaoFornecedor = cotacaoFluxo.observacaoFornecedor;
        dto.valorFrete = cotacaoFluxo.orcamento.valorFrete;
        dto.condicaoFrete = cotacaoFluxo.orcamento.condicaoFrete;
        dto.valorDesconto = cotacaoFluxo.orcamento.valorDesconto;
        dto.condicaoDesconto = cotacaoFluxo.orcamento.condicaoDesconto;
        dto.orcamentoId = cotacaoFluxo.orcamento.id;
        dto.formaDePagamento = this.mapFormaPagamento(enderecoResult?.formaPagamento);
        dto.fornecedorId = cotacaoFluxo.fornecedor.id;


        if (enderecoResult?.tipoEntrega === 'OBRA') {
            dto.enderecoEntregaId = enderecoResult.enderecoObraId;
        } else if (enderecoResult?.tipoEntrega === 'OUTRO') {
            dto.enderecoEntrega = enderecoResult.endereco;
        } else if (enderecoResult?.tipoEntrega === 'RETIRADA') {
            dto.retiradaNoFornecedor = true;
        }

        dto.materiaisPedidosCompra = (cotacaoFluxo.materiaisAgrupados || [])
            .filter(g => !g.removido && g.selected)
            .map(g => {
                const v = g.selected!;
                const mat = new CreateMaterialPedidoCompraDto();

                mat.nome = v.nome;
                mat.quantidade = String(v.quantidade);
                mat.unidade = v.unidade;
                mat.especificacao = v.especificacao;
                mat.fornecedorId = v.fornecedorId;
                mat.solicitacaoMaterialId = cotacaoFluxo.solicitacaoMaterialId;
                mat.cotacaoId = cotacaoFluxo.id;
                mat.orcamentoId = v.orcamentoId;
                mat.materialOrcadoId = v.id;
                mat.precoItem = v.precoItem;
                mat.precoTotal = v.precoTotal;

                return mat;
            });

        this._pedidoCompraService.gerarPedidoCompra(dto).subscribe(() => {
            this.savingCompra = false;
            this.onSave.emit();
            this.bsModalRef.hide();
            abp.ui.clearBusy();
        });
    }

    isUnicoItemEmFalta(fluxo: FluxoCompraViewModel): boolean {
        if (!fluxo?.materiaisAgrupados) return false;

        const itensNaoRemovidos = fluxo.materiaisAgrupados.filter(g => !g.removido);

        if (itensNaoRemovidos.length !== 1) return false;

        const unicoItem = itensNaoRemovidos[0];

        if (unicoItem.selected?.emFalta) return true;

        const todasVariacoesEmFalta = unicoItem.variacoes.every(v => v.emFalta);

        return todasVariacoesEmFalta;
    }

    hasIntervencaoPendente(grupo: MaterialVMGrupo): boolean {
        return !!grupo.intervencao && !grupo.intervencao.resolvida;
    }

    isFornecedorPedidoNormal(fluxo: FluxoCompraViewModel): boolean {
        return this.existePedido
            && this.pedidoOrigemId !== MENOR_VALOR_TIPO
            && fluxo.id === this.pedidoOrigemId;
    }

    hasIntervencaoPendenteFluxo(fluxo: FluxoCompraViewModel): boolean {
        return !!fluxo.materiaisAgrupados?.some(g =>
            g.intervencao && !g.intervencao.resolvida
        );
    }

    getHeaderClass(fluxo: FluxoCompraViewModel): string {

        if (fluxo.pagamentoConfirmado) {
            return 'header-pagamento-confirmado';
        }

        if (
            this.isFornecedorDoPedido(fluxo) &&
            this.hasIntervencaoPendenteFluxo(fluxo)
        ) {
            return 'header-intervencao';
        }

        if (
            this.isFornecedorDoPedido(fluxo) &&
            this.isPedidoConcluido(fluxo)
        ) {
            return 'header-pedido-concluido';
        }

        if (
            this.isFornecedorDoPedido(fluxo) &&
            this.isPedidoFeitoMasNaoConcluido(fluxo)
        ) {
            return 'header-pedido-feito';
        }

        return '';
    }


    isFornecedorDoPedido(fluxo: FluxoCompraViewModel): boolean {
        return this.existePedido && fluxo.id === this.pedidoOrigemId;
    }

    isPedidoConcluido(fluxo: FluxoCompraViewModel): boolean {
        const grupos = fluxo.materiaisAgrupados || [];
        return grupos.length > 0 && grupos.every(g => g.jaComprado);
    }

    isPedidoFeitoMasNaoConcluido(fluxo: FluxoCompraViewModel): boolean {
        const grupos = fluxo.materiaisAgrupados || [];
        return grupos.some(g => g.feitoPedido) && !this.isPedidoConcluido(fluxo);
    }


    hasFrete(fluxo: any): boolean {
        return fluxo?.orcamento?.valorFrete != null && fluxo.orcamento.valorFrete > 0;
    }

    hasDesconto(fluxo: any): boolean {
        return fluxo?.orcamento?.valorDesconto != null && fluxo.orcamento.valorDesconto > 0;
    }


    getTotalComFreteEDesconto(fluxo: any): number {
        const totalProdutos = this.getTotal(fluxo);
        const frete = fluxo.orcamento?.valorFrete ?? 0;
        const desconto = fluxo.orcamento?.valorDesconto ?? 0;

        return totalProdutos + frete - desconto;
    }

    menorValorPodeNaoCompensar(): boolean {
        const menor = this.fluxoCompraVM?.find(
            f => f.tipo === 'MENOR_VALOR_POR_ITEM'
        ) as MenorValorPorItemViewModel;

        if (!menor?.materiaisAgrupados?.length) return false;

        return menor.materiaisAgrupados.some(grupo => {
            const v = grupo.selected;
            return (
                (v?.valorFreteOrcamentoOrigem ?? 0) > 0 ||
                (v?.valorDescontoOrcamentoOrigem ?? 0) > 0
            );
        });
    }

    private mapFormaPagamento(
        valor?: 'PIX' | 'CREDITO' | 'DEBITO' | 'DINHEIRO' | 'FATURADO'
    ): FormaPagamento {
        switch (valor) {
            case 'PIX':
                return FormaPagamento._1;
            case 'CREDITO':
                return FormaPagamento._2;
            case 'DEBITO':
                return FormaPagamento._3;
            case 'DINHEIRO':
                return FormaPagamento._4;
            case 'FATURADO':
                return FormaPagamento._5;
            default:
                return FormaPagamento._0;
        }
    }

    private abrirModalConfirmacaoPagamento(compraId: string): void {

        if (!compraId) {
            abp.notify.warn('Pedido não localizado.');
            return;
        }

        const modalRef = this._modalService.show(
            ConfirmarPagamentoDialogComponent,
            {
                class: 'modal-lg',
                backdrop: 'static',
                keyboard: false,
                initialState: {
                    compraId: compraId,
                    modo: 'confirmar'
                }
            }
        );

        modalRef.content.onConfirmado?.subscribe(() => {
            this.loadCotacoes();
            this.onSave.emit();
        });
    }

    confirmarPagamentoPedido(fluxo: FluxoCompraViewModel): void {

        const compra = this.comprasCache.find(p =>
            p.cotacaoId === fluxo.id
        );

        this.abrirModalConfirmacaoPagamento(compra?.id);
    }

    confirmarPagamentoMenorValorItem(bloco: any): void {

        const compra = this.comprasCache.find(p =>
            p.isMelhorCompra &&
            p.fornecedorId === bloco.fornecedorId
        );

        this.abrirModalConfirmacaoPagamento(compra?.id);
    }

    getStatusGrupo(
        grupo: MaterialVMGrupo,
        contexto: { pagamentoConfirmado?: any }
    ): StatusGrupo {
        if (grupo.substituido) {
            return 'SUBSTITUIDO';
        }
        if (contexto?.pagamentoConfirmado) return 'PAGO';
        if (grupo.jaComprado) return 'CONCLUIDO';
        if (grupo.intervencao && !grupo.intervencao.resolvida) return 'PENDENTE';
        if (grupo.intervencao?.resolvida) return 'RESOLVIDO';
        if (grupo.feitoPedido) return 'PEDIDO';
        return null;
    }

    isGrupoSubstituido(grupo: MaterialVMGrupo, fluxo: FluxoCompraViewModel): boolean {
        return this.getStatusGrupo(grupo, fluxo) === 'SUBSTITUIDO';
    }

    isGrupoPago(grupo: MaterialVMGrupo, fluxo: FluxoCompraViewModel): boolean {
        return this.getStatusGrupo(grupo, fluxo) === 'PAGO';
    }

    isGrupoConcluido(grupo: MaterialVMGrupo, fluxo: FluxoCompraViewModel): boolean {
        return this.getStatusGrupo(grupo, fluxo) === 'CONCLUIDO';
    }

    isGrupoPedido(grupo: MaterialVMGrupo, fluxo: FluxoCompraViewModel): boolean {
        return this.getStatusGrupo(grupo, fluxo) === 'PEDIDO';
    }

    isGrupoBloqueado(grupo: MaterialVMGrupo, contexto: any): boolean {
        return !this.isGrupoInteragivel(grupo);
    }

    isGrupoRemovivel(grupo: MaterialVMGrupo, contexto: any): boolean {
        const status = this.getStatusGrupo(grupo, contexto);
        return status === null && !grupo.substituido;
    }

    getGrupoTooltip(grupo: MaterialVMGrupo, contexto: any): string {
        const status = this.getStatusGrupo(grupo, contexto);

        switch (status) {
            case 'PAGO':
                return 'Pagamento confirmado — item bloqueado';
            case 'CONCLUIDO':
                return 'Item já comprado — não pode ser removido';
            case 'PEDIDO':
                return 'Item já foi pedido — aguardando compra';
            case 'SUBSTITUIDO':
                return 'Item substituído por outro fornecedor — não pode ser removido';
            case 'RESOLVIDO':
                return 'Intervenção resolvida — item não pode ser alterado';
            case 'PENDENTE':
                return 'Intervenção pendente — aguardando ação';
            default:
                return grupo.removido ? 'Adicionar item novamente' : 'Remover item';
        }
    }

    getGrupoIcone(grupo: MaterialVMGrupo, contexto: any): string {
        const status = this.getStatusGrupo(grupo, contexto);

        switch (status) {
            case 'PAGO':
                return 'fa-check-circle';
            case 'CONCLUIDO':
                return 'fa-wallet';
            case 'PEDIDO':
                return 'fa-hourglass-half';
            case 'SUBSTITUIDO':
                return 'fa-exchange-alt';
            case 'RESOLVIDO':
                return 'fa-check-circle';
            case 'PENDENTE':
                return 'fa-exclamation-triangle';
            default:
                return grupo.removido ? 'fa-plus' : 'fa-times';
        }
    }

    getGrupoButtonClass(grupo: MaterialVMGrupo, contexto: any): string {
        const status = this.getStatusGrupo(grupo, contexto);

        switch (status) {
            case 'PAGO':
                return 'btn-success';
            case 'CONCLUIDO':
                return 'btn-primary';
            case 'PEDIDO':
                return 'btn-info';
            case 'SUBSTITUIDO':
                return 'btn-secondary';
            case 'RESOLVIDO':
                return 'btn-secondary';
            case 'PENDENTE':
                return 'btn-danger';
            default:
                return grupo.removido ? 'btn-primary btn-pulse' : 'btn-outline-danger';
        }
    }


    //copiar materiais selecionados:

    temMateriaisSelecionados(fluxo: FluxoCompraViewModel): boolean {
        if (!fluxo?.materiaisAgrupados) return false;

        return fluxo.materiaisAgrupados.some(grupo =>
            !grupo.removido && grupo.selected !== null
        );
    }

    copiarMateriaisSelecionados(fluxo: FluxoCompraViewModel): void {
        if (!this.temMateriaisSelecionados(fluxo)) {
            abp.notify.warn('Nenhum material selecionado para copiar.');
            return;
        }

        const materiaisSelecionados = fluxo.materiaisAgrupados
            .filter(grupo => !grupo.removido && grupo.selected !== null)
            .map(grupo => {
                const material = grupo.selected!;

                return [
                    `📦 ${grupo.nome}`,
                    material.especificacao ? `   Especificação: ${material.especificacao}` : null,
                    `   Quantidade: ${material.quantidade} ${material.unidade}`,
                    material.fornecedorNome ? `   Fornecedor: ${material.fornecedorNome}` : null,
                    `   Preço unitário: ${this.formatarMoeda(material.precoItem)}`,
                    `   Preço total: ${this.formatarMoeda(material.precoTotal)}`,
                    material.emFalta ? '   ⚠️ EM FALTA' : null
                ].filter(linha => linha !== null).join('\n');
            })
            .join('\n\n------------------------\n\n');

        const cabecalho = this.montarCabecalhoFluxo(fluxo);

        const textoCompleto = `${cabecalho}\n\n${materiaisSelecionados}`;

        this.copiarParaAreaTransferencia(textoCompleto);
    }


    private montarCabecalhoFluxo(fluxo: FluxoCompraViewModel): string {
        const linhas: string[] = ['📋 MATERIAIS SELECIONADOS', '='.repeat(40)];

        if (fluxo.tipo === 'COTACAO') {
            linhas.push(`Tipo: Cotação`);
            if ((fluxo as CotacaoFluxoViewModel).fornecedor?.nome) {
                linhas.push(`Fornecedor: ${(fluxo as CotacaoFluxoViewModel).fornecedor!.nome}`);
            }
        } else {
            linhas.push(`Tipo: Menor Valor por Item`);
        }

        if (fluxo.obra?.nome) {
            linhas.push(`Obra: ${fluxo.obra.nome}`);
        }

        if (fluxo.enderecoEntrega?.formatado) {
            linhas.push(`Entrega: ${fluxo.enderecoEntrega.formatado}`);
        }

        const total = this.calcularTotalSelecionados(fluxo);
        linhas.push(`Total: ${this.formatarMoeda(total)}`);

        if (fluxo.compraEfetivada?.observacao) {
            linhas.push(`Obs: ${fluxo.compraEfetivada.observacao}`);
        }

        if (fluxo.compraEfetivada?.prazoEntrega) {
            const prazo = new Date(fluxo.compraEfetivada.prazoEntrega);
            linhas.push(`Prazo: ${prazo.toLocaleDateString('pt-BR')}`);
        }

        linhas.push('='.repeat(40));

        return linhas.join('\n');
    }


    private calcularTotalSelecionados(fluxo: FluxoCompraViewModel): number {
        return fluxo.materiaisAgrupados
            .filter(g => !g.removido && g.selected)
            .reduce((total, g) => total + (g.selected?.precoTotal || 0), 0);
    }

    private formatarMoeda(valor?: number): string {
        if (valor === undefined || valor === null) return 'R$ 0,00';
        return valor.toLocaleString('pt-BR', {
            style: 'currency',
            currency: 'BRL'
        });
    }


    private copiarParaAreaTransferencia(texto: string): void {
        if (navigator.clipboard && navigator.clipboard.writeText) {
            navigator.clipboard.writeText(texto).then(
                () => {
                    abp.notify.success('Materiais copiados para área de transferência!');
                },
                (err) => {
                    console.error('Erro ao copiar:', err);
                    this.fallbackCopiarTexto(texto);
                }
            );
        } else {
            this.fallbackCopiarTexto(texto);
        }
    }

    private fallbackCopiarTexto(texto: string): void {
        const textarea = document.createElement('textarea');
        textarea.value = texto;
        textarea.style.position = 'fixed';
        textarea.style.opacity = '0';
        document.body.appendChild(textarea);
        textarea.select();

        try {
            const successful = document.execCommand('copy');
            if (successful) {
                abp.notify.success('Materiais copiados para área de transferência!');
            } else {
                abp.notify.error('Não foi possível copiar os materiais.');
            }
        } catch (err) {
            console.error('Erro no fallback de cópia:', err);
            abp.notify.error('Erro ao copiar materiais.');
        }

        document.body.removeChild(textarea);
    }

    temMateriaisSelecionadosFornecedor(bloco: any): boolean {
        return bloco.grupos?.some((g: any) => !g.removido && g.selected !== null) || false;
    }

    copiarMateriaisPorFornecedor(bloco: any, fluxo: FluxoCompraViewModel): void {
        if (!this.temMateriaisSelecionadosFornecedor(bloco)) {
            abp.notify.warn('Nenhum material selecionado para este fornecedor.');
            return;
        }

        const materiaisSelecionados = bloco.grupos
            .filter((g: any) => !g.removido && g.selected !== null)
            .map((grupo: any) => {
                const material = grupo.selected!;

                return [
                    `📦 ${grupo.nome}`,
                    material.especificacao ? `   Especificação: ${material.especificacao}` : null,
                    `   Quantidade: ${material.quantidade} ${material.unidade}`,
                    `   Preço unitário: ${this.formatarMoeda(material.precoItem)}`,
                    `   Preço total: ${this.formatarMoeda(material.precoTotal)}`,
                    material.emFalta ? '   ⚠️ EM FALTA' : null
                ].filter(linha => linha !== null).join('\n');
            })
            .join('\n\n------------------------\n\n');

        const cabecalho = [
            `📋 MATERIAIS - ${bloco.fornecedor}`,
            '='.repeat(40),
            `Fornecedor: ${bloco.fornecedor}`,
            fluxo.obra?.nome ? `Obra: ${fluxo.obra.nome}` : null,
            bloco.prazoEntrega ? `Prazo: ${new Date(bloco.prazoEntrega).toLocaleDateString('pt-BR')}` : null,
            bloco.observacao ? `Obs: ${bloco.observacao}` : null,
            `Total: ${this.formatarMoeda(this.getTotalBloco(bloco))}`,
            '='.repeat(40)
        ].filter(linha => linha !== null).join('\n');

        const textoCompleto = `${cabecalho}\n\n${materiaisSelecionados}`;

        this.copiarParaAreaTransferencia(textoCompleto);
    }



    abrirConversaFluxo(fluxo: FluxoCompraViewModel): void {
        const cotacaoId = fluxo.id;
        const fornecedorNome = (fluxo as CotacaoFluxoViewModel).fornecedor?.nome || 'Fornecedor';

        this.abrirModalConversa(cotacaoId, fornecedorNome);
    }

    abrirConversaBloco(bloco: any): void {
        const cotacaoId = bloco.grupos[0]?.selected?.cotacaoId;
        const fornecedorNome = bloco.fornecedor || 'Fornecedor';

        if (cotacaoId) {
            this.abrirModalConversa(cotacaoId, fornecedorNome);
        }
    }

    // cotacoes-list-dialog.component.ts
    private abrirModalConversa(cotacaoId: string, fornecedorNome: string): void {
        const modalRef = this._modalService.show(ConversaModalComponent, {
            class: 'modal-lg modal-dialog-centered',
            initialState: {
                cotacaoId: cotacaoId,
                titulo: 'Conversa com Fornecedor',
                fornecedorNome: fornecedorNome
            }
        });

        // 🔥 INSCREVER NO EVENTO DO MODAL FILHO
        modalRef.content.onMensagensVisualizadas.subscribe(() => {
            this.recarregarNotificacoes(); // Recarrega apenas as notificações, não tudo
        });
    }

    // 🔥 NOVO MÉTODO PARA RECARREGAR APENAS NOTIFICAÇÕES
    private recarregarNotificacoes(): void {
        // Buscar apenas as contagens de mensagens não lidas
        const cotacaoIds = this.cotacoesCache?.map(c => c.id) || [];
        const pedidoIds = this.pedidosCache?.map(p => p.id) || [];

        if (cotacaoIds.length === 0 && pedidoIds.length === 0) return;

        const input = new GetMensagensNaoLidasCountInput();
        input.cotacaoIds = cotacaoIds;
        input.pedidoIds = pedidoIds;

        this._cotacaoService.getMensagensNaoLidasCount(input).subscribe({
            next: (mensagens) => {
                // Atualizar o map de notificações
                const notificacoesMap = new Map<string, number>();
                mensagens.forEach(m => {
                    notificacoesMap.set(`${m.tipo}_${m.id}`, m.quantidade);
                });

                // Atualizar cotações
                if (this.cotacoesCache) {
                    (this.cotacoesCache as any[]).forEach(c => {
                        c.quantidadeNotificacoes = notificacoesMap.get(`cotacao_${c.id}`) || 0;
                    });
                }

                // Reconstruir o fluxoCompraVM com as novas notificações
                this.atualizarNotificacoesNoFluxo();
            }
        });
    }

    private atualizarNotificacoesNoFluxo(): void {
        // Mapear cotações por ID para acesso rápido
        const cotacoesMap = new Map(
            (this.cotacoesCache as any[] || []).map(c => [c.id, c])
        );

        // Atualizar cada item do fluxo
        this.fluxoCompraVM.forEach(fluxo => {
            if (fluxo.tipo === 'COTACAO') {
                const cotacao = cotacoesMap.get(fluxo.id);
                if (cotacao) {
                    fluxo.quantidadeNotificacoes = cotacao.quantidadeNotificacoes;
                }
            }
        });

        if (this.menorValorPorItemAgrupada && this.pedidosCache) {
            this.menorValorPorItemAgrupada.forEach(grupoFornecedor => {
                const pedidosDoFornecedor = (this.pedidosCache as any[]).filter(p =>
                    p.fornecedorId === grupoFornecedor.fornecedorId &&
                    p.isMelhorCompra === true
                );

                const cotacoesDoFornecedor = (this.cotacoesCache as any[] || []).filter(c =>
                    c.fornecedorId === grupoFornecedor.fornecedorId
                );

                let notificacoesCotacao = cotacoesDoFornecedor.reduce(
                    (total, c) => total + (c.quantidadeNotificacoes || 0), 0
                );

                let notificacoesPedidos = pedidosDoFornecedor.reduce(
                    (total, p) => total + (p.quantidadeNotificacoes || 0), 0
                );

                grupoFornecedor.quantidadeNotificacoes = notificacoesCotacao + notificacoesPedidos;
            });
        }

        this.cdr.detectChanges();
    }

    getAlternativasFornecedor(grupo: MaterialVMGrupo, fluxo: FluxoCompraViewModel): AlternativaFornecedor[] {
        const cacheKey = `${grupo.nome}_${grupo.selected?.id}_${fluxo.id}`;

        if (this.alternativasCache.has(cacheKey)) {
            return this.alternativasCache.get(cacheKey)!;
        }

        const alternativas = this.calcularAlternativas(grupo, fluxo);
        this.alternativasCache.set(cacheKey, alternativas);
        return alternativas;
    }

    private calcularAlternativas(grupo: MaterialVMGrupo, fluxo: FluxoCompraViewModel): AlternativaFornecedor[] {
        if (!grupo.nome || !this.cotacoesCache) return [];

        const alternativas: AlternativaFornecedor[] = [];
        const materialSelecionado = grupo.selected;

        // Se não tem material selecionado ou é o atual, busca todos
        this.cotacoesCache.forEach(cotacao => {
            // Pula a cotação atual (do fornecedor que deu problema)
            if (fluxo.tipo === 'COTACAO' && cotacao.id === fluxo.id) return;

            // Se for menor valor por item, precisamos filtrar diferente
            if (fluxo.tipo === 'MENOR_VALOR_POR_ITEM' &&
                materialSelecionado?.fornecedorId === cotacao.fornecedor?.id) return;

            if (!cotacao.hasOrcamento || !cotacao.orcamento?.materiaisOrcados) return;

            // Procura o mesmo material (pelo nome ou materialCotadoId)
            const materialAlternativo = cotacao.orcamento.materiaisOrcados.find(m => {
                // Compara por nome (ignorando espaços e maiúsculas)
                const mesmoNome = m.nome?.trim().toLowerCase() === grupo.nome?.trim().toLowerCase();

                // Compara por materialCotadoId (se existir)
                const mesmoId = materialSelecionado?.cotacaoId &&
                    (m as any).materialCotadoId === materialSelecionado.cotacaoId;

                return mesmoNome || mesmoId;
            });

            if (materialAlternativo && !materialAlternativo.emFalta) {
                alternativas.push({
                    fornecedorId: cotacao.fornecedor.id,
                    fornecedorNome: cotacao.fornecedor.nome,
                    cotacaoId: cotacao.id,
                    orcamentoId: cotacao.orcamento.id,
                    materialId: materialAlternativo.id,
                    precoItem: materialAlternativo.precoItem,
                    precoTotal: materialAlternativo.precoTotal,
                    especificacao: materialAlternativo.especificacao,
                    quantidade: materialAlternativo.quantidade,
                    unidade: materialAlternativo.unidade,
                    emFalta: materialAlternativo.emFalta,

                    valorFrete: cotacao.orcamento.valorFrete,
                    valorDesconto: cotacao.orcamento.valorDesconto,
                    condicaoFrete: cotacao.orcamento.condicaoFrete,
                    condicaoDesconto: cotacao.orcamento.condicaoDesconto
                });
            }
        });

        // Ordena por preço (menor primeiro)
        return alternativas.sort((a, b) => a.precoTotal - b.precoTotal);
    }

    getFornecedorAtual(fluxo: FluxoCompraViewModel): string {
        if (fluxo.tipo === 'COTACAO') {
            return (fluxo as CotacaoFluxoViewModel).fornecedor?.nome || 'Fornecedor atual';
        }
        return 'Fornecedor atual';
    }

    getSugestaoValue(sugestao: { intervencaoId: string; especificacao: string; precoItem: number }): OpcaoSugestao {
        return {
            tipo: 'ACEITAR_SUGESTAO',
            intervencaoId: sugestao.intervencaoId,
            materialSugerido: {
                especificacao: sugestao.especificacao,
                precoItem: sugestao.precoItem
            }
        };
    }

    getAlternativaValue(alternativa: AlternativaFornecedor): OpcaoOutroFornecedor {
        return {
            tipo: 'OUTRO_FORNECEDOR',
            fornecedorId: alternativa.fornecedorId,
            fornecedorNome: alternativa.fornecedorNome,
            cotacaoId: alternativa.cotacaoId,
            orcamentoId: alternativa.orcamentoId,
            materialId: alternativa.materialId,
            precoItem: alternativa.precoItem,
            precoTotal: alternativa.precoTotal,
            especificacao: alternativa.especificacao
        };
    }

    resolverIntervencao(grupo: MaterialVMGrupo): void {
        console.log('Resolver intervenção para grupo:', grupo);

        if (!grupo.opcaoSelecionada) return;

        let opcao: any = grupo.opcaoSelecionada;

        // Se for string, tenta parsear como JSON
        if (typeof opcao === 'string') {
            if (opcao.startsWith('{')) {
                try {
                    opcao = JSON.parse(opcao);
                } catch (e) {
                    console.error('Erro ao parsear opção:', e);
                    // Se falhar o parse, assume que é uma string simples
                    this.resolverOpcaoString(grupo, opcao);
                    return;
                }
            } else {
                // É uma string simples (ex: "OUTRO_FORNECEDOR" sem dados)
                this.resolverOpcaoString(grupo, opcao);
                return;
            }
        }

        // Agora temos um objeto, usar type guards
        if (isOpcaoOutroFornecedor(opcao)) {
            this.trocarFornecedor(grupo, opcao);
        }
        else if (isOpcaoSugestao(opcao)) {
            this.aceitarSugestao(grupo, opcao);
        }
        else if (isOpcaoManterOriginal(opcao)) {
            this.manterOriginal(grupo);
        }
        else if (isOpcaoManterOriginalPrazo(opcao)) {
            this.manterOriginalPrazo(grupo);
        }
        else if (isOpcaoNovoFornecedor(opcao)) {
            this.criarNovaCotacaoParaMaterial(grupo);
        }
        else {
            console.warn('Opção não reconhecida:', opcao);
            this.resolverOutrasOpcoes(grupo, opcao);
        }
    }

    private resolverOpcaoString(grupo: MaterialVMGrupo, opcaoString: string): void {
        switch (opcaoString) {
            case 'OUTRO_FORNECEDOR':
                this.mostrarDialogoEscolherFornecedor(grupo);
                break;
            case 'ACEITAR_SUGESTAO':
                abp.message.warn('Selecione uma sugestão específica');
                break;
            case 'MANTER_ORIGINAL':
                this.manterOriginal(grupo);
                break;
            case 'MANTER_ORIGINAL_PRAZO':
                this.manterOriginalPrazo(grupo);
                break;
            case 'NOVO_FORNECEDOR':
                this.criarNovaCotacaoParaMaterial(grupo);
                break;
            default:
                console.warn('Opção string não reconhecida:', opcaoString);
        }
    }

    private async aceitarSugestao(grupo: MaterialVMGrupo, opcao: OpcaoSugestao): Promise<void> {
        console.log('Aceitar sugestão:', opcao);

        const intervencaoId = opcao.intervencaoId;
        if (!intervencaoId) {
            abp.notify.error('Intervenção não identificada');
            return;
        }

        const fluxoAtual = this.fluxoCompraVM.find(f =>
            f.materiaisAgrupados?.some(g => g === grupo)
        );

        if (!fluxoAtual) {
            abp.notify.error('Erro ao identificar o fluxo da compra');
            return;
        }

        if (!grupo.selected) {
            abp.notify.warn('Nenhum material selecionado');
            return;
        }

        const enderecoResult = await this.abrirDialogEndereco(fluxoAtual);
        if (!enderecoResult) return;

        this.savingCompra = true;
        abp.ui.setBusy();

        try {
            const dto = new CriarFluxoCompletoDto();

            dto.solicitacaoMaterialId = this.solicitacaoId;
            dto.obraId = fluxoAtual.obraId;
            dto.userId = abp.session.userId;

            dto.fornecedorId = (fluxoAtual as CotacaoFluxoViewModel).fornecedor?.id;
            if (!dto.fornecedorId) {
                abp.notify.error('Fornecedor não identificado');
                return;
            }

            dto.materialNome = grupo.nome;
            dto.quantidade = grupo.selected.quantidade || 0;
            dto.unidade = grupo.selected.unidade || '';
            dto.especificacao = opcao.materialSugerido.especificacao;
            dto.justificativa = `Aceita sugestão do fornecedor: ${opcao.materialSugerido.especificacao}`;
            dto.precoItem = opcao.materialSugerido.precoItem;
            dto.precoTotal = (grupo.selected.quantidade || 0) * opcao.materialSugerido.precoItem;

            dto.cotacaoOrigemId = grupo.selected.cotacaoId;
            dto.orcamentoOrigemId = grupo.selected.orcamentoId;
            dto.materialOrcadoOrigemId = grupo.selected.id;

            dto.enderecoEntregaId = enderecoResult.tipoEntrega === 'OBRA' ? enderecoResult.enderecoObraId : null;
            dto.enderecoEntrega = enderecoResult.tipoEntrega === 'OUTRO' ? enderecoResult.endereco : null;
            dto.retiradaNoFornecedor = enderecoResult.tipoEntrega === 'RETIRADA';
            dto.formaDePagamento = this.mapFormaPagamento(enderecoResult.formaPagamento);

            dto.valorFrete = (fluxoAtual as any).orcamento?.valorFrete;
            dto.condicaoFrete = (fluxoAtual as any).orcamento?.condicaoFrete;
            dto.valorDesconto = (fluxoAtual as any).orcamento?.valorDesconto;
            dto.condicaoDesconto = (fluxoAtual as any).orcamento?.condicaoDesconto;

            dto.observacao = `Gerado automaticamente a partir de intervenção - aceitação de sugestão: ${opcao.materialSugerido.especificacao}`;
            dto.observacaoFornecedor = `Aceitamos sua sugestão de substituição para o material ${opcao.materialSugerido.especificacao}. O pedido foi ajustado conforme indicado. Obrigado!`;

            const pedidoCriado = await this._pedidoCompraService.criarFluxoCompleto(dto).toPromise();

            if (!pedidoCriado) {
                throw new Error('Erro ao criar pedido');
            }

            const resolverPrincipal = new ResolverIntervencaoDto();
            resolverPrincipal.intervencaoId = intervencaoId;
            resolverPrincipal.opcaoSelecionada = 'ACEITAR_SUGESTAO';
            resolverPrincipal.observacaoResolucao = `Aceita sugestão: ${opcao.materialSugerido.especificacao}`;
            resolverPrincipal.novoPedidoCompraId = pedidoCriado.id;
            resolverPrincipal.novaSolicitacaoMaterialId = pedidoCriado.solicitacaoMaterialId;
            resolverPrincipal.novaCotacaoId = pedidoCriado.cotacaoId;
            resolverPrincipal.novoOrcamentoId = pedidoCriado.orcamentoId;

            await this._intervencaoCompraService.resolverIntervencao(resolverPrincipal).toPromise();

            this.savingCompra = false;
            abp.ui.clearBusy();

            abp.notify.success(`Intervenção resolvida! Pedido #${pedidoCriado.id.substring(0, 8)} criado.`, 'Sucesso');
            this.onSave.emit();
            this.bsModalRef.hide();

        } catch (error) {
            console.error('Erro no aceitarSugestao:', error);
            this.savingCompra = false;
            abp.ui.clearBusy();
            abp.notify.error('Erro ao processar. Tente novamente.');
        }
    }

    private trocarFornecedor(grupo: MaterialVMGrupo, dadosFornecedor: OpcaoOutroFornecedor): void {
        console.log('Trocar fornecedor:', dadosFornecedor);

        const fluxoAtual = this.fluxoCompraVM.find(f =>
            f.materiaisAgrupados?.some(g => g === grupo)
        );

        if (!fluxoAtual) {
            abp.notify.error('Erro ao identificar o fluxo da compra');
            return;
        }

        this.criarNovoPedidoParaMaterial(grupo, dadosFornecedor, fluxoAtual);
    }

    private async criarNovoPedidoParaMaterial(
        grupo: MaterialVMGrupo,
        dadosFornecedor: OpcaoOutroFornecedor,
        fluxoAtual: FluxoCompraViewModel
    ): Promise<void> {

        const enderecoResult = await this.abrirDialogEndereco(fluxoAtual);
        if (!enderecoResult) return;

        this.savingCompra = true;
        abp.ui.setBusy();

        try {
            // ✅ Usar a classe gerada pelo Service Proxy
            const dto = new CriarFluxoCompletoDto();

            // Referência à solicitação original
            dto.solicitacaoMaterialId = this.solicitacaoId;

            // Dados básicos
            dto.obraId = fluxoAtual.obraId;
            dto.userId = abp.session.userId;
            dto.fornecedorId = dadosFornecedor.fornecedorId;
            dto.observacao = `Gerado automaticamente a partir de intervenção - material original: ${grupo.nome}`;

            // Dados do material
            dto.materialNome = grupo.nome;
            dto.quantidade = grupo.selected?.quantidade || 0;
            dto.unidade = grupo.selected?.unidade || '';
            dto.especificacao = dadosFornecedor.especificacao || grupo.selected?.especificacao || '';
            dto.justificativa = `Substituição de fornecedor - original: ${dadosFornecedor.fornecedorNome}`;
            dto.precoItem = dadosFornecedor.precoItem;
            dto.precoTotal = dadosFornecedor.precoTotal;

            // Referências do orçamento original
            dto.cotacaoOrigemId = dadosFornecedor.cotacaoId;
            dto.orcamentoOrigemId = dadosFornecedor.orcamentoId;
            dto.materialOrcadoOrigemId = dadosFornecedor.materialId;

            // Endereço e pagamento
            dto.enderecoEntregaId = enderecoResult.tipoEntrega === 'OBRA' ? enderecoResult.enderecoObraId : null;
            dto.enderecoEntrega = enderecoResult.tipoEntrega === 'OUTRO' ? enderecoResult.endereco : null;
            dto.retiradaNoFornecedor = enderecoResult.tipoEntrega === 'RETIRADA';
            dto.formaDePagamento = this.mapFormaPagamento(enderecoResult.formaPagamento);

            // Frete e desconto
            dto.valorFrete = (fluxoAtual as any).orcamento?.valorFrete;
            dto.condicaoFrete = (fluxoAtual as any).orcamento?.condicaoFrete;
            dto.valorDesconto = (fluxoAtual as any).orcamento?.valorDesconto;
            dto.condicaoDesconto = (fluxoAtual as any).orcamento?.condicaoDesconto;

            this._pedidoCompraService.criarFluxoCompleto(dto).subscribe({
                next: (pedidoCriado) => {
                    this.resolverIntervencaoAposPedido(
                        grupo,
                        dadosFornecedor,
                        pedidoCriado,
                        `Novo fluxo criado com fornecedor ${dadosFornecedor.fornecedorNome} para material ${grupo.nome}`
                    );
                },
                error: (error) => {
                    console.error('Erro ao criar fluxo:', error);
                    this.savingCompra = false;
                    abp.ui.clearBusy();
                    abp.notify.error('Erro ao criar novo pedido. Tente novamente.');
                }
            });

        } catch (error) {
            console.error('Erro inesperado:', error);
            this.savingCompra = false;
            abp.ui.clearBusy();
            abp.notify.error('Erro inesperado ao processar pedido');
        }
    }

    private resolverIntervencaoAposPedido(
        grupo: MaterialVMGrupo,
        dadosFornecedor: OpcaoOutroFornecedor,
        novoPedidoId: PedidoCompraDto,
        observacao: string
    ): void {

        const resolverDto = new ResolverIntervencaoDto();
        resolverDto.intervencaoId = grupo.intervencao?.id;
        resolverDto.opcaoSelecionada = 'OUTRO_FORNECEDOR';
        resolverDto.observacaoResolucao = observacao;
        resolverDto.novoPedidoCompraId = novoPedidoId.id;
        resolverDto.novaCotacaoId = novoPedidoId.cotacaoId;
        resolverDto.novoOrcamentoId = novoPedidoId.orcamentoId;

        this._intervencaoCompraService.resolverIntervencao(resolverDto).subscribe({
            next: () => {
                this.savingCompra = false;
                abp.ui.clearBusy();


                abp.notify.success(
                    `Intervenção resolvida! Pedido #${novoPedidoId.id.substring(0, 8)} criado com ${dadosFornecedor.fornecedorNome}`,
                    'Sucesso'
                );

                this.onSave.emit();
                this.bsModalRef.hide();
            },
            error: (error) => {
                console.error('Erro ao resolver intervenção:', error);
                this.savingCompra = false;
                abp.ui.clearBusy();

                abp.notify.warn(
                    `Pedido criado, mas houve erro ao registrar resolução. ID do pedido: ${novoPedidoId}`,
                    'Atenção'
                );

                this.onSave.emit();
                this.bsModalRef.hide();
            }
        });
    }

    private manterOriginal(grupo: MaterialVMGrupo): void {
        console.log('Manter material original');

        const fluxoAtual = this.fluxoCompraVM.find(f =>
            f.materiaisAgrupados?.some(g => g === grupo)
        );

        if (!fluxoAtual) {
            abp.notify.error('Erro ao identificar o fluxo da compra');
            return;
        }

        if (!grupo.selected) {
            abp.notify.warn('Nenhum material selecionado para manter o original');
            return;
        }

        this.criarPedidoManterOriginal(grupo, fluxoAtual);
    }

    private manterOriginalPrazo(grupo: MaterialVMGrupo): void {
        console.log('Manter material original');

        const fluxoAtual = this.fluxoCompraVM.find(f =>
            f.materiaisAgrupados?.some(g => g === grupo)
        );

        if (!fluxoAtual) {
            abp.notify.error('Erro ao identificar o fluxo da compra');
            return;
        }

        if (!grupo.selected) {
            abp.notify.warn('Nenhum material selecionado para manter o original');
            return;
        }

        this.criarPedidoManterOriginal(grupo, fluxoAtual, true);
    }

    private async criarPedidoManterOriginal(
        grupo: MaterialVMGrupo,
        fluxoAtual: FluxoCompraViewModel,
        prazoIndefinido: boolean = false
    ): Promise<void> {

        const enderecoResult = await this.abrirDialogEndereco(fluxoAtual);
        if (!enderecoResult) return;

        this.savingCompra = true;
        abp.ui.setBusy();

        try {
            const dto = new CriarFluxoCompletoDto();

            dto.solicitacaoMaterialId = this.solicitacaoId;
            dto.obraId = fluxoAtual.obraId;
            dto.userId = abp.session.userId;

            dto.fornecedorId = grupo.selected.fornecedorId;

            dto.observacaoFornecedor = prazoIndefinido ?
                `Optamos por manter o material mesmo com o prazo indefinido. ` +
                `Material: ${grupo.nome} ${grupo.selected.especificacao}. ` +
                `Justificativa: Decisão de manter especificações originais do projeto, optamos por aguardar o prazo.` :

                `Optamos por manter o material conforme solicitado originalmente. ` +
                `Material: ${grupo.nome} ${grupo.selected.especificacao}. ` +
                `Justificativa: Decisão de manter especificações originais do projeto.`;

            dto.observacao = prazoIndefinido ?
                `Gerado automaticamente a partir de intervenção - mantendo material original apesar de prazo indefinido: ${grupo.nome} ${grupo.selected.especificacao}` :
                `Gerado automaticamente a partir de intervenção - mantendo material original: ${grupo.nome} ${grupo.selected.especificacao}`;

            dto.materialNome = grupo.nome;
            dto.quantidade = grupo.selected.quantidade || 0;
            dto.unidade = grupo.selected.unidade || '';
            dto.especificacao = grupo.selected.especificacao || '';
            dto.justificativa = prazoIndefinido ?
                'Manter material original conforme solicitado na cotação apesar de material com prazo de entrega indefinido' :
                'Manter material original conforme solicitado na cotação';
            dto.precoItem = grupo.selected.precoItem || 0;
            dto.precoTotal = grupo.selected.precoTotal || 0;

            dto.cotacaoOrigemId = grupo.selected.cotacaoId;
            dto.orcamentoOrigemId = grupo.selected.orcamentoId;
            dto.materialOrcadoOrigemId = grupo.selected.id;

            dto.enderecoEntregaId = enderecoResult.tipoEntrega === 'OBRA' ? enderecoResult.enderecoObraId : null;
            dto.enderecoEntrega = enderecoResult.tipoEntrega === 'OUTRO' ? enderecoResult.endereco : null;
            dto.retiradaNoFornecedor = enderecoResult.tipoEntrega === 'RETIRADA';
            dto.formaDePagamento = this.mapFormaPagamento(enderecoResult.formaPagamento);

            dto.valorFrete = grupo.selected.valorFreteOrcamentoOrigem;
            dto.condicaoFrete = grupo.selected.condicaoFreteOrcamentoOrigem;
            dto.valorDesconto = grupo.selected.valorDescontoOrcamentoOrigem;
            dto.condicaoDesconto = grupo.selected.condicaoDescontoOrcamentoOrigem;

            this._pedidoCompraService.criarFluxoCompleto(dto).subscribe({
                next: (pedidoCriado) => {
                    if (grupo.intervencao) {
                        this.resolverIntervencaoManterOriginal(
                            grupo,
                            pedidoCriado,
                            pedidoCriado.solicitacaoMaterialId,
                            `Pedido mantendo material original criado com fornecedor ${grupo.selected?.fornecedorNome}`
                        );
                    } else {
                        this.finalizarManterOriginal(pedidoCriado.id);
                    }
                },
                error: (error) => {
                    console.error('Erro ao criar pedido mantendo original:', error);
                    this.savingCompra = false;
                    abp.ui.clearBusy();
                    abp.notify.error('Erro ao criar pedido mantendo material original. Tente novamente.');
                }
            });

        } catch (error) {
            console.error('Erro inesperado:', error);
            this.savingCompra = false;
            abp.ui.clearBusy();
            abp.notify.error('Erro inesperado ao processar pedido');
        }
    }

    private resolverIntervencaoManterOriginal(
        grupo: MaterialVMGrupo,
        novoPedido: PedidoCompraDto,
        novaSolicitacaoMaterialId: string,
        observacao: string
    ): void {

        const resolverDto = new ResolverIntervencaoDto();
        resolverDto.intervencaoId = grupo.intervencao?.id;
        resolverDto.opcaoSelecionada = 'MANTER_ORIGINAL';
        resolverDto.observacaoResolucao = observacao;
        resolverDto.novoPedidoCompraId = novoPedido.id;
        resolverDto.novaSolicitacaoMaterialId = novaSolicitacaoMaterialId;
        resolverDto.novaCotacaoId = novoPedido.cotacaoId;
        resolverDto.novoOrcamentoId = novoPedido.orcamentoId;

        this._intervencaoCompraService.resolverIntervencao(resolverDto).subscribe({
            next: () => {
                this.finalizarManterOriginal(novoPedido.id);
            },
            error: (error) => {
                console.error('Erro ao resolver intervenção:', error);
                this.savingCompra = false;
                abp.ui.clearBusy();

                abp.notify.warn(
                    `Pedido criado mantendo original, mas houve erro ao registrar resolução. ID do pedido: ${novoPedido.id}`,
                    'Atenção'
                );

                this.onSave.emit();
                this.bsModalRef.hide();
            }
        });
    }

    private finalizarManterOriginal(novoPedidoId: string): void {
        this.savingCompra = false;
        abp.ui.clearBusy();

        abp.notify.success(
            `Pedido #${novoPedidoId.substring(0, 8)} criado mantendo o material original!`,
            'Sucesso'
        );

        this.onSave.emit();
        this.bsModalRef.hide();
    }

    private mostrarDialogoEscolherFornecedor(grupo: MaterialVMGrupo): void {
        abp.message.info(
            'Selecione um fornecedor específico da lista de alternativas acima.',
            'Escolher Fornecedor'
        );
    }

    private criarNovaCotacaoParaMaterial(grupo: MaterialVMGrupo): void {
        console.log('Criar nova cotação para material:', grupo);

        // Abrir modal de nova cotação para este material específico
        const modalRef = this._modalService.show(CreateCotacaoDialogComponent, {
            class: 'modal-xl',
            initialState: {
                // solicitacaoId: this.solicitacaoId,
                // materialNome: grupo.nome,
                // quantidade: grupo.selected?.quantidade,
                // unidade: grupo.selected?.unidade
            }
        });

        modalRef.content.onSave.subscribe(() => {
            this.loadCotacoes(); // Recarregar tudo
        });
    }

    private resolverOutrasOpcoes(grupo: MaterialVMGrupo, opcao: any): void {
        console.log('Resolver outras opções:', opcao);

        // Fallback - apenas remover a intervenção
        grupo.intervencao = null;
        grupo.opcaoSelecionada = null;

        abp.notify.success('Intervenção resolvida!');
        this.cdr.detectChanges();
    }

    /**
 * Abre o modal de cotações para a solicitação relacionada ao pedido
 * @param pedidoId ID do pedido (pode ser da intervenção ou do pedido original)
 */
    abrirPedido(grupo: MaterialVMGrupo, contexto: any): void {

        if (grupo.intervencaoResolvida) {
            let intervencao = grupo.intervencao;
            let solicitacaoId = intervencao.novaSolicitacaoMaterialId;

            if (!solicitacaoId && intervencao.novoPedidoCompraId) {
                let pedidoId = intervencao.novoPedidoCompraId;

                abp.ui.setBusy();
                this._pedidoCompraService.get(pedidoId).subscribe({
                    next: (pedido) => {
                        abp.ui.clearBusy();

                        if (!pedido || !pedido.solicitacaoMaterialId) {
                            abp.notify.error('Não foi possível identificar a solicitação relacionada a este pedido');
                            return;
                        }

                        this.bsModalRef.hide();

                        const ref = this._modalService.show(CotacoesListDialogComponent, {
                            class: 'modal-lg',
                            initialState: {
                                solicitacaoId: pedido.solicitacaoMaterialId
                            },
                            backdrop: 'static'
                        });

                        ref.content.onSave.subscribe(() => {
                            this.onSave.emit();
                        });

                    },
                    error: (error) => {
                        abp.ui.clearBusy();
                        console.error('Erro ao buscar pedido:', error);
                        abp.notify.error('Erro ao carregar informações do pedido');
                    }
                });
            } else if (solicitacaoId) {

                this.bsModalRef.hide();

                const ref = this._modalService.show(CotacoesListDialogComponent, {
                    class: 'modal-lg',
                    initialState: {
                        solicitacaoId: intervencao.novaSolicitacaoMaterialId
                    },
                    backdrop: 'static'
                });

                ref.content.onSave.subscribe(() => {
                    this.onSave.emit();
                });

            }
        }
        console.log('Abrir pedido para grupo:', grupo, 'com contexto:', contexto);
        // if (!pedidoId) {
        //     abp.notify.warn('Pedido não identificado');
        //     return;
        // }

        // abp.ui.setBusy();

        // // Busca os detalhes do pedido para obter a solicitação relacionada
        // this._pedidoCompraService.get(pedidoId).subscribe({
        //     next: (pedido) => {
        //         abp.ui.clearBusy();

        //         if (!pedido || !pedido.solicitacaoMaterialId) {
        //             abp.notify.error('Não foi possível identificar a solicitação relacionada a este pedido');
        //             return;
        //         }

        //         

        //     },
        //     error: (error) => {
        //         abp.ui.clearBusy();
        //         console.error('Erro ao buscar pedido:', error);
        //         abp.notify.error('Erro ao carregar informações do pedido');
        //     }
        // });
    }
}