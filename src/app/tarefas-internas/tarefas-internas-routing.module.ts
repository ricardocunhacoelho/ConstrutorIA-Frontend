import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { TarefasInternasComponent } from './tarefas-internas.component';

const routes: Routes = [
  {
    path: '',
    component: TarefasInternasComponent,
    pathMatch: 'full',
  },
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class TarefasInternasRoutingModule {}
