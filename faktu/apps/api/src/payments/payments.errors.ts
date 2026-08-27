import { BadRequestException, NotFoundException } from '@nestjs/common';

export class InvoiceNotFoundForPaymentException extends NotFoundException {
  constructor(id: string) {
    super({ code: 'INVOICE_NOT_FOUND', message: `Facture ${id} introuvable.` });
  }
}

/**
 * Section 12 : un paiement supérieur au solde ne doit JAMAIS être
 * silencieusement accepté. On renvoie l'excédent pour que l'app
 * demande explicitement à l'utilisateur ce qu'il veut en faire
 * (ex : le garder en avance client). Le MVP bloque l'opération ;
 * la gestion de l'avance client est un TODO explicite (hors scope
 * du vertical slice initial).
 */
export class PaymentExceedsBalanceException extends BadRequestException {
  constructor(balanceDue: number, amount: number) {
    super({
      code: 'PAYMENT_EXCEEDS_BALANCE',
      message: `Le paiement dépasse le solde de ${amount - balanceDue} FCFA. Voulez-vous enregistrer cet excédent comme avance client ?`,
      balance_due: balanceDue,
      amount,
      excess: amount - balanceDue,
    });
  }
}
