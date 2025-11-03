import { Component, Injector, OnInit, EventEmitter, Output, ChangeDetectorRef } from '@angular/core';
import { BsModalRef } from 'ngx-bootstrap/modal';
import { AppComponentBase } from '@shared/app-component-base';
import { FornecedorServiceProxy, FornecedorDto, UpdateFornecedorDto, TelefoneDto, EnderecoDto } from '@shared/service-proxies/service-proxies';
import { FormsModule } from '@angular/forms';
import { AbpModalHeaderComponent } from '@shared/components/modal/abp-modal-header.component';
import { AbpValidationSummaryComponent } from '@shared/components/validation/abp-validation.summary.component';
import { AbpModalFooterComponent } from '@shared/components/modal/abp-modal-footer.component';
import { LocalizePipe } from '@shared/pipes/localize.pipe';
import { CommonModule, NgIf } from '@angular/common';
import { TabsetComponent, TabDirective } from 'ngx-bootstrap/tabs';


@Component({
    templateUrl: './edit-fornecedor-dialog.component.html',
    standalone: true,
    imports: [
        CommonModule,
        FormsModule,
        AbpModalHeaderComponent,
        TabsetComponent,
        TabDirective,
        AbpValidationSummaryComponent,
        AbpModalFooterComponent,
        LocalizePipe,
    ],
})
export class EditFornecedorDialogComponent extends AppComponentBase implements OnInit {
    @Output() onSave = new EventEmitter<any>();

    saving = false;
    fornecedor = new UpdateFornecedorDto();
    id: string;

    constructor(
        injector: Injector,
        public _fornecedorService: FornecedorServiceProxy,
        public bsModalRef: BsModalRef,
        private cd: ChangeDetectorRef
    ) {
        super(injector);
    }

    ngOnInit(): void {
        this.fornecedor = new UpdateFornecedorDto();
        this.fornecedor.endereco = new EnderecoDto();
        this.fornecedor.telefone = new TelefoneDto();

        this._fornecedorService.get(this.id).subscribe((result) => {
            this.fornecedor = UpdateFornecedorDto.fromJS(result);

            if (!this.fornecedor.endereco) {
                this.fornecedor.endereco = new EnderecoDto();
            }

            if (!this.fornecedor.telefone) {
                this.fornecedor.telefone = new TelefoneDto();
                this.fornecedor.telefone.idd = '55';
                this.fornecedor.telefone.ddd = '';
                this.fornecedor.telefone.numero = '';
                this.fornecedor.telefone.internacional = false;
            }

            this.cd.detectChanges();
        });
    }

    save(): void {
        this.saving = true;

        const tel = this.fornecedor.telefone;
        if (!tel || !/^\d{2,3}$/.test(tel.ddd)) {
            this.notify.error('DDD inválido');
            this.saving = false;
            return;
        }
        if (!tel.numero || !/^\d{8,10}$/.test(tel.numero)) {
            this.notify.error('Número de telefone inválido');
            this.saving = false;
            return;
        }

        this._fornecedorService.update(this.fornecedor).subscribe(
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
