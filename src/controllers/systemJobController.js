'use strict';

const { SystemJob } = require('../models');
const { ok, created, paginated, notFound } = require('../utils/response.util');
const { AppError }  = require('../middlewares/errorHandler.middleware');
const { TYPE_TACHE, STATUT_JOB } = require('../utils/constants.util');
const rappelRdvJob         = require('../jobs/rappelRdv.job');
const nettoyageArchivesJob = require('../jobs/nettoyageArchives.job');

const JOB_RUNNERS = {
  [TYPE_TACHE.ENVOYER_RAPPEL]     : rappelRdvJob.run,
  [TYPE_TACHE.NETTOYAGE_ARCHIVES] : nettoyageArchivesJob.run,
};

async function getAll(req, res, next) {
  try {
    const { page = 1, limit = 50, statut, type_tache } = req.query;
    const where = {};
    if (statut)     where.statut     = statut;
    if (type_tache) where.type_tache = type_tache;

    const { count, rows } = await SystemJob.findAndCountAll({
      where,
      order  : [['date_execution_prevue', 'DESC']],
      limit  : parseInt(limit, 10),
      offset : (page - 1) * limit,
    });
    return paginated(res, rows, count, page, limit);
  } catch (err) { next(err); }
}

async function getOne(req, res, next) {
  try {
    const job = await SystemJob.findByPk(req.params.id_job);
    if (!job) return notFound(res, 'Job');
    return ok(res, job);
  } catch (err) { next(err); }
}

// POST /api/v1/system-jobs/run/:type_tache — déclenchement manuel
async function runManual(req, res, next) {
  try {
    const { type_tache } = req.params;
    const runner = JOB_RUNNERS[type_tache];
    if (!runner) {
      throw new AppError(
        `Type de tâche inconnu : "${type_tache}". Disponibles : ${Object.values(TYPE_TACHE).join(', ')}`,
        400, 'UNKNOWN_JOB'
      );
    }
    // Lancer sans await pour ne pas bloquer la réponse HTTP
    runner().catch((err) => console.error(`[JOB MANUEL] ${type_tache} erreur :`, err.message));
    return ok(res, null, `Job "${type_tache}" lancé manuellement.`);
  } catch (err) { next(err); }
}

async function remove(req, res, next) {
  try {
    const job = await SystemJob.findByPk(req.params.id_job);
    if (!job) return notFound(res, 'Job');
    if (job.statut === STATUT_JOB.ATTENTE) {
      throw new AppError('Impossible de supprimer un job en attente.', 409, 'JOB_PENDING');
    }
    await job.destroy();
    return ok(res, null, 'Job supprimé.');
  } catch (err) { next(err); }
}

module.exports = { getAll, getOne, runManual, remove };