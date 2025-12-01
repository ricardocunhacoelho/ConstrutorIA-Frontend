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
    MaterialOrcadoDto
} from '../../../shared/service-proxies/service-proxies';

import { CreateCotacaoDialogComponent } from '../create-cotacao/create-cotacao-dialog.component';

import {
    trigger,
    style,
    transition,
    animate
} from '@angular/animations';

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

    constructor(
        public bsModalRef: BsModalRef,
        private _cotacaoService: CotacaoServiceProxy,
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
}
