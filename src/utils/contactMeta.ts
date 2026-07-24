export type CustomField = {
  id: string;
  key: string;
  value: string;
};

export const DEFAULT_SUGGESTED_TAGS = [
  'VIP',
  'Lead',
  'High Value',
  'Hot Lead',
  'Warm Lead',
  'Enterprise',
  'Follow-up',
  'Partner',
  'Urgent',
  'Support',
];

export function getContactTags(contactId: string): string[] {
  try {
    const raw = localStorage.getItem(`contact_tags_${contactId}`);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return parsed;
    }
  } catch (e) {
    console.error('Failed to parse contact tags', e);
  }
  return [];
}

export function saveContactTags(contactId: string, tags: string[]): void {
  try {
    localStorage.setItem(`contact_tags_${contactId}`, JSON.stringify(tags));
  } catch (e) {
    console.error('Failed to save contact tags', e);
  }
}

export function getContactCustomFields(contactId: string): CustomField[] {
  try {
    const raw = localStorage.getItem(`contact_custom_fields_${contactId}`);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return parsed;
    }
  } catch (e) {
    console.error('Failed to parse custom fields', e);
  }
  return [];
}

export function saveContactCustomFields(contactId: string, fields: CustomField[]): void {
  try {
    localStorage.setItem(`contact_custom_fields_${contactId}`, JSON.stringify(fields));
  } catch (e) {
    console.error('Failed to save custom fields', e);
  }
}
