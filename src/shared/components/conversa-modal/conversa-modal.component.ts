import { Component, Input, OnInit, ViewChild, ElementRef, ChangeDetectorRef, EventEmitter, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { BsModalRef } from 'ngx-bootstrap/modal';
import { MensagemServiceProxy, MensagemDto } from '../../../shared/service-proxies/service-proxies';
import { finalize } from 'rxjs/operators';
import moment from 'moment';

@Component({
    selector: 'app-conversa-modal',
    standalone: true,
    imports: [CommonModule, FormsModule],
    templateUrl: './conversa-modal.component.html',
    styleUrls: ['./conversa-modal.component.scss']
})
export class ConversaModalComponent implements OnInit {
    @Input() encarregadoId: string;
    @Input() encarregadoNome: string;
    @Input() fornecedorId: string;
    @Input() cotacaoId: string;
    @Input() titulo: string;
    @Input() fornecedorNome: string;
    @Output() onMensagensVisualizadas = new EventEmitter<void>();

    @ViewChild('messagesContainer') private messagesContainer: ElementRef;

    mensagens: MensagemDto[] = [];
    loading = false;
    mensagensAgrupadas: any[] = [];

    constructor(
        public bsModalRef: BsModalRef,
        private _mensagemService: MensagemServiceProxy,
        private cdr: ChangeDetectorRef
    ) { }

    ngOnInit(): void {
        this.carregarMensagens();
    }

    carregarMensagens(): void {
        this.loading = true;

        let request$;

        if (this.encarregadoId) {
            // Busca mensagens do encarregado
            request$ = this._mensagemService.getMensagensByEncarregadoId(this.encarregadoId);
        } else if (this.fornecedorId) {
            // Busca mensagens do fornecedor
            request$ = this._mensagemService.getMensagensByFornecedorId(this.fornecedorId);
        } else if (this.cotacaoId) {
            // Busca mensagens da cotação (compatibilidade)
            request$ = this._mensagemService.getMensagensByCotacaoId(this.cotacaoId);
        } else {
            this.loading = false;
            abp.notify.error('Nenhum identificador de conversa fornecido');
            return;
        }

        request$
            .pipe(finalize(() => {
                this.loading = false;
                this.cdr.detectChanges();
                setTimeout(() => this.scrollToBottom(), 100);
            }))
            .subscribe({
                next: (mensagens) => {
                    this.mensagens = mensagens;
                    this.agruparMensagens();

                    const idsNaoLidas = mensagens
                        .filter(m => !m.visualizada)
                        .map(m => m.id);

                    if (idsNaoLidas.length) {
                        this._mensagemService.marcarComoVisualizadas(idsNaoLidas).subscribe({
                            complete: () => {
                                this.onMensagensVisualizadas.emit();
                            }
                        });
                    }
                },
                error: (error) => {
                    console.error('Erro ao carregar mensagens:', error);
                    abp.notify.error('Erro ao carregar mensagens');
                }
            });
    }

    agruparMensagens(): void {
        const grupos = [];
        let grupoAtual: any = null;

        this.mensagens.forEach((msg, index) => {
            const dataMsg = moment(msg.dataHora);
            const dataStr = dataMsg.format('DD/MM/YYYY');

            const mudouTipoConversa = index === 0 ||
                msg.tipoConversa !== this.mensagens[index - 1].tipoConversa;

            if (mudouTipoConversa) {
                if (grupoAtual) {
                    grupos.push(grupoAtual);
                }

                grupoAtual = {
                    tipoConversa: msg.tipoConversa,
                    data: dataStr,
                    mensagens: []
                };
            }

            if (grupoAtual && grupoAtual.data !== dataStr) {
                grupos.push(grupoAtual);
                grupoAtual = {
                    tipoConversa: msg.tipoConversa,
                    data: dataStr,
                    mensagens: []
                };
            }

            if (grupoAtual) {
                grupoAtual.mensagens.push(msg);
            }
        });

        if (grupoAtual) {
            grupos.push(grupoAtual);
        }

        this.mensagensAgrupadas = grupos;
    }

    scrollToBottom(): void {
        try {
            const element = this.messagesContainer.nativeElement;

            setTimeout(() => {
                element.scrollTo({
                    top: element.scrollHeight,
                    behavior: 'smooth'
                });
            }, 50);

        } catch (err) {
            console.error('Erro ao scrollar:', err);
        }
    }

    recarregar(): void {
        this.mensagens = [];
        this.mensagensAgrupadas = [];
        this.carregarMensagens();
    }

    getTipoConversaLabel(tipo: string): string {
        switch (tipo) {
            case 'Cotacao': return '💬 COTAÇÃO';
            case 'Pedido': return '📦 PEDIDO DE COMPRA';
            default: return tipo || 'CONVERSA';
        }
    }

    getTipoConversaClass(tipo: string): string {
        switch (tipo) {
            case 'Cotacao': return 'badge-cotacao';
            case 'Pedido': return 'badge-pedido';
            default: return '';
        }
    }

    getRemetenteClass(msg: MensagemDto): string {
        switch (msg.tipoRemetente) {
            case 'Fornecedor': return 'mensagem-fornecedor';
            case 'Encarregado': return 'mensagem-encarregado';
            case 'Sistema': return 'mensagem-sistema';
            case 'AgenteIA': return 'mensagem-agente';
            default: return 'mensagem-sistema';
        }
    }

    getIconeRemetente(tipo: string): string {
        switch (tipo) {
            case 'Fornecedor': return 'fa-building';
            case 'Encarregado': return 'fa-user';
            case 'Sistema': return 'fa-cog';
            case 'AgenteIA': return 'fa-robot';
            default: return 'fa-comment';
        }
    }

    getNomeRemetente(msg: MensagemDto): string {
        if (msg.tipoRemetente === 'Fornecedor') {
            return this.fornecedorNome || msg.nomeRemetente || 'Fornecedor';
        } else if (msg.tipoRemetente === 'AgenteIA') {
            return this.encarregadoNome || msg.nomeRemetente || 'Agente IA';
        }
        return msg.nomeRemetente || 'Sistema';
    }

    formatarHora(data: moment.Moment): string {
        return moment(data).format('HH:mm');
    }

    formatarData(data: moment.Moment): string {
        const hoje = moment().startOf('day');
        const ontem = moment().subtract(1, 'days').startOf('day');
        const dataMsg = moment(data).startOf('day');

        if (dataMsg.isSame(hoje)) {
            return 'Hoje';
        } else if (dataMsg.isSame(ontem)) {
            return 'Ontem';
        } else {
            return dataMsg.format('DD/MM/YYYY');
        }
    }

    fechar(): void {
        this.bsModalRef.hide();
    }
}