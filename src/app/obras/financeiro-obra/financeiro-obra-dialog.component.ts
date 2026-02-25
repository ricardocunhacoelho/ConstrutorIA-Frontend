import { Component, Injector, OnInit, EventEmitter, Output, ChangeDetectorRef } from '@angular/core';
import { BsModalRef, BsModalService } from 'ngx-bootstrap/modal';
import { forEach as _forEach, map as _map } from 'lodash-es';
import { AppComponentBase } from '@shared/app-component-base';
import { CreateEncarregadoDto, CreateEnderecoDto, CreateObraDto, CreateProprietarioDto, CreateTelefoneDto, FornecedorServiceProxy, ObraLancamentoTipoNullable, ObraServiceProxy } from '@shared/service-proxies/service-proxies';
import { FormsModule } from '@angular/forms';
import { AbpModalHeaderComponent } from '../../../shared/components/modal/abp-modal-header.component';
import { TabsetComponent, TabDirective } from 'ngx-bootstrap/tabs';
import { AbpValidationSummaryComponent } from '../../../shared/components/validation/abp-validation.summary.component';
import { EqualValidator } from '../../../shared/directives/equal-validator.directive';
import { AbpModalFooterComponent } from '../../../shared/components/modal/abp-modal-footer.component';
import { LocalizePipe } from '@shared/pipes/localize.pipe';
import { CommonModule, NgIf } from '@node_modules/@angular/common';
import moment from 'moment';
import { ObraLancamentoFinanceiroServiceProxy } from '../../../shared/service-proxies/service-proxies';
import { TableModule } from 'primeng/table';
import { PaginatorModule } from 'primeng/paginator';
import { ConfirmarPagamentoDialogComponent } from '@shared/components/confirmar-pagamento-dialog/confirmar-pagamento-dialog.component.';


@Component({
    templateUrl: './financeiro-obra-dialog.component.html',
    styleUrls: ['./financeiro-obra-dialog.component.scss'],

    standalone: true,
    imports: [
        CommonModule,
        NgIf,
        FormsModule,
        TableModule,
        PaginatorModule,
        AbpModalHeaderComponent,
        TabsetComponent,
        TabDirective,
        AbpValidationSummaryComponent,
        EqualValidator,
        AbpModalFooterComponent,
        LocalizePipe,
    ],
})
export class FinanceiroObraDialogComponent extends AppComponentBase {
    @Output() onSave = new EventEmitter<any>();

    saving = false;
    obraId: string;

    lancamentos: any[] = [];
    totalCount = 0;

    dataInicio?: Date;
    dataFim?: Date;
    natureza: number | undefined;

    tipo?: ObraLancamentoTipoNullable;
    totalReceitas = 0;
    totalDespesas = 0;
    saldo = 0;

    fornecedores: any[] = [];
    fornecedorId?: string;

    constructor(
        injector: Injector,
        public _obraLancamentoFinanceiroService: ObraLancamentoFinanceiroServiceProxy,
        public _fornecedorService: FornecedorServiceProxy,
        public bsModalRef: BsModalRef,
        private _modalService: BsModalService,
        private cd: ChangeDetectorRef
    ) {
        super(injector);
    }

    ngOnInit(): void {
        abp.ui.setBusy();

        this._fornecedorService.getForSelect()
            .subscribe(result => {
                this.fornecedores = result;
            });

        this.list();
    }

    list(event?: any): void {

        const skipCount = event?.first ?? 0;
        const maxResultCount = event?.rows ?? 10;

        this._obraLancamentoFinanceiroService
            .getAll(
                this.obraId,
                this.fornecedorId ?? undefined,
                this.dataInicio ? moment(this.dataInicio) : undefined,
                this.dataFim ? moment(this.dataFim) : undefined,
                this.natureza ?? undefined,
                this.tipo ?? undefined,
                skipCount,
                maxResultCount
            )
            .subscribe(result => {

                this.lancamentos = result.items;
                this.totalCount = result.totalCount;

                this.calcularTotais();

                abp.ui.clearBusy();
                this.cd.detectChanges();
            });
    }

    calcularTotais() {

        const ativos = this.lancamentos.filter(x => x.status === 1);

        this.totalReceitas = ativos
            .filter(x => x.natureza === 0)
            .reduce((sum, x) => sum + x.valorPago, 0);

        this.totalDespesas = ativos
            .filter(x => x.natureza === 1)
            .reduce((sum, x) => sum + x.valorPago, 0);

        this.saldo = this.totalReceitas - this.totalDespesas;
    }

    clearFilters() {
        this.dataInicio = undefined;
        this.dataFim = undefined;
        this.natureza = undefined;
        this.fornecedorId = undefined;
        this.list();
    }

    createLancamento() {
        this.bsModalRef.hide();
        this.onSave.emit();
    }

    verDetalhes(record: any) {

        if (record.tipo === 0) { // CompraMaterial

            const modalRef = this._modalService.show(
                ConfirmarPagamentoDialogComponent,
                {
                    class: 'modal-lg',
                    backdrop: 'static',
                    keyboard: false,
                    initialState: {
                        modo: 'visualizar',
                        lancamentoId: record.id
                    }
                }
            );

            modalRef.content.onConfirmado.subscribe(() => {

                this.list();

                this.cd.detectChanges();
            });

        }
    }



}
