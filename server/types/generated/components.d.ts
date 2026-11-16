import type { Schema, Struct } from '@strapi/strapi';

export interface AboutTimelineItem extends Struct.ComponentSchema {
  collectionName: 'components_about_timeline_items';
  info: {
    description: 'Timeline event entry';
    displayName: 'Timeline Item';
    icon: 'calendar';
  };
  attributes: {
    date: Schema.Attribute.Date &
      Schema.Attribute.SetPluginOptions<{
        i18n: {
          localized: true;
        };
      }>;
    description: Schema.Attribute.Text &
      Schema.Attribute.SetPluginOptions<{
        i18n: {
          localized: true;
        };
      }>;
    title: Schema.Attribute.String &
      Schema.Attribute.Required &
      Schema.Attribute.SetPluginOptions<{
        i18n: {
          localized: true;
        };
      }>;
  };
}

export interface EventParticipant extends Struct.ComponentSchema {
  collectionName: 'components_event_participants';
  info: {
    description: 'Speaker, panelist, trainer, moderator, keynote speaker, host, or organizer';
    displayName: 'Participant';
    icon: 'user';
  };
  attributes: {
    bio: Schema.Attribute.Text &
      Schema.Attribute.SetPluginOptions<{
        i18n: {
          localized: true;
        };
      }>;
    firstName: Schema.Attribute.String;
    lastName: Schema.Attribute.String;
    person: Schema.Attribute.Relation<'oneToOne', 'api::person.person'>;
    photo: Schema.Attribute.Media<'images'>;
    role: Schema.Attribute.Enumeration<
      [
        'speaker',
        'panelist',
        'trainer',
        'moderator',
        'keynote_speaker',
        'host',
        'organizer',
        'other',
      ]
    > &
      Schema.Attribute.Required &
      Schema.Attribute.DefaultTo<'speaker'>;
    title: Schema.Attribute.String &
      Schema.Attribute.SetPluginOptions<{
        i18n: {
          localized: true;
        };
      }>;
  };
}

export interface LayoutFooter extends Struct.ComponentSchema {
  collectionName: 'components_layout_footers';
  info: {
    description: 'Footer contact, links, and copyright';
    displayName: 'Footer';
    icon: 'arrow-down';
  };
  attributes: {
    addressLine1: Schema.Attribute.String &
      Schema.Attribute.SetPluginOptions<{
        i18n: {
          localized: true;
        };
      }> &
      Schema.Attribute.DefaultTo<'2 Observatorului Street,'>;
    addressLine2: Schema.Attribute.String &
      Schema.Attribute.SetPluginOptions<{
        i18n: {
          localized: true;
        };
      }> &
      Schema.Attribute.DefaultTo<'Cluj-Napoca 400347,'>;
    addressLine3: Schema.Attribute.String &
      Schema.Attribute.SetPluginOptions<{
        i18n: {
          localized: true;
        };
      }> &
      Schema.Attribute.DefaultTo<'Romania'>;
    contactTitle: Schema.Attribute.String &
      Schema.Attribute.SetPluginOptions<{
        i18n: {
          localized: true;
        };
      }> &
      Schema.Attribute.DefaultTo<'Contact'>;
    contactUsLabel: Schema.Attribute.String &
      Schema.Attribute.SetPluginOptions<{
        i18n: {
          localized: true;
        };
      }> &
      Schema.Attribute.DefaultTo<'Contact Us'>;
    copyright: Schema.Attribute.String &
      Schema.Attribute.SetPluginOptions<{
        i18n: {
          localized: true;
        };
      }> &
      Schema.Attribute.DefaultTo<'\u00A9 {year} Technical University of Cluj-Napoca. All rights reserved.'>;
    disseminationLabel: Schema.Attribute.String &
      Schema.Attribute.SetPluginOptions<{
        i18n: {
          localized: true;
        };
      }> &
      Schema.Attribute.DefaultTo<'Dissemination'>;
    projectsLabel: Schema.Attribute.String &
      Schema.Attribute.SetPluginOptions<{
        i18n: {
          localized: true;
        };
      }> &
      Schema.Attribute.DefaultTo<'Projects'>;
    quickLinksTitle: Schema.Attribute.String &
      Schema.Attribute.SetPluginOptions<{
        i18n: {
          localized: true;
        };
      }> &
      Schema.Attribute.DefaultTo<'Quick Links'>;
    roomsLabel: Schema.Attribute.String &
      Schema.Attribute.SetPluginOptions<{
        i18n: {
          localized: true;
        };
      }> &
      Schema.Attribute.DefaultTo<'Rooms'>;
    sitemapLabel: Schema.Attribute.String &
      Schema.Attribute.SetPluginOptions<{
        i18n: {
          localized: true;
        };
      }> &
      Schema.Attribute.DefaultTo<'Sitemap'>;
  };
}

