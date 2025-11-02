import {
  Component,
  Injector,
  OnInit,
  EventEmitter,
  Output,
  ChangeDetectorRef
} from '@angular/core';
import { BsModalRef } from 'ngx-bootstrap/modal';
import { FormsModule } from '@angular/forms';
import { CommonModule, NgIf } from '@angular/common';
import { TabsetComponent, TabDirective } from 'ngx-bootstrap/tabs';
import { AbpModalHeaderComponent } from '../../../shared/components/modal/abp-modal-header.component';
import { AbpModalFooterComponent } from '../../../shared/components/modal/abp-modal-footer.component';
import { AbpValidationSummaryComponent } from '../../../shared/components/validation/abp-validation.summary.component';

import {
  TarefaInternaServiceProxy,
  UpdateTarefaInternaDto,
  SimpleLookupDto,
  TarefaStatus,
  ObraServiceProxy
} from '../../../shared/service-proxies/service-proxies';

import moment from 'moment';
import { AppComponentBase } from '../../../shared/app-component-base';
import { LocalizePipe } from '../../../shared/pipes/localize.pipe';

@Component({
  templateUrl: './edit-tarefa-interna-dialog.component.html',
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
export class EditTarefaInternaDialogComponent extends AppComponentBase implements OnInit {
  @Output() onSave = new EventEmitter<any>();

  saving = false;
  tarefa = new UpdateTarefaInternaDto();
  id?: string;
  isFinalizada = false;

  obras: SimpleLookupDto[] = [];
  usuarios: SimpleLookupDto[] = [];

  selectedUserId?: number | null;
  selectedObraId?: string | null;
  usuarioNaoCadastrado = false;

  dataPrevistaTermino: string | undefined;

  constructor(
    injector: Injector,
    private _tarefaService: TarefaInternaServiceProxy,
    private _obraService: ObraServiceProxy,
    public bsModalRef: BsModalRef,
    private cd: ChangeDetectorRef
  ) {
    super(injector);
  }

  ngOnInit(): void {
    if (this.id) {
      this.loadData(this.id);
    }

    this.loadAuxiliaryData();
  }

  loadData(id: string): void {
    this._tarefaService.get(id).subscribe(result => {
      this.tarefa = result;

      this.selectedUserId = result.user?.id ?? null;
      this.selectedObraId = result.obra?.id ?? null;

      this.dataPrevistaTermino = result.dataPrevistaFinalizacao
        ? moment(result.dataPrevistaFinalizacao).format('YYYY-MM-DD')
        : '';

      this.tarefa.observacoes = result.observacoes ?? '';
      this.tarefa.resolucao = result.resolucao ?? '';
      this.isFinalizada = result.status === TarefaStatus.FINALIZADA;

      this.cd.detectChanges();
    });
  }

  loadAuxiliaryData(): void {
    this._tarefaService.getUsuarios().subscribe(u => (this.usuarios = u));
    this._obraService.getObras().subscribe(o => (this.obras = o));
  }

  onUserChange(): void {
    this.usuarioNaoCadastrado = this.selectedUserId == null;
    if (!this.usuarioNaoCadastrado) {
      this.tarefa.responsavelNome = undefined;
      this.tarefa.responsavelEmail = undefined;
    }
  }

  onObraChange(): void {
    this.tarefa.obraId = this.selectedObraId ?? undefined;
  }

  save(): void {
    this.saving = true;

    this.tarefa.dataPrevistaFinalizacao = this.dataPrevistaTermino
      ? moment(this.dataPrevistaTermino, 'YYYY-MM-DD')
      : undefined;

    this.tarefa.userId = this.selectedUserId ?? undefined;
    this.tarefa.obraId = this.selectedObraId ?? undefined;

    // Observações e resolução já estão bindadas no template

    this._tarefaService.update(this.tarefa).subscribe(
      () => {
        this.notify.info(this.l('TarefaAtualizadaComSucesso'));
        this.bsModalRef.hide();
        this.onSave.emit();
      },
      () => {
        this.saving = false;
      }
    );
  }

  finalizarTarefa(): void {
    if (!this.tarefa.resolucao || this.tarefa.resolucao.trim() === '') {
      this.notify.warn('Informe a resolução para finalizar a tarefa.');
      return;
    }

    this.tarefa.status = TarefaStatus.FINALIZADA;
    this.tarefa.dataFinalizacao = moment();
    this.saving = true;

    this._tarefaService.update(this.tarefa).subscribe(
      () => {
        this.notify.info(this.l('TarefaFinalizadaComSucesso'));
        this.bsModalRef.hide();
        this.onSave.emit();
      },
      () => {
        this.saving = false;
      }
    );
  }
}
