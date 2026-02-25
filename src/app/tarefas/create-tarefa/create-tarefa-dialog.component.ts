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
import {
    TarefaServiceProxy,
    CreateTarefaDto,
    EncarregadoComObraDto,
    TarefaStatus
} from '../../../shared/service-proxies/service-proxies';
import moment from 'moment';

@Component({
    templateUrl: './create-tarefa-dialog.component.html',
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
    ]
})
export class CreateTarefaDialogComponent extends AppComponentBase implements OnInit {
    @Output() onSave = new EventEmitter<any>();

    saving = false;
    tarefa = new CreateTarefaDto();

    encarregadosComObras: EncarregadoComObraDto[] = [];
    selectedEncarregado?: EncarregadoComObraDto;
    dataPrevistaTermino: string | undefined;

    constructor(
        injector: Injector,
        public _tarefaService: TarefaServiceProxy,
        public bsModalRef: BsModalRef,
        private cd: ChangeDetectorRef
    ) {
        super(injector);
    }

    ngOnInit(): void {
        this.loadEncarregadosComObras();
        this.dataPrevistaTermino = '';
    }

    loadEncarregadosComObras() {
        this._tarefaService.getEncarregadosComObras().subscribe(result => {
            this.encarregadosComObras = result;
            this.cd.detectChanges();
        });
    }

    onEncarregadoChange() {
        if (this.selectedEncarregado) {
            this.tarefa.encarregadoId = this.selectedEncarregado.id;
            this.tarefa.obraId = this.selectedEncarregado.obraId;
        }
    }

    save(): void {
        this.tarefa.status = TarefaStatus.PENDENTE;
        this.saving = true;

        this.tarefa.dataPrevistaFinalizacao = this.dataPrevistaTermino
            ? moment(this.dataPrevistaTermino, 'YYYY-MM-DD')
            : undefined;

        this._tarefaService.create(this.tarefa).subscribe(() => {
            this.notify.info(this.l('TarefaCriadaComSucesso'));
            this.bsModalRef.hide();
            this.onSave.emit();
        }, () => {
            this.saving = false;
        });
    }
}
