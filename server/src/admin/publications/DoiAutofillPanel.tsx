import * as React from 'react';
import { Box, Button, Checkbox, Field, Flex, Modal, TextInput, Typography } from '@strapi/design-system';
import { useFetchClient, useForm } from '@strapi/strapi/admin';
import { useDocumentRBAC, type PanelComponent } from '@strapi/content-manager/strapi-admin';
import { doiAuthorRow, initialDoiSelection, type DoiField, type DoiProposal, type DoiSelection } from './doi-form';

const emptySelection: DoiSelection = { title: false, year: false, authorCredits: false, bibtex: false };
const labels: Record<DoiField, string> = { title: 'Title', year: 'Year', authorCredits: 'Authors and affiliations', bibtex: 'BibTeX' };

function DoiAutofill({ isCreating }: { isCreating: boolean }) {
  const { get } = useFetchClient();
  const form = useForm('DoiAutofill', (state) => state);
  const values = form.values as any;
  const rbac = useDocumentRBAC('DoiAutofill', (state) => state);
  const fields = isCreating ? rbac.canCreateFields : rbac.canUpdateFields;
  const can = (name: string, kind: 'string' | 'integer' | 'text' | 'relation' = 'string') => rbac.canUserAction(name, fields, kind);
  const allowed = {
    title: can('title'), year: can('year', 'integer'), bibtex: can('bibtex', 'text'),
    authorCredits: can('authorCredits.name') && can('authorCredits.affiliation') && can('authorCredits.person', 'relation'),
  };
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState('');
  const [notice, setNotice] = React.useState('');
  const [proposal, setProposal] = React.useState<DoiProposal | null>(null);
  const [selected, setSelected] = React.useState<DoiSelection>(emptySelection);
  const request = React.useRef<AbortController | null>(null);
  React.useEffect(() => () => request.current?.abort(), []);

  if (!can('doi') || form.disabled) return null;

  async function lookup() {
    request.current?.abort();
    const controller = new AbortController();
    request.current = controller;
    const doi = String((form.getValues() as any).doi || '').trim();
    setBusy(true); setError(''); setNotice('');
    try {
      const response = await get<{ data: DoiProposal }>('/publication-doi/lookup', { params: { doi }, signal: controller.signal });
      if (controller.signal.aborted) return;
      if (String((form.getValues() as any).doi || '').trim() !== doi) {
        setError('The DOI changed during lookup. Fetch its metadata again.');
        return;
      }
      const data = response.data.data as DoiProposal;
      setSelected(initialDoiSelection(data, form.getValues(), allowed));
      setProposal(data);
    } catch (err: any) {
      if (!controller.signal.aborted) setError(err?.response?.data?.error?.message || 'Could not retrieve DOI metadata. You can still fill the fields manually.');
    } finally {
      if (!controller.signal.aborted) setBusy(false);
    }
  }

  function apply() {
    if (!proposal) return;
    for (const field of ['title', 'year', 'bibtex'] as const) {
      if (selected[field] && allowed[field]) form.onChange(field, proposal[field]);
    }
    if (selected.authorCredits && allowed.authorCredits) {
      form.onChange('authorCredits', []);
      proposal.authorCredits.forEach((author) => form.addFieldRow('authorCredits', doiAuthorRow(author)));
    }
    form.onChange('doi', proposal.doi);
    setProposal(null);
    setNotice('Selected fields filled. Review them in the form, then save when ready.');
  }

  const hasValue = (field: DoiField) => field === 'authorCredits' ? Boolean(proposal?.authorCredits.length) : Boolean(proposal?.[field]);
  return (
    <Flex direction="column" alignItems="stretch" gap={3}>
      <Typography variant="pi" textColor="neutral600">Optional: suggest publication details from a DOI. You choose what to apply; nothing is saved automatically.</Typography>
      <Field.Root name="doi-autofill">
        <Field.Label>DOI or DOI URL</Field.Label>
        <TextInput value={values.doi || ''} onChange={(event: React.ChangeEvent<HTMLInputElement>) => form.onChange('doi', event.target.value)} placeholder="10.… or https://doi.org/…" />
      </Field.Root>
      <Button type="button" loading={busy} disabled={busy || !String(values.doi || '').trim()} onClick={lookup}>Fill from DOI</Button>
      {error && <Typography role="alert" variant="pi" textColor="danger600">{error}</Typography>}
      {notice && <Typography role="status" variant="pi" textColor="success600">{notice}</Typography>}
      <Modal.Root open={Boolean(proposal)} onOpenChange={(open) => { if (!open) setProposal(null); }}>
        <Modal.Content>
          <Modal.Header><Modal.Title>Review DOI metadata</Modal.Title></Modal.Header>
          <Modal.Body>
            <Flex direction="column" alignItems="stretch" gap={5}>
              <Typography textColor="neutral600">Source: {proposal?.source} · {proposal?.doi}. Existing fields are not selected for replacement by default.</Typography>
              {(['title', 'year', 'authorCredits', 'bibtex'] as const).map((field) => (
                <Box key={field}>
                  <Checkbox checked={selected[field]} disabled={!allowed[field] || !hasValue(field)} onCheckedChange={(checked) => setSelected((current) => ({ ...current, [field]: checked === true }))}>
                    {labels[field]}
                  </Checkbox>
                  <Box marginTop={2} padding={3} background="neutral100" borderRadius="4px">
                    {field === 'authorCredits' ? (
                      <ol style={{ paddingLeft: 20, margin: 0 }}>
                        {proposal?.authorCredits.map((author, index) => <li key={index} style={{ marginBottom: 8 }}>
                          <Typography fontWeight="semiBold">{author.name}</Typography>
                          <Typography tag="p" variant="pi" textColor={author.affiliation ? 'neutral600' : 'warning700'}>
                            {author.affiliation || 'Affiliation not provided — complete it before publishing.'}
                          </Typography>
                          {author.person && <Typography tag="p" variant="pi" textColor="success600">Linked to AIRi profile: {author.person.firstName} {author.person.lastName}</Typography>}
                          {!author.person && <Typography tag="p" variant="pi" textColor="neutral600">Publication author only — no People profile will be created. You can choose a profile later in Author credits.</Typography>}
                        </li>)}
                        {!proposal?.authorCredits.length && <Typography>No authors provided by the registry.</Typography>}
                      </ol>
                    ) : <Typography tag={field === 'bibtex' ? 'pre' : 'p'} style={{ whiteSpace: 'pre-wrap', overflowWrap: 'anywhere', maxHeight: 260, overflowY: 'auto', margin: 0 }}>
                      {proposal?.[field] || 'Not provided by the registry.'}
                    </Typography>}
                  </Box>
                </Box>
              ))}
            </Flex>
          </Modal.Body>
          <Modal.Footer justifyContent="space-between">
            <Button type="button" variant="tertiary" onClick={() => setProposal(null)}>Cancel</Button>
            <Button type="button" onClick={apply} disabled={!Object.values(selected).some(Boolean)}>Apply selected fields</Button>
          </Modal.Footer>
        </Modal.Content>
      </Modal.Root>
    </Flex>
  );
}

export const DoiAutofillPanel: PanelComponent = ({ model, activeTab, documentId }) => {
  if (model !== 'api::publication.publication' || activeTab === 'published') return null;
  return { title: 'Fill from DOI (optional)', content: <DoiAutofill key={documentId || 'new'} isCreating={!documentId} /> };
};
