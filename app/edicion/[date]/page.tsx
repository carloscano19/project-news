import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getWeeklyIssueData } from "@/lib/issues";
import BilingualIssueView from "@/app/components/BilingualIssueView";

export const dynamic = "force-dynamic";
export const revalidate = 0;

interface Props {
  params: Promise<{ date: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { date } = await params;
  return {
    title: `Edición del ${date} · Project News`,
    description: `Noticias curadas de la semana del ${date} en SEO, GEO e IA Search.`,
  };
}

export default async function EdicionPage({ params }: Props) {
  const { date } = await params;
  const { issue, items, error } = await getWeeklyIssueData(date);

  if (!issue && !error) {
    notFound();
  }

  return (
    <BilingualIssueView
      issue={issue}
      items={items}
      error={error}
      backLink={{
        href: "/archivo",
        label_es: "← Volver al archivo",
        label_en: "← Back to archive",
      }}
    />
  );
}
