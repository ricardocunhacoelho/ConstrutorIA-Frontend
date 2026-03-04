import { Component, Injector, OnInit, EventEmitter, Output, ChangeDetectorRef } from '@angular/core';
import { BsModalRef } from 'ngx-bootstrap/modal';
import { AppComponentBase } from '@shared/app-component-base';
import { CreateFornecedorDto, CreateEnderecoDto, CreateTelefoneDto, FornecedorServiceProxy } from '@shared/service-proxies/service-proxies';
import { FormsModule } from '@angular/forms';
import { AbpModalHeaderComponent } from '../../../shared/components/modal/abp-modal-header.component';
import { TabsetComponent, TabDirective } from 'ngx-bootstrap/tabs';
import { AbpValidationSummaryComponent } from '../../../shared/components/validation/abp-validation.summary.component';
import { AbpModalFooterComponent } from '../../../shared/components/modal/abp-modal-footer.component';
import { LocalizePipe } from '@shared/pipes/localize.pipe';
import { CommonModule } from '@angular/common';

@Component({
    templateUrl: './create-fornecedor-dialog.component.html',
    standalone: true,
    imports: [
        CommonModule,
        FormsModule,
        AbpModalHeaderComponent,
        TabsetComponent,
        TabDirective,
        AbpValidationSummaryComponent,
        AbpModalFooterComponent,
        LocalizePipe
    ]
})
export class CreateFornecedorDialogComponent extends AppComponentBase implements OnInit {
    @Output() onSave = new EventEmitter<any>();

    saving = false;
    fornecedor = new CreateFornecedorDto();

    constructor(
        injector: Injector,
        public _fornecedorService: FornecedorServiceProxy,
        public bsModalRef: BsModalRef,
        private cd: ChangeDetectorRef
    ) {
        super(injector);
    }

    ngOnInit(): void {
        this.fornecedor = new CreateFornecedorDto();
        this.fornecedor.endereco = new CreateEnderecoDto();
        this.fornecedor.telefone = new CreateTelefoneDto();
        this.fornecedor.telefone.idd = '55';
        this.fornecedor.telefone.ddd = '';
        this.fornecedor.telefone.numero = '';
        this.fornecedor.telefone.internacional = false;
    }

    save(): void {
        this.saving = true;

        this._fornecedorService.create(this.fornecedor).subscribe(
            () => {
                this.notify.info(this.l('SavedSuccessfully'));
                this.bsModalRef.hide();
                this.onSave.emit();
            },
            () => {
                this.saving = false;
            }
        );
    }
}
