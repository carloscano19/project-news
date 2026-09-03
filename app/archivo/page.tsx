import type { Metadata } from "next";
import { getPublishedArchiveIssues } from "@/lib/issues";
import ArchiveView from "../components/ArchiveView";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export const metadata: Metadata = {
  title: "Archivo de Ediciones · Project News",
  description: "Histórico completo de ediciones semanales curadas sobre Search, IA, Data y Paid Media.",
};

export default async function ArchivoPage() {
  const issues = await getPublishedArchiveIssues();

  return <ArchiveView issues={issues} />;
}
