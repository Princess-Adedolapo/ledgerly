import { supabase, type Invoice } from '../lib/supabase';
import { getActiveWorkspaceId, tryGetActiveWorkspaceId } from '../lib/activeWorkspace';

import { convertCurrency } from '../lib/exchangeRates';

export interface LocalInvoiceMeta {
  document_type?: 'invoice' | 'proposal' | 'quote';
  signed_at?: string | null;
  signer_name?: string | null;
  signer_email?: string | null;
  signature_data?: string | null;
  sender_info?: {
    name?: string;
    tagline?: string;
    email?: string;
    phone?: string;
    address?: string;
    website?: string;
  };
  line_items?: Array<{
    id: string;
    description: string;
    quantity: number;
    unitPrice: number;
  }>;
}

export function getLocalInvoiceMeta(id: string): LocalInvoiceMeta | null {
  try {
    const raw = localStorage.getItem(`ledgerly_invoice_meta_${id}`);
    if (raw) return JSON.parse(raw);
  } catch (err) {
    console.error('Error reading local invoice meta:', err);
  }
  return null;
}

export function setLocalInvoiceMeta(id: string, meta: Partial<LocalInvoiceMeta>): LocalInvoiceMeta {
  const current = getLocalInvoiceMeta(id) || {};
  const updated = { ...current, ...meta };
  try {
    localStorage.setItem(`ledgerly_invoice_meta_${id}`, JSON.stringify(updated));
  } catch (err) {
    console.error('Error saving local invoice meta:', err);
  }
  return updated;
}

export function cacheInvoicesLocally(invoices: Invoice[]) {
  try {
    const existingRaw = localStorage.getItem('ledgerly_created_invoices');
    const existing: Invoice[] = existingRaw ? JSON.parse(existingRaw) : [];
    const map = new Map<string, Invoice>();
    
    existing.forEach((i) => {
      if (i && i.id) map.set(i.id, i);
    });
    invoices.forEach((i) => {
      if (i && i.id) {
        map.set(i.id, i);
        try {
          localStorage.setItem(`ledgerly_invoice_${i.id}`, JSON.stringify(i));
          if (i.invoice_number) {
            localStorage.setItem(`ledgerly_invoice_num_${i.invoice_number}`, JSON.stringify(i));
          }
        } catch (e) {
          console.warn('Error saving direct invoice keys:', e);
        }
      }
    });

    localStorage.setItem('ledgerly_created_invoices', JSON.stringify(Array.from(map.values())));
  } catch (err) {
    console.error('Error caching invoices locally:', err);
  }
}

export async function getInvoices(): Promise<Invoice[]> {
  const wsId = getActiveWorkspaceId();
  const { data, error } = await supabase
    .from('invoices')
    .select('*')
    .eq('workspace_id', wsId)
    .order('created_at', { ascending: false });
  if (error) throw new Error(error.message);
  
  const rawList = (data ?? []) as Invoice[];
  const processed = rawList.map((inv) => {
    const meta = getLocalInvoiceMeta(inv.id);
    if (!meta) return inv;
    return {
      ...inv,
      document_type: meta.document_type || inv.document_type || 'invoice',
      signed_at: meta.signed_at || inv.signed_at,
      signer_name: meta.signer_name || inv.signer_name,
      signer_email: meta.signer_email || inv.signer_email,
      signature_data: meta.signature_data || inv.signature_data,
    };
  });

  cacheInvoicesLocally(processed);
  return processed;
}

