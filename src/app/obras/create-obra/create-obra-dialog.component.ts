import { Component, Injector, OnInit, EventEmitter, Output, ChangeDetectorRef } from '@angular/core';
import { BsModalRef } from 'ngx-bootstrap/modal';
import { forEach as _forEach, map as _map } from 'lodash-es';
import { AppComponentBase } from '@shared/app-component-base';
import { CreateEncarregadoDto, CreateEnderecoDto, CreateObraDto, CreateProprietarioDto, CreateTelefoneDto, ObraServiceProxy } from '@shared/service-proxies/service-proxies';
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
    dataInicio: string | undefined;
    dataPrevistaTermino: string | undefined;
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

        this.dataInicio = '';
        this.dataPrevistaTermino = '';
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
        novo.telefone = new CreateTelefoneDto();
        novo.telefone.idd = '55';
        novo.telefone.ddd = '';
        novo.telefone.numero = '';
        novo.telefone.internacional = false;
        this.encarregados.push(novo);
    }

    removerEncarregado(index: number) {
        this.encarregados.splice(index, 1);
    }

    save(): void {
        this.saving = true;

        this.obra.dataInicio = this.dataInicio
            ? moment(this.dataInicio, 'YYYY-MM-DD')
            : undefined;

        this.obra.dataPrevistaTermino = this.dataPrevistaTermino
            ? moment(this.dataPrevistaTermino, 'YYYY-MM-DD')
            : undefined;

        this.obra.proprietarios = this.proprietarios;
        this.obra.encarregados = this.encarregados;

        this._obraService.create(this.obra).subscribe(
            () => {
                this.notify.info(this.l('SavedSuccessfully'));
                this.onSave.emit();
                this.bsModalRef.hide();
            },
            () => {
                this.saving = false;
            }
        );
    }
}
