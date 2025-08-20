import { NgModule } from '@angular/core';
import { SharedModule } from '@shared/shared.module';
import { CreateSolicitacaoMaterialDialogComponent } from './create-solicitacao-material/create-solicitacao-material-dialog.component';
import { EditSolicitacaoMaterialDialogComponent } from './edit-solicitacao-material/edit-solicitacao-material-dialog.component';
import { SolicitacoesMateriaisRoutingModule } from './solicitacoes-materiais-routing.module';
import { SolicitacoesMateriaisComponent } from './solicitacoes-materiais.component';
import { CommonModule } from '@angular/common';

@NgModule({
    imports: [
        SharedModule,
        SolicitacoesMateriaisRoutingModule,
        CommonModule,
        SolicitacoesMateriaisComponent,
        CreateSolicitacaoMaterialDialogComponent,
        EditSolicitacaoMaterialDialogComponent,
    ],
})
export class SolicitacoesMateriaisModule {}
