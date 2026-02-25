import * as signalR from '@microsoft/signalr';
import { Injectable } from '@angular/core';
import { AppConsts } from '@shared/AppConsts';
import { Subject } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class NotificacaoUsuarioSignalRService {
    private connection: signalR.HubConnection;

    private novaNotificacaoSource = new Subject<any>();
    novaNotificacao$ = this.novaNotificacaoSource.asObservable();

    start(): void {
        if (this.connection) {
            return; // evita reconectar
        }

        this.connection = new signalR.HubConnectionBuilder()
            .withUrl(
                AppConsts.remoteServiceBaseUrl + '/signalr-notificacoes-usuarios',
                {
                    accessTokenFactory: () => abp.auth.getToken(),
                    transport: signalR.HttpTransportType.LongPolling
                }
            )
            .withAutomaticReconnect()
            .build();


        this.connection.on('NovaNotificacao', (data) => {
            this.novaNotificacaoSource.next(data);
        });

        this.connection
            .start()
            .then(() => console.log('✅ Conectado ao NotificacaoUsuarioHub'))
            .catch(err => console.error('Erro SignalR:', err));
    }
}
