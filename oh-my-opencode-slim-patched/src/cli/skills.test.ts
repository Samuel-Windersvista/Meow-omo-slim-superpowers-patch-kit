import { describe, expect, test } from 'bun:test';
import { getSkillPermissionsForAgent } from './skills';

describe('skills permissions', () => {
  test('allows non-superpowers skills by default', () => {
    const permissions = getSkillPermissionsForAgent('designer');

    expect(permissions['*']).toBe('allow');
    expect(permissions['agent-browser']).toBe('allow');
    expect(permissions.simplify).toBeUndefined();
  });

  test('applies superpowers policy for orchestrator', () => {
    const permissions = getSkillPermissionsForAgent('orchestrator');

    expect(permissions['*']).toBe('allow');
    expect(permissions.brainstorming).toBe('allow');
    expect(permissions['writing-plans']).toBe('allow');
    expect(permissions['using-superpowers']).toBe('deny');
  });

  test('allows only approved superpowers skills for designer', () => {
    const permissions = getSkillPermissionsForAgent('designer');

    expect(permissions['test-driven-development']).toBe('allow');
    expect(permissions['systematic-debugging']).toBe('allow');
    expect(permissions['verification-before-completion']).toBe('allow');
    expect(permissions.brainstorming).toBe('deny');
    expect(permissions['using-superpowers']).toBe('deny');
  });

  test('does not bypass superpowers gating through legacy permission-only skills', () => {
    const permissions = getSkillPermissionsForAgent('oracle');

    expect(permissions.simplify).not.toBe('allow');
    expect(permissions['receiving-code-review']).toBe('deny');
    expect(permissions['requesting-code-review']).toBe('deny');
    expect(permissions['writing-plans']).toBe('deny');
  });

  test('moves simplify from oracle variants to fixer family', () => {
    const fixerPermissions = getSkillPermissionsForAgent('fixer');
    const fixerAlphaPermissions = getSkillPermissionsForAgent('fixer-alpha');
    const oracleAlphaPermissions = getSkillPermissionsForAgent('oracle-alpha');

    expect(fixerPermissions.simplify).toBe('allow');
    expect(fixerAlphaPermissions.simplify).toBe('allow');
    expect(oracleAlphaPermissions.simplify).not.toBe('allow');
  });

  test('honors explicit skill list overrides', () => {
    const emptyPerms = getSkillPermissionsForAgent('orchestrator', []);
    expect(emptyPerms['*']).toBe('deny');
    expect(emptyPerms.brainstorming).toBe('deny');
    expect(emptyPerms['using-superpowers']).toBe('deny');

    const specificPerms = getSkillPermissionsForAgent('designer', [
      'my-skill',
      '!bad-skill',
    ]);
    expect(specificPerms['*']).toBe('deny');
    expect(specificPerms['my-skill']).toBe('allow');
    expect(specificPerms['bad-skill']).toBe('deny');
    expect(specificPerms['test-driven-development']).toBe('deny');
  });

  test('does not let explicit skill lists grant forbidden superpowers skills', () => {
    const permissions = getSkillPermissionsForAgent('designer', [
      'writing-plans',
      'using-superpowers',
      'agent-browser',
    ]);

    expect(permissions['writing-plans']).toBe('deny');
    expect(permissions['using-superpowers']).toBe('deny');
    expect(permissions['agent-browser']).toBe('allow');
  });

  test('lets explicit skill lists narrow otherwise-allowed superpowers skills', () => {
    const permissions = getSkillPermissionsForAgent('orchestrator', [
      'brainstorming',
    ]);

    expect(permissions.brainstorming).toBe('allow');
    expect(permissions['writing-plans']).toBe('deny');
  });

  test('honors wildcard in explicit list', () => {
    const wildcardPerms = getSkillPermissionsForAgent('designer', ['*']);
    expect(wildcardPerms['*']).toBe('allow');
    expect(wildcardPerms['writing-plans']).toBe('deny');
    expect(wildcardPerms['test-driven-development']).toBe('allow');
    expect(wildcardPerms['using-superpowers']).toBe('deny');
  });
});

