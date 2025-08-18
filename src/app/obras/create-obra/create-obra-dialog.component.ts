import { Component, Injector, OnInit, EventEmitter, Output, ChangeDetectorRef } from '@angular/core';
import { BsModalRef } from 'ngx-bootstrap/modal';
import { forEach as _forEach, map as _map } from 'lodash-es';
import { AppComponentBase } from '@shared/app-component-base';
import { CreateEncarregadoDto, CreateEnderecoDto, CreateObraDto, CreateProprietarioDto, ObraServiceProxy } from '@shared/service-proxies/service-proxies';
import { FormsModule } from '@angular/forms';
import { AbpModalHeaderComponent } from '../../../shared/components/modal/abp-modal-header.component';
import { TabsetComponent, TabDirective } from 'ngx-bootstrap/tabs';
import { AbpValidationSummaryComponent } from '../../../shared/components/validation/abp-validation.summary.component';
import { EqualValidator } from '../../../shared/directives/equal-validator.directive';
import { AbpModalFooterComponent } from '../../../shared/components/modal/abp-modal-footer.component';
import { LocalizePipe } from '@shared/pipes/localize.pipe';
import { CommonModule, NgIf } from '@node_modules/@angular/common';
import moment from 'moment';

@Component({
    templateUrl: './create-obra-dialog.component.html',
    standalone: true,
    imports: [
        CommonModule,
        NgIf,
        FormsModule,
        AbpModalHeaderComponent,
        TabsetComponent,
        TabDirective,
        AbpValidationSummaryComponent,
        EqualValidator,
        AbpModalFooterComponent,
        LocalizePipe,
    ],
})
export class CreateObraDialogComponent extends AppComponentBase implements OnInit {
    @Output() onSave = new EventEmitter<any>();

    saving = false;
    obra = new CreateObraDto();
    proprietarios: CreateProprietarioDto[] = [];
    encarregados: CreateEncarregadoDto[] = [];

    constructor(
        injector: Injector,
        public _obraService: ObraServiceProxy,
        public bsModalRef: BsModalRef,
        private cd: ChangeDetectorRef
    ) {
        super(injector);
    }

    ngOnInit(): void {
        this.obra = new CreateObraDto();
        this.obra.endereco = new CreateEnderecoDto();
        this.obra.proprietarios = [];
        this.obra.encarregados = [];
    }

    adicionarProprietario() {
        const novo = new CreateProprietarioDto();
        novo.nome = '';
        novo.cpfOrCnpj = '';
        this.proprietarios.push(novo);
    }

    removerProprietario(index: number) {
        this.proprietarios.splice(index, 1);
    }

    adicionarEncarregado() {
        const novo = new CreateEncarregadoDto();
        novo.nome = '';
        novo.cpfOrCnpj = '';
        this.encarregados.push(novo);
    }

    removerEncarregado(index: number) {
        this.encarregados.splice(index, 1);
    }

    save(): void {
        this.saving = true;

        if (this.obra.dataInicio && typeof (this.obra.dataInicio as any).toISOString !== 'function') {
            this.obra.dataInicio = moment(this.obra.dataInicio);
        }
        if (this.obra.dataPrevistaTermino && typeof (this.obra.dataPrevistaTermino as any).toISOString !== 'function') {
            this.obra.dataPrevistaTermino = moment(this.obra.dataPrevistaTermino);
        }
        
        this.obra.proprietarios = this.proprietarios;
        this.obra.encarregados = this.encarregados;

        this._obraService.create(this.obra).subscribe(
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
