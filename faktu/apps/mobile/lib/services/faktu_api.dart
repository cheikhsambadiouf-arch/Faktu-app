import 'dart:convert';
import 'package:http/http.dart' as http;
import '../models/invoice_preview.dart';

/// Client HTTP vers l'API FAKTU (apps/api).
/// businessId est transmis en header pour le MVP (avant que
/// l'authentification complète — FAKTU-003 — soit branchée).
class FaktuApi {
  final String baseUrl;
  final String businessId;

  FaktuApi({required this.baseUrl, required this.businessId});

  Map<String, String> get _headers => {
        'Content-Type': 'application/json',
        'x-business-id': businessId,
      };

  Future<InvoicePreview> previewInvoice({
    required String customerQuery,
    required String productQuery,
    required num quantity,
    num? unitPrice,
    int? dueInDays,
  }) async {
    final response = await http.post(
      Uri.parse('$baseUrl/invoices/preview'),
      headers: _headers,
      body: jsonEncode({
        'customer_query': customerQuery,
        'items': [
          {
            'product_query': productQuery,
            'quantity': quantity,
            if (unitPrice != null) 'unit_price': unitPrice,
          }
        ],
        if (dueInDays != null) 'due_in_days': dueInDays,
      }),
    );

    if (response.statusCode >= 400) {
      throw FaktuApiException(response.statusCode, response.body);
    }
    return InvoicePreview.fromJson(jsonDecode(response.body) as Map<String, dynamic>);
  }

  Future<Map<String, dynamic>> confirmInvoice({
    required String previewId,
    required bool confirmation,
  }) async {
    final response = await http.post(
      Uri.parse('$baseUrl/invoices'),
      headers: _headers,
      body: jsonEncode({'preview_id': previewId, 'confirmation': confirmation}),
    );
    if (response.statusCode >= 400) {
      throw FaktuApiException(response.statusCode, response.body);
    }
    return jsonDecode(response.body) as Map<String, dynamic>;
  }

  /// Point d'entrée unique de la boucle vocale : transcript -> intention
  /// -> (preview si CREATE_INVOICE) OU question de clarification.
  /// Voir apps/api/src/assistant/assistant.controller.ts.
  Future<Map<String, dynamic>> runAssistantCommand(String transcript) async {
    final response = await http.post(
      Uri.parse('$baseUrl/assistant/command'),
      headers: _headers,
      body: jsonEncode({'transcript': transcript}),
    );
    if (response.statusCode >= 400) {
      throw FaktuApiException(response.statusCode, response.body);
    }
    return jsonDecode(response.body) as Map<String, dynamic>;
  }
}

class FaktuApiException implements Exception {
  final int statusCode;
  final String body;
  FaktuApiException(this.statusCode, this.body);

  @override
  String toString() => 'FaktuApiException($statusCode): $body';
}
