import { createParamDecorator, ExecutionContext, BadRequestException } from '@nestjs/common';

/**
 * FAKTU isole toutes les données par business_id (multi-tenant).
 * Pour ce vertical slice (sans auth complète), le business_id est lu
 * depuis un header explicite. Quand l'authentification (FAKTU-003)
 * sera branchée, ce décorateur lira le business_id depuis le token
 * JWT plutôt que depuis un header — c'est un TODO volontaire.
 */
export const BusinessId = createParamDecorator(
  (_: unknown, ctx: ExecutionContext): string => {
    const request = ctx.switchToHttp().getRequest();
    const businessId = request.headers['x-business-id'];
    if (!businessId) {
      throw new BadRequestException('Header x-business-id requis');
    }
    return businessId;
  },
);
