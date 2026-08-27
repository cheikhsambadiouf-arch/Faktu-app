/// Reflète la réponse de POST /api/v1/invoices/preview.
/// Aucune écriture définitive n'a eu lieu côté serveur à ce stade
/// (section 5 du prompt maître) — c'est pourquoi ce modèle porte
/// explicitement `requiresConfirmation`.
class InvoicePreview {
  final String previewId;
  final String customerName;
  final List<InvoicePreviewItem> items;
  final num total;
  final bool requiresConfirmation;

  InvoicePreview({
    required this.previewId,
    required this.customerName,
    required this.items,
    required this.total,
    required this.requiresConfirmation,
  });

  factory InvoicePreview.fromJson(Map<String, dynamic> json) {
    return InvoicePreview(
      previewId: json['preview_id'] as String,
      customerName: (json['customer']?['name'] ?? '') as String,
      items: (json['items'] as List)
          .map((e) => InvoicePreviewItem.fromJson(e as Map<String, dynamic>))
          .toList(),
      total: json['total'] as num,
      requiresConfirmation: json['requires_confirmation'] as bool? ?? true,
    );
  }
}

class InvoicePreviewItem {
  final String description;
  final num quantity;
  final num unitPrice;

  InvoicePreviewItem({required this.description, required this.quantity, required this.unitPrice});

  factory InvoicePreviewItem.fromJson(Map<String, dynamic> json) {
    return InvoicePreviewItem(
      description: json['description'] as String,
      quantity: json['quantity'] as num,
      unitPrice: json['unit_price'] as num,
    );
  }
}
