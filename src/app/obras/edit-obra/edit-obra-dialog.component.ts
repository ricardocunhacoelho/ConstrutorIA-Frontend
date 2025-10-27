import { Component, Injector, OnInit, EventEmitter, Output, ChangeDetectorRef } from '@angular/core';
import { BsModalRef } from 'ngx-bootstrap/modal';
import { forEach as _forEach, includes as _includes, map as _map } from 'lodash-es';
import { AppComponentBase } from '@shared/app-component-base';
import { RoleDto, UpdateObraDto, ObraServiceProxy, CreateProprietarioDto, CreateEnderecoDto, CreateEncarregadoDto, CreateTelefoneDto } from '@shared/service-proxies/service-proxies';
import { FormsModule } from '@angular/forms';
import { AbpModalHeaderComponent } from '../../../shared/components/modal/abp-modal-header.component';
import { TabsetComponent, TabDirective } from 'ngx-bootstrap/tabs';
import { AbpValidationSummaryComponent } from '../../../shared/components/validation/abp-validation.summary.component';
import { AbpModalFooterComponent } from '../../../shared/components/modal/abp-modal-footer.component';
import { LocalizePipe } from '@shared/pipes/localize.pipe';
import { CommonModule, NgIf } from '@node_modules/@angular/common';
import moment from 'moment';

@Component({
    templateUrl: './edit-obra-dialog.component.html',
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
export class EditObraDialogComponent extends AppComponentBase implements OnInit {
    @Output() onSave = new EventEmitter<any>();

    saving = false;
    obra = new UpdateObraDto();
    dataInicio: string | undefined;
    dataPrevistaTermino: string | undefined;
    proprietarios: CreateProprietarioDto[] = [];
    encarregados: CreateEncarregadoDto[] = [];
    roles: RoleDto[] = [];
    checkedRolesMap: { [key: string]: boolean } = {};
    id: string;

    constructor(
        injector: Injector,
        public _obraService: ObraServiceProxy,
        public bsModalRef: BsModalRef,
        private cd: ChangeDetectorRef
    ) {
        super(injector);
    }

    ngOnInit(): void {
        this.obra = new UpdateObraDto();
        this.obra.endereco = new CreateEnderecoDto();

        this._obraService.get(this.id).subscribe((result) => {
            this.obra = UpdateObraDto.fromJS(result);

            if (this.obra.dataInicio) {
                this.dataInicio = moment(this.obra.dataInicio).format('YYYY-MM-DD');
            }
            if (this.obra.dataPrevistaTermino) {
                this.dataPrevistaTermino = moment(this.obra.dataPrevistaTermino).format('YYYY-MM-DD');
            }

            if (!this.obra.endereco) {
                this.obra.endereco = new CreateEnderecoDto();
            }

            this.proprietarios = this.obra.proprietarios ?? [];

            this.encarregados = (this.obra.encarregados ?? []).map(enc => {
                if (!enc.telefone) {
                    enc.telefone = new CreateTelefoneDto();
                    enc.telefone.idd = '55';
                    enc.telefone.ddd = '';
                    enc.telefone.numero = '';
                    enc.telefone.internacional = false;
                }
                return enc;
            });

            this.cd.detectChanges();
        });
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

        const telefone = new CreateTelefoneDto();
        telefone.idd = '55'; // sempre fixo
        telefone.ddd = '';   // começa vazio, será preenchido pelo input do usuário
        telefone.numero = '';
        telefone.internacional = false;

        novo.telefone = telefone;

        this.encarregados.push(novo);
    }




    removerEncarregado(index: number) {
        this.encarregados.splice(index, 1);
    }

    save(): void {
        this.saving = true;

        for (const e of this.encarregados) {
            if (!e.telefone || !/^\d{2,3}$/.test(e.telefone.ddd)) {
                this.notify.error('DDD inválido para o encarregado ' + e.nome);
                this.saving = false;
                return;
            }
            if (!e.telefone.numero || !/^\d{8,10}$/.test(e.telefone.numero)) {
                this.notify.error('Número de telefone inválido para o encarregado ' + e.nome);
                this.saving = false;
                return;
            }
        }

        if (this.dataInicio) {
            this.obra.dataInicio = moment(this.dataInicio, 'YYYY-MM-DD');
        }
        if (this.dataPrevistaTermino) {
            this.obra.dataPrevistaTermino = moment(this.dataPrevistaTermino, 'YYYY-MM-DD');
        }

        this.obra.proprietarios = this.proprietarios;
        this.obra.encarregados = this.encarregados;

        this._obraService.update(this.obra).subscribe(
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
