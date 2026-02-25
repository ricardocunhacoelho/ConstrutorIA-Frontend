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
    FormaPagamento,
    IntervencaoCompraDto,
    IntervencaoCompraServiceProxy,
    MaterialCotadoDto,
    MaterialOrcadoDto,
    MelhorCompraStatus,
    ObraLancamentoFinanceiroServiceProxy,
    OrcamentoDto,
    PedidoCompraDto,
    PedidoCompraServiceProxy,
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
import { forkJoin } from 'rxjs';
import { ConfirmarPagamentoDialogComponent } from '@shared/components/confirmar-pagamento-dialog/confirmar-pagamento-dialog.component.';


const MENOR_VALOR_TIPO = 'MENOR_VALOR_POR_ITEM';


interface ResultadoEnderecoPagamento {
    tipoEntrega: 'OBRA' | 'OUTRO' | 'RETIRADA';
    endereco?: CreateEnderecoDto;
    enderecoObraId?: string;
    formaPagamento?: 'PIX' | 'CREDITO' | 'DEBITO' | 'DINHEIRO' | 'FATURADO';
}


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
    retiradaNoFornecedor?: boolean;

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
    intervencaoResolvida?: boolean;
    opcaoSelecionada?: string;
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
    }[] = [];

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
        }).subscribe(({ cotacoesComOrcamento, pedidos, compras, intervencoesCompras, lancamentos }) => {

            this.pedidosCache = pedidos;
            this.cotacoesCache = cotacoesComOrcamento;
            this.comprasCache = compras;

            this.obraNome = cotacoesComOrcamento[0]?.obra?.nome || '';

            const list = (cotacoesComOrcamento as CotacaoComOrcamentoViewModel[]) || [];

            list.forEach(c => {
                if (c.hasOrcamento && c.orcamento) {
                    c.materiaisAgrupados = this.groupMateriaisFromOrcamento(c.orcamento, c);
                }
            });

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
            }

            this.conciliarPagamentos(this.fluxoCompraVM, compras, lancamentos);

            this.loading = false;
            this.cdr.detectChanges();
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

        (pedidos || []).forEach(pedido => {
            (pedido.materiaisPedidosCompra || []).forEach((mat: any) => {
                if (mat.materialOrcadoId) {
                    materiaisPedidos.add(mat.materialOrcadoId);
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

            // ==========================
            // STATUS DOS MATERIAIS
            // ==========================
            let jaComprado = false;

            if (fluxo.materiaisAgrupados?.length) {
                fluxo.materiaisAgrupados.forEach(grupo => {

                    let foiPedido = false;
                    let foiComprado = false;

                    grupo.variacoes.forEach(v => {
                        if (!v.id) return;

                        if (materiaisPedidos.has(v.id)) foiPedido = true;
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

        cotacoes.forEach(cotacao => {
            cotacao.materiaisAgrupados?.forEach(grupo => {

                const intervencao = intervencoes.find(i =>
                    i.materialPedidoCompra.materialOrcadoId === grupo.selected?.id
                );

                if (intervencao) {
                    grupo.intervencao = intervencao;
                    grupo.intervencaoResolvida = intervencao.resolvida;
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

    getTotal(fluxo: any): number {
        if (fluxo.tipo !== MENOR_VALOR_TIPO && !fluxo.hasOrcamento) return fluxo.total ?? 0;

        return (fluxo.materiaisAgrupados || [])
            .filter((g: any) => !g.removido)
            .map((g: any) => g.selected?.precoTotal ?? 0)
            .reduce((a: number, b: number) => a + b, 0);
    }

    getTotalGasto(fluxo: FluxoCompraViewModel): number {
        return (fluxo.materiaisAgrupados || [])
            .filter(g => g.jaComprado)
            .map(g => g.selected?.precoTotal ?? 0)
            .reduce((a, b) => a + b, 0);
    }

    getTotalRestante(fluxo: FluxoCompraViewModel): number {
        const total = this.getTotal(fluxo);
        const gasto = this.getTotalGasto(fluxo);
        return total - gasto;
    }

    getResumoStatus(fluxo: FluxoCompraViewModel): {
        texto: string;
        classe: string;
    } {

        if (fluxo.pagamentoConfirmado) {
            return {
                texto: 'Pagamento realizado e custo lançado na obra',
                classe: 'text-success'
            };
        }

        const grupos = fluxo.materiaisAgrupados || [];
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

        if (bloco.pagamentoConfirmado) {

            const data = new Date(bloco.pagamentoConfirmado.data);

            const dataFormatada =
                data.toLocaleDateString('pt-BR') + ' ' +
                data.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });

            return {
                texto: `Pagamento confirmado em ${dataFormatada}. Valor: R$ ${bloco.pagamentoConfirmado.valor.toFixed(2)}. Forma de pagamento: ${bloco.pagamentoConfirmado.formaPagamento}. Custo já lançado na obra.`,
                classe: 'text-success'
            };
        }

        const grupos = (bloco.grupos || [])
            .filter(g => !g.removido);

        if (!grupos.length) return null;

        const todosComprados = this.todosCompradosBloco(bloco);
        const algumPedido = grupos.some(g => g.feitoPedido);
        const algumNaoComprado = grupos.some(g => !g.jaComprado);

        if (todosComprados) {
            return {
                texto: `Pedido concluído. O setor financeiro deve entrar em contato com o fornecedor ${bloco.fornecedor} para realizar o pagamento. Após o pagamento, confirme e lance o custo do pedido na obra.`,
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
            .filter(g => !g.removido && g.selected)
            .map(g => g.selected?.precoTotal ?? 0)
            .reduce((a, b) => a + b, 0);
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
        const grupos = (bloco.grupos || []).filter(g => !g.removido);
        return grupos.length > 0 && grupos.every(g => g.jaComprado);
    }


    getInfoPagamentoFluxo(fluxo: any): { texto: string; classe: string } | null {

        if (fluxo.pagamentoConfirmado) {

            const data = new Date(fluxo.pagamentoConfirmado.data);

            const dataFormatada =
                data.toLocaleDateString('pt-BR') + ' ' +
                data.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });

            return {
                texto: `Pagamento confirmado em ${dataFormatada}. Valor: R$ ${fluxo.pagamentoConfirmado.valor.toFixed(2)}. Forma de pagamento: ${fluxo.pagamentoConfirmado.formaPagamento}. Custo já lançado na obra.`,
                classe: 'text-success'
            };
        }

        const gruposParaCompra = (fluxo.materiaisAgrupados || [])
            .filter(g => !g.removido);

        if (!gruposParaCompra.length) return null;

        const todosComprados = this.todosCompradosFluxo(fluxo);
        const algumPedido = gruposParaCompra.some(g => g.feitoPedido);
        const algumNaoComprado = gruposParaCompra.some(g => !g.jaComprado);

        if (todosComprados) {
            return {
                texto: `Lembre-se: O setor financeiro deve entrar em contato com o fornecedor ${fluxo.fornecedor?.nome} para realizar o pagamento. Após o pagamento, confirme e lance o custo do pedido na obra.`,
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
        const grupos = (fluxo.materiaisAgrupados || [])
            .filter(g => !g.removido);

        return grupos.length > 0 && grupos.every(g => g.jaComprado);
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
    ): 'PAGO' | 'CONCLUIDO' | 'PEDIDO' | null {

        if (contexto?.pagamentoConfirmado) return 'PAGO';
        if (grupo.jaComprado) return 'CONCLUIDO';
        if (grupo.feitoPedido) return 'PEDIDO';

        return null;
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
        return this.getStatusGrupo(grupo, contexto) !== null;
    }
}