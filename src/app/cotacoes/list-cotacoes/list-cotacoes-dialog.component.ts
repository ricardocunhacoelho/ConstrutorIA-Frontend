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
import {
    BsDropdownDirective,
    BsDropdownToggleDirective,
    BsDropdownMenuDirective
} from 'ngx-bootstrap/dropdown';

import { TableModule } from 'primeng/table';
import { PaginatorModule } from 'primeng/paginator';
import { PrimeTemplate } from 'primeng/api';

import { LocalizePipe } from '@shared/pipes/localize.pipe';

import {
    CompraServiceProxy,
    CotacaoComOrcamentoDto,
    CotacaoServiceProxy,
    CreateMaterialPedidoCompraDto,
    CreateMelhorCompraDto,
    CreatePedidoCompraDto,
    IntervencaoCompraDto,
    IntervencaoCompraServiceProxy,
    MaterialOrcadoDto,
    MelhorCompraStatus,
    PedidoCompraServiceProxy
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


const MELHOR_COMPRA_ID = 'melhor-compra';

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
    quantidade?: string | undefined;
    unidade?: string | undefined;
    especificacao?: string | undefined;
    fornecedorId?: string | undefined;
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

type CotacaoComOrcamentoViewModel = CotacaoComOrcamentoDto & {
    materiaisAgrupados?: MaterialVMGrupo[];
};

type FluxoCompraViewModel = {
    id?: string;
    materiaisAgrupados?: MaterialVMGrupo[];
    enderecoEntrega?: {
        id?: string;
        formatado: string;
        origem: 'PEDIDO' | 'COMPRA';
    };
    usuarioPedido?: string;

    compraEfetivada?: InfoCompraFornecedor;
};


type InfoCompraFornecedor = {
    fornecedorNome: string;
    prazoEntrega?: string;
    observacao?: string;
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
        PrimeTemplate,
        LocalizePipe,
        BsDropdownDirective,
        BsDropdownToggleDirective,
        BsDropdownMenuDirective
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

    fluxoCompraVM: FluxoCompraViewModel[] = [];
    obraNome: string = '';
    expandedIndex: number | null = null;
    expanded: boolean[] = [];
    loading = false;
    naoCompensaMelhorCompra = false;
    savingCompra = false;
    pedidoOrigemId: string | null = null;
    existePedido: boolean = false;
    melhorCompraAgrupada: {
        fornecedor: string;
        grupos: MaterialVMGrupo[];
    }[] = [];

    constructor(
        public bsModalRef: BsModalRef,
        private _cotacaoService: CotacaoServiceProxy,
        private _pedidoCompraService: PedidoCompraServiceProxy,
        private _compraService: CompraServiceProxy,
        private _intervencaoCompraService: IntervencaoCompraServiceProxy,
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
        }).subscribe(({ cotacoesComOrcamento, pedidos, compras, intervencoesCompras }) => {

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
                const melhor = this.buildMelhorCompraCotacao(list);

                const totalMelhor = this.getTotal(melhor);
                const totaisIndividuais = list.map(c => this.getTotal(c));
                const menorIndividual = Math.min(...totaisIndividuais);

                if (totalMelhor === menorIndividual) {
                    this.naoCompensaMelhorCompra = true;
                }

                this.fluxoCompraVM = [...list, melhor];
                this.expanded = new Array(this.fluxoCompraVM.length).fill(false);
            } else {
                this.fluxoCompraVM = list;
                this.expanded = new Array(this.fluxoCompraVM.length).fill(false);
            }

            this.conciliarPedidosECompras(this.fluxoCompraVM, pedidos, compras);
            this.aplicarIntervencoes(this.fluxoCompraVM, intervencoesCompras);

            const melhorCompra = this.fluxoCompraVM.find(c => c.id === MELHOR_COMPRA_ID);

            if (melhorCompra) {
                this.melhorCompraAgrupada = this.buildGruposPorFornecedor(melhorCompra);
            }


            this.loading = false;
            this.cdr.detectChanges();
        });
    }

    private conciliarPedidosECompras(
        cotacoes: FluxoCompraViewModel[],
        pedidos: any[],
        compras: any[]
    ): void {

        if (!cotacoes?.length) return;

        const materiaisPedidos = new Set<string>();
        const materiaisComprados = new Set<string>();

        // 🔹 pedidos
        (pedidos || []).forEach(pedido => {
            (pedido.materiaisPedidosCompra || []).forEach((mat: any) => {
                if (mat.materialOrcadoId) {
                    materiaisPedidos.add(mat.materialOrcadoId);
                }
            });
        });

        // 🔹 compras
        (compras || []).forEach(compra => {
            (compra.materiaisComprados || []).forEach((mat: any) => {
                if (mat.materialOrcadoId) {
                    materiaisComprados.add(mat.materialOrcadoId);
                }
            });
        });

        cotacoes.forEach(cotacao => {

            // ==========================
            // STATUS DOS MATERIAIS
            // ==========================
            let jaComprado = false;

            if (cotacao.materiaisAgrupados?.length) {
                cotacao.materiaisAgrupados.forEach(grupo => {

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
                        if (cotacao.id === MELHOR_COMPRA_ID) {
                            grupo.prazoEntrega = compras.find(c => c.cotacaoId === grupo.selected?.cotacaoId)?.prazoEntrega;
                            grupo.observacao = compras.find(c => c.cotacaoId === grupo.selected?.cotacaoId)?.observacao;
                        }
                    }
                });
                if (cotacao.id !== MELHOR_COMPRA_ID && jaComprado) {
                    let infos = {
                        fornecedorNome: compras.find(c => c.cotacaoId === cotacao.id)?.fornecedorNome,
                        prazoEntrega: compras.find(c => c.cotacaoId === cotacao.id)?.prazoEntrega,
                        observacao: compras.find(c => c.cotacaoId === cotacao.id)?.observacao,
                    };
                    cotacao.compraEfetivada = infos;
                }
            }

            // ==========================
            // ENDEREÇO (COMPRA > PEDIDO)
            // ==========================

            // 🔥 COMPRA
            const compra = (compras || []).find(c =>
                c.cotacaoId === cotacao.id
            );

            if (compra?.enderecoEntrega) {
                cotacao.enderecoEntrega = {
                    id: compra.enderecoEntrega.id,
                    formatado: this.formatarEndereco(compra.enderecoEntrega),
                    origem: 'COMPRA'
                };
                return; // encerra só essa cotação
            }

            // 🔹 PEDIDO
            const pedido = (pedidos || []).find(p =>
                cotacao.id === MELHOR_COMPRA_ID
                    ? p.isMelhorCompra
                    : p.cotacaoId === cotacao.id
            );

            if (pedido?.user?.nome) {
                cotacao.usuarioPedido = pedido.user.nome;
            }

            if (pedido?.enderecoEntrega) {
                cotacao.enderecoEntrega = {
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

        const pedidoMelhorCompra = (pedidos || []).find(p => p.isMelhorCompra);

        if (pedidoMelhorCompra) {
            this.existePedido = true;
            this.pedidoOrigemId = MELHOR_COMPRA_ID;
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

    private formatarEndereco(endereco: any): string {
        if (!endereco) return 'Endereço não informado';

        return `${endereco.rua}, ${endereco.numero} - ${endereco.bairro}, 
                ${endereco.cidade} - ${endereco.uf}, CEP: ${endereco.cep}`;
    }

    isCardDesabilitado(cotacao: FluxoCompraViewModel): boolean {
        if (!this.existePedido) return false;

        return cotacao.id !== this.pedidoOrigemId;
    }

    groupMateriaisFromOrcamento(
        orcamento: any,
        cotacao: CotacaoComOrcamentoViewModel
    ): MaterialVMGrupo[] {
        if (!orcamento?.materiaisOrcados) return [];

        const grupos: Record<string, MaterialVMGrupo> = {};

        for (const mat of orcamento.materiaisOrcados) {
            const key = (mat.nome || '').trim();

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
        fornecedor: string;
        grupos: MaterialVMGrupo[];
    }[] {

        const map = new Map<string, MaterialVMGrupo[]>();

        (cotacao.materiaisAgrupados || [])
            .filter(g => !g.removido && g.selected)
            .forEach(g => {
                const fornecedor =
                    g.selected?.fornecedorNome || 'Fornecedor não informado';

                if (!map.has(fornecedor)) {
                    map.set(fornecedor, []);
                }

                map.get(fornecedor)!.push(g);
            });

        map.forEach(grupos => {
            grupos.sort((a, b) =>
                a.nome.localeCompare(b.nome, 'pt-BR', { sensitivity: 'base' })
            );
        });
        return Array.from(map.entries()).
            map(([fornecedor, grupos]) => ({ fornecedor, grupos })).sort((a, b) => b.grupos.length - a.grupos.length);
    }

    buildMelhorCompraCotacao(cotacoesComOrcamentos: CotacaoComOrcamentoViewModel[]): CotacaoComOrcamentoViewModel {
        const todasVariacoes: MaterialVMExtended[] = [];

        for (const c_o of cotacoesComOrcamentos) {
            if (!c_o.hasOrcamento || !c_o.orcamento?.materiaisOrcados) continue;

            for (const mat of c_o.orcamento.materiaisOrcados) {
                const v = Object.assign(new MaterialOrcadoDto(), mat) as MaterialVMExtended;
                v.fornecedorNome = c_o.fornecedor?.nome;
                v.cotacaoId = c_o.id;
                todasVariacoes.push(v);
            }
        }

        const gruposMap: Record<string, MaterialVMGrupo> = {};

        for (const v of todasVariacoes) {
            const key = (v.nome || '').trim();

            if (!gruposMap[key]) {
                gruposMap[key] = {
                    nome: v.nome ?? key,
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
            const notMissing = g.variacoes.find(x => !x.emFalta);
            g.selected = notMissing ?? g.variacoes[0] ?? null;
        });

        const melhorBase = Object.assign(new CotacaoComOrcamentoDto(), {
            id: MELHOR_COMPRA_ID,
            solicitacaoMaterialId: cotacoesComOrcamentos[0]?.solicitacaoMaterialId,
            solicitacaoMaterial: cotacoesComOrcamentos[0]?.solicitacaoMaterial,
            fornecedorId: undefined,
            fornecedor: ({ id: MELHOR_COMPRA_ID, displayName: 'Melhor compra', nome: 'Melhor compra' } as any),
            obraId: cotacoesComOrcamentos[0]?.obraId,
            obra: cotacoesComOrcamentos[0]?.obra,
            observacaoInterna: undefined,
            observacaoFornecedor: undefined,
            status: null as any,
            statusView: undefined,
            materiaisCotados: undefined,
            total: undefined,
            hasOrcamento: true,
            displayStatus: 'Melhor compra',
            orcamento: Object.assign(new (Object as any)(), {
                id: MELHOR_COMPRA_ID,
                cotacaoId: MELHOR_COMPRA_ID,
                fornecedorId: undefined,
                observacaoInterna: undefined,
                observacaoFornecedor: undefined,
                total: undefined,
                materiaisOrcados: undefined
            })
        }) as CotacaoComOrcamentoViewModel;

        melhorBase.materiaisAgrupados = Object.values(gruposMap);

        return melhorBase;
    }

    trackByFornecedor(index: number, item: any): string {
        return item.fornecedor;
    }

    trackByGrupo(index: number, grupo: MaterialVMGrupo): string {
        return grupo.nome;
    }

    getTotal(cotacao: any): number {
        if (!cotacao.hasOrcamento) return cotacao.total ?? 0;

        return (cotacao.materiaisAgrupados || [])
            .filter((g: any) => !g.removido)
            .map((g: any) => g.selected?.precoTotal ?? 0)
            .reduce((a: number, b: number) => a + b, 0);
    }

    getTotalGasto(cotacao: FluxoCompraViewModel): number {
        return (cotacao.materiaisAgrupados || [])
            .filter(g => g.jaComprado)
            .map(g => g.selected?.precoTotal ?? 0)
            .reduce((a, b) => a + b, 0);
    }

    getTotalRestante(cotacao: FluxoCompraViewModel): number {
        const total = this.getTotal(cotacao);
        const gasto = this.getTotalGasto(cotacao);
        return total - gasto;
    }

    getResumoStatus(fluxo: FluxoCompraViewModel): {
        texto: string;
        classe: string;
    } {

        const grupos = fluxo.materiaisAgrupados || [];
        const isMelhorCompra = fluxo.id === MELHOR_COMPRA_ID;

        if (!grupos.length) {
            return { texto: 'Sem materiais', classe: 'text-muted' };
        }

        const total = grupos.length;
        const comprados = grupos.filter(g => g.jaComprado).length;
        const pedidos = grupos.filter(g => g.feitoPedido).length;

        if (isMelhorCompra) {

            if (comprados === total) {
                return {
                    texto: ' — Todos os itens comprados',
                    classe: 'text-success'
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
                    texto: ' — Pedido realizado, aguardando compra',
                    classe: 'text-primary'
                };
            }

            return {
                texto: ' — Aguardando pedido',
                classe: 'text-muted'
            };
        }

        const pedidoEhMelhorCompra = this.pedidoOrigemId === MELHOR_COMPRA_ID;

        if (pedidoEhMelhorCompra) {
            return {
                texto: 'Itens incluídos na Melhor compra',
                classe: 'text-muted'
            };
        }

        if (comprados === total) {
            return {
                texto: 'Todos os itens comprados',
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
                texto: '— Pedido realizado, buscando efetivação de compra',
                classe: 'text-primary'
            };
        }

        return {
            texto: 'Cotação concluída. Aguardando formalização do pedido.',
            classe: 'text-muted'
        };
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

    async realizarCompra(cotacaoOrcamento: CotacaoComOrcamentoViewModel): Promise<void> {
        if (this.savingCompra) return;

        const result = await this.abrirDialogEndereco(cotacaoOrcamento);

        if (!result) return;

        this.savingCompra = true;

        if (cotacaoOrcamento.id === MELHOR_COMPRA_ID && !this.naoCompensaMelhorCompra) {
            this.gerarPedidosMelhorCompra(cotacaoOrcamento, result);
            return;
        }

        this.gerarPedidoCompra(cotacaoOrcamento, result);
    }

    private abrirDialogEndereco(cotacaoOrcamento: CotacaoComOrcamentoViewModel): Promise<any> {
        return new Promise(resolve => {

            const endereco = cotacaoOrcamento?.obra?.endereco;

            const enderecoFormatado = endereco
                ? `${endereco.rua}, ${endereco.numero} - ${endereco.bairro}, ${endereco.cidade} - ${endereco.uf}, CEP: ${endereco.cep}`
                : '';

            const modalRef = this._modalService.show(SelecionarEnderecoDialogComponent, {
                class: 'modal-md'
            });

            modalRef.content.enderecoObraId = endereco?.id;
            modalRef.content.enderecoObraFormatado = enderecoFormatado;

            const oldHide = modalRef.hide;
            modalRef.hide = () => {
                const content = modalRef.content;
                oldHide.apply(modalRef);

                if (!content.confirmado) {
                    resolve(null);
                    return;
                }

                resolve({
                    usarObra: content.usarEnderecoObra,
                    endereco: content.endereco,
                    enderecoObraId: content.enderecoObraId
                });
            };
        });
    }

    private gerarPedidosMelhorCompra(
        cotacaoOrcamento: CotacaoComOrcamentoViewModel,
        enderecoResult: any
    ): void {
        abp.ui.setBusy();
        const dto = new CreateMelhorCompraDto();
        dto.solicitacaoMaterialId = cotacaoOrcamento.solicitacaoMaterialId;
        dto.obraId = cotacaoOrcamento.obraId;
        dto.userId = abp.session.userId;
        dto.status = MelhorCompraStatus.EmAndamento;
        dto.observacaoInterna = cotacaoOrcamento.observacaoInterna;
        dto.total = this.getTotal(cotacaoOrcamento);

        dto.pedidosCompra = this.montarPedidosParaMelhorCompra(cotacaoOrcamento, enderecoResult);

        this._pedidoCompraService.gerarPedidosMelhorCompra(dto).subscribe(() => {
            this.savingCompra = false;
            this.onSave.emit();
            this.bsModalRef.hide();
            abp.ui.clearBusy();
        });
    }


    private montarPedidosParaMelhorCompra(
        cotacaoOrcamento: CotacaoComOrcamentoViewModel,
        enderecoResult: any
    ): CreatePedidoCompraDto[] {

        const grupos = cotacaoOrcamento.materiaisAgrupados || [];
        const pedidosPorFornecedor: { [key: string]: CreatePedidoCompraDto } = {};

        grupos
            .filter(g => !g.removido && g.selected)
            .forEach(g => {
                const v = g.selected!;
                const fornecedor = v.fornecedorNome || 'desconhecido';

                if (!pedidosPorFornecedor[fornecedor]) {
                    const pedido = new CreatePedidoCompraDto();

                    pedido.solicitacaoMaterialId = cotacaoOrcamento.solicitacaoMaterialId;
                    pedido.cotacaoId = v.cotacaoId;
                    pedido.orcamentoId = v.orcamentoId;
                    pedido.obraId = cotacaoOrcamento.obraId;
                    pedido.userId = abp.session.userId;
                    pedido.isMelhorCompra = true;
                    pedido.observacaoInterna = cotacaoOrcamento.observacaoInterna;
                    pedido.materiaisPedidosCompra = [];

                    if (enderecoResult?.usarObra) {
                        pedido.enderecoEntregaId = enderecoResult.enderecoObraId;
                    } else {
                        pedido.enderecoEntrega = enderecoResult.endereco;
                    }

                    pedidosPorFornecedor[fornecedor] = pedido;
                }

                const mat = new CreateMaterialPedidoCompraDto();
                mat.nome = v.nome;
                mat.quantidade = String(v.quantidade);
                mat.unidade = v.unidade;
                mat.especificacao = v.especificacao;
                mat.fornecedorId = v.fornecedorId;
                mat.solicitacaoMaterialId = cotacaoOrcamento.solicitacaoMaterialId;
                mat.cotacaoId = v.cotacaoId;
                mat.orcamentoId = v.orcamentoId;
                mat.materialOrcadoId = v.id;
                mat.precoItem = v.precoItem;
                mat.precoTotal = v.precoTotal;

                pedidosPorFornecedor[fornecedor].materiaisPedidosCompra.push(mat);
            });

        return Object.values(pedidosPorFornecedor);
    }

    private gerarPedidoCompra(
        cotacaoOrcamento: CotacaoComOrcamentoViewModel,
        enderecoResult: any
    ): void {
        abp.ui.setBusy();

        const dto = new CreatePedidoCompraDto();
        dto.solicitacaoMaterialId = cotacaoOrcamento.solicitacaoMaterialId;
        dto.cotacaoId = cotacaoOrcamento.id;
        dto.obraId = cotacaoOrcamento.obraId;
        dto.userId = abp.session.userId;
        dto.observacaoInterna = cotacaoOrcamento.observacaoInterna;
        dto.observacaoFornecedor = cotacaoOrcamento.observacaoFornecedor;

        if (enderecoResult?.usarObra) {
            dto.enderecoEntregaId = enderecoResult.enderecoObraId;
        } else {
            dto.enderecoEntrega = enderecoResult.endereco;
        }

        dto.materiaisPedidosCompra = (cotacaoOrcamento.materiaisAgrupados || [])
            .filter(g => !g.removido && g.selected)
            .map(g => {
                const v = g.selected!;
                const mat = new CreateMaterialPedidoCompraDto();

                mat.nome = v.nome;
                mat.quantidade = String(v.quantidade);
                mat.unidade = v.unidade;
                mat.especificacao = v.especificacao;
                mat.fornecedorId = v.fornecedorId;
                mat.solicitacaoMaterialId = cotacaoOrcamento.solicitacaoMaterialId;
                mat.cotacaoId = cotacaoOrcamento.id;
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
            && this.pedidoOrigemId !== MELHOR_COMPRA_ID
            && fluxo.id === this.pedidoOrigemId;
    }

    hasIntervencaoPendenteFluxo(fluxo: FluxoCompraViewModel): boolean {
        return !!fluxo.materiaisAgrupados?.some(g =>
            g.intervencao && !g.intervencao.resolvida
        );
    }

    getHeaderClass(fluxo: FluxoCompraViewModel): string {
        if (this.hasIntervencaoPendenteFluxo(fluxo) && this.isFornecedorDoPedido(fluxo)) {
            return 'header-intervencao';
        }

        if (this.isFornecedorDoPedido(fluxo) && this.isFornecedorDoPedido(fluxo)) {
            return 'header-pedido';
        }

        return '';
    }


    isFornecedorDoPedido(fluxo: FluxoCompraViewModel): boolean {
        return this.existePedido && fluxo.id === this.pedidoOrigemId;
    }
}
