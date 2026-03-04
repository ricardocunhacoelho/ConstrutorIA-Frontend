import { Component, Injector, OnInit, EventEmitter, Output, ChangeDetectorRef, ViewChild } from '@angular/core';
import { BsModalRef, BsModalService } from 'ngx-bootstrap/modal';
import { forEach as _forEach, map as _map } from 'lodash-es';
import { AppComponentBase } from '@shared/app-component-base';
import { CreateEncarregadoDto, CreateEnderecoDto, CreateObraDto, CreateProprietarioDto, CreateTelefoneDto, FornecedorServiceProxy, ObraLancamentoTipoNullable, ObraServiceProxy, PagedObraLancamentoFinanceiroResultRequestDto } from '@shared/service-proxies/service-proxies';
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
import { Paginator, PaginatorModule } from 'primeng/paginator';
import { ConfirmarPagamentoDialogComponent } from '@shared/components/confirmar-pagamento-dialog/confirmar-pagamento-dialog.component.';
import { BsDropdownDirective, BsDropdownToggleDirective, BsDropdownMenuDirective } from 'ngx-bootstrap/dropdown';
import { finalize } from 'rxjs/operators';
import * as FileSaver from 'file-saver';
import { CreateLancamentoDialogComponent } from './create-lancamento-dialog/create-lancamento-dialog.component';
import { ViewLancamentoDialogComponent } from './view-lancamento-dialog/view-lancamento-dialog.component';

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
        BsDropdownDirective, BsDropdownToggleDirective, BsDropdownMenuDirective
    ],
})
export class FinanceiroObraDialogComponent extends AppComponentBase {
    @Output() onSave = new EventEmitter<any>();
    @ViewChild('paginator') paginator: Paginator;

    saving = false;
    obraNome: string;
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

    currentRows: number = 10; // <-- Adicione esta propriedade

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
        const maxResultCount = event?.rows ?? this.currentRows;

        if (event?.rows) {
            this.currentRows = event.rows;
        }

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
        const ativos = this.lancamentos.filter(x => x.status === 0);

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
        this.currentRows = 10;

        this.list();
    }

    createLancamento() {
        const modalRef = this._modalService.show(
            CreateLancamentoDialogComponent,
            {
                class: 'modal-lg modal-dialog-centered',
                backdrop: 'static',
                keyboard: false,
                initialState: {
                    obraId: this.obraId,
                    obraNome: this.obraNome
                }
            }
        );

        modalRef.content.onSave.subscribe(() => {
            this.list();
        });
    }

    verDetalhes(record: any) {

        const modalRef = this._modalService.show(
                ViewLancamentoDialogComponent,
                {
                    class: 'modal-lg modal-dialog-centered',
                    backdrop: 'static',
                    keyboard: false,
                    initialState: {
                        lancamentoId: record.id
                    }
                }
            );

            modalRef.content.onEstornado.subscribe(() => {
                this.list();
            });
    }

    exportar(formato: 'excel' | 'pdf' | 'csv'): void {
        switch (formato) {
            case 'excel':
                this.exportarParaExcel();
                break;
            case 'pdf':
                this.exportarParaPdf();
                break;
        }
    }

    public exportarParaPdf(): void {
        abp.ui.setBusy();

        const input = new PagedObraLancamentoFinanceiroResultRequestDto();
        input.obraId = this.obraId;
        input.fornecedorId = this.fornecedorId;
        input.dataInicio = this.dataInicio ? moment(this.dataInicio) : undefined;
        input.dataFim = this.dataFim ? moment(this.dataFim) : undefined;
        input.natureza = this.natureza;
        input.tipo = this.tipo;
        input.skipCount = 0;
        input.maxResultCount = this.currentRows;

        this._obraLancamentoFinanceiroService
            .exportarParaPdf(input)
            .pipe(finalize(() => abp.ui.clearBusy()))
            .subscribe({
                next: (result: string) => {
                    const blob = this.base64ToBlob(result, "application/pdf");
                    const nomeArquivo = `financeiro_${this.obraId}_${moment().format('YYYYMMDD_HHmmss')}.pdf`;
                    FileSaver.saveAs(blob, nomeArquivo);
                    this.notify.success('PDF exportado com sucesso!');
                },
                error: (error) => {
                    this.notify.error('Erro ao exportar PDF');
                }
            });
    }

    public exportarParaExcel(): void {
        abp.ui.setBusy();

        const input = new PagedObraLancamentoFinanceiroResultRequestDto();
        input.obraId = this.obraId;
        input.fornecedorId = this.fornecedorId;
        input.dataInicio = this.dataInicio ? moment(this.dataInicio) : undefined;
        input.dataFim = this.dataFim ? moment(this.dataFim) : undefined;
        input.natureza = this.natureza;
        input.tipo = this.tipo;
        input.skipCount = 0;
        input.maxResultCount = this.currentRows;

        this._obraLancamentoFinanceiroService
            .exportarParaExcel(input)
            .pipe(finalize(() => abp.ui.clearBusy()))
            .subscribe({
                next: (result: string) => {
                    const blob = this.base64ToBlob(result, "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
                    const nomeArquivo = `financeiro_${this.obraId}_${moment().format('YYYYMMDD_HHmmss')}.xlsx`;
                    FileSaver.saveAs(blob, nomeArquivo);
                    this.notify.success('Excel exportado com sucesso!');
                },
                error: (error) => {
                    this.notify.error('Erro ao exportar Excel');
                }
            });
    }

    private base64ToBlob(b64Data: string, contentType: string, sliceSize = 512): Blob {
        const byteCharacters = atob(b64Data);
        const byteArrays = [];

        for (let offset = 0; offset < byteCharacters.length; offset += sliceSize) {
            const slice = byteCharacters.slice(offset, offset + sliceSize);
            const byteNumbers = new Array(slice.length);

            for (let i = 0; i < slice.length; i++) {
                byteNumbers[i] = slice.charCodeAt(i);
            }

            const byteArray = new Uint8Array(byteNumbers);
            byteArrays.push(byteArray);
        }

        return new Blob(byteArrays, { type: contentType });
    }

    close(): void {
        this.bsModalRef.hide();
    }
}
