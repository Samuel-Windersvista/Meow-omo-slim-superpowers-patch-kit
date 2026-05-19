import { describe, expect, it } from 'bun:test';
import {
  FALLBACK_SUPERPOWERS_SKILLS,
  buildSuperpowersSkillPermissions,
  getAllowedSuperpowersSkillsForAgent,
  isOrchestratorAgent,
} from './superpowers-policy';

describe('superpowers policy', () => {
  it('fixer gets TDD + DBG + VBC + RCR (4 skills, RCR added)', () => {
    const allowed = getAllowedSuperpowersSkillsForAgent('fixer');

    expect(allowed.has('test-driven-development')).toBe(true);
    expect(allowed.has('systematic-debugging')).toBe(true);
    expect(allowed.has('verification-before-completion')).toBe(true);
    expect(allowed.has('receiving-code-review')).toBe(true);
    expect(allowed.size).toBe(4);
  });

  it('designer gets TDD + DBG + VBC + RCR (4 skills, RCR added)', () => {
    const allowed = getAllowedSuperpowersSkillsForAgent('designer');

    expect(allowed.has('test-driven-development')).toBe(true);
    expect(allowed.has('systematic-debugging')).toBe(true);
    expect(allowed.has('verification-before-completion')).toBe(true);
    expect(allowed.has('receiving-code-review')).toBe(true);
    expect(allowed.size).toBe(4);
  });

  it('oracle gets only systematic-debugging in SP allowlist', () => {
    const allowed = getAllowedSuperpowersSkillsForAgent('oracle');

    expect(allowed.has('systematic-debugging')).toBe(true);
    expect(allowed.has('verification-before-completion')).toBe(false);
    expect(allowed.has('receiving-code-review')).toBe(false);
    expect(allowed.size).toBe(1);
  });

  it('oracle-alpha inherits oracle (DBG only)', () => {
    const allowed = getAllowedSuperpowersSkillsForAgent('oracle-alpha');

    expect(allowed.has('systematic-debugging')).toBe(true);
    expect(allowed.size).toBe(1);
  });

  it('grants only systematic-debugging to oracle and hides controller skills', () => {
    const permissions = buildSuperpowersSkillPermissions('oracle', FALLBACK_SUPERPOWERS_SKILLS);

    expect(permissions['systematic-debugging']).toBe('allow');
    expect(permissions['verification-before-completion']).toBe('deny');
    expect(permissions['receiving-code-review']).toBe('deny');
    expect(permissions['writing-plans']).toBe('deny');
    expect(permissions['subagent-driven-development']).toBe('deny');
  });

  it('keeps using-superpowers bootstrap-only even for orchestrator', () => {
    const permissions = buildSuperpowersSkillPermissions('orchestrator', FALLBACK_SUPERPOWERS_SKILLS);

    expect(permissions['brainstorming']).toBe('allow');
    expect(permissions['writing-plans']).toBe('allow');
    expect(permissions['using-superpowers']).toBe('deny');
  });

  it('fails safe for unknown future superpowers skills', () => {
    const futureSkills = [...FALLBACK_SUPERPOWERS_SKILLS, 'future-superpowers-skill'];

    expect(buildSuperpowersSkillPermissions('fixer', futureSkills)['future-superpowers-skill']).toBe('deny');
    expect(buildSuperpowersSkillPermissions('orchestrator', futureSkills)['future-superpowers-skill']).toBe('allow');
  });

  describe('isOrchestratorAgent()', () => {
    it('matches the literal orchestrator', () => {
      expect(isOrchestratorAgent('orchestrator')).toBe(true);
    });

    it('matches dash-suffix variants like orchestrator-beta', () => {
      expect(isOrchestratorAgent('orchestrator-beta')).toBe(true);
      expect(isOrchestratorAgent('orchestrator-alpha')).toBe(true);
      expect(isOrchestratorAgent('orchestrator-fallback')).toBe(true);
    });

    it('matches no-separator prefix variants like orchestrator2', () => {
      expect(isOrchestratorAgent('orchestrator2')).toBe(true);
      expect(isOrchestratorAgent('orchestratorx')).toBe(true);
    });

    it('does not match unrelated agents that happen to contain "orchestrator" mid-name', () => {
      expect(isOrchestratorAgent('fixer')).toBe(false);
      expect(isOrchestratorAgent('oracle')).toBe(false);
      expect(isOrchestratorAgent('my-orchestrator')).toBe(false);
      expect(isOrchestratorAgent('preorchestrator')).toBe(false);
    });
  });

  it('grants full superpowers allowlist to orchestrator-prefix variants', () => {
    const permissionsBeta = buildSuperpowersSkillPermissions('orchestrator-beta', FALLBACK_SUPERPOWERS_SKILLS);
    expect(permissionsBeta['brainstorming']).toBe('allow');
    expect(permissionsBeta['writing-plans']).toBe('allow');
    expect(permissionsBeta['subagent-driven-development']).toBe('allow');
    expect(permissionsBeta['using-superpowers']).toBe('deny');

    const permissionsX = buildSuperpowersSkillPermissions('orchestrator2', FALLBACK_SUPERPOWERS_SKILLS);
    expect(permissionsX['brainstorming']).toBe('allow');
    expect(permissionsX['writing-plans']).toBe('allow');
  });
});
