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
import { EncarregadoComObraDto, SolicitacaoMaterialServiceProxy, UpdateMaterialSolicitadoDto } from '../../../shared/service-proxies/service-proxies';
import { SolicitacaoMaterialStatus, UpdateSolicitacaoMaterialDto } from '../../../shared/service-proxies/service-proxies';
import { forkJoin } from 'rxjs';

@Component({
    templateUrl: './edit-solicitacao-material-dialog.component.html',
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
export class EditSolicitacaoMaterialDialogComponent extends AppComponentBase implements OnInit {
    @Output() onSave = new EventEmitter<any>();

    saving = false;
    solicitacao = new UpdateSolicitacaoMaterialDto();
    materiais: UpdateMaterialSolicitadoDto[] = [];
    resolucao = '';
    id?: string;

    encarregadosComObras: EncarregadoComObraDto[] = [];
    selectedEncarregado?: EncarregadoComObraDto;

    constructor(
        injector: Injector,
        public _solicitacaoService: SolicitacaoMaterialServiceProxy,
        public bsModalRef: BsModalRef,
        private cd: ChangeDetectorRef
    ) {
        super(injector);
    }


    ngOnInit(): void {
        if (this.id) {
            forkJoin([
                this._solicitacaoService.get(this.id),
                this._solicitacaoService.getEncarregadosComObras()
            ]).subscribe(([solicitacao, encarregados]) => {
                this.solicitacao = UpdateSolicitacaoMaterialDto.fromJS(solicitacao);
                this.materiais = (this.solicitacao.materiaisSolicitados ?? [])
                    .map(m => UpdateMaterialSolicitadoDto.fromJS(m));
                this.resolucao = this.solicitacao.resolucao ?? '';

                this.encarregadosComObras = encarregados;

                if (this.solicitacao.encarregado) {
                    this.selectedEncarregado = this.encarregadosComObras
                        .find(e => e.id === this.solicitacao.encarregado!.id);
                }

                this.cd.detectChanges();
            });
        } else {
            this.loadEncarregadosComObras();
        }
    }


    loadEncarregadosComObras() {
        this._solicitacaoService.getEncarregadosComObras().subscribe(result => {
            this.encarregadosComObras = result;
        });
    }


    onEncarregadoChange() {
        if (this.selectedEncarregado) {
            this.solicitacao.encarregado = undefined;
            this.solicitacao.obra = undefined;
            this.solicitacao.encarregadoId = this.selectedEncarregado.id;
            this.solicitacao.obraId = this.selectedEncarregado.obraId;
        }
    }


    fecharSolicitacao(): void {
        if (!this.resolucao || this.resolucao.trim() === '') {
            this.notify.error('Informe a resolução antes de fechar a solicitação.');
            return;
        }

        this.solicitacao.resolucao = this.resolucao;
        this.solicitacao.status = SolicitacaoMaterialStatus.CONCLUIDA;

        this._solicitacaoService.update(this.solicitacao).subscribe(() => {
            this.notify.info(this.l('SolicitacaoFechadaComSucesso'));
            this.bsModalRef.hide();
            this.onSave.emit();
        });
    }

    save(): void {
        this.solicitacao.materiaisSolicitados = this.materiais;
        this._solicitacaoService.update(this.solicitacao).subscribe(() => {
            this.notify.info(this.l('SavedSuccessfully'));
            this.bsModalRef.hide();
            this.onSave.emit();
        }, () => {
            this.saving = false;
        });
    }

    adicionarMaterial() {
        this.materiais.push(new UpdateMaterialSolicitadoDto());
    }

    removerMaterial(index: number) {
        this.materiais.splice(index, 1);
    }
}
