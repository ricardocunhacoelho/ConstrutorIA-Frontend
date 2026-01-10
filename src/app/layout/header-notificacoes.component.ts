import { Component, OnInit, ChangeDetectionStrategy, OnDestroy, ChangeDetectorRef } from "@angular/core";
import { NotificacaoUsuarioSignalRService } from "../services/notificacao-usuario-signalr.service";
import { NotificacaoUsuarioServiceProxy } from "../../shared/service-proxies/service-proxies";
import { Subject, takeUntil } from 'rxjs';
import { BsDropdownDirective, BsDropdownToggleDirective, BsDropdownMenuDirective } from 'ngx-bootstrap/dropdown';
import { RouterLink } from '@angular/router';
import { LocalizePipe } from "../../shared/pipes/localize.pipe";
import { NgIf, NgFor, DatePipe } from '@angular/common';

@Component({
  selector: 'header-notificacoes',
  templateUrl: './header-notificacoes.component.html',
  styleUrls: ['./header-notificacoes.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  standalone: true,
  imports: [BsDropdownDirective, BsDropdownToggleDirective, BsDropdownMenuDirective, RouterLink, LocalizePipe, NgIf, NgFor, DatePipe],
})
export class HeaderNotificacoesComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();

  notificacoes: any[] = [];
  naoLidas = 0;
  aberto = false;

  constructor(
    private notificacaoSignalR: NotificacaoUsuarioSignalRService,
    private notificacaoService: NotificacaoUsuarioServiceProxy,
    private cd: ChangeDetectorRef
  ) { }

  ngOnInit(): void {
    this.carregarNotificacoes();

    this.notificacaoSignalR.novaNotificacao$
      .pipe(takeUntil(this.destroy$))
      .subscribe(n => {
        this.notificacoes.unshift(n);
        if (!n.lida) {
          this.naoLidas++;
          this.cd.detectChanges();
        }
      });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  carregarNotificacoes() {
    this.notificacaoService.getByUser().subscribe(res => {
      this.notificacoes = res.items;
      this.naoLidas = this.notificacoes.filter(n => !n.lida).length;
      this.cd.detectChanges();
    });
  }

  abrirNotificacao(n: any) {
    if (!n.lida) {
      n.lida = true;
      this.naoLidas--;

      this.notificacaoService.marcarComoLida(n).subscribe();
    }

    // aqui você pode redirecionar
    // ex: this.router.navigate(...)
  }

  toggleDropdown() {
    this.aberto = !this.aberto;
  }
}
