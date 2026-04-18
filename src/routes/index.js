'use strict';

const router = require('express').Router();

// ─────────────────────────────────────────────────────────────────────────────
// Routeur central — monté sur API_PREFIX dans app.js
// Chaque module route est isolé et correspond à une entité SQL
// ─────────────────────────────────────────────────────────────────────────────

router.use('/auth',            require('./auth.routes'));
router.use('/utilisateurs',    require('./utilisateurs.routes'));
router.use('/users',           require('./utilisateurs.routes'));
router.use('/medecins',        require('./medecins.routes'));
router.use('/doctors',         require('./medecins.routes'));
router.use('/patients',        require('./patients.routes'));
router.use('/clients',         require('./patients.routes'));
router.use('/secretaires',     require('./secretaires.routes'));
router.use('/administrateurs', require('./administrateurs.routes'));
router.use('/clinique',        require('./clinique.routes'));
router.use('/clinic',          require('./clinique.routes'));
router.use('/services',        require('./services.routes'));
router.use('/plannings',       require('./plannings.routes'));
router.use('/disponibilites',  require('./disponibilites.routes'));
router.use('/availability',    require('./disponibilites.routes'));
router.use('/rendez-vous',     require('./rendezVous.routes'));
router.use('/appointments',    require('./rendezVous.routes'));
router.use('/notifications',   require('./notifications.routes'));
router.use('/audit-logs',      require('./auditLogs.routes'));
router.use('/logs',            require('./auditLogs.routes'));
router.use('/system-jobs',     require('./systemJobs.routes'));
router.use('/jobs',            require('./systemJobs.routes'));

module.exports = router;
