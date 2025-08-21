import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { ProblemasImpedimentosComponent } from './problemas-impedimentos.component';

const routes: Routes = [
    {
        path: '',
        component: ProblemasImpedimentosComponent,
        pathMatch: 'full',
    },
];

@NgModule({
    imports: [RouterModule.forChild(routes)],
    exports: [RouterModule],
})
export class ProblemasImpedimentosRoutingModule {}
