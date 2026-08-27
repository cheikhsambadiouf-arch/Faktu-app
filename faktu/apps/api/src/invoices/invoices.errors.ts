import { ConflictException, NotFoundException } from '@nestjs/common';

/**
 * Erreurs métier spécifiques à la boucle de facturation.
 * Principe non négociable #1 : "Ne jamais inventer."
 * Ces exceptions renvoient toujours les options réelles (candidats)
 * plutôt qu'un choix arbitraire, pour que le client (app mobile / IA)
 * puisse redemander confirmation à l'utilisateur — voir section 6
 * "Gestion des ambiguïtés" du prompt maître.
 */

export class AmbiguousCustomerException extends ConflictException {
  constructor(candidates: any[]) {
    super({
      code: 'AMBIGUOUS_CUSTOMER',
      message: `J'ai trouvé plusieurs clients correspondants. Lequel choisissez-vous ?`,
      candidates,
    });
  }
}

export class CustomerNotFoundException extends NotFoundException {
  constructor(query: string) {
    super({
      code: 'CUSTOMER_NOT_FOUND',
      message: `Aucun client trouvé pour "${query}". Voulez-vous le créer ?`,
    });
  }
}

export class AmbiguousProductException extends ConflictException {
  constructor(query: string, candidates: any[]) {
    super({
      code: 'AMBIGUOUS_PRODUCT',
      message: `J'ai trouvé plusieurs produits pour "${query}". Lequel choisissez-vous ?`,
      candidates,
    });
  }
}

export class ProductNotFoundException extends NotFoundException {
  constructor(query: string) {
    super({
      code: 'PRODUCT_NOT_FOUND',
      message: `Aucun produit trouvé pour "${query}".`,
    });
  }
}

export class InsufficientStockException extends ConflictException {
  constructor(productName: string, available: number, requested: number) {
    super({
      code: 'INSUFFICIENT_STOCK',
      message: `Il reste seulement ${available} ${productName} alors que vous en demandez ${requested}.`,
      available,
      requested,
    });
  }
}

export class InvoiceNotPendingException extends ConflictException {
  constructor(status: string) {
    super({
      code: 'INVOICE_NOT_PENDING',
      message: `Cette facture n'est plus en attente de confirmation (statut actuel : ${status}).`,
    });
  }
}
