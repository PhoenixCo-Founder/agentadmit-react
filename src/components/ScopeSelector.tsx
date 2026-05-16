/**
 * ScopeSelector — Scope selection with preset groups, template quick-picks,
 * and resource-level read/write pills.
 *
 * Generalized from TrainerTracer's AgentAccessSettings.js.
 */

import React, { useState, useMemo, useCallback } from 'react';
import { ScopeSelectorProps, ScopeResource, ScopePill, PresetGroup, TemplateQuickPick } from '../types';

function getScopesForGroup(resources: ScopeResource[], groupId: string): string[] {
  return resources
    .filter(r => r.group === groupId)
    .flatMap(r => r.pills.map(p => p.scope));
}

export function ScopeSelector({
  scopeResources,
  presetGroups = [],
  templateQuickPicks = [],
  userRole = 'user',
  selectedScopes,
  onScopesChange,
  className = '',
}: ScopeSelectorProps) {
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());

  // Filter presets and quick-picks by role
  const visiblePresets = useMemo(
    () => presetGroups.filter(p => !p.visibleTo || p.visibleTo.includes(userRole)),
    [presetGroups, userRole],
  );

  const visibleQuickPicks = useMemo(
    () => templateQuickPicks.filter(t => !t.visibleTo || t.visibleTo.includes(userRole)),
    [templateQuickPicks, userRole],
  );

  // Filter resources by visible groups
  const visibleResources = useMemo(() => {
    const allowedGroups = new Set(visiblePresets.map(p => p.id));
    // Always show personal group
    if (!allowedGroups.has('personal')) allowedGroups.add('personal');
    return scopeResources.filter(r => allowedGroups.has(r.group));
  }, [scopeResources, visiblePresets]);

  const handlePillToggle = useCallback((pill: ScopePill, allPillsInRow: ScopePill[]) => {
    const isActive = selectedScopes.includes(pill.scope);
    let next = [...selectedScopes];

    if (isActive) {
      next = next.filter(s => s !== pill.scope);
      // If deselecting the first pill (read), remove all others in the row
      if (allPillsInRow[0]?.scope === pill.scope) {
        allPillsInRow.forEach(p => { next = next.filter(s => s !== p.scope); });
      }
    } else {
      next.push(pill.scope);
      // If selecting a non-first pill, auto-select the first (read)
      if (allPillsInRow.length > 1 && allPillsInRow[0]?.scope !== pill.scope) {
        if (!next.includes(allPillsInRow[0].scope)) {
          next.push(allPillsInRow[0].scope);
        }
      }
    }

    onScopesChange([...new Set(next)]);
  }, [selectedScopes, onScopesChange]);

  const handlePresetToggle = useCallback((groupId: string) => {
    const groupScopes = getScopesForGroup(scopeResources, groupId);
    const allSelected = groupScopes.every(s => selectedScopes.includes(s));

    if (allSelected) {
      onScopesChange(selectedScopes.filter(s => !groupScopes.includes(s)));
    } else {
      onScopesChange([...new Set([...selectedScopes, ...groupScopes])]);
    }
  }, [scopeResources, selectedScopes, onScopesChange]);

  const handleQuickPick = useCallback((qp: TemplateQuickPick) => {
    const allSelected = qp.scopes.every(s => selectedScopes.includes(s));
    if (allSelected) {
      onScopesChange(selectedScopes.filter(s => !qp.scopes.includes(s)));
    } else {
      onScopesChange([...new Set([...selectedScopes, ...qp.scopes])]);
    }
  }, [selectedScopes, onScopesChange]);

  const toggleGroup = useCallback((groupId: string) => {
    setExpandedGroups(prev => {
      const next = new Set(prev);
      if (next.has(groupId)) next.delete(groupId);
      else next.add(groupId);
      return next;
    });
  }, []);

  const pillColor = (pill: ScopePill, active: boolean) => {
    if (!active) return 'aa-pill aa-pill-inactive';
    switch (pill.kind) {
      case 'read': return 'aa-pill aa-pill-read';
      case 'create': return 'aa-pill aa-pill-create';
      case 'write': return 'aa-pill aa-pill-write';
      case 'manage': return 'aa-pill aa-pill-manage';
      default: return 'aa-pill aa-pill-read';
    }
  };

  return (
    <div className={`aa-scope-selector ${className}`}>
      {/* Preset Groups */}
      {visiblePresets.length > 0 && (
        <div className="aa-presets">
          <h3 className="aa-section-title">Quick Select</h3>
          <div
            className="aa-preset-grid"
            role="group"
            aria-label="Preset scope groups"
          >
            {visiblePresets.map(preset => {
              const groupScopes = getScopesForGroup(scopeResources, preset.id);
              const allSelected = groupScopes.every(s => selectedScopes.includes(s));
              const someSelected = groupScopes.some(s => selectedScopes.includes(s));

              return (
                <button
                  key={preset.id}
                  onClick={() => handlePresetToggle(preset.id)}
                  className={`aa-preset-card ${allSelected ? 'aa-preset-active' : someSelected ? 'aa-preset-partial' : ''}`}
                  aria-pressed={allSelected}
                  aria-label={`${preset.label}: ${preset.description}`}
                >
                  <span className="aa-preset-icon" role="img" aria-label={`${preset.label} icon`}>{preset.icon}</span>
                  <span className="aa-preset-label">{preset.label}</span>
                  <span className="aa-preset-desc">{preset.description}</span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Template Quick-Picks */}
      {visibleQuickPicks.length > 0 && (
        <div className="aa-quick-picks">
          <h3 className="aa-section-title">Use Case Templates</h3>
          <div
            className="aa-quick-pick-grid"
            role="group"
            aria-label="Use case templates"
          >
            {visibleQuickPicks.map(qp => {
              const allSelected = qp.scopes.every(s => selectedScopes.includes(s));
              return (
                <button
                  key={qp.id}
                  onClick={() => handleQuickPick(qp)}
                  className={`aa-quick-pick ${allSelected ? 'aa-quick-pick-active' : ''}`}
                  aria-pressed={allSelected}
                  aria-label={qp.label}
                >
                  <span role="img" aria-label={`${qp.label} icon`}>{qp.icon}</span>
                  <span>{qp.label}</span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Scope Resources with Pills */}
      <div className="aa-resources">
        <h3 className="aa-section-title">Permissions</h3>
        {visiblePresets.map(preset => {
          const resources = visibleResources.filter(r => r.group === preset.id);
          if (resources.length === 0) return null;
          const isExpanded = expandedGroups.has(preset.id);
          const groupId = `aa-resource-group-${preset.id}`;

          return (
            <div key={preset.id} className="aa-resource-group">
              <button
                onClick={() => toggleGroup(preset.id)}
                className="aa-resource-group-header"
                aria-expanded={isExpanded}
                aria-controls={groupId}
              >
                <span>
                  <span role="img" aria-label={`${preset.label} icon`}>{preset.icon}</span> {preset.label}
                </span>
                <span className="aa-chevron" aria-hidden="true">{isExpanded ? '▼' : '▶'}</span>
              </button>

              {isExpanded && (
                <div id={groupId} className="aa-resource-list">
                  {resources.map(resource => (
                    <div key={resource.resource} className="aa-resource-row">
                      <span className="aa-resource-name">{resource.resource}</span>
                      <div
                        className="aa-pill-group"
                        role="group"
                        aria-label={`${resource.resource} permissions`}
                      >
                        {resource.pills.map(pill => {
                          const isActive = selectedScopes.includes(pill.scope);
                          return (
                            <button
                              key={pill.scope}
                              onClick={() => handlePillToggle(pill, resource.pills)}
                              className={pillColor(pill, isActive)}
                              role="checkbox"
                              aria-checked={isActive}
                              aria-pressed={isActive}
                              aria-label={`${resource.resource} ${pill.label}`}
                            >
                              {pill.label}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Selected count */}
      <div className="aa-scope-count">
        {selectedScopes.length} permission{selectedScopes.length !== 1 ? 's' : ''} selected
      </div>
    </div>
  );
}
