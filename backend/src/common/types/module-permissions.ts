import { BadRequestException } from '@nestjs/common';

// What an access role may do, per dashboard module. Module keys are the
// frontend's sidebar hrefs ("/items", "/masters/units"), so the roles matrix
// on the Users page and the checks here use the same names.
export const MODULE_ACTIONS = ['view', 'create', 'edit', 'delete'] as const;
export type ModuleAction = (typeof MODULE_ACTIONS)[number];
export type ModulePermissions = Record<string, ModuleAction[]>;

const MODULE_KEY = /^\/[a-z0-9-]+(\/[a-z0-9-]+)*$/;
const MAX_MODULES = 100;

const isAction = (value: unknown): value is ModuleAction =>
  MODULE_ACTIONS.includes(value as ModuleAction);

// Checks a permissions object from a request and returns it normalised:
// actions de-duplicated in a fixed order, and any action implying "view".
export function parsePermissions(raw: unknown): ModulePermissions {
  if (typeof raw !== 'object' || raw === null || Array.isArray(raw)) {
    throw new BadRequestException('Permissions must be an object of module → actions');
  }
  const entries = Object.entries(raw);
  if (entries.length > MAX_MODULES) {
    throw new BadRequestException('Too many modules in permissions');
  }

  const permissions: ModulePermissions = {};
  for (const [module, actions] of entries) {
    if (!MODULE_KEY.test(module)) {
      throw new BadRequestException(`Unknown module "${module}"`);
    }
    if (!Array.isArray(actions) || !actions.every(isAction)) {
      throw new BadRequestException(
        `Actions for ${module} must be some of ${MODULE_ACTIONS.join(', ')}`,
      );
    }
    const held = new Set<ModuleAction>(actions);
    if (held.size > 0) held.add('view');
    permissions[module] = MODULE_ACTIONS.filter((action) => held.has(action));
  }
  return permissions;
}

// Reads permissions stored in the database. Never throws: a malformed value
// grants nothing rather than breaking every request for that user.
export function readStoredPermissions(stored: unknown): ModulePermissions {
  try {
    return parsePermissions(stored);
  } catch {
    return {};
  }
}
