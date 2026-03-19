/**
 * PromptTemplates — Dynamic, scope-filtered prompt templates with editable fields.
 *
 * Templates only appear if the user has granted the required scopes.
 * Each template can have editable fields the user personalizes before copying.
 *
 * Generalized from TrainerTracer's AgentPromptTemplates.js (1,060 lines → ~250 lines).
 */

import React, { useState, useMemo, useCallback } from 'react';
import { TemplatesProps, PromptTemplate, EditableField, ExampleCategory } from '../types';

function hasAllScopes(selected: string[], required: string[]): boolean {
  return required.every(s => selected.includes(s));
}

function hasAnyScope(selected: string[], required: string[]): boolean {
  return required.some(s => selected.includes(s));
}

function compileTemplate(template: string, fields: Record<string, string>): string {
  let result = template;
  for (const [key, value] of Object.entries(fields)) {
    result = result.replace(new RegExp(`\\{\\{${key}\\}\\}`, 'g'), value);
  }
  return result;
}

export function PromptTemplates({
  templates,
  editableFields = {},
  exampleCategories = [],
  selectedScopes,
  userRole = 'user',
  token,
  className = '',
}: TemplatesProps) {
  const [expandedTemplate, setExpandedTemplate] = useState<string | null>(null);
  const [fieldValues, setFieldValues] = useState<Record<string, Record<string, string>>>({});
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Filter templates by scopes and role
  const visibleTemplates = useMemo(() => {
    return templates.filter(t => {
      const scopeMatch = hasAllScopes(selectedScopes, t.requiredScopes);
      const roleMatch = !t.role || t.role === userRole;
      return scopeMatch && roleMatch;
    });
  }, [templates, selectedScopes, userRole]);

  // Filter examples by scopes
  const visibleExamples = useMemo(() => {
    return exampleCategories.filter(cat => hasAnyScope(selectedScopes, cat.scopes));
  }, [exampleCategories, selectedScopes]);

  // Get current field values for a template
  const getFieldValue = useCallback((templateId: string, fieldKey: string): string => {
    return fieldValues[templateId]?.[fieldKey] || editableFields[fieldKey]?.default || '';
  }, [fieldValues, editableFields]);

  const setFieldValue = useCallback((templateId: string, fieldKey: string, value: string) => {
    setFieldValues(prev => ({
      ...prev,
      [templateId]: {
        ...prev[templateId],
        [fieldKey]: value,
      },
    }));
  }, []);

  const handleCopy = useCallback(async (templateId: string, compiledText: string) => {
    const textToCopy = token
      ? `${compiledText}\n\nToken: ${token}`
      : compiledText;

    try {
      await navigator.clipboard.writeText(textToCopy);
    } catch {
      const textarea = document.createElement('textarea');
      textarea.value = textToCopy;
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand('copy');
      document.body.removeChild(textarea);
    }

    setCopiedId(templateId);
    setTimeout(() => setCopiedId(null), 2000);
  }, [token]);

  if (visibleTemplates.length === 0 && visibleExamples.length === 0) {
    return null;
  }

  return (
    <div className={`aa-templates ${className}`}>
      {/* Templates */}
      {visibleTemplates.length > 0 && (
        <div className="aa-template-section">
          <h3 className="aa-section-title">Tell Your Agent What To Do</h3>
          <p className="aa-section-desc">
            These templates match the permissions you selected. Personalize one, then copy it
            and send it to your AI agent along with your token in one message.
            Your agent will know exactly what you want and what it has access to.
          </p>

          <div className="aa-template-list">
            {visibleTemplates.map(tmpl => {
              const isExpanded = expandedTemplate === tmpl.id;
              const fields: Record<string, string> = {};
              (tmpl.editableFields || []).forEach(key => {
                fields[key] = getFieldValue(tmpl.id, key);
              });
              const compiled = compileTemplate(tmpl.template, fields);

              return (
                <div
                  key={tmpl.id}
                  className={`aa-template-card ${tmpl.isHero ? 'aa-template-hero' : ''} ${isExpanded ? 'aa-template-expanded' : ''}`}
                >
                  <button
                    onClick={() => setExpandedTemplate(isExpanded ? null : tmpl.id)}
                    className="aa-template-header"
                  >
                    <div>
                      <span className="aa-template-title">{tmpl.title}</span>
                      {tmpl.subtitle && <span className="aa-template-subtitle">{tmpl.subtitle}</span>}
                    </div>
                    <span className="aa-chevron">{isExpanded ? '▼' : '▶'}</span>
                  </button>

                  {isExpanded && (
                    <div className="aa-template-body">
                      {/* Editable fields */}
                      {(tmpl.editableFields || []).length > 0 && (
                        <div className="aa-template-fields">
                          <h4 className="aa-fields-title">Personalize</h4>
                          {(tmpl.editableFields || []).map(fieldKey => {
                            const field = editableFields[fieldKey];
                            if (!field) return null;
                            return (
                              <div key={fieldKey} className="aa-field-row">
                                <label className="aa-field-label">{field.label}</label>
                                <input
                                  type="text"
                                  value={getFieldValue(tmpl.id, fieldKey)}
                                  onChange={e => setFieldValue(tmpl.id, fieldKey, e.target.value)}
                                  placeholder={field.placeholder}
                                  className="aa-field-input"
                                />
                              </div>
                            );
                          })}
                        </div>
                      )}

                      {/* Preview */}
                      <div className="aa-template-preview">
                        <pre className="aa-template-code">{compiled}</pre>
                      </div>

                      {/* Copy button */}
                      <button
                        onClick={() => handleCopy(tmpl.id, compiled)}
                        className="aa-btn aa-btn-primary aa-btn-full"
                      >
                        {copiedId === tmpl.id
                          ? '✅ Copied template + token!'
                          : `📋 Copy Template${token ? ' + Token' : ''}`
                        }
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Example prompts */}
      {visibleExamples.length > 0 && (
        <div className="aa-examples-section">
          <h3 className="aa-section-title">Things You Can Ask Your Agent</h3>
          <p className="aa-section-desc">
            Quick prompts based on your selected permissions. Copy any of these and send them
            to your AI agent along with your token in one message.
          </p>
          <div className="aa-example-categories">
            {visibleExamples.map(cat => (
              <div key={cat.id} className="aa-example-category">
                <h4 className="aa-example-title">{cat.title}</h4>
                <ul className="aa-example-list">
                  {cat.examples.map((ex, i) => (
                    <li key={i} className="aa-example-item">"{ex}"</li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
