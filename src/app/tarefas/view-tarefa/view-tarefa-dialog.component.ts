import { ChangeDetectorRef, Component, EventEmitter, Input, OnInit, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { BsModalRef, BsModalService } from 'ngx-bootstrap/modal'; // 🔥 Adicionar BsModalService
import { TarefaDto, TarefaServiceProxy } from '@shared/service-proxies/service-proxies';
import { Injector } from '@angular/core';
import { TarefaStatus } from '../../../shared/service-proxies/service-proxies';
import { AppComponentBase } from '@shared/app-component-base';
import { Nl2brPipe } from '@shared/pipes/nl2br.pipe';
import moment from 'moment';
import { ConversaModalComponent } from '@shared/components/conversa-modal/conversa-modal.component';

@Component({
    selector: 'app-tarefa-view-modal',
    standalone: true,
    imports: [
        CommonModule,
        Nl2brPipe,
    ],
    templateUrl: './view-tarefa-dialog.component.html',
    styleUrls: ['./view-tarefa-dialog.component.scss']
})
export class ViewTarefaDialogComponent extends AppComponentBase implements OnInit {
    @Input() tarefaId: string;
    @Output() onClose = new EventEmitter<void>();

    tarefa: TarefaDto;
    loading = false;
    TarefaStatus = TarefaStatus;

    descricaoExpandida = false;
    isDescricaoLonga = false;
    private readonly DESCRICAO_LIMITE = 200;

    constructor(
        injector: Injector,
        public bsModalRef: BsModalRef,
        private _tarefaService: TarefaServiceProxy,
        private cdr: ChangeDetectorRef,
        private _modalService: BsModalService // 🔥 Adicionar modal service
    ) {
        super(injector);
    }

    ngOnInit(): void {
        if (!this.tarefaId) {
            this.message.warn('ID da tarefa não informado.');
            this.close();
            return;
        }

        this.carregarTarefa();
    }

    carregarTarefa(): void {
        this.loading = true;
        this._tarefaService.get(this.tarefaId).subscribe({
            next: (result) => {
                this.tarefa = result;
                this.verificarDescricaoLonga();
                this.loading = false;
                this.cdr.detectChanges();
            },
            error: (err) => {
                this.loading = false;
                this.message.error('Erro ao carregar tarefa: ' + err.message);
                this.cdr.detectChanges();
                this.close();
            }
        });
    }

    private verificarDescricaoLonga(): void {
        if (this.tarefa?.descricao) {
            this.isDescricaoLonga = this.tarefa.descricao.length > this.DESCRICAO_LIMITE;
        }
    }

    toggleDescricaoExpandida(): void {
        this.descricaoExpandida = !this.descricaoExpandida;

        setTimeout(() => {
            this.cdr.detectChanges();
        }, 10);
    }

    abrirWhatsAppEncarregado(): void {
        const encarregado = this.tarefa?.encarregado;
        if (!encarregado) {
            this.notify.warn('Encarregado não identificado');
            return;
        }

        let numero = encarregado.celular || encarregado.telefone?.numero;

        if (numero) {
            numero = numero.replace(/\D/g, '');

            if (numero.length === 11) {
                numero = '55' + numero;
            } else if (numero.length === 10) {
                numero = '55' + numero;
            }

            window.open(`https://wa.me/${numero}`, '_blank');
        } else {
            this.notify.warn('Número de WhatsApp não disponível para este encarregado');
        }
    }

    abrirConversaEncarregado(): void {
        const encarregado = this.tarefa?.encarregado;
        if (!encarregado?.id) {
            this.notify.warn('Encarregado não identificado');
            return;
        }

        const modalRef = this._modalService.show(ConversaModalComponent, {
            class: 'modal-lg modal-dialog-centered',
            initialState: {
                encarregadoId: encarregado.id,
                titulo: 'Conversas com Encarregado',
                encarregadoNome: encarregado.nome || 'Encarregado'
            }
        });

        // Opcional: recarregar dados se mensagens forem marcadas como lidas
        if (modalRef.content && (modalRef.content as any).onMensagensVisualizadas) {
            (modalRef.content as any).onMensagensVisualizadas.subscribe(() => {
                this.carregarTarefa();
            });
        }
    }

    close(): void {
        this.onClose.emit();
        this.bsModalRef.hide();
    }

    getStatusClass(status: TarefaStatus): string {
        switch (status) {
            case TarefaStatus.PENDENTE:
                return 'badge badge-warning';
            case TarefaStatus.FINALIZADA:
                return 'badge badge-success';
            default:
                return 'badge badge-secondary';
        }
    }

    getStatusText(status: TarefaStatus): string {
        switch (status) {
            case TarefaStatus.PENDENTE:
                return 'Pendente';
            case TarefaStatus.FINALIZADA:
                return 'Finalizada';
            default:
                return status;
        }
    }

    formatDate(date: moment.Moment | Date | undefined): string {
        if (!date) return '-';
        const momentDate = moment(date);
        return momentDate.format('DD/MM/YYYY HH:mm');
    }

    formatDateOnly(date: moment.Moment | Date | undefined): string {
        if (!date) return '-';
        const momentDate = moment(date);
        return momentDate.format('DD/MM/YYYY');
    }
}