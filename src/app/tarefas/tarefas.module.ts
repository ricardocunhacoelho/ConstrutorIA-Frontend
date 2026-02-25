import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { SharedModule } from '@shared/shared.module';
import { CreateTarefaDialogComponent } from './create-tarefa/create-tarefa-dialog.component';
import { EditTarefaDialogComponent } from './edit-tarefa/edit-tarefa-dialog.component';
import { TarefasRoutingModule } from './tarefas-routing.module';
import { TarefasComponent } from './tarefas.component';

@NgModule({
    imports: [
        SharedModule,
        TarefasRoutingModule,
        CommonModule,
        TarefasComponent,
        CreateTarefaDialogComponent,
        EditTarefaDialogComponent,
    ],
})
export class TarefasModule {}
