import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { SharedModule } from '@shared/shared.module';
import { TarefasInternasRoutingModule } from './tarefas-internas-routing.module';
import { TarefasInternasComponent } from './tarefas-internas.component';
import { CreateTarefaInternaDialogComponent } from './create-tarefa-interna/create-tarefa-interna-dialog.component';
import { EditTarefaInternaDialogComponent } from './edit-tarefa-interna/edit-tarefa-interna-dialog.component';
import { ViewTarefaInternaDialogComponent } from './view-tarefa-interna/view-tarefa-interna-dialog.component';

@NgModule({
    imports: [
        SharedModule,
        TarefasInternasRoutingModule,
        CommonModule,
        TarefasInternasComponent,
        CreateTarefaInternaDialogComponent,
        EditTarefaInternaDialogComponent,
        ViewTarefaInternaDialogComponent
    ],
})
export class TarefasInternasModule {}
