'use strict';

const sanitizeHtmlLib = require('sanitize-html');
const config = require('./config');

const ALLOWED_TAGS = [
  'p', 'div', 'br', 'span', 'b', 'strong', 'i', 'em', 'u', 's', 'strike',
  'h1', 'h2', 'h3', 'ul', 'ol', 'li', 'blockquote', 'pre', 'code', 'a',
  'hr', 'font', 'sub', 'sup', 'mark', 'table', 'thead', 'tbody', 'tfoot',
  'tr', 'th', 'td'
];

const COLOR = [
  /^#[0-9a-f]{3,8}$/i,
  /^rgba?\(\s*\d{1,3}\s*,\s*\d{1,3}\s*,\s*\d{1,3}\s*(?:,\s*(?:0|1|0?\.\d+)\s*)?\)$/i,
  /^hsla?\(\s*\d{1,3}\s*,\s*\d{1,3}%\s*,\s*\d{1,3}%\s*(?:,\s*(?:0|1|0?\.\d+)\s*)?\)$/i,
  /^(?:transparent|black|silver|gray|grey|white|maroon|red|purple|fuchsia|green|lime|olive|yellow|navy|blue|teal|aqua|orange|aliceblue|antiquewhite|aquamarine|azure|beige|bisque|blanchedalmond|blueviolet|brown|burlywood|cadetblue|chartreuse|chocolate|coral|cornflowerblue|cornsilk|crimson|cyan|darkblue|darkcyan|darkgoldenrod|darkgray|darkgreen|darkgrey|darkkhaki|darkmagenta|darkolivegreen|darkorange|darkorchid|darkred|darksalmon|darkseagreen|darkslateblue|darkslategray|darkslategrey|darkturquoise|darkviolet|deeppink|deepskyblue|dimgray|dimgrey|dodgerblue|firebrick|floralwhite|forestgreen|gainsboro|ghostwhite|gold|goldenrod|greenyellow|honeydew|hotpink|indianred|indigo|ivory|khaki|lavender|lavenderblush|lawngreen|lemonchiffon|lightblue|lightcoral|lightcyan|lightgoldenrodyellow|lightgray|lightgreen|lightgrey|lightpink|lightsalmon|lightseagreen|lightskyblue|lightslategray|lightslategrey|lightsteelblue|lightyellow|limegreen|linen|magenta|mediumaquamarine|mediumblue|mediumorchid|mediumpurple|mediumseagreen|mediumslateblue|mediumspringgreen|mediumturquoise|mediumvioletred|midnightblue|mintcream|mistyrose|moccasin|navajowhite|oldlace|olivedrab|orangered|orchid|palegoldenrod|palegreen|paleturquoise|palevioletred|papayawhip|peachpuff|peru|pink|plum|powderblue|rebeccapurple|rosybrown|royalblue|saddlebrown|salmon|sandybrown|seagreen|seashell|sienna|skyblue|slateblue|slategray|slategrey|snow|springgreen|steelblue|tan|thistle|tomato|turquoise|violet|wheat|whitesmoke|yellowgreen)$/i
];

const STYLES = {
  color: COLOR,
  'background-color': COLOR,
  'font-size': [
    /^(?:xx-small|x-small|small|medium|large|x-large|xx-large|smaller|larger)$/i,
    /^\d+(?:\.\d+)?(?:px|pt|em|rem|%)$/i
  ],
  'text-align': [/^(?:left|right|center|justify|start|end)$/i],
  'font-weight': [/^(?:normal|bold|bolder|lighter|[1-9]00)$/i],
  'font-style': [/^(?:normal|italic|oblique)$/i],
  'text-decoration': [/^(?:none|underline|line-through|overline)(?:\s+(?:underline|line-through|overline))*$/i]
};

const OPTIONS = {
  allowedTags: ALLOWED_TAGS,
  allowedAttributes: {
    a: ['href', 'target', 'rel'],
    font: ['color', 'size'],
    td: ['colspan', 'rowspan'],
    th: ['colspan', 'rowspan'],
    '*': ['style']
  },
  allowedStyles: {
    '*': STYLES
  },
  allowedSchemes: ['http', 'https', 'mailto'],
  allowProtocolRelative: false,
  disallowedTagsMode: 'discard',
  transformTags: {
    a: (tagName, attribs) => ({
      tagName: 'a',
      attribs: {
        ...attribs,
        target: '_blank',
        rel: 'noopener noreferrer'
      }
    })
  }
};

function sanitizeNoteHtml(value) {
  const input = String(value == null ? '' : value);
  if (!input) return '';
  try {
    return sanitizeHtmlLib(input, OPTIONS);
  } catch {
    return '';
  }
}

function stripControl(value) {
  return String(value == null ? '' : value)
    .replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function sanitizeTitle(value) {
  return stripControl(value).slice(0, config.NOTE_TITLE_MAX);
}

function sanitizeTags(value) {
  const seen = new Set();
  const output = [];
  const input = Array.isArray(value) ? value : [];
  for (const item of input) {
    const name = stripControl(item).replace(/^#+/, '').slice(0, config.NOTE_TAG_MAX);
    if (!name) continue;
    const key = name.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    output.push(name);
    if (output.length >= config.NOTE_TAGS_MAX) break;
  }
  return output;
}

function sanitizeDaily(value) {
  if (value == null || value === '') return null;
  const text = String(value).trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(text)) return null;
  const date = new Date(`${text}T00:00:00Z`);
  if (Number.isNaN(date.getTime()) || date.toISOString().slice(0, 10) !== text) return null;
  return text;
}

function sanitizeFolderName(value) {
  return stripControl(value).slice(0, config.FOLDER_NAME_MAX);
}

module.exports = {
  sanitizeNoteHtml,
  sanitizeTitle,
  sanitizeTags,
  sanitizeDaily,
  sanitizeFolderName
};
