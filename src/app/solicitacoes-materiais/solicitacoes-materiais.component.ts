import { ChangeDetectorRef, Component, Injector, OnInit, ViewChild } from '@angular/core';
import { finalize } from 'rxjs/operators';
import { BsModalService, BsModalRef } from 'ngx-bootstrap/modal';
import { appModuleAnimation } from '@shared/animations/routerTransition';
import { PagedListingComponentBase } from 'shared/paged-listing-component-base';
import { Table, TableModule } from 'primeng/table';
import { LazyLoadEvent, PrimeTemplate } from 'primeng/api';
import { ActivatedRoute } from '@angular/router';
import { Paginator, PaginatorModule } from 'primeng/paginator';
import { FormsModule } from '@angular/forms';
import { CommonModule, NgIf } from '@angular/common';
import { LocalizePipe } from '@shared/pipes/localize.pipe';
import {
    ObraServiceProxy,
    PagedSolicitacaoMaterialResultRequestDto,
    SolicitacaoMaterialDto,
    SolicitacaoMaterialDtoPagedResultDto,
    SolicitacaoMaterialServiceProxy,
    SolicitacaoMaterialStatus,
} from '../../shared/service-proxies/service-proxies';
import { CreateSolicitacaoMaterialDialogComponent } from './create-solicitacao-material/create-solicitacao-material-dialog.component';
import { EditSolicitacaoMaterialDialogComponent } from './edit-solicitacao-material/edit-solicitacao-material-dialog.component';
import { BsDropdownDirective, BsDropdownToggleDirective, BsDropdownMenuDirective } from 'ngx-bootstrap/dropdown';
import * as FileSaver from 'file-saver';
import { CreateCotacaoDialogComponent } from '../cotacoes/create-cotacao/create-cotacao-dialog.component';
import { CotacoesListDialogComponent } from '@app/cotacoes/list-cotacoes/list-cotacoes-dialog.component';
import { SolicitacaoMaterialStatusNullable } from '@shared/service-proxies/service-proxies';

@Component({
    templateUrl: './solicitacoes-materiais.component.html',
    animations: [appModuleAnimation()],
    standalone: true,
    imports: [LocalizePipe, BsDropdownDirective, BsDropdownToggleDirective, BsDropdownMenuDirective, CommonModule, FormsModule, TableModule, PrimeTemplate, NgIf, PaginatorModule, LocalizePipe],
})
export class SolicitacoesMateriaisComponent extends PagedListingComponentBase<SolicitacaoMaterialDto> implements OnInit {

    @ViewChild('dataTable', { static: true }) dataTable: Table;
    @ViewChild('paginator', { static: true }) paginator: Paginator;

    obraId: string | undefined;
    encarregadoId: string | undefined;

    obras: any[] = [];
    encarregados: any[] = [];

    solicitacoesMateriais: SolicitacaoMaterialDto[] = [];
    keyword = '';
    status: SolicitacaoMaterialStatusNullable = undefined;
    advancedFiltersVisible = false;

    statusOptions = [
        { label: this.l('All'), value: undefined },

        { label: 'Aberta', value: SolicitacaoMaterialStatusNullable._0 },
        { label: 'Cotação em andamento', value: SolicitacaoMaterialStatusNullable._1 },
        { label: 'Cotação em andamento e orçamento disponível', value: SolicitacaoMaterialStatusNullable._2 },
        { label: 'Aguardando compra', value: SolicitacaoMaterialStatusNullable._3 },
        { label: 'Pedido feito, aguardando fornecedor', value: SolicitacaoMaterialStatusNullable._4 },
        { label: 'Compra parcial', value: SolicitacaoMaterialStatusNullable._5 },
        { label: 'Compra concluída', value: SolicitacaoMaterialStatusNullable._6 },
        { label: 'Compra cancelada', value: SolicitacaoMaterialStatusNullable._7 },
        { label: 'Intervenção necessária', value: SolicitacaoMaterialStatusNullable._8 },
    ];


    constructor(
        injector: Injector,
        private _solicitacoesMateriaisService: SolicitacaoMaterialServiceProxy,
        private _obraService: ObraServiceProxy,
        private _modalService: BsModalService,
        private _activatedRoute: ActivatedRoute,
        cd: ChangeDetectorRef
    ) {
        super(injector, cd);
        this.keyword = this._activatedRoute.snapshot.queryParams['filterText'] || '';
    }

    ngOnInit(): void {
        this.getObras();
        this.getEncarregados();
    }

    getObras(): void {
        this._obraService.getObras()
            .subscribe(result => {
                this.obras = result;
            });
    }

    getEncarregados(): void {
        this._obraService.getEncarregados()
            .subscribe(result => {
                this.encarregados = result;
            });
    }

    createSolicitacaoMaterial(): void {
        this.showCreateOrEditDialog();
    }

    editSolicitacaoMaterial(solicitacao: SolicitacaoMaterialDto): void {
        this.showCreateOrEditDialog(solicitacao.id);
    }

    deleteSolicitacaoMaterial(solicitacao: SolicitacaoMaterialDto): void {
        abp.message.confirm(
            this.l('SolicitacaoMaterialDeleteWarningMessage', solicitacao.obra?.nome, solicitacao.encarregado?.nome),
            undefined,
            (result: boolean) => {
                if (result) {
                    this._solicitacoesMateriaisService.delete(solicitacao.id).subscribe(() => {
                        abp.notify.success(this.l('SuccessfullyDeleted'));
                        this.refresh();
                    });
                }
            }
        );
    }

