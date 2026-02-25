import { ChangeDetectorRef, Component, Injector, ViewChild } from '@angular/core';
import { finalize } from 'rxjs/operators';
import { BsModalService, BsModalRef } from 'ngx-bootstrap/modal';
import { appModuleAnimation } from '@shared/animations/routerTransition';
import { PagedListingComponentBase } from 'shared/paged-listing-component-base';
import { ObraServiceProxy, ObraDto, ObraDtoPagedResultDto } from '@shared/service-proxies/service-proxies';
import { CreateObraDialogComponent } from './create-obra/create-obra-dialog.component';
import { EditObraDialogComponent } from './edit-obra/edit-obra-dialog.component';
import { Table, TableModule } from 'primeng/table';
import { LazyLoadEvent, PrimeTemplate } from 'primeng/api';
import { ActivatedRoute } from '@angular/router';
import { Paginator, PaginatorModule } from 'primeng/paginator';
import { FormsModule } from '@angular/forms';
import { CommonModule, NgIf } from '@angular/common';
import { LocalizePipe } from '@shared/pipes/localize.pipe';
import { FinanceiroObraDialogComponent } from './financeiro-obra/financeiro-obra-dialog.component';

@Component({
    templateUrl: './obras.component.html',
    animations: [appModuleAnimation()],
    standalone: true,
    imports: [CommonModule, FormsModule, TableModule, PrimeTemplate, NgIf, PaginatorModule, LocalizePipe],
})
export class ObrasComponent extends PagedListingComponentBase<ObraDto> {
    @ViewChild('dataTable', { static: true }) dataTable: Table;
    @ViewChild('paginator', { static: true }) paginator: Paginator;

    obras: ObraDto[] = [];
    keyword = '';
    isActive: boolean | null;
    advancedFiltersVisible = false;

    constructor(
        injector: Injector,
        private _obraService: ObraServiceProxy,
        private _modalService: BsModalService,
        private _activatedRoute: ActivatedRoute,
        cd: ChangeDetectorRef
    ) {
        super(injector, cd);
        this.keyword = this._activatedRoute.snapshot.queryParams['filterText'] || '';
    }

    createObra(): void {
        this.showCreateOrEditObraDialog();
    }

    editObra(obra: ObraDto): void {
        this.showCreateOrEditObraDialog(obra.id);
    }

    financeiroObra(obra: ObraDto): void {
        this.showFinanceiroObraDialog(obra.id);
    }

    clearFilters(): void {
        this.keyword = '';
        this.isActive = undefined;
    }

    list(event?: LazyLoadEvent): void {
        if (this.primengTableHelper.shouldResetPaging(event)) {
            this.paginator.changePage(0);

            if (this.primengTableHelper.records && this.primengTableHelper.records.length > 0) {
                return;
            }
        }

        this.primengTableHelper.showLoadingIndicator();

        this._obraService
            .getAll(
                this.keyword,
                this.primengTableHelper.getSkipCount(this.paginator, event),
                this.primengTableHelper.getMaxResultCount(this.paginator, event)
            )
            .pipe(
                finalize(() => {
                    this.primengTableHelper.hideLoadingIndicator();
                })
            )
            .subscribe((result: ObraDtoPagedResultDto) => {
                this.primengTableHelper.records = result.items;
                this.primengTableHelper.totalRecordsCount = result.totalCount;
                this.primengTableHelper.hideLoadingIndicator();
                this.cd.detectChanges();
            });
    }

    delete(obra: ObraDto): void {
        abp.message.confirm(this.l('ObraDeleteWarningMessage', obra.nome), undefined, (result: boolean) => {
            if (result) {
                this._obraService.delete(obra.id).subscribe(() => {
                    abp.notify.success(this.l('SuccessfullyDeleted'));
                    this.refresh();
                });
            }
        });
    }

    private showCreateOrEditObraDialog(id?: string): void {
        let createOrEditObraDialog: BsModalRef;
        if (!id) {
            createOrEditObraDialog = this._modalService.show(CreateObraDialogComponent, {
                class: 'modal-lg',
            });
        } else {
            createOrEditObraDialog = this._modalService.show(EditObraDialogComponent, {
                class: 'modal-lg',
                initialState: {
                    id: id,
                },
            });
        }

        createOrEditObraDialog.content.onSave.subscribe(() => {
            this.refresh();
        });
    }

    private showFinanceiroObraDialog(id?: string): void {
        let financeiroObraDialog: BsModalRef;
        if (id) {
            financeiroObraDialog = this._modalService.show(FinanceiroObraDialogComponent, {
                class: 'modal-xlg',
                initialState: {
                    obraId: id,
                },
            });
        } else {
            abp.notify.error(this.l('Erro ao buscar obra'));
        }

        financeiroObraDialog.content.onSave.subscribe(() => {
            this.refresh();
        });
    }
}