export interface LayoutNavbar extends Struct.ComponentSchema {
  collectionName: 'components_layout_navbars';
  info: {
    description: 'Navigation bar links, menus, and search labels';
    displayName: 'Navbar';
    icon: 'bars';
  };
  attributes: {
    chatbotLabel: Schema.Attribute.String &
      Schema.Attribute.SetPluginOptions<{
        i18n: {
          localized: true;
        };
      }> &
      Schema.Attribute.DefaultTo<'AIRi chatbot'>;
    knowledgeGraphLabel: Schema.Attribute.String &
      Schema.Attribute.SetPluginOptions<{
        i18n: {
          localized: true;
        };
      }> &
      Schema.Attribute.DefaultTo<'Knowledge graphs'>;
    menuAwards: Schema.Attribute.String &
      Schema.Attribute.SetPluginOptions<{
        i18n: {
          localized: true;
        };
      }> &
      Schema.Attribute.DefaultTo<'Awards'>;
    menuCalls: Schema.Attribute.String &
      Schema.Attribute.SetPluginOptions<{
        i18n: {
          localized: true;
        };
      }> &
      Schema.Attribute.DefaultTo<'Calls for Projects'>;
    menuCareers: Schema.Attribute.String &
      Schema.Attribute.SetPluginOptions<{
        i18n: {
          localized: true;
        };
      }> &
      Schema.Attribute.DefaultTo<'Career Opportunities'>;
    menuContact: Schema.Attribute.String &
      Schema.Attribute.SetPluginOptions<{
        i18n: {
          localized: true;
        };
      }> &
      Schema.Attribute.DefaultTo<'Contact'>;
    menuDepartments: Schema.Attribute.String &
      Schema.Attribute.SetPluginOptions<{
        i18n: {
          localized: true;
        };
      }> &
      Schema.Attribute.DefaultTo<'Departments'>;
    menuEvents: Schema.Attribute.String &
      Schema.Attribute.SetPluginOptions<{
        i18n: {
          localized: true;
        };
      }> &
      Schema.Attribute.DefaultTo<'Events'>;
    menuGuidelines: Schema.Attribute.String &
      Schema.Attribute.SetPluginOptions<{
        i18n: {
          localized: true;
        };
      }> &
      Schema.Attribute.DefaultTo<'Guidelines'>;
    menuLeadership: Schema.Attribute.String &
      Schema.Attribute.SetPluginOptions<{
        i18n: {
          localized: true;
        };
      }> &
      Schema.Attribute.DefaultTo<'Leadership'>;
    menuMission: Schema.Attribute.String &
      Schema.Attribute.SetPluginOptions<{
        i18n: {
          localized: true;
        };
      }> &
      Schema.Attribute.DefaultTo<'Mission'>;
    menuNews: Schema.Attribute.String &
      Schema.Attribute.SetPluginOptions<{
        i18n: {
          localized: true;
        };
      }> &
      Schema.Attribute.DefaultTo<'News'>;
    menuOrganigram: Schema.Attribute.String &
      Schema.Attribute.SetPluginOptions<{
        i18n: {
          localized: true;
        };
      }> &
      Schema.Attribute.DefaultTo<'Organigram'>;
    menuPaperGraph: Schema.Attribute.String &
      Schema.Attribute.SetPluginOptions<{
        i18n: {
          localized: true;
        };
      }> &
      Schema.Attribute.DefaultTo<'Paper Graph'>;
    menuPeopleGraph: Schema.Attribute.String &
      Schema.Attribute.SetPluginOptions<{
        i18n: {
          localized: true;
        };
      }> &
      Schema.Attribute.DefaultTo<'People Graph'>;
    menuProjects: Schema.Attribute.String &
      Schema.Attribute.SetPluginOptions<{
        i18n: {
          localized: true;
        };
      }> &
      Schema.Attribute.DefaultTo<'Projects'>;
    menuPublications: Schema.Attribute.String &
      Schema.Attribute.SetPluginOptions<{
        i18n: {
          localized: true;
        };
      }> &
      Schema.Attribute.DefaultTo<'Publications'>;
    menuRegulations: Schema.Attribute.String &
      Schema.Attribute.SetPluginOptions<{
        i18n: {
          localized: true;
        };
      }> &
      Schema.Attribute.DefaultTo<'Regulations'>;
    menuReports: Schema.Attribute.String &
      Schema.Attribute.SetPluginOptions<{
        i18n: {
          localized: true;
        };
      }> &
      Schema.Attribute.DefaultTo<'Reports'>;
    menuResources: Schema.Attribute.String &
      Schema.Attribute.SetPluginOptions<{
        i18n: {
          localized: true;
        };
      }> &
      Schema.Attribute.DefaultTo<'Resources'>;
    menuRooms: Schema.Attribute.String &
      Schema.Attribute.SetPluginOptions<{
        i18n: {
          localized: true;
        };
      }> &
      Schema.Attribute.DefaultTo<'Calendar'>;
    menuSeminars: Schema.Attribute.String &
      Schema.Attribute.SetPluginOptions<{
        i18n: {
          localized: true;
        };
      }> &
      Schema.Attribute.DefaultTo<'Seminars'>;
    menuSitemap: Schema.Attribute.String &
      Schema.Attribute.SetPluginOptions<{
        i18n: {
          localized: true;
        };
      }> &
      Schema.Attribute.DefaultTo<'Sitemap'>;
    menuThemes: Schema.Attribute.String &
      Schema.Attribute.SetPluginOptions<{
        i18n: {
          localized: true;
        };
      }> &
      Schema.Attribute.DefaultTo<'Themes'>;
    menuTour: Schema.Attribute.String &
      Schema.Attribute.SetPluginOptions<{
        i18n: {
          localized: true;
        };
      }> &
      Schema.Attribute.DefaultTo<'Virtual Tour'>;
    navAbout: Schema.Attribute.String &
      Schema.Attribute.SetPluginOptions<{
        i18n: {
          localized: true;
        };
      }> &
      Schema.Attribute.DefaultTo<'About'>;
    navEngagement: Schema.Attribute.String &
      Schema.Attribute.SetPluginOptions<{
        i18n: {
          localized: true;
        };
      }> &
      Schema.Attribute.DefaultTo<'Engagement'>;
    navNews: Schema.Attribute.String &
      Schema.Attribute.SetPluginOptions<{
        i18n: {
          localized: true;
        };
      }> &
      Schema.Attribute.DefaultTo<'News & Events'>;
    navPeople: Schema.Attribute.String &
      Schema.Attribute.SetPluginOptions<{
        i18n: {
          localized: true;
        };
      }> &
      Schema.Attribute.DefaultTo<'People'>;
    navResearch: Schema.Attribute.String &
      Schema.Attribute.SetPluginOptions<{
        i18n: {
          localized: true;
        };
      }> &
      Schema.Attribute.DefaultTo<'Research'>;
    searchButton: Schema.Attribute.String &
      Schema.Attribute.SetPluginOptions<{
        i18n: {
          localized: true;
        };
      }> &
      Schema.Attribute.DefaultTo<'Search'>;
    searchMobilePlaceholder: Schema.Attribute.String &
      Schema.Attribute.SetPluginOptions<{
        i18n: {
          localized: true;
        };
      }> &
      Schema.Attribute.DefaultTo<'Search the site...'>;
    searchPlaceholder: Schema.Attribute.String &
      Schema.Attribute.SetPluginOptions<{
        i18n: {
          localized: true;
        };
      }> &
      Schema.Attribute.DefaultTo<'Search...'>;
  };
}

