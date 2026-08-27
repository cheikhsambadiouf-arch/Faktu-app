# Permissions micro — à ajouter après `flutter create .`

Ce dossier ne contient que `lib/` et `pubspec.yaml` : les dossiers
`android/` et `ios/` n'existent pas encore, car leur génération demande
le SDK Flutter (absent de cet environnement de développement).

**Étape obligatoire avant de lancer l'app**, une fois Flutter installé :

```bash
cd apps/mobile
flutter create .          # génère android/, ios/, etc. sans toucher à lib/
flutter pub get
```

Puis ajoute manuellement ces permissions (le micro ne fonctionnera pas sans elles) :

## Android — `android/app/src/main/AndroidManifest.xml`

Ajouter juste avant `<application ...>` :

```xml
<uses-permission android:name="android.permission.RECORD_AUDIO" />
<uses-permission android:name="android.permission.INTERNET" />
```

## iOS — `ios/Runner/Info.plist`

Ajouter dans le dictionnaire principal (`<dict> ... </dict>`) :

```xml
<key>NSMicrophoneUsageDescription</key>
<string>FAKTU a besoin du micro pour créer vos factures à la voix.</string>
<key>NSSpeechRecognitionUsageDescription</key>
<string>FAKTU utilise la reconnaissance vocale pour comprendre vos commandes.</string>
```

## Vérification

Une fois ces permissions ajoutées et l'API lancée (`docker-compose up`),
lance l'app sur un émulateur ou un téléphone et appuie sur le bouton
micro. Si rien ne se passe : vérifie d'abord les logs Flutter
(`flutter run` affiche les erreurs de permission en clair).
