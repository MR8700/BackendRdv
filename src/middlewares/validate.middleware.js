'use strict';

// ─────────────────────────────────────────────────────────────────────────────
// Middleware de validation Joi
//
// Intercepte les données entrantes avant qu'elles n'atteignent les controllers.
// Aligne les contraintes sur le schéma SQL :
//   - ENUMs (type_user, statut_rdv, canal, type_notification...)
//   - Longueurs VARCHAR(50), VARCHAR(100), VARCHAR(255)
//   - Champs NOT NULL
//
// Usage dans les routes :
//   router.post('/login',  validate(authValidator.login),  authController.login)
//   router.post('/rdv',    validate(rdvValidator.create),  rdvController.create)
//   router.put('/:id',     validate(userValidator.update, 'body'), ...)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Génère un middleware Express qui valide req[target] avec le schéma Joi fourni.
 *
 * @param {object} schema  - Schéma Joi
 * @param {string} target  - 'body' | 'query' | 'params'  (défaut: 'body')
 */
function validate(schema, target = 'body') {
  return (req, res, next) => {
    const data = req[target];

    const { error, value } = schema.validate(data, {
      abortEarly   : false,   // Renvoie TOUTES les erreurs, pas seulement la première
      stripUnknown : true,    // Supprime les champs non déclarés dans le schéma
      convert      : true,    // Convertit les types (ex: string '3' → number 3)
    });

    if (error) {
      const errors = error.details.map((d) => ({
        field  : d.path.join('.'),
        message: d.message.replace(/['"]/g, ''), // Retire les guillemets Joi
      }));

      return res.status(422).json({
        success: false,
        message: 'Données invalides.',
        errors,
      });
    }

    // Express 5 expose req.query via un getter: on met à jour l'objet sans le réassigner.
    if (target === 'query' && req.query && typeof req.query === 'object') {
      Object.keys(req.query).forEach((key) => delete req.query[key]);
      Object.assign(req.query, value);
    } else {
      req[target] = value;
    }
    next();
  };
}

/**
 * Valide plusieurs cibles en une seule déclaration.
 *
 * @param {object} schemas - { body: joiSchema, params: joiSchema, query: joiSchema }
 *
 * Usage :
 *   router.put('/:id_user', validateMany({ params: userValidator.idParam, body: userValidator.update }), ...)
 */
function validateMany(schemas) {
  return (req, res, next) => {
    const allErrors = [];

    for (const [target, schema] of Object.entries(schemas)) {
      const { error, value } = schema.validate(req[target], {
        abortEarly   : false,
        stripUnknown : true,
        convert      : true,
      });

      if (error) {
        error.details.forEach((d) => {
          allErrors.push({
            target,
            field  : d.path.join('.'),
            message: d.message.replace(/['"]/g, ''),
          });
        });
      } else if (target === 'query' && req.query && typeof req.query === 'object') {
        Object.keys(req.query).forEach((key) => delete req.query[key]);
        Object.assign(req.query, value);
      } else {
        req[target] = value;
      }
    }

    if (allErrors.length > 0) {
      return res.status(422).json({
        success: false,
        message: 'Données invalides.',
        errors : allErrors,
      });
    }

    next();
  };
}

module.exports = { validate, validateMany };
