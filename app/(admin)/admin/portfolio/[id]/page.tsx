import { AdminPortfolioEditorClient } from '@/components/admin/AdminPortfolioEditorClient';

type Props = {
  params: Promise<{ id: string }>;
};

export default async function AdminEditPortfolioProjectPage({ params }: Props) {
  const { id } = await params;
  return <AdminPortfolioEditorClient projectId={id} />;
}
