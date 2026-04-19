# TODO - Migration Sequelize CLI Production (15 étapes)

## **PHASE 1: Structure & Config (Bloquants)**
- [✅] 1.1 src/config/database.js → database.runtime.js: Clean (no ALTER/sync)
- [✅] 1.2 config/config.json: ✅ CLI env dev/test/prod SSL
- [✅] 1.3 .sequelizerc: ✅ database/migrations/seeders
- [✅] 1.4 database/migrations/: ✅ Structure prête

## **PHASE 2: Migrations (Convertir runtime → CLI)**
- [ ] 2.1 001-create-users-roles-permissions
- [ ] 2.2 002-create-clinique-services-medecins
- [ ] 2.3 003-create-rdv-plannings-dispos
- [ ] 2.4 004-add-notif-columns
- [ ] 2.5 005-audit-triggers
- [ ] 2.6 006-indexes-performance
- [ ] 2.7 ... (12 total)

## **PHASE 3: Seeders CLI**
- [✅] 3.1 001-admin-seeder.js: ✅ Converted with hashPassword
- [ ] 3.2 002-roles-permissions-seeder
- [ ] 3.3 003-clinique-demo-seeder

## **PHASE 4: Validation & Runtime**
- [ ] 4.1 npx sequelize-cli db:migrate
- [ ] 4.2 npx sequelize-cli db:seed:all
- [ ] 4.3 Test app.js boot (no sync)
- [ ] 4.4 Render commands (migrate on start?)

**Prochain: Phase 1.1 nettoyer database.js**

