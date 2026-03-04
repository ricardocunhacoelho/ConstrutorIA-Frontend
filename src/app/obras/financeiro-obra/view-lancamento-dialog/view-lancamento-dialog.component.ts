import { Component, Injector, OnInit, EventEmitter, Output, ChangeDetectorRef, Input } from '@angular/core';
import { BsModalRef, BsModalService } from 'ngx-bootstrap/modal';
import { AppComponentBase } from '@shared/app-component-base';
import {
    ObraLancamentoFinanceiroServiceProxy,
    ObraLancamentoFinanceiroDto,
    EnumServiceProxy,
    EnumValueDto,
    FormaPagamento
} from '@shared/service-proxies/service-proxies';
import { finalize } from 'rxjs/operators';
import moment from 'moment';
import { CommonModule } from '@node_modules/@angular/common';
import { FormsModule } from '@node_modules/@angular/forms';
import { forkJoin } from 'rxjs';
import { EstornarLancamentoModalComponent } from '@shared/components/confirmar-pagamento-dialog/estornar-lancamento-modal/estornar-lancamento-modal.component';

@Component({
    templateUrl: './view-lancamento-dialog.component.html',
    styleUrls: ['./view-lancamento-dialog.component.scss'],
    standalone: true,
    imports: [
        CommonModule,
        FormsModule,
    ]
})
export class ViewLancamentoDialogComponent extends AppComponentBase implements OnInit {
    @Output() onEstornado = new EventEmitter<void>();
    @Input() lancamentoId!: string;

    lancamento: ObraLancamentoFinanceiroDto | null = null;
    carregando = true;

    // Enums
    naturezas: EnumValueDto[] = [];
    tipos: EnumValueDto[] = [];
    formasPagamento: EnumValueDto[] = [];

    // Dados para exibição
    dataLancamentoStr: string = '';
    valorTotalMateriais: number = 0;
    fornecedorNome: string = '-';

    constructor(
        injector: Injector,
        public bsModalRef: BsModalRef,
        private _obraLancamentoFinanceiroService: ObraLancamentoFinanceiroServiceProxy,
        private _enumService: EnumServiceProxy,
        private _modalService: BsModalService,
        private cd: ChangeDetectorRef
    ) {
        super(injector);
    }

    ngOnInit(): void {
        abp.ui.setBusy();

        // Carrega enums e lançamento em paralelo
        forkJoin({
            naturezas: this._enumService.getNaturezasLancamento(),
            tipos: this._enumService.getTiposLancamento(),
            formasPagamento: this._enumService.getFormasPagamento(),
            lancamento: this._obraLancamentoFinanceiroService.get(this.lancamentoId)
        }).subscribe({
            next: (result) => {
                this.naturezas = result.naturezas;
                this.tipos = result.tipos;
                this.formasPagamento = result.formasPagamento;
                this.lancamento = result.lancamento;

                // Formata a data para exibição
                if (this.lancamento?.dataLancamento) {
                    this.dataLancamentoStr = moment(this.lancamento.dataLancamento).format('DD/MM/YYYY');
                }

                if (this.lancamento?.fornecedor?.nome) {
                    this.fornecedorNome = this.lancamento.fornecedor.nome;
                } else if (this.lancamento?.compra?.fornecedor?.nome) {
                    this.fornecedorNome = this.lancamento.compra.fornecedor.nome;
                }

                // Calcula total de materiais se for uma compra
                if (this.lancamento?.compra?.materiaisComprados) {
                    this.valorTotalMateriais = this.lancamento.compra.materiaisComprados
                        .reduce((total, m) => total + (m.precoTotal || 0), 0);
                }

                this.carregando = false;
                abp.ui.clearBusy();
                this.cd.detectChanges();
            },
            error: (error) => {
                console.error('Erro ao carregar dados:', error);
                this.notify.error('Erro ao carregar dados do lançamento');
                this.carregando = false;
                abp.ui.clearBusy();
                this.bsModalRef.hide();
            }
        });
    }

    getDescricaoNatureza(value: number): string {
        return this.naturezas.find(n => n.value === value)?.description || '';
    }

    getDescricaoTipo(value: number): string {
        return this.tipos.find(t => t.value === value)?.description || '';
    }

    getDescricaoFormaPagamento(value: FormaPagamento): string {
        return this.formasPagamento.find(f => f.value === value)?.description || '';
    }

    getTitulo(): string {
        if (!this.lancamento) return 'Visualizar Lançamento';
        return this.lancamento.natureza === 0 ? 'Visualizar Receita' : 'Visualizar Despesa';
    }

    getCorTitulo(): string {
        if (!this.lancamento) return '';
        return this.lancamento.natureza === 0 ? 'receita' : 'despesa';
    }

    getIcone(): string {
        if (!this.lancamento) return 'fa-credit-card';
        return this.lancamento.natureza === 0 ? 'fa-arrow-up' : 'fa-arrow-down';
    }

    getValorTotalCalculado(): number {
        if (!this.lancamento) return 0;

        let total = this.lancamento.valorPago + (this.lancamento.desconto || 0) - (this.lancamento.frete || 0);

        return total;
    }

    // Verifica se tem fornecedor para mostrar
    get temFornecedor(): boolean {
        return this.fornecedorNome !== '-';
    }

    // Verifica se tem materiais (é uma compra)
    get temMateriais(): boolean {
        return !!(this.lancamento?.compra?.materiaisComprados?.length);
    }

    estornar(): void {
        if (!this.lancamento?.id) return;

        const modalRef = this._modalService.show(
            EstornarLancamentoModalComponent,
            {
                class: 'modal-md modal-dialog-centered',
                backdrop: 'static'
            }
        );

        modalRef.content.onConfirm.subscribe((motivo: string) => {
            abp.ui.setBusy();

            const dto: any = {
                id: this.lancamento!.id,
                motivo: motivo
            };

            this._obraLancamentoFinanceiroService
                .estornar(dto)
                .pipe(finalize(() => abp.ui.clearBusy()))
                .subscribe({
                    next: (lancamentoAtualizado) => {
                        this.notify.success('Lançamento estornado com sucesso!');
                        this.lancamento = lancamentoAtualizado;
                        this.onEstornado.emit();
                        this.cd.detectChanges();
                    },
                    error: (error) => {
                        this.notify.error('Erro ao estornar lançamento');
                    }
                });
        });
    }

    fechar(): void {
        this.bsModalRef.hide();
    }
}