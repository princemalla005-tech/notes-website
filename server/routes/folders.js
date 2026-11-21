'use strict';

const express = require('express');
const sessions = require('../sessions');
const { folderSchema, parse } = require('../validation');
const { HttpError } = require('../errors');

function csrfForMutations(req, res, next) {
  if (req.method === 'GET' || req.method === 'HEAD' || req.method === 'OPTIONS') {
    return next();
  }
  return sessions.requireCsrf(req, res, next);
}

function createFoldersRouter({ store }) {
  const router = express.Router();

  router.use(sessions.requireAuth);
  router.use(csrfForMutations);

  router.get('/', (req, res) => {
    res.json({ folders: store.listFolders(req.session.user_id) });
  });

  router.post('/', (req, res) => {
    const input = parse(folderSchema, req.body);
    const folder = store.createFolder(req.session.user_id, input.name);
    res.status(201).json({ folder });
  });

  router.put('/:id', (req, res) => {
    const input = parse(folderSchema, req.body);
    const folder = store.renameFolder(req.session.user_id, req.params.id, input.name);
    if (!folder) throw new HttpError(404, 'Folder not found.', 'not_found');
    res.json({ folder });
  });

  router.delete('/:id', (req, res) => {
    const removed = store.deleteFolder(req.session.user_id, req.params.id);
    if (!removed) throw new HttpError(404, 'Folder not found.', 'not_found');
    res.json({ ok: true });
  });

  return router;
}

module.exports = {
  createFoldersRouter
};
