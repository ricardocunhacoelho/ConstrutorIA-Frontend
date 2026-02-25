import { Component, EventEmitter, Injector, Output } from '@angular/core';
import { CommonModule } from '@node_modules/@angular/common';
import { FormsModule } from '@node_modules/@angular/forms';
import { AppComponentBase } from '@shared/app-component-base';
import { BsModalRef } from 'ngx-bootstrap/modal';

@Component({
  selector: 'app-estornar-lancamento-modal',
  templateUrl: './estornar-lancamento-modal.component.html',
  styleUrls: ['./estornar-lancamento-modal.component.scss'],
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,    
  ],
})
export class EstornarLancamentoModalComponent extends AppComponentBase {

  @Output() onConfirm = new EventEmitter<string>();

  motivo: string = '';
  salvando = false;

  constructor(
    injector: Injector,
    public bsModalRef: BsModalRef
  ) {
    super(injector);
  }

  confirmar() {

    if (!this.motivo || this.motivo.trim().length === 0) {
      this.notify.warn('Motivo do estorno é obrigatório.');
      return;
    }

    this.onConfirm.emit(this.motivo);
    this.bsModalRef.hide();
  }

  cancelar() {
    this.bsModalRef.hide();
  }
}