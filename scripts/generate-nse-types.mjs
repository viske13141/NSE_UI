import fs from 'node:fs';
const spec = JSON.parse(fs.readFileSync(new URL('../nse-openapi.json', import.meta.url), 'utf8'));
function type(schema) {
  if (schema.$ref) return schema.$ref.split('/').at(-1);
  if (schema.anyOf) return schema.anyOf.map(type).join(' | ');
  if (schema.enum) return schema.enum.map(value => JSON.stringify(value)).join(' | ');
  if (schema.type === 'array') return `Array<${type(schema.items || {})}>`;
  if (schema.type === 'object') return '{ ' + Object.entries(schema.properties || {}).map(([name, value]) => `${JSON.stringify(name)}${schema.required?.includes(name) ? '' : '?'}: ${type(value)};`).join(' ') + (schema.additionalProperties ? ' [key: string]: unknown;' : '') + ' }';
  return { string: 'string', number: 'number', integer: 'number', boolean: 'boolean', null: 'null' }[schema.type] || 'unknown';
}
fs.writeFileSync(new URL('../src/types/nse.ts', import.meta.url), '// Generated from nse-openapi.json by scripts/generate-nse-types.mjs.\n' + Object.entries(spec.components.schemas).map(([name, schema]) => `export type ${name} = ${type(schema)};`).join('\n') + '\n');
const paths = Object.keys(spec.paths).filter(path => path.startsWith('/api/v1/')).map(path => path.replace('/api/v1', ''));
fs.writeFileSync(new URL('../server/src/routes/nsePaths.json', import.meta.url), JSON.stringify(paths, null, 2) + '\n');
