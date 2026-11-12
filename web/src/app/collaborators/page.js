import { notFound } from 'next/navigation';

// not a public page, partners are on /engagement
export default function Page() {
  notFound();
}
