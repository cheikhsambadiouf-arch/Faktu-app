export type FaktuIntent =
  | 'CREATE_CUSTOMER'
  | 'CREATE_PRODUCT'
  | 'CREATE_INVOICE'
  | 'SEARCH_INVOICE'
  | 'RECORD_PAYMENT'
  | 'CREATE_EXPENSE'
  | 'CREATE_PURCHASE'
  | 'GET_REPORT'
  | 'GET_CUSTOMER_BALANCE'
  | 'GET_SUPPLIER_BALANCE'
  | 'UNKNOWN';

export interface InterpretedIntent {
  intent: FaktuIntent;
  confidence: number; // 0..1
  requires_clarification: boolean;
  clarification_question?: string;
  entities: Record<string, any>;
  source: 'llm' | 'fallback_rules'; // pour audit : quel moteur a répondu
}