describe('getSkillPermissionsForAgent — tier 3 default deny', () => {
  test('oracle has * deny (tier 3)', () => {
    const perms = getSkillPermissionsForAgent('oracle');
    expect(perms['*']).toBe('deny');
  });

  test('explorer has * deny (tier 3)', () => {
    const perms = getSkillPermissionsForAgent('explorer');
    expect(perms['*']).toBe('deny');
  });

  test('wildcard has * deny (tier 3)', () => {
    const perms = getSkillPermissionsForAgent('wildcard');
    expect(perms['*']).toBe('deny');
  });

  test('oracle-alpha inherits oracle * deny', () => {
    const perms = getSkillPermissionsForAgent('oracle-alpha');
    expect(perms['*']).toBe('deny');
  });

  test('fixer has * allow (tier 2)', () => {
    const perms = getSkillPermissionsForAgent('fixer');
    expect(perms['*']).toBe('allow');
  });

  test('designer has * allow (tier 2)', () => {
    const perms = getSkillPermissionsForAgent('designer');
    expect(perms['*']).toBe('allow');
  });

  test('orchestrator has * allow (tier 1)', () => {
    const perms = getSkillPermissionsForAgent('orchestrator');
    expect(perms['*']).toBe('allow');
  });

  test('oracle preserves SP allow for systematic-debugging despite * deny', () => {
    const perms = getSkillPermissionsForAgent('oracle');
    expect(perms['systematic-debugging']).toBe('allow');
  });
});

describe('getSkillPermissionsForAgent — reserved orchestrator-only skills', () => {
  test('orchestrator can use best-of-n-with-judge', () => {
    const perms = getSkillPermissionsForAgent('orchestrator');
    expect(perms['best-of-n-with-judge']).toBe('allow');
  });

  test('orchestrator can use update-memory', () => {
    const perms = getSkillPermissionsForAgent('orchestrator');
    expect(perms['update-memory']).toBe('allow');
  });

  test('orchestrator-beta can use both reserved skills', () => {
    const perms = getSkillPermissionsForAgent('orchestrator-beta');
    expect(perms['best-of-n-with-judge']).toBe('allow');
    expect(perms['update-memory']).toBe('allow');
  });

  test('fixer cannot use best-of-n-with-judge despite * allow', () => {
    const perms = getSkillPermissionsForAgent('fixer');
    expect(perms['best-of-n-with-judge']).toBe('deny');
  });

  test('fixer cannot use update-memory despite * allow', () => {
    const perms = getSkillPermissionsForAgent('fixer');
    expect(perms['update-memory']).toBe('deny');
  });

  test('wildcard cannot use either reserved skill', () => {
    const perms = getSkillPermissionsForAgent('wildcard');
    expect(perms['best-of-n-with-judge']).toBe('deny');
    expect(perms['update-memory']).toBe('deny');
  });

  test('fixer-alpha cannot use reserved skills (no inheritance)', () => {
    const perms = getSkillPermissionsForAgent('fixer-alpha');
    expect(perms['best-of-n-with-judge']).toBe('deny');
  });
});

describe('getSkillPermissionsForAgent — reserved skills still override explicit skillList', () => {
  test('orchestrator explicit list still gets reserved skills allowed', () => {
    const perms = getSkillPermissionsForAgent('orchestrator', [
      'brainstorming',
    ]);
    expect(perms['best-of-n-with-judge']).toBe('allow');
    expect(perms['update-memory']).toBe('allow');
    expect(perms.brainstorming).toBe('allow');
  });

  test('fixer explicit list cannot grant reserved skills', () => {
    const perms = getSkillPermissionsForAgent('fixer', [
      'best-of-n-with-judge',
      'update-memory',
      'my-skill',
    ]);
    expect(perms['best-of-n-with-judge']).toBe('deny');
    expect(perms['update-memory']).toBe('deny');
    expect(perms['my-skill']).toBe('allow');
  });

  test('wildcard explicit wildcard still cannot access reserved skills', () => {
    const perms = getSkillPermissionsForAgent('wildcard', ['*']);
    expect(perms['best-of-n-with-judge']).toBe('deny');
    expect(perms['update-memory']).toBe('deny');
  });
});

describe('getSkillPermissionsForAgent — explicit skillList override still works', () => {
  test('laborer with skills:[] gets * deny + all SP denied', () => {
    const perms = getSkillPermissionsForAgent('laborer', []);
    expect(perms['*']).toBe('deny');
    expect(perms['systematic-debugging']).toBe('deny');
  });
});
