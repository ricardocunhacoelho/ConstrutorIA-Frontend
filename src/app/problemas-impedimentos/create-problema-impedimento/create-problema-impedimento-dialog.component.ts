import { Component, Injector, OnInit, EventEmitter, Output, ChangeDetectorRef } from '@angular/core';
import { BsModalRef } from 'ngx-bootstrap/modal';
import { FormsModule } from '@angular/forms';
import { CommonModule, NgIf } from '@angular/common';
import { TabsetComponent, TabDirective } from 'ngx-bootstrap/tabs';
import { AbpModalHeaderComponent } from '../../../shared/components/modal/abp-modal-header.component';
import { AbpModalFooterComponent } from '../../../shared/components/modal/abp-modal-footer.component';
import { AbpValidationSummaryComponent } from '../../../shared/components/validation/abp-validation.summary.component';
import { LocalizePipe } from '@shared/pipes/localize.pipe';
import { AppComponentBase } from '@shared/app-component-base';
import { ProblemaImpedimentoServiceProxy, CreateProblemaImpedimentoDto, EncarregadoComObraDto, NivelUrgenciaNullable } from '../../../shared/service-proxies/service-proxies';

@Component({
    templateUrl: './create-problema-impedimento-dialog.component.html',
    standalone: true,
    imports: [
        CommonModule,
        FormsModule,
        AbpModalHeaderComponent,
        AbpModalFooterComponent,
        AbpValidationSummaryComponent,
        TabsetComponent,
        TabDirective,
        LocalizePipe,
        NgIf
    ]
})
export class CreateProblemaImpedimentoDialogComponent extends AppComponentBase implements OnInit {
    @Output() onSave = new EventEmitter<any>();

    saving = false;
    problema = new CreateProblemaImpedimentoDto();
    selectedEncarregado?: EncarregadoComObraDto;
    encarregadosComObras: EncarregadoComObraDto[] = [];
    urgencias = Object.values(NivelUrgenciaNullable);

    constructor(
        injector: Injector,
        public _problemaService: ProblemaImpedimentoServiceProxy,
        public bsModalRef: BsModalRef,
        private cd: ChangeDetectorRef
    ) {
        super(injector);
    }

    ngOnInit(): void {
        this.loadEncarregadosComObras();
    }

    loadEncarregadosComObras() {
        this._problemaService.getEncarregadosComObras().subscribe(result => {
            this.encarregadosComObras = result;
        });
    }

    onEncarregadoChange() {
        if (this.selectedEncarregado) {
            this.problema.encarregadoId = this.selectedEncarregado.id;
            this.problema.obraId = this.selectedEncarregado.obraId;
        }
    }

    save(): void {
        this.saving = true;

        this._problemaService.create(this.problema).subscribe(() => {
            this.notify.info(this.l('ProblemaImpedimentoCriadoComSucesso'));
            this.bsModalRef.hide();
            this.onSave.emit();
        }, () => {
            this.saving = false;
        });
    }
}