export interface ProjectContactEntry extends Struct.ComponentSchema {
  collectionName: 'components_project_contact_entries';
  info: {
    description: 'Individual contact method with type and description';
    displayName: 'Contact Entry';
    icon: 'envelope';
  };
  attributes: {
    description: Schema.Attribute.Text &
      Schema.Attribute.SetPluginOptions<{
        i18n: {
          localized: true;
        };
      }>;
    label: Schema.Attribute.String &
      Schema.Attribute.Required &
      Schema.Attribute.SetPluginOptions<{
        i18n: {
          localized: true;
        };
      }>;
    type: Schema.Attribute.Enumeration<
      ['email', 'phone', 'address', 'website', 'social', 'other']
    > &
      Schema.Attribute.Required &
      Schema.Attribute.DefaultTo<'email'>;
    value: Schema.Attribute.Text & Schema.Attribute.Required;
  };
}

export interface ProjectContactInfo extends Struct.ComponentSchema {
  collectionName: 'components_project_contact_infos';
  info: {
    description: 'Contact information for a project';
    displayName: 'Contact Info';
    icon: 'phone';
  };
  attributes: {
    contactEntries: Schema.Attribute.Component<'project.contact-entry', true>;
    generalInfo: Schema.Attribute.RichText &
      Schema.Attribute.SetPluginOptions<{
        i18n: {
          localized: true;
        };
      }>;
  };
}

