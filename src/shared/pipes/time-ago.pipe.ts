// time-ago.pipe.ts
import { Pipe, PipeTransform } from '@angular/core';

@Pipe({
  name: 'timeAgo',
  standalone: true
})
export class TimeAgoPipe implements PipeTransform {
  transform(value: string | Date): string {
    if (!value) return '';

    const date = new Date(value);
    const now = new Date();
    const seconds = Math.floor((now.getTime() - date.getTime()) / 1000);

    if (seconds < 60) {
      return 'agora mesmo';
    }

    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) {
      return `${minutes} ${minutes === 1 ? 'minuto' : 'minutos'} atrás`;
    }

    const hours = Math.floor(minutes / 60);
    if (hours < 24) {
      return `${hours} ${hours === 1 ? 'hora' : 'horas'} atrás`;
    }

    const days = Math.floor(hours / 24);
    if (days < 30) {
      return `${days} ${days === 1 ? 'dia' : 'dias'} atrás`;
    }

    const months = Math.floor(days / 30);
    if (months < 12) {
      return `${months} ${months === 1 ? 'mês' : 'meses'} atrás`;
    }

    const years = Math.floor(months / 12);
    return `${years} ${years === 1 ? 'ano' : 'anos'} atrás`;
  }
}