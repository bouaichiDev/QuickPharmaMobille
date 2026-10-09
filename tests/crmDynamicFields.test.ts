import { customDefault } from '@/features/crm/dynamicFields';
import { formPayload, moduleFields } from '@/features/crm/fields';

describe('Dynamic service fields API values', () => {
  it('sends a default integer order when the user leaves the field blank', () => {
    expect(
      formPayload(moduleFields['form-builder']!, { name: 'note', type: 'text' }).sort_order,
    ).toBe(0);
  });
  it('restores multi-selection from persisted JSON and keeps the full selection array', () => {
    expect(customDefault({ type: 'multiselect' }, '["Visage","Mains"]')).toEqual([
      'Visage',
      'Mains',
    ]);
    expect(customDefault({ type: 'multiselect' }, ['Visage', 'Mains'])).toEqual([
      'Visage',
      'Mains',
    ]);
    expect(customDefault({ type: 'multiselect' }, '')).toEqual([]);
  });
  it('normalizes unchecked and checked switches to backend boolean values', () => {
    expect(customDefault({ type: 'checkbox' }, false)).toBe(0);
    expect(customDefault({ type: 'switch' }, 'true')).toBe(1);
    expect(customDefault({ type: 'switch', default_value: '1' }, undefined)).toBe(1);
    expect(customDefault({ type: 'switch', default_value: '1' }, 0)).toBe(0);
  });
});
