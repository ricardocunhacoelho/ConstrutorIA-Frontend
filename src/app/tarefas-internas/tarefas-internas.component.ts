import { ChangeDetectorRef, Component, Injector, OnInit, ViewChild } from '@angular/core';
import { finalize } from 'rxjs/operators';
import { BsModalService, BsModalRef } from 'ngx-bootstrap/modal';
import { appModuleAnimation } from '@shared/animations/routerTransition';
import { PagedListingComponentBase } from 'shared/paged-listing-component-base';
import { LazyLoadEvent } from 'primeng/api';
import { ActivatedRoute } from '@angular/router';
import { Paginator } from 'primeng/paginator';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { LocalizePipe } from '@shared/pipes/localize.pipe';
import {
    ObraServiceProxy,
    TarefaInternaServiceProxy,
    TarefaInternaDto,
    TarefaInternaDtoPagedResultDto,
    PagedTarefaInternaResultRequestDto,
    TarefaStatus
} from '../../shared/service-proxies/service-proxies';

import { CreateTarefaInternaDialogComponent } from './create-tarefa-interna/create-tarefa-interna-dialog.component';
import { EditTarefaInternaDialogComponent } from './edit-tarefa-interna/edit-tarefa-interna-dialog.component';
import * as FileSaver from 'file-saver';
import { Table, TableModule } from 'primeng/table';

@Component({
    templateUrl: './tarefas-internas.component.html',
    animations: [appModuleAnimation()],
    standalone: true,
    imports: [
        CommonModule,
        FormsModule,
        TableModule,
        Paginator,
        LocalizePipe
    ]
})
export class TarefasInternasComponent extends PagedListingComponentBase<TarefaInternaDto> implements OnInit {

    @ViewChild('dataTable', { static: true }) dataTable: Table;
    @ViewChild('paginator', { static: true }) paginator: Paginator;

    obraId: string | undefined;
    userId: number | undefined;

    obras: any[] = [];
    usuarios: any[] = [];

    keyword = '';
    status: TarefaStatus | null | undefined;

    constructor(
        injector: Injector,
        private _tarefasService: TarefaInternaServiceProxy,
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
        this.getUsuarios();
    }

    getObras(): void {
        this._obraService.getObras()
            .subscribe(result => (this.obras = result));
    }

    getUsuarios(): void {
        this._tarefasService.getUsuarios()
            .subscribe(result => (this.usuarios = result));
    }

    createTarefa(): void {
        this.showCreateOrEditDialog();
    }

    editTarefa(item: TarefaInternaDto): void {
        this.showCreateOrEditDialog(item.id);
    }

    deleteTarefa(item: TarefaInternaDto): void {
        abp.message.confirm(
            this.l('TarefaDeleteWarningMessage', item.obra?.nome, item.responsavelNome),
            undefined,
            (result: boolean) => {
                if (result) {
                    this._tarefasService.delete(item.id).subscribe(() => {
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
        this.userId = undefined;
        this.refresh();
    }

    list(event?: LazyLoadEvent): void {
        if (this.primengTableHelper.shouldResetPaging(event)) {
            this.paginator.changePage(0);
            return;
        }

        this.primengTableHelper.showLoadingIndicator();

        this._tarefasService
            .getAll(
                this.keyword,
                this.obraId,
                this.userId,
                this.status,
                this.primengTableHelper.getSkipCount(this.paginator, event),
                this.primengTableHelper.getMaxResultCount(this.paginator, event)
            )
            .pipe(finalize(() => this.primengTableHelper.hideLoadingIndicator()))
            .subscribe((result: TarefaInternaDtoPagedResultDto) => {
                this.primengTableHelper.records = result.items;
                this.primengTableHelper.totalRecordsCount = result.totalCount;
                this.cd.detectChanges();
            });
    }

    private showCreateOrEditDialog(id?: string): void {
        let ref: BsModalRef;
        if (!id) {
            ref = this._modalService.show(CreateTarefaInternaDialogComponent, { class: 'modal-lg' });
        } else {
            ref = this._modalService.show(EditTarefaInternaDialogComponent, {
                class: 'modal-lg',
                initialState: { id },
            });
        }

        ref.content.onSave.subscribe(() => this.refresh());
    }


    exportarParaPdf() {
        abp.ui.setBusy();

        const request = new PagedTarefaInternaResultRequestDto();
        request.keyword = this.keyword;
        request.obraId = this.obraId;
        request.userId = this.userId;
        request.status = this.status;
        request.skipCount = 0;
        request.maxResultCount = 100000;

        this._tarefasService.exportarParaPdf(request)
            .pipe(finalize(() => abp.ui.clearBusy()))
            .subscribe(result => {
                FileSaver.saveAs(this.base64ToBlob(result, "application/pdf"), "tarefas-internas.pdf");
            });
    }

    exportarParaExcel() {
        abp.ui.setBusy();

        const request = new PagedTarefaInternaResultRequestDto();
        request.keyword = this.keyword;
        request.obraId = this.obraId;
        request.userId = this.userId;
        request.status = this.status;
        request.skipCount = 0;
        request.maxResultCount = 100000;

        this._tarefasService.exportarParaExcel(request)
            .pipe(finalize(() => abp.ui.clearBusy()))
            .subscribe(result => {
                FileSaver.saveAs(this.base64ToBlob(result, "application/vnd.ms-excel"), "tarefas-internas.xlsx");
            });
    }

    private base64ToBlob(b64Data: string, contentType: string) {
        const byteCharacters = atob(b64Data);
        const byteNumbers = Array.from(byteCharacters).map(ch => ch.charCodeAt(0));
        return new Blob([new Uint8Array(byteNumbers)], { type: contentType });
    }

    protected delete(): void { }
}