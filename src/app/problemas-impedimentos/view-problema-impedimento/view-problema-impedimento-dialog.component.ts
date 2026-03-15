import { Component, Injector, OnInit, EventEmitter, Output, ChangeDetectorRef } from '@angular/core';
import { BsModalRef, BsModalService } from 'ngx-bootstrap/modal';
import { FormsModule } from '@angular/forms';
import { CommonModule, NgIf, DatePipe } from '@angular/common';
import { TabsetComponent, TabDirective } from 'ngx-bootstrap/tabs';
import { AbpModalHeaderComponent } from '../../../shared/components/modal/abp-modal-header.component';
import { AbpModalFooterComponent } from '../../../shared/components/modal/abp-modal-footer.component';
import { LocalizePipe } from '@shared/pipes/localize.pipe';
import { AppComponentBase } from '@shared/app-component-base';
import { TimeAgoPipe } from '@shared/pipes/time-ago.pipe';
import { Nl2brPipe } from '@shared/pipes/nl2br.pipe';

import {
  ProblemaImpedimentoServiceProxy,
  ProblemaImpedimentoDto,
  ProblemaImpedimentoStatus,
  NivelUrgencia
} from '../../../shared/service-proxies/service-proxies';

import moment from 'moment';
import { ResolveProblemaImpedimentoDialogComponent } from '../resolve-problema-impedimento-dialog.component/resolve-problema-impedimento-dialog.component';

@Component({
  templateUrl: './view-problema-impedimento-dialog.component.html',
  styleUrls: ['./view-problema-impedimento-dialog.component.scss'],
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    AbpModalHeaderComponent,
    AbpModalFooterComponent,
    TabsetComponent,
    TabDirective,
    LocalizePipe,
    NgIf,
    DatePipe,
    TimeAgoPipe,
    Nl2brPipe
  ]
})
export class ViewProblemaImpedimentoDialogComponent extends AppComponentBase implements OnInit {
  @Output() onSave = new EventEmitter<any>();

  id: string;
  problema: ProblemaImpedimentoDto;
  loading = false;

  // Enums
  ProblemaImpedimentoStatus = ProblemaImpedimentoStatus;
  NivelUrgencia = NivelUrgencia;

  // Controle de expansão de textos longos
  descricaoExpandida = false;
  impactoExpandido = false;
  observacaoExpandida = false;

  isDescricaoLonga = false;
  isImpactoLongo = false;
  isObservacaoLonga = false;

  private readonly TEXTO_LIMITE = 200;

  constructor(
    injector: Injector,
    public _problemaService: ProblemaImpedimentoServiceProxy,
    public bsModalRef: BsModalRef,
    private modalService: BsModalService,
    private cd: ChangeDetectorRef
  ) {
    super(injector);
  }

  ngOnInit(): void {
    this.carregarProblema();
  }

  carregarProblema(): void {
    this.loading = true;
    this._problemaService.get(this.id).subscribe({
      next: (result) => {
        this.problema = result;
        this.verificarTextosLongos();
        this.loading = false;
        this.cd.detectChanges();
      },
      error: (error) => {
        this.loading = false;
        this.notify.error('Erro ao carregar problema/impedimento');
        console.error(error);
      }
    });
  }

  private verificarTextosLongos(): void {
    if (this.problema?.descricao) {
      this.isDescricaoLonga = this.problema.descricao.length > this.TEXTO_LIMITE;
    }
    if (this.problema?.impacto) {
      this.isImpactoLongo = this.problema.impacto.length > this.TEXTO_LIMITE;
    }
    if (this.problema?.observacao) {
      this.isObservacaoLonga = this.problema.observacao.length > this.TEXTO_LIMITE;
    }
  }

  toggleDescricao(): void {
    this.descricaoExpandida = !this.descricaoExpandida;
    setTimeout(() => this.cd.detectChanges(), 10);
  }

  toggleImpacto(): void {
    this.impactoExpandido = !this.impactoExpandido;
    setTimeout(() => this.cd.detectChanges(), 10);
  }

  toggleObservacao(): void {
    this.observacaoExpandida = !this.observacaoExpandida;
    setTimeout(() => this.cd.detectChanges(), 10);
  }

  getStatusClass(status: ProblemaImpedimentoStatus): string {
    switch (status) {
      case ProblemaImpedimentoStatus.ABERTO:
        return 'status-aberto';
      case ProblemaImpedimentoStatus.CONCLUIDO:
        return 'status-concluido';
      default:
        return '';
    }
  }

  getStatusIcon(status: ProblemaImpedimentoStatus): string {
    switch (status) {
      case ProblemaImpedimentoStatus.ABERTO:
        return 'fa-exclamation-triangle';
      case ProblemaImpedimentoStatus.CONCLUIDO:
        return 'fa-check-circle';
      default:
        return 'fa-question-circle';
    }
  }

  getStatusText(status: ProblemaImpedimentoStatus): string {
    switch (status) {
      case ProblemaImpedimentoStatus.ABERTO:
        return 'Aberto';
      case ProblemaImpedimentoStatus.CONCLUIDO:
        return 'Concluído';
      default:
        return 'Desconhecido';
    }
  }

  getUrgenciaClass(urgencia: NivelUrgencia): string {
    switch (urgencia) {
      case NivelUrgencia.Baixa:
        return 'urgencia-baixa';
      case NivelUrgencia.Media:
        return 'urgencia-media';
      case NivelUrgencia.Alta:
        return 'urgencia-alta';
      default:
        return '';
    }
  }

  getUrgenciaIcon(urgencia: NivelUrgencia): string {
    switch (urgencia) {
      case NivelUrgencia.Baixa:
        return 'fa-arrow-down';
      case NivelUrgencia.Media:
        return 'fa-minus';
      case NivelUrgencia.Alta:
        return 'fa-arrow-up';
      default:
        return 'fa-circle';
    }
  }

  getUrgenciaText(urgencia: NivelUrgencia): string {
    switch (urgencia) {
      case NivelUrgencia.Baixa:
        return 'Baixa';
      case NivelUrgencia.Media:
        return 'Média';
      case NivelUrgencia.Alta:
        return 'Alta';
      default:
        return urgencia;
    }
  }

  formatDate(date: moment.Moment | Date | undefined): string {
    if (!date) return '-';
    return moment(date).format('DD/MM/YYYY HH:mm');
  }

  formatDateOnly(date: moment.Moment | Date | undefined): string {
    if (!date) return '-';
    return moment(date).format('DD/MM/YYYY');
  }

  resolverProblema(): void {
    const modal = this.modalService.show(ResolveProblemaImpedimentoDialogComponent, {
      initialState: {
        id: this.problema.id
      },
      class: 'modal-md'
    });
    modal.content.onSave.subscribe(() => {
      this.carregarProblema();
      this.onSave.emit();
    });
  }

  close(): void {
    this.bsModalRef.hide();
  }
}