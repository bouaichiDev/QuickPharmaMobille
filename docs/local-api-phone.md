# Tester l’API locale sur un téléphone Android

Configuration locale actuelle (.env.local, ignoré par Git) :

```dotenv
APP_ENV=development
EXPO_PUBLIC_API_BASE_URL=http://192.168.100.4:8001/api
```

Le téléphone et le PC doivent être sur le même réseau Wi-Fi. Laravel doit écouter sur toutes les interfaces :

```powershell
php artisan serve --host=0.0.0.0 --port=8001
```

Metro doit être redémarré depuis MobileQuckPharma après un changement d’environnement :

```powershell
npx expo start --dev-client --clear --lan --port 8082
```

Dans le client de développement du téléphone, ouvrir le serveur http://192.168.100.4:8082 puis faire un rechargement complet. Se reconnecter avec un compte du backend local : le jeton du VPS peut être refusé par l’API locale. Un APK autonome/Google Play conserve l’URL intégrée lors de sa compilation ; il ne lit pas les fichiers .env du PC.

Vérification réalisée : l’API répond via l’adresse Wi-Fi au port 8001 et le manifeste Metro indique development. La connexion du téléphone n’a pas été observée directement (aucun appareil ADB connecté).

L’adresse du PC peut changer avec le Wi-Fi. Si le téléphone ne joint pas le serveur, vérifier l’adresse et l’autorisation du pare-feu pour le réseau local. La configuration de test HTTP ne convient pas à une publication en production.
