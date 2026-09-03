import { getWeeklyIssueData } from "@/lib/issues";
import BilingualIssueView from "./components/BilingualIssueView";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function Home() {
  const { issue, items, error } = await getWeeklyIssueData();

  return <BilingualIssueView issue={issue} items={items} error={error} />;
}
