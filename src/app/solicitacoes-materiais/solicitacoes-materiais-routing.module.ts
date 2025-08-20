import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { SolicitacoesMateriaisComponent } from './solicitacoes-materiais.component';

const routes: Routes = [
    {
        path: '',
        component: SolicitacoesMateriaisComponent,
        pathMatch: 'full',
    },
];

@NgModule({
    imports: [RouterModule.forChild(routes)],
    exports: [RouterModule],
})
export class SolicitacoesMateriaisRoutingModule {}
