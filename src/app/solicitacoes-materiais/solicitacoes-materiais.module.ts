import { NgModule } from '@angular/core';
import { SharedModule } from '@shared/shared.module';
import { CreateSolicitacaoMaterialDialogComponent } from './create-solicitacao-material/create-solicitacao-material-dialog.component';
import { EditSolicitacaoMaterialDialogComponent } from './edit-solicitacao-material/edit-solicitacao-material-dialog.component';
import { SolicitacoesMateriaisRoutingModule } from './solicitacoes-materiais-routing.module';
import { SolicitacoesMateriaisComponent } from './solicitacoes-materiais.component';
import { CreateCotacaoDialogComponent } from './../cotacoes/create-cotacao/create-cotacao-dialog.component';
import { CotacoesListDialogComponent } from './../cotacoes/list-cotacoes/list-cotacoes-dialog.component';
import { SelecionarEnderecoDialogComponent } from '../cotacoes/list-cotacoes/selecionar-endereco-dialog/selecionar-endereco-dialog.component';
import { CommonModule } from '@angular/common';

@NgModule({
    imports: [
        SharedModule,
        SolicitacoesMateriaisRoutingModule,
        CommonModule,
        SolicitacoesMateriaisComponent,
        CreateSolicitacaoMaterialDialogComponent,
        EditSolicitacaoMaterialDialogComponent,
        CreateCotacaoDialogComponent,
        CotacoesListDialogComponent,
        SelecionarEnderecoDialogComponent
    ],
})
export class SolicitacoesMateriaisModule { }
