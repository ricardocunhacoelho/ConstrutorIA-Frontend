import { ChangeDetectorRef, Component, Injector, ViewChild } from '@angular/core';
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
    SolicitacaoMaterialDto,
    SolicitacaoMaterialDtoPagedResultDto,
    SolicitacaoMaterialServiceProxy,
    SolicitacaoMaterialStatus,
} from '../../shared/service-proxies/service-proxies';
import { CreateSolicitacaoMaterialDialogComponent } from './create-solicitacao-material/create-solicitacao-material-dialog.component';
import { EditSolicitacaoMaterialDialogComponent } from './edit-solicitacao-material/edit-solicitacao-material-dialog.component';

@Component({
    templateUrl: './solicitacoes-materiais.component.html',
    animations: [appModuleAnimation()],
    standalone: true,
    imports: [CommonModule, FormsModule, TableModule, PrimeTemplate, NgIf, PaginatorModule, LocalizePipe],
})
export class SolicitacoesMateriaisComponent extends PagedListingComponentBase<SolicitacaoMaterialDto> {

    @ViewChild('dataTable', { static: true }) dataTable: Table;
    @ViewChild('paginator', { static: true }) paginator: Paginator;

    solicitacoesMateriais: SolicitacaoMaterialDto[] = [];
    keyword = '';
    status: SolicitacaoMaterialStatus | undefined;
    advancedFiltersVisible = false;

    constructor(
        injector: Injector,
        private _solicitacoesMateriaisService: SolicitacaoMaterialServiceProxy,
        private _modalService: BsModalService,
        private _activatedRoute: ActivatedRoute,
        cd: ChangeDetectorRef
    ) {
        super(injector, cd);
        this.keyword = this._activatedRoute.snapshot.queryParams['filterText'] || '';
    }

    createSolicitacaoMaterial(): void {
        this.showCreateOrEditDialog();
    }

    editSolicitacaoMaterial(solicitacao: SolicitacaoMaterialDto): void {
        this.showCreateOrEditDialog(solicitacao.id);
    }

    deleteSolicitacaoMaterial(solicitacao: SolicitacaoMaterialDto): void {
        abp.message.confirm(
            this.l('SolicitacaoMaterialDeleteWarningMessage', solicitacao.id),
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
                this.primengTableHelper.getSkipCount(this.paginator, event),
                this.primengTableHelper.getMaxResultCount(this.paginator, event)
                // adicionar aqui o status como parâmetro extra.
            )
            .pipe(finalize(() => this.primengTableHelper.hideLoadingIndicator()))
            .subscribe((result: SolicitacaoMaterialDtoPagedResultDto) => {
                this.primengTableHelper.records = result.items;
                this.primengTableHelper.totalRecordsCount = result.totalCount;
                this.cd.detectChanges();
            });
    }

    private showCreateOrEditDialog(id?: string): void {
        let ref: BsModalRef;
        if (!id) {
            ref = this._modalService.show(CreateSolicitacaoMaterialDialogComponent, { class: 'modal-lg' });
        } else {
            ref = this._modalService.show(EditSolicitacaoMaterialDialogComponent, {
                class: 'modal-lg',
                initialState: { id },
            });
        }
        ref.content.onSave.subscribe(() => this.refresh());
    }

    protected delete(entity: SolicitacaoMaterialDto): void {
        throw new Error('Method not implemented.');
    }
}
