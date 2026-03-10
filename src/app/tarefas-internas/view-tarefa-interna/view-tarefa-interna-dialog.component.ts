import { Component, Injector, OnInit, EventEmitter, Output, ChangeDetectorRef } from '@angular/core';
import { BsModalRef } from 'ngx-bootstrap/modal';
import { FormsModule } from '@angular/forms';
import { CommonModule, NgIf, DatePipe } from '@angular/common';
import { TabsetComponent, TabDirective } from 'ngx-bootstrap/tabs';
import { AbpModalHeaderComponent } from '../../../shared/components/modal/abp-modal-header.component';
import { AbpModalFooterComponent } from '../../../shared/components/modal/abp-modal-footer.component';
import { LocalizePipe } from '@shared/pipes/localize.pipe';
import { AppComponentBase } from '@shared/app-component-base';
import { TimeAgoPipe } from '@shared/pipes/time-ago.pipe';

import {
    TarefaInternaServiceProxy,
    TarefaInternaDto,
    TarefaStatus,
    UpdateTarefaInternaDto
} from '../../../shared/service-proxies/service-proxies';

import moment from 'moment';

@Component({
    templateUrl: './view-tarefa-interna-dialog.component.html',
    styleUrls: ['./view-tarefa-interna-dialog.component.scss'],
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
        TimeAgoPipe
    ]
})
export class ViewTarefaInternaDialogComponent extends AppComponentBase implements OnInit {
    @Output() onSave = new EventEmitter<any>();

    id: string;
    tarefa: TarefaInternaDto;
    loading = false;
    editMode = false;
    TarefaStatus = TarefaStatus;

    // Para edição
    observacoes: string = '';
    resolucao: string = '';

    descricaoExpandida = false;
    isDescricaoLonga = false;
    private readonly DESCRICAO_LIMITE = 200;

    constructor(
        injector: Injector,
        public _tarefaService: TarefaInternaServiceProxy,
        public bsModalRef: BsModalRef,
        private cd: ChangeDetectorRef
    ) {
        super(injector);
    }

    ngOnInit(): void {
        this.carregarTarefa();
    }

    carregarTarefa(): void {
        this.loading = true;
        this._tarefaService.get(this.id).subscribe({
            next: (result) => {
                this.tarefa = result;
                this.observacoes = result.observacoes || '';
                this.resolucao = result.resolucao || '';
                this.verificarDescricaoLonga();
                this.loading = false;
                this.cd.detectChanges();
            },
            error: (error) => {
                this.loading = false;
                this.notify.error('Erro ao carregar tarefa');
                console.error(error);
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
            this.cd.detectChanges();
        }, 10);
    }

    getStatusClass(status: TarefaStatus): string {
        switch (status) {
            case TarefaStatus.PENDENTE:
                return 'status-pendente';
            case TarefaStatus.FINALIZADA:
                return 'status-finalizada';
            default:
                return '';
        }
    }

    getStatusIcon(status: TarefaStatus): string {
        switch (status) {
            case TarefaStatus.PENDENTE:
                return 'fa-clock';
            case TarefaStatus.FINALIZADA:
                return 'fa-check-circle';
            default:
                return 'fa-question-circle';
        }
    }

    getStatusText(status: TarefaStatus): string {
        switch (status) {
            case TarefaStatus.PENDENTE:
                return 'Pendente';
            case TarefaStatus.FINALIZADA:
                return 'Finalizada';
            default:
                return 'Desconhecido';
        }
    }

    toggleEditMode(): void {
        this.editMode = !this.editMode;
    }

    salvarAlteracoes(): void {
        const updateDto = new UpdateTarefaInternaDto();
        updateDto.id = this.tarefa.id;
        updateDto.descricao = this.tarefa.descricao;
        updateDto.responsavelNome = this.tarefa.responsavelNome;
        updateDto.responsavelEmail = this.tarefa.responsavelEmail;
        updateDto.status = this.tarefa.status;
        updateDto.dataPrevistaFinalizacao = this.tarefa.dataPrevistaFinalizacao;
        updateDto.dataFinalizacao = this.tarefa.dataFinalizacao;
        updateDto.observacoes = this.observacoes;
        updateDto.resolucao = this.resolucao;
        updateDto.obraId = this.tarefa.obraId;
        updateDto.userId = this.tarefa.userId;

        this._tarefaService.update(updateDto).subscribe({
            next: () => {
                this.notify.success('Tarefa atualizada com sucesso');
                this.editMode = false;
                this.carregarTarefa();
                this.onSave.emit();
            },
            error: (error) => {
                this.notify.error('Erro ao atualizar tarefa');
                console.error(error);
            }
        });
    }

    finalizarTarefa(): void {
        if (!this.resolucao || this.resolucao.trim() === '') {
            this.notify.warn('Informe a resolução da tarefa antes de finalizar');
            return;
        }

        abp.message.confirm(
            'Deseja realmente finalizar esta tarefa?',
            'Confirmar finalização',
            (result: boolean) => {
                if (result) {
                    const updateDto = new UpdateTarefaInternaDto();
                    updateDto.id = this.tarefa.id;
                    updateDto.descricao = this.tarefa.descricao;
                    updateDto.responsavelNome = this.tarefa.responsavelNome;
                    updateDto.responsavelEmail = this.tarefa.responsavelEmail;
                    updateDto.status = TarefaStatus.FINALIZADA;
                    updateDto.dataPrevistaFinalizacao = this.tarefa.dataPrevistaFinalizacao;
                    updateDto.dataFinalizacao = moment();
                    updateDto.observacoes = this.observacoes;
                    updateDto.resolucao = this.resolucao;
                    updateDto.obraId = this.tarefa.obraId;
                    updateDto.userId = this.tarefa.userId;

                    this._tarefaService.update(updateDto).subscribe({
                        next: () => {
                            this.notify.success('Tarefa finalizada com sucesso');
                            this.editMode = false;
                            this.carregarTarefa();
                            this.onSave.emit();
                        },
                        error: (error) => {
                            this.notify.error('Erro ao finalizar tarefa');
                            console.error(error);
                        }
                    });
                }
            }
        );
    }

    reabrirTarefa(): void {
        abp.message.confirm(
            'Deseja realmente reabrir esta tarefa?',
            'Confirmar reabertura',
            (result: boolean) => {
                if (result) {
                    const updateDto = new UpdateTarefaInternaDto();
                    updateDto.id = this.tarefa.id;
                    updateDto.descricao = this.tarefa.descricao;
                    updateDto.responsavelNome = this.tarefa.responsavelNome;
                    updateDto.responsavelEmail = this.tarefa.responsavelEmail;
                    updateDto.status = TarefaStatus.PENDENTE;
                    updateDto.dataPrevistaFinalizacao = this.tarefa.dataPrevistaFinalizacao;
                    updateDto.dataFinalizacao = undefined; // ou null, mas undefined é mais seguro
                    updateDto.observacoes = this.observacoes;
                    updateDto.resolucao = this.resolucao;
                    updateDto.obraId = this.tarefa.obraId;
                    updateDto.userId = this.tarefa.userId;

                    this._tarefaService.update(updateDto).subscribe({
                        next: () => {
                            this.notify.success('Tarefa reaberta com sucesso');
                            this.editMode = false;
                            this.carregarTarefa();
                            this.onSave.emit();
                        },
                        error: (error) => {
                            this.notify.error('Erro ao reabrir tarefa');
                            console.error(error);
                        }
                    });
                }
            }
        );
    }

    close(): void {
        this.bsModalRef.hide();
    }
}