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
    PagedTarefaResultRequestDto,
    TarefaDto,
    TarefaDtoPagedResultDto,
    TarefaServiceProxy,
    TarefaStatus,
} from '../../shared/service-proxies/service-proxies';
import { CreateTarefaDialogComponent } from './create-tarefa/create-tarefa-dialog.component';
import { EditTarefaDialogComponent } from './edit-tarefa/edit-tarefa-dialog.component';
import { BsDropdownDirective, BsDropdownToggleDirective, BsDropdownMenuDirective } from 'ngx-bootstrap/dropdown';
import * as FileSaver from 'file-saver';

@Component({
    templateUrl: './tarefas.component.html',
    animations: [appModuleAnimation()],
    standalone: true,
    imports: [CommonModule, BsDropdownDirective, BsDropdownToggleDirective, BsDropdownMenuDirective, FormsModule, TableModule, PrimeTemplate, NgIf, PaginatorModule, LocalizePipe],
})
export class TarefasComponent extends PagedListingComponentBase<TarefaDto> implements OnInit {

    @ViewChild('dataTable', { static: true }) dataTable: Table;
    @ViewChild('paginator', { static: true }) paginator: Paginator;

    obraId: string | undefined;
    encarregadoId: string | undefined;

    obras: any[] = [];
    encarregados: any[] = [];

    tarefas: TarefaDto[] = [];
    keyword = '';
    status: TarefaStatus | null | undefined;
    advancedFiltersVisible = false;

    constructor(
        injector: Injector,
        private _tarefasService: TarefaServiceProxy,
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

    createTarefa(): void {
        this.showCreateOrEditDialog();
    }

    editTarefa(tarefa: TarefaDto): void {
        this.showCreateOrEditDialog(tarefa.id);
    }

    deleteTarefa(tarefa: TarefaDto): void {
        abp.message.confirm(
            this.l('TarefaDeleteWarningMessage', tarefa.obra?.nome, tarefa.encarregado?.nome),
            undefined,
            (result: boolean) => {
                if (result) {
                    this._tarefasService.delete(tarefa.id).subscribe(() => {
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

        this._tarefasService
            .getAll(
                this.keyword,
                this.obraId,
                this.encarregadoId,
                this.status,
                this.primengTableHelper.getSkipCount(this.paginator, event),
                this.primengTableHelper.getMaxResultCount(this.paginator, event)
            )
            .pipe(finalize(() => this.primengTableHelper.hideLoadingIndicator()))
            .subscribe((result: TarefaDtoPagedResultDto) => {
                this.primengTableHelper.records = result.items;
                this.primengTableHelper.totalRecordsCount = result.totalCount;
                this.cd.detectChanges();
            });
    }

    private showCreateOrEditDialog(id?: string): void {
        let ref: BsModalRef;
        if (!id) {
            ref = this._modalService.show(CreateTarefaDialogComponent, { class: 'modal-lg' });
        } else {
            ref = this._modalService.show(EditTarefaDialogComponent, {
                class: 'modal-lg',
                initialState: { id },
            });
        }
        ref.content.onSave.subscribe(() => this.refresh());
    }

    protected delete(entity: TarefaDto): void {
        throw new Error('Method not implemented.');
    }

    public exportarParaPdf() {
        abp.ui.setBusy();

        const pagedResultRequest = new PagedTarefaResultRequestDto();
        pagedResultRequest.keyword = this.keyword;
        pagedResultRequest.obraId = this.obraId;
        pagedResultRequest.encarregadoId = this.encarregadoId;
        pagedResultRequest.status = this.status;
        pagedResultRequest.skipCount = 0;
        pagedResultRequest.maxResultCount = 100000;

        this._tarefasService
            .exportarParaPdf(pagedResultRequest)
            .pipe(finalize(() => abp.ui.clearBusy()))
            .subscribe((result) => {
                const blob = this.base64ToBlob(result, "application/pdf");

                FileSaver.saveAs(blob, "relatorio_tarefas.pdf");
            });
    }

    public exportarParaExcel() {
        abp.ui.setBusy();

        var pagedResultRequest = new PagedTarefaResultRequestDto();
        pagedResultRequest.keyword = this.keyword;
        pagedResultRequest.obraId = this.obraId;
        pagedResultRequest.encarregadoId = this.encarregadoId;
        pagedResultRequest.status = this.status;
        pagedResultRequest.skipCount = 0;
        pagedResultRequest.maxResultCount = 100000;

        this._tarefasService
            .exportarParaExcel(pagedResultRequest)
            .pipe(finalize(() => abp.ui.clearBusy()))
            .subscribe((result) => {
                FileSaver.saveAs(
                    this.base64ToBlob(result, "application/vnd.ms-excel"),
                    "relatorio_tarefas.xlsx"
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
}
