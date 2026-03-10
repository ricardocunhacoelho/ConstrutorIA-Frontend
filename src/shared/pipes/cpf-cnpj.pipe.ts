import { Pipe, PipeTransform } from '@angular/core';

@Pipe({
    name: 'cpfCnpj',
    standalone: true
})
export class CpfCnpjPipe implements PipeTransform {
    transform(value: string | undefined): string {
        if (!value) return '-';
        
        // Remove tudo que não é número
        const numbers = value.replace(/\D/g, '');
        
        if (numbers.length === 11) {
            // CPF: 000.000.000-00
            return numbers.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
        } else if (numbers.length === 14) {
            // CNPJ: 00.000.000/0000-00
            return numbers.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, '$1.$2.$3/$4-$5');
        }
        
        // Se não for CPF nem CNPJ, retorna o valor original
        return value;
    }
}