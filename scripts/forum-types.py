"""Render the forum's public TypeScript contract from PostgreSQL catalog JSON.

The disposable database test supplies catalog data. This module does not connect
anywhere or read project credentials. Private tables never enter the output.
"""
import json
import sys

CATALOG_SQL = """
select json_build_object(
  'tables', (select json_agg(json_build_object(
    'name', t.relname,
    'columns', (select json_agg(json_build_object('name', a.attname,
      'type', format_type(a.atttypid, null), 'nullable', not a.attnotnull,
      'default', a.atthasdef) order by a.attnum)
      from pg_attribute a where a.attrelid=t.oid and a.attnum>0 and not a.attisdropped),
    'relationships', (select coalesce(json_agg(json_build_object(
      'foreignKeyName', c.conname,
      'columns', (select json_agg(a.attname order by k.ordinality) from unnest(c.conkey) with ordinality k(num, ordinality) join pg_attribute a on a.attrelid=c.conrelid and a.attnum=k.num),
      'referencedRelation', r.relname,
      'referencedColumns', (select json_agg(a.attname order by k.ordinality) from unnest(c.confkey) with ordinality k(num, ordinality) join pg_attribute a on a.attrelid=c.confrelid and a.attnum=k.num),
      'isOneToOne', exists(select 1 from pg_constraint u where u.conrelid=c.conrelid and u.contype in ('p','u') and u.conkey <@ c.conkey)
    ) order by c.conname), '[]'::json) from pg_constraint c join pg_class r on r.oid=c.confrelid
      where c.conrelid=t.oid and c.contype='f' and r.relnamespace='public'::regnamespace)
    ) order by t.relname) from pg_class t where t.relnamespace='public'::regnamespace and t.relkind='r'),
  'functions', (select json_agg(json_build_object('name', p.proname,
    'returns', format_type(p.prorettype,null), 'set', p.proretset,
    'args', (select coalesce(json_agg(json_build_object('name', p.proargnames[k.ordinality],
      'type', format_type(k.typ,null), 'optional', k.ordinality > p.pronargs-p.pronargdefaults)
      order by k.ordinality),'[]'::json) from unnest(p.proargtypes::oid[]) with ordinality k(typ,ordinality)))
    order by p.proname) from pg_proc p where p.pronamespace='public'::regnamespace and p.prorettype<>'trigger'::regtype)
)::text;
"""


def render(schema):
    tables = {table['name'] for table in schema['tables']}
    def ts_type(sql_type):
        if sql_type.endswith('[]'):
            return ts_type(sql_type[:-2]) + '[]'
        if sql_type in tables:
            return f'Database["public"]["Tables"]["{sql_type}"]["Row"]'
        if sql_type.startswith('public.') and sql_type[7:] in tables:
            return ts_type(sql_type[7:])
        if sql_type in ('json', 'jsonb'):
            return 'Json'
        if sql_type == 'boolean':
            return 'boolean'
        if sql_type in ('integer', 'bigint', 'smallint', 'numeric', 'real', 'double precision'):
            return 'number'
        if sql_type == 'void':
            return 'undefined'
        if sql_type in ('text', 'uuid', 'timestamp with time zone'):
            return 'string'
        raise ValueError(f'Unmapped PostgreSQL type: {sql_type}')

    lines = ['// Generated from disposable PostgreSQL catalogs by scripts/test-forum-database.py.',
             '// Regenerate with bun run test:db:update-types. Do not edit manually.',
             'export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];',
             '', 'export type Database = {', '  public: {', '    Tables: {']
    for table in schema['tables']:
        lines.append(f'      {table["name"]}: {{')
        for shape in ('Row', 'Insert', 'Update'):
            lines.append(f'        {shape}: {{')
            for col in table['columns']:
                optional = shape == 'Update' or (shape == 'Insert' and (col['nullable'] or col['default']))
                suffix = '?' if optional else ''
                value = ts_type(col['type']) + (' | null' if col['nullable'] else '')
                lines.append(f'          {col["name"]}{suffix}: {value};')
            lines.append('        };')
        relationships = table['relationships']
        if not relationships:
            lines.append('        Relationships: [];')
        else:
            lines.append('        Relationships: [')
            for rel in relationships:
                lines.append('          {')
                for key, value in rel.items():
                    lines.append(f'            {key}: {json.dumps(value)};')
                lines.append('          },')
            lines.append('        ];')
        lines.append('      };')
    lines += ['    };', '    Views: Record<string, never>;', '    Functions: {']
    for function in schema['functions']:
        lines.append(f'      {function["name"]}: {{')
        lines.append('        Args: {' if function['args'] else '        Args: Record<string, never>;')
        for arg in function['args']:
            lines.append(f'          {arg["name"]}{"?" if arg["optional"] else ""}: {ts_type(arg["type"])};')
        if function['args']:
            lines.append('        };')
        lines.append(f'        Returns: {ts_type(function["returns"])}{"[]" if function["set"] else ""};')
        lines.append('      };')
    lines += ['    };', '    Enums: Record<string, never>;', '    CompositeTypes: Record<string, never>;', '  };', '};', '']
    return '\n'.join(lines)


if __name__ == '__main__':
    print(render(json.load(sys.stdin)), end='')
