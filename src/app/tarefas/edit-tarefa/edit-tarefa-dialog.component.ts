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
import { EncarregadoComObraDto, TarefaServiceProxy, UpdateTarefaDto } from '../../../shared/service-proxies/service-proxies';
import { TarefaStatus } from '../../../shared/service-proxies/service-proxies';
import { forkJoin } from 'rxjs';

@Component({
  templateUrl: './edit-tarefa-dialog.component.html',
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
export class EditTarefaDialogComponent extends AppComponentBase implements OnInit {
  @Output() onSave = new EventEmitter<any>();

  saving = false;
  tarefa = new UpdateTarefaDto();
  resolucao = '';
  id?: string;

  encarregadosComObras: EncarregadoComObraDto[] = [];
  selectedEncarregado?: EncarregadoComObraDto;

  constructor(
    injector: Injector,
    public _tarefaService: TarefaServiceProxy,
    public bsModalRef: BsModalRef,
    private cd: ChangeDetectorRef
  ) {
    super(injector);
  }

  ngOnInit(): void {
    if (this.id) {
      forkJoin([
        this._tarefaService.get(this.id),
        this._tarefaService.getEncarregadosComObras()
      ]).subscribe(([tarefa, encarregados]) => {
        this.tarefa = UpdateTarefaDto.fromJS(tarefa);
        this.resolucao = this.tarefa.observacoes ?? '';

        this.encarregadosComObras = encarregados;

        if (this.tarefa.encarregado) {
          this.selectedEncarregado = this.encarregadosComObras
            .find(e => e.id === this.tarefa.encarregado!.id);
        }

        this.cd.detectChanges();
      });
    } else {
      this.loadEncarregadosComObras();
    }
  }

  loadEncarregadosComObras() {
    this._tarefaService.getEncarregadosComObras().subscribe(result => {
      this.encarregadosComObras = result;
    });
  }

  onEncarregadoChange() {
    if (this.selectedEncarregado) {
      this.tarefa.encarregado = undefined;
      this.tarefa.obra = undefined;
      this.tarefa.encarregadoId = this.selectedEncarregado.id;
      this.tarefa.obraId = this.selectedEncarregado.obraId;
    }
  }

  fecharTarefa(): void {
    if (!this.resolucao || this.resolucao.trim() === '') {
      this.notify.error('Informe a resolução antes de fechar a tarefa.');
      return;
    }

    this.tarefa.observacoes = this.resolucao;
    this.tarefa.status = TarefaStatus.FINALIZADA;

    this._tarefaService.update(this.tarefa).subscribe(() => {
      this.notify.info(this.l('TarefaFechadaComSucesso'));
      this.bsModalRef.hide();
      this.onSave.emit();
    });
  }

  save(): void {
    this._tarefaService.update(this.tarefa).subscribe(() => {
      this.notify.info(this.l('SavedSuccessfully'));
      this.bsModalRef.hide();
      this.onSave.emit();
    }, () => {
      this.saving = false;
    });
  }
}
