import { notFound } from 'next/navigation';
import { getPartnerBySlug, getPartners, transformPartnerData } from '@/lib/strapi';
import PartnerDetailsClient from './PartnerDetailsClient';

export async function generateStaticParams() {
  try {
    const partners = transformPartnerData(await getPartners());
    return partners
      .filter((partner) => partner.slug)
      .map((partner) => ({ slug: partner.slug }));
  } catch {
    return [];
  }
}

export async function generateMetadata({ params }) {
  const { slug } = await params;
  const partnerRow = await getPartnerBySlug(slug);
  const partner = transformPartnerData(partnerRow ? [partnerRow] : [])[0];

  if (!partner) {
    return { title: 'Partner' };
  }

  return {
    title: `${partner.name} | Partner`,
    description: partner.description || 'Partner profile and related projects.',
  };
}

export default async function PartnerPage({ params }) {
  const { slug } = await params;
  const partnerRow = await getPartnerBySlug(slug);

  if (!partnerRow) {
    notFound();
  }

  const partner = transformPartnerData([partnerRow])[0];

  if (!partner) {
    notFound();
  }

  return <PartnerDetailsClient partner={partner} />;
}
