'use strict';

const { z } = require('zod');
const config = require('./config');
const { HttpError } = require('./errors');

const emailSchema = z
  .string()
  .trim()
  .toLowerCase()
  .email('Enter a valid email address.')
  .max(254);

const usernameSchema = z
  .string()
  .trim()
  .min(3, 'Username must be at least 3 characters.')
  .max(32, 'Username must be at most 32 characters.')
  .regex(/^[A-Za-z0-9_.-]+$/, 'Username can contain letters, numbers, dots, dashes and underscores.');

const passwordSchema = z
  .string()
  .min(config.PASSWORD_MIN, `Password must be at least ${config.PASSWORD_MIN} characters.`)
  .max(config.PASSWORD_MAX, `Password must be at most ${config.PASSWORD_MAX} characters.`);

const idSchema = z
  .string()
  .min(1)
  .max(config.ID_MAX)
  .regex(/^[A-Za-z0-9_.:-]+$/, 'Invalid identifier.');

const folderIdSchema = z
  .string()
  .max(config.ID_MAX)
  .regex(/^[A-Za-z0-9_.:-]+$/, 'Invalid folder identifier.')
  .nullable();

const noteSchema = z.object({
  title: z.string().max(config.NOTE_TITLE_MAX).optional().default(''),
  html: z.string().max(config.NOTE_HTML_MAX).optional().default(''),
  folderId: folderIdSchema.optional().default(null),
  starred: z.boolean().optional(),
  trashed: z.boolean().optional(),
  pinned: z.boolean().optional(),
  archived: z.boolean().optional(),
  tags: z.array(z.string().max(config.NOTE_TAG_MAX)).max(config.NOTE_TAGS_MAX).optional(),
  daily: z.string().max(config.NOTE_DAILY_MAX).nullable().optional(),
  createdAt: z.number().int().nonnegative().optional(),
  updatedAt: z.number().int().nonnegative().optional()
});

const folderSchema = z.object({
  name: z.string().trim().min(1, 'Folder name is required.').max(config.FOLDER_NAME_MAX),
  id: z.string().max(config.ID_MAX).optional()
});

const notePatchSchema = z.object({
  title: z.string().max(config.NOTE_TITLE_MAX).optional(),
  html: z.string().max(config.NOTE_HTML_MAX).optional(),
  folderId: folderIdSchema.optional(),
  starred: z.boolean().optional(),
  trashed: z.boolean().optional(),
  pinned: z.boolean().optional(),
  archived: z.boolean().optional(),
  tags: z.array(z.string().max(config.NOTE_TAG_MAX)).max(config.NOTE_TAGS_MAX).optional(),
  daily: z.string().max(config.NOTE_DAILY_MAX).nullable().optional()
});

const versionCreateSchema = z.object({
  title: z.string().max(config.NOTE_TITLE_MAX).optional().default(''),
  html: z.string().max(config.NOTE_HTML_MAX).optional().default(''),
  force: z.boolean().optional().default(false)
});

const registerSchema = z
  .object({
    username: usernameSchema,
    email: emailSchema,
    password: passwordSchema,
    passwordConfirm: z.string().min(1).max(config.PASSWORD_MAX)
  })
  .refine((value) => value.password === value.passwordConfirm, {
    message: 'Passwords do not match.',
    path: ['passwordConfirm']
  });

const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, 'Password is required.').max(config.PASSWORD_MAX),
  rememberMe: z.boolean().optional().default(false)
});

const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(1).max(config.PASSWORD_MAX),
    newPassword: passwordSchema,
    confirmPassword: z.string().min(1).max(config.PASSWORD_MAX)
  })
  .refine((value) => value.newPassword === value.confirmPassword, {
    message: 'Passwords do not match.',
    path: ['confirmPassword']
  });

const importNoteSchema = z.object({
  id: z.string().max(config.ID_MAX).optional(),
  title: z.string().max(config.NOTE_TITLE_MAX).optional().default(''),
  html: z.string().max(config.NOTE_HTML_MAX).optional().default(''),
  folderId: z.string().max(config.ID_MAX).nullable().optional(),
  starred: z.boolean().optional(),
  trashed: z.boolean().optional(),
  pinned: z.boolean().optional(),
  archived: z.boolean().optional(),
  tags: z.array(z.string().max(config.NOTE_TAG_MAX)).max(config.NOTE_TAGS_MAX).optional(),
  daily: z.string().max(config.NOTE_DAILY_MAX).nullable().optional(),
  createdAt: z.number().int().nonnegative().optional(),
  updatedAt: z.number().int().nonnegative().optional()
});

const importFolderSchema = z.object({
  id: z.string().max(config.ID_MAX).optional(),
  name: z.string().trim().min(1).max(config.FOLDER_NAME_MAX)
});

const importSchema = z.union([
  z.array(importNoteSchema).max(config.MAX_IMPORT_NOTES),
  z.object({
    app: z.string().optional(),
    version: z.number().optional(),
    folders: z.array(importFolderSchema).max(config.MAX_IMPORT_FOLDERS).optional().default([]),
    notes: z.array(importNoteSchema).max(config.MAX_IMPORT_NOTES)
  })
]);

function parse(schema, value) {
  const result = schema.safeParse(value);
  if (!result.success) {
    const first = result.error.issues && result.error.issues[0];
    const message = first && first.message ? first.message : 'Invalid input.';
    throw new HttpError(400, message, 'invalid_input');
  }
  return result.data;
}

module.exports = {
  emailSchema,
  usernameSchema,
  passwordSchema,
  idSchema,
  noteSchema,
  folderSchema,
  notePatchSchema,
  versionCreateSchema,
  registerSchema,
  loginSchema,
  changePasswordSchema,
  importSchema,
  parse
};
