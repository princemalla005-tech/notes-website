'use strict';

const express = require('express');
const sessions = require('../sessions');
const { noteSchema, notePatchSchema, versionCreateSchema, parse } = require('../validation');
const { HttpError } = require('../errors');

function csrfForMutations(req, res, next) {
  if (req.method === 'GET' || req.method === 'HEAD' || req.method === 'OPTIONS') {
    return next();
  }
  return sessions.requireCsrf(req, res, next);
}

function createNotesRouter({ store }) {
  const router = express.Router();

  router.use(sessions.requireAuth);
  router.use(csrfForMutations);

  router.get('/', (req, res) => {
    res.json({ notes: store.listNotes(req.session.user_id) });
  });

  router.post('/', (req, res) => {
    const input = parse(noteSchema, req.body);
    const note = store.createNote(req.session.user_id, input);
    res.status(201).json({ note });
  });

  router.post('/empty-trash', (req, res) => {
    const deleted = store.emptyTrash(req.session.user_id);
    res.json({ deleted });
  });

  router.get('/:id', (req, res) => {
    const note = store.getNote(req.session.user_id, req.params.id);
    if (!note) throw new HttpError(404, 'Note not found.', 'not_found');
    res.json({ note });
  });

  router.put('/:id', (req, res) => {
    const input = parse(notePatchSchema, req.body);
    const note = store.updateNote(req.session.user_id, req.params.id, input);
    if (!note) throw new HttpError(404, 'Note not found.', 'not_found');
    res.json({ note });
  });

  router.delete('/:id', (req, res) => {
    const removed = store.deleteNote(req.session.user_id, req.params.id);
    if (!removed) throw new HttpError(404, 'Note not found.', 'not_found');
    res.json({ ok: true });
  });

  router.get('/:id/versions', (req, res) => {
    const versions = store.listVersions(req.session.user_id, req.params.id);
    if (versions === null) throw new HttpError(404, 'Note not found.', 'not_found');
    res.json({ versions });
  });

  router.post('/:id/versions', (req, res) => {
    const input = parse(versionCreateSchema, req.body);
    const result = store.createVersion(req.session.user_id, req.params.id, input);
    if (!result) throw new HttpError(404, 'Note not found.', 'not_found');
    res.status(result.skipped ? 200 : 201).json(result);
  });

  router.post('/:id/versions/:versionId/restore', (req, res) => {
    const note = store.restoreVersion(
      req.session.user_id,
      req.params.id,
      req.params.versionId
    );
    if (!note) throw new HttpError(404, 'Version not found.', 'not_found');
    res.json({ note });
  });

  router.delete('/:id/versions', (req, res) => {
    const versions = store.listVersions(req.session.user_id, req.params.id);
    if (versions === null) throw new HttpError(404, 'Note not found.', 'not_found');
    const deleted = store.deleteVersions(req.session.user_id, req.params.id);
    res.json({ deleted });
  });

  return router;
}

module.exports = {
  createNotesRouter
};
