import type { Schema, Struct } from '@strapi/strapi';

export interface ProjectTeamMember extends Struct.ComponentSchema {
  collectionName: 'components_project_team_members';
  info: {
    description: 'Link a person to a project role';
    displayName: 'Team member';
    icon: 'users';
  };
  attributes: {
    isLead: Schema.Attribute.Boolean & Schema.Attribute.DefaultTo<false>;
    person: Schema.Attribute.Relation<'oneToOne', 'api::person.person'>;
    role: Schema.Attribute.String & Schema.Attribute.Required;
  };
}

export interface ProjectTimelineEntry extends Struct.ComponentSchema {
  collectionName: 'components_project_timeline_entries';
  info: {
    description: 'Milestone in a project';
    displayName: 'Timeline entry';
    icon: 'history';
  };
  attributes: {
    date: Schema.Attribute.Date;
    description: Schema.Attribute.Text;
    label: Schema.Attribute.String & Schema.Attribute.Required;
  };
}

export interface SharedContactLink extends Struct.ComponentSchema {
  collectionName: 'components_shared_contact_links';
  info: {
    description: 'Label + URL + icon';
    displayName: 'Contact link';
    icon: 'id-card';
  };
  attributes: {
    icon: Schema.Attribute.Enumeration<
      ['mail', 'phone', 'location', 'link', 'calendar', 'external']
    > &
      Schema.Attribute.DefaultTo<'link'>;
    label: Schema.Attribute.String & Schema.Attribute.Required;
    url: Schema.Attribute.String & Schema.Attribute.Required;
  };
}

export interface SharedFocusItem extends Struct.ComponentSchema {
  collectionName: 'components_shared_focus_items';
  info: {
    description: 'Small highlight block';
    displayName: 'Focus item';
    icon: 'bullseye';
  };
  attributes: {
    description: Schema.Attribute.Text;
    richContent: Schema.Attribute.RichText;
    title: Schema.Attribute.String & Schema.Attribute.Required;
  };
}

export interface SharedMedia extends Struct.ComponentSchema {
  collectionName: 'components_shared_media';
  info: {
    displayName: 'Media';
    icon: 'file-video';
  };
  attributes: {
    file: Schema.Attribute.Media<'images' | 'files' | 'videos'>;
  };
}

export interface SharedQuote extends Struct.ComponentSchema {
  collectionName: 'components_shared_quotes';
  info: {
    displayName: 'Quote';
    icon: 'indent';
  };
  attributes: {
    body: Schema.Attribute.Text;
    title: Schema.Attribute.String;
  };
}

export interface SharedRichText extends Struct.ComponentSchema {
  collectionName: 'components_shared_rich_texts';
  info: {
    description: '';
    displayName: 'Rich text';
    icon: 'align-justify';
  };
  attributes: {
    body: Schema.Attribute.RichText;
  };
}

export interface SharedSection extends Struct.ComponentSchema {
  collectionName: 'components_shared_sections';
  info: {
    description: 'Heading, body, optional media';
    displayName: 'Section';
    icon: 'window-restore';
  };
  attributes: {
    body: Schema.Attribute.RichText;
    heading: Schema.Attribute.String & Schema.Attribute.Required;
    media: Schema.Attribute.Media<'images' | 'files' | 'videos'>;
    subheading: Schema.Attribute.String;
  };
}

export interface SharedSeo extends Struct.ComponentSchema {
  collectionName: 'components_shared_seos';
  info: {
    description: '';
    displayName: 'Seo';
    icon: 'allergies';
    name: 'Seo';
  };
  attributes: {
    metaDescription: Schema.Attribute.Text & Schema.Attribute.Required;
    metaTitle: Schema.Attribute.String & Schema.Attribute.Required;
    shareImage: Schema.Attribute.Media<'images'>;
  };
}

export interface SharedSlider extends Struct.ComponentSchema {
  collectionName: 'components_shared_sliders';
  info: {
    description: '';
    displayName: 'Slider';
    icon: 'address-book';
  };
  attributes: {
    files: Schema.Attribute.Media<'images', true>;
  };
}

export interface TeamMembership extends Struct.ComponentSchema {
  collectionName: 'components_team_memberships';
  info: {
    description: 'Links a person to a team with a specific role';
    displayName: 'Team membership';
    icon: 'user-check';
  };
  attributes: {
    isLead: Schema.Attribute.Boolean & Schema.Attribute.DefaultTo<false>;
    person: Schema.Attribute.Relation<'oneToOne', 'api::person.person'>;
    role: Schema.Attribute.String & Schema.Attribute.Required;
  };
}

declare module '@strapi/strapi' {
  export module Public {
    export interface ComponentSchemas {
      'project.team-member': ProjectTeamMember;
      'project.timeline-entry': ProjectTimelineEntry;
      'shared.contact-link': SharedContactLink;
      'shared.focus-item': SharedFocusItem;
      'shared.media': SharedMedia;
      'shared.quote': SharedQuote;
      'shared.rich-text': SharedRichText;
      'shared.section': SharedSection;
      'shared.seo': SharedSeo;
      'shared.slider': SharedSlider;
      'team.membership': TeamMembership;
    }
  }
}
