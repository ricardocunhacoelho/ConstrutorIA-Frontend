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
    CotacaoComOrcamentoDto,
    CotacaoServiceProxy,
    CreateMaterialPedidoCompraDto,
    CreateMelhorCompraDto,
    CreatePedidoCompraDto,
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


const MELHOR_COMPRA_ID = 'melhor-compra';

/**
 * NOTA:
 * MaterialOrcadoDto é uma classe gerada pelo service-proxy (possui init(), toJSON(), clone()).
 * Para evitar erro de tipagem (missing init/toJSON/clone) usamos Object.assign(new MaterialOrcadoDto(), ...)
 */
type MaterialOrcadoDtoExtended = MaterialOrcadoDto & {
    fornecedorNome?: string;
    cotacaoId?: string;
};

interface MaterialOrcadoGrupo {
    nome: string;
    variacoes: MaterialOrcadoDtoExtended[];
    selected: MaterialOrcadoDtoExtended | null;
    removido?: boolean;
}

type CotacaoComOrcamentoViewModel = CotacaoComOrcamentoDto & {
    materiaisAgrupados?: MaterialOrcadoGrupo[];
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

    cotacoes: CotacaoComOrcamentoViewModel[] = [];
    expandedIndex: number | null = null;
    expanded: boolean[] = [];
    loading = false;
    naoCompensaMelhorCompra = false;
    savingCompra = false;

    constructor(
        public bsModalRef: BsModalRef,
        private _cotacaoService: CotacaoServiceProxy,
        private _pedidoCompraService: PedidoCompraServiceProxy,
        private _modalService: BsModalService,
        private cdr: ChangeDetectorRef
    ) { }

    ngOnInit(): void {
        this.loadCotacoes();
    }

    loadCotacoes(): void {
        this.loading = true;

        this._cotacaoService
            .getAllWithOrcamentoBySolicitacao(this.solicitacaoId)
            .subscribe((result) => {
                const list = (result as CotacaoComOrcamentoViewModel[]) || [];

                // agrupa cada cotação normalmente
                list.forEach(c => {
                    if (c.hasOrcamento && c.orcamento) {
                        c.materiaisAgrupados = this.groupMateriaisFromOrcamento(c.orcamento, c);
                    }
                });

                // se tiver mais de um orçamento válido, cria o card "Melhor compra"
                const temMaisDeUm = list.filter(c =>
                    c.hasOrcamento && c.orcamento?.materiaisOrcados?.length
                ).length > 1;

                if (temMaisDeUm) {
                    const melhor = this.buildMelhorCompraCotacao(list);
                    const totalMelhor = this.getTotal(melhor);
                    const totaisIndividuais = list.map(c => this.getTotal(c));
                    const menorIndividual = Math.min(...totaisIndividuais);
                    if (totalMelhor == menorIndividual) {
                        this.naoCompensaMelhorCompra = false;
                    }
                    this.cotacoes = [...list, melhor];
                } else {
                    this.cotacoes = list;
                }

                this.loading = false;
                this.cdr.detectChanges();
            });
    }

    // agrupa materiais dentro de um orçamento e cria instâncias corretas das variações
    groupMateriaisFromOrcamento(
        orcamento: any,
        cotacao: CotacaoComOrcamentoViewModel
    ): MaterialOrcadoGrupo[] {
        if (!orcamento?.materiaisOrcados) return [];

        const grupos: Record<string, MaterialOrcadoGrupo> = {};

        for (const mat of orcamento.materiaisOrcados) {
            const key = (mat.nome || '').trim();

            if (!grupos[key]) {
                grupos[key] = {
                    nome: mat.nome ?? key,
                    variacoes: [],
                    selected: null
                };
            }

            // cria uma instância de MaterialOrcadoDto e copia valores + extras
            const v = Object.assign(new MaterialOrcadoDto(), mat) as MaterialOrcadoDtoExtended;
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

    // constrói o card "Melhor compra" usando instâncias corretas
    buildMelhorCompraCotacao(cotacoes: CotacaoComOrcamentoViewModel[]): CotacaoComOrcamentoViewModel {
        const todasVariacoes: MaterialOrcadoDtoExtended[] = [];

        for (const c of cotacoes) {
            if (!c.hasOrcamento || !c.orcamento?.materiaisOrcados) continue;

            for (const mat of c.orcamento.materiaisOrcados) {
                const v = Object.assign(new MaterialOrcadoDto(), mat) as MaterialOrcadoDtoExtended;
                v.fornecedorNome = c.fornecedor?.nome;
                v.cotacaoId = c.id;
                todasVariacoes.push(v);
            }
        }

        // agrupa por nome|especificacao (normalizados)
        const gruposMap: Record<string, MaterialOrcadoGrupo> = {};

        for (const v of todasVariacoes) {
            // const key = `${(v.nome || '').trim().toLowerCase()}|${(v.especificacao || '').trim().toLowerCase()}`;
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

        // ordena e seleciona melhor (prefere não em falta)
        Object.values(gruposMap).forEach(g => {
            g.variacoes.sort(
                (a, b) => (a.precoTotal ?? Number.MAX_VALUE) - (b.precoTotal ?? Number.MAX_VALUE)
            );
            const notMissing = g.variacoes.find(x => !x.emFalta);
            g.selected = notMissing ?? g.variacoes[0] ?? null;
        });

        const melhorBase = Object.assign(new CotacaoComOrcamentoDto(), {
            id: MELHOR_COMPRA_ID,
            solicitacaoMaterialId: cotacoes[0]?.solicitacaoMaterialId,
            solicitacaoMaterial: cotacoes[0]?.solicitacaoMaterial,
            fornecedorId: undefined,
            fornecedor: ({ id: MELHOR_COMPRA_ID, displayName: 'Melhor compra', nome: 'Melhor compra' } as any),
            obraId: cotacoes[0]?.obraId,
            obra: cotacoes[0]?.obra,
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

        // adiciona os grupos montados (são objetos puros de agrupamento, ok)
        melhorBase.materiaisAgrupados = Object.values(gruposMap);

        return melhorBase;
    }

    getTotal(cotacao: any): number {
        if (!cotacao.hasOrcamento) return cotacao.total ?? 0;

        return (cotacao.materiaisAgrupados || [])
            .filter((g: any) => !g.removido)
            .map((g: any) => g.selected?.precoTotal ?? 0)
            .reduce((a: number, b: number) => a + b, 0);
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

    async realizarCompra(cotacao: CotacaoComOrcamentoViewModel): Promise<void> {
        if (this.savingCompra) return;

        const result = await this.abrirDialogEndereco(cotacao);

        if (!result) return;

        this.savingCompra = true;

        if (cotacao.id === MELHOR_COMPRA_ID && !this.naoCompensaMelhorCompra) {
            this.gerarPedidosMelhorCompra(cotacao, result);
            return;
        }

        this.gerarPedidoCompra(cotacao, result);
    }

    private abrirDialogEndereco(cotacao: CotacaoComOrcamentoViewModel): Promise<any> {
        return new Promise(resolve => {

            const endereco = cotacao?.obra?.endereco;

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
        cotacao: CotacaoComOrcamentoViewModel,
        enderecoResult: any
    ): void {
        const dto = new CreateMelhorCompraDto();
        dto.solicitacaoMaterialId = cotacao.solicitacaoMaterialId;
        dto.obraId = cotacao.obraId;
        dto.userId = abp.session.userId;
        dto.status = MelhorCompraStatus.EmAndamento;
        dto.observacaoInterna = cotacao.observacaoInterna;
        dto.total = this.getTotal(cotacao);

        dto.pedidosCompra = this.montarPedidosParaMelhorCompra(cotacao, enderecoResult);

        this._pedidoCompraService.gerarPedidosMelhorCompra(dto).subscribe(() => {
            this.savingCompra = false;
            this.onSave.emit();
            this.bsModalRef.hide();
        });
    }


    private montarPedidosParaMelhorCompra(
        cotacao: CotacaoComOrcamentoViewModel,
        enderecoResult: any
    ): CreatePedidoCompraDto[] {

        const grupos = cotacao.materiaisAgrupados || [];
        const pedidosPorFornecedor: { [key: string]: CreatePedidoCompraDto } = {};

        grupos
            .filter(g => !g.removido && g.selected)
            .forEach(g => {
                const v = g.selected!;
                const fornecedor = v.fornecedorNome || 'desconhecido';

                if (!pedidosPorFornecedor[fornecedor]) {
                    const pedido = new CreatePedidoCompraDto();

                    pedido.solicitacaoMaterialId = cotacao.solicitacaoMaterialId;
                    pedido.cotacaoId = v.cotacaoId;
                    pedido.orcamentoId = v.orcamentoId;
                    pedido.obraId = cotacao.obraId;
                    pedido.userId = abp.session.userId;
                    pedido.isMelhorCompra = true;
                    pedido.observacaoInterna = cotacao.observacaoInterna;
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
                mat.solicitacaoMaterialId = cotacao.solicitacaoMaterialId;
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
        cotacao: CotacaoComOrcamentoViewModel,
        enderecoResult: any
    ): void {

        const dto = new CreatePedidoCompraDto();
        dto.solicitacaoMaterialId = cotacao.solicitacaoMaterialId;
        dto.cotacaoId = cotacao.id;
        dto.obraId = cotacao.obraId;
        dto.userId = abp.session.userId;
        dto.observacaoInterna = cotacao.observacaoInterna;
        dto.observacaoFornecedor = cotacao.observacaoFornecedor;

        if (enderecoResult?.usarObra) {
            dto.enderecoEntregaId = enderecoResult.enderecoObraId;
        } else {
            dto.enderecoEntrega = enderecoResult.endereco;
        }

        dto.materiaisPedidosCompra = (cotacao.materiaisAgrupados || [])
            .filter(g => !g.removido && g.selected)
            .map(g => {
                const v = g.selected!;
                const mat = new CreateMaterialPedidoCompraDto();

                mat.nome = v.nome;
                mat.quantidade = String(v.quantidade);
                mat.unidade = v.unidade;
                mat.especificacao = v.especificacao;
                mat.fornecedorId = v.fornecedorId;
                mat.solicitacaoMaterialId = cotacao.solicitacaoMaterialId;
                mat.cotacaoId = cotacao.id;
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
        });
    }
}
