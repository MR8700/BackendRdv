# Backend API De Gestion De Rendez-Vous

Ce dossier contient le backend Node.js / Express de l'application.

Il gère :

- l'authentification
- les rôles et permissions
- les rendez-vous
- les disponibilités
- les notifications
- la synchronisation avec MySQL

## Installation

```bash
cd Backend
npm install
```

## Configuration

Copiez le fichier d'exemple :

```bash
cp .env.example .env
```

Variables importantes :

- `DB_HOST`
- `DB_PORT`
- `DB_NAME`
- `DB_USER`
- `DB_PASSWORD`
- `JWT_SECRET`
- `JWT_REFRESH_SECRET`
- `MAIL_ENABLED`

## Email Et Notifications

Le backend est centré sur les notifications internes.

Comportement actuel :

- les notifications internes restent le canal principal
- l'email est optionnel
- laissez `MAIL_ENABLED=false` si vous ne configurez pas Mailtrap
- l'absence d'email ne bloque pas les flux métier

## Synchronisation Et Seed

### Synchroniser la base

```bash
npm run db:sync
```

### Charger les données de référence

```bash
npm run db:seed
```

Le seed crée :

- les rôles
- les permissions
- la clinique
- les services
- le premier administrateur

## Premier Compte Administrateur

Lors de `npm run db:seed`, un premier administrateur est créé automatiquement.

Identifiants par défaut :

- login : `admin`
- mot de passe : `Admin1234!`

Variables d'environnement disponibles pour personnaliser ce compte :

- `ADMIN_SEED_LOGIN`
- `ADMIN_SEED_PASSWORD`
- `ADMIN_SEED_NOM`
- `ADMIN_SEED_PRENOM`
- `ADMIN_SEED_EMAIL`
- `ADMIN_SEED_NIVEAU_ACCES`

## Lancement

```bash
npm run dev
```

## Vérification

Health check :

```bash
http://localhost:3000/api/v1/health
```
