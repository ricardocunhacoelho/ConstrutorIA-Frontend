import { Component, Injector, OnInit, EventEmitter, Output, ChangeDetectorRef } from '@angular/core';
import { BsModalRef } from 'ngx-bootstrap/modal';
import { FormsModule } from '@angular/forms';
import { CommonModule, NgIf } from '@angular/common';
import { AbpModalHeaderComponent } from '../../../shared/components/modal/abp-modal-header.component';
import { AbpModalFooterComponent } from '../../../shared/components/modal/abp-modal-footer.component';
import { LocalizePipe } from '@shared/pipes/localize.pipe';
import { AppComponentBase } from '@shared/app-component-base';
import { ProblemaImpedimentoServiceProxy, ProblemaImpedimentoDto, EncarregadoComObraDto, UpdateProblemaImpedimentoDto, NivelUrgencia } from '../../../shared/service-proxies/service-proxies';
import { forkJoin } from 'rxjs';

@Component({
    templateUrl: './edit-problema-impedimento-dialog.component.html',
    standalone: true,
    imports: [
        CommonModule,
        FormsModule,
        AbpModalHeaderComponent,
        AbpModalFooterComponent,
        LocalizePipe,
        NgIf
    ]
})
export class EditProblemaImpedimentoDialogComponent extends AppComponentBase implements OnInit {
    @Output() onSave = new EventEmitter<any>();

    saving = false;
    problema = new UpdateProblemaImpedimentoDto();
    encarregadosComObras: EncarregadoComObraDto[] = [];
    selectedEncarregado?: EncarregadoComObraDto;
    niveisUrgencia = Object.values(NivelUrgencia);

    id?: string;

    constructor(
        injector: Injector,
        public _problemaService: ProblemaImpedimentoServiceProxy,
        public bsModalRef: BsModalRef,
        private cd: ChangeDetectorRef
    ) {
        super(injector);
    }

    ngOnInit(): void {
        if (this.id) {
            forkJoin([
                this._problemaService.get(this.id),
                this._problemaService.getEncarregadosComObras()
            ]).subscribe(([problema, encarregados]) => {
                this.problema = UpdateProblemaImpedimentoDto.fromJS(problema);

                this.encarregadosComObras = encarregados;

                if (this.problema.encarregado) {
                    this.selectedEncarregado = this.encarregadosComObras
                        .find(e => e.id === this.problema.encarregado!.id);
                }

                this.cd.detectChanges();
            });
        } else {
            this.loadEncarregadosComObras();
        }
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
        this._problemaService.update(this.problema).subscribe(() => {
            this.notify.info(this.l('ProblemaAtualizadoComSucesso'));
            this.bsModalRef.hide();
            this.onSave.emit();
        }, () => {
            this.saving = false;
        });
    }
}
