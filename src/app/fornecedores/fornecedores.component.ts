import { ChangeDetectorRef, Component, Injector, ViewChild } from '@angular/core';
import { finalize } from 'rxjs/operators';
import { BsModalService, BsModalRef } from 'ngx-bootstrap/modal';
import { appModuleAnimation } from '@shared/animations/routerTransition';
import { PagedListingComponentBase } from 'shared/paged-listing-component-base';
import { FornecedorServiceProxy, FornecedorDto, FornecedorDtoPagedResultDto } from '@shared/service-proxies/service-proxies';
import { CreateFornecedorDialogComponent } from './create-fornecedor/create-fornecedor-dialog.component';
import { EditFornecedorDialogComponent } from './edit-fornecedor/edit-fornecedor-dialog.component';
import { Table, TableModule } from 'primeng/table';
import { LazyLoadEvent, PrimeTemplate } from 'primeng/api';
import { ActivatedRoute } from '@angular/router';
import { Paginator, PaginatorModule } from 'primeng/paginator';
import { FormsModule } from '@angular/forms';
import { CommonModule, NgIf } from '@angular/common';
import { LocalizePipe } from '@shared/pipes/localize.pipe';
import { CpfCnpjPipe } from '@shared/pipes/cpf-cnpj.pipe';
import { ViewFornecedorDialogComponent } from './view-fornecedor/view-fornecedor-dialog.component';

@Component({
    templateUrl: './fornecedores.component.html',
    animations: [appModuleAnimation()],
    styleUrls: ['./fornecedores.component.scss'],
    standalone: true,
    imports: [CommonModule, FormsModule, TableModule, PrimeTemplate, NgIf, PaginatorModule, LocalizePipe, CpfCnpjPipe],
})
export class FornecedoresComponent extends PagedListingComponentBase<FornecedorDto> {
    @ViewChild('dataTable', { static: true }) dataTable: Table;
    @ViewChild('paginator', { static: true }) paginator: Paginator;

    fornecedores: FornecedorDto[] = [];
    keyword = '';
    advancedFiltersVisible = false;

    constructor(
        injector: Injector,
        private _fornecedorService: FornecedorServiceProxy,
        private _modalService: BsModalService,
        private _activatedRoute: ActivatedRoute,
        cd: ChangeDetectorRef
    ) {
        super(injector, cd);
        this.keyword = this._activatedRoute.snapshot.queryParams['filterText'] || '';
    }

    createFornecedor(): void {
        this.showCreateOrEditFornecedorDialog();
    }

    editFornecedor(fornecedor: FornecedorDto): void {
        this.showCreateOrEditFornecedorDialog(fornecedor.id);
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

        this._fornecedorService
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
            .subscribe((result: FornecedorDtoPagedResultDto) => {
                this.primengTableHelper.records = result.items;
                this.primengTableHelper.totalRecordsCount = result.totalCount;
                this.primengTableHelper.hideLoadingIndicator();
                this.cd.detectChanges();
            });
    }

    delete(fornecedor: FornecedorDto): void {
        abp.message.confirm(this.l('FornecedorDeleteWarningMessage', fornecedor.nomeFantasia), undefined, (result: boolean) => {
            if (result) {
                this._fornecedorService.delete(fornecedor.id).subscribe(() => {
                    abp.notify.success(this.l('SuccessfullyDeleted'));
                    this.refresh();
                });
            }
        });
    }

    private showCreateOrEditFornecedorDialog(id?: string): void {
        let createOrEditFornecedorDialog: BsModalRef;

        const modalConfig = {
            class: 'modal-lg',
            backdrop: 'static' as const,
            keyboard: false
        };

        if (!id) {
            createOrEditFornecedorDialog = this._modalService.show(
                CreateFornecedorDialogComponent,
                modalConfig
            );
        } else {
            createOrEditFornecedorDialog = this._modalService.show(
                EditFornecedorDialogComponent,
                {
                    ...modalConfig,
                    initialState: {
                        id: id,
                    },
                }
            );
        }

        createOrEditFornecedorDialog.content.onSave.subscribe(() => {
            this.refresh();
        });
    }

    viewFornecedor(fornecedor: FornecedorDto): void {
        const modalRef = this._modalService.show(
            ViewFornecedorDialogComponent,
            {
                class: 'modal-lg',
                backdrop: 'static',
                keyboard: false,
                initialState: {
                    id: fornecedor.id
                }
            }
        );

        // Opcional: se quiser atualizar a lista quando algo for alterado no modal
        modalRef.content.onSave.subscribe(() => {
            this.refresh();
        });
    }
}