export interface ProjectTeamMember extends Struct.ComponentSchema {
  collectionName: 'components_project_team_members';
  info: {
    description: 'Link a person to a project role';
    displayName: 'Individual Contributor';
    icon: 'users';
  };
  attributes: {
    person: Schema.Attribute.Relation<'oneToOne', 'api::person.person'>;
    role: Schema.Attribute.String &
      Schema.Attribute.SetPluginOptions<{
        i18n: {
          localized: true;
        };
      }>;
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
    date: Schema.Attribute.Date & Schema.Attribute.Required;
    description: Schema.Attribute.Text &
      Schema.Attribute.SetPluginOptions<{
        i18n: {
          localized: true;
        };
      }>;
    label: Schema.Attribute.String &
      Schema.Attribute.Required &
      Schema.Attribute.SetPluginOptions<{
        i18n: {
          localized: true;
        };
      }>;
  };
}

export interface PublicationAuthorCredit extends Struct.ComponentSchema {
  collectionName: 'components_publication_author_credits';
  info: {
    description: "Link an AIRi person or enter an external author's name, with their affiliation for this publication";
    displayName: 'Publication author';
    icon: 'user';
  };
  attributes: {
    affiliation: Schema.Attribute.String & Schema.Attribute.Required;
    name: Schema.Attribute.String;
    person: Schema.Attribute.Relation<'oneToOne', 'api::person.person'>;
  };
}

export interface SharedCard extends Struct.ComponentSchema {
  collectionName: 'components_shared_cards';
  info: {
    description: 'Content card with icon or image, text, and optional link';
    displayName: 'Card';
    icon: 'id-card';
  };
  attributes: {
    badge: Schema.Attribute.String &
      Schema.Attribute.SetPluginOptions<{
        i18n: {
          localized: true;
        };
      }>;
    description: Schema.Attribute.Text &
      Schema.Attribute.SetPluginOptions<{
        i18n: {
          localized: true;
        };
      }>;
    icon: Schema.Attribute.Enumeration<
      [
        'users',
        'book',
        'globe',
        'newspaper',
        'lightbulb',
        'graduation-cap',
        'handshake',
        'calendar',
        'link',
        'external',
        'rocket',
        'flask',
      ]
    > &
      Schema.Attribute.DefaultTo<'users'>;
    image: Schema.Attribute.Media<'images'>;
    linkText: Schema.Attribute.String &
      Schema.Attribute.SetPluginOptions<{
        i18n: {
          localized: true;
        };
      }>;
    linkUrl: Schema.Attribute.String;
    title: Schema.Attribute.String &
      Schema.Attribute.Required &
      Schema.Attribute.SetPluginOptions<{
        i18n: {
          localized: true;
        };
      }>;
  };
}

export interface SharedCardGrid extends Struct.ComponentSchema {
  collectionName: 'components_shared_card_grids';
  info: {
    description: 'Grid of feature cards';
    displayName: 'Card Grid';
    icon: 'grid';
  };
  attributes: {
    cards: Schema.Attribute.Component<'shared.card', true>;
    columns: Schema.Attribute.Enumeration<['2', '3', '4']> &
      Schema.Attribute.DefaultTo<'3'>;
    heading: Schema.Attribute.String &
      Schema.Attribute.SetPluginOptions<{
        i18n: {
          localized: true;
        };
      }>;
    subheading: Schema.Attribute.Text &
      Schema.Attribute.SetPluginOptions<{
        i18n: {
          localized: true;
        };
      }>;
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
    label: Schema.Attribute.String &
      Schema.Attribute.Required &
      Schema.Attribute.SetPluginOptions<{
        i18n: {
          localized: true;
        };
      }>;
    url: Schema.Attribute.String & Schema.Attribute.Required;
  };
}

