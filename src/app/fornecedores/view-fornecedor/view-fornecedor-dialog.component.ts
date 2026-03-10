import { Component, Injector, OnInit, EventEmitter, Output, ChangeDetectorRef } from '@angular/core';
import { BsModalRef, BsModalService } from 'ngx-bootstrap/modal'; // 🔥 IMPORTAR BsModalService
import { FormsModule } from '@angular/forms';
import { CommonModule, NgIf, DatePipe } from '@angular/common';
import { AbpModalHeaderComponent } from '../../../shared/components/modal/abp-modal-header.component';
import { AbpModalFooterComponent } from '../../../shared/components/modal/abp-modal-footer.component';
import { LocalizePipe } from '@shared/pipes/localize.pipe';
import { AppComponentBase } from '@shared/app-component-base';
import { TimeAgoPipe } from '@shared/pipes/time-ago.pipe';
import { Nl2brPipe } from '@shared/pipes/nl2br.pipe';
import { CpfCnpjPipe } from '@shared/pipes/cpf-cnpj.pipe';

import {
    FornecedorServiceProxy,
    FornecedorDto
} from '../../../shared/service-proxies/service-proxies';

import moment from 'moment';
import { ConversaModalComponent } from '@shared/components/conversa-modal/conversa-modal.component';

@Component({
    templateUrl: './view-fornecedor-dialog.component.html',
    styleUrls: ['./view-fornecedor-dialog.component.scss'],
    standalone: true,
    imports: [
        CommonModule,
        FormsModule,
        AbpModalHeaderComponent,
        AbpModalFooterComponent,
        LocalizePipe,
        NgIf,
        DatePipe,
        TimeAgoPipe,
        Nl2brPipe,
        CpfCnpjPipe
    ]
})
export class ViewFornecedorDialogComponent extends AppComponentBase implements OnInit {
    @Output() onSave = new EventEmitter<any>();

    id: string;
    fornecedor: FornecedorDto;
    loading = false;

    constructor(
        injector: Injector,
        public _fornecedorService: FornecedorServiceProxy,
        public bsModalRef: BsModalRef,
        private cd: ChangeDetectorRef,
        // 🔥 INJETAR O MODAL SERVICE
        private _modalService: BsModalService
    ) {
        super(injector);
    }

    ngOnInit(): void {
        this.carregarFornecedor();
    }

    carregarFornecedor(): void {
        this.loading = true;
        this._fornecedorService.get(this.id).subscribe({
            next: (result) => {
                this.fornecedor = result;
                this.loading = false;
                this.cd.detectChanges();
            },
            error: (error) => {
                this.loading = false;
                this.notify.error('Erro ao carregar fornecedor');
                console.error(error);
            }
        });
    }

    formatDate(date: moment.Moment | Date | string | undefined): string {
        if (!date) return '-';
        return moment(date).format('DD/MM/YYYY HH:mm');
    }

    // Método para formatar número de telefone
    formatTelefone(telefone: any): string {
        if (!telefone || !telefone.numero) return '';

        if (telefone.internacional) {
            return `+${telefone.IDD || ''} ${telefone.numero}`;
        } else {
            return `(${telefone.DDD || ''}) ${telefone.numero}`;
        }
    }

    // Método para abrir WhatsApp
    abrirConversaWhatsApp(): void {
        if (this.fornecedor?.telefone?.numero) {
            let numero = this.fornecedor.telefone.numero.replace(/\D/g, '');

            if (this.fornecedor.telefone.ddd) {
                numero = this.fornecedor.telefone.ddd + numero;
            }

            if (this.fornecedor.telefone.internacional && this.fornecedor.telefone.idd) {
                numero = this.fornecedor.telefone.idd + numero;
            }

            window.open(`https://wa.me/${numero}`, '_blank');
        }
    }

    verMensagens(): void {
        if (!this.fornecedor?.id) {
            this.notify.warn('Fornecedor não identificado');
            return;
        }

        const modalRef = this._modalService.show(ConversaModalComponent, {
            class: 'modal-lg modal-dialog-centered',
            initialState: {
                fornecedorId: this.fornecedor.id,
                titulo: 'Conversas com Fornecedor',
                fornecedorNome: this.fornecedor.nomeFantasia || this.fornecedor.razaoSocial || 'Fornecedor'
            }
        });

        if (modalRef.content && (modalRef.content as any).onMensagensVisualizadas) {
            (modalRef.content as any).onMensagensVisualizadas.subscribe(() => {
                this.carregarFornecedor();
            });
        }
    }

    close(): void {
        this.bsModalRef.hide();
    }
}