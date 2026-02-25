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
    ProblemaImpedimentoDto,
    ProblemaImpedimentoServiceProxy,
    ProblemaImpedimentoDtoPagedResultDto,
    ProblemaImpedimentoStatus,
    ObraServiceProxy
} from '../../shared/service-proxies/service-proxies';
import { CreateProblemaImpedimentoDialogComponent } from './create-problema-impedimento/create-problema-impedimento-dialog.component';
import { EditProblemaImpedimentoDialogComponent } from './edit-problema-impedimento/edit-problema-impedimento-dialog.component';

@Component({
    templateUrl: './problemas-impedimentos.component.html',
    animations: [appModuleAnimation()],
    standalone: true,
    imports: [CommonModule, FormsModule, TableModule, PrimeTemplate, NgIf, PaginatorModule, LocalizePipe],
})
export class ProblemasImpedimentosComponent extends PagedListingComponentBase<ProblemaImpedimentoDto> {

    @ViewChild('dataTable', { static: true }) dataTable: Table;
    @ViewChild('paginator', { static: true }) paginator: Paginator;

    problemasImpedimentos: ProblemaImpedimentoDto[] = [];
    keyword = '';
    status: ProblemaImpedimentoStatus | null | undefined;
    advancedFiltersVisible = false;

    obraId: string | undefined;
    encarregadoId: string | undefined;

    obras: any[] = [];
    encarregados: any[] = [];

    constructor(
        injector: Injector,
        private _problemasService: ProblemaImpedimentoServiceProxy,
        private _modalService: BsModalService,
        private _activatedRoute: ActivatedRoute,
        private _obraService: ObraServiceProxy,
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

    createProblema(): void {
        this.showCreateOrEditDialog();
    }

    editProblema(problema: ProblemaImpedimentoDto): void {
        this.showCreateOrEditDialog(problema.id);
    }

    deleteProblema(problema: ProblemaImpedimentoDto): void {
        abp.message.confirm(
            this.l('ProblemaImpedimentoDeleteWarningMessage', problema.obra?.nome, problema.encarregado?.nome),
            undefined,
            (result: boolean) => {
                if (result) {
                    this._problemasService.delete(problema.id).subscribe(() => {
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

        this._problemasService
            .getAll(
                this.keyword,
                this.obraId,
                this.encarregadoId,
                this.status,
                this.primengTableHelper.getSkipCount(this.paginator, event),
                this.primengTableHelper.getMaxResultCount(this.paginator, event))
            .pipe(finalize(() => this.primengTableHelper.hideLoadingIndicator()))
            .subscribe((result: ProblemaImpedimentoDtoPagedResultDto) => {
                this.primengTableHelper.records = result.items;
                this.primengTableHelper.totalRecordsCount = result.totalCount;
                this.cd.detectChanges();
            });
    }

    private showCreateOrEditDialog(id?: string): void {
        let ref: BsModalRef;
        if (!id) {
            ref = this._modalService.show(CreateProblemaImpedimentoDialogComponent, { class: 'modal-lg' });
        } else {
            ref = this._modalService.show(EditProblemaImpedimentoDialogComponent, {
                class: 'modal-lg',
                initialState: { id },
            });
        }
        ref.content.onSave.subscribe(() => this.refresh());
    }

    protected delete(entity: ProblemaImpedimentoDto): void {
        throw new Error('Method not implemented.');
    }
}
