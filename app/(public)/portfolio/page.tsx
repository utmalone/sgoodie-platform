import { redirect } from 'next/navigation';
import { defaultPortfolioCategory } from '@/lib/admin/portfolio-config';

/**
 * Portfolio index page - redirects to the default category (Hotels)
 */
export default function PortfolioPage() {
  redirect(`/portfolio/${defaultPortfolioCategory}`);
}
