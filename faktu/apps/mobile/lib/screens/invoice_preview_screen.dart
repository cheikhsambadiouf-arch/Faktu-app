import 'package:flutter/material.dart';
import '../models/invoice_preview.dart';
import '../services/faktu_api.dart';

/// Reproduit l'écran décrit section 5 du prompt maître :
/// "J'AI COMPRIS : ... [CONFIRMER] [MODIFIER] [ANNULER]"
/// Aucune écriture définitive n'a lieu avant un appui sur CONFIRMER.
class InvoicePreviewScreen extends StatefulWidget {
  final FaktuApi api;
  final InvoicePreview preview;

  const InvoicePreviewScreen({super.key, required this.api, required this.preview});

  @override
  State<InvoicePreviewScreen> createState() => _InvoicePreviewScreenState();
}

class _InvoicePreviewScreenState extends State<InvoicePreviewScreen> {
  bool _loading = false;

  Future<void> _confirm(bool confirmation) async {
    setState(() => _loading = true);
    try {
      final result = await widget.api.confirmInvoice(
        previewId: widget.preview.previewId,
        confirmation: confirmation,
      );
      if (!mounted) return;
      if (confirmation) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Facture ${result['number']} créée ✅')),
        );
      } else {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Facture annulée')),
        );
      }
      Navigator.of(context).pop(result);
    } catch (e) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('Erreur : $e')),
      );
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final p = widget.preview;
    return Scaffold(
      appBar: AppBar(title: const Text("J'ai compris")),
      body: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text('Client : ${p.customerName}', style: Theme.of(context).textTheme.titleMedium),
            const SizedBox(height: 12),
            ...p.items.map(
              (item) => Text('${item.description} — ${item.quantity} x ${item.unitPrice} F'),
            ),
            const Divider(height: 32),
            Text('Total : ${p.total} F', style: Theme.of(context).textTheme.headlineSmall),
            const Spacer(),
            if (_loading) const Center(child: CircularProgressIndicator()),
            if (!_loading)
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  OutlinedButton(onPressed: () => _confirm(false), child: const Text('ANNULER')),
                  ElevatedButton(onPressed: () => _confirm(true), child: const Text('CONFIRMER')),
                ],
              ),
          ],
        ),
      ),
    );
  }
}