export interface SharedCta extends Struct.ComponentSchema {
  collectionName: 'components_shared_ctas';
  info: {
    description: 'Banner or call-to-action block with buttons';
    displayName: 'Call to action';
    icon: 'bullhorn';
  };
  attributes: {
    description: Schema.Attribute.Text &
      Schema.Attribute.SetPluginOptions<{
        i18n: {
          localized: true;
        };
      }>;
    primaryButtonText: Schema.Attribute.String &
      Schema.Attribute.SetPluginOptions<{
        i18n: {
          localized: true;
        };
      }>;
    primaryButtonUrl: Schema.Attribute.String;
    secondaryButtonText: Schema.Attribute.String &
      Schema.Attribute.SetPluginOptions<{
        i18n: {
          localized: true;
        };
      }>;
    secondaryButtonUrl: Schema.Attribute.String;
    theme: Schema.Attribute.Enumeration<['blue', 'gradient', 'gray']> &
      Schema.Attribute.DefaultTo<'blue'>;
    title: Schema.Attribute.String &
      Schema.Attribute.Required &
      Schema.Attribute.SetPluginOptions<{
        i18n: {
          localized: true;
        };
      }>;
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
    description: Schema.Attribute.Text &
      Schema.Attribute.SetPluginOptions<{
        i18n: {
          localized: true;
        };
      }>;
    richContent: Schema.Attribute.RichText &
      Schema.Attribute.SetPluginOptions<{
        i18n: {
          localized: true;
        };
      }>;
    title: Schema.Attribute.String &
      Schema.Attribute.Required &
      Schema.Attribute.SetPluginOptions<{
        i18n: {
          localized: true;
        };
      }>;
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
    body: Schema.Attribute.Text &
      Schema.Attribute.SetPluginOptions<{
        i18n: {
          localized: true;
        };
      }>;
    title: Schema.Attribute.String &
      Schema.Attribute.SetPluginOptions<{
        i18n: {
          localized: true;
        };
      }>;
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
    body: Schema.Attribute.RichText &
      Schema.Attribute.SetPluginOptions<{
        i18n: {
          localized: true;
        };
      }>;
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
    body: Schema.Attribute.RichText &
      Schema.Attribute.SetPluginOptions<{
        i18n: {
          localized: true;
        };
      }>;
    heading: Schema.Attribute.String &
      Schema.Attribute.Required &
      Schema.Attribute.SetPluginOptions<{
        i18n: {
          localized: true;
        };
      }>;
    media: Schema.Attribute.Media<'images' | 'files' | 'videos'>;
    subheading: Schema.Attribute.String &
      Schema.Attribute.SetPluginOptions<{
        i18n: {
          localized: true;
        };
      }>;
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
    metaDescription: Schema.Attribute.Text &
      Schema.Attribute.Required &
      Schema.Attribute.SetPluginOptions<{
        i18n: {
          localized: true;
        };
      }>;
    metaTitle: Schema.Attribute.String &
      Schema.Attribute.Required &
      Schema.Attribute.SetPluginOptions<{
        i18n: {
          localized: true;
        };
      }>;
    shareImage: Schema.Attribute.Media<'images'>;
  };
}

export interface SharedSeparator extends Struct.ComponentSchema {
  collectionName: 'components_shared_separators';
  info: {
    description: 'Anchored divider for grouping dynamic-zone content';
    displayName: 'Separator';
    icon: 'horizontal';
  };
  attributes: {
    anchorId: Schema.Attribute.UID<'label'> &
      Schema.Attribute.Required &
      Schema.Attribute.SetPluginOptions<{
        i18n: {
          localized: true;
        };
      }>;
    label: Schema.Attribute.String &
      Schema.Attribute.Required &
      Schema.Attribute.SetPluginOptions<{
        i18n: {
          localized: true;
        };
      }>;
    style: Schema.Attribute.Enumeration<['line', 'heading', 'spacer']> &
      Schema.Attribute.DefaultTo<'heading'>;
    subheading: Schema.Attribute.Text &
      Schema.Attribute.SetPluginOptions<{
        i18n: {
          localized: true;
        };
      }>;
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
    role: Schema.Attribute.String &
      Schema.Attribute.Required &
      Schema.Attribute.SetPluginOptions<{
        i18n: {
          localized: true;
        };
      }>;
  };
}

declare module '@strapi/strapi' {
  export namespace Public {
    export interface ComponentSchemas {
      'about.timeline-item': AboutTimelineItem;
      'event.participant': EventParticipant;
      'layout.footer': LayoutFooter;
      'layout.navbar': LayoutNavbar;
      'project.contact-entry': ProjectContactEntry;
      'project.contact-info': ProjectContactInfo;
      'project.team-member': ProjectTeamMember;
      'project.timeline-entry': ProjectTimelineEntry;
      'publication.author-credit': PublicationAuthorCredit;
      'shared.card': SharedCard;
      'shared.card-grid': SharedCardGrid;
      'shared.contact-link': SharedContactLink;
      'shared.cta': SharedCta;
      'shared.focus-item': SharedFocusItem;
      'shared.media': SharedMedia;
      'shared.quote': SharedQuote;
      'shared.rich-text': SharedRichText;
      'shared.section': SharedSection;
      'shared.seo': SharedSeo;
      'shared.separator': SharedSeparator;
      'shared.slider': SharedSlider;
      'team.membership': TeamMembership;
    }
  }
}
