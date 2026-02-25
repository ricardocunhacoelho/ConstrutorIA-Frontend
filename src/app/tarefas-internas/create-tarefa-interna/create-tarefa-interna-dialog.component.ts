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
  TarefaInternaServiceProxy,
  CreateTarefaInternaDto,
  ObraServiceProxy,
  SimpleLookupDto,
  TarefaStatus
} from '../../../shared/service-proxies/service-proxies';

import moment from 'moment';

@Component({
  templateUrl: './create-tarefa-interna-dialog.component.html',
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
export class CreateTarefaInternaDialogComponent extends AppComponentBase implements OnInit {
  @Output() onSave = new EventEmitter<any>();

  saving = false;
  tarefa = new CreateTarefaInternaDto();

  obras: SimpleLookupDto[] = [];
  usuarios: SimpleLookupDto[] = [];

  selectedUserId?: number | null;
  usuarioNaoCadastrado = false;
  selectedObraId?: string | null;

  dataPrevistaTermino: string | undefined;

  constructor(
    injector: Injector,
    public _tarefaService: TarefaInternaServiceProxy,
    public _obraService: ObraServiceProxy,
    public bsModalRef: BsModalRef,
    private cd: ChangeDetectorRef
  ) {
    super(injector);
  }

  ngOnInit(): void {
    this.dataPrevistaTermino = '';
    this.loadObras();
    this.loadUsuarios();
  }

  loadObras() {
    this._obraService.getObras().subscribe(result => {
      this.obras = result;
      this.cd.detectChanges();
    });
  }

  loadUsuarios() {
    this._tarefaService.getUsuarios().subscribe(result => {
      this.usuarios = result;
      this.cd.detectChanges();
    });
  }

  onUserChange() {
    this.usuarioNaoCadastrado = this.selectedUserId === null;

    if (!this.usuarioNaoCadastrado && this.selectedUserId) {
      this.tarefa.userId = this.selectedUserId;
      this.tarefa.responsavelNome = undefined;
      this.tarefa.responsavelEmail = undefined;
    } else {
      this.tarefa.userId = undefined;
    }
  }

  onObraChange() {
    this.tarefa.obraId = this.selectedObraId ? this.selectedObraId as any : undefined;
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