    clearFilters(): void {
        this.keyword = '';
        this.status = undefined;
        this.obraId = undefined;
        this.encarregadoId = undefined;
        this.refresh();
    }

    list(event?: LazyLoadEvent): void {
        if (this.primengTableHelper.shouldResetPaging(event)) {
            this.paginator.changePage(0);
            if (this.primengTableHelper.records && this.primengTableHelper.records.length > 0) {
                return;
            }
        }

        this.primengTableHelper.showLoadingIndicator();

        this._solicitacoesMateriaisService
            .getAll(
                this.keyword,
                this.obraId,
                this.encarregadoId,
                this.status,
                this.primengTableHelper.getSkipCount(this.paginator, event),
                this.primengTableHelper.getMaxResultCount(this.paginator, event)
            )
            .pipe(finalize(() => this.primengTableHelper.hideLoadingIndicator()))
            .subscribe((result: SolicitacaoMaterialDtoPagedResultDto) => {
                this.primengTableHelper.records = result.items;
                this.primengTableHelper.totalRecordsCount = result.totalCount;
                this.cd.detectChanges();
            });
    }

    getStatusViewClass(record: SolicitacaoMaterialDto): string {
        switch (record.status) {
            case 0: // Aberta
                return 'bg-secondary';

            case 1: // CotacaoEmAndamento
            case 2: // CotacaoEmAndamentoEOrcamentoDisponivel
                return 'bg-warning text-dark';

            case 3: // AguardandoCompra
                return 'bg-info';

            case 4: // PedidoFeitoAguardandoFornecedor
                return 'bg-primary';

            case 5: // CompraParcial
                return 'bg-orange';

            case 6: // CompraConcluida
                return 'bg-success';

            case 7: // CompraCancelada
                return 'bg-danger';

            case 8: // IntervencaoNecessaria (corrigirei abaixo)
                return 'bg-danger text-white';

            default:
                return 'bg-light text-dark';
        }
    }

    private showCreateOrEditDialog(id?: string): void {
        let ref: BsModalRef;
        if (!id) {
            ref = this._modalService.show(CreateSolicitacaoMaterialDialogComponent, { class: 'modal-lg', backdrop: 'static' });
        } else {
            ref = this._modalService.show(EditSolicitacaoMaterialDialogComponent, {
                class: 'modal-lg',
                initialState: { id },
                backdrop: 'static'
            });
        }
        ref.content.onSave.subscribe(() => this.refresh());
    }

    protected delete(entity: SolicitacaoMaterialDto): void {
        throw new Error('Method not implemented.');
    }

    public exportarParaPdf() {
        abp.ui.setBusy();

        const pagedResultRequest = new PagedSolicitacaoMaterialResultRequestDto();
        pagedResultRequest.keyword = this.keyword;
        pagedResultRequest.obraId = this.obraId;
        pagedResultRequest.encarregadoId = this.encarregadoId;
        pagedResultRequest.status = this.status;
        pagedResultRequest.skipCount = 0;
        pagedResultRequest.maxResultCount = 100000;

        this._solicitacoesMateriaisService
            .exportarParaPdf(pagedResultRequest)
            .pipe(finalize(() => abp.ui.clearBusy()))
            .subscribe((result) => {
                const blob = this.base64ToBlob(result, "application/pdf");

                FileSaver.saveAs(blob, "relatorio_solicitacoes_materiais.pdf");
            });
    }

    public exportarParaExcel() {
        abp.ui.setBusy();

        var pagedResultRequest = new PagedSolicitacaoMaterialResultRequestDto();
        pagedResultRequest.keyword = this.keyword;
        pagedResultRequest.obraId = this.obraId;
        pagedResultRequest.encarregadoId = this.encarregadoId;
        pagedResultRequest.status = this.status;
        pagedResultRequest.skipCount = 0;
        pagedResultRequest.maxResultCount = 100000;

        this._solicitacoesMateriaisService
            .exportarParaExcel(pagedResultRequest)
            .pipe(finalize(() => abp.ui.clearBusy()))
            .subscribe((result) => {
                FileSaver.saveAs(
                    this.base64ToBlob(result, "application/vnd.ms-excel"),
                    "relatorio_solicitacoes_materiais.xlsx"
                );
            });
    }


    private base64ToBlob(b64Data: string, contentType: string, sliceSize = 512) {
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

        const blob = new Blob(byteArrays, { type: contentType });
        return blob;
    }

    abrirCotacoes(solicitacao: SolicitacaoMaterialDto): void {
        if (solicitacao.cotacoes && solicitacao.cotacoes.length > 0) {
            const ref = this._modalService.show(CotacoesListDialogComponent, {
                class: 'modal-lg',
                initialState: { solicitacaoId: solicitacao.id },
                backdrop: 'static'
            });

            ref.content.onSave.subscribe(() => this.refresh());
        } else {
            const ref = this._modalService.show(CreateCotacaoDialogComponent, {
                class: 'modal-xl',
                initialState: { solicitacaoId: solicitacao.id },
                backdrop: 'static'
            });

            ref.content.onSave.subscribe(() => this.refresh());
        }
    }
}