import { Component, OnInit, OnDestroy, ChangeDetectionStrategy, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Subject, takeUntil } from 'rxjs';

import { BsModalService, BsModalRef } from 'ngx-bootstrap/modal';
import { BsDropdownModule } from 'ngx-bootstrap/dropdown';
import { Router } from '@angular/router';

import { NotificacaoUsuarioSignalRService } from '../services/notificacao-usuario-signalr.service';
import {
  NotificacaoUsuarioServiceProxy,
  EnumServiceProxy,
  EnumValueDto
} from '../../shared/service-proxies/service-proxies';
import { CotacoesListDialogComponent } from '@app/cotacoes/list-cotacoes/list-cotacoes-dialog.component';
import { TimeAgoPipe } from '@shared/pipes/time-ago.pipe';
import { ViewTarefaInternaDialogComponent } from '@app/tarefas-internas/view-tarefa-interna/view-tarefa-interna-dialog.component';

@Component({
  selector: 'header-notificacoes',
  standalone: true,
  imports: [
    CommonModule,
    BsDropdownModule,
    TimeAgoPipe
  ],
  templateUrl: './header-notificacoes.component.html',
  styleUrls: ['./header-notificacoes.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class HeaderNotificacoesComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();
  private modalRef?: BsModalRef;

  notificacoes: any[] = [];
  naoLidas = 0;
  aberto = false;

  // Enums carregados dinamicamente
  tiposNotificacao: EnumValueDto[] = [];

  // 🔥 MAPEAMENTO POR NOME (string) em vez de número
  private iconeMap: Record<string, string> = {};
  private classeMap: Record<string, string> = {};
  private descricaoMap: Record<string, string> = {};

  // Cache de configurações por tipo (usando nome)
  private configuracaoTipo: Record<string, {
    acao: 'modal' | 'rota' | 'nenhuma',
    rota?: string
  }> = {};

  constructor(
    private notificacaoSignalR: NotificacaoUsuarioSignalRService,
    private notificacaoService: NotificacaoUsuarioServiceProxy,
    private enumService: EnumServiceProxy,
    private modalService: BsModalService,
    private router: Router,
    private cdr: ChangeDetectorRef
  ) { }

  ngOnInit(): void {
    this.carregarEnums();
    this.carregarNotificacoes();

    // Ouvir novas notificações via SignalR
    this.notificacaoSignalR.novaNotificacao$
      .pipe(takeUntil(this.destroy$))
      .subscribe(notificacao => {
        this.adicionarNotificacao(notificacao);
      });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  carregarEnums(): void {
    this.enumService.getNotificacaoOrigemTipo().subscribe({
      next: (tipos) => {
        this.tiposNotificacao = tipos;

        tipos.forEach(tipo => {
          const nome = tipo.name;
          const nomeLower = nome.toLowerCase();

          this.iconeMap[nome] = this.getIconePorNome(nomeLower);
          this.classeMap[nome] = this.getClassePorNome(nomeLower);
          this.descricaoMap[nome] = tipo.description || this.formatarNome(nome);
          this.configuracaoTipo[nome] = this.getConfiguracaoPorNome(nomeLower, tipo.value);
        });

        this.cdr.detectChanges();
      },
      error: (error) => {
        console.error('Erro ao carregar enums:', error);
        this.configurarFallbackEnums();
      }
    });
  }

  private getIconePorNome(nomeLower: string): string {
    if (nomeLower.includes('intervencao')) return 'fa-exclamation-triangle';
    if (nomeLower.includes('compra')) return 'fa-shopping-cart';
    if (nomeLower.includes('pedido')) return 'fa-file-invoice';
    if (nomeLower.includes('sistema')) return 'fa-cog';
    if (nomeLower.includes('aprovacao')) return 'fa-check-circle';
    if (nomeLower.includes('cancelamento')) return 'fa-times-circle';
    if (nomeLower.includes('tarefainterna')) return 'fa-tasks';

    return 'fa-bell';
  }

  private getClassePorNome(nomeLower: string): string {
    if (nomeLower.includes('intervencao')) return 'intervencao';
    if (nomeLower.includes('compra')) return 'compra';
    if (nomeLower.includes('pedido')) return 'pedido';
    if (nomeLower.includes('sistema')) return 'sistema';
    if (nomeLower.includes('aprovacao')) return 'aprovacao';
    if (nomeLower.includes('cancelamento')) return 'cancelamento';
    if (nomeLower.includes('tarefainterna')) return 'tarefainterna';

    return 'sistema';
  }

  private getConfiguracaoPorNome(nomeLower: string, valor: number): { acao: 'modal' | 'rota' | 'nenhuma', rota?: string } {
    // Tipos que abrem modal de cotações
    if (nomeLower.includes('intervencao') ||
      nomeLower.includes('compra') ||
      nomeLower.includes('pedido')) {
      return { acao: 'modal' };
    }

    if (nomeLower.includes('tarefainterna')) {
      return { acao: 'modal' };
    }

    if (nomeLower.includes('aprovacao')) {
      return { acao: 'rota', rota: '/app/aprovacoes' };
    }

    if (nomeLower.includes('financeiro')) {
      return { acao: 'rota', rota: '/app/financeiro' };
    }

    // Padrão: não faz nada
    return { acao: 'nenhuma' };
  }

  private formatarNome(nome: string): string {
    // Converte "NomeDoEnum" para "Nome Do Enum"
    return nome.replace(/([A-Z])/g, ' $1').trim();
  }

  private configurarFallbackEnums(): void {
    // Fallback caso a API de enums falhe
    const fallbackConfig = [
      { name: 'IntervencaoCompra', desc: 'Intervenção', icone: 'fa-exclamation-triangle', classe: 'intervencao' },
      { name: 'Compra', desc: 'Compra', icone: 'fa-shopping-cart', classe: 'compra' },
      { name: 'Pedido', desc: 'Pedido', icone: 'fa-file-invoice', classe: 'pedido' },
      { name: 'Sistema', desc: 'Sistema', icone: 'fa-cog', classe: 'sistema' },
      { name: 'TarefaInterna', desc: 'Tarefa Interna', icone: 'fa-tasks', classe: 'tarefainterna' }
    ];

    fallbackConfig.forEach(item => {
      this.iconeMap[item.name] = item.icone;
      this.classeMap[item.name] = item.classe;
      this.descricaoMap[item.name] = item.desc;

      if (item.name.includes('Intervencao') || item.name.includes('Compra') || item.name.includes('Pedido')) {
        this.configuracaoTipo[item.name] = { acao: 'modal' };
      } else if (item.name.includes('TarefaInterna')) {
        this.configuracaoTipo[item.name] = { acao: 'modal' };
      } else {
        this.configuracaoTipo[item.name] = { acao: 'nenhuma' };
      }
    });
  }

  carregarNotificacoes(): void {
    this.notificacaoService.getByUser().subscribe({
      next: (result) => {
        this.notificacoes = result.items;
        this.atualizarContadorNaoLidas();
        this.cdr.detectChanges();
      },
      error: (error) => {
        console.error('Erro ao carregar notificações:', error);
      }
    });
  }

  abrirNotificacao(notificacao: any): void {
    // Marcar como lida se não estiver
    if (!notificacao.lida) {
      this.marcarComoLida(notificacao);
    }

    // Fechar dropdown
    this.aberto = false;

    // Executar ação baseada no tipo
    this.executarAcao(notificacao);
  }

  private executarAcao(notificacao: any): void {
    const tipo = notificacao.origemTipo as string;
    const origemId = notificacao.origemId;
    const config = this.configuracaoTipo[tipo] || { acao: 'nenhuma' };

    switch (config.acao) {
      case 'modal':
        if (tipo.toLowerCase().includes('tarefainterna')) {
          this.abrirModalTarefaInterna(origemId);
        } else {
          this.abrirModalCotacoes(origemId);
        }
        break;

      case 'rota':
        if (config.rota) {
          if (tipo.toLowerCase().includes('tarefainterna') && origemId) {
            this.router.navigate([config.rota, origemId]);
          } else {
            this.router.navigate([config.rota]);
          }
        }
        break;

      case 'nenhuma':
      default:
        console.log('Notificação sem ação definida:', notificacao);
        break;
    }
  }

  private abrirModalCotacoes(solicitacaoId: string): void {
    // Fechar modal anterior se existir
    if (this.modalRef) {
      this.modalRef.hide();
    }

    this.modalRef = this.modalService.show(
      CotacoesListDialogComponent,
      {
        class: 'modal-xl modal-dialog-centered',
        initialState: {
          solicitacaoId: solicitacaoId
        },
        backdrop: 'static',
        keyboard: false
      }
    );

    // Atualizar lista quando salvar
    if (this.modalRef.content) {
      (this.modalRef.content as any).onSave?.subscribe(() => {
        this.carregarNotificacoes();
      });
    }
  }

  private abrirModalTarefaInterna(tarefaId: string): void {
    if (this.modalRef) {
      this.modalRef.hide();
    }

    this.modalRef = this.modalService.show(
      ViewTarefaInternaDialogComponent,
      {
        class: 'modal-lg',
        initialState: {
          id: tarefaId
        },
        backdrop: 'static',
        keyboard: false
      }
    );

    if (this.modalRef.content) {
      (this.modalRef.content as any).onSave?.subscribe(() => {
        this.carregarNotificacoes();
      });
    }
  }

  private marcarComoLida(notificacao: any): void {
    this.notificacaoService.marcarComoLida(notificacao.id).subscribe({
      next: () => {
        notificacao.lida = true;
        this.atualizarContadorNaoLidas();
        this.cdr.detectChanges();
      },
      error: (error) => {
        console.error('Erro ao marcar notificação como lida:', error);
      }
    });
  }

  marcarTodasComoLidas(): void {
    const naoLidas = this.notificacoes.filter(n => !n.lida);

    if (naoLidas.length === 0) return;

    // Marcar todas otimisticamente
    naoLidas.forEach(n => n.lida = true);
    this.atualizarContadorNaoLidas();
    this.cdr.detectChanges();

    // Chamar API
    this.notificacaoService.marcarTodasComoLidas().subscribe({
      error: (error) => {
        console.error('Erro ao marcar todas como lidas:', error);
        // Reverter em caso de erro
        this.carregarNotificacoes();
      }
    });
  }

  verTodas(): void {
    this.aberto = false;
    this.router.navigate(['/app/notificacoes']);
  }

  private adicionarNotificacao(notificacao: any): void {
    this.notificacoes.unshift(notificacao);

    if (!notificacao.lida) {
      this.naoLidas++;

      // Mostrar notificação toast
      this.mostrarToastNotificacao(notificacao);
    }

    // Limitar número de notificações na lista
    if (this.notificacoes.length > 50) {
      this.notificacoes = this.notificacoes.slice(0, 50);
    }

    this.cdr.detectChanges();
  }

  private mostrarToastNotificacao(notificacao: any): void {
    const tipo = this.getTipoDescricao(notificacao.origemTipo);
    abp.notify.info(
      notificacao.titulo,
      `Nova ${tipo}`,
      { timeOut: 5000 }
    );
  }

  private atualizarContadorNaoLidas(): void {
    this.naoLidas = this.notificacoes.filter(n => !n.lida).length;
  }

  // 🔥 MÉTODOS ATUALIZADOS para trabalhar com string
  getIcone(tipo: string): string {
    return this.iconeMap[tipo] || 'fa-bell';
  }

  getIconeClasse(tipo: string): string {
    return this.classeMap[tipo] || 'sistema';
  }

  getBadgeClasse(tipo: string): string {
    return this.getIconeClasse(tipo);
  }

  getTipoDescricao(tipo: string): string {
    return this.descricaoMap[tipo] || this.formatarNome(tipo);
  }

  getNomeEnum(tipo: string): string {
    return tipo || 'Desconhecido';
  }

  toggleDropdown(): void {
    this.aberto = !this.aberto;
  }
}