export async function getInvoiceByIdOrNumber(idOrNum: string): Promise<Invoice | null> {
  if (!idOrNum) return null;

  const cleanId = decodeURIComponent(idOrNum).trim();
  const strippedId = cleanId.replace(/^#/, '').trim();

  // 1. Direct Supabase Query using the public supabase client
  let data: Invoice | null = null;

  // Query by ID (exact cleanId or strippedId)
  try {
    const res = await supabase
      .from('invoices')
      .select('*')
      .eq('id', cleanId)
      .maybeSingle();
    if (res.data) data = res.data;
  } catch (e) {
    console.warn('Supabase query by id cleanId failed:', e);
  }

  if (!data && strippedId !== cleanId) {
    try {
      const res = await supabase
        .from('invoices')
        .select('*')
        .eq('id', strippedId)
        .maybeSingle();
      if (res.data) data = res.data;
    } catch (e) {
      console.warn('Supabase query by id strippedId failed:', e);
    }
  }

  // Query by share_token
  if (!data) {
    try {
      const res = await supabase
        .from('invoices')
        .select('*')
        .eq('share_token', cleanId)
        .maybeSingle();
      if (res.data) data = res.data;
    } catch {
      // share_token column may not exist on table schema
    }
  }

  if (!data && strippedId !== cleanId) {
    try {
      const res = await supabase
        .from('invoices')
        .select('*')
        .eq('share_token', strippedId)
        .maybeSingle();
      if (res.data) data = res.data;
    } catch {
      //
    }
  }

  // Query by invoice_number
  if (!data) {
    try {
      const res = await supabase
        .from('invoices')
        .select('*')
        .eq('invoice_number', cleanId)
        .maybeSingle();
      if (res.data) data = res.data;
    } catch (e) {
      console.warn('Supabase query by invoice_number cleanId failed:', e);
    }
  }

  if (!data && strippedId !== cleanId) {
    try {
      const res = await supabase
        .from('invoices')
        .select('*')
        .eq('invoice_number', strippedId)
        .maybeSingle();
      if (res.data) data = res.data;
    } catch (e) {
      console.warn('Supabase query by invoice_number strippedId failed:', e);
    }
  }

  // Query by ilike invoice_number
  if (!data) {
    try {
      const res = await supabase
        .from('invoices')
        .select('*')
        .ilike('invoice_number', `%${strippedId}%`)
        .maybeSingle();
      if (res.data) data = res.data;
    } catch (e) {
      console.warn('Supabase query by ilike invoice_number failed:', e);
    }
  }

  // Query by ID prefix (e.g. truncated UUIDs)
  if (!data) {
    try {
      const res = await supabase
        .from('invoices')
        .select('*')
        .like('id', `${strippedId}%`)
        .maybeSingle();
      if (res.data) data = res.data;
    } catch (e) {
      console.warn('Supabase query by id prefix failed:', e);
    }
  }

  // Fallback scan of recent invoices in Supabase
  if (!data) {
    try {
      const res = await supabase.from('invoices').select('*').order('created_at', { ascending: false }).limit(100);
      if (res.data) {
        data =
          res.data.find(
            (i: Invoice) =>
              i.id === cleanId ||
              i.id === strippedId ||
              i.invoice_number === cleanId ||
              i.invoice_number === strippedId ||
              (i as Record<string, unknown>).share_token === cleanId ||
              (i as Record<string, unknown>).share_token === strippedId ||
              i.id?.startsWith(strippedId) ||
              i.invoice_number?.toLowerCase().includes(strippedId.toLowerCase())
          ) || null;
      }
    } catch (e) {
      console.warn('Fallback search in Supabase failed:', e);
    }
  }

  // Helper to extract embedded metadata from invoice notes
  const extractNotesMetadata = (notes: string | null): Partial<LocalInvoiceMeta> | null => {
    if (!notes || !notes.includes('<!--metadata:')) return null;
    try {
      const match = notes.match(/<!--metadata:(.*?)-->/s);
      if (match && match[1]) {
        return JSON.parse(match[1]);
      }
    } catch {
      // ignore parse failure
    }
    return null;
  };

  const buildFullInvoice = (inv: Invoice): Invoice => {
    const meta = getLocalInvoiceMeta(inv.id);
    const notesMeta = extractNotesMetadata(inv.notes);
    const mergedSender = inv.sender_info || meta?.sender_info || notesMeta?.sender_info;
    const mergedDocType = meta?.document_type || notesMeta?.document_type || inv.document_type || 'invoice';
    const mergedLineItems = meta?.line_items || notesMeta?.line_items || inv.line_items;

    return {
      ...inv,
      status: (meta?.status as 'pending' | 'paid' | 'overdue' | 'approved') || inv.status,
      document_type: mergedDocType,
      sender_info: mergedSender,
      line_items: mergedLineItems,
      signed_at: meta?.signed_at || inv.signed_at,
      signer_name: meta?.signer_name || inv.signer_name,
      signer_email: meta?.signer_email || inv.signer_email,
      signature_data: meta?.signature_data || inv.signature_data,
    };
  };

  // If found in Supabase, enhance with metadata and return
  if (data) {
    const fullInv = buildFullInvoice(data as Invoice);
    cacheInvoicesLocally([fullInv]);
    return fullInv;
  }

  // 2. Fallback to Local Storage cache if Supabase query yields no result
  try {
    const directItem = 
      localStorage.getItem(`ledgerly_invoice_${cleanId}`) ||
      localStorage.getItem(`ledgerly_invoice_${strippedId}`) ||
      localStorage.getItem(`ledgerly_invoice_num_${cleanId}`) ||
      localStorage.getItem(`ledgerly_invoice_num_${strippedId}`);

    if (directItem) {
      const parsed: Invoice = JSON.parse(directItem);
      if (parsed && parsed.id) {
        return buildFullInvoice(parsed);
      }
    }
  } catch (e) {
    console.warn('Error in direct invoice lookup:', e);
  }

  try {
    const listRaw = localStorage.getItem('ledgerly_created_invoices');
    if (listRaw) {
      const parsedList: Invoice[] = JSON.parse(listRaw);
      if (Array.isArray(parsedList)) {
        const match = parsedList.find((i) => {
          if (!i) return false;
          const iId = String(i.id || '').toLowerCase();
          const iNum = String(i.invoice_number || '').replace(/^#/, '').toLowerCase();
          const iToken = String((i as Record<string, unknown>).share_token || '').toLowerCase();
          const target = cleanId.toLowerCase();
          const targetStripped = strippedId.toLowerCase();

          return (
            iId === target ||
            iId === targetStripped ||
            iId.startsWith(target) ||
            iId.startsWith(targetStripped) ||
            target.startsWith(iId) ||
            iNum === target ||
            iNum === targetStripped ||
            target.includes(iNum) ||
            (iToken && (iToken === target || iToken === targetStripped))
          );
        });

        if (match) {
          return buildFullInvoice(match);
        }
      }
    }
  } catch (e) {
    console.warn('Error reading local invoice cache:', e);
  }

  try {
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && (key.includes('invoice') || key.includes('ledgerly') || key.includes('proposal'))) {
        try {
          const item = localStorage.getItem(key);
          if (!item) continue;
          if (item.startsWith('[')) {
            const list: Invoice[] = JSON.parse(item);
            if (Array.isArray(list)) {
              const match = list.find((inv) => {
                if (!inv || !inv.id) return false;
                const invId = String(inv.id).toLowerCase();
                const invNum = String(inv.invoice_number || '').replace(/^#/, '').toLowerCase();
                const invToken = String((inv as Record<string, unknown>).share_token || '').toLowerCase();
                const target = cleanId.toLowerCase();
                const targetStripped = strippedId.toLowerCase();
                return (
                  invId === target ||
                  invId === targetStripped ||
                  invId.startsWith(target) ||
                  invNum === target ||
                  invNum === targetStripped ||
                  (invToken && (invToken === target || invToken === targetStripped))
                );
              });
              if (match) {
                return buildFullInvoice(match);
              }
            }
          }
        } catch (e) {
          console.warn('Error checking localStorage key:', key, e);
        }
      }
    }
  } catch (e) {
    console.warn('Error scanning localStorage:', e);
  }

  return null;
}

export async function saveInvoiceSignature(
  id: string,
  signatureInfo: {
    signerName: string;
    signerEmail?: string;
    signatureData: string;
    status?: 'pending' | 'paid' | 'overdue' | 'approved';
    documentType?: 'invoice' | 'proposal' | 'quote';
  }
): Promise<void> {
  const signedAt = new Date().toISOString();
  const newStatus = signatureInfo.status || 'approved';
  // Map 'approved' to 'paid' in DB to avoid check constraint failures
  const dbStatus = newStatus === 'approved' ? 'paid' : newStatus;
  
  // Update local metadata
  setLocalInvoiceMeta(id, {
    signer_name: signatureInfo.signerName,
    signer_email: signatureInfo.signerEmail,
    signature_data: signatureInfo.signatureData,
    signed_at: signedAt,
    document_type: signatureInfo.documentType,
    status: newStatus,
  });

  // Attempt to update Supabase invoice table
  try {
    const { error } = await supabase
      .from('invoices')
      .update({
        status: dbStatus,
      })
      .eq('id', id);

    if (error && error.message?.includes('invoices_status_check')) {
      await supabase.from('invoices').update({ status: 'paid' }).eq('id', id);
    }
  } catch (err) {
    console.warn('Could not update Supabase invoice status directly:', err);
  }
}

export async function deleteInvoice(id: string): Promise<void> {
  // 1. Delete from Supabase
  try {
    const { error } = await supabase.from('invoices').delete().eq('id', id);
    if (error) {
      console.warn('Error deleting invoice from Supabase:', error);
    }
  } catch (err) {
    console.warn('Error deleting invoice from Supabase:', err);
  }

  // 2. Clear local metadata and cache
  try {
    localStorage.removeItem(`ledgerly_invoice_meta_${id}`);
    localStorage.removeItem(`ledgerly_invoice_${id}`);

    const listRaw = localStorage.getItem('ledgerly_created_invoices');
    if (listRaw) {
      const list: Invoice[] = JSON.parse(listRaw);
      if (Array.isArray(list)) {
        const filtered = list.filter((i) => i.id !== id);
        localStorage.setItem('ledgerly_created_invoices', JSON.stringify(filtered));
      }
    }
  } catch (err) {
    console.warn('Error clearing local storage cache for deleted invoice:', err);
  }
}

export async function updateInvoiceDocumentType(
  id: string,
  documentType: 'invoice' | 'proposal' | 'quote'
): Promise<void> {
  setLocalInvoiceMeta(id, { document_type: documentType });

  // Update local storage cache
  try {
    const raw = localStorage.getItem('ledgerly_created_invoices');
    if (raw) {
      const list: Invoice[] = JSON.parse(raw);
      if (Array.isArray(list)) {
        const updatedList = list.map((inv) => {
          if (inv.id === id) {
            return { ...inv, document_type: documentType };
          }
          return inv;
        });
        localStorage.setItem('ledgerly_created_invoices', JSON.stringify(updatedList));
      }
    }
  } catch (err) {
    console.warn('Failed updating local storage cache for documentType:', err);
  }

  // Update Supabase invoice table directly if column exists
  try {
    await supabase.from('invoices').update({ document_type: documentType }).eq('id', id);
  } catch (err) {
    console.warn('Supabase update for document_type failed:', err);
  }

  // Update embedded metadata inside notes in Supabase if present
  try {
    const { data } = await supabase.from('invoices').select('notes').eq('id', id).maybeSingle();
    if (data) {
      let notesText = data.notes || '';
      const meta = getLocalInvoiceMeta(id) || {};
      const updatedMetaObj = { ...meta, document_type: documentType };
      const newComment = `<!--metadata:${JSON.stringify(updatedMetaObj)}-->`;

      if (notesText.includes('<!--metadata:')) {
        notesText = notesText.replace(/<!--metadata:.*?-->/s, newComment);
      } else {
        notesText = notesText ? `${notesText}\n\n${newComment}` : newComment;
      }

      await supabase.from('invoices').update({ notes: notesText }).eq('id', id);
    }
  } catch (err) {
    console.warn('Failed updating notes metadata in Supabase:', err);
  }
}

export function getISOWeekRange(date = new Date()): { start: Date; end: Date } {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  const start = new Date(d.setDate(diff));
  start.setHours(0, 0, 0, 0);
  const end = new Date(start);
  end.setDate(start.getDate() + 6);
  end.setHours(23, 59, 59, 999);
  return { start, end };
}

export async function getPaidInvoicesThisWeek(): Promise<Invoice[]> {
  const wsId = tryGetActiveWorkspaceId();
  if (!wsId) return [];
  const { start, end } = getISOWeekRange();
  const { data, error } = await supabase
    .from('invoices')
    .select('*')
    .eq('workspace_id', wsId)
    .eq('status', 'paid')
    .gte('created_at', start.toISOString())
    .lte('created_at', end.toISOString());
  if (error) throw new Error(error.message);
  return (data ?? []) as Invoice[];
}

export async function getWeeklySalesActual(targetCurrency = 'USD'): Promise<number> {
  const invoices = await getPaidInvoicesThisWeek();
  return invoices.reduce((sum, inv) => {
    const originalCurrency = inv.currency_code || 'USD';
    return sum + convertCurrency(Number(inv.amount), originalCurrency, targetCurrency);
  }, 0);
}

export function subscribeToInvoices(callback: () => void) {
  return supabase
    .channel('invoices_changes')
    .on('postgres_changes', { event: '*', schema: 'public', table: 'invoices' }, callback)
    .subscribe();
}
