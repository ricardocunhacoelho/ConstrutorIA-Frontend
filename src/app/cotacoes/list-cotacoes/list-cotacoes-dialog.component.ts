import { ChangeDetectorRef, Component, EventEmitter, Input, OnInit, Output } from '@angular/core';
import { BsModalRef, BsModalService } from 'ngx-bootstrap/modal';
import { CreateCotacaoDialogComponent } from '../create-cotacao/create-cotacao-dialog.component';
import { CotacaoComOrcamentoDto, CotacaoDto, CotacaoServiceProxy, MaterialOrcadoDto } from '../../../shared/service-proxies/service-proxies';
import { TableModule } from 'primeng/table';
import { PrimeTemplate } from 'primeng/api';
import { PaginatorModule } from 'primeng/paginator';
import { FormsModule } from '@angular/forms';
import { CommonModule, NgIf } from '@angular/common';
import { LocalizePipe } from '@shared/pipes/localize.pipe';
import { BsDropdownDirective, BsDropdownToggleDirective, BsDropdownMenuDirective } from 'ngx-bootstrap/dropdown';
import {
    trigger,
    state,
    style,
    transition,
    animate,
} from '@angular/animations';

interface MaterialOrcadoGrupo {
    nome: string;
    variacoes: MaterialOrcadoDto[];
    selected: MaterialOrcadoDto | null;
    removido?: boolean;
}


@Component({
    selector: 'app-cotacoes-list-dialog',
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
    ],
    templateUrl: './list-cotacoes-dialog.component.html',
    styleUrls: ['./list-cotacoes-dialog.component.scss'],
    standalone: true,
    imports: [LocalizePipe, BsDropdownDirective, BsDropdownToggleDirective, BsDropdownMenuDirective, CommonModule, FormsModule, TableModule, PrimeTemplate, NgIf, PaginatorModule, LocalizePipe],
})
export class CotacoesListDialogComponent implements OnInit {
    @Input() solicitacaoId: string;
    cotacoes: CotacaoComOrcamentoDto[] = [];
    expandedIndex: number | null = null;
    loading = false;
    expanded: boolean[] = [];

    @Output() onSave = new EventEmitter<void>();

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
        this._cotacaoService
            .getAllWithOrcamentoBySolicitacao(this.solicitacaoId)
            .subscribe((result) => {
                this.cotacoes = result || [];

                this.cotacoes.forEach(c => {
                    if (c.hasOrcamento && c.orcamento) {
                        (c as any).materiaisAgrupados = this.groupMateriais(c.orcamento);
                    }
                });

                this.loading = false;
                this.cdr.detectChanges();
            });

    }

    getTotal(cotacao: any): number {
        if (!cotacao.hasOrcamento) return cotacao.total ?? 0;

        return cotacao.materiaisAgrupados
            .filter(g => !g.removido)
            .map(g => g.selected?.precoTotal ?? 0)
            .reduce((a, b) => a + b, 0);
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

    groupMateriais(orcamento: any): MaterialOrcadoGrupo[] {
        if (!orcamento || !orcamento.materiaisOrcados) return [];

        const grupos: { [key: string]: MaterialOrcadoGrupo } = {};

        for (const mat of orcamento.materiaisOrcados) {
            if (!grupos[mat.nome]) {
                grupos[mat.nome] = {
                    nome: mat.nome,
                    variacoes: [],
                    selected: null
                };
            }
            grupos[mat.nome].variacoes.push(mat);
        }

        Object.values(grupos).forEach(group => {
            group.variacoes.sort((a, b) => (a.precoTotal ?? 999999) - (b.precoTotal ?? 999999));
            group.selected = group.variacoes[0];
        });

        return Object.values(grupos);
    }

    removerGrupo(cotacao: any, grupo: any): void {
        grupo.removido = !grupo.removido;
    }

}
