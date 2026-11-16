import * as React from 'react';
import { Box, Button, Flex, LinkButton, Modal, Typography } from '@strapi/design-system';
import { useForm, useRBAC } from '@strapi/strapi/admin';
import { useDocumentRBAC, type PanelComponent } from '@strapi/content-manager/strapi-admin';
import { useHref, useLocation } from 'react-router-dom';
import { suggestedAuthorName, unlinkedAuthorCredits } from './author-profiles';

const PERSON = 'api::person.person';
const createPermissions = [{ action: 'plugin::content-manager.explorer.create', subject: PERSON }];

function AuthorProfiles({ isCreating, persistedCredits }: { isCreating: boolean; persistedCredits: any[] }) {
  const form = useForm('AuthorProfiles', (state) => state);
  const rbac = useDocumentRBAC('AuthorProfiles', (state) => state);
  const fields = isCreating ? rbac.canCreateFields : rbac.canUpdateFields;
  const { allowedActions, permissions } = useRBAC(createPermissions);
  const [selected, setSelected] = React.useState<string | null>(null);
  const authors = unlinkedAuthorCredits((form.values as any).authorCredits, persistedCredits);
  const author = authors.find((item) => item.key === selected);
  const createUrl = useHref(`/content-manager/collection-types/${PERSON}/create?publicationAuthor=${encodeURIComponent(author?.name || '')}`);
  // Do not offer a shortcut that could leave an external author classified as a researcher.
  const canCreateExternal = allowedActions.canCreate && permissions.some((permission) =>
    !permission.properties?.fields || permission.properties.fields.includes('type'));

  if (form.disabled || !rbac.canUserAction('authorCredits.name', fields, 'string')
    || !rbac.canUserAction('authorCredits.person', fields, 'relation')) return null;

  return (
    <Flex direction="column" alignItems="stretch" gap={3}>
      <Typography variant="pi" textColor="neutral600">External authors can stay on the publication without a People profile. Only explicitly linked profiles are synchronized to Authors.</Typography>
      {authors.map((item) => (
        <Box key={item.key} padding={3} background="neutral100" borderRadius="4px">
          <Flex direction="column" alignItems="stretch" gap={2}>
            <Typography fontWeight="semiBold">{item.name}</Typography>
            <Typography variant="pi" textColor="neutral600">No People profile selected. Do you want to add one?</Typography>
            <Button type="button" variant="secondary" onClick={() => setSelected(item.key)}>Profile options for author {item.index + 1}</Button>
          </Flex>
        </Box>
      ))}
      {!authors.length && <Typography variant="pi" textColor="neutral600">For an external author, enter Name and Affiliation in Author credits and leave Person empty.</Typography>}
      <Modal.Root open={Boolean(author)} onOpenChange={(open) => { if (!open) setSelected(null); }}>
        <Modal.Content>
          <Modal.Header><Modal.Title>People profile for {author?.name}</Modal.Title></Modal.Header>
          <Modal.Body>
            <Flex direction="column" alignItems="stretch" gap={4}>
              <Typography>Keep this author only on the publication by leaving Person empty. No People profile is created when you save or publish the publication.</Typography>
              <Typography>To link a profile, first search the Person field in this author's Author credits row. If they already exist, select that profile to avoid duplicates.</Typography>
              <Typography>If a new profile is needed, open the full People form below. Review the suggested name, complete the profile and save it. Then return to this publication and select the saved profile in Person. Your unsaved publication stays open in this tab.</Typography>
              <Typography textColor="neutral600">The new form starts with type External. Publishing a profile makes it visible in the People directory. Creating a profile does not publish it or change this publication automatically.</Typography>
              {!canCreateExternal && <Typography textColor="warning700">Your permissions do not allow creating a profile with type External. Ask an editor with People creation permissions.</Typography>}
            </Flex>
          </Modal.Body>
          <Modal.Footer justifyContent="space-between">
            <Button type="button" variant="tertiary" onClick={() => setSelected(null)}>Keep on publication only</Button>
            {canCreateExternal && <LinkButton href={createUrl} target="_blank" rel="noopener noreferrer">Create People profile</LinkButton>}
          </Modal.Footer>
        </Modal.Content>
      </Modal.Root>
    </Flex>
  );
}

/** Reuse Strapi's complete Person editor and its permissions/validation, without saving anything. */
function NewAuthorProfile({ name }: { name: string }) {
  const form = useForm('NewAuthorProfile', (state) => state);
  const rbac = useDocumentRBAC('NewAuthorProfile', (state) => state);
  const applied = React.useRef(false);
  const can = (field: string, kind: 'string' | 'enumeration' = 'string') =>
    rbac.canUserAction(field, rbac.canCreateFields, kind);
  const canSetType = can('type', 'enumeration');

  React.useEffect(() => {
    if (applied.current || rbac.isLoading || form.disabled || !canSetType) return;
    applied.current = true;
    const values = form.getValues() as any;
    const suggested = suggestedAuthorName(name);
    for (const field of ['firstName', 'lastName'] as const) {
      if (can(field) && !values[field]) form.onChange(field, suggested[field]);
    }
    form.onChange('type', 'external');
  }, [rbac.isLoading, form.disabled, canSetType, name]);

  return <Flex direction="column" alignItems="stretch" gap={3}>
    <Typography fontWeight="semiBold">{name}</Typography>
    <Typography variant="pi" textColor="neutral600">Review the suggested first and last name. The profile starts as External; choose another type only if appropriate. Complete the normal People fields and save when ready.</Typography>
    <Typography variant="pi" textColor="neutral600">Then return to the publication tab and select this profile in the author's Person field. Nothing is saved, published or linked automatically.</Typography>
    <Typography variant="pi" textColor="neutral600">Publish the completed profile when it should be public. Its link and portrait require a published profile on the published publication.</Typography>
    {!canSetType && <Typography variant="pi" textColor="warning700">Profile suggestions were not applied: you do not have permission to set the person type.</Typography>}
  </Flex>;
}

export const AuthorProfilesPanel: PanelComponent = ({ model, activeTab, documentId, document }) => {
  const { search } = useLocation();
  if (model === 'api::publication.publication' && activeTab !== 'published') {
    return { title: 'Author profiles (optional)', content: <AuthorProfiles key={documentId || 'new'} isCreating={!documentId} persistedCredits={document?.authorCredits || []} /> };
  }
  const name = new URLSearchParams(search).get('publicationAuthor')?.trim().slice(0, 300);
  if (model === PERSON && !documentId && name) {
    return { title: 'Profile from publication author', content: <NewAuthorProfile key={name} name={name} /> };
  }
  return null;
};
