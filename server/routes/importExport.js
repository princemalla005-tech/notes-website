'use strict';

const express = require('express');
const sessions = require('../sessions');
const { importSchema, parse } = require('../validation');

function csrfForMutations(req, res, next) {
  if (req.method === 'GET' || req.method === 'HEAD' || req.method === 'OPTIONS') {
    return next();
  }
  return sessions.requireCsrf(req, res, next);
}

function createImportExportRouter({ store }) {
  const router = express.Router();

  router.use(sessions.requireAuth);
  router.use(csrfForMutations);

  router.post('/import', (req, res) => {
    const data = parse(importSchema, req.body);
    const payload = Array.isArray(data) ? { folders: [], notes: data } : data;
    const result = store.importData(req.session.user_id, payload);
    res.status(201).json(result);
  });

  router.get('/export', (req, res) => {
    const data = store.exportData(req.session.user_id);
    const stamp = new Date().toISOString().slice(0, 10);
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="notes-export-${stamp}.json"`
    );
    res.json(data);
  });

  return router;
}

module.exports = {
  createImportExportRouter
};